import { TasksClient } from "@/components/tasks/tasks-client";
import { getTasksPageData } from "@/lib/tasks-page";

export const dynamic = "force-dynamic";

// ✅ Công việc — 7 views DB1 (Giai đoạn D). Data load ở server, tương tác ở client.
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const data = await getTasksPageData();
  return (
    <TasksClient
      data={data}
      initialView={typeof sp.view === "string" ? sp.view : undefined}
      initialTeam={typeof sp.team === "string" ? sp.team : undefined}
      initialTaskId={typeof sp.task === "string" ? sp.task : undefined}
      initialNew={sp.new === "1"}
    />
  );
}
