import { splitTeamTag, tagClass } from "@/lib/team-tag";

// P2 — Render tên task: tag "[FB]" tách thành chip màu nhỏ, phần tên gọn lại.
// Dùng được trong cả server lẫn client component (không state).

export function TitleWithTag({ title }: { title: string }) {
  const { tag, rest } = splitTeamTag(title);
  if (!tag) return <>{title}</>;
  return (
    <>
      <span
        className={`mr-1.5 inline-block rounded px-1.5 py-px align-middle text-[10px] font-bold leading-4 ${tagClass(tag)}`}
      >
        {tag}
      </span>
      {rest}
    </>
  );
}
