"""Sage voice-command listener.

Runs on the Pi alongside the React kiosk. Watches GPIO 17 for the dedicated
Sage button; on hold, captures audio from the INMP441 I2S mic (GPIO 18/19/20);
on release, sends the audio to Whisper for transcription, then to Claude for
intent parsing, then pushes the parsed action to the React frontend via a
local WebSocket on ws://localhost:8765.

HARDWARE PREREQS (verify before wiring):
    * GPIO 17: momentary push button to GND, internal pull-up used.
    * GPIO 18 (BCLK), 19 (LRCLK), 20 (DIN): INMP441 I2S mic.
    * IMPORTANT: the Waveshare 4" DPI panel takes over ~20 GPIO pins. Cross-
      check its overlay against pins 17/18/19/20 before soldering — if the
      panel claims one of these, we need to remap.

SOFTWARE PREREQS on the Pi:
    /boot/firmware/config.txt:
        dtparam=i2s=on
        dtoverlay=googlevoicehat-soundcard   # or your INMP441 overlay
    apt:
        python3-pip portaudio19-dev libatlas-base-dev
    pip (see pi/requirements.txt):
        pyaudio websockets anthropic openai

RUN (as a systemd service or just plain):
    ANTHROPIC_API_KEY=... OPENAI_API_KEY=... python3 sage_listener.py

The React app connects on port 8765; if this process isn't running, the app
stays in idle forever — Sage overlay never appears.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import sys
import tempfile
import time
import wave
from dataclasses import dataclass
from typing import Optional

import pyaudio
import websockets
from gpiozero import Button

from sage_parser import parse_intent, transcribe_audio

# ---- Hardware config ----
SAGE_BUTTON_PIN = 17
DEBOUNCE_SECONDS = 0.2
MAX_RECORD_SECONDS = 30

# INMP441 spec: 24-bit samples in a 32-bit slot, mono, LEFT channel.
AUDIO_RATE = 16000
AUDIO_CHUNK = 1024
AUDIO_FORMAT = pyaudio.paInt32
AUDIO_CHANNELS = 1

WS_HOST = "localhost"
WS_PORT = 8765

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("sage")


# ---- State ----

@dataclass
class SageState:
    """Everything the listener needs to hand between async tasks."""
    audio: pyaudio.PyAudio
    stream: Optional[pyaudio.Stream] = None
    frames: list[bytes] | None = None
    recording: bool = False
    processing: bool = False
    last_press_ts: float = 0.0
    clients: set = None
    loop: Optional[asyncio.AbstractEventLoop] = None
    record_task: Optional[asyncio.Task] = None

    def __post_init__(self):
        if self.clients is None:
            self.clients = set()


# ---- WebSocket broadcast ----

async def broadcast(state: SageState, event: dict) -> None:
    if not state.clients:
        return
    payload = json.dumps(event)
    dead = []
    for ws in state.clients:
        try:
            await ws.send(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        state.clients.discard(ws)


# ---- Audio ----

def _open_stream(state: SageState) -> pyaudio.Stream:
    return state.audio.open(
        format=AUDIO_FORMAT,
        channels=AUDIO_CHANNELS,
        rate=AUDIO_RATE,
        input=True,
        frames_per_buffer=AUDIO_CHUNK,
    )


async def start_recording(state: SageState) -> None:
    if state.recording or state.processing:
        return
    state.frames = []
    try:
        state.stream = _open_stream(state)
    except Exception as e:
        log.exception("failed to open audio stream")
        await broadcast(state, {"event": "error", "message": f"Mic error: {e}"})
        return
    state.recording = True
    await broadcast(state, {"event": "recording_start"})

    # Cap the recording at MAX_RECORD_SECONDS.
    state.record_task = asyncio.create_task(_auto_stop(state))

    # Pull samples on an executor thread so we don't block the event loop.
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _pump_audio, state)


def _pump_audio(state: SageState) -> None:
    """Blocking read loop; runs on a worker thread."""
    while state.recording and state.stream is not None:
        try:
            data = state.stream.read(AUDIO_CHUNK, exception_on_overflow=False)
            state.frames.append(data)
        except Exception:
            log.exception("audio read failed")
            break


async def _auto_stop(state: SageState) -> None:
    await asyncio.sleep(MAX_RECORD_SECONDS)
    if state.recording:
        log.info("hit max recording length, auto-stopping")
        await stop_recording_and_process(state)


async def stop_recording_and_process(state: SageState) -> None:
    if not state.recording:
        return
    state.recording = False
    if state.record_task and not state.record_task.done():
        state.record_task.cancel()
    if state.stream is not None:
        try:
            state.stream.stop_stream()
            state.stream.close()
        except Exception:
            pass
        state.stream = None
    await broadcast(state, {"event": "recording_end"})

    if not state.frames:
        await broadcast(state, {"event": "error", "message": "Didn’t catch that"})
        return

    state.processing = True
    await broadcast(state, {"event": "processing"})

    wav_path = _write_wav(state.frames, state.audio.get_sample_size(AUDIO_FORMAT))
    state.frames = None

    try:
        # Both API calls are blocking; push to executor so ws stays responsive.
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(None, transcribe_audio, wav_path)
        log.info("transcript: %s", text)
        if not text or not text.strip():
            await broadcast(state, {"event": "error", "message": "Didn’t catch that"})
            return
        action = await loop.run_in_executor(None, parse_intent, text)
        log.info("action: %s", action)
        if action.get("action") == "ambiguous":
            await broadcast(state, {"event": "ambiguous", "action": action})
        else:
            await broadcast(state, {"event": "result", "action": action})
    except Exception as e:
        log.exception("processing failed")
        await broadcast(state, {"event": "error", "message": str(e)})
    finally:
        state.processing = False
        try:
            os.unlink(wav_path)
        except OSError:
            pass


def _write_wav(frames: list[bytes], sample_width: int) -> str:
    fd, path = tempfile.mkstemp(prefix="sage_", suffix=".wav")
    os.close(fd)
    with wave.open(path, "wb") as w:
        w.setnchannels(AUDIO_CHANNELS)
        w.setsampwidth(sample_width)
        w.setframerate(AUDIO_RATE)
        w.writeframes(b"".join(frames))
    return path


# ---- Button handling ----

def _bind_button(state: SageState) -> Button:
    btn = Button(SAGE_BUTTON_PIN, pull_up=True, bounce_time=DEBOUNCE_SECONDS / 2)

    def _schedule(coro):
        # gpiozero callbacks run on its own thread; schedule back onto the loop.
        if state.loop is not None:
            asyncio.run_coroutine_threadsafe(coro, state.loop)

    def _on_pressed():
        now = time.monotonic()
        if now - state.last_press_ts < DEBOUNCE_SECONDS:
            return
        state.last_press_ts = now
        if state.recording or state.processing:
            # Any state that isn't idle → dismiss the overlay.
            _schedule(_dismiss(state))
        else:
            _schedule(start_recording(state))

    def _on_released():
        if state.recording:
            _schedule(stop_recording_and_process(state))

    btn.when_pressed = _on_pressed
    btn.when_released = _on_released
    return btn


async def _dismiss(state: SageState) -> None:
    state.recording = False
    if state.stream is not None:
        try:
            state.stream.stop_stream()
            state.stream.close()
        except Exception:
            pass
        state.stream = None
    state.processing = False
    await broadcast(state, {"event": "dismiss"})


# ---- WebSocket server ----

async def _client_handler(state: SageState, ws) -> None:
    state.clients.add(ws)
    log.info("client connected (%d total)", len(state.clients))
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            evt = msg.get("event")
            # confirm/cancel are for logging; the frontend already acted.
            if evt == "confirm":
                log.info("user confirmed: %s", msg.get("action"))
            elif evt == "cancel":
                log.info("user cancelled")
    except websockets.ConnectionClosed:
        pass
    finally:
        state.clients.discard(ws)
        log.info("client disconnected (%d remaining)", len(state.clients))


async def main() -> None:
    state = SageState(audio=pyaudio.PyAudio())
    state.loop = asyncio.get_running_loop()

    btn = _bind_button(state)  # noqa: F841 — keep reference alive

    async def handler(ws):
        await _client_handler(state, ws)

    log.info("listening on ws://%s:%d", WS_HOST, WS_PORT)
    async with websockets.serve(handler, WS_HOST, WS_PORT):
        stop = asyncio.Event()

        def _shutdown(*_):
            stop.set()

        for sig in (signal.SIGINT, signal.SIGTERM):
            state.loop.add_signal_handler(sig, _shutdown)

        await stop.wait()

    if state.stream is not None:
        try:
            state.stream.close()
        except Exception:
            pass
    state.audio.terminate()
    log.info("shutdown clean")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
