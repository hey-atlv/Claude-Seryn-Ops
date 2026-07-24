import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isRecordNotFound } from "./prisma-error";

// Envelope thống nhất cho mọi API: { success, data?, error? }

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const message = error.issues
      .map((i) =>
        i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message,
      )
      .join(" · ");
    return fail(message, 400);
  }
  if (isRecordNotFound(error)) {
    return fail("Không tìm thấy bản ghi", 404);
  }
  console.error("[API]", error);
  return fail("Lỗi hệ thống — thử lại sau", 500);
}
