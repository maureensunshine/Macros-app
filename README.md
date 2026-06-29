# Macros

A personal nutrition tracker — no ads, no bloat, no foods that mysteriously vanish from search.

## What this is

Plain HTML/CSS/JS. No build step, no npm install required. Works as a Progressive Web App (PWA) — installable to a phone home screen, works offline, stores all data locally on your device via `localStorage`.

## Deploying

1. Create a new repository on GitHub (e.g. `macros-app`).
2. Upload all files in this folder to that repository (drag-and-drop via the GitHub web UI works fine — no command line needed).
3. Go to vercel.com, sign in with GitHub, click "Import Project," and select this repo.
4. Leave all settings at default (no framework, no build command needed) and deploy.
5. Once deployed, open the live URL on an Android phone in Chrome.
6. Tap the Chrome menu (three dots) → "Add to Home screen" / "Install app."

## Files

- `index.html` — app shell and styling
- `app.js` — all app logic (state, rendering, storage)
- `manifest.json` — PWA metadata (name, icons, theme color)
- `sw.js` — service worker, enables offline use
- `icon-192.png`, `icon-512.png` — home screen icons

## Data

Everything is stored in the browser's `localStorage` on the device it's installed on. There is no server, no account, no sync between devices. Foods and logged entries persist across app restarts and phone reboots, but are tied to that specific phone/browser combination — clearing browser data would erase it.
