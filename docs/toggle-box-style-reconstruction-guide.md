# Toggle Box Style Reconstruction Guide

This doc explains the exact implementation details for the toggle "box" visual style, including:

1. How it is styled and sized
2. How the renderer decides box vs switch
3. What payload fields must exist
4. Fallback/default behavior

Primary source:
- `src/app/editor/page.tsx`

---

## 1) Scope

This guide is for standard toggle assets only:
- `kind = "toggle"`
- Payload key: `"toggle-switch"`

This guide does not cover:
- `kind = "auto-toggle"` (different component and payload key)

---

## 2) Data model and defaults

## 2.1 Toggle-related fields on CanvasItem

```ts
toggleOn?: boolean;
toggleStyle?: "switch" | "box";
toggleTextAlign?: "left" | "center" | "right";
toggleTextSize?: number;
```

## 2.2 Base size constant

```ts
const TOGGLE_SIZE = { width: 52, height: 28 } as const;
```

## 2.3 New item defaults (when adding a toggle)

```ts
toggleOn: kind === "toggle" ? false : undefined,
toggleStyle: kind === "toggle" ? "switch" : undefined,
toggleTextAlign: kind === "toggle" ? "center" : undefined,
toggleTextSize: kind === "toggle" ? 10 : undefined,
```

Important:
- Default style is `"switch"`.
- Box style is opt-in (`toggleStyle = "box"`).

---

## 3) Style normalization (critical fallback)

The code uses this exact normalizer:

```ts
const normalizeToggleStyle = (value: unknown): "switch" | "box" =>
  value === "box" ? "box" : "switch";
```

Implications:
- Only the exact string `"box"` renders box style.
- Missing/invalid/unknown style values must fall back to `"switch"`.

---

## 4) Exact box look (copy-ready)

## 4.1 Core box control markup

This is the exact rendered control for box style:

```tsx
const boxControl = (
  <button
    type="button"
    className={`flex flex-none items-center justify-center rounded-md border transition-colors ${
      isOn
        ? "border-emerald-300/60 bg-emerald-500/20 text-emerald-200"
        : "border-white/20 bg-slate-800/80 text-white/70"
    }`}
    style={{
      width: boxPixelSize,
      height: boxPixelSize,
    }}
    onClick={() => {
      if (!isPreviewMode) return;
      onToggle(item.id);
    }}
    disabled={!isPreviewMode}
    aria-label={isOn ? "Toggle true" : "Toggle false"}
  >
    {isOn ? (
      <Check style={{ width: boxIconSize, height: boxIconSize }} />
    ) : (
      <X style={{ width: boxIconSize, height: boxIconSize }} />
    )}
  </button>
);
```

## 4.2 Visual token summary

Shared structure:
- `flex flex-none items-center justify-center rounded-md border transition-colors`

ON state classes:
- `border-emerald-300/60 bg-emerald-500/20 text-emerald-200`

OFF state classes:
- `border-white/20 bg-slate-800/80 text-white/70`

Icon choice:
- ON -> `<Check />`
- OFF -> `<X />`

---

## 5) Exact sizing math (must match)

The box size is derived from the same scale used by the switch version.

```ts
const switchScale = Math.max(
  0.35,
  Math.min(
    3.5,
    Math.min(item.width / TOGGLE_SIZE.width, item.height / TOGGLE_SIZE.height)
  )
);

const boxPixelSize = Math.max(12, Math.round(18 * switchScale));
const boxIconSize = Math.max(9, Math.round(12 * switchScale));
const toggleGap = Math.max(2, Math.round(8 * switchScale));
const resolvedTextSize = Math.max(6, textSize * switchScale);
```

If your viewer does not use this math, the recreated box will not match at non-default sizes.

---

## 6) Render decision: box vs switch

The exact branch is:

```tsx
{toggleStyle === "box" ? boxControl : switchControl}
```

Where `toggleStyle` must first be normalized:

```ts
const toggleStyle = normalizeToggleStyle(item.toggleStyle);
```

Strict rendering rule:
1. Read style from payload/editor state
2. Normalize it (`"box"` or fallback `"switch"`)
3. If `"box"` render the box control
4. Otherwise render the switch control

---

## 7) Label + alignment behavior

The text alignment applies to the label text, not to the checkbox icon itself.

```ts
const textClass =
  textAlign === "left"
    ? "text-left"
    : textAlign === "right"
      ? "text-right"
      : "text-center";
```

Label render snippet:

```tsx
<Label
  className={`min-w-0 truncate whitespace-nowrap leading-none text-white/80 ${textClass}`}
  style={{
    fontSize: resolvedTextSize,
    transform: isSwapMirrored ? "scaleX(-1)" : undefined,
    transformOrigin: "center center",
  }}
>
  {item.label}
</Label>
```

---

## 8) Payload contract (legacy payload[] transport)

For toggles, export uses key `"toggle-switch"` with this shape:

```json
{
  "toggle-switch": {
    "tag": "climbReady",
    "teamSide": "red",
    "autoTeleopScope": "teleop",
    "x": 12.3,
    "y": 45.6,
    "label": "Climb Ready",
    "value": false,
    "style": "box",
    "textAlign": "center",
    "textSize": 10,
    "stageParentTag": "",
    "width": 9.28,
    "height": 5
  }
}
```

Key fields for style selection:
- `style`: `"box"` or `"switch"` (anything else -> fallback to `"switch"`)
- `value`: boolean on/off state

Import mapping for this block:

```ts
if (isRecord(entry["toggle-switch"])) {
  const data = entry["toggle-switch"];

  return {
    kind: "toggle",
    label: typeof data.label === "string" ? data.label : "Toggle",
    toggleOn: Boolean(data.value),
    toggleStyle: normalizeToggleStyle(data.style),
    toggleTextAlign: data.textAlign === "left" || data.textAlign === "center" || data.textAlign === "right"
      ? data.textAlign
      : "center",
    toggleTextSize: readNumber(data.textSize, 10),
    // ...other fields omitted
  };
}
```

---

## 9) Editor-state contract (internal persisted shape)

Inside `editorState.items[]`, toggle style is stored as:

```json
{
  "kind": "toggle",
  "label": "Climb Ready",
  "toggleOn": true,
  "toggleStyle": "box",
  "toggleTextAlign": "center",
  "toggleTextSize": 10
}
```

If you rebuild from `editorState.items[]` directly:
- Render box only when `kind === "toggle"` and normalized `toggleStyle === "box"`
- Otherwise render switch style

---

## 10) Viewer-side decision algorithm (copy-ready)

```ts
type ToggleStyle = "switch" | "box";

const normalizeToggleStyle = (value: unknown): ToggleStyle =>
  value === "box" ? "box" : "switch";

function shouldRenderBoxVariant(input: {
  kind?: unknown;
  style?: unknown;
  payloadKey?: string;
}): boolean {
  const isToggleKind = input.kind === "toggle" || input.payloadKey === "toggle-switch";
  if (!isToggleKind) return false;
  return normalizeToggleStyle(input.style) === "box";
}
```

---

## 11) Exact examples for both variants

## 11.1 Box variant payload

```json
{
  "toggle-switch": {
    "tag": "intakeActive",
    "label": "Intake",
    "value": true,
    "style": "box",
    "textAlign": "center",
    "textSize": 10,
    "x": 0,
    "y": 0,
    "width": 9.28,
    "height": 5,
    "stageParentTag": ""
  }
}
```

## 11.2 Switch variant payload

```json
{
  "toggle-switch": {
    "tag": "intakeActive",
    "label": "Intake",
    "value": true,
    "style": "switch",
    "textAlign": "center",
    "textSize": 10,
    "x": 0,
    "y": 0,
    "width": 9.28,
    "height": 5,
    "stageParentTag": ""
  }
}
```

## 11.3 Missing/invalid style payload (must render switch)

```json
{
  "toggle-switch": {
    "tag": "intakeActive",
    "label": "Intake",
    "value": true,
    "style": "unknown-value"
  }
}
```

Expected render:
- Switch variant (not box)

---

## 12) Non-obvious parity notes

1. Interaction parity:
- In preview mode, clicking box toggles state.
- In edit mode, control is disabled for state changes from canvas (state edits happen in properties panel).

2. Mirror parity:
- Parent row may apply horizontal mirror (`scaleX(-1)`); label applies inverse mirror to preserve readable text.

3. Accessibility parity:
- Box control uses `aria-label` toggling between `"Toggle true"` and `"Toggle false"`.

4. If exact visual matching is required, do not substitute color tokens or rounding values.

---

## 13) Quick checklist for another AI

1. Parse toggle entries from `"toggle-switch"` or `kind: "toggle"`.
2. Normalize style with exact fallback: only `"box"` stays box.
3. Use the exact class stack for ON/OFF states.
4. Apply sizing math (`boxPixelSize`, `boxIconSize`) from `switchScale`.
5. Render label with alignment and scaled font.
6. Persist/export style in payload as `style`.
7. On unknown style values, render switch variant.
