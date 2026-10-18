import { ProviderConfigurationError, type LlmProvider } from "@/lib/ai/types";
import { chatCompletionsEndpoint, parseJsonContent, requestChatCompletion } from "@/lib/ai/http";
import { normalizeProviderPlan, normalizeProviderReport } from "@/lib/ai/guardrails";
import { PLANNER_SYSTEM_PROMPT, plannerUserPrompt, SYNTHESIS_SYSTEM_PROMPT, synthesisUserPrompt } from "@/lib/ai/prompts";

export class LocalProvider implements LlmProvider {
  readonly id = "local" as const;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly fetcher?: typeof fetch;

  constructor(options: { baseUrl?: string; model?: string; fetcher?: typeof fetch } = {}) {
    const baseUrl = options.baseUrl ?? process.env.LOCAL_LLM_BASE_URL ?? "";
    this.model = options.model ?? process.env.LOCAL_LLM_MODEL ?? "";
    if (!baseUrl) throw new ProviderConfigurationError("LOCAL_LLM_BASE_URL is required for Local mode.");
    if (!this.model) throw new ProviderConfigurationError("LOCAL_LLM_MODEL is required for Local mode.");
    this.endpoint = chatCompletionsEndpoint(baseUrl);
    this.fetcher = options.fetcher;
  }

  async plan(input: Parameters<LlmProvider["plan"]>[0]) {
    const content = await requestChatCompletion({
      endpoint: this.endpoint,
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

  async summarize(input: Parameters<LlmProvider["summarize"]>[0]) {
    const content = await requestChatCompletion({
      endpoint: this.endpoint,
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
