// Skeleton chung cho mọi trang — hiện NGAY khi bấm điều hướng, thay vì đứng
// im 1-3s chờ server (DB cloud) trả về. Next dùng file này làm Suspense
// fallback cho tất cả route chưa có loading.tsx riêng.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl animate-pulse space-y-4 p-6">
      {/* Tiêu đề trang */}
      <div className="h-8 w-52 rounded-lg bg-panel-3" />
      <div className="h-4 w-80 max-w-full rounded bg-panel-2" />

      {/* Hàng tab/filter */}
      <div className="flex gap-2 pt-2">
        <div className="h-8 w-24 rounded-md bg-panel-2" />
        <div className="h-8 w-24 rounded-md bg-panel-2" />
        <div className="h-8 w-24 rounded-md bg-panel-2" />
      </div>

      {/* Khối nội dung chính */}
      <div className="space-y-3 pt-2">
        <div className="h-28 rounded-[14px] border border-hair-soft bg-panel" />
        <div className="h-28 rounded-[14px] border border-hair-soft bg-panel" />
        <div className="h-64 rounded-[14px] border border-hair-soft bg-panel" />
      </div>
    </main>
  );
}
