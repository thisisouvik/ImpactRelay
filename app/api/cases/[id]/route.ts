import { NextResponse } from "next/server";
import { caseIdSchema } from "@/lib/domain/schemas";
import { errorResponse, notFoundResponse } from "@/lib/api/response";
import { getProductionCaseRepository } from "@/lib/db/neon-repository";
import { sessionHashFromRequest } from "@/lib/security/case-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { caseId } = caseIdSchema.parse({ caseId: id });
    const ownerTokenHash = sessionHashFromRequest(_request);
    if (!ownerTokenHash) return notFoundResponse("Case");
    const found = await getProductionCaseRepository().getCase(caseId, ownerTokenHash);
    return found ? NextResponse.json({ case: found }, { headers: { "cache-control": "no-store" } }) : notFoundResponse("Case");
  } catch (error) {
    return errorResponse(error, "CASE_READ_FAILED");
  }
}
