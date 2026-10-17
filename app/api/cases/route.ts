import { NextResponse } from "next/server";
import { caseRequestSchema } from "@/lib/domain/schemas";
import { errorResponse } from "@/lib/api/response";
import { getCaseRepository } from "@/lib/db/sqlite-repository";

export async function POST(request: Request) {
  try {
    const input = caseRequestSchema.parse(await request.json());
    const created = getCaseRepository().createCase(input);
    return NextResponse.json({ case: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "CASE_CREATE_FAILED");
  }
}
