# GitHub Pages repair and code review — 2026-09-12

## Fixed findings

- **P1 — blank production page:** the deployed HTML requested `/brickcraft-studio/assets/...` while the live path is `/BrickCraft-Studio/`. The old JavaScript URL returned HTTP 404. Pages now supplies its actual base path before Vite builds.
- **P1 — model loading outside the deployment prefix:** model manifests, LDraw materials and geometry, previews, source downloads, and license links used root-relative URLs. JavaScript now resolves public resources through `assetUrl`; Vite handles HTML entry assets.
- **P2 — malformed saved/imported scale can throw:** scale validation now requires an array, preserving valid legacy records that omit scale.
- **P2 — duplicated completion claims:** restored pieces can no longer claim the same target more than once. The second piece remains in the build but loses the duplicate target claim.
- **P2 — browser shortcuts intercepted:** modified shortcuts such as Cmd/Ctrl+R and Cmd/Ctrl+F no longer trigger editor rotation or camera actions. Undo/redo remains supported.
- **P2 — target attraction could bypass collision rejection:** placement checks the final snapped position before committing and retains a rejected draft for repositioning.
- **Dependency review:** updated Vite 6.4.2 to 6.4.3 and compatible transitive patches. `npm audit` reported zero vulnerabilities after the update (five before).

## Validation

- Production builds for `/` and `/BrickCraft-Studio/` completed.
- 19 automated tests passed under both builds, including three added regression tests.
- Deployment verification passed for 646 distinct assets and all six model manifests under both prefixes.
- The actual Three.js LDraw parser validated all 621 geometry packages with no failures.
- Chrome opened the production preview under `/BrickCraft-Studio/`; all six models loaded their inventories.
- Manual checks covered part selection and placement, rotation, undo/redo, English/Turkish UI, theme changes, reload persistence, the completed Ferrari render, and hint-assisted placement reaching one matched target.
- GitHub About description, Pages website, and ten repository topics were saved and verified through the public repository API.

## Scope and remaining limitations

This is a focused deployment and editor correctness review, not a guarantee that all browser/device paths are defect-free. The large Three.js application chunk still produces Vite's size warning. Specialized pin, clip, hinge, and flexible-part connections are not universally simulated, as documented in README.md. CI checks build contents and unit tests; browser interactions above were manual checks.
