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
  const account = await prisma.googleAccount.findUnique({
    where: { id: GOOGLE_ACCOUNT_ID },
    include: { sheetSources: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Cài đặt
      </h1>
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
