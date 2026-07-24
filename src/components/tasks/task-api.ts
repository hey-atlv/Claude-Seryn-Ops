// Client helpers gọi API /api/tasks — envelope thống nhất { success, data, error }.
// Lỗi mạng cũng trả về envelope để component xử lý một kiểu duy nhất.

export interface ApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type TaskPayload = Record<string, unknown>;

async function call<T>(
  url: string,
  method: string,
  body?: TaskPayload,
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

export function createTask<T = { id: string }>(
  data: TaskPayload,
): Promise<ApiResult<T>> {
  return call<T>("/api/tasks", "POST", data);
}

export function patchTask(id: string, data: TaskPayload): Promise<ApiResult> {
  return call(`/api/tasks/${id}`, "PATCH", data);
}

export function deleteTask(id: string): Promise<ApiResult> {
  return call(`/api/tasks/${id}`, "DELETE");
}
