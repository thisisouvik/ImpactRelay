// Explicit live checks, separate from the offline test suite. Never print secrets.
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { Redis } from "@upstash/redis";

const flags = new Set(process.argv.slice(2));
const allowedFlags = new Set(["--infer", "--production"]);
if ([...flags].some((flag) => !allowedFlags.has(flag))) {
  console.error("Usage: node scripts/check-integrations.mjs [--infer] [--production]");
  process.exit(2);
}

nextEnv.loadEnvConfig(process.cwd(), !flags.has("--production"), { info() {}, error() {} });
const results = {};
const configured = (name) => Boolean(process.env[name]?.trim());
const safeCode = (value) => typeof value === "string" && /^[a-z0-9_-]{1,60}$/i.test(value) ? value : undefined;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function checkGroq() {
  let apiKey = process.env.GROQ_API_KEY?.trim();
  let model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  if (!apiKey) return { status: "unconfigured", required: ["GROQ_API_KEY"] };
  const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
  try {
    const { response, body } = await request("https://api.groq.com/openai/v1/models", { headers });
    if (!response.ok) return { status: "failed", stage: "models", httpStatus: response.status, errorCode: safeCode(body?.error?.code) };
    const modelListed = Array.isArray(body?.data) && body.data.some((entry) => entry.id === model);
    const result = { status: modelListed ? "authenticated" : "model-unavailable", authentication: "ok", modelListed, inference: "not-requested", billing: "Not verifiable through this probe; check the account dashboard." };
    if (!flags.has("--infer")) return result;
    const completion = await request("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers,
      body: JSON.stringify({
        model, temperature: 0, max_completion_tokens: 256,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: 'Return only a JSON object with the boolean field "ok" set to true.' }],
      }),
    });
    const quota = {};
    for (const name of ["x-ratelimit-limit-requests", "x-ratelimit-limit-tokens", "x-ratelimit-remaining-requests", "x-ratelimit-remaining-tokens"]) {
      const value = completion.response.headers.get(name);
      if (value && /^\d+$/.test(value)) quota[name] = Number(value);
    }
    if (!completion.response.ok) return { ...result, status: "failed", inference: "failed", httpStatus: completion.response.status, errorCode: safeCode(completion.body?.error?.code), quota };
    let validJson = false;
    try { validJson = JSON.parse(completion.body?.choices?.[0]?.message?.content)?.ok === true; } catch { /* No response content is logged. */ }
    return { ...result, status: validJson ? "ok" : "failed", inference: validJson ? "json-validated" : "invalid-output", httpStatus: completion.response.status, quota };
  } catch {
    return { status: "failed", reason: "Network request failed or timed out; details withheld." };
  }
}

async function checkNeon() {
  if (!configured("DATABASE_URL")) return { status: "unconfigured", required: ["DATABASE_URL"] };
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql.query("SELECT 1 AS ok", [], { fetchOptions: { signal: AbortSignal.timeout(15_000) } });
    return { status: Number(rows[0]?.ok) === 1 ? "ok" : "failed", check: "read-only SELECT 1; does not verify schema or writes" };
  } catch {
    return { status: "failed", reason: "Database connection/query failed; details withheld." };
  }
}

async function checkRedis() {
  const required = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"].filter((name) => !configured(name));
  if (required.length) return { status: "unconfigured", required };
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: false,
      signal: AbortSignal.timeout(15_000),
    });
    const pong = await redis.ping();
    return { status: pong === "PONG" ? "ok" : "failed", check: "PING only; does not verify rate-limit enforcement" };
  } catch {
    return { status: "failed", reason: "Redis connection/authentication failed; details withheld." };
  }
}

results.groq = await checkGroq();
results.neon = await checkNeon();
results.redis = await checkRedis();
console.log(JSON.stringify(results, null, 2));
// A partial configuration must not look like a successful deployment gate.
if (Object.values(results).some((result) => result.status !== "ok" && result.status !== "authenticated")) process.exitCode = 1;
