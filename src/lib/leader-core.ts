import { CHANNEL_LABELS, type Channel } from "./constants";

// Nhãn hiển thị leader dùng chung mọi nơi (ô chọn leader, dòng task, tóm tắt).
// Digital có kênh → "Ánh · Facebook"; team khác (channel null) → chỉ tên.
export function leaderLabel(leader: {
  name: string;
  channel?: string | null;
}): string {
  const { name, channel } = leader;
  if (channel && channel in CHANNEL_LABELS) {
    return `${name} · ${CHANNEL_LABELS[channel as Channel]}`;
  }
  return name;
}
