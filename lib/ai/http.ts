import { z } from "zod";
import { ProviderError, ProviderOutputError } from "@/lib/ai/types";

const chatCompletionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string(),
    }).passthrough(),
  }).passthrough()).min(1),
}).passthrough();

const MAX_RESPONSE_BYTES = 150_000;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 2;

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletionRequest = {
  endpoint: string;
  apiKey?: string;
  model: string;
  messages: ChatMessage[];
  fetcher?: typeof fetch;
  extraHeaders?: Record<string, string>;
};

function retryDelay(attempt: number) {
  return 250 * attempt;
}

function endpointFromBase(baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return base;
  if (base.endsWith("/v1")) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

export function chatCompletionsEndpoint(baseUrl: string) {
  return endpointFromBase(baseUrl);
}

async function readBody(response: Response) {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
    throw new ProviderError("PROVIDER_RESPONSE_TOO_LARGE", "The provider response exceeded the configured size limit.");
  }
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
    throw new ProviderError("PROVIDER_RESPONSE_TOO_LARGE", "The provider response exceeded the configured size limit.");
  }
  return body;
}

export async function requestChatCompletion(input: ChatCompletionRequest) {
  const fetcher = input.fetcher ?? fetch;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetcher(input.endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(input.apiKey ? { authorization: `Bearer ${input.apiKey}` } : {}),
          ...input.extraHeaders,
        },
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
          temperature: 0,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      const body = await readBody(response);
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        const error = new ProviderError(
          response.status === 429 ? "PROVIDER_RATE_LIMITED" : "PROVIDER_HTTP_ERROR",
          `The provider returned HTTP ${response.status}.`,
          { retryable, status: response.status },
        );
        if (!retryable || attempt === MAX_ATTEMPTS) throw error;
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch (error) {
        throw new ProviderOutputError("The provider returned invalid JSON.", error);
      }

      const completion = chatCompletionSchema.safeParse(parsed);
      if (!completion.success) {
        throw new ProviderOutputError("The provider response did not contain a valid chat completion.", completion.error);
      }
      return completion.data.choices[0].message.content;
    } catch (error) {
      const providerError = error instanceof ProviderError
        ? error
        : new ProviderError(
          "PROVIDER_NETWORK_ERROR",
          error instanceof Error && error.name === "AbortError"
            ? "The provider request timed out."
            : "The provider request failed before returning a response.",
          { retryable: true, cause: error },
        );
      lastError = providerError;
      if (!providerError.retryable || attempt === MAX_ATTEMPTS) throw providerError;
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new ProviderError("PROVIDER_REQUEST_FAILED", "The provider request failed.");
}

export function parseJsonContent(content: string) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as unknown;
  } catch (error) {
    throw new ProviderOutputError("The provider returned content that was not valid JSON.", error);
  }
}
