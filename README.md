# Kikoeru Quasar

The Vue 2 / Quasar 1 frontend for the self-hosted Kikoeru audio-work library. It is designed to run with the [kikoeru-express](https://github.com/camemb3rt/kikoeru-express) backend.

## Highlights in this fork

- `.lrc`, WebVTT (`.vtt`), and SubRip (`.srt`) lyric/subtitle playback.
- A draggable, resizable subtitle overlay with remembered browser position, font sizing, and colour controls.
- English metadata controls and an English UI pass for visible scanner messages.
- Per-work metadata refresh with confirmation, persistent live logs, cover refresh, and translated-work cover support.
- Random Work navigation that avoids the last three selections.
- Refined Tags, Voice Actors, and Circles browsing.
- Listening progress, reviews, ratings, and persistent favourites.

## Local development

Requirements: Node.js 20 or newer for the project tooling, and a running backend at `http://localhost:5232`.

```bash
npm ci
./node_modules/.bin/quasar dev --port 5233
```

Open `http://localhost:5233`. The development server proxies API and Socket.IO requests to the backend.

## Production build

```bash
./node_modules/.bin/quasar build
./node_modules/.bin/quasar build -m pwa
```

The backend Docker build can build this project directly through its named `frontend` build context. See the backend README for the full Docker command.

If you build this frontend Dockerfile as a separate Nginx container, Nginx continues to listen on its standard internal port `80`; publish it as `-p 5233:80` to make it available at `http://localhost:5233`.

## License

GNU General Public License v3.0.
