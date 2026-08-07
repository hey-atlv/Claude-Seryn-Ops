import { describe, expect, it } from "vitest";
import type { SubItemRow, TaskRow } from "../src/lib/task-row";
import {
  buildTimelineRows,
  isImportantTask,
  monthDaysVN,
  progressPct,
} from "../src/lib/timeline-core";

// Giờ VN là UTC+7. Hai helper dưới viết thẳng ra dạng UTC để test không phụ
// thuộc TZ của máy chạy: 23:59:59 vẫn nằm trong ngày phía UTC (23:59 − 7h),
// còn 00:00 thì rơi về 17:00 của ngày liền trước.
const dayBefore = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Deadline 23:59:59 ngày `date` giờ VN — đúng cách TaskForm sinh ra */
const deadlineVN = (date: string) => `${date}T16:59:59.000Z`;
/** startDate 00:00 ngày `date` giờ VN */
const startVN = (date: string) => `${dayBefore(date)}T17:00:00.000Z`;

const sub = (
  id: string,
  title: string,
  status: string,
  deadline: string | null,
): SubItemRow => ({ id, title, status, deadline });

function task(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    title: overrides.id,
    type: "TASK",
    team: "DIGITAL",
    leaderId: null,
    leaderName: null,
    category: null,
    status: "TODO",
    startDate: null,
    deadline: null,
    priority: "NORMAL",
    revenueImpact: "MEDIUM",
    lastUpdateAt: null,
    lastUpdateNote: null,
    outputLink: null,
    note: null,
    hiddenAt: null,
    completedAt: null,
    createdAt: startVN("2026-08-01"),
    priorityScore: 0,
    alertStatus: "NO_DEADLINE",
    isSilent: false,
    subItems: [],
    ...overrides,
  };
}

describe("monthDaysVN", () => {
  it("đủ số ngày của tháng và đánh dấu cuối tuần", () => {
    const days = monthDaysVN(2026, 8);
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({
      key: "2026-08-01",
      day: 1,
      weekday: 6,
      weekend: true,
    }); // thứ 7
    expect(days[1]).toMatchObject({ weekday: 0, weekend: true }); // 2/8 chủ nhật
    expect(days[2]).toMatchObject({ weekday: 1, weekend: false }); // 3/8 thứ 2
    expect(days[30].key).toBe("2026-08-31");
  });

  it("tháng 2 phân biệt năm nhuận", () => {
    expect(monthDaysVN(2028, 2)).toHaveLength(29);
    expect(monthDaysVN(2026, 2)).toHaveLength(28);
  });
});

describe("isImportantTask", () => {
  it("dự án và việc Critical/High là quan trọng", () => {
    expect(isImportantTask(task({ id: "a", type: "PROJECT" }))).toBe(true);
    expect(isImportantTask(task({ id: "b", priority: "CRITICAL" }))).toBe(true);
    expect(isImportantTask(task({ id: "c", priority: "HIGH" }))).toBe(true);
  });

  it("việc thường thì không", () => {
    expect(isImportantTask(task({ id: "d" }))).toBe(false);
  });
});

describe("progressPct", () => {
  it("việc đã xong luôn 100%", () => {
    expect(progressPct(task({ id: "a", status: "DONE" }))).toBe(100);
  });

  it("có giai đoạn con thì đếm theo giai đoạn, không theo trạng thái cha", () => {
    const project = task({
      id: "p",
      type: "PROJECT",
      status: "IN_PROGRESS",
      subItems: [
        sub("s1", "Giai đoạn 1", "DONE", null),
        sub("s2", "Giai đoạn 2", "DONE", null),
        sub("s3", "Giai đoạn 3", "TODO", null),
        sub("s4", "Giai đoạn 4", "TODO", null),
      ],
    });
    expect(progressPct(project)).toBe(50);
  });

  it("việc lẻ suy từ trạng thái", () => {
    expect(progressPct(task({ id: "a", status: "TODO" }))).toBe(0);
    expect(progressPct(task({ id: "b", status: "IN_PROGRESS" }))).toBe(45);
    expect(progressPct(task({ id: "c", status: "REVIEW" }))).toBe(80);
  });
});

describe("buildTimelineRows — chọn việc lên biểu đồ", () => {
  it("bỏ việc không có mốc kế hoạch nào (ngày tạo một mình không tính)", () => {
    expect(buildTimelineRows([task({ id: "trống" })], 2026, 8)).toHaveLength(0);
  });

  it("bỏ việc không giao với tháng đang xem", () => {
    const rows = buildTimelineRows(
      [
        task({
          id: "thang-7",
          startDate: startVN("2026-07-05"),
          deadline: deadlineVN("2026-07-20"),
        }),
        task({
          id: "thang-9",
          startDate: startVN("2026-09-02"),
          deadline: deadlineVN("2026-09-09"),
        }),
      ],
      2026,
      8,
    );
    expect(rows).toHaveLength(0);
  });

  it("importantOnly lọc còn dự án + Critical/High", () => {
    const tasks = [
      task({ id: "duan", type: "PROJECT", deadline: deadlineVN("2026-08-20") }),
      task({ id: "gap", priority: "CRITICAL", deadline: deadlineVN("2026-08-12") }),
      task({ id: "thuong", deadline: deadlineVN("2026-08-15") }),
    ];
    const important = buildTimelineRows(tasks, 2026, 8, { importantOnly: true });
    expect(important.map((r) => r.task.id).sort()).toEqual(["duan", "gap"]);
    expect(buildTimelineRows(tasks, 2026, 8)).toHaveLength(3);
  });

  it("dự án chỉ có hạn ở giai đoạn con vẫn lên biểu đồ", () => {
    const [row] = buildTimelineRows(
      [
        task({
          id: "duan",
          type: "PROJECT",
          createdAt: startVN("2026-08-03"),
          subItems: [
            sub("s1", "Chốt brief", "DONE", deadlineVN("2026-08-10")),
            sub("s2", "Bàn giao", "TODO", deadlineVN("2026-08-25")),
          ],
        }),
      ],
      2026,
      8,
    );
    // bắt đầu = ngày tạo (3/8 → cột 2), kết thúc = mốc con muộn nhất (25/8 → cột 24)
    expect(row.bar.startIndex).toBe(2);
    expect(row.bar.endIndex).toBe(24);
    expect(row.bar.inferredStart).toBe(true);
  });
});

describe("buildTimelineRows — vị trí thanh", () => {
  it("startDate → deadline cho đúng cột đầu và cột cuối (tính cả ngày hạn)", () => {
    const [row] = buildTimelineRows(
      [
        task({
          id: "a",
          startDate: startVN("2026-08-05"),
          deadline: deadlineVN("2026-08-14"),
        }),
      ],
      2026,
      8,
    );
    expect(row.bar.startIndex).toBe(4);
    expect(row.bar.endIndex).toBe(13);
    expect(row.bar.clippedStart).toBe(false);
    expect(row.bar.clippedEnd).toBe(false);
    expect(row.bar.inferredStart).toBe(false);
  });

  it("việc tràn hai đầu bị cắt vào tháng và được đánh dấu", () => {
    const [row] = buildTimelineRows(
      [
        task({
          id: "dai",
          startDate: startVN("2026-07-15"),
          deadline: deadlineVN("2026-09-10"),
        }),
      ],
      2026,
      8,
    );
    expect(row.bar.startIndex).toBe(0);
    expect(row.bar.endIndex).toBe(30);
    expect(row.bar.clippedStart).toBe(true);
    expect(row.bar.clippedEnd).toBe(true);
    // mốc thật vẫn giữ nguyên để tooltip nói đúng
    expect(row.bar.startKey).toBe("2026-07-15");
    expect(row.bar.endKey).toBe("2026-09-10");
  });

  it("chưa điền ngày bắt đầu thì lùi về ngày tạo", () => {
    const [row] = buildTimelineRows(
      [
        task({
          id: "a",
          createdAt: startVN("2026-08-06"),
          deadline: deadlineVN("2026-08-18"),
        }),
      ],
      2026,
      8,
    );
    expect(row.bar.startIndex).toBe(5);
    expect(row.bar.endIndex).toBe(17);
    expect(row.bar.inferredStart).toBe(true);
  });

  it("việc nhập sau khi đã quá hạn cho thanh 1 ngày ở đúng deadline", () => {
    const [row] = buildTimelineRows(
      [
        task({
          id: "tre",
          createdAt: startVN("2026-08-25"),
          deadline: deadlineVN("2026-08-10"),
        }),
      ],
      2026,
      8,
    );
    expect(row.bar.startIndex).toBe(9);
    expect(row.bar.endIndex).toBe(9);
  });

  it("có ngày bắt đầu nhưng chưa có hạn cho thanh 1 ngày ở mốc bắt đầu", () => {
    const [row] = buildTimelineRows(
      [task({ id: "a", startDate: startVN("2026-08-07") })],
      2026,
      8,
    );
    expect(row.bar.startIndex).toBe(6);
    expect(row.bar.endIndex).toBe(6);
  });

  it("deadline sớm hơn ngày bắt đầu không cho thanh ngược", () => {
    const [row] = buildTimelineRows(
      [
        task({
          id: "a",
          startDate: startVN("2026-08-20"),
          deadline: deadlineVN("2026-08-05"),
        }),
      ],
      2026,
      8,
    );
    expect(row.bar.startIndex).toBe(19);
    expect(row.bar.endIndex).toBe(19);
  });
});

describe("buildTimelineRows — mốc giai đoạn và thứ tự", () => {
  it("chỉ lấy giai đoạn con có hạn rơi trong tháng, xếp theo ngày", () => {
    const [row] = buildTimelineRows(
      [
        task({
          id: "duan",
          type: "PROJECT",
          startDate: startVN("2026-08-01"),
          deadline: deadlineVN("2026-08-31"),
          subItems: [
            sub("s3", "Bàn giao", "TODO", deadlineVN("2026-08-28")),
            sub("s1", "Chốt brief", "DONE", deadlineVN("2026-08-06")),
            sub("s0", "Ngoài tháng", "TODO", deadlineVN("2026-09-04")),
            sub("sx", "Không hạn", "TODO", null),
          ],
        }),
      ],
      2026,
      8,
    );
    expect(row.milestones.map((m) => m.id)).toEqual(["s1", "s3"]);
    expect(row.milestones[0]).toMatchObject({ index: 5, done: true });
    expect(row.milestones[1]).toMatchObject({ index: 27, done: false });
  });

  it("xếp việc bắt đầu sớm lên trước, cùng ngày thì kết thúc sớm trước", () => {
    const rows = buildTimelineRows(
      [
        task({
          id: "c",
          startDate: startVN("2026-08-10"),
          deadline: deadlineVN("2026-08-20"),
        }),
        task({
          id: "a",
          startDate: startVN("2026-08-02"),
          deadline: deadlineVN("2026-08-28"),
        }),
        task({
          id: "b",
          startDate: startVN("2026-08-10"),
          deadline: deadlineVN("2026-08-12"),
        }),
      ],
      2026,
      8,
    );
    expect(rows.map((r) => r.task.id)).toEqual(["a", "b", "c"]);
  });

  it("không sửa mảng đầu vào", () => {
    const tasks = [
      task({ id: "c", startDate: startVN("2026-08-10") }),
      task({ id: "a", startDate: startVN("2026-08-02") }),
    ];
    buildTimelineRows(tasks, 2026, 8);
    expect(tasks.map((t) => t.id)).toEqual(["c", "a"]);
  });
});
