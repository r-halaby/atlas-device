# Kiosk browser setup (voice input on the Sage chat page)

The Sage chat page's mic button (`src/App.jsx`) uses the browser's
`SpeechRecognition` API. Debian's `chromium` package ships without Google
API keys (Debian policy — proprietary keys aren't distributed), and that API
needs them to reach Google's speech-recognition backend. Without them every
attempt fails immediately with `error: network`, regardless of mic
permissions. This is unrelated to `pi/sage_listener.py`'s hardware-button
pipeline (Whisper + Claude), which doesn't depend on this at all.

The fix: run the kiosk under Google Chrome instead of Chromium. Google
Chrome ships with real API keys, and Google does publish an arm64 build for
Linux (`google-chrome-stable`), so this works on the Pi.

## Install

```sh
curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo 'deb [arch=arm64 signed-by=/usr/share/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main' | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update
sudo apt-get install -y google-chrome-stable
```

## Managed policy — mic access without a permission prompt

Kiosk mode has no way to tap "Allow" on a permission dialog. Chrome reads
enterprise policy from `/etc/opt/chrome/policies/managed/` (not
`/etc/chromium/policies/managed/` — that's Chromium's path and Chrome
ignores it):

```sh
sudo mkdir -p /etc/opt/chrome/policies/managed
sudo tee /etc/opt/chrome/policies/managed/atlas-mic.json >/dev/null <<'EOF'
{
  "AudioCaptureAllowed": false,
  "AudioCaptureAllowedUrls": ["https://atlas-device.vercel.app"]
}
EOF
```

`AudioCaptureAllowedUrls` whitelists only the kiosk's own origin;
`AudioCaptureAllowed: false` keeps every other site denied by default.

## Autostart

`~/.config/labwc/autostart` launches the browser. Swap the binary and add
two flags Chrome needs that Chromium's Debian wrapper injects automatically
(`--no-first-run`, `--no-default-browser-check`) — without them Chrome's
first-run UI can interfere with kiosk mode:

```sh
google-chrome-stable --kiosk --no-first-run --no-default-browser-check \
  --ozone-platform=x11 --touch-events=enabled \
  --autoplay-policy=no-user-gesture-required --noerrdialogs \
  --disable-infobars --disable-session-crashed-bubble \
  --disable-features=TranslateUI --check-for-update-interval=31536000 \
  --password-store=basic https://atlas-device.vercel.app/ &
```

## Verifying it worked

Tap the mic button on the Sage chat page — it should go straight to
"Listening…" with no permission prompt, and produce a real transcript. If it
still shows a mic error, check the error text specifically: `network` means
the API-key issue above (wrong browser); `not-allowed` means the managed
policy isn't being picked up (check the policy file path and restart the
browser); `audio-capture` means no working microphone was found by the OS.
