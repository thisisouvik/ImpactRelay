import { ProviderConfigurationError, type LlmProvider, type PlannerInput, type SynthesisInput } from "@/lib/ai/types";
import { chatCompletionsEndpoint, parseJsonContent, requestChatCompletion } from "@/lib/ai/http";
import { normalizeProviderPlan, normalizeProviderReport } from "@/lib/ai/guardrails";
import { PLANNER_SYSTEM_PROMPT, plannerUserPrompt, SYNTHESIS_SYSTEM_PROMPT, synthesisUserPrompt } from "@/lib/ai/prompts";

export class OgProvider implements LlmProvider {
  readonly id = "0g" as const;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetcher?: typeof fetch;

  constructor(options: { baseUrl?: string; apiKey?: string; model?: string; fetcher?: typeof fetch } = {}) {
    const baseUrl = options.baseUrl ?? process.env.OG_COMPUTE_BASE_URL ?? "https://router-api.0g.ai/v1";
    this.apiKey = options.apiKey ?? process.env.OG_COMPUTE_API_KEY ?? "";
    this.model = options.model ?? process.env.OG_COMPUTE_MODEL ?? "";
    if (!this.apiKey) throw new ProviderConfigurationError("OG_COMPUTE_API_KEY is required for 0G mode.");
    if (!this.model) throw new ProviderConfigurationError("OG_COMPUTE_MODEL is required for 0G mode.");
    this.endpoint = chatCompletionsEndpoint(baseUrl);
    this.fetcher = options.fetcher;
  }

  private headers() {
    const trustMode = process.env.OG_COMPUTE_TRUST_MODE;
    return trustMode ? { "X-0G-Provider-Trust-Mode": trustMode } : undefined;
  }

  async plan(input: PlannerInput) {
    const content = await requestChatCompletion({ endpoint: this.endpoint, apiKey: this.apiKey, model: this.model, extraHeaders: this.headers(), messages: [{ role: "system", content: PLANNER_SYSTEM_PROMPT }, { role: "user", content: plannerUserPrompt(input) }], fetcher: this.fetcher });
    return normalizeProviderPlan(parseJsonContent(content), { caseRecord: input.caseRecord, availableToolIds: input.availableToolIds, providerId: this.id });
  }

  async summarize(input: SynthesisInput) {
    const content = await requestChatCompletion({ endpoint: this.endpoint, apiKey: this.apiKey, model: this.model, extraHeaders: this.headers(), messages: [{ role: "system", content: SYNTHESIS_SYSTEM_PROMPT }, { role: "user", content: synthesisUserPrompt(input) }], fetcher: this.fetcher });
    return normalizeProviderReport(parseJsonContent(content), { evidenceIds: input.evidence.map((item) => item.id), providerId: this.id });
  }
}
