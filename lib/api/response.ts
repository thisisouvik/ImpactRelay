import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function errorResponse(error: unknown, fallbackCode = "INTERNAL_ERROR", status = 500) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request did not satisfy the required schema.",
          issues: error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  const message = error instanceof Error ? error.message : "The request could not be completed.";
  return NextResponse.json(
    { error: { code: fallbackCode, message } },
    { status },
  );
}

export function notFoundResponse(resource: string) {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: `${resource} was not found.` } },
    { status: 404 },
  );
}
