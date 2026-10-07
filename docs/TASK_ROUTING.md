# Task scope and reasoning recommendations

These recommendations guide task planning; they cannot change the current model or reasoning setting.

| Scope | Example | Suggested setting | Execution |
|---|---|---|---|
| Small and clear | Copy, styling, known null crash | Low; Luna for focused work | Inspect affected component and dependency; patch; focused verification |
| Connected feature | Form + API + validation | Sol Medium | Trace the complete user flow; implement; check contracts and recovery |
| High consequence | Roles, migrations, scheduling rules | Sol High | Check invariants, invalid cases, existing data and regression |
| Ambiguous large request | New phase or architecture | Sol Medium initially | Establish concrete deliverables; inspect existing capabilities; increase depth when evidence requires |

Avoid defaulting to Max/Ultra. Do not downgrade required reasoning merely because a task looks short. A one-line permission change can have greater consequences than a large styling change.

Prompt interpretation checklist:

1. What should the user be able to do afterward?
2. Which existing flow owns this behavior?
3. Which constraints from AGENTS.md and the request apply?
4. What evidence would demonstrate completion?

Use a project-local summary when handing off to a new chat; exclude unrelated history and credentials. Include accepted decisions, current files, outstanding work, and relevant test results.
