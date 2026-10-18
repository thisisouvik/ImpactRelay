import { GrokProvider } from "@/lib/ai/grok-provider";
import { LocalProvider } from "@/lib/ai/local-provider";
import { OgProvider } from "@/lib/ai/og-provider";
import { ProviderConfigurationError, type LlmProvider } from "@/lib/ai/types";
import type { CaseMode } from "@/lib/domain/schemas";

export function configuredMode() {
  const value = process.env.APP_MODE;
  if (value === "rules" || value === "local" || value === "grok" || value === "0g") return value satisfies CaseMode;
  return undefined;
}

export function effectiveCaseMode(requestedMode: CaseMode): CaseMode {
  return configuredMode() ?? requestedMode;
}

export function getLlmProvider(mode: CaseMode): LlmProvider {
  if (mode === "grok") return new GrokProvider();
  if (mode === "local") return new LocalProvider();
  if (mode === "0g") return new OgProvider();
  throw new ProviderConfigurationError("Rules mode does not use an LLM provider.");
}
