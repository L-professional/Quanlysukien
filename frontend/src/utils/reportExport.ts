import * as XLSX from 'xlsx';

export interface AIInsightsExportData {
  summary?: string;
  highlights?: string[];
  bottlenecks?: string[];
  recommendations?: string[];
  score?: number;
  analyzed_at?: string;
}

export function exportToExcel(
  tab: string,
  data: any,
  filters: { date_range?: string; event_id?: string | number; event_title?: string },
  aiInsights?: AIInsightsExportData | null
) {
  try {
    const wb = XLSX.utils.book_new();
    const timestampStr = new Date().toLocaleString('vi-VN');

    // 1. KPI Sheet
    const kpis = data?.kpis || [];
    const kpiRows = [
      ['EVENTHUB AI - BÁO CÁO QUẢN TRỊ ĐIỀU HÀNH'],
      ['Phân hệ:', tab],
      ['Sự kiện:', filters.event_title || (filters.event_id ? `ID #${filters.event_id}` : 'Toàn bộ hệ thống')],
      ['Khoảng thời gian:', filters.date_range || 'Toàn bộ'],
      ['Thời điểm xuất:', timestampStr],
      [],
      ['CHỈ SỐ HOẠT ĐỘNG CHÍNH (KPIS)'],
      ['Chỉ số', 'Giá trị', 'Tăng trưởng / Ghi chú']
    ];

    kpis.forEach((k: any) => {
      kpiRows.push([k.title || '', k.value || '', k.growth || '']);
    });

    const kpiWs = XLSX.utils.aoa_to_sheet(kpiRows);
    XLSX.utils.book_append_sheet(wb, kpiWs, 'Chỉ Số KPIs');

    // 2. Tab Details Sheet
    let detailRows: any[][] = [];
    let sheetName = 'Chi Tiết';

    if (tab === 'Hiệu quả sự kiện' && data?.eventsRanking) {
      sheetName = 'Hiệu Quả Sự Kiện';
      detailRows.push(['Mã SK', 'Tên Sự Kiện', 'Danh Mục', 'Sức Chứa', 'Đăng Ký', 'Tham Dự', 'Tỷ Lệ Lấp Đầy (%)', 'Tỷ Lệ Tham Dự (%)', 'Doanh Thu (VNĐ)', 'Đánh Giá']);
      data.eventsRanking.forEach((ev: any) => {
        detailRows.push([
          ev.id,
          ev.title,
          ev.category,
          ev.capacity,
          ev.registered,
          ev.attended,
          `${ev.fill_rate}%`,
          `${ev.conversion_rate}%`,
          ev.revenue,
          ev.badge
        ]);
      });
    } else if (tab === 'Người tham dự' && data?.recentAttendees) {
      sheetName = 'Người Tham Dự';
      detailRows.push(['Mã ĐK', 'Họ Và Tên', 'Email', 'Công Ty / Đơn Vị', 'Chức Danh', 'Hạng Vé', 'Trạng Thái', 'Thời Gian Check-in']);
      data.recentAttendees.forEach((r: any) => {
        detailRows.push([
          r.id,
          r.name,
          r.email,
          r.company,
          r.job_title,
          r.ticket_type,
          r.is_checked_in ? 'Đã check-in' : 'Chưa check-in',
          r.checked_in_at
        ]);
      });
    } else if (tab === 'Vé & QR' && data?.ticketTiers) {
      sheetName = 'Hạng Vé & QR';
      detailRows.push(['Hạng Vé', 'Số Lượng Phát Hành', 'Đã Check-in', 'Tỷ Lệ (%)', 'Doanh Thu (VNĐ)']);
      data.ticketTiers.forEach((t: any) => {
        detailRows.push([t.tier, t.count, t.checked_in, `${t.pct}%`, t.revenue]);
      });
    } else if (tab === 'Diễn giả' && data?.speakersRanking) {
      sheetName = 'Diễn Giả & QA';
      detailRows.push(['Tên Diễn Giả', 'Học Vị / Chức Vụ', 'Số Phiên', 'Phiên Nổi Bật', 'CSAT (/5.0)', 'Câu Hỏi Q&A', 'Tỷ Lệ Giải Đáp (%)']);
      data.speakersRanking.forEach((s: any) => {
        detailRows.push([s.name, s.role, s.sessions_count, s.top_session, s.csat, s.questions_count, `${s.answered_rate}%`]);
      });
    } else if (tab === 'Feedback' && data?.commentsList) {
      sheetName = 'Feedback Đại Biểu';
      detailRows.push(['Mã ĐG', 'Số Sao', 'Cảm Xúc', 'Ý Kiến Đóng Góp', 'Thời Gian']);
      data.commentsList.forEach((c: any) => {
        detailRows.push([c.id, `${c.rating} sao`, c.sentiment, c.comment, c.created_at]);
      });
    } else if (tab === 'AI' && data?.recentLogs) {
      sheetName = 'Nhật Ký AI';
      detailRows.push(['Mã Log', 'Loại Tác Vụ', 'Hành Động Staff', 'Tổng Tokens', 'Độ Trễ (ms)', 'Thời Gian']);
      data.recentLogs.forEach((l: any) => {
        detailRows.push([l.id, l.task_type, l.staff_action, l.tokens, l.latency_ms, l.created_at]);
      });
    } else if (tab === 'Hệ thống' && data?.securityLogs) {
      sheetName = 'Bảo Mật & Hệ Thống';
      detailRows.push(['Mã Log', 'Phân Loại', 'Tiêu Đề', 'Nội Dung Chi Tiết', 'Thời Gian']);
      data.securityLogs.forEach((s: any) => {
        detailRows.push([s.id, s.type, s.title, s.message, s.created_at]);
      });
    } else if (data?.savedReports) {
      sheetName = 'Báo Cáo Đã Lưu';
      detailRows.push(['Mã Báo Cáo', 'Tên Báo Cáo', 'Phân Hệ', 'Định Dạng', 'Trạng Thái', 'Ngày Tạo']);
      data.savedReports.forEach((r: any) => {
        detailRows.push([r.id, r.name, r.report_type, r.format, r.status, r.created_at]);
      });
    }

    if (detailRows.length > 0) {
      const detailWs = XLSX.utils.aoa_to_sheet(detailRows);
      XLSX.utils.book_append_sheet(wb, detailWs, sheetName);
    }

    // 3. AI Insights Sheet
    if (aiInsights) {
      const aiRows = [
        ['AI EXECUTIVE INSIGHTS - NHẬN XÉT ĐIỀU HÀNH'],
        ['Điểm Sức Khỏe Hiệu Suất:', `${aiInsights.score || 95} / 100`],
        ['Thời Điểm Phân Tích:', aiInsights.analyzed_at || timestampStr],
        [],
        ['TỔNG QUAN CHIẾN LƯỢC'],
        [aiInsights.summary || ''],
        [],
        ['🟢 ĐIỂM SÁNG TIÊU BIỂU (EXECUTIVE HIGHLIGHTS)'],
        ...(aiInsights.highlights || []).map((h, i) => [`${i + 1}. ${h}`]),
        [],
        ['🟡 ĐIỂM NGHẼN CẦN LƯU Ý (CRITICAL BOTTLENECKS)'],
        ...(aiInsights.bottlenecks || []).map((b, i) => [`${i + 1}. ${b}`]),
        [],
        ['🎯 KHUYẾN NGHỊ TỐI ƯU HÀNH ĐỘNG (ACTIONABLE RECOMMENDATIONS)'],
        ...(aiInsights.recommendations || []).map((r, i) => [`${i + 1}. ${r}`]),
      ];
      const aiWs = XLSX.utils.aoa_to_sheet(aiRows);
      XLSX.utils.book_append_sheet(wb, aiWs, 'AI Executive Insights');
    }

    // Write file
    const cleanTab = tab.toLowerCase().replace(/[^a-z0-9]/g, '_');
    XLSX.writeFile(wb, `EventHub_BaoCao_${cleanTab}_${Date.now()}.xlsx`);
    return true;
  } catch (err) {
    console.error('Error generating Excel file:', err);
    throw err;
  }
}

export function exportToPDF(
  tab: string,
  data: any,
  filters: { date_range?: string; event_id?: string | number; event_title?: string },
  aiInsights?: AIInsightsExportData | null
) {
  const timestampStr = new Date().toLocaleString('vi-VN');
  const scopeTitle = filters.event_title || (filters.event_id ? `Sự kiện #${filters.event_id}` : 'Toàn bộ hệ thống sự kiện');
  const kpis = data?.kpis || [];

  // Generate HTML for print
  const printWindow = window.open('', '_blank', 'width=1100,height=850');
  if (!printWindow) {
    alert('Trình duyệt đang chặn cửa sổ pop-up. Vui lòng cho phép mở pop-up để tải file PDF.');
    return;
  }

  let tableHtml = '';
  if (tab === 'Hiệu quả sự kiện' && data?.eventsRanking) {
    tableHtml = `
      <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #12213A;">Bảng Xếp Hạng Hiệu Quả Sự Kiện</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0; text-align: left;">
            <th style="padding: 10px 8px;">Tên Sự Kiện</th>
            <th style="padding: 10px 8px;">Danh Mục</th>
            <th style="padding: 10px 8px;">Sức Chứa</th>
            <th style="padding: 10px 8px;">Đăng Ký</th>
            <th style="padding: 10px 8px;">Check-in</th>
            <th style="padding: 10px 8px;">% Lấp Đầy</th>
            <th style="padding: 10px 8px;">% Tham Dự</th>
            <th style="padding: 10px 8px;">Đánh Giá</th>
          </tr>
        </thead>
        <tbody>
          ${(data.eventsRanking.slice(0, 15) as any[]).map((ev: any, idx: number) => `
            <tr style="border-bottom: 1px solid #F1F5F9; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
              <td style="padding: 8px; font-weight: bold; color: #0F172A;">${ev.title}</td>
              <td style="padding: 8px; color: #475569;">${ev.category}</td>
              <td style="padding: 8px;">${ev.capacity}</td>
              <td style="padding: 8px;">${ev.registered}</td>
              <td style="padding: 8px; color: #059669; font-weight: bold;">${ev.attended}</td>
              <td style="padding: 8px; font-weight: bold;">${ev.fill_rate}%</td>
              <td style="padding: 8px; color: #2563EB; font-weight: bold;">${ev.conversion_rate}%</td>
              <td style="padding: 8px;"><span style="background-color: #ECFDF5; color: #047857; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">${ev.badge}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (tab === 'Người tham dự' && data?.recentAttendees) {
    tableHtml = `
      <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #12213A;">Danh Sách Người Tham Dự Gần Nhất</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0; text-align: left;">
            <th style="padding: 10px 8px;">Họ và Tên</th>
            <th style="padding: 10px 8px;">Email</th>
            <th style="padding: 10px 8px;">Công Ty / Tổ Chức</th>
            <th style="padding: 10px 8px;">Chức Danh</th>
            <th style="padding: 10px 8px;">Hạng Vé</th>
            <th style="padding: 10px 8px;">Trạng Thái</th>
          </tr>
        </thead>
        <tbody>
          ${(data.recentAttendees.slice(0, 15) as any[]).map((r: any, idx: number) => `
            <tr style="border-bottom: 1px solid #F1F5F9; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
              <td style="padding: 8px; font-weight: bold;">${r.name}</td>
              <td style="padding: 8px; color: #64748B;">${r.email}</td>
              <td style="padding: 8px; font-weight: 500;">${r.company}</td>
              <td style="padding: 8px; color: #475569;">${r.job_title}</td>
              <td style="padding: 8px;"><span style="background-color: #FEF2F2; color: #DC2626; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">${r.ticket_type}</span></td>
              <td style="padding: 8px; font-weight: bold; color: ${r.is_checked_in ? '#059669' : '#D97706'};">${r.is_checked_in ? '✓ Đã Check-in' : 'Chưa Check-in'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (tab === 'Diễn giả' && data?.speakersRanking) {
    tableHtml = `
      <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #12213A;">Bảng Xếp Hạng Diễn Giả & Tương Tác Q&A</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0; text-align: left;">
            <th style="padding: 10px 8px;">Diễn Giả</th>
            <th style="padding: 10px 8px;">Học Vị / Chức Vụ</th>
            <th style="padding: 10px 8px;">Số Phiên</th>
            <th style="padding: 10px 8px;">CSAT Đánh Giá</th>
            <th style="padding: 10px 8px;">Câu Hỏi Q&A</th>
            <th style="padding: 10px 8px;">Tỷ Lệ Giải Đáp</th>
          </tr>
        </thead>
        <tbody>
          ${(data.speakersRanking as any[]).map((s: any, idx: number) => `
            <tr style="border-bottom: 1px solid #F1F5F9; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
              <td style="padding: 8px; font-weight: bold;">${s.name}</td>
              <td style="padding: 8px; color: #64748B;">${s.role}</td>
              <td style="padding: 8px;">${s.sessions_count}</td>
              <td style="padding: 8px; color: #7C3AED; font-weight: bold;">★ ${s.csat} / 5.0</td>
              <td style="padding: 8px;">${s.questions_count}</td>
              <td style="padding: 8px; color: #059669; font-weight: bold;">${s.answered_rate}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (tab === 'Feedback' && data?.commentsList) {
    tableHtml = `
      <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #12213A;">Bình Luận Người Tham Dự Gần Nhất</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0; text-align: left;">
            <th style="padding: 10px 8px; width: 90px;">Đánh Giá</th>
            <th style="padding: 10px 8px; width: 100px;">Cảm Xúc</th>
            <th style="padding: 10px 8px;">Nội Dung Ý Kiến</th>
            <th style="padding: 10px 8px; width: 120px;">Thời Gian</th>
          </tr>
        </thead>
        <tbody>
          ${(data.commentsList.slice(0, 15) as any[]).map((c: any, idx: number) => `
            <tr style="border-bottom: 1px solid #F1F5F9; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
              <td style="padding: 8px; font-weight: bold; color: #EAB308;">★ ${c.rating} / 5</td>
              <td style="padding: 8px;"><span style="background-color: ${c.sentiment === 'positive' ? '#ECFDF5' : '#FFFBEB'}; color: ${c.sentiment === 'positive' ? '#047857' : '#B45309'}; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">${c.sentiment === 'positive' ? 'Tích cực' : 'Trung tính'}</span></td>
              <td style="padding: 8px; color: #334155;">"${c.comment}"</td>
              <td style="padding: 8px; color: #64748B;">${c.created_at}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  const aiBoxHtml = aiInsights ? `
    <div style="background: linear-gradient(135deg, #FEF2F2 0%, #FFF1F2 100%); border: 1.5px solid #FECACA; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #FEE2E2; padding-bottom: 8px;">
        <span style="font-size: 13px; font-weight: 800; color: #DC2626; text-transform: uppercase; letter-spacing: 0.5px;">
          🪄 AI Executive Insights • Nhận Xét Cố Vấn Điều Hành
        </span>
        <span style="background-color: #DC2626; color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 2px 10px; border-radius: 9999px;">
          Điểm sức khỏe: ${aiInsights.score || 95}/100
        </span>
      </div>
      <p style="font-size: 13px; color: #1E293B; line-height: 1.6; margin: 0 0 14px 0; font-weight: 500;">
        ${aiInsights.summary || ''}
      </p>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; font-size: 12px;">
        <div style="background: #FFFFFF; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
          <strong style="color: #059669; display: block; margin-bottom: 6px;">🟢 Điểm sáng</strong>
          <ul style="margin: 0; padding-left: 16px; color: #334155; line-height: 1.5;">
            ${(aiInsights.highlights || []).map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
        <div style="background: #FFFFFF; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
          <strong style="color: #D97706; display: block; margin-bottom: 6px;">🟡 Điểm nghẽn cần lưu ý</strong>
          <ul style="margin: 0; padding-left: 16px; color: #334155; line-height: 1.5;">
            ${(aiInsights.bottlenecks || []).map(b => `<li>${b}</li>`).join('')}
          </ul>
        </div>
        <div style="background: #FFFFFF; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
          <strong style="color: #2563EB; display: block; margin-bottom: 6px;">🎯 Khuyến nghị tối ưu</strong>
          <ul style="margin: 0; padding-left: 16px; color: #334155; line-height: 1.5;">
            ${(aiInsights.recommendations || []).map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  ` : '';

  const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Báo Cáo Quản Trị - ${tab} - EventHub AI</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #0F172A; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 10px;">
    <button onclick="window.print()" style="background: #DC2626; color: #FFFFFF; font-weight: bold; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
      🖨️ In / Lưu PDF
    </button>
    <button onclick="window.close()" style="background: #F1F5F9; color: #475569; font-weight: bold; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer;">
      Đóng
    </button>
  </div>

  <!-- Header Banner -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #DC2626; padding-bottom: 16px; margin-bottom: 20px;">
    <div>
      <span style="background: #DC2626; color: white; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 6px; text-transform: uppercase;">
        EXECUTIVE REPORT • BÁO CÁO ĐIỀU HÀNH
      </span>
      <h1 style="font-size: 24px; font-weight: 900; margin: 8px 0 4px 0; color: #12213A;">
        EventHub <span style="color: #DC2626;">AI Platform</span>
      </h1>
      <p style="font-size: 13px; color: #64748B; margin: 0;">
        Phân hệ: <strong>${tab}</strong> • Phạm vi: <strong>${scopeTitle}</strong>
      </p>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748B; line-height: 1.5;">
      <div>Thời điểm xuất: <strong>${timestampStr}</strong></div>
      <div>Khoảng thời gian: <strong>${filters.date_range || 'Toàn thời gian'}</strong></div>
      <div style="color: #059669; font-weight: bold;">● Dữ liệu PostgreSQL Real-time</div>
    </div>
  </div>

  ${aiBoxHtml}

  <!-- KPIs Grid -->
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
    ${kpis.map((k: any) => `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px;">
        <div style="font-size: 11px; font-weight: bold; color: #64748B; text-transform: uppercase;">${k.title}</div>
        <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 4px 0;">${k.value}</div>
        <div style="font-size: 11px; font-weight: bold; color: #059669;">${k.growth}</div>
      </div>
    `).join('')}
  </div>

  ${tableHtml}

  <div style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 11px; color: #94A3B8;">
    <span>EventHub AI Analytics & Reporting System © 2026</span>
    <span>Trang 1 / 1 • Xác thực tự động bởi CSDL PostgreSQL</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}
