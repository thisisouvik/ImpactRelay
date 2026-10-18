import { describe, expect, it } from "vitest";
import { GrokProvider } from "@/lib/ai/grok-provider";
import { LocalProvider } from "@/lib/ai/local-provider";
import { OgProvider } from "@/lib/ai/og-provider";
import { ProviderConfigurationError, ProviderError, ProviderOutputError } from "@/lib/ai/types";
import { requestChatCompletion } from "@/lib/ai/http";
import type { CaseRecord, EvidenceItem } from "@/lib/domain/schemas";

const caseRecord: CaseRecord = {
  id: "77777777-7777-4777-8777-777777777777",
  title: "Provider contract case",
  requestText: "Check current weather near Guwahati and use the result to prepare a reviewable plan.",
  status: "planning",
  mode: "grok",
  budget: { capUsd: "0.05", spentUsd: "0", reservedUsd: "0" },
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
  events: [],
  evidence: [],
};

const evidence: EvidenceItem[] = [{
  id: "88888888-8888-4888-8888-888888888888",
  caseId: caseRecord.id,
  sourceType: "free-tool",
  sourceName: "Open-Meteo",
  sourceUrl: "https://api.open-meteo.com/v1/forecast",
  retrievedAt: "2026-10-18T10:01:00.000Z",
  freshness: "live",
  summary: "Current temperature is 27°C.",
  confidence: "high",
  contentHash: "a".repeat(64),
  metadata: { temperature: 27 },
}];

function completion(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("provider adapters", () => {
  it("validates a Grok-shaped structured plan and derives safe tool input", async () => {
    let authorization = "";
    const fetcher: typeof fetch = async (_input, init) => {
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return completion({
        objective: "Assess current weather",
        constraints: ["Use source-backed claims."],
        steps: [{ toolId: "weather.current", purpose: "Retrieve current weather." }],
      });
    };
    const provider = new GrokProvider({ apiKey: "test-key", model: "test-model", fetcher });

    const plan = await provider.plan({ caseRecord, availableToolIds: ["location.lookup", "weather.current"] });

    expect(authorization).toBe("Bearer test-key");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].toolId).toBe("weather.current");
    expect(plan.steps[0].input).toEqual({ requestText: caseRecord.requestText });
    expect(plan.steps[0].requiresPayment).toBe(false);
  });

  it("uses the 0G Router contract with optional private trust routing", async () => {
    let requestedUrl = "";
    let trustMode = "";
    const fetcher: typeof fetch = async (input, init) => {
      requestedUrl = String(input);
      trustMode = new Headers(init?.headers).get("X-0G-Provider-Trust-Mode") ?? "";
      return completion({
        objective: "Assess current weather",
        constraints: ["Use source-backed claims."],
        steps: [{ toolId: "weather.current", purpose: "Retrieve current weather." }],
      });
    };
    const provider = new OgProvider({
      apiKey: "sk-test-key",
      model: "test-model",
      baseUrl: "https://router-api-testnet.integratenetwork.work/v1",
      fetcher,
    });
    // The production adapter reads the trust mode from the server environment.
    const previousTrustMode = process.env.OG_COMPUTE_TRUST_MODE;
    process.env.OG_COMPUTE_TRUST_MODE = "private";
    try {
      const plan = await provider.plan({ caseRecord, availableToolIds: ["weather.current"] });
      expect(plan.steps[0].toolId).toBe("weather.current");
      expect(requestedUrl).toContain("router-api-testnet.integratenetwork.work");
      expect(trustMode).toBe("private");
    } finally {
      process.env.OG_COMPUTE_TRUST_MODE = previousTrustMode;
    }
  });

  it("rejects a provider-selected tool that is not in the registry", async () => {
    const fetcher: typeof fetch = async () => completion({
      objective: "Unsupported action",
      constraints: [],
      steps: [{ toolId: "unknown.tool", purpose: "Do something unknown." }],
    });
    const provider = new LocalProvider({ baseUrl: "http://127.0.0.1:11434/v1", model: "local-test", fetcher });

    await expect(provider.plan({ caseRecord: { ...caseRecord, mode: "local" }, availableToolIds: ["weather.current"] }))
      .rejects.toBeInstanceOf(ProviderOutputError);
  });

  it("validates report evidence references and records the provider identity", async () => {
    const fetcher: typeof fetch = async () => completion({
      summary: "Weather data is available for review.",
      known: [{ text: "The current temperature is 27°C.", evidenceIds: [evidence[0].id] }],
      nextActions: [{ priority: "01", action: "Confirm local conditions with a volunteer.", rationale: "Public weather data is not a local confirmation.", evidenceIds: [evidence[0].id] }],
      uncertainties: [{ text: "Road access is not known.", evidenceIds: [] }],
    });
    const provider = new LocalProvider({ baseUrl: "http://127.0.0.1:11434/v1", model: "local-test", fetcher });

    const report = await provider.summarize({ caseRecord: { ...caseRecord, mode: "local" }, evidence });

    expect(report.providerId).toBe("local");
    expect(report.known[0].evidenceIds).toEqual([evidence[0].id]);
  });

  it("surfaces malformed provider JSON instead of producing a fallback result", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({
      choices: [{ message: { content: "not-json" } }],
    }), { status: 200 });
    const provider = new LocalProvider({ baseUrl: "http://127.0.0.1:11434/v1", model: "local-test", fetcher });

    await expect(provider.plan({ caseRecord: { ...caseRecord, mode: "local" }, availableToolIds: ["weather.current"] }))
      .rejects.toBeInstanceOf(ProviderOutputError);
  });

  it("retries a rate-limited response once and then returns a typed provider error", async () => {
    let attempts = 0;
    const fetcher: typeof fetch = async () => {
      attempts += 1;
      return new Response("rate limited", { status: 429 });
    };

    await expect(requestChatCompletion({
      endpoint: "https://example.test/v1/chat/completions",
      model: "test-model",
      messages: [{ role: "user", content: "test" }],
      fetcher,
    })).rejects.toMatchObject({ code: "PROVIDER_RATE_LIMITED", retryable: true });
    expect(attempts).toBe(2);
  });

  it("requires credentials/configuration for real providers", () => {
    expect(() => new GrokProvider({ apiKey: "", model: "test-model" })).toThrow(ProviderConfigurationError);
    expect(() => new LocalProvider({ baseUrl: "", model: "test-model" })).toThrow(ProviderConfigurationError);
  });

  it("keeps provider errors typed for callers", () => {
    const error = new ProviderError("CODE", "message", { retryable: true, status: 503 });
    expect(error).toMatchObject({ code: "CODE", retryable: true, status: 503 });
  });
});
