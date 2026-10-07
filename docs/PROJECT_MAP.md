# HueViVu project map

Read the rows relevant to the task, then inspect their direct dependencies.

| User flow | Entry points | Main dependencies |
|---|---|---|
| Home and discovery | `src/app/(main)/page.tsx`, `explore/page.tsx`, `places/[id]/page.tsx` | `PlaceCard`, `ExploreMap`, `/api/places` |
| Create a journey | `src/app/flow/page.tsx`, `src/app/api/trips/route.ts` | `astar.ts`, `travel-time.ts`, `itinerary-validator.ts`, `trip-presentation.ts` |
| View/edit/adapt journey | `src/app/trips/[id]/page.tsx`, `src/app/api/trips/[id]/*` | `trip-adapter.ts`, `trip-insertion.ts`, `FeasibilityAssistant`, `CinematicMap` |
| Opening hours | `src/lib/opening-hours.ts` | Collector form, place parsing, generator and validator |
| Live Guide | `src/app/live/page.tsx`, `/api/vision` | `place-data.ts`, published places, camera/speech lifecycle |
| Manual data collection | `src/app/admin/data-collector/*`, `src/components/admin/PlaceForm.tsx` | `place-data.ts`, `place-taxonomy.ts`, `place-duplicates.ts`, `/api/places/*` |
| Review/publish/tasks | `src/app/admin/data-tasks`, `/api/admin/data-tasks/*`, `/api/admin/data-quality` | `db.ts`, role checks, `audit.ts` |
| Authentication/admin | `src/lib/auth.ts`, `/api/auth/*`, `src/app/admin/layout.tsx`, `/api/admin/users` | JWT, user roles, guest sessions |
| Feedback/community/journal | `src/app/(main)/profile/feedback`, `community`, `journal` | `/api/feedback`, `/api/feed`, `/api/journal`, data tasks |
| Database/migrations | `src/lib/db.ts` | SQLite in `data/huevivu.db`; preserve human-entered data |
| Shared presentation | `src/app/globals.css`, `src/components/layout`, `src/components/ui` | App layout and responsive navigation |
| Verification | `scripts/smoke-test.js`, `package.json` | Running local server; test records are cleaned afterward |

Keep generation, optimization, and validation consistent. Publication and verification are independent states. Human verification must never be fabricated by AI.
