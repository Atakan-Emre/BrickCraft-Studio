# Prototype Instructions

## Current user direction (2026-09-08)

The user rejected the original dark step viewer. Build a real manual 3D construction editor: grab individual LEGO parts, rotate on all axes, place on the floor or other pieces. Tips appear only on request. Default to a light, monochrome interface with selectable light/dark themes. Integrate detailed licensed source models from LDraw OMR/GitHub; do not substitute tiny invented models. This direction supersedes the original selected dark mockup.

Latest feedback: prioritize enjoyable, reliable manual building over decorative additions. Expand the detailed model selection, fully support Turkish and English, and automatically restore each model workspace plus language, theme, and building preferences from localStorage. Verify dragging, turning, joining, and reopening through real browser interactions. Preserve existing builds during upgrades.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
