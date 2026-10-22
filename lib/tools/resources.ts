import { z } from "zod";
import { blockedResult, createEvidence, failedResult, fetchText, getFetcher } from "@/lib/tools/common";
import type { FreeTool, ToolExecutionContext, ToolResult } from "@/lib/tools/types";

const overpassSchema = z.object({
  elements: z.array(z.object({
    id: z.number(),
    type: z.string(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    center: z.object({ lat: z.number(), lon: z.number() }).optional(),
    tags: z.record(z.string(), z.string()).optional(),
  }).passthrough()),
}).passthrough();

// The Overpass query itself asks the service to stop after eight seconds. Keep
// the client timeout aligned with that budget so a failed endpoint cannot hold
// the complete case run for the previous 15-second retry window.
const OVERPASS_REQUEST_TIMEOUT_MS = 8_000;

function distanceKm(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  const earthRadiusKm = 6371;
  const latitudeDelta = (toLat - fromLat) * Math.PI / 180;
  const longitudeDelta = (toLon - fromLon) * Math.PI / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function resourceLabel(tags: Record<string, string>) {
  return tags.name || tags.amenity || tags.social_facility || tags.healthcare || "Mapped public resource";
}

export const nearbyResourcesTool: FreeTool = {
  id: "resources.nearby",
  async execute(_input, context: ToolExecutionContext): Promise<ToolResult> {
    const location = context.previous["location.lookup"]?.metadata;
    const latitude = typeof location?.latitude === "number" ? location.latitude : undefined;
    const longitude = typeof location?.longitude === "number" ? location.longitude : undefined;
    if (latitude === undefined || longitude === undefined) {
      return blockedResult(this.id, "Nearby resource lookup requires a successfully resolved location first.");
    }

    const query = `[out:json][timeout:8];nwr(around:5000,${latitude},${longitude})[amenity~"shelter|hospital|clinic|social_facility|food_bank|drinking_water"];out center tags;`;
    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ];

    try {
      let text = "";
      let sourceUrl = "";
      let lastError: unknown;
      for (const endpoint of endpoints) {
        const url = new URL(endpoint);
        url.searchParams.set("data", query);
        try {
          const response = await fetchText(getFetcher(context.fetcher), url.toString(), {
            headers: {
              accept: "application/json",
              "user-agent": process.env.IMPACTRELAY_USER_AGENT ?? "ImpactRelay/0.4 local development",
            },
          }, OVERPASS_REQUEST_TIMEOUT_MS);
          text = response.text;
          sourceUrl = url.toString();
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!text) throw lastError instanceof Error ? lastError : new Error("No public map resource endpoint responded.");
      const parsed = overpassSchema.parse(JSON.parse(text));
      const resources = parsed.elements.map((element) => {
        const coordinates = element.center ?? (element.lat !== undefined && element.lon !== undefined ? { lat: element.lat, lon: element.lon } : undefined);
        if (!coordinates) return null;
        const tags = element.tags ?? {};
        return {
          id: `${element.type}/${element.id}`,
          name: resourceLabel(tags),
          category: tags.amenity ?? tags.social_facility ?? tags.healthcare ?? "public resource",
          distanceKm: Number(distanceKm(latitude, longitude, coordinates.lat, coordinates.lon).toFixed(2)),
          latitude: coordinates.lat,
          longitude: coordinates.lon,
          availabilityVerified: false,
        };
      }).filter((resource): resource is NonNullable<typeof resource> => resource !== null)
        .sort((left, right) => left.distanceKm - right.distanceKm)
        .slice(0, 10);
      const retrievedAt = new Date().toISOString();
      const summary = resources.length > 0
        ? `Found ${resources.length} mapped public resource${resources.length === 1 ? "" : "s"} within 5 km. Availability was not verified.`
        : "No mapped public resource was found within 5 km. This does not prove that no local help exists.";
      const evidence = createEvidence({
        caseId: context.caseId,
        sourceType: "free-tool",
        sourceName: "OpenStreetMap Overpass",
        sourceUrl,
        retrievedAt,
        freshness: "live",
        summary,
        confidence: resources.length > 0 ? "medium" : "low",
        metadata: { latitude, longitude, radiusKm: 5, resourceCount: resources.length, resources, availabilityVerified: false, toolId: this.id },
        content: { query, resources },
      });
      return {
        toolId: this.id,
        status: "completed",
        message: summary,
        evidence,
        metadata: { resourceCount: resources.length, resources },
      };
    } catch (error) {
      return failedResult(this.id, error);
    }
  },
};
