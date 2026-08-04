import { describe, expect, it } from "vitest";
import { canHide, isHidden, splitHidden } from "../src/lib/task-hidden";

const task = (id: string, status: string, hiddenAt: string | null = null) => ({
  id,
  status,
  hiddenAt,
});

describe("isHidden / canHide", () => {
  it("có mốc hiddenAt là đã ẩn, null là đang hiện", () => {
    expect(isHidden(task("a", "DONE", "2026-08-01T00:00:00.000Z"))).toBe(true);
    expect(isHidden(task("b", "DONE"))).toBe(false);
  });

  it("chỉ việc đã xong mới cho ẩn", () => {
    expect(canHide(task("a", "DONE"))).toBe(true);
    expect(canHide(task("b", "TODO"))).toBe(false);
    expect(canHide(task("c", "IN_PROGRESS"))).toBe(false);
    expect(canHide(task("d", "REVIEW"))).toBe(false);
  });

  it("việc đã ẩn rồi thì không mời ẩn lần nữa", () => {
    expect(canHide(task("a", "DONE", "2026-08-01T00:00:00.000Z"))).toBe(false);
  });
});

describe("splitHidden", () => {
  it("tách đúng hai nhóm và không làm mất task nào", () => {
    const tasks = [
      task("a", "TODO"),
      task("b", "DONE", "2026-08-01T00:00:00.000Z"),
      task("c", "DONE"),
    ];
    const { visible, hidden } = splitHidden(tasks);
    expect(visible.map((t) => t.id)).toEqual(["a", "c"]);
    expect(hidden.map((t) => t.id)).toEqual(["b"]);
    expect(visible.length + hidden.length).toBe(tasks.length);
  });

  it("phần đã ẩn xếp việc vừa ẩn lên đầu", () => {
    const { hidden } = splitHidden([
      task("cũ", "DONE", "2026-07-01T00:00:00.000Z"),
      task("mới", "DONE", "2026-08-01T00:00:00.000Z"),
      task("giữa", "DONE", "2026-07-20T00:00:00.000Z"),
    ]);
    expect(hidden.map((t) => t.id)).toEqual(["mới", "giữa", "cũ"]);
  });

  it("giữ nguyên thứ tự đầu vào của phần đang hiện", () => {
    const { visible } = splitHidden([
      task("z", "DONE"),
      task("y", "TODO"),
      task("x", "REVIEW"),
    ]);
    expect(visible.map((t) => t.id)).toEqual(["z", "y", "x"]);
  });

  it("không sửa mảng đầu vào", () => {
    const tasks = [
      task("cũ", "DONE", "2026-07-01T00:00:00.000Z"),
      task("mới", "DONE", "2026-08-01T00:00:00.000Z"),
    ];
    splitHidden(tasks);
    expect(tasks.map((t) => t.id)).toEqual(["cũ", "mới"]);
  });

  it("mảng rỗng cho hai nhóm rỗng", () => {
    expect(splitHidden([])).toEqual({ visible: [], hidden: [] });
  });
});
