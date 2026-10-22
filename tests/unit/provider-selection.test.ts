import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configuredMode, effectiveCaseMode, getLlmProvider } from "@/lib/ai/selection";
import { ProviderConfigurationError } from "@/lib/ai/types";
import { caseModeSchema, caseRequestSchema } from "@/lib/domain/schemas";

describe("provider selection", () => {
  beforeEach(() => {
    vi.stubEnv("APP_MODE", undefined);
    vi.stubEnv("GROQ_API_KEY", "gsk_selection-test");
    vi.stubEnv("GROQ_MODEL", undefined);
    vi.stubEnv("LOCAL_LLM_BASE_URL", "http://127.0.0.1:11434/v1");
    vi.stubEnv("LOCAL_LLM_MODEL", "local-test-model");
    vi.stubEnv("OG_COMPUTE_API_KEY", "sk-og-selection-test");
    vi.stubEnv("OG_COMPUTE_MODEL", "og-test-model");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network request in selection tests."));
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(["rules", "local", "groq", "0g"] as const)("accepts and configures the explicit %s mode", (mode) => {
    expect(caseModeSchema.parse(mode)).toBe(mode);
    expect(caseRequestSchema.parse({
      title: "Provider selection",
      requestText: "Prepare a reviewable plan using validated public sources.",
      mode,
    }).mode).toBe(mode);
    vi.stubEnv("APP_MODE", mode);
    expect(configuredMode()).toBe(mode);
    expect(effectiveCaseMode("local")).toBe(mode);
  });

  it.each([undefined, "", "unknown"])("preserves requested Groq mode when APP_MODE is %s", (value) => {
    vi.stubEnv("APP_MODE", value);
    expect(configuredMode()).toBeUndefined();
    expect(effectiveCaseMode("groq")).toBe("groq");
  });

  it("keeps the rules override explicit even when Groq credentials exist", () => {
    vi.stubEnv("APP_MODE", "rules");
    expect(effectiveCaseMode("groq")).toBe("rules");
  });

  it.each(["groq", "local", "0g"] as const)("selects the distinct %s provider without a request", (mode) => {
    expect(getLlmProvider(mode).id).toBe(mode);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("requires dedicated Groq credentials", () => {
    vi.stubEnv("GROQ_API_KEY", undefined);
    vi.stubEnv("APP_MODE", "groq");

    expect(() => getLlmProvider("groq")).toThrow("GROQ_API_KEY is required for Groq mode.");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not select an LLM in rules mode", () => {
    expect(() => getLlmProvider("rules")).toThrow(ProviderConfigurationError);
  });
});
