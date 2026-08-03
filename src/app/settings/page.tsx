import Link from "next/link";
import { ChevronRight, Repeat } from "lucide-react";
import { prisma } from "@/lib/db";
import { GOOGLE_ACCOUNT_ID } from "@/lib/google-auth";
import { SettingsClient } from "./settings-client";
import { SheetsSettingsClient } from "./sheets-settings-client";

export const dynamic = "force-dynamic";

// Trang cấu hình 1 lần — nằm trong dropdown "Khác", không cần lên nav chính.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const [account, activeTemplates] = await Promise.all([
    prisma.googleAccount.findUnique({
      where: { id: GOOGLE_ACCOUNT_ID },
      include: { sheetSources: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.recurringTemplate.count({ where: { active: true } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Cài đặt
      </h1>

      <Link
        href="/settings/recurring"
        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 hover:border-brand-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-500"
      >
        <Repeat
          size={18}
          strokeWidth={2.25}
          className="text-brand-700 dark:text-brand-400"
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
            Việc định kỳ
          </span>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400">
            {activeTemplates > 0
              ? `${activeTemplates} template đang bật — tự sinh việc/báo cáo mỗi tuần, mỗi tháng`
              : "Chưa có template nào — khai báo việc lặp lại để khỏi nhập tay mỗi kỳ"}
          </span>
        </span>
        <ChevronRight size={16} strokeWidth={2.25} className="text-zinc-400" aria-hidden />
      </Link>

      <SettingsClient
        google={
          account
            ? {
                email: account.email,
                calendarId: account.calendarId,
                lastSyncAt: account.lastSyncAt
                  ? account.lastSyncAt.toISOString()
                  : null,
                lastError: account.lastError,
              }
            : null
        }
        connected={sp.connected === "1"}
        oauthError={typeof sp.error === "string" ? sp.error : null}
      />
      {account && (
        <SheetsSettingsClient
          sources={account.sheetSources.map((s) => ({
            id: s.id,
            label: s.label,
            sheetId: s.sheetId,
            sheetRange: s.sheetRange,
            lastSyncAt: s.lastSyncAt ? s.lastSyncAt.toISOString() : null,
            lastError: s.lastError,
          }))}
        />
      )}
    </main>
  );
}
