export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId') || searchParams.get('event_id');
  const userId = searchParams.get('userId') || searchParams.get('user_id');
  const email = searchParams.get('email');
  const stars = searchParams.get('stars') || searchParams.get('rating') || '5';

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const targetUrl = new URL(`${backendUrl}/api/v1/feedback/quick-rate`);
  if (eventId) targetUrl.searchParams.set('eventId', eventId);
  if (userId) targetUrl.searchParams.set('userId', userId);
  if (email) targetUrl.searchParams.set('email', email);
  targetUrl.searchParams.set('stars', stars);

  try {
    const res = await fetch(targetUrl.toString(), {
      headers: {
        Accept: request.headers.get('accept') || 'text/html',
      },
    });

    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    return new Response(
      `<h3>Không thể kết nối đến máy chủ phản hồi: ${err.message}</h3>`,
      { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  try {
    const contentType = request.headers.get('content-type') || '';
    let bodyData: any;
    if (contentType.includes('application/json')) {
      bodyData = await request.json();
    } else {
      bodyData = await request.formData();
    }

    const res = await fetch(`${backendUrl}/api/v1/feedback/quick-rate/comment`, {
      method: 'POST',
      body: bodyData,
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    return new Response(
      `<h3>Lỗi xử lý gửi góp ý: ${err.message}</h3>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
