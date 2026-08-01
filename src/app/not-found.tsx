import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-[80vh] place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="font-serif text-3xl font-light tracking-wide text-gold">404</p>
        <h1 className="mt-4 font-serif text-4xl font-light tracking-tight text-text sm:text-5xl">
          Không tìm thấy trang
        </h1>
        <p className="mt-6 text-base leading-7 text-dim">
          Đường dẫn sếp đang truy cập không tồn tại hoặc đã bị thay đổi.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-[10px] bg-gold px-4 py-2.5 text-sm font-semibold text-[#1a1a1a] transition-opacity hover:opacity-90 shadow-sm"
          >
            <MoveLeft size={16} strokeWidth={2.5} />
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
