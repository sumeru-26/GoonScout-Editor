"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Folder,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type ProjectStatus = "active" | "archive" | "trash";

type Project = {
  uploadId: string;
  name: string;
  status: ProjectStatus;
  scoutType?: "match" | "qualitative" | "pit";
  updatedAt: string;
  configUpdatedAt?: string;
  stageCount: number;
  backgroundImage: string | null;
  isPublic?: boolean;
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

const cardGradient =
  "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.16), transparent 42%), radial-gradient(circle at 80% 35%, rgba(30,64,175,0.25), transparent 45%), linear-gradient(180deg, rgba(15,23,42,0.9), rgba(10,15,32,0.95))";

const scoutTypeBadgeMeta: Record<"match" | "qualitative" | "pit", { label: string; className: string }> = {
  match: {
    label: "Match Scout",
    className: "border-blue-400/40 bg-blue-500/15 text-blue-100",
  },
  qualitative: {
    label: "Qual Scout",
    className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  },
  pit: {
    label: "Pit Scout",
    className: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  },
};

const getScoutTypeBadge = (value: Project["scoutType"]) =>
  scoutTypeBadgeMeta[value ?? "match"];

const getProjectOpenRoute = (project: Pick<Project, "uploadId" | "scoutType">) => {
  const encodedUploadId = encodeURIComponent(project.uploadId);
  if (project.scoutType === "pit") {
    return `/post-match?uploadId=${encodedUploadId}&mode=pit`;
  }
  return `/editor?uploadId=${encodedUploadId}`;
};

export default function ProjectManagerPage() {
  const router = useRouter();
  const { data: sessionData, isPending: isSessionPending } = authClient.useSession();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const userMenuRef = React.useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeletingProject, setIsDeletingProject] = React.useState(false);
  const [projectToDelete, setProjectToDelete] = React.useState<
    { uploadId: string; name: string } | null
  >(null);
  const [createProjectName, setCreateProjectName] = React.useState("Untitled Project");
  const [createProjectIsPublic, setCreateProjectIsPublic] = React.useState(false);
  const [createProjectScoutType, setCreateProjectScoutType] = React.useState<
    "match" | "qualitative" | "pit"
  >("match");
  const [uploadMode, setUploadMode] = React.useState<"file" | "hash">("file");
  const [uploadProjectName, setUploadProjectName] = React.useState("Imported Project");
  const [uploadProjectIsPublic, setUploadProjectIsPublic] = React.useState(false);
  const [uploadContentHash, setUploadContentHash] = React.useState("");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
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
    try {
      const response = await fetch(`/api/projects?status=${status}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `Failed to load ${statusLabel[status]}.`);
      }

      const result = (await response.json()) as { projects?: Project[] };
      return result.projects ?? [];
    } catch (error) {
      if (error instanceof Error && error.name === "TypeError") {
        throw new Error("Network issue while loading projects. Check your connection.");
      }
      throw error;
    }
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
    if (isSessionPending) return;
    if (!sessionData?.user?.id) {
      setIsLoading(false);
      return;
    }

    void refreshProjects();
  }, [isSessionPending, refreshProjects, sessionData?.user?.id]);

  const displayedProjects = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = projectsByStatus[activeStatus];
    if (!term) return source;
    return source.filter((project) => project.name.toLowerCase().includes(term));
  }, [activeStatus, projectsByStatus, search]);

  const handleCreateProject = React.useCallback(async () => {
    const projectName = createProjectName.trim();
    if (!projectName) {
      toast.error("Project name is required.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          isPublic: createProjectIsPublic,
          scoutType: createProjectScoutType,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "Failed to create project.");
      }

      const result = (await response.json()) as {
        project?: { uploadId?: string };
      };

      const uploadId = result.project?.uploadId;
      if (!uploadId) {
        throw new Error("Create response missing upload id.");
      }
      const encodedUploadId = encodeURIComponent(uploadId);

      toast.success("Project created.");
      setIsCreateDialogOpen(false);

      if (createProjectScoutType === "pit") {
        router.push(`/post-match?uploadId=${encodedUploadId}&mode=pit`);
        return;
      }

      router.push(`/editor?uploadId=${encodedUploadId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create project.";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [createProjectIsPublic, createProjectName, createProjectScoutType, router]);

  const openCreateProjectDialog = React.useCallback(() => {
    setCreateProjectName("Untitled Project");
    setCreateProjectIsPublic(false);
    setCreateProjectScoutType("match");
    setIsCreateDialogOpen(true);
  }, []);

  const openUploadProjectDialog = React.useCallback(() => {
    setUploadMode("file");
    setUploadProjectName("Imported Project");
    setUploadProjectIsPublic(false);
    setUploadContentHash("");
    setUploadFile(null);
    setIsUploadDialogOpen(true);
  }, []);

  const updateProject = React.useCallback(
    async (
      uploadId: string,
      updates: { status?: ProjectStatus; name?: string; isPublic?: boolean }
    ) => {
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

  const requestDeleteProject = React.useCallback((project: Project) => {
    setOpenMenuId(null);
    setProjectToDelete({ uploadId: project.uploadId, name: project.name });
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteProject = React.useCallback(async () => {
    if (!projectToDelete) return;
    setIsDeletingProject(true);
    try {
      await handlePermanentDelete(projectToDelete.uploadId);
      toast.success("Project deleted.");
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Delete failed.";
      toast.error(message);
    } finally {
      setIsDeletingProject(false);
    }
  }, [handlePermanentDelete, projectToDelete]);

  const handleUploadClick = React.useCallback(() => {
    openUploadProjectDialog();
  }, [openUploadProjectDialog]);

  const handleImportFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setUploadFile(file);
    },
    []
  );

  const handleUploadProject = React.useCallback(async () => {
    const projectName = uploadProjectName.trim();
    if (!projectName) {
      toast.error("Project name is required.");
      return;
    }

    setIsUploading(true);
    try {
      const parseJsonIfString = (value: unknown): unknown => {
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        if (!trimmed) return value;
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          return value;
        }

        try {
          return JSON.parse(trimmed);
        } catch {
          return value;
        }
      };

      const toRecord = (value: unknown): Record<string, unknown> | null => {
        const parsed = parseJsonIfString(value);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null;
      };

      const extractPersistedPayload = (value: unknown): unknown | null => {
        const parsed = parseJsonIfString(value);
        if (parsed === null || parsed === undefined) return null;
        if (Array.isArray(parsed)) return parsed;

        const source = toRecord(parsed);
        if (!source) return null;

        const directPayload = parseJsonIfString(source.payload);
        if (directPayload !== null && directPayload !== undefined) {
          if (Array.isArray(directPayload)) return directPayload;

          const directPayloadRecord = toRecord(directPayload);
          if (directPayloadRecord) {
            const nestedPayload = parseJsonIfString(directPayloadRecord.payload);
            if (nestedPayload !== null && nestedPayload !== undefined) {
              return nestedPayload;
            }
            return directPayloadRecord;
          }

          return directPayload;
        }

        return source;
      };

      let payload: unknown | null = null;
      let backgroundImage: string | null = null;
      let editorState: unknown = null;

      if (uploadMode === "file") {
        if (!uploadFile) {
          throw new Error("Select a JSON file first.");
        }

        const rawText = await uploadFile.text();
        const parsed = JSON.parse(rawText) as unknown;

        const source = toRecord(parsed);
        payload = extractPersistedPayload(source ?? parsed);

        if (payload === null) {
          throw new Error("Uploaded JSON must include a valid payload object or array.");
        }

        backgroundImage =
          source &&
          source.background &&
          typeof source.background === "object" &&
          source.background !== null &&
          typeof (source.background as Record<string, unknown>).fallbackImage ===
            "string"
            ? ((source.background as Record<string, unknown>).fallbackImage as string)
            : null;

        editorState = source?.editorState ?? null;
      } else {
        const hash = uploadContentHash.trim();
        if (!hash) {
          throw new Error("Content hash is required.");
        }

        const publicResponse = await fetch(
          `/api/field-configs/public/hash/${encodeURIComponent(hash)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!publicResponse.ok) {
          throw new Error("No public project found for this content hash.");
        }

        const publicResult = (await publicResponse.json()) as {
          config?: { payload?: unknown; backgroundImage?: string | null };
          payload?: unknown;
          backgroundImage?: string | null;
        };

        const publicResultRecord = toRecord(publicResult);
        const configRecord = toRecord(publicResultRecord?.config ?? publicResultRecord);
        const configPayload =
          configRecord?.payload ?? publicResultRecord?.payload;
        const payloadRoot =
          configPayload === undefined ? configRecord : configPayload;

        payload = extractPersistedPayload(payloadRoot);

        if (payload === null) {
          throw new Error("Public project payload is invalid.");
        }

        const publicSource = toRecord(payloadRoot) ?? configRecord;

        backgroundImage =
          typeof configRecord?.backgroundImage === "string"
            ? configRecord.backgroundImage
            : typeof publicResultRecord?.backgroundImage === "string"
              ? publicResultRecord.backgroundImage
            : publicSource &&
                publicSource.background &&
                typeof publicSource.background === "object" &&
                publicSource.background !== null &&
                typeof (publicSource.background as Record<string, unknown>)
                  .fallbackImage === "string"
              ? ((publicSource.background as Record<string, unknown>)
                  .fallbackImage as string)
              : null;

        editorState = publicSource?.editorState ?? null;
      }

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

      await updateProject(uploadResult.uploadId, {
        name: projectName,
        status: "active",
        isPublic: uploadProjectIsPublic,
      });

      toast.success("Project uploaded.");
      setIsUploadDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [
    updateProject,
    uploadContentHash,
    uploadFile,
    uploadMode,
    uploadProjectIsPublic,
    uploadProjectName,
  ]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="text-4xl font-black tracking-tight text-white">GoonScout</div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="h-10 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-500"
            onClick={openCreateProjectDialog}
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
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-white/10 bg-slate-900 p-1 shadow-2xl z-50">
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
                    router.push(getProjectOpenRoute(project));
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    router.push(getProjectOpenRoute(project));
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
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/20"
                              onClick={(event) => {
                                event.stopPropagation();
                                requestDeleteProject(project);
                              }}
                            >
                              Delete Project
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
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mb-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getScoutTypeBadge(project.scoutType).className}`}
                      >
                        {getScoutTypeBadge(project.scoutType).label}
                      </span>
                    </div>

                    <p className="text-base text-white/65">{formatUpdatedText(project.updatedAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription className="text-white/65">
              Enter a name for your new project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Input
              value={createProjectName}
              onChange={(event) => setCreateProjectName(event.target.value)}
              placeholder="Untitled Project"
              className="h-10 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
              autoFocus
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (isCreating) return;
                void handleCreateProject();
              }}
            />
            <div className="grid gap-2 rounded-md border border-white/10 px-3 py-3">
              <span className="text-sm text-white/85">Scouting Type</span>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["match", "Match"],
                  ["qualitative", "Qualitative"],
                  ["pit", "Pit"],
                ] as const).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    className={`h-9 border-white/20 bg-slate-900/70 text-xs text-white hover:bg-slate-800 ${
                      createProjectScoutType === value ? "ring-1 ring-blue-400/70" : ""
                    }`}
                    onClick={() => setCreateProjectScoutType(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <span className="text-xs text-white/55">
                Match: full validation rules. Qualitative/Pit completion requires submit, reset, and team select. New Pit projects open Pit Scouting questions first.
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
              <div className="grid gap-0.5">
                <span className="text-sm text-white/85">Public project</span>
                <span className="text-xs text-white/55">
                  Allow other users to import by content hash
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={createProjectIsPublic}
                aria-label="Toggle public project"
                onClick={() => setCreateProjectIsPublic((current) => !current)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                  createProjectIsPublic
                    ? "border-white/60 bg-white/80"
                    : "border-white/30 bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    createProjectIsPublic
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-slate-900/60 text-white hover:bg-slate-800"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => void handleCreateProject()}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Project</DialogTitle>
            <DialogDescription className="text-white/65">
              Import from a JSON file or a public content hash.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Input
              value={uploadProjectName}
              onChange={(event) => setUploadProjectName(event.target.value)}
              placeholder="Project name"
              className="h-10 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className={`border-white/20 bg-slate-900/70 text-white hover:bg-slate-800 ${
                  uploadMode === "file" ? "ring-1 ring-blue-400/70" : ""
                }`}
                onClick={() => setUploadMode("file")}
              >
                Upload file
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`border-white/20 bg-slate-900/70 text-white hover:bg-slate-800 ${
                  uploadMode === "hash" ? "ring-1 ring-blue-400/70" : ""
                }`}
                onClick={() => setUploadMode("hash")}
              >
                Content hash
              </Button>
            </div>

            {uploadMode === "file" ? (
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-slate-900/70 text-white hover:bg-slate-800"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select JSON file
                </Button>
                <p className="text-xs text-white/55">
                  {uploadFile ? `Selected: ${uploadFile.name}` : "No file selected"}
                </p>
              </div>
            ) : (
              <Input
                value={uploadContentHash}
                onChange={(event) => setUploadContentHash(event.target.value)}
                placeholder="8-digit content hash"
                className="h-10 border-white/10 bg-slate-900/80 text-white placeholder:text-white/35"
              />
            )}

            <div className="mt-1 flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
              <div className="grid gap-0.5">
                <span className="text-sm text-white/85">Public project</span>
                <span className="text-xs text-white/55">
                  Allow others to import this project by hash
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={uploadProjectIsPublic}
                aria-label="Toggle uploaded project public"
                onClick={() => setUploadProjectIsPublic((current) => !current)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                  uploadProjectIsPublic
                    ? "border-white/60 bg-white/80"
                    : "border-white/30 bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                    uploadProjectIsPublic
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-slate-900/60 text-white hover:bg-slate-800"
              onClick={() => setIsUploadDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => void handleUploadProject()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeletingProject) return;
          setIsDeleteDialogOpen(open);
          if (!open) {
            setProjectToDelete(null);
          }
        }}
      >
        <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription className="text-white/65">
              Are you sure you want to delete
              {projectToDelete?.name ? ` "${projectToDelete.name}"` : " this project"}?
              This permanently removes it from the backend.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-slate-900/60 text-white hover:bg-slate-800"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setProjectToDelete(null);
              }}
              disabled={isDeletingProject}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={() => void confirmDeleteProject()}
              disabled={isDeletingProject}
            >
              {isDeletingProject ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
