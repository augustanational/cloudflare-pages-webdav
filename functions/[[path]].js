export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // Lấy cấu hình từ Biến môi trường (Environment Variables) của Cloudflare Pages
  const ORIGIN_SERVER = context.env.WEBDAV_URL; 
  const USERNAME = context.env.WEBDAV_USER;
  const PASSWORD = context.env.WEBDAV_PASSWORD;

  // Kiểm tra nếu chưa cấu hình biến môi trường
  if (!ORIGIN_SERVER || !USERNAME || !PASSWORD) {
    return new Response("Cấu hình hệ thống chưa hoàn tất: Thiếu Biến môi trường (ENV).", { status: 500 });
  }

  // Tự động tạo chuỗi xác thực Base64 ngay trong runtime từ User và Pass trong ENV
  const credentials = `${USERNAME}:${PASSWORD}`;
  // Hỗ trợ mã hóa an toàn trên môi trường V8 của Cloudflare Workers/Pages
  const encoder = new TextEncoder();
  const data = encoder.encode(credentials);
  const AUTH_TOKEN = btoa(String.fromCharCode(...data));

  // Chuẩn hóa URL gốc (Xóa dấu gạch chéo cuối nếu có để tránh lỗi double slash //)
  const cleanOrigin = ORIGIN_SERVER.endsWith('/') ? ORIGIN_SERVER.slice(0, -1) : ORIGIN_SERVER;
  const targetUrl = cleanOrigin + url.pathname + url.search;

  // Sao chép và chỉnh sửa headers từ request gốc
  const newHeaders = new Headers(request.headers);
  
  // Tự động chèn thông tin đăng nhập ẩn vào header trước khi gửi đi
  newHeaders.set("Authorization", `Basic ${AUTH_TOKEN}`);

  // Tạo request mới giữ nguyên các phương thức WebDAV đặc thù (PROPFIND, MKCOL,...)
  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: "manual"
  });

  try {
    const response = await fetch(modifiedRequest);
    return response;
  } catch (err) {
    return new Response(`Pages Proxy Error: ${err.message}`, { status: 500 });
  }
}
