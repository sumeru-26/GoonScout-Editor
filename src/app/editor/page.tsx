"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import * as LucideIcons from "lucide-react";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Redo2,
  Save,
  Settings,
  Square,
  ToggleLeft,
  Type,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const BUTTON_SIZE = { width: 104, height: 44 } as const;
const ICON_BUTTON_SIZE = { width: 40, height: 40 } as const;
const MIRROR_LINE_SIZE = { width: 160, height: 80 } as const;
const COVER_SIZE = { width: 220, height: 120 } as const;
const INPUT_SIZE = { width: 220, height: 56 } as const;
const TOGGLE_SIZE = { width: 64, height: 36 } as const;
const FIELD_HEIGHT = 560;
const ICON_GRID_COLUMNS = 6;
const ICON_CELL_SIZE = 48;
const ICON_CELL_OFFSET = 4;
const MIRROR_SNAP_PX = 8;
const GUIDE_SNAP_PX = 6;
const AUTOSAVE_DELAY_MS = 1500;

const gcd = (a: number, b: number): number => {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
};

const ICON_COMPONENTS = Object.entries(LucideIcons).reduce(
  (acc, [name, value]) => {
    if (!name || name[0] !== name[0]?.toUpperCase()) return acc;
    if (name === "Icon" || name === "LucideIcon" || name === "icons") {
      return acc;
    }
    if (
      typeof value === "function" ||
      (typeof value === "object" && value !== null && "$$typeof" in value)
    ) {
      acc[name] =
        value as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>;
    }
    return acc;
  },
  {} as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>
);

const ICON_NAMES = Object.keys(ICON_COMPONENTS);

type AssetKind =
  | "text"
  | "icon"
  | "mirror"
  | "swap"
  | "cover"
  | "input"
  | "toggle";

type CanvasItem = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  kind: AssetKind;
  tag?: string;
  iconName?: string;
  outlineColor?: string;
  fillColor?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  placeholder?: string;
  toggleOn?: boolean;
  toggleTextAlign?: "left" | "center" | "right";
  toggleTextSize?: number;
  stageParentId?: string;
};

type DragType = "palette" | "canvas";

type DragData = {
  type: DragType;
  itemId?: string;
  assetKind?: AssetKind;
};

type DragSnapOffset = {
  itemId: string | null;
  x: number;
  y: number;
};

type PersistedEditorState = {
  items: CanvasItem[];
  aspectWidth: string;
  aspectHeight: string;
  backgroundImage: string | null;
};

type EditorSnapshot = {
  items: CanvasItem[];
  aspectWidth: string;
  aspectHeight: string;
  backgroundImage: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parsePersistedEditorState = (
  payload: unknown
): PersistedEditorState | null => {
  const source =
    isRecord(payload) && isRecord(payload.editorState)
      ? payload.editorState
      : isRecord(payload)
        ? payload
        : null;

  if (!source || !Array.isArray(source.items)) {
    return null;
  }

  const aspectWidth =
    typeof source.aspectWidth === "string" ? source.aspectWidth : "16";
  const aspectHeight =
    typeof source.aspectHeight === "string" ? source.aspectHeight : "9";
  const backgroundImage =
    typeof source.backgroundImage === "string" ? source.backgroundImage : null;

  return {
    items: source.items as CanvasItem[],
    aspectWidth,
    aspectHeight,
    backgroundImage,
  };
};

const toDragTransform = (
  isDragging: boolean,
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null,
  snapOffset?: { x: number; y: number }
) => {
  if (!isDragging || !transform) return undefined;
  return CSS.Translate.toString({
    ...transform,
    x: transform.x + (snapOffset?.x ?? 0),
    y: transform.y + (snapOffset?.y ?? 0),
  });
};

const getClientPointFromEvent = (
  event: Event | null | undefined
): { x: number; y: number } | null => {
  if (!event) return null;

  const pointerLike = event as MouseEvent;
  if (
    typeof pointerLike.clientX === "number" &&
    typeof pointerLike.clientY === "number"
  ) {
    return { x: pointerLike.clientX, y: pointerLike.clientY };
  }

  const touchLike = event as TouchEvent;
  const firstTouch = touchLike.touches?.[0] ?? touchLike.changedTouches?.[0];
  if (firstTouch) {
    return { x: firstTouch.clientX, y: firstTouch.clientY };
  }

  return null;
};

type PaletteButtonProps = {
  onPalettePointerDown: (
    assetKind: AssetKind,
    event: React.PointerEvent<HTMLButtonElement>
  ) => void;
};

function PaletteButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: "palette-button",
      data: { type: "palette", assetKind: "text" } satisfies DragData,
    });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 bg-slate-900/70 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80"
      onPointerDownCapture={(event) => onPalettePointerDown("text", event)}
      {...attributes}
      {...listeners}
      type="button"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-300">
        <Square className="h-4 w-4" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Button</span>
        <span className="text-xs text-white/55">Small clickable action</span>
      </span>
    </Button>
  );
}

function PaletteIconButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: "palette-icon-button",
      data: { type: "palette", assetKind: "icon" } satisfies DragData,
    });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 bg-slate-900/70 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80"
      onPointerDownCapture={(event) => onPalettePointerDown("icon", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Icon button"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
        <Bot className="h-4 w-4" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Icon Button</span>
        <span className="text-xs text-white/55">Configurable icon action</span>
      </span>
    </Button>
  );
}

function PaletteMirrorButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-mirror-line",
    data: { type: "palette", assetKind: "mirror" } satisfies DragData,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 bg-slate-900/70 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80"
      onPointerDownCapture={(event) => onPalettePointerDown("mirror", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Mirror line"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
        <span className="h-5 w-0.5 rounded-full bg-red-400" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Mirror Line</span>
        <span className="text-xs text-white/55">Reference line for side swap</span>
      </span>
    </Button>
  );
}

function PaletteSwapButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-swap-sides",
    data: { type: "palette", assetKind: "swap" } satisfies DragData,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="mx-auto h-10 w-[calc(100%-8px)] justify-center rounded-xl border-white/10 bg-slate-900/70 text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80"
      onPointerDownCapture={(event) => onPalettePointerDown("swap", event)}
      {...attributes}
      {...listeners}
      type="button"
    >
      Swap sides
    </Button>
  );
}

function PaletteCoverButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-cover",
    data: { type: "palette", assetKind: "cover" } satisfies DragData,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 bg-slate-900/70 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80"
      onPointerDownCapture={(event) => onPalettePointerDown("cover", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Cover"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-300">
        <Square className="h-4 w-4" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Cover</span>
        <span className="text-xs text-white/55">Occludes a field region</span>
      </span>
    </Button>
  );
}

function PaletteInputButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-input",
    data: { type: "palette", assetKind: "input" } satisfies DragData,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 bg-slate-900/70 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80"
      onPointerDownCapture={(event) => onPalettePointerDown("input", event)}
      {...attributes}
      {...listeners}
      type="button"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
        <Type className="h-4 w-4" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Text Field</span>
        <span className="text-xs text-white/55">User text input field</span>
      </span>
    </Button>
  );
}

function PaletteToggleButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-toggle",
    data: { type: "palette", assetKind: "toggle" } satisfies DragData,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 bg-slate-900/70 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80"
      onPointerDownCapture={(event) => onPalettePointerDown("toggle", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Toggle"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-300">
        <ToggleLeft className="h-4 w-4" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Toggle</span>
        <span className="text-xs text-white/55">Slider on/off control</span>
      </span>
    </Button>
  );
}

function CanvasButton({
  item,
  onResizeStart,
  onEditLabel,
  onSwapSides,
  onSelect,
  onPreviewPressStart,
  onPreviewPressEnd,
  onPreviewStageToggle,
  onStageContextMenu,
  hasStages,
  isPreviewPressed,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onEditLabel: (item: CanvasItem) => void;
  onSwapSides: () => void;
  onSelect: (itemId: string) => void;
  onPreviewPressStart: (itemId: string) => void;
  onPreviewPressEnd: (itemId: string) => void;
  onPreviewStageToggle: (itemId: string) => void;
  onStageContextMenu: (itemId: string) => void;
  hasStages: boolean;
  isPreviewPressed: boolean;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      disabled: Boolean(isPreviewMode),
      data: { type: "canvas", itemId: item.id } satisfies DragData,
    });

  const style: React.CSSProperties = {
    transform: toDragTransform(isDragging, transform, snapOffset),
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    opacity: 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      size={item.kind === "icon" ? "icon" : "default"}
      className={`group absolute rounded-lg border-white/20 !bg-slate-900 !text-white transition-all duration-150 hover:!bg-slate-900 ${
        isPreviewMode && isPreviewPressed
          ? "scale-[0.97] ring-2 ring-sky-300/70 !bg-slate-800"
          : ""
      }`}
      onPointerDown={() => {
        if (!isPreviewMode) {
          onSelect(item.id);
          return;
        }
        onPreviewPressStart(item.id);
      }}
      onPointerUp={() => {
        if (!isPreviewMode) return;
        onPreviewPressEnd(item.id);
      }}
      onPointerCancel={() => {
        if (!isPreviewMode) return;
        onPreviewPressEnd(item.id);
      }}
      onPointerLeave={() => {
        if (!isPreviewMode) return;
        onPreviewPressEnd(item.id);
      }}
      onClick={() => {
        if (!isPreviewMode) {
          onSelect(item.id);
          if (item.kind === "icon") {
            onEditLabel(item);
          }
          return;
        }
        if (item.kind === "icon" || item.kind === "text") {
          onPreviewStageToggle(item.id);
          return;
        }
        if (item.kind === "swap" && isPreviewMode) {
          onSwapSides();
        }
      }}
      onContextMenu={(event) => {
        if (isPreviewMode || !hasStages) return;
        event.preventDefault();
        onStageContextMenu(item.id);
      }}
      {...attributes}
      {...listeners}
      type="button"
      aria-label={item.kind === "icon" ? item.label : undefined}
    >
      {item.kind === "icon" ? (
        (() => {
          const IconComponent =
            ICON_COMPONENTS[item.iconName ?? "Bot"] ?? Bot;
          return (
            <IconComponent
              className="h-5 w-5"
              style={{
                stroke: item.outlineColor ?? "currentColor",
                fill: item.fillColor ?? "none",
              }}
            />
          );
        })()
      ) : (
        item.label
      )}
      {hasStages ? (
        <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-sky-300">
          <ChevronDown className="h-3 w-3" />
        </span>
      ) : null}
      {!isPreviewMode ? (
        <span
          role="presentation"
          onPointerDown={(event) => onResizeStart(event, item)}
          className="absolute bottom-1 right-1 hidden h-3 w-3 cursor-se-resize rounded-sm border border-white/60 bg-white/80 group-hover:block"
        />
      ) : null}
    </Button>
  );
}

function CanvasMirrorLine({
  item,
  onHandleStart,
  onSelect,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onHandleStart: (
    event: React.PointerEvent,
    item: CanvasItem,
    handle: "start" | "end"
  ) => void;
  onSelect: (itemId: string) => void;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: Boolean(isPreviewMode),
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const startX = item.startX ?? item.x;
  const startY = item.startY ?? item.y;
  const endX = item.endX ?? item.x + item.width;
  const endY = item.endY ?? item.y + item.height;
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.max(1, Math.abs(endX - startX));
  const height = Math.max(1, Math.abs(endY - startY));
  const relativeStartX = startX - left;
  const relativeStartY = startY - top;
  const relativeEndX = endX - left;
  const relativeEndY = endY - top;
  const isSnapped =
    Math.abs(startX - endX) <= MIRROR_SNAP_PX ||
    Math.abs(startY - endY) <= MIRROR_SNAP_PX;

  const style: React.CSSProperties = {
    transform: toDragTransform(true, transform, snapOffset),
    left,
    top,
    width,
    height,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="absolute"
      onPointerDown={() => {
        if (!isPreviewMode) onSelect(item.id);
      }}
      {...attributes}
      {...listeners}
    >
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
      {!isPreviewMode ? (
        <>
          <button
            type="button"
            aria-label="Mirror line start"
            onPointerDown={(event) => onHandleStart(event, item, "start")}
            className="absolute h-4 w-4 -translate-x-2 -translate-y-2 rounded-full bg-red-500"
            style={{ left: relativeStartX, top: relativeStartY }}
          />
          <button
            type="button"
            aria-label="Mirror line end"
            onPointerDown={(event) => onHandleStart(event, item, "end")}
            className="absolute h-4 w-4 -translate-x-2 -translate-y-2 rounded-full bg-red-500"
            style={{ left: relativeEndX, top: relativeEndY }}
          />
        </>
      ) : null}
    </div>
  );
}

function CanvasCover({
  item,
  onResizeStart,
  onSelect,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onSelect: (itemId: string) => void;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: Boolean(isPreviewMode),
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const style: React.CSSProperties = {
    transform: toDragTransform(true, transform, snapOffset),
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute rounded-md ${
        isPreviewMode
          ? "bg-slate-900"
          : "bg-white/5"
      }`}
      onPointerDown={() => {
        if (!isPreviewMode) onSelect(item.id);
      }}
      {...attributes}
      {...listeners}
    >
      {!isPreviewMode ? (
        <>
          <div className="pointer-events-none flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-white/60">
            Cover
          </div>
          <span
            role="presentation"
            onPointerDown={(event) => onResizeStart(event, item)}
            className="absolute bottom-1 right-1 hidden h-3 w-3 cursor-se-resize rounded-sm border border-white/60 bg-white/80 group-hover:block"
          />
        </>
      ) : null}
    </div>
  );
}

function CanvasInput({
  item,
  onResizeStart,
  onEditInput,
  onSelect,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onEditInput: (item: CanvasItem) => void;
  onSelect: (itemId: string) => void;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: Boolean(isPreviewMode),
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const style: React.CSSProperties = {
    transform: toDragTransform(true, transform, snapOffset),
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group absolute flex flex-col gap-2"
      onPointerDown={() => {
        if (!isPreviewMode) onSelect(item.id);
      }}
      onClick={() => {
        if (isPreviewMode) return;
        onSelect(item.id);
        onEditInput(item);
      }}
      {...attributes}
      {...listeners}
    >
      <Label className="text-xs text-white/80">{item.label}</Label>
      <Input
        value=""
        placeholder={item.placeholder ?? "Enter text"}
        className="h-full"
        readOnly
      />
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

function CanvasToggle({
  item,
  onResizeStart,
  onSelect,
  onToggle,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onSelect: (itemId: string) => void;
  onToggle: (itemId: string) => void;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: Boolean(isPreviewMode),
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const style: React.CSSProperties = {
    transform: toDragTransform(true, transform, snapOffset),
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
  };

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
  const trackHeight = showLabel ? "h-[calc(100%-16px)]" : "h-full";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group absolute"
      onPointerDown={() => {
        if (!isPreviewMode) onSelect(item.id);
      }}
      onClick={() => {
        onSelect(item.id);
        if (isPreviewMode) {
          onToggle(item.id);
        }
      }}
      {...attributes}
      {...listeners}
    >
      {showLabel ? (
        <Label
          className={`mb-1 block text-xs text-white/80 ${textClass}`}
          style={{ fontSize: textSize }}
        >
          {item.label}
        </Label>
      ) : null}
      <div
        className={`relative ${trackHeight} w-full rounded-full border transition-colors ${
          isOn
            ? "border-sky-300/50 bg-sky-400/35"
            : "border-white/25 bg-slate-800/80"
        }`}
      >
        <span
          className={`absolute top-1/2 h-[68%] aspect-square -translate-y-1/2 rounded-full bg-white transition-all ${
            isOn ? "right-1" : "left-1"
          }`}
        />
      </div>
      {!isPreviewMode ? (
        <span
          role="presentation"
          onPointerDown={(event) => onResizeStart(event, item)}
          className="absolute bottom-0 right-0 hidden h-3 w-3 cursor-se-resize rounded-sm border border-white/60 bg-white/80 group-hover:block"
        />
      ) : null}
    </div>
  );
}

export default function EditorPage() {
  const router = useRouter();
  const { data: sessionData } = authClient.useSession();
  const userName = sessionData?.user?.name ?? "Scout";
  const userImage = sessionData?.user?.image ?? null;
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [items, setItems] = React.useState<CanvasItem[]>([]);
  const [activeType, setActiveType] = React.useState<DragType | null>(null);
  const [activeSize, setActiveSize] = React.useState<{ width: number; height: number }>(
    BUTTON_SIZE
  );
  const [activeLabel, setActiveLabel] = React.useState("Button");
  const [activeKind, setActiveKind] = React.useState<AssetKind>("text");
  const [activeIconName, setActiveIconName] = React.useState("Bot");
  const [activeOutlineColor, setActiveOutlineColor] = React.useState<string | undefined>(
    undefined
  );
  const [activeFillColor, setActiveFillColor] = React.useState<string | undefined>(
    undefined
  );
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAspectDialogOpen, setIsAspectDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [labelDraft, setLabelDraft] = React.useState("");
  const [tagDraft, setTagDraft] = React.useState("");
  const [isIconDialogOpen, setIsIconDialogOpen] = React.useState(false);
  const [iconEditingId, setIconEditingId] = React.useState<string | null>(null);
  const [iconSearch, setIconSearch] = React.useState("");
  const [showIconGrid, setShowIconGrid] = React.useState(false);
  const [outlineDraft, setOutlineDraft] = React.useState("#ffffff");
  const [fillDraft, setFillDraft] = React.useState("transparent");
  const [iconTagDraft, setIconTagDraft] = React.useState("");
  const [aspectWidth, setAspectWidth] = React.useState("16");
  const [aspectHeight, setAspectHeight] = React.useState("9");
  const [aspectWidthDraft, setAspectWidthDraft] = React.useState("16");
  const [aspectHeightDraft, setAspectHeightDraft] = React.useState("9");
  const [isAlignmentAssistEnabled, setIsAlignmentAssistEnabled] =
    React.useState(true);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);
  const [stagingParentId, setStagingParentId] = React.useState<string | null>(null);
  const [previewStageParentId, setPreviewStageParentId] = React.useState<string | null>(
    null
  );
  const [previewPressedItemId, setPreviewPressedItemId] = React.useState<string | null>(
    null
  );
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = React.useState<string | null>(null);
  const backgroundInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [isInputDialogOpen, setIsInputDialogOpen] = React.useState(false);
  const [inputEditingId, setInputEditingId] = React.useState<string | null>(null);
  const [inputLabelDraft, setInputLabelDraft] = React.useState("");
  const [inputPlaceholderDraft, setInputPlaceholderDraft] = React.useState("");
  const [inputTagDraft, setInputTagDraft] = React.useState("");
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [exportJson, setExportJson] = React.useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [uploadJson, setUploadJson] = React.useState("");
  const [uploadPayload, setUploadPayload] = React.useState<
    Array<Record<string, unknown>>
  >([]);
  const [autosaveState, setAutosaveState] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [autosaveUpdatedAt, setAutosaveUpdatedAt] = React.useState<string | null>(
    null
  );
  const [latestUploadId, setLatestUploadId] = React.useState<string | null>(null);
  const isRestoringRef = React.useRef(false);
  const hasRestoredRef = React.useRef(false);

  const resolvedUserImage = React.useMemo(() => {
    const image = userImage?.trim();
    if (!image) return null;
    if (/^(https?:\/\/|data:image\/|blob:|\/)/i.test(image)) {
      return image;
    }
    return `/${image.replace(/^\/+/, "")}`;
  }, [userImage]);
  const deferredIconSearch = React.useDeferredValue(iconSearch);
  const iconViewportRef = React.useRef<HTMLDivElement | null>(null);
  const [iconViewportHeight, setIconViewportHeight] = React.useState(288);
  const [iconViewportWidth, setIconViewportWidth] = React.useState(288);
  const [iconScrollTop, setIconScrollTop] = React.useState(0);
  const iconEditingIdRef = React.useRef<string | null>(null);
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const [alignmentGuides, setAlignmentGuides] = React.useState<{
    vertical: number[];
    horizontal: number[];
  }>({ vertical: [], horizontal: [] });
  const [dragSnapOffset, setDragSnapOffset] = React.useState<DragSnapOffset>({
    itemId: null,
    x: 0,
    y: 0,
  });
  const [paletteSnapOffset, setPaletteSnapOffset] = React.useState({
    x: 0,
    y: 0,
  });
  const palettePointerStartRef = React.useRef<{
    kind: AssetKind;
    pointerX: number;
    pointerY: number;
    sourceWidth: number;
    sourceHeight: number;
  } | null>(null);
  const dragStartPointerRef = React.useRef<{ x: number; y: number } | null>(null);
  const [palettePointerOffset, setPalettePointerOffset] = React.useState({
    x: 0,
    y: 0,
  });
  const resizingRef = React.useRef<{
    id: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    originX: number;
    originY: number;
  } | null>(null);
  const mirrorHandleRef = React.useRef<{
    id: string;
    handle: "start" | "end";
    startX: number;
    startY: number;
    originStartX: number;
    originStartY: number;
    originEndX: number;
    originEndY: number;
  } | null>(null);
  const historyRef = React.useRef<EditorSnapshot[]>([]);
  const historyIndexRef = React.useRef(-1);
  const isApplyingHistoryRef = React.useRef(false);
  const lastSnapshotKeyRef = React.useRef("");
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);

  const updateHistoryAvailability = React.useCallback(() => {
    const index = historyIndexRef.current;
    const length = historyRef.current.length;
    setCanUndo(index > 0);
    setCanRedo(index >= 0 && index < length - 1);
  }, []);

  const buildEditorSnapshot = React.useCallback((): EditorSnapshot => {
    return {
      items,
      aspectWidth,
      aspectHeight,
      backgroundImage,
    };
  }, [aspectHeight, aspectWidth, backgroundImage, items]);

  const selectedItem = React.useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const stageRootIds = React.useMemo(() => {
    return new Set(
      items
        .map((item) => item.stageParentId)
        .filter((value): value is string => Boolean(value))
    );
  }, [items]);

  const visibleItems = React.useMemo(() => {
    if (stagingParentId) {
      return items.filter(
        (item) => item.id === stagingParentId || item.stageParentId === stagingParentId
      );
    }

    if (isPreviewMode && previewStageParentId) {
      return items.filter(
        (item) =>
          item.id === previewStageParentId || item.stageParentId === previewStageParentId
      );
    }

    return items.filter((item) => !item.stageParentId);
  }, [isPreviewMode, items, previewStageParentId, stagingParentId]);

  const isStageBlurActive =
    Boolean(stagingParentId) || (isPreviewMode && Boolean(previewStageParentId));

  const selectedIsStageableRoot =
    Boolean(selectedItem) &&
    (selectedItem?.kind === "text" || selectedItem?.kind === "icon");

  const selectedIsStagingRoot =
    Boolean(selectedItem?.id) && stagingParentId === selectedItem?.id;

  const handleSelectedLabelChange = React.useCallback(
    (value: string) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId
            ? {
                ...item,
                label: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedTagChange = React.useCallback(
    (value: string) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId
            ? {
                ...item,
                tag: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedPlaceholderChange = React.useCallback(
    (value: string) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "input"
            ? {
                ...item,
                placeholder: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedIconNameChange = React.useCallback(
    (iconName: string) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "icon"
            ? {
                ...item,
                iconName,
                label: iconName,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedOutlineColorChange = React.useCallback(
    (value: string) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "icon"
            ? {
                ...item,
                outlineColor: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedFillColorChange = React.useCallback(
    (value: string) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "icon"
            ? {
                ...item,
                fillColor: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedToggleStateChange = React.useCallback(
    (value: boolean) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "toggle"
            ? {
                ...item,
                toggleOn: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedToggleTextAlignChange = React.useCallback(
    (value: "left" | "center" | "right") => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "toggle"
            ? {
                ...item,
                toggleTextAlign: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedToggleTextSizeChange = React.useCallback(
    (value: number) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "toggle"
            ? {
                ...item,
                toggleTextSize: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleToggleItem = React.useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId && item.kind === "toggle"
          ? {
              ...item,
              toggleOn: !item.toggleOn,
            }
          : item
      )
    );
  }, []);

  const handleStartStaging = React.useCallback(() => {
    if (!selectedItem) return;
    if (selectedItem.kind !== "text" && selectedItem.kind !== "icon") return;
    setStagingParentId(selectedItem.id);
    setPreviewStageParentId(null);
    setIsPreviewMode(false);
    setSelectedItemId(selectedItem.id);
  }, [selectedItem]);

  const handleEndStaging = React.useCallback(() => {
    setStagingParentId((current) => {
      if (!current) return null;
      const active = items.find((item) => item.id === current);
      return active?.stageParentId ?? null;
    });
  }, [items]);

  const handleStageContextMenu = React.useCallback(
    (itemId: string) => {
      const target = items.find((item) => item.id === itemId);
      if (!target) return;
      if (target.kind !== "text" && target.kind !== "icon") return;
      if (!items.some((item) => item.stageParentId === itemId)) return;
      if (stagingParentId === itemId) {
        setStagingParentId(target.stageParentId ?? null);
        return;
      }
      setStagingParentId(itemId);
      setPreviewStageParentId(null);
      setIsPreviewMode(false);
      setSelectedItemId(itemId);
    },
    [items, stagingParentId]
  );

  const handlePreviewStageToggle = React.useCallback((itemId: string) => {
    const target = items.find((item) => item.id === itemId);
    if (!target) return;
    if (target.kind !== "text" && target.kind !== "icon") return;

    const hasChildren = items.some((item) => item.stageParentId === itemId);

    setPreviewStageParentId((current) => {
      if (!hasChildren) {
        return current ? null : current;
      }
      return current === itemId ? null : itemId;
    });
  }, [items]);

  const handlePreviewPressStart = React.useCallback((itemId: string) => {
    setPreviewPressedItemId(itemId);
  }, []);

  const handlePreviewPressEnd = React.useCallback((itemId: string) => {
    setPreviewPressedItemId((current) => (current === itemId ? null : current));
  }, []);

  const applyEditorSnapshot = React.useCallback(
    (snapshot: EditorSnapshot) => {
      isApplyingHistoryRef.current = true;
      setItems(snapshot.items);
      setAspectWidth(snapshot.aspectWidth);
      setAspectHeight(snapshot.aspectHeight);
      setBackgroundImage(snapshot.backgroundImage);
      lastSnapshotKeyRef.current = JSON.stringify(snapshot);
      window.setTimeout(() => {
        isApplyingHistoryRef.current = false;
      }, 0);
    },
    []
  );

  const handleUndo = React.useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    applyEditorSnapshot(snapshot);
    updateHistoryAvailability();
  }, [applyEditorSnapshot, updateHistoryAvailability]);

  const handleRedo = React.useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    applyEditorSnapshot(snapshot);
    updateHistoryAvailability();
  }, [applyEditorSnapshot, updateHistoryAvailability]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: "canvas",
  });

  const { setNodeRef: setAssetsDroppableRef } = useDroppable({
    id: "assets",
  });

  const setCanvasRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      canvasRef.current = node;
      setDroppableRef(node);
    },
    [setDroppableRef]
  );

  const assetsRef = React.useRef<HTMLDivElement | null>(null);
  const setAssetsRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      assetsRef.current = node;
      setAssetsDroppableRef(node);
    },
    [setAssetsDroppableRef]
  );

  const handlePalettePointerDown = React.useCallback(
    (assetKind: AssetKind, event: React.PointerEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const sourceWidthForPointer = Math.max(rect.width, 1);
      const pointerX = Math.min(
        Math.max(event.clientX - rect.left, 0),
        sourceWidthForPointer
      );
      const pointerY = Math.min(
        Math.max(event.clientY - rect.top, 0),
        Math.max(rect.height, 1)
      );

      palettePointerStartRef.current = {
        kind: assetKind,
        pointerX,
        pointerY,
        sourceWidth: sourceWidthForPointer,
        sourceHeight: Math.max(rect.height, 1),
      };

      const targetSize =
        assetKind === "icon"
          ? ICON_BUTTON_SIZE
          : assetKind === "mirror"
            ? MIRROR_LINE_SIZE
            : assetKind === "cover"
              ? COVER_SIZE
              : assetKind === "input"
                ? INPUT_SIZE
              : assetKind === "toggle"
                ? TOGGLE_SIZE
                : assetKind === "swap"
                  ? BUTTON_SIZE
                  : BUTTON_SIZE;

      const shouldCenterOnPointer =
        assetKind === "icon" || assetKind === "toggle";
      const mappedX = shouldCenterOnPointer
        ? targetSize.width / 2
        : (pointerX / sourceWidthForPointer) * targetSize.width;
      const mappedY = shouldCenterOnPointer
        ? targetSize.height / 2
        : (pointerY / Math.max(rect.height, 1)) * targetSize.height;
      setPalettePointerOffset({
        x: pointerX - mappedX,
        y: pointerY - mappedY,
      });
    },
    []
  );

  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      if (isPreviewMode) return;
      dragStartPointerRef.current = getClientPointFromEvent(event.activatorEvent);
      const data = event.active.data.current as DragData | undefined;
      setActiveType(data?.type ?? null);
      setDragSnapOffset({ itemId: data?.itemId ?? null, x: 0, y: 0 });
      setPaletteSnapOffset({ x: 0, y: 0 });

      if (data?.type !== "palette") {
        setPalettePointerOffset({ x: 0, y: 0 });
      }

      if (data?.type === "canvas" && data.itemId) {
        setSelectedItemId(data.itemId);
        const currentItem = items.find((item) => item.id === data.itemId);
        setActiveSize(
          currentItem
            ? { width: currentItem.width, height: currentItem.height }
            : BUTTON_SIZE
        );
        setActiveLabel(currentItem?.label ?? "Button");
        setActiveKind(currentItem?.kind ?? "text");
        setActiveIconName(currentItem?.iconName ?? "Bot");
        setActiveOutlineColor(currentItem?.outlineColor);
        setActiveFillColor(currentItem?.fillColor);
      } else if (data?.type === "palette") {
        const nextKind = data.assetKind ?? "text";
        const targetSize =
          nextKind === "icon"
            ? ICON_BUTTON_SIZE
            : nextKind === "mirror"
              ? MIRROR_LINE_SIZE
              : nextKind === "cover"
                ? COVER_SIZE
              : nextKind === "input"
                ? INPUT_SIZE
              : nextKind === "toggle"
                ? TOGGLE_SIZE
              : nextKind === "swap"
                ? BUTTON_SIZE
              : BUTTON_SIZE;
        setActiveKind(nextKind);
        setActiveSize(targetSize);
        setActiveLabel(
          nextKind === "icon"
            ? "Bot"
            : nextKind === "mirror"
              ? "Mirror line"
              : nextKind === "cover"
                ? "Cover"
            : nextKind === "input"
              ? "Input label"
              : nextKind === "toggle"
                ? "Toggle"
              : nextKind === "swap"
                ? "Swap sides"
                : "Button"
        );
        setActiveIconName("Bot");
        setActiveOutlineColor(undefined);
        setActiveFillColor(undefined);

        const capturedPointer =
          palettePointerStartRef.current?.kind === nextKind
            ? palettePointerStartRef.current
            : null;

        const initialRect = event.active.rect.current.initial;
        const clientPoint = getClientPointFromEvent(event.activatorEvent);

        if (capturedPointer) {
          const shouldCenterOnPointer =
            nextKind === "icon" || nextKind === "toggle";
          const mappedX = shouldCenterOnPointer
            ? targetSize.width / 2
            : (capturedPointer.pointerX / capturedPointer.sourceWidth) *
              targetSize.width;
          const mappedY = shouldCenterOnPointer
            ? targetSize.height / 2
            : (capturedPointer.pointerY / capturedPointer.sourceHeight) *
              targetSize.height;
          setPalettePointerOffset({
            x: capturedPointer.pointerX - mappedX,
            y: capturedPointer.pointerY - mappedY,
          });
        } else if (initialRect && clientPoint) {
          const sourceWidth = Math.max(initialRect.width, 1);
          const sourceHeight = Math.max(initialRect.height, 1);
          const pointerX = Math.min(
            Math.max(clientPoint.x - initialRect.left, 0),
            sourceWidth
          );
          const pointerY = Math.min(
            Math.max(clientPoint.y - initialRect.top, 0),
            sourceHeight
          );
          const shouldCenterOnPointer =
            nextKind === "icon" || nextKind === "toggle";
          const mappedX = shouldCenterOnPointer
            ? targetSize.width / 2
            : (pointerX / sourceWidth) * targetSize.width;
          const mappedY = shouldCenterOnPointer
            ? targetSize.height / 2
            : (pointerY / sourceHeight) * targetSize.height;
          setPalettePointerOffset({
            x: pointerX - mappedX,
            y: pointerY - mappedY,
          });
        }
      } else {
        setActiveSize(BUTTON_SIZE);
        setActiveLabel("Button");
        setActiveKind("text");
        setActiveIconName("Bot");
        setActiveOutlineColor(undefined);
        setActiveFillColor(undefined);
        setPalettePointerOffset({ x: 0, y: 0 });
      }
    },
    [isPreviewMode, items]
  );

  const handleDragMove = React.useCallback(
    (event: DragMoveEvent) => {
      if (isPreviewMode) {
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        return;
      }

      if (!isAlignmentAssistEnabled) {
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        return;
      }

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const data = event.active.data.current as DragData | undefined;
      const initialRect = event.active.rect.current.initial;
      const translatedRect = event.active.rect.current.translated;

      if (!initialRect) return;

      const finalLeft =
        translatedRect?.left ?? initialRect.left + event.delta.x;
      const finalTop = translatedRect?.top ?? initialRect.top + event.delta.y;
      const adjustedFinalLeft =
        data?.type === "palette" ? finalLeft + palettePointerOffset.x : finalLeft;
      const adjustedFinalTop =
        data?.type === "palette" ? finalTop + palettePointerOffset.y : finalTop;

      const activeItem =
        data?.type === "canvas" && data.itemId
          ? items.find((item) => item.id === data.itemId)
          : null;
      const paletteKind = data?.type === "palette" ? data.assetKind : undefined;
      const paletteSize =
        paletteKind === "icon"
          ? ICON_BUTTON_SIZE
          : paletteKind === "mirror"
            ? MIRROR_LINE_SIZE
            : paletteKind === "cover"
              ? COVER_SIZE
              : paletteKind === "input"
                ? INPUT_SIZE
              : paletteKind === "toggle"
                ? TOGGLE_SIZE
              : paletteKind === "swap"
                ? BUTTON_SIZE
                : BUTTON_SIZE;
      const activeWidth = activeItem?.width ?? paletteSize.width;
      const activeHeight = activeItem?.height ?? paletteSize.height;

      const isInsideCanvas =
        adjustedFinalLeft + activeWidth > canvasRect.left &&
        adjustedFinalLeft < canvasRect.right &&
        adjustedFinalTop + activeHeight > canvasRect.top &&
        adjustedFinalTop < canvasRect.bottom;

      if (!isInsideCanvas) {
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        return;
      }

      const x = adjustedFinalLeft - canvasRect.left;
      const y = adjustedFinalTop - canvasRect.top;

      const activeLeft = x;
      const activeRight = x + activeWidth;
      const activeCenterX = x + activeWidth / 2;
      const activeTop = y;
      const activeBottom = y + activeHeight;
      const activeCenterY = y + activeHeight / 2;

      const vertical = new Set<number>();
      const horizontal = new Set<number>();

      visibleItems
        .filter((item) => item.kind !== "mirror")
        .forEach((item) => {
          if (data?.type === "canvas" && item.id === data.itemId) return;
          const left = item.x;
          const right = item.x + item.width;
          const centerX = item.x + item.width / 2;
          const top = item.y;
          const bottom = item.y + item.height;
          const centerY = item.y + item.height / 2;

          if (Math.abs(activeLeft - left) <= GUIDE_SNAP_PX) vertical.add(left);
          if (Math.abs(activeRight - right) <= GUIDE_SNAP_PX) vertical.add(right);
          if (Math.abs(activeLeft - right) <= GUIDE_SNAP_PX) vertical.add(right);
          if (Math.abs(activeRight - left) <= GUIDE_SNAP_PX) vertical.add(left);
          if (Math.abs(activeCenterX - centerX) <= GUIDE_SNAP_PX)
            vertical.add(centerX);

          if (Math.abs(activeTop - top) <= GUIDE_SNAP_PX) horizontal.add(top);
          if (Math.abs(activeBottom - bottom) <= GUIDE_SNAP_PX)
            horizontal.add(bottom);
          if (Math.abs(activeTop - bottom) <= GUIDE_SNAP_PX)
            horizontal.add(bottom);
          if (Math.abs(activeBottom - top) <= GUIDE_SNAP_PX)
            horizontal.add(top);
          if (Math.abs(activeCenterY - centerY) <= GUIDE_SNAP_PX)
            horizontal.add(centerY);
        });

      setAlignmentGuides({
        vertical: Array.from(vertical),
        horizontal: Array.from(horizontal),
      });

      if (data?.type === "canvas" && data.itemId && activeItem) {
        let snappedX = x;
        let snappedY = y;
        let bestXDiff = GUIDE_SNAP_PX + 1;
        let bestYDiff = GUIDE_SNAP_PX + 1;

        visibleItems
          .filter((item) => item.kind !== "mirror" && item.id !== data.itemId)
          .forEach((item) => {
            const left = item.x;
            const right = item.x + item.width;
            const centerX = item.x + item.width / 2;
            const top = item.y;
            const bottom = item.y + item.height;
            const centerY = item.y + item.height / 2;

            const candidatesX = [
              { diff: Math.abs(activeLeft - left), value: left },
              { diff: Math.abs(activeRight - right), value: right - activeWidth },
              { diff: Math.abs(activeLeft - right), value: right },
              { diff: Math.abs(activeRight - left), value: left - activeWidth },
              { diff: Math.abs(activeCenterX - centerX), value: centerX - activeWidth / 2 },
            ];

            candidatesX.forEach((candidate) => {
              if (candidate.diff <= GUIDE_SNAP_PX && candidate.diff < bestXDiff) {
                bestXDiff = candidate.diff;
                snappedX = candidate.value;
              }
            });

            const candidatesY = [
              { diff: Math.abs(activeTop - top), value: top },
              { diff: Math.abs(activeBottom - bottom), value: bottom - activeHeight },
              { diff: Math.abs(activeTop - bottom), value: bottom },
              { diff: Math.abs(activeBottom - top), value: top - activeHeight },
              { diff: Math.abs(activeCenterY - centerY), value: centerY - activeHeight / 2 },
            ];

            candidatesY.forEach((candidate) => {
              if (candidate.diff <= GUIDE_SNAP_PX && candidate.diff < bestYDiff) {
                bestYDiff = candidate.diff;
                snappedY = candidate.value;
              }
            });
          });

        setDragSnapOffset({
          itemId: data.itemId,
          x: snappedX - x,
          y: snappedY - y,
        });
        setPaletteSnapOffset({ x: 0, y: 0 });
      } else if (data?.type === "palette") {
        if (paletteKind === "icon" || paletteKind === "toggle") {
          setAlignmentGuides({ vertical: [], horizontal: [] });
          setPaletteSnapOffset({ x: 0, y: 0 });
          setDragSnapOffset({ itemId: null, x: 0, y: 0 });
          return;
        }

        let snappedX = x;
        let snappedY = y;
        let bestXDiff = GUIDE_SNAP_PX + 1;
        let bestYDiff = GUIDE_SNAP_PX + 1;

        visibleItems
          .filter((item) => item.kind !== "mirror")
          .forEach((item) => {
            const left = item.x;
            const right = item.x + item.width;
            const centerX = item.x + item.width / 2;
            const top = item.y;
            const bottom = item.y + item.height;
            const centerY = item.y + item.height / 2;

            const candidatesX = [
              { diff: Math.abs(activeLeft - left), value: left },
              { diff: Math.abs(activeRight - right), value: right - activeWidth },
              { diff: Math.abs(activeLeft - right), value: right },
              { diff: Math.abs(activeRight - left), value: left - activeWidth },
              { diff: Math.abs(activeCenterX - centerX), value: centerX - activeWidth / 2 },
            ];

            candidatesX.forEach((candidate) => {
              if (candidate.diff <= GUIDE_SNAP_PX && candidate.diff < bestXDiff) {
                bestXDiff = candidate.diff;
                snappedX = candidate.value;
              }
            });

            const candidatesY = [
              { diff: Math.abs(activeTop - top), value: top },
              { diff: Math.abs(activeBottom - bottom), value: bottom - activeHeight },
              { diff: Math.abs(activeTop - bottom), value: bottom },
              { diff: Math.abs(activeBottom - top), value: top - activeHeight },
              { diff: Math.abs(activeCenterY - centerY), value: centerY - activeHeight / 2 },
            ];

            candidatesY.forEach((candidate) => {
              if (candidate.diff <= GUIDE_SNAP_PX && candidate.diff < bestYDiff) {
                bestYDiff = candidate.diff;
                snappedY = candidate.value;
              }
            });
          });

        setPaletteSnapOffset({ x: snappedX - x, y: snappedY - y });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
      } else {
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
      }
    },
    [
      isAlignmentAssistEnabled,
      isPreviewMode,
      items,
      palettePointerOffset.x,
      palettePointerOffset.y,
      visibleItems,
    ]
  );

  const handleResizeStart = React.useCallback(
    (event: React.PointerEvent, item: CanvasItem) => {
      event.stopPropagation();
      event.preventDefault();
      resizingRef.current = {
        id: item.id,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: item.width,
        startHeight: item.height,
        originX: item.x,
        originY: item.y,
      };
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    },
    []
  );

  const handleMirrorHandleStart = React.useCallback(
    (event: React.PointerEvent, item: CanvasItem, handle: "start" | "end") => {
      event.stopPropagation();
      event.preventDefault();
      const startX = item.startX ?? item.x;
      const startY = item.startY ?? item.y;
      const endX = item.endX ?? item.x + item.width;
      const endY = item.endY ?? item.y + item.height;
      mirrorHandleRef.current = {
        id: item.id,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        originStartX: startX,
        originStartY: startY,
        originEndX: endX,
        originEndY: endY,
      };
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    },
    []
  );

  const handleSwapSides = React.useCallback(() => {
    const mirrorLine = items.find((item) => item.kind === "mirror");
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!mirrorLine || !canvasRect) return;

    const startX = mirrorLine.startX ?? mirrorLine.x;
    const startY = mirrorLine.startY ?? mirrorLine.y;
    const endX = mirrorLine.endX ?? mirrorLine.x + mirrorLine.width;
    const endY = mirrorLine.endY ?? mirrorLine.y + mirrorLine.height;

    const dx = endX - startX;
    const dy = endY - startY;
    const denom = dx * dx + dy * dy;
    if (denom === 0) return;

    const a = dy;
    const b = -dx;
    const c = dx * startY - dy * startX;

    const reflectPoint = (px: number, py: number) => {
      const d = (a * px + b * py + c) / (a * a + b * b);
      return {
        x: px - 2 * a * d,
        y: py - 2 * b * d,
      };
    };

    setItems((prev) =>
      prev.map((item) => {
        if (item.kind === "mirror") return item;
        const centerX = item.x + item.width / 2;
        const centerY = item.y + item.height / 2;
        const reflected = reflectPoint(centerX, centerY);
        const nextX = Math.min(
          Math.max(0, reflected.x - item.width / 2),
          canvasRect.width - item.width
        );
        const nextY = Math.min(
          Math.max(0, reflected.y - item.height / 2),
          canvasRect.height - item.height
        );
        return { ...item, x: nextX, y: nextY };
      })
    );
  }, [items]);

  const handleEditLabel = React.useCallback((item: CanvasItem) => {
    if (item.kind === "icon") {
      setSelectedItemId(item.id);
      return;
    }

    if (item.kind === "input") {
      setSelectedItemId(item.id);
      return;
    }

    setSelectedItemId(item.id);
  }, []);

  const handleSaveLabel = React.useCallback(() => {
    if (!editingId) return;
    const trimmed = labelDraft.trim();
    const tag = tagDraft.trim();
    if (!trimmed) return;
    setItems((prev) =>
      prev.map((entry) =>
        entry.id === editingId ? { ...entry, label: trimmed, tag } : entry
      )
    );
    setIsDialogOpen(false);
  }, [editingId, labelDraft, tagDraft]);

  const handleSaveInput = React.useCallback(() => {
    if (!inputEditingId) return;
    const label = inputLabelDraft.trim();
    const placeholder = inputPlaceholderDraft.trim();
    const tag = inputTagDraft.trim();
    if (!label) return;
    setItems((prev) =>
      prev.map((entry) =>
        entry.id === inputEditingId
          ? { ...entry, label, placeholder, tag }
          : entry
      )
    );
    setIsInputDialogOpen(false);
  }, [inputEditingId, inputLabelDraft, inputPlaceholderDraft, inputTagDraft]);

  const buildExportPayload = React.useCallback(() => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return null;

    const tagById = new Map(
      items.map((item) => [item.id, (item.tag ?? "").trim()] as const)
    );
    const stagedParentIds = new Set(
      items
        .map((item) => item.stageParentId)
        .filter((value): value is string => Boolean(value))
    );

    const taggedItems = items.filter((item) =>
      ["text", "icon", "input", "toggle"].includes(item.kind)
    );
    const tags = taggedItems.map((item) => (item.tag ?? "").trim());

    if (tags.some((tag) => tag.length === 0)) {
      toast.error("Make sure to set all tags!");
      return null;
    }

    const seenTags = new Set<string>();
    const hasDuplicate = tags.some((tag) => {
      if (seenTags.has(tag)) return true;
      seenTags.add(tag);
      return false;
    });

    if (hasDuplicate) {
      toast.error("Make sure you have no duplicate tags!");
      return null;
    }

    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    const halfWidth = canvasRect.width / 2;
    const halfHeight = canvasRect.height / 2;
    const normalize = (value: number) => Number(value.toFixed(2));
    const scaleX = (value: number) =>
      normalize(((value - centerX) / halfWidth) * 100);
    const scaleY = (value: number) =>
      normalize(((centerY - value) / halfHeight) * 100);
    const scaleWidth = (value: number) => normalize((value / halfWidth) * 100);
    const scaleHeight = (value: number) => normalize((value / halfHeight) * 100);

    const payload = items.map((item) => {
      const centerItemX = item.x + item.width / 2;
      const centerItemY = item.y + item.height / 2;
      const stageParentTag = item.stageParentId
        ? tagById.get(item.stageParentId) ?? ""
        : "";
      const hasStageChildren = stagedParentIds.has(item.id);

      switch (item.kind) {
        case "text":
          return {
            button: {
              tag: item.tag ?? "",
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              text: item.label,
              stageParentTag,
              hasStageChildren,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          };
        case "icon":
          return {
            "icon-button": {
              tag: item.tag ?? "",
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              icon: item.iconName ?? "",
              outline: item.outlineColor ?? "#ffffff",
              fill: item.fillColor ?? "transparent",
              stageParentTag,
              hasStageChildren,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          };
        case "input":
          return {
            "text-input": {
              tag: item.tag ?? "",
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              label: item.label,
              placeholder: item.placeholder ?? "",
              stageParentTag,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          };
        case "toggle":
          return {
            "toggle-switch": {
              tag: item.tag ?? "",
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              label: item.label,
              value: Boolean(item.toggleOn),
              textAlign: item.toggleTextAlign ?? "center",
              textSize: item.toggleTextSize ?? 10,
              stageParentTag,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          };
        case "mirror": {
          const startX = item.startX ?? item.x;
          const startY = item.startY ?? item.y;
          const endX = item.endX ?? item.x + item.width;
          const endY = item.endY ?? item.y + item.height;
          return {
            "mirror-line": {
              x1: scaleX(startX),
              y1: scaleY(startY),
              x2: scaleX(endX),
              y2: scaleY(endY),
            },
          };
        }
        case "swap":
          return {
            "swap-sides": {
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          };
        case "cover": {
          const x1 = item.x;
          const y1 = item.y;
          const x2 = item.x + item.width;
          const y2 = item.y + item.height;
          return {
            cover: {
              x1: scaleX(x1),
              y1: scaleY(y1),
              x2: scaleX(x2),
              y2: scaleY(y2),
            },
          };
        }
        default:
          return null;
      }
    });

    const filteredPayload = payload.filter(
      (entry): entry is NonNullable<typeof entry> => Boolean(entry)
    );

    const backgroundPointer = latestUploadId
      ? {
          uploadId: latestUploadId,
          configUrl: `/api/field-configs/public/${latestUploadId}`,
          imageUrl: `/api/field-configs/public/${latestUploadId}/background-image`,
        }
      : {
          uploadId: null,
          configUrl: null,
          imageUrl: null,
          note: "Upload once to generate a shareable backend pointer.",
        };

    const downloadable = {
      version: 2,
      payload: filteredPayload,
      background: {
        backendPointer: backgroundPointer,
        fallbackImage: backgroundImage,
      },
    };

    return {
      payload: filteredPayload,
      json: JSON.stringify(downloadable, null, 2),
    };
  }, [backgroundImage, items, latestUploadId]);

  const handleExport = React.useCallback(() => {
    const result = buildExportPayload();
    if (!result) return;
    setExportJson(result.json);
    setIsExportDialogOpen(true);
  }, [buildExportPayload]);

  const handleUploadPreview = React.useCallback(() => {
    const result = buildExportPayload();
    if (!result) return;
    setUploadPayload(result.payload);
    setUploadJson(result.json);
    setIsUploadDialogOpen(true);
  }, [buildExportPayload]);

  const handleUploadConfig = React.useCallback(async () => {
    if (uploadPayload.length === 0) return;
    try {
      const editorState: PersistedEditorState = {
        items,
        aspectWidth,
        aspectHeight,
        backgroundImage,
      };
      const response = await fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: uploadPayload,
          editorState,
          backgroundImage,
          isDraft: false,
        }),
      });

      if (!response.ok) {
        toast.error("Upload failed. Please try again.");
        return;
      }

      const result = (await response.json()) as { uploadId?: string };
      setLatestUploadId(result.uploadId ?? null);

      toast.success("Config uploaded.");
      setIsUploadDialogOpen(false);
    } catch (error) {
      toast.error("Upload failed. Please try again.");
    }
  }, [aspectHeight, aspectWidth, backgroundImage, items, uploadPayload]);

  const handleDownloadExport = React.useCallback(() => {
    if (!exportJson) return;
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "field-layout.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [exportJson]);

  const aspectRatio = React.useMemo(() => {
    const width = Number(aspectWidth);
    const height = Number(aspectHeight);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return width / height;
    }
    return 16 / 9;
  }, [aspectHeight, aspectWidth]);

  const fieldWidth = React.useMemo(() => FIELD_HEIGHT * aspectRatio, [aspectRatio]);
  const stageWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = React.useState({
    width: fieldWidth,
    height: FIELD_HEIGHT,
  });

  const applyImageAspectRatio = React.useCallback((src: string) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (!width || !height) return;
      const divisor = gcd(width, height);
      const normalizedWidth = Math.round(width / divisor);
      const normalizedHeight = Math.round(height / divisor);
      setAspectWidth(String(normalizedWidth));
      setAspectHeight(String(normalizedHeight));
      setAspectWidthDraft(String(normalizedWidth));
      setAspectHeightDraft(String(normalizedHeight));
    };
    img.src = src;
  }, []);

  React.useEffect(() => {
    const node = stageWrapRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const fitWidth = Math.min(rect.width, rect.height * aspectRatio);
      const fitHeight = fitWidth / aspectRatio;
      setStageSize({ width: fitWidth, height: fitHeight });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [aspectRatio]);

  const handleSaveAspectRatio = React.useCallback(() => {
    const width = Number(aspectWidthDraft);
    const height = Number(aspectHeightDraft);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;
    if (width <= 0 || height <= 0) return;
    setAspectWidth(String(width));
    setAspectHeight(String(height));
    setIsAspectDialogOpen(false);
  }, [aspectHeightDraft, aspectWidthDraft]);

  const handleBackgroundUpload = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setBackgroundImage(reader.result);
          applyImageAspectRatio(reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [applyImageAspectRatio]
  );

  const buildEditorState = React.useCallback((): PersistedEditorState => {
    return {
      items,
      aspectWidth,
      aspectHeight,
      backgroundImage,
    };
  }, [aspectHeight, aspectWidth, backgroundImage, items]);

  const buildDraftPayload = React.useCallback(() => {
    const editorState = buildEditorState();
    return {
      editorState,
    };
  }, [buildEditorState]);

  const persistDraft = React.useCallback(async () => {
    if (!sessionData?.user?.id) return;
    const payload = buildDraftPayload();
    setAutosaveState("saving");

    try {
      const response = await fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          editorState: payload.editorState,
          backgroundImage,
          isDraft: true,
        }),
      });

      if (!response.ok) {
        setAutosaveState("error");
        return;
      }

      const result = (await response.json()) as { updatedAt?: string };
      setAutosaveState("saved");
      setAutosaveUpdatedAt(result.updatedAt ?? new Date().toISOString());
    } catch {
      setAutosaveState("error");
    }
  }, [backgroundImage, buildDraftPayload, sessionData?.user?.id]);

  React.useEffect(() => {
    const snapshot = buildEditorSnapshot();
    const snapshotKey = JSON.stringify(snapshot);

    if (snapshotKey === lastSnapshotKeyRef.current) {
      return;
    }

    if (isApplyingHistoryRef.current) {
      lastSnapshotKeyRef.current = snapshotKey;
      return;
    }

    const currentIndex = historyIndexRef.current;
    const nextHistory = historyRef.current.slice(0, currentIndex + 1);
    nextHistory.push(snapshot);

    if (nextHistory.length > 100) {
      nextHistory.shift();
    }

    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    lastSnapshotKeyRef.current = snapshotKey;
    updateHistoryAvailability();
  }, [buildEditorSnapshot, updateHistoryAvailability]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;

      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (key === "y") {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRedo, handleUndo]);

  React.useEffect(() => {
    const userId = sessionData?.user?.id;
    if (!userId) {
      hasRestoredRef.current = false;
      setAutosaveState("idle");
      setAutosaveUpdatedAt(null);
      setLatestUploadId(null);
      return;
    }

    let isCancelled = false;
    isRestoringRef.current = true;

    const restore = async () => {
      try {
        const response = await fetch("/api/field-configs", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          hasRestoredRef.current = true;
          return;
        }

        const result = (await response.json()) as {
          config?: { payload?: unknown; updatedAt?: string; uploadId?: string } | null;
        };

        const restored = parsePersistedEditorState(result.config?.payload);
        if (!isCancelled && restored) {
          setItems(restored.items);
          setAspectWidth(restored.aspectWidth);
          setAspectHeight(restored.aspectHeight);
          setBackgroundImage(restored.backgroundImage);
          setAutosaveUpdatedAt(result.config?.updatedAt ?? null);
          setLatestUploadId(result.config?.uploadId ?? null);
          setAutosaveState("saved");
        }
      } catch {
        if (!isCancelled) {
          setAutosaveState("error");
        }
      } finally {
        if (!isCancelled) {
          hasRestoredRef.current = true;
          isRestoringRef.current = false;
        }
      }
    };

    void restore();

    return () => {
      isCancelled = true;
    };
  }, [sessionData?.user?.id]);

  React.useEffect(() => {
    if (!sessionData?.user?.id) return;
    if (!hasRestoredRef.current || isRestoringRef.current) return;

    const timer = window.setTimeout(() => {
      void persistDraft();
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    aspectHeight,
    aspectWidth,
    backgroundImage,
    items,
    persistDraft,
    sessionData?.user?.id,
  ]);

  React.useEffect(() => {
    if (!sessionData?.user?.id) return;

    const flushAutosave = () => {
      if (!hasRestoredRef.current || isRestoringRef.current) return;

      const payload = buildDraftPayload();
      const body = JSON.stringify({
        payload,
        editorState: payload.editorState,
        backgroundImage,
        isDraft: true,
      });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/field-configs", blob);
        return;
      }

      void fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushAutosave();
      }
    };

    window.addEventListener("beforeunload", flushAutosave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", flushAutosave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [backgroundImage, buildDraftPayload, sessionData?.user?.id]);

  React.useEffect(() => {
    iconEditingIdRef.current = iconEditingId;
  }, [iconEditingId]);

  React.useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (userMenuRef.current?.contains(target)) return;
      setIsUserMenuOpen(false);
    };

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [isUserMenuOpen]);

  React.useEffect(() => {
    setAvatarLoadFailed(false);
  }, [resolvedUserImage]);

  const handleLogout = React.useCallback(async () => {
    setIsUserMenuOpen(false);
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("Failed to log out.");
      return;
    }
    router.push("/login");
    router.refresh();
  }, [router]);

  const filteredIconNames = React.useMemo(() => {
    if (!showIconGrid) return [];
    const query = deferredIconSearch.trim().toLowerCase();
    if (!query) return ICON_NAMES;
    return ICON_NAMES.filter((name) => name.toLowerCase().includes(query));
  }, [deferredIconSearch, showIconGrid]);

  React.useEffect(() => {
    if (!isIconDialogOpen) {
      setShowIconGrid(false);
      return;
    }

    const hasIdleCallbacks =
      typeof window.requestIdleCallback === "function" &&
      typeof window.cancelIdleCallback === "function";
    const handle = hasIdleCallbacks
      ? window.requestIdleCallback(() => setShowIconGrid(true))
      : window.setTimeout(() => setShowIconGrid(true), 0);

    return () => {
      if (hasIdleCallbacks) {
        window.cancelIdleCallback(handle as number);
      } else {
        window.clearTimeout(handle as number);
      }
    };
  }, [isIconDialogOpen]);

  React.useEffect(() => {
    if (!isIconDialogOpen) return;
    const raf = window.requestAnimationFrame(() => {
      const height = iconViewportRef.current?.clientHeight;
      const width = iconViewportRef.current?.clientWidth;
      if (height) setIconViewportHeight(height);
      if (width) setIconViewportWidth(width);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isIconDialogOpen, showIconGrid]);

  React.useEffect(() => {
    if (!iconViewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setIconViewportHeight(entry.contentRect.height);
      setIconViewportWidth(entry.contentRect.width);
    });
    observer.observe(iconViewportRef.current);
    return () => observer.disconnect();
  }, [iconViewportRef]);

  React.useEffect(() => {
    if (!isIconDialogOpen) return;
    if (iconViewportRef.current) {
      iconViewportRef.current.scrollTop = 0;
    }
    setIconScrollTop(0);
  }, [deferredIconSearch, isIconDialogOpen]);

  const commitOutlineColor = React.useCallback(
    (value: string) => {
      const id = iconEditingIdRef.current;
      if (!id) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, outlineColor: value } : item
        )
      );
    },
    [setItems]
  );

  const commitFillColor = React.useCallback(
    (value: string) => {
      const id = iconEditingIdRef.current;
      if (!id) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, fillColor: value } : item
        )
      );
    },
    [setItems]
  );

  const handleIconTagChange = React.useCallback(
    (value: string) => {
      setIconTagDraft(value);
      const id = iconEditingIdRef.current;
      if (!id) return;
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, tag: value } : item))
      );
    },
    [setItems]
  );

  const iconGridColumns = Math.max(
    1,
    Math.floor(iconViewportWidth / ICON_CELL_SIZE)
  );
  const iconRows = Math.ceil(filteredIconNames.length / iconGridColumns);
  const totalIconHeight = iconRows * ICON_CELL_SIZE;
  const startRow = Math.max(
    0,
    Math.floor(iconScrollTop / ICON_CELL_SIZE) - 2
  );
  const visibleRows = Math.ceil(iconViewportHeight / ICON_CELL_SIZE) + 4;
  const endRow = Math.min(iconRows, startRow + visibleRows);
  const startIndex = startRow * iconGridColumns;
  const endIndex = Math.min(
    filteredIconNames.length,
    endRow * iconGridColumns
  );
  const visibleIcons = filteredIconNames.slice(startIndex, endIndex);

  React.useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resize = resizingRef.current;
      const mirror = mirrorHandleRef.current;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      if (resize) {
        const maxWidth = Math.max(64, canvasRect.width - resize.originX);
        const maxHeight = Math.max(36, canvasRect.height - resize.originY);

        const rawWidth = Math.max(
          64,
          Math.min(resize.startWidth + (event.clientX - resize.startX), maxWidth)
        );
        const rawHeight = Math.max(
          36,
          Math.min(
            resize.startHeight + (event.clientY - resize.startY),
            maxHeight
          )
        );

        if (!isAlignmentAssistEnabled) {
          setAlignmentGuides({ vertical: [], horizontal: [] });
          setItems((prev) =>
            prev.map((item) =>
              item.id === resize.id
                ? { ...item, width: rawWidth, height: rawHeight }
                : item
            )
          );
          return;
        }

        const activeLeft = resize.originX;
        const activeTop = resize.originY;
        const activeRight = activeLeft + rawWidth;
        const activeBottom = activeTop + rawHeight;

        let snappedRight = activeRight;
        let snappedBottom = activeBottom;
        let bestXDiff = GUIDE_SNAP_PX + 1;
        let bestYDiff = GUIDE_SNAP_PX + 1;

        const vertical = new Set<number>();
        const horizontal = new Set<number>();

        visibleItems
          .filter((item) => item.id !== resize.id && item.kind !== "mirror")
          .forEach((item) => {
            const left = item.x;
            const right = item.x + item.width;
            const centerX = item.x + item.width / 2;
            const top = item.y;
            const bottom = item.y + item.height;
            const centerY = item.y + item.height / 2;

            const candidatesX = [
              { diff: Math.abs(activeRight - left), value: left },
              { diff: Math.abs(activeRight - right), value: right },
              { diff: Math.abs(activeRight - centerX), value: centerX },
            ];

            candidatesX.forEach((candidate) => {
              if (candidate.diff <= GUIDE_SNAP_PX) {
                vertical.add(candidate.value);
              }
              if (candidate.diff <= GUIDE_SNAP_PX && candidate.diff < bestXDiff) {
                bestXDiff = candidate.diff;
                snappedRight = candidate.value;
              }
            });

            const candidatesY = [
              { diff: Math.abs(activeBottom - top), value: top },
              { diff: Math.abs(activeBottom - bottom), value: bottom },
              { diff: Math.abs(activeBottom - centerY), value: centerY },
            ];

            candidatesY.forEach((candidate) => {
              if (candidate.diff <= GUIDE_SNAP_PX) {
                horizontal.add(candidate.value);
              }
              if (candidate.diff <= GUIDE_SNAP_PX && candidate.diff < bestYDiff) {
                bestYDiff = candidate.diff;
                snappedBottom = candidate.value;
              }
            });
          });

        const nextWidth = Math.max(
          64,
          Math.min(snappedRight - activeLeft, maxWidth)
        );
        const nextHeight = Math.max(
          36,
          Math.min(snappedBottom - activeTop, maxHeight)
        );

        setAlignmentGuides({
          vertical: Array.from(vertical),
          horizontal: Array.from(horizontal),
        });

        setItems((prev) =>
          prev.map((item) =>
            item.id === resize.id
              ? { ...item, width: nextWidth, height: nextHeight }
              : item
          )
        );
      }

      if (mirror) {
        const dx = event.clientX - mirror.startX;
        const dy = event.clientY - mirror.startY;
        const clamp = (value: number, min: number, max: number) =>
          Math.min(max, Math.max(min, value));

        const maxX = canvasRect.width;
        const maxY = canvasRect.height;

        let startX = mirror.originStartX;
        let startY = mirror.originStartY;
        let endX = mirror.originEndX;
        let endY = mirror.originEndY;

        if (mirror.handle === "start") {
          startX = clamp(mirror.originStartX + dx, 0, maxX);
          startY = clamp(mirror.originStartY + dy, 0, maxY);
          if (Math.abs(startX - endX) <= MIRROR_SNAP_PX) {
            startX = endX;
          }
          if (Math.abs(startY - endY) <= MIRROR_SNAP_PX) {
            startY = endY;
          }
        } else {
          endX = clamp(mirror.originEndX + dx, 0, maxX);
          endY = clamp(mirror.originEndY + dy, 0, maxY);
          if (Math.abs(endX - startX) <= MIRROR_SNAP_PX) {
            endX = startX;
          }
          if (Math.abs(endY - startY) <= MIRROR_SNAP_PX) {
            endY = startY;
          }
        }

        const nextX = Math.min(startX, endX);
        const nextY = Math.min(startY, endY);
        const nextWidth = Math.max(1, Math.abs(endX - startX));
        const nextHeight = Math.max(1, Math.abs(endY - startY));

        setItems((prev) =>
          prev.map((item) =>
            item.id === mirror.id
              ? {
                  ...item,
                  x: nextX,
                  y: nextY,
                  width: nextWidth,
                  height: nextHeight,
                  startX,
                  startY,
                  endX,
                  endY,
                }
              : item
          )
        );
      }
    };

    const handlePointerUp = () => {
      resizingRef.current = null;
      mirrorHandleRef.current = null;
      setAlignmentGuides({ vertical: [], horizontal: [] });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isAlignmentAssistEnabled, items, visibleItems]);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      if (isPreviewMode) {
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        setPalettePointerOffset({ x: 0, y: 0 });
        palettePointerStartRef.current = null;
        dragStartPointerRef.current = null;
        return;
      }

      const data = event.active.data.current as DragData | undefined;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const initialRect = event.active.rect.current.initial;
      const translatedRect = event.active.rect.current.translated;

      if (!canvasRect || !initialRect) {
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setPalettePointerOffset({ x: 0, y: 0 });
        palettePointerStartRef.current = null;
        dragStartPointerRef.current = null;
        return;
      }

      const finalLeft =
        translatedRect?.left ?? initialRect.left + event.delta.x;
      const finalTop = translatedRect?.top ?? initialRect.top + event.delta.y;

      const activeItem =
        data?.type === "canvas" && data.itemId
          ? items.find((item) => item.id === data.itemId)
          : null;
      const paletteKind = data?.type === "palette" ? data.assetKind : undefined;
      const paletteSize =
        paletteKind === "icon"
          ? ICON_BUTTON_SIZE
          : paletteKind === "mirror"
            ? MIRROR_LINE_SIZE
            : paletteKind === "cover"
              ? COVER_SIZE
          : paletteKind === "input"
            ? INPUT_SIZE
            : paletteKind === "toggle"
              ? TOGGLE_SIZE
            : paletteKind === "swap"
              ? BUTTON_SIZE
            : BUTTON_SIZE;
      const activeWidth = activeItem?.width ?? paletteSize.width;
      const activeHeight = activeItem?.height ?? paletteSize.height;

      const assetsRect = assetsRef.current?.getBoundingClientRect();
      const isInsideAssets = assetsRect
        ? finalLeft + activeWidth > assetsRect.left &&
          finalLeft < assetsRect.right &&
          finalTop + activeHeight > assetsRect.top &&
          finalTop < assetsRect.bottom
        : false;

      if (data?.type === "canvas" && data.itemId && isInsideAssets) {
        setItems((prev) =>
          prev.filter(
            (item) => item.id !== data.itemId && item.stageParentId !== data.itemId
          )
        );
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        setPalettePointerOffset({ x: 0, y: 0 });
        palettePointerStartRef.current = null;
        dragStartPointerRef.current = null;
        return;
      }

      const isInsideCanvas =
        finalLeft + activeWidth > canvasRect.left &&
        finalLeft < canvasRect.right &&
        finalTop + activeHeight > canvasRect.top &&
        finalTop < canvasRect.bottom;

      if (!isInsideCanvas) {
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        setPalettePointerOffset({ x: 0, y: 0 });
        palettePointerStartRef.current = null;
        dragStartPointerRef.current = null;
        return;
      }

      let x = finalLeft - canvasRect.left;
      let y = finalTop - canvasRect.top;

      x = Math.max(0, Math.min(x, canvasRect.width - activeWidth));
      y = Math.max(0, Math.min(y, canvasRect.height - activeHeight));

      const snapToGuides = (nextX: number, nextY: number) => {
        if (!isAlignmentAssistEnabled) {
          return { x: nextX, y: nextY };
        }

        let snappedX = nextX;
        let snappedY = nextY;
        let bestXDiff = GUIDE_SNAP_PX + 1;
        let bestYDiff = GUIDE_SNAP_PX + 1;

        const activeLeft = nextX;
        const activeRight = nextX + activeWidth;
        const activeCenterX = nextX + activeWidth / 2;
        const activeTop = nextY;
        const activeBottom = nextY + activeHeight;
        const activeCenterY = nextY + activeHeight / 2;

        visibleItems
          .filter((item) => item.kind !== "mirror")
          .forEach((item) => {
            if (data?.type === "canvas" && item.id === data.itemId) return;
            const left = item.x;
            const right = item.x + item.width;
            const centerX = item.x + item.width / 2;
            const top = item.y;
            const bottom = item.y + item.height;
            const centerY = item.y + item.height / 2;

            const candidatesX = [
              { diff: Math.abs(activeLeft - left), value: left },
              { diff: Math.abs(activeRight - right), value: right - activeWidth },
              { diff: Math.abs(activeLeft - right), value: right },
              { diff: Math.abs(activeRight - left), value: left - activeWidth },
              { diff: Math.abs(activeCenterX - centerX), value: centerX - activeWidth / 2 },
            ];

            candidatesX.forEach((candidate) => {
              if (candidate.diff <= GUIDE_SNAP_PX && candidate.diff < bestXDiff) {
                bestXDiff = candidate.diff;
                snappedX = candidate.value;
              }
            });

            const candidatesY = [
              { diff: Math.abs(activeTop - top), value: top },
              { diff: Math.abs(activeBottom - bottom), value: bottom - activeHeight },
              { diff: Math.abs(activeTop - bottom), value: bottom },
              { diff: Math.abs(activeBottom - top), value: top - activeHeight },
              { diff: Math.abs(activeCenterY - centerY), value: centerY - activeHeight / 2 },
            ];

            candidatesY.forEach((candidate) => {
              if (candidate.diff <= GUIDE_SNAP_PX && candidate.diff < bestYDiff) {
                bestYDiff = candidate.diff;
                snappedY = candidate.value;
              }
            });
          });

        snappedX = Math.max(0, Math.min(snappedX, canvasRect.width - activeWidth));
        snappedY = Math.max(0, Math.min(snappedY, canvasRect.height - activeHeight));
        return { x: snappedX, y: snappedY };
      };

      if (data?.type === "canvas" && data.itemId) {
        const adjustedX = x + (dragSnapOffset.itemId === data.itemId ? dragSnapOffset.x : 0);
        const adjustedY = y + (dragSnapOffset.itemId === data.itemId ? dragSnapOffset.y : 0);

        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== data.itemId) return item;
            if (item.kind !== "mirror") {
              const snapped = snapToGuides(adjustedX, adjustedY);
              return { ...item, x: snapped.x, y: snapped.y };
            }
            const dx = adjustedX - item.x;
            const dy = adjustedY - item.y;
            const startX = (item.startX ?? item.x) + dx;
            const startY = (item.startY ?? item.y) + dy;
            const endX = (item.endX ?? item.x + item.width) + dx;
            const endY = (item.endY ?? item.y + item.height) + dy;
            return {
              ...item,
              x: adjustedX,
              y: adjustedY,
              startX,
              startY,
              endX,
              endY,
            };
          })
        );
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        setPalettePointerOffset({ x: 0, y: 0 });
        palettePointerStartRef.current = null;
        dragStartPointerRef.current = null;
        return;
      }

      if (data?.type === "palette") {
        if (data.assetKind === "mirror" && items.some((item) => item.kind === "mirror")) {
          setActiveType(null);
          setPaletteSnapOffset({ x: 0, y: 0 });
          setPalettePointerOffset({ x: 0, y: 0 });
          palettePointerStartRef.current = null;
          return;
        }

        const isCenterPlaced = data.assetKind === "icon" || data.assetKind === "toggle";
        if (isCenterPlaced) {
          const startPointer = dragStartPointerRef.current;
          const pointerX =
            startPointer?.x !== undefined
              ? startPointer.x + event.delta.x
              : finalLeft + activeWidth / 2;
          const pointerY =
            startPointer?.y !== undefined
              ? startPointer.y + event.delta.y
              : finalTop + activeHeight / 2;

          x = pointerX - canvasRect.left - activeWidth / 2;
          y = pointerY - canvasRect.top - activeHeight / 2;
        } else {
          x += paletteSnapOffset.x;
          y += paletteSnapOffset.y;
          x += palettePointerOffset.x;
          y += palettePointerOffset.y;
        }

        x = Math.max(0, Math.min(x, canvasRect.width - activeWidth));
        y = Math.max(0, Math.min(y, canvasRect.height - activeHeight));

        if (data.assetKind !== "mirror" && !isCenterPlaced) {
          const snapped = snapToGuides(x, y);
          x = snapped.x;
          y = snapped.y;
        }

        if (stagingParentId) {
          const stageRoot = items.find((item) => item.id === stagingParentId);
          if (stageRoot) {
            const stageMargin = 220;
            const minX = Math.max(0, stageRoot.x - stageMargin);
            const maxX = Math.min(
              canvasRect.width - activeWidth,
              stageRoot.x + stageRoot.width + stageMargin - activeWidth
            );
            const minY = Math.max(0, stageRoot.y - stageMargin);
            const maxY = Math.min(
              canvasRect.height - activeHeight,
              stageRoot.y + stageRoot.height + stageMargin - activeHeight
            );

            x = Math.max(minX, Math.min(x, maxX));
            y = Math.max(minY, Math.min(y, maxY));
          }
        }

        const newId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `button-${Date.now()}`;
        const kind = data.assetKind ?? "text";
        const size =
          kind === "icon"
            ? ICON_BUTTON_SIZE
            : kind === "mirror"
              ? MIRROR_LINE_SIZE
              : kind === "cover"
                ? COVER_SIZE
            : kind === "input"
              ? INPUT_SIZE
              : kind === "toggle"
                ? TOGGLE_SIZE
              : kind === "swap"
                ? BUTTON_SIZE
              : BUTTON_SIZE;
        setItems((prev) => [
          ...prev,
          {
            id: newId,
            x,
            y,
            width: size.width,
            height: size.height,
            label:
              kind === "icon"
                ? "Bot"
                : kind === "mirror"
                  ? "Mirror line"
                  : kind === "cover"
                    ? "Cover"
                : kind === "input"
                  ? "Input label"
                  : kind === "toggle"
                    ? "Toggle"
                  : kind === "swap"
                    ? "Swap sides"
                    : "Button",
            kind,
            tag: "",
            iconName: kind === "icon" ? "Bot" : undefined,
            outlineColor: kind === "icon" ? "#ffffff" : undefined,
            fillColor: kind === "icon" ? "transparent" : undefined,
            startX: kind === "mirror" ? x : undefined,
            startY: kind === "mirror" ? y : undefined,
            endX: kind === "mirror" ? x : undefined,
            endY: kind === "mirror" ? y + size.height : undefined,
            placeholder: kind === "input" ? "Enter text" : undefined,
            toggleOn: kind === "toggle" ? false : undefined,
            toggleTextAlign: kind === "toggle" ? "center" : undefined,
            toggleTextSize: kind === "toggle" ? 10 : undefined,
            stageParentId: stagingParentId ?? undefined,
          },
        ]);
        setSelectedItemId(newId);
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        setPalettePointerOffset({ x: 0, y: 0 });
        palettePointerStartRef.current = null;
        dragStartPointerRef.current = null;
      }
    },
    [
      dragSnapOffset,
      isAlignmentAssistEnabled,
      isPreviewMode,
      items,
      visibleItems,
      stagingParentId,
      palettePointerOffset.x,
      palettePointerOffset.y,
      paletteSnapOffset,
    ]
  );

  const handleResetEditor = React.useCallback(() => {
    setItems([]);
    setBackgroundImage(null);
    setAspectWidth("16");
    setAspectHeight("9");
    setAspectWidthDraft("16");
    setAspectHeightDraft("9");
    setAlignmentGuides({ vertical: [], horizontal: [] });
    setDragSnapOffset({ itemId: null, x: 0, y: 0 });
    setPaletteSnapOffset({ x: 0, y: 0 });
    setActiveType(null);
    setSelectedItemId(null);
    setIsPreviewMode(false);
    setLatestUploadId(null);
    historyRef.current = [];
    historyIndexRef.current = -1;
    lastSnapshotKeyRef.current = "";
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  React.useEffect(() => {
    if (!selectedItemId) return;
    if (items.some((item) => item.id === selectedItemId)) return;
    setSelectedItemId(null);
  }, [items, selectedItemId]);

  React.useEffect(() => {
    if (!stagingParentId) return;
    if (items.some((item) => item.id === stagingParentId)) return;
    setStagingParentId(null);
  }, [items, stagingParentId]);

  React.useEffect(() => {
    if (!previewStageParentId) return;
    if (items.some((item) => item.id === previewStageParentId)) return;
    setPreviewStageParentId(null);
  }, [items, previewStageParentId]);

  React.useEffect(() => {
    if (isPreviewMode) return;
    if (!previewStageParentId) return;
    setPreviewStageParentId(null);
  }, [isPreviewMode, previewStageParentId]);

  React.useEffect(() => {
    if (isPreviewMode) return;
    if (!previewPressedItemId) return;
    setPreviewPressedItemId(null);
  }, [isPreviewMode, previewPressedItemId]);

  React.useEffect(() => {
    if (!selectedItemId) return;
    if (visibleItems.some((item) => item.id === selectedItemId)) return;
    setSelectedItemId(null);
  }, [selectedItemId, visibleItems]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-blue-950/40 text-white">
        <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between px-5 py-3">
            <h1 className="text-4xl font-black tracking-tight">GoonScout</h1>
            <div className="ml-6 flex items-center gap-3 sm:gap-4">
              <span className="hidden text-xs text-white/60 xl:inline">
                {autosaveState === "saving"
                  ? "Autosave: saving..."
                  : autosaveState === "saved"
                    ? `Autosave: saved${autosaveUpdatedAt ? ` (${new Date(autosaveUpdatedAt).toLocaleTimeString()})` : ""}`
                    : autosaveState === "error"
                      ? "Autosave: error"
                      : "Autosave: idle"}
              </span>
              <Button
                variant="outline"
                type="button"
                className="h-10 gap-2 rounded-lg border-white/15 bg-slate-900/60 px-4 text-white hover:bg-slate-800/80"
                onClick={() =>
                  setIsPreviewMode((current) => {
                    const next = !current;
                    if (next) {
                      setStagingParentId(null);
                    } else {
                      setPreviewStageParentId(null);
                    }
                    return next;
                  })
                }
              >
                <Eye className="h-4 w-4" />
                {isPreviewMode ? "Editor" : "Preview"}
              </Button>
              <Button
                type="button"
                className="h-10 gap-2 rounded-lg bg-blue-600 px-5 text-white hover:bg-blue-500"
                onClick={handleUploadPreview}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button
                variant="outline"
                type="button"
                className="h-10 gap-2 rounded-lg border-white/15 bg-slate-900/60 px-4 text-white hover:bg-slate-800/80"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  aria-label="User menu"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-xs font-semibold uppercase text-white transition-colors hover:bg-white/20"
                >
                  {resolvedUserImage && !avatarLoadFailed ? (
                    <img
                      src={resolvedUserImage}
                      alt=""
                      onError={() => setAvatarLoadFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{userInitials || "GS"}</span>
                  )}
                </button>
                {isUserMenuOpen ? (
                  <div className="absolute right-0 mt-2 w-44 rounded-lg border border-white/10 bg-slate-900 p-1 shadow-2xl">
                    <div className="px-2 py-2 text-xs text-white/70">{userName}</div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full rounded-sm px-2 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
                    >
                      Log out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-[1760px] grid-cols-1 gap-4 px-5 py-5 xl:grid-cols-[260px_minmax(0,1fr)_260px]">
          <aside
            ref={setAssetsRef}
            className="flex h-[min(66vh,620px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.03] bg-slate-900/70 p-4 text-white shadow-2xl backdrop-blur"
          >
            <div className="mb-4 px-1">
              <h2 className="text-3xl font-semibold tracking-tight">Assets</h2>
            </div>

            <div className="mb-3 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-[0.15em] text-white/55">
              <span>Elements</span>
              <ChevronRight className="h-4 w-4" />
            </div>

            <ScrollArea
              className="h-full w-full"
              scrollbarClassName="bg-black/40"
              thumbClassName="bg-black"
            >
              <div
                className={`flex flex-col gap-3 pr-2 ${
                  isPreviewMode ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <PaletteButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteIconButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteMirrorButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteInputButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteToggleButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteCoverButton onPalettePointerDown={handlePalettePointerDown} />
              </div>
              <div className="mt-6 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-[0.15em] text-white/45">
                <span>Layout</span>
                <ChevronRight className="h-4 w-4" />
              </div>
              <div className={`mt-3 pr-2 ${isPreviewMode ? "pointer-events-none opacity-50" : ""}`}>
                <PaletteSwapButton onPalettePointerDown={handlePalettePointerDown} />
              </div>
            </ScrollArea>
          </aside>

          <section className="min-w-0">
            <div
              className="relative flex h-[min(66vh,620px)] min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.03] bg-slate-900/60 p-1 shadow-2xl backdrop-blur"
            >
              <div
                ref={stageWrapRef}
                className="flex h-full w-full items-center justify-center"
              >
                <div
                  className="relative"
                  style={{ width: stageSize.width, height: stageSize.height }}
                >
                  <section
                    ref={setCanvasRef}
                    className={`relative h-full w-full overflow-hidden rounded-xl border border-white/[0.03] bg-slate-950/90 transition-colors ${
                      isOver ? "ring-1 ring-blue-300/25" : ""
                    }`}
                  >
                  <div
                    className={`pointer-events-none absolute inset-0 opacity-35 transition-all duration-200 ${
                      isStageBlurActive ? "scale-105 blur-[14px]" : ""
                    }`}
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at center, rgba(148,163,184,0.45) 1px, transparent 1px)",
                      backgroundSize: "18px 18px",
                    }}
                  />
                    {backgroundImage ? (
                      <img
                        src={backgroundImage}
                        alt=""
                        className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-all duration-200 ${
                          isStageBlurActive ? "scale-105 blur-[14px]" : ""
                        }`}
                      />
                    ) : null}
                  {isStageBlurActive ? (
                    <div className="pointer-events-none absolute inset-0 bg-slate-950/45" />
                  ) : null}
                  {!isPreviewMode &&
                    (alignmentGuides.vertical.length > 0 ||
                      alignmentGuides.horizontal.length > 0) && (
                      <div className="pointer-events-none absolute inset-0">
                        {alignmentGuides.vertical.map((xGuide) => (
                          <div
                            key={`v-${xGuide}`}
                            className="absolute top-0 h-full border-l border-dotted border-sky-300/70"
                            style={{ left: xGuide }}
                          />
                        ))}
                        {alignmentGuides.horizontal.map((yGuide) => (
                          <div
                            key={`h-${yGuide}`}
                            className="absolute left-0 w-full border-t border-dotted border-sky-300/70"
                            style={{ top: yGuide }}
                          />
                        ))}
                      </div>
                    )}
                  {visibleItems.length === 0 && (
                    <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-white/55">
                      Drop assets here
                    </p>
                  )}
                    {visibleItems.map((item) => {
                    if (isPreviewMode && item.kind === "mirror") {
                      return null;
                    }

                    const snapOffset =
                      dragSnapOffset.itemId === item.id
                        ? { x: dragSnapOffset.x, y: dragSnapOffset.y }
                        : undefined;

                    return item.kind === "mirror" ? (
                      <CanvasMirrorLine
                        key={item.id}
                        item={item}
                        onHandleStart={handleMirrorHandleStart}
                        onSelect={setSelectedItemId}
                        snapOffset={snapOffset}
                        isPreviewMode={isPreviewMode}
                      />
                    ) : item.kind === "cover" ? (
                      <CanvasCover
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={setSelectedItemId}
                        snapOffset={snapOffset}
                        isPreviewMode={isPreviewMode}
                      />
                    ) : item.kind === "input" ? (
                      <CanvasInput
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onEditInput={handleEditLabel}
                        onSelect={setSelectedItemId}
                        snapOffset={snapOffset}
                        isPreviewMode={isPreviewMode}
                      />
                    ) : item.kind === "toggle" ? (
                      <CanvasToggle
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={setSelectedItemId}
                        onToggle={handleToggleItem}
                        snapOffset={snapOffset}
                        isPreviewMode={isPreviewMode}
                      />
                    ) : (
                      <CanvasButton
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onEditLabel={handleEditLabel}
                        onSwapSides={handleSwapSides}
                        onSelect={setSelectedItemId}
                        onPreviewPressStart={handlePreviewPressStart}
                        onPreviewPressEnd={handlePreviewPressEnd}
                        onPreviewStageToggle={handlePreviewStageToggle}
                        onStageContextMenu={handleStageContextMenu}
                        hasStages={stageRootIds.has(item.id)}
                        isPreviewPressed={previewPressedItemId === item.id}
                        snapOffset={snapOffset}
                        isPreviewMode={isPreviewMode}
                      />
                    );
                    })}
                  </section>
                </div>
              </div>

            </div>
          </section>

          <aside
            className="flex h-[min(66vh,620px)] min-h-0 flex-col overflow-y-auto rounded-2xl border border-white/[0.03] bg-slate-900/70 p-4 text-white shadow-2xl backdrop-blur [scrollbar-color:rgba(100,116,139,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600/50"
          >
            <div className="mb-5 px-1">
              <h2 className="text-3xl font-semibold tracking-tight">Properties</h2>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                type="button"
                className="h-10 rounded-lg border-white/15 bg-slate-900/70 text-white hover:bg-slate-800/80"
                onClick={handleUndo}
                disabled={!canUndo}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="outline"
                type="button"
                className="h-10 rounded-lg border-white/15 bg-slate-900/70 text-white hover:bg-slate-800/80"
                onClick={handleRedo}
                disabled={!canRedo}
              >
                <Redo2 className="mr-2 h-4 w-4" />
                Redo
              </Button>
            </div>

            {selectedItem?.kind === "icon" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="icon-tag-side" className="text-sm text-white/80">
                    Tag
                  </Label>
                  <Input
                    id="icon-tag-side"
                    value={selectedItem.tag ?? ""}
                    onChange={(event) => handleSelectedTagChange(event.target.value)}
                    placeholder="Optional tag"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Button colors</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="icon-outline-side" className="text-xs text-white/70">
                        Outline
                      </Label>
                      <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                        <Input
                          id="icon-outline-side"
                          type="color"
                          value={
                            (selectedItem.outlineColor ?? "#ffffff") === "transparent"
                              ? "#000000"
                              : (selectedItem.outlineColor ?? "#ffffff")
                          }
                          onInput={(event) =>
                            handleSelectedOutlineColorChange(event.currentTarget.value)
                          }
                          className="h-10 w-[52px] min-w-[52px] cursor-pointer border-white/10 bg-slate-900 p-1"
                        />
                        <Button
                          variant="outline"
                          className="h-9 w-full min-w-0 border-white/10 bg-slate-900 px-2 text-[11px] text-white hover:bg-slate-800"
                          onClick={() => handleSelectedOutlineColorChange("transparent")}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="icon-fill-side" className="text-xs text-white/70">
                        Fill
                      </Label>
                      <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                        <Input
                          id="icon-fill-side"
                          type="color"
                          value={
                            (selectedItem.fillColor ?? "transparent") === "transparent"
                              ? "#000000"
                              : (selectedItem.fillColor ?? "transparent")
                          }
                          onInput={(event) =>
                            handleSelectedFillColorChange(event.currentTarget.value)
                          }
                          className="h-10 w-[52px] min-w-[52px] cursor-pointer border-white/10 bg-slate-900 p-1"
                        />
                        <Button
                          variant="outline"
                          className="h-9 w-full min-w-0 border-white/10 bg-slate-900 px-2 text-[11px] text-white hover:bg-slate-800"
                          onClick={() => handleSelectedFillColorChange("transparent")}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="icon-search-side" className="text-sm text-white/80">
                    Icon picker
                  </Label>
                  <Input
                    id="icon-search-side"
                    value={iconSearch}
                    onChange={(event) => setIconSearch(event.target.value)}
                    placeholder="Search icon name"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                  <ScrollArea
                    className="h-52 rounded-md border border-white/10 bg-slate-900/70 p-2"
                    scrollbarClassName="bg-transparent"
                    thumbClassName="bg-slate-500/60"
                  >
                    <div className="grid grid-cols-5 gap-2">
                      {ICON_NAMES.filter((name) =>
                        name.toLowerCase().includes(iconSearch.trim().toLowerCase())
                      )
                        .slice(0, 300)
                        .map((name) => {
                          const IconComponent = ICON_COMPONENTS[name] ?? Bot;
                          const isActive = selectedItem.iconName === name;
                          return (
                            <Button
                              key={name}
                              variant="outline"
                              size="icon"
                              className={`h-9 w-9 border-white/10 bg-slate-900 text-white hover:bg-slate-800 ${
                                isActive ? "ring-1 ring-blue-400/70" : ""
                              }`}
                              aria-label={name}
                              onClick={() => handleSelectedIconNameChange(name)}
                            >
                              <IconComponent className="h-4 w-4" />
                            </Button>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </div>

                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Staging</Label>
                  <Button
                    variant="outline"
                    type="button"
                    className="h-10 rounded-lg border-white/15 bg-slate-900/70 text-white hover:bg-slate-800/80"
                    onClick={selectedIsStagingRoot ? handleEndStaging : handleStartStaging}
                    disabled={!selectedIsStagingRoot && !selectedIsStageableRoot}
                  >
                    {selectedIsStagingRoot ? "End staging" : "Add stage"}
                  </Button>
                </div>
              </div>
            ) : selectedItem?.kind === "toggle" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="toggle-name" className="text-sm text-white/80">
                    Toggle name
                  </Label>
                  <Input
                    id="toggle-name"
                    value={selectedItem.label}
                    onChange={(event) => handleSelectedLabelChange(event.target.value)}
                    placeholder="Enter toggle text"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="toggle-tag" className="text-sm text-white/80">
                    Tag
                  </Label>
                  <Input
                    id="toggle-tag"
                    value={selectedItem.tag ?? ""}
                    onChange={(event) => handleSelectedTagChange(event.target.value)}
                    placeholder="Enter tag"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Default state</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(selectedItem.toggleOn)}
                    className={`relative inline-flex h-10 w-20 items-center rounded-full border px-1 transition-colors ${
                      selectedItem.toggleOn
                        ? "border-sky-300/50 bg-sky-400/35"
                        : "border-white/20 bg-slate-800/80"
                    }`}
                    onClick={() => handleSelectedToggleStateChange(!selectedItem.toggleOn)}
                  >
                    <span
                      className={`inline-block h-7 w-7 rounded-full bg-white transition-transform ${
                        selectedItem.toggleOn ? "translate-x-10" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Text alignment</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["left", "center", "right"] as const).map((align) => (
                      <Button
                        key={align}
                        variant="outline"
                        type="button"
                        className={`h-9 border-white/10 bg-slate-900 text-xs text-white hover:bg-slate-800 ${
                          (selectedItem.toggleTextAlign ?? "center") === align
                            ? "ring-1 ring-blue-400/70"
                            : ""
                        }`}
                        onClick={() => handleSelectedToggleTextAlignChange(align)}
                      >
                        {align === "center"
                          ? "Middle"
                          : align[0].toUpperCase() + align.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="toggle-text-size" className="text-sm text-white/80">
                    Text size
                  </Label>
                  <Input
                    id="toggle-text-size"
                    type="number"
                    min={8}
                    max={20}
                    value={selectedItem.toggleTextSize ?? 10}
                    onChange={(event) =>
                      handleSelectedToggleTextSizeChange(
                        Number(event.target.value) || 10,
                      )
                    }
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
              </div>
            ) : selectedItem?.kind === "input" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="input-name-side" className="text-sm text-white/80">
                    Input label
                  </Label>
                  <Input
                    id="input-name-side"
                    value={selectedItem.label}
                    onChange={(event) => handleSelectedLabelChange(event.target.value)}
                    placeholder="Input label"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="input-placeholder-side" className="text-sm text-white/80">
                    Placeholder
                  </Label>
                  <Input
                    id="input-placeholder-side"
                    value={selectedItem.placeholder ?? ""}
                    onChange={(event) =>
                      handleSelectedPlaceholderChange(event.target.value)
                    }
                    placeholder="Enter text"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="input-tag-side" className="text-sm text-white/80">
                    Tag
                  </Label>
                  <Input
                    id="input-tag-side"
                    value={selectedItem.tag ?? ""}
                    onChange={(event) => handleSelectedTagChange(event.target.value)}
                    placeholder="Enter tag"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="button-name" className="text-sm text-white/80">
                    Button name
                  </Label>
                  <Input
                    id="button-name"
                    value={selectedItem?.kind === "text" ? selectedItem.label : ""}
                    onChange={(event) => handleSelectedLabelChange(event.target.value)}
                    placeholder="Enter button text"
                    disabled={selectedItem?.kind !== "text"}
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35 disabled:opacity-50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="button-tag" className="text-sm text-white/80">
                    Tag
                  </Label>
                  <Input
                    id="button-tag"
                    value={selectedItem?.kind === "text" ? (selectedItem.tag ?? "") : ""}
                    onChange={(event) => handleSelectedTagChange(event.target.value)}
                    placeholder="Enter tag"
                    disabled={selectedItem?.kind !== "text"}
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35 disabled:opacity-50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Staging</Label>
                  <Button
                    variant="outline"
                    type="button"
                    className="h-10 rounded-lg border-white/15 bg-slate-900/70 text-white hover:bg-slate-800/80"
                    onClick={selectedIsStagingRoot ? handleEndStaging : handleStartStaging}
                    disabled={!selectedIsStagingRoot && !selectedIsStageableRoot}
                  >
                    {selectedIsStagingRoot ? "End staging" : "Add stage"}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-8 grid gap-2">
              <Button
                variant="outline"
                type="button"
                className="h-10 rounded-lg border-white/15 bg-slate-900/70 text-white hover:bg-slate-800/80"
                onClick={() => {
                  setAspectWidthDraft(aspectWidth);
                  setAspectHeightDraft(aspectHeight);
                  setIsAspectDialogOpen(true);
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Field settings
              </Button>
              <Button
                variant="outline"
                type="button"
                className="h-10 rounded-lg border-white/15 bg-slate-900/70 text-white hover:bg-slate-800/80"
                onClick={() => setIsResetDialogOpen(true)}
              >
                Reset
              </Button>
            </div>
          </aside>
        </main>

        <DragOverlay dropAnimation={null}>
          {!isPreviewMode && activeType === "palette" ? (
            <div
              style={{
                width: activeSize.width,
                height: activeSize.height,
                transform: `translate(${paletteSnapOffset.x + palettePointerOffset.x}px, ${paletteSnapOffset.y + palettePointerOffset.y}px)`,
              }}
            >
              {activeKind === "mirror" ? (
                <svg
                  width={activeSize.width}
                  height={activeSize.height}
                  className="block"
                >
                  <line
                    x1={activeSize.width / 2}
                    y1={0}
                    x2={activeSize.width / 2}
                    y2={activeSize.height}
                    stroke="#ef4444"
                    strokeWidth={3}
                  />
                </svg>
              ) : activeKind === "cover" ? (
                <div
                  className="h-full w-full rounded-md border border-dashed border-white/50 bg-white/5"
                />
              ) : activeKind === "input" ? (
                <div className="flex h-full w-full flex-col gap-2">
                  <div className="text-xs text-white/80">Input label</div>
                  <Input placeholder="Enter text" readOnly />
                </div>
              ) : activeKind === "toggle" ? (
                <div className="flex h-full w-full flex-col justify-center gap-1">
                  <div className="text-center text-[11px] text-white/80">{activeLabel}</div>
                  <div className="relative h-[calc(100%-18px)] w-full rounded-full border border-sky-300/40 bg-sky-400/25">
                    <span className="absolute right-1 top-1/2 h-[68%] aspect-square -translate-y-1/2 rounded-full bg-white" />
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size={activeKind === "icon" ? "icon" : "default"}
                  className="h-full w-full rounded-lg border-white/25 !bg-slate-900/80 !text-white hover:!bg-slate-900/80"
                  aria-label={activeKind === "icon" ? activeLabel : undefined}
                >
                  {activeKind === "icon" ? (
                    (() => {
                      const IconComponent =
                        ICON_COMPONENTS[activeIconName] ?? Bot;
                      return (
                        <IconComponent
                          className="h-5 w-5"
                          style={{
                            stroke: activeOutlineColor ?? "currentColor",
                            fill: activeFillColor ?? "none",
                          }}
                        />
                      );
                    })()
                  ) : (
                    activeLabel
                  )}
                </Button>
              )}
            </div>
          ) : null}
        </DragOverlay>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingId(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Button Settings</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="button-tag">Tag</Label>
                <Input
                  id="button-tag"
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  placeholder="Tag for data"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="button-label">Button text</Label>
                <Input
                  id="button-label"
                  value={labelDraft}
                  onChange={(event) => setLabelDraft(event.target.value)}
                  placeholder="Button"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLabel}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isInputDialogOpen}
          onOpenChange={(open) => {
            setIsInputDialogOpen(open);
            if (!open) {
              setInputEditingId(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Input Settings</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="input-tag">Tag</Label>
                <Input
                  id="input-tag"
                  value={inputTagDraft}
                  onChange={(event) => setInputTagDraft(event.target.value)}
                  placeholder="Optional tag"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="input-label">Label</Label>
                <Input
                  id="input-label"
                  value={inputLabelDraft}
                  onChange={(event) => setInputLabelDraft(event.target.value)}
                  placeholder="Input label"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="input-placeholder">Placeholder</Label>
                <Input
                  id="input-placeholder"
                  value={inputPlaceholderDraft}
                  onChange={(event) => setInputPlaceholderDraft(event.target.value)}
                  placeholder="Enter text"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInputDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveInput}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isAspectDialogOpen}
          onOpenChange={(open) => setIsAspectDialogOpen(open)}
        >
          <DialogContent className="border-white/10 bg-slate-950 text-white data-[state=closed]:slide-out-to-right-1/2 data-[state=open]:slide-in-from-right-1/2">
            <DialogHeader>
              <DialogTitle>Field aspect ratio</DialogTitle>
              <DialogDescription className="text-white/60">
                Set the width and height ratio for the field.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="aspect-width" className="text-white/85">Width</Label>
                <Input
                  id="aspect-width"
                  inputMode="decimal"
                  value={aspectWidthDraft}
                  onChange={(event) => setAspectWidthDraft(event.target.value)}
                  placeholder="16"
                  className="border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aspect-height" className="text-white/85">Height</Label>
                <Input
                  id="aspect-height"
                  inputMode="decimal"
                  value={aspectHeightDraft}
                  onChange={(event) => setAspectHeightDraft(event.target.value)}
                  placeholder="9"
                  className="border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Label htmlFor="background-upload" className="text-white/85">Background image</Label>
              <input
                ref={backgroundInputRef}
                id="background-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBackgroundUpload}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="border border-white/10 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-900 disabled:text-white/50"
                  onClick={() => backgroundInputRef.current?.click()}
                >
                  Upload image
                </Button>
                <Button
                  className="border border-white/10 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-900 disabled:text-white/50"
                  onClick={() => setBackgroundImage(null)}
                  disabled={!backgroundImage}
                >
                  Remove image
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
              <div className="grid gap-0.5">
                <Label htmlFor="alignment-assist-toggle">Alignment assist</Label>
                <p className="text-xs text-white/60">
                  Snap and guide lines while moving elements
                </p>
              </div>
              <button
                id="alignment-assist-toggle"
                type="button"
                role="switch"
                aria-checked={isAlignmentAssistEnabled}
                aria-label="Toggle alignment assist"
                onClick={() =>
                  setIsAlignmentAssistEnabled((current) => !current)
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                  isAlignmentAssistEnabled
                    ? "border-white/60 bg-white/80"
                    : "border-white/30 bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    isAlignmentAssistEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setIsAspectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-500" onClick={handleSaveAspectRatio}>
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isIconDialogOpen}
          onOpenChange={(open) => {
            setIsIconDialogOpen(open);
            if (!open) {
              setIconEditingId(null);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Icon Button Settings</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="icon-tag">Tag</Label>
                  <Input
                    id="icon-tag"
                    value={iconTagDraft}
                    onChange={(event) => handleIconTagChange(event.target.value)}
                    placeholder="Optional tag"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Button colors</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="icon-outline">Outline</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="icon-outline"
                          type="color"
                          value={outlineDraft === "transparent" ? "#000000" : outlineDraft}
                          onInput={(event) => {
                            const next = event.currentTarget.value;
                            setOutlineDraft(next);
                          }}
                          onPointerUp={() => commitOutlineColor(outlineDraft)}
                          onBlur={() => commitOutlineColor(outlineDraft)}
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            const next = "transparent";
                            setOutlineDraft(next);
                            commitOutlineColor(next);
                          }}
                        >
                          Transparent
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="icon-fill">Fill</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="icon-fill"
                          type="color"
                          value={fillDraft === "transparent" ? "#000000" : fillDraft}
                          onInput={(event) => {
                            const next = event.currentTarget.value;
                            setFillDraft(next);
                          }}
                          onPointerUp={() => commitFillColor(fillDraft)}
                          onBlur={() => commitFillColor(fillDraft)}
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            const next = "transparent";
                            setFillDraft(next);
                            commitFillColor(next);
                          }}
                        >
                          Transparent
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="icon-search">Search icons</Label>
                  <Input
                    id="icon-search"
                    value={iconSearch}
                    onChange={(event) => setIconSearch(event.target.value)}
                    placeholder="Search by name"
                  />
                </div>
              </div>
              <ScrollArea
                className="h-48"
                viewportRef={iconViewportRef}
                onViewportScroll={(event) =>
                  setIconScrollTop(event.currentTarget.scrollTop)
                }
              >
                {showIconGrid ? (
                  <div className="relative" style={{ height: totalIconHeight }}>
                    {visibleIcons.map((name, index) => {
                      const IconComponent = ICON_COMPONENTS[name] ?? Bot;
                      const absoluteIndex = startIndex + index;
                      const row = Math.floor(absoluteIndex / iconGridColumns);
                      const col = absoluteIndex % iconGridColumns;
                      return (
                        <Button
                          key={name}
                          variant="outline"
                          size="icon"
                          className="absolute h-10 w-10"
                          aria-label={name}
                          style={{
                            top: row * ICON_CELL_SIZE + ICON_CELL_OFFSET,
                            left: col * ICON_CELL_SIZE + ICON_CELL_OFFSET,
                          }}
                          onClick={() => {
                            if (!iconEditingId) return;
                            setItems((prev) =>
                              prev.map((item) =>
                                item.id === iconEditingId
                                  ? {
                                      ...item,
                                      iconName: name,
                                      label: name,
                                    }
                                  : item
                              )
                            );
                            setIsIconDialogOpen(false);
                          }}
                        >
                          <IconComponent className="h-5 w-5" />
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                    Loading icons...
                  </div>
                )}
              </ScrollArea>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsIconDialogOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Export layout</DialogTitle>
              <DialogDescription>
                Copy the JSON or download it as a file.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] rounded-md bg-black/80 p-4 text-sm text-white">
              <pre className="whitespace-pre-wrap">{exportJson}</pre>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handleDownloadExport} disabled={!exportJson}>
                Download .json
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload layout</DialogTitle>
              <DialogDescription>
                Review the JSON before uploading it to Supabase.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] rounded-md bg-black/80 p-4 text-sm text-white">
              <pre className="whitespace-pre-wrap">{uploadJson}</pre>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handleUploadConfig} disabled={uploadPayload.length === 0}>
                Upload config
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent className="border-white/10 bg-slate-950 text-white data-[state=closed]:slide-out-to-right-1/2 data-[state=closed]:slide-out-to-bottom-[48%] data-[state=open]:slide-in-from-right-1/2 data-[state=open]:slide-in-from-bottom-[48%]">
            <DialogHeader>
              <DialogTitle>Reset editor?</DialogTitle>
              <DialogDescription className="text-white/60">
                This will clear all elements, background image, and current layout settings.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setIsResetDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-500"
                onClick={() => {
                  handleResetEditor();
                  setIsResetDialogOpen(false);
                }}
              >
                Yes, reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}
