---
name: council-review
description: Deep review of a change by five specialist reviewers in parallel — engine purity, persistence, interaction/a11y, product fit, and evidence — then chaired into one ranked report with the cheap open questions actually settled rather than listed. Use for changes that touch the engine, ProjectSettings, or a new interaction surface. For ordinary changes prefer /code-review.
---

Five specialists review the same diff at once, each on a remit narrow enough that their findings don't overlap. You chair: you gather the context they need, run them, settle the questions that are cheap to settle, and produce one ranked report.

The specialists live in `.claude/agents/`:

| Agent | Asks |
| --- | --- |
| `council-engine` | Does this keep `src/engine/`'s purity and output contract? |
| `council-persistence` | Can a user lose or corrupt a Project because of this? |
| `council-interaction` | Can everyone operate this, and can the interaction get stuck? |
| `council-product` | Is this the right thing, described the right way? |
| `council-evidence` | Is what this change claims actually demonstrated? |

## When *not* to use this

Say so and stop. A council is expensive and its cost is only worth paying when the change can fail in several unrelated ways at once.

- A dependency bump, a copy fix, a formatting pass, a single-file refactor → `/code-review`, or nothing.
- No diff, or a diff of only lockfiles/generated output → nothing to review.

Reach for the council when the change touches `src/engine/`, alters `ProjectSettings`, adds a new interaction surface, or spans the engine *and* the UI *and* persistence — i.e. exactly when a two-axis review would have to generalise.

## Process

### 1. Pin the fixed point and gather context

The fixed point is whatever the user said — a SHA, a branch, `main`, `HEAD~3`. If they didn't say, use the merge-base with `main`. Confirm it resolves (`git rev-parse`) and that `git diff <point>...HEAD` is non-empty **before** spawning anything; a bad ref should fail here, not five times in parallel.

Note the commit list (`git log <point>..HEAD --oneline`) and find the originating issue from the commit messages (`#123`, `Closes #45`). Fetch the issue body — `council-product` and `council-evidence` both need what was actually asked for. If there's no issue, say so in the brief rather than letting them guess.

### 2. Run all five in parallel

One message, five `Agent` calls, `subagent_type` set to each agent's name. Each brief must carry, because a sub-agent starts cold:

- The exact diff command and the commit list.
- The originating issue's text, verbatim, if there is one.
- A pointer to the repo's own documentation — `CLAUDE.md`, `CONTEXT.md`, `docs/DESIGN-PRINCIPLES.md`, `docs/DECISIONS.md`, `docs/BACKLOG.md`, `docs/adr/`. They can read; they can't know which files matter.
- A note on what tooling already covers, so nobody spends their budget there: `npm run lint` (oxlint, prettier, svelte-check), `npm run test`, `npm run test:e2e`.

Don't re-state each agent's remit in its brief — that's what its own definition is for, and repeating it invites drift.

### 3. Settle what's decidable

Each specialist reports a `Decidable` section: claims it couldn't verify by reading, plus the experiment that would settle each.

**Run them.** This is the step that makes a council worth its cost, and the repo's own history is the argument: an id-collision hazard was justified by analogy for one release and turned out to be measurable in a five-line browser probe; a "survives every export format" claim in a changelog was true, but nothing had checked it. Both were settled in minutes.

Prefer the cheapest instrument that answers the question — a `node -e`, a scratch Playwright spec, one added assertion. Two rules:

- **A probe that found something becomes a permanent test.** Don't delete the evidence.
- **Report what the probe actually returned**, including when it disproves the specialist. A reviewer being wrong is a finding about the review, and worth a line.

Anything too expensive to settle stays an open question in the report, labelled as such — never quietly upgraded to a fact.

### 4. Chair the report

Findings arrive with overlaps and wildly different gravity. Your job is judgement, not concatenation.

- **Merge duplicates.** Two specialists reaching the same defect from different directions is a signal it's real — say that once, attributed to both, not twice.
- **Rank by consequence**, not by which axis raised it: data loss and wrong rendering above a fragile abstraction, and both above a naming preference.
- **Resolve disagreements.** If two specialists conflict, decide, and say why. The repo's documented decisions win over a specialist's general instinct.
- **Drop the noise.** A finding outside its author's remit, or one that tooling already enforces, doesn't reach the report.

Structure:

```
## Must fix        — defects. What breaks, and the steps to reproduce.
## Worth fixing    — real but not blocking. Say what it costs to leave.
## Settled         — what the probes returned, including disproofs.
## Open            — questions too expensive to settle. Never dressed up as facts.
## Clean           — one line per axis that found nothing. Absence of findings is information.
```

End with the single worst finding and a recommendation: ship, ship-with-fixes, or rework.

## Why five, and why these five

Two axes (`/code-review`) generalise well and are the right default. They stop being enough when a change can fail in several unrelated ways at once — an engine change that renders correctly, persists correctly, and is still unusable by keyboard passes both axes.

Each specialist here maps to a failure class this project has actually shipped and then documented in `docs/DECISIONS.md` — duplicate SVG ids, autosave silently dying on a reactive proxy, a drag with no keyboard path, a glossary term wrong in user-facing copy, a test whose expectation encoded the bug. They are not generic reviewer archetypes; adding a sixth is only warranted when a sixth failure class earns its own entry there.
