"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Link2, Loader2, LogOut, Pencil, UserRound } from "lucide-react";

import { ArtistWorldPreview, type ArtistWorldPreviewData } from "@/components/id/artist-world-preview";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineActionMessage } from "@/components/ui/inline-action-message";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiFetchJson, readApiErrorMessage } from "@/lib/client-fetch";

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
  };
};

type SaveState = "idle" | "saving" | "saved" | "error";

type SafeIdForm = {
  nickname: string;
  avatarUrl: string;
  bandlink: string;
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

function buildSafeIdForm(data: IdProfile): SafeIdForm {
  return {
    nickname: data.nickname ?? "",
    avatarUrl: data.avatarUrl ?? "",
    bandlink: parseLinks(data.links)
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
  const [form, setForm] = useState<SafeIdForm | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const saveTimerRef = useRef<number | null>(null);
  const latestSaveTokenRef = useRef(0);
  const lastSavedPayloadRef = useRef("");

  useEffect(() => {
    if (!data || initialized) return;
    const nextForm = buildSafeIdForm(data);
    setForm(nextForm);
    setInitialized(true);
    lastSavedPayloadRef.current = JSON.stringify({
      nickname: nextForm.nickname.trim(),
      avatarUrl: nextForm.avatarUrl.trim() || null,
      bandlink: nextForm.bandlink.trim() || null
    });
  }, [data, initialized]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const serializedPayload = useMemo(() => {
    if (!form) return "";
    return JSON.stringify({
      nickname: form.nickname.trim(),
      avatarUrl: form.avatarUrl.trim() || null,
      bandlink: form.bandlink.trim() || null
    });
  }, [form]);

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
          throw new Error(await readApiErrorMessage(response, "Не удалось сохранить SAFE ID."));
        }

        if (saveToken !== latestSaveTokenRef.current) return;
        lastSavedPayloadRef.current = payload;
        setSaveState("saved");
      } catch (error) {
        if (saveToken !== latestSaveTokenRef.current) return;
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Не удалось сохранить SAFE ID.");
      }
    },
    [initialized, serializedPayload]
  );

  useEffect(() => {
    if (!initialized || !form) return;
    if (serializedPayload === lastSavedPayloadRef.current) return;

    setSaveState("saving");
    setSaveError("");

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void persistPayload(serializedPayload);
    }, 700);
  }, [form, initialized, persistPayload, serializedPayload]);

  async function flushAutosave() {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await persistPayload();
  }

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

  async function handleSignOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    await signOut({ callbackUrl: "/signin" });
  }

  if (data === undefined) {
    return (
      <div className="pb-8">
        <Card className="border-[#d7e3cb] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,249,237,0.92)_100%)]">
          <CardHeader>
            <CardTitle className="text-2xl">Мир артиста</CardTitle>
            <CardDescription>Загружаем карточки артиста.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data || !form) {
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

  const previewWorld = {
    ...data.artistWorld,
    currentFocusTitle: data.artistWorld.currentFocusTitle ?? null,
    currentFocusDetail: data.artistWorld.currentFocusDetail ?? null,
    seekingSupportDetail: data.artistWorld.seekingSupportDetail ?? null
  };

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      {saveState === "error" ? <InlineActionMessage message={saveError} onRetry={() => void flushAutosave()} /> : null}

      <div className="relative" data-guide-id="guide-id-journey">
        <Link href="/id/edit" className="absolute right-5 top-5 z-10">
          <Button type="button" variant="secondary" className="h-10 w-10 rounded-full p-0">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
        <ArtistWorldPreview nickname={form.nickname} avatarUrl={form.avatarUrl || null} bandlink={form.bandlink || null} artistWorld={previewWorld} />
      </div>

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
                  onChange={(event) => setForm((current) => (current ? { ...current, nickname: event.target.value } : current))}
                  onBlur={() => void flushAutosave()}
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
                    onChange={(event) => setForm((current) => (current ? { ...current, bandlink: event.target.value } : current))}
                    onBlur={() => void flushAutosave()}
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
                    setSaveState("error");
                    setSaveError("Не удалось скопировать код поддержки.");
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
    </div>
  );
}
