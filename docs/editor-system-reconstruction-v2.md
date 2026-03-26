here are some notes that I want you to keep in mine just like how you pull the payload from the backend at the start and then keep it can you do the same with the collomn that says field_mapping and also store it because it will also be used when creating the qr code and compressing it.

please fix all feature to work with this new payload such as the stageing and everything else thank you


here is a sample payload:

{"payload":[{"mirror-line":{"x1":0,"x2":0,"y1":100,"y2":-100}},{"cover":{"x1":0.52,"x2":100,"y1":99.7,"y2":-100,"visible":true}},{"button":{"x":50.26,"y":-80.92,"text":"Submit","width":46.2,"action":"submit","height":11.26}},{"button":{"x":50.26,"y":-61.21,"text":"Reset","width":46.2,"action":"reset","height":8.45}},{"button":{"x":73.36,"y":-44.27,"text":"Redo","width":23.1,"action":"redo","height":8.45}},{"button":{"x":27.16,"y":-44.27,"text":"Undo","width":23.1,"action":"undo","height":8.45}},{"log-view":{"x":50.26,"y":5.19,"label":"Log","width":46.2,"height":40.96}},{"auto-toggle":{"x":50.26,"y":57.69,"mode":"teleop","label":"Auto Toggle","width":46.2,"height":11.54,"timerSeconds":15,"stageParentTag":"","teleopTimerSeconds":135}},{"team-select":{"x":25.43,"y":80.6,"label":"Drop Down","width":21.37,"height":9.27,"stageParentTag":"","linkEachTeamToStage":false,"showStageWithoutSelection":false}},{"match-select":{"x":72.69,"y":80.6,"tag":"","label":"Match Select","value":1,"width":22.43,"height":9.27,"stageParentTag":""}},{"icon-button":{"x":-31.52,"y":-0.39,"tag":"TagDis-PFAFM","fill":"transparent","icon":"ArrowBigUpIcon","width":6.99,"height":11.72,"outline":"#ffffff","increment":1,"pressMode":"tap","trackSuccess":false,"stageParentTag":"","removeParentTag":true,"hasStageChildren":true,"hideAfterSelection":true,"blurBackgroundOnClick":true,"hideOtherElementsInStage":true}},{"button":{"x":-75.65,"y":39.86,"tag":"fuel","text":"+1","width":21.24,"height":34.05,"increment":1,"pressMode":"tap","trackSuccess":false,"stageParentTag":"TagDis-PFAFM","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"button":{"x":-26.6,"y":39.86,"tag":"fuel","text":"+3","width":21.24,"height":34.05,"increment":3,"pressMode":"tap","trackSuccess":false,"stageParentTag":"TagDis-PFAFM","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"button":{"x":25.91,"y":39.86,"tag":"fuel","text":"+5","width":21.24,"height":34.05,"increment":5,"pressMode":"tap","trackSuccess":false,"stageParentTag":"TagDis-PFAFM","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"button":{"x":75.82,"y":39.86,"tag":"fuel","text":"+10","width":21.24,"height":34.05,"increment":10,"pressMode":"tap","trackSuccess":false,"stageParentTag":"TagDis-PFAFM","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"log-view":{"x":-3.45,"y":-47.82,"label":"Log","width":65.8,"height":34.2}},{"icon-button":{"x":-79.62,"y":-5.15,"tag":"TagDis-DSDRF","fill":"transparent","icon":"AlignVerticalJustifyEndIcon","width":5.53,"height":9.42,"outline":"#ffffff","increment":1,"pressMode":"tap","trackSuccess":false,"stageParentTag":"","removeParentTag":true,"hasStageChildren":true,"hideAfterSelection":true,"blurBackgroundOnClick":true,"hideOtherElementsInStage":true}},{"button":{"x":-72.28,"y":22.91,"tag":"l1","text":"L1","width":15.28,"height":10.65,"increment":1,"pressMode":"tap","trackSuccess":false,"stageParentTag":"TagDis-DSDRF","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"button":{"x":-72.28,"y":-23.02,"tag":"l3","text":"L2/3","width":15.28,"height":10.65,"increment":1,"pressMode":"tap","trackSuccess":false,"stageParentTag":"TagDis-DSDRF","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"button-slider":{"x":-14.77,"y":-56.3,"tag":"passing","fill":"transparent","icon":"Circle","text":"Button Slider","width":11.83,"height":41.73,"outline":"#ffffff","stageParentTag":"","increaseDirection":"left"}},{"icon-button":{"x":-14.77,"y":57.69,"tag":"defense","fill":"transparent","icon":"LucideShield","width":11.83,"height":41.73,"outline":"#ffffff","increment":1,"pressMode":"hold","trackSuccess":false,"stageParentTag":"","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"icon-button":{"x":-83.25,"y":31.36,"tag":"outpost","fill":"transparent","icon":"ArrowUp","width":9.15,"height":6.45,"outline":"#ffffff","increment":1,"pressMode":"tap","trackSuccess":true,"stageParentTag":"","autoTeleopScope":"auto","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"icon-button":{"x":-83.42,"y":-54.68,"tag":"depot","fill":"transparent","icon":"ArrowDownToLineIcon","width":9.33,"height":6.53,"outline":"#ffffff","increment":1,"pressMode":"tap","trackSuccess":false,"stageParentTag":"","autoTeleopScope":"auto","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"icon-button":{"x":-83.42,"y":-37.89,"tag":"humanplayer","fill":"transparent","icon":"ArrowUp","width":9.33,"height":6.37,"outline":"#ffffff","increment":1,"pressMode":"tap","trackSuccess":false,"stageParentTag":"","autoTeleopScope":"teleop","removeParentTag":false,"hasStageChildren":false,"hideAfterSelection":false,"blurBackgroundOnClick":false,"hideOtherElementsInStage":false}},{"toggle-switch":{"x":-50.69,"y":-82.64,"tag":"bricked","label":"Bricked","style":"switch","value":false,"width":12.18,"height":5.99,"textSize":8,"textAlign":"center","stageParentTag":""}},{"button":{"x":-87.22,"y":83.07,"tag":"TagDis-FAFYU","text":"Notes","width":8.98,"height":6.76,"increment":1,"pressMode":"tap","trackSuccess":false,"stageParentTag":"","removeParentTag":true,"hasStageChildren":true,"hideAfterSelection":false,"blurBackgroundOnClick":true,"hideOtherElementsInStage":true}},{"cover":{"x1":-100,"x2":100,"y1":99.76,"y2":-100,"visible":true}},{"text-input":{"x":-58.64,"y":-1.57,"tag":"good","label":"Good","width":37.56,"height":57.83,"multiline":true,"valueType":"both","placeholder":"Enter text","stageParentTag":"TagDis-FAFYU"}},{"text-input":{"x":40.24,"y":-1.57,"tag":"bad","label":"Bad","width":47.32,"height":57.83,"multiline":true,"valueType":"both","placeholder":"Enter text","stageParentTag":"TagDis-FAFYU"}},{"text-input":{"x":-5.53,"y":79.69,"tag":"area","label":"Area test","width":35.92,"height":10.18,"multiline":false,"valueType":"both","placeholder":"Enter text","stageParentTag":"TagDis-FAFYU"}}],"editorState":{"items":[{"x":0.09,"y":-0.36,"id":"4e4b1d59-6563-4649-a7a6-c207db1193c3","tag":"","endX":0,"endY":-100,"kind":"mirror","label":"Mirror line","width":0.09,"height":100,"startX":0,"startY":100},{"x":50.26,"y":-0.36,"id":"1edf9829-b1cc-465d-a764-5a53180f081d","tag":"","kind":"cover","label":"Cover","width":49.74,"height":100,"coverVisible":true},{"x":50.26,"y":-80.92,"id":"6abb0e8c-0c02-4b20-b922-b634ffddaf98","tag":"","kind":"submit","label":"Submit","width":46.2,"height":11.26},{"x":50.26,"y":-61.21,"id":"bb43ed7e-237a-43f0-b716-acb8def25685","tag":"","kind":"reset","label":"Reset","width":46.2,"height":8.45},{"x":73.36,"y":-44.27,"id":"0a27d70a-8347-4071-aebc-2ebf6795445e","tag":"","kind":"redo","label":"Redo","width":23.1,"height":8.45},{"x":27.16,"y":-44.27,"id":"255af5d0-516e-4f8c-aa0f-5e16c46b154f","tag":"","kind":"undo","label":"Undo","width":23.1,"height":8.45},{"x":50.26,"y":5.19,"id":"ba5db0c9-adbb-4e02-bada-b63634d3d0db","tag":"","kind":"log","label":"Log","width":46.2,"height":40.96},{"x":50.26,"y":57.69,"id":"dae0d7f5-fa4a-4fb6-a66f-09d47e6e1db0","tag":"","kind":"auto-toggle","label":"Auto Toggle","width":46.2,"height":11.54,"autoToggleMode":"teleop","autoToggleDurationSeconds":15,"autoToggleTeleopDurationSeconds":135},{"x":25.43,"y":80.6,"id":"e77ee61e-e6c8-41cf-b4a6-8bcd050f0c3f","tag":"","kind":"team-select","label":"Drop Down","width":21.37,"height":9.27,"teamSelectValue":"b1","teamSelectLinkToStage":false,"teamSelectAlwaysShowStagedElements":false},{"x":72.69,"y":80.6,"id":"2c4cee79-5636-4213-9da8-276ea0b65bca","tag":"","kind":"match-select","label":"Match Select","width":22.43,"height":9.27,"matchSelectValue":1},{"x":-31.52,"y":-0.39,"id":"d6d56f14-9a33-49b9-bce1-7c78eaa8f197","tag":"","kind":"icon","label":"ArrowBigUpIcon","width":6.99,"height":11.72,"iconName":"ArrowBigUpIcon","fillColor":"transparent","increment":1,"outlineColor":"#ffffff","buttonPressMode":"tap","stageRemoveParentTag":true,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":true,"stageBlurBackgroundOnClick":true,"stageHideOtherElementsInStage":true},{"x":-75.65,"y":39.86,"id":"3c1a673e-792b-4dfd-a701-cf51427a595a","tag":"fuel","kind":"button","label":"+1","width":21.24,"height":34.05,"increment":1,"stageParentId":"d6d56f14-9a33-49b9-bce1-7c78eaa8f197","buttonPressMode":"tap","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":-26.6,"y":39.86,"id":"00195b0e-6f21-4a17-ac55-4403eef6922e","tag":"fuel","kind":"button","label":"+3","width":21.24,"height":34.05,"increment":3,"stageParentId":"d6d56f14-9a33-49b9-bce1-7c78eaa8f197","buttonPressMode":"tap","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":25.91,"y":39.86,"id":"cad7706b-b74c-4da4-9d94-722631a632c9","tag":"fuel","kind":"button","label":"+5","width":21.24,"height":34.05,"increment":5,"stageParentId":"d6d56f14-9a33-49b9-bce1-7c78eaa8f197","buttonPressMode":"tap","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":75.82,"y":39.86,"id":"23acc8a0-7a36-4786-83c3-1e5d55ba3ec0","tag":"fuel","kind":"button","label":"+10","width":21.24,"height":34.05,"increment":10,"stageParentId":"d6d56f14-9a33-49b9-bce1-7c78eaa8f197","buttonPressMode":"tap","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":-3.45,"y":-47.82,"id":"15c644c2-0661-4380-a71b-7c8f64b2e7a9","tag":"","kind":"log","label":"Log","width":65.8,"height":34.2,"stageParentId":"d6d56f14-9a33-49b9-bce1-7c78eaa8f197"},{"x":-79.62,"y":-5.15,"id":"04b6592f-c4ad-4d82-9132-4810c0505372","tag":"","kind":"icon","label":"AlignVerticalJustifyEndIcon","width":5.53,"height":9.42,"iconName":"AlignVerticalJustifyEndIcon","fillColor":"transparent","increment":1,"outlineColor":"#ffffff","buttonPressMode":"tap","stageRemoveParentTag":true,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":true,"stageBlurBackgroundOnClick":true,"stageHideOtherElementsInStage":true},{"x":-72.28,"y":22.91,"id":"79d3c64c-e1be-4fda-91c5-d94c892bb5db","tag":"l1","kind":"button","label":"L1","width":15.28,"height":10.65,"increment":1,"stageParentId":"04b6592f-c4ad-4d82-9132-4810c0505372","buttonPressMode":"tap","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":-72.28,"y":-23.02,"id":"70e97ca6-bc60-400d-b072-d97658cd3ca3","tag":"l3","kind":"button","label":"L2/3","width":15.28,"height":10.65,"increment":1,"stageParentId":"04b6592f-c4ad-4d82-9132-4810c0505372","buttonPressMode":"tap","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":-14.77,"y":-56.3,"id":"454019f9-2b32-4891-b980-5ca72e03914e","tag":"passing","kind":"button-slider","label":"Button Slider","width":11.83,"height":41.73,"iconName":"Circle","fillColor":"transparent","outlineColor":"#ffffff","buttonSliderIncreaseDirection":"left"},{"x":-14.77,"y":57.69,"id":"a94cd371-6e29-4563-8072-b0461aa8e886","tag":"defense","kind":"icon","label":"LucideShield","width":11.83,"height":41.73,"iconName":"LucideShield","fillColor":"transparent","increment":1,"outlineColor":"#ffffff","buttonPressMode":"hold","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":-83.25,"y":31.36,"id":"f4e8bfc7-59b6-4a51-949a-dc5bd48f2214","tag":"outpost","kind":"icon","label":"ArrowUp","width":9.15,"height":6.45,"iconName":"ArrowUp","fillColor":"transparent","increment":1,"outlineColor":"#ffffff","autoTeleopScope":"auto","buttonPressMode":"tap","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":true,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":-83.42,"y":-54.68,"id":"b5870fb6-7c7c-4cb2-8c4f-b04f2700690d","tag":"depot","kind":"icon","label":"ArrowDownToLineIcon","width":9.33,"height":6.53,"iconName":"ArrowDownToLineIcon","fillColor":"transparent","increment":1,"outlineColor":"#ffffff","autoTeleopScope":"auto","buttonPressMode":"tap","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":-83.42,"y":-37.89,"id":"49e4d41f-4343-4edc-a707-1f2ae565bef6","tag":"humanplayer","kind":"icon","label":"ArrowUp","width":9.33,"height":6.37,"iconName":"ArrowUp","fillColor":"transparent","increment":1,"outlineColor":"#ffffff","autoTeleopScope":"teleop","buttonPressMode":"tap","stageRemoveParentTag":false,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":false,"stageHideOtherElementsInStage":false},{"x":-50.69,"y":-82.64,"id":"e09fcb77-9530-4709-96f5-9d4ba47f0fc2","tag":"bricked","kind":"toggle","label":"Bricked","width":12.18,"height":5.99,"toggleOn":false,"toggleStyle":"switch","toggleTextSize":8,"toggleTextAlign":"center"},{"x":-87.22,"y":83.07,"id":"2cb6b600-b7d6-4a20-abda-0e44436dd718","tag":"","kind":"button","label":"Notes","width":8.98,"height":6.76,"increment":1,"buttonPressMode":"tap","stageRemoveParentTag":true,"successPopoverOffsetX":0,"successPopoverOffsetY":0,"successTrackingEnabled":false,"stageHideAfterSelection":false,"stageBlurBackgroundOnClick":true,"stageHideOtherElementsInStage":true},{"x":0,"y":-0.3,"id":"337e049a-f10e-44e5-85a3-ca9511c71f74","tag":"","kind":"cover","label":"Cover","width":100,"height":100,"coverVisible":true,"stageParentId":"2cb6b600-b7d6-4a20-abda-0e44436dd718"},{"x":-58.64,"y":-1.57,"id":"c3a73096-99dc-4f38-92e4-cc80cccc99b2","tag":"good","kind":"input","label":"Good","width":37.56,"height":57.83,"placeholder":"Enter text","stageParentId":"2cb6b600-b7d6-4a20-abda-0e44436dd718","inputValueMode":"both","inputIsTextArea":true},{"x":40.24,"y":-1.57,"id":"b3a141dc-a2cb-4d81-8d50-9638b948af05","tag":"bad","kind":"input","label":"Bad","width":47.32,"height":57.83,"placeholder":"Enter text","stageParentId":"2cb6b600-b7d6-4a20-abda-0e44436dd718","inputValueMode":"both","inputIsTextArea":true},{"x":-5.53,"y":79.69,"id":"8f1c1a22-6476-4d29-89d7-a939f78dcbcd","tag":"area","kind":"input","label":"Area test","width":35.92,"height":10.18,"placeholder":"Enter text","stageParentId":"2cb6b600-b7d6-4a20-abda-0e44436dd718","inputValueMode":"both","inputIsTextArea":false}],"eventKey":"","scoutType":"match","aspectWidth":"16","aspectHeight":"9","editorTeamSide":"red","coordinateSpace":"normalized-v1","previewTeamSide":"red","postMatchQuestions":[],"useCustomSideLayouts":false}}


# GoonScout Editor System Reconstruction (V2)

This document captures the systems currently implemented in `src/app/editor/page.tsx` and related routes so another AI can recreate behavior and payload semantics exactly.

It specifically covers:

1. Auto/Teleop-specific placement and runtime filtering
2. Slider asset (`slider`) and Button Slider asset (`button-slider`)
3. Post-match question system
4. Success button system (check/X popover)
5. Background image storage location changes
6. **Removal** of toggle-attached conditional textbox support

---

## 1) Auto/Teleop-Specific Asset System

## 1.1 Data model fields

`CanvasItem` supports:

```ts
autoToggleMode?: "auto" | "teleop";
autoToggleDurationSeconds?: number;
autoToggleTeleopDurationSeconds?: number;
autoTeleopScope?: "auto" | "teleop";
```

Meaning:

- `autoToggleMode` is the current mode state of the auto-toggle control.
- `autoToggleDurationSeconds` is auto countdown duration.
- `autoToggleTeleopDurationSeconds` is teleop duration value shown/configured.
- `autoTeleopScope` marks individual assets as auto-only or teleop-only.

## 1.2 Scoped visibility engine

Visibility is applied after side filtering and before render:

```ts
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
```

Behavior:

- Unscoped assets are always visible.
- Scoped assets are visible only when scope matches current mode.
- Mirror line is always visible.

## 1.3 Auto-toggle runtime

Pressing an auto-toggle in preview:

1. Starts auto mode
2. Starts countdown
3. Automatically switches to teleop when timer ends
4. Hides start-position markers when auto starts

```ts
const handleAutoToggleItem = React.useCallback(
  (itemId: string) => {
    const target = items.find((item) => item.id === itemId);
    if (!target || target.kind !== "auto-toggle") return;

    if (typeof autoToggleIntervalsRef.current[itemId] === "number") {
      clearAutoToggleTimer(itemId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId && item.kind === "auto-toggle"
            ? { ...item, autoToggleMode: "teleop" }
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
          ? { ...item, autoToggleMode: "auto" }
          : item
      )
    );

    if (durationSeconds <= 0) {
      clearAutoToggleTimer(itemId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId && item.kind === "auto-toggle"
            ? { ...item, autoToggleMode: "teleop" }
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
        return { ...prev, [itemId]: remainingSeconds };
      });

      if (remainingSeconds <= 0) {
        clearAutoToggleTimer(itemId);
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId && item.kind === "auto-toggle"
              ? { ...item, autoToggleMode: "teleop" }
              : item
          )
        );
      }
    }, 200);
  },
  [clearAutoToggleTimer, items]
);
```

## 1.4 Editor UX (scoped placement)

Auto-toggle settings panel supports scoped placement mode:

- `Auto` button -> new placements get `autoTeleopScope: "auto"`
- `Teleop` button -> new placements get `autoTeleopScope: "teleop"`
- Right-clicking auto-toggle swaps visibility when editing

Visual tags:

- Assets show a small corner badge in editor:
  - `A` amber badge for auto-scoped
  - `T` cyan badge for teleop-scoped

---

## 2) Slider Systems

## 2.1 Standard slider (`kind = "slider"`)

Data fields:

```ts
sliderMax?: number;
sliderMid?: number;
sliderLeftText?: string;
sliderRightText?: string;
```

Render style:

- Rounded dark panel (`border-white/15`, `bg-slate-900/90`)
- Label text at top-left
- Live numeric bubble pinned by percentage along track
- `Slider` component with integer steps
- Left/right caption text (default `Low` / `High`)

```tsx
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
```

Runtime state write:

```ts
const handlePreviewSliderChange = React.useCallback((itemId: string, value: number) => {
  setPreviewSliderValues((prev) => ({
    ...prev,
    [itemId]: Math.max(0, Math.round(value)),
  }));
}, []);
```

## 2.2 Button slider (`kind = "button-slider"`)

This is drag-driven intensity over a button/icon.

Core behavior:

1. Pointer down initializes drag state and sets temporary preview value
2. Horizontal drag creates signed distance
3. Once drag passes deadzone, ticking loop starts (`BUTTON_SLIDER_DRAG_DEADZONE_PX = 6`)
4. Direction inversion respects swap mirroring

Key drag-start snippet:

```ts
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
```

Preview look:

- Centered icon/text like other buttons
- Violet horizontal drag line + thumb
- Multiplier chip (`+1.7x`, `-0.8x`) shown above drag midpoint

---

## 3) Post-Match Questions

There are two parts:

1. Embedded into editor payload as `editorState.postMatchQuestions`
2. Managed in dedicated page `src/app/post-match/page.tsx`

## 3.1 Question schema

```ts
type QuestionType = "text" | "slider" | "all-that-apply" | "single-select";

type PostMatchQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  sliderMin: number;
  sliderMax: number;
  sliderLeftText: string;
  sliderRightText: string;
};
```

## 3.2 Parse + normalize in editor state

```ts
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
        tag: typeof question.tag === "string" ? normalizeTag(question.tag) : "",
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
```

## 3.3 Save flow

`post-match/page.tsx` reads current public config by `uploadId`, mutates only `editorState.postMatchQuestions`, then POSTs through `/api/field-configs` with existing `backgroundImage/backgroundLocation` preserved.

---

## 4) Success Button System (Text/Icon)

Success tracking is available for `text` and `icon` assets.

## 4.1 Data fields

```ts
successTrackingEnabled?: boolean;
successPopoverOffsetX?: number;
successPopoverOffsetY?: number;
```

## 4.2 Editor settings UI

When enabled, settings expose X/Y popover offset controls.

```tsx
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
```

## 4.3 Preview interaction and look

- Clicking tracked text/icon in preview opens a 2-cell overlay (success/fail).
- Left cell is emerald with check icon.
- Right cell is rose with X icon.
- Overlay can be nudged by offsets.

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

Context-menu adjustment cycles through fixed positions:

```ts
const positions = [
  { x: 0, y: 0 },
  { x: 0, y: -48 },
  { x: 0, y: 48 },
  { x: -48, y: 0 },
  { x: 48, y: 0 },
];
```

---

## 5) Background Image Storage Location Changes

The system now tracks two fields on field config rows:

1. `background_image` (legacy image url/data)
2. `background_location` (preset key)

## 5.1 DB/API contract

`/api/field-configs` ensures column exists and persists `backgroundLocation`:

```ts
const ensureFieldConfigColumns = async () => {
  await sql`
    alter table public.field_configs
    add column if not exists background_location text,
    add column if not exists field_mapping jsonb
  `.execute(db);
};
```

```ts
const backgroundLocation =
  typeof body?.backgroundLocation === "string" && body.backgroundLocation.trim()
    ? body.backgroundLocation.trim()
    : null;
```

Both draft and published update paths write it:

```ts
background_image = ${input.backgroundImage},
background_location = ${input.backgroundLocation},
```

## 5.2 Preset source endpoint

Editor pulls selectable backgrounds from `/api/field-backgrounds`:

```ts
const response = await fetch("/api/field-backgrounds");
const body = (await response.json()) as {
  backgrounds?: Array<{ key: string; name: string; imageUrl: string }>;
};
```

Returned by route as:

```ts
return NextResponse.json({
  backgrounds: result.rows.map((entry) => ({
    key: entry.key,
    name: entry.name,
    imageUrl: entry.image_url,
  })),
});
```

## 5.3 Public reads include location

Public config endpoints expose `backgroundLocation` so clients can resolve by key.

Example (`/api/field-configs/public/[uploadId]/background-image`):

```ts
return NextResponse.json({
  uploadId: config.upload_id,
  backgroundImage: config.background_image,
  backgroundLocation: config.background_location,
  updatedAt: config.updated_at,
});
```

---

## 6) Toggle Conditional Textbox Removal (Required Change)

This is now fully removed from editor runtime + payload.

## 6.1 What was removed

Removed from `CanvasItem`:

- `toggleConditionalTextbox`
- `toggleConditionalTextboxLabel`
- `toggleConditionalTextboxTag`

Removed from:

- Toggle settings panel controls in editor
- Preview textbox rendering under toggles
- Preview state map for conditional textbox values
- Submission/log behavior that previously emitted textbox value when toggle on
- Legacy export fields from `toggle-switch`

## 6.2 New toggle payload contract

`toggle-switch` export is now:

```json
{
  "toggle-switch": {
    "tag": "bricked",
    "x": 7.91,
    "y": 69.68,
    "label": "Bricked",
    "value": false,
    "style": "switch",
    "textAlign": "center",
    "textSize": 10,
    "stageParentTag": "",
    "width": 6.81,
    "height": 5.38
  }
}
```

Not included anymore:

- `conditionalTextbox`
- `conditionalTextboxLabel`
- `conditionalTextboxTag`

## 6.3 Runtime submit behavior after removal

On submit/log generation, toggles always serialize as boolean string:

```ts
: entry.kind === "toggle"
  ? String(Boolean(entry.toggleOn))
```

No conditional text branch remains.

---

## 7) Visual Rebuild Notes (Exact Feel)

If recreating UI visuals exactly, preserve these patterns:

1. Container palette: `bg-slate-900/90` and border `border-white/15`
2. Typography: tiny utility scales (`text-[10px]`, `text-[11px]`, `text-xs`)
3. Corner scope badges:
   - Auto: `bg-amber-500/90 text-black`, text `A`
   - Teleop: `bg-cyan-500/90 text-black`, text `T`
4. Success popover colors:
   - Success: `bg-emerald-600/90`
   - Fail: `bg-rose-600/90`
5. Button-slider drag telemetry color family: violet (`bg-violet-300/90`, `text-violet-200`)

---

## 8) Required Rebuild Checklist

1. Implement auto/teleop scope and filtering exactly (including unscoped pass-through).
2. Implement auto-toggle countdown + force switch to teleop.
3. Implement standard slider with top value bubble and left/right labels.
4. Implement button-slider drag deadzone + signed multiplier feedback.
5. Implement post-match CRUD with save back into `editorState.postMatchQuestions`.
6. Implement success check/X overlay with configurable offsets.
7. Persist/read `backgroundLocation` everywhere configs are saved/fetched.
8. **Do not** reintroduce toggle conditional textbox fields in UI or payload.

If another AI follows sections 1, 2, 4, 5, and 6 exactly, it will match current behavior and payload contracts in this codebase.

# Backend Changes Overview

## New `field_configs` columns
- `background_location` (text): Stores a reference key (or ID-like key) for predefined field images.
- `field_mapping` (jsonb): Stores compact mapping output used for QR/data compression.

## New `field_backgrounds` table
- Purpose: Central catalog of selectable background images.
- Columns:
  - `id` UUID primary key
  - `key` unique text identifier
  - `name` display name
  - `image_url` source URL/path

## Project manager scout type
- `project_manager_entries.scout_type` added with allowed values:
  - `match`
  - `qualitative`
  - `pit`

## How images are resolved
- Editor stores selected key in `field_configs.background_location`.
- Client can resolve this via predefined list or by querying `field_backgrounds`.
- Legacy `background_image` remains for backward compatibility and fallback.

## Compact mapping JSON
When a project is completed, backend writes `field_mapping` as:

```json
{
  "mapping": {
    "0": "auto.scores",
    "1": "teleop.scores",
    "2": "auto.fuel",
    "3": "teleop.fuel"
  }
}
```

Behavior:
- Toggle tags are mapped without `auto.` / `teleop.` prefixes.
- Other tag assets get `auto.` and `teleop.` variants.


I am going to give you a set of 2 more .md files that I want you to look at to see if all the feature in them also work with this new payload: 

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

Please add all of these features and take your time

here is an example payload so you know what the intake json will look like



{
  "editorState": {
    "items": [
      {
        "x": -84.03,
        "y": -83.32,
        "id": "64467d7e-8259-40ba-954c-26b650c8ae81",
        "tag": "",
        "kind": "swap",
        "label": "Swap sides",
        "width": 11.06,
        "height": 12.4,
        "swapRedSide": "left",
        "swapActiveSide": "left"
      },
      {
        "x": -55,
        "y": -4.24,
        "id": "e03a38f5-b777-4904-bee6-c3cb445d048f",
        "tag": "",
        "kind": "start-position",
        "label": "Start Position",
        "width": 17.89,
        "height": 91.47,
        "startPositionVisible": true
      },
      {
        "x": -32.64,
        "y": -76.29,
        "id": "ecbaea32-8fce-410d-a082-56438373be84",
        "tag": "",
        "kind": "movement",
        "label": "Movement",
        "width": 7.66,
        "height": 9.94,
        "movementDirection": "left",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -33.05,
        "y": -33.12,
        "id": "c13141c5-a8f4-45e8-aa87-d18b37332fea",
        "tag": "",
        "kind": "movement",
        "label": "Movement",
        "width": 5.89,
        "height": 9.88,
        "movementDirection": "left",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -33.05,
        "y": 36.1,
        "id": "c2735dbf-a6ad-4e27-b323-417d632f805a",
        "tag": "",
        "kind": "movement",
        "label": "Movement",
        "width": 5.89,
        "height": 11.05,
        "movementDirection": "left",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -33.05,
        "y": 80.88,
        "id": "a05e1fdb-fe78-4f65-9c7e-6aec28369d19",
        "tag": "",
        "kind": "movement",
        "label": "Movement",
        "width": 5.89,
        "height": 12.75,
        "movementDirection": "left",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -33.05,
        "y": 0.18,
        "id": "2af45986-2146-45f7-9249-5da3930881e5",
        "tag": "",
        "kind": "icon",
        "label": "ArrowBigUp",
        "width": 5.89,
        "height": 14.67,
        "iconName": "ArrowBigUp",
        "fillColor": "transparent",
        "increment": 1,
        "outlineColor": "#ffffff",
        "buttonPressMode": "tap",
        "stageHideAfterSelection": true,
        "stageBlurBackgroundOnClick": true,
        "stageHideOtherElementsInStage": true
      },
      {
        "x": -72.68,
        "y": 52.34,
        "id": "141464a2-2df5-4951-bad2-4a726ee9c6a7",
        "tag": "fuel",
        "kind": "button",
        "label": "+1",
        "width": 20.66,
        "height": 46.26,
        "increment": 2,
        "stageParentId": "2af45986-2146-45f7-9249-5da3930881e5",
        "buttonPressMode": "tap",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -22.94,
        "y": 53.74,
        "id": "a1481e51-1f6f-4fb2-8b74-000bae85cd82",
        "tag": "fuel",
        "kind": "button",
        "label": "+3",
        "width": 19.77,
        "height": 46.26,
        "increment": 3,
        "stageParentId": "2af45986-2146-45f7-9249-5da3930881e5",
        "buttonPressMode": "tap",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": 28.41,
        "y": 51.86,
        "id": "5a164c4d-ab77-4df3-b78d-6dc1a41129be",
        "tag": "fuel",
        "kind": "button",
        "label": "+5",
        "width": 20.66,
        "height": 46.26,
        "increment": 5,
        "stageParentId": "2af45986-2146-45f7-9249-5da3930881e5",
        "buttonPressMode": "tap",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": 77.94,
        "y": 53.74,
        "id": "1bcf2f93-398c-46e7-84d6-e5d5779ff961",
        "tag": "fuel",
        "kind": "button",
        "label": "+10",
        "width": 20.66,
        "height": 46.26,
        "increment": 10,
        "stageParentId": "2af45986-2146-45f7-9249-5da3930881e5",
        "buttonPressMode": "tap",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -12.13,
        "y": 49.84,
        "id": "3b2628a0-3491-43f8-a9f3-a9386606fa9f",
        "tag": "",
        "kind": "icon",
        "label": "LucideShield",
        "width": 9.72,
        "height": 49.66,
        "iconName": "LucideShield",
        "fillColor": "transparent",
        "increment": 1,
        "outlineColor": "#ffffff",
        "buttonPressMode": "hold",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -11.83,
        "y": -49.81,
        "id": "49862157-c1b4-4979-9f99-d3e1a62da8aa",
        "tag": "",
        "kind": "icon",
        "label": "Circle",
        "width": 9.43,
        "height": 45.95,
        "iconName": "Circle",
        "fillColor": "transparent",
        "increment": 1,
        "outlineColor": "#ffffff",
        "buttonPressMode": "hold",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -0.15,
        "y": -0.89,
        "id": "54d18ed1-9e8f-42ea-acdc-2bc64969ca0b",
        "tag": "",
        "endX": -0.3,
        "endY": -100,
        "kind": "mirror",
        "label": "Mirror line",
        "width": 0.15,
        "height": 100,
        "startX": -0.3,
        "startY": 100
      },
      {
        "x": 49.64,
        "y": -1.14,
        "id": "8006405c-9752-4f8d-884f-4d25d6e2e7d0",
        "tag": "",
        "kind": "cover",
        "label": "Cover",
        "width": 49.81,
        "height": 100,
        "coverVisible": true
      },
      {
        "x": -84.03,
        "y": -4.24,
        "id": "c4cc5836-a2b9-4cc8-9e4f-20aa3a6dcdec",
        "tag": "",
        "kind": "icon",
        "label": "ArrowUpNarrowWideIcon",
        "width": 5.89,
        "height": 14.65,
        "iconName": "ArrowUpNarrowWideIcon",
        "fillColor": "transparent",
        "increment": 1,
        "outlineColor": "#ffffff",
        "buttonPressMode": "tap",
        "stageHideAfterSelection": true,
        "stageBlurBackgroundOnClick": true,
        "stageHideOtherElementsInStage": true
      },
      {
        "x": -75.9,
        "y": 9.5,
        "id": "76a498af-e124-495f-adb0-0f7cb20e87ba",
        "tag": "L2",
        "kind": "button",
        "label": "L2",
        "width": 15.27,
        "height": 16.1,
        "increment": 1,
        "stageParentId": "c4cc5836-a2b9-4cc8-9e4f-20aa3a6dcdec",
        "buttonPressMode": "tap",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -75.9,
        "y": -42.78,
        "id": "95e0b4e2-981e-4ea4-9133-f9162ac8d4a3",
        "tag": "L3",
        "kind": "button",
        "label": "L3",
        "width": 15.27,
        "height": 16.1,
        "increment": 1,
        "stageParentId": "c4cc5836-a2b9-4cc8-9e4f-20aa3a6dcdec",
        "buttonPressMode": "tap",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": -75.9,
        "y": 61.25,
        "id": "58701c08-aeb4-4cfa-bdcc-6cd4548c0ca4",
        "tag": "L1",
        "kind": "button",
        "label": "L1",
        "width": 15.27,
        "height": 16.1,
        "increment": 1,
        "stageParentId": "c4cc5836-a2b9-4cc8-9e4f-20aa3a6dcdec",
        "buttonPressMode": "tap",
        "stageHideAfterSelection": false,
        "stageBlurBackgroundOnClick": false,
        "stageHideOtherElementsInStage": false
      },
      {
        "x": 17.96,
        "y": 81.86,
        "id": "1596f167-50f3-4113-9291-a631c52f5776",
        "tag": "",
        "kind": "auto-toggle",
        "label": "Auto Toggle",
        "width": 15.7,
        "height": 11.66,
        "autoToggleMode": "teleop",
        "autoToggleDurationSeconds": 15
      },
      {
        "x": 50.93,
        "y": 81.14,
        "id": "74fbab1e-5494-4015-a8a5-d5cf64b95a2a",
        "tag": "",
        "kind": "team-select",
        "label": "Drop Down",
        "width": 15.5,
        "height": 11.41,
        "teamSelectValue": "team-option-1"
      },
      {
        "x": 82.82,
        "y": 80.92,
        "id": "ba34eb2e-88b0-4f1f-a73e-35fe958ffed0",
        "tag": "",
        "kind": "match-select",
        "label": "Match Select",
        "width": 14.62,
        "height": 11.66,
        "matchSelectValue": 1
      },
      {
        "x": 27.48,
        "y": 33.8,
        "id": "2f3a169d-099d-4e22-9cd1-3a8de90073ed",
        "tag": "",
        "kind": "log",
        "label": "Log",
        "width": 24.83,
        "height": 31.57
      },
      {
        "x": 73.4,
        "y": 31.3,
        "id": "f29e5fbc-8cdc-41d4-a82e-f5de7743d2ef",
        "tag": "",
        "kind": "toggle",
        "label": "Bricked",
        "width": 11.67,
        "height": 13.11,
        "toggleOn": false,
        "toggleStyle": "box",
        "toggleTextSize": 10,
        "toggleTextAlign": "center"
      },
      {
        "x": 25.03,
        "y": -19.36,
        "id": "b5b2aef7-4293-4cd0-9739-712a8da11468",
        "tag": "",
        "kind": "undo",
        "label": "Undo",
        "width": 23.95,
        "height": 17.73
      },
      {
        "x": 73.1,
        "y": -21.06,
        "id": "129517f4-acf1-49a4-ac87-c967d8c1fb60",
        "tag": "",
        "kind": "redo",
        "label": "Redo",
        "width": 22.38,
        "height": 16.99
      },
      {
        "x": 49.07,
        "y": -52.86,
        "id": "2cbf9297-d72e-4644-a917-f1e58efb8d20",
        "tag": "",
        "kind": "reset",
        "label": "Reset",
        "width": 45.64,
        "height": 12.63
      },
      {
        "x": 49.27,
        "y": -81.15,
        "id": "e94a9b11-6910-4a6b-ac99-2305e8f00cea",
        "tag": "",
        "kind": "submit",
        "label": "Submit",
        "width": 46.42,
        "height": 13.6
      },
      {
        "x": -3.6,
        "y": -43.67,
        "id": "982819d9-c8cf-4047-88fc-6226472bf368",
        "tag": "",
        "kind": "log",
        "label": "Log",
        "width": 41.24,
        "height": 43.64,
        "stageParentId": "2af45986-2146-45f7-9249-5da3930881e5"
      }
    ],
    "eventKey": "2026orwil",
    "aspectWidth": "3901",
    "aspectHeight": "1583",
    "editorTeamSide": "red",
    "coordinateSpace": "normalized-v1",
    "previewTeamSide": "red",
    "useCustomSideLayouts": false
  }
}


# GoonScout Editor Staging System: Full Reconstruction Guide

This document explains the staging system in [src/app/editor/page.tsx](src/app/editor/page.tsx) in enough detail for another AI to recreate behavior, data flow, and edge cases.

## 1. Purpose and Mental Model

Staging is a hierarchical interaction model for `text`, `icon`, and `movement` assets.

- A stage root is a parent interactive element.
- Staged children are any items with `stageParentId = <root-id>`.
- Entering a stage scopes the visible/editable/playable canvas to a stage context.
- Staging has separate runtime channels for editor and preview:
  - Editor staging context: `stagingParentId`
  - Preview staging context: `previewStageParentId`

Think of this as a single active stage pointer in each mode, not a full explicit stack. Parent traversal is implemented by following `stageParentId` links upward.

## 2. Data Model Fields

The core shape is in `CanvasItem`.

```ts
stageParentId?: string;
stageHideAfterSelection?: boolean;
stageBlurBackgroundOnClick?: boolean;
stageHideOtherElementsInStage?: boolean;
```

Semantics:

- `stageParentId`
  - Child points to its parent root id.
  - `undefined` means top-level (root layer).
- `stageHideAfterSelection`
  - While that stage is active, whether to hide the stage root itself.
- `stageBlurBackgroundOnClick`
  - In preview, stage activation can trigger blurred background treatment.
- `stageHideOtherElementsInStage`
  - When active, only stage root (+ children) are shown.
  - When false, base top-level non-staged elements remain visible while stage is active.

## 3. Stage-Eligible Asset Types

Stage root operations only allow:

- `text`
- `icon`
- `movement`

Guard pattern used repeatedly:

```ts
if (
  target.kind !== "text" &&
  target.kind !== "icon" &&
  target.kind !== "movement"
) {
  return;
}
```

## 4. State Variables and Derived Flags

Primary state:

```ts
const [stagingParentId, setStagingParentId] = React.useState<string | null>(null);
const [previewStageParentId, setPreviewStageParentId] = React.useState<string | null>(null);
```

Derived values:

```ts
const selectedHasStagedChildren = Boolean(selectedItem?.id) &&
  items.some((item) => item.stageParentId === selectedItem?.id);

const selectedIsStagingRoot =
  Boolean(selectedItem?.id) && stagingParentId === selectedItem?.id;

const stageRootIds = new Set(
  items
    .map((item) => item.stageParentId)
    .filter((value): value is string => Boolean(value))
);
```

`stageRootIds` is used for stage indicators on canvas roots.

## 5. Visibility Engine (Most Important Part)

The visible item list is computed from `items`, side filters, and stage context. This is the center of staging behavior.

Key behavior for editor stage mode (`stagingParentId` active):

```ts
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
```

Preview stage mode mirrors this with `previewStageParentId`.

Interpretation:

- If `hideOtherElements = true`:
  - Show only the stage subtree (root optional depending on `hideStageRoot`).
- If `hideOtherElements = false`:
  - Show stage children + optional root + all top-level non-staged elements.

This is why staging can be either isolated or overlay-style.

## 6. Enter/Exit Stage Flow

### Enter stage (editor)

```ts
const enterStagingForItemId = React.useCallback((itemId: string) => {
  setStagingParentId(itemId);
  setPreviewStageParentId(null);
  setIsPreviewMode(false);
  setSelectedItemId(itemId);
}, []);
```

Effects:

- Editor stage pointer set.
- Preview stage cleared.
- Forces editor mode.
- Keeps selected item focused on stage root.

### Step out of stage (editor)

```ts
const stepOutOfStaging = React.useCallback(() => {
  setStagingParentId((current) => {
    if (!current) return null;
    const active = items.find((item) => item.id === current);
    return active?.stageParentId ?? null;
  });
}, [items]);
```

This climbs up one level through parent linkage.

### Add stage button

```ts
const handleStartStaging = React.useCallback(() => {
  if (!selectedItem) return;
  if (
    selectedItem.kind !== "text" &&
    selectedItem.kind !== "icon" &&
    selectedItem.kind !== "movement"
  ) {
    return;
  }
  enterStagingForItemId(selectedItem.id);
}, [enterStagingForItemId, selectedItem]);
```

### End staging button

```ts
const handleEndStaging = React.useCallback(() => {
  stepOutOfStaging();
}, [stepOutOfStaging]);
```

### Context-menu stage toggle in editor

`handleStageContextMenu(itemId)`:

- Requires stageable root type.
- Requires root has children.
- If already inside that stage, steps out.
- Else enters that stage.

## 7. Preview Stage Flow

Preview stage open/close is independent of editor staging state.

```ts
const handlePreviewStageToggle = React.useCallback((itemId: string) => {
  const target = items.find((item) => item.id === itemId);
  if (!target) return;
  if (
    target.kind !== "text" &&
    target.kind !== "icon" &&
    target.kind !== "movement"
  ) {
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
```

Notable behavior:

- Clicking stage root in preview opens stage if children exist.
- Current implementation does not toggle closed by re-click; it keeps current.
- Exiting preview stage occurs through explicit exit paths (cover/empty click, mode switches, etc.).

## 8. Canvas Click Rules Related to Staging

Pointer down on canvas includes stage exit logic:

- In editor with active `stagingParentId`, clicking non-interactive background exits staging.
- In preview with active `previewStageParentId`, clicking cover or non-item area exits stage.

This makes stage context feel modal but easy to dismiss.

## 9. Staging Settings UI and Conditions

Settings appear under the Staging section for stageable selected roots.

Button:

- `Add stage` when not current editor stage root.
- `End staging` when selected root is the active editor stage root.

Settings card visibility:

- Shows when selected root either has staged children OR is current staging root.

Three switches:

1. `Hide after selection` -> `stageHideAfterSelection`
2. `Blur background on click` -> `stageBlurBackgroundOnClick`
3. `Hide other elements in stage` -> `stageHideOtherElementsInStage`

Handlers follow this pattern:

```ts
setItems((prev) =>
  prev.map((item) =>
    item.id === selectedItemId && (item.kind === "text" || item.kind === "icon" || item.kind === "movement")
      ? { ...item, stageHideAfterSelection: value }
      : item
  )
);
```

## 10. Import and Serialization Contracts

### Imported legacy payload fields

For stageable assets (`button`, `icon-button`, `movement-button`):

- `hideAfterSelection`
- `blurBackgroundOnClick`
- `hideOtherElementsInStage` (also accepts `hideAllOtherElementsInStage` as fallback)
- `stageParentTag`

Mapping uses normalization helpers and stage-parent tag resolution.

### Export payload fields

For `button`, `icon-button`, `movement-button`:

```json
{
  "hideAfterSelection": true,
  "blurBackgroundOnClick": false,
  "hideOtherElementsInStage": true,
  "stageParentTag": "someParentTag",
  "hasStageChildren": true
}
```

`stageParentTag` is reverse-mapped from parent id through tag lookup.

## 11. Stage Parent Tag Resolution Logic

Imported payload may reference stage parent by tag, not id.

Algorithm:

1. Parse items first and collect `tag -> [ids]` map.
2. Collect pending links `{id, stageParentTag}`.
3. Resolve each pending link to first matching id.
4. Write `stageParentId` to child.

Key snippet pattern:

```ts
const tagToIds = new Map<string, string[]>();
const pendingStageLinks: Array<{ id: string; stageParentTag: string }> = [];

// during parse:
registerStageLink(data.stageParentTag, id);

// post-parse resolve:
const stageParentIds = tagToIds.get(pending.stageParentTag);
if (!stageParentIds || stageParentIds.length === 0) {
  throw new Error(`Invalid stage relationship: parent tag "${pending.stageParentTag}" was not found.`);
}
return {
  ...item,
  stageParentId: stageParentIds[0]
};
```

## 12. Runtime Side-Filtering Interaction

Staging is evaluated on `sideScopedItems`, not raw `items`.

So if custom side layouts are enabled:

- `mirror` is always included.
- Other items are filtered by `teamSide === currentVisibleTeamSide`.
- Stage visibility is then computed inside that subset.

This means stage subtree only exists for currently visible side context.

## 13. Invariants to Preserve If Re-implementing

1. Only `text/icon/movement` are valid stage roots.
2. `stageParentId` must point to existing item or be `undefined`.
3. Stage traversal upward uses parent pointers (no separate stack object).
4. Editor stage state and preview stage state are separate.
5. Stage visibility depends on both `hideAfterSelection` and `hideOtherElementsInStage`.
6. Stage settings should be editable immediately after entering stage.
7. Serialization must preserve stage flags and parent relationships.

## 14. Recommended Rebuild Skeleton

Use this minimal blueprint if rewriting in another codebase:

```ts
type StageableKind = "text" | "icon" | "movement";

type Item = {
  id: string;
  kind: string;
  stageParentId?: string;
  stageHideAfterSelection?: boolean;
  stageBlurBackgroundOnClick?: boolean;
  stageHideOtherElementsInStage?: boolean;
};

type StageContext = {
  editorStageRootId: string | null;
  previewStageRootId: string | null;
};

function isStageable(item: Item): item is Item & { kind: StageableKind } {
  return item.kind === "text" || item.kind === "icon" || item.kind === "movement";
}

function computeVisible(items: Item[], stageRootId: string | null): Item[] {
  if (!stageRootId) return items.filter((i) => !i.stageParentId);

  const root = items.find((i) => i.id === stageRootId);
  const hideRoot = Boolean(root?.stageHideAfterSelection);
  const hideOthers = Boolean(root?.stageHideOtherElementsInStage);

  if (hideOthers) {
    return items.filter(
      (i) => i.stageParentId === stageRootId || (!hideRoot && i.id === stageRootId)
    );
  }

  return items.filter((i) => {
    if (i.stageParentId === stageRootId) return true;
    if (i.id === stageRootId) return !hideRoot;
    return !i.stageParentId;
  });
}
```

## 15. Edge Cases and Current Behavior Notes

1. If a staged root is deleted, effect logic clears invalid `stagingParentId` and `previewStageParentId`.
2. Entering preview clears editor staging in several transitions; entering staging forces editor mode.
3. With `hideOtherElementsInStage = false`, you still see base top-level non-staged elements.
4. `stageBlurBackgroundOnClick` drives visual blur state in preview when stage is active.

## 16. Quick Test Matrix (for AI validation)

1. Add `text` root, press Add stage, add child inside stage.
2. Toggle `hideAfterSelection` and verify root visibility inside active stage.
3. Toggle `hideOtherElementsInStage` and verify non-stage base elements hide/show.
4. Toggle `blurBackgroundOnClick` and verify preview blur when stage active.
5. Export JSON and confirm stage fields are emitted.
6. Re-import JSON and confirm stage subtree and flags reconstruct.

## 17. Copy-Ready Stage Settings UI Block

```tsx
<div className="grid gap-2 rounded-md border border-white/10 bg-slate-900/70 px-3 py-3">
  <div className="flex items-center justify-between gap-3">
    <Label className="text-xs text-white/80">Hide after selection</Label>
    <Switch checked={item.stageHideAfterSelection ?? false} onCheckedChange={setHideAfter} />
  </div>
  <div className="flex items-center justify-between gap-3">
    <Label className="text-xs text-white/80">Blur background on click</Label>
    <Switch checked={item.stageBlurBackgroundOnClick ?? false} onCheckedChange={setBlurOnClick} />
  </div>
  <div className="flex items-center justify-between gap-3">
    <Label className="text-xs text-white/80">Hide other elements in stage</Label>
    <Switch
      checked={item.stageHideOtherElementsInStage ?? false}
      onCheckedChange={setHideOthersInStage}
    />
  </div>
</div>
```

---

If another AI follows sections 2, 5, 6, 7, and 10 exactly, it will reproduce the same staging behavior and serialization semantics as the current editor implementation.

## 18. Held Button System (Press-And-Hold)

This section documents the full hold interaction pipeline for `text` and `icon` assets when `buttonPressMode = "hold"`.

### 18.1 Data Contract

- Field: `buttonPressMode?: "tap" | "hold"`
- Supported kinds: `text`, `icon`
- Serialization field in legacy payload: `pressMode`

Core normalizer:

```ts
type ButtonPressMode = "tap" | "hold";

const normalizeButtonPressMode = (value: unknown): ButtonPressMode =>
  value === "hold" ? "hold" : "tap";
```

### 18.2 UX Behavior

In preview mode:

1. Pointer down starts a pressed state for all buttons.
2. If the button is hold-mode (`text`/`icon` only), a timer starts.
3. Pointer up/cancel/leave stops the timer and clears pressed state.
4. Hold-mode buttons do not run tap-style stage toggle logic on click.

Important click guard in `CanvasButton`:

```ts
if (item.kind === "icon" || item.kind === "text") {
  if (normalizeButtonPressMode(item.buttonPressMode) === "hold") {
    return;
  }
  onPreviewStageToggle(item.id);
  return;
}
```

This prevents accidental stage toggles from hold-style interactions.

### 18.3 Runtime State and Timing Engine

Primary runtime state:

```ts
const [previewHoldDurationsById, setPreviewHoldDurationsById] = React.useState<
  Record<string, number>
>({});
const previewHoldStartByIdRef = React.useRef<Record<string, number>>({});
const previewHoldIntervalRef = React.useRef<number | null>(null);
```

How timing works:

1. On hold start, store `performance.now()` under item id.
2. Ensure one interval loop is running (16ms tick).
3. Each tick computes elapsed ms for all active hold ids.
4. UI only updates when values actually changed.
5. If active hold set becomes empty, interval is cleared.

Core implementation pattern:

```ts
const startPreviewHoldForItem = React.useCallback((itemId: string) => {
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
        const elapsed = Math.max(0, Math.round(tickNow - activeStartById[activeId]));
        next[activeId] = elapsed;
        if (prev[activeId] !== elapsed) changed = true;
      });

      if (Object.keys(prev).length !== activeIds.length) changed = true;
      return changed ? next : prev;
    });
  }, 16);
}, [clearPreviewHoldInterval]);
```

Stop logic:

```ts
const stopPreviewHoldForItem = React.useCallback((itemId: string) => {
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
}, [clearPreviewHoldInterval]);
```

### 18.4 Integration with CanvasButton

Button pointer events:

- `onPointerDownCapture` -> `onPreviewPressStart(item)`
- `onPointerUp`/`onPointerCancel`/`onPointerLeave` -> `onPreviewPressEnd(item.id)`

Hold start gate:

```ts
const handlePreviewPressStart = React.useCallback((item: CanvasItem) => {
  setPreviewPressedItemId(item.id);
  const isHoldButton =
    (item.kind === "text" || item.kind === "icon") &&
    normalizeButtonPressMode(item.buttonPressMode) === "hold";
  if (isHoldButton) {
    startPreviewHoldForItem(item.id);
  }
}, [startPreviewHoldForItem]);
```

### 18.5 Visual Feedback

While active in preview, hold-mode button label is replaced by elapsed seconds:

```ts
const isHoldTimerVisible =
  isPreviewMode &&
  (item.kind === "text" || item.kind === "icon") &&
  normalizeButtonPressMode(item.buttonPressMode) === "hold" &&
  typeof previewHoldDurationMs === "number";

const holdTimerLabel = (() => {
  const duration = Math.max(0, previewHoldDurationMs ?? 0);
  return (duration / 1000).toFixed(2);
})();
```

### 18.6 Reset/Cleanup Invariants

All hold refs/state are cleared on mode/reset transitions and cleanup effects:

- `previewHoldStartByIdRef.current = {}`
- `setPreviewHoldDurationsById({})`
- `clearPreviewHoldInterval()`

If recreating this system, this cleanup is mandatory to avoid leaked intervals and stale timers.

## 19. Start Position Asset System

This asset is a rectangular tap-zone that records a normalized point in preview and renders an animated concentric marker.

### 19.1 Data Contract

`CanvasItem` fields:

```ts
kind: "start-position";
startPositionVisible?: boolean;
```

Preview-only runtime state:

```ts
const [previewStartPositions, setPreviewStartPositions] = React.useState<
  Record<string, { xRatio: number; yRatio: number }>
>({});

const [hiddenPreviewStartPositionIds, setHiddenPreviewStartPositionIds] = React.useState<
  Record<string, true>
>({});
```

- `previewStartPositions[itemId]` stores selected point as `[0..1]` ratios.
- `hiddenPreviewStartPositionIds[itemId]` is used to hide markers once auto starts.

### 19.2 Placement and Constraints

- Only one start-position asset can be placed.
- Palette row enforces single-instance behavior by disabling drag when one exists.
- Asset bar contains right-side visibility toggle (editor-mode visibility only).

Creation defaults include:

```ts
startPositionVisible: kind === "start-position" ? true : undefined,
```

### 19.3 Editor vs Preview Visibility Rules

In `CanvasStartPosition`:

```ts
const isStartPositionVisible = item.startPositionVisible !== false;

if (!isPreviewMode && !isStartPositionVisible) {
  return null;
}

if (isPreviewMode && isPreviewHidden) {
  return null;
}
```

Meaning:

- Editor: hidden by asset-bar eye toggle.
- Preview: ignores editor hide toggle, but can be hidden by runtime auto-start behavior.

### 19.4 Tap Capture and Normalization

Preview tap on the start-position rectangle computes normalized coordinates:

```ts
const rect = event.currentTarget.getBoundingClientRect();
const xRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
const yRatio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
onPreviewTap(item.id, xRatio, yRatio);
```

State write:

```ts
setPreviewStartPositions((prev) => ({
  ...prev,
  [itemId]: {
    xRatio: Math.max(0, Math.min(1, xRatio)),
    yRatio: Math.max(0, Math.min(1, yRatio)),
  },
}));
```

### 19.5 Marker Rendering

If point exists, it renders at ratio position with concentric animated circles:

```tsx
<div
  className="pointer-events-none absolute"
  style={{
    left: `${previewPosition.xRatio * 100}%`,
    top: `${previewPosition.yRatio * 100}%`,
    transform: "translate(-50%, -50%)",
  }}
>
  <span className="... animate-ping ..." />
  <span className="... outer ring ..." />
  <span className="... solid center dot ..." />
</div>
```

If no point exists, preview shows the hint text: `Tap to mark start`.

### 19.6 Side-Based Color Behavior

Start-position marker color is side-aware, tied to current side/swap behavior:

- Custom side layout mode: follows `currentVisibleTeamSide`
- Non-custom mode: follows swap active side (`isSwapMirrored` mapping)

Color side resolver pattern:

```ts
const startPositionColorSide: TeamSide =
  isCustomSideLayoutsEnabled
    ? currentVisibleTeamSide
    : isSwapMirrored
      ? "blue"
      : "red";
```

### 19.7 Auto-Toggle Integration

When auto is started, all start-position markers are hidden in preview:

```ts
setHiddenPreviewStartPositionIds((prev) => {
  const next = { ...prev };
  items
    .filter((item) => item.kind === "start-position")
    .forEach((item) => {
      next[item.id] = true;
    });
  return next;
});
```

This is preview runtime state only.

### 19.8 Reset/Cleanup Behavior

These states are cleared on reset and mode transitions:

```ts
setPreviewStartPositions({});
setHiddenPreviewStartPositionIds({});
```

That guarantees a fresh start marker workflow each new preview run.

### 19.9 Serialization

Editor-state kind includes:

```json
{
  "kind": "start-position",
  "startPositionVisible": true
}
```

Legacy payload export uses `"start-position"` block with `visible`, bounds, and optional label/team/stage parent fields.

## 20. Reconstruction Checklist for Another AI

If another AI is rebuilding both systems, verify these exact outcomes:

1. Hold mode timers only for `text/icon` + `buttonPressMode = hold`.
2. Hold timer starts on pointer down and stops on up/cancel/leave.
3. Hold buttons do not trigger tap-stage logic on click.
4. Start-position captures normalized tap point and renders concentric marker.
5. Start-position editor visibility toggle does not hide it in preview.
6. Auto start hides start-position marker(s) in preview runtime.
7. Both systems clear runtime state on reset/mode transitions.

## 21. QR Runtime Tracking Model (What to Encode for Match Data)

This section defines how interactions should be tracked in the JSON that ultimately gets compressed/encoded into the QR payload.

Important distinction:

1. `editorState.items` describes UI layout and behavior configuration.
2. Runtime match data should be stored separately under a deterministic object (example: `matchData`).

Recommended top-level QR payload shape:

```json
{
  "version": 1,
  "eventKey": "2026XYZ",
  "match": {
    "team": "9999",
    "matchNumber": 12,
    "scoutId": "scout-a",
    "startedAt": "2026-03-15T16:25:12.882Z"
  },
  "matchData": {
    "startPosition": {},
    "buttons": {},
    "movement": {},
    "toggles": {},
    "inputs": {},
    "meta": {}
  }
}
```

### 21.1 Stable Keys for Runtime Tracking

Use this key priority for all trackable assets:

1. `normalizeTag(item.tag)` if non-empty.
2. Else `item.id`.

Why:

1. Tags are human-meaningful and stable across sessions if authors keep them fixed.
2. Id fallback guarantees uniqueness.

## 22. Asset-to-JSON Mapping for QR Data

### 22.1 Start Position (`kind = start-position`)

Requirement from this spec:

1. Track the exact spot tapped before match starts.
2. Freeze/commit the value when auto starts (user taps Auto on the auto-toggle).

Recommended runtime block:

```json
"startPosition": {
  "assetId": "e03a38f5-b777-4904-bee6-c3cb445d048f",
  "key": "start-position",
  "selected": true,
  "xRatio": 0.42,
  "yRatio": 0.71,
  "xPercent": 42,
  "yPercent": 71,
  "selectedAtMs": 8342,
  "lockedOnAutoStart": true,
  "lockedAtMs": 12015
}
```

Behavior rules:

1. While in pre-start mode, every tap updates `xRatio/yRatio`.
2. On Auto start, copy current value to locked state (`lockedOnAutoStart=true`).
3. If no selection exists at Auto start, write `selected=false` and null ratios.

### 22.2 Hold Buttons (`text/icon` with `buttonPressMode = hold`)

Requirement from this spec:

1. Track total hold time per button.
2. Optionally track each hold segment.

Recommended runtime block:

```json
"buttons": {
  "shield": {
    "assetId": "3b2628a0-3491-43f8-a9f3-a9386606fa9f",
    "mode": "hold",
    "hold": {
      "totalMs": 4870,
      "pressCount": 3,
      "segments": [
        { "startMs": 12400, "endMs": 13620, "durationMs": 1220 },
        { "startMs": 20100, "endMs": 21840, "durationMs": 1740 },
        { "startMs": 32100, "endMs": 34010, "durationMs": 1910 }
      ]
    }
  }
}
```

Minimum required field is `totalMs`.

Aggregation logic:

1. On pointer down: store `holdStartMs`.
2. On pointer up/cancel/leave: `delta = now - holdStartMs`; add to `totalMs`.
3. Increment `pressCount`.
4. Optionally append segment record.

### 22.3 Tap Buttons (`text/icon` with `buttonPressMode = tap`)

Track counts and optional timeline:

```json
"buttons": {
  "fuel": {
    "assetId": "141464a2-2df5-4951-bad2-4a726ee9c6a7",
    "mode": "tap",
    "tapCount": 7,
    "lastTapMs": 55210
  }
}
```

If button uses `increment`, either store:

1. raw tap count and compute later, or
2. accumulated value directly (recommended): `value = tapCount * increment`.

### 22.4 Movement Buttons (`kind = movement`)

Movement buttons are directional and globally synced in this editor setup.

Recommended runtime block:

```json
"movement": {
  "sharedDirection": "left",
  "toggleCount": 5,
  "history": [
    { "atMs": 10300, "direction": "right" },
    { "atMs": 17210, "direction": "left" }
  ],
  "assets": {
    "ecbaea32-8fce-410d-a082-56438373be84": {
      "key": "movement-1",
      "startingDirection": "left"
    }
  }
}
```

Minimal fields you should keep:

1. `sharedDirection` (final direction)
2. `toggleCount`

### 22.5 Toggle Switches (`kind = toggle`)

Track final boolean plus transition count:

```json
"toggles": {
  "bricked": {
    "assetId": "f29e5fbc-8cdc-41d4-a82e-f5de7743d2ef",
    "value": false,
    "transitionCount": 2,
    "lastChangedAtMs": 41240
  }
}
```

### 22.6 Inputs / Team Select / Match Select

Track finalized current value at submit/end:

```json
"inputs": {
  "Drop Down": "team-option-1",
  "Match Select": 1,
  "scout-notes": "clean auto"
}
```

## 23. Code Skeletons for Runtime Tracking

### 23.1 Hold Tracking Accumulator

```ts
type HoldStats = {
  totalMs: number;
  pressCount: number;
  activeStartMs?: number;
  segments?: Array<{ startMs: number; endMs: number; durationMs: number }>;
};

function beginHold(stats: HoldStats, nowMs: number): HoldStats {
  if (typeof stats.activeStartMs === "number") return stats;
  return { ...stats, activeStartMs: nowMs };
}

function endHold(stats: HoldStats, nowMs: number): HoldStats {
  if (typeof stats.activeStartMs !== "number") return stats;
  const durationMs = Math.max(0, nowMs - stats.activeStartMs);
  return {
    totalMs: stats.totalMs + durationMs,
    pressCount: stats.pressCount + 1,
    segments: [
      ...(stats.segments ?? []),
      { startMs: stats.activeStartMs, endMs: nowMs, durationMs },
    ],
  };
}
```

### 23.2 Start Position Commit-on-Auto-Start

```ts
type StartPositionState = {
  selected: boolean;
  xRatio: number | null;
  yRatio: number | null;
  selectedAtMs: number | null;
  lockedOnAutoStart: boolean;
  lockedAtMs: number | null;
};

function lockStartPositionOnAutoStart(
  current: StartPositionState,
  nowMs: number
): StartPositionState {
  return {
    ...current,
    lockedOnAutoStart: true,
    lockedAtMs: nowMs,
  };
}
```

### 23.3 Movement Toggle Tracking

```ts
type MovementStats = {
  sharedDirection: "left" | "right";
  toggleCount: number;
  history: Array<{ atMs: number; direction: "left" | "right" }>;
};

function applyMovementToggle(stats: MovementStats, nowMs: number): MovementStats {
  const nextDirection = stats.sharedDirection === "left" ? "right" : "left";
  return {
    sharedDirection: nextDirection,
    toggleCount: stats.toggleCount + 1,
    history: [...stats.history, { atMs: nowMs, direction: nextDirection }],
  };
}
```

## 24. Submission/QR Serialization Recommendation

When generating QR payload:

1. Include static `editorState` only if needed for replay/debug.
2. Always include compact `matchData` interaction result.
3. Ensure hold totals and locked start position are finalized before encoding.

Compact example (runtime-focused):

```json
{
  "version": 1,
  "eventKey": "2026XYZ",
  "team": "9999",
  "match": 12,
  "matchData": {
    "startPosition": { "xPercent": 42, "yPercent": 71, "lockedOnAutoStart": true },
    "buttons": { "shield": { "holdTotalMs": 4870 }, "fuel": { "value": 24 } },
    "movement": { "sharedDirection": "left", "toggleCount": 5 },
    "toggles": { "bricked": false }
  }
}
```

This structure satisfies the two required tracking guarantees from your spec:

1. Start location persists the tapped point and is locked at Auto start.
2. Hold buttons persist cumulative hold duration (`totalMs`).

## 25. Next Major Change: Timestamp Every Scout Action

The next change is a major system-level update and should be treated as required for all runtime event capture.

Requirement:

1. Every action recorded by scouts must include a timestamp in the generated QR payload.

This means all interactions should have an event record with at least:

1. `type` (what happened)
2. `assetId` (which item)
3. `key` (tag-first stable key)
4. `atMs` (milliseconds from scouting session start)

Recommended canonical event stream:

```json
"events": [
  {
    "type": "tap",
    "assetId": "141464a2-2df5-4951-bad2-4a726ee9c6a7",
    "key": "fuel",
    "atMs": 10435,
    "valueDelta": 2
  },
  {
    "type": "hold-end",
    "assetId": "3b2628a0-3491-43f8-a9f3-a9386606fa9f",
    "key": "shield",
    "atMs": 22610,
    "durationMs": 1740
  },
  {
    "type": "start-position-lock",
    "assetId": "e03a38f5-b777-4904-bee6-c3cb445d048f",
    "key": "start-position",
    "atMs": 12015,
    "xRatio": 0.42,
    "yRatio": 0.71
  }
]
```

Implementation note:

1. Keep aggregate summaries (`buttons`, `movement`, `toggles`) for fast decoding.
2. Also keep the timestamped `events` array for replay, analytics, and auditability.

## 26. Movement Button as Robot Position Tracker

Movement should not only represent direction toggles. It should also log robot position transitions when scouts press movement-related controls.

Requirement:

1. A movement click can indicate the robot moved into a field zone identified by tag (example: `neutral-area-entry`).

Recommended modeling:

1. Use tag-first keying for location events (`normalizeTag(item.tag)` first, then id fallback).
2. Store a dedicated movement position timeline.
3. Attach timestamp to every position transition.

Example runtime block:

```json
"movement": {
  "sharedDirection": "left",
  "toggleCount": 5,
  "positionEvents": [
    {
      "assetId": "ecbaea32-8fce-410d-a082-56438373be84",
      "key": "neutral-area-entry",
      "atMs": 15320,
      "zone": "neutral",
      "action": "entered"
    },
    {
      "assetId": "c13141c5-a8f4-45e8-aa87-d18b37332fea",
      "key": "left-lane-exit",
      "atMs": 21940,
      "zone": "left-lane",
      "action": "exited"
    }
  ]
}
```

If tags are authored for path waypoints, this creates a clean positional timeline in QR data without needing full coordinate telemetry.

Minimal event object for movement-position logging:

```ts
type MovementPositionEvent = {
  assetId: string;
  key: string;
  atMs: number;
  zone?: string;
  action?: "entered" | "exited" | "crossed";
};
```

This satisfies your requested behavior: when a movement button is clicked, the QR data can explicitly represent that the robot moved through a tagged location such as the neutral area.

