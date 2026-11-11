#!/usr/bin/env bash
# Sets up the server on a Debian machine. Run as root from the app folder copied to /opt/fog.
# The rclone config must be supplied separately as /etc/fog/rclone.conf.
set -euo pipefail
cd /opt/fog

command -v node >/dev/null || apt-get install -y nodejs npm
command -v rclone >/dev/null || apt-get install -y rclone
id fog >/dev/null 2>&1 || useradd --system --home /var/lib/fog --shell /usr/sbin/nologin fog
install -d -o fog -g fog -m 750 /var/lib/fog /etc/fog
[ -f /etc/fog/fog.env ] || install -m 644 deploy/fog.env /etc/fog/fog.env
if [ -f /etc/fog/rclone.conf ]; then chown fog:fog /etc/fog/rclone.conf; chmod 600 /etc/fog/rclone.conf; fi

npm ci --omit=dev
install -m 644 deploy/fog-web.service deploy/fog-sync.service deploy/fog-sync.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now fog-sync.timer
systemctl start fog-sync.service || true
systemctl enable --now fog-web.service
