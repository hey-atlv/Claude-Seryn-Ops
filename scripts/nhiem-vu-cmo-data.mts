// Dữ liệu 12 nhóm chức năng nhiệm vụ CMO (Sheet 1B file 260724_Đóng gói công
// việc GĐMKT_View.xlsx) — dùng chung cho import-nhiem-vu-cmo.mts (tạo task
// tháng 8) và tao-template-cmo.mts (tạo template định kỳ hằng tháng).

export interface Duty {
  stt: number; // STT gốc trong Sheet 1B (file nhảy số, thiếu 3)
  title: string;
  freq: string;
  priority: "HIGH" | "NORMAL";
  detail: string[];
}

export const DUTIES: Duty[] = [
  {
    stt: 1,
    title: "[Digi] - Kế hoạch Data & MKT toàn diện theo khoán doanh thu",
    freq: "Tháng - Quý - Năm",
    priority: "HIGH",
    detail: [
      "(i) Tiếp nhận cùng BGĐ xây dựng các mục tiêu kinh doanh theo Tháng, Quý, Năm",
      "(ii) Xây dựng kế hoạch Data, kế hoạch công việc khối MKT, kế hoạch ngân sách căn cứ các mục tiêu, định mức được duyệt",
      "(iii) Họp các Leader khối MKT thống nhất các kế hoạch",
      "(iv) Thông báo kế hoạch đẩy Data tới VH & CEC & TCKT (Email)",
      "(v) Tìm hiểu, nghiên cứu phát triển các ý tưởng mới cho chiến lược KD&MKT",
    ],
  },
  {
    stt: 2,
    title: "[Digi] - Chỉ đạo & giám sát triển khai kế hoạch MKT, truyền thông",
    freq: "Tháng - Quý - Năm",
    priority: "HIGH",
    detail: [
      "(i) Chỉ đạo, tham gia, hỗ trợ triển khai các nhóm kế hoạch khối MKT",
      "(ii) Chủ động giám sát, đánh giá kịp thời hiệu quả triển khai, tiến độ",
      "(iii) Xây dựng hệ thống đo lường đánh giá kết quả với các nhóm kế hoạch (with Leader KSKD&KT)",
      "(iv) Xây dựng phương án quản trị rủi ro | Xử lý khủng hoảng truyền thông, khủng hoảng bảo mật",
      "(v) Họp rút kinh nghiệm, tối ưu định kỳ với các Phòng ban, dự án",
    ],
  },
  {
    stt: 4,
    title: "[Digi] - Kiểm soát chi phí & hiệu quả kinh doanh theo định mức",
    freq: "Tháng - Quý - Năm",
    priority: "HIGH",
    detail: [
      "(i) Theo dõi và điều tiết ngân sách theo kế hoạch được duyệt, đảm bảo định mức công ty (with Leader KSKD&KT)",
      "(ii) Chủ động chỉ đạo cắt giảm/tăng ngân sách nhằm tối ưu sử dụng chi phí (with Leader KSKD&KT)",
      "(iii) Xây dựng và giám sát hiệu quả sử dụng chi phí các phòng ban (with Leader KSKD&KT)",
      "(iv) Theo dõi và đánh giá hiệu quả các khâu Sale & MKT (with Leader KSKD&KT)",
      "(v) Đề xuất điều chỉnh để đảm bảo hiệu suất kinh doanh trong khối MKT và các phòng ban liên quan",
    ],
  },
  {
    stt: 5,
    title: "[Digi] - Cơ chế lương, thưởng, khoán, động lực (C&B)",
    freq: "Tháng - Quý - Năm",
    priority: "HIGH",
    detail: [
      "(i) Xây dựng, giám sát tính hiệu quả của hệ thống C&B (with Leader KSKD&KT)",
      "(ii) Đề xuất các cơ chế chi tiết cho cá nhân, đội nhóm — theo cẩm nang phân quyền",
      "(iii) Đảm bảo quỹ lương thưởng phân bổ công bằng & hợp lý theo hiệu quả",
      "(iv) Phối hợp BP Nhân sự, định kỳ rà soát & tối ưu hệ thống C&B",
    ],
  },
  {
    stt: 6,
    title: "[Digi] - Xây dựng & giám sát hệ thống quy trình, quy định",
    freq: "Tháng - Quý",
    priority: "NORMAL",
    detail: [
      "(i) Chỉ đạo, tham gia xây dựng hệ thống quy trình của khối MKT và các phòng ban trong đó",
      "(ii) Kiểm tra, phê duyệt tính hợp lý, hợp lệ các quy trình, quy định, hướng dẫn",
      "(iii) Thường xuyên đánh giá hiệu quả các nhóm quy trình, đưa ra phương án tối ưu, cải tiến (with Leaders MKT)",
    ],
  },
  {
    stt: 7,
    title: "[Digi] - Tuyển dụng & đào tạo nhân sự khối MKT",
    freq: "Tháng",
    priority: "NORMAL",
    detail: [
      "(i) Chỉ đạo xây dựng hệ thống JD cho các vị trí (phối hợp các Leader)",
      "(ii) Phối hợp Tuyển dụng xác định quy trình tuyển dụng — tham gia tuyển dụng",
      "(iii) Duyệt cơ chế lương thưởng offer ứng viên",
      "(iv) Xác định nhu cầu và phối hợp Phòng đào tạo lên kế hoạch & triển khai đào tạo (with Leaders MKT)",
    ],
  },
  {
    stt: 8,
    title: "[Digi] - Phối hợp phát triển sản phẩm mới (R&D, Salekit, Launching)",
    freq: "Tháng - Quý",
    priority: "HIGH",
    detail: [
      "(i) Tham gia trực tiếp với Chuyên môn x Vận hành cùng R&D sản phẩm mới (Leader PR)",
      "(ii) Chỉ đạo xây dựng tài liệu Salekit cho DV mới trọng điểm",
      "(iii) Chỉ đạo kế hoạch training toàn hệ thống cho các DV mới trọng điểm",
      "(iv) Phối hợp các khối phòng ban trong/ngoài MKT triển khai Launching SP mới",
    ],
  },
  {
    stt: 9,
    title: "[Digi] - Báo cáo & phối hợp Ban Giám đốc",
    freq: "Tháng",
    priority: "NORMAL",
    detail: [
      "(i) Báo cáo định kỳ BGĐ về các kế hoạch trọng điểm MKT, tiến độ, kết quả triển khai",
      "(ii) Cập nhật BGĐ kịp thời khi có phát sinh tiềm ẩn rủi ro",
      "(iii) Đề xuất, tham mưu BGĐ về chiến lược, khung kế hoạch, các ưu tiên cho kế hoạch KD&MKT",
    ],
  },
  {
    stt: 10,
    title: "[Digi] - Thúc đẩy văn hoá DN & truyền thông nội bộ",
    freq: "Tháng",
    priority: "NORMAL",
    detail: [
      "(i) Cho ý kiến, phê duyệt kế hoạch công việc và ngân sách TTNB (w Leader TTNB)",
      "(ii) Thúc đẩy, khuyến khích CBNV khối MKT và phòng ban khác tham gia chương trình TTNB",
      "(iii) Đề xuất các chiến lược về TTNB với BGĐ",
      "(iv) Trực tiếp duyệt hạng mục quan trọng: Event lớn 08.03, 20.10, YEP, Summer Tour…",
    ],
  },
  {
    stt: 11,
    title: "[Digi] - Tiếp nhận & xử lý yêu cầu khối Vận hành",
    freq: "Tháng",
    priority: "NORMAL",
    detail: [
      "(i) Tiếp nhận order về Trade & Event (Leader team direct) | Thiết kế nội thất chi nhánh",
      "(ii) Tiếp nhận các vấn đề liên quan truyền thông quảng cáo",
      "(iii) Tiếp nhận các vấn đề khủng hoảng truyền thông (with Leader PR)",
      "(iv) Phối hợp đánh giá hiệu quả ngân sách các hoạt động hỗ trợ (KHM & KHC)",
      "(v) Phối hợp đảm bảo đồng bộ định vị truyền thông (with Leader PR)",
      "(vi) Cập nhật danh sách bài đang chạy QC (khoảng 20 bài chạy nhiều nhất)",
    ],
  },
  {
    stt: 12,
    title: "[Digi] - Tiếp nhận & xử lý yêu cầu khối CEC",
    freq: "Tháng",
    priority: "NORMAL",
    detail: [
      "(i) Cập nhật kế hoạch Data hàng tháng",
      "(ii) Xử lý, kiểm tra các phản hồi về Data",
      "(iii) Phối hợp xây dựng và thống nhất các chương trình thúc đẩy KHM",
      "(iv) Tiếp nhận các vấn đề liên quan truyền thông quảng cáo",
      "(v) Tiếp nhận các order về Salekit",
      "(vi) Phối hợp đảm bảo đồng bộ định vị truyền thông (with Leader PR & Leader Content MKT)",
    ],
  },
  {
    stt: 13,
    title: "[Digi] - Phối hợp quy trình TCKT & duyệt chi theo phân quyền",
    freq: "Tháng - Quý",
    priority: "NORMAL",
    detail: [
      "(i) Giám sát tuân thủ quy trình phê duyệt ngân sách, thanh toán (with Leader KSKD&KT)",
      "(ii) Tham gia xây dựng, đáp ứng yêu cầu nghiệp vụ Tài chính & Kế toán (with Leader KSKD&KT)",
      "(iii) Phối hợp lập ngân sách Tháng/Quý/Năm",
      "(iv) Tham gia xây dựng, cho ý kiến các quy trình TCKT liên quan MKT",
      "(v) Duyệt chi theo phân quyền",
    ],
  },
];

/** Ghi chú điền cho task/template — checklist (i)..(vi) + tần suất + nguồn */
export function dutyNote(d: Duty): string {
  return [
    `[Chức năng nhiệm vụ CMO — mục ${d.stt} · Tần suất: ${d.freq}]`,
    ...d.detail,
    "Nguồn: file bàn giao 260724_Đóng gói công việc GĐMKT_View.xlsx (Sheet 1B).",
  ].join("\n");
}
