import type { Dependency } from "@/generated/prisma/client";
import { DEPENDENCY_STALE_DAYS } from "./constants";
import { prisma } from "./db";
import type { DepRow } from "./dep-row";

// Data loader trang /dependencies (Giai đoạn E1) — serialize + tính meta.

const DAY_MS = 86_400_000;

function toDepRow(d: Dependency, now: Date): DepRow {
  const waitingDays = Math.floor(
    (now.getTime() - d.createdAt.getTime()) / DAY_MS,
  );
  return {
    id: d.id,
    title: d.title,
    partner: d.partner,
    direction: d.direction,
    cooperationType: d.cooperationType,
    contactPerson: d.contactPerson,
    mktTeam: d.mktTeam,
    status: d.status,
    followsProcess: d.followsProcess,
    slaDate: d.slaDate ? d.slaDate.toISOString() : null,
    note: d.note,
    createdAt: d.createdAt.toISOString(),
    waitingDays,
    isStale: d.status === "WAITING" && waitingDays > DEPENDENCY_STALE_DAYS,
    offProcess: d.partner === "TC_KT" && !d.followsProcess,
  };
}

export async function getDependenciesPageData(
  now: Date = new Date(),
): Promise<DepRow[]> {
  const deps = await prisma.dependency.findMany({
    orderBy: { createdAt: "desc" },
  });
  return deps.map((d) => toDepRow(d, now));
}
