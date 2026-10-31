/**
 * Task 100: Post-Event Interactive Recap Email Template & Helpers
 * Includes direct 1-click 5-star rating widget and post-event highlight card.
 */

export interface PostEventEmailProps {
  recipientName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  speakers?: string;
  eventId?: number | string;
  userId?: number | string;
  email?: string;
  customMessage?: string;
  ticketCode?: string;
  company?: string;
  apiBaseUrl?: string;
  eventUrl?: string;
}

export function buildQuickRateLink(
  eventId: number | string,
  stars: number,
  userId?: number | string,
  email?: string,
  apiBaseUrl: string = 'http://localhost:8000'
): string {
  const params = new URLSearchParams();
  params.set('eventId', String(eventId));
  params.set('stars', String(stars));
  if (userId) params.set('userId', String(userId));
  if (email) params.set('email', email);
  return `${apiBaseUrl}/api/v1/feedback/quick-rate?${params.toString()}`;
}

export function renderPostEventRecapEmailHtml(props: PostEventEmailProps): string {
  const {
    recipientName = 'Quý Khách',
    eventTitle = 'Sự kiện EventHub AI',
    eventDate = '15/10/2026',
    eventLocation = 'Trung tâm Hội nghị TP. Hồ Chí Minh',
    speakers = 'Ban Chuyên Gia Đầu Ngành AI',
    eventId = 1,
    userId,
    email,
    customMessage,
    apiBaseUrl = 'http://localhost:8000',
    eventUrl = 'http://localhost:3000/events',
  } = props;

  const starItems = [
    { stars: 1, emoji: '⭐', score: '1 Sao', label: 'Rất tệ', color: '#DC2626', bg: '#FFFFFF', border: '#E2E8F0' },
    { stars: 2, emoji: '⭐⭐', score: '2 Sao', label: 'Kém', color: '#EA580C', bg: '#FFFFFF', border: '#E2E8F0' },
    { stars: 3, emoji: '⭐⭐⭐', score: '3 Sao', label: 'Bình thường', color: '#D97706', bg: '#FFFFFF', border: '#E2E8F0' },
    { stars: 4, emoji: '⭐⭐⭐⭐', score: '4 Sao', label: 'Hài lòng', color: '#16A34A', bg: '#FFFFFF', border: '#E2E8F0' },
    { stars: 5, emoji: '⭐⭐⭐⭐⭐', score: '5 Sao', label: 'Tuyệt vời!', color: '#CA8A04', bg: '#FEF9C3', border: '#FACC15' },
  ];

  const starTds = starItems
    .map((item) => {
      const link = buildQuickRateLink(eventId, item.stars, userId, email, apiBaseUrl);
      return `
        <td align="center" style="padding: 4px;">
          <a href="${link}" target="_blank" style="display: block; background: ${item.bg}; border: 1.5px solid ${item.border}; border-radius: 12px; padding: 12px 8px; text-decoration: none; box-shadow: 0 2px 5px rgba(0,0,0,0.04); min-width: 65px;">
            <span style="font-size: 18px; display: block; margin-bottom: 4px;">${item.emoji}</span>
            <span style="font-size: 11px; font-weight: 800; color: ${item.color}; display: block;">${item.score}</span>
            <span style="font-size: 9px; color: #64748B; font-weight: 600;">${item.label}</span>
          </a>
        </td>
      `;
    })
    .join('');

  const customMsgBox = customMessage
    ? `
      <div style="background-color: #F8FAFC; border-left: 4px solid #4F46E5; padding: 18px 20px; border-radius: 10px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155;">${customMessage.replace(/\n/g, '<br/>')}</p>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tri Ân & Khảo Sát Sự Kiện - EventHub AI</title>
</head>
<body style="margin: 0; padding: 32px 12px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.08);">
    
    <!-- 1. Header Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, #1E1B4B 0%, #3730A3 100%); padding: 36px 28px; text-align: center;">
        <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #FFFFFF; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 9999px; margin-bottom: 12px;">
          🙏 THƯ TRI ÂN & TỔNG KẾT • POST-EVENT RECAP
        </div>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
          ${eventTitle}
        </h1>
        <p style="margin: 8px 0 0 0; color: #C7D2FE; font-size: 13px; font-weight: 500;">
          Ban Tổ Chức xin chân thành cảm ơn sự hiện diện và đồng hành của Quý vị!
        </p>
      </td>
    </tr>

    <!-- 2. Thân Thư -->
    <tr>
      <td style="padding: 36px 32px; background-color: #FFFFFF;">
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #1E293B;">
          Kính gửi Quý Khách <strong style="color: #4F46E5; font-size: 17px;">${recipientName}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          Sự kiện <strong>${eventTitle}</strong> đã chính thức khép lại thành công rực rỡ. Ban Tổ Chức xin gửi lời tri ân sâu sắc nhất tới Quý vị vì đã dành thời gian quý báu tham dự và đóng góp tích cực vào các phiên thảo luận.
        </p>

        ${customMsgBox}

        <!-- 3. Bộ Đánh Giá 5 Sao Trực Tiếp (Task 100) -->
        <div style="background: linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%); border: 2px solid #C7D2FE; border-radius: 16px; padding: 24px 16px; text-align: center; margin: 28px 0;">
          <div style="font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
            ⭐ KHẢO SÁT HÀI LÒNG NHANH (1-CLICK DIRECT RATING)
          </div>
          <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 800; color: #1E293B;">
            Bạn đánh giá trải nghiệm sự kiện hôm nay thế nào?
          </h3>
          <p style="margin: 0 0 18px 0; font-size: 12px; color: #64748B;">
            Chạm vào số sao bên dưới để gửi phản hồi tức thì từ hộp thư (không yêu cầu đăng nhập):
          </p>

          <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
            <tr>
              ${starTds}
            </tr>
          </table>
        </div>

        <!-- 4. Footer Info Card & CTA Tải Tài Liệu -->
        <div style="background-color: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 16px; padding: 22px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
            📌 THẺ THÔNG TIN SỰ KIỆN • EVENT RECAP SUMMARY
          </div>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #334155; line-height: 2;">
            <tr>
              <td width="30%" style="color: #64748B; font-weight: 600;">Sự kiện:</td>
              <td><strong style="color: #0F172A;">${eventTitle}</strong></td>
            </tr>
            <tr>
              <td style="color: #64748B; font-weight: 600;">Thời gian:</td>
              <td><strong style="color: #0F172A;">${eventDate}</strong></td>
            </tr>
            <tr>
              <td style="color: #64748B; font-weight: 600;">Địa điểm:</td>
              <td><strong style="color: #0F172A;">${eventLocation}</strong></td>
            </tr>
            <tr>
              <td style="color: #64748B; font-weight: 600;">Diễn giả chính:</td>
              <td><span style="color: #4F46E5; font-weight: 700;">${speakers}</span></td>
            </tr>
          </table>

          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #CBD5E1; text-align: center;">
            <a href="${eventUrl}" target="_blank" style="background: linear-gradient(135deg, #4338CA 0%, #312E81 100%); color: #FFFFFF; font-size: 13px; font-weight: 800; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.25);">
              📜 Tải Slide Bài Giảng & Nhận E-Certificate
            </a>
          </div>
        </div>

        <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #64748B; text-align: center;">
          Hẹn gặp lại Quý vị trong các mùa sự kiện tiếp theo cùng hệ sinh thái <strong>EventHub AI</strong>!
        </p>
      </td>
    </tr>

    <!-- 5. Footer -->
    <tr>
      <td style="background-color: #F8FAFC; padding: 24px; text-align: center; border-top: 1px solid #F1F5F9; color: #64748B; font-size: 12px; line-height: 1.6;">
        <p style="margin: 0 0 4px 0; color: #1E293B; font-weight: 700;">
          Ban Tổ Chức Hệ Thống EventHub AI
        </p>
        <p style="margin: 0 0 8px 0; color: #64748B;">
          Hotline: (+84) 28 3822 8899 | Email: press@eventhub.ai | Website: https://eventhub.ai
        </p>
        <p style="margin: 0; color: #94A3B8; font-size: 11px;">
          © 2026 EventHub AI System. Thư tri ân phát hành tự động theo tiêu chuẩn bảo mật.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
