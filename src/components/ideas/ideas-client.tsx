"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IDEA_STATUS_FLOW,
  IDEA_STATUS_LABELS,
  TEAMS,
  TEAM_LABELS,
  type IdeaStatus,
  type Team,
} from "@/lib/constants";
import {
  IDEA_BUCKETS,
  IDEA_BUCKET_META,
  IDEA_SCALE_MAX,
  IDEA_SCALE_MIN,
  classifyIdea,
  ideaScore,
  type IdeaBucket,
} from "@/lib/idea-score";
import { useConfirm } from "@/components/ui/confirm-dialog";

// Backlog ý tưởng — xếp theo góc phần tư impact/effort, mỗi thẻ đổi được
// trạng thái theo đúng luồng. "Đã duyệt" → "Đã thành dự án" sinh Task PROJECT
// (API lo phần đó, ở đây chỉ gọi rồi nạp lại).

export interface IdeaRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  impact: number;
  effort: number;
  team: string | null;
  source: string | null;
  decisionNote: string | null;
  promotedTaskId: string | null;
  updatedAt: string;
}

const SCALE = Array.from(
  { length: IDEA_SCALE_MAX - IDEA_SCALE_MIN + 1 },
  (_, i) => IDEA_SCALE_MIN + i,
);

const INPUT =
  "w-full rounded-md border border-hair bg-panel-2 px-2.5 py-1.5 text-sm text-text";

const BUCKET_ACCENT: Record<IdeaBucket, string> = {
  QUICK_WIN: "text-good",
  BIG_BET: "text-dusty",
  FILL_IN: "text-soon",
  MONEY_PIT: "text-muted",
};

/** Ý tưởng đã khép vòng đời thì không nằm trong ma trận nữa. */
const CLOSED_STATUSES: string[] = ["PROJECT", "DROPPED"];

async function callApi(url: string, method: string, body?: unknown) {
  try {
    const res = await fetch(url, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return (await res.json()) as { success: boolean; error?: string };
  } catch {
    return { success: false, error: "Không kết nối được máy chủ" };
  }
}

export function IdeasClient({ initialIdeas }: { initialIdeas: IdeaRow[] }) {
  const router = useRouter();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [title, setTitle] = useState("");
  const [impact, setImpact] = useState(3);
  const [effort, setEffort] = useState(3);
  const [team, setTeam] = useState<Team | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  async function reload() {
    const res = await fetch("/api/ideas");
    const json = (await res.json()) as { success: boolean; data?: IdeaRow[] };
    if (json.success && json.data) setIdeas(json.data);
    router.refresh();
  }

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const res = await callApi("/api/ideas", "POST", {
      title: title.trim(),
      impact,
      effort,
      team: team || null,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Tạo ý tưởng thất bại");
      return;
    }
    setTitle("");
    await reload();
  }

  async function patch(id: string, data: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await callApi(`/api/ideas/${id}`, "PATCH", data);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Cập nhật thất bại");
      return;
    }
    await reload();
  }

  async function remove(idea: IdeaRow) {
    const confirmed = await confirm(`Xóa ý tưởng "${idea.title}"?`, {
      detail: "Không hoàn tác được.",
      confirmLabel: "Xóa ý tưởng",
    });
    if (!confirmed) return;
    setBusy(true);
    const res = await callApi(`/api/ideas/${idea.id}`, "DELETE");
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Xóa thất bại");
      return;
    }
    await reload();
  }

  const active = useMemo(
    () => ideas.filter((i) => !CLOSED_STATUSES.includes(i.status)),
    [ideas],
  );
  const closed = useMemo(
    () => ideas.filter((i) => CLOSED_STATUSES.includes(i.status)),
    [ideas],
  );

  const byBucket = useMemo(() => {
    const map = Object.fromEntries(
      IDEA_BUCKETS.map((b) => [b, [] as IdeaRow[]]),
    ) as Record<IdeaBucket, IdeaRow[]>;
    for (const idea of active) map[classifyIdea(idea)].push(idea);
    for (const bucket of IDEA_BUCKETS) {
      map[bucket].sort((a, b) => ideaScore(b) - ideaScore(a));
    }
    return map;
  }, [active]);

  return (
    <div className="space-y-5">
      {/* Ghi nhanh — ý tưởng phải vào được trong 5 giây, không thì không ai dùng */}
      <div className="app-card space-y-3 p-4">
        <div className="section-label">Ghi nhanh ý tưởng</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="VD: Thử livestream bán gói trẻ hóa vào tối thứ 5"
          className={INPUT}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Giá trị (1–5)</span>
            <select
              value={impact}
              onChange={(e) => setImpact(Number(e.target.value))}
              className={INPUT}
            >
              {SCALE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Công sức (1–5)</span>
            <select
              value={effort}
              onChange={(e) => setEffort(Number(e.target.value))}
              className={INPUT}
            >
              {SCALE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Team</span>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value as Team | "")}
              className={INPUT}
            >
              <option value="">— chưa gán —</option>
              {TEAMS.map((t) => (
                <option key={t} value={t}>
                  {TEAM_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={add}
              disabled={busy || !title.trim()}
              className="w-full rounded-md bg-brand-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              Thêm
            </button>
          </div>
        </div>
        <p className="text-xs text-faint">
          Xếp góc phần tư: giá trị ≥ 4 là &quot;cao&quot;, công sức ≤ 2 là
          &quot;nhẹ&quot;. Điểm = giá trị ÷ công sức.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-critical/15 px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {IDEA_BUCKETS.map((bucket) => (
          <section key={bucket} className="app-card p-4">
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className={`text-sm font-bold ${BUCKET_ACCENT[bucket]}`}>
                {IDEA_BUCKET_META[bucket].title}
              </h2>
              <span className="text-xs text-faint">
                ({byBucket[bucket].length})
              </span>
              <span className="ml-auto text-right text-xs text-muted">
                {IDEA_BUCKET_META[bucket].hint}
              </span>
            </div>
            {byBucket[bucket].length === 0 ? (
              <p className="py-3 text-center text-xs text-faint">
                Chưa có ý tưởng nào
              </p>
            ) : (
              <ul className="space-y-2">
                {byBucket[bucket].map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    busy={busy}
                    onPatch={patch}
                    onRemove={remove}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {closed.length > 0 && (
        <section className="app-card p-4">
          <div className="section-label mb-3">Đã khép ({closed.length})</div>
          <ul className="space-y-1.5">
            {closed.map((idea) => (
              <li
                key={idea.id}
                className="flex items-center gap-2 text-sm text-dim"
              >
                <span className="rounded bg-panel-3 px-1.5 py-0.5 text-[11px] text-muted">
                  {IDEA_STATUS_LABELS[idea.status as IdeaStatus] ?? idea.status}
                </span>
                <span
                  className={idea.status === "DROPPED" ? "line-through" : ""}
                >
                  {idea.title}
                </span>
                {idea.promotedTaskId && (
                  <a
                    href="/tasks"
                    className="text-xs text-dusty underline underline-offset-2"
                  >
                    xem dự án
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => remove(idea)}
                  disabled={busy}
                  className="ml-auto text-xs text-critical hover:underline disabled:opacity-50"
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {confirmDialog}
    </div>
  );
}

function IdeaCard({
  idea,
  busy,
  onPatch,
  onRemove,
}: {
  idea: IdeaRow;
  busy: boolean;
  onPatch: (id: string, data: Record<string, unknown>) => void;
  onRemove: (idea: IdeaRow) => void;
}) {
  const nextStatuses = IDEA_STATUS_FLOW[idea.status as IdeaStatus] ?? [];
  return (
    <li className="rounded-lg border border-hair-soft bg-panel-2 p-3">
      <div className="flex items-start gap-2">
        <span className="flex-1 text-sm text-text">{idea.title}</span>
        <span
          className="shrink-0 rounded bg-panel-3 px-1.5 py-0.5 text-[11px] text-dim"
          title="Điểm = giá trị ÷ công sức"
        >
          {ideaScore(idea)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span>
          Giá trị {idea.impact} · Công sức {idea.effort}
        </span>
        {idea.team && (
          <span>· {TEAM_LABELS[idea.team as Team] ?? idea.team}</span>
        )}
        <span className="rounded bg-panel-3 px-1.5 py-0.5">
          {IDEA_STATUS_LABELS[idea.status as IdeaStatus] ?? idea.status}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {nextStatuses.map((next) => (
          <button
            key={next}
            type="button"
            onClick={() => onPatch(idea.id, { status: next })}
            disabled={busy}
            className={`rounded px-2 py-1 text-[11px] disabled:opacity-50 ${
              next === "PROJECT"
                ? "bg-good/15 text-good hover:bg-good/25"
                : next === "DROPPED"
                  ? "text-muted hover:bg-panel-3"
                  : "bg-panel-3 text-dim hover:bg-hair"
            }`}
          >
            {next === "PROJECT" ? "→ Thành dự án" : IDEA_STATUS_LABELS[next]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onRemove(idea)}
          disabled={busy}
          className="ml-auto rounded px-2 py-1 text-[11px] text-critical hover:bg-critical/15 disabled:opacity-50"
        >
          Xóa
        </button>
      </div>
    </li>
  );
}
