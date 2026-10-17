import { NextResponse } from "next/server";
import { caseIdSchema } from "@/lib/domain/schemas";
import { getCaseRepository } from "@/lib/db/sqlite-repository";
import { notFoundResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { caseId } = caseIdSchema.parse({ caseId: id });
    const record = getCaseRepository().getCase(caseId);
    if (!record) return notFoundResponse("Case");

    const format = new URL(request.url).searchParams.get("format") ?? "json";
    if (format !== "json") {
      return NextResponse.json(
        { error: { code: "UNSUPPORTED_EXPORT_FORMAT", message: "Only JSON export is available in this phase." } },
        { status: 400 },
      );
    }

    return new NextResponse(JSON.stringify(record, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="impactrelay-${record.id}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error, "CASE_EXPORT_FAILED");
  }
}
