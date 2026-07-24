// Helper fetch dùng chung phía client — mọi API trả envelope { success, data, error }.
// Lỗi mạng cũng trả envelope để component xử lý một kiểu duy nhất.

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiCall<T = unknown>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return (await res.json()) as ApiResult<T>;
  } catch {
    return {
      success: false,
      error: "Không kết nối được máy chủ — kiểm tra dev server",
    };
  }
}
