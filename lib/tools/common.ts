import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { evidenceItemSchema, type EvidenceItem } from "@/lib/domain/schemas";
import type { FetchLike, ToolResult } from "@/lib/tools/types";

export const DEFAULT_TIMEOUT_MS = 8_000;
export const MAX_SOURCE_BYTES = 200_000;

export function getFetcher(fetcher?: FetchLike): FetchLike {
  return fetcher ?? fetch;
}

export async function fetchText(
  fetcher: FetchLike,
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`External source returned HTTP ${response.status}.`);
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_SOURCE_BYTES) {
      throw new Error("External source exceeded the response-size limit.");
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_SOURCE_BYTES) {
      throw new Error("External source exceeded the response-size limit.");
    }
    return { response, text };
  } finally {
    clearTimeout(timeout);
  }
}

export function hashContent(value: unknown) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

export function createEvidence(input: Omit<EvidenceItem, "id" | "contentHash"> & { content: unknown }): EvidenceItem {
  const { content, ...evidence } = input;
  return evidenceItemSchema.parse({
    ...evidence,
    id: randomUUID(),
    contentHash: hashContent(content),
  });
}

export function blockedResult(toolId: string, message: string): ToolResult {
  return { toolId, status: "blocked", message };
}

export function failedResult(toolId: string, error: unknown): ToolResult {
  return {
    toolId,
    status: "failed",
    message: error instanceof Error ? error.message : "The external tool failed safely.",
  };
}

export function freshnessFromLastModified(value: string | null): EvidenceItem["freshness"] {
  if (!value) return "unknown";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "unknown";
  const age = Date.now() - timestamp;
  return age >= 0 && age <= 7 * 24 * 60 * 60 * 1000 ? "recent" : "stale";
}
