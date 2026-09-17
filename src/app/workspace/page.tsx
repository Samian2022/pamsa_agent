import { getCurrentUser } from "@/lib/auth";
import { listEngagements, summarizeEngagement } from "@/lib/storage";
import { WorkspaceHome } from "./workspace-home";
import { redirect } from "next/navigation";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const engagements = (await listEngagements()).map(summarizeEngagement);
  return <WorkspaceHome user={user} initialEngagements={engagements} />;
}
