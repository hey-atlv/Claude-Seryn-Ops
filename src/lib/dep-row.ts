// Kiểu dữ liệu thuần (Date → ISO string) cho trang /dependencies —
// truyền từ server component xuống client, không import prisma.

export interface DepRow {
  id: string;
  title: string;
  partner: string;
  direction: string;
  cooperationType: string | null;
  contactPerson: string | null;
  mktTeam: string | null;
  status: string;
  followsProcess: boolean;
  slaDate: string | null;
  note: string | null;
  createdAt: string;
  waitingDays: number;
  isStale: boolean; // WAITING quá 3 ngày → cần "đi đòi"
  offProcess: boolean; // TC-KT không theo quy trình
}
