import { ProviderConfigurationError, type LlmProvider, type PlannerInput, type SynthesisInput } from "@/lib/ai/types";
import { chatCompletionsEndpoint, parseJsonContent, requestChatCompletion } from "@/lib/ai/http";
import { normalizeProviderPlan, normalizeProviderReport } from "@/lib/ai/guardrails";
import { PLANNER_SYSTEM_PROMPT, plannerUserPrompt, SYNTHESIS_SYSTEM_PROMPT, synthesisUserPrompt } from "@/lib/ai/prompts";

export class GrokProvider implements LlmProvider {
  readonly id = "grok" as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;
  private readonly fetcher?: typeof fetch;

  constructor(options: { apiKey?: string; model?: string; baseUrl?: string; fetcher?: typeof fetch } = {}) {
    this.apiKey = options.apiKey ?? process.env.XAI_API_KEY ?? "";
    this.model = options.model ?? process.env.XAI_MODEL ?? "";
    const baseUrl = options.baseUrl ?? process.env.XAI_BASE_URL ?? "https://api.x.ai/v1";
    if (!this.apiKey) throw new ProviderConfigurationError("XAI_API_KEY is required for Grok mode.");
    if (!this.model) throw new ProviderConfigurationError("XAI_MODEL is required for Grok mode.");
    this.endpoint = chatCompletionsEndpoint(baseUrl);
    this.fetcher = options.fetcher;
  }

  async plan(input: PlannerInput) {
    const content = await requestChatCompletion({
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      model: this.model,
      messages: [
        { role: "system", content: PLANNER_SYSTEM_PROMPT },
        { role: "user", content: plannerUserPrompt(input) },
      ],
      fetcher: this.fetcher,
    });
    return normalizeProviderPlan(parseJsonContent(content), {
      caseRecord: input.caseRecord,
      availableToolIds: input.availableToolIds,
      providerId: this.id,
    });
  }

  async summarize(input: SynthesisInput) {
    const content = await requestChatCompletion({
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      model: this.model,
      messages: [
        { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
        { role: "user", content: synthesisUserPrompt(input) },
      ],
      fetcher: this.fetcher,
    });
    return normalizeProviderReport(parseJsonContent(content), {
      evidenceIds: input.evidence.map((item) => item.id),
      providerId: this.id,
    });
  }
}
