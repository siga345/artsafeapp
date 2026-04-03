"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  Link2,
  Loader2,
  LogOut,
  UserRound
} from "lucide-react";

import { ArtistWorldPlaylistEditor } from "@/components/id/artist-world-playlist-editor";
import { ArtistWorldPreview, type ArtistWorldPreviewData } from "@/components/id/artist-world-preview";
import { ArtistWorldProjectEditor, type ArtistWorldProjectDraft } from "@/components/id/artist-world-project-editor";
import { ArtistWorldReferenceEditor, type ArtistWorldReferenceDraft } from "@/components/id/artist-world-reference-editor";
import { ArtistWorldTabs, type ArtistWorldTab } from "@/components/id/artist-world-tabs";
import { ArtistWorldTextEditor, type TextEditorState } from "@/components/id/artist-world-text-editor";
import { ArtistWorldVisualEditor, type VisualBoardDraft } from "@/components/id/artist-world-visual-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineActionMessage } from "@/components/ui/inline-action-message";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiFetchJson, readApiErrorMessage } from "@/lib/client-fetch";
import {
  ensureArtistWorldVisualBoards,
  type ArtistWorldReadinessArea,
  type ArtistWorldReadinessMeta,
  type ArtistWorldReadinessState,
} from "@/lib/artist-world";

type IdProfile = {
  id: string;
  safeId: string;
  nickname: string;
  avatarUrl: string | null;
  links: unknown;
  artistWorld: ArtistWorldPreviewData & {
    currentFocusTitle?: string | null;
    currentFocusDetail?: string | null;
    seekingSupportDetail?: string | null;
    references: ArtistWorldReferenceDraft[];
    projects: ArtistWorldProjectDraft[];
    visualBoards: Array<VisualBoardDraft & { sourceUrl?: string | null }>;
  };
  artistWorldMeta: ArtistWorldReadinessMeta;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type FormState = {
  nickname: string;
  avatarUrl: string;
  bandlink: string;
  artistName: string;
  artistAge: string;
  artistCity: string;
  favoriteArtist1: string;
  favoriteArtist2: string;
  favoriteArtist3: string;
  lifeValues: string;
  teamPreference: "solo" | "team" | "both" | "";
  mission: string;
  identityStatement: string;
  values: string;
  philosophy: string;
  coreThemes: string;
  audienceCore: string;
  differentiator: string;
  visualDirection: string;
  aestheticKeywords: string;
  fashionSignals: string;
  playlistUrl: string;
  references: ArtistWorldReferenceDraft[];
  projects: ArtistWorldProjectDraft[];
  visualBoards: Array<VisualBoardDraft & { sourceUrl: string }>;
};

const stateLabels: Record<ArtistWorldReadinessState, string> = {
  EMPTY: "Пустой",
  SEEDED: "Посеян",
  IN_PROGRESS: "Собирается",
  READY_INTERNAL: "Готов внутри"
};

const stateSubtitles: Record<ArtistWorldReadinessState, string> = {
  EMPTY: "Сначала собираем смысловую основу, а не просто профиль.",
  SEEDED: "Основа уже есть, но система еще не собрана.",
  IN_PROGRESS: "Система формируется, дальше нужно собирать целостность.",
  READY_INTERNAL: "Мир артиста уже можно использовать как внутреннюю опору."
};

const areaLabels: Record<ArtistWorldReadinessArea, string> = {
  text_core: "Смысловая основа",
  visual_core: "Визуальная опора",
  references: "Референсы",
  projects: "Проекты",
  playlist: "Плейлист"
};

function fetcher<T>(url: string): Promise<T> {
  return apiFetchJson<T>(url);
}

function parseLinks(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const obj = raw as Record<string, unknown>;
  if (typeof obj.bandlink === "string" && obj.bandlink.trim()) return obj.bandlink.trim();
  if (typeof obj.website === "string" && obj.website.trim()) return obj.website.trim();
  return "";
}

function createClientId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values?: string[] | null) {
  return Array.isArray(values) ? values.join("\n") : "";
}

function trimOrEmpty(value?: string | null) {
  return value?.trim() ?? "";
}

function createEmptyProject(): ArtistWorldProjectDraft {
  return {
    id: createClientId("project"),
    title: "",
    subtitle: "",
    description: "",
    linkUrl: "",
    coverImageUrl: ""
  };
}

function createEmptyReference(): ArtistWorldReferenceDraft {
  return {
    id: createClientId("reference"),
    title: "",
    creator: "",
    note: "",
    linkUrl: "",
    imageUrl: ""
  };
}

function mapStateToTab(state: ArtistWorldReadinessState): ArtistWorldTab {
  if (state === "READY_INTERNAL") return "preview";
  return "overview";
}

function buildInitialForm(data: IdProfile): FormState {
  const world = data.artistWorld;
  return {
    nickname: data.nickname ?? "",
    avatarUrl: data.avatarUrl ?? "",
    bandlink: parseLinks(data.links),
    artistName: trimOrEmpty(world.artistName),
    artistAge: world.artistAge ? String(world.artistAge) : "",
    artistCity: trimOrEmpty(world.artistCity),
    favoriteArtist1: world.favoriteArtists[0] ?? "",
    favoriteArtist2: world.favoriteArtists[1] ?? "",
    favoriteArtist3: world.favoriteArtists[2] ?? "",
    lifeValues: trimOrEmpty(world.lifeValues),
    teamPreference: (world.teamPreference as FormState["teamPreference"]) ?? "",
    mission: trimOrEmpty(world.mission),
    identityStatement: trimOrEmpty(world.identityStatement),
    values: joinLines(world.values),
    philosophy: trimOrEmpty(world.philosophy),
    coreThemes: joinLines(world.coreThemes),
    audienceCore: trimOrEmpty(world.audienceCore),
    differentiator: trimOrEmpty(world.differentiator),
    visualDirection: trimOrEmpty(world.visualDirection),
    aestheticKeywords: joinLines(world.aestheticKeywords),
    fashionSignals: joinLines(world.fashionSignals),
    playlistUrl: trimOrEmpty(world.playlistUrl),
    references: (world.references ?? []).map((reference) => ({
      id: reference.id ?? createClientId("reference"),
      title: trimOrEmpty(reference.title),
      creator: trimOrEmpty(reference.creator),
      note: trimOrEmpty(reference.note),
      linkUrl: trimOrEmpty(reference.linkUrl),
      imageUrl: trimOrEmpty(reference.imageUrl)
    })),
    projects: (world.projects ?? []).map((project) => ({
      id: project.id ?? createClientId("project"),
      title: trimOrEmpty(project.title),
      subtitle: trimOrEmpty(project.subtitle),
      description: trimOrEmpty(project.description),
      linkUrl: trimOrEmpty(project.linkUrl),
      coverImageUrl: trimOrEmpty(project.coverImageUrl)
    })),
    visualBoards: ensureArtistWorldVisualBoards(world.visualBoards).map((board) => ({
      id: board.id ?? board.slug,
      slug: board.slug,
      name: board.name,
      sourceUrl: trimOrEmpty(board.sourceUrl),
      images: board.images.map((image) => ({
        id: image.id ?? createClientId("image"),
        imageUrl: image.imageUrl
      }))
    }))
  };
}

export default function IdPage() {
  const toast = useToast();
  const { data } = useQuery({
    queryKey: ["id-profile"],
    queryFn: () => fetcher<IdProfile | null>("/api/id"),
    refetchOnWindowFocus: false
  });

  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<ArtistWorldTab>("overview");
  const [form, setForm] = useState<FormState | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingVisualAsset, setUploadingVisualAsset] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const saveTimerRef = useRef<number | null>(null);
  const latestSaveTokenRef = useRef(0);
  const lastSavedPayloadRef = useRef("");

  const worldState = data?.artistWorldMeta?.state ?? "EMPTY";
  const meta = data?.artistWorldMeta ?? null;

  useEffect(() => {
    if (!data || initialized) return;

    const nextForm = buildInitialForm(data);
    const nextTab = mapStateToTab(data.artistWorldMeta.state);

    setForm(nextForm);
    setActiveTab(nextTab);
    setInitialized(true);
    lastSavedPayloadRef.current = JSON.stringify(buildPayload(nextForm));
  }, [data, initialized]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  function buildPayload(currentForm: FormState) {
    const favoriteArtists = [currentForm.favoriteArtist1, currentForm.favoriteArtist2, currentForm.favoriteArtist3]
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);

    return {
      nickname: currentForm.nickname.trim(),
      avatarUrl: currentForm.avatarUrl.trim() || null,
      bandlink: currentForm.bandlink.trim() || null,
      artistWorld: {
        artistName: currentForm.artistName.trim() || null,
        artistAge: currentForm.artistAge.trim() ? Number.parseInt(currentForm.artistAge, 10) : null,
        artistCity: currentForm.artistCity.trim() || null,
        favoriteArtists,
        lifeValues: currentForm.lifeValues.trim() || null,
        teamPreference: currentForm.teamPreference || null,
        mission: currentForm.mission.trim() || null,
        identityStatement: currentForm.identityStatement.trim() || null,
        values: splitLines(currentForm.values),
        philosophy: currentForm.philosophy.trim() || null,
        coreThemes: splitLines(currentForm.coreThemes),
        audienceCore: currentForm.audienceCore.trim() || null,
        differentiator: currentForm.differentiator.trim() || null,
        visualDirection: currentForm.visualDirection.trim() || null,
        aestheticKeywords: splitLines(currentForm.aestheticKeywords),
        fashionSignals: splitLines(currentForm.fashionSignals),
        playlistUrl: currentForm.playlistUrl.trim() || null,
        references: currentForm.references.map((reference) => ({
          id: reference.id,
          title: reference.title.trim() || null,
          creator: reference.creator.trim() || null,
          note: reference.note.trim() || null,
          linkUrl: reference.linkUrl.trim() || null,
          imageUrl: reference.imageUrl.trim() || null
        })),
        projects: currentForm.projects.map((project) => ({
          id: project.id,
          title: project.title.trim() || null,
          subtitle: project.subtitle.trim() || null,
          description: project.description.trim() || null,
          linkUrl: project.linkUrl.trim() || null,
          coverImageUrl: project.coverImageUrl.trim() || null
        })),
        visualBoards: currentForm.visualBoards.map((board) => ({
          id: board.id,
          slug: board.slug,
          name: board.name,
          sourceUrl: board.sourceUrl.trim() || null,
          images: board.images.map((image) => ({
            id: image.id,
            imageUrl: image.imageUrl
          }))
        }))
      }
    };
  }

  const serializedPayload = useMemo(() => (form ? JSON.stringify(buildPayload(form)) : ""), [form]);

  const persistPayload = useCallback(
    async (payload = serializedPayload) => {
      if (!initialized || payload === lastSavedPayloadRef.current) return;

      const saveToken = ++latestSaveTokenRef.current;
      setSaveState("saving");
      setSaveError("");

      try {
        const response = await apiFetch("/api/id", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: payload
        });

        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response, "Не удалось сохранить мир артиста."));
        }

        if (saveToken !== latestSaveTokenRef.current) return;

        lastSavedPayloadRef.current = payload;
        setSaveState("saved");
      } catch (error) {
        if (saveToken !== latestSaveTokenRef.current) return;
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Не удалось сохранить мир артиста.");
      }
    },
    [initialized, serializedPayload]
  );

  useEffect(() => {
    if (!initialized || !form) return;

    if (serializedPayload === lastSavedPayloadRef.current) return;

    setSaveState("saving");
    setSaveError("");

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void persistPayload(serializedPayload);
    }, 700);
  }, [form, initialized, persistPayload, serializedPayload]);

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await apiFetch("/api/id/avatar", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Не удалось загрузить аватар."));
    }

    const payload = (await response.json()) as { avatarUrl: string };
    setForm((current) => (current ? { ...current, avatarUrl: payload.avatarUrl } : current));
  }

  async function uploadWorldAsset(kind: "project_cover" | "reference_image" | "board_image", file: File) {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("kind", kind);

    const response = await apiFetch("/api/id/world/assets", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Не удалось загрузить изображение."));
    }

    const payload = (await response.json()) as { url: string };
    return payload.url;
  }

  async function handleSignOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    await signOut({ callbackUrl: "/signin" });
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateReference(id: string, patch: Partial<ArtistWorldReferenceDraft>) {
    setForm((current) =>
      current
        ? {
            ...current,
            references: current.references.map((reference) => (reference.id === id ? { ...reference, ...patch } : reference))
          }
        : current
    );
  }

  function addReference() {
    setForm((current) =>
      current
        ? {
            ...current,
            references: [...current.references, createEmptyReference()]
          }
        : current
    );
  }

  function removeReference(id: string) {
    setForm((current) => (current ? { ...current, references: current.references.filter((item) => item.id !== id) } : current));
  }

  function moveReference(id: string, direction: "up" | "down") {
    setForm((current) => {
      if (!current) return current;
      const index = current.references.findIndex((item) => item.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= current.references.length) return current;
      const next = [...current.references];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...current, references: next };
    });
  }

  function updateProject(id: string, patch: Partial<ArtistWorldProjectDraft>) {
    setForm((current) =>
      current
        ? {
            ...current,
            projects: current.projects.map((project) => (project.id === id ? { ...project, ...patch } : project))
          }
        : current
    );
  }

  function addProject() {
    setForm((current) =>
      current
        ? {
            ...current,
            projects: [...current.projects, createEmptyProject()]
          }
        : current
    );
  }

  function removeProject(id: string) {
    setForm((current) => (current ? { ...current, projects: current.projects.filter((item) => item.id !== id) } : current));
  }

  function moveProject(id: string, direction: "up" | "down") {
    setForm((current) => {
      if (!current) return current;
      const index = current.projects.findIndex((item) => item.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= current.projects.length) return current;
      const next = [...current.projects];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...current, projects: next };
    });
  }

  function updateBoardField(boardId: string, patch: Partial<VisualBoardDraft & { sourceUrl: string }>) {
    setForm((current) =>
      current
        ? {
            ...current,
            visualBoards: current.visualBoards.map((board) => (board.id === boardId ? { ...board, ...patch } : board))
          }
        : current
    );
  }

  function updateBoardImage(boardId: string, imageId: string, imageUrl: string) {
    setForm((current) =>
      current
        ? {
            ...current,
            visualBoards: current.visualBoards.map((board) =>
              board.id === boardId
                ? {
                    ...board,
                    images: board.images.map((image) => (image.id === imageId ? { ...image, imageUrl } : image))
                  }
                : board
            )
          }
        : current
    );
  }

  function deleteBoardImage(boardId: string, imageId: string) {
    setForm((current) =>
      current
        ? {
            ...current,
            visualBoards: current.visualBoards.map((board) =>
              board.id === boardId
                ? {
                    ...board,
                    images: board.images.filter((image) => image.id !== imageId)
                  }
                : board
            )
          }
        : current
    );
  }

  function addBoardImage(boardId: string, imageUrl: string) {
    setForm((current) =>
      current
        ? {
            ...current,
            visualBoards: current.visualBoards.map((board) =>
              board.id === boardId
                ? {
                    ...board,
                    images: [...board.images, { id: createClientId("image"), imageUrl }]
                  }
                : board
            )
          }
        : current
    );
  }

  function stateCopy(state: ArtistWorldReadinessState) {
    return {
      title: stateLabels[state],
      subtitle: stateSubtitles[state]
    };
  }

  if (data === undefined) {
    return (
      <div className="pb-8">
        <Card className="border-[#d7e3cb] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,249,237,0.92)_100%)]">
          <CardHeader>
            <CardTitle className="text-2xl">Мир артиста</CardTitle>
            <CardDescription>Загружаем внутреннюю систему артиста.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pb-8">
        <Card className="border-[#d7e3cb] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,249,237,0.92)_100%)]">
          <CardHeader>
            <CardTitle className="text-2xl">Мир артиста</CardTitle>
            <CardDescription>Профиль не найден.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentState = data.artistWorldMeta.state;
  const currentStateText = stateCopy(currentState);
  const nextSuggestedArea = data.artistWorldMeta.nextSuggestedArea;
  const previewWorld = {
    ...data.artistWorld,
    currentFocusTitle: data.artistWorld.currentFocusTitle ?? null,
    currentFocusDetail: data.artistWorld.currentFocusDetail ?? null,
    seekingSupportDetail: data.artistWorld.seekingSupportDetail ?? null
  };

  if (!form) {
    return (
      <div className="pb-8">
        <Card className="border-[#d7e3cb] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,249,237,0.92)_100%)]">
          <CardHeader>
            <CardTitle className="text-2xl">Мир артиста</CardTitle>
            <CardDescription>Подготавливаем рабочее пространство.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const textState: TextEditorState = {
    nickname: form.nickname,
    artistName: form.artistName,
    artistAge: form.artistAge,
    artistCity: form.artistCity,
    favoriteArtist1: form.favoriteArtist1,
    favoriteArtist2: form.favoriteArtist2,
    favoriteArtist3: form.favoriteArtist3,
    lifeValues: form.lifeValues,
    teamPreference: form.teamPreference,
    mission: form.mission,
    identityStatement: form.identityStatement,
    values: form.values,
    philosophy: form.philosophy,
    coreThemes: form.coreThemes,
    audienceCore: form.audienceCore,
    differentiator: form.differentiator
  };

  const safeIdCard = (
    <div className="rounded-[28px] border border-[#dbe4d0] bg-white/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <UserRound className="h-4 w-4 text-brand-muted" />
        <p className="text-sm font-medium text-brand-ink">SAFE ID</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-[#f4f8ed]">
          {form.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.avatarUrl} alt={form.nickname || "Аватар артиста"} className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-7 w-7 text-brand-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-lg font-semibold text-brand-ink">{form.nickname || "Новый артист"}</p>
            <p className="break-all text-xs text-brand-muted">{data.safeId}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-brand-border bg-white p-3">
              <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-brand-muted">Псевдоним</label>
              <Input
                value={form.nickname}
                onChange={(event) => updateField("nickname", event.target.value)}
                onBlur={() => void persistPayload()}
                placeholder="Псевдоним"
                className="bg-white"
              />
            </div>
            <div className="rounded-2xl border border-brand-border bg-white p-3">
              <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-brand-muted">Ссылка</label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                <Input
                  value={form.bandlink}
                  onChange={(event) => updateField("bandlink", event.target.value)}
                  onBlur={() => void persistPayload()}
                  placeholder="Ссылка на профиль или страницу"
                  className="bg-white pl-9"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-medium text-brand-ink shadow-sm">
              {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserRound className="mr-2 h-4 w-4" />}
              {uploadingAvatar ? "Загружаем..." : "Загрузить фото"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;

                  setUploadingAvatar(true);
                  try {
                    await uploadAvatar(file);
                    toast.success("Аватар загружен.");
                  } catch (error) {
                    setSaveState("error");
                    setSaveError(error instanceof Error ? error.message : "Не удалось загрузить аватар.");
                  } finally {
                    setUploadingAvatar(false);
                  }
                }}
              />
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-[#f7faf2] px-3 py-2 text-sm text-brand-ink">
              <span className="text-[11px] uppercase tracking-[0.14em] text-brand-muted">Статус</span>
              <span>{saveState === "saving" ? "Сохраняем" : saveState === "saved" ? "Сохранено" : saveState === "error" ? saveError || "Ошибка" : "Автосохранение включено"}</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(data.safeId);
                  setCopied(true);
                  toast.success("Код поддержки скопирован.");
                } catch {
                  setSaveError("Не удалось скопировать код поддержки.");
                  setSaveState("error");
                }
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Скопировано" : "Копировать код"}
            </Button>
            <Button type="button" variant="secondary" className="rounded-xl" onClick={() => void handleSignOut()} disabled={loggingOut}>
              {loggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              {loggingOut ? "Выходим..." : "Выйти"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      {saveState === "error" ? <InlineActionMessage message={saveError} onRetry={() => void persistPayload()} /> : null}

      <div className="space-y-4">
        <div className="min-w-0 space-y-4">
          <ArtistWorldTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white/90 p-3">
            <Link href="/id">
              <Button type="button" variant="secondary" className="rounded-xl">
                Выйти из редактирования
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-sm text-brand-muted">
                {saveState === "saving"
                  ? "Сохраняем..."
                  : saveState === "saved"
                    ? "Сохранено"
                    : saveState === "error"
                      ? saveError || "Ошибка"
                      : "Изменения сохраняются автоматически"}
              </span>
            </div>
          </div>

          {activeTab === "overview" ? (
            <div className="space-y-4">
              <Card className="border-[#d7e3cb] bg-white/90">
                <CardHeader>
                  <CardTitle className="text-2xl">Обзор мира артиста</CardTitle>
                  <CardDescription className="max-w-3xl text-base leading-6">{meta?.summary}</CardDescription>
                </CardHeader>
                <div className="space-y-3 px-6 pb-6">
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#d9e5c8] bg-[#f7faf2] p-4 text-sm text-brand-muted">
                    <span className="font-medium text-brand-ink">Следующий слой:</span>
                    <span>{nextSuggestedArea ? areaLabels[nextSuggestedArea] : "Собрано"}</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button type="button" className="rounded-2xl border border-brand-border bg-white p-4 text-left" onClick={() => setActiveTab("text")}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-brand-muted">Смысл</p>
                      <p className="mt-2 text-sm font-medium text-brand-ink">Открыть основу</p>
                      <p className="mt-1 text-sm leading-6 text-brand-muted">Миссия, идентичность и философия.</p>
                    </button>
                    <button type="button" className="rounded-2xl border border-brand-border bg-white p-4 text-left" onClick={() => setActiveTab("visual")}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-brand-muted">Образ</p>
                      <p className="mt-2 text-sm font-medium text-brand-ink">Открыть визуал</p>
                      <p className="mt-1 text-sm leading-6 text-brand-muted">Персонаж, язык, борды.</p>
                    </button>
                    <button type="button" className="rounded-2xl border border-brand-border bg-white p-4 text-left" onClick={() => setActiveTab("references")}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-brand-muted">Опоры</p>
                      <p className="mt-2 text-sm font-medium text-brand-ink">Открыть референсы</p>
                      <p className="mt-1 text-sm leading-6 text-brand-muted">Аудитория, ориентиры и плейлист.</p>
                    </button>
                    <button type="button" className="rounded-2xl border border-brand-border bg-white p-4 text-left" onClick={() => setActiveTab("projects")}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-brand-muted">Действие</p>
                      <p className="mt-2 text-sm font-medium text-brand-ink">Открыть проекты</p>
                      <p className="mt-1 text-sm leading-6 text-brand-muted">То, что проявляет мир в реальности.</p>
                    </button>
                  </div>
                </div>
              </Card>

            </div>
          ) : null}

          {activeTab === "text" ? (
            <Card className="border-[#d7e3cb] bg-white/90">
              <CardHeader>
                <CardTitle className="text-2xl">Основа</CardTitle>
                <CardDescription className="max-w-3xl text-base leading-6">Собери базовые ответы о себе, смысле и направлении артиста.</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <ArtistWorldTextEditor
                  state={textState}
                  callbacks={{
                    onFieldChange: (field, value) => {
                      switch (field) {
                        case "nickname":
                          updateField("nickname", value);
                          break;
                        case "artistName":
                          updateField("artistName", value);
                          break;
                        case "artistAge":
                          updateField("artistAge", value);
                          break;
                        case "artistCity":
                          updateField("artistCity", value);
                          break;
                        case "favoriteArtist1":
                          updateField("favoriteArtist1", value);
                          break;
                        case "favoriteArtist2":
                          updateField("favoriteArtist2", value);
                          break;
                        case "favoriteArtist3":
                          updateField("favoriteArtist3", value);
                          break;
                        case "lifeValues":
                          updateField("lifeValues", value);
                          break;
                        case "teamPreference":
                          setForm((current) => (current ? { ...current, teamPreference: value as FormState["teamPreference"] } : current));
                          break;
                        case "mission":
                          updateField("mission", value);
                          break;
                        case "identityStatement":
                          updateField("identityStatement", value);
                          break;
                        case "values":
                          updateField("values", value);
                          break;
                        case "philosophy":
                          updateField("philosophy", value);
                          break;
                        case "coreThemes":
                          updateField("coreThemes", value);
                          break;
                        case "audienceCore":
                          updateField("audienceCore", value);
                          break;
                        case "differentiator":
                          updateField("differentiator", value);
                          break;
                        default:
                          break;
                      }
                    }
                  }}
                />
              </div>
            </Card>
          ) : null}

          {activeTab === "visual" ? (
            <Card className="border-[#d7e3cb] bg-white/90">
              <CardHeader>
                <CardTitle className="text-2xl">Визуал</CardTitle>
                <CardDescription className="max-w-3xl text-base leading-6">Борды, образ и визуальные сигналы артиста.</CardDescription>
              </CardHeader>
              <div className="space-y-4 px-6 pb-6">
                <ArtistWorldVisualEditor
                  boards={form.visualBoards}
                  visualDirection={form.visualDirection}
                  aestheticKeywords={form.aestheticKeywords}
                  fashionSignals={form.fashionSignals}
                  uploadingImage={uploadingVisualAsset}
                  onFieldChange={(field, value) => {
                    switch (field) {
                      case "visualDirection":
                        updateField("visualDirection", value);
                        break;
                      case "aestheticKeywords":
                        updateField("aestheticKeywords", value);
                        break;
                      case "fashionSignals":
                        updateField("fashionSignals", value);
                        break;
                    }
                  }}
                  onUploadImage={async (boardSlug, file) => {
                    setUploadingVisualAsset(true);
                    try {
                      const url = await uploadWorldAsset("board_image", file);
                      const board = form.visualBoards.find((item) => item.slug === boardSlug);
                      if (!board) return;
                      addBoardImage(board.id, url);
                      toast.success("Изображение добавлено в борд.");
                    } finally {
                      setUploadingVisualAsset(false);
                    }
                  }}
                  onDeleteImage={(boardSlug, imageId) => {
                    const board = form.visualBoards.find((item) => item.slug === boardSlug);
                    if (!board) return;
                    deleteBoardImage(board.id, imageId);
                  }}
                />

                <div className="flex flex-wrap gap-2">
                  {form.visualBoards.map((board) => (
                    <Link
                      key={board.slug}
                      href={`/id/boards/${board.slug}`}
                      className="inline-flex items-center justify-center rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-[#f2f5eb]"
                    >
                      Открыть {board.name} в расширенном режиме
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          {activeTab === "references" ? (
            <div className="space-y-4">
              <Card className="border-[#d7e3cb] bg-white/90">
                <CardHeader>
                  <CardTitle className="text-2xl">Референсы</CardTitle>
                  <CardDescription className="max-w-3xl text-base leading-6">Референсы и опоры, которые помогают держать направление.</CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                  <ArtistWorldReferenceEditor
                    references={form.references}
                    onAdd={addReference}
                    onChange={updateReference}
                    onDelete={removeReference}
                    onMoveUp={(id) => moveReference(id, "up")}
                    onMoveDown={(id) => moveReference(id, "down")}
                    onUploadImage={async (id, file) => {
                      const url = await uploadWorldAsset("reference_image", file);
                      updateReference(id, { imageUrl: url });
                      toast.success("Изображение референса загружено.");
                    }}
                  />
                </div>
              </Card>

              <Card className="border-[#d7e3cb] bg-white/90">
                <CardHeader>
                  <CardTitle className="text-2xl">Плейлист</CardTitle>
                  <CardDescription className="max-w-3xl text-base leading-6">Плейлист-опора для музыкального направления.</CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                  <ArtistWorldPlaylistEditor
                    playlistUrl={form.playlistUrl}
                    onPlaylistUrlChange={(url) => updateField("playlistUrl", url)}
                  />
                </div>
              </Card>
            </div>
          ) : null}

          {activeTab === "projects" ? (
            <Card className="border-[#d7e3cb] bg-white/90">
              <CardHeader>
                <CardTitle className="text-2xl">Проекты</CardTitle>
                <CardDescription className="max-w-3xl text-base leading-6">Проекты и форматы, через которые мир артиста становится заметным.</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <ArtistWorldProjectEditor
                  projects={form.projects}
                  onAdd={addProject}
                  onChange={updateProject}
                  onDelete={removeProject}
                  onMoveUp={(id) => moveProject(id, "up")}
                  onMoveDown={(id) => moveProject(id, "down")}
                  onUploadCover={async (id, file) => {
                    const url = await uploadWorldAsset("project_cover", file);
                    updateProject(id, { coverImageUrl: url });
                    toast.success("Обложка проекта загружена.");
                  }}
                />
              </div>
            </Card>
          ) : null}

          {activeTab === "preview" ? (
            <Card className="border-[#d7e3cb] bg-white/90">
              <CardHeader>
                <CardTitle className="text-2xl">Сборка мира</CardTitle>
                <CardDescription className="max-w-3xl text-base leading-6">Сводный просмотр того, как сейчас читается твой мир артиста.</CardDescription>
              </CardHeader>
              <div className="space-y-4 px-6 pb-6">
                <ArtistWorldPreview nickname={form.nickname} avatarUrl={form.avatarUrl || null} bandlink={form.bandlink || null} artistWorld={previewWorld} />
              </div>
            </Card>
          ) : null}

        </div>

        
      </div>
    </div>
  );
}
