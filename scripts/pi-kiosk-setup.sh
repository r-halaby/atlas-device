#!/usr/bin/env bash
# Pi Kiosk Setup — turns a fresh Raspberry Pi OS install into a Chromium kiosk
# pointed at the atlas-device web app. Idempotent; safe to re-run.
#
# Prereqs on the Pi:
#   1. Raspberry Pi OS Bookworm with desktop, 64-bit (via Raspberry Pi Imager)
#   2. Wi-Fi connected, SSH accessible
#   3. Waveshare 4" DPI panel wired to the 40-pin header and configured per
#      Waveshare's own wiki — that's not this script's job.
#   4. Session is X11, not Wayland. Bookworm on Pi 4 defaults to X11 already;
#      if you're on Wayland (`echo $XDG_SESSION_TYPE`), switch via:
#        sudo raspi-config  →  Advanced Options  →  Wayland  →  X11
#
# Usage (over SSH from your laptop, or a keyboard on the Pi):
#   curl -O https://raw.githubusercontent.com/r-halaby/atlas-device/main/scripts/pi-kiosk-setup.sh
#   chmod +x pi-kiosk-setup.sh
#   ./pi-kiosk-setup.sh https://your-deployed-kiosk-url.example.com
#   sudo reboot
#
# To change the kiosk URL later without re-running setup:
#   echo 'https://new-url' > ~/.kiosk-url && sudo reboot

set -euo pipefail

KIOSK_URL="${1:-}"
if [[ -z "$KIOSK_URL" ]]; then
  read -rp "Kiosk URL (e.g. https://atlas-device.vercel.app): " KIOSK_URL
fi
if [[ -z "$KIOSK_URL" ]]; then
  echo "No URL given. Aborting." >&2
  exit 1
fi

# ---- Sanity checks ----
if [[ ! -f /etc/rpi-issue ]]; then
  echo "This script must run on Raspberry Pi OS (/etc/rpi-issue not found)." >&2
  exit 1
fi
if [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
  echo "Session is Wayland. The unclutter + xset commands this script installs" >&2
  echo "only work under X11. Switch via 'sudo raspi-config' and re-run." >&2
  exit 1
fi

echo "==> Installing chromium-browser, unclutter, xdotool..."
sudo apt-get update -qq
sudo apt-get install -y chromium-browser unclutter xdotool

echo "==> Writing kiosk URL to ~/.kiosk-url..."
echo "$KIOSK_URL" > "$HOME/.kiosk-url"

echo "==> Writing launcher to ~/.local/bin/kiosk-launch.sh..."
mkdir -p "$HOME/.local/bin"
cat > "$HOME/.local/bin/kiosk-launch.sh" <<'LAUNCHER'
#!/usr/bin/env bash
# Launched on desktop login by ~/.config/autostart/kiosk.desktop. Reads the
# URL from ~/.kiosk-url so it can be changed without re-running setup.

set -u
URL="$(cat "$HOME/.kiosk-url" 2>/dev/null || echo about:blank)"

# Blank screen and DPMS off — the panel would otherwise blank after ~10 min.
xset s off
xset s noblank
xset -dpms

# Hide the mouse cursor after 1s of inactivity.
unclutter -idle 1 -root &

# Suppress the "Chromium didn't shut down correctly" banner after a power cut,
# which would otherwise steal the top of the screen until dismissed.
PREF_DIR="$HOME/.config/chromium/Default"
if [[ -f "$PREF_DIR/Preferences" ]]; then
  sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/; s/"exited_cleanly":false/"exited_cleanly":true/' "$PREF_DIR/Preferences" || true
fi

FLAGS=(
  --kiosk
  --noerrdialogs
  --disable-infobars
  --disable-features=TranslateUI,ChromeWhatsNewUI
  --disable-session-crashed-bubble
  --disable-restore-session-state
  --incognito
  --overscroll-history-navigation=0
  --check-for-update-interval=31536000
)

# Restart if Chromium dies (rare, but happens on updates or OOM).
while true; do
  chromium-browser "${FLAGS[@]}" "$URL"
  sleep 3
done
LAUNCHER
chmod +x "$HOME/.local/bin/kiosk-launch.sh"

echo "==> Writing autostart entry to ~/.config/autostart/kiosk.desktop..."
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/kiosk.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Atlas Kiosk
Exec=$HOME/.local/bin/kiosk-launch.sh
X-GNOME-Autostart-enabled=true
DESKTOP

echo "==> Enabling desktop autologin (raspi-config B4)..."
sudo raspi-config nonint do_boot_behaviour B4

cat <<DONE

Setup complete. Reboot to launch the kiosk:
  sudo reboot

The Pi will boot straight into Chromium in fullscreen, pointed at:
  $KIOSK_URL

To change the URL later, no re-run needed:
  echo 'https://new-url' > ~/.kiosk-url && sudo reboot

To temporarily exit the kiosk (for debugging), SSH in and:
  killall chromium-browser        # kills the current window; loop restarts it
  pkill -f kiosk-launch.sh        # kills the loop too, drops you to desktop
DONE
