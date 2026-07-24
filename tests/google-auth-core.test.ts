import { describe, expect, it } from "vitest";
import { tokensToAccountData } from "../src/lib/google-auth-core";

describe("tokensToAccountData", () => {
  it("LƯU refresh_token khi Google xoay vòng (chống mất uỷ quyền vĩnh viễn)", () => {
    const data = tokensToAccountData({
      access_token: "at-new",
      refresh_token: "rt-rotated",
      expiry_date: 1_800_000_000_000,
    });
    expect(data.refreshToken).toBe("rt-rotated");
    expect(data.accessToken).toBe("at-new");
    expect(data.accessTokenExpiry).toEqual(new Date(1_800_000_000_000));
  });

  it("bỏ qua refresh_token khi Google KHÔNG gửi (không ghi đè token cũ bằng undefined)", () => {
    const data = tokensToAccountData({
      access_token: "at-new",
      expiry_date: 1_800_000_000_000,
    });
    expect("refreshToken" in data).toBe(false);
    expect(data.accessToken).toBe("at-new");
  });

  it("bỏ qua các field null/undefined — chỉ đưa vào field có giá trị thật", () => {
    const data = tokensToAccountData({
      access_token: null,
      refresh_token: undefined,
      expiry_date: null,
    });
    expect(data).toEqual({});
  });

  it("tokens rỗng → {} để nơi gọi bỏ qua, không gọi update thừa", () => {
    expect(tokensToAccountData({})).toEqual({});
  });
});
