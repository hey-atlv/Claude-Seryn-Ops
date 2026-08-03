import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRecurringPageData } from "@/lib/recurring-page";
import { RecurringClient } from "./recurring-client";

export const dynamic = "force-dynamic";

// Cài đặt › Việc định kỳ — nơi duy nhất khai báo việc lặp theo tuần/tháng.
export default async function RecurringSettingsPage() {
  const templates = await getRecurringPageData();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 p-6">
      <div className="space-y-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <ChevronLeft size={15} strokeWidth={2.25} aria-hidden />
          Cài đặt
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Việc định kỳ
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Khai báo một lần, hệ thống tự sinh công việc/báo cáo cho từng kỳ — không
          phải nhập lại mỗi tuần, mỗi tháng. Việc sinh chạy khi bạn mở màn
          &quot;Hôm nay&quot; hoặc &quot;Công việc&quot;; mở app trễ vài ngày vẫn
          sinh bù cho kỳ đó và mỗi kỳ chỉ sinh đúng một lần.
        </p>
      </div>

      <RecurringClient templates={templates} />
    </main>
  );
}
