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
  Check,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Redo2,
  RotateCcw,
  Send,
  Settings,
  Square,
  ToggleLeft,
  Type,
  Undo2,
  Upload,
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
import { useRouter, useSearchParams } from "next/navigation";

const BUTTON_SIZE = { width: 104, height: 44 } as const;
const ICON_BUTTON_SIZE = { width: 40, height: 40 } as const;
const MIRROR_LINE_SIZE = { width: 160, height: 80 } as const;
const COVER_SIZE = { width: 220, height: 120 } as const;
const INPUT_SIZE = { width: 220, height: 56 } as const;
const TOGGLE_SIZE = { width: 64, height: 36 } as const;
const LOG_SIZE = { width: 280, height: 120 } as const;
const FIELD_HEIGHT = 560;
const ICON_GRID_COLUMNS = 6;
const ICON_CELL_SIZE = 48;
const ICON_CELL_OFFSET = 4;
const MIRROR_SNAP_PX = 8;
const GUIDE_SNAP_PX = 6;
const SNAP_RELEASE_PX = 12;
const AUTOSAVE_DELAY_MS = 1500;

const areNumberArraysEqual = (left: number[], right: number[]) => {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

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
  | "toggle"
  | "undo"
  | "redo"
  | "submit"
  | "reset"
  | "log";

type ActionButtonKind = "undo" | "redo" | "submit" | "reset";

type TeamSide = "red" | "blue";

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
  teamSide?: TeamSide;
  increment?: number;
  swapRedSide?: "left" | "right";
  swapActiveSide?: "left" | "right";
  stageParentId?: string;
};

const isActionButtonKind = (kind: AssetKind): kind is ActionButtonKind =>
  kind === "undo" || kind === "redo" || kind === "submit" || kind === "reset";

const getAssetSize = (kind: AssetKind) =>
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
            : kind === "log"
              ? LOG_SIZE
              : BUTTON_SIZE;

const getDefaultLabelForKind = (kind: AssetKind) =>
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
              : kind === "undo"
                ? "Undo"
                : kind === "redo"
                  ? "Redo"
                  : kind === "submit"
                    ? "Submit"
                    : kind === "reset"
                      ? "Reset"
                      : kind === "log"
                        ? "Log"
                        : "Button";

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

type DragMoveSnapshot = {
  deltaX: number;
  deltaY: number;
  activeData: DragData | undefined;
  initialRect: { left: number; top: number; width: number; height: number } | null;
  translatedRect: { left: number; top: number } | null;
};

type PersistedEditorState = {
  items: CanvasItem[];
  aspectWidth: string;
  aspectHeight: string;
  backgroundImage: string | null;
  coordinateSpace?: string;
  useCustomSideLayouts?: boolean;
  editorTeamSide?: TeamSide;
  previewTeamSide?: TeamSide;
};

type SerializedCanvasItem = Omit<CanvasItem, "kind"> & {
  kind: AssetKind | "button";
};

type SerializedEditorState = Omit<PersistedEditorState, "items"> & {
  items: SerializedCanvasItem[];
  coordinateSpace: "normalized-v1";
};

type EditorSnapshot = {
  items: CanvasItem[];
  aspectWidth: string;
  aspectHeight: string;
  backgroundImage: string | null;
  useCustomSideLayouts: boolean;
  editorTeamSide: TeamSide;
  previewTeamSide: TeamSide;
};

type TutorialStepKey =
  | "navbar"
  | "assets"
  | "canvas"
  | "field-settings"
  | "properties"
  | "tags"
  | "staging"
  | "stage-indicator"
  | "preview"
  | "export";

type TutorialPlacement = "top" | "right" | "bottom" | "left";

type TutorialStep = {
  key: TutorialStepKey;
  title: string;
  body: string;
  placement: TutorialPlacement;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeTag = (value: string) => value.replace(/\s+/g, "").trim();
const NORMALIZED_COORDINATE_SPACE = "normalized-v1" as const;

const clampNormalized = (value: number) => Math.max(-100, Math.min(100, value));
const roundNormalized = (value: number) => Number(clampNormalized(value).toFixed(2));

const normalizeX = (value: number, canvasWidth: number) =>
  roundNormalized(((value - canvasWidth / 2) / (canvasWidth / 2)) * 100);
const normalizeY = (value: number, canvasHeight: number) =>
  roundNormalized((((canvasHeight / 2) - value) / (canvasHeight / 2)) * 100);
const normalizeWidth = (value: number, canvasWidth: number) =>
  roundNormalized((value / canvasWidth) * 100);
const normalizeHeight = (value: number, canvasHeight: number) =>
  roundNormalized((value / canvasHeight) * 100);

const denormalizeX = (value: number, canvasWidth: number) =>
  canvasWidth / 2 + (value / 100) * (canvasWidth / 2);
const denormalizeY = (value: number, canvasHeight: number) =>
  canvasHeight / 2 - (value / 100) * (canvasHeight / 2);
const denormalizeWidth = (value: number, canvasWidth: number) =>
  Math.max(1, (value / 100) * canvasWidth);
const denormalizeHeight = (value: number, canvasHeight: number) =>
  Math.max(1, (value / 100) * canvasHeight);

const serializeCanvasItem = (
  item: CanvasItem,
  canvasWidth: number,
  canvasHeight: number
): SerializedCanvasItem => {
  const kind = item.kind === "text" ? "button" : item.kind;
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2;

  return {
    ...item,
    kind,
    x: normalizeX(centerX, canvasWidth),
    y: normalizeY(centerY, canvasHeight),
    width: normalizeWidth(item.width, canvasWidth),
    height: normalizeHeight(item.height, canvasHeight),
    startX:
      typeof item.startX === "number" ? normalizeX(item.startX, canvasWidth) : undefined,
    startY:
      typeof item.startY === "number"
        ? normalizeY(item.startY, canvasHeight)
        : undefined,
    endX: typeof item.endX === "number" ? normalizeX(item.endX, canvasWidth) : undefined,
    endY:
      typeof item.endY === "number" ? normalizeY(item.endY, canvasHeight) : undefined,
  };
};

const normalizeLoadedItemKind = (kind: unknown): AssetKind => {
  if (kind === "button" || kind === "text") return "text";
  if (
    kind === "icon" ||
    kind === "mirror" ||
    kind === "swap" ||
    kind === "cover" ||
    kind === "input" ||
    kind === "toggle" ||
    kind === "undo" ||
    kind === "redo" ||
    kind === "submit" ||
    kind === "reset" ||
    kind === "log"
  ) {
    return kind;
  }
  return "text";
};

const fromPersistedItem = (
  value: unknown,
  options: {
    coordinateSpace?: string;
    canvasWidth: number;
    canvasHeight: number;
  }
): CanvasItem | null => {
  if (!isRecord(value)) return null;

  const isNormalized = options.coordinateSpace === NORMALIZED_COORDINATE_SPACE;
  const readNumber = (input: unknown): number | null =>
    typeof input === "number" && Number.isFinite(input) ? input : null;

  const xValue = readNumber(value.x);
  const yValue = readNumber(value.y);
  const widthValue = readNumber(value.width);
  const heightValue = readNumber(value.height);
  const startXValue = readNumber(value.startX);
  const startYValue = readNumber(value.startY);
  const endXValue = readNumber(value.endX);
  const endYValue = readNumber(value.endY);

  const resolvedWidth =
    widthValue === null
      ? BUTTON_SIZE.width
      : isNormalized
        ? denormalizeWidth(widthValue, options.canvasWidth)
        : widthValue;
  const resolvedHeight =
    heightValue === null
      ? BUTTON_SIZE.height
      : isNormalized
        ? denormalizeHeight(heightValue, options.canvasHeight)
        : heightValue;

  const centerX =
    xValue === null
      ? 0
      : isNormalized
        ? denormalizeX(xValue, options.canvasWidth)
        : xValue;
  const centerY =
    yValue === null
      ? 0
      : isNormalized
        ? denormalizeY(yValue, options.canvasHeight)
        : yValue;

  return {
    ...(value as Omit<CanvasItem, "kind">),
    kind: normalizeLoadedItemKind(value.kind),
    x: isNormalized ? centerX - resolvedWidth / 2 : centerX,
    y: isNormalized ? centerY - resolvedHeight / 2 : centerY,
    width: resolvedWidth,
    height: resolvedHeight,
    startX:
      startXValue === null
        ? undefined
        : isNormalized
          ? denormalizeX(startXValue, options.canvasWidth)
          : startXValue,
    startY:
      startYValue === null
        ? undefined
        : isNormalized
          ? denormalizeY(startYValue, options.canvasHeight)
          : startYValue,
    endX:
      endXValue === null
        ? undefined
        : isNormalized
          ? denormalizeX(endXValue, options.canvasWidth)
          : endXValue,
    endY:
      endYValue === null
        ? undefined
        : isNormalized
          ? denormalizeY(endYValue, options.canvasHeight)
          : endYValue,
  };
};

const parsePersistedEditorState = (
  payload: unknown,
  canvasWidth?: number,
  canvasHeight?: number
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
  const useCustomSideLayouts = Boolean(source.useCustomSideLayouts ?? false);
  const editorTeamSide: TeamSide =
    source.editorTeamSide === "blue" ? "blue" : "red";
  const previewTeamSide: TeamSide =
    source.previewTeamSide === "blue" ? "blue" : "red";
  const normalizedAspectWidth = Number(aspectWidth);
  const normalizedAspectHeight = Number(aspectHeight);
  const aspectRatio =
    Number.isFinite(normalizedAspectWidth) &&
    Number.isFinite(normalizedAspectHeight) &&
    normalizedAspectWidth > 0 &&
    normalizedAspectHeight > 0
      ? normalizedAspectWidth / normalizedAspectHeight
      : 16 / 9;
  const resolvedCanvasHeight =
    typeof canvasHeight === "number" && Number.isFinite(canvasHeight) && canvasHeight > 0
      ? canvasHeight
      : FIELD_HEIGHT;
  const resolvedCanvasWidth =
    typeof canvasWidth === "number" && Number.isFinite(canvasWidth) && canvasWidth > 0
      ? canvasWidth
      : resolvedCanvasHeight * aspectRatio;

  return {
    items: source.items
      .map((item) =>
        fromPersistedItem(item, {
          coordinateSpace:
            typeof source.coordinateSpace === "string"
              ? source.coordinateSpace
              : undefined,
          canvasWidth: resolvedCanvasWidth,
          canvasHeight: resolvedCanvasHeight,
        })
      )
      .filter((item): item is CanvasItem => Boolean(item)),
    aspectWidth,
    aspectHeight,
    backgroundImage,
    coordinateSpace:
      typeof source.coordinateSpace === "string" ? source.coordinateSpace : undefined,
    useCustomSideLayouts,
    editorTeamSide,
    previewTeamSide,
  };
};

const parseImportedEditorState = (
  payload: unknown,
  canvasWidth: number,
  canvasHeight: number
): PersistedEditorState => {
  const restored = parsePersistedEditorState(payload, canvasWidth, canvasHeight);
  if (restored) {
    return {
      ...restored,
      items: restored.items.map((item) => ({
        ...item,
        tag: typeof item.tag === "string" ? normalizeTag(item.tag) : item.tag,
        increment:
          item.kind === "text" || item.kind === "icon"
            ? typeof item.increment === "number" && Number.isFinite(item.increment)
              ? item.increment
              : 1
            : undefined,
        teamSide:
          item.teamSide === "red" || item.teamSide === "blue"
            ? item.teamSide
            : undefined,
      })),
    };
  }

  const source = isRecord(payload) ? payload : null;
  const rawPayload = Array.isArray(source?.payload)
    ? source.payload
    : Array.isArray(payload)
      ? payload
      : null;

  if (!rawPayload) {
    throw new Error("Uploaded JSON must include a payload array or editorState.");
  }

  const halfWidth = canvasWidth / 2;
  const halfHeight = canvasHeight / 2;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const readNumber = (value: unknown, fallback: number) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return fallback;
  };

  const scaleX = (value: unknown) =>
    centerX + (readNumber(value, 0) / 100) * halfWidth;
  const scaleY = (value: unknown) =>
    centerY - (readNumber(value, 0) / 100) * halfHeight;
  const scaleWidth = (value: unknown, fallback: number) => {
    const normalized = readNumber(value, (fallback / canvasWidth) * 100);
    if (Math.abs(normalized) > 100) {
      return Math.max(1, (normalized / 100) * halfWidth);
    }
    return Math.max(1, (normalized / 100) * canvasWidth);
  };
  const scaleHeight = (value: unknown, fallback: number) => {
    const normalized = readNumber(value, (fallback / canvasHeight) * 100);
    if (Math.abs(normalized) > 100) {
      return Math.max(1, (normalized / 100) * halfHeight);
    }
    return Math.max(1, (normalized / 100) * canvasHeight);
  };

  const tagToId = new Map<string, string>();
  const pendingStageLinks: Array<{ id: string; stageParentTag: string }> = [];

  const items: CanvasItem[] = rawPayload.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Payload entry ${index + 1} is not an object.`);
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `imported-${Date.now()}-${index}`;

    const toTeamSide = (value: unknown): TeamSide | undefined =>
      value === "red" || value === "blue" ? value : undefined;

    const readTag = (value: unknown) =>
      typeof value === "string" ? normalizeTag(value) : "";

    const readStageParentTag = (value: unknown) =>
      typeof value === "string" ? value.trim() : "";

    const registerStageLink = (tag: unknown, nextId: string) => {
      const stageParentTag = readStageParentTag(tag);
      if (stageParentTag) {
        pendingStageLinks.push({ id: nextId, stageParentTag });
      }
    };

    if (isRecord(entry.button)) {
      const data = entry.button;
      const width = scaleWidth(data.width, BUTTON_SIZE.width);
      const height = scaleHeight(data.height, BUTTON_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const actionKind: ActionButtonKind | null =
        data.action === "undo"
          ? "undo"
          : data.action === "redo"
            ? "redo"
            : data.action === "submit"
              ? "submit"
              : data.action === "reset"
                ? "reset"
                : null;
      const resolvedKind: AssetKind = actionKind ?? "text";
      const tag = readTag(data.tag);
      if (resolvedKind === "text" && tag) tagToId.set(tag, id);
      registerStageLink(data.stageParentTag, id);
      return {
        id,
        kind: resolvedKind,
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label:
          typeof data.text === "string"
            ? data.text
            : getDefaultLabelForKind(resolvedKind),
        increment:
          resolvedKind === "text" &&
          typeof data.increment === "number" &&
          Number.isFinite(data.increment)
            ? data.increment
            : resolvedKind === "text"
              ? 1
              : undefined,
        tag: resolvedKind === "text" ? tag : "",
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["icon-button"])) {
      const data = entry["icon-button"];
      const width = scaleWidth(data.width, ICON_BUTTON_SIZE.width);
      const height = scaleHeight(data.height, ICON_BUTTON_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const tag = readTag(data.tag);
      if (tag) tagToId.set(tag, id);
      registerStageLink(data.stageParentTag, id);
      return {
        id,
        kind: "icon",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: typeof data.icon === "string" ? data.icon : "Bot",
        iconName: typeof data.icon === "string" ? data.icon : "Bot",
        outlineColor:
          typeof data.outline === "string" ? data.outline : "#ffffff",
        fillColor: typeof data.fill === "string" ? data.fill : "transparent",
        increment:
          typeof data.increment === "number" && Number.isFinite(data.increment)
            ? data.increment
            : 1,
        tag,
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["text-input"])) {
      const data = entry["text-input"];
      const width = scaleWidth(data.width, INPUT_SIZE.width);
      const height = scaleHeight(data.height, INPUT_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const tag = readTag(data.tag);
      if (tag) tagToId.set(tag, id);
      registerStageLink(data.stageParentTag, id);
      return {
        id,
        kind: "input",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: typeof data.label === "string" ? data.label : "Input label",
        placeholder:
          typeof data.placeholder === "string" ? data.placeholder : "Enter text",
        tag,
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["toggle-switch"])) {
      const data = entry["toggle-switch"];
      const width = scaleWidth(data.width, TOGGLE_SIZE.width);
      const height = scaleHeight(data.height, TOGGLE_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const tag = readTag(data.tag);
      if (tag) tagToId.set(tag, id);
      registerStageLink(data.stageParentTag, id);
      const align =
        data.textAlign === "left" ||
        data.textAlign === "center" ||
        data.textAlign === "right"
          ? data.textAlign
          : "center";
      return {
        id,
        kind: "toggle",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: typeof data.label === "string" ? data.label : "Toggle",
        toggleOn: Boolean(data.value),
        toggleTextAlign: align,
        toggleTextSize: readNumber(data.textSize, 10),
        tag,
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["swap-sides"])) {
      const data = entry["swap-sides"];
      const width = scaleWidth(data.width, BUTTON_SIZE.width);
      const height = scaleHeight(data.height, BUTTON_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const redSide = data.redSide === "right" ? "right" : "left";
      const activeSide = data.activeSide === "right" ? "right" : "left";
      return {
        id,
        kind: "swap",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: "Swap sides",
        tag: "",
        teamSide: toTeamSide(data.teamSide),
        swapRedSide: redSide,
        swapActiveSide: activeSide,
      };
    }

    if (isRecord(entry.cover)) {
      const data = entry.cover;
      const x1 = scaleX(data.x1);
      const y1 = scaleY(data.y1);
      const x2 = scaleX(data.x2);
      const y2 = scaleY(data.y2);
      return {
        id,
        kind: "cover",
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.max(1, Math.abs(x2 - x1)),
        height: Math.max(1, Math.abs(y2 - y1)),
        label: "Cover",
        tag: "",
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["mirror-line"])) {
      const data = entry["mirror-line"];
      const startX = scaleX(data.x1);
      const startY = scaleY(data.y1);
      const endX = scaleX(data.x2);
      const endY = scaleY(data.y2);
      return {
        id,
        kind: "mirror",
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.max(1, Math.abs(endX - startX)),
        height: Math.max(1, Math.abs(endY - startY)),
        label: "Mirror line",
        tag: "",
        startX,
        startY,
        endX,
        endY,
      };
    }

    if (isRecord(entry["log-view"])) {
      const data = entry["log-view"];
      const width = scaleWidth(data.width, LOG_SIZE.width);
      const height = scaleHeight(data.height, LOG_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      return {
        id,
        kind: "log",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: typeof data.label === "string" ? data.label : "Log",
        tag: "",
        teamSide: toTeamSide(data.teamSide),
      };
    }

    throw new Error(`Payload entry ${index + 1} has an unsupported schema.`);
  });

  const itemsWithStages = items.map((item) => {
    const pending = pendingStageLinks.find((entry) => entry.id === item.id);
    if (!pending) return item;
    const stageParentId = tagToId.get(pending.stageParentTag);
    if (!stageParentId) {
      throw new Error(
        `Invalid stage relationship: parent tag \"${pending.stageParentTag}\" was not found.`
      );
    }
    return {
      ...item,
      stageParentId,
    };
  });

  const useCustomSideLayouts = Boolean(source?.useCustomSideLayouts);
  const editorTeamSide: TeamSide = source?.editorTeamSide === "blue" ? "blue" : "red";
  const previewTeamSide: TeamSide =
    source?.previewTeamSide === "blue" ? "blue" : "red";

  const fallbackImage =
    isRecord(source?.background) && typeof source.background.fallbackImage === "string"
      ? source.background.fallbackImage
      : null;

  return {
    items: itemsWithStages,
    aspectWidth: "16",
    aspectHeight: "9",
    backgroundImage: fallbackImage,
    useCustomSideLayouts,
    editorTeamSide,
    previewTeamSide,
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

function PaletteActionButton({
  kind,
  title,
  description,
  icon,
  onPalettePointerDown,
}: {
  kind: ActionButtonKind;
  title: string;
  description: string;
  icon: React.ReactNode;
} & PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${kind}-button`,
    data: { type: "palette", assetKind: kind } satisfies DragData,
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
      onPointerDownCapture={(event) => onPalettePointerDown(kind, event)}
      {...attributes}
      {...listeners}
      type="button"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-300">
        {icon}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-white/55">{description}</span>
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

function PaletteMirrorButton({
  onPalettePointerDown,
  disabled,
}: PaletteButtonProps & { disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-mirror-line",
    disabled: Boolean(disabled),
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
      title={
        disabled
          ? "You cannot use this element in custom sides mode"
          : undefined
      }
      className={`mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 bg-slate-900/70 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80 ${
        disabled ? "cursor-not-allowed opacity-45" : ""
      }`}
      onPointerDownCapture={(event) => onPalettePointerDown("mirror", event)}
      {...attributes}
      {...listeners}
      type="button"
      disabled={disabled}
      aria-label="Mirror line"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
        <span className="h-5 w-0.5 rounded-full bg-red-400" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Mirror Line</span>
        <span className="text-xs text-white/55">
          {disabled
            ? "Unavailable"
            : "Reference line for side swap"}
        </span>
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

function PaletteLogButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-log",
    data: { type: "palette", assetKind: "log" } satisfies DragData,
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
      onPointerDownCapture={(event) => onPalettePointerDown("log", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Log"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
        <FileText className="h-4 w-4" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Log</span>
        <span className="text-xs text-white/55">Shows submitted input text</span>
      </span>
    </Button>
  );
}

function CanvasButton({
  item,
  onResizeStart,
  onEditLabel,
  onSwapSides,
  onPreviewButtonAction,
  onSelect,
  onPreviewPressStart,
  onPreviewPressEnd,
  onPreviewStageToggle,
  onStageContextMenu,
  hasStages,
  isPreviewPressed,
  isCustomSideLayoutsEnabled,
  visibleTeamSide,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onEditLabel: (item: CanvasItem) => void;
  onSwapSides: () => void;
  onPreviewButtonAction: (item: CanvasItem) => void;
  onSelect: (itemId: string) => void;
  onPreviewPressStart: (itemId: string) => void;
  onPreviewPressEnd: (itemId: string) => void;
  onPreviewStageToggle: (itemId: string) => void;
  onStageContextMenu: (itemId: string) => void;
  hasStages: boolean;
  isPreviewPressed: boolean;
  isCustomSideLayoutsEnabled: boolean;
  visibleTeamSide: TeamSide;
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

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      size={item.kind === "icon" ? "icon" : "default"}
      className={`group absolute rounded-lg ${swapOutlineClass} !bg-slate-900 !text-white hover:!bg-slate-900 ${
        isPreviewMode ? "transition-all duration-150" : "!transition-none"
      } ${
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
        if (isActionButtonKind(item.kind)) {
          onPreviewButtonAction(item);
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
        if (isPreviewMode) return;
        if (item.kind === "swap") {
          event.preventDefault();
          onSwapSides();
          return;
        }
        if (!hasStages) return;
        event.preventDefault();
        onStageContextMenu(item.id);
      }}
      {...attributes}
      {...listeners}
      data-stage-root={hasStages ? "true" : undefined}
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
      ) : item.kind === "undo" ? (
        <span className="inline-flex items-center gap-2">
          <Undo2 className="h-4 w-4" />
          {item.label}
        </span>
      ) : item.kind === "redo" ? (
        <span className="inline-flex items-center gap-2">
          <Redo2 className="h-4 w-4" />
          {item.label}
        </span>
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
          ? "bg-slate-900 transition-all duration-150 ease-out"
          : "bg-white/5 !transition-none"
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
  onPreviewValueChange,
  onSelect,
  previewValue,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onEditInput: (item: CanvasItem) => void;
  onPreviewValueChange: (item: CanvasItem, value: string) => void;
  onSelect: (itemId: string) => void;
  previewValue: string;
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
      className={`group absolute flex flex-col gap-2 ${
        isPreviewMode ? "transition-all duration-150 ease-out" : "!transition-none"
      }`}
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
        value={isPreviewMode ? previewValue : ""}
        placeholder={item.placeholder ?? "Enter text"}
        className="h-full"
        readOnly={!isPreviewMode}
        onChange={(event) => {
          if (!isPreviewMode) return;
          onPreviewValueChange(item, event.target.value);
        }}
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

function CanvasLog({
  item,
  onResizeStart,
  onSelect,
  logText,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onSelect: (itemId: string) => void;
  logText: string;
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
      className={`group absolute rounded-md border border-white/15 bg-slate-900/90 p-2 ${
        isPreviewMode ? "transition-all duration-150 ease-out" : "!transition-none"
      }`}
      onPointerDown={() => {
        if (!isPreviewMode) onSelect(item.id);
      }}
      {...attributes}
      {...listeners}
    >
      <Label className="mb-1 block text-xs text-white/80">{item.label || "Log"}</Label>
      <div className="h-[calc(100%-18px)] overflow-auto rounded border border-white/10 bg-slate-950/90 p-2 text-[11px] leading-snug text-white/80">
        <pre className="whitespace-pre-wrap break-words font-sans">
          {logText || "Submit in preview to display input values."}
        </pre>
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
      className={`group absolute ${
        isPreviewMode ? "transition-all duration-150 ease-out" : "!transition-none"
      }`}
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

const areSnapOffsetsEqual = (
  prev: { x: number; y: number } | undefined,
  next: { x: number; y: number } | undefined
) => {
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  return prev.x === next.x && prev.y === next.y;
};

const MemoCanvasButton = React.memo(
  CanvasButton,
  (prev, next) =>
    prev.item === next.item &&
    prev.hasStages === next.hasStages &&
    prev.onStageContextMenu === next.onStageContextMenu &&
    prev.isPreviewPressed === next.isPreviewPressed &&
    prev.isCustomSideLayoutsEnabled === next.isCustomSideLayoutsEnabled &&
    prev.visibleTeamSide === next.visibleTeamSide &&
    prev.isPreviewMode === next.isPreviewMode &&
    areSnapOffsetsEqual(prev.snapOffset, next.snapOffset)
);
const MemoCanvasMirrorLine = React.memo(
  CanvasMirrorLine,
  (prev, next) =>
    prev.item === next.item &&
    prev.isPreviewMode === next.isPreviewMode &&
    areSnapOffsetsEqual(prev.snapOffset, next.snapOffset)
);
const MemoCanvasCover = React.memo(
  CanvasCover,
  (prev, next) =>
    prev.item === next.item &&
    prev.isPreviewMode === next.isPreviewMode &&
    areSnapOffsetsEqual(prev.snapOffset, next.snapOffset)
);
const MemoCanvasInput = React.memo(
  CanvasInput,
  (prev, next) =>
    prev.item === next.item &&
    prev.previewValue === next.previewValue &&
    prev.isPreviewMode === next.isPreviewMode &&
    areSnapOffsetsEqual(prev.snapOffset, next.snapOffset)
);
const MemoCanvasLog = React.memo(
  CanvasLog,
  (prev, next) =>
    prev.item === next.item &&
    prev.logText === next.logText &&
    prev.isPreviewMode === next.isPreviewMode &&
    areSnapOffsetsEqual(prev.snapOffset, next.snapOffset)
);
const MemoCanvasToggle = React.memo(
  CanvasToggle,
  (prev, next) =>
    prev.item === next.item &&
    prev.isPreviewMode === next.isPreviewMode &&
    areSnapOffsetsEqual(prev.snapOffset, next.snapOffset)
);

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUploadId = searchParams.get("uploadId")?.trim() ?? "";
  const shouldStartBlank = searchParams.get("new") === "1";
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
  const [isCustomSideLayoutsEnabled, setIsCustomSideLayoutsEnabled] =
    React.useState(false);
  const [editorTeamSide, setEditorTeamSide] = React.useState<TeamSide>("red");
  const [previewTeamSide, setPreviewTeamSide] = React.useState<TeamSide>("red");
  const [stagingParentId, setStagingParentId] = React.useState<string | null>(null);
  const [previewStageParentId, setPreviewStageParentId] = React.useState<string | null>(
    null
  );
  const [previewPressedItemId, setPreviewPressedItemId] = React.useState<string | null>(
    null
  );
  const [previewInputValues, setPreviewInputValues] = React.useState<
    Record<string, string>
  >({});
  const [previewLogText, setPreviewLogText] = React.useState("");
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = React.useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = React.useState(0);
  const [tutorialTargetRect, setTutorialTargetRect] = React.useState<DOMRect | null>(
    null
  );
  const [tutorialCardPosition, setTutorialCardPosition] = React.useState({
    left: 24,
    top: 24,
  });
  const navHeaderRef = React.useRef<HTMLDivElement | null>(null);
  const assetsPanelRef = React.useRef<HTMLDivElement | null>(null);
  const canvasPanelRef = React.useRef<HTMLDivElement | null>(null);
  const propertiesPanelRef = React.useRef<HTMLDivElement | null>(null);
  const previewButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const downloadButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const fieldSettingsButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const stagingButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const tagInputRef = React.useRef<HTMLInputElement | null>(null);
  const tutorialHelpButtonRef = React.useRef<HTMLButtonElement | null>(null);
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
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [isDisableCustomSideDialogOpen, setIsDisableCustomSideDialogOpen] =
    React.useState(false);
  const [customSideToKeep, setCustomSideToKeep] =
    React.useState<TeamSide>("red");
  const [uploadJson, setUploadJson] = React.useState("");
  const [uploadPayload, setUploadPayload] = React.useState<
    Array<Record<string, unknown>>
  >([]);
  const [importJsonDraft, setImportJsonDraft] = React.useState("");
  const importFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [autosaveState, setAutosaveState] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [autosaveUpdatedAt, setAutosaveUpdatedAt] = React.useState<string | null>(
    null
  );
  const [isAutosaveBadgeVisible, setIsAutosaveBadgeVisible] =
    React.useState(false);
  const autosaveBadgeTimeoutRef = React.useRef<number | null>(null);
  const [latestUploadId, setLatestUploadId] = React.useState<string | null>(null);
  const [projectMeta, setProjectMeta] = React.useState<{
    name: string;
    contentHash: string | null;
    isDraft: boolean | null;
  } | null>(null);
  const [isInteractingWithCanvas, setIsInteractingWithCanvas] =
    React.useState(false);
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
  const alignmentGuidesRef = React.useRef({
    vertical: [],
    horizontal: [],
  } as { vertical: number[]; horizontal: number[] });
  const snapLockRef = React.useRef<{
    itemId: string | null;
    type: DragType | null;
    x: number | null;
    y: number | null;
  }>({ itemId: null, type: null, x: null, y: null });
  const dragSnapOffsetRef = React.useRef<DragSnapOffset>({
    itemId: null,
    x: 0,
    y: 0,
  });
  const paletteSnapOffsetRef = React.useRef({ x: 0, y: 0 });
  const dragMoveSnapshotRef = React.useRef<DragMoveSnapshot | null>(null);
  const dragMoveRafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    alignmentGuidesRef.current = alignmentGuides;
  }, [alignmentGuides]);

  React.useEffect(() => {
    dragSnapOffsetRef.current = dragSnapOffset;
  }, [dragSnapOffset]);

  React.useEffect(() => {
    paletteSnapOffsetRef.current = paletteSnapOffset;
  }, [paletteSnapOffset]);
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
  const resizeMoveSnapshotRef = React.useRef<{ x: number; y: number } | null>(
    null
  );
  const resizeMoveRafRef = React.useRef<number | null>(null);
  const resizeSnapLockRef = React.useRef<{
    id: string | null;
    mode: "resize" | null;
    x: number | null;
    y: number | null;
  }>({ id: null, mode: null, x: null, y: null });
  const interactionCanvasSizeRef = React.useRef<{
    width: number;
    height: number;
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

  const isProjectCompleted = Boolean(requestedUploadId) && projectMeta?.isDraft === false;
  const isEditorReadOnly = isPreviewMode || isProjectCompleted;

  const currentVisibleTeamSide = isPreviewMode ? previewTeamSide : editorTeamSide;

  const sideScopedItems = React.useMemo(() => {
    if (!isCustomSideLayoutsEnabled) return items;
    return items.filter((item) => {
      if (item.kind === "mirror") return true;
      return item.teamSide === currentVisibleTeamSide;
    });
  }, [currentVisibleTeamSide, isCustomSideLayoutsEnabled, items]);

  const visibleItems = React.useMemo(() => {
    if (stagingParentId) {
      return sideScopedItems.filter(
        (item) => item.id === stagingParentId || item.stageParentId === stagingParentId
      );
    }

    if (isPreviewMode && previewStageParentId) {
      return sideScopedItems.filter(
        (item) =>
          item.id === previewStageParentId || item.stageParentId === previewStageParentId
      );
    }

    return sideScopedItems.filter((item) => !item.stageParentId);
  }, [isPreviewMode, previewStageParentId, sideScopedItems, stagingParentId]);

  const layeredVisibleItems = React.useMemo(() => {
    const bottomItems = visibleItems.filter(
      (item) => item.kind === "cover" || item.kind === "mirror"
    );
    const topItems = visibleItems.filter(
      (item) => item.kind !== "cover" && item.kind !== "mirror"
    );
    return [...bottomItems, ...topItems];
  }, [visibleItems]);

  const visibleItemsRef = React.useRef<CanvasItem[]>(visibleItems);
  const isAlignmentAssistEnabledRef = React.useRef(isAlignmentAssistEnabled);

  React.useEffect(() => {
    visibleItemsRef.current = visibleItems;
  }, [visibleItems]);

  React.useEffect(() => {
    isAlignmentAssistEnabledRef.current = isAlignmentAssistEnabled;
  }, [isAlignmentAssistEnabled]);

  const flushDragUpdates = React.useCallback(
    (
      nextGuides: { vertical: number[]; horizontal: number[] },
      nextDragSnap: DragSnapOffset,
      nextPaletteSnap: { x: number; y: number }
    ) => {
      if (
        !areNumberArraysEqual(nextGuides.vertical, alignmentGuidesRef.current.vertical) ||
        !areNumberArraysEqual(nextGuides.horizontal, alignmentGuidesRef.current.horizontal)
      ) {
        alignmentGuidesRef.current = nextGuides;
        setAlignmentGuides(nextGuides);
      }

      if (
        nextDragSnap.itemId !== dragSnapOffsetRef.current.itemId ||
        nextDragSnap.x !== dragSnapOffsetRef.current.x ||
        nextDragSnap.y !== dragSnapOffsetRef.current.y
      ) {
        dragSnapOffsetRef.current = nextDragSnap;
        setDragSnapOffset(nextDragSnap);
      }

      if (
        nextPaletteSnap.x !== paletteSnapOffsetRef.current.x ||
        nextPaletteSnap.y !== paletteSnapOffsetRef.current.y
      ) {
        paletteSnapOffsetRef.current = nextPaletteSnap;
        setPaletteSnapOffset(nextPaletteSnap);
      }
    },
    []
  );

  const processDragMove = React.useCallback(
    (snapshot: DragMoveSnapshot) => {
      const resolveSnapLock = (
        rawValue: number,
        candidateValue: number,
        candidateDiff: number,
        lockedValue: number | null
      ) => {
        if (lockedValue !== null) {
          if (Math.abs(rawValue - lockedValue) <= SNAP_RELEASE_PX) {
            return { value: lockedValue, lock: lockedValue };
          }
        }

        if (candidateDiff <= GUIDE_SNAP_PX) {
          return { value: candidateValue, lock: candidateValue };
        }

        return { value: rawValue, lock: null };
      };

      if (isPreviewMode || !isAlignmentAssistEnabled) {
        flushDragUpdates(
          { vertical: [], horizontal: [] },
          { itemId: null, x: 0, y: 0 },
          { x: 0, y: 0 }
        );
        snapLockRef.current = { itemId: null, type: null, x: null, y: null };
        return;
      }

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const data = snapshot.activeData;
      const initialRect = snapshot.initialRect;
      const translatedRect = snapshot.translatedRect;

      if (!initialRect) return;

      const finalLeft = translatedRect?.left ?? initialRect.left + snapshot.deltaX;
      const finalTop = translatedRect?.top ?? initialRect.top + snapshot.deltaY;
      const adjustedFinalLeft =
        data?.type === "palette" ? finalLeft + palettePointerOffset.x : finalLeft;
      const adjustedFinalTop =
        data?.type === "palette" ? finalTop + palettePointerOffset.y : finalTop;

      const activeItem =
        data?.type === "canvas" && data.itemId
          ? items.find((item) => item.id === data.itemId)
          : null;
      const paletteKind = data?.type === "palette" ? data.assetKind : undefined;
      const paletteSize = getAssetSize(paletteKind ?? "text");
      const activeWidth = activeItem?.width ?? paletteSize.width;
      const activeHeight = activeItem?.height ?? paletteSize.height;

      const isInsideCanvas =
        adjustedFinalLeft + activeWidth > canvasRect.left &&
        adjustedFinalLeft < canvasRect.right &&
        adjustedFinalTop + activeHeight > canvasRect.top &&
        adjustedFinalTop < canvasRect.bottom;

      if (!isInsideCanvas) {
        flushDragUpdates(
          { vertical: [], horizontal: [] },
          { itemId: null, x: 0, y: 0 },
          { x: 0, y: 0 }
        );
        snapLockRef.current = { itemId: null, type: null, x: null, y: null };
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

      const nextGuides = {
        vertical: Array.from(vertical),
        horizontal: Array.from(horizontal),
      };

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

        const existingLock = snapLockRef.current;
        const lockedX =
          existingLock.type === "canvas" && existingLock.itemId === data.itemId
            ? existingLock.x
            : null;
        const lockedY =
          existingLock.type === "canvas" && existingLock.itemId === data.itemId
            ? existingLock.y
            : null;

        const resolvedX = resolveSnapLock(x, snappedX, bestXDiff, lockedX);
        const resolvedY = resolveSnapLock(y, snappedY, bestYDiff, lockedY);
        snapLockRef.current = {
          itemId: data.itemId,
          type: "canvas",
          x: resolvedX.lock,
          y: resolvedY.lock,
        };

        flushDragUpdates(
          nextGuides,
          { itemId: data.itemId, x: resolvedX.value - x, y: resolvedY.value - y },
          { x: 0, y: 0 }
        );
      } else if (data?.type === "palette") {
        if (paletteKind === "icon" || paletteKind === "toggle") {
          flushDragUpdates(
            { vertical: [], horizontal: [] },
            { itemId: null, x: 0, y: 0 },
            { x: 0, y: 0 }
          );
          snapLockRef.current = { itemId: null, type: "palette", x: null, y: null };
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

        const existingLock = snapLockRef.current;
        const lockedX = existingLock.type === "palette" ? existingLock.x : null;
        const lockedY = existingLock.type === "palette" ? existingLock.y : null;
        const resolvedX = resolveSnapLock(x, snappedX, bestXDiff, lockedX);
        const resolvedY = resolveSnapLock(y, snappedY, bestYDiff, lockedY);
        snapLockRef.current = {
          itemId: null,
          type: "palette",
          x: resolvedX.lock,
          y: resolvedY.lock,
        };

        flushDragUpdates(
          nextGuides,
          { itemId: null, x: 0, y: 0 },
          { x: resolvedX.value - x, y: resolvedY.value - y }
        );
      } else {
        flushDragUpdates(
          nextGuides,
          { itemId: null, x: 0, y: 0 },
          { x: 0, y: 0 }
        );
        snapLockRef.current = { itemId: null, type: null, x: null, y: null };
      }
    },
    [
      flushDragUpdates,
      isAlignmentAssistEnabled,
      isPreviewMode,
      items,
      palettePointerOffset.x,
      palettePointerOffset.y,
      visibleItems,
    ]
  );

  const scheduleDragMove = React.useCallback(
    (snapshot: DragMoveSnapshot) => {
      dragMoveSnapshotRef.current = snapshot;
      if (dragMoveRafRef.current !== null) return;

      dragMoveRafRef.current = window.requestAnimationFrame(() => {
        dragMoveRafRef.current = null;
        const pending = dragMoveSnapshotRef.current;
        if (!pending) return;
        dragMoveSnapshotRef.current = null;
        processDragMove(pending);
      });
    },
    [processDragMove]
  );

  React.useEffect(() => {
    return () => {
      if (dragMoveRafRef.current !== null) {
        window.cancelAnimationFrame(dragMoveRafRef.current);
        dragMoveRafRef.current = null;
      }
    };
  }, []);

  const buildEditorSnapshot = React.useCallback((): EditorSnapshot => {
    return {
      items,
      aspectWidth,
      aspectHeight,
      backgroundImage,
      useCustomSideLayouts: isCustomSideLayoutsEnabled,
      editorTeamSide,
      previewTeamSide,
    };
  }, [
    aspectHeight,
    aspectWidth,
    backgroundImage,
    editorTeamSide,
    isCustomSideLayoutsEnabled,
    items,
    previewTeamSide,
  ]);

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

  const hasRedCustomLayoutItems = React.useMemo(
    () =>
      items.some((item) => item.kind !== "mirror" && item.teamSide === "red"),
    [items]
  );

  const hasBlueCustomLayoutItems = React.useMemo(
    () =>
      items.some((item) => item.kind !== "mirror" && item.teamSide === "blue"),
    [items]
  );

  const isStageBlurActive =
    Boolean(stagingParentId) || (isPreviewMode && Boolean(previewStageParentId));

  const selectedIsStageableRoot =
    Boolean(selectedItem) &&
    (selectedItem?.kind === "text" || selectedItem?.kind === "icon");

  const selectedHasStagedChildren = Boolean(selectedItem?.id) &&
    items.some((item) => item.stageParentId === selectedItem?.id);

  const selectedIsStagingRoot =
    Boolean(selectedItem?.id) && stagingParentId === selectedItem?.id;

  const tutorialSteps = React.useMemo<TutorialStep[]>(
    () => [
      {
        key: "navbar",
        title: "Welcome to GoonScout",
        body: "This tour walks through building interactive scouting layouts with staging, preview testing, and export-ready config output.",
        placement: "bottom",
      },
      {
        key: "assets",
        title: "Assets Panel",
        body: "Drag elements from here onto the field: buttons, icon buttons, mirror lines, text inputs, toggles, covers, and swap controls.",
        placement: "right",
      },
      {
        key: "canvas",
        title: "Field Canvas",
        body: "This is your live placement area. Coordinates here drive runtime element positions, spacing, and stage interactions.",
        placement: "top",
      },
      {
        key: "field-settings",
        title: "Field Settings",
        body: "Set field aspect ratio, upload/remove a background image, and toggle alignment assist snapping from this panel.",
        placement: "top",
      },
      {
        key: "properties",
        title: "Properties Panel",
        body: "Select an element and configure its behavior here: labels, tags, colors, toggle options, and staging actions.",
        placement: "left",
      },
      {
        key: "tags",
        title: "Tags Power Data Binding",
        body: "Tags are runtime identifiers used by your scouting app. Keep them unique so export/import mapping stays stable.",
        placement: "left",
      },
      {
        key: "staging",
        title: "Staging Controls",
        body: "Use Add Stage on button/icon elements to build child interaction layers. End staging moves back up one stage level.",
        placement: "left",
      },
      {
        key: "stage-indicator",
        title: "Stage Indicators",
        body: "Elements with the down-arrow have staged children. Right-click them in editor to open stage view quickly.",
        placement: "top",
      },
      {
        key: "preview",
        title: "Preview Mode",
        body: "Preview runs click flow like runtime: staged roots open focused views, and leaf stage clicks return to main.",
        placement: "bottom",
      },
      {
        key: "export",
        title: "Download Export",
        body: "Download JSON includes element schema, stage relationships, and backend image pointers when an upload ID exists.",
        placement: "bottom",
      },
    ],
    []
  );

  const currentTutorialStep = tutorialSteps[tutorialStepIndex] ?? tutorialSteps[0];
  const isTutorialFirstStep = tutorialStepIndex === 0;
  const isTutorialLastStep = tutorialStepIndex === tutorialSteps.length - 1;

  const tutorialArrowClass =
    currentTutorialStep?.placement === "right"
      ? "-left-2 top-1/2 -translate-y-1/2"
      : currentTutorialStep?.placement === "left"
        ? "-right-2 top-1/2 -translate-y-1/2"
        : currentTutorialStep?.placement === "top"
          ? "bottom-[-6px] left-1/2 -translate-x-1/2"
          : "-top-2 left-1/2 -translate-x-1/2";

  const getTutorialTargetElement = React.useCallback(
    (step: TutorialStep | undefined): HTMLElement | null => {
      if (!step) return tutorialHelpButtonRef.current;

      switch (step.key) {
        case "navbar":
          return navHeaderRef.current;
        case "assets":
          return assetsPanelRef.current;
        case "canvas":
          return canvasPanelRef.current;
        case "field-settings":
          return fieldSettingsButtonRef.current ?? propertiesPanelRef.current;
        case "properties":
          return propertiesPanelRef.current;
        case "tags":
          return tagInputRef.current ?? propertiesPanelRef.current;
        case "staging":
          return stagingButtonRef.current ?? propertiesPanelRef.current;
        case "stage-indicator": {
          const stageIndicatorHost = document.querySelector(
            '[data-stage-root="true"]'
          ) as HTMLElement | null;
          return stageIndicatorHost ?? canvasPanelRef.current;
        }
        case "preview":
          return previewButtonRef.current;
        case "export":
          return downloadButtonRef.current;
        default:
          return tutorialHelpButtonRef.current;
      }
    },
    []
  );

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
      const normalizedTag = normalizeTag(value);
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId
            ? {
                ...item,
                tag: normalizedTag,
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

  const handleSelectedIncrementChange = React.useCallback(
    (value: number) => {
      if (!selectedItemId) return;
      if (!Number.isFinite(value)) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && (item.kind === "text" || item.kind === "icon")
            ? {
                ...item,
                increment: value,
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

  const handleSelectedSwapRedSideChange = React.useCallback(
    (value: "left" | "right") => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "swap"
            ? {
                ...item,
                swapRedSide: value,
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

  const enterStagingForItemId = React.useCallback((itemId: string) => {
    setStagingParentId(itemId);
    setPreviewStageParentId(null);
    setIsPreviewMode(false);
    setSelectedItemId(itemId);
  }, []);

  const stepOutOfStaging = React.useCallback(() => {
    setStagingParentId((current) => {
      if (!current) return null;
      const active = items.find((item) => item.id === current);
      return active?.stageParentId ?? null;
    });
  }, [items]);

  const handleStartStaging = React.useCallback(() => {
    if (!selectedItem) return;
    if (selectedItem.kind !== "text" && selectedItem.kind !== "icon") return;
    enterStagingForItemId(selectedItem.id);
  }, [enterStagingForItemId, selectedItem]);

  const handleEndStaging = React.useCallback(() => {
    stepOutOfStaging();
  }, [stepOutOfStaging]);

  const handleStageContextMenu = React.useCallback(
    (itemId: string) => {
      const target = items.find((item) => item.id === itemId);
      if (!target) return;
      if (target.kind !== "text" && target.kind !== "icon") return;
      if (!items.some((item) => item.stageParentId === itemId)) return;
      if (stagingParentId === itemId) {
        stepOutOfStaging();
        return;
      }
      enterStagingForItemId(itemId);
    },
    [enterStagingForItemId, items, stagingParentId, stepOutOfStaging]
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

  const handlePreviewInputChange = React.useCallback(
    (item: CanvasItem, value: string) => {
      const key = normalizeTag(item.tag ?? "") || item.id;
      setPreviewInputValues((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const applyEditorSnapshot = React.useCallback(
    (snapshot: EditorSnapshot) => {
      isApplyingHistoryRef.current = true;
      setItems(snapshot.items);
      setAspectWidth(snapshot.aspectWidth);
      setAspectHeight(snapshot.aspectHeight);
      setBackgroundImage(snapshot.backgroundImage);
      setIsCustomSideLayoutsEnabled(snapshot.useCustomSideLayouts);
      setEditorTeamSide(snapshot.editorTeamSide);
      setPreviewTeamSide(snapshot.previewTeamSide);
      lastSnapshotKeyRef.current = JSON.stringify(snapshot);
      window.setTimeout(() => {
        isApplyingHistoryRef.current = false;
      }, 0);
    },
    []
  );

  const handleUndo = React.useCallback(() => {
    if (isProjectCompleted) return;
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    applyEditorSnapshot(snapshot);
    updateHistoryAvailability();
  }, [applyEditorSnapshot, isProjectCompleted, updateHistoryAvailability]);

  const handleRedo = React.useCallback(() => {
    if (isProjectCompleted) return;
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;
    applyEditorSnapshot(snapshot);
    updateHistoryAvailability();
  }, [applyEditorSnapshot, isProjectCompleted, updateHistoryAvailability]);

  const handlePreviewButtonAction = React.useCallback(
    (item: CanvasItem) => {
      if (item.kind === "undo") {
        handleUndo();
        return;
      }

      if (item.kind === "redo") {
        handleRedo();
        return;
      }

      if (item.kind === "reset") {
        setPreviewInputValues({});
        setPreviewLogText("");
        return;
      }

      if (item.kind === "submit") {
        const submitted = items
          .filter((entry) => entry.kind === "input")
          .reduce<Record<string, string>>((accumulator, entry) => {
            const inputKey = normalizeTag(entry.tag ?? "") || entry.id;
            const outputKey = normalizeTag(entry.tag ?? "") || entry.label || entry.id;
            accumulator[outputKey] = previewInputValues[inputKey] ?? "";
            return accumulator;
          }, {});

        setPreviewLogText(JSON.stringify(submitted, null, 2));
      }
    },
    [handleRedo, handleUndo, items, previewInputValues]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } })
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

      const targetSize = getAssetSize(assetKind);

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
      setIsInteractingWithCanvas(true);
      dragStartPointerRef.current = getClientPointFromEvent(event.activatorEvent);
      const data = event.active.data.current as DragData | undefined;
      snapLockRef.current = {
        itemId: data?.itemId ?? null,
        type: data?.type ?? null,
        x: null,
        y: null,
      };
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
        const targetSize = getAssetSize(nextKind);
        setActiveKind(nextKind);
        setActiveSize(targetSize);
        setActiveLabel(getDefaultLabelForKind(nextKind));
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
      if (isPreviewMode || !isAlignmentAssistEnabled) {
        const hasDragArtifacts =
          alignmentGuidesRef.current.vertical.length > 0 ||
          alignmentGuidesRef.current.horizontal.length > 0 ||
          dragSnapOffsetRef.current.itemId !== null ||
          dragSnapOffsetRef.current.x !== 0 ||
          dragSnapOffsetRef.current.y !== 0 ||
          paletteSnapOffsetRef.current.x !== 0 ||
          paletteSnapOffsetRef.current.y !== 0;

        if (hasDragArtifacts) {
          flushDragUpdates(
            { vertical: [], horizontal: [] },
            { itemId: null, x: 0, y: 0 },
            { x: 0, y: 0 }
          );
        }
        return;
      }

      const initialRect = event.active.rect.current.initial;
      const translatedRect = event.active.rect.current.translated;

      scheduleDragMove({
        deltaX: event.delta.x,
        deltaY: event.delta.y,
        activeData: event.active.data.current as DragData | undefined,
        initialRect: initialRect
          ? {
              left: initialRect.left,
              top: initialRect.top,
              width: initialRect.width,
              height: initialRect.height,
            }
          : null,
        translatedRect: translatedRect
          ? { left: translatedRect.left, top: translatedRect.top }
          : null,
      });
    },
    [flushDragUpdates, isAlignmentAssistEnabled, isPreviewMode, scheduleDragMove]
  );

  const handleResizeStart = React.useCallback(
    (event: React.PointerEvent, item: CanvasItem) => {
      event.stopPropagation();
      event.preventDefault();
      setIsInteractingWithCanvas(true);
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      interactionCanvasSizeRef.current = canvasRect
        ? { width: canvasRect.width, height: canvasRect.height }
        : null;
      resizeSnapLockRef.current = {
        id: item.id,
        mode: "resize",
        x: null,
        y: null,
      };
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
      setIsInteractingWithCanvas(true);
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      interactionCanvasSizeRef.current = canvasRect
        ? { width: canvasRect.width, height: canvasRect.height }
        : null;
      resizeSnapLockRef.current = { id: null, mode: null, x: null, y: null };
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
    if (isCustomSideLayoutsEnabled) {
      const currentSide = isPreviewMode ? previewTeamSide : editorTeamSide;
      const nextSide: TeamSide = currentSide === "red" ? "blue" : "red";

      if (isPreviewMode) {
        setPreviewTeamSide(nextSide);
      } else {
        setEditorTeamSide(nextSide);
      }

      setItems((prev) =>
        prev.map((item) =>
          item.kind === "swap"
            ? {
                ...item,
                swapActiveSide:
                  nextSide === "red"
                    ? item.swapRedSide ?? "left"
                    : (item.swapRedSide ?? "left") === "left"
                      ? "right"
                      : "left",
              }
            : item
        )
      );
      return;
    }

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
        return {
          ...item,
          x: nextX,
          y: nextY,
          swapActiveSide:
            item.kind === "swap"
              ? (item.swapActiveSide ?? "left") === "left"
                ? "right"
                : "left"
              : item.swapActiveSide,
        };
      })
    );
  }, [editorTeamSide, isCustomSideLayoutsEnabled, isPreviewMode, items, previewTeamSide]);

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
    const tag = normalizeTag(tagDraft);
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
    const tag = normalizeTag(inputTagDraft);
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
      items.map((item) => [item.id, normalizeTag(item.tag ?? "")] as const)
    );
    const stagedParentIds = new Set(
      items
        .map((item) => item.stageParentId)
        .filter((value): value is string => Boolean(value))
    );

    const taggedItems = items.filter((item) =>
      ["text", "icon", "input", "toggle"].includes(item.kind)
    );
    const tags = taggedItems.map((item) => normalizeTag(item.tag ?? ""));

    if (tags.some((tag) => tag.length === 0)) {
      toast.error("Make sure to set all tags!");
      return null;
    }

    if (tags.some((tag) => /\s/.test(tag))) {
      toast.error("Tags cannot contain spaces.");
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
    const clampToRange = (value: number) => Math.max(-100, Math.min(100, value));
    const scaleX = (value: number) =>
      normalize(clampToRange(((value - centerX) / halfWidth) * 100));
    const scaleY = (value: number) =>
      normalize(clampToRange(((centerY - value) / halfHeight) * 100));
    const scaleWidth = (value: number) =>
      normalize(clampToRange((value / canvasRect.width) * 100));
    const scaleHeight = (value: number) =>
      normalize(clampToRange((value / canvasRect.height) * 100));

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
              teamSide: item.teamSide,
              increment: item.increment ?? 1,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              text: item.label,
              stageParentTag,
              hasStageChildren,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          };
        case "undo":
        case "redo":
        case "submit":
        case "reset":
          return {
            button: {
              teamSide: item.teamSide,
              action: item.kind,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              text: item.label,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          };
        case "icon":
          return {
            "icon-button": {
              tag: item.tag ?? "",
              teamSide: item.teamSide,
              increment: item.increment ?? 1,
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
              teamSide: item.teamSide,
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
              teamSide: item.teamSide,
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
              teamSide: item.teamSide,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              redSide: item.swapRedSide ?? "left",
              blueSide: (item.swapRedSide ?? "left") === "left" ? "right" : "left",
              activeSide: item.swapActiveSide ?? "left",
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
              teamSide: item.teamSide,
              x1: scaleX(x1),
              y1: scaleY(y1),
              x2: scaleX(x2),
              y2: scaleY(y2),
            },
          };
        }
        case "log":
          return {
            "log-view": {
              teamSide: item.teamSide,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              label: item.label || "Log",
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          };
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
      useCustomSideLayouts: isCustomSideLayoutsEnabled,
      editorTeamSide,
      previewTeamSide,
      editorState: {
        items: items.map((item) =>
          serializeCanvasItem(item, canvasRect.width, canvasRect.height)
        ),
        aspectWidth,
        aspectHeight,
        backgroundImage,
        coordinateSpace: NORMALIZED_COORDINATE_SPACE,
        useCustomSideLayouts: isCustomSideLayoutsEnabled,
        editorTeamSide,
        previewTeamSide,
      },
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
  }, [
    backgroundImage,
    aspectHeight,
    aspectWidth,
    editorTeamSide,
    isCustomSideLayoutsEnabled,
    items,
    latestUploadId,
    previewTeamSide,
  ]);

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
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const numericAspectWidth = Number(aspectWidth);
      const numericAspectHeight = Number(aspectHeight);
      const aspectRatio =
        Number.isFinite(numericAspectWidth) &&
        Number.isFinite(numericAspectHeight) &&
        numericAspectWidth > 0 &&
        numericAspectHeight > 0
          ? numericAspectWidth / numericAspectHeight
          : 16 / 9;
      const canvasWidth =
        canvasRect && canvasRect.width > 0 ? canvasRect.width : FIELD_HEIGHT * aspectRatio;
      const canvasHeight =
        canvasRect && canvasRect.height > 0 ? canvasRect.height : FIELD_HEIGHT;

      const editorState: SerializedEditorState = {
        items: items.map((item) =>
          serializeCanvasItem(item, canvasWidth, canvasHeight)
        ),
        aspectWidth,
        aspectHeight,
        backgroundImage,
        coordinateSpace: NORMALIZED_COORDINATE_SPACE,
        useCustomSideLayouts: isCustomSideLayoutsEnabled,
        editorTeamSide,
        previewTeamSide,
      };
      const response = await fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: uploadPayload,
          editorState,
          backgroundImage,
          uploadId: latestUploadId,
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
  }, [
    aspectHeight,
    aspectWidth,
    backgroundImage,
    editorTeamSide,
    isCustomSideLayoutsEnabled,
    items,
    latestUploadId,
    previewTeamSide,
    uploadPayload,
  ]);

  const applyImportedEditorState = React.useCallback(
    (nextState: PersistedEditorState) => {
      setItems(nextState.items);
      setAspectWidth(nextState.aspectWidth || "16");
      setAspectHeight(nextState.aspectHeight || "9");
      setAspectWidthDraft(nextState.aspectWidth || "16");
      setAspectHeightDraft(nextState.aspectHeight || "9");
      setBackgroundImage(nextState.backgroundImage ?? null);
      setIsCustomSideLayoutsEnabled(Boolean(nextState.useCustomSideLayouts));
      setEditorTeamSide(nextState.editorTeamSide ?? "red");
      setPreviewTeamSide(nextState.previewTeamSide ?? "red");
      setSelectedItemId(null);
      setStagingParentId(null);
      setPreviewStageParentId(null);
      setIsPreviewMode(false);
      setLatestUploadId(null);
    },
    []
  );

  const handleBuildFromUploadedJson = React.useCallback(() => {
    const rawText = importJsonDraft.trim();
    if (!rawText) {
      toast.error("Paste a JSON layout or upload a .json file first.");
      return;
    }

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect || canvasRect.width <= 0 || canvasRect.height <= 0) {
      toast.error("Canvas is not ready yet. Please try again.");
      return;
    }

    try {
      const parsed = JSON.parse(rawText) as unknown;
      const nextState = parseImportedEditorState(
        parsed,
        canvasRect.width,
        canvasRect.height
      );
      applyImportedEditorState(nextState);
      setIsImportDialogOpen(false);
      toast.success("Layout uploaded and applied.");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Invalid JSON upload.";
      toast.error(`Upload failed: ${message}`);
    }
  }, [applyImportedEditorState, importJsonDraft]);

  const handleImportFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          toast.error("Unable to read the selected file.");
          return;
        }
        setImportJsonDraft(reader.result);
      };
      reader.onerror = () => {
        toast.error("Unable to read the selected file.");
      };
      reader.readAsText(file);

      event.target.value = "";
    },
    []
  );

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
  const stageSizeRef = React.useRef({
    width: fieldWidth,
    height: FIELD_HEIGHT,
  });
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
      const nextSize = { width: fitWidth, height: fitHeight };
      stageSizeRef.current = nextSize;
      setStageSize(nextSize);
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

  const disableCustomSideLayoutsKeeping = React.useCallback(
    (sideToKeep: TeamSide) => {
      const nextItems = items
        .filter((item) => {
          if (item.kind === "mirror") return true;
          if (!item.teamSide) return true;
          return item.teamSide === sideToKeep;
        })
        .map((item) =>
          item.kind === "mirror"
            ? item
            : {
                ...item,
                teamSide: undefined,
              }
        );

      const remainingIds = new Set(nextItems.map((item) => item.id));

      setItems(nextItems);
      if (selectedItemId && !remainingIds.has(selectedItemId)) {
        setSelectedItemId(null);
      }
      if (stagingParentId && !remainingIds.has(stagingParentId)) {
        setStagingParentId(null);
      }
      if (previewStageParentId && !remainingIds.has(previewStageParentId)) {
        setPreviewStageParentId(null);
      }
      setEditorTeamSide(sideToKeep);
      setPreviewTeamSide(sideToKeep);
      setIsCustomSideLayoutsEnabled(false);
    },
    [items, previewStageParentId, selectedItemId, stagingParentId]
  );

  const handleCustomSideLayoutsToggle = React.useCallback(() => {
    if (isCustomSideLayoutsEnabled) {
      if (hasRedCustomLayoutItems && hasBlueCustomLayoutItems) {
        setCustomSideToKeep(editorTeamSide);
        setIsDisableCustomSideDialogOpen(true);
        return;
      }

      const sideToKeep: TeamSide = hasRedCustomLayoutItems
        ? "red"
        : hasBlueCustomLayoutItems
          ? "blue"
          : editorTeamSide;
      disableCustomSideLayoutsKeeping(sideToKeep);
      return;
    }

    setItems((prev) =>
      prev
        .map((item) =>
          item.kind === "mirror" || item.teamSide
            ? item
            : {
                ...item,
                teamSide: editorTeamSide,
              }
        )
        .filter((item) => item.kind !== "mirror")
    );
    setPreviewTeamSide(editorTeamSide);
    setIsCustomSideLayoutsEnabled(true);
  }, [
    disableCustomSideLayoutsKeeping,
    editorTeamSide,
    hasBlueCustomLayoutItems,
    hasRedCustomLayoutItems,
    isCustomSideLayoutsEnabled,
  ]);

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

  const buildEditorState = React.useCallback((): SerializedEditorState => {
    return {
      items: items.map((item) =>
        serializeCanvasItem(item, stageSize.width, stageSize.height)
      ),
      aspectWidth,
      aspectHeight,
      backgroundImage,
      coordinateSpace: NORMALIZED_COORDINATE_SPACE,
      useCustomSideLayouts: isCustomSideLayoutsEnabled,
      editorTeamSide,
      previewTeamSide,
    };
  }, [
    aspectHeight,
    aspectWidth,
    backgroundImage,
    editorTeamSide,
    isCustomSideLayoutsEnabled,
    items,
    previewTeamSide,
    stageSize.height,
    stageSize.width,
  ]);

  const buildDraftPayload = React.useCallback(() => {
    const editorState = buildEditorState();
    return {
      editorState,
    };
  }, [buildEditorState]);

  const buildProjectPayload = React.useCallback(() => {
    const editorState = buildEditorState();
    return {
      editorState,
    };
  }, [buildEditorState]);

  const handleCompleteProject = React.useCallback(async () => {
    const uploadId = requestedUploadId || latestUploadId || "";
    if (!uploadId) {
      toast.error("Open a project from Project Manager before marking complete.");
      return;
    }

    const nextIsDraft = isProjectCompleted;
    const payload = buildProjectPayload();

    try {
      const response = await fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          editorState: payload.editorState,
          backgroundImage,
          uploadId,
          isDraft: nextIsDraft,
        }),
      });

      if (!response.ok) {
        toast.error("Failed to update project status.");
        return;
      }

      const result = (await response.json()) as {
        uploadId?: string;
        updatedAt?: string;
      };

      setLatestUploadId(result.uploadId ?? uploadId);
      setAutosaveUpdatedAt(result.updatedAt ?? new Date().toISOString());
      setAutosaveState("saved");
      setProjectMeta((prev) =>
        prev
          ? {
              ...prev,
              isDraft: nextIsDraft,
            }
          : prev
      );
      toast.success(nextIsDraft ? "Project moved back to draft." : "Project marked complete.");
    } catch {
      toast.error("Failed to update project status.");
    }
  }, [
    backgroundImage,
    buildProjectPayload,
    isProjectCompleted,
    latestUploadId,
    requestedUploadId,
  ]);

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

  const persistProjectConfig = React.useCallback(async () => {
    if (!sessionData?.user?.id || !requestedUploadId) return;
    const payload = buildProjectPayload();

    setAutosaveState("saving");

    try {
      const response = await fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          editorState: payload.editorState,
          backgroundImage,
          uploadId: requestedUploadId,
          isDraft: true,
        }),
      });

      if (!response.ok) {
        setAutosaveState("error");
        return;
      }

      const result = (await response.json()) as {
        updatedAt?: string;
        uploadId?: string;
      };

      setLatestUploadId(result.uploadId ?? requestedUploadId);
      setAutosaveState("saved");
      setAutosaveUpdatedAt(result.updatedAt ?? new Date().toISOString());
    } catch {
      setAutosaveState("error");
    }
  }, [backgroundImage, buildProjectPayload, requestedUploadId, sessionData?.user?.id]);

  React.useEffect(() => {
    if (isInteractingWithCanvas) {
      return;
    }

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
  }, [buildEditorSnapshot, isInteractingWithCanvas, updateHistoryAvailability]);

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

  const resolveRestoreCanvasSize = React.useCallback(
    (payload: unknown) => {
      const payloadRecord = isRecord(payload) ? payload : null;
      const editorState = isRecord(payloadRecord?.editorState)
        ? payloadRecord.editorState
        : payloadRecord;

      const aspectWidthValue = Number(editorState?.aspectWidth);
      const aspectHeightValue = Number(editorState?.aspectHeight);

      const ratio =
        Number.isFinite(aspectWidthValue) &&
        Number.isFinite(aspectHeightValue) &&
        aspectWidthValue > 0 &&
        aspectHeightValue > 0
          ? aspectWidthValue / aspectHeightValue
          : 16 / 9;

      const wrapperRect = stageWrapRef.current?.getBoundingClientRect();
      if (wrapperRect && wrapperRect.width > 0 && wrapperRect.height > 0) {
        const fitWidth = Math.min(wrapperRect.width, wrapperRect.height * ratio);
        const fitHeight = fitWidth / ratio;
        return { width: fitWidth, height: fitHeight };
      }

      return {
        width: stageSizeRef.current.width,
        height: stageSizeRef.current.height,
      };
    },
    []
  );

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
        if (shouldStartBlank) {
          if (!isCancelled) {
            setItems([]);
            setAspectWidth("16");
            setAspectHeight("9");
            setAspectWidthDraft("16");
            setAspectHeightDraft("9");
            setBackgroundImage(null);
            setIsCustomSideLayoutsEnabled(false);
            setEditorTeamSide("red");
            setPreviewTeamSide("red");
            setSelectedItemId(null);
            setStagingParentId(null);
            setPreviewStageParentId(null);
            setIsPreviewMode(false);
            setAutosaveUpdatedAt(null);
            setLatestUploadId(null);
            setAutosaveState("idle");
          }
          return;
        }

        if (requestedUploadId) {
          const selectedResponse = await fetch(
            `/api/field-configs/public/${encodeURIComponent(requestedUploadId)}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (!selectedResponse.ok) {
            hasRestoredRef.current = true;
            return;
          }

          const selectedResult = (await selectedResponse.json()) as {
            config?: { payload?: unknown; updatedAt?: string; uploadId?: string } | null;
          };

          if (selectedResult.config?.payload) {
            const restoreCanvas = resolveRestoreCanvasSize(
              selectedResult.config.payload
            );
            const nextState = parseImportedEditorState(
              selectedResult.config.payload,
              restoreCanvas.width,
              restoreCanvas.height
            );

            if (!isCancelled) {
              setItems(nextState.items);
              setAspectWidth(nextState.aspectWidth || "16");
              setAspectHeight(nextState.aspectHeight || "9");
              setAspectWidthDraft(nextState.aspectWidth || "16");
              setAspectHeightDraft(nextState.aspectHeight || "9");
              setBackgroundImage(nextState.backgroundImage ?? null);
              setIsCustomSideLayoutsEnabled(Boolean(nextState.useCustomSideLayouts));
              setEditorTeamSide(nextState.editorTeamSide ?? "red");
              setPreviewTeamSide(nextState.previewTeamSide ?? "red");
              setSelectedItemId(null);
              setStagingParentId(null);
              setPreviewStageParentId(null);
              setIsPreviewMode(false);
              setAutosaveUpdatedAt(selectedResult.config?.updatedAt ?? null);
              setLatestUploadId(selectedResult.config?.uploadId ?? requestedUploadId);
              setAutosaveState("saved");
            }
          }

          return;
        }

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

        const restoreCanvas = resolveRestoreCanvasSize(result.config?.payload);
        const restored = parsePersistedEditorState(
          result.config?.payload,
          restoreCanvas.width,
          restoreCanvas.height
        );
        if (!isCancelled && restored) {
          setItems(restored.items);
          setAspectWidth(restored.aspectWidth);
          setAspectHeight(restored.aspectHeight);
          setBackgroundImage(restored.backgroundImage);
          setIsCustomSideLayoutsEnabled(Boolean(restored.useCustomSideLayouts));
          setEditorTeamSide(restored.editorTeamSide ?? "red");
          setPreviewTeamSide(restored.previewTeamSide ?? "red");
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
  }, [requestedUploadId, resolveRestoreCanvasSize, sessionData?.user?.id, shouldStartBlank]);

  React.useEffect(() => {
    const userId = sessionData?.user?.id;
    const metadataUploadId = requestedUploadId || latestUploadId || "";

    if (!userId || !metadataUploadId) {
      setProjectMeta(null);
      return;
    }

    let cancelled = false;

    const fetchMetadata = async () => {
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(metadataUploadId)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          if (!cancelled) {
            setProjectMeta(null);
          }
          return;
        }

        const result = (await response.json()) as {
          project?: { name?: string; contentHash?: string | null; isDraft?: boolean };
        };

        if (cancelled) return;

        const name = result.project?.name?.trim();
        setProjectMeta(
          name
            ? {
                name,
                contentHash: result.project?.contentHash ?? null,
                isDraft:
                  typeof result.project?.isDraft === "boolean"
                    ? result.project.isDraft
                    : null,
              }
            : null
        );
      } catch {
        if (!cancelled) {
          setProjectMeta(null);
        }
      }
    };

    void fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [latestUploadId, requestedUploadId, sessionData?.user?.id]);

  React.useEffect(() => {
    if (!sessionData?.user?.id) return;
    if (!hasRestoredRef.current || isRestoringRef.current) return;
    if (isInteractingWithCanvas) return;

    const timer = window.setTimeout(() => {
      if (requestedUploadId) {
        void persistProjectConfig();
      } else {
        void persistDraft();
      }
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    aspectHeight,
    aspectWidth,
    backgroundImage,
    isInteractingWithCanvas,
    items,
    persistDraft,
    persistProjectConfig,
    requestedUploadId,
    sessionData?.user?.id,
  ]);

  React.useEffect(() => {
    if (!sessionData?.user?.id) return;

    const flushAutosave = () => {
      if (!hasRestoredRef.current || isRestoringRef.current) return;

      const payload = requestedUploadId ? buildProjectPayload() : buildDraftPayload();
      if (!payload) return;

      const body = JSON.stringify(
        requestedUploadId
          ? {
              payload,
              editorState: payload.editorState,
              backgroundImage,
              uploadId: requestedUploadId,
              isDraft: true,
            }
          : {
              payload,
              editorState: payload.editorState,
              backgroundImage,
              isDraft: true,
            }
      );

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
  }, [
    backgroundImage,
    buildDraftPayload,
    buildProjectPayload,
    requestedUploadId,
    sessionData?.user?.id,
  ]);

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
      const normalizedTag = normalizeTag(value);
      setIconTagDraft(normalizedTag);
      const id = iconEditingIdRef.current;
      if (!id) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, tag: normalizedTag } : item
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
    const processResizeFrame = (clientX: number, clientY: number) => {
      const resolveSnapLock = (
        rawEdge: number,
        candidateEdge: number,
        candidateDiff: number,
        lockedEdge: number | null
      ) => {
        if (lockedEdge !== null && Math.abs(rawEdge - lockedEdge) <= SNAP_RELEASE_PX) {
          return { value: lockedEdge, lock: lockedEdge };
        }

        if (candidateDiff <= GUIDE_SNAP_PX) {
          return { value: candidateEdge, lock: candidateEdge };
        }

        return { value: rawEdge, lock: null };
      };

      const resize = resizingRef.current;
      const mirror = mirrorHandleRef.current;

      if (!resize && !mirror) return;

      const canvasSize =
        interactionCanvasSizeRef.current ??
        (() => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return null;
          const next = { width: rect.width, height: rect.height };
          interactionCanvasSizeRef.current = next;
          return next;
        })();

      if (!canvasSize) return;

      if (resize) {
        const maxWidth = Math.max(64, canvasSize.width - resize.originX);
        const maxHeight = Math.max(36, canvasSize.height - resize.originY);

        const rawWidth = Math.max(
          64,
          Math.min(resize.startWidth + (clientX - resize.startX), maxWidth)
        );
        const rawHeight = Math.max(
          36,
          Math.min(resize.startHeight + (clientY - resize.startY), maxHeight)
        );

        if (!isAlignmentAssistEnabledRef.current) {
          resizeSnapLockRef.current = {
            id: resize.id,
            mode: "resize",
            x: null,
            y: null,
          };

          if (
            alignmentGuidesRef.current.vertical.length > 0 ||
            alignmentGuidesRef.current.horizontal.length > 0
          ) {
            const emptyGuides = { vertical: [], horizontal: [] } as {
              vertical: number[];
              horizontal: number[];
            };
            alignmentGuidesRef.current = emptyGuides;
            setAlignmentGuides(emptyGuides);
          }

          setItems((prev) => {
            let didChange = false;
            const next = prev.map((item) => {
              if (item.id !== resize.id) return item;
              if (item.width === rawWidth && item.height === rawHeight) return item;
              didChange = true;
              return { ...item, width: rawWidth, height: rawHeight };
            });
            return didChange ? next : prev;
          });
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

        visibleItemsRef.current
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

        const existingLock = resizeSnapLockRef.current;
        const lockedX =
          existingLock.mode === "resize" && existingLock.id === resize.id
            ? existingLock.x
            : null;
        const lockedY =
          existingLock.mode === "resize" && existingLock.id === resize.id
            ? existingLock.y
            : null;
        const resolvedRight = resolveSnapLock(
          activeRight,
          snappedRight,
          bestXDiff,
          lockedX
        );
        const resolvedBottom = resolveSnapLock(
          activeBottom,
          snappedBottom,
          bestYDiff,
          lockedY
        );
        resizeSnapLockRef.current = {
          id: resize.id,
          mode: "resize",
          x: resolvedRight.lock,
          y: resolvedBottom.lock,
        };

        const nextWidth = Math.max(
          64,
          Math.min(resolvedRight.value - activeLeft, maxWidth)
        );
        const nextHeight = Math.max(
          36,
          Math.min(resolvedBottom.value - activeTop, maxHeight)
        );

        const nextGuides = {
          vertical: Array.from(vertical),
          horizontal: Array.from(horizontal),
        };

        if (
          !areNumberArraysEqual(nextGuides.vertical, alignmentGuidesRef.current.vertical) ||
          !areNumberArraysEqual(
            nextGuides.horizontal,
            alignmentGuidesRef.current.horizontal
          )
        ) {
          alignmentGuidesRef.current = nextGuides;
          setAlignmentGuides(nextGuides);
        }

        setItems((prev) => {
          let didChange = false;
          const next = prev.map((item) => {
            if (item.id !== resize.id) return item;
            if (item.width === nextWidth && item.height === nextHeight) return item;
            didChange = true;
            return { ...item, width: nextWidth, height: nextHeight };
          });
          return didChange ? next : prev;
        });
      }

      if (mirror) {
        resizeSnapLockRef.current = { id: null, mode: null, x: null, y: null };
        const dx = clientX - mirror.startX;
        const dy = clientY - mirror.startY;
        const clamp = (value: number, min: number, max: number) =>
          Math.min(max, Math.max(min, value));

        const maxX = canvasSize.width;
        const maxY = canvasSize.height;

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

        setItems((prev) => {
          let didChange = false;
          const next = prev.map((item) => {
            if (item.id !== mirror.id) return item;
            if (
              item.x === nextX &&
              item.y === nextY &&
              item.width === nextWidth &&
              item.height === nextHeight &&
              (item.startX ?? item.x) === startX &&
              (item.startY ?? item.y) === startY &&
              (item.endX ?? item.x + item.width) === endX &&
              (item.endY ?? item.y + item.height) === endY
            ) {
              return item;
            }
            didChange = true;
            return {
              ...item,
              x: nextX,
              y: nextY,
              width: nextWidth,
              height: nextHeight,
              startX,
              startY,
              endX,
              endY,
            };
          });
          return didChange ? next : prev;
        });
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      resizeMoveSnapshotRef.current = { x: event.clientX, y: event.clientY };
      if (resizeMoveRafRef.current !== null) return;

      resizeMoveRafRef.current = window.requestAnimationFrame(() => {
        resizeMoveRafRef.current = null;
        const snapshot = resizeMoveSnapshotRef.current;
        if (!snapshot) return;
        resizeMoveSnapshotRef.current = null;
        processResizeFrame(snapshot.x, snapshot.y);
      });
    };

    const handlePointerUp = () => {
      resizingRef.current = null;
      mirrorHandleRef.current = null;
      setIsInteractingWithCanvas(false);
      resizeSnapLockRef.current = { id: null, mode: null, x: null, y: null };
      interactionCanvasSizeRef.current = null;
      setAlignmentGuides({ vertical: [], horizontal: [] });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (resizeMoveRafRef.current !== null) {
        window.cancelAnimationFrame(resizeMoveRafRef.current);
        resizeMoveRafRef.current = null;
      }
      resizeSnapLockRef.current = { id: null, mode: null, x: null, y: null };
      interactionCanvasSizeRef.current = null;
    };
  }, []);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      setIsInteractingWithCanvas(false);
      if (dragMoveRafRef.current !== null) {
        window.cancelAnimationFrame(dragMoveRafRef.current);
        dragMoveRafRef.current = null;
      }
      dragMoveSnapshotRef.current = null;
      snapLockRef.current = { itemId: null, type: null, x: null, y: null };

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
      const paletteSize = getAssetSize(paletteKind ?? "text");
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
        if (isCustomSideLayoutsEnabled && data.assetKind === "mirror") {
          setActiveType(null);
          setPaletteSnapOffset({ x: 0, y: 0 });
          setPalettePointerOffset({ x: 0, y: 0 });
          palettePointerStartRef.current = null;
          dragStartPointerRef.current = null;
          return;
        }

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
        const size = getAssetSize(kind);
        const isNewMirror = kind === "mirror";
        const mirrorStartX = canvasRect.width / 2;
        const mirrorStartY = 0;
        const mirrorEndX = canvasRect.width / 2;
        const mirrorEndY = canvasRect.height;
        const mirrorLeft = Math.min(mirrorStartX, mirrorEndX);
        const mirrorTop = Math.min(mirrorStartY, mirrorEndY);
        const mirrorWidth = Math.max(1, Math.abs(mirrorEndX - mirrorStartX));
        const mirrorHeight = Math.max(1, Math.abs(mirrorEndY - mirrorStartY));
        setItems((prev) => [
          ...prev,
          {
            id: newId,
            x: isNewMirror ? mirrorLeft : x,
            y: isNewMirror ? mirrorTop : y,
            width: isNewMirror ? mirrorWidth : size.width,
            height: isNewMirror ? mirrorHeight : size.height,
            label: getDefaultLabelForKind(kind),
            kind,
            tag: "",
            iconName: kind === "icon" ? "Bot" : undefined,
            outlineColor: kind === "icon" ? "#ffffff" : undefined,
            fillColor: kind === "icon" ? "transparent" : undefined,
            increment: kind === "text" || kind === "icon" ? 1 : undefined,
            startX: kind === "mirror" ? mirrorStartX : undefined,
            startY: kind === "mirror" ? mirrorStartY : undefined,
            endX: kind === "mirror" ? mirrorEndX : undefined,
            endY: kind === "mirror" ? mirrorEndY : undefined,
            placeholder: kind === "input" ? "Enter text" : undefined,
            toggleOn: kind === "toggle" ? false : undefined,
            toggleTextAlign: kind === "toggle" ? "center" : undefined,
            toggleTextSize: kind === "toggle" ? 10 : undefined,
            teamSide:
              isCustomSideLayoutsEnabled && kind !== "mirror"
                ? editorTeamSide
                : undefined,
            swapRedSide: kind === "swap" ? "left" : undefined,
            swapActiveSide: kind === "swap" ? "left" : undefined,
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
      isCustomSideLayoutsEnabled,
      items,
      visibleItems,
      editorTeamSide,
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
    setIsCustomSideLayoutsEnabled(false);
    setEditorTeamSide("red");
    setPreviewTeamSide("red");
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

  React.useEffect(() => {
    if (autosaveState !== "saved") return;

    if (autosaveBadgeTimeoutRef.current !== null) {
      window.clearTimeout(autosaveBadgeTimeoutRef.current);
    }

    setIsAutosaveBadgeVisible(true);
    autosaveBadgeTimeoutRef.current = window.setTimeout(() => {
      setIsAutosaveBadgeVisible(false);
      autosaveBadgeTimeoutRef.current = null;
    }, 5000);
  }, [autosaveState, autosaveUpdatedAt]);

  React.useEffect(() => {
    return () => {
      if (autosaveBadgeTimeoutRef.current !== null) {
        window.clearTimeout(autosaveBadgeTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isTutorialOpen) return;

    const updateTutorialLayout = () => {
      const target = getTutorialTargetElement(currentTutorialStep);
      if (!target) {
        setTutorialTargetRect(null);
        setTutorialCardPosition({ left: 24, top: 24 });
        return;
      }

      const rect = target.getBoundingClientRect();
      setTutorialTargetRect(rect);

      const cardWidth = 330;
      const cardHeight = 210;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 16;
      const minMargin = 12;

      let left = rect.left;
      let top = rect.bottom + gap;

      if (currentTutorialStep.placement === "right") {
        left = rect.right + gap;
        top = rect.top + rect.height / 2 - cardHeight / 2;
      } else if (currentTutorialStep.placement === "left") {
        left = rect.left - cardWidth - gap;
        top = rect.top + rect.height / 2 - cardHeight / 2;
      } else if (currentTutorialStep.placement === "top") {
        left = rect.left + rect.width / 2 - cardWidth / 2;
        top = rect.top - cardHeight - gap;
      } else {
        left = rect.left + rect.width / 2 - cardWidth / 2;
        top = rect.bottom + gap;
      }

      left = Math.max(minMargin, Math.min(left, viewportWidth - cardWidth - minMargin));
      top = Math.max(minMargin, Math.min(top, viewportHeight - cardHeight - minMargin));

      setTutorialCardPosition({ left, top });
    };

    updateTutorialLayout();
    window.addEventListener("resize", updateTutorialLayout);
    window.addEventListener("scroll", updateTutorialLayout, true);

    return () => {
      window.removeEventListener("resize", updateTutorialLayout);
      window.removeEventListener("scroll", updateTutorialLayout, true);
    };
  }, [currentTutorialStep, getTutorialTargetElement, isTutorialOpen]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-blue-950/40 text-white">
        <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
          <div
            ref={navHeaderRef}
            className="mx-auto flex w-full max-w-[1760px] items-center justify-between px-5 py-3"
          >
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => router.push("/projectManager")}
                className="text-left text-4xl font-black tracking-tight text-white transition-opacity hover:opacity-85"
              >
                GoonScout
              </button>
              {requestedUploadId ? (
                <div className="mt-1 flex items-center gap-3 text-sm text-white/80">
                  <span className="truncate font-semibold text-white">
                    {projectMeta?.name ?? "Loading project..."}
                  </span>
                  <span className="text-white/45">•</span>
                  <span className="font-medium text-white/70">
                    Hash: {projectMeta?.contentHash?.trim() || "Unavailable"}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="ml-6 flex items-center gap-3 sm:gap-4">
              <span
                className={`hidden items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300 transition-opacity duration-300 xl:inline-flex ${
                  isAutosaveBadgeVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Saved
              </span>
              <Button
                ref={previewButtonRef}
                variant="outline"
                type="button"
                className="h-10 gap-2 rounded-lg border-white/15 bg-slate-900/60 px-4 text-white hover:bg-slate-800/80"
                disabled={isProjectCompleted}
                onClick={() =>
                  setIsPreviewMode((current) => {
                    const next = !current;
                    if (next) {
                      setStagingParentId(null);
                      setPreviewTeamSide(editorTeamSide);
                      setPreviewInputValues({});
                      setPreviewLogText("");
                    } else {
                      setPreviewStageParentId(null);
                      setPreviewInputValues({});
                      setPreviewLogText("");
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
                className="h-10 gap-2 rounded-lg bg-emerald-600 px-5 text-white hover:bg-emerald-500"
                onClick={handleCompleteProject}
              >
                <Check className="h-4 w-4" />
                {isProjectCompleted ? "Completed" : "Complete"}
              </Button>
              <Button
                variant="outline"
                type="button"
                className="h-10 gap-2 rounded-lg border-white/15 bg-slate-900/60 px-4 text-white hover:bg-slate-800/80"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
              <Button
                ref={downloadButtonRef}
                variant="outline"
                type="button"
                className="h-10 gap-2 rounded-lg border-white/15 bg-slate-900/60 px-4 text-white hover:bg-slate-800/80"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                ref={tutorialHelpButtonRef}
                variant="outline"
                type="button"
                aria-label="Open tutorial"
                className="h-10 w-10 rounded-full border-white/15 bg-slate-900/60 p-0 text-white hover:bg-slate-800/80"
                onClick={() => {
                  setTutorialStepIndex(0);
                  setIsTutorialOpen(true);
                }}
              >
                <CircleHelp className="h-4 w-4" />
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
            ref={(node: HTMLDivElement | null) => {
              setAssetsRef(node);
              assetsPanelRef.current = node;
            }}
            className="flex h-[min(72vh,700px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.03] bg-slate-900/70 p-4 text-white shadow-2xl backdrop-blur"
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
              scrollbarClassName="bg-transparent"
              thumbClassName="bg-slate-600/50"
            >
              <div
                className={`flex flex-col gap-3 pr-2 ${
                  isEditorReadOnly ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <PaletteButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteActionButton
                  kind="undo"
                  title="Undo"
                  description="Undo previous change"
                  icon={<Undo2 className="h-4 w-4" />}
                  onPalettePointerDown={handlePalettePointerDown}
                />
                <PaletteActionButton
                  kind="redo"
                  title="Redo"
                  description="Redo reverted change"
                  icon={<Redo2 className="h-4 w-4" />}
                  onPalettePointerDown={handlePalettePointerDown}
                />
                <PaletteActionButton
                  kind="submit"
                  title="Submit"
                  description="Submit current input values"
                  icon={<Send className="h-4 w-4" />}
                  onPalettePointerDown={handlePalettePointerDown}
                />
                <PaletteActionButton
                  kind="reset"
                  title="Reset"
                  description="Clear all inputs"
                  icon={<RotateCcw className="h-4 w-4" />}
                  onPalettePointerDown={handlePalettePointerDown}
                />
                <PaletteIconButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteMirrorButton
                  onPalettePointerDown={handlePalettePointerDown}
                  disabled={isCustomSideLayoutsEnabled}
                />
                <PaletteInputButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteLogButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteToggleButton onPalettePointerDown={handlePalettePointerDown} />
                <PaletteCoverButton onPalettePointerDown={handlePalettePointerDown} />
              </div>
              <div className="mt-6 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-[0.15em] text-white/45">
                <span>Layout</span>
                <ChevronRight className="h-4 w-4" />
              </div>
              <div className={`mt-3 pr-2 ${isEditorReadOnly ? "pointer-events-none opacity-50" : ""}`}>
                <PaletteSwapButton onPalettePointerDown={handlePalettePointerDown} />
              </div>
            </ScrollArea>
          </aside>

          <section className="min-w-0">
            <div
              ref={canvasPanelRef}
              className="relative flex h-[min(72vh,700px)] min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.03] bg-slate-900/60 p-1 shadow-2xl backdrop-blur"
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
                  {!isTutorialOpen && visibleItems.length === 0 && (
                    <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-white/55">
                      Drop assets here
                    </p>
                  )}
                    {!isTutorialOpen &&
                    layeredVisibleItems.map((item) => {
                    if (isPreviewMode && item.kind === "mirror") {
                      return null;
                    }

                    const snapOffset =
                      dragSnapOffset.itemId === item.id
                        ? { x: dragSnapOffset.x, y: dragSnapOffset.y }
                        : undefined;

                    return item.kind === "mirror" ? (
                      <MemoCanvasMirrorLine
                        key={item.id}
                        item={item}
                        onHandleStart={handleMirrorHandleStart}
                        onSelect={setSelectedItemId}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "cover" ? (
                      <MemoCanvasCover
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={setSelectedItemId}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "input" ? (
                      <MemoCanvasInput
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onEditInput={handleEditLabel}
                        onPreviewValueChange={handlePreviewInputChange}
                        onSelect={setSelectedItemId}
                        previewValue={previewInputValues[normalizeTag(item.tag ?? "") || item.id] ?? ""}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "log" ? (
                      <MemoCanvasLog
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={setSelectedItemId}
                        logText={previewLogText}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "toggle" ? (
                      <MemoCanvasToggle
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={setSelectedItemId}
                        onToggle={handleToggleItem}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : (
                      <MemoCanvasButton
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onEditLabel={handleEditLabel}
                        onSwapSides={handleSwapSides}
                        onPreviewButtonAction={handlePreviewButtonAction}
                        onSelect={setSelectedItemId}
                        onPreviewPressStart={handlePreviewPressStart}
                        onPreviewPressEnd={handlePreviewPressEnd}
                        onPreviewStageToggle={handlePreviewStageToggle}
                        onStageContextMenu={handleStageContextMenu}
                        hasStages={stageRootIds.has(item.id)}
                        isPreviewPressed={previewPressedItemId === item.id}
                        isCustomSideLayoutsEnabled={isCustomSideLayoutsEnabled}
                        visibleTeamSide={currentVisibleTeamSide}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    );
                    })}
                  </section>
                </div>
              </div>

            </div>
          </section>

          <div className="flex h-[min(72vh,700px)] min-h-0 flex-col gap-3">
          <aside
            ref={propertiesPanelRef}
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-white/[0.03] bg-slate-900/70 p-4 text-white shadow-2xl backdrop-blur [scrollbar-color:rgba(100,116,139,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600/50 ${
              isProjectCompleted ? "pointer-events-none opacity-60" : ""
            }`}
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
                disabled={!canUndo || isProjectCompleted}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="outline"
                type="button"
                className="h-10 rounded-lg border-white/15 bg-slate-900/70 text-white hover:bg-slate-800/80"
                onClick={handleRedo}
                disabled={!canRedo || isProjectCompleted}
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
                    ref={tagInputRef}
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

                {!selectedHasStagedChildren ? (
                  <div className="grid gap-2">
                    <Label htmlFor="icon-increment-side" className="text-sm text-white/80">
                      Increment
                    </Label>
                    <Input
                      id="icon-increment-side"
                      type="number"
                      min={1}
                      step={1}
                      value={selectedItem.increment ?? 1}
                      onChange={(event) =>
                        handleSelectedIncrementChange(
                          Math.max(1, Number(event.target.value) || 1)
                        )
                      }
                      className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                    />
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Staging</Label>
                  <Button
                    ref={stagingButtonRef}
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
            ) : selectedItem?.kind === "swap" ? (
              <div className="grid gap-4">
                {!isCustomSideLayoutsEnabled ? (
                  <div className="grid gap-2">
                    <Label className="text-sm text-white/80">Side colors</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/65">
                      <div className="text-center">Left</div>
                      <div className="text-center">Right</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={`h-11 rounded-md border text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                          (selectedItem.swapRedSide ?? "left") === "left"
                            ? "border-red-400/70 bg-red-500/20 text-red-200"
                            : "border-blue-400/70 bg-blue-500/20 text-blue-200"
                        }`}
                        onClick={() =>
                          handleSelectedSwapRedSideChange(
                            (selectedItem.swapRedSide ?? "left") === "left"
                              ? "right"
                              : "left"
                          )
                        }
                      >
                        {(selectedItem.swapRedSide ?? "left") === "left" ? "Red" : "Blue"}
                      </button>
                      <button
                        type="button"
                        className={`h-11 rounded-md border text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                          (selectedItem.swapRedSide ?? "left") === "right"
                            ? "border-red-400/70 bg-red-500/20 text-red-200"
                            : "border-blue-400/70 bg-blue-500/20 text-blue-200"
                        }`}
                        onClick={() =>
                          handleSelectedSwapRedSideChange(
                            (selectedItem.swapRedSide ?? "left") === "right"
                              ? "left"
                              : "right"
                          )
                        }
                      >
                        {(selectedItem.swapRedSide ?? "left") === "right" ? "Red" : "Blue"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/70">
                    In custom side layout mode, swap outline color follows the side currently being edited.
                  </div>
                )}
                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Current outline color</Label>
                  <div className="h-11 rounded-md border border-white/10 bg-slate-900/80 px-3 flex items-center gap-2 text-sm text-white/80">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        (selectedItem.swapActiveSide ?? "left") ===
                        (selectedItem.swapRedSide ?? "left")
                          ? "bg-red-400"
                          : "bg-blue-400"
                      }`}
                    />
                    {(selectedItem.swapActiveSide ?? "left") ===
                    (selectedItem.swapRedSide ?? "left")
                      ? "Red side active"
                      : "Blue side active"}
                  </div>
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
                    ref={tagInputRef}
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
                    ref={tagInputRef}
                    id="input-tag-side"
                    value={selectedItem.tag ?? ""}
                    onChange={(event) => handleSelectedTagChange(event.target.value)}
                    placeholder="Enter tag"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
              </div>
            ) : selectedItem && isActionButtonKind(selectedItem.kind) ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="action-button-name" className="text-sm text-white/80">
                    Button name
                  </Label>
                  <Input
                    id="action-button-name"
                    value={selectedItem.label}
                    onChange={(event) => handleSelectedLabelChange(event.target.value)}
                    placeholder="Button text"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/70">
                  In preview mode, this button performs the <span className="font-semibold text-white">{selectedItem.kind}</span> action.
                </div>
              </div>
            ) : selectedItem?.kind === "log" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="log-name" className="text-sm text-white/80">
                    Log label
                  </Label>
                  <Input
                    id="log-name"
                    value={selectedItem.label}
                    onChange={(event) => handleSelectedLabelChange(event.target.value)}
                    placeholder="Log"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/70">
                  Log output is populated when a Submit button is clicked in preview mode.
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
                    ref={tagInputRef}
                    id="button-tag"
                    value={selectedItem?.kind === "text" ? (selectedItem.tag ?? "") : ""}
                    onChange={(event) => handleSelectedTagChange(event.target.value)}
                    placeholder="Enter tag"
                    disabled={selectedItem?.kind !== "text"}
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35 disabled:opacity-50"
                  />
                </div>
                {!selectedHasStagedChildren ? (
                  <div className="grid gap-2">
                    <Label htmlFor="button-increment" className="text-sm text-white/80">
                      Increment
                    </Label>
                    <Input
                      id="button-increment"
                      type="number"
                      min={1}
                      step={1}
                      value={selectedItem?.kind === "text" ? (selectedItem.increment ?? 1) : 1}
                      onChange={(event) =>
                        handleSelectedIncrementChange(
                          Math.max(1, Number(event.target.value) || 1)
                        )
                      }
                      disabled={selectedItem?.kind !== "text"}
                      className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35 disabled:opacity-50"
                    />
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Staging</Label>
                  <Button
                    ref={stagingButtonRef}
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
                ref={fieldSettingsButtonRef}
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
          {isCustomSideLayoutsEnabled ? (
            <div className="grid gap-2 rounded-2xl border border-white/[0.03] bg-slate-900/70 p-3 text-white shadow-2xl backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                Side editor
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["red", "blue"] as const).map((side) => (
                  <Button
                    key={side}
                    type="button"
                    variant="outline"
                    className={`h-9 border-white/15 bg-slate-900 text-xs text-white hover:bg-slate-800 ${
                      editorTeamSide === side
                        ? "ring-1 ring-blue-400/70"
                        : ""
                    }`}
                    onClick={() => setEditorTeamSide(side)}
                  >
                    {side === "red" ? "Editing: Red" : "Editing: Blue"}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          </div>
        </main>

        {isTutorialOpen ? (
          <>
            <div
              className={`pointer-events-none fixed inset-0 z-[75] ${
                currentTutorialStep.key === "field-settings"
                  ? "bg-transparent"
                  : "bg-slate-950/65"
              }`}
            />
            {tutorialTargetRect ? (
              <div
                className={`pointer-events-none fixed z-[76] rounded-xl border border-sky-300/80 ${
                  currentTutorialStep.key === "field-settings"
                    ? ""
                    : "shadow-[0_0_0_9999px_rgba(2,6,23,0.5)]"
                }`}
                style={{
                  left: tutorialTargetRect.left - 6,
                  top: tutorialTargetRect.top - 6,
                  width: tutorialTargetRect.width + 12,
                  height: tutorialTargetRect.height + 12,
                }}
              />
            ) : null}
            <div
              className="fixed z-[77] w-[330px] rounded-xl border border-white/20 bg-slate-900/95 p-4 text-white shadow-2xl"
              style={{
                left: tutorialCardPosition.left,
                top: tutorialCardPosition.top,
              }}
            >
              <span
                className={`pointer-events-none absolute h-3 w-3 rotate-45 border border-white/20 bg-slate-900/95 ${tutorialArrowClass}`}
              />
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
                Step {tutorialStepIndex + 1} of {tutorialSteps.length}
              </div>
              <h3 className="mb-2 text-base font-semibold leading-tight">
                {currentTutorialStep.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-white/80">
                {currentTutorialStep.body}
              </p>
              {currentTutorialStep.key === "staging" ? (
                <div className="mb-4 rounded-lg border border-white/10 bg-slate-950/80 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-white/60">
                    Staging preview mock
                  </div>
                  <div className="relative overflow-hidden rounded-md border border-white/10 bg-slate-900/90 p-3">
                    <div className="absolute inset-0 bg-slate-700/20 blur-md" />
                    <div className="relative flex items-center justify-between gap-2">
                      <div className="rounded-md border border-sky-300/60 bg-sky-400/25 px-3 py-1 text-xs text-sky-100">
                        Stage Root
                      </div>
                      <ChevronDown className="h-4 w-4 text-sky-300" />
                    </div>
                    <div className="relative mt-3 grid gap-2">
                      <div className="rounded-md border border-white/15 bg-slate-800/90 px-3 py-1.5 text-xs text-white/85">
                        Visible child in stage
                      </div>
                      <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-white/50">
                        Hidden outside-stage element
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-white/20 bg-slate-900 text-white hover:bg-slate-800"
                  disabled={isTutorialFirstStep}
                  onClick={() =>
                    setTutorialStepIndex((index) => Math.max(0, index - 1))
                  }
                >
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border-white/20 bg-slate-900 text-white hover:bg-slate-800"
                    onClick={() => setIsTutorialOpen(false)}
                  >
                    Skip
                  </Button>
                  <Button
                    type="button"
                    className="h-9 bg-blue-600 text-white hover:bg-blue-500"
                    onClick={() => {
                      if (isTutorialLastStep) {
                        setIsTutorialOpen(false);
                        return;
                      }
                      setTutorialStepIndex((index) =>
                        Math.min(tutorialSteps.length - 1, index + 1)
                      );
                    }}
                  >
                    {isTutorialLastStep ? "Finish" : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}

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
              ) : activeKind === "log" ? (
                <div className="h-full w-full rounded-md border border-white/15 bg-slate-900/90 p-2">
                  <div className="mb-1 text-xs text-white/80">Log</div>
                  <div className="h-[calc(100%-18px)] rounded border border-white/10 bg-slate-950/80 p-2 text-[11px] text-white/70">
                    Submitted input values...
                  </div>
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
                  ) : activeKind === "undo" ? (
                    <span className="inline-flex items-center gap-2">
                      <Undo2 className="h-4 w-4" />
                      {activeLabel}
                    </span>
                  ) : activeKind === "redo" ? (
                    <span className="inline-flex items-center gap-2">
                      <Redo2 className="h-4 w-4" />
                      {activeLabel}
                    </span>
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
                  onChange={(event) => setTagDraft(normalizeTag(event.target.value))}
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
                  onChange={(event) =>
                    setInputTagDraft(normalizeTag(event.target.value))
                  }
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
            <div className="mt-3 flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
              <div className="grid gap-0.5">
                <Label htmlFor="custom-side-layout-toggle">Custom side layouts</Label>
                <p className="text-xs text-white/60">
                  Edit separate Red/Blue arrangements without mirror line swapping
                </p>
              </div>
              <button
                id="custom-side-layout-toggle"
                type="button"
                role="switch"
                aria-checked={isCustomSideLayoutsEnabled}
                aria-label="Toggle custom side layouts"
                onClick={handleCustomSideLayoutsToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                  isCustomSideLayoutsEnabled
                    ? "border-white/60 bg-white/80"
                    : "border-white/30 bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    isCustomSideLayoutsEnabled
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
          open={isDisableCustomSideDialogOpen}
          onOpenChange={(open) => setIsDisableCustomSideDialogOpen(open)}
        >
          <DialogContent className="border-white/10 bg-slate-950 text-white data-[state=closed]:slide-out-to-right-1/2 data-[state=open]:slide-in-from-right-1/2">
            <DialogHeader>
              <DialogTitle>Keep one side layout</DialogTitle>
              <DialogDescription className="text-white/60">
                Warning: turning off custom side layouts keeps only one layout.
                Choose which side to keep. The other side&apos;s elements will be
                deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Label htmlFor="keep-side" className="text-white/85">
                Side to keep
              </Label>
              <div id="keep-side" className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={customSideToKeep === "red" ? "default" : "outline"}
                  className={
                    customSideToKeep === "red"
                      ? "bg-rose-600 text-white hover:bg-rose-500"
                      : "border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                  }
                  onClick={() => setCustomSideToKeep("red")}
                >
                  Keep Red
                </Button>
                <Button
                  type="button"
                  variant={customSideToKeep === "blue" ? "default" : "outline"}
                  className={
                    customSideToKeep === "blue"
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                  }
                  onClick={() => setCustomSideToKeep("blue")}
                >
                  Keep Blue
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setIsDisableCustomSideDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-amber-600 text-white hover:bg-amber-500"
                onClick={() => {
                  disableCustomSideLayoutsKeeping(customSideToKeep);
                  setIsDisableCustomSideDialogOpen(false);
                }}
              >
                Keep selected side
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

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-2xl border-white/10 bg-slate-950 text-white">
            <DialogHeader>
              <DialogTitle>Upload JSON layout</DialogTitle>
              <DialogDescription className="text-white/60">
                Upload a .json file or paste JSON, then build the field from it.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <input
                ref={importFileInputRef}
                type="file"
                accept=".json,application/json,text/json"
                className="hidden"
                onChange={handleImportFileChange}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  type="button"
                  className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => importFileInputRef.current?.click()}
                >
                  Select JSON file
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => setImportJsonDraft("")}
                >
                  Clear
                </Button>
              </div>
              <textarea
                value={importJsonDraft}
                onChange={(event) => setImportJsonDraft(event.target.value)}
                placeholder="Paste JSON here"
                className="min-h-[300px] w-full rounded-md border border-white/10 bg-black/80 p-3 font-mono text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setIsImportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-500"
                onClick={handleBuildFromUploadedJson}
              >
                Upload and build field
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
