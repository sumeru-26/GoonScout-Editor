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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import * as LucideIcons from "lucide-react";

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  QrCode,
  Redo2,
  RotateCcw,
  Send,
  Settings,
  Square,
  ToggleLeft,
  Type,
  Undo2,
  Upload,
  X,
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";

const BUTTON_SIZE = { width: 104, height: 44 } as const;
const MOVEMENT_SIZE = { width: 64, height: 44 } as const;
const ICON_BUTTON_SIZE = { width: 40, height: 40 } as const;
const MIRROR_LINE_SIZE = { width: 160, height: 80 } as const;
const COVER_SIZE = { width: 220, height: 120 } as const;
const START_POSITION_SIZE = { width: 220, height: 120 } as const;
const INPUT_SIZE = { width: 220, height: 56 } as const;
const TEAM_SELECT_SIZE = { width: 220, height: 44 } as const;
const MATCH_SELECT_SIZE = { width: 220, height: 44 } as const;
const TOGGLE_SIZE = { width: 52, height: 28 } as const;
const AUTO_TOGGLE_SIZE = { width: 180, height: 40 } as const;
const LOG_SIZE = { width: 280, height: 120 } as const;
const SLIDER_SIZE = { width: 260, height: 72 } as const;
const BUTTON_SLIDER_DRAG_DEADZONE_PX = 6;
const TEAM_SELECT_OPTIONS = [
  {
    value: "b1",
    label: "B1",
    chipClassName: "border-blue-400/50 bg-blue-500/20 text-blue-100",
  },
  {
    value: "b2",
    label: "B2",
    chipClassName: "border-blue-400/50 bg-blue-500/20 text-blue-100",
  },
  {
    value: "b3",
    label: "B3",
    chipClassName: "border-blue-400/50 bg-blue-500/20 text-blue-100",
  },
  {
    value: "r1",
    label: "R1",
    chipClassName: "border-red-400/50 bg-red-500/20 text-red-100",
  },
  {
    value: "r2",
    label: "R2",
    chipClassName: "border-red-400/50 bg-red-500/20 text-red-100",
  },
  {
    value: "r3",
    label: "R3",
    chipClassName: "border-red-400/50 bg-red-500/20 text-red-100",
  },
] as const;
type FieldBackgroundOption = {
  key: string;
  name: string;
  imageUrl: string;
};

const NO_BACKGROUND_OPTION: FieldBackgroundOption = {
  key: "none",
  name: "None",
  imageUrl: "",
};
const MATCH_SELECT_MIN_VALUE = 1;
const MATCH_SELECT_MAX_VALUE = 999;
const FIELD_HEIGHT = 560;
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
  | "slider"
  | "button-slider"
  | "movement"
  | "icon"
  | "mirror"
  | "swap"
  | "cover"
  | "start-position"
  | "input"
  | "team-select"
  | "match-select"
  | "toggle"
  | "auto-toggle"
  | "undo"
  | "redo"
  | "submit"
  | "reset"
  | "log";

type ActionButtonKind = "undo" | "redo" | "submit" | "reset";
type ButtonPressMode = "tap" | "hold";

type TeamSide = "red" | "blue";
type InputValueMode = "text" | "numbers" | "both";
type ToggleStyle = "switch" | "box";
type ScoutType = "match" | "qualitative" | "pit";
type AutoTeleopScope = "auto" | "teleop";

type PostMatchQuestionType =
  | "text"
  | "slider"
  | "all-that-apply"
  | "single-select";

type PostMatchQuestion = {
  id: string;
  text: string;
  type: PostMatchQuestionType;
  tag?: string;
  options: string[];
  sliderMin?: number;
  sliderMax?: number;
  sliderLeftText?: string;
  sliderRightText?: string;
};

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
  movementDirection?: "left" | "right";
  outlineColor?: string;
  fillColor?: string;
  buttonPressMode?: ButtonPressMode;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  placeholder?: string;
  inputValueMode?: InputValueMode;
  inputIsTextArea?: boolean;
  teamSelectValue?: string;
  teamSelectLinkToStage?: boolean;
  teamSelectAlwaysShowStagedElements?: boolean;
  matchSelectValue?: number;
  toggleOn?: boolean;
  toggleStyle?: ToggleStyle;
  toggleTextAlign?: "left" | "center" | "right";
  toggleTextSize?: number;
  autoToggleMode?: "auto" | "teleop";
  autoToggleDurationSeconds?: number;
  autoToggleTeleopDurationSeconds?: number;
  autoTeleopScope?: AutoTeleopScope;
  buttonSliderIncreaseDirection?: "left" | "right";
  sliderMax?: number;
  sliderMid?: number;
  sliderLeftText?: string;
  sliderRightText?: string;
  sliderValue?: number;
  stageRemoveParentTag?: boolean;
  successTrackingEnabled?: boolean;
  successPopoverOffsetX?: number;
  successPopoverOffsetY?: number;
  teamSide?: TeamSide;
  increment?: number;
  swapRedSide?: "left" | "right";
  swapActiveSide?: "left" | "right";
  stageParentId?: string;
  stageHideAfterSelection?: boolean;
  stageBlurBackgroundOnClick?: boolean;
  stageHideOtherElementsInStage?: boolean;
  coverVisible?: boolean;
  startPositionVisible?: boolean;
};

const isActionButtonKind = (kind: AssetKind): kind is ActionButtonKind =>
  kind === "undo" || kind === "redo" || kind === "submit" || kind === "reset";

const getAssetSize = (kind: AssetKind) =>
  kind === "slider"
    ? SLIDER_SIZE
    : kind === "icon"
    ? ICON_BUTTON_SIZE
    : kind === "movement"
      ? MOVEMENT_SIZE
    : kind === "mirror"
      ? MIRROR_LINE_SIZE
      : kind === "cover"
        ? COVER_SIZE
        : kind === "start-position"
          ? START_POSITION_SIZE
        : kind === "input"
          ? INPUT_SIZE
          : kind === "team-select"
            ? TEAM_SELECT_SIZE
            : kind === "match-select"
              ? MATCH_SELECT_SIZE
          : kind === "toggle"
            ? TOGGLE_SIZE
            : kind === "auto-toggle"
              ? AUTO_TOGGLE_SIZE
            : kind === "log"
              ? LOG_SIZE
              : BUTTON_SIZE;

const getResizeMinSize = (kind: AssetKind) =>
  kind === "toggle"
    ? { width: 12, height: 4 }
    : { width: 16, height: 6 };

  const shouldCenterPaletteAnchor = (kind: AssetKind) => kind !== "mirror";

const getDefaultLabelForKind = (kind: AssetKind) =>
  kind === "icon"
    ? "Bot"
    : kind === "slider"
      ? "Slider"
    : kind === "button-slider"
      ? "Button Slider"
    : kind === "movement"
      ? "Movement"
    : kind === "mirror"
      ? "Mirror line"
      : kind === "cover"
        ? "Cover"
        : kind === "start-position"
          ? "Start Position"
        : kind === "input"
          ? "Input label"
          : kind === "team-select"
            ? "Drop Down"
          : kind === "match-select"
            ? "Match Select"
          : kind === "toggle"
            ? "Toggle"
            : kind === "auto-toggle"
              ? "Auto Toggle"
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

                  const isMassDragExcludedKind = (kind: AssetKind) =>
                    kind === "cover" || kind === "start-position" || kind === "mirror";

const getTeamSelectOption = (value: string) =>
  TEAM_SELECT_OPTIONS.find((option) => option.value === value);

const getDefaultTeamSelectOptionValue = () => TEAM_SELECT_OPTIONS[0].value;

const isStageableRootItem = (item: CanvasItem | null | undefined) => {
  if (!item) return false;
  return (
    item.kind === "text" ||
    item.kind === "icon" ||
    item.kind === "movement" ||
    (item.kind === "team-select" && item.teamSelectLinkToStage === true)
  );
};

const clampMatchSelectValue = (value: number) =>
  Math.max(MATCH_SELECT_MIN_VALUE, Math.min(MATCH_SELECT_MAX_VALUE, value));

const getWidgetScale = (
  item: Pick<CanvasItem, "width" | "height">,
  base: { width: number; height: number },
  min = 0.55,
  max = 2.4
) => {
  const widthScale = base.width > 0 ? item.width / base.width : 1;
  const heightScale = base.height > 0 ? item.height / base.height : 1;
  return Math.max(min, Math.min(max, Math.min(widthScale, heightScale)));
};

const normalizeInputValueMode = (value: unknown): InputValueMode =>
  value === "text" || value === "numbers" || value === "both" ? value : "both";

const normalizeToggleStyle = (value: unknown): ToggleStyle =>
  value === "box" ? "box" : "switch";

const normalizeButtonPressMode = (value: unknown): ButtonPressMode =>
  value === "hold" ? "hold" : "tap";

const normalizeButtonSliderIncreaseDirection = (
  value: unknown
): "left" | "right" => (value === "left" ? "left" : "right");

const invertHorizontalDirection = (value: "left" | "right"): "left" | "right" =>
  value === "left" ? "right" : "left";

const getButtonSliderTickDelayMs = (distanceFromStartPx: number) => {
  const distance = Math.max(0, Math.min(280, distanceFromStartPx));
  return Math.max(50, Math.round(320 - distance * 1.2));
};

const getButtonSliderMultiplier = (signedDistancePx: number) => {
  const distance = Math.abs(signedDistancePx);
  if (distance < BUTTON_SLIDER_DRAG_DEADZONE_PX) {
    return 0;
  }

  const multiplier = 1 + distance / 80;
  return Number(Math.max(1, Math.min(9, multiplier)).toFixed(1));
};

const normalizeMovementDirection = (value: unknown): "left" | "right" =>
  value === "right" || value === ">" ? "right" : "left";

const getMovementDirectionSymbol = (direction: "left" | "right") =>
  direction === "right" ? ">" : "<";

const normalizeStageParentOption = (value: unknown) => value === true;

const normalizeScoutType = (value: unknown): ScoutType =>
  value === "qualitative" || value === "pit" ? value : "match";

const SCOUT_TYPE_ALLOWED_ASSETS: Record<ScoutType, AssetKind[]> = {
  match: [
    "text",
    "slider",
    "button-slider",
    "movement",
    "icon",
    "mirror",
    "swap",
    "cover",
    "start-position",
    "input",
    "team-select",
    "match-select",
    "toggle",
    "auto-toggle",
    "undo",
    "redo",
    "submit",
    "reset",
    "log",
  ],
  qualitative: ["team-select", "match-select", "submit", "reset", "input", "cover"],
  pit: ["team-select", "match-select", "submit", "reset", "input", "cover", "toggle"],
};

const sanitizeInputValueByMode = (value: string, mode: InputValueMode): string => {
  if (mode === "numbers") {
    return value.replace(/[^0-9]/g, "");
  }
  if (mode === "text") {
    return value.replace(/[^a-zA-Z\s]/g, "");
  }
  return value;
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

type DragMoveSnapshot = {
  deltaX: number;
  deltaY: number;
  activeData: DragData | undefined;
  initialRect: { left: number; top: number; width: number; height: number } | null;
  translatedRect: { left: number; top: number } | null;
};

type ButtonSliderDragInfo = {
  startX: number;
  currentX: number;
  signedDistance: number;
  increaseDirection: "left" | "right";
  buttonLeft: number;
  buttonWidth: number;
};

type PersistedEditorState = {
  items: CanvasItem[];
  aspectWidth: string;
  aspectHeight: string;
  backgroundImage: string | null;
  backgroundLocation?: string | null;
  scoutType?: ScoutType;
  postMatchQuestions?: PostMatchQuestion[];
  eventKey?: string;
  enableEventTimeTracking?: boolean;
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
  backgroundLocation: string | null;
  scoutType: ScoutType;
  postMatchQuestions: PostMatchQuestion[];
  eventKey: string;
  enableEventTimeTracking: boolean;
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
const createDisabledStageTag = () => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const suffix = Array.from({ length: 5 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
  return `TagDis-${suffix}`;
};
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
    kind === "slider" ||
    kind === "button-slider" ||
    kind === "movement" ||
    kind === "icon" ||
    kind === "mirror" ||
    kind === "swap" ||
    kind === "cover" ||
    kind === "start-position" ||
    kind === "input" ||
    kind === "team-select" ||
    kind === "match-select" ||
    kind === "toggle" ||
    kind === "auto-toggle" ||
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

    const loadedKind = normalizeLoadedItemKind(value.kind);
    const legacyDropdownMode =
      typeof value.dropdownAssetType === "string" ? value.dropdownAssetType : undefined;
    const resolvedKind: AssetKind =
      loadedKind === "team-select" && legacyDropdownMode === "match-select"
        ? "match-select"
        : loadedKind;

  return {
    ...(value as Omit<CanvasItem, "kind">),
      kind: resolvedKind,
      teamSelectLinkToStage:
        resolvedKind === "team-select"
          ? normalizeStageParentOption(value.teamSelectLinkToStage)
          : undefined,
      teamSelectAlwaysShowStagedElements:
        resolvedKind === "team-select"
          ? normalizeStageParentOption(value.teamSelectAlwaysShowStagedElements)
          : undefined,
      inputIsTextArea:
        resolvedKind === "input"
          ? normalizeStageParentOption(value.inputIsTextArea)
          : undefined,
      buttonPressMode:
        resolvedKind === "text" || resolvedKind === "icon"
          ? normalizeButtonPressMode(value.buttonPressMode)
          : undefined,
      buttonSliderIncreaseDirection:
        resolvedKind === "button-slider"
          ? normalizeButtonSliderIncreaseDirection(
              value.buttonSliderIncreaseDirection ?? value.buttonSliderDirection
            )
          : undefined,
      sliderMax:
        resolvedKind === "slider" &&
        typeof value.sliderMax === "number" &&
        Number.isFinite(value.sliderMax)
          ? Math.max(1, value.sliderMax)
          : resolvedKind === "slider"
            ? 100
            : undefined,
      sliderMid:
        resolvedKind === "slider" &&
        typeof value.sliderMid === "number" &&
        Number.isFinite(value.sliderMid)
          ? Math.max(0, value.sliderMid)
          : resolvedKind === "slider"
            ? 50
            : undefined,
      sliderLeftText:
        resolvedKind === "slider" && typeof value.sliderLeftText === "string"
          ? value.sliderLeftText
          : resolvedKind === "slider"
            ? "Low"
            : undefined,
      sliderRightText:
        resolvedKind === "slider" && typeof value.sliderRightText === "string"
          ? value.sliderRightText
          : resolvedKind === "slider"
            ? "High"
            : undefined,
      stageRemoveParentTag:
        isStageableRootItem({ ...(value as CanvasItem), kind: resolvedKind })
          ? normalizeStageParentOption(value.stageRemoveParentTag)
          : undefined,
      successTrackingEnabled:
        resolvedKind === "text" || resolvedKind === "icon"
          ? normalizeStageParentOption(value.successTrackingEnabled)
          : undefined,
      successPopoverOffsetX:
        (resolvedKind === "text" || resolvedKind === "icon") &&
        typeof value.successPopoverOffsetX === "number" &&
        Number.isFinite(value.successPopoverOffsetX)
          ? value.successPopoverOffsetX
          : undefined,
      successPopoverOffsetY:
        (resolvedKind === "text" || resolvedKind === "icon") &&
        typeof value.successPopoverOffsetY === "number" &&
        Number.isFinite(value.successPopoverOffsetY)
          ? value.successPopoverOffsetY
          : undefined,
      autoTeleopScope:
        value.autoTeleopScope === "auto" || value.autoTeleopScope === "teleop"
          ? value.autoTeleopScope
          : undefined,
      movementDirection:
        resolvedKind === "movement"
          ? normalizeMovementDirection(value.movementDirection ?? value.label)
          : undefined,
      stageHideAfterSelection:
        resolvedKind === "text" ||
        resolvedKind === "icon" ||
        resolvedKind === "movement"
          ? normalizeStageParentOption(value.stageHideAfterSelection)
          : undefined,
      stageBlurBackgroundOnClick:
        resolvedKind === "text" ||
        resolvedKind === "icon" ||
        resolvedKind === "movement"
          ? normalizeStageParentOption(value.stageBlurBackgroundOnClick)
          : undefined,
      stageHideOtherElementsInStage:
        resolvedKind === "text" ||
        resolvedKind === "icon" ||
        resolvedKind === "movement"
          ? normalizeStageParentOption(value.stageHideOtherElementsInStage)
          : undefined,
      matchSelectValue:
        resolvedKind === "match-select"
          ? clampMatchSelectValue(
              typeof value.matchSelectValue === "number" &&
                Number.isFinite(value.matchSelectValue)
                ? value.matchSelectValue
                : MATCH_SELECT_MIN_VALUE
            )
          : undefined,
      autoToggleTeleopDurationSeconds:
        resolvedKind === "auto-toggle" &&
        typeof value.autoToggleTeleopDurationSeconds === "number" &&
        Number.isFinite(value.autoToggleTeleopDurationSeconds)
          ? Math.max(0, value.autoToggleTeleopDurationSeconds)
          : resolvedKind === "auto-toggle"
            ? 135
            : undefined,
      toggleStyle:
        resolvedKind === "toggle" ? normalizeToggleStyle(value.toggleStyle) : undefined,
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
  const backgroundLocation =
    typeof source.backgroundLocation === "string" ? source.backgroundLocation : null;
  const scoutType = normalizeScoutType(source.scoutType);
  const postMatchQuestions = Array.isArray(source.postMatchQuestions)
    ? source.postMatchQuestions
        .filter((question): question is Record<string, unknown> => isRecord(question))
        .map((question, index) => ({
          id:
            typeof question.id === "string" && question.id.trim().length > 0
              ? question.id
              : `post-q-${index}`,
          text: typeof question.text === "string" ? question.text : "",
          type: (
            question.type === "slider" ||
            question.type === "all-that-apply" ||
            question.type === "single-select"
              ? question.type
              : "text"
          ) as PostMatchQuestionType,
          tag:
            typeof question.tag === "string" ? normalizeTag(question.tag) : "",
          options: Array.isArray(question.options)
            ? question.options
                .filter((entry): entry is string => typeof entry === "string")
                .map((entry) => entry.trim())
                .filter(Boolean)
            : [],
          sliderMin:
            typeof question.sliderMin === "number" && Number.isFinite(question.sliderMin)
              ? Math.round(question.sliderMin)
              : 0,
          sliderMax:
            typeof question.sliderMax === "number" && Number.isFinite(question.sliderMax)
              ? Math.round(question.sliderMax)
              : 10,
          sliderLeftText:
            typeof question.sliderLeftText === "string" ? question.sliderLeftText : "Low",
          sliderRightText:
            typeof question.sliderRightText === "string" ? question.sliderRightText : "High",
        }))
    : [];
  const eventKey = typeof source.eventKey === "string" ? source.eventKey : "";
  const enableEventTimeTracking = Boolean(source.enableEventTimeTracking ?? false);
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
    backgroundLocation,
    scoutType,
    postMatchQuestions,
    eventKey,
    enableEventTimeTracking,
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
        buttonSliderIncreaseDirection:
          item.kind === "button-slider"
            ? normalizeButtonSliderIncreaseDirection(item.buttonSliderIncreaseDirection)
            : undefined,
        sliderMax:
          item.kind === "slider"
            ? typeof item.sliderMax === "number" && Number.isFinite(item.sliderMax)
              ? Math.max(1, item.sliderMax)
              : 100
            : undefined,
        sliderMid:
          item.kind === "slider"
            ? typeof item.sliderMid === "number" && Number.isFinite(item.sliderMid)
              ? Math.max(0, item.sliderMid)
              : 50
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

  // Allow multiple IDs per tag for duplicate tags
  const tagToIds = new Map<string, string[]>();
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
      if (resolvedKind === "text" && tag) {
        if (!tagToIds.has(tag)) tagToIds.set(tag, []);
        tagToIds.get(tag)!.push(id);
      }
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
        buttonPressMode:
          resolvedKind === "text"
            ? normalizeButtonPressMode(data.pressMode)
            : undefined,
        stageHideAfterSelection:
          resolvedKind === "text"
            ? normalizeStageParentOption(data.hideAfterSelection)
            : undefined,
        stageBlurBackgroundOnClick:
          resolvedKind === "text"
            ? normalizeStageParentOption(data.blurBackgroundOnClick)
            : undefined,
        stageHideOtherElementsInStage:
          resolvedKind === "text"
            ? normalizeStageParentOption(
                data.hideOtherElementsInStage ?? data.hideAllOtherElementsInStage
              )
            : undefined,
        stageRemoveParentTag:
          resolvedKind === "text"
            ? normalizeStageParentOption(data.removeParentTag)
            : undefined,
        successTrackingEnabled:
          resolvedKind === "text"
            ? normalizeStageParentOption(data.trackSuccess)
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
      if (tag) {
        if (!tagToIds.has(tag)) tagToIds.set(tag, []);
        tagToIds.get(tag)!.push(id);
      }
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
        buttonPressMode: normalizeButtonPressMode(data.pressMode),
        stageHideAfterSelection: normalizeStageParentOption(data.hideAfterSelection),
        stageBlurBackgroundOnClick: normalizeStageParentOption(data.blurBackgroundOnClick),
        stageHideOtherElementsInStage: normalizeStageParentOption(
          data.hideOtherElementsInStage ?? data.hideAllOtherElementsInStage
        ),
        stageRemoveParentTag: normalizeStageParentOption(data.removeParentTag),
        successTrackingEnabled: normalizeStageParentOption(data.trackSuccess),
        tag,
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["button-slider"])) {
      const data = entry["button-slider"];
      const width = scaleWidth(data.width, BUTTON_SIZE.width);
      const height = scaleHeight(data.height, BUTTON_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const tag = readTag(data.tag);
      if (tag) {
        if (!tagToIds.has(tag)) tagToIds.set(tag, []);
        tagToIds.get(tag)!.push(id);
      }
      return {
        id,
        kind: "button-slider",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: typeof data.text === "string" ? data.text : "Button Slider",
        tag,
        iconName: typeof data.icon === "string" ? data.icon : undefined,
        outlineColor:
          typeof data.outline === "string" ? data.outline : undefined,
        fillColor: typeof data.fill === "string" ? data.fill : undefined,
        buttonSliderIncreaseDirection: normalizeButtonSliderIncreaseDirection(
          data.increaseDirection
        ),
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry.slider)) {
      const data = entry.slider;
      const width = scaleWidth(data.width, SLIDER_SIZE.width);
      const height = scaleHeight(data.height, SLIDER_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const tag = readTag(data.tag);
      if (tag) {
        if (!tagToIds.has(tag)) tagToIds.set(tag, []);
        tagToIds.get(tag)!.push(id);
      }
      return {
        id,
        kind: "slider",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: typeof data.label === "string" ? data.label : "Slider",
        tag,
        sliderMax:
          typeof data.max === "number" && Number.isFinite(data.max)
            ? Math.max(1, data.max)
            : 100,
        sliderMid:
          typeof data.mid === "number" && Number.isFinite(data.mid)
            ? Math.max(0, data.mid)
            : 50,
        sliderLeftText: typeof data.leftText === "string" ? data.leftText : "Low",
        sliderRightText: typeof data.rightText === "string" ? data.rightText : "High",
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["movement-button"])) {
      const data = entry["movement-button"];
      const width = scaleWidth(data.width, MOVEMENT_SIZE.width);
      const height = scaleHeight(data.height, MOVEMENT_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const tag = readTag(data.tag);
      if (tag) {
        if (!tagToIds.has(tag)) tagToIds.set(tag, []);
        tagToIds.get(tag)!.push(id);
      }
      registerStageLink(data.stageParentTag, id);
      return {
        id,
        kind: "movement",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: "Movement",
        movementDirection: normalizeMovementDirection(data.direction),
        tag,
        teamSide: toTeamSide(data.teamSide),
        stageHideAfterSelection: normalizeStageParentOption(data.hideAfterSelection),
        stageBlurBackgroundOnClick: normalizeStageParentOption(data.blurBackgroundOnClick),
      };
    }

    if (isRecord(entry["text-input"])) {
      const data = entry["text-input"];
      const width = scaleWidth(data.width, INPUT_SIZE.width);
      const height = scaleHeight(data.height, INPUT_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const tag = readTag(data.tag);
      if (tag) {
        if (!tagToIds.has(tag)) tagToIds.set(tag, []);
        tagToIds.get(tag)!.push(id);
      }
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
        inputValueMode: normalizeInputValueMode(
          data.inputValueMode ?? data.valueType
        ),
        inputIsTextArea: normalizeStageParentOption(data.multiline),
        tag,
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["team-select"])) {
      const data = entry["team-select"];
      const width = scaleWidth(data.width, TEAM_SELECT_SIZE.width);
      const height = scaleHeight(data.height, TEAM_SELECT_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const tag = readTag(data.tag);
      if (tag) {
        if (!tagToIds.has(tag)) tagToIds.set(tag, []);
        tagToIds.get(tag)!.push(id);
      }
      registerStageLink(data.stageParentTag, id);
      return {
        id,
        kind: "team-select",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: typeof data.label === "string" ? data.label : "Drop Down",
        teamSelectLinkToStage: normalizeStageParentOption(data.linkEachTeamToStage),
        teamSelectAlwaysShowStagedElements: normalizeStageParentOption(
          data.showStageWithoutSelection
        ),
        tag,
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["match-select"])) {
      const data = entry["match-select"];
      const width = scaleWidth(data.width, MATCH_SELECT_SIZE.width);
      const height = scaleHeight(data.height, MATCH_SELECT_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      const tag = readTag(data.tag);
      if (tag) {
        if (!tagToIds.has(tag)) tagToIds.set(tag, []);
        tagToIds.get(tag)!.push(id);
      }
      registerStageLink(data.stageParentTag, id);
      return {
        id,
        kind: "match-select",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: typeof data.label === "string" ? data.label : "Match Select",
        matchSelectValue: clampMatchSelectValue(
          readNumber(data.value, MATCH_SELECT_MIN_VALUE)
        ),
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
      if (tag) {
        if (!tagToIds.has(tag)) tagToIds.set(tag, []);
        tagToIds.get(tag)!.push(id);
      }
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
        toggleStyle: normalizeToggleStyle(data.style),
        toggleTextAlign: align,
        toggleTextSize: readNumber(data.textSize, 10),
        tag,
        teamSide: toTeamSide(data.teamSide),
      };
    }

    if (isRecord(entry["auto-toggle"])) {
      const data = entry["auto-toggle"];
      const width = scaleWidth(data.width, AUTO_TOGGLE_SIZE.width);
      const height = scaleHeight(data.height, AUTO_TOGGLE_SIZE.height);
      const centerItemX = scaleX(data.x);
      const centerItemY = scaleY(data.y);
      registerStageLink(data.stageParentTag, id);
      return {
        id,
        kind: "auto-toggle",
        x: centerItemX - width / 2,
        y: centerItemY - height / 2,
        width,
        height,
        label: typeof data.label === "string" ? data.label : "Auto Toggle",
        autoToggleMode: data.mode === "teleop" ? "teleop" : "auto",
        autoToggleDurationSeconds:
          typeof data.timerSeconds === "number" && Number.isFinite(data.timerSeconds)
            ? Math.max(0, data.timerSeconds)
            : 15,
        autoToggleTeleopDurationSeconds:
          typeof data.teleopTimerSeconds === "number" &&
          Number.isFinite(data.teleopTimerSeconds)
            ? Math.max(0, data.teleopTimerSeconds)
            : typeof data.teleopSeconds === "number" &&
                Number.isFinite(data.teleopSeconds)
              ? Math.max(0, data.teleopSeconds)
              : 135,
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
        coverVisible: data.visible !== false,
      };
    }

    if (isRecord(entry["start-position"])) {
      const data = entry["start-position"];
      const x1 = scaleX(data.x1);
      const y1 = scaleY(data.y1);
      const x2 = scaleX(data.x2);
      const y2 = scaleY(data.y2);
      registerStageLink(data.stageParentTag, id);
      return {
        id,
        kind: "start-position",
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.max(1, Math.abs(x2 - x1)),
        height: Math.max(1, Math.abs(y2 - y1)),
        label:
          typeof data.label === "string" && data.label.trim().length > 0
            ? data.label
            : "Start Position",
        tag: "",
        teamSide: toTeamSide(data.teamSide),
        startPositionVisible: data.visible !== false,
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
    const stageParentIds = tagToIds.get(pending.stageParentTag);
    if (!stageParentIds || stageParentIds.length === 0) {
      throw new Error(
        `Invalid stage relationship: parent tag \"${pending.stageParentTag}\" was not found.`
      );
    }
    // If multiple, link to the first for backward compatibility, or adjust as needed
    return {
      ...item,
      stageParentId: stageParentIds[0],
      stageParentIds,
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
    eventKey: typeof source?.eventKey === "string" ? source.eventKey : "",
    enableEventTimeTracking: Boolean(source?.enableEventTimeTracking ?? false),
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

function PaletteButtonSliderButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: "palette-button-slider",
      data: { type: "palette", assetKind: "button-slider" } satisfies DragData,
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
      onPointerDownCapture={(event) => onPalettePointerDown("button-slider", event)}
      {...attributes}
      {...listeners}
      type="button"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/20 text-violet-200">
        <span className="text-[10px] font-bold">±1</span>
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Button Slider</span>
        <span className="text-xs text-white/55">Drag to increment faster</span>
      </span>
    </Button>
  );
}

function PaletteSliderButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-slider",
    data: { type: "palette", assetKind: "slider" } satisfies DragData,
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
      onPointerDownCapture={(event) => onPalettePointerDown("slider", event)}
      {...attributes}
      {...listeners}
      type="button"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-200">
        <span className="text-[10px] font-semibold">SL</span>
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Slider</span>
        <span className="text-xs text-white/55">Drag thumb to set value</span>
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
      className="mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 bg-slate-900/70 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80"
      onPointerDownCapture={(event) => onPalettePointerDown("swap", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Swap side"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/20 text-blue-300">
        <span className="flex flex-col items-center justify-center leading-none">
          <ArrowRight className="h-3.5 w-3.5" />
          <ArrowLeft className="-mt-0.5 h-3.5 w-3.5" />
        </span>
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Swap Side</span>
        <span className="text-xs text-white/55">Switch active team side view</span>
      </span>
    </Button>
  );
}

function PaletteMovementButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-movement",
    data: { type: "palette", assetKind: "movement" } satisfies DragData,
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
      onPointerDownCapture={(event) => onPalettePointerDown("movement", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Movement"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-300">
        <span className="flex flex-col items-center justify-center leading-none">
          <ArrowLeft className="h-3.5 w-3.5" />
          <ArrowRight className="-mt-0.5 h-3.5 w-3.5" />
        </span>
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Movement</span>
        <span className="text-xs text-white/55">Toggles direction on click</span>
      </span>
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

function PaletteStartPositionButton({
  onPalettePointerDown,
  hasAsset,
  isVisible,
  onToggleVisibility,
}: PaletteButtonProps & {
  hasAsset: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-start-position",
    data: { type: "palette", assetKind: "start-position" } satisfies DragData,
    disabled: hasAsset,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className={`mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 bg-slate-900/70 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:bg-slate-800/80 ${
        hasAsset ? "opacity-85" : ""
      }`}
      onPointerDownCapture={(event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-start-position-visibility-toggle="true"]')) {
          return;
        }
        if (hasAsset) return;
        onPalettePointerDown("start-position", event);
      }}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Start position"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-teal-500/20 text-teal-200">
        <span className="h-2.5 w-2.5 rounded-full bg-current" />
        <span className="absolute h-5 w-5 rounded-full border border-current/70" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Start Position</span>
        <span className="text-xs text-white/55">
          {hasAsset ? "Only one allowed" : "Scout taps robot start point"}
        </span>
      </span>
      {hasAsset ? (
        <span
          data-start-position-visibility-toggle="true"
          role="switch"
          aria-checked={isVisible}
          aria-label={isVisible ? "Hide start position" : "Show start position"}
          tabIndex={0}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onToggleVisibility();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggleVisibility();
            }
          }}
        >
          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </span>
      ) : null}
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

function PaletteTeamSelectButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-team-select",
    data: { type: "palette", assetKind: "team-select" } satisfies DragData,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="mx-auto h-[58px] w-[calc(100%-8px)] justify-start gap-3 rounded-xl border-white/10 !bg-slate-900 px-3 text-left text-white transition-all duration-150 hover:border-white/20 hover:!bg-slate-800 disabled:opacity-100"
      onPointerDownCapture={(event) => onPalettePointerDown("team-select", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Drop down"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
        <ChevronDown className="h-4 w-4" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Drop Down</span>
        <span className="text-xs text-white/55">Team dropdown selector</span>
      </span>
    </Button>
  );
}

function PaletteMatchSelectButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-match-select",
    data: { type: "palette", assetKind: "match-select" } satisfies DragData,
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
      onPointerDownCapture={(event) => onPalettePointerDown("match-select", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Match select"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white text-[10px] font-bold">
        -/+ 
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Match Select</span>
        <span className="text-xs text-white/55">For match selecting</span>
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

function PaletteAutoToggleButton({ onPalettePointerDown }: PaletteButtonProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "palette-auto-toggle",
    data: { type: "palette", assetKind: "auto-toggle" } satisfies DragData,
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
      onPointerDownCapture={(event) => onPalettePointerDown("auto-toggle", event)}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="Auto toggle"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-200">
        <ToggleLeft className="h-4 w-4" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">Auto Toggle</span>
        <span className="text-xs text-white/55">Auto → Teleop with timer</span>
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
  onToggleMovementDirection,
  onPreviewButtonAction,
  onSelect,
  onPreviewPressStart,
  onPreviewPressEnd,
  onPreviewButtonSliderDragStart,
  onPreviewButtonSliderDragMove,
  onPreviewButtonSliderDragEnd,
  onPreviewSuccessToggle,
  onPreviewSuccessSelect,
  onSuccessContextAdjust,
  onPreviewStageToggle,
  onStageContextMenu,
  hasStages,
  isPreviewPressed,
  previewButtonSliderValue,
  previewButtonSliderDragInfo,
  previewSuccessOpen,
  isCustomSideLayoutsEnabled,
  visibleTeamSide,
  previewHoldDurationMs,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onEditLabel: (item: CanvasItem) => void;
  onSwapSides: () => void;
  onToggleMovementDirection: (itemId: string) => void;
  onPreviewButtonAction: (item: CanvasItem) => void;
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
  onPreviewPressStart: (item: CanvasItem) => void;
  onPreviewPressEnd: (itemId: string) => void;
  onPreviewButtonSliderDragStart: (
    item: CanvasItem,
    event: React.PointerEvent<HTMLButtonElement>
  ) => void;
  onPreviewButtonSliderDragMove: (itemId: string, clientX: number) => void;
  onPreviewButtonSliderDragEnd: (itemId: string) => void;
  onPreviewSuccessToggle: (itemId: string) => void;
  onPreviewSuccessSelect: (itemId: string, value: "success" | "fail") => void;
  onSuccessContextAdjust: (itemId: string) => void;
  onPreviewStageToggle: (itemId: string) => void;
  onStageContextMenu: (itemId: string) => void;
  hasStages: boolean;
  isPreviewPressed: boolean;
  previewButtonSliderValue?: number;
  previewButtonSliderDragInfo?: ButtonSliderDragInfo;
  previewSuccessOpen: boolean;
  isCustomSideLayoutsEnabled: boolean;
  visibleTeamSide: TeamSide;
  previewHoldDurationMs?: number;
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
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  const swapControlScale =
    item.kind === "swap" ? getWidgetScale(item, BUTTON_SIZE, 0.2, 2.1) : 1;
  const swapFontSize = Math.max(6, Math.round(14 * swapControlScale));
  const resolvedButtonSize =
    item.kind === "icon" ? "icon" : item.kind === "swap" ? "xs" : "default";

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
  const isHoldTimerVisible =
    isPreviewMode &&
    (item.kind === "text" || item.kind === "icon") &&
    normalizeButtonPressMode(item.buttonPressMode) === "hold" &&
    typeof previewHoldDurationMs === "number";
  const holdTimerLabel = (() => {
    const duration = Math.max(0, previewHoldDurationMs ?? 0);
    return (duration / 1000).toFixed(2);
  })();
  const hasButtonSliderValue =
    item.kind === "button-slider" && typeof previewButtonSliderValue === "number";
  const buttonSliderStartX =
    item.kind === "button-slider" && previewButtonSliderDragInfo
      ? previewButtonSliderDragInfo.startX - previewButtonSliderDragInfo.buttonLeft
      : 0;
  const buttonSliderCurrentX =
    item.kind === "button-slider" && previewButtonSliderDragInfo
      ? previewButtonSliderDragInfo.currentX - previewButtonSliderDragInfo.buttonLeft
      : 0;
  const buttonSliderMultiplier =
    item.kind === "button-slider" && previewButtonSliderDragInfo
      ? getButtonSliderMultiplier(previewButtonSliderDragInfo.signedDistance)
      : 0;

  return (
    <Button
      ref={setNodeRef}
      style={{
        ...style,
        fontSize: item.kind === "swap" ? swapFontSize : undefined,
      }}
      variant="outline"
      size={resolvedButtonSize}
      className={`group absolute rounded-lg ${swapOutlineClass} ${buttonToneClass} ${
        isPreviewMode ? "transition-all duration-150" : "!transition-none"
      } ${
        isPreviewMode && isPreviewPressed
          ? "scale-[0.97] ring-2 ring-sky-300/70 !bg-slate-800"
          : ""
      } ${
        item.kind === "swap"
          ? "px-2 leading-tight sm:px-2.5"
          : ""
      } ${item.kind === "button-slider" ? "overflow-visible" : ""}
      `}
      onPointerDownCapture={(event) => {
        if (!isPreviewMode) {
          onSelect(item.id, { append: event.button === 2 });
          return;
        }
        if (item.kind === "button-slider") {
          onPreviewButtonSliderDragStart(item, event);
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        onPreviewPressStart(item);
      }}
      onPointerMove={(event) => {
        if (!isPreviewMode || item.kind !== "button-slider") return;
        onPreviewButtonSliderDragMove(item.id, event.clientX);
      }}
      onPointerUp={() => {
        if (!isPreviewMode) return;
        if (item.kind === "button-slider") {
          onPreviewButtonSliderDragEnd(item.id);
        }
        onPreviewPressEnd(item.id);
      }}
      onPointerCancel={() => {
        if (!isPreviewMode) return;
        if (item.kind === "button-slider") {
          onPreviewButtonSliderDragEnd(item.id);
        }
        onPreviewPressEnd(item.id);
      }}
      onPointerLeave={() => {
        if (!isPreviewMode) return;
        if (item.kind === "button-slider") {
          onPreviewButtonSliderDragEnd(item.id);
        }
        onPreviewPressEnd(item.id);
      }}
      onClick={() => {
        if (!isPreviewMode) return;
        if (isActionButtonKind(item.kind)) {
          onPreviewButtonAction(item);
          return;
        }
        if (item.kind === "movement") {
          onToggleMovementDirection(item.id);
          onPreviewStageToggle(item.id);
          return;
        }
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
        if (item.kind === "swap" && isPreviewMode) {
          onSwapSides();
        }
      }}
      onDoubleClick={() => {
        if (isPreviewMode) return;
        if (item.kind === "icon") {
          onEditLabel(item);
        }
      }}
      onContextMenu={(event) => {
        if (isPreviewMode) return;
        event.preventDefault();
        onSelect(item.id, { append: true });
        if (item.kind === "swap") {
          onSwapSides();
          return;
        }
        if (
          (item.kind === "text" || item.kind === "icon") &&
          item.successTrackingEnabled
        ) {
          onSuccessContextAdjust(item.id);
          return;
        }
        if (!hasStages) return;
        onStageContextMenu(item.id);
      }}
      {...attributes}
      {...listeners}
      data-canvas-item="true"
      data-stage-root={hasStages ? "true" : undefined}
      type="button"
      aria-label={
        item.kind === "icon"
          ? item.label
          : item.kind === "movement"
            ? `Movement ${getMovementDirectionSymbol(
                normalizeMovementDirection(item.movementDirection ?? item.label)
              )}`
            : undefined
      }
    >
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
      ) : isHoldTimerVisible ? (
        <span className="truncate tabular-nums">{holdTimerLabel}</span>
      ) : isPreviewMode && item.kind === "button-slider" && hasButtonSliderValue ? (
        <span className="truncate tabular-nums">{previewButtonSliderValue ?? 0}</span>
      ) : item.kind === "icon" ? (
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
      ) : item.kind === "movement" ? (
        normalizeMovementDirection(item.movementDirection ?? item.label) === "right" ? (
          <ArrowRight className="h-5 w-5" />
        ) : (
          <ArrowLeft className="h-5 w-5" />
        )
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
      ) : item.kind === "button-slider" && item.iconName ? (
        (() => {
          const IconComponent = ICON_COMPONENTS[item.iconName ?? "Bot"] ?? Bot;
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
        <span className={item.kind === "swap" ? "truncate" : undefined}>{item.label}</span>
      )}
      {isPreviewMode && item.kind === "button-slider" && previewButtonSliderDragInfo ? (
        <>
          <span
            className="pointer-events-none absolute h-1.5 rounded-full bg-violet-300/90"
            style={{
              left: Math.min(buttonSliderStartX, buttonSliderCurrentX),
              width: Math.max(1, Math.abs(buttonSliderCurrentX - buttonSliderStartX)),
              top: item.height / 2 - 3,
            }}
          />
          <span
            className="pointer-events-none absolute h-3 w-3 rounded-full border border-violet-100/90 bg-violet-300/95"
            style={{
              left: buttonSliderCurrentX - 6,
              top: item.height / 2 - 6,
            }}
          />
          <span
            className="pointer-events-none absolute rounded bg-slate-950/90 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-violet-200"
            style={{
              left:
                (buttonSliderStartX + buttonSliderCurrentX) / 2,
              top: item.height / 2 - 26,
              transform: "translateX(-50%)",
            }}
          >
            {buttonSliderMultiplier <= 0
              ? "0x"
              : `${previewButtonSliderDragInfo.signedDistance > 0 ? "+" : "-"}${buttonSliderMultiplier.toFixed(1)}x`}
          </span>
        </>
      ) : null}
      {hasStages ? (
        <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-sky-300">
          <ChevronDown className="h-3 w-3" />
        </span>
      ) : null}
      {item.successTrackingEnabled ? (
        <span className="pointer-events-none absolute -left-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-900 text-emerald-200">
          <Check className="h-2.5 w-2.5" />
        </span>
      ) : null}
      {item.autoTeleopScope && !isPreviewMode ? (
        <span
          className={`pointer-events-none absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
            item.autoTeleopScope === "auto"
              ? "bg-amber-500/90 text-black"
              : "bg-cyan-500/90 text-black"
          }`}
        >
          {item.autoTeleopScope === "auto" ? "A" : "T"}
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
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
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
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="absolute"
      onPointerDownCapture={(event) => {
        if (isPreviewMode || event.button === 2) return;
        onSelect(item.id);
      }}
      onContextMenu={(event) => {
        if (isPreviewMode) return;
        event.preventDefault();
      }}
      {...attributes}
      {...listeners}
      data-canvas-item="true"
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
  onPreviewExitStage,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
  onPreviewExitStage: () => void;
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
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  const isCoverVisible = item.coverVisible !== false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute rounded-md border ${
        isPreviewMode || isCoverVisible
          ? "border-white/10 bg-slate-900 transition-all duration-150 ease-out"
          : "border-dashed border-white/35 bg-white/5 !transition-none"
      }`}
      onPointerDownCapture={(event) => {
        if (isPreviewMode) {
          onPreviewExitStage();
          return;
        }
        if (event.button === 2) return;
        onSelect(item.id);
      }}
      onContextMenu={(event) => {
        if (isPreviewMode) return;
        event.preventDefault();
      }}
      {...attributes}
      {...listeners}
      data-canvas-item="true"
      data-canvas-kind="cover"
    >
      {!isPreviewMode ? (
        <>
          {!isCoverVisible ? (
            <div className="pointer-events-none flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-white/60">
              Cover hidden
            </div>
          ) : null}
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

function CanvasStartPosition({
  item,
  onResizeStart,
  onSelect,
  onPreviewTap,
  previewPosition,
  isPreviewHidden,
  visibleTeamSide,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
  onPreviewTap: (item: CanvasItem, xRatio: number, yRatio: number) => void;
  previewPosition?: { xRatio: number; yRatio: number };
  isPreviewHidden?: boolean;
  visibleTeamSide: TeamSide;
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
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  const isStartPositionVisible = item.startPositionVisible !== false;

  if (!isPreviewMode && !isStartPositionVisible) {
    return null;
  }

  if (isPreviewMode && isPreviewHidden) {
    return null;
  }

  const markerTeamSide = item.teamSide ?? visibleTeamSide;
  const isRedSide = markerTeamSide === "red";
  const zoneClassName = isPreviewMode
    ? isRedSide
      ? "cursor-crosshair border-red-300/45 bg-red-500/10"
      : "cursor-crosshair border-blue-300/45 bg-blue-500/10"
    : isRedSide
      ? "border-dashed border-red-300/40 bg-red-400/5"
      : "border-dashed border-blue-300/40 bg-blue-400/5";
  const helperTextClassName = isRedSide ? "text-red-100/75" : "text-blue-100/75";
  const tapHintClassName = isRedSide ? "text-red-100/90" : "text-blue-100/90";
  const pulseClassName = isRedSide
    ? "border-red-200/65"
    : "border-blue-200/65";
  const outerRingClassName = isRedSide
    ? "border-red-100/55"
    : "border-blue-100/55";
  const centerDotClassName = isRedSide ? "bg-red-300" : "bg-blue-300";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute rounded-md border ${zoneClassName}`}
      onPointerDownCapture={(event) => {
        if (isPreviewMode) {
          const rect = event.currentTarget.getBoundingClientRect();
          const xRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          const yRatio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
          onPreviewTap(item, xRatio, yRatio);
          event.stopPropagation();
          return;
        }
        if (event.button === 2) return;
        onSelect(item.id);
      }}
      onContextMenu={(event) => {
        if (isPreviewMode) return;
        event.preventDefault();
      }}
      {...attributes}
      {...listeners}
      data-canvas-item="true"
      data-canvas-kind="start-position"
    >
      {!isPreviewMode ? (
        <>
          <div
            className={`pointer-events-none flex h-full w-full items-center justify-center text-xs uppercase tracking-wide ${helperTextClassName}`}
          >
            Tap zone for robot start
          </div>
          <span
            role="presentation"
            onPointerDown={(event) => onResizeStart(event, item)}
            className="absolute bottom-1 right-1 hidden h-3 w-3 cursor-se-resize rounded-sm border border-white/60 bg-white/80 group-hover:block"
          />
        </>
      ) : previewPosition ? (
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${previewPosition.xRatio * 100}%`,
            top: `${previewPosition.yRatio * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className={`absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-ping ${pulseClassName}`}
          />
          <span
            className={`absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border ${outerRingClassName}`}
          />
          <span
            className={`absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 ${centerDotClassName}`}
          />
        </div>
      ) : (
        <div
          className={`pointer-events-none flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-wide ${tapHintClassName}`}
        >
          Tap to mark start
        </div>
      )}
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
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
  previewValue: string;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: Boolean(isPreviewMode),
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const inputValueMode = normalizeInputValueMode(item.inputValueMode);
  const normalizedPreviewValue = sanitizeInputValueByMode(previewValue, inputValueMode);
  const isTextArea = item.inputIsTextArea === true;

  const style: React.CSSProperties = {
    transform: toDragTransform(true, transform, snapOffset),
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute flex flex-col gap-2 ${
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
      onClick={() => {
        if (isPreviewMode) return;
      }}
      onDoubleClick={() => {
        if (isPreviewMode) return;
        onEditInput(item);
      }}
      {...attributes}
      {...listeners}
      data-canvas-item="true"
    >
      <Label className="text-xs text-white/80">{item.label}</Label>
      {isTextArea ? (
        <textarea
          value={isPreviewMode ? normalizedPreviewValue : ""}
          placeholder={item.placeholder ?? "Enter text"}
          className="h-full min-h-0 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base text-white shadow-xs placeholder:text-white/45 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          readOnly={!isPreviewMode}
          onChange={(event) => {
            if (!isPreviewMode) return;
            onPreviewValueChange(
              item,
              sanitizeInputValueByMode(event.target.value, inputValueMode)
            );
          }}
        />
      ) : (
        <Input
          value={isPreviewMode ? normalizedPreviewValue : ""}
          placeholder={item.placeholder ?? "Enter text"}
          inputMode={inputValueMode === "numbers" ? "numeric" : "text"}
          className="h-full"
          readOnly={!isPreviewMode}
          onChange={(event) => {
            if (!isPreviewMode) return;
            onPreviewValueChange(
              item,
              sanitizeInputValueByMode(event.target.value, inputValueMode)
            );
          }}
        />
      )}
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

function CanvasTeamSelect({
  item,
  onResizeStart,
  onPreviewValueChange,
  onSelect,
  onStageContextMenu,
  hasStages,
  previewValue,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onPreviewValueChange: (item: CanvasItem, value: string) => void;
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
  onStageContextMenu: (itemId: string) => void;
  hasStages: boolean;
  previewValue: string;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: Boolean(isPreviewMode),
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const [open, setOpen] = React.useState(false);
  const controlScale = getWidgetScale(item, TEAM_SELECT_SIZE, 0.2, 2.2);
  const triggerFontSize = Math.max(7, Math.round(14 * controlScale));
  const triggerIconSize = Math.max(8, Math.round(16 * controlScale));
  const selectedValue = previewValue || getDefaultTeamSelectOptionValue();
  const selectedOption = getTeamSelectOption(selectedValue);

  const style: React.CSSProperties = {
    transform: toDragTransform(true, transform, snapOffset),
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute ${
        isPreviewMode ? "transition-all duration-150 ease-out" : "!transition-none"
      }`}
      onPointerDownCapture={(event) => {
        if (!isPreviewMode) onSelect(item.id, { append: event.button === 2 });
      }}
      onContextMenu={(event) => {
        if (isPreviewMode) return;
        event.preventDefault();
        onSelect(item.id, { append: true });
        if (hasStages) {
          onStageContextMenu(item.id);
        }
      }}
      {...attributes}
      {...listeners}
      data-canvas-item="true"
      data-stage-root={hasStages ? "true" : undefined}
    >
      <DropdownMenu
        open={isPreviewMode ? open : false}
        onOpenChange={(nextOpen) => {
          if (!isPreviewMode) return;
          setOpen(nextOpen);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className={`!h-full min-h-0 w-full justify-between rounded-md border px-1 text-white disabled:opacity-100 ${
              selectedOption?.value.startsWith("b")
                ? "border-blue-400/35 !bg-blue-950/55 hover:!bg-blue-900/60"
                : "border-red-400/35 !bg-red-950/55 hover:!bg-red-900/60"
            }`}
            style={{ fontSize: triggerFontSize }}
            disabled={!isPreviewMode}
          >
            <span className="truncate font-semibold">{selectedOption?.label ?? "B1"}</span>
            <ChevronDown
              className="shrink-0 opacity-70"
              style={{ width: triggerIconSize, height: triggerIconSize }}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-48 border-white/15 bg-slate-900 text-white"
        >
          <RadioGroup
            value={selectedValue}
            onValueChange={(value) => {
              if (!isPreviewMode) return;
              onPreviewValueChange(item, value);
            }}
            className="grid gap-2"
          >
            {TEAM_SELECT_OPTIONS.map((option) => (
              <Label
                key={option.value}
                htmlFor={`${item.id}-${option.value}`}
                className={`flex cursor-pointer items-center gap-2 rounded-sm border px-2 py-1 text-sm hover:bg-white/10 ${option.chipClassName}`}
              >
                <RadioGroupItem id={`${item.id}-${option.value}`} value={option.value} />
                {option.label}
              </Label>
            ))}
          </RadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {hasStages ? (
        <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-sky-300">
          <ChevronDown className="h-3 w-3" />
        </span>
      ) : null}
      {item.autoTeleopScope && !isPreviewMode ? (
        <span
          className={`pointer-events-none absolute -top-1 left-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
            item.autoTeleopScope === "auto"
              ? "bg-amber-500/90 text-black"
              : "bg-cyan-500/90 text-black"
          }`}
        >
          {item.autoTeleopScope === "auto" ? "A" : "T"}
        </span>
      ) : null}
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

function CanvasMatchSelect({
  item,
  onResizeStart,
  onPreviewValueChange,
  onSelect,
  previewValue,
  snapOffset,
  isPreviewMode,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onPreviewValueChange: (item: CanvasItem, value: number) => void;
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
  previewValue: number;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    disabled: Boolean(isPreviewMode),
    data: { type: "canvas", itemId: item.id } satisfies DragData,
  });

  const currentValue = clampMatchSelectValue(previewValue || MATCH_SELECT_MIN_VALUE);
  const controlScale = getWidgetScale(item, MATCH_SELECT_SIZE, 0.16, 2.1);
  const labelFontSize = Math.max(6, Math.round(12 * controlScale));
  const labelOffset = Math.max(6, Math.round(20 * controlScale));
  const buttonFontSize = Math.max(6, Math.round(14 * controlScale));
  const valueFontSize = Math.max(6, Math.round(14 * controlScale));
  const containerPadding = Math.max(0, Math.round(4 * controlScale));
  const containerGap = Math.max(0, Math.round(4 * controlScale));

  const style: React.CSSProperties = {
    transform: toDragTransform(true, transform, snapOffset),
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute ${
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
      <Label
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-white/80"
        style={{ top: -labelOffset, fontSize: labelFontSize }}
      >
        {item.label || "Match Select"}
      </Label>
      <div
        className="grid h-full w-full grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] rounded-md border border-white/20 bg-slate-900/90"
        style={{ gap: containerGap, padding: containerPadding }}
      >
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="!h-full min-h-0 min-w-0 border-white/20 bg-slate-900 px-0 text-white hover:bg-slate-800 disabled:opacity-60"
          style={{ fontSize: buttonFontSize }}
          onClick={() => onPreviewValueChange(item, currentValue - 1)}
          disabled={!isPreviewMode}
        >
          -
        </Button>
        <div
          className="flex min-w-0 items-center justify-center rounded-sm border border-white/15 bg-slate-950 font-semibold text-white"
          style={{ fontSize: valueFontSize }}
        >
          {currentValue}
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="!h-full min-h-0 min-w-0 border-white/20 bg-slate-900 px-0 text-white hover:bg-slate-800 disabled:opacity-60"
          style={{ fontSize: buttonFontSize }}
          onClick={() => onPreviewValueChange(item, currentValue + 1)}
          disabled={!isPreviewMode}
        >
          +
        </Button>
      </div>
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
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
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
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
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
      <div className="h-full overflow-auto rounded border border-white/10 bg-slate-950/90 p-2 text-[11px] leading-snug text-white/80">
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

  const style: React.CSSProperties = {
    transform: toDragTransform(true, transform, snapOffset),
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
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
  isSwapMirrored,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
  onToggle: (itemId: string) => void;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
  isSwapMirrored?: boolean;
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
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  const isOn = Boolean(item.toggleOn);
  const toggleStyle = normalizeToggleStyle(item.toggleStyle);
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
  const boxPixelSize = Math.max(12, Math.round(18 * switchScale));
  const boxIconSize = Math.max(9, Math.round(12 * switchScale));
  const resolvedTextSize = Math.max(6, textSize * switchScale);
  const toggleGap = Math.max(2, Math.round(8 * switchScale));

  const switchControl = (
    <div
      className="flex flex-none items-center justify-center"
      style={{
        width: switchPixelWidth,
        height: switchPixelHeight,
        transform: isSwapMirrored
          ? `scaleX(-1) scale(${switchScale})`
          : `scale(${switchScale})`,
        transformOrigin: "center center",
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
  );

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute ${
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
      <div
        className="flex h-full w-full items-center overflow-visible"
        style={{
          gap: toggleGap,
          transform: isSwapMirrored ? "scaleX(-1)" : undefined,
          transformOrigin: "center center",
        }}
      >
        {toggleStyle === "box" ? boxControl : switchControl}
        {showLabel ? (
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
        ) : null}
      </div>
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

function CanvasAutoToggle({
  item,
  onResizeStart,
  onSelect,
  onToggle,
  onContextSwapVisibility,
  visibilityMode,
  countdownSeconds,
  snapOffset,
  isPreviewMode,
  isSwapMirrored,
}: {
  item: CanvasItem;
  onResizeStart: (event: React.PointerEvent, item: CanvasItem) => void;
  onSelect: (itemId: string, options?: { append?: boolean }) => void;
  onToggle: (itemId: string) => void;
  onContextSwapVisibility: () => void;
  visibilityMode?: AutoTeleopScope | null;
  countdownSeconds?: number;
  snapOffset?: { x: number; y: number };
  isPreviewMode?: boolean;
  isSwapMirrored?: boolean;
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
    transition: isPreviewMode ? undefined : "none",
    willChange: "transform",
  };

  const mode = item.autoToggleMode ?? "auto";
  const displayMode = !isPreviewMode && visibilityMode ? visibilityMode : mode;
  const controlScale = getWidgetScale(item, AUTO_TOGGLE_SIZE, 0.2, 2.1);
  const textSize = Math.max(6, Math.round(12 * controlScale));
  const groupGap = Math.max(0, Math.round(4 * controlScale));
  const groupPadding = Math.max(0, Math.round(4 * controlScale));
  const autoLabel =
    displayMode === "auto" && mode === "auto" && typeof countdownSeconds === "number"
      ? `${Math.max(0, countdownSeconds)}s`
      : "Auto";
  const orderedModes = isSwapMirrored
    ? (["teleop", "auto"] as const)
    : (["auto", "teleop"] as const);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute ${
        isPreviewMode ? "transition-all duration-150 ease-out" : "!transition-none"
      }`}
      onPointerDownCapture={(event) => {
        if (!isPreviewMode) onSelect(item.id, { append: event.button === 2 });
      }}
      onContextMenu={(event) => {
        if (isPreviewMode) return;
        event.preventDefault();
        onSelect(item.id, { append: true });
        onContextSwapVisibility();
      }}
      onClick={() => {
        if (isPreviewMode) {
          onToggle(item.id);
        }
      }}
      {...attributes}
      {...listeners}
      data-canvas-item="true"
    >
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

const areButtonSliderDragInfosEqual = (
  prev: ButtonSliderDragInfo | undefined,
  next: ButtonSliderDragInfo | undefined
) => {
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  return (
    prev.startX === next.startX &&
    prev.currentX === next.currentX &&
    prev.signedDistance === next.signedDistance &&
    prev.increaseDirection === next.increaseDirection &&
    prev.buttonLeft === next.buttonLeft &&
    prev.buttonWidth === next.buttonWidth
  );
};

const MemoCanvasButton = React.memo(
  CanvasButton,
  (prev, next) =>
    prev.item === next.item &&
    prev.hasStages === next.hasStages &&
    prev.onStageContextMenu === next.onStageContextMenu &&
    prev.isPreviewPressed === next.isPreviewPressed &&
    prev.previewButtonSliderValue === next.previewButtonSliderValue &&
    prev.previewSuccessOpen === next.previewSuccessOpen &&
    areButtonSliderDragInfosEqual(
      prev.previewButtonSliderDragInfo,
      next.previewButtonSliderDragInfo
    ) &&
    prev.previewHoldDurationMs === next.previewHoldDurationMs &&
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
const MemoCanvasStartPosition = React.memo(
  CanvasStartPosition,
  (prev, next) =>
    prev.item === next.item &&
    prev.previewPosition?.xRatio === next.previewPosition?.xRatio &&
    prev.previewPosition?.yRatio === next.previewPosition?.yRatio &&
    prev.isPreviewHidden === next.isPreviewHidden &&
    prev.visibleTeamSide === next.visibleTeamSide &&
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
const MemoCanvasTeamSelect = React.memo(
  CanvasTeamSelect,
  (prev, next) =>
    prev.item === next.item &&
    prev.previewValue === next.previewValue &&
    prev.isPreviewMode === next.isPreviewMode &&
    areSnapOffsetsEqual(prev.snapOffset, next.snapOffset)
);
const MemoCanvasMatchSelect = React.memo(
  CanvasMatchSelect,
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
const MemoCanvasSlider = React.memo(
  CanvasSlider,
  (prev, next) =>
    prev.item === next.item &&
    prev.previewValue === next.previewValue &&
    prev.isPreviewMode === next.isPreviewMode &&
    areSnapOffsetsEqual(prev.snapOffset, next.snapOffset)
);
const MemoCanvasToggle = React.memo(
  CanvasToggle,
  (prev, next) =>
    prev.item === next.item &&
    prev.isSwapMirrored === next.isSwapMirrored &&
    prev.isPreviewMode === next.isPreviewMode &&
    areSnapOffsetsEqual(prev.snapOffset, next.snapOffset)
);
const MemoCanvasAutoToggle = React.memo(
  CanvasAutoToggle,
  (prev, next) =>
    prev.item === next.item &&
    prev.onContextSwapVisibility === next.onContextSwapVisibility &&
    prev.isSwapMirrored === next.isSwapMirrored &&
    prev.countdownSeconds === next.countdownSeconds &&
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
  const [assetSearch, setAssetSearch] = React.useState("");
  const [showIconGrid, setShowIconGrid] = React.useState(false);
  const [outlineDraft, setOutlineDraft] = React.useState("#ffffff");
  const [fillDraft, setFillDraft] = React.useState("transparent");
  const [iconTagDraft, setIconTagDraft] = React.useState("");
  const [aspectWidth, setAspectWidth] = React.useState("16");
  const [aspectHeight, setAspectHeight] = React.useState("9");
  const [aspectWidthDraft, setAspectWidthDraft] = React.useState("16");
  const [aspectHeightDraft, setAspectHeightDraft] = React.useState("9");
  const [eventKey, setEventKey] = React.useState("");
  const [eventKeyDraft, setEventKeyDraft] = React.useState("");
  const [enableEventTimeTracking, setEnableEventTimeTracking] = React.useState(false);
  const [enableEventTimeTrackingDraft, setEnableEventTimeTrackingDraft] =
    React.useState(false);
  const [scoutType, setScoutType] = React.useState<ScoutType>("match");
  const [postMatchQuestions, setPostMatchQuestions] = React.useState<PostMatchQuestion[]>(
    []
  );
  const [backgroundLocation, setBackgroundLocation] = React.useState<string | null>(null);
  const [isAlignmentAssistEnabled, setIsAlignmentAssistEnabled] =
    React.useState(true);
  const [isAssetsPanelHidden, setIsAssetsPanelHidden] = React.useState(false);
  const assetsPanelScalePendingRef = React.useRef<{
    baseWidth: number;
    baseHeight: number;
    targetHidden: boolean;
  } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);
  const [isPreviewSwapMirrored, setIsPreviewSwapMirrored] = React.useState(false);
  const [previewBaseStageSize, setPreviewBaseStageSize] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
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
  const [previewHoldDurationsById, setPreviewHoldDurationsById] = React.useState<
    Record<string, number>
  >({});
  const previewHoldStartByIdRef = React.useRef<Record<string, number>>({});
  const previewHoldIntervalRef = React.useRef<number | null>(null);
  const [previewInputValues, setPreviewInputValues] = React.useState<
    Record<string, string>
  >({});
  const [previewTeamSelectValues, setPreviewTeamSelectValues] = React.useState<
    Record<string, string>
  >({});
  const [previewMatchSelectValues, setPreviewMatchSelectValues] = React.useState<
    Record<string, number>
  >({});
  const [previewButtonSliderValues, setPreviewButtonSliderValues] = React.useState<
    Record<string, number>
  >({});
  const [previewSliderValues, setPreviewSliderValues] = React.useState<
    Record<string, number>
  >({});
  const [autoTeleopScopedEditMode, setAutoTeleopScopedEditMode] = React.useState<
    AutoTeleopScope | null
  >(null);
  const [autoTeleopVisibilityMode, setAutoTeleopVisibilityMode] = React.useState<
    AutoTeleopScope | null
  >(null);
  const [previewSuccessOpenItemId, setPreviewSuccessOpenItemId] = React.useState<string | null>(
    null
  );
  const [previewButtonSliderDragById, setPreviewButtonSliderDragById] = React.useState<
    Record<string, ButtonSliderDragInfo>
  >({});
  const [previewStartPositions, setPreviewStartPositions] = React.useState<
    Record<string, { xRatio: number; yRatio: number }>
  >({});
  const [hiddenPreviewStartPositionIds, setHiddenPreviewStartPositionIds] = React.useState<
    Record<string, true>
  >({});
  const [autoToggleCountdowns, setAutoToggleCountdowns] = React.useState<
    Record<string, number>
  >({});
  const [previewLogText, setPreviewLogText] = React.useState("");
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);
  const [isMassSelectionActive, setIsMassSelectionActive] =
    React.useState(false);
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
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = React.useState(false);
  const [backgroundPresets, setBackgroundPresets] = React.useState<FieldBackgroundOption[]>(
    [NO_BACKGROUND_OPTION]
  );
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [isDisableCustomSideDialogOpen, setIsDisableCustomSideDialogOpen] =
    React.useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = React.useState(false);
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
    isPublic: boolean;
    scoutType?: ScoutType;
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
  const previewBaseStageSizeRef = React.useRef<{ width: number; height: number } | null>(
    null
  );
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
  const dragSelectionIdsRef = React.useRef<string[]>([]);
  const flushDragRafRef = React.useRef<number | null>(null);
  const lastDragMoveAtRef = React.useRef(0);
  const autoToggleTimeoutsRef = React.useRef<Record<string, number>>({});
  const autoToggleIntervalsRef = React.useRef<Record<string, number>>({});
  const previewButtonSliderTimeoutsRef = React.useRef<Record<string, number>>({});
  const previewButtonSliderDragByIdRef = React.useRef<Record<string, ButtonSliderDragInfo>>(
    {}
  );
  const isSwapMirroredRef = React.useRef(false);

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
  const projectContentHash = projectMeta?.contentHash?.trim() ?? "";
  const canShowQrButton = isProjectCompleted && projectContentHash.length > 0;
  const qrCodeUrl = React.useMemo(() => {
    if (!projectContentHash) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      projectContentHash
    )}`;
  }, [projectContentHash]);

  const currentVisibleTeamSide = isPreviewMode ? previewTeamSide : editorTeamSide;

  const activeAutoTeleopMode = React.useMemo<AutoTeleopScope>(() => {
    const toggle = items.find((item) => item.kind === "auto-toggle");
    return toggle?.autoToggleMode === "teleop" ? "teleop" : "auto";
  }, [items]);

  const selectedPresetBackground = React.useMemo(
    () =>
      backgroundPresets.find(
        (entry) => entry.key === (backgroundLocation ?? "none")
      ) ?? NO_BACKGROUND_OPTION,
    [backgroundLocation, backgroundPresets]
  );

  React.useEffect(() => {
    let cancelled = false;

    const loadFieldBackgrounds = async () => {
      try {
        const response = await fetch("/api/field-backgrounds");
        if (!response.ok) return;
        const body = (await response.json()) as {
          backgrounds?: Array<{ key: string; name: string; imageUrl: string }>;
        };
        if (!Array.isArray(body.backgrounds) || cancelled) return;

        const normalized = body.backgrounds
          .filter((entry) =>
            typeof entry?.key === "string" &&
            typeof entry?.name === "string" &&
            typeof entry?.imageUrl === "string"
          )
          .map((entry) => ({
            key: entry.key,
            name: entry.name,
            imageUrl: entry.imageUrl,
          }));

        setBackgroundPresets([NO_BACKGROUND_OPTION, ...normalized]);
      } catch {
        if (!cancelled) {
          setBackgroundPresets([NO_BACKGROUND_OPTION]);
        }
      }
    };

    void loadFieldBackgrounds();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveAutoTeleopVisibilityMode: AutoTeleopScope | null =
    isPreviewMode ? activeAutoTeleopMode : autoTeleopVisibilityMode;

  const sideScopedItems = React.useMemo(() => {
    const sideFiltered = isCustomSideLayoutsEnabled
      ? items.filter((item) => {
          if (item.kind === "mirror") return true;
          return item.teamSide === currentVisibleTeamSide;
        })
      : items;

    if (!effectiveAutoTeleopVisibilityMode) {
      return sideFiltered;
    }

    return sideFiltered.filter((item) => {
      if (item.kind === "mirror") return true;
      if (!item.autoTeleopScope) return true;
      return item.autoTeleopScope === effectiveAutoTeleopVisibilityMode;
    });
  }, [
    currentVisibleTeamSide,
    effectiveAutoTeleopVisibilityMode,
    isCustomSideLayoutsEnabled,
    items,
  ]);

  const startPositionItem = React.useMemo(
    () => items.find((item) => item.kind === "start-position") ?? null,
    [items]
  );
  const hasStartPositionAsset = Boolean(startPositionItem);
  const isStartPositionAssetVisible = startPositionItem?.startPositionVisible !== false;

  const assetSearchQuery = assetSearch.trim().toLowerCase();
  const matchesAssetSearch = React.useCallback(
    (keywords: string[]) =>
      assetSearchQuery.length === 0 ||
      keywords.some((keyword) => keyword.toLowerCase().includes(assetSearchQuery)),
    [assetSearchQuery]
  );

  const isAssetAllowedForScoutType = React.useCallback(
    (kind: AssetKind) => SCOUT_TYPE_ALLOWED_ASSETS[scoutType].includes(kind),
    [scoutType]
  );

  const clearAutoToggleTimer = React.useCallback((itemId: string) => {
    const timeoutId = autoToggleTimeoutsRef.current[itemId];
    if (typeof timeoutId === "number") {
      window.clearTimeout(timeoutId);
      delete autoToggleTimeoutsRef.current[itemId];
    }
    const intervalId = autoToggleIntervalsRef.current[itemId];
    if (typeof intervalId === "number") {
      window.clearInterval(intervalId);
      delete autoToggleIntervalsRef.current[itemId];
    }
    setAutoToggleCountdowns((prev) => {
      if (!(itemId in prev)) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const clearPreviewButtonSliderLoop = React.useCallback((itemId: string) => {
    const timeoutId = previewButtonSliderTimeoutsRef.current[itemId];
    if (typeof timeoutId === "number") {
      window.clearTimeout(timeoutId);
      delete previewButtonSliderTimeoutsRef.current[itemId];
    }

    if (previewButtonSliderDragByIdRef.current[itemId]) {
      const next = { ...previewButtonSliderDragByIdRef.current };
      delete next[itemId];
      previewButtonSliderDragByIdRef.current = next;
    }

    setPreviewButtonSliderDragById((prev) => {
      if (!(itemId in prev)) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const clearAllPreviewButtonSliderLoops = React.useCallback(() => {
    Object.values(previewButtonSliderTimeoutsRef.current).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    previewButtonSliderTimeoutsRef.current = {};
    previewButtonSliderDragByIdRef.current = {};
    setPreviewButtonSliderDragById({});
  }, []);

  const schedulePreviewButtonSliderTick = React.useCallback((itemId: string) => {
    const activeDrag = previewButtonSliderDragByIdRef.current[itemId];
    if (!activeDrag) return;

    const signedDistance = activeDrag.signedDistance;
    if (Math.abs(signedDistance) < BUTTON_SLIDER_DRAG_DEADZONE_PX) {
      const timeoutId = previewButtonSliderTimeoutsRef.current[itemId];
      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
        delete previewButtonSliderTimeoutsRef.current[itemId];
      }
      return;
    }

    const delayMs = getButtonSliderTickDelayMs(Math.abs(signedDistance));

    previewButtonSliderTimeoutsRef.current[itemId] = window.setTimeout(() => {
      const nextDrag = previewButtonSliderDragByIdRef.current[itemId];
      if (!nextDrag) return;

      const nextSignedDistance = nextDrag.signedDistance;
      if (Math.abs(nextSignedDistance) < BUTTON_SLIDER_DRAG_DEADZONE_PX) {
        delete previewButtonSliderTimeoutsRef.current[itemId];
        return;
      }

      const rightShouldIncrease = nextDrag.increaseDirection === "right";
      const isDraggingRight = nextSignedDistance > 0;
      const delta = isDraggingRight === rightShouldIncrease ? 1 : -1;

      setPreviewButtonSliderValues((prev) => ({
        ...prev,
        [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta),
      }));

      schedulePreviewButtonSliderTick(itemId);
    }, delayMs);
  }, []);

  React.useEffect(() => {
    return () => {
      Object.values(autoToggleTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      Object.values(autoToggleIntervalsRef.current).forEach((intervalId) => {
        window.clearInterval(intervalId);
      });
      autoToggleTimeoutsRef.current = {};
      autoToggleIntervalsRef.current = {};
      clearAllPreviewButtonSliderLoops();
    };
  }, [clearAllPreviewButtonSliderLoops]);

  React.useEffect(() => {
    const existingIds = new Set(items.map((item) => item.id));
    Object.keys(autoToggleIntervalsRef.current).forEach((itemId) => {
      if (!existingIds.has(itemId)) {
        clearAutoToggleTimer(itemId);
      }
    });
    Object.keys(previewButtonSliderTimeoutsRef.current).forEach((itemId) => {
      if (!existingIds.has(itemId)) {
        clearPreviewButtonSliderLoop(itemId);
      }
    });
  }, [clearAutoToggleTimer, clearPreviewButtonSliderLoop, items]);

  React.useEffect(() => {
    setItems((prev) => {
      const firstMovement = prev.find((item) => item.kind === "movement");
      if (!firstMovement) return prev;
      const syncedDirection = normalizeMovementDirection(
        firstMovement.movementDirection ?? firstMovement.label
      );
      const hasMismatch = prev.some(
        (item) =>
          item.kind === "movement" &&
          normalizeMovementDirection(item.movementDirection ?? item.label) !==
            syncedDirection
      );
      if (!hasMismatch) return prev;

      return prev.map((item) =>
        item.kind === "movement"
          ? {
              ...item,
              movementDirection: syncedDirection,
            }
          : item
      );
    });
  }, [items]);

  const visibleItems = React.useMemo(() => {
    if (stagingParentId) {
      const stageRoot = sideScopedItems.find((item) => item.id === stagingParentId);
      const hideStageRoot = Boolean(stageRoot?.stageHideAfterSelection);
      const hideOtherElements = Boolean(stageRoot?.stageHideOtherElementsInStage);

      if (hideOtherElements) {
        return sideScopedItems.filter(
          (item) =>
            item.stageParentId === stagingParentId ||
            (!hideStageRoot && item.id === stagingParentId)
        );
      }

      return sideScopedItems.filter((item) => {
        if (item.stageParentId === stagingParentId) return true;
        if (item.id === stagingParentId) return !hideStageRoot;
        return !item.stageParentId;
      });
    }

    if (isPreviewMode && previewStageParentId) {
      const stageRoot = sideScopedItems.find((item) => item.id === previewStageParentId);
      const hideStageRoot = Boolean(stageRoot?.stageHideAfterSelection);
      const hideOtherElements = Boolean(stageRoot?.stageHideOtherElementsInStage);

      if (hideOtherElements) {
        return sideScopedItems.filter(
          (item) =>
            item.stageParentId === previewStageParentId ||
            (!hideStageRoot && item.id === previewStageParentId)
        );
      }

      return sideScopedItems.filter((item) => {
        if (item.stageParentId === previewStageParentId) return true;
        if (item.id === previewStageParentId) return !hideStageRoot;
        return !item.stageParentId;
      });
    }

    const alwaysVisibleTeamStageRootIds = new Set(
      sideScopedItems
        .filter(
          (item) =>
            item.kind === "team-select" &&
            item.teamSelectLinkToStage === true &&
            item.teamSelectAlwaysShowStagedElements === true &&
            sideScopedItems.some((entry) => entry.stageParentId === item.id)
        )
        .map((item) => item.id)
    );

    const baseItems = sideScopedItems.filter(
      (item) =>
        !item.stageParentId || alwaysVisibleTeamStageRootIds.has(item.stageParentId)
    );

    if (isEditorReadOnly) {
      return baseItems.filter(
        (item) => item.kind !== "cover" || item.coverVisible !== false
      );
    }

    return baseItems;
  }, [
    isEditorReadOnly,
    isPreviewMode,
    previewStageParentId,
    sideScopedItems,
    stagingParentId,
  ]);

  const layeredVisibleItems = React.useMemo(() => {
    const bottomItems = visibleItems.filter(
      (item) =>
        item.kind === "cover" ||
        item.kind === "start-position" ||
        item.kind === "mirror"
    );
    const topItems = visibleItems.filter(
      (item) =>
        item.kind !== "cover" &&
        item.kind !== "start-position" &&
        item.kind !== "mirror"
    );
    return [...bottomItems, ...topItems];
  }, [visibleItems]);

  const selectedItemIdSet = React.useMemo(
    () => new Set(selectedItemIds),
    [selectedItemIds]
  );

  const selectedVisibleItems = React.useMemo(
    () => layeredVisibleItems.filter((item) => selectedItemIdSet.has(item.id)),
    [layeredVisibleItems, selectedItemIdSet]
  );

  const selectedGroupBounds = React.useMemo(() => {
    if (selectedVisibleItems.length === 0) return null;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    selectedVisibleItems.forEach((item) => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    });

    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }, [selectedVisibleItems]);

  const handleCanvasItemSelect = React.useCallback(
    (itemId: string, options?: { append?: boolean }) => {
      if (autoTeleopScopedEditMode) {
        setAutoTeleopScopedEditMode(null);
      }
      const append = Boolean(options?.append);
      const targetItem = items.find((item) => item.id === itemId);

      if (append) {
        if (!targetItem || isMassDragExcludedKind(targetItem.kind)) {
          return;
        }

        setIsMassSelectionActive(true);
        setSelectedItemIds((prev) =>
          [
            ...prev.filter((selectedId) => {
              const selectedItem = items.find((item) => item.id === selectedId);
              return selectedItem
                ? !isMassDragExcludedKind(selectedItem.kind)
                : false;
            }),
            itemId,
          ].filter((id, index, list) => list.indexOf(id) === index)
        );
        setSelectedItemId(itemId);
        return;
      }

      if (selectedItemIds.length > 1 && selectedItemIds.includes(itemId)) {
        setIsMassSelectionActive(true);
        setSelectedItemId(itemId);
        return;
      }

      setIsMassSelectionActive(false);
      setSelectedItemIds([itemId]);
      setSelectedItemId(itemId);
    },
    [autoTeleopScopedEditMode, items, selectedItemIds]
  );

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
      if (flushDragRafRef.current !== null) {
        cancelAnimationFrame(flushDragRafRef.current);
      }

      flushDragRafRef.current = requestAnimationFrame(() => {
        flushDragRafRef.current = null;

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
      });
    },
    []
  );

  const processDragMove = React.useCallback(
    (snapshot: DragMoveSnapshot) => {
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

      // Optimize: Only calculate guides for visible items, skip unnecessary checks
      for (let i = 0; i < visibleItems.length; ++i) {
        const item = visibleItems[i];
        if (item.kind === "mirror") continue;
        if (data?.type === "canvas" && item.id === data.itemId) continue;
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
        if (Math.abs(activeCenterX - centerX) <= GUIDE_SNAP_PX) vertical.add(centerX);
        if (Math.abs(activeTop - top) <= GUIDE_SNAP_PX) horizontal.add(top);
        if (Math.abs(activeBottom - bottom) <= GUIDE_SNAP_PX) horizontal.add(bottom);
        if (Math.abs(activeTop - bottom) <= GUIDE_SNAP_PX) horizontal.add(bottom);
        if (Math.abs(activeBottom - top) <= GUIDE_SNAP_PX) horizontal.add(top);
        if (Math.abs(activeCenterY - centerY) <= GUIDE_SNAP_PX) horizontal.add(centerY);
      }

      const nextGuides = {
        vertical: Array.from(vertical),
        horizontal: Array.from(horizontal),
      };

      if (data?.type === "canvas" && data.itemId && activeItem) {
        flushDragUpdates(
          nextGuides,
          { itemId: data.itemId, x: 0, y: 0 },
          { x: 0, y: 0 }
        );
        snapLockRef.current = { itemId: null, type: null, x: null, y: null };
      } else if (data?.type === "palette") {
        flushDragUpdates(
          nextGuides,
          { itemId: null, x: 0, y: 0 },
          { x: 0, y: 0 }
        );
        snapLockRef.current = { itemId: null, type: null, x: null, y: null };
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
      const THROTTLE_MS = 100;
      const now = performance.now();
      if (now - lastDragMoveAtRef.current < THROTTLE_MS) {
        return;
      }
      lastDragMoveAtRef.current = now;
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
      if (flushDragRafRef.current !== null) {
        window.cancelAnimationFrame(flushDragRafRef.current);
        flushDragRafRef.current = null;
      }
    };
  }, []);

  const buildEditorSnapshot = React.useCallback((): EditorSnapshot => {
    return {
      items,
      aspectWidth,
      aspectHeight,
      backgroundImage,
      backgroundLocation,
      scoutType,
      postMatchQuestions,
      eventKey,
      enableEventTimeTracking,
      useCustomSideLayouts: isCustomSideLayoutsEnabled,
      editorTeamSide,
      previewTeamSide,
    };
  }, [
    aspectHeight,
    aspectWidth,
    backgroundImage,
    backgroundLocation,
    editorTeamSide,
    enableEventTimeTracking,
    eventKey,
    isCustomSideLayoutsEnabled,
    items,
    postMatchQuestions,
    previewTeamSide,
    scoutType,
  ]);

  const selectedItem = React.useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const getLinkedTeamStageRootId = React.useCallback(
    (item: CanvasItem): string | null => {
      let currentParentId = item.stageParentId;
      while (currentParentId) {
        const parent = items.find((entry) => entry.id === currentParentId);
        if (!parent) return null;
        if (parent.kind === "team-select" && parent.teamSelectLinkToStage) {
          return parent.id;
        }
        currentParentId = parent.stageParentId;
      }
      return null;
    },
    [items]
  );

  const getScopedPreviewKey = React.useCallback(
    (item: CanvasItem, baseKey: string) => {
      const linkedTeamStageRootId = getLinkedTeamStageRootId(item);
      if (!linkedTeamStageRootId) return baseKey;
      const selectedTeamValue =
        previewTeamSelectValues[linkedTeamStageRootId] ??
        getDefaultTeamSelectOptionValue();
      return `${baseKey}::${linkedTeamStageRootId}::${selectedTeamValue}`;
    },
    [getLinkedTeamStageRootId, previewTeamSelectValues]
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

  const selectedIsStageableRoot = selectedItem ? isStageableRootItem(selectedItem) : false;

  const selectedHasStagedChildren = Boolean(selectedItem?.id) &&
    items.some((item) => item.stageParentId === selectedItem?.id);

  const previewStageRoot = React.useMemo(() => {
    if (!isPreviewMode || !previewStageParentId) return null;
    return items.find((item) => item.id === previewStageParentId) ?? null;
  }, [isPreviewMode, items, previewStageParentId]);

  const isStageBlurActive =
    Boolean(stagingParentId) ||
    (isPreviewMode && Boolean(previewStageRoot?.stageBlurBackgroundOnClick));

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
        body: "Download JSON is the exact payload sent to the backend.",
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

  const handleSelectedInputValueModeChange = React.useCallback(
    (value: InputValueMode) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "input"
            ? {
                ...item,
                inputValueMode: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedInputTextAreaModeChange = React.useCallback(
    (value: boolean) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "input"
            ? {
                ...item,
                inputIsTextArea: value,
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
          item.id === selectedItemId && (item.kind === "icon" || item.kind === "button-slider")
            ? {
                ...item,
                iconName,
                label: item.kind === "icon" ? iconName : item.label,
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
          item.id === selectedItemId && (item.kind === "icon" || item.kind === "button-slider")
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
          item.id === selectedItemId && (item.kind === "icon" || item.kind === "button-slider")
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

  const handleSelectedButtonPressModeChange = React.useCallback(
    (value: ButtonPressMode) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && (item.kind === "text" || item.kind === "icon")
            ? {
                ...item,
                buttonPressMode: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedButtonSliderIncreaseDirectionChange = React.useCallback(
    (value: "left" | "right") => {
      if (!selectedItemId) return;
      const nextDirection = normalizeButtonSliderIncreaseDirection(value);
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "button-slider"
            ? {
                ...item,
                buttonSliderIncreaseDirection: nextDirection,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedMovementDirectionChange = React.useCallback(
    (value: "left" | "right") => {
      setItems((prev) =>
        prev.map((item) =>
          item.kind === "movement"
            ? {
                ...item,
                movementDirection: value,
              }
            : item
        )
      );
    },
    []
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

  const handleSelectedToggleStyleChange = React.useCallback(
    (value: ToggleStyle) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "toggle"
            ? {
                ...item,
                toggleStyle: value,
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

  const handleSelectedCoverVisibilityChange = React.useCallback(
    (value: boolean) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "cover"
            ? {
                ...item,
                coverVisible: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedTeamSelectLinkToStageChange = React.useCallback(
    (value: boolean) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "team-select"
            ? {
                ...item,
                teamSelectLinkToStage: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedTeamSelectAlwaysShowStageChange = React.useCallback(
    (value: boolean) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "team-select"
            ? {
                ...item,
                teamSelectAlwaysShowStagedElements: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedStageHideAfterSelectionChange = React.useCallback(
    (value: boolean) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && isStageableRootItem(item)
            ? {
                ...item,
                stageHideAfterSelection: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedStageBlurBackgroundOnClickChange = React.useCallback(
    (value: boolean) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && isStageableRootItem(item)
            ? {
                ...item,
                stageBlurBackgroundOnClick: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedStageHideOtherElementsInStageChange = React.useCallback(
    (value: boolean) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && isStageableRootItem(item)
            ? {
                ...item,
                stageHideOtherElementsInStage: value,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleSelectedStageRemoveParentTagChange = React.useCallback(
    (value: boolean) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && isStageableRootItem(item)
            ? {
                ...item,
                stageRemoveParentTag: value,
                tag: value ? "" : item.tag,
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

  const handleAutoToggleItem = React.useCallback(
    (itemId: string) => {
      const target = items.find((item) => item.id === itemId);
      if (!target || target.kind !== "auto-toggle") return;

      if (typeof autoToggleIntervalsRef.current[itemId] === "number") {
        clearAutoToggleTimer(itemId);
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId && item.kind === "auto-toggle"
              ? {
                  ...item,
                  autoToggleMode: "teleop",
                }
              : item
          )
        );
        return;
      }

      setHiddenPreviewStartPositionIds((prev) => {
        const next = { ...prev };
        items
          .filter((item) => item.kind === "start-position")
          .forEach((item) => {
            next[item.id] = true;
          });
        return next;
      });

      const durationSeconds =
        typeof target.autoToggleDurationSeconds === "number" &&
        Number.isFinite(target.autoToggleDurationSeconds)
          ? Math.max(0, target.autoToggleDurationSeconds)
          : 15;

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId && item.kind === "auto-toggle"
            ? {
                ...item,
                autoToggleMode: "auto",
              }
            : item
        )
      );

      if (durationSeconds <= 0) {
        clearAutoToggleTimer(itemId);
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId && item.kind === "auto-toggle"
              ? {
                  ...item,
                  autoToggleMode: "teleop",
                }
              : item
          )
        );
        return;
      }

      setAutoToggleCountdowns((prev) => ({
        ...prev,
        [itemId]: Math.max(0, Math.ceil(durationSeconds)),
      }));

      const startedAt = Date.now();
      const durationMs = durationSeconds * 1000;

      autoToggleIntervalsRef.current[itemId] = window.setInterval(() => {
        const elapsedMs = Date.now() - startedAt;
        const remainingMs = Math.max(0, durationMs - elapsedMs);
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        setAutoToggleCountdowns((prev) => {
          if (prev[itemId] === remainingSeconds) return prev;
          return {
            ...prev,
            [itemId]: remainingSeconds,
          };
        });

        if (remainingSeconds <= 0) {
          clearAutoToggleTimer(itemId);
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId && item.kind === "auto-toggle"
                ? {
                    ...item,
                    autoToggleMode: "teleop",
                  }
                : item
            )
          );
        }
      }, 200);
    },
    [clearAutoToggleTimer, items]
  );

  const handleAutoTeleopVisibilitySwap = React.useCallback(() => {
    setAutoTeleopVisibilityMode((current) => {
      if (current === "auto") return "teleop";
      if (current === "teleop") return "auto";
      return activeAutoTeleopMode === "auto" ? "teleop" : "auto";
    });
  }, [activeAutoTeleopMode]);

  const handlePreviewStartPositionTap = React.useCallback(
    (item: CanvasItem, xRatio: number, yRatio: number) => {
      const scopedKey = getScopedPreviewKey(item, item.id);
      setPreviewStartPositions((prev) => ({
        ...prev,
        [scopedKey]: {
          xRatio: Math.max(0, Math.min(1, xRatio)),
          yRatio: Math.max(0, Math.min(1, yRatio)),
        },
      }));
    },
    [getScopedPreviewKey]
  );

  const handleStartPositionVisibilityToggle = React.useCallback(() => {
    setItems((prev) => {
      const target = prev.find((item) => item.kind === "start-position");
      if (!target) return prev;
      const nextVisible = target.startPositionVisible === false;
      return prev.map((item) =>
        item.id === target.id && item.kind === "start-position"
          ? {
              ...item,
              startPositionVisible: nextVisible,
            }
          : item
      );
    });
  }, []);

  const handleSelectedAutoToggleTimerChange = React.useCallback(
    (value: number) => {
      if (!selectedItemId) return;
      const nextValue = Number.isFinite(value) ? Math.max(0, value) : 0;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "auto-toggle"
            ? {
                ...item,
                autoToggleDurationSeconds: nextValue,
              }
            : item
        )
      );
      clearAutoToggleTimer(selectedItemId);
    },
    [clearAutoToggleTimer, selectedItemId]
  );

  const handleSelectedAutoToggleTeleopTimerChange = React.useCallback(
    (value: number) => {
      if (!selectedItemId) return;
      const nextValue = Number.isFinite(value) ? Math.max(0, value) : 0;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId && item.kind === "auto-toggle"
            ? {
                ...item,
                autoToggleTeleopDurationSeconds: nextValue,
              }
            : item
        )
      );
    },
    [selectedItemId]
  );

  const handleEnterAutoTeleopScopedEditMode = React.useCallback(
    (scope: AutoTeleopScope) => {
      setAutoTeleopScopedEditMode(scope);
      setAutoTeleopVisibilityMode(null);
    },
    []
  );

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
    if (!isStageableRootItem(selectedItem)) {
      return;
    }
    enterStagingForItemId(selectedItem.id);
  }, [enterStagingForItemId, selectedItem]);

  const handleEndStaging = React.useCallback(() => {
    stepOutOfStaging();
  }, [stepOutOfStaging]);

  const handleStageContextMenu = React.useCallback(
    (itemId: string) => {
      const target = items.find((item) => item.id === itemId);
      if (!target) return;
      if (!isStageableRootItem(target)) {
        return;
      }
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
    if (!isStageableRootItem(target)) {
      return;
    }

    const hasChildren = items.some((item) => item.stageParentId === itemId);

    setPreviewStageParentId((current) => {
      if (!hasChildren) {
        return current;
      }
      return current === itemId ? current : itemId;
    });
  }, [items]);

  const handlePreviewStageExit = React.useCallback(() => {
    setPreviewStageParentId(null);
  }, []);

  const clearPreviewHoldInterval = React.useCallback(() => {
    if (previewHoldIntervalRef.current !== null) {
      window.clearInterval(previewHoldIntervalRef.current);
      previewHoldIntervalRef.current = null;
    }
  }, []);

  const stopPreviewHoldForItem = React.useCallback(
    (itemId: string) => {
      if (previewHoldStartByIdRef.current[itemId] === undefined) return;
      const next = { ...previewHoldStartByIdRef.current };
      delete next[itemId];
      previewHoldStartByIdRef.current = next;

      setPreviewHoldDurationsById((prev) => {
        if (!(itemId in prev)) return prev;
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });

      if (Object.keys(next).length === 0) {
        clearPreviewHoldInterval();
      }
    },
    [clearPreviewHoldInterval]
  );

  const startPreviewHoldForItem = React.useCallback(
    (itemId: string) => {
      const now = performance.now();
      previewHoldStartByIdRef.current = {
        ...previewHoldStartByIdRef.current,
        [itemId]: now,
      };
      setPreviewHoldDurationsById((prev) => ({ ...prev, [itemId]: 0 }));

      if (previewHoldIntervalRef.current !== null) return;
      previewHoldIntervalRef.current = window.setInterval(() => {
        const activeStartById = previewHoldStartByIdRef.current;
        const activeIds = Object.keys(activeStartById);

        if (activeIds.length === 0) {
          clearPreviewHoldInterval();
          return;
        }

        const tickNow = performance.now();
        setPreviewHoldDurationsById((prev) => {
          const next: Record<string, number> = {};
          let changed = false;

          activeIds.forEach((activeId) => {
            const elapsed = Math.max(
              0,
              Math.round(tickNow - activeStartById[activeId])
            );
            next[activeId] = elapsed;
            if (prev[activeId] !== elapsed) {
              changed = true;
            }
          });

          if (Object.keys(prev).length !== activeIds.length) {
            changed = true;
          }

          return changed ? next : prev;
        });
      }, 16);
    },
    [clearPreviewHoldInterval]
  );

  const handlePreviewButtonSliderDragStart = React.useCallback(
    (item: CanvasItem, event: React.PointerEvent<HTMLButtonElement>) => {
      if (item.kind !== "button-slider") return;

      clearPreviewButtonSliderLoop(item.id);
      setPreviewButtonSliderValues((prev) => ({
        ...prev,
        [item.id]: 1,
      }));
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const startX = event.clientX;
      const configuredIncreaseDirection = normalizeButtonSliderIncreaseDirection(
        item.buttonSliderIncreaseDirection
      );
      const effectiveIncreaseDirection = isSwapMirroredRef.current
        ? invertHorizontalDirection(configuredIncreaseDirection)
        : configuredIncreaseDirection;
      const nextDragInfo: ButtonSliderDragInfo = {
        startX,
        currentX: startX,
        signedDistance: 0,
        increaseDirection: effectiveIncreaseDirection,
        buttonLeft: buttonRect.left,
        buttonWidth: buttonRect.width,
      };

      previewButtonSliderDragByIdRef.current = {
        ...previewButtonSliderDragByIdRef.current,
        [item.id]: nextDragInfo,
      };
      setPreviewButtonSliderDragById((prev) => ({
        ...prev,
        [item.id]: nextDragInfo,
      }));
    },
    [clearPreviewButtonSliderLoop]
  );

  const handlePreviewButtonSliderDragMove = React.useCallback(
    (itemId: string, clientX: number) => {
      const activeDrag = previewButtonSliderDragByIdRef.current[itemId];
      if (!activeDrag) return;

      const nextDragInfo: ButtonSliderDragInfo = {
        ...activeDrag,
        currentX: clientX,
        signedDistance: clientX - activeDrag.startX,
      };

      previewButtonSliderDragByIdRef.current = {
        ...previewButtonSliderDragByIdRef.current,
        [itemId]: nextDragInfo,
      };
      setPreviewButtonSliderDragById((prev) => ({
        ...prev,
        [itemId]: nextDragInfo,
      }));

      const hasLoop = typeof previewButtonSliderTimeoutsRef.current[itemId] === "number";
      if (
        !hasLoop &&
        Math.abs(nextDragInfo.signedDistance) >= BUTTON_SLIDER_DRAG_DEADZONE_PX
      ) {
        schedulePreviewButtonSliderTick(itemId);
      }
    },
    [schedulePreviewButtonSliderTick]
  );

  const handlePreviewButtonSliderDragEnd = React.useCallback(
    (itemId: string) => {
      clearPreviewButtonSliderLoop(itemId);
      setPreviewButtonSliderValues((prev) => {
        if (!(itemId in prev)) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    },
    [clearPreviewButtonSliderLoop]
  );

  const handlePreviewPressStart = React.useCallback(
    (item: CanvasItem) => {
      setPreviewPressedItemId(item.id);
      const isHoldButton =
        (item.kind === "text" || item.kind === "icon") &&
        normalizeButtonPressMode(item.buttonPressMode) === "hold";
      if (isHoldButton) {
        startPreviewHoldForItem(item.id);
      }
    },
    [startPreviewHoldForItem]
  );

  const handlePreviewPressEnd = React.useCallback(
    (itemId: string) => {
      setPreviewPressedItemId((current) => (current === itemId ? null : current));
      stopPreviewHoldForItem(itemId);
    },
    [stopPreviewHoldForItem]
  );

  const handlePreviewSuccessToggle = React.useCallback((itemId: string) => {
    setPreviewSuccessOpenItemId((current) => (current === itemId ? null : itemId));
  }, []);

  const handlePreviewSuccessSelect = React.useCallback(
    (itemId: string, value: "success" | "fail") => {
      void value;
      setPreviewSuccessOpenItemId((current) => (current === itemId ? null : current));
    },
    []
  );

  const handleSuccessContextAdjust = React.useCallback((itemId: string) => {
    const positions = [
      { x: 0, y: 0 },
      { x: 0, y: -48 },
      { x: 0, y: 48 },
      { x: -48, y: 0 },
      { x: 48, y: 0 },
    ];

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId || (item.kind !== "text" && item.kind !== "icon")) {
          return item;
        }
        const currentX = item.successPopoverOffsetX ?? 0;
        const currentY = item.successPopoverOffsetY ?? 0;
        const currentIndex = positions.findIndex(
          (entry) => entry.x === currentX && entry.y === currentY
        );
        const next = positions[(currentIndex + 1) % positions.length] ?? positions[0];
        return {
          ...item,
          successPopoverOffsetX: next.x,
          successPopoverOffsetY: next.y,
        };
      })
    );
  }, []);

  const handlePreviewInputChange = React.useCallback(
    (item: CanvasItem, value: string) => {
      const mode = normalizeInputValueMode(item.inputValueMode);
      const sanitizedValue = sanitizeInputValueByMode(value, mode);
      const key = getScopedPreviewKey(item, normalizeTag(item.tag ?? "") || item.id);
      setPreviewInputValues((prev) => ({
        ...prev,
        [key]: sanitizedValue,
      }));
    },
    [getScopedPreviewKey]
  );

  const handlePreviewTeamSelectChange = React.useCallback(
    (item: CanvasItem, value: string) => {
      const key = item.id;
      setPreviewTeamSelectValues((prev) => ({
        ...prev,
        [key]: value,
      }));
      if (
        item.kind === "team-select" &&
        item.teamSelectLinkToStage === true &&
        items.some((entry) => entry.stageParentId === item.id)
      ) {
        setPreviewStageParentId(item.id);
      }
    },
    [items]
  );

  const handlePreviewMatchSelectChange = React.useCallback(
    (item: CanvasItem, value: number) => {
      const key = getScopedPreviewKey(item, item.id);
      setPreviewMatchSelectValues((prev) => ({
        ...prev,
        [key]: clampMatchSelectValue(value),
      }));
    },
    [getScopedPreviewKey]
  );

  const handlePreviewSliderChange = React.useCallback((itemId: string, value: number) => {
    setPreviewSliderValues((prev) => ({
      ...prev,
      [itemId]: Math.max(0, Math.round(value)),
    }));
  }, []);

  const applyEditorSnapshot = React.useCallback(
    (snapshot: EditorSnapshot) => {
      isApplyingHistoryRef.current = true;
      setItems(snapshot.items);
      setAspectWidth(snapshot.aspectWidth);
      setAspectHeight(snapshot.aspectHeight);
      setBackgroundImage(snapshot.backgroundImage);
      setBackgroundLocation(snapshot.backgroundLocation);
      setScoutType(snapshot.scoutType);
      setPostMatchQuestions(snapshot.postMatchQuestions);
      setEventKey(snapshot.eventKey);
      setEventKeyDraft(snapshot.eventKey);
      setEnableEventTimeTracking(snapshot.enableEventTimeTracking);
      setEnableEventTimeTrackingDraft(snapshot.enableEventTimeTracking);
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
        return;
      }

      if (item.kind === "redo") {
        return;
      }

      if (item.kind === "reset") {
        clearAllPreviewButtonSliderLoops();
        setPreviewInputValues({});
        setPreviewTeamSelectValues({});
        setPreviewMatchSelectValues({});
        setPreviewButtonSliderValues({});
        setPreviewSliderValues({});
        setPreviewStartPositions({});
        setHiddenPreviewStartPositionIds({});
        setPreviewSuccessOpenItemId(null);
        setPreviewLogText("");
        return;
      }

      if (item.kind === "button-slider") {
        setPreviewButtonSliderValues((prev) => ({
          ...prev,
          [item.id]: (prev[item.id] ?? 0) + 1,
        }));
        return;
      }

      if (item.kind === "submit") {
        const submitted = items
          .filter(
            (entry) =>
              entry.kind === "input" ||
              entry.kind === "team-select" ||
              entry.kind === "match-select" ||
              entry.kind === "start-position" ||
              entry.kind === "slider" ||
              entry.kind === "toggle"
          )
          .reduce<Record<string, string>>((accumulator, entry) => {
            const inputKey =
              entry.kind === "team-select"
                ? entry.id
                : entry.kind === "match-select"
                  ? entry.id
                : entry.kind === "start-position"
                  ? entry.id
                : entry.kind === "slider"
                  ? normalizeTag(entry.tag ?? "") || entry.id
                : entry.kind === "toggle"
                  ? normalizeTag(entry.tag ?? "") || entry.id
                : normalizeTag(entry.tag ?? "") || entry.id;
            const scopedInputKey = getScopedPreviewKey(entry, inputKey);
            const outputKey =
              entry.kind === "team-select"
                ? "Drop Down"
                : entry.kind === "match-select"
                  ? "Match Select"
                : entry.kind === "start-position"
                  ? entry.label || "Start Position"
                : entry.kind === "slider"
                  ? normalizeTag(entry.tag ?? "") || entry.label || entry.id
                : entry.kind === "toggle"
                  ? normalizeTag(entry.tag ?? "") || entry.label || entry.id
                : normalizeTag(entry.tag ?? "") || entry.label || entry.id;
            accumulator[outputKey] =
              entry.kind === "team-select"
                ? previewTeamSelectValues[inputKey] ?? getDefaultTeamSelectOptionValue()
                : entry.kind === "match-select"
                  ? String(
                      previewMatchSelectValues[scopedInputKey] ??
                        clampMatchSelectValue(
                          entry.matchSelectValue ?? MATCH_SELECT_MIN_VALUE
                        )
                    )
                : entry.kind === "start-position"
                  ? previewStartPositions[scopedInputKey]
                    ? `${Math.round(previewStartPositions[scopedInputKey].xRatio * 100)}%, ${Math.round(
                        previewStartPositions[scopedInputKey].yRatio * 100
                      )}%`
                    : "Not marked"
                : entry.kind === "slider"
                  ? String(previewSliderValues[entry.id] ?? Math.max(0, Math.min(entry.sliderMax ?? 100, entry.sliderMid ?? 50)))
                : entry.kind === "toggle"
                  ? String(Boolean(entry.toggleOn))
                : previewInputValues[scopedInputKey] ?? "";
            return accumulator;
          }, {});

        setPreviewLogText(JSON.stringify(submitted, null, 2));
      }
    },
    [
      clearAllPreviewButtonSliderLoops,
      items,
      previewInputValues,
      previewSliderValues,
      getScopedPreviewKey,
      previewMatchSelectValues,
      previewStartPositions,
      previewTeamSelectValues,
    ]
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

      const shouldCenterOnPointer = shouldCenterPaletteAnchor(assetKind);
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
        const selectedIds =
          selectedItemIdSet.has(data.itemId) && selectedItemIds.length > 1
            ? selectedItemIds
            : [data.itemId];
        dragSelectionIdsRef.current = selectedIds;
        setSelectedItemIds(selectedIds);
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
        dragSelectionIdsRef.current = [];
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
          const shouldCenterOnPointer = shouldCenterPaletteAnchor(nextKind);
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
          const shouldCenterOnPointer = shouldCenterPaletteAnchor(nextKind);
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
        dragSelectionIdsRef.current = [];
        setActiveSize(BUTTON_SIZE);
        setActiveLabel("Button");
        setActiveKind("text");
        setActiveIconName("Bot");
        setActiveOutlineColor(undefined);
        setActiveFillColor(undefined);
        setPalettePointerOffset({ x: 0, y: 0 });
      }
    },
    [isPreviewMode, items, selectedItemIdSet, selectedItemIds]
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
    if (isPreviewMode) {
      if (isCustomSideLayoutsEnabled) {
        const nextSide: TeamSide = previewTeamSide === "red" ? "blue" : "red";
        setPreviewTeamSide(nextSide);
      } else {
        setIsPreviewSwapMirrored((current) => !current);
      }
      return;
    }

    if (isCustomSideLayoutsEnabled) {
      const currentSide = editorTeamSide;
      const nextSide: TeamSide = currentSide === "red" ? "blue" : "red";

      setEditorTeamSide(nextSide);

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

  const handleToggleMovementDirection = React.useCallback((itemId: string) => {
    setItems((prev) => {
      const target = prev.find(
        (item) => item.id === itemId && item.kind === "movement"
      );
      if (!target) return prev;
      const nextDirection: "left" | "right" =
        normalizeMovementDirection(target.movementDirection ?? target.label) === "left"
          ? "right"
          : "left";

      return prev.map((item) =>
        item.kind === "movement"
          ? {
              ...item,
              movementDirection: nextDirection,
            }
          : item
      );
    });
  }, []);

  const handleEditLabel = React.useCallback(
    (item: CanvasItem) => {
      if (!selectedItemIdSet.has(item.id)) {
        setSelectedItemIds([item.id]);
      }
      setSelectedItemId(item.id);
    },
    [selectedItemIdSet]
  );

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

  const buildExportPayload = React.useCallback((options?: {
    validateTags?: boolean;
    showValidationErrors?: boolean;
  }) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return null;

    const numericAspectWidth = Number(aspectWidth);
    const numericAspectHeight = Number(aspectHeight);
    const resolvedAspectRatio =
      Number.isFinite(numericAspectWidth) &&
      Number.isFinite(numericAspectHeight) &&
      numericAspectWidth > 0 &&
      numericAspectHeight > 0
        ? numericAspectWidth / numericAspectHeight
        : 16 / 9;
    const canvasWidth =
      canvasElement.offsetWidth > 0
        ? canvasElement.offsetWidth
        : FIELD_HEIGHT * resolvedAspectRatio;
    const canvasHeight = canvasElement.offsetHeight > 0 ? canvasElement.offsetHeight : FIELD_HEIGHT;
    const serializationCanvasWidth =
      isPreviewMode && previewBaseStageSizeRef.current
        ? previewBaseStageSizeRef.current.width
        : canvasWidth;
    const serializationCanvasHeight =
      isPreviewMode && previewBaseStageSizeRef.current
        ? previewBaseStageSizeRef.current.height
        : canvasHeight;

    const disabledStageTagById = new Map<string, string>();
    const getExportTagForItem = (item: CanvasItem) => {
      if (!item.stageRemoveParentTag) {
        return normalizeTag(item.tag ?? "");
      }

      const existing = disabledStageTagById.get(item.id);
      if (existing) return existing;

      const generated = createDisabledStageTag();
      disabledStageTagById.set(item.id, generated);
      return generated;
    };

    const tagById = new Map(
      items.map((item) => [item.id, getExportTagForItem(item)] as const)
    );
    const itemById = new Map(items.map((item) => [item.id, item] as const));
    const stagedParentIds = new Set(
      items
        .map((item) => item.stageParentId)
        .filter((value): value is string => Boolean(value))
    );

    const resolveTeamSelectStageRootId = (item: CanvasItem): string | null => {
      let currentParentId = item.stageParentId;
      while (currentParentId) {
        const parent = itemById.get(currentParentId);
        if (!parent) return null;
        if (parent.kind === "team-select" && parent.teamSelectLinkToStage === true) {
          return parent.id;
        }
        currentParentId = parent.stageParentId;
      }
      return null;
    };

    const getExportTagVariants = (item: CanvasItem) => {
      const baseTag = getExportTagForItem(item);
      if (!baseTag) return [baseTag];

      const linkedTeamSelectStageRootId = resolveTeamSelectStageRootId(item);
      if (!linkedTeamSelectStageRootId) return [baseTag];

      return TEAM_SELECT_OPTIONS.map((option) => `${baseTag}-${option.value}`);
    };

    const taggedItems = items.filter((item) =>
      ["text", "icon", "movement", "input", "toggle", "button-slider", "slider"].includes(
        item.kind
      )
    );
    const tags = taggedItems.map((item) => getExportTagForItem(item));

    const shouldValidateTags = options?.validateTags ?? true;
    const shouldShowValidationErrors = options?.showValidationErrors ?? true;

    if (shouldValidateTags && tags.some((tag) => tag.length === 0)) {
      if (shouldShowValidationErrors) {
        toast.error("Make sure to set all tags!");
      }
      return null;
    }

    if (shouldValidateTags && tags.some((tag) => /\s/.test(tag))) {
      if (shouldShowValidationErrors) {
        toast.error("Tags cannot contain spaces.");
      }
      return null;
    }

    const centerX = serializationCanvasWidth / 2;
    const centerY = serializationCanvasHeight / 2;
    const halfWidth = serializationCanvasWidth / 2;
    const halfHeight = serializationCanvasHeight / 2;
    const normalize = (value: number) => Number(value.toFixed(2));
    const clampToRange = (value: number) => Math.max(-100, Math.min(100, value));
    const scaleX = (value: number) =>
      normalize(clampToRange(((value - centerX) / halfWidth) * 100));
    const scaleY = (value: number) =>
      normalize(clampToRange(((centerY - value) / halfHeight) * 100));
    const scaleWidth = (value: number) =>
      normalize(clampToRange((value / serializationCanvasWidth) * 100));
    const scaleHeight = (value: number) =>
      normalize(clampToRange((value / serializationCanvasHeight) * 100));

    const payload: Record<string, unknown>[] = items.flatMap((item) => {
      const centerItemX = item.x + item.width / 2;
      const centerItemY = item.y + item.height / 2;
      const stageParentTag = item.stageParentId
        ? tagById.get(item.stageParentId) ?? ""
        : "";
      const hasStageChildren = stagedParentIds.has(item.id);
      const tagVariants = getExportTagVariants(item);

      const entries = (() => {
        switch (item.kind) {
        case "text":
          return tagVariants.map((tag) => ({
            button: {
              tag,
              teamSide: item.teamSide,
              autoTeleopScope: item.autoTeleopScope,
              pressMode: normalizeButtonPressMode(item.buttonPressMode),
              trackSuccess: item.successTrackingEnabled === true,
              increment: item.increment ?? 1,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              text: item.label,
              hideAfterSelection: item.stageHideAfterSelection === true,
              blurBackgroundOnClick: item.stageBlurBackgroundOnClick === true,
              hideOtherElementsInStage: item.stageHideOtherElementsInStage === true,
              removeParentTag: item.stageRemoveParentTag === true,
              stageParentTag,
              hasStageChildren,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }));
        case "undo":
        case "redo":
        case "submit":
        case "reset":
          return [{
            button: {
              teamSide: item.teamSide,
              action: item.kind,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              text: item.label,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }];
        case "icon":
          return tagVariants.map((tag) => ({
            "icon-button": {
              tag,
              teamSide: item.teamSide,
              autoTeleopScope: item.autoTeleopScope,
              pressMode: normalizeButtonPressMode(item.buttonPressMode),
              trackSuccess: item.successTrackingEnabled === true,
              increment: item.increment ?? 1,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              icon: item.iconName ?? "",
              outline: item.outlineColor ?? "#ffffff",
              fill: item.fillColor ?? "transparent",
              hideAfterSelection: item.stageHideAfterSelection === true,
              blurBackgroundOnClick: item.stageBlurBackgroundOnClick === true,
              hideOtherElementsInStage: item.stageHideOtherElementsInStage === true,
              removeParentTag: item.stageRemoveParentTag === true,
              stageParentTag,
              hasStageChildren,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }));
        case "movement":
          return tagVariants.map((tag) => ({
            "movement-button": {
              tag,
              teamSide: item.teamSide,
              autoTeleopScope: item.autoTeleopScope,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              direction: normalizeMovementDirection(
                item.movementDirection ?? item.label
              ),
              hideAfterSelection: item.stageHideAfterSelection === true,
              blurBackgroundOnClick: item.stageBlurBackgroundOnClick === true,
              hideOtherElementsInStage: item.stageHideOtherElementsInStage === true,
              removeParentTag: item.stageRemoveParentTag === true,
              stageParentTag,
              hasStageChildren,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }));
        case "input":
          return tagVariants.map((tag) => ({
            "text-input": {
              tag,
              teamSide: item.teamSide,
              autoTeleopScope: item.autoTeleopScope,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              label: item.label,
              placeholder: item.placeholder ?? "",
              valueType: normalizeInputValueMode(item.inputValueMode),
              multiline: item.inputIsTextArea === true,
              stageParentTag,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }));
        case "team-select": {
          return [{
            "team-select": {
              teamSide: item.teamSide,
              autoTeleopScope: item.autoTeleopScope,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              label: "Drop Down",
              linkEachTeamToStage: item.teamSelectLinkToStage === true,
              showStageWithoutSelection:
                item.teamSelectAlwaysShowStagedElements === true,
              stageParentTag,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }];
        }
        case "match-select":
          return tagVariants.map((tag) => ({
            "match-select": {
              tag,
              teamSide: item.teamSide,
              autoTeleopScope: item.autoTeleopScope,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              label: item.label || "Match Select",
              value: clampMatchSelectValue(
                item.matchSelectValue ?? MATCH_SELECT_MIN_VALUE
              ),
              stageParentTag,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }));
        case "toggle":
          return tagVariants.map((tag) => ({
            "toggle-switch": {
              tag,
              teamSide: item.teamSide,
              autoTeleopScope: item.autoTeleopScope,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              label: item.label,
              value: Boolean(item.toggleOn),
              style: normalizeToggleStyle(item.toggleStyle),
              textAlign: item.toggleTextAlign ?? "center",
              textSize: item.toggleTextSize ?? 10,
              stageParentTag,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }));
        case "button-slider":
          return tagVariants.map((tag) => ({
            "button-slider": {
              tag,
              teamSide: item.teamSide,
              autoTeleopScope: item.autoTeleopScope,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              text: item.label,
              icon: item.iconName ?? undefined,
              outline: item.outlineColor ?? undefined,
              fill: item.fillColor ?? undefined,
              increaseDirection: normalizeButtonSliderIncreaseDirection(
                item.buttonSliderIncreaseDirection
              ),
              stageParentTag,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }));
        case "slider":
          return tagVariants.map((tag) => ({
            slider: {
              tag,
              teamSide: item.teamSide,
              autoTeleopScope: item.autoTeleopScope,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              label: item.label,
              max: Math.max(1, item.sliderMax ?? 100),
              mid: Math.max(0, item.sliderMid ?? 50),
              leftText: item.sliderLeftText ?? "Low",
              rightText: item.sliderRightText ?? "High",
              stageParentTag,
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }));
        case "auto-toggle":
          return [{
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
            },
          }];
        case "mirror": {
          const startX = item.startX ?? item.x;
          const startY = item.startY ?? item.y;
          const endX = item.endX ?? item.x + item.width;
          const endY = item.endY ?? item.y + item.height;
          return [{
            "mirror-line": {
              x1: scaleX(startX),
              y1: scaleY(startY),
              x2: scaleX(endX),
              y2: scaleY(endY),
            },
          }];
        }
        case "swap":
          return [{
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
          }];
        case "cover": {
          const x1 = item.x;
          const y1 = item.y;
          const x2 = item.x + item.width;
          const y2 = item.y + item.height;
          return [{
            cover: {
              teamSide: item.teamSide,
              visible: item.coverVisible !== false,
              x1: scaleX(x1),
              y1: scaleY(y1),
              x2: scaleX(x2),
              y2: scaleY(y2),
            },
          }];
        }
        case "start-position": {
          const x1 = item.x;
          const y1 = item.y;
          const x2 = item.x + item.width;
          const y2 = item.y + item.height;
          return [{
            "start-position": {
              teamSide: item.teamSide,
              label: item.label || "Start Position",
              visible: item.startPositionVisible !== false,
              stageParentTag,
              x1: scaleX(x1),
              y1: scaleY(y1),
              x2: scaleX(x2),
              y2: scaleY(y2),
            },
          }];
        }
        case "log":
          return [{
            "log-view": {
              teamSide: item.teamSide,
              x: scaleX(centerItemX),
              y: scaleY(centerItemY),
              label: item.label || "Log",
              width: scaleWidth(item.width),
              height: scaleHeight(item.height),
            },
          }];
        default:
          return [];
        }
      })();

      return entries as Record<string, unknown>[];
    });

    const filteredPayload: Record<string, unknown>[] = payload;

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
          serializeCanvasItem(item, serializationCanvasWidth, serializationCanvasHeight)
        ),
        aspectWidth,
        aspectHeight,
        backgroundImage,
        backgroundLocation,
        scoutType,
        postMatchQuestions,
        eventKey,
        coordinateSpace: NORMALIZED_COORDINATE_SPACE,
        useCustomSideLayouts: isCustomSideLayoutsEnabled,
        editorTeamSide,
        previewTeamSide,
      },
      payload: filteredPayload,
      background: {
        backendPointer: backgroundPointer,
        fallbackImage: backgroundImage,
        backgroundLocation,
      },
    };

    return {
      payload: filteredPayload,
      json: JSON.stringify(downloadable, null, 2),
    };
  }, [
    backgroundImage,
    backgroundLocation,
    aspectHeight,
    aspectWidth,
    editorTeamSide,
    eventKey,
    isCustomSideLayoutsEnabled,
    isPreviewMode,
    items,
    latestUploadId,
    postMatchQuestions,
    previewTeamSide,
    scoutType,
  ]);

  const handleExport = React.useCallback(() => {
    const result = buildExportPayload();
    if (!result) return;
    setExportJson(JSON.stringify(result.payload, null, 2));
    setIsExportDialogOpen(true);
  }, [buildExportPayload]);

  const handleUploadConfig = React.useCallback(async () => {
    if (uploadPayload.length === 0) return;
    try {
      const canvasElement = canvasRef.current;
      const numericAspectWidth = Number(aspectWidth);
      const numericAspectHeight = Number(aspectHeight);
      const resolvedAspectRatio =
        Number.isFinite(numericAspectWidth) &&
        Number.isFinite(numericAspectHeight) &&
        numericAspectWidth > 0 &&
        numericAspectHeight > 0
          ? numericAspectWidth / numericAspectHeight
          : 16 / 9;
      const canvasWidth =
        canvasElement && canvasElement.offsetWidth > 0
          ? canvasElement.offsetWidth
          : FIELD_HEIGHT * resolvedAspectRatio;
      const canvasHeight =
        canvasElement && canvasElement.offsetHeight > 0
          ? canvasElement.offsetHeight
          : FIELD_HEIGHT;
      const serializationCanvasWidth =
        isPreviewMode && previewBaseStageSizeRef.current
          ? previewBaseStageSizeRef.current.width
          : canvasWidth;
      const serializationCanvasHeight =
        isPreviewMode && previewBaseStageSizeRef.current
          ? previewBaseStageSizeRef.current.height
          : canvasHeight;

      const editorState: SerializedEditorState = {
        items: items.map((item) =>
          serializeCanvasItem(
            item,
            serializationCanvasWidth,
            serializationCanvasHeight
          )
        ),
        aspectWidth,
        aspectHeight,
        backgroundImage,
        backgroundLocation,
        scoutType,
        postMatchQuestions,
        eventKey,
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
          backgroundLocation,
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
    } catch {
      toast.error("Upload failed. Please try again.");
    }
  }, [
    aspectHeight,
    aspectWidth,
    backgroundImage,
    backgroundLocation,
    editorTeamSide,
    eventKey,
    isPreviewMode,
    isCustomSideLayoutsEnabled,
    items,
    latestUploadId,
    postMatchQuestions,
    previewTeamSide,
    scoutType,
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
      setBackgroundLocation(nextState.backgroundLocation ?? null);
      setScoutType(normalizeScoutType(nextState.scoutType));
      setPostMatchQuestions(nextState.postMatchQuestions ?? []);
      setEventKey(nextState.eventKey ?? "");
      setEventKeyDraft(nextState.eventKey ?? "");
      setEnableEventTimeTracking(Boolean(nextState.enableEventTimeTracking));
      setEnableEventTimeTrackingDraft(Boolean(nextState.enableEventTimeTracking));
      setIsCustomSideLayoutsEnabled(Boolean(nextState.useCustomSideLayouts));
      setEditorTeamSide(nextState.editorTeamSide ?? "red");
      setPreviewTeamSide(nextState.previewTeamSide ?? "red");
      setSelectedItemId(null);
      setSelectedItemIds([]);
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
    anchor.download = "field-payload.json";
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
    setEventKey(eventKeyDraft.trim());
    setEnableEventTimeTracking(enableEventTimeTrackingDraft);
    setIsAspectDialogOpen(false);
  }, [
    aspectHeightDraft,
    aspectWidthDraft,
    enableEventTimeTrackingDraft,
    eventKeyDraft,
  ]);

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
        setSelectedItemIds([]);
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

  const buildEditorState = React.useCallback((): SerializedEditorState => {
    const canvasElement = canvasRef.current;
    const canvasWidth =
      canvasElement && canvasElement.offsetWidth > 0
        ? canvasElement.offsetWidth
        : fieldWidth;
    const canvasHeight =
      canvasElement && canvasElement.offsetHeight > 0
        ? canvasElement.offsetHeight
        : FIELD_HEIGHT;
    const serializationCanvasWidth =
      isPreviewMode && previewBaseStageSizeRef.current
        ? previewBaseStageSizeRef.current.width
        : canvasWidth;
    const serializationCanvasHeight =
      isPreviewMode && previewBaseStageSizeRef.current
        ? previewBaseStageSizeRef.current.height
        : canvasHeight;
    return {
      items: items.map((item) =>
        serializeCanvasItem(item, serializationCanvasWidth, serializationCanvasHeight)
      ),
      aspectWidth,
      aspectHeight,
      backgroundImage,
      backgroundLocation,
      scoutType,
      postMatchQuestions,
      eventKey,
      enableEventTimeTracking,
      coordinateSpace: NORMALIZED_COORDINATE_SPACE,
      useCustomSideLayouts: isCustomSideLayoutsEnabled,
      editorTeamSide,
      previewTeamSide,
    };
  }, [
    aspectHeight,
    aspectWidth,
    backgroundImage,
    backgroundLocation,
    enableEventTimeTracking,
    editorTeamSide,
    eventKey,
    fieldWidth,
    isPreviewMode,
    isCustomSideLayoutsEnabled,
    items,
    postMatchQuestions,
    previewTeamSide,
    scoutType,
  ]);

  const buildDraftPayload = React.useCallback(() => {
    const editorState = buildEditorState();
    return {
      editorState,
    };
  }, [buildEditorState]);

  const buildProjectPayload = React.useCallback(() => {
    const editorState = buildEditorState();
    const exportPayload = buildExportPayload({
      validateTags: false,
      showValidationErrors: false,
    });
    return {
      editorState,
      payload: exportPayload?.payload ?? [],
    };
  }, [buildEditorState, buildExportPayload]);

  const validateProjectCompletion = React.useCallback(() => {
    const hasSubmit = items.some((item) => item.kind === "submit");
    const hasAutoToggle = items.some((item) => item.kind === "auto-toggle");
    const hasTeamSelect = items.some((item) => item.kind === "team-select");
    const hasMatchSelect = items.some((item) => item.kind === "match-select");
    const hasTaggedButton = items.some(
      (item) =>
        (item.kind === "text" || item.kind === "icon") &&
        normalizeTag(item.tag ?? "").length > 0
    );

    if (!hasSubmit || !hasAutoToggle || !hasTeamSelect || !hasMatchSelect || !hasTaggedButton) {
      toast.error(
        "Required assets missing: submit, auto/teleop toggle, team select, match select, and at least one tagged button."
      );
      return false;
    }

    const requiresTagKinds: AssetKind[] = [
      "text",
      "icon",
      "movement",
      "input",
      "toggle",
      "button-slider",
      "slider",
    ];
    const missingTag = items.find(
      (item) =>
        requiresTagKinds.includes(item.kind) &&
        !item.stageRemoveParentTag &&
        normalizeTag(item.tag ?? "").length === 0
    );

    if (missingTag) {
      toast.error("All assets that require tags must have a tag before completion.");
      return false;
    }

    return true;
  }, [items]);

  const handleCompleteProject = React.useCallback(async () => {
    const uploadId = requestedUploadId || latestUploadId || "";
    if (!uploadId) {
      toast.error("Open a project from Project Manager before marking complete.");
      return;
    }

    const nextIsDraft = isProjectCompleted;
    if (!nextIsDraft && !validateProjectCompletion()) {
      return;
    }
    const payload = buildProjectPayload();

    try {
      const response = await fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          editorState: payload.editorState,
          backgroundImage,
          backgroundLocation,
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
    backgroundLocation,
    buildProjectPayload,
    isProjectCompleted,
    latestUploadId,
    requestedUploadId,
    validateProjectCompletion,
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
          backgroundLocation,
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
  }, [backgroundImage, backgroundLocation, buildDraftPayload, sessionData?.user?.id]);

  const persistProjectConfig = React.useCallback(async () => {
    if (!sessionData?.user?.id || !requestedUploadId) return;
    const payload = buildProjectPayload();
    const autosaveIsDraft = projectMeta?.isDraft !== false;

    setAutosaveState("saving");

    try {
      const response = await fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          editorState: payload.editorState,
          backgroundImage,
          backgroundLocation,
          uploadId: requestedUploadId,
          isDraft: autosaveIsDraft,
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
  }, [
    backgroundImage,
    backgroundLocation,
    buildProjectPayload,
    projectMeta?.isDraft,
    requestedUploadId,
    sessionData?.user?.id,
  ]);

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
        const readBackgroundValue = (value: unknown): string | null => {
          if (typeof value !== "string") return null;
          const trimmed = value.trim();
          return trimmed.length > 0 ? trimmed : null;
        };

        const resolveBackgroundFromConfig = async (
          configValue: unknown,
          fallbackUploadId?: string
        ) => {
          const configRecord = isRecord(configValue) ? configValue : null;
          const directBackground =
            readBackgroundValue(configRecord?.backgroundImage) ??
            readBackgroundValue(configRecord?.background_image);
          if (directBackground) return directBackground;

          const uploadId =
            readBackgroundValue(configRecord?.uploadId) ??
            readBackgroundValue(configRecord?.upload_id) ??
            readBackgroundValue(fallbackUploadId);

          if (!uploadId) return null;

          const backgroundResponse = await fetch(
            `/api/field-configs/public/${encodeURIComponent(uploadId)}/background-image`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (!backgroundResponse.ok) return null;

          const backgroundResult = (await backgroundResponse.json()) as unknown;
          const backgroundRecord = isRecord(backgroundResult) ? backgroundResult : null;
          const nestedConfig =
            isRecord(backgroundRecord?.config) ? backgroundRecord.config : null;

          return (
            readBackgroundValue(backgroundRecord?.backgroundImage) ??
            readBackgroundValue(backgroundRecord?.background_image) ??
            readBackgroundValue(nestedConfig?.backgroundImage) ??
            readBackgroundValue(nestedConfig?.background_image) ??
            null
          );
        };

        if (shouldStartBlank) {
          if (!isCancelled) {
            setItems([]);
            setAspectWidth("16");
            setAspectHeight("9");
            setAspectWidthDraft("16");
            setAspectHeightDraft("9");
            setBackgroundImage(null);
            setBackgroundLocation(null);
            setEventKey("");
            setEventKeyDraft("");
            setEnableEventTimeTracking(false);
            setEnableEventTimeTrackingDraft(false);
            setScoutType("match");
            setPostMatchQuestions([]);
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
            config?: {
              payload?: unknown;
              backgroundImage?: string | null;
              background_image?: string | null;
              background_location?: string | null;
              updatedAt?: string;
              uploadId?: string;
              upload_id?: string;
            } | null;
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
              const resolvedBackgroundImage = await resolveBackgroundFromConfig(
                selectedResult.config,
                requestedUploadId
              );
              setItems(nextState.items);
              setAspectWidth(nextState.aspectWidth || "16");
              setAspectHeight(nextState.aspectHeight || "9");
              setAspectWidthDraft(nextState.aspectWidth || "16");
              setAspectHeightDraft(nextState.aspectHeight || "9");
              setBackgroundImage(resolvedBackgroundImage ?? nextState.backgroundImage ?? null);
              setBackgroundLocation(
                typeof selectedResult.config?.background_location === "string"
                  ? selectedResult.config.background_location
                  : nextState.backgroundLocation ?? null
              );
              setScoutType(normalizeScoutType(nextState.scoutType));
              setPostMatchQuestions(nextState.postMatchQuestions ?? []);
              setEventKey(nextState.eventKey ?? "");
              setEventKeyDraft(nextState.eventKey ?? "");
              setEnableEventTimeTracking(Boolean(nextState.enableEventTimeTracking));
              setEnableEventTimeTrackingDraft(Boolean(nextState.enableEventTimeTracking));
              setIsCustomSideLayoutsEnabled(Boolean(nextState.useCustomSideLayouts));
              setEditorTeamSide(nextState.editorTeamSide ?? "red");
              setPreviewTeamSide(nextState.previewTeamSide ?? "red");
              setSelectedItemId(null);
              setStagingParentId(null);
              setPreviewStageParentId(null);
              setIsPreviewMode(false);
              setAutosaveUpdatedAt(selectedResult.config?.updatedAt ?? null);
              setLatestUploadId(
                selectedResult.config?.uploadId ??
                  selectedResult.config?.upload_id ??
                  requestedUploadId
              );
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
          config?: {
            payload?: unknown;
            backgroundImage?: string | null;
            background_image?: string | null;
            background_location?: string | null;
            updatedAt?: string;
            uploadId?: string;
            upload_id?: string;
          } | null;
        };

        const restoreCanvas = resolveRestoreCanvasSize(result.config?.payload);
        const restored = parsePersistedEditorState(
          result.config?.payload,
          restoreCanvas.width,
          restoreCanvas.height
        );
        if (!isCancelled && restored) {
          const resolvedBackgroundImage = await resolveBackgroundFromConfig(
            result.config,
            result.config?.uploadId ?? result.config?.upload_id ?? undefined
          );
          setItems(restored.items);
          setAspectWidth(restored.aspectWidth);
          setAspectHeight(restored.aspectHeight);
          setBackgroundImage(resolvedBackgroundImage ?? restored.backgroundImage);
          setBackgroundLocation(restored.backgroundLocation ?? null);
          setScoutType(normalizeScoutType(restored.scoutType));
          setPostMatchQuestions(restored.postMatchQuestions ?? []);
          setEventKey(restored.eventKey ?? "");
          setEventKeyDraft(restored.eventKey ?? "");
          setEnableEventTimeTracking(Boolean(restored.enableEventTimeTracking));
          setEnableEventTimeTrackingDraft(Boolean(restored.enableEventTimeTracking));
          setIsCustomSideLayoutsEnabled(Boolean(restored.useCustomSideLayouts));
          setEditorTeamSide(restored.editorTeamSide ?? "red");
          setPreviewTeamSide(restored.previewTeamSide ?? "red");
          setAutosaveUpdatedAt(result.config?.updatedAt ?? null);
          setLatestUploadId(result.config?.uploadId ?? result.config?.upload_id ?? null);
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
          project?: {
            name?: string;
            contentHash?: string | null;
            isDraft?: boolean;
            isPublic?: boolean;
            scoutType?: ScoutType;
          };
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
                isPublic: Boolean(result.project?.isPublic ?? false),
                scoutType: normalizeScoutType(result.project?.scoutType),
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
    if (!projectMeta?.scoutType) return;
    setScoutType(normalizeScoutType(projectMeta.scoutType));
  }, [projectMeta?.scoutType]);

  const handleProjectVisibilityToggle = React.useCallback(async () => {
    const uploadId = requestedUploadId || latestUploadId || "";
    if (!uploadId) {
      toast.error("Save this project before changing visibility.");
      return;
    }

    const nextIsPublic = !Boolean(projectMeta?.isPublic);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(uploadId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextIsPublic }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Unable to update visibility.");
      }

      setProjectMeta((prev) =>
        prev
          ? {
              ...prev,
              isPublic: nextIsPublic,
            }
          : prev
      );

      toast.success(nextIsPublic ? "Project is now public." : "Project is now private.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update project visibility.";
      toast.error(message);
    }
  }, [latestUploadId, projectMeta?.isPublic, requestedUploadId]);

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
    backgroundLocation,
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
      const autosaveIsDraft = requestedUploadId
        ? projectMeta?.isDraft !== false
        : true;

      const body = JSON.stringify(
        requestedUploadId
          ? {
              payload,
              editorState: payload.editorState,
              backgroundImage,
              backgroundLocation,
              uploadId: requestedUploadId,
              isDraft: autosaveIsDraft,
            }
          : {
              payload,
              editorState: payload.editorState,
              backgroundImage,
              backgroundLocation,
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
    backgroundLocation,
    buildDraftPayload,
    buildProjectPayload,
    projectMeta?.isDraft,
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
        const resizeItem = visibleItemsRef.current.find((item) => item.id === resize.id);
        const minSize = resizeItem
          ? getResizeMinSize(resizeItem.kind)
          : { width: 16, height: 6 };
        const maxWidth = Math.max(minSize.width, canvasSize.width - resize.originX);
        const maxHeight = Math.max(minSize.height, canvasSize.height - resize.originY);

        const rawWidth = Math.max(
          minSize.width,
          Math.min(resize.startWidth + (clientX - resize.startX), maxWidth)
        );
        const rawHeight = Math.max(
          minSize.height,
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
          minSize.width,
          Math.min(resolvedRight.value - activeLeft, maxWidth)
        );
        const nextHeight = Math.max(
          minSize.height,
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

      const resetDragState = () => {
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        setPalettePointerOffset({ x: 0, y: 0 });
        palettePointerStartRef.current = null;
        dragStartPointerRef.current = null;
        dragSelectionIdsRef.current = [];
      };

      if (isPreviewMode) {
        resetDragState();
        return;
      };

      if (isPreviewMode) {
        resetDragState();
        return;
      }

      const data = event.active.data.current as DragData | undefined;
      if (!data) {
        resetDragState();
        return;
      }

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const initialRect = event.active.rect.current.initial;
      const translatedRect = event.active.rect.current.translated;
      if (!canvasRect || !initialRect) {
        resetDragState();
        return;
      }

      const finalLeft = translatedRect?.left ?? initialRect.left + event.delta.x;
      const finalTop = translatedRect?.top ?? initialRect.top + event.delta.y;

      const activeItem =
        data.type === "canvas" && data.itemId
          ? items.find((item) => item.id === data.itemId)
          : null;
      const paletteKind = data.type === "palette" ? data.assetKind : undefined;
      const paletteSize = getAssetSize(paletteKind ?? "text");
      const activeWidth = activeItem?.width ?? paletteSize.width;
      const activeHeight = activeItem?.height ?? paletteSize.height;

      const isInsideCanvas =
        finalLeft + activeWidth > canvasRect.left &&
        finalLeft < canvasRect.right &&
        finalTop + activeHeight > canvasRect.top &&
        finalTop < canvasRect.bottom;

      const assetsRect = assetsRef.current?.getBoundingClientRect();
      const isInsideAssets = assetsRect
        ? finalLeft + activeWidth > assetsRect.left &&
          finalLeft < assetsRect.right &&
          finalTop + activeHeight > assetsRect.top &&
          finalTop < assetsRect.bottom
        : false;

      if (data?.type === "canvas" && data.itemId && isInsideAssets) {
        const draggedIds = dragSelectionIdsRef.current.includes(data.itemId)
          ? dragSelectionIdsRef.current
          : [data.itemId];
        const draggedSet = new Set(draggedIds);

        setItems((prev) =>
          prev.filter(
            (item) =>
              !draggedSet.has(item.id) &&
              !(item.stageParentId && draggedSet.has(item.stageParentId))
          )
        );
        setSelectedItemIds([]);
        setSelectedItemId(null);
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        setPalettePointerOffset({ x: 0, y: 0 });
        palettePointerStartRef.current = null;
        dragStartPointerRef.current = null;
        dragSelectionIdsRef.current = [];
        return;
      }

      if (!isInsideCanvas) {
        resetDragState();
        return;
      }

      let x = finalLeft - canvasRect.left;
      let y = finalTop - canvasRect.top;

      x = Math.max(0, Math.min(x, canvasRect.width - activeWidth));
      y = Math.max(0, Math.min(y, canvasRect.height - activeHeight));

      const snapToGuides = (
        nextX: number,
        nextY: number,
        excludedItemId?: string
      ) => {
        if (!isAlignmentAssistEnabled) {
          return { x: nextX, y: nextY };
        }

        let snappedX = nextX;
        let snappedY = nextY;
        let bestXDiff = GUIDE_SNAP_PX + 1;
        let bestYDiff = GUIDE_SNAP_PX + 1;

        const sourceLeft = nextX;
        const sourceRight = nextX + activeWidth;
        const sourceCenterX = nextX + activeWidth / 2;
        const sourceTop = nextY;
        const sourceBottom = nextY + activeHeight;
        const sourceCenterY = nextY + activeHeight / 2;

        visibleItems
          .filter((item) => item.kind !== "mirror" && item.id !== excludedItemId)
          .forEach((item) => {
            const left = item.x;
            const right = item.x + item.width;
            const centerX = item.x + item.width / 2;
            const top = item.y;
            const bottom = item.y + item.height;
            const centerY = item.y + item.height / 2;

            const candidatesX = [
              { diff: Math.abs(sourceLeft - left), value: left },
              { diff: Math.abs(sourceRight - right), value: right - activeWidth },
              { diff: Math.abs(sourceLeft - right), value: right },
              { diff: Math.abs(sourceRight - left), value: left - activeWidth },
              { diff: Math.abs(sourceCenterX - centerX), value: centerX - activeWidth / 2 },
            ];
            candidatesX.forEach((candidate) => {
              if (candidate.diff <= GUIDE_SNAP_PX && candidate.diff < bestXDiff) {
                bestXDiff = candidate.diff;
                snappedX = candidate.value;
              }
            });

            const candidatesY = [
              { diff: Math.abs(sourceTop - top), value: top },
              { diff: Math.abs(sourceBottom - bottom), value: bottom - activeHeight },
              { diff: Math.abs(sourceTop - bottom), value: bottom },
              { diff: Math.abs(sourceBottom - top), value: top - activeHeight },
              { diff: Math.abs(sourceCenterY - centerY), value: centerY - activeHeight / 2 },
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
        const draggedIds = dragSelectionIdsRef.current.includes(data.itemId)
          ? dragSelectionIdsRef.current
          : [data.itemId];
        const draggedSet = new Set(draggedIds);
        const adjustedX = x + (dragSnapOffset.itemId === data.itemId ? dragSnapOffset.x : 0);
        const adjustedY = y + (dragSnapOffset.itemId === data.itemId ? dragSnapOffset.y : 0);

        setItems((prev) => {
          const draggedItem = prev.find((entry) => entry.id === data.itemId);
          if (!draggedItem) return prev;

          if (draggedIds.length <= 1) {
            return prev.map((item) => {
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
            });
          }

          const draggedTarget =
            draggedItem.kind === "mirror"
              ? { x: adjustedX, y: adjustedY }
              : snapToGuides(adjustedX, adjustedY);
          const deltaX = draggedTarget.x - draggedItem.x;
          const deltaY = draggedTarget.y - draggedItem.y;

          return prev.map((item) => {
            if (!draggedSet.has(item.id)) return item;

            const nextX = Math.max(
              0,
              Math.min(item.x + deltaX, canvasRect.width - item.width)
            );
            const nextY = Math.max(
              0,
              Math.min(item.y + deltaY, canvasRect.height - item.height)
            );
            const appliedDX = nextX - item.x;
            const appliedDY = nextY - item.y;

            if (item.kind !== "mirror") {
              return {
                ...item,
                x: nextX,
                y: nextY,
              };
            }

            const startX = (item.startX ?? item.x) + appliedDX;
            const startY = (item.startY ?? item.y) + appliedDY;
            const endX = (item.endX ?? item.x + item.width) + appliedDX;
            const endY = (item.endY ?? item.y + item.height) + appliedDY;

            return {
              ...item,
              x: nextX,
              y: nextY,
              startX,
              startY,
              endX,
              endY,
            };
          });
        });
        setActiveType(null);
        setAlignmentGuides({ vertical: [], horizontal: [] });
        setDragSnapOffset({ itemId: null, x: 0, y: 0 });
        setPaletteSnapOffset({ x: 0, y: 0 });
        setPalettePointerOffset({ x: 0, y: 0 });
        palettePointerStartRef.current = null;
        dragStartPointerRef.current = null;
        dragSelectionIdsRef.current = [];
        return;
      }

      if (data.type === "palette") {
        if (!isInsideCanvas) {
          resetDragState();
          return;
        }

        if (isCustomSideLayoutsEnabled && data.assetKind === "mirror") {
          resetDragState();
          return;
        }

        if (data.assetKind === "mirror" && items.some((item) => item.kind === "mirror")) {
          resetDragState();
          return;
        }

        if (
          data.assetKind === "start-position" &&
          items.some((item) => item.kind === "start-position")
        ) {
          resetDragState();
          return;
        }

        let x = finalLeft - canvasRect.left + palettePointerOffset.x;
        let y = finalTop - canvasRect.top + palettePointerOffset.y;

        const isCenterPlaced =
          data.assetKind === "icon" ||
          data.assetKind === "toggle" ||
          data.assetKind === "auto-toggle";
        const shouldCenterAnchor = shouldCenterPaletteAnchor(data.assetKind ?? "text");
        if (shouldCenterAnchor) {
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
        }

        x = Math.max(0, Math.min(x, canvasRect.width - activeWidth));
        y = Math.max(0, Math.min(y, canvasRect.height - activeHeight));

        if (isAlignmentAssistEnabled && data.assetKind !== "mirror" && !isCenterPlaced) {
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
        if (!isAssetAllowedForScoutType(kind)) {
          toast.error("This asset is not allowed for this scouting type.");
          resetDragState();
          return;
        }
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

        setItems((prev) => {
          const synchronizedMovementDirection = normalizeMovementDirection(
            prev.find((item) => item.kind === "movement")?.movementDirection ?? "left"
          );

          return [
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
            movementDirection:
              kind === "movement" ? synchronizedMovementDirection : undefined,
            outlineColor: kind === "icon" ? "#ffffff" : undefined,
            fillColor: kind === "icon" ? "transparent" : undefined,
            buttonPressMode:
              kind === "text" || kind === "icon" ? "tap" : undefined,
            increment: kind === "text" || kind === "icon" ? 1 : undefined,
            buttonSliderIncreaseDirection:
              kind === "button-slider" ? "right" : undefined,
            sliderMax: kind === "slider" ? 100 : undefined,
            sliderMid: kind === "slider" ? 50 : undefined,
            sliderLeftText: kind === "slider" ? "Low" : undefined,
            sliderRightText: kind === "slider" ? "High" : undefined,
            startX: kind === "mirror" ? mirrorStartX : undefined,
            startY: kind === "mirror" ? mirrorStartY : undefined,
            endX: kind === "mirror" ? mirrorEndX : undefined,
            endY: kind === "mirror" ? mirrorEndY : undefined,
            placeholder: kind === "input" ? "Enter text" : undefined,
            inputValueMode: kind === "input" ? "both" : undefined,
            inputIsTextArea: kind === "input" ? false : undefined,
            teamSelectValue:
              kind === "team-select" ? getDefaultTeamSelectOptionValue() : undefined,
            teamSelectLinkToStage: kind === "team-select" ? false : undefined,
            teamSelectAlwaysShowStagedElements:
              kind === "team-select" ? false : undefined,
            matchSelectValue:
              kind === "match-select" ? MATCH_SELECT_MIN_VALUE : undefined,
            toggleOn: kind === "toggle" ? false : undefined,
            toggleStyle: kind === "toggle" ? "switch" : undefined,
            toggleTextAlign: kind === "toggle" ? "center" : undefined,
            toggleTextSize: kind === "toggle" ? 10 : undefined,
            autoToggleMode: kind === "auto-toggle" ? "auto" : undefined,
            autoToggleDurationSeconds: kind === "auto-toggle" ? 15 : undefined,
            autoToggleTeleopDurationSeconds: kind === "auto-toggle" ? 135 : undefined,
            autoTeleopScope: autoTeleopScopedEditMode ?? undefined,
            teamSide:
              isCustomSideLayoutsEnabled && kind !== "mirror"
                ? editorTeamSide
                : undefined,
            swapRedSide: kind === "swap" ? "left" : undefined,
            swapActiveSide: kind === "swap" ? "left" : undefined,
            stageParentId: stagingParentId ?? undefined,
            stageRemoveParentTag:
              kind === "text" || kind === "icon" || kind === "movement"
                ? false
                : undefined,
            successTrackingEnabled:
              kind === "text" || kind === "icon" ? false : undefined,
            successPopoverOffsetX:
              kind === "text" || kind === "icon" ? 0 : undefined,
            successPopoverOffsetY:
              kind === "text" || kind === "icon" ? 0 : undefined,
            coverVisible: kind === "cover" ? true : undefined,
            startPositionVisible: kind === "start-position" ? true : undefined,
            },
          ];
        });
        setSelectedItemId(newId);
        setSelectedItemIds([newId]);
        resetDragState();
      }
    },
    [
      isPreviewMode,
      items,
      visibleItems,
      isAlignmentAssistEnabled,
      palettePointerOffset.x,
      palettePointerOffset.y,
      isCustomSideLayoutsEnabled,
      editorTeamSide,
      isAssetAllowedForScoutType,
      autoTeleopScopedEditMode,
      stagingParentId,
    ]
  );

  const handleResetEditor = React.useCallback(() => {
    Object.values(autoToggleTimeoutsRef.current).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    Object.values(autoToggleIntervalsRef.current).forEach((intervalId) => {
      window.clearInterval(intervalId);
    });
    autoToggleTimeoutsRef.current = {};
    autoToggleIntervalsRef.current = {};
    setAutoToggleCountdowns({});
    clearAllPreviewButtonSliderLoops();
    setPreviewInputValues({});
    setPreviewTeamSelectValues({});
    setPreviewMatchSelectValues({});
    setPreviewButtonSliderValues({});
    setPreviewSliderValues({});
    setPreviewStartPositions({});
    setHiddenPreviewStartPositionIds({});
    setPreviewSuccessOpenItemId(null);
    previewHoldStartByIdRef.current = {};
    clearPreviewHoldInterval();
    setPreviewHoldDurationsById({});
    setPreviewLogText("");
    setItems([]);
    setBackgroundImage(null);
    setBackgroundLocation(null);
    setAspectWidth("16");
    setAspectHeight("9");
    setAspectWidthDraft("16");
    setAspectHeightDraft("9");
    setEventKey("");
    setEventKeyDraft("");
    setEnableEventTimeTracking(false);
    setEnableEventTimeTrackingDraft(false);
    setIsCustomSideLayoutsEnabled(false);
    setEditorTeamSide("red");
    setPreviewTeamSide("red");
    setAlignmentGuides({ vertical: [], horizontal: [] });
    setDragSnapOffset({ itemId: null, x: 0, y: 0 });
    setPaletteSnapOffset({ x: 0, y: 0 });
    setActiveType(null);
    setSelectedItemId(null);
    setSelectedItemIds([]);
    setIsPreviewMode(false);
    setIsPreviewSwapMirrored(false);
    setLatestUploadId(null);
    historyRef.current = [];
    historyIndexRef.current = -1;
    lastSnapshotKeyRef.current = "";
    setCanUndo(false);
    setCanRedo(false);
  }, [clearAllPreviewButtonSliderLoops, clearPreviewHoldInterval]);

  React.useEffect(() => {
    setSelectedItemIds((prev) => prev.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  React.useEffect(() => {
    if (selectedItemIds.length === 0) {
      setIsMassSelectionActive(false);
      if (selectedItemId !== null) {
        setSelectedItemId(null);
      }
      return;
    }

    const visibleSelectedIds = selectedItemIds.filter((id) =>
      visibleItems.some((item) => item.id === id)
    );

    if (visibleSelectedIds.length === 0) {
      if (selectedItemId !== null) {
        setSelectedItemId(null);
      }
      return;
    }

    if (selectedItemId && visibleSelectedIds.includes(selectedItemId)) return;
    setSelectedItemId(visibleSelectedIds[visibleSelectedIds.length - 1] ?? null);
  }, [selectedItemId, selectedItemIds, visibleItems]);

  React.useEffect(() => {
    if (isPreviewMode) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const isInsideCanvas = Boolean(canvasRef.current?.contains(target));
      if (!isInsideCanvas) return;
      const canvasItem = target.closest('[data-canvas-item="true"]') as HTMLElement | null;
      if (canvasItem) return;
      if (autoTeleopScopedEditMode) {
        setAutoTeleopScopedEditMode(null);
      }
      setSelectedItemIds([]);
      setSelectedItemId(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [autoTeleopScopedEditMode, isPreviewMode]);

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
    if (previewPressedItemId) {
      setPreviewPressedItemId(null);
    }
    if (Object.keys(previewHoldStartByIdRef.current).length > 0) {
      previewHoldStartByIdRef.current = {};
      setPreviewHoldDurationsById({});
      clearPreviewHoldInterval();
    }
  }, [clearPreviewHoldInterval, isPreviewMode, previewPressedItemId]);

  React.useEffect(
    () => () => {
      clearPreviewHoldInterval();
    },
    [clearPreviewHoldInterval]
  );

  React.useEffect(() => {
    if (isPreviewMode) {
      assetsPanelScalePendingRef.current = null;
      return;
    }

    const pending = assetsPanelScalePendingRef.current;
    if (!pending) return;
    if (pending.targetHidden !== isAssetsPanelHidden) return;

    // Consume pending state once to avoid repeated scale attempts during layout churn.
    assetsPanelScalePendingRef.current = null;

    const nextWidth = stageSizeRef.current.width;
    const nextHeight = stageSizeRef.current.height;
    if (
      pending.baseWidth <= 0 ||
      pending.baseHeight <= 0 ||
      nextWidth <= 0 ||
      nextHeight <= 0
    ) {
      return;
    }

    const scaleX = nextWidth / pending.baseWidth;
    const scaleY = nextHeight / pending.baseHeight;
    if (Math.abs(scaleX - 1) < 0.002 && Math.abs(scaleY - 1) < 0.002) {
      return;
    }

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    setItems((prev) =>
      prev.map((item) => {
        const nextItemWidth = Math.max(1, item.width * scaleX);
        const nextItemHeight = Math.max(1, item.height * scaleY);
        const maxX = Math.max(0, nextWidth - nextItemWidth);
        const maxY = Math.max(0, nextHeight - nextItemHeight);

        return {
          ...item,
          x: clamp(item.x * scaleX, 0, maxX),
          y: clamp(item.y * scaleY, 0, maxY),
          width: nextItemWidth,
          height: nextItemHeight,
          startX: typeof item.startX === "number" ? item.startX * scaleX : undefined,
          startY: typeof item.startY === "number" ? item.startY * scaleY : undefined,
          endX: typeof item.endX === "number" ? item.endX * scaleX : undefined,
          endY: typeof item.endY === "number" ? item.endY * scaleY : undefined,
        };
      })
    );
  }, [isAssetsPanelHidden, isPreviewMode, stageSize.height, stageSize.width]);

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

  const renderedLayeredVisibleItems = React.useMemo(() => {
    let previewItems = layeredVisibleItems;

    if (isPreviewMode && isPreviewSwapMirrored && !isCustomSideLayoutsEnabled) {
      const mirrorLine = layeredVisibleItems.find((item) => item.kind === "mirror");
      if (mirrorLine) {
        const startX = mirrorLine.startX ?? mirrorLine.x;
        const startY = mirrorLine.startY ?? mirrorLine.y;
        const endX = mirrorLine.endX ?? mirrorLine.x + mirrorLine.width;
        const endY = mirrorLine.endY ?? mirrorLine.y + mirrorLine.height;
        const dx = endX - startX;
        const dy = endY - startY;
        const denom = dx * dx + dy * dy;
        const boundsWidth = previewBaseStageSize?.width ?? stageSize.width;
        const boundsHeight = previewBaseStageSize?.height ?? stageSize.height;

        if (denom !== 0 && boundsWidth > 0 && boundsHeight > 0) {
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

          previewItems = layeredVisibleItems.map((item) => {
            if (item.kind === "mirror") return item;

            const centerX = item.x + item.width / 2;
            const centerY = item.y + item.height / 2;
            const reflected = reflectPoint(centerX, centerY);

            return {
              ...item,
              x: Math.min(
                Math.max(0, reflected.x - item.width / 2),
                boundsWidth - item.width
              ),
              y: Math.min(
                Math.max(0, reflected.y - item.height / 2),
                boundsHeight - item.height
              ),
              swapActiveSide:
                item.kind === "swap"
                  ? (item.swapActiveSide ?? "left") === "left"
                    ? "right"
                    : "left"
                  : item.swapActiveSide,
            };
          });
        }
      }
    }

    if (!isPreviewMode || !previewBaseStageSize) {
      return previewItems;
    }

    const scaleX =
      previewBaseStageSize.width > 0
        ? stageSize.width / previewBaseStageSize.width
        : 1;
    const scaleY =
      previewBaseStageSize.height > 0
        ? stageSize.height / previewBaseStageSize.height
        : 1;

    if (scaleX === 1 && scaleY === 1) {
      return previewItems;
    }

    return previewItems.map((item) => {
      if (item.kind === "mirror") {
        return {
          ...item,
          x: item.x * scaleX,
          y: item.y * scaleY,
          width: item.width * scaleX,
          height: item.height * scaleY,
          startX: typeof item.startX === "number" ? item.startX * scaleX : undefined,
          startY: typeof item.startY === "number" ? item.startY * scaleY : undefined,
          endX: typeof item.endX === "number" ? item.endX * scaleX : undefined,
          endY: typeof item.endY === "number" ? item.endY * scaleY : undefined,
        };
      }

      return {
        ...item,
        x: item.x * scaleX,
        y: item.y * scaleY,
        width: item.width * scaleX,
        height: item.height * scaleY,
      };
    });
  }, [
    isCustomSideLayoutsEnabled,
    isPreviewMode,
    isPreviewSwapMirrored,
    layeredVisibleItems,
    previewBaseStageSize,
    stageSize.height,
    stageSize.width,
  ]);

  const setAssetsPanelVisibility = React.useCallback(
    (nextHidden: boolean) => {
      if (isAssetsPanelHidden === nextHidden) return;
      assetsPanelScalePendingRef.current = {
        baseWidth: stageSizeRef.current.width,
        baseHeight: stageSizeRef.current.height,
        targetHidden: nextHidden,
      };
      setIsAssetsPanelHidden(nextHidden);
    },
    [isAssetsPanelHidden]
  );

  const isSwapMirrored = React.useMemo(() => {
    const swapItem = renderedLayeredVisibleItems.find((item) => item.kind === "swap");
    if (!swapItem) return false;
    return (swapItem.swapActiveSide ?? "left") !== (swapItem.swapRedSide ?? "left");
  }, [renderedLayeredVisibleItems]);

  React.useEffect(() => {
    isSwapMirroredRef.current = isSwapMirrored;
  }, [isSwapMirrored]);

  const startPositionColorSide: TeamSide =
    isCustomSideLayoutsEnabled
      ? currentVisibleTeamSide
      : isSwapMirrored
        ? "blue"
        : "red";

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
                GScout
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
                      setAutoTeleopVisibilityMode(null);
                      clearAllPreviewButtonSliderLoops();
                      setIsPreviewSwapMirrored(false);
                      setPreviewBaseStageSize({
                        width: stageSizeRef.current.width,
                        height: stageSizeRef.current.height,
                      });
                      previewBaseStageSizeRef.current = {
                        width: stageSizeRef.current.width,
                        height: stageSizeRef.current.height,
                      };
                      setStagingParentId(null);
                      setPreviewStageParentId(null);
                      setPreviewPressedItemId(null);
                      previewHoldStartByIdRef.current = {};
                      clearPreviewHoldInterval();
                      setPreviewHoldDurationsById({});
                      setPreviewTeamSide(editorTeamSide);
                      setPreviewInputValues({});
                      setPreviewTeamSelectValues({});
                      setPreviewMatchSelectValues({});
                      setPreviewButtonSliderValues({});
                      setPreviewSliderValues({});
                      setPreviewStartPositions({});
                      setHiddenPreviewStartPositionIds({});
                      setPreviewSuccessOpenItemId(null);
                      setPreviewLogText("");
                    } else {
                      setAutoTeleopVisibilityMode(null);
                      clearAllPreviewButtonSliderLoops();
                      setIsPreviewSwapMirrored(false);
                      setPreviewBaseStageSize(null);
                      previewBaseStageSizeRef.current = null;
                      setPreviewStageParentId(null);
                      previewHoldStartByIdRef.current = {};
                      clearPreviewHoldInterval();
                      setPreviewHoldDurationsById({});
                      setPreviewInputValues({});
                      setPreviewTeamSelectValues({});
                      setPreviewMatchSelectValues({});
                      setPreviewButtonSliderValues({});
                      setPreviewSliderValues({});
                      setPreviewStartPositions({});
                      setHiddenPreviewStartPositionIds({});
                      setPreviewSuccessOpenItemId(null);
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
              {canShowQrButton ? (
                <Button
                  variant="outline"
                  type="button"
                  className="h-10 gap-2 rounded-lg border-white/15 bg-slate-900/60 px-4 text-white hover:bg-slate-800/80"
                  onClick={() => setIsQrDialogOpen(true)}
                >
                  <QrCode className="h-4 w-4" />
                  QR
                </Button>
              ) : null}
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

        <main
          className={`mx-auto w-full px-5 ${
            isPreviewMode
              ? "grid h-[calc(100vh-86px)] max-w-none grid-cols-1 px-0 py-0"
              : `grid max-w-[1760px] grid-cols-1 gap-4 py-5 ${
                  isAssetsPanelHidden
                    ? "xl:grid-cols-[minmax(0,1fr)_260px]"
                    : "xl:grid-cols-[260px_minmax(0,1fr)_260px]"
                }`
          }`}
        >
          <aside
            ref={(node: HTMLDivElement | null) => {
              setAssetsRef(node);
              assetsPanelRef.current = node;
            }}
            className={`${
              isPreviewMode || isAssetsPanelHidden
                ? "hidden"
                : "flex h-[min(72vh,700px)]"
            } min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.03] bg-slate-900/70 p-4 text-white shadow-2xl backdrop-blur`}
          >
            <div className="mb-4 flex items-center justify-between gap-2 px-1">
              <h2 className="text-3xl font-semibold tracking-tight">Assets</h2>
              <Button
                type="button"
                variant="outline"
                aria-label="Hide assets panel"
                className="h-8 gap-1 rounded-md border-white/15 bg-slate-900/80 px-2 text-xs font-semibold text-white hover:bg-slate-800/90"
                onClick={() => setAssetsPanelVisibility(true)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Hide
              </Button>
            </div>

            <div className="mb-3 px-1">
              <Input
                value={assetSearch}
                onChange={(event) => setAssetSearch(event.target.value)}
                placeholder="Search assets"
                className="h-10 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
              />
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
                {isAssetAllowedForScoutType("text") && matchesAssetSearch(["button", "text"]) ? (
                  <PaletteButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
                {isAssetAllowedForScoutType("button-slider") && matchesAssetSearch(["button slider", "slider", "counter", "increment"]) ? (
                  <PaletteButtonSliderButton
                    onPalettePointerDown={handlePalettePointerDown}
                  />
                ) : null}
                {isAssetAllowedForScoutType("slider") && matchesAssetSearch(["slider", "range", "shadcn"]) ? (
                  <PaletteSliderButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
                {isAssetAllowedForScoutType("undo") && matchesAssetSearch(["undo"]) ? (
                  <PaletteActionButton
                    kind="undo"
                    title="Undo"
                    description="Undo previous change"
                    icon={<Undo2 className="h-4 w-4" />}
                    onPalettePointerDown={handlePalettePointerDown}
                  />
                ) : null}
                {isAssetAllowedForScoutType("redo") && matchesAssetSearch(["redo"]) ? (
                  <PaletteActionButton
                    kind="redo"
                    title="Redo"
                    description="Redo reverted change"
                    icon={<Redo2 className="h-4 w-4" />}
                    onPalettePointerDown={handlePalettePointerDown}
                  />
                ) : null}
                {isAssetAllowedForScoutType("submit") && matchesAssetSearch(["submit", "send"]) ? (
                  <PaletteActionButton
                    kind="submit"
                    title="Submit"
                    description="Submit current input values"
                    icon={<Send className="h-4 w-4" />}
                    onPalettePointerDown={handlePalettePointerDown}
                  />
                ) : null}
                {isAssetAllowedForScoutType("reset") && matchesAssetSearch(["reset", "clear"]) ? (
                  <PaletteActionButton
                    kind="reset"
                    title="Reset"
                    description="Clear all inputs"
                    icon={<RotateCcw className="h-4 w-4" />}
                    onPalettePointerDown={handlePalettePointerDown}
                  />
                ) : null}
                {isAssetAllowedForScoutType("icon") && matchesAssetSearch(["icon", "bot"]) ? (
                  <PaletteIconButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
                {isAssetAllowedForScoutType("mirror") && matchesAssetSearch(["mirror", "line"]) ? (
                  <PaletteMirrorButton
                    onPalettePointerDown={handlePalettePointerDown}
                    disabled={isCustomSideLayoutsEnabled}
                  />
                ) : null}
                {isAssetAllowedForScoutType("input") && matchesAssetSearch(["input", "text field"]) ? (
                  <PaletteInputButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
                {isAssetAllowedForScoutType("team-select") && matchesAssetSearch(["drop down", "dropdown", "team", "select", "radio"]) ? (
                  <PaletteTeamSelectButton
                    onPalettePointerDown={handlePalettePointerDown}
                  />
                ) : null}
                {isAssetAllowedForScoutType("match-select") && matchesAssetSearch(["match", "increment", "plus", "minus", "select"]) ? (
                  <PaletteMatchSelectButton
                    onPalettePointerDown={handlePalettePointerDown}
                  />
                ) : null}
                {isAssetAllowedForScoutType("log") && matchesAssetSearch(["log", "output"]) ? (
                  <PaletteLogButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
                {isAssetAllowedForScoutType("toggle") && matchesAssetSearch(["toggle", "switch"]) ? (
                  <PaletteToggleButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
                {isAssetAllowedForScoutType("auto-toggle") && matchesAssetSearch(["auto", "teleop", "toggle"]) ? (
                  <PaletteAutoToggleButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
                {isAssetAllowedForScoutType("cover") && matchesAssetSearch(["cover", "overlay"]) ? (
                  <PaletteCoverButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
                {isAssetAllowedForScoutType("start-position") && matchesAssetSearch(["start", "position", "spawn", "tap"]) ? (
                  <PaletteStartPositionButton
                    onPalettePointerDown={handlePalettePointerDown}
                    hasAsset={hasStartPositionAsset}
                    isVisible={isStartPositionAssetVisible}
                    onToggleVisibility={handleStartPositionVisibilityToggle}
                  />
                ) : null}
                {isAssetAllowedForScoutType("swap") && matchesAssetSearch(["swap", "side", "layout"]) ? (
                  <PaletteSwapButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
                {isAssetAllowedForScoutType("movement") && matchesAssetSearch(["movement", "arrow", "left", "right", "direction"]) ? (
                  <PaletteMovementButton onPalettePointerDown={handlePalettePointerDown} />
                ) : null}
              </div>
            </ScrollArea>
          </aside>

          <section className={`relative min-w-0 ${isPreviewMode ? "h-full" : ""}`}>
            {!isPreviewMode && isAssetsPanelHidden ? (
              <Button
                type="button"
                variant="outline"
                aria-label="Show assets panel"
                className="absolute left-0 top-2 z-30 inline-flex h-9 gap-2 rounded-lg border-white/15 bg-slate-900/85 px-3 text-xs font-semibold text-white shadow-lg backdrop-blur hover:bg-slate-800/90"
                onClick={() => setAssetsPanelVisibility(false)}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Show assets
              </Button>
            ) : null}
            <div
              ref={canvasPanelRef}
              className={`relative flex min-h-0 items-center justify-center overflow-hidden ${
                isPreviewMode
                  ? "h-full rounded-none border-0 bg-transparent shadow-none backdrop-blur-0"
                  : "h-[min(72vh,700px)] rounded-2xl border border-white/[0.03] bg-slate-900/60 p-1 shadow-2xl backdrop-blur"
              }`}
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
                    className={`relative h-full w-full overflow-hidden transition-colors ${
                      isPreviewMode
                        ? "rounded-none border-0 bg-slate-950"
                        : "rounded-xl border border-white/[0.03] bg-slate-950/90"
                    } ${
                      isOver && !isPreviewMode ? "ring-1 ring-blue-300/25" : ""
                    }`}
                    onPointerDownCapture={(event) => {
                      const target = event.target as HTMLElement | null;
                      if (!target) return;
                      if (!isPreviewMode && stagingParentId) {
                        const clickedInteractiveControl = Boolean(
                          target.closest(
                            'button, input, select, textarea, [role="button"], [role="switch"]'
                          )
                        );
                        if (!clickedInteractiveControl) {
                          setStagingParentId(null);
                        }
                        return;
                      }
                      if (!isPreviewMode || !previewStageParentId) return;
                      const clickedCover = Boolean(
                        target.closest('[data-canvas-kind="cover"]')
                      );
                      const clickedCanvasItem = Boolean(
                        target.closest('[data-canvas-item="true"]')
                      );
                      if (clickedCover || !clickedCanvasItem) {
                        setPreviewStageParentId(null);
                      }
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                    }}
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
                      <div className="pointer-events-none absolute inset-0 z-40">
                        {[...new Set(alignmentGuides.vertical.map(v => Math.round(v)))].map((xGuide) => (
                          <div
                            key={`v-${xGuide}`}
                            className="absolute top-0 h-full border-l border-solid border-sky-300/70"
                            style={{ left: xGuide }}
                          />
                        ))}
                        {[...new Set(alignmentGuides.horizontal.map(v => Math.round(v)))].map((yGuide) => (
                          <div
                            key={`h-${yGuide}`}
                            className="absolute left-0 w-full border-t border-solid border-sky-300/70"
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
                    renderedLayeredVisibleItems.map((item) => {
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
                        onSelect={handleCanvasItemSelect}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "cover" ? (
                      <MemoCanvasCover
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={handleCanvasItemSelect}
                        onPreviewExitStage={handlePreviewStageExit}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "start-position" ? (
                      <MemoCanvasStartPosition
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={handleCanvasItemSelect}
                        onPreviewTap={handlePreviewStartPositionTap}
                        previewPosition={
                          previewStartPositions[getScopedPreviewKey(item, item.id)]
                        }
                        isPreviewHidden={Boolean(hiddenPreviewStartPositionIds[item.id])}
                        visibleTeamSide={startPositionColorSide}
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
                        onSelect={handleCanvasItemSelect}
                        previewValue={
                          previewInputValues[
                            getScopedPreviewKey(
                              item,
                              normalizeTag(item.tag ?? "") || item.id
                            )
                          ] ?? ""
                        }
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "team-select" ? (
                      <MemoCanvasTeamSelect
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onPreviewValueChange={handlePreviewTeamSelectChange}
                        onSelect={handleCanvasItemSelect}
                        onStageContextMenu={handleStageContextMenu}
                        hasStages={stageRootIds.has(item.id)}
                        previewValue={
                          previewTeamSelectValues[item.id] ??
                          getDefaultTeamSelectOptionValue()
                        }
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "match-select" ? (
                      <MemoCanvasMatchSelect
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onPreviewValueChange={handlePreviewMatchSelectChange}
                        onSelect={handleCanvasItemSelect}
                        previewValue={
                          previewMatchSelectValues[getScopedPreviewKey(item, item.id)] ??
                          clampMatchSelectValue(
                            item.matchSelectValue ?? MATCH_SELECT_MIN_VALUE
                          )
                        }
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "slider" ? (
                      <MemoCanvasSlider
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={handleCanvasItemSelect}
                        previewValue={
                          previewSliderValues[item.id] ??
                          Math.max(
                            0,
                            Math.min(item.sliderMax ?? 100, item.sliderMid ?? 50)
                          )
                        }
                        onPreviewValueChange={handlePreviewSliderChange}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "log" ? (
                      <MemoCanvasLog
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={handleCanvasItemSelect}
                        logText={previewLogText}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "toggle" ? (
                      <MemoCanvasToggle
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={handleCanvasItemSelect}
                        onToggle={handleToggleItem}
                        snapOffset={snapOffset}
                        isSwapMirrored={isSwapMirrored}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : item.kind === "auto-toggle" ? (
                      <MemoCanvasAutoToggle
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onSelect={handleCanvasItemSelect}
                        onToggle={handleAutoToggleItem}
                        onContextSwapVisibility={handleAutoTeleopVisibilitySwap}
                        visibilityMode={effectiveAutoTeleopVisibilityMode}
                        countdownSeconds={autoToggleCountdowns[item.id]}
                        snapOffset={snapOffset}
                        isSwapMirrored={isSwapMirrored}
                        isPreviewMode={isEditorReadOnly}
                      />
                    ) : (
                      <MemoCanvasButton
                        key={item.id}
                        item={item}
                        onResizeStart={handleResizeStart}
                        onEditLabel={handleEditLabel}
                        onSwapSides={handleSwapSides}
                        onToggleMovementDirection={handleToggleMovementDirection}
                        onPreviewButtonAction={handlePreviewButtonAction}
                        onSelect={handleCanvasItemSelect}
                        onPreviewPressStart={handlePreviewPressStart}
                        onPreviewPressEnd={handlePreviewPressEnd}
                        onPreviewButtonSliderDragStart={handlePreviewButtonSliderDragStart}
                        onPreviewButtonSliderDragMove={handlePreviewButtonSliderDragMove}
                        onPreviewButtonSliderDragEnd={handlePreviewButtonSliderDragEnd}
                        onPreviewSuccessToggle={handlePreviewSuccessToggle}
                        onPreviewSuccessSelect={handlePreviewSuccessSelect}
                        onSuccessContextAdjust={handleSuccessContextAdjust}
                        onPreviewStageToggle={handlePreviewStageToggle}
                        onStageContextMenu={handleStageContextMenu}
                        hasStages={stageRootIds.has(item.id)}
                        isPreviewPressed={previewPressedItemId === item.id}
                        previewButtonSliderValue={previewButtonSliderValues[item.id]}
                        previewButtonSliderDragInfo={previewButtonSliderDragById[item.id]}
                        previewSuccessOpen={previewSuccessOpenItemId === item.id}
                        previewHoldDurationMs={previewHoldDurationsById[item.id]}
                        isCustomSideLayoutsEnabled={isCustomSideLayoutsEnabled}
                        visibleTeamSide={currentVisibleTeamSide}
                        snapOffset={snapOffset}
                        isPreviewMode={isEditorReadOnly}
                      />
                    );
                    })}
                  {!isEditorReadOnly &&
                  selectedGroupBounds &&
                  isMassSelectionActive &&
                  activeType !== "canvas" ? (
                    <div
                      className="pointer-events-none absolute z-30 rounded-md border-2 border-dashed border-sky-300/85"
                      style={{
                        left: selectedGroupBounds.x - 6,
                        top: selectedGroupBounds.y - 6,
                        width: selectedGroupBounds.width + 12,
                        height: selectedGroupBounds.height + 12,
                      }}
                    />
                  ) : null}
                  </section>
                </div>
              </div>

            </div>
          </section>

          <div
            className={`${
              isPreviewMode ? "hidden" : "flex h-[min(72vh,700px)]"
            } min-h-0 flex-col gap-3`}
          >
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
                  <Label className="text-sm text-white/80">Button mode</Label>
                  <ToggleGroup
                    type="single"
                    value={normalizeButtonPressMode(selectedItem.buttonPressMode)}
                    onValueChange={(value) => {
                      if (value === "tap" || value === "hold") {
                        handleSelectedButtonPressModeChange(value);
                      }
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <ToggleGroupItem
                      value="tap"
                      className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                    >
                      Tap
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="hold"
                      className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                    >
                      Hold
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {!selectedItem.stageRemoveParentTag ? (
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
                ) : (
                  <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/65">
                    Parent tag is removed for this staged element.
                  </div>
                )}

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

                <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                  <div className="grid gap-0.5">
                    <Label className="text-xs text-white/80">Track success</Label>
                    <p className="text-[11px] text-white/60">
                      In preview, click opens check/X chooser in-place.
                    </p>
                  </div>
                  <Switch
                    checked={selectedItem.successTrackingEnabled === true}
                    onCheckedChange={(value) => {
                      if (!selectedItemId) return;
                      setItems((prev) =>
                        prev.map((item) =>
                          item.id === selectedItemId && item.kind === "icon"
                            ? { ...item, successTrackingEnabled: value }
                            : item
                        )
                      );
                    }}
                    aria-label="Track success"
                  />
                </div>
                {selectedItem.successTrackingEnabled ? (
                  <div className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                    <div className="grid gap-1">
                      <Label htmlFor="icon-success-offset-x" className="text-xs text-white/80">
                        Success X offset
                      </Label>
                      <Input
                        id="icon-success-offset-x"
                        type="number"
                        value={selectedItem.successPopoverOffsetX ?? 0}
                        onChange={(event) => {
                          if (!selectedItemId) return;
                          const next = Number(event.target.value);
                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItemId && item.kind === "icon"
                                ? {
                                    ...item,
                                    successPopoverOffsetX: Number.isFinite(next)
                                      ? Math.round(next)
                                      : 0,
                                  }
                                : item
                            )
                          );
                        }}
                        className="h-9 border-white/10 bg-slate-950/80 text-white"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="icon-success-offset-y" className="text-xs text-white/80">
                        Success Y offset
                      </Label>
                      <Input
                        id="icon-success-offset-y"
                        type="number"
                        value={selectedItem.successPopoverOffsetY ?? 0}
                        onChange={(event) => {
                          if (!selectedItemId) return;
                          const next = Number(event.target.value);
                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItemId && item.kind === "icon"
                                ? {
                                    ...item,
                                    successPopoverOffsetY: Number.isFinite(next)
                                      ? Math.round(next)
                                      : 0,
                                  }
                                : item
                            )
                          );
                        }}
                        className="h-9 border-white/10 bg-slate-950/80 text-white"
                      />
                    </div>
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
                  {selectedItem && (selectedHasStagedChildren || selectedIsStagingRoot) ? (
                    <div className="grid gap-2 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid gap-0.5">
                          <Label className="text-xs text-white/80">Hide after selection</Label>
                          <p className="text-[11px] text-white/60">
                            Hide this parent while its stage is active in preview.
                          </p>
                        </div>
                        <Switch
                          checked={selectedItem?.stageHideAfterSelection ?? false}
                          onCheckedChange={handleSelectedStageHideAfterSelectionChange}
                          aria-label="Hide after selection"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid gap-0.5">
                          <Label className="text-xs text-white/80">
                            Blur background on click
                          </Label>
                          <p className="text-[11px] text-white/60">
                            Blur the field while this stage is open in preview.
                          </p>
                        </div>
                        <Switch
                          checked={selectedItem?.stageBlurBackgroundOnClick ?? false}
                          onCheckedChange={handleSelectedStageBlurBackgroundOnClickChange}
                          aria-label="Blur background on click"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid gap-0.5">
                          <Label className="text-xs text-white/80">
                            Hide other elements in stage
                          </Label>
                          <p className="text-[11px] text-white/60">
                            Only show this parent and staged children while the stage is open.
                          </p>
                        </div>
                        <Switch
                          checked={selectedItem?.stageHideOtherElementsInStage ?? false}
                          onCheckedChange={handleSelectedStageHideOtherElementsInStageChange}
                          aria-label="Hide other elements in stage"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid gap-0.5">
                          <Label className="text-xs text-white/80">Remove parent tag</Label>
                          <p className="text-[11px] text-white/60">
                            Clears the staged parent tag so only staged child tags are exported.
                          </p>
                        </div>
                        <Switch
                          checked={selectedItem?.stageRemoveParentTag ?? false}
                          onCheckedChange={handleSelectedStageRemoveParentTagChange}
                          aria-label="Remove parent tag"
                        />
                      </div>
                    </div>
                  ) : null}
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
            ) : selectedItem?.kind === "cover" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Visibility</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedItem.coverVisible !== false}
                    className={`relative inline-flex h-10 w-20 items-center rounded-full border px-1 transition-colors ${
                      selectedItem.coverVisible !== false
                        ? "border-sky-300/50 bg-sky-400/35"
                        : "border-white/20 bg-slate-800/80"
                    }`}
                    onClick={() =>
                      handleSelectedCoverVisibilityChange(
                        !(selectedItem.coverVisible !== false)
                      )
                    }
                  >
                    <span
                      className={`inline-block h-7 w-7 rounded-full bg-white transition-transform ${
                        selectedItem.coverVisible !== false
                          ? "translate-x-10"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/70">
                  When visible, cover uses preview styling and appears in completed/preview mode.
                </div>
              </div>
            ) : selectedItem?.kind === "start-position" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start-position-name" className="text-sm text-white/80">
                    Label
                  </Label>
                  <Input
                    id="start-position-name"
                    value={selectedItem.label}
                    onChange={(event) => handleSelectedLabelChange(event.target.value)}
                    placeholder="Start Position"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/70">
                  In preview, scouts tap inside this area to mark where the robot starts.
                  The marker auto-hides once auto mode is started.
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
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
                      selectedItem.toggleOn
                        ? "border-emerald-300/60 bg-emerald-500/20 text-emerald-200"
                        : "border-white/20 bg-slate-800/80"
                    }`}
                    onClick={() => handleSelectedToggleStateChange(!selectedItem.toggleOn)}
                  >
                    {selectedItem.toggleOn ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <X className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Toggle style</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      className={`h-9 border-white/10 bg-slate-900 text-xs text-white hover:bg-slate-800 ${
                        normalizeToggleStyle(selectedItem.toggleStyle) === "switch"
                          ? "ring-1 ring-blue-400/70"
                          : ""
                      }`}
                      onClick={() => handleSelectedToggleStyleChange("switch")}
                    >
                      Switch
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      className={`h-9 border-white/10 bg-slate-900 text-xs text-white hover:bg-slate-800 ${
                        normalizeToggleStyle(selectedItem.toggleStyle) === "box"
                          ? "ring-1 ring-blue-400/70"
                          : ""
                      }`}
                      onClick={() => handleSelectedToggleStyleChange("box")}
                    >
                      Box
                    </Button>
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
            ) : selectedItem?.kind === "auto-toggle" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="auto-toggle-timer" className="text-sm text-white/80">
                    Auto-to-Teleop timer (seconds)
                  </Label>
                  <Input
                    id="auto-toggle-timer"
                    type="number"
                    min={0}
                    step={1}
                    value={selectedItem.autoToggleDurationSeconds ?? 15}
                    onChange={(event) =>
                      handleSelectedAutoToggleTimerChange(
                        Number(event.target.value) || 0,
                      )
                    }
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="auto-toggle-teleop-timer" className="text-sm text-white/80">
                    Teleop time (seconds)
                  </Label>
                  <Input
                    id="auto-toggle-teleop-timer"
                    type="number"
                    min={0}
                    step={1}
                    value={selectedItem.autoToggleTeleopDurationSeconds ?? 135}
                    onChange={(event) =>
                      handleSelectedAutoToggleTeleopTimerChange(
                        Number(event.target.value) || 0,
                      )
                    }
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Scoped element placement</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={`h-9 border-white/10 bg-slate-900 text-white hover:bg-slate-800 ${
                        autoTeleopScopedEditMode === "auto" ? "ring-1 ring-blue-400/70" : ""
                      }`}
                      onClick={() => handleEnterAutoTeleopScopedEditMode("auto")}
                    >
                      Auto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`h-9 border-white/10 bg-slate-900 text-white hover:bg-slate-800 ${
                        autoTeleopScopedEditMode === "teleop" ? "ring-1 ring-blue-400/70" : ""
                      }`}
                      onClick={() => handleEnterAutoTeleopScopedEditMode("teleop")}
                    >
                      Teleop
                    </Button>
                  </div>
                  {autoTeleopScopedEditMode ? (
                    <p className="text-xs text-white/60">
                      Currently placing {autoTeleopScopedEditMode}-scoped assets. Click another item or the field background to exit.
                    </p>
                  ) : null}
                  {autoTeleopVisibilityMode ? (
                    <p className="text-xs text-white/60">
                      Right-click on auto toggle swaps visibility. Showing: {autoTeleopVisibilityMode} scoped assets.
                    </p>
                  ) : null}
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
                  <Label className="text-sm text-white/80">Input type</Label>
                  <ToggleGroup
                    type="single"
                    value={normalizeInputValueMode(selectedItem.inputValueMode)}
                    onValueChange={(value) => {
                      if (value === "text" || value === "numbers" || value === "both") {
                        handleSelectedInputValueModeChange(value);
                      }
                    }}
                    className="grid grid-cols-3 gap-2"
                  >
                    <ToggleGroupItem
                      value="text"
                      className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                    >
                      Text
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="numbers"
                      className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                    >
                      Numbers
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="both"
                      className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                    >
                      Both
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                  <div className="grid gap-0.5">
                    <Label className="text-xs text-white/80">Use text area</Label>
                    <p className="text-[11px] text-white/60">
                      Allows multiline text and fills available box height.
                    </p>
                  </div>
                  <Switch
                    checked={selectedItem.inputIsTextArea === true}
                    onCheckedChange={handleSelectedInputTextAreaModeChange}
                    aria-label="Use text area"
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
            ) : selectedItem?.kind === "team-select" ? (
              <div className="grid gap-4">
                <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/70">
                  Team Select exports as <span className="font-semibold text-white">team-select</span> with fixed team tabs.
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TEAM_SELECT_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className={`rounded-md border px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide ${option.chipClassName}`}
                    >
                      {option.value}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                  <div className="grid gap-0.5">
                    <Label className="text-xs text-white/80">
                      Link each team tab to one stage
                    </Label>
                    <p className="text-[11px] text-white/60">
                      Opens the same staged layout for b1-b3/r1-r3, while keeping separate preview data per selected team.
                    </p>
                  </div>
                  <Switch
                    checked={selectedItem.teamSelectLinkToStage === true}
                    onCheckedChange={handleSelectedTeamSelectLinkToStageChange}
                    aria-label="Link team tabs to stage"
                  />
                </div>
                {selectedItem.teamSelectLinkToStage ? (
                  <div className="grid gap-2">
                    <Label className="text-sm text-white/80">Staging</Label>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                      <div className="grid gap-0.5">
                        <Label className="text-xs text-white/80">
                          Show staged elements without click
                        </Label>
                        <p className="text-[11px] text-white/60">
                          Keep this Team Select stage visible at all times, even when the dropdown has not been clicked.
                        </p>
                      </div>
                      <Switch
                        checked={selectedItem.teamSelectAlwaysShowStagedElements === true}
                        onCheckedChange={handleSelectedTeamSelectAlwaysShowStageChange}
                        aria-label="Show staged elements without click"
                      />
                    </div>
                    {(selectedIsStagingRoot || !selectedHasStagedChildren) ? (
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
                    ) : null}
                    {selectedItem && (selectedHasStagedChildren || selectedIsStagingRoot) ? (
                      <div className="grid gap-2 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="grid gap-0.5">
                            <Label className="text-xs text-white/80">Hide after selection</Label>
                            <p className="text-[11px] text-white/60">
                              Hide this dropdown while its stage is active in preview.
                            </p>
                          </div>
                          <Switch
                            checked={selectedItem?.stageHideAfterSelection ?? false}
                            onCheckedChange={handleSelectedStageHideAfterSelectionChange}
                            aria-label="Hide after selection"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="grid gap-0.5">
                            <Label className="text-xs text-white/80">
                              Blur background on open
                            </Label>
                            <p className="text-[11px] text-white/60">
                              Blur the field while this team stage is open in preview.
                            </p>
                          </div>
                          <Switch
                            checked={selectedItem?.stageBlurBackgroundOnClick ?? false}
                            onCheckedChange={handleSelectedStageBlurBackgroundOnClickChange}
                            aria-label="Blur background on open"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="grid gap-0.5">
                            <Label className="text-xs text-white/80">
                              Hide other elements in stage
                            </Label>
                            <p className="text-[11px] text-white/60">
                              Only show this dropdown and its staged children while open.
                            </p>
                          </div>
                          <Switch
                            checked={selectedItem?.stageHideOtherElementsInStage ?? false}
                            onCheckedChange={handleSelectedStageHideOtherElementsInStageChange}
                            aria-label="Hide other elements in stage"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="grid gap-0.5">
                            <Label className="text-xs text-white/80">Remove parent tag</Label>
                            <p className="text-[11px] text-white/60">
                              Clears the staged parent tag so only child tags are exported.
                            </p>
                          </div>
                          <Switch
                            checked={selectedItem?.stageRemoveParentTag ?? false}
                            onCheckedChange={handleSelectedStageRemoveParentTagChange}
                            aria-label="Remove parent tag"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : selectedItem?.kind === "match-select" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="match-select-label" className="text-sm text-white/80">
                    Label
                  </Label>
                  <Input
                    id="match-select-label"
                    value={selectedItem.label}
                    onChange={(event) => handleSelectedLabelChange(event.target.value)}
                    placeholder="Match Select"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="match-select-start" className="text-sm text-white/80">
                    Starting value
                  </Label>
                  <Input
                    id="match-select-start"
                    type="number"
                    min={MATCH_SELECT_MIN_VALUE}
                    max={MATCH_SELECT_MAX_VALUE}
                    value={selectedItem.matchSelectValue ?? MATCH_SELECT_MIN_VALUE}
                    onChange={(event) => {
                      const value = clampMatchSelectValue(
                        Number(event.target.value) || MATCH_SELECT_MIN_VALUE
                      );
                      setItems((prev) =>
                        prev.map((item) =>
                          item.id === selectedItem.id && item.kind === "match-select"
                            ? {
                                ...item,
                                matchSelectValue: value,
                              }
                            : item
                        )
                      );
                    }}
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
              </div>
            ) : selectedItem?.kind === "slider" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="slider-label" className="text-sm text-white/80">
                    Slider label
                  </Label>
                  <Input
                    id="slider-label"
                    value={selectedItem.label}
                    onChange={(event) => handleSelectedLabelChange(event.target.value)}
                    placeholder="Slider"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slider-tag" className="text-sm text-white/80">
                    Tag
                  </Label>
                  <Input
                    id="slider-tag"
                    value={selectedItem.tag ?? ""}
                    onChange={(event) => handleSelectedTagChange(event.target.value)}
                    placeholder="sliderTag"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="slider-max" className="text-sm text-white/80">
                      Max
                    </Label>
                    <Input
                      id="slider-max"
                      type="number"
                      min={1}
                      value={selectedItem.sliderMax ?? 100}
                      onChange={(event) => {
                        const next = Math.max(1, Number(event.target.value) || 100);
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === selectedItem.id && item.kind === "slider"
                              ? { ...item, sliderMax: next }
                              : item
                          )
                        );
                      }}
                      className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="slider-mid" className="text-sm text-white/80">
                      Mid
                    </Label>
                    <Input
                      id="slider-mid"
                      type="number"
                      min={0}
                      value={selectedItem.sliderMid ?? 50}
                      onChange={(event) => {
                        const next = Math.max(0, Number(event.target.value) || 0);
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === selectedItem.id && item.kind === "slider"
                              ? { ...item, sliderMid: next }
                              : item
                          )
                        );
                      }}
                      className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor="slider-left-text" className="text-sm text-white/80">
                      Left text
                    </Label>
                    <Input
                      id="slider-left-text"
                      value={selectedItem.sliderLeftText ?? "Low"}
                      onChange={(event) =>
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === selectedItem.id && item.kind === "slider"
                              ? { ...item, sliderLeftText: event.target.value }
                              : item
                          )
                        )
                      }
                      className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="slider-right-text" className="text-sm text-white/80">
                      Right text
                    </Label>
                    <Input
                      id="slider-right-text"
                      value={selectedItem.sliderRightText ?? "High"}
                      onChange={(event) =>
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === selectedItem.id && item.kind === "slider"
                              ? { ...item, sliderRightText: event.target.value }
                              : item
                          )
                        )
                      }
                      className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                    />
                  </div>
                </div>
              </div>
            ) : selectedItem?.kind === "button-slider" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">Display mode</Label>
                  <ToggleGroup
                    type="single"
                    value={selectedItem.iconName ? "icon" : "text"}
                    onValueChange={(value) => {
                      if (value === "text") {
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === selectedItem.id && item.kind === "button-slider"
                              ? {
                                  ...item,
                                  iconName: undefined,
                                }
                              : item
                          )
                        );
                      }
                      if (value === "icon") {
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === selectedItem.id && item.kind === "button-slider"
                              ? {
                                  ...item,
                                  iconName: item.iconName ?? "Bot",
                                  outlineColor: item.outlineColor ?? "#ffffff",
                                  fillColor: item.fillColor ?? "transparent",
                                }
                              : item
                          )
                        );
                      }
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <ToggleGroupItem
                      value="text"
                      className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                    >
                      Name
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="icon"
                      className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                    >
                      Icon
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="button-slider-name" className="text-sm text-white/80">
                    Button name
                  </Label>
                  <Input
                    id="button-slider-name"
                    value={selectedItem.label}
                    onChange={(event) => handleSelectedLabelChange(event.target.value)}
                    placeholder="Button Slider"
                    disabled={Boolean(selectedItem.iconName)}
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                {selectedItem.iconName ? (
                  <>
                    <div className="grid gap-2">
                      <Label className="text-sm text-white/80">Button colors</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="button-slider-outline" className="text-xs text-white/70">
                            Outline
                          </Label>
                          <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                            <Input
                              id="button-slider-outline"
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
                          <Label htmlFor="button-slider-fill" className="text-xs text-white/70">
                            Fill
                          </Label>
                          <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                            <Input
                              id="button-slider-fill"
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
                      <Label htmlFor="button-slider-icon-search" className="text-sm text-white/80">
                        Icon picker
                      </Label>
                      <Input
                        id="button-slider-icon-search"
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
                  </>
                ) : null}
                <div className="grid gap-2">
                  <Label htmlFor="button-slider-tag" className="text-sm text-white/80">
                    Tag
                  </Label>
                  <Input
                    ref={tagInputRef}
                    id="button-slider-tag"
                    value={selectedItem.tag ?? ""}
                    onChange={(event) => handleSelectedTagChange(event.target.value)}
                    placeholder="Enter tag"
                    className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-white/80">
                    Increase direction
                  </Label>
                  <ToggleGroup
                    type="single"
                    value={normalizeButtonSliderIncreaseDirection(
                      selectedItem.buttonSliderIncreaseDirection
                    )}
                    onValueChange={(value) => {
                      if (value === "left" || value === "right") {
                        handleSelectedButtonSliderIncreaseDirectionChange(value);
                      }
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <ToggleGroupItem
                      value="left"
                      className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                    >
                      Left
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="right"
                      className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                    >
                      Right
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <p className="text-xs text-white/60">
                    This direction automatically flips when swap sides is active.
                  </p>
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
                {selectedItem?.kind === "text" ? (
                  <>
                    <div className="grid gap-2">
                      <Label className="text-sm text-white/80">Button mode</Label>
                      <ToggleGroup
                        type="single"
                        value={normalizeButtonPressMode(selectedItem.buttonPressMode)}
                        onValueChange={(value) => {
                          if (value === "tap" || value === "hold") {
                            handleSelectedButtonPressModeChange(value);
                          }
                        }}
                        className="grid grid-cols-2 gap-2"
                      >
                        <ToggleGroupItem
                          value="tap"
                          className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                        >
                          Tap
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="hold"
                          className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                        >
                          Hold
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="button-name" className="text-sm text-white/80">
                        Button name
                      </Label>
                      <Input
                        id="button-name"
                        value={selectedItem.label}
                        onChange={(event) => handleSelectedLabelChange(event.target.value)}
                        placeholder="Enter button text"
                        className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                      />
                    </div>
                  </>
                ) : selectedItem?.kind === "movement" ? (
                  <>
                    <div className="grid gap-2 rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/70">
                      Direction flips between arrow directions when clicked in preview.
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm text-white/80">Starting state</Label>
                      <ToggleGroup
                        type="single"
                        value={normalizeMovementDirection(selectedItem.movementDirection)}
                        onValueChange={(value) => {
                          if (value === "left" || value === "right") {
                            handleSelectedMovementDirectionChange(value);
                          }
                        }}
                        className="grid grid-cols-2 gap-2"
                      >
                        <ToggleGroupItem
                          value="left"
                          className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="right"
                          className="h-10 rounded-md border border-white/10 bg-slate-900/80 text-xs text-white data-[state=on]:bg-blue-600"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </>
                ) : null}
                {!selectedItem?.stageRemoveParentTag ? (
                  <div className="grid gap-2">
                    <Label htmlFor="button-tag" className="text-sm text-white/80">
                      Tag
                    </Label>
                    <Input
                      ref={tagInputRef}
                      id="button-tag"
                      value={
                        selectedItem?.kind === "text" || selectedItem?.kind === "movement"
                          ? (selectedItem.tag ?? "")
                          : ""
                      }
                      onChange={(event) => handleSelectedTagChange(event.target.value)}
                      placeholder="Enter tag"
                      disabled={
                        selectedItem?.kind !== "text" &&
                        selectedItem?.kind !== "movement"
                      }
                      className="h-11 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35 disabled:opacity-50"
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/65">
                    Parent tag is removed for this staged element.
                  </div>
                )}
                {selectedItem?.kind === "text" && !selectedHasStagedChildren ? (
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
                {selectedItem?.kind === "text" ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                    <div className="grid gap-0.5">
                      <Label className="text-xs text-white/80">Track success</Label>
                      <p className="text-[11px] text-white/60">
                        In preview, click opens check/X chooser in-place.
                      </p>
                    </div>
                    <Switch
                      checked={selectedItem.successTrackingEnabled === true}
                      onCheckedChange={(value) => {
                        if (!selectedItemId) return;
                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === selectedItemId && item.kind === "text"
                              ? { ...item, successTrackingEnabled: value }
                              : item
                          )
                        );
                      }}
                      aria-label="Track success"
                    />
                  </div>
                ) : null}
                {selectedItem?.kind === "text" && selectedItem.successTrackingEnabled ? (
                  <div className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                    <div className="grid gap-1">
                      <Label htmlFor="text-success-offset-x" className="text-xs text-white/80">
                        Success X offset
                      </Label>
                      <Input
                        id="text-success-offset-x"
                        type="number"
                        value={selectedItem.successPopoverOffsetX ?? 0}
                        onChange={(event) => {
                          if (!selectedItemId) return;
                          const next = Number(event.target.value);
                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItemId && item.kind === "text"
                                ? {
                                    ...item,
                                    successPopoverOffsetX: Number.isFinite(next)
                                      ? Math.round(next)
                                      : 0,
                                  }
                                : item
                            )
                          );
                        }}
                        className="h-9 border-white/10 bg-slate-950/80 text-white"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="text-success-offset-y" className="text-xs text-white/80">
                        Success Y offset
                      </Label>
                      <Input
                        id="text-success-offset-y"
                        type="number"
                        value={selectedItem.successPopoverOffsetY ?? 0}
                        onChange={(event) => {
                          if (!selectedItemId) return;
                          const next = Number(event.target.value);
                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedItemId && item.kind === "text"
                                ? {
                                    ...item,
                                    successPopoverOffsetY: Number.isFinite(next)
                                      ? Math.round(next)
                                      : 0,
                                  }
                                : item
                            )
                          );
                        }}
                        className="h-9 border-white/10 bg-slate-950/80 text-white"
                      />
                    </div>
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
                  {selectedItem && (selectedHasStagedChildren || selectedIsStagingRoot) ? (
                    <div className="grid gap-2 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid gap-0.5">
                          <Label className="text-xs text-white/80">Hide after selection</Label>
                          <p className="text-[11px] text-white/60">
                            Hide this parent while its stage is active in preview.
                          </p>
                        </div>
                        <Switch
                          checked={selectedItem?.stageHideAfterSelection ?? false}
                          onCheckedChange={handleSelectedStageHideAfterSelectionChange}
                          aria-label="Hide after selection"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid gap-0.5">
                          <Label className="text-xs text-white/80">
                            Blur background on click
                          </Label>
                          <p className="text-[11px] text-white/60">
                            Blur the field while this stage is open in preview.
                          </p>
                        </div>
                        <Switch
                          checked={selectedItem?.stageBlurBackgroundOnClick ?? false}
                          onCheckedChange={handleSelectedStageBlurBackgroundOnClickChange}
                          aria-label="Blur background on click"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid gap-0.5">
                          <Label className="text-xs text-white/80">
                            Hide other elements in stage
                          </Label>
                          <p className="text-[11px] text-white/60">
                            Only show this parent and staged children while the stage is open.
                          </p>
                        </div>
                        <Switch
                          checked={selectedItem?.stageHideOtherElementsInStage ?? false}
                          onCheckedChange={handleSelectedStageHideOtherElementsInStageChange}
                          aria-label="Hide other elements in stage"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid gap-0.5">
                          <Label className="text-xs text-white/80">Remove parent tag</Label>
                          <p className="text-[11px] text-white/60">
                            Clears the staged parent tag so only staged child tags are exported.
                          </p>
                        </div>
                        <Switch
                          checked={selectedItem?.stageRemoveParentTag ?? false}
                          onCheckedChange={handleSelectedStageRemoveParentTagChange}
                          aria-label="Remove parent tag"
                        />
                      </div>
                    </div>
                  ) : null}
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
                  setEventKeyDraft(eventKey);
                  setEnableEventTimeTrackingDraft(enableEventTimeTracking);
                  setIsAspectDialogOpen(true);
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Project settings
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
                transform: `translate(${palettePointerOffset.x}px, ${palettePointerOffset.y}px)`,
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
              ) : activeKind === "start-position" ? (
                <div
                  className={`relative h-full w-full rounded-md border border-dashed ${
                    startPositionColorSide === "red"
                      ? "border-red-300/50 bg-red-400/10"
                      : "border-blue-300/50 bg-blue-400/10"
                  }`}
                >
                  <span
                    className={`absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                      startPositionColorSide === "red"
                        ? "border-red-100/70"
                        : "border-blue-100/70"
                    }`}
                  />
                  <span
                    className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      startPositionColorSide === "red" ? "bg-red-300" : "bg-blue-300"
                    }`}
                  />
                </div>
              ) : activeKind === "input" ? (
                <div className="flex h-full w-full flex-col gap-2">
                  <div className="text-xs text-white/80">Input label</div>
                  <Input placeholder="Enter text" readOnly />
                </div>
              ) : activeKind === "team-select" ? (
                <Button
                  variant="outline"
                  className="h-full w-full justify-between rounded-md border-white/25 !bg-slate-900 !text-white hover:!bg-slate-900"
                >
                  Drop Down
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              ) : activeKind === "match-select" ? (
                <div className="grid h-full w-full grid-cols-[1fr_1.2fr_1fr] gap-1 rounded-md border border-white/25 bg-slate-900/90 p-1">
                  <div className="flex items-center justify-center rounded-sm border border-white/20 text-white">-</div>
                  <div className="flex items-center justify-center rounded-sm border border-white/20 text-white">1</div>
                  <div className="flex items-center justify-center rounded-sm border border-white/20 text-white">+</div>
                </div>
              ) : activeKind === "slider" ? (
                <div className="flex h-full w-full flex-col justify-end gap-1 rounded-md border border-white/20 bg-slate-900/90 p-2">
                  <Slider value={[50]} max={100} step={1} className="w-full" />
                  <div className="flex items-center justify-between text-[10px] text-white/70">
                    <span>Low</span>
                    <span>High</span>
                  </div>
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
              ) : activeKind === "auto-toggle" ? (
                <div className="h-full w-full">
                  <div className="grid h-full w-full grid-cols-2 gap-1 rounded-md border border-white/25 bg-slate-900/90 p-1">
                    <div className="flex items-center justify-center rounded-sm border-2 border-white bg-white text-[11px] font-semibold text-black">
                      Auto
                    </div>
                    <div className="flex items-center justify-center rounded-sm border border-transparent text-[11px] text-white/80">
                      Teleop
                    </div>
                  </div>
                </div>
              ) : activeKind === "movement" ? (
                <Button
                  variant="outline"
                  size="default"
                  className="h-full w-full rounded-lg border-white/25 !bg-slate-900/80 !text-white hover:!bg-slate-900/80"
                  aria-label="Movement"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
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
          <DialogContent className="max-h-[92vh] w-[min(96vw,680px)] overflow-hidden border-white/10 bg-slate-950 text-white data-[state=closed]:slide-out-to-right-1/2 data-[state=open]:slide-in-from-right-1/2">
            <DialogHeader>
              <DialogTitle>Field aspect ratio</DialogTitle>
              <DialogDescription className="text-white/60">
                Set the width and height ratio for the field.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(92vh-190px)] pr-2">
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
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="event-key" className="text-white/85">Event Key</Label>
                <Input
                  id="event-key"
                  value={eventKeyDraft}
                  onChange={(event) => setEventKeyDraft(event.target.value)}
                  placeholder="2026DiddyEvent"
                  className="border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
                <div className="grid gap-0.5">
                  <Label htmlFor="event-time-tracking-toggle">Enable event time tracking</Label>
                  <p className="text-xs text-white/60">
                    Stores an event-time-tracking flag in saved payloads.
                  </p>
                </div>
                <button
                  id="event-time-tracking-toggle"
                  type="button"
                  role="switch"
                  aria-checked={enableEventTimeTrackingDraft}
                  aria-label="Toggle event time tracking"
                  onClick={() =>
                    setEnableEventTimeTrackingDraft((current) => !current)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                    enableEventTimeTrackingDraft
                      ? "border-white/60 bg-white/80"
                      : "border-white/30 bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                      enableEventTimeTrackingDraft
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Label className="text-white/85">Select image</Label>
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white/80">
                <span className="truncate">{selectedPresetBackground?.name ?? "None"}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setIsBackgroundPickerOpen(true)}
              >
                Choose from predefined backgrounds
              </Button>
            </div>
            <div className="mt-3">
              <Button
                type="button"
                className="border border-white/10 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-900 disabled:text-white/50"
                onClick={() =>
                  router.push(
                    `/post-match${(requestedUploadId || latestUploadId) ? `?uploadId=${encodeURIComponent(requestedUploadId || latestUploadId || "")}` : ""}`
                  )
                }
                disabled={!(requestedUploadId || latestUploadId)}
              >
                Add post match questions
              </Button>
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
                onClick={() => setIsAlignmentAssistEnabled((current) => !current)}
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
                <Label htmlFor="project-public-toggle">Project sharing</Label>
                <p className="text-xs text-white/60">
                  {requestedUploadId || latestUploadId
                    ? "Allow import by content hash"
                    : "Save project first to enable sharing"}
                </p>
              </div>
              <button
                id="project-public-toggle"
                type="button"
                role="switch"
                aria-checked={Boolean(projectMeta?.isPublic)}
                aria-label="Toggle project sharing"
                onClick={() => void handleProjectVisibilityToggle()}
                disabled={!(requestedUploadId || latestUploadId)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                  projectMeta?.isPublic
                    ? "border-white/60 bg-white/80"
                    : "border-white/30 bg-white/10"
                } ${
                  requestedUploadId || latestUploadId
                    ? ""
                    : "cursor-not-allowed opacity-50"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    projectMeta?.isPublic
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
            </ScrollArea>
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
          open={isBackgroundPickerOpen}
          onOpenChange={(open) => setIsBackgroundPickerOpen(open)}
        >
          <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Predefined field backgrounds</DialogTitle>
              <DialogDescription className="text-white/60">
                Pick a predefined image to use for this project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              {backgroundPresets.map((entry) => {
                const isSelected =
                  (backgroundLocation ?? "none") === entry.key ||
                  (!backgroundLocation && entry.key === "none");
                return (
                  <button
                    key={entry.key}
                    type="button"
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      isSelected
                        ? "border-blue-400/70 bg-blue-500/10"
                        : "border-white/10 bg-slate-900/70 hover:bg-slate-800/80"
                    }`}
                    onClick={() => {
                      if (entry.key === "none") {
                        setBackgroundLocation(null);
                        setBackgroundImage(null);
                      } else {
                        setBackgroundLocation(entry.key);
                        setBackgroundImage(entry.imageUrl || null);
                      }
                      setIsBackgroundPickerOpen(false);
                    }}
                  >
                    <div className="mb-2 text-sm font-medium text-white">{entry.name}</div>
                    {entry.imageUrl ? (
                      <img
                        src={entry.imageUrl}
                        alt={entry.name}
                        className="h-24 w-full rounded-md border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-white/20 text-xs text-white/50">
                        No background image
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setIsBackgroundPickerOpen(false)}
              >
                Close
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
          open={isQrDialogOpen}
          onOpenChange={(open) => setIsQrDialogOpen(open)}
        >
          <DialogContent className="border-white/10 bg-slate-950 text-white">
            <DialogHeader>
              <DialogTitle>Project QR Code</DialogTitle>
              <DialogDescription className="text-white/60">
                Scan to copy the content hash for import.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="mx-auto overflow-hidden rounded-lg border border-white/10 bg-white p-2">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Project content hash QR code"
                    width={320}
                    height={320}
                    className="h-56 w-56"
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center text-xs text-slate-600">
                    Hash unavailable
                  </div>
                )}
              </div>
              <div className="rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white/80">
                Hash: {projectContentHash || "Unavailable"}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setIsQrDialogOpen(false)}
              >
                Close
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
              <DialogTitle>Export payload</DialogTitle>
              <DialogDescription>
                This is the exact `payload` JSON sent to the backend.
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
