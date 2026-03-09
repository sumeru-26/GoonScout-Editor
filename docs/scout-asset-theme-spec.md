# Scout Asset Theme Spec (Exact Editor Look)

This is the source-of-truth handoff for recreating scout-view asset visuals to match the editor preview.

Primary source files:
- [src/app/editor/page.tsx](src/app/editor/page.tsx)
- [src/components/ui/switch.tsx](src/components/ui/switch.tsx)

## 1) Base size constants (exact)

```tsx
const BUTTON_SIZE = { width: 104, height: 44 } as const;
const ICON_BUTTON_SIZE = { width: 40, height: 40 } as const;
const MIRROR_LINE_SIZE = { width: 160, height: 80 } as const;
const COVER_SIZE = { width: 220, height: 120 } as const;
const INPUT_SIZE = { width: 220, height: 56 } as const;
const TOGGLE_SIZE = { width: 52, height: 28 } as const;
const AUTO_TOGGLE_SIZE = { width: 180, height: 40 } as const;
const LOG_SIZE = { width: 280, height: 120 } as const;
```

## 2) Shared Switch component (exact)

```tsx
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-white/25 bg-slate-800/80 shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-sky-300/50 data-[state=checked]:bg-sky-400/35 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-3.5 rounded-full bg-white ring-0 transition-transform data-[state=checked]:translate-x-[0.82rem] data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitives.Root>
  )
}

export { Switch }
```

## 3) Button / Icon / Action / Swap looks (exact styling logic)

```tsx
const style: React.CSSProperties = {
  transform: toDragTransform(isDragging, transform, snapOffset),
  left: item.x,
  top: item.y,
  width: item.width,
  height: item.height,
  opacity: 1,
  transition: isPreviewMode ? undefined : "none",
  willChange: "transform",
};

const swapRedSide = item.swapRedSide ?? "left";
const swapActiveSide = item.swapActiveSide ?? "left";
const isSwapRedActive = swapActiveSide === swapRedSide;
const swapOutlineClass =
  item.kind === "swap"
    ? isCustomSideLayoutsEnabled
      ? visibleTeamSide === "red"
        ? "!border-2 !border-red-400"
        : "!border-2 !border-blue-400"
      : isSwapRedActive
        ? "!border-2 !border-red-400"
        : "!border-2 !border-blue-400"
    : "border-white/20";
const buttonToneClass =
  item.kind === "submit"
    ? "!bg-white !text-black hover:!bg-white/90"
    : item.kind === "reset"
      ? "!bg-[#9e4042] !text-white hover:!bg-[#9e4042]/90"
      : "!bg-slate-900 !text-white hover:!bg-slate-900";

<Button
  variant="outline"
  size={item.kind === "icon" ? "icon" : "default"}
  className={`group absolute rounded-lg ${swapOutlineClass} ${buttonToneClass} ${
    isPreviewMode ? "transition-all duration-150" : "!transition-none"
  } ${
    isPreviewMode && isPreviewPressed
      ? "scale-[0.97] ring-2 ring-sky-300/70 !bg-slate-800"
      : ""
  }`}
>
```

Icon content style:

```tsx
<IconComponent
  className="h-5 w-5"
  style={{
    stroke: item.outlineColor ?? "currentColor",
    fill: item.fillColor ?? "none",
  }}
/>
```

Stage badge style:

```tsx
<span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-sky-300">
  <ChevronDown className="h-3 w-3" />
</span>
```

## 4) Mirror line looks (exact)

```tsx
<svg
  className="absolute left-0 top-0 overflow-visible"
  width={width}
  height={height}
>
  <line
    x1={relativeStartX}
    y1={relativeStartY}
    x2={relativeEndX}
    y2={relativeEndY}
    stroke="#ef4444"
    strokeWidth={isSnapped ? 5 : 3}
    strokeLinecap="round"
  />
</svg>
```

Editor handles:

```tsx
<button
  type="button"
  className="absolute h-4 w-4 -translate-x-2 -translate-y-2 rounded-full bg-red-500"
/>
```

## 5) Cover looks (exact)

```tsx
<div
  className={`group absolute rounded-md border ${
    isPreviewMode || isCoverVisible
      ? "border-white/10 bg-slate-900 transition-all duration-150 ease-out"
      : "border-dashed border-white/35 bg-white/5 !transition-none"
  }`}
>
```

Hidden cover message:

```tsx
<div className="pointer-events-none flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-white/60">
  Cover hidden
</div>
```

## 6) Input looks (exact)

```tsx
<div
  className={`group absolute flex flex-col gap-2 ${
    isPreviewMode ? "transition-all duration-150 ease-out" : "!transition-none"
  }`}
>
  <Label className="text-xs text-white/80">{item.label}</Label>
  <Input
    value={isPreviewMode ? previewValue : ""}
    placeholder={item.placeholder ?? "Enter text"}
    className="h-full"
    readOnly={!isPreviewMode}
  />
</div>
```

## 7) Log looks (exact)

```tsx
<div
  className={`group absolute rounded-md border border-white/15 bg-slate-900/90 p-2 ${
    isPreviewMode ? "transition-all duration-150 ease-out" : "!transition-none"
  }`}
>
  <div className="h-full overflow-auto rounded border border-white/10 bg-slate-950/90 p-2 text-[11px] leading-snug text-white/80">
    <pre className="whitespace-pre-wrap break-words font-sans">
      {logText || "Submit in preview to display input values."}
    </pre>
  </div>
</div>
```

## 8) Toggle looks (exact current implementation)

```tsx
const isOn = Boolean(item.toggleOn);
const textAlign = item.toggleTextAlign ?? "center";
const textSize = item.toggleTextSize ?? 10;
const textClass =
  textAlign === "left"
    ? "text-left"
    : textAlign === "right"
      ? "text-right"
      : "text-center";
const showLabel = Boolean(item.label);
const switchScale = Math.max(
  0.35,
  Math.min(
    3.5,
    Math.min(item.width / TOGGLE_SIZE.width, item.height / TOGGLE_SIZE.height)
  )
);
const switchPixelWidth = 32 * switchScale;
const switchPixelHeight = 18 * switchScale;
const resolvedTextSize = Math.max(6, textSize * switchScale);
```

```tsx
<div className="flex h-full w-full items-center gap-2 overflow-visible">
  <div
    className="flex flex-none items-center justify-start"
    style={{
      width: switchPixelWidth,
      height: switchPixelHeight,
      transform: `scale(${switchScale})`,
      transformOrigin: "left center",
    }}
  >
    <Switch
      id={`toggle-${item.id}`}
      checked={isOn}
      disabled={!isPreviewMode}
      onCheckedChange={() => {
        if (!isPreviewMode) return;
        onToggle(item.id);
      }}
    />
  </div>
  {showLabel ? (
    <Label
      className={`shrink-0 whitespace-nowrap leading-none text-white/80 ${textClass}`}
      style={{ fontSize: resolvedTextSize }}
    >
      {item.label}
    </Label>
  ) : null}
</div>
```

## 9) Auto-toggle looks (exact)

```tsx
<ToggleGroup
  type="single"
  value={mode}
  className="grid h-full w-full grid-cols-2 gap-1 rounded-md border border-white/20 bg-slate-900/90 p-1"
>
  <ToggleGroupItem
    value="auto"
    aria-label="Toggle auto"
    className="h-full rounded-sm border border-transparent text-[11px] text-white/85 data-[state=on]:border-2 data-[state=on]:border-white data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-black"
  >
    {autoLabel}
  </ToggleGroupItem>
  <ToggleGroupItem
    value="teleop"
    aria-label="Toggle teleop"
    className="h-full rounded-sm border border-transparent text-[11px] text-white/85 data-[state=on]:border-2 data-[state=on]:border-white data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-black"
  >
    Teleop
  </ToggleGroupItem>
</ToggleGroup>
```

## 10) Resize handle (all resizable assets, exact)

```tsx
<span
  role="presentation"
  className="absolute bottom-1 right-1 hidden h-3 w-3 cursor-se-resize rounded-sm border border-white/60 bg-white/80 group-hover:block"
/>
```

For toggle + auto-toggle this is at `bottom-0 right-0`.

## 11) Preview-specific behavior affecting visuals

- Preview presses on buttons apply this visual state:

```tsx
"scale-[0.97] ring-2 ring-sky-300/70 !bg-slate-800"
```

- Undo/Redo are inert in preview (visual remains, no action).
- Mirror lines are hidden in preview rendering.
- No resize handles in preview.

## 12) Required dependency for Switch

```json
"@radix-ui/react-switch": "<installed version>"
```

If you are cloning this in the scout app, install:

```bash
npm install @radix-ui/react-switch
```

and include the `Switch` component above.
