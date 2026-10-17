import { errorResponse } from "@/lib/api/response";

export async function POST() {
  return errorResponse(
    new Error("No approval target exists yet. Payment approval is added with the real paid tool in Phase 5."),
    "APPROVAL_NOT_AVAILABLE",
    409,
  );
}
