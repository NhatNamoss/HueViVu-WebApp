export async function POST() {
  return Response.json({ error: 'Hãy tạo lịch trình để bắt đầu trải nghiệm không cần tài khoản.' }, { status: 410 });
}
