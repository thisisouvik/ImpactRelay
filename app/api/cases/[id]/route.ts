import { NextResponse } from "next/server";
import { caseIdSchema } from "@/lib/domain/schemas";
import { errorResponse, notFoundResponse } from "@/lib/api/response";
import { getCaseRepository } from "@/lib/db/sqlite-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { caseId } = caseIdSchema.parse({ caseId: id });
    const found = getCaseRepository().getCase(caseId);
    return found ? NextResponse.json({ case: found }) : notFoundResponse("Case");
  } catch (error) {
    return errorResponse(error, "CASE_READ_FAILED");
  }
}
