import type {
  AgentPlan,
  CaseRecord,
  EvidenceItem,
  ReportDraft,
} from "@/lib/domain/schemas";

export type ProviderId = "grok" | "local" | "0g";

export type PlannerInput = {
  caseRecord: CaseRecord;
  availableToolIds: string[];
};

export type SynthesisInput = {
  caseRecord: CaseRecord;
  evidence: EvidenceItem[];
};

export interface LlmProvider {
  readonly id: ProviderId;
  plan(input: PlannerInput): Promise<AgentPlan>;
  summarize(input: SynthesisInput): Promise<ReportDraft>;
}

export class ProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: string,
    message: string,
    options: { retryable?: boolean; status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ProviderError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

export class ProviderConfigurationError extends ProviderError {
  constructor(message: string) {
    super("PROVIDER_CONFIGURATION_ERROR", message);
    this.name = "ProviderConfigurationError";
  }
}

export class ProviderOutputError extends ProviderError {
  constructor(message: string, cause?: unknown) {
    super("PROVIDER_INVALID_OUTPUT", message, { cause });
    this.name = "ProviderOutputError";
  }
}
