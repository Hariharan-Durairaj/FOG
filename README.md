# SASES FOG

Field Operations Guide web app. Content is managed in a OneDrive folder and published as a website that can be installed on a phone and used without an internet connection.

- Content editors: see [EDITING.md](EDITING.md).
- The site is rebuilt from OneDrive every 15 minutes and published with GitHub Pages.

## How it works

1. The **Publish** workflow downloads the `FOG` folder from OneDrive with rclone.
2. `build/build.mjs` turns the folder tree into static pages: folders become tiles, Word documents become pages, images are resized to WebP.
3. A service worker stores every page and image on the device, so the installed app works offline and downloads only changed files when it is next online.
4. Scheduled runs skip publishing when nothing in OneDrive has changed.

## Setup

1. **OneDrive access.** On a computer with [rclone](https://rclone.org/downloads/), run `rclone config` and create a remote named `onedrive` for the account that holds the `FOG` folder. Then run `rclone config show onedrive` and copy the whole output, including the `[onedrive]` line.
2. **Repository secret.** In *Settings → Secrets and variables → Actions*, add a secret named `RCLONE_CONF` containing that output.
3. **GitHub Pages.** In *Settings → Pages*, set *Source* to **GitHub Actions**.
4. **First run.** In *Actions → Publish*, select **Run workflow**.

The workflow keeps the OneDrive sign-in refreshed by itself. If it ever reports that it cannot connect, repeat steps 1 and 2.

To use a different OneDrive folder, change `ONEDRIVE_FOLDER` in `.github/workflows/publish.yml`.

## Local development

Requires Node.js 20 or later.

```sh
npm install
node build/build.mjs path/to/content-folder
npm run serve
```

Then open http://localhost:4173.

Site name, tile sizes and time zone are set in `build/config.mjs`. Colours are set at the top of `src/assets/styles.css`.
