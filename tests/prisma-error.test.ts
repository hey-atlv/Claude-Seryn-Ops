import { describe, expect, it } from "vitest";
import { isRecordNotFound } from "../src/lib/prisma-error";

describe("isRecordNotFound", () => {
  it("true đúng với lỗi Prisma P2025 (bản ghi không tồn tại)", () => {
    expect(isRecordNotFound({ code: "P2025" })).toBe(true);
  });

  it("false với lỗi Prisma khác — không được nuốt nhầm rồi báo thành công giả", () => {
    expect(isRecordNotFound({ code: "P2002" })).toBe(false); // unique constraint
    expect(isRecordNotFound({ code: "P1001" })).toBe(false); // không kết nối được DB
  });

  it("false với giá trị không phải lỗi có code (null/undefined/Error thường/chuỗi)", () => {
    expect(isRecordNotFound(null)).toBe(false);
    expect(isRecordNotFound(undefined)).toBe(false);
    expect(isRecordNotFound(new Error("boom"))).toBe(false);
    expect(isRecordNotFound("P2025")).toBe(false);
  });
});
