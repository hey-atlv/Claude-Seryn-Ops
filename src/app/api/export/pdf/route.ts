import { NextRequest, NextResponse } from "next/server";
import { buildExportHtml, type ExportType } from "@/lib/export";
import { renderHtmlToPdf } from "@/lib/pdf-render";

export const dynamic = "force-dynamic";

// GET /api/export/pdf?type=report&id=xxx  hoặc  ?type=daily-summary — K2, tải
// PDF trực tiếp (nút "Xuất PDF" ở /reports và /daily-summary).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as ExportType | null;
  if (type !== "report" && type !== "daily-summary") {
    return NextResponse.json(
      { success: false, error: "type không hợp lệ" },
      { status: 400 },
    );
  }
  try {
    const { html, filename } = await buildExportHtml(
      type,
      searchParams.get("id"),
    );
    const pdf = await renderHtmlToPdf(html);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi xuất PDF";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
