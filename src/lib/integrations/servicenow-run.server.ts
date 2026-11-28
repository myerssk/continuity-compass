import type { executeServiceNowSync } from "./servicenow-sync.server";
type Result = Awaited<ReturnType<typeof executeServiceNowSync>>;
type Run = { id: string; workspace_id: string; requested_by: string; direction: "import" | "export" | "bidirectional"; dry_run: boolean };
export async function processQueuedServiceNowRun(input: {
  workspaceId: string;
  runId: string;
  userId: string;
  authorize: () => Promise<boolean>;
  claim: (workspaceId: string, runId: string, userId: string) => Promise<Run | null>;
  execute: (run: Run) => Promise<Result>;
  finish: (workspaceId: string, runId: string, status: "succeeded" | "partial" | "failed", summary: Record<string, unknown>) => Promise<void>;
}) {
  if (!(await input.authorize())) throw new Error("Not authorized to execute synchronization.");
  const run = await input.claim(input.workspaceId, input.runId, input.userId);
  if (!run || run.workspace_id !== input.workspaceId || run.id !== input.runId || run.requested_by !== input.userId) throw new Error("No eligible queued synchronization.");
  let result: Result;
  try {
    result = await input.execute(run);
  } catch {
    await input.finish(run.workspace_id, run.id, "failed", { message: "Synchronization execution failed; review server diagnostics." });
    return { status: "failed" as const };
  }
  await input.finish(run.workspace_id, run.id, result.status, { imported: result.imported?.records.length ?? 0, truncated: result.imported?.truncated ?? [], exported: result.exported ?? null });
  return { status: result.status };
}
