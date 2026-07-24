import { describe, expect, test } from "vitest";
import {
  IDEA_PROMOTABLE_FROM,
  IDEA_STATUSES,
  IDEA_STATUS_FLOW,
  IDEA_STATUS_LABELS,
  type IdeaStatus,
} from "../src/lib/constants";
import {
  IDEA_BUCKETS,
  IDEA_BUCKET_META,
  classifyIdea,
  clampScale,
  ideaScore,
} from "../src/lib/idea-score";
import {
  dependencyUpdateSchema,
  ideaCreateSchema,
  ideaUpdateSchema,
  noteUpdateSchema,
  reportUpdateSchema,
  sopUpdateSchema,
  taskUpdateSchema,
} from "../src/lib/validation";

describe("clampScale", () => {
  test("giữ nguyên giá trị đã nằm trong thang 1..5", () => {
    expect(clampScale(3)).toBe(3);
  });

  test("kẹp giá trị vượt trần về 5", () => {
    expect(clampScale(99)).toBe(5);
  });

  test("kẹp giá trị dưới sàn về 1", () => {
    expect(clampScale(0)).toBe(1);
    expect(clampScale(-4)).toBe(1);
  });

  test("trả về sàn khi gặp giá trị không phải số hữu hạn", () => {
    expect(clampScale(Number.NaN)).toBe(1);
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clampScale(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});

describe("ideaScore", () => {
  test("điểm là tỉ lệ giá trị trên công sức", () => {
    // Arrange
    const idea = { impact: 4, effort: 2 };

    // Act
    const score = ideaScore(idea);

    // Assert
    expect(score).toBe(2);
  });

  test("làm tròn 2 số lẻ", () => {
    expect(ideaScore({ impact: 1, effort: 3 })).toBe(0.33);
  });

  test("không chia cho 0 kể cả khi effort là 0", () => {
    // effort 0 bị kẹp lên 1 → điểm bằng chính impact, không ra Infinity
    expect(ideaScore({ impact: 5, effort: 0 })).toBe(5);
    expect(Number.isFinite(ideaScore({ impact: 5, effort: 0 }))).toBe(true);
  });

  test("ý tưởng giá trị cao tốn ít có điểm cao hơn ý tưởng nặng", () => {
    expect(ideaScore({ impact: 5, effort: 1 })).toBeGreaterThan(
      ideaScore({ impact: 5, effort: 5 }),
    );
  });
});

describe("classifyIdea", () => {
  test("giá trị cao + công sức nhẹ là QUICK_WIN", () => {
    expect(classifyIdea({ impact: 5, effort: 1 })).toBe("QUICK_WIN");
    expect(classifyIdea({ impact: 4, effort: 2 })).toBe("QUICK_WIN");
  });

  test("giá trị cao + công sức nặng là BIG_BET", () => {
    expect(classifyIdea({ impact: 5, effort: 5 })).toBe("BIG_BET");
    expect(classifyIdea({ impact: 4, effort: 3 })).toBe("BIG_BET");
  });

  test("giá trị thấp + công sức nhẹ là FILL_IN", () => {
    expect(classifyIdea({ impact: 2, effort: 1 })).toBe("FILL_IN");
  });

  test("giá trị thấp + công sức nặng là MONEY_PIT", () => {
    expect(classifyIdea({ impact: 1, effort: 5 })).toBe("MONEY_PIT");
    expect(classifyIdea({ impact: 3, effort: 3 })).toBe("MONEY_PIT");
  });

  test("mọi góc phần tư đều có nhãn hiển thị", () => {
    for (const bucket of IDEA_BUCKETS) {
      expect(IDEA_BUCKET_META[bucket].title.length).toBeGreaterThan(0);
      expect(IDEA_BUCKET_META[bucket].hint.length).toBeGreaterThan(0);
    }
  });
});

// Hồi quy: shape.partial() KHÔNG gỡ .default(), nên PATCH thiếu field từng
// âm thầm ghi đè dữ liệu người dùng về mặc định (điểm ý tưởng về 3, trạng thái
// task về TODO, độ ưu tiên về NORMAL...). patchSchemaOf() phải chặn được.
describe("schema PATCH không được tự điền giá trị mặc định", () => {
  test("PATCH ý tưởng chỉ đổi trạng thái, không đụng điểm đã chấm", () => {
    // Arrange — người dùng đã chấm 5/1, giờ chỉ bấm nút duyệt
    const body = { status: "APPROVED" };

    // Act
    const parsed = ideaUpdateSchema.parse(body);

    // Assert — không có impact/effort thì không được ghi gì vào 2 cột đó
    expect(parsed).toEqual({ status: "APPROVED" });
    expect(parsed).not.toHaveProperty("impact");
    expect(parsed).not.toHaveProperty("effort");
  });

  test("PATCH task chỉ đổi tiêu đề, không reset trạng thái/ưu tiên", () => {
    const parsed = taskUpdateSchema.parse({ title: "Đổi tên việc" });

    expect(parsed).toEqual({ title: "Đổi tên việc" });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("priority");
    expect(parsed).not.toHaveProperty("revenueImpact");
    expect(parsed).not.toHaveProperty("type");
  });

  test("PATCH task chỉ chốt xong, không hạ ưu tiên đang Critical", () => {
    const parsed = taskUpdateSchema.parse({ status: "DONE" });

    expect(parsed).toEqual({ status: "DONE" });
  });

  test("các schema PATCH còn lại cũng không chèn mặc định", () => {
    expect(dependencyUpdateSchema.parse({ title: "X" })).toEqual({ title: "X" });
    expect(reportUpdateSchema.parse({ title: "Y" })).toEqual({ title: "Y" });
    expect(sopUpdateSchema.parse({ title: "Z" })).toEqual({ title: "Z" });
    expect(noteUpdateSchema.parse({ pinned: true })).toEqual({ pinned: true });
  });

  test("schema TẠO MỚI vẫn giữ mặc định như cũ", () => {
    const parsed = ideaCreateSchema.parse({ title: "Ý tưởng mới" });

    expect(parsed.status).toBe("NEW");
    expect(parsed.impact).toBe(3);
    expect(parsed.effort).toBe(3);
  });

  test("PATCH vẫn chặn giá trị sai thang", () => {
    expect(() => ideaUpdateSchema.parse({ impact: 9 })).toThrow();
    expect(() => ideaUpdateSchema.parse({ effort: 0 })).toThrow();
  });
});

describe("luồng trạng thái ý tưởng", () => {
  test("mọi trạng thái đều có nhãn tiếng Việt", () => {
    for (const status of IDEA_STATUSES) {
      expect(IDEA_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  test("chỉ đi được sang trạng thái nằm trong danh sách cho phép", () => {
    expect(IDEA_STATUS_FLOW.NEW).toContain("VALIDATING");
    expect(IDEA_STATUS_FLOW.NEW).not.toContain("PROJECT");
  });

  test("chỉ trạng thái đã duyệt mới sinh được dự án", () => {
    // Arrange — quét toàn bộ trạng thái, xem cái nào đi thẳng sang PROJECT
    const canPromote = IDEA_STATUSES.filter((status) =>
      IDEA_STATUS_FLOW[status].includes("PROJECT"),
    );

    // Assert
    expect(canPromote).toEqual([IDEA_PROMOTABLE_FROM]);
  });

  test("PROJECT là trạng thái khép — không đi tiếp đâu được", () => {
    expect(IDEA_STATUS_FLOW.PROJECT).toEqual([]);
  });

  test("mọi đích đến đều là trạng thái hợp lệ", () => {
    const valid = new Set<string>(IDEA_STATUSES);
    for (const status of IDEA_STATUSES) {
      for (const next of IDEA_STATUS_FLOW[status as IdeaStatus]) {
        expect(valid.has(next)).toBe(true);
      }
    }
  });
});
