import {
  CATEGORY_BY_TEAM,
  PRIORITIES,
  REVENUE_IMPACTS,
  TASK_STATUSES,
  TEAM_LABELS,
  TEAMS,
  type Priority,
  type RevenueImpact,
  type TaskStatus,
  type TaskType,
  type Team,
} from "./constants";

// G1 — Lõi thuần cho import CSV từ Google Sheets cũ (có test, không đụng DB):
// parse CSV → đoán mapping cột theo tên header → chuyển giá trị tiếng Việt
// sang enum hệ thống → dựng bản nháp task + lỗi/cảnh báo từng dòng.

// ---------- 1. Parse CSV ----------

/** Parse CSV chuẩn RFC 4180: field trong nháy kép, "" là nháy escape, CRLF/LF. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, ""); // bỏ BOM của file xuất từ Excel/Sheets
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Bỏ các dòng trống hoàn toàn (Sheets hay xuất thừa dòng cuối)
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ---------- 2. Mapping cột ----------

export const IMPORT_FIELDS = [
  "title",
  "type",
  "team",
  "leader",
  "category",
  "status",
  "deadline",
  "priority",
  "revenueImpact",
  "outputLink",
  "note",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  title: "Tên việc *",
  type: "Loại (Task/Project)",
  team: "Team *",
  leader: "Leader (theo tên)",
  category: "Nhóm việc",
  status: "Trạng thái",
  deadline: "Deadline",
  priority: "Ưu tiên",
  revenueImpact: "Ảnh hưởng doanh thu",
  outputLink: "Link output",
  note: "Ghi chú",
};

/** Chuẩn hóa để so khớp: thường hóa, bỏ dấu tiếng Việt, bỏ ký tự không chữ/số. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_HINTS: Record<ImportField, string[]> = {
  title: ["tenviec", "tencongviec", "congviec", "task", "title", "noidung"],
  type: ["loai", "type"],
  team: ["team", "doi", "phongban", "bophan"],
  leader: ["leader", "phutrach", "nguoiphutrach", "pic", "nguoilam"],
  category: ["nhomviec", "nhom", "category"],
  status: ["trangthai", "tinhtrang", "status"],
  deadline: ["deadline", "hanchot", "han", "duedate", "ngayhethan", "ngayhan"],
  priority: ["uutien", "priority", "mucdouutien"],
  revenueImpact: ["anhhuongdoanhthu", "doanhthu", "impact", "revenueimpact"],
  outputLink: ["linkoutput", "outputlink", "link", "url"],
  note: ["ghichu", "note"],
};

/** Đoán field cho 1 header; null = không nhận ra (người dùng tự chọn). */
export function guessField(header: string): ImportField | null {
  const n = normalize(header);
  if (!n) return null;
  for (const field of IMPORT_FIELDS) {
    if (HEADER_HINTS[field].some((h) => n === h)) return field;
  }
  for (const field of IMPORT_FIELDS) {
    if (HEADER_HINTS[field].some((h) => n.includes(h))) return field;
  }
  return null;
}

/** Đoán mapping cho cả hàng header; mỗi field chỉ gán cho 1 cột (cột đầu thắng). */
export function guessMapping(headers: string[]): (ImportField | null)[] {
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const field = guessField(h);
    if (!field || used.has(field)) return null;
    used.add(field);
    return field;
  });
}

// ---------- 3. Chuyển giá trị ô → enum hệ thống ----------

function matchByAlias<T extends string>(
  value: string,
  aliases: Record<T, string[]>,
  options: readonly T[],
): T | null {
  const n = normalize(value);
  if (!n) return null;
  for (const opt of options) {
    if (aliases[opt].some((a) => n === a)) return opt;
  }
  for (const opt of options) {
    if (aliases[opt].some((a) => n.includes(a) || a.includes(n))) return opt;
  }
  return null;
}

const TEAM_ALIASES: Record<Team, string[]> = Object.fromEntries(
  TEAMS.map((t) => [t, [normalize(t), normalize(TEAM_LABELS[t])]]),
) as Record<Team, string[]>;

export function parseTeam(value: string): Team | null {
  return matchByAlias(value, TEAM_ALIASES, TEAMS);
}

const STATUS_ALIASES: Record<TaskStatus, string[]> = {
  TODO: ["todo", "chualam", "canlam", "moi"],
  IN_PROGRESS: ["inprogress", "danglam", "dangthuchien", "dangxuly", "doing"],
  REVIEW: ["review", "choduyet", "danhgia", "kiemtra"],
  DONE: ["done", "xong", "hoanthanh", "hoantat", "dahoanthanh"],
};

export function parseStatus(value: string): TaskStatus | null {
  return matchByAlias(value, STATUS_ALIASES, TASK_STATUSES);
}

const PRIORITY_ALIASES: Record<Priority, string[]> = {
  NORMAL: ["normal", "binhthuong", "thuong", "trungbinh"],
  HIGH: ["high", "cao", "uutiencao"],
  CRITICAL: ["critical", "khancap", "gap", "raatgap", "sos"],
};

export function parsePriority(value: string): Priority | null {
  return matchByAlias(value, PRIORITY_ALIASES, PRIORITIES);
}

const IMPACT_ALIASES: Record<RevenueImpact, string[]> = {
  HIGH: ["high", "cao", "lon"],
  MEDIUM: ["medium", "trungbinh", "tb", "vua"],
  LOW: ["low", "thap", "nho", "it"],
};

export function parseImpact(value: string): RevenueImpact | null {
  return matchByAlias(value, IMPACT_ALIASES, REVENUE_IMPACTS);
}

export function parseType(value: string): TaskType | null {
  const n = normalize(value);
  if (!n) return null;
  if (n.includes("project") || n.includes("duan")) return "PROJECT";
  if (n.includes("task") || n.includes("viec")) return "TASK";
  return null;
}

/**
 * Nhận "dd/mm/yyyy", "dd-mm-yyyy" (kiểu Sheets VN) hoặc "yyyy-mm-dd".
 * Trả ISO cuối ngày giờ VN (23:59:59+07:00) — khớp quy ước deadline của form.
 */
export function parseDeadline(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  let y: number, m: number, d: number;
  const vn = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (vn) {
    [d, m, y] = [Number(vn[1]), Number(vn[2]), Number(vn[3])];
  } else if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = new Date(`${y}-${pad(m)}-${pad(d)}T23:59:59+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function parseCategory(team: Team, value: string): string | null {
  const n = normalize(value);
  if (!n) return null;
  return CATEGORY_BY_TEAM[team].find((c) => normalize(c) === n) ?? null;
}

// ---------- 4. Dựng bản nháp task từng dòng ----------

export interface LeaderRef {
  id: string;
  name: string;
  team: string;
}

/** Payload khớp taskCreateSchema (deadline là ISO string, Zod coerce sang Date). */
export interface TaskDraft {
  title: string;
  type: TaskType;
  team: Team;
  leaderId: string | null;
  category: string | null;
  status: TaskStatus;
  deadline: string | null;
  priority: Priority;
  revenueImpact: RevenueImpact;
  outputLink: string | null;
  note: string | null;
}

export interface DraftResult {
  rowIndex: number; // chỉ số dòng dữ liệu (0 = dòng đầu sau header)
  draft: TaskDraft | null; // null khi có lỗi chặn
  errors: string[]; // chặn import dòng này
  warnings: string[]; // vẫn import được, dùng giá trị mặc định
}

const cellAt = (
  row: string[],
  mapping: (ImportField | null)[],
  field: ImportField,
): string => {
  const idx = mapping.indexOf(field);
  return idx === -1 ? "" : (row[idx] ?? "").trim();
};

export function buildDraft(
  row: string[],
  mapping: (ImportField | null)[],
  leaders: LeaderRef[],
  rowIndex: number,
): DraftResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cell = (f: ImportField) => cellAt(row, mapping, f);

  const title = cell("title");
  if (!title) errors.push("Thiếu tên việc");

  const teamRaw = cell("team");
  const team = parseTeam(teamRaw);
  if (!team) {
    errors.push(
      teamRaw ? `Không nhận ra team "${teamRaw}"` : "Thiếu cột Team",
    );
  }

  const deadlineRaw = cell("deadline");
  const deadline = parseDeadline(deadlineRaw);
  if (deadlineRaw && !deadline) {
    errors.push(`Deadline "${deadlineRaw}" không đúng dạng dd/mm/yyyy`);
  }

  if (errors.length > 0 || !team) {
    return { rowIndex, draft: null, errors, warnings };
  }

  const warnDefault = (label: string, raw: string, fallback: string) =>
    warnings.push(`${label} "${raw}" không nhận ra → dùng ${fallback}`);

  const statusRaw = cell("status");
  let status = parseStatus(statusRaw);
  if (statusRaw && !status) warnDefault("Trạng thái", statusRaw, "To do");
  status ??= "TODO";

  const priorityRaw = cell("priority");
  let priority = parsePriority(priorityRaw);
  if (priorityRaw && !priority)
    warnDefault("Ưu tiên", priorityRaw, "Bình thường");
  priority ??= "NORMAL";

  const impactRaw = cell("revenueImpact");
  let revenueImpact = parseImpact(impactRaw);
  if (impactRaw && !revenueImpact)
    warnDefault("Ảnh hưởng doanh thu", impactRaw, "Trung bình");
  revenueImpact ??= "MEDIUM";

  const typeRaw = cell("type");
  let type = parseType(typeRaw);
  if (typeRaw && !type) warnDefault("Loại", typeRaw, "Task");
  type ??= "TASK";

  const categoryRaw = cell("category");
  const category = parseCategory(team, categoryRaw);
  if (categoryRaw && !category) {
    warnings.push(
      `Nhóm việc "${categoryRaw}" không thuộc team ${TEAM_LABELS[team]} → bỏ trống`,
    );
  }

  // Leader: khớp tên (không dấu) trong team → không thì gán leader đầu của team
  const leaderRaw = cell("leader");
  const teamLeaders = leaders.filter((l) => l.team === team);
  let leaderId: string | null = null;
  if (leaderRaw) {
    const n = normalize(leaderRaw);
    const hit = leaders.find(
      (l) => normalize(l.name) === n || normalize(l.name).includes(n),
    );
    if (hit) {
      leaderId = hit.id;
      if (hit.team !== team) {
        warnings.push(
          `Leader "${hit.name}" không thuộc team ${TEAM_LABELS[team]} — vẫn gán theo tên`,
        );
      }
    } else {
      warnings.push(`Không tìm thấy leader "${leaderRaw}" → gán leader của team`);
    }
  }
  leaderId ??= teamLeaders[0]?.id ?? null;

  return {
    rowIndex,
    draft: {
      title,
      type,
      team,
      leaderId,
      category,
      status,
      deadline,
      priority,
      revenueImpact,
      outputLink: cell("outputLink") || null,
      note: cell("note") || null,
    },
    errors,
    warnings,
  };
}

/** Chạy toàn bộ: rows[0] là header. Trả kết quả từng dòng dữ liệu. */
export function buildDrafts(
  rows: string[][],
  mapping: (ImportField | null)[],
  leaders: LeaderRef[],
): DraftResult[] {
  return rows.slice(1).map((row, i) => buildDraft(row, mapping, leaders, i));
}
