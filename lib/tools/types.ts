import type { AgentStep, EvidenceItem } from "@/lib/domain/schemas";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ToolExecutionContext = {
  caseId: string;
  requestText: string;
  previous: Record<string, ToolResult>;
  fetcher?: FetchLike;
};

export type ToolResult = {
  toolId: string;
  status: "completed" | "blocked" | "failed";
  message: string;
  evidence?: EvidenceItem;
  metadata?: Record<string, unknown>;
};

export type FreeTool = {
  id: string;
  execute(input: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult>;
};

export type ToolExecution = {
  step: AgentStep;
  result: ToolResult;
};
