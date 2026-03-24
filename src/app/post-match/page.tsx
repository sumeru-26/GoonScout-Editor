"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const [isSaving, setIsSaving] = React.useState(false);
  const [questions, setQuestions] = React.useState<PostMatchQuestion[]>([]);

  React.useEffect(() => {
    if (!uploadId) return;

    let cancelled = false;
    const load = async () => {
      const response = await fetch(`/api/field-configs/public/${encodeURIComponent(uploadId)}`);
      if (!response.ok) return;
      const body = (await response.json()) as {
        config?: { payload?: { editorState?: { postMatchQuestions?: unknown } } };
      };
      const raw = body.config?.payload?.editorState?.postMatchQuestions;
      if (!Array.isArray(raw) || cancelled) return;
      setQuestions(
        raw
          .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
          .map((entry, index) => ({
            id: typeof entry.id === "string" ? entry.id : `q-${index}`,
            text: typeof entry.text === "string" ? entry.text : "",
            type:
              entry.type === "slider" ||
              entry.type === "all-that-apply" ||
              entry.type === "single-select"
                ? entry.type
                : "text",
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
      );
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

  const saveQuestions = React.useCallback(async () => {
    if (!uploadId) {
      toast.error("Open this page from a project first.");
      return;
    }

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
        throw new Error("Failed to save post-match questions.");
      }

      toast.success("Post-match questions saved.");
      router.push(`/editor?uploadId=${encodeURIComponent(uploadId)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [questions, router, uploadId]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="text-4xl font-black tracking-tight text-white">GoonScout</div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-white/20 bg-slate-900/60 px-4 text-white hover:bg-slate-800"
            onClick={() => router.push(uploadId ? `/editor?uploadId=${encodeURIComponent(uploadId)}` : "/projectManager")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-white/20 bg-slate-900/60 px-4 text-white hover:bg-slate-800"
            onClick={addQuestion}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add question
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-500"
            onClick={() => void saveQuestions()}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur">
          <h1 className="text-3xl font-semibold">Post Match Questions</h1>
          <p className="mt-1 text-sm text-white/65">
            Build post-match prompts for qualitative notes and ratings.
          </p>
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
              className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-xs text-white/60">Question {index + 1}</div>
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
            No post-match questions yet. Click &quot;Add question&quot; in the top bar.
          </div>
        ) : null}
      </main>
    </div>
  );
}
