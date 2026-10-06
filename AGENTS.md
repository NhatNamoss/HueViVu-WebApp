# HueViVu product and UX principles

These instructions apply to every feature and interface change in this repository.

## Design for a first-time traveler

- Never assume users understand itinerary algorithms, AI, feasibility scores, taxonomy, or internal app structure.
- Every feature must make five things clear in natural Vietnamese: what it is, why it matters, when to use it, what happens after tapping, and what the user should do next.
- Translate system findings into real travel consequences: being late, rushing, missing a meal, arriving after closing, walking too far, or not having enough rest.
- Do not show a score without explaining the reasons and offering a useful next action.
- A tap must produce visible feedback. Never open or highlight an item silently and expect the user to infer how to edit it.
- Prefer one clear automatic remedy with preview and undo/cancel over asking users to manually repair several technical fields.
- Before applying material itinerary changes, show a plain-language before/after preview and request a simple confirmation.

## Interaction hierarchy

1. State the user's real-world problem.
2. Explain why it affects their trip.
3. Recommend one primary action.
4. Let HueViVu prepare the solution.
5. Preview concrete changes.
6. Apply only after the user chooses to proceed.
7. Confirm the outcome and show the new state.

## Retention standard

- Retention is built from every small interaction. Empty, loading, error, permission, success, and recovery states are product experiences, not implementation details.
- Avoid developer language in customer-facing UI.
- Use progressive disclosure: show the conclusion and action first; details remain available for users who want them.
- Test every important flow from the perspective of someone who installed HueViVu today and knows nothing about the product.
- A feature is incomplete until its discovery, explanation, action, feedback, failure recovery, and post-action state are all designed and tested.
