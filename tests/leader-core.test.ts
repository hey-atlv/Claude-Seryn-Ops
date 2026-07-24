import { describe, expect, it } from "vitest";
import { leaderLabel } from "../src/lib/leader-core";

describe("leaderLabel", () => {
  it("leader Digital có kênh → 'Tên · Nhãn kênh'", () => {
    expect(leaderLabel({ name: "Ánh", channel: "FACEBOOK" })).toBe("Ánh · Facebook");
    expect(leaderLabel({ name: "Toàn", channel: "ZALO" })).toBe("Toàn · Zalo");
    expect(leaderLabel({ name: "Chung", channel: "GOOGLE" })).toBe("Chung · Google");
  });

  it("team không chia kênh (channel null/undefined) → chỉ tên", () => {
    expect(leaderLabel({ name: "Leader Content", channel: null })).toBe("Leader Content");
    expect(leaderLabel({ name: "Leader TVOL" })).toBe("Leader TVOL");
  });

  it("channel lạ không có trong CHANNEL_LABELS → chỉ tên (không vỡ)", () => {
    expect(leaderLabel({ name: "X", channel: "TIKTOK" })).toBe("X");
  });
});
