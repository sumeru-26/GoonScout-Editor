# Slider System Reconstruction Guide

This doc explains exactly how the **standard slider asset** works in the GoonScout editor so another AI can recreate it with matching behavior and payload contracts.

Primary source:
- `src/app/editor/page.tsx`

---

## 1) Scope (what this guide covers)

This guide is for `kind = "slider"` only (not `button-slider`).

It covers:
1. Data model fields
2. Default values on creation/import
3. Canvas rendering behavior
4. Preview runtime updates
5. Properties panel editing behavior
6. Exact payload shape in both export formats

---

## 2) Data model and defaults

## 2.1 CanvasItem fields used by slider

```ts
sliderMax?: number;
sliderMid?: number;
sliderLeftText?: string;
sliderRightText?: string;
```

Required common item fields:
- `id`, `kind`, `x`, `y`, `width`, `height`, `label`, `tag`

## 2.2 Default base size constant

```ts
const SLIDER_SIZE = { width: 260, height: 72 } as const;
```

## 2.3 Default values when adding a new slider

```ts
sliderMax: kind === "slider" ? 100 : undefined,
sliderMid: kind === "slider" ? 50 : undefined,
sliderLeftText: kind === "slider" ? "Low" : undefined,
sliderRightText: kind === "slider" ? "High" : undefined,
```

## 2.4 Import normalization defaults

From persisted/editor-state style imports:
- `sliderMax` -> min clamp to `1`, default `100`
- `sliderMid` -> min clamp to `0`, default `50`
- `sliderLeftText` -> default `"Low"`
- `sliderRightText` -> default `"High"`

From legacy `payload[]` slider block imports:
- `max` -> min clamp to `1`, default `100`
- `mid` -> min clamp to `0`, default `50`
- `leftText` -> default `"Low"`
- `rightText` -> default `"High"`

---

## 3) Canvas rendering (exact look + behavior)

Copy-ready render logic (trimmed to slider-specific block):

```tsx
function CanvasSlider({
  item,
  onResizeStart,
  onSelect,
  previewValue,
  onPreviewValueChange,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
  previewValue: number;
  onPreviewValueChange: (itemId: string, value: number) => void;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: Boolean(isPreviewMode),
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const max = Math.max(1, item.sliderMax ?? 100);
  const value = Math.max(0, Math.min(max, previewValue));
  const percent = max > 0 ? (value / max) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: toDragTransform(true, transform, snapOffset),
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transition: isPreviewMode ? undefined : "none",
        willChange: "transform",
      }}
      className={`group absolute rounded-md border border-white/15 bg-slate-900/90 p-2 ${
        isPreviewMode ? "transition-all duration-150 ease-out" : "!transition-none"
      }`}
      onPointerDownCapture={(event) => {
        if (!isPreviewMode) onSelect(item.id, { append: event.button === 2 });
      }}
      onContextMenu={(event) => {
        if (isPreviewMode) return;
        event.preventDefault();
        onSelect(item.id, { append: true });
      }}
      {...attributes}
      {...listeners}
      data-canvas-item="true"
    >
      <div className="relative flex h-full w-full flex-col justify-end gap-1 pt-4">
        <div className="pointer-events-none absolute left-0 top-0 max-w-full truncate text-[10px] font-medium text-white/85">
          {item.label || "Slider"}
        </div>

        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white"
          style={{ left: `${percent}%` }}
        >
          {value}
        </div>

        <Slider
          value={[value]}
          max={max}
          step={1}
          className="w-full"
          onValueChange={(next) => {
            if (!isPreviewMode) return;
            onPreviewValueChange(item.id, next[0] ?? 0);
          }}
        />

        <div className="flex items-center justify-between text-[10px] text-white/70">
          <span>{item.sliderLeftText ?? "Low"}</span>
          <span>{item.sliderRightText ?? "High"}</span>
        </div>
      </div>

      {!isPreviewMode ? (
        <span
          role="presentation"
          onPointerDown={(event) => onResizeStart(event, item)}
          className="absolute bottom-1 right-1 hidden h-3 w-3 cursor-se-resize rounded-sm border border-white/60 bg-white/80 group-hover:block"
        />
      ) : null}
    </div>
  );
}
```

Visual summary:
- Dark card shell: `rounded-md border border-white/15 bg-slate-900/90 p-2`
- Top-left small title
- Floating numeric bubble over track
- Left/right labels at bottom
- Resize handle in editor mode only

---

## 4) Preview runtime state updates

Slider value is tracked in `previewSliderValues`:

```ts
const [previewSliderValues, setPreviewSliderValues] = React.useState<Record<string, number>>({});
```

Update callback:

```ts
const handlePreviewSliderChange = React.useCallback((itemId: string, value: number) => {
  setPreviewSliderValues((prev) => ({
    ...prev,
    [itemId]: Math.max(0, Math.round(value)),
  }));
}, []);
```

Render-time read (in canvas switch):

```tsx
previewValue={
  previewSliderValues[item.id] ??
  Math.max(0, Math.min(item.sliderMax ?? 100, item.sliderMid ?? 50))
}
```

This means preview starts from `sliderMid` and then moves live as scout drags.

---

## 5) Properties panel controls (editor)

The selected slider exposes:
1. `Slider label`
2. `Tag`
3. `Max` (number, min `1`)
4. `Mid` (number, min `0`)
5. `Left text`
6. `Right text`

Core update shape:

```ts
item.id === selectedItem.id && item.kind === "slider"
  ? { ...item, sliderMax: next }
  : item
```

(and same structure for `sliderMid`, `sliderLeftText`, `sliderRightText`).

---

## 6) Payload format (exact)

There are two JSON channels used in this codebase.

## 6.1 Legacy transport `payload[]` block (export/import)

Exact slider export shape:

```json
{
  "slider": {
    "tag": "cycleControl",
    "teamSide": "red",
    "autoTeleopScope": "teleop",
    "x": -12.35,
    "y": 44.22,
    "label": "Cycle Pace",
    "max": 100,
    "mid": 50,
    "leftText": "Slow",
    "rightText": "Fast",
    "stageParentTag": "",
    "width": 26.14,
    "height": 9.35
  }
}
```

Notes:
- `tag` is required by validation if slider is in tag-required set.
- `max`/`mid` are numeric slider params.
- `leftText`/`rightText` are display captions.
- `autoTeleopScope` may be omitted when unscoped.

## 6.2 `editorState.items[]` shape

Exact item shape inside persisted editor state:

```json
{
  "id": "1d4e2fef-9d56-48d9-b3c0-824cf3dbf77a",
  "kind": "slider",
  "x": -12.35,
  "y": 44.22,
  "width": 26.14,
  "height": 9.35,
  "label": "Cycle Pace",
  "tag": "cycleControl",
  "sliderMax": 100,
  "sliderMid": 50,
  "sliderLeftText": "Slow",
  "sliderRightText": "Fast",
  "autoTeleopScope": "teleop"
}
```

---

## 7) Field mapping impact (backend)

Standard slider tags are categorized as **meta** in field mapping generation (not text):

```ts
if (kind === "toggle" || kind === "slider") {
  entries.push({ value: tag, bucket: "meta" });
  continue;
}
```

So slider tags appear in `field_mapping.meta` index list.

---

## 8) Rebuild checklist for another AI

1. Keep slider asset size default at `260 x 72`.
2. Clamp `max >= 1`, clamp `mid >= 0`.
3. Render floating value bubble positioned by `value / max`.
4. Use one-step integer slider changes (`step={1}`).
5. Start preview value from `sliderMid`.
6. Export/import both payload channels exactly (`payload[].slider` and `editorState.items[].slider*`).
7. Ensure slider tag maps into backend `meta` mapping bucket.

If another AI follows sections 3, 4, and 6 exactly, it can recreate the same slider behavior and payload format used by the current editor.