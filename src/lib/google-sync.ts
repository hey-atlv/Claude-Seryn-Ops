import { calendar_v3, google } from "googleapis";
import { prisma } from "./db";
import {
  GOOGLE_ACCOUNT_ID,
  getAuthedClient,
  markSyncError,
  markSyncOk,
  type OAuth2Client,
} from "./google-auth";
import {
  eventSlotVN,
  eventTitleFor,
  fromGoogleEventDate,
  monthRangeVN,
  resolveConflict,
  shouldSyncTask,
  toGoogleEventDate,
  type ExternalCalendarEvent,
} from "./google-calendar-core";

// Đồng bộ 2 chiều Task ↔ Google Calendar (lịch phụ "Seryn Ops"). Mọi hàm ở đây
// nuốt lỗi Google (mất mạng, token hỏng, chưa kết nối) — CRUD task không bao giờ
// được phép hỏng vì Google, đây luôn là đồng bộ "best-effort".

const DAY_MS = 86_400_000;
const EXT_PROP_KEY = "serynTaskId";
export const SERYN_CALENDAR_NAME = "Seryn Ops";

function calendarClient(auth: OAuth2Client) {
  return google.calendar({ version: "v3", auth });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Lỗi không rõ";
}

/** Gọi ngay sau khi có token lần đầu (route /api/google/callback) — idempotent */
export async function ensureSerynCalendar(auth: OAuth2Client): Promise<string> {
  const cal = calendarClient(auth);
  const list = await cal.calendarList.list();
  const existing = list.data.items?.find((c) => c.summary === SERYN_CALENDAR_NAME);
  if (existing?.id) return existing.id;
  const created = await cal.calendars.insert({
    requestBody: { summary: SERYN_CALENDAR_NAME },
  });
  if (!created.data.id) throw new Error("Google không trả về id lịch vừa tạo");
  return created.data.id;
}

async function loadContext() {
  const account = await prisma.googleAccount.findUnique({
    where: { id: GOOGLE_ACCOUNT_ID },
  });
  if (!account) return null;
  const auth = await getAuthedClient();
  if (!auth) return null;
  return { account, cal: calendarClient(auth) };
}

/** App → Google: gọi sau khi task được tạo/sửa (POST/PATCH /api/tasks, generateRecurring) */
export async function syncTaskToCalendar(taskId: string): Promise<void> {
  try {
    const ctx = await loadContext();
    if (!ctx) return; // chưa kết nối Google — bỏ qua, không phải lỗi
    const { account, cal } = ctx;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return;

    if (!shouldSyncTask(task)) {
      if (task.googleEventId) {
        await cal.events
          .delete({ calendarId: account.calendarId, eventId: task.googleEventId })
          .catch(() => {});
        await prisma.task.update({
          where: { id: taskId },
          data: { googleEventId: null },
        });
      }
      return;
    }

    const startDate = toGoogleEventDate(task.deadline!);
    const endDate = toGoogleEventDate(new Date(task.deadline!.getTime() + DAY_MS));
    const requestBody: calendar_v3.Schema$Event = {
      summary: eventTitleFor(task),
      start: { date: startDate },
      end: { date: endDate },
      extendedProperties: { private: { [EXT_PROP_KEY]: task.id } },
    };

    if (task.googleEventId) {
      await cal.events.update({
        calendarId: account.calendarId,
        eventId: task.googleEventId,
        requestBody,
      });
    } else {
      const res = await cal.events.insert({
        calendarId: account.calendarId,
        requestBody,
      });
      await prisma.task.update({
        where: { id: taskId },
        data: { googleEventId: res.data.id },
      });
    }
    await markSyncOk();
  } catch (err) {
    console.error("[GoogleSync] push task → calendar thất bại:", err);
    await markSyncError(errorMessage(err));
  }
}

/** Gọi TRƯỚC khi xóa task khỏi DB (route DELETE /api/tasks/[id]) — cần đọc googleEventId */
export async function deleteTaskEvent(taskId: string): Promise<void> {
  try {
    const ctx = await loadContext();
    if (!ctx) return;
    const { account, cal } = ctx;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task?.googleEventId) return;
    await cal.events
      .delete({ calendarId: account.calendarId, eventId: task.googleEventId })
      .catch(() => {});
  } catch (err) {
    console.error("[GoogleSync] xóa event thất bại:", err);
  }
}

/** Liệt kê toàn bộ event của 1 lịch trong khoảng thời gian, đã gộp hết các trang */
async function listEventsIn(
  cal: calendar_v3.Calendar,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<calendar_v3.Schema$Event[]> {
  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  do {
    const res = await cal.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      pageToken,
    });
    events.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return events;
}

/** J3 — event Google KHÔNG do app tạo, trong 1 tháng, để Calendar view hiển thị
 * + nút "tạo task từ event". Quét cả lịch chính ("primary" — nơi có lịch họp
 * thật) lẫn lịch phụ "Seryn Ops", lấy cả event cả ngày lẫn event có giờ.
 * Best-effort: trả mảng rỗng khi chưa kết nối, và một lịch lỗi không làm mất
 * lịch còn lại — route gọi hàm này không được phép hỏng. */
export async function listExternalCalendarEvents(
  year: number,
  month: number,
): Promise<ExternalCalendarEvent[]> {
  try {
    const ctx = await loadContext();
    if (!ctx) return [];
    const { account, cal } = ctx;
    const { timeMin, timeMax } = monthRangeVN(year, month);

    const calendarIds = [...new Set(["primary", account.calendarId])];
    const events: calendar_v3.Schema$Event[] = [];
    for (const calendarId of calendarIds) {
      try {
        events.push(...(await listEventsIn(cal, calendarId, timeMin, timeMax)));
      } catch (err) {
        console.error(`[GoogleSync] đọc lịch "${calendarId}" thất bại:`, err);
      }
    }

    const result: ExternalCalendarEvent[] = [];
    const seen = new Set<string>();
    for (const event of events) {
      if (!event.id || seen.has(event.id)) continue; // 1 event có thể nằm ở cả 2 lịch
      if (event.status === "cancelled") continue;
      if (event.extendedProperties?.private?.[EXT_PROP_KEY]) continue; // event do app tạo — Calendar view đã vẽ từ task
      const slot = eventSlotVN(event.start);
      if (!slot) continue; // mốc thời gian lạ — bỏ qua an toàn
      seen.add(event.id);
      result.push({
        id: event.id,
        title: event.summary || "(Không có tiêu đề)",
        dateKey: slot.dateKey,
        time: slot.time,
      });
    }
    return result;
  } catch (err) {
    console.error("[GoogleSync] listExternalCalendarEvents thất bại:", err);
    return [];
  }
}

function is410Gone(err: unknown): boolean {
  const e = err as { code?: number | string; response?: { status?: number } };
  return e?.response?.status === 410 || String(e?.code) === "410";
}

/** Google → App: kéo thay đổi bằng syncToken (incremental). Gọi khi mở "Hôm nay". */
export async function pullCalendarChanges(): Promise<void> {
  try {
    const ctx = await loadContext();
    if (!ctx) return;
    const { account, cal } = ctx;

    const events: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    try {
      do {
        const res = await cal.events.list({
          calendarId: account.calendarId,
          syncToken: account.syncToken ?? undefined,
          pageToken,
          showDeleted: true,
          singleEvents: true,
        });
        events.push(...(res.data.items ?? []));
        pageToken = res.data.nextPageToken ?? undefined;
        if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;
      } while (pageToken);
    } catch (err) {
      if (is410Gone(err)) {
        // syncToken hết hạn — xóa để lần sau full resync, bỏ qua lượt này
        await prisma.googleAccount.update({
          where: { id: GOOGLE_ACCOUNT_ID },
          data: { syncToken: null },
        });
        return;
      }
      throw err;
    }

    for (const event of events) {
      const linkedTaskId = event.extendedProperties?.private?.[EXT_PROP_KEY];
      if (!linkedTaskId) continue; // event không do app tạo — không đụng vào

      const task = await prisma.task.findUnique({ where: { id: linkedTaskId } });
      if (!task) continue;

      if (event.status === "cancelled") {
        // Event bị xóa trên Google — chỉ gỡ liên kết, KHÔNG đụng deadline/xóa task
        if (task.googleEventId === event.id) {
          await prisma.task.update({
            where: { id: task.id },
            data: { googleEventId: null },
          });
        }
        continue;
      }

      const eventDateStr = event.start?.date;
      if (!eventDateStr) continue; // không phải all-day event — bỏ qua an toàn

      const decision = resolveConflict({
        taskUpdatedAt: task.updatedAt,
        taskDeadlineKey: task.deadline ? toGoogleEventDate(task.deadline) : null,
        eventUpdatedAt: event.updated ? new Date(event.updated) : new Date(),
        eventDeadlineKey: eventDateStr,
      });

      if (decision === "USE_EVENT") {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            deadline: fromGoogleEventDate(eventDateStr),
            googleEventId: event.id,
          },
        });
      } else if (decision === "USE_TASK") {
        // Task đúng hơn (sửa sau) — đẩy lại để sửa event Google đang sai ngày
        await syncTaskToCalendar(task.id);
      }
      // NOOP: hai bên đã khớp, không làm gì
    }

    await prisma.googleAccount.update({
      where: { id: GOOGLE_ACCOUNT_ID },
      data: {
        syncToken: nextSyncToken ?? account.syncToken,
        lastSyncAt: new Date(),
        lastError: null,
      },
    });
  } catch (err) {
    console.error("[GoogleSync] pull thất bại:", err);
    await markSyncError(errorMessage(err));
  }
}
