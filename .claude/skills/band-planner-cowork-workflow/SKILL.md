---
name: band-planner-cowork-workflow
description: Meta-rules for how Cowork should collaborate with Nadie on the Band Planner project — implementation cadence (one step at a time, wait for confirmation), file-change reporting format, code style, decision authority (UI = Cowork's call, business logic = ask first), testing approach (manual only), performance posture, what NOT to do (no silent fixes, no renames, no merged steps), and Git habits. Read this skill at the START of every Band Planner session, before writing any code, even if Nadie hasn't explicitly mentioned it. It exists so we don't re-litigate working style every session.
---

# Band Planner — How We Work

These are the ground rules for the Band Planner project. They exist so Nadie doesn't have to re-explain them every session. Read this file at the start of every session, before touching any code.

## Cadence

- **One step at a time.** Implement one logical step, stop, report, wait for "继续" or feedback. Don't chain three features together because it "felt natural".
- A "step" is roughly one of: scaffolding the project, adding one entity + its CRUD, adding one page, fixing one bug. If you're in doubt about scope, it's probably too big — split it.
- Don't commit a giant pile of changes. Prefer many small, reviewable diffs.

## How to report file changes

Every time you finish a step, end the message with a short, factual summary in this exact shape:

> 我修改了 `src/App.tsx`, `src/store/persist.ts`，新增了 `src/pages/SongsPage.tsx`, `src/types/song.ts`。

No prose, no "I hope this helps". The list is the report. If you also ran a command (e.g., `npm install`), mention it on its own line.

## Code style

- **Functional components only.** No class components. Hooks for state.
- **TypeScript strict mode.** `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`. Don't sprinkle `any` to make errors go away — fix the types.
- **No useless comments.** Don't write `// loop over songs` above `for (const song of songs)`. Comments are for the *why*, not the *what*. Most code shouldn't need any.
- **No emojis** in code, in commit messages, or in UI strings (unless Nadie explicitly puts them there first).
- **Small, named functions** over long inline blocks. If a `useMemo` callback grows past 15 lines, lift it out.
- **Imports**: absolute imports via `@/` alias for anything inside `src/`. Relative imports only for files in the same folder.

## Decision authority

- **UI details — Cowork decides.** Padding, button placement, micro-copy, icon choice, exact shade of zinc. Just follow `band-planner-ui-conventions` and move on. Don't pepper Nadie with "should this card have `p-4` or `p-6`?".
- **Business logic — ask first.** Anything that changes what the data *means*: a new entity, a new field, a behavior change in the rehearsal A/B/C algorithm, a change to how shelved songs are filtered, a change to cascade-delete rules. Stop and ask.
- **In between (e.g., "should this list have a search box?")** — propose what you're going to do in one sentence, then do it unless Nadie objects. Don't ship a 200-line search component unannounced.

## Testing

- **Manual click-through only.** No Jest, no Vitest, no Playwright, no testing-library. Don't add test infrastructure.
- After every change: reload the dev server, click through the affected paths, verify nothing in the console.
- For data-model changes: also test with a fresh LocalStorage and with old-shape data (to verify migrations).

## Performance

- **Don't optimize proactively.** No `useMemo`/`useCallback` unless you have a measured reason (and you don't have one, because we don't profile). React's default rendering is fine for an app with dozens of songs and a handful of users.
- If Nadie says "this feels slow", *then* go look. Until then, write the simple version.

## Things NOT to do

- **Do not install new dependencies without asking.** Even if it's "just" `date-fns` or `clsx`. Ask first; the answer is often "we don't need it".
- **Do not rename existing files** unless explicitly asked. Renames break Nadie's mental map of the project and clutter diffs.
- **Do not merge multiple steps into one commit / one message.** If you finish step 3 and notice step 4 is "easy", stop anyway.
- **Do not silently "fix" things in unrelated code.** If you spot a bug while doing something else, mention it ("by the way I noticed X in `RehearsalPage.tsx` — want me to fix it next?") and let Nadie decide. Drive-by fixes hide in diffs and break trust.
- **Do not refactor "while you're in there".** Same reason.
- **Do not write README files, CONTRIBUTING files, or doc files** unless explicitly asked.
- **Do not add comments explaining what the next step would be.** Just stop.

## Git habits

- Commit at the end of each step, after Nadie confirms the step is good. Don't commit mid-step.
- Branch model: work on `main` unless Nadie says otherwise. This is a personal project; PR ceremony is overhead.
- **Commit message format** (Conventional Commits, lowercase, Chinese OK in body):
  ```
  <type>(<scope>): <short summary>

  <optional body>
  ```
  Types: `feat`, `fix`, `refactor`, `chore`, `style`, `docs`.
  Examples:
  - `feat(songs): add song list page with create/edit`
  - `fix(rehearsal): correct double-vocal coverage when only one vocalist attends`
  - `chore(setup): scaffold vite + react + ts + tailwind`
- Keep the summary line under ~70 chars. Body wraps at 72.
- **Never** force-push, rebase, or `git reset --hard` without asking.
- **Never** add the Claude co-author trailer to commits unless Nadie asks for it.

## When in doubt

Stop and ask one short question. One question is cheap; an hour of unwanted work isn't.
