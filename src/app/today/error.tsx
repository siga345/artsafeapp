"use client";

import { Button } from "@/components/ui/button";

export default function TodayError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4 p-6">
      <p className="text-sm text-brand-muted">Не удалось загрузить Today.</p>
      <Button onClick={() => reset()}>Повторить</Button>
    </div>
  );
}
