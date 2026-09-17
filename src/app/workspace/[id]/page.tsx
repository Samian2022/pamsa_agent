import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEngagement } from "@/lib/storage";
import { EngagementApp } from "./engagement-app";

export default async function EngagementPage({
  params,
}: PageProps<"/workspace/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const engagement = await getEngagement(id);
  if (!engagement) redirect("/workspace");
  return <EngagementApp initial={engagement} user={user} />;
}
