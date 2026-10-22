import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GroqProvider } from "@/lib/ai/groq-provider";
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
  mode: "groq",
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
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", undefined);
    vi.stubEnv("GROQ_MODEL", undefined);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network request in provider tests."));
  });

  afterEach(() => vi.unstubAllEnvs());

  it("uses Groq credentials, the fixed official endpoint, and the default model for guarded planning", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_groq-test-key");
    const fetcher = vi.fn<typeof fetch>(async () => completion({
      objective: "Assess current weather",
      constraints: ["Use source-backed claims."],
      steps: [{
        toolId: "weather.current",
        purpose: "Retrieve current weather.",
        input: { requestText: "Model-supplied input must be replaced." },
        requiresPayment: true,
        requiresApproval: true,
      }],
    }));
    const provider = new GroqProvider({ fetcher });

    const plan = await provider.plan({ caseRecord: { ...caseRecord, mode: "groq" }, availableToolIds: ["weather.current"] });

    expect(provider.id).toBe("groq");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer gsk_groq-test-key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "system" }, { role: "user" }],
    });
    expect(plan.steps[0]).toMatchObject({
      toolId: "weather.current",
      input: { requestText: caseRecord.requestText },
      requiresPayment: false,
      requiresApproval: false,
      status: "ready",
    });
  });

  it("uses GROQ_MODEL for synthesis and records Groq identity instead of a model-supplied identity", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_groq-report-test");
    vi.stubEnv("GROQ_MODEL", "groq-configured-model");
    const fetcher = vi.fn<typeof fetch>(async () => completion({
      summary: "Weather data is available for review.",
      known: [{ text: "The current temperature is 27°C.", evidenceIds: [evidence[0].id] }],
      nextActions: [],
      uncertainties: [],
       providerId: "groq",
    }));
    const provider = new GroqProvider({ fetcher });

    const report = await provider.summarize({ caseRecord: { ...caseRecord, mode: "groq" }, evidence });

    expect(report.providerId).toBe("groq");
    expect(report.known[0].evidenceIds).toEqual([evidence[0].id]);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer gsk_groq-report-test");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "groq-configured-model",
      response_format: { type: "json_object" },
    });
  });

  it("applies Groq plan and report guardrails without a fallback result", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(completion({
        objective: "Unsupported action",
        constraints: [],
        steps: [{ toolId: "unknown.tool", purpose: "Do something unknown." }],
      }))
      .mockResolvedValueOnce(completion({
        summary: "Unsupported claim",
        known: [{ text: "An invented fact.", evidenceIds: ["unknown-evidence"] }],
        nextActions: [],
        uncertainties: [],
      }));
    const provider = new GroqProvider({ apiKey: "gsk_guardrail-test", fetcher });

    await expect(provider.plan({ caseRecord: { ...caseRecord, mode: "groq" }, availableToolIds: ["weather.current"] }))
      .rejects.toMatchObject({ code: "PROVIDER_INVALID_OUTPUT", message: expect.stringContaining("groq") });
    await expect(provider.summarize({ caseRecord: { ...caseRecord, mode: "groq" }, evidence }))
      .rejects.toMatchObject({ code: "PROVIDER_INVALID_OUTPUT", message: expect.stringContaining("unknown evidence ID") });
    expect(fetcher).toHaveBeenCalledTimes(2);
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

  it("validates report evidence references and records the local provider identity", async () => {
    const mode = "local" as const;
    const fetcher: typeof fetch = async () => completion({
      summary: "Weather data is available for review.",
      known: [{ text: "The current temperature is 27°C.", evidenceIds: [evidence[0].id] }],
      nextActions: [{ priority: "01", action: "Confirm local conditions with a volunteer.", rationale: "Public weather data is not a local confirmation.", evidenceIds: [evidence[0].id] }],
      uncertainties: [{ text: "Road access is not known.", evidenceIds: [] }],
    });
    const provider = new LocalProvider({ baseUrl: "http://127.0.0.1:11434/v1", model: "local-test", fetcher });

    const report = await provider.summarize({ caseRecord: { ...caseRecord, mode }, evidence });

    expect(report.providerId).toBe(mode);
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
    expect(() => new GroqProvider()).toThrow("GROQ_API_KEY is required for Groq mode.");
    expect(() => new GroqProvider({ apiKey: "  " })).toThrow(ProviderConfigurationError);
    expect(() => new LocalProvider({ baseUrl: "", model: "test-model" })).toThrow(ProviderConfigurationError);
  });

  it("keeps provider errors typed for callers", () => {
    const error = new ProviderError("CODE", "message", { retryable: true, status: 503 });
    expect(error).toMatchObject({ code: "CODE", retryable: true, status: 503 });
  });
});
