# HueViVu Agent Instructions

## Mandatory implementation loop

After every completed implementation task, the agent MUST:
1. Run relevant automated tests/type-check/build.
2. Start the HueViVu app locally using the project's existing development command.
3. Open the running app in a browser and inspect the actual UI.
4. Exercise the changed user flow manually/runtime-test it.
5. Check browser/runtime errors and obvious console/network failures.
6. If a UI/runtime issue is found, fix it and repeat the verification loop.
7. Only after visual/runtime verification may the task be marked complete in docs/PRODUCTION_TRACKER.html.
8. Never tick a tracker task merely because code was written or compilation passed.

## UI verification rule

For frontend changes, visual verification is mandatory. Prefer computer-use for end-to-end browser interaction and manage-long-running-process for a persistent dev server. Use debug-runtime-issue when the app runs but behavior is broken.

For API/backend-only changes, still run the app and exercise the affected API/user flow where practical.

## Production quality gate

A task is not done until code compiles/type-checks, automated checks pass, the app starts, the changed flow is exercised, the UI is visually inspected when applicable, runtime errors are investigated, and the tracker is updated only after all gates pass.

## Preferred skill stack

1. implement-project-change — inspect, focused edit, verify, diff.
2. manage-long-running-process — persistent dev server for UI/runtime checks.
3. computer-use — browser navigation, clicks, visual inspection.
4. debug-runtime-issue — runtime/interaction diagnosis and fixes.
5. review-code-changes — regression/security/coverage review for larger features.
6. codex-token-optimizer — reduce context/output waste for large logs.

Use delegate-coding-task only for genuinely independent non-overlapping work. Do not delegate tightly coupled work just to parallelize.

## Workflow efficiency

- Read the smallest relevant code scope first.
- Reuse existing APIs, components, validators and adaptation logic.
- Prefer deterministic, testable business logic over UI-only logic.
- Use targeted searches and bounded command output.
- Inspect git diff and git status before finishing.
- Never commit unless explicitly requested.
- Update docs/PRODUCTION_TRACKER.html only after actual completion and verification.

## Product principle

HueViVu is an AI travel companion for Huế. Prioritize real traveler problems: context -> decision -> useful action.

Progressively combine location + time + weather + itinerary + preferences + opening status + travel state into actionable recommendations.

## Current production documents

- docs/PRODUCTION_MASTER_BLUEPRINT.md — production roadmap and gates.
- docs/PRODUCTION_TRACKER.html — living implementation checklist.
