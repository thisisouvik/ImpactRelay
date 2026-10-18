import { z } from "zod";
import { createEvidence, failedResult, freshnessFromLastModified, getFetcher, blockedResult, fetchText } from "@/lib/tools/common";
import type { FreeTool, ToolExecutionContext, ToolResult } from "@/lib/tools/types";

const sourceInputSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(5),
});

function allowedHosts() {
  return (process.env.PUBLIC_SOURCE_ALLOWLIST ?? "asdma.assam.gov.in,ndma.gov.in,imd.gov.in,who.int")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedUrl(value: string, hosts: string[]) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    return hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 240) || "Untitled public source";
}

function extractExcerpt(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export const publicSourceReadTool: FreeTool = {
  id: "public.source.read",
  async execute(input, context: ToolExecutionContext): Promise<ToolResult> {
    const parsed = sourceInputSchema.safeParse(input);
    if (!parsed.success) return blockedResult(this.id, "A public-source URL must be supplied in the request.");

    const hosts = allowedHosts();
    const sourceUrl = parsed.data.urls[0];
    if (!isAllowedUrl(sourceUrl, hosts)) {
      return blockedResult(this.id, "The supplied source is not on the configured public-source allow-list.");
    }

    try {
      const { response, text } = await fetchText(getFetcher(context.fetcher), sourceUrl, {
        headers: {
          accept: "text/html, text/plain, application/json",
          "user-agent": process.env.IMPACTRELAY_USER_AGENT ?? "ImpactRelay/0.3 local development",
        },
      });
      const finalUrl = response.url || sourceUrl;
      if (!isAllowedUrl(finalUrl, hosts)) {
        return blockedResult(this.id, "The public source redirected outside the configured allow-list.");
      }

      const contentType = response.headers.get("content-type")?.split(";", 1)[0] ?? "unknown";
      const title = contentType === "text/html" ? extractTitle(text) : finalUrl;
      const excerpt = contentType === "text/html" ? extractExcerpt(text) : text.slice(0, 500).trim();
      const retrievedAt = new Date().toISOString();
      const evidence = createEvidence({
        caseId: context.caseId,
        sourceType: "free-tool",
        sourceName: title,
        sourceUrl: finalUrl,
        retrievedAt,
        freshness: freshnessFromLastModified(response.headers.get("last-modified")),
        summary: `Retrieved ${title} from the configured public source.`,
        confidence: "medium",
        metadata: {
          contentType,
          bytes: Buffer.byteLength(text, "utf8"),
          excerpt,
          allowListedHost: new URL(finalUrl).hostname,
        },
        content: text,
      });

      return {
        toolId: this.id,
        status: "completed",
        message: `Public source retrieved: ${title}.`,
        evidence,
        metadata: { title, contentType, excerpt },
      };
    } catch (error) {
      return failedResult(this.id, error);
    }
  },
};
