import { z } from "zod";
import { createEvidence, failedResult, getFetcher, blockedResult, fetchText } from "@/lib/tools/common";
import type { FreeTool, ToolExecutionContext, ToolResult } from "@/lib/tools/types";

const weatherResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number().optional(),
    precipitation: z.number().optional(),
    rain: z.number().optional(),
    showers: z.number().optional(),
    snowfall: z.number().optional(),
    weather_code: z.number().optional(),
    wind_speed_10m: z.number().optional(),
  }).passthrough(),
}).passthrough();

export const currentWeatherTool: FreeTool = {
  id: "weather.current",
  async execute(_input, context: ToolExecutionContext): Promise<ToolResult> {
    const location = context.previous["location.lookup"]?.metadata;
    const latitude = typeof location?.latitude === "number" ? location.latitude : undefined;
    const longitude = typeof location?.longitude === "number" ? location.longitude : undefined;

    if (latitude === undefined || longitude === undefined) {
      return blockedResult(this.id, "Weather lookup requires a successfully resolved location first.");
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m");
    url.searchParams.set("timezone", "auto");

    try {
      const { text } = await fetchText(getFetcher(context.fetcher), url.toString(), {
        headers: { accept: "application/json" },
      });
      const weather = weatherResponseSchema.parse(JSON.parse(text));
      const retrievedAt = new Date().toISOString();
      const evidence = createEvidence({
        caseId: context.caseId,
        sourceType: "free-tool",
        sourceName: "Open-Meteo",
        sourceUrl: url.toString(),
        retrievedAt,
        freshness: "live",
        summary: `Current temperature is ${weather.current.temperature_2m}°C at ${weather.current.time} (${weather.timezone}).`,
        confidence: "high",
        metadata: {
          latitude: weather.latitude,
          longitude: weather.longitude,
          timezone: weather.timezone,
          current: weather.current,
        },
        content: weather,
      });

      return {
        toolId: this.id,
        status: "completed",
        message: "Current weather data retrieved.",
        evidence,
        metadata: { timezone: weather.timezone, current: weather.current },
      };
    } catch (error) {
      return failedResult(this.id, error);
    }
  },
};
