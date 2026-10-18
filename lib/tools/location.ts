import { z } from "zod";
import { createEvidence, failedResult, getFetcher, blockedResult, fetchText } from "@/lib/tools/common";
import type { FreeTool, ToolExecutionContext, ToolResult } from "@/lib/tools/types";

const nominatimResultSchema = z.array(z.object({
  place_id: z.number(),
  display_name: z.string().min(1),
  lat: z.string(),
  lon: z.string(),
  type: z.string().optional(),
  importance: z.number().optional(),
}).passthrough());

export function extractLocationQuery(requestText: string) {
  const match = requestText.match(/\b(?:near|around|in|at|from|within)\s+([^,.;!?]+?)(?:\s+(?:were|are|is|need|affected|and|to|for|that|who|after|before|during|with|check|prepare|do)\b|[,.;!?]|$)/i);
  const query = match?.[1]?.trim();
  return query && query.length >= 2 ? query : requestText.trim().slice(0, 120);
}

export const locationLookupTool: FreeTool = {
  id: "location.lookup",
  async execute(input, context: ToolExecutionContext): Promise<ToolResult> {
    const query = typeof input.locationQuery === "string" && input.locationQuery.trim().length > 1
      ? input.locationQuery.trim()
      : extractLocationQuery(context.requestText);

    if (!query) return blockedResult(this.id, "A location is required before nearby resources can be checked.");

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "3");
    url.searchParams.set("addressdetails", "1");

    try {
      const { text } = await fetchText(getFetcher(context.fetcher), url.toString(), {
        headers: {
          accept: "application/json",
          "user-agent": process.env.IMPACTRELAY_USER_AGENT ?? "ImpactRelay/0.3 local development",
        },
      }, 15_000);
      const results = nominatimResultSchema.parse(JSON.parse(text));
      const first = results[0];
      if (!first) return blockedResult(this.id, `No public map result was found for “${query}”.`);

      const latitude = Number(first.lat);
      const longitude = Number(first.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return failedResult(this.id, new Error("The map service returned invalid coordinates."));
      }

      const retrievedAt = new Date().toISOString();
      const evidence = createEvidence({
        caseId: context.caseId,
        sourceType: "free-tool",
        sourceName: "OpenStreetMap Nominatim",
        sourceUrl: url.toString(),
        retrievedAt,
        freshness: "live",
        summary: `Resolved “${query}” to ${first.display_name}.`,
        confidence: results.length === 1 ? "high" : "medium",
        metadata: {
          query,
          displayName: first.display_name,
          latitude,
          longitude,
          resultCount: results.length,
          placeType: first.type,
        },
        content: results,
      });

      return {
        toolId: this.id,
        status: "completed",
        message: `Location resolved to ${first.display_name}.`,
        evidence,
        metadata: { latitude, longitude, displayName: first.display_name },
      };
    } catch (error) {
      return failedResult(this.id, error);
    }
  },
};
