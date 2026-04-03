import { notFound, redirect } from "next/navigation";

import { LearnDetailPage } from "@/components/learn/learn-detail-page";
import { getLearnMaterialBySlug } from "@/lib/learn/repository";
import { prisma } from "@/lib/prisma";
import { getFreshSessionUser } from "@/lib/server-auth";

async function requireArtistPageAccess(callbackPath: string) {
  const user = await getFreshSessionUser();

  if (!user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  if (user.role !== "ARTIST") {
    redirect("/today");
  }

  return user.id;
}

export default async function LearnMaterialPage({ params }: { params: { slug: string } }) {
  const userId = await requireArtistPageAccess(`/learn/${params.slug}`);

  const material = await getLearnMaterialBySlug(prisma, userId, params.slug);
  if (!material) {
    notFound();
  }

  return <LearnDetailPage material={material} />;
}
