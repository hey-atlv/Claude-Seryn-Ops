import { chromium } from "playwright";

// K2 — render HTML in-friendly (pdf-templates.ts) ra PDF bằng Chromium headless
// (Playwright). Không test đơn vị (cần trình duyệt thật) — mọi logic nội dung
// nằm ở pdf-templates.ts đã test, file này chỉ lo phần render.
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return pdf;
  } finally {
    await browser.close();
  }
}
