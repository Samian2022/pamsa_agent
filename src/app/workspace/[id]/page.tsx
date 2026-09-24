import { redirect } from "next/navigation";
import { hydrateFlaggedProbes, hydrateShellFindings } from "@/lib/agent/discovery";
import { hydrateStuckResearch } from "@/lib/agent/research";
import { getCurrentUser } from "@/lib/auth";
import { getEngagement } from "@/lib/storage";
import { EngagementApp } from "./engagement-app";

export default async function EngagementPage({
  params,
}: PageProps<"/workspace/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const found = await getEngagement(id);
  if (!found) redirect("/workspace");
  const engagement = await hydrateFlaggedProbes(await hydrateShellFindings(await hydrateStuckResearch(found)));
  return <EngagementApp initial={engagement} user={user} />;
}
