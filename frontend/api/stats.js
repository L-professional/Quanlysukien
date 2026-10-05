export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    total_users: 15,
    total_events: 5,
    active_events: 3,
    total_attendees: 120,
    actual_checked_in: 88,
    total_revenue: 64000000,
    total_revenue_formatted: '64,000,000đ',
    satisfaction_rate: 96.5,
    uptime_rate: 99.9,
    user_roles: { ATTENDEE: 10, STAFF: 3, EVENT_MANAGER: 1, ADMIN: 1 },
    revenue_by_tier: [],
    upcoming_events: [],
    recent_activities: [],
    timeline_chart: []
  });
}
