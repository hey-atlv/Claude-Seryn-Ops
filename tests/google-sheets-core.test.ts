import { describe, expect, it } from "vitest";
import { newSheetRows, rowToInboxText } from "../src/lib/google-sheets-core";

describe("newSheetRows", () => {
  it("bỏ header, lastRow=0 → lấy hết dòng dữ liệu", () => {
    const values = [
      ["Việc", "Deadline"],
      ["Gửi báo cáo", "20/08/2026"],
      ["Họp team", ""],
    ];
    expect(newSheetRows(values, 0)).toEqual([
      ["Gửi báo cáo", "20/08/2026"],
      ["Họp team", ""],
    ]);
  });

  it("lastRow=1 → chỉ lấy phần dư sau dòng đã import", () => {
    const values = [
      ["Việc", "Deadline"],
      ["Gửi báo cáo", "20/08/2026"],
      ["Họp team", ""],
    ];
    expect(newSheetRows(values, 1)).toEqual([["Họp team", ""]]);
  });

  it("chỉ có header hoặc rỗng → mảng rỗng", () => {
    expect(newSheetRows([["Việc", "Deadline"]], 0)).toEqual([]);
    expect(newSheetRows([], 0)).toEqual([]);
  });

  it("lastRow bằng hoặc vượt số dòng dữ liệu → mảng rỗng", () => {
    const values = [
      ["Việc"],
      ["A"],
      ["B"],
    ];
    expect(newSheetRows(values, 5)).toEqual([]);
  });
});

describe("rowToInboxText", () => {
  it("nối các ô không rỗng bằng ' | '", () => {
    expect(rowToInboxText(["Gửi báo cáo", "20/08/2026"])).toBe(
      "Gửi báo cáo | 20/08/2026",
    );
  });

  it("bỏ ô rỗng ở giữa", () => {
    expect(rowToInboxText(["Việc A", "", "Ghi chú"])).toBe("Việc A | Ghi chú");
  });

  it("dòng toàn rỗng/khoảng trắng → null", () => {
    expect(rowToInboxText(["", "  ", ""])).toBeNull();
    expect(rowToInboxText([])).toBeNull();
  });
});
