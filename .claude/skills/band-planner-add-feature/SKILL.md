---
name: band-planner-add-feature
description: Checklists for safely adding things to the Band Planner — a new tab/page, a new field on an existing entity, a new instrument enum value, or a new interaction on an existing page. Use this skill ANY time the user says "add a tab", "add a field", "add an instrument", "add a button to X page", or anything similar. Adding a feature in this app touches 4-5 files (page, router, sidebar, types, store, migration) and missing one leaves the feature half-wired (invisible nav, blank route, broken persistence). Walk the relevant checklist top to bottom.
---

# Adding Features to Band Planner

This app has a router + sidebar + store + persisted state + types module. A "small" addition usually touches 4-5 files. The failure mode is silent: a missing sidebar entry means the new tab is invisible; a missing route means the link goes to a blank page; a missing migration means existing users crash on load. Use the right checklist below and don't skip steps.

After each addition, do a manual smoke test: reload the app from scratch (clear LocalStorage in one tab to verify the empty path also works), click into the new thing, hit save, reload again, confirm the data survives.

## Checklist 1 — Add a new tab / page

1. **Create the page component**
   - File: `src/pages/<Name>Page.tsx`
   - Default export a function component, no required props.
   - Use the layout pattern from existing pages (page title, container padding from the UI conventions skill).
   - If the page has no real content yet, render the empty-state placeholder, not a TODO comment.

2. **Wire the route**
   - File: `src/App.tsx` (or wherever the `<Routes>` lives).
   - Add `<Route path="/<slug>" element={<NamePage />} />`.
   - Import the page at the top.

3. **Add the sidebar entry**
   - File: `src/components/Sidebar.tsx` (or `Nav.tsx`).
   - Add an item with: label (Chinese label matching the rest of the app), icon from `lucide-react`, route path matching step 2.
   - Place it in the right position — order matters visually.

4. **If the new tab needs new persisted data:**
   - Add the entity interface in `src/types/index.ts` and re-export it from the types barrel.
   - Add the new array (e.g. `setlists: Setlist[]`) to `PersistedState` in `src/store/persist.ts`.
   - Add a migration in `src/store/migrations.ts` that initializes the new array to `[]` for existing users. Bump `schemaVersion`.
   - Add reducer actions in the store for create / update / delete, plus selectors.
   - Re-read `band-planner-data-model` skill for invariants (referential integrity, ID generation, date format).

5. **Smoke test**
   - Reload with existing data → migration ran, no console errors.
   - Reload with empty LocalStorage → empty state renders, "add first" button works.
   - Add an item, reload, item still there.
   - Click sidebar entry from another tab → navigates correctly, no flash of "not found".

## Checklist 2 — Add a new field to an existing entity

1. **Update the interface** in `src/types/index.ts`. If the field is **required**, you must write a migration that backfills it for existing rows. If **optional**, no migration needed but be deliberate — once you ship optional, every consumer must handle `undefined`.

2. **Update the form** that creates/edits this entity. Don't forget validation if the field is required.

3. **Update the list view** that displays this entity, if the field should be visible.

4. **Update the reducer actions** if create/update need to accept the new field.

5. **Update the migration chain** (only if required field): append a new migration in `src/store/migrations.ts`, bump `schemaVersion`. Migration sets a default value for every existing row of this entity.

6. **Re-check invariants** in `band-planner-data-model`. If the new field references another entity (an FK), add a cascade-delete rule and document it.

7. **Smoke test**
   - Existing data still loads.
   - New rows include the field.
   - Old rows display correctly with the migrated default.

## Checklist 3 — Add a new instrument enum value

This is the easiest checklist to mess up because the instrument list is referenced in many places.

1. **`src/types/index.ts`** — add to the `Instrument` union type.
2. **`src/lib/instruments.ts`** — add to `INSTRUMENT_META`: abbreviation, Chinese label, badge classes. Pick a color that doesn't clash with existing ones; update the table in `band-planner-ui-conventions` to match.
3. **All instrument dropdowns** — search the codebase for `Object.keys(INSTRUMENT_META)` or hardcoded instrument lists. Every `<Select>` that lists instruments must include the new one. If you find a hardcoded list, refactor it to read from `INSTRUMENT_META` so this never happens again.
4. **Member edit form** — verify the new instrument shows up in the "instruments this member can play" multi-select.
5. **Song edit form** — verify the new instrument shows up in the "required parts" picker.
6. **Migration** — not strictly needed (existing data has no rows referencing the new value), but if you're renaming an existing value (not adding), you absolutely need a migration that rewrites every `Member.instruments`, `Song.requiredParts`, and `Assignment.part` value.
7. **Visual check** — render a song that uses the new part, render a member that plays it, run through the rehearsal page to confirm A/B/C bucketing works.

## Checklist 4 — Add a new interaction to an existing page

For things like a row right-click menu, a bulk-action toolbar, an inline edit, etc.

1. **Use the allowed shadcn primitive** (`DropdownMenu`, `AlertDialog` for destructive confirms, etc. — see the UI conventions skill for the allowed list). Don't add a new component to the project unless asked.
2. **Wire the action** to a reducer call. Don't mutate state directly.
3. **Confirm destructive actions** with `AlertDialog`. Cascade-deletes (e.g., delete a Song) must be loud — the dialog should mention what else will be removed ("This will also delete N assignments").
4. **Update the list view's empty state** if your action could leave the list empty (delete all songs → show "no songs" not a blank table).
5. **Keyboard accessibility** — if the interaction has a primary path (e.g., "Enter to confirm"), make sure focus lands somewhere sensible after the action.
6. **Smoke test the unhappy paths** — undo doesn't exist, so test that "cancel" actually cancels and doesn't half-commit.

## Common things people forget

- The sidebar entry. Test by clicking from another tab, not by typing the URL.
- The migration. Test by loading the app with old data shape (manually edit LocalStorage to drop the new field, reload).
- Cascade deletes. Test by deleting a Song that has Assignments and checking the assignment list is also empty.
- Updating `band-planner-data-model` and `band-planner-ui-conventions` skills when you add a new entity, field, or color. **The skills are the spec; if they go stale, future changes will reintroduce inconsistency.**
