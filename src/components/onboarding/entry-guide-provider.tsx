"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  defaultGuideStepKey,
  entryGuideSteps,
  getGuideStep,
  getNextGuideStep,
  shouldForceWelcome,
  shouldRunGuide,
  type EntryFlowState
} from "@/lib/entry-flow";
import { apiFetchJson, readApiErrorMessage, apiFetch } from "@/lib/client-fetch";

type GuideContextValue = {
  restartGuide: () => Promise<void>;
  restarting: boolean;
  onboarding: EntryFlowState | null;
};

const GuideContext = createContext<GuideContextValue>({
  restartGuide: async () => {},
  restarting: false,
  onboarding: null
});

const CHROMELESS_ROUTES = new Set(["/signin", "/signup", "/welcome"]);

export function EntryGuideProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const [onboarding, setOnboarding] = useState<EntryFlowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"next" | "skip" | "restart" | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setOnboarding(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadOnboarding() {
      try {
        const data = await apiFetchJson<EntryFlowState>("/api/onboarding");
        if (!cancelled) {
          setOnboarding(data);
        }
      } catch {
        if (!cancelled) {
          setOnboarding(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, [pathname, status]);

  const updateGuide = useCallback(async (payload: {
    action: "START_GUIDE" | "SET_GUIDE_STEP" | "SKIP_GUIDE" | "COMPLETE_GUIDE" | "RESTART_GUIDE";
    guideStepKey?: "today" | "songs" | "find" | "id";
  }) => {
    const response = await apiFetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Не удалось обновить гайд."));
    }

    const nextState = (await response.json()) as EntryFlowState;
    setOnboarding(nextState);
    return nextState;
  }, []);

  const activeStep = useMemo(() => {
    if (!onboarding || !shouldRunGuide(onboarding) || CHROMELESS_ROUTES.has(pathname)) return null;
    return getGuideStep(onboarding.guideStepKey);
  }, [onboarding, pathname]);

  useEffect(() => {
    if (!onboarding || status !== "authenticated" || loading) return;
    if (CHROMELESS_ROUTES.has(pathname)) return;

    if (shouldForceWelcome(onboarding) && pathname !== "/welcome") {
      router.replace("/welcome");
      return;
    }

    if (shouldRunGuide(onboarding) && onboarding.guideStatus === "NOT_STARTED" && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void updateGuide({ action: "START_GUIDE", guideStepKey: defaultGuideStepKey });
      return;
    }

    if (shouldRunGuide(onboarding)) {
      const step = getGuideStep(onboarding.guideStepKey);
      if (pathname !== step.route) {
        router.replace(step.route);
      }
    }
  }, [loading, onboarding, pathname, router, status, updateGuide]);

  useEffect(() => {
    if (!activeStep) {
      setTargetRect(null);
      return;
    }

    let frameId = 0;

    const updateRect = () => {
      frameId = window.requestAnimationFrame(() => {
        const element = document.querySelector<HTMLElement>(`[data-guide-id="${activeStep.target}"]`);
        setTargetRect(element ? element.getBoundingClientRect() : null);
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [activeStep, pathname]);

  async function handleNext() {
    if (!activeStep) return;
    setBusyAction("next");
    try {
      const nextStep = getNextGuideStep(activeStep.id);
      if (!nextStep) {
        await updateGuide({ action: "COMPLETE_GUIDE", guideStepKey: activeStep.id });
        router.replace("/today");
        return;
      }

      await updateGuide({ action: "SET_GUIDE_STEP", guideStepKey: nextStep.id });
      router.replace(nextStep.route);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSkip() {
    if (!activeStep) return;
    setBusyAction("skip");
    try {
      await updateGuide({ action: "SKIP_GUIDE", guideStepKey: activeStep.id });
      router.replace("/today");
    } finally {
      setBusyAction(null);
    }
  }

  const restartGuide = useCallback(async () => {
    setBusyAction("restart");
    try {
      autoStartedRef.current = true;
      await updateGuide({ action: "RESTART_GUIDE", guideStepKey: defaultGuideStepKey });
      router.replace(entryGuideSteps[0].route);
    } finally {
      setBusyAction(null);
    }
  }, [router, updateGuide]);

  const contextValue = useMemo(
    () => ({
      restartGuide,
      restarting: busyAction === "restart",
      onboarding
    }),
    [busyAction, onboarding, restartGuide]
  );

  return (
    <GuideContext.Provider value={contextValue}>
      {children}
      {activeStep ? (
        <div className="pointer-events-none fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-[#0b1611]/58" />
          {targetRect ? (
            <div
              className="absolute rounded-[28px] border-2 border-[#d9f99d] bg-white/5 shadow-[0_0_0_9999px_rgba(11,22,17,0.36)]"
              style={{
                top: Math.max(targetRect.top - 10, 10),
                left: Math.max(targetRect.left - 10, 10),
                width: Math.max(targetRect.width + 20, 120),
                height: targetRect.height + 20
              }}
            />
          ) : null}

          <div className="pointer-events-auto absolute inset-x-4 bottom-4 flex justify-center md:bottom-6">
            <Card className="w-full max-w-xl rounded-[28px] border border-[#dbe8c6] bg-[#f7fbf1] p-5 shadow-[0_24px_60px_rgba(15,34,20,0.24)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#d6e5bf] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#50644c]">
                    <Sparkles className="h-3.5 w-3.5" />
                    {activeStep.accent}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-ink">{activeStep.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-brand-muted">{activeStep.body}</p>
                </div>
                <div className="rounded-full border border-brand-border bg-white px-3 py-1 text-xs text-brand-muted">
                  {entryGuideSteps.findIndex((step) => step.id === activeStep.id) + 1}/{entryGuideSteps.length}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => void handleSkip()}
                  disabled={busyAction === "skip" || busyAction === "next"}
                >
                  {busyAction === "skip" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Пропустить гайд
                </Button>

                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => void handleNext()}
                  disabled={busyAction === "skip" || busyAction === "next"}
                >
                  {busyAction === "next" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  {getNextGuideStep(activeStep.id) ? "Дальше" : "Завершить"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </GuideContext.Provider>
  );
}

export function useEntryGuide() {
  return useContext(GuideContext);
}
