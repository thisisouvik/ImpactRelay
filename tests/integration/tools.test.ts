import { describe, expect, it } from "vitest";
import { locationLookupTool } from "@/lib/tools/location";
import { currentWeatherTool } from "@/lib/tools/weather";
import { publicSourceReadTool } from "@/lib/tools/public-source";
import { nearbyResourcesTool } from "@/lib/tools/resources";
import type { FetchLike } from "@/lib/tools/types";

const contextBase = {
  caseId: "66666666-6666-4666-8666-666666666666",
  requestText: "Check current weather near Guwahati.",
  previous: {},
};

function response(body: string, init?: ResponseInit) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("free tool adapters", () => {
  it("normalizes a real-shaped Nominatim response into provenance evidence", async () => {
    const fetcher: FetchLike = async () => response(JSON.stringify([
      {
        place_id: 1,
        display_name: "Guwahati, Kamrup Metropolitan, Assam, India",
        lat: "26.1445",
        lon: "91.7362",
        type: "city",
      },
    ]));

    const result = await locationLookupTool.execute({}, { ...contextBase, fetcher });

    expect(result.status).toBe("completed");
    expect(result.evidence?.sourceName).toBe("OpenStreetMap Nominatim");
    expect(result.evidence?.sourceUrl).toContain("nominatim.openstreetmap.org");
    expect(result.evidence?.metadata).toMatchObject({ latitude: 26.1445, longitude: 91.7362 });
    expect(result.evidence?.contentHash).toHaveLength(64);
  });

  it("uses resolved coordinates for the Open-Meteo request", async () => {
    let requestedUrl = "";
    const fetcher: FetchLike = async (input) => {
      requestedUrl = input;
      return response(JSON.stringify({
        latitude: 26.1445,
        longitude: 91.7362,
        timezone: "Asia/Kolkata",
        current: {
          time: "2026-10-17T10:00",
          temperature_2m: 27.1,
          precipitation: 0.2,
          weather_code: 61,
        },
      }));
    };

    const result = await currentWeatherTool.execute({}, {
      ...contextBase,
      previous: {
        "location.lookup": {
          toolId: "location.lookup",
          status: "completed",
          message: "Location resolved.",
          metadata: { latitude: 26.1445, longitude: 91.7362 },
        },
      },
      fetcher,
    });

    expect(result.status).toBe("completed");
    expect(requestedUrl).toContain("api.open-meteo.com");
    expect(requestedUrl).toContain("latitude=26.1445");
    expect(requestedUrl).toContain("longitude=91.7362");
    expect(result.evidence?.freshness).toBe("live");
  });

  it("does not fetch a public source outside the configured allow-list", async () => {
    let called = false;
    const fetcher: FetchLike = async () => {
      called = true;
      return response("should not be fetched", { headers: { "content-type": "text/plain" } });
    };

    const result = await publicSourceReadTool.execute({ urls: ["https://example.com/guide"] }, {
      ...contextBase,
      fetcher,
    });

    expect(result.status).toBe("blocked");
    expect(called).toBe(false);
  });

  it("records a title and retrieval metadata from an allow-listed public source", async () => {
    const fetcher: FetchLike = async () => {
      const fetched = new Response(
        "<html><head><title>Public guidance</title></head><body><p>Keep this content for local review.</p></body></html>",
        {
          status: 200,
          headers: {
            "content-type": "text/html",
            "last-modified": new Date().toUTCString(),
          },
        },
      );
      Object.defineProperty(fetched, "url", { value: "https://asdma.assam.gov.in/guidance" });
      return fetched;
    };

    const result = await publicSourceReadTool.execute({ urls: ["https://asdma.assam.gov.in/guidance"] }, {
      ...contextBase,
      fetcher,
    });

    expect(result.status).toBe("completed");
    expect(result.evidence?.sourceName).toBe("Public guidance");
    expect(result.evidence?.freshness).toBe("recent");
    expect(result.evidence?.metadata).toMatchObject({ contentType: "text/html" });
  });

  it("finds nearby mapped resources from resolved coordinates without claiming availability", async () => {
    let requestedUrl = "";
    const fetcher: FetchLike = async (input) => {
      requestedUrl = input;
      return response(JSON.stringify({
        elements: [
          { type: "node", id: 12, lat: 26.15, lon: 91.74, tags: { amenity: "shelter", name: "Community Shelter" } },
          { type: "way", id: 13, center: { lat: 26.16, lon: 91.75 }, tags: { amenity: "hospital", name: "Public Hospital" } },
        ],
      }));
    };

    const result = await nearbyResourcesTool.execute({}, {
      ...contextBase,
      previous: {
        "location.lookup": {
          toolId: "location.lookup",
          status: "completed",
          message: "Location resolved.",
          metadata: { latitude: 26.1445, longitude: 91.7362 },
        },
      },
      fetcher,
    });

    expect(result.status).toBe("completed");
    expect(requestedUrl).toContain("overpass-api.de");
    expect(result.evidence?.sourceName).toBe("OpenStreetMap Overpass");
    expect(result.evidence?.metadata).toMatchObject({ resourceCount: 2, availabilityVerified: false });
    expect(result.evidence?.contentHash).toHaveLength(64);
  });
});
