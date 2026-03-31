    # Team Select Stage Viewer Guide

This guide defines how linked Team Select stages should render in a viewer, how scoped data must swap per tab, and how payload should be interpreted.

Primary implementation source:
- `src/app/editor/page.tsx`

## 1) What This Feature Is

When a Team Select has `linkEachTeamToStage = true`, one staged layout is reused across team tabs.

Tabs:
- Standard tabs: `b1`, `b2`, `b3`, `r1`, `r2`, `r3`
- Optional tab: `general` (gray), only enabled when `addGeneralComments = true`

## 2) Required Rendering Behavior

## 2.1 Team Select trigger look

- `b*` selected: blue-tinted trigger background
- `r*` selected: red-tinted trigger background
- `general` selected: gray-tinted trigger background

## 2.2 Dropdown options

- Always render team options `b1...r3`
- Render `general` only when `addGeneralComments` is true

## 2.3 Stage visibility rules

If stage root is Team Select with `linkEachTeamToStage = true`:
- Selected team tab shows only `teams` scope stage children
- Selected `general` tab shows only `general` scope stage children

## 3) Data Swap/Retention Rules (critical)

When user switches Team Select tab, field values must not be overwritten.

Store values by scoped key:

```ts
const scopedKey = `${baseKey}::${teamSelectRootId}::${selectedTab}`;
```

Examples:
- `Strength::team-select-1::b1`
- `Strength::team-select-1::r2`
- `Strength::team-select-1::general`

Because each tab has a different key, switching tabs swaps visible values while retaining all previously entered values.

## 4) Stage Parenting Contract

For linked Team Select stages, export stage parent tag as:

```json
"stageParentTag": "TeamSelector"
```

This should be applied to stage children so viewers can resolve and render Team Select-linked stage content consistently.

## 5) Tag Suffix Rules for Linked Team Stage Fields

For any tagged staged child inside linked Team Select stage:

- Team scope export variants:
  - `tag-b1`, `tag-b2`, `tag-b3`, `tag-r1`, `tag-r2`, `tag-r3`
- General scope export variant:
  - `tag-general`

This is the payload-facing contract for downstream AI/viewers.

## 6) Viewer Pseudocode

```ts
type TeamTab = "b1" | "b2" | "b3" | "r1" | "r2" | "r3" | "general";

function getTeamTabs(addGeneralComments: boolean): TeamTab[] {
  const base: TeamTab[] = ["b1", "b2", "b3", "r1", "r2", "r3"];
  return addGeneralComments ? [...base, "general"] : base;
}

function getScopedKey(baseKey: string, teamSelectId: string, tab: TeamTab): string {
  return `${baseKey}::${teamSelectId}::${tab}`;
}

function shouldRenderStageChildForTab(childScope: "teams" | "general", tab: TeamTab): boolean {
  if (tab === "general") return childScope === "general";
  return childScope !== "general";
}
```

## 7) Example Payload (Team Select Stage + General Comments)

```json
{
  "payload": [
    {
      "team-select": {
        "tag": "TeamSelector",
        "x": -74.44,
        "y": 78.99,
        "label": "Drop Down",
        "width": 19,
        "height": 13.09,
        "stageParentTag": "",
        "linkEachTeamToStage": true,
        "showStageWithoutSelection": true,
        "addGeneralComments": true
      }
    },
    {
      "text-input": {
        "x": -48.19,
        "y": 26.41,
        "tag": "Strength-b1",
        "label": "Strength",
        "width": 45.25,
        "height": 31.53,
        "multiline": true,
        "valueType": "both",
        "placeholder": "Enter text",
        "stageParentTag": "TeamSelector"
      }
    },
    {
      "text-input": {
        "x": -48.19,
        "y": 26.41,
        "tag": "Strength-r1",
        "label": "Strength",
        "width": 45.25,
        "height": 31.53,
        "multiline": true,
        "valueType": "both",
        "placeholder": "Enter text",
        "stageParentTag": "TeamSelector"
      }
    },
    {
      "text-input": {
        "x": -48.19,
        "y": -20,
        "tag": "Strength-general",
        "label": "General Notes",
        "width": 45.25,
        "height": 31.53,
        "multiline": true,
        "valueType": "both",
        "placeholder": "Enter general comments",
        "stageParentTag": "TeamSelector"
      }
    }
  ]
}
```

## 8) Editor Behavior Notes

When `addGeneralComments` is enabled (qualitative forms):
- Team Select properties show `Add general layout` button
- Clicking it switches stage editing context to `general` scope
- Team-scoped staged children are hidden during general layout editing
- Newly placed staged assets are scoped to `general`
- Exported general tags use `-general` suffix

## 9) Summary

To recreate behavior correctly in another viewer/AI:
- Respect `addGeneralComments` for dropdown option list
- Use tab-scoped value keys to retain and swap data
- Filter staged child rendering by selected tab scope
- Resolve linked Team Select stage children through `stageParentTag = "TeamSelector"`
- Recognize `-general` tag variants as general-comments fields
