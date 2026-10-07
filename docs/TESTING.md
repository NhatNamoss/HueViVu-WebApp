# Proportionate verification

| Change | Required checks |
|---|---|
| Copy-only change | Inspect changed text and link destinations; no full smoke suite/build |
| CSS/layout | Browser at affected sizes when available; check overflow and interaction states |
| React behavior/types | `npm run test:types`; focused lint for touched files; exercise affected flow |
| API/data workflow/permissions | Targeted requests including invalid input and unauthorized access; relevant smoke suite |
| Generator/optimizer | Representative durations/pacing; validator score, conflicts, empty days and finish times |
| Migration/import | Preserve existing records; validate draft/public separation; cleanup test records; SQLite integrity check when warranted |
| Broad feature/release | Types, lint, smoke suite and production build once after final source edits |

The smoke suite requires a running server. Use its actual port:

```powershell
$env:TEST_BASE_URL = 'http://localhost:3000'
npm run test:smoke
```

Never run dev and build against the same output directory concurrently. Stop dev before normal build, or use `NEXT_DIST_DIR` with a separate build directory; Next may add that directory to tsconfig, so inspect and remove only the generated temporary include afterward.

Passing TypeScript/API tests does not establish visual correctness. If Browser Use blocks access, report the concrete limitation; do not claim a browser test passed or route around the permission block.
