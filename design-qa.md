# Design QA — manual construction editor v3

Result: passed for the scope below. Preview: http://localhost:4173/.

## Current target and comparison

The user prioritizes better manual building, more detailed models, Turkish/English support, and automatic restoration on reopening. The previous correction remains binding: users grab, rotate and place individual parts themselves, hints appear on request, and the monochrome interface supports light and dark themes. The rejected dark step-viewer mock is historical, not the current target.

`qa/workbench-final.jpg` (previous editor) and `qa/workbench-v3.jpg` (current editor) were opened together in one comparison input. Both use 1280 × 720 CSS/screenshot pixels, light theme, Ferrari, and an empty construction table. The three-column hierarchy, camera tools and source-colored parts remain. Intentional changes: the TR/EN selector fits in the header; favorites and available-stock filters add one compact row; slightly larger part labels improve reading; selected-piece controls appear only when useful, leaving progress and the finished-model reference visible. The closer empty-table camera supports precise placement. No overlapping labels or cropped thumbnails were observed in this matched state.

New evidence:

- `qa/workbench-v3.jpg`: current default editor layout and contextual right panel.
- `qa/stud-building-v3.jpg`: two manually placed, stacked and rotated rectangular bricks, English UI and comparison window.
- `qa/catalog-v3.jpg`: six-model library with category filters and source-rendered previews.
- `qa/bonsai-v3.jpg`: completed Sakura Bonsai in the light Turkish interface.
- `qa/mobile-v3.jpg`: 390 × 844 viewport with a manually placed bouquet part and the tray closed.

The mobile viewport override was reset after testing. Gallery previews are complete PNG renders of the actual models; only the selected model loads its 3D geometry. A truncated Bonsai preview found during QA was regenerated and verified in full.

## Findings resolved

- Rectangular standard bricks and plates now align to stud positions with correct footprint parity and quarter-turn dimensions. Overlapping supported rectangular bodies are rejected before a drop or height change.
- Holding an existing piece preserves its grab offset, avoiding a jump to its center. Dragging it away from a stack can return it to the table. The first placed piece is framed closely enough to handle.
- Requested hints start near the model base, can locate the matching part in the tray, and close after successful placement. The next hint remains opt-in.
- A finished-model comparison window supports building without leaving the table.
- Favorites and remaining-stock filters reduce searching. The catalog adds nature and vehicle/space categories, three new detailed models, and per-model resume counts.
- Every model has an isolated local workspace. The last model, language, theme, build mode, snap preference and favorites restore on reopening. A matching-model guard prevents save races during switching.
- Legacy v2 arrays migrate without deletion. A backup preserves the previous valid workspace; a corrupt primary can recover from it. Quota and unavailable-storage failures are visible and do not overwrite the previous saved data.
- The interface, dialogs, help, model text, exports and accessibility labels support Turkish and English. Technical part terminology was expanded in Turkish while original source names remain searchable.
- A restored nonempty mobile workspace now closes the part tray so the build is visible immediately.

## Interaction verification

Actual browser interactions, rather than state injection, covered:

- Dragging a red 3004 brick from the tray onto the table: placed count increased and remaining stock decreased.
- Dragging a gray 3004 onto it: the top piece aligned at six plate units, with visibly engaged studs. Lowering it one plate was rejected as overlapping.
- Rotating the upper brick 90 degrees; dragging it off the stack to the table; undoing to restore the stack.
- Opening the comparison window while keeping manual controls available.
- Favoriting a part, filtering to favorites, reloading and recovering that favorite.
- Restoring two Ferrari pieces, English and free-build mode after reload; keeping independent one-piece Shuttle, Bonsai and Bouquet workspaces through model switches.
- Placing an actual Discovery hint target, a Bonsai round-corner plate, and a Bouquet special part. The Bonsai hint closed after matching its target.
- Opening all three new completed models and using the nature filter to show two results.
- At 390 × 844: dragging a part from the tray, placing it, closing the tray, and restoring the piece plus English/dark preferences after reload.
- Fresh final page load: no browser console errors or warnings.

QA-created pieces and the test favorite were removed using the app UI after verification. Existing user builds were preserved. The final preview is the completed Sakura Bonsai, Turkish, light theme; its manual table is empty.

## Automated verification

- `npm test`: 16 passing tests covering history, rotations, source-target matching, input validation, rectangular alignment/overlap, storage migration/isolation/recovery/failure, language interpolation and the existing protected Sites worker.
- `npm run validate:models`: all 621 unique geometry packages parsed with the actual Three.js LDrawLoader, finite positions and nonempty geometry; zero failures. Evidence: `public/models/geometry-validation.json`.
- `npm run build`: successful production build. The expected Three.js bundle-size advisory remains; it is not a build failure.
- Model-source processing: no unresolved part dependencies. Original MPDs and license attribution are retained.

The six source assemblies contain Ferrari F40 (1,157 elements), Eiffel Tower (320), Carriage House (1,698), Sakura Bonsai (751), NASA Discovery (2,318), and Flower Bouquet (750). These are source-file physical element counts, not retail box inventories.

## Scope and remaining limits

Physical alignment and body overlap prevention apply to recognized upright, axis-aligned rectangular bricks, plates and tiles. Tiles do not provide stud connections. Complex or tilted parts use grid/surface placement; universal Technic-pin, clip and hinge connection physics is not implemented. Unsupported special parts can intersect or float. Flexible parts retain source geometry.

Ferrari stickers are absent in its source. The house uses its supplied polygon print alternative. Discovery has Hubble deployed; its source omits a telescope attachment bracket and stowed solar-array tubes, and some TEXMAP label artwork is unavailable. These source limits are documented in the interface and README.

Pointer interactions were checked at desktop and mobile widths; real touch hardware and assistive-technology end-to-end use remain untested. There is no cloud account, multiplayer or remote persistence. Browser data deletion removes local builds; JSON export supplies a portable backup. No cloud deployment was performed.

No unresolved blocking issue was observed in the exercised flows. This result does not imply universal connector simulation or comprehensive hardware/accessibility coverage.
