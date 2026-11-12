# SASES FOG

Field Operations Guide as an installable web app. Content is managed in a OneDrive folder; this project copies it, builds a static site and serves it. Once opened on a phone, the whole guide is stored on the device and works without a connection.

- Editors: see [docs/EDITOR-GUIDE.md](docs/EDITOR-GUIDE.md).
- All settings (site name, entry sizes, time zone, OneDrive folder name, colours): [`config.mjs`](config.mjs).

## Publishing with GitHub Pages

The **Publish** workflow (`.github/workflows/publish.yml`) runs every 15 minutes, on every push to `main`, and on demand (*Actions → Publish → Run workflow*). It downloads the OneDrive folder, and if the content or the app changed it builds the site and publishes it to GitHub Pages.

One-time setup:

1. **OneDrive access.** On a computer with [rclone](https://rclone.org/downloads/), run `rclone config` and create a remote named `onedrive` for the Microsoft account that holds the `FOG` folder. Run `rclone config show onedrive` and copy the whole output, including the `[onedrive]` line.
2. **Repository secret.** In *Settings → Secrets and variables → Actions*, add a secret named `RCLONE_CONF` containing that output.
3. **GitHub Pages.** In *Settings → Pages*, set *Source* to **GitHub Actions**.

The workflow keeps the OneDrive sign-in renewed by itself (an encrypted copy is kept in the Actions cache). If a run reports that it cannot connect, repeat steps 1 and 2. Files that could not be converted are listed as warnings on the run's summary page.

## How it works

1. `bin/sync.sh` (or the workflow) copies the OneDrive folder with rclone, then compares a fingerprint of the content with the last build. If nothing changed it stops.
2. `build/build.mjs` turns the folder tree into static pages: folders become sections, Word documents become pages, PDFs become pages of page pictures (via pdf.js) with a link to the original, pictures are resized to WebP. The finished build is swapped into place in one step.
3. `server/serve.mjs` serves the built folder. Any static file server can be used instead; unknown addresses must return `404.html`.
4. The service worker (`sw.js`, generated from `src/sw.js`) lists every file with a fingerprint. Devices download everything on the first visit and afterwards only the files whose fingerprint changed.

```
config.mjs        settings
build/            scan.mjs (folder rules), docx.mjs (Word to HTML), icons.mjs, render.mjs (pages), build.mjs
src/              app.css, app.js, sw.js
server/serve.mjs  static file server
bin/sync.sh       OneDrive copy + rebuild when changed (own server)
.github/          GitHub Pages workflow
deploy/           systemd units, settings file, reverse proxy example, install script
test/             Playwright checks
```

## Requirements

- Node.js 20.19 or later (the workflow uses 22)
- rclone 1.60 or later
- HTTPS in front of the server. Phones only allow installing and offline use on `https://` addresses.

## Running it on your own server instead

1. Copy this folder to `/opt/fog` (without `node_modules` and `data`).
2. Put the rclone config at `/etc/fog/rclone.conf` (see below).
3. Run `sudo /opt/fog/deploy/install.sh`. It creates the `fog` user, installs the dependencies, and enables:
   - `fog-web.service`: the web server on port 8043
   - `fog-sync.timer`: runs `fog-sync.service` every 15 minutes
4. Point the HTTPS reverse proxy at port 8043 (`deploy/Caddyfile.snippet`).

Settings for both services are in `/etc/fog/fog.env`. Content, the built site and state are under `/var/lib/fog`.

| Task | Command |
|---|---|
| Sync now | `systemctl start fog-sync.service` |
| Force a rebuild | `sudo -u fog env $(cat /etc/fog/fog.env) /opt/fog/bin/sync.sh --force` |
| Sync log | `journalctl -u fog-sync.service -n 50` |
| Last build report (warnings about skipped files) | `/var/lib/fog/dist/build-report.json` |
| Timer status | `systemctl list-timers fog-sync.timer` |

After changing app files in `/opt/fog`, the next sync rebuilds the site by itself.

## OneDrive access

- The rclone config holds a remote named `[onedrive]` for the Microsoft account that owns the `FOG` folder. It is a personal account (`drive_type = personal`).
- Location on the server: `/etc/fog/rclone.conf`, owner `fog`, mode 600. Treat it as a password. Never print it or commit it.
- rclone renews the access token and writes it back to this file, so the file must stay writable by the `fog` user.
- If the sync log shows a sign-in error, run `rclone config reconnect onedrive:` on a computer with a browser, then replace the file on the server with the updated config.
- The sync only reads from OneDrive. It never changes the OneDrive folder.

## Running it by hand

```sh
npm ci
node build/build.mjs path/to/content dist     # build
node server/serve.mjs dist 8043               # serve on http://localhost:8043
FOG_DATA=./data FOG_RCLONE_CONF=~/.fog-rclone.conf bin/sync.sh   # copy from OneDrive, build to data/dist
```

## Tests

Needs Playwright with Chromium.

```sh
NODE_PATH=<folder containing playwright>:$PWD/node_modules node test/e2e.cjs path/to/sample-content
node test/shots.cjs http://localhost:8043/ out-folder     # phone screenshots
```

The checks emulate an iPhone 13 and a Pixel 7 and cover: every page loading offline, layout width, search, section filter, pictures, colours, "Page not found", install rules, and an update (change a document, rebuild, reopen).

## Notes

- A file that cannot be read (corrupt document, EMF/WMF or HEIC picture) is skipped with a warning in the build report. A broken document shows "This document could not be displayed".
- If the content folder comes back empty, the build stops and the existing site is kept.
- Pages are plain HTML with relative links, so the site works under any address or sub-path.
