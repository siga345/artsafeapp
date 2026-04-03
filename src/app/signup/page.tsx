"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Mail, Sparkles, UserPlus2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineActionMessage } from "@/components/ui/inline-action-message";
import { apiFetch, readApiErrorMessage } from "@/lib/client-fetch";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-4 md:px-0 md:py-8">
      <div className="mb-4 space-y-1 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-muted">ART SAFE PLACE</p>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">Создать аккаунт</h1>
        <p className="text-sm text-brand-muted">Сначала вход, потом короткая визуальная анкета и гайд по приложению.</p>
      </div>

      <Card className="relative overflow-hidden border-brand-border bg-white/90 p-0 shadow-[0_16px_36px_rgba(61,84,46,0.12)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.42),transparent_36%)]" />
        <div className="relative p-4">
          <div className="mb-4 overflow-hidden rounded-2xl border border-brand-border bg-gradient-to-br from-[#eef7e4] via-[#e8f1de] to-[#dfead2] p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Badge className="border-[#cbdab8] bg-white/80 text-[#4b6440]">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                START
              </Badge>
            </div>
            <p className="text-sm font-medium text-brand-ink">Новый путь артиста начинается здесь</p>
          </div>

          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setSubmitting(true);
              setFormError("");

              try {
                const response = await apiFetch("/api/auth/register", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, password })
                });

                if (!response.ok) {
                  throw new Error(await readApiErrorMessage(response, "Не удалось создать аккаунт."));
                }

                const signInResult = await signIn("credentials", {
                  email,
                  password,
                  redirect: false,
                  callbackUrl: "/welcome"
                });

                if (!signInResult || signInResult.error) {
                  throw new Error("Аккаунт создан, но не удалось выполнить вход автоматически.");
                }

                router.push("/welcome");
                router.refresh();
              } catch (error) {
                setFormError(error instanceof Error ? error.message : "Не удалось создать аккаунт.");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {formError ? <InlineActionMessage message={formError} /> : null}

            <div className="rounded-2xl border border-brand-border bg-white/75 p-3 shadow-sm">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                <Input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={submitting}
                  className="bg-white pl-9"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white/75 p-3 shadow-sm">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                <Input
                  type="password"
                  placeholder="Пароль не короче 8 символов"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  disabled={submitting}
                  className="bg-white pl-9"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white/70 p-3 shadow-sm">
              <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
                <span className="inline-flex items-center gap-2">
                  <span>{submitting ? "Создаём..." : "Создать аккаунт"}</span>
                  <UserPlus2 className="h-4 w-4" />
                </span>
              </Button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-brand-muted">
            <span>Уже есть аккаунт?</span>
            <Link href="/signin" className="inline-flex items-center gap-1 font-medium text-brand-ink">
              Войти
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
