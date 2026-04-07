---
name: band-planner-ui-conventions
description: UI consistency rules for the Band Planner app — colors, typography, spacing, button variants, table patterns, empty states, instrument color mapping, allowed shadcn/ui components, and Chinese font fallback. Use this skill ANY time you create a new component, new page, new tab, new modal, new form, or any new interaction. Even small visual decisions (which button variant, which gray) must follow this file — UI drift across tabs is the fastest way to make the app look amateurish, and once it drifts it's painful to claw back.
---

# Band Planner UI Conventions

The whole app should feel like one product, not five tabs glued together. Before you reach for a Tailwind class or a shadcn component, check this file. If something you need isn't covered, **add it here first**, then use it — that way the next page follows the same rule.

## Tech baseline

- React + TypeScript + Vite
- Tailwind CSS (core utilities only — no arbitrary values like `text-[13px]` unless absolutely necessary)
- shadcn/ui for primitives
- `lucide-react` for icons (no other icon libraries)

## Color palette

Use the **zinc** scale as the neutral. Not slate, not gray, not stone. Pick one and stick with it — mixing neutrals is the #1 source of "off" looking UIs.

| Role         | Class                                              |
|--------------|----------------------------------------------------|
| Page bg      | `bg-zinc-50`                                       |
| Card bg      | `bg-white`                                         |
| Border       | `border-zinc-200`                                  |
| Body text    | `text-zinc-900`                                    |
| Muted text   | `text-zinc-500`                                    |
| Primary      | `bg-zinc-900 text-white hover:bg-zinc-800`         |
| Secondary    | `bg-zinc-100 text-zinc-900 hover:bg-zinc-200`      |
| Danger       | `bg-red-600 text-white hover:bg-red-700`           |
| Success      | `text-emerald-600` / `bg-emerald-50`               |
| Warning      | `text-amber-600` / `bg-amber-50`                   |

Don't introduce a new accent color without updating this table.

## Typography

| Use                        | Class                          |
|----------------------------|--------------------------------|
| Page title (H1)            | `text-2xl font-semibold`       |
| Section heading (H2)       | `text-lg font-semibold`        |
| Card title                 | `text-base font-medium`        |
| Body                       | `text-sm`                      |
| Helper / caption           | `text-xs text-zinc-500`        |
| Table cell                 | `text-sm`                      |
| Table header               | `text-xs font-medium uppercase tracking-wide text-zinc-500` |

### Font family + Chinese fallback

In `index.css`:

```css
html { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; }
```

This makes 中文 render with the OS Chinese font instead of falling back to a serif. Don't use `font-sans` directly without this override — Tailwind's default stack has no CJK fonts.

## Spacing

Stick to Tailwind's 4px scale. Don't mix `p-3` and `p-3.5` in the same area.

| Element              | Padding/Gap        |
|----------------------|--------------------|
| Page outer container | `p-6`              |
| Card                 | `p-4` (small) / `p-6` (main) |
| Card stack gap       | `space-y-4`        |
| List item gap        | `gap-2`            |
| Form field gap       | `space-y-3`        |
| Tab bar margin-bottom| `mb-6`             |
| Inline icon + text   | `gap-2`            |

## Buttons

Variants come from shadcn `Button`. The decision tree:

- **`default`** — the primary action on the screen. **Exactly one per view.** "Save", "Add Song", "Plan Rehearsal".
- **`secondary`** — supporting actions next to the primary. "Cancel" lives here too.
- **`outline`** — toolbar buttons, filter toggles, "less important but still real" actions.
- **`ghost`** — icon-only buttons, table row actions, anything that should disappear visually until hovered.
- **`destructive`** — only for irreversible deletes. Pair with a confirm dialog. Never use it for "Cancel".

Sizes: `default` everywhere, `sm` inside tables, `icon` for icon-only.

## Tables

- `<thead>`: `bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500`
- Row hover: `hover:bg-zinc-50`
- Row dividers: `divide-y divide-zinc-200`
- Row actions live on the right, `ghost` size `icon`, only revealed on row hover (`opacity-0 group-hover:opacity-100`).
- Sortable header: cursor-pointer + arrow icon when active.
- Loading: skeleton rows (`animate-pulse bg-zinc-100`), not a spinner overlay.
- Empty: see "Empty states" below — never show a blank `<tbody>`.

## Forms

- Labels above inputs, `text-sm font-medium text-zinc-700`, `mb-1`.
- Validation message below input, `text-xs text-red-600 mt-1`.
- Submit button right-aligned in a `flex justify-end gap-2` footer, with `Cancel` (secondary) to its left.
- Required fields: small red asterisk after the label, no other indicator.

## shadcn/ui — allowed component list

Only import from this list. If you need something else, ask before adding it — every new component is a maintenance surface.

- `Button`
- `Input`, `Textarea`, `Label`
- `Select`
- `Checkbox`, `Switch`
- `Dialog`, `AlertDialog`
- `DropdownMenu`
- `Tabs`
- `Card` (`CardHeader`, `CardContent`, `CardFooter`)
- `Badge`
- `Tooltip`
- `Separator`
- `ScrollArea`

Off-limits without approval: `Command`, `Popover` (use `DropdownMenu`), `Sheet`, `Calendar` (use a native `<input type="date">`), `Accordion`, `HoverCard`, `Menubar`, `NavigationMenu`, `Resizable`, `Carousel`, `Drawer`.

## Instrument colors

Single source of truth. Used for badges, tag chips, the rehearsal visualizer, anywhere an instrument is shown. **Never hardcode these colors elsewhere — import from `src/lib/instruments.ts`.**

| Instrument       | Abbrev | Color family | Badge classes                                  |
|------------------|--------|--------------|-----------------------------------------------|
| `vocal`          | V      | purple       | `bg-purple-100 text-purple-800 border-purple-200` |
| `keys`           | K      | teal         | `bg-teal-100 text-teal-800 border-teal-200`       |
| `guitar_lead`    | G主    | coral/rose   | `bg-rose-100 text-rose-800 border-rose-200`       |
| `guitar_rhythm`  | G节    | amber        | `bg-amber-100 text-amber-800 border-amber-200`    |
| `drums`          | D      | orange       | `bg-orange-100 text-orange-800 border-orange-200` |
| `bass`           | B      | blue         | `bg-blue-100 text-blue-800 border-blue-200`       |

A single helper exports both the abbreviation and the classes:

```ts
export const INSTRUMENT_META: Record<Instrument, { abbrev: string; label: string; badge: string }> = { ... };
```

If a new instrument is ever added, update this table, the helper, and every dropdown that lists instruments. See `band-planner-add-feature` skill for the full checklist.

## Empty states

Never show a blank area. Every list view defines an empty state. Pattern:

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="h-10 w-10 text-zinc-300 mb-3" />
  <p className="text-sm font-medium text-zinc-900">还没有{thing}</p>
  <p className="text-xs text-zinc-500 mt-1 mb-4">{one-line context}</p>
  <Button>添加第一个{thing}</Button>
</div>
```

Specific copy:

- **Songs empty** — "还没有歌曲 / 添加你乐队的第一首歌"
- **Members empty** — "还没有成员 / 把乐队成员加进来才能开始排歌"
- **Assignments empty (single song)** — "这首歌还没分配人 / 给每个 part 指派一个成员"
- **Rehearsal: nobody attending** — "今天没人到场 / 在出勤表里勾选到场的人，A/B/C 三栏会自动算出来"
- **Rehearsal: A/B/C all empty** — show all three columns with their own "暂无" placeholder, **never** collapse the section.

## Icons

`lucide-react` only. Common ones: `Plus`, `Trash2`, `Pencil`, `MoreHorizontal`, `Music`, `Users`, `Calendar`, `Mic`, `Guitar`. Match icon size to text size: `h-4 w-4` next to `text-sm`, `h-5 w-5` next to `text-base`.
