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
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import * as LucideIcons from "lucide-react";
import { Bot, Settings } from "lucide-react";
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
const FIELD_HEIGHT = 420;
const ICON_GRID_COLUMNS = 6;
const ICON_CELL_SIZE = 48;
const ICON_CELL_OFFSET = 4;

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

type AssetKind = "text" | "icon";

type CanvasItem = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  kind: AssetKind;
  iconName?: string;
  outlineColor?: string;
  fillColor?: string;
};

type DragType = "palette" | "canvas";

type DragData = {
  type: DragType;
  itemId?: string;
  assetKind?: AssetKind;
};

function PaletteButton() {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: "palette-button",
      data: { type: "palette", assetKind: "text" } satisfies DragData,
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="h-12 w-28"
      {...attributes}
      {...listeners}
      type="button"
    >
      Button
    </Button>
  );
}

function PaletteIconButton() {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: "palette-icon-button",
      data: { type: "palette", assetKind: "icon" } satisfies DragData,
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      size="icon"
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Bot"
    >
      <Bot className="h-5 w-5" />
    </Button>
  );
}

function CanvasButton({
  item,
  onResizeStart,
  onEditLabel,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onEditLabel: (item: CanvasItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      data: { type: "canvas", itemId: item.id } satisfies DragData,
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      size={item.kind === "icon" ? "icon" : "default"}
      className="group absolute hover:bg-transparent hover:text-inherit hover:border-border"
      onContextMenu={(event) => {
        event.preventDefault();
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
  const [isIconDialogOpen, setIsIconDialogOpen] = React.useState(false);
  const [iconEditingId, setIconEditingId] = React.useState<string | null>(null);
  const [iconSearch, setIconSearch] = React.useState("");
  const [showIconGrid, setShowIconGrid] = React.useState(false);
  const [outlineDraft, setOutlineDraft] = React.useState("#ffffff");
  const [fillDraft, setFillDraft] = React.useState("transparent");
  const [aspectWidth, setAspectWidth] = React.useState("16");
  const [aspectHeight, setAspectHeight] = React.useState("9");
  const [aspectWidthDraft, setAspectWidthDraft] = React.useState("16");
  const [aspectHeightDraft, setAspectHeightDraft] = React.useState("9");
  const deferredIconSearch = React.useDeferredValue(iconSearch);
  const iconViewportRef = React.useRef<HTMLDivElement | null>(null);
  const [iconViewportHeight, setIconViewportHeight] = React.useState(288);
  const [iconViewportWidth, setIconViewportWidth] = React.useState(288);
  const [iconScrollTop, setIconScrollTop] = React.useState(0);
  const iconEditingIdRef = React.useRef<string | null>(null);
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const resizingRef = React.useRef<{
    id: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    originX: number;
    originY: number;
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
        setActiveSize(nextKind === "icon" ? ICON_BUTTON_SIZE : BUTTON_SIZE);
        setActiveLabel(nextKind === "icon" ? "Bot" : "Button");
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

  const handleEditLabel = React.useCallback((item: CanvasItem) => {
    if (item.kind === "icon") {
      setIconEditingId(item.id);
      iconEditingIdRef.current = item.id;
      setIconSearch("");
      setOutlineDraft(item.outlineColor ?? "#ffffff");
      setFillDraft(item.fillColor ?? "transparent");
      setIsIconDialogOpen(true);
      return;
    }

    setEditingId(item.id);
    setLabelDraft(item.label);
    setIsDialogOpen(true);
  }, []);

  const handleSaveLabel = React.useCallback(() => {
    if (!editingId) return;
    const trimmed = labelDraft.trim();
    if (!trimmed) return;
    setItems((prev) =>
      prev.map((entry) =>
        entry.id === editingId ? { ...entry, label: trimmed } : entry
      )
    );
    setIsDialogOpen(false);
  }, [editingId, labelDraft]);

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
      if (!resize) return;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

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
    };

    const handlePointerUp = () => {
      resizingRef.current = null;
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
        paletteKind === "icon" ? ICON_BUTTON_SIZE : BUTTON_SIZE;
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
        return;
      }

      const isInsideCanvas =
        finalLeft + activeWidth > canvasRect.left &&
        finalLeft < canvasRect.right &&
        finalTop + activeHeight > canvasRect.top &&
        finalTop < canvasRect.bottom;

      if (!isInsideCanvas) {
        setActiveType(null);
        return;
      }

      let x = finalLeft - canvasRect.left;
      let y = finalTop - canvasRect.top;

      x = Math.max(0, Math.min(x, canvasRect.width - activeWidth));
      y = Math.max(0, Math.min(y, canvasRect.height - activeHeight));

      if (data?.type === "canvas" && data.itemId) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === data.itemId ? { ...item, x, y } : item
          )
        );
        setActiveType(null);
        return;
      }

      if (data?.type === "palette") {
        const newId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `button-${Date.now()}`;
        const kind = data.assetKind ?? "text";
        const size = kind === "icon" ? ICON_BUTTON_SIZE : BUTTON_SIZE;
        setItems((prev) => [
          ...prev,
          {
            id: newId,
            x,
            y,
            width: size.width,
            height: size.height,
            label: kind === "icon" ? "Bot" : "Button",
            kind,
            iconName: kind === "icon" ? "Bot" : undefined,
            outlineColor: kind === "icon" ? "#ffffff" : undefined,
            fillColor: kind === "icon" ? "transparent" : undefined,
          },
        ]);
        setActiveType(null);
      }
    },
    [items]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-black text-white">
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
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-6 top-6"
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
                {items.length === 0 && (
                  <p className="text-sm text-white/60">Drop assets here</p>
                )}
                {items.map((item) => (
                  <CanvasButton
                    key={item.id}
                    item={item}
                    onResizeStart={handleResizeStart}
                    onEditLabel={handleEditLabel}
                  />
                ))}
              </section>
            </AspectRatio>
          </div>

          <aside
            ref={setAssetsRef}
            className="flex h-[420px] w-full max-w-55 flex-col items-center gap-6 rounded-md bg-black px-6 py-8 text-white shadow-2xl ring-1 ring-white/10"
          >
            <PaletteButton />
            <PaletteIconButton />
          </aside>
        </main>

        <DragOverlay>
          {activeType ? (
            <div style={{ width: activeSize.width, height: activeSize.height }}>
              <Button
                variant="outline"
                size={activeKind === "icon" ? "icon" : "default"}
                className="h-full w-full hover:bg-transparent hover:text-inherit hover:border-border"
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
              <DialogTitle>Edit button text</DialogTitle>
              <DialogDescription>
                Update the label shown on the button.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="button-label">Button text</Label>
              <Input
                id="button-label"
                value={labelDraft}
                onChange={(event) => setLabelDraft(event.target.value)}
                placeholder="Button"
              />
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select an icon</DialogTitle>
              <DialogDescription>
                Choose a lucide icon for this button.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
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
              className="h-72"
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
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}
