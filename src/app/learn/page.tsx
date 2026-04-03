import { redirect } from "next/navigation";

import { LearnCatalogPage } from "@/components/learn/learn-catalog-page";
import { getFreshSessionUser } from "@/lib/server-auth";

async function requireArtistPageAccess(callbackPath: string) {
  const user = await getFreshSessionUser();

  if (!user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  if (user.role !== "ARTIST") {
    redirect("/today");
  }
}

export default async function LearnPage() {
  await requireArtistPageAccess("/learn");
  return <LearnCatalogPage />;
}
