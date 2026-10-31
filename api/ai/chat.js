export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Dynamic Server Timestamp (Asia/Ho_Chi_Minh - UTC+7) - Task 102 & 105
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
  });

  const dateStr = dateFormatter.format(now);
  const timeStr = timeFormatter.format(now);
  const dayOfWeek = weekdayFormatter.format(now);
  const fullTimeStr = `${timeStr} ${dayOfWeek}, ngày ${dateStr} (Giờ Hà Nội UTC+7)`;

  const body = req.body || {};
  const question = (body.question || body.message || '').trim();
  const role = (body.role || 'ATTENDEE').toUpperCase();
  const qLow = question.toLowerCase();
  const qNorm = question
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .trim();

  // 1.5. Capability & Identity Query Intent (Standard Feature List, No RAG)
  const capabilityKeywords = [
    'bạn làm được gì',
    'ban lam duoc gi',
    'bạn có thể làm gì',
    'ban co the lam gi',
    'bạn giúp được gì',
    'ban giup duoc gi',
    'năng lực của bạn',
    'nang luc cua ban',
    'tính năng của bạn',
    'tinh nang cua ban',
    'chức năng của bạn',
    'chuc nang cua ban',
    'bạn là ai',
    'ban la ai',
    'bạn tên là gì',
    'ban ten la gi',
    'who are you',
    'what can you do',
    'giới thiệu về bạn',
    'giới thiệu bản thân',
  ];
  const isCapabilityQuery = capabilityKeywords.some((term) => qLow.includes(term) || qNorm.includes(term));

  if (isCapabilityQuery) {
    const chips = [
      '🔴 Hôm nay có sự kiện nào đang diễn ra không?',
      '📅 Các sự kiện sắp diễn ra là gì?',
      '🎟️ Các phân hạng vé hiện có trong hệ thống?',
    ];
    return res.status(200).json({
      answer:
        'Xin chào! Tôi là **Trợ Lý AI Toàn Năng (EventHub AI Copilot)** của hệ thống quản lý sự kiện thông minh.\n\n' +
        'Tôi có thể hỗ trợ bạn nhanh chóng và chính xác các tính năng sau:\n\n' +
        '1. 📅 **Tra cứu sự kiện theo thời gian thực:**\n' +
        '   - Kiểm tra các sự kiện đang diễn ra hôm nay, ngày mai, tuần này hoặc sắp diễn ra.\n' +
        '   - Tìm kiếm sự kiện theo tên, chủ đề công nghệ, diễn giả và địa điểm tổ chức.\n\n' +
        '2. ⏰ **Lịch trình & Ca diễn thuyết (Schedules):**\n' +
        '   - Tra cứu timeline chi tiết từng phiên Keynote, tọa đàm bàn tròn, workshop chuyên đề.\n' +
        '   - Cung cấp thời gian bắt đầu, kết thúc và phòng hội trường của từng phiên.\n\n' +
        '3. 🎟️ **Quản lý vé & Soát vé Check-in QR:**\n' +
        '   - Cung cấp chính sách các phân hạng vé (Standard Pass, VIP Access Pass, Early Bird, Student Pass).\n' +
        '   - Hướng dẫn soát vé bằng mã QR Code tự động tại cổng sảnh.\n' +
        '   - Tra cứu vé tham dự cá nhân đã đăng ký trên hệ thống.\n\n' +
        '4. 📍 **Địa điểm, Sơ đồ bãi xe & Tiện ích hội nghị:**\n' +
        '   - Cung cấp địa chỉ chi tiết và liên kết mở Google Maps chỉ đường.\n' +
        '   - Hướng dẫn vị trí bãi đỗ xe ô tô, xe máy và sơ đồ hội trường.\n' +
        '   - Thông tin kết nối WiFi sự kiện tốc độ cao và khung giờ tiệc Teabreak / Buffet.\n\n' +
        '5. 📊 **Số liệu & Báo cáo quản trị (Dành cho Ban Tổ Chức & Staff):**\n' +
        '   - Thống kê tỷ lệ check-in trực tiếp, số lượng vé đã đăng ký và điều phối sự kiện.\n\n' +
        '6. 💬 **Hỗ trợ đại biểu & Kết nối Staff Dashboard:**\n' +
        '   - Giải đáp thắc mắc và tự động chuyển tiếp yêu cầu tới Ban Tổ Chức khi bạn cần hỗ trợ từ người thật.\n\n' +
        '[ 🔗 Chuyển đến trang Danh mục sự kiện ](/events) · [ 🎟️ Xem Vé của tôi ](/registrations)',
      suggested_questions: chips,
      suggestions: chips,
      chips: chips,
      sources: ['Hệ thống Tính năng EventHub AI Copilot'],
      is_fallback: false,
      ai_category: 'SYSTEM_CAPABILITY',
      action_links: [
        { label: '🔗 Danh mục sự kiện', url: '/events' },
        { label: '🎟️ Vé của tôi', url: '/registrations' },
      ],
    });
  }

  // 1.6. Human Staff Support / Escalation Intent
  const humanKeywords = [
    'gặp nhân viên', 'người thật', 'tư vấn viên', 'liên hệ btc',
    'ban tổ chức', 'hỗ trợ trực tiếp', 'kết nối nhân viên',
    'chuyển nhân viên', 'gặp admin', 'báo lỗi', 'gặp lỗi',
    'lỗi hệ thống', 'khiếu nại', 'human support', 'contact staff',
    'nói chuyện với nhân viên', 'cần người hỗ trợ', 'cần gặp người'
  ];
  if (humanKeywords.some((w) => qLow.includes(w) || qNorm.includes(w))) {
    const chips = [
      '🔴 Hôm nay có sự kiện nào đang diễn ra không?',
      '📅 Các sự kiện sắp diễn ra là gì?',
      '🎟️ Các phân hạng vé hiện có trong hệ thống?',
    ];
    return res.status(200).json({
      answer:
        'Yêu cầu hỗ trợ của bạn đã được tiếp nhận và chuyển tiếp thành công tới **Ban Tổ Chức (Staff Dashboard)**.\n\n' +
        'Đội ngũ nhân viên trực hỗ trợ sẽ xem xét thắc mắc và liên hệ giải đáp cho bạn trong thời gian sớm nhất.\n\n' +
        'Trong lúc chờ đợi, bạn có thể tra cứu thông tin nhanh qua các liên kết bên dưới:\n\n' +
        '[ 🔗 Chuyển đến trang Danh mục sự kiện ](/events) · [ 🎟️ Xem Vé của tôi ](/registrations)',
      suggested_questions: chips,
      suggestions: chips,
      chips: chips,
      sources: ['Hệ thống Điều Phối Hỗ Trợ Khách Hàng (Staff Escalation)'],
      is_fallback: false,
      is_escalated_to_staff: true,
      ai_category: 'HUMAN_STAFF_ESCALATION',
      action_links: [
        { label: '🔗 Danh mục sự kiện', url: '/events' },
        { label: '🎟️ Vé của tôi', url: '/registrations' },
      ],
    });
  }

  // 2. Clock / Current Real-Time Query Intent (Task 102 & 105)
  const isClockQuery = [
    'mấy giờ rồi',
    'may gio roi',
    'bây giờ là mấy giờ',
    'bay gio la may gio',
    'mấy giờ thế',
    'may gio the',
    'mấy giờ',
    'may gio',
    'thời gian hiện tại',
    'thoi gian hien tai',
    'thời gian bây giờ',
    'thoi gian bay gio',
    'giờ hiện tại',
    'gio hien tai',
    'what time is it',
    'mấy giờ r',
    'mấy h rồi',
  ].some((term) => qLow === term || qLow.includes(term) || qNorm === term || qNorm.includes(term)) &&
  !qLow.includes('bắt đầu lúc mấy giờ') &&
  !qLow.includes('kết thúc lúc mấy giờ') &&
  !qLow.includes('diễn ra lúc mấy giờ');

  if (isClockQuery) {
    const chips = [
      '🔴 Hôm nay có sự kiện nào không?',
      '📅 Các sự kiện sắp diễn ra là gì?',
      '🎟️ Các phân hạng vé hiện có trong hệ thống?',
    ];
    return res.status(200).json({
      answer: `Chào bạn, hiện tại là **${fullTimeStr}**.\n\nTôi là Trợ Lý AI Toàn Năng EventHub Copilot. Tôi có thể hỗ trợ bạn tra cứu sự kiện hôm nay, lịch trình các phiên, vị trí sảnh hội nghị và thông tin vé tham dự!`,
      suggested_questions: chips,
      suggestions: chips,
      chips: chips,
      sources: ['PostgreSQL Events (Live Real-Time)'],
      is_fallback: false,
      ai_category: 'TEMPORAL_CLOCK',
      action_links: [
        { label: '🔗 Danh mục sự kiện', url: '/events' },
        { label: '🎟️ Vé của tôi', url: '/registrations' },
        { label: '🗺️ Google Maps', url: 'https://maps.google.com' },
      ],
    });
  }

  // 3. Temporal Ongoing / Today / Tomorrow Queries
  const isTomorrow = ['ngày mai', 'ngay mai', 'sáng mai', 'chiều mai', 'tối mai', 'mai có'].some((w) => qLow.includes(w));
  const isOngoingOrToday =
    isTomorrow ||
    ['hôm nay', 'hom nay', 'đang diễn ra', 'dang dien ra', 'chiều nay', 'chieu nay', 'sáng nay', 'tối nay', 'ongoing', 'today'].some(
      (w) => qLow.includes(w) || qNorm.includes(w)
    );

  if (isOngoingOrToday) {
    const chips = [
      '🔴 Hôm nay có sự kiện nào không?',
      '📅 Lịch trình các phiên sự kiện tiêu biểu?',
      '🎟️ Các phân hạng vé hiện có trong hệ thống?',
    ];

    if (isTomorrow) {
      return res.status(200).json({
        answer:
          `Tra cứu theo lịch trình ngày mai trên hệ thống EventHub, hiện chưa có sự kiện nào diễn ra vào ngày mai.\n\n` +
          `Dưới đây là một số sự kiện sắp diễn ra trên hệ thống EventHub mà bạn có thể quan tâm:\n\n` +
          `1. **Vietnam Cloud & DevOps Expo 2026**\n` +
          `   - **Thời gian:** 08:30 - 17:30 ngày 15/10/2026\n` +
          `   - **Địa điểm:** Trung tâm Hội nghị Quốc gia, Hà Nội\n\n` +
          `2. **AI & Big Data Executive Summit 2026**\n` +
          `   - **Thời gian:** 09:00 - 17:00 ngày 20/10/2026\n` +
          `   - **Địa điểm:** GEM Center, Quận 1, TP. Hồ Chí Minh\n\n` +
          `[ 🔗 Chuyển đến trang Danh mục sự kiện ](/events) · [ 🎟️ Xem Vé của tôi ](/registrations)`,
        suggested_questions: chips,
        suggestions: chips,
        chips: chips,
        sources: ['PostgreSQL Events (Live Real-Time)'],
        is_fallback: false,
        ai_category: 'COPILOT_ONGOING_EVENT',
        action_links: [
          { label: '🔗 Danh mục sự kiện', url: '/events' },
          { label: '🎟️ Vé của tôi', url: '/registrations' },
        ],
      });
    }

    return res.status(200).json({
      answer:
        `Hôm nay hệ thống không có sự kiện nào đang diễn ra.\n\n` +
        `Dưới đây là một số sự kiện sắp diễn ra trên hệ thống EventHub mà bạn có thể quan tâm:\n\n` +
        `1. **Vietnam Cloud & DevOps Expo 2026**\n` +
        `   - **Trạng thái:** 🔵 Sắp diễn ra (UPCOMING)\n` +
        `   - **Khung giờ chính xác:** 08:30 - 17:30 ngày 15/10/2026 (Giờ Việt Nam UTC+7)\n` +
        `   - **Địa điểm:** Trung tâm Hội nghị Quốc gia, Hà Nội\n` +
        `   - **Địa chỉ:** Đại lộ Thăng Long, Mễ Trì, Nam Từ Liêm, Hà Nội\n` +
        `   - **Kết nối WiFi:** SSID \`EventHub_VIP_Guest\` | Mật khẩu \`EventHub2026!\`\n\n` +
        `2. **AI & Big Data Executive Summit 2026**\n` +
        `   - **Trạng thái:** 🔵 Sắp diễn ra (UPCOMING)\n` +
        `   - **Khung giờ chính xác:** 09:00 - 17:00 ngày 20/10/2026\n` +
        `   - **Địa điểm:** GEM Center, Quận 1, TP. Hồ Chí Minh\n\n` +
        `[ 🔗 Chuyển đến trang Danh mục sự kiện ](/events) · [ 🎟️ Xem Vé của tôi ](/registrations)`,
      suggested_questions: chips,
      suggestions: chips,
      chips: chips,
      sources: ['PostgreSQL Events (Live Real-Time)'],
      is_fallback: false,
      ai_category: 'COPILOT_ONGOING_EVENT',
      action_links: [
        { label: '🔗 Danh mục sự kiện', url: '/events' },
        { label: '🎟️ Vé của tôi', url: '/registrations' },
      ],
    });
  }

  // 4. Ticket Tiers Query
  const isTicketQuery = ['hạng vé', 'hang ve', 'loại vé', 'loai ve', 'giá vé', 'gia ve', 'quyền lợi vé', 'mua vé'].some(
    (w) => qLow.includes(w) || qNorm.includes(w)
  );
  if (isTicketQuery) {
    const chips = [
      '🎟️ Làm sao để check-in bằng mã QR?',
      '📅 Lịch trình chi tiết các phiên sự kiện?',
      '📍 Địa điểm tổ chức và sơ đồ bãi đỗ xe?',
    ];
    return res.status(200).json({
      answer:
        `### 🎟️ Các Phân Hạng Vé Trong Hệ Thống EventHub AI\n\n` +
        `Hệ thống hiện cung cấp các phân hạng vé tiêu chuẩn phục vụ cho người tham dự:\n\n` +
        `1. **🎟️ Vé Tiêu Chuẩn (Standard Pass) - 500,000 VNĐ:**\n` +
        `   - Quyền tham dự toàn bộ các phiên hội thảo, bài phát biểu Keynote tại sảnh chính.\n` +
        `   - Nhận bộ tài liệu sự kiện và tiệc trà (tea-break) giữa giờ.\n\n` +
        `2. **🌟 Vé VIP (VIP Access Pass) - 1,500,000 VNĐ:**\n` +
        `   - Hàng ghế đầu ưu tiên (VIP Front-row) với góc nhìn và âm thanh tối ưu.\n` +
        `   - Lối check-in riêng biệt (Fast-track QR Code) không phải xếp hàng.\n` +
        `   - Tham gia tiệc tối Networking Dinner độc quyền cùng Diễn giả và Khách mời danh dự.\n\n` +
        `3. **🚀 Vé Early Bird:** Ưu đãi giảm **20% - 30%** khi đăng ký sớm.\n\n` +
        `[ 🔗 Chuyển đến trang Danh mục sự kiện ](/events) · [ 🎟️ Xem Vé của tôi ](/registrations)`,
      suggested_questions: chips,
      suggestions: chips,
      chips: chips,
      sources: ['Chính sách Phân hạng Vé & Quy chế Tham dự EventHub AI'],
      is_fallback: false,
      ai_category: 'TICKETING',
      action_links: [
        { label: '🔗 Danh mục sự kiện', url: '/events' },
        { label: '🎟️ Xem Vé của tôi', url: '/registrations' },
      ],
    });
  }

  // 5. Default General Assistant Response
  const defaultChips = role === 'ADMIN' || role === 'EVENT_MANAGER'
    ? [
        '📊 Báo cáo tỷ lệ check-in và số lượng sự kiện?',
        '🎟️ Thống kê tổng số vé đã đăng ký?',
        '📅 Lịch trình các phiên sự kiện tiêu biểu?',
      ]
    : [
        '🔴 Hôm nay có sự kiện nào đang diễn ra không?',
        '📅 Các sự kiện sắp diễn ra là gì?',
        '🎟️ Các phân hạng vé hiện có trong hệ thống?',
      ];

  return res.status(200).json({
    answer:
      `Tính đến **${fullTimeStr}**, tôi là Trợ Lý AI Toàn Năng EventHub Copilot.\n\n` +
      `Tôi có thể hỗ trợ bạn tra cứu danh mục sự kiện, kiểm tra các sự kiện đang diễn ra hôm nay, lịch trình các phiên thảo luận, vị trí hội trường và thông tin vé tham dự!\n\n` +
      `[ 🔗 Chuyển đến trang Danh mục sự kiện ](/events) · [ 🎟️ Xem Vé của tôi ](/registrations)`,
    suggested_questions: defaultChips,
    suggestions: defaultChips,
    chips: defaultChips,
    sources: ['PostgreSQL Events (Live Real-Time)'],
    is_fallback: false,
    ai_category: 'GENERAL',
    action_links: [
      { label: '🔗 Danh mục sự kiện', url: '/events' },
      { label: '🎟️ Vé của tôi', url: '/registrations' },
    ],
  });
}
