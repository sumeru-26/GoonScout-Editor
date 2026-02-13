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
import { Bot, Download, Settings, Upload } from "lucide-react";
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
import { AspectRatio } from "@/components/ui/aspect-ratio";

const BUTTON_SIZE = { width: 104, height: 44 } as const;
const ICON_BUTTON_SIZE = { width: 40, height: 40 } as const;
const MIRROR_LINE_SIZE = { width: 160, height: 80 } as const;
const COVER_SIZE = { width: 220, height: 120 } as const;
const INPUT_SIZE = { width: 220, height: 56 } as const;
const FIELD_HEIGHT = 420;
const ICON_GRID_COLUMNS = 6;
const ICON_CELL_SIZE = 48;
const ICON_CELL_OFFSET = 4;
const MIRROR_SNAP_PX = 8;
const GUIDE_SNAP_PX = 6;

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
      acc[name] = value as React.ComponentType<{ className?: string }>;
    }
    return acc;
  },
  {} as Record<string, React.ComponentType<{ className?: string }>>
);

const ICON_NAMES = Object.keys(ICON_COMPONENTS);

type AssetKind = "text" | "icon" | "mirror" | "swap" | "cover" | "input";

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
};

type DragType = "palette" | "canvas";

type DragData = {
  type: DragType;
  itemId?: string;
  assetKind?: AssetKind;
};

function PaletteButton() {
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
      className="h-12 w-28 transition-opacity duration-150"
      {...attributes}
      {...listeners}
      type="button"
    >
      Button
    </Button>
  );
}

function PaletteIconButton() {
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
      size="icon"
      className="transition-opacity duration-150"
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Bot"
    >
      <Bot className="h-5 w-5" />
    </Button>
  );
}

function PaletteMirrorButton() {
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
      className="h-12 w-28 transition-opacity duration-150"
      {...attributes}
      {...listeners}
      type="button"
    >
      Mirror line
    </Button>
  );
}

function PaletteSwapButton() {
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
      className="h-12 w-28 transition-opacity duration-150"
      {...attributes}
      {...listeners}
      type="button"
    >
      Swap sides
    </Button>
  );
}

function PaletteCoverButton() {
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
      className="h-12 w-28 transition-opacity duration-150"
      {...attributes}
      {...listeners}
      type="button"
    >
      Cover
    </Button>
  );
}

function PaletteInputButton() {
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
      className="h-12 w-28 transition-opacity duration-150"
      {...attributes}
      {...listeners}
      type="button"
    >
      Text input
    </Button>
  );
}

function CanvasButton({
  item,
  onResizeStart,
  onEditLabel,
  onSwapSides,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onEditLabel: (item: CanvasItem) => void;
  onSwapSides: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      data: { type: "canvas", itemId: item.id } satisfies DragData,
    });

  const style: React.CSSProperties = {
    transform: isDragging ? CSS.Translate.toString(transform) : undefined,
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
      className="group absolute !bg-black !text-white transition-opacity duration-150 hover:!bg-black"
      onContextMenu={(event) => {
        event.preventDefault();
        if (item.kind === "swap") {
          onSwapSides();
          return;
        }
        onEditLabel(item);
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
      <span
        role="presentation"
        onPointerDown={(event) => onResizeStart(event, item)}
        className="absolute bottom-1 right-1 hidden h-3 w-3 cursor-se-resize rounded-sm border border-white/60 bg-white/80 group-hover:block"
      />
    </Button>
  );
}

function CanvasMirrorLine({
  item,
  onHandleStart,
}: {
  item: CanvasItem;
  onHandleStart: (
    event: React.PointerEvent,
    item: CanvasItem,
    handle: "start" | "end"
  ) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
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
    transform: transform ? CSS.Translate.toString(transform) : undefined,
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
    </div>
  );
}

function CanvasCover({
  item,
  onResizeStart,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group absolute rounded-md border border-dashed border-white/50 bg-white/5"
      {...attributes}
      {...listeners}
    >
      <div className="pointer-events-none flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-white/60">
        Cover
      </div>
      <span
        role="presentation"
        onPointerDown={(event) => onResizeStart(event, item)}
        className="absolute bottom-1 right-1 hidden h-3 w-3 cursor-se-resize rounded-sm border border-white/60 bg-white/80 group-hover:block"
      />
    </div>
  );
}

function CanvasInput({
  item,
  onResizeStart,
  onEditInput,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onEditInput: (item: CanvasItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
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
      onContextMenu={(event) => {
        event.preventDefault();
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
      <span
        role="presentation"
        onPointerDown={(event) => onResizeStart(event, item)}
        className="absolute bottom-1 right-1 hidden h-3 w-3 cursor-se-resize rounded-sm border border-white/60 bg-white/80 group-hover:block"
      />
    </div>
  );
}

export default function EditorPage() {
  const [items, setItems] = React.useState<CanvasItem[]>([]);
  const [activeType, setActiveType] = React.useState<DragType | null>(null);
  const [activeSize, setActiveSize] = React.useState(BUTTON_SIZE);
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
  const [backgroundImage, setBackgroundImage] = React.useState<string | null>(null);
  const backgroundInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isInputDialogOpen, setIsInputDialogOpen] = React.useState(false);
  const [inputEditingId, setInputEditingId] = React.useState<string | null>(null);
  const [inputLabelDraft, setInputLabelDraft] = React.useState("");
  const [inputPlaceholderDraft, setInputPlaceholderDraft] = React.useState("");
  const [inputTagDraft, setInputTagDraft] = React.useState("");
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [exportJson, setExportJson] = React.useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [uploadJson, setUploadJson] = React.useState("");
  const [uploadPayload, setUploadPayload] = React.useState<
    Array<Record<string, unknown>>
  >([]);
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

  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as DragData | undefined;
      setActiveType(data?.type ?? null);

      if (data?.type === "canvas" && data.itemId) {
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
        setActiveKind(nextKind);
        setActiveSize(
          nextKind === "icon"
            ? ICON_BUTTON_SIZE
            : nextKind === "mirror"
              ? MIRROR_LINE_SIZE
              : nextKind === "cover"
                ? COVER_SIZE
            : nextKind === "input"
              ? INPUT_SIZE
              : nextKind === "swap"
                ? BUTTON_SIZE
              : BUTTON_SIZE
        );
        setActiveLabel(
          nextKind === "icon"
            ? "Bot"
            : nextKind === "mirror"
              ? "Mirror line"
              : nextKind === "cover"
                ? "Cover"
            : nextKind === "input"
              ? "Input label"
              : nextKind === "swap"
                ? "Swap sides"
                : "Button"
        );
        setActiveIconName("Bot");
        setActiveOutlineColor(undefined);
        setActiveFillColor(undefined);
      } else {
        setActiveSize(BUTTON_SIZE);
        setActiveLabel("Button");
        setActiveKind("text");
        setActiveIconName("Bot");
        setActiveOutlineColor(undefined);
        setActiveFillColor(undefined);
      }
    },
    [items]
  );

  const handleDragMove = React.useCallback(
    (event: DragMoveEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const data = event.active.data.current as DragData | undefined;
      const initialRect = event.active.rect.current.initial;
      const translatedRect = event.active.rect.current.translated;

      if (!initialRect) return;

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
              : paletteKind === "swap"
                ? BUTTON_SIZE
                : BUTTON_SIZE;
      const activeWidth = activeItem?.width ?? paletteSize.width;
      const activeHeight = activeItem?.height ?? paletteSize.height;

      const isInsideCanvas =
        finalLeft + activeWidth > canvasRect.left &&
        finalLeft < canvasRect.right &&
        finalTop + activeHeight > canvasRect.top &&
        finalTop < canvasRect.bottom;

      if (!isInsideCanvas) {
        setAlignmentGuides({ vertical: [], horizontal: [] });
        return;
      }

      const x = finalLeft - canvasRect.left;
      const y = finalTop - canvasRect.top;

      const activeLeft = x;
      const activeRight = x + activeWidth;
      const activeCenterX = x + activeWidth / 2;
      const activeTop = y;
      const activeBottom = y + activeHeight;
      const activeCenterY = y + activeHeight / 2;

      const vertical = new Set<number>();
      const horizontal = new Set<number>();

      items
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
          if (Math.abs(activeCenterX - centerX) <= GUIDE_SNAP_PX)
            vertical.add(centerX);

          if (Math.abs(activeTop - top) <= GUIDE_SNAP_PX) horizontal.add(top);
          if (Math.abs(activeBottom - bottom) <= GUIDE_SNAP_PX)
            horizontal.add(bottom);
          if (Math.abs(activeCenterY - centerY) <= GUIDE_SNAP_PX)
            horizontal.add(centerY);
        });

      setAlignmentGuides({
        vertical: Array.from(vertical),
        horizontal: Array.from(horizontal),
      });
    },
    [items]
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
      setIconEditingId(item.id);
      iconEditingIdRef.current = item.id;
      setIconSearch("");
      setOutlineDraft(item.outlineColor ?? "#ffffff");
      setFillDraft(item.fillColor ?? "transparent");
      setIconTagDraft(item.tag ?? "");
      setIsIconDialogOpen(true);
      return;
    }

    if (item.kind === "input") {
      setInputEditingId(item.id);
      setInputLabelDraft(item.label);
      setInputPlaceholderDraft(item.placeholder ?? "");
      setInputTagDraft(item.tag ?? "");
      setIsInputDialogOpen(true);
      return;
    }

    setEditingId(item.id);
    setLabelDraft(item.label);
    setTagDraft(item.tag ?? "");
    setIsDialogOpen(true);
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

    const taggedItems = items.filter((item) =>
      ["text", "icon", "input"].includes(item.kind)
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
    const normalize = (value: number) => Number(value.toFixed(2));
    const relative = (value: number, center: number) =>
      normalize(value - center);

    const payload = items.map((item) => {
      const centerItemX = item.x + item.width / 2;
      const centerItemY = item.y + item.height / 2;

      switch (item.kind) {
        case "text":
          return {
            button: {
              tag: item.tag ?? "",
              x: relative(centerItemX, centerX),
              y: relative(centerItemY, centerY),
              text: item.label,
            },
          };
        case "icon":
          return {
            "icon-button": {
              tag: item.tag ?? "",
              x: relative(centerItemX, centerX),
              y: relative(centerItemY, centerY),
              icon: item.iconName ?? "",
              outline: item.outlineColor ?? "#ffffff",
              fill: item.fillColor ?? "transparent",
            },
          };
        case "input":
          return {
            "text-input": {
              tag: item.tag ?? "",
              x: relative(centerItemX, centerX),
              y: relative(centerItemY, centerY),
              label: item.label,
              placeholder: item.placeholder ?? "",
            },
          };
        case "mirror": {
          const startX = item.startX ?? item.x;
          const startY = item.startY ?? item.y;
          const endX = item.endX ?? item.x + item.width;
          const endY = item.endY ?? item.y + item.height;
          return {
            "mirror-line": {
              x1: relative(startX, centerX),
              y1: relative(startY, centerY),
              x2: relative(endX, centerX),
              y2: relative(endY, centerY),
            },
          };
        }
        case "swap":
          return {
            "swap-sides": {
              x: relative(centerItemX, centerX),
              y: relative(centerItemY, centerY),
            },
          };
        case "cover": {
          const x1 = item.x;
          const y1 = item.y;
          const x2 = item.x + item.width;
          const y2 = item.y + item.height;
          return {
            cover: {
              x1: relative(x1, centerX),
              y1: relative(y1, centerY),
              x2: relative(x2, centerX),
              y2: relative(y2, centerY),
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

    return {
      payload: filteredPayload,
      json: JSON.stringify(filteredPayload, null, 2),
    };
  }, [items]);

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
      const response = await fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "test", payload: uploadPayload }),
      });

      if (!response.ok) {
        toast.error("Upload failed. Please try again.");
        return;
      }

      toast.success("Config uploaded.");
      setIsUploadDialogOpen(false);
    } catch (error) {
      toast.error("Upload failed. Please try again.");
    }
  }, [uploadPayload]);

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
        }
      };
      reader.readAsDataURL(file);
    },
    []
  );

  React.useEffect(() => {
    iconEditingIdRef.current = iconEditingId;
  }, [iconEditingId]);

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

    const handle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(() => setShowIconGrid(true))
        : window.setTimeout(() => setShowIconGrid(true), 0);

    return () => {
      if ("cancelIdleCallback" in window) {
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

        const nextWidth = Math.max(
          64,
          Math.min(resize.startWidth + (event.clientX - resize.startX), maxWidth)
        );
        const nextHeight = Math.max(
          36,
          Math.min(
            resize.startHeight + (event.clientY - resize.startY),
            maxHeight
          )
        );

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
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const data = event.active.data.current as DragData | undefined;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const initialRect = event.active.rect.current.initial;
      const translatedRect = event.active.rect.current.translated;

      if (!canvasRect || !initialRect) {
        setAlignmentGuides({ vertical: [], horizontal: [] });
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
        setItems((prev) => prev.filter((item) => item.id !== data.itemId));
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
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
        return;
      }

      let x = finalLeft - canvasRect.left;
      let y = finalTop - canvasRect.top;

      x = Math.max(0, Math.min(x, canvasRect.width - activeWidth));
      y = Math.max(0, Math.min(y, canvasRect.height - activeHeight));

      const snapToGuides = (nextX: number, nextY: number) => {
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

        items
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
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== data.itemId) return item;
            if (item.kind !== "mirror") {
              const snapped = snapToGuides(x, y);
              return { ...item, x: snapped.x, y: snapped.y };
            }
            const dx = x - item.x;
            const dy = y - item.y;
            const startX = (item.startX ?? item.x) + dx;
            const startY = (item.startY ?? item.y) + dy;
            const endX = (item.endX ?? item.x + item.width) + dx;
            const endY = (item.endY ?? item.y + item.height) + dy;
            return {
              ...item,
              x,
              y,
              startX,
              startY,
              endX,
              endY,
            };
          })
        );
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        return;
      }

      if (data?.type === "palette") {
        if (data.assetKind === "mirror" && items.some((item) => item.kind === "mirror")) {
          setActiveType(null);
          return;
        }
        if (data.assetKind !== "mirror") {
          const snapped = snapToGuides(x, y);
          x = snapped.x;
          y = snapped.y;
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
            endX: kind === "mirror" ? x + size.width : undefined,
            endY: kind === "mirror" ? y + size.height : undefined,
            placeholder: kind === "input" ? "Enter text" : undefined,
          },
        ]);
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
      }
    },
    [items]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-black text-white">
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Upload layout"
            type="button"
            onClick={handleUploadPreview}
          >
            <Upload className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Download layout"
            type="button"
            onClick={handleExport}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Settings"
            type="button"
            onClick={() => {
              setAspectWidthDraft(aspectWidth);
              setAspectHeightDraft(aspectHeight);
              setIsAspectDialogOpen(true);
            }}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:flex-row">
          <div className="w-full flex-1">
            <AspectRatio
              ratio={aspectRatio}
              className="mx-auto"
              style={{ width: fieldWidth, height: FIELD_HEIGHT }}
            >
              <section
                ref={setCanvasRef}
                className={`relative flex h-full w-full items-center justify-center rounded-md bg-black shadow-2xl transition-colors ${
                  isOver ? "ring-2 ring-white/40" : "ring-1 ring-white/10"
                }`}
                style={
                  backgroundImage
                    ? {
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }
                    : undefined
                }
              >
                {(alignmentGuides.vertical.length > 0 ||
                  alignmentGuides.horizontal.length > 0) && (
                  <div className="pointer-events-none absolute inset-0">
                    {alignmentGuides.vertical.map((xGuide) => (
                      <div
                        key={`v-${xGuide}`}
                        className="absolute top-0 h-full border-l border-dotted border-white/60"
                        style={{ left: xGuide }}
                      />
                    ))}
                    {alignmentGuides.horizontal.map((yGuide) => (
                      <div
                        key={`h-${yGuide}`}
                        className="absolute left-0 w-full border-t border-dotted border-white/60"
                        style={{ top: yGuide }}
                      />
                    ))}
                  </div>
                )}
                {items.length === 0 && (
                  <p className="text-sm text-white/60">Drop assets here</p>
                )}
                {items.map((item) =>
                  item.kind === "mirror" ? (
                    <CanvasMirrorLine
                      key={item.id}
                      item={item}
                      onHandleStart={handleMirrorHandleStart}
                    />
                  ) : item.kind === "cover" ? (
                    <CanvasCover
                      key={item.id}
                      item={item}
                      onResizeStart={handleResizeStart}
                    />
                  ) : item.kind === "input" ? (
                    <CanvasInput
                      key={item.id}
                      item={item}
                      onResizeStart={handleResizeStart}
                      onEditInput={handleEditLabel}
                    />
                  ) : (
                    <CanvasButton
                      key={item.id}
                      item={item}
                      onResizeStart={handleResizeStart}
                      onEditLabel={handleEditLabel}
                      onSwapSides={handleSwapSides}
                    />
                  )
                )}
              </section>
            </AspectRatio>
          </div>

          <aside
            ref={setAssetsRef}
            className="flex h-[420px] w-full max-w-55 flex-col rounded-md bg-black px-6 py-8 text-white shadow-2xl ring-1 ring-white/10"
          >
            <ScrollArea
              className="h-full w-full"
              scrollbarClassName="bg-black/40"
              thumbClassName="bg-black"
            >
              <div className="flex flex-col items-center gap-6 px-1">
                <PaletteButton />
                <PaletteIconButton />
                <PaletteMirrorButton />
                <PaletteSwapButton />
                <PaletteCoverButton />
                <PaletteInputButton />
              </div>
            </ScrollArea>
          </aside>
        </main>

        <DragOverlay dropAnimation={null}>
          {activeType === "palette" ? (
            <div style={{ width: activeSize.width, height: activeSize.height }}>
              {activeKind === "mirror" ? (
                <svg
                  width={activeSize.width}
                  height={activeSize.height}
                  className="block"
                >
                  <line
                    x1={0}
                    y1={0}
                    x2={activeSize.width}
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
              ) : (
                <Button
                  variant="outline"
                  size={activeKind === "icon" ? "icon" : "default"}
                  className="h-full w-full !bg-black !text-white hover:!bg-black"
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Field aspect ratio</DialogTitle>
              <DialogDescription>
                Set the width and height ratio for the field.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="aspect-width">Width</Label>
                <Input
                  id="aspect-width"
                  inputMode="decimal"
                  value={aspectWidthDraft}
                  onChange={(event) => setAspectWidthDraft(event.target.value)}
                  placeholder="16"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aspect-height">Height</Label>
                <Input
                  id="aspect-height"
                  inputMode="decimal"
                  value={aspectHeightDraft}
                  onChange={(event) => setAspectHeightDraft(event.target.value)}
                  placeholder="9"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Label htmlFor="background-upload">Background image</Label>
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
                  className="bg-black text-white hover:bg-black disabled:bg-black disabled:text-white"
                  onClick={() => backgroundInputRef.current?.click()}
                >
                  Upload image
                </Button>
                <Button
                  className="bg-black text-white hover:bg-black disabled:bg-black disabled:text-white"
                  onClick={() => setBackgroundImage(null)}
                  disabled={!backgroundImage}
                >
                  Remove image
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAspectDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAspectRatio}>Apply</Button>
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
                            const next = event.target.value;
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
                            const next = event.target.value;
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
      </div>
    </DndContext>
  );
}
