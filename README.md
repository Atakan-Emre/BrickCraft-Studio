# BrickCraft Studio

An interactive, browser-based 3D construction studio built with React, Three.js, and LDraw geometry. Select a detailed model, pick up individual bricks, rotate them on every axis, and assemble the build at your own pace.

BrickCraft Studio is available in English and Turkish, works entirely in the browser, and keeps each model workspace on the device that created it.

## Highlights

- Build manually with real LDraw part geometry instead of a step-by-step viewer.
- Drag, rotate, position, duplicate, and remove individual pieces in a 3D workspace.
- Switch between free-build and guided-build modes; optional hints never place pieces automatically.
- Explore six detailed models, including the Ferrari F40, Eiffel Tower, Carriage House, Sakura Bonsai, NASA Discovery, and Flower Bouquet.
- Restore the last workspace, selected model, language, theme, preferences, and favourites with `localStorage`.
- Use Turkish or English and choose a light or dark interface.
- Export a build as JSON and download a bill of materials as CSV.

## Quick start

**Requirements:** Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. For a production build:

```sh
npm run build
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Produce the deployable build in `dist/client`. |
| `npm test` | Run the application test suite. |
| `npm run test:sites` | Verify the generated worker hand-off files. |
| `npm run validate:models` | Validate LDraw geometry while the local server is running. |

## GitHub Pages

The included GitHub Actions workflow deploys the production build whenever a commit lands on `main`.

1. Create a GitHub repository named `brickcraft-studio`.
2. Push this project to its `main` branch.
3. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source.

The workflow supplies the repository base path during the build, so assets work at `https://<account>.github.io/brickcraft-studio/` without any local configuration. If you publish under another repository name, update `VITE_BASE_PATH` in `.github/workflows/deploy-pages.yml` to match it.

## How to use the editor

- Drag a part from the inventory to the workbench, then pick it up again to reposition it.
- Use the rotate tool's 3D rings or the X, Y, and Z controls. `R` rotates around Y; `Shift + R` rotates around X.
- Move a selected part up or down one plate at a time, or enter an exact position in the inspector.
- Press `F` to focus the camera, `D` to pick up another copy, `Delete` to remove a selected part, and `Esc` to cancel the active piece.
- Drag empty space to orbit the camera; right-drag to pan; scroll or pinch to zoom.
- Press `H` only when you want a placement hint. Hints identify a target part and location, but you always perform the placement.

## Model sources and attribution

| Model | Physical elements in source | Designer | License |
| --- | ---: | --- | --- |
| Ferrari F40 10248 | 1,157 | Magnus Forsberg | CC BY 2.0 |
| Eiffel Tower 21019 | 320 | Damien Roux; flexible axle by Orion Pobursky | CC BY 2.0 |
| Carriage House | 1,698 | Michael Horvath | CC BY-SA 4.0 |
| Sakura Bonsai 10281 / Cherry Blossoms | 751 | Orion Pobursky | CC BY 2.0 |
| NASA Discovery 10283 | 2,318 | Orion Pobursky | CC BY 2.0 |
| Flower Bouquet 10280 | 750 | Orion Pobursky | CC BY 2.0 |

See [SOURCES.md](SOURCES.md) for source links, provenance, and full attribution. The model counts are source-file physical elements, not official retail inventory counts. Original MPD source files are preserved without modification.

## Scope and limitations

Standard rectangular bricks and plates align to real stud spacing in horizontal and 90-degree orientations, and body collisions are prevented. Specialized parts use grid and surface alignment; a universal connection or collision simulation for pins, clips, hinges, and flexible elements is not included. A freely positioned specialized part can therefore intersect or float.

The app has no cloud account or server-side storage. Browser data is saved locally; clearing site data removes local workspaces. JSON export provides a portable backup.

BrickCraft Studio is an independent community prototype and is not affiliated with, endorsed by, or sponsored by the LEGO Group.

## License

The included third-party model sources retain their respective licenses listed above and in [SOURCES.md](SOURCES.md). No separate license has been granted for the application source code yet.
