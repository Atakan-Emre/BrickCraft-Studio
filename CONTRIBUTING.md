# Contributing to BrickCraft Studio

For a bug report, include the browser and operating system, model name, steps to reproduce, expected behavior, and any console error. Remove personal data from screenshots and exported builds.

## Local checks

Use Node.js 22.12+ and run:

```sh
npm ci
npm run build
npm test
npm run test:deployment
```

Also check the GitHub Pages prefix before proposing changes:

```sh
VITE_BASE_PATH=/BrickCraft-Studio/ npm run build
VITE_BASE_PATH=/BrickCraft-Studio/ npm run test:deployment
VITE_BASE_PATH=/BrickCraft-Studio/ npm run preview
```

At `http://localhost:4173/BrickCraft-Studio/`, check model switching, piece placement and rotation, undo/redo, reload persistence, and both languages. Keep browser exports and existing localStorage keys compatible. Use `assetUrl` for public resources referenced from JavaScript, including paths stored in model JSON.

Keep changes focused and describe their behavior and validation in your pull request. Add regression tests for behavior fixes. Preserve model author and license notices, and update SOURCES.md when adding or changing model assets. Do not change third-party licensing or include private data in fixtures.

GitHub Pages publishes `dist/client`; the separate worker and Sites packaging files must keep working. Application code has no separate license grant yet; see README.md for the current licensing status.
