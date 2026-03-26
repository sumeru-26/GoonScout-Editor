# Auto/Teleop + Success Tracking Payload Guide

This file is a focused handoff for another AI to recreate only:

1. Auto/Teleop-specific controls and scoped assets
2. Success tracking buttons (check / fail overlay)
3. Exact payload formats to read/write

Primary source: `src/app/editor/page.tsx`.

---

## 1) Auto/Teleop system overview

There are **two separate concepts**:

1. **Auto-toggle asset** (`kind = "auto-toggle"` / payload key `"auto-toggle"`)
   - Holds current mode (`auto` or `teleop`)
   - Holds timers (`timerSeconds`, `teleopTimerSeconds`)
2. **Auto/Teleop scope on other assets** (`autoTeleopScope`)
   - Any scoped item is visible only when current mode matches
   - Unscoped items are always visible

---

## 2) Exact UI look (copy-ready)

## 2.1 Auto-toggle control look

```tsx
<ToggleGroup
  type="single"
  value={displayMode}
  className="grid h-full w-full grid-cols-2 rounded-md border border-white/20 bg-slate-900/90"
  style={{ gap: groupGap, padding: groupPadding }}
>
  {orderedModes.map((entryMode) => (
    <ToggleGroupItem
      key={entryMode}
      value={entryMode}
      aria-label={entryMode === "auto" ? "Toggle auto" : "Toggle teleop"}
      size="sm"
      className="!h-full min-h-0 min-w-0 rounded-sm border border-transparent px-1 text-white/85 data-[state=on]:border-2 data-[state=on]:border-white data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-black"
      style={{ fontSize: textSize }}
    >
      {entryMode === "auto" ? autoLabel : "Teleop"}
    </ToggleGroupItem>
  ))}
</ToggleGroup>
```

`autoLabel` is either `"Auto"` or countdown text like `"12s"`.

## 2.2 Scope badge look (for auto/teleop-scoped assets)

```tsx
{item.autoTeleopScope && !isPreviewMode ? (
  <span
    className={`pointer-events-none absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
      item.autoTeleopScope === "auto"
        ? "bg-amber-500/90 text-black"
        : "bg-cyan-500/90 text-black"
    }`}
  >
    {item.autoTeleopScope === "auto" ? "A" : "T"}
  </span>
) : null}
```

- `A` = auto-scoped
- `T` = teleop-scoped

## 2.3 Success button overlay look

```tsx
{previewSuccessOpen ? (
  <span
    className="absolute inset-0 grid grid-cols-2 overflow-hidden rounded-md"
    style={{
      transform: `translate(${item.successPopoverOffsetX ?? 0}px, ${item.successPopoverOffsetY ?? 0}px)`,
    }}
  >
    <button
      type="button"
      className="flex items-center justify-center bg-emerald-600/90 text-white"
      onClick={(event) => {
        event.stopPropagation();
        onPreviewSuccessSelect(item.id, "success");
      }}
    >
      <Check className="h-4 w-4" />
    </button>
    <button
      type="button"
      className="flex items-center justify-center bg-rose-600/90 text-white"
      onClick={(event) => {
        event.stopPropagation();
        onPreviewSuccessSelect(item.id, "fail");
      }}
    >
      <X className="h-4 w-4" />
    </button>
  </span>
) : null}
```

When success tracking is enabled, the item also gets a small green check badge:

```tsx
{item.successTrackingEnabled ? (
  <span className="pointer-events-none absolute -left-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-900 text-emerald-200">
    <Check className="h-2.5 w-2.5" />
  </span>
) : null}
```

---

## 3) Runtime behavior (must match)

## 3.1 Active mode resolver

```ts
const activeAutoTeleopMode = React.useMemo<AutoTeleopScope>(() => {
  const toggle = items.find((item) => item.kind === "auto-toggle");
  return toggle?.autoToggleMode === "teleop" ? "teleop" : "auto";
}, [items]);
```

## 3.2 Effective visibility mode

```ts
const effectiveAutoTeleopVisibilityMode: AutoTeleopScope | null =
  isPreviewMode ? activeAutoTeleopMode : autoTeleopVisibilityMode;
```

## 3.3 Scoped filtering

```ts
return sideFiltered.filter((item) => {
  if (item.kind === "mirror") return true;
  if (!item.autoTeleopScope) return true;
  return item.autoTeleopScope === effectiveAutoTeleopVisibilityMode;
});
```

## 3.4 Success click routing (text/icon)

```ts
if (item.kind === "icon" || item.kind === "text") {
  if (item.successTrackingEnabled) {
    onPreviewSuccessToggle(item.id);
    return;
  }
  if (normalizeButtonPressMode(item.buttonPressMode) === "hold") {
    return;
  }
  onPreviewStageToggle(item.id);
  return;
}
```

---

## 4) Payload format: what to look for

This project supports two payload channels:

1. Legacy-style `payload: []` entries (export/import transport)
2. `editorState.items[]` internal shape

Use both when rebuilding.

---

## 5) Legacy `payload[]` format (examples)

## 5.1 Auto-toggle block

```json
{
  "auto-toggle": {
    "x": 50.26,
    "y": 57.69,
    "mode": "teleop",
    "label": "Auto Toggle",
    "width": 46.2,
    "height": 11.54,
    "timerSeconds": 15,
    "teleopTimerSeconds": 135,
    "stageParentTag": ""
  }
}
```

## 5.2 Auto/Teleop-scoped button/icon block

```json
{
  "icon-button": {
    "x": -83.25,
    "y": 31.36,
    "tag": "outpost",
    "icon": "ArrowUp",
    "width": 9.15,
    "height": 6.45,
    "outline": "#ffffff",
    "fill": "transparent",
    "increment": 1,
    "pressMode": "tap",
    "trackSuccess": true,
    "autoTeleopScope": "auto",
    "stageParentTag": "",
    "removeParentTag": false,
    "hideAfterSelection": false,
    "blurBackgroundOnClick": false,
    "hideOtherElementsInStage": false,
    "hasStageChildren": false
  }
}
```

`autoTeleopScope` can be `"auto"` or `"teleop"` on exported asset blocks.

## 5.3 Success tracking field in payload

Success tracking in legacy transport is:

- `trackSuccess: true | false` on `button` and `icon-button`

Example (`icon-button`):

```json
{
  "icon-button": {
    "tag": "outpost",
    "trackSuccess": true,
    "pressMode": "tap"
  }
}
```

---

## 6) `editorState.items[]` format (examples)

## 6.1 Auto-toggle item

```json
{
  "id": "dae0d7f5-fa4a-4fb6-a66f-09d47e6e1db0",
  "kind": "auto-toggle",
  "label": "Auto Toggle",
  "x": 50.26,
  "y": 57.69,
  "width": 46.2,
  "height": 11.54,
  "autoToggleMode": "teleop",
  "autoToggleDurationSeconds": 15,
  "autoToggleTeleopDurationSeconds": 135
}
```

## 6.2 Scoped icon item

```json
{
  "id": "f4e8bfc7-59b6-4a51-949a-dc5bd48f2214",
  "kind": "icon",
  "tag": "outpost",
  "iconName": "ArrowUp",
  "buttonPressMode": "tap",
  "autoTeleopScope": "auto",
  "successTrackingEnabled": true,
  "successPopoverOffsetX": 0,
  "successPopoverOffsetY": 0
}
```

## 6.3 Success fields in editor state

`editorState.items[]` uses:

- `successTrackingEnabled: boolean`
- `successPopoverOffsetX: number`
- `successPopoverOffsetY: number`

Important: popover offsets are runtime/editor presentation fields; legacy `payload[]` currently exports `trackSuccess` but not popover offsets.

---

## 7) Import mapping rules (payload -> editor state)

For legacy `payload[]` imports:

- `auto-toggle.mode` -> `autoToggleMode`
- `auto-toggle.timerSeconds` -> `autoToggleDurationSeconds`
- `auto-toggle.teleopTimerSeconds` -> `autoToggleTeleopDurationSeconds`
- `button.trackSuccess` / `icon-button.trackSuccess` -> `successTrackingEnabled`
- `autoTeleopScope` (on entries) -> `autoTeleopScope`

Copy-ready mapping excerpt:

```ts
successTrackingEnabled:
  resolvedKind === "text"
    ? normalizeStageParentOption(data.trackSuccess)
    : undefined,

successTrackingEnabled: normalizeStageParentOption(data.trackSuccess),

autoTeleopScope:
  value.autoTeleopScope === "auto" || value.autoTeleopScope === "teleop"
    ? value.autoTeleopScope
    : undefined,
```

---

## 8) Export mapping rules (editor state -> payload)

## 8.1 Text button export

```ts
button: {
  tag,
  teamSide: item.teamSide,
  autoTeleopScope: item.autoTeleopScope,
  pressMode: normalizeButtonPressMode(item.buttonPressMode),
  trackSuccess: item.successTrackingEnabled === true,
  ...
}
```

## 8.2 Icon button export

```ts
"icon-button": {
  tag,
  teamSide: item.teamSide,
  autoTeleopScope: item.autoTeleopScope,
  pressMode: normalizeButtonPressMode(item.buttonPressMode),
  trackSuccess: item.successTrackingEnabled === true,
  ...
}
```

## 8.3 Auto-toggle export

```ts
"auto-toggle": {
  teamSide: item.teamSide,
  autoTeleopScope: item.autoTeleopScope,
  x: scaleX(centerItemX),
  y: scaleY(centerItemY),
  label: item.label,
  mode: item.autoToggleMode ?? "auto",
  timerSeconds: item.autoToggleDurationSeconds ?? 15,
  teleopTimerSeconds: item.autoToggleTeleopDurationSeconds ?? 135,
  stageParentTag,
  width: scaleWidth(item.width),
  height: scaleHeight(item.height),
}
```

---

## 9) Payload detection checklist (for other AI)

When parsing incoming payload, look for these exact keys:

1. `payload[].auto-toggle.mode`
2. `payload[].auto-toggle.timerSeconds`
3. `payload[].auto-toggle.teleopTimerSeconds`
4. `payload[].*.autoTeleopScope` (where `*` is button/icon/movement/input/toggle/slider/etc.)
5. `payload[].button.trackSuccess`
6. `payload[].icon-button.trackSuccess`

When parsing `editorState.items[]`, look for:

1. `kind === "auto-toggle"`
2. `autoToggleMode`, `autoToggleDurationSeconds`, `autoToggleTeleopDurationSeconds`
3. `autoTeleopScope`
4. `successTrackingEnabled`
5. `successPopoverOffsetX`, `successPopoverOffsetY`

---

## 10) Minimal full example payload (combined)

```json
{
  "payload": [
    {
      "auto-toggle": {
        "x": 50.26,
        "y": 57.69,
        "mode": "teleop",
        "label": "Auto Toggle",
        "width": 46.2,
        "height": 11.54,
        "timerSeconds": 15,
        "teleopTimerSeconds": 135,
        "stageParentTag": ""
      }
    },
    {
      "icon-button": {
        "x": -83.25,
        "y": 31.36,
        "tag": "outpost",
        "icon": "ArrowUp",
        "width": 9.15,
        "height": 6.45,
        "outline": "#ffffff",
        "fill": "transparent",
        "increment": 1,
        "pressMode": "tap",
        "trackSuccess": true,
        "autoTeleopScope": "auto",
        "stageParentTag": ""
      }
    }
  ],
  "editorState": {
    "items": [
      {
        "id": "toggle-1",
        "kind": "auto-toggle",
        "label": "Auto Toggle",
        "x": 50.26,
        "y": 57.69,
        "width": 46.2,
        "height": 11.54,
        "autoToggleMode": "teleop",
        "autoToggleDurationSeconds": 15,
        "autoToggleTeleopDurationSeconds": 135
      },
      {
        "id": "icon-1",
        "kind": "icon",
        "tag": "outpost",
        "label": "ArrowUp",
        "x": -83.25,
        "y": 31.36,
        "width": 9.15,
        "height": 6.45,
        "iconName": "ArrowUp",
        "buttonPressMode": "tap",
        "autoTeleopScope": "auto",
        "successTrackingEnabled": true,
        "successPopoverOffsetX": 0,
        "successPopoverOffsetY": 0
      }
    ]
  }
}
```

---

If another AI follows sections 2, 3, 5, 6, and 8 exactly, it can recreate both the visuals and payload contracts for auto/teleop and success systems.