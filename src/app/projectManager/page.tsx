"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Eye,
  Folder,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type ProjectStatus = "active" | "archive" | "trash";

type Project = {
  uploadId: string;
  name: string;
  status: ProjectStatus;
  updatedAt: string;
  configUpdatedAt?: string;
  stageCount: number;
  backgroundImage: string | null;
};

const statusLabel: Record<ProjectStatus, string> = {
  active: "My Projects",
  archive: "Archive",
  trash: "Trash",
};

const formatUpdatedText = (value: string) => {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Last edited: Unknown";
  }

  const now = new Date();
  const msInDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate()
      ).getTime()) /
      msInDay
  );

  if (dayDiff <= 0) return "Last edited: Today";
  if (dayDiff === 1) return "Last edited: Yesterday";

  const month = timestamp.toLocaleString("en-US", { month: "short" });
  const day = timestamp.getDate();
  return `Last edited: ${month} ${day}`;
};

const stageLabel = (count: number) => `${count} ${count === 1 ? "Stage" : "Stages"}`;

const cardGradient =
  "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.16), transparent 42%), radial-gradient(circle at 80% 35%, rgba(30,64,175,0.25), transparent 45%), linear-gradient(180deg, rgba(15,23,42,0.9), rgba(10,15,32,0.95))";

export default function ProjectManagerPage() {
  const router = useRouter();
  const { data: sessionData, isPending: isSessionPending } = authClient.useSession();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const userMenuRef = React.useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [activeStatus, setActiveStatus] = React.useState<ProjectStatus>("active");
  const [search, setSearch] = React.useState("");
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = React.useState(false);
  const [projectsByStatus, setProjectsByStatus] = React.useState<
    Record<ProjectStatus, Project[]>
  >({
    active: [],
    archive: [],
    trash: [],
  });

  const userName = sessionData?.user?.name ?? "Scout";
  const userImage = sessionData?.user?.image ?? null;
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const resolvedUserImage = React.useMemo(() => {
    const image = userImage?.trim();
    if (!image) return null;
    if (/^(https?:\/\/|data:image\/|blob:|\/)/i.test(image)) {
      return image;
    }
    return `/${image.replace(/^\/+/, "")}`;
  }, [userImage]);

  React.useEffect(() => {
    if (isSessionPending) return;
    if (!sessionData?.user?.id) {
      router.push("/login");
    }
  }, [isSessionPending, router, sessionData?.user?.id]);

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

  const fetchProjects = React.useCallback(async (status: ProjectStatus) => {
    const response = await fetch(`/api/projects?status=${status}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${statusLabel[status]}.`);
    }

    const result = (await response.json()) as { projects?: Project[] };
    return result.projects ?? [];
  }, []);

  const refreshProjects = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [active, archive, trash] = await Promise.all([
        fetchProjects("active"),
        fetchProjects("archive"),
        fetchProjects("trash"),
      ]);

      setProjectsByStatus({ active, archive, trash });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load projects.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProjects]);

  React.useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const displayedProjects = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = projectsByStatus[activeStatus];
    if (!term) return source;
    return source.filter((project) => project.name.toLowerCase().includes(term));
  }, [activeStatus, projectsByStatus, search]);

  const handleCreateProject = React.useCallback(async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Project" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project.");
      }

      const result = (await response.json()) as {
        project?: { uploadId?: string };
      };

      const uploadId = result.project?.uploadId;
      if (!uploadId) {
        throw new Error("Create response missing upload id.");
      }

      toast.success("Project created.");
      router.push(`/editor?uploadId=${uploadId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create project.";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [router]);

  const updateProject = React.useCallback(
    async (uploadId: string, updates: { status?: ProjectStatus; name?: string }) => {
      const response = await fetch(`/api/projects/${uploadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Project update failed.");
      }

      await refreshProjects();
    },
    [refreshProjects]
  );

  const handlePermanentDelete = React.useCallback(
    async (uploadId: string) => {
      const response = await fetch(`/api/projects/${uploadId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed.");
      }

      await refreshProjects();
    },
    [refreshProjects]
  );

  const handleUploadClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setIsUploading(true);
      try {
        const rawText = await file.text();
        const parsed = JSON.parse(rawText) as unknown;

        const source =
          parsed && typeof parsed === "object"
            ? (parsed as Record<string, unknown>)
            : null;

        const payload = Array.isArray(source?.payload)
          ? source?.payload
          : Array.isArray(parsed)
            ? parsed
            : null;

        if (!payload) {
          throw new Error("Uploaded JSON must include a payload array.");
        }

        const backgroundImage =
          source &&
          source.background &&
          typeof source.background === "object" &&
          source.background !== null &&
          typeof (source.background as Record<string, unknown>).fallbackImage ===
            "string"
            ? ((source.background as Record<string, unknown>).fallbackImage as string)
            : null;

        const editorState = source?.editorState ?? null;

        const uploadResponse = await fetch("/api/field-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload,
            editorState,
            backgroundImage,
            isDraft: false,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed.");
        }

        const uploadResult = (await uploadResponse.json()) as { uploadId?: string };
        if (!uploadResult.uploadId) {
          throw new Error("Upload response missing upload id.");
        }

        const baseName = file.name.replace(/\.json$/i, "").trim();
        const name = baseName.length > 0 ? baseName : "Imported Project";

        await updateProject(uploadResult.uploadId, { name, status: "active" });
        toast.success("Project uploaded.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed.";
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [updateProject]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_10%_0%,#16234b_0%,#070b1a_45%,#04060f_100%)] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="text-4xl font-black tracking-tight text-white">GoonScout</div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="h-10 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-500"
            onClick={handleCreateProject}
            disabled={isCreating}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-white/20 bg-slate-900/60 px-5 text-white hover:bg-slate-800"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFileChange}
          />
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
      </header>

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-[220px_minmax(0,1fr)] gap-4 p-4">
        <aside className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur">
          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              className="h-10 border-white/10 bg-slate-900/80 pl-9 text-white placeholder:text-white/35"
            />
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
            Projects
          </p>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setActiveStatus("active")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                activeStatus === "active"
                  ? "bg-blue-600/20 text-white"
                  : "text-white/80 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                My Projects
              </span>
              <span className="text-sm text-white/60">{projectsByStatus.active.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStatus("archive")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                activeStatus === "archive"
                  ? "bg-blue-600/20 text-white"
                  : "text-white/80 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Archive
              </span>
              <span className="text-sm text-white/60">{projectsByStatus.archive.length}</span>
            </button>
          </div>

          <div className="mt-auto pt-8">
            <button
              type="button"
              onClick={() => setActiveStatus("trash")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                activeStatus === "trash"
                  ? "bg-red-600/20 text-red-200"
                  : "text-white/70 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Trash
              </span>
              <span className="text-sm">{projectsByStatus.trash.length}</span>
            </button>
          </div>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-4xl font-semibold tracking-tight">{statusLabel[activeStatus]}</h1>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
                className="h-10 border-white/10 bg-slate-900/80 pl-9 text-white placeholder:text-white/35"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-white/10 bg-slate-900/40 px-4 py-8 text-sm text-white/70">
              Loading projects...
            </div>
          ) : displayedProjects.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-900/40 px-4 py-8 text-sm text-white/70">
              No projects found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {displayedProjects.map((project) => (
                <article
                  key={project.uploadId}
                  className="relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 transition hover:border-blue-400/45"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    router.push(`/editor?uploadId=${project.uploadId}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    router.push(`/editor?uploadId=${project.uploadId}`);
                  }}
                >
                  <div className="h-40 w-full border-b border-white/10 bg-slate-900/70">
                    {project.backgroundImage ? (
                      <img
                        src={project.backgroundImage}
                        alt={project.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full" style={{ background: cardGradient }} />
                    )}
                  </div>

                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h2 className="text-3xl font-semibold leading-tight">{project.name}</h2>
                      <div className="relative">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId((current) =>
                              current === project.uploadId ? null : project.uploadId
                            );
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>

                        {openMenuId === project.uploadId ? (
                          <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-white/10 bg-slate-950 p-1 shadow-2xl">
                            <button
                              type="button"
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuId(null);
                                router.push(`/editor?uploadId=${project.uploadId}`);
                              }}
                            >
                              Open Project
                            </button>

                            {activeStatus === "active" ? (
                              <button
                                type="button"
                                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                                onClick={async (event) => {
                                  event.stopPropagation();
                                  setOpenMenuId(null);
                                  await updateProject(project.uploadId, { status: "archive" });
                                }}
                              >
                                Archive
                              </button>
                            ) : null}

                            {activeStatus === "archive" ? (
                              <button
                                type="button"
                                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                                onClick={async (event) => {
                                  event.stopPropagation();
                                  setOpenMenuId(null);
                                  await updateProject(project.uploadId, { status: "active" });
                                }}
                              >
                                Move to My Projects
                              </button>
                            ) : null}

                            {activeStatus !== "trash" ? (
                              <button
                                type="button"
                                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/20"
                                onClick={async (event) => {
                                  event.stopPropagation();
                                  setOpenMenuId(null);
                                  await updateProject(project.uploadId, { status: "trash" });
                                }}
                              >
                                Move to Trash
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                                  onClick={async (event) => {
                                    event.stopPropagation();
                                    setOpenMenuId(null);
                                    await updateProject(project.uploadId, { status: "active" });
                                  }}
                                >
                                  Restore
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/20"
                                  onClick={async (event) => {
                                    event.stopPropagation();
                                    setOpenMenuId(null);
                                    await handlePermanentDelete(project.uploadId);
                                  }}
                                >
                                  Delete Permanently
                                </button>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <p className="text-base text-white/65">{formatUpdatedText(project.updatedAt)}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-2xl text-white/85">{stageLabel(project.stageCount)}</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1 text-sm text-white/70">
                          <Users className="h-3.5 w-3.5" />
                          +3
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1 text-sm text-white/70">
                          <Eye className="h-3.5 w-3.5" />
                          Open
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
