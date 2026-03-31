"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, GripVertical, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QuestionType = "text" | "slider" | "all-that-apply" | "single-select";
type ScoutType = "match" | "qualitative" | "pit";

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

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "slider", label: "Slider" },
  { value: "all-that-apply", label: "All that apply" },
  { value: "single-select", label: "Single select" },
];

export default function PostMatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId")?.trim() ?? "";
  const modeParam = searchParams.get("mode")?.trim().toLowerCase() ?? "";

  const [isSaving, setIsSaving] = React.useState(false);
  const [questions, setQuestions] = React.useState<PostMatchQuestion[]>([]);
  const [hasLoadedQuestions, setHasLoadedQuestions] = React.useState(false);
  const [projectContentHash, setProjectContentHash] = React.useState<string>("");
  const [draggingQuestionId, setDraggingQuestionId] = React.useState<string | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = React.useState<string | null>(null);
  const [scoutType, setScoutType] = React.useState<ScoutType>(
    modeParam === "pit" ? "pit" : "qualitative"
  );
  const isSavingRef = React.useRef(false);
  const lastSavedQuestionsRef = React.useRef<string>("[]");

  const isPitScouting = scoutType === "pit" || modeParam === "pit";
  const pageTitle = isPitScouting ? "Pit Scouting" : "Post Match Questions";
  const pageDescription = isPitScouting
    ? "Build pit scouting prompts and notes for robot walkthroughs."
    : "Build post-match prompts for qualitative notes and ratings.";
  const questionLabel = isPitScouting
    ? "pit scouting questions"
    : "post-match questions";
  const encodedUploadId = encodeURIComponent(uploadId);
  const editorRoute = uploadId ? `/editor?uploadId=${encodedUploadId}` : "/projectManager";
  const returnRoute = isPitScouting ? "/projectManager" : editorRoute;

  React.useEffect(() => {
    if (!uploadId) {
      setScoutType(modeParam === "pit" ? "pit" : "qualitative");
      setProjectContentHash("");
      return;
    }

    let cancelled = false;
    const loadScoutType = async () => {
      const response = await fetch(`/api/projects/${encodeURIComponent(uploadId)}`);
      if (!response.ok || cancelled) return;

      const body = (await response.json()) as {
        project?: { scoutType?: ScoutType; contentHash?: string | null };
      };
      const nextScoutType = body.project?.scoutType;
      const nextContentHash =
        typeof body.project?.contentHash === "string"
          ? body.project.contentHash.trim()
          : "";
      if (
        !cancelled &&
        (nextScoutType === "match" ||
          nextScoutType === "qualitative" ||
          nextScoutType === "pit")
      ) {
        setScoutType(nextScoutType);
        setProjectContentHash(nextContentHash);
      }
    };

    void loadScoutType();
    return () => {
      cancelled = true;
    };
  }, [modeParam, uploadId]);

  React.useEffect(() => {
    if (!uploadId) {
      setQuestions([]);
      setHasLoadedQuestions(true);
      lastSavedQuestionsRef.current = "[]";
      return;
    }

    setHasLoadedQuestions(false);

    let cancelled = false;
    const load = async () => {
      const response = await fetch(`/api/field-configs/public/${encodeURIComponent(uploadId)}`);
      if (!response.ok) {
        if (!cancelled) {
          setQuestions([]);
          setHasLoadedQuestions(true);
          lastSavedQuestionsRef.current = "[]";
        }
        return;
      }
      const body = (await response.json()) as {
        config?: { payload?: { editorState?: { postMatchQuestions?: unknown } } };
      };
      const raw = body.config?.payload?.editorState?.postMatchQuestions;
      if (cancelled) return;

      const nextQuestions = Array.isArray(raw)
        ? raw
          .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
          .map((entry, index) => ({
            id: typeof entry.id === "string" ? entry.id : `q-${index}`,
            text: typeof entry.text === "string" ? entry.text : "",
            type:
              entry.type === "slider" ||
              entry.type === "all-that-apply" ||
              entry.type === "single-select"
                ? entry.type
                : "text" as QuestionType,
            options: Array.isArray(entry.options)
              ? entry.options.filter((item): item is string => typeof item === "string")
              : [],
            sliderMin:
              typeof entry.sliderMin === "number" && Number.isFinite(entry.sliderMin)
                ? Math.round(entry.sliderMin)
                : 0,
            sliderMax:
              typeof entry.sliderMax === "number" && Number.isFinite(entry.sliderMax)
                ? Math.round(entry.sliderMax)
                : 10,
            sliderLeftText:
              typeof entry.sliderLeftText === "string" ? entry.sliderLeftText : "Low",
            sliderRightText:
              typeof entry.sliderRightText === "string" ? entry.sliderRightText : "High",
          }))
        : [];

      setQuestions(nextQuestions);
      lastSavedQuestionsRef.current = JSON.stringify(nextQuestions);
      setHasLoadedQuestions(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [uploadId]);

  const addQuestion = React.useCallback(() => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `post-q-${Date.now()}`;
    setQuestions((prev) => [
      ...prev,
      {
        id,
        text: "",
        type: "text",
        options: ["Option 1"],
        sliderMin: 0,
        sliderMax: 10,
        sliderLeftText: "Low",
        sliderRightText: "High",
      },
    ]);
  }, []);

  const reorderQuestion = React.useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;

    setQuestions((prev) => {
      const fromIndex = prev.findIndex((entry) => entry.id === fromId);
      const toIndex = prev.findIndex((entry) => entry.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const clearQuestionDragState = React.useCallback(() => {
    setDraggingQuestionId(null);
    setDragOverQuestionId(null);
  }, []);

  const saveQuestions = React.useCallback(async (
    options: { redirectToEditor?: boolean; showSuccessToast?: boolean } = {}
  ) => {
    const { redirectToEditor = true, showSuccessToast = true } = options;

    if (!uploadId) {
      toast.error("Open this page from a project first.");
      return false;
    }

    if (isSavingRef.current) return false;

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const read = await fetch(`/api/field-configs/public/${encodeURIComponent(uploadId)}`);
      if (!read.ok) {
        throw new Error("Failed to load project payload.");
      }

      const current = (await read.json()) as {
        config?: {
          payload?: Record<string, unknown>;
          backgroundImage?: string | null;
          backgroundLocation?: string | null;
        };
      };

      const payload =
        current.config?.payload && typeof current.config.payload === "object"
          ? { ...(current.config.payload as Record<string, unknown>) }
          : {};

      const editorState =
        payload.editorState && typeof payload.editorState === "object"
          ? { ...(payload.editorState as Record<string, unknown>) }
          : {};

      editorState.postMatchQuestions = questions;
      payload.editorState = editorState;

      const response = await fetch("/api/field-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          editorState,
          uploadId,
          backgroundImage: current.config?.backgroundImage ?? null,
          backgroundLocation: current.config?.backgroundLocation ?? null,
          isDraft: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save ${questionLabel}.`);
      }

      lastSavedQuestionsRef.current = JSON.stringify(questions);

      if (showSuccessToast) {
        toast.success(`${isPitScouting ? "Pit scouting" : "Post-match"} questions saved.`);
      }

      if (redirectToEditor) {
        router.push(returnRoute);
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : `Save failed for ${questionLabel}.`;
      toast.error(message);
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [isPitScouting, questionLabel, questions, returnRoute, router, uploadId]);

  React.useEffect(() => {
    if (!uploadId || !hasLoadedQuestions) return;

    const serializedQuestions = JSON.stringify(questions);
    if (serializedQuestions === lastSavedQuestionsRef.current) return;

    const timeoutId = window.setTimeout(() => {
      void saveQuestions({
        redirectToEditor: false,
        showSuccessToast: false,
      });
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasLoadedQuestions, questions, saveQuestions, uploadId]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="text-4xl font-black tracking-tight text-white">GoonScout</div>
        <div className="flex items-center gap-3">
          {!isPitScouting ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-white/20 bg-slate-900/60 px-4 text-white hover:bg-slate-800"
              onClick={() => router.push(returnRoute)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            className="h-10 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-500"
            onClick={() =>
              void saveQuestions({
                redirectToEditor: true,
                showSuccessToast: true,
              })
            }
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : isPitScouting ? "Save & Exit" : "Save & Return"}
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur">
          <h1 className="text-3xl font-semibold">{pageTitle}</h1>
          <p className="mt-1 text-sm text-white/65">
            {pageDescription}
          </p>
          {isPitScouting ? (
            <p className="mt-2 text-xs text-blue-200">
              Hash: {projectContentHash || "Unavailable"}
            </p>
          ) : null}
          {uploadId ? (
            <p className="mt-2 text-xs text-emerald-300">
              Autosave is on. Changes are saved automatically.
            </p>
          ) : null}
          {!uploadId ? (
            <p className="mt-2 text-xs text-amber-300">
              Open this page from a project to save changes.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4">
          {questions.map((question, index) => (
            <section
              key={question.id}
              className={`rounded-xl border bg-slate-950/60 p-4 transition-colors ${
                dragOverQuestionId === question.id
                  ? "border-blue-400/60"
                  : "border-white/10"
              }`}
              onDragOver={(event) => {
                if (!draggingQuestionId || draggingQuestionId === question.id) return;
                event.preventDefault();
                setDragOverQuestionId(question.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!draggingQuestionId || draggingQuestionId === question.id) {
                  clearQuestionDragState();
                  return;
                }
                reorderQuestion(draggingQuestionId, question.id);
                clearQuestionDragState();
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    draggable
                    onDragStart={() => {
                      setDraggingQuestionId(question.id);
                      setDragOverQuestionId(question.id);
                    }}
                    onDragEnd={clearQuestionDragState}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-slate-900/70 text-white/70 hover:bg-slate-800"
                    aria-label="Drag to reorder question"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <div className="text-xs text-white/60">Question {index + 1}</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 border-white/20 bg-slate-900/70 text-white hover:bg-slate-800"
                  onClick={() =>
                    setQuestions((prev) => prev.filter((entry) => entry.id !== question.id))
                  }
                >
                  Remove
                </Button>
              </div>

              <div className="grid gap-2">
                <Label>Question</Label>
                <Input
                  value={question.text}
                  onChange={(event) =>
                    setQuestions((prev) =>
                      prev.map((entry) =>
                        entry.id === question.id ? { ...entry, text: event.target.value } : entry
                      )
                    )
                  }
                  className="border-white/10 bg-slate-900/80 text-white"
                />
              </div>

              <div className="mt-3 grid gap-2">
                <Label>Answer type</Label>
                <select
                  value={question.type}
                  onChange={(event) =>
                    setQuestions((prev) =>
                      prev.map((entry) =>
                        entry.id === question.id
                          ? { ...entry, type: event.target.value as QuestionType }
                          : entry
                      )
                    )
                  }
                  className="h-10 rounded-md border border-white/10 bg-slate-900/80 px-3 text-white"
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {(question.type === "all-that-apply" || question.type === "single-select") ? (
                <div className="mt-3 grid gap-2">
                  <Label>Answer choices</Label>
                  {question.options.map((option, optionIndex) => (
                    <Input
                      key={`${question.id}-option-${optionIndex}`}
                      value={option}
                      onChange={(event) =>
                        setQuestions((prev) =>
                          prev.map((entry) =>
                            entry.id === question.id
                              ? {
                                  ...entry,
                                  options: entry.options.map((value, index) =>
                                    index === optionIndex ? event.target.value : value
                                  ),
                                }
                              : entry
                          )
                        )
                      }
                      className="border-white/10 bg-slate-900/80 text-white"
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 bg-slate-900/70 text-white hover:bg-slate-800"
                    onClick={() =>
                      setQuestions((prev) =>
                        prev.map((entry) =>
                          entry.id === question.id
                            ? {
                                ...entry,
                                options: [...entry.options, `Option ${entry.options.length + 1}`],
                              }
                            : entry
                        )
                      )
                    }
                  >
                    Add choice
                  </Button>
                </div>
              ) : null}

              {question.type === "slider" ? (
                <div className="mt-3 grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label>Min value</Label>
                      <Input
                        type="number"
                        value={question.sliderMin}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setQuestions((prev) =>
                            prev.map((entry) =>
                              entry.id === question.id
                                ? {
                                    ...entry,
                                    sliderMin: Number.isFinite(next) ? Math.round(next) : 0,
                                  }
                                : entry
                            )
                          );
                        }}
                        className="border-white/10 bg-slate-900/80 text-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Max value</Label>
                      <Input
                        type="number"
                        value={question.sliderMax}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setQuestions((prev) =>
                            prev.map((entry) =>
                              entry.id === question.id
                                ? {
                                    ...entry,
                                    sliderMax: Number.isFinite(next) ? Math.round(next) : 10,
                                  }
                                : entry
                            )
                          );
                        }}
                        className="border-white/10 bg-slate-900/80 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label>Left text</Label>
                      <Input
                        value={question.sliderLeftText}
                        onChange={(event) =>
                          setQuestions((prev) =>
                            prev.map((entry) =>
                              entry.id === question.id
                                ? { ...entry, sliderLeftText: event.target.value }
                                : entry
                            )
                          )
                        }
                        className="border-white/10 bg-slate-900/80 text-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Right text</Label>
                      <Input
                        value={question.sliderRightText}
                        onChange={(event) =>
                          setQuestions((prev) =>
                            prev.map((entry) =>
                              entry.id === question.id
                                ? { ...entry, sliderRightText: event.target.value }
                                : entry
                            )
                          )
                        }
                        className="border-white/10 bg-slate-900/80 text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ))}
        </div>

        {questions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/40 px-4 py-8 text-sm text-white/70">
            {isPitScouting
              ? "No pit scouting questions yet. Add your first question below."
              : "No post-match questions yet. Add your first question below."}
          </div>
        ) : null}

        <div className="mt-4 flex justify-start">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-white/20 bg-slate-900/60 px-4 text-white hover:bg-slate-800"
            onClick={addQuestion}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add question
          </Button>
        </div>
      </main>
    </div>
  );
}
