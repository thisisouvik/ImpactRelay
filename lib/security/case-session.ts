import { createHash, randomBytes } from "node:crypto";

export const CASE_SESSION_COOKIE = "impactrelay_session";

export function createCaseSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCaseSession(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readCaseSession(request: Request) {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  const entry = cookies.map((cookie) => cookie.trim().split("=", 2)).find(([name]) => name === CASE_SESSION_COOKIE);
  return entry?.[1] ? decodeURIComponent(entry[1]) : undefined;
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CASE_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
}

export function sessionHashFromRequest(request: Request) {
  const token = readCaseSession(request);
  return token ? hashCaseSession(token) : undefined;
}
