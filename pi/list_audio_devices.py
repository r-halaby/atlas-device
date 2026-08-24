"""List all PyAudio-detected audio devices on this machine.

Run on the Pi after plugging in the USB mic to confirm it's recognised and
find its device index:

    python3 list_audio_devices.py

Look for a row whose name contains "USB" and has Max Inputs > 0.
Set SAGE_AUDIO_DEVICE=<index> in the environment (or /etc/sage.env) if
sage_listener.py picks the wrong device automatically.
"""

import pyaudio

p = pyaudio.PyAudio()
count = p.get_device_count()
print(f"{'idx':>3}  {'Max In':>6}  {'Max Out':>7}  Name")
print("-" * 60)
for i in range(count):
    info = p.get_device_info_by_index(i)
    print(f"{i:>3}  {int(info['maxInputChannels']):>6}  {int(info['maxOutputChannels']):>7}  {info['name']}")
p.terminate()
