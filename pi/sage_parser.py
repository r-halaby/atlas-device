"""Whisper transcription + Claude intent parsing for Sage.

Kept as pure functions (no state, no side effects beyond API calls) so
sage_listener.py can call them from an executor thread. Both raise on
failure; the caller broadcasts the error to the frontend.
"""

from __future__ import annotations

import json
import os
from typing import Any

from anthropic import Anthropic
from openai import OpenAI

_openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
_anthropic = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

WHISPER_MODEL = "whisper-1"
CLAUDE_MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are Sage, the AI layer of a creative operations platform for design studios. A designer has spoken a voice command into a hardware device. Parse their intent and return a structured JSON action object.

Supported actions:
- add_todo: { action, text, project }
- complete_todo: { action, todo_id, project }
- start_timer: { action, project }
- stop_timer: { action, project }
- add_transcript: { action, text, project }
- schedule_event: { action, title, date, time, project }
- adjust_event: { action, event_id, changes }
- open_project: { action, project }
- add_note: { action, text, project }
- ambiguous: { action, question } — use this when intent or project is unclear

Rules:
- Always return valid JSON only, no preamble, no markdown
- If project name is ambiguous, return ambiguous action with a clarifying question
- If action is unclear, return ambiguous action
- Extract project names exactly as spoken"""


def transcribe_audio(wav_path: str) -> str:
    """Send a WAV file to Whisper and return the transcript."""
    with open(wav_path, "rb") as f:
        result = _openai.audio.transcriptions.create(
            model=WHISPER_MODEL,
            file=f,
        )
    return (result.text or "").strip()


def parse_intent(transcript: str) -> dict[str, Any]:
    """Send transcript to Claude and return the parsed action dict.

    Never raises for malformed model output — falls back to an ambiguous
    action so the frontend can prompt the user rather than crash.
    """
    response = _anthropic.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": transcript}],
    )
    raw = "".join(
        block.text for block in response.content if getattr(block, "type", None) == "text"
    ).strip()

    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict) or "action" not in parsed:
            raise ValueError("missing action field")
        return parsed
    except (json.JSONDecodeError, ValueError):
        return {
            "action": "ambiguous",
            "question": "I didn’t quite catch that — try again?",
        }
