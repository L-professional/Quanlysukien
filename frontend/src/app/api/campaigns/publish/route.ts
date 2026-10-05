import { apiService } from '../../../../services/api';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Task 100: Validation guard for post-event recap publishing
    const isRecap = payload.campaign_type === 'RECAP_THANKYOU';
    const isPostEventAudience = payload.target_audience === 'CHECKED_IN_ONLY' || payload.target_audience === 'NO_SHOW_ONLY';

    if (isRecap || isPostEventAudience) {
      if (payload.event_status && !['COMPLETED', 'ENDED', 'FINISHED', 'CONCLUDED', 'ĐÃ KẾT THÚC'].includes((payload.event_status || '').toUpperCase())) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Sự kiện chưa kết thúc. Chỉ có thể phát hành thư Tổng kết & Tri ân sau khi sự kiện hoàn tất!',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const result = await apiService.publishPRCampaign(payload);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    const detail = error.response?.data?.detail || error.message || 'Lỗi phát hành chiến dịch';
    return new Response(
      JSON.stringify({ success: false, detail }),
      { status: error.response?.status || 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
