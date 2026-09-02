import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with the API key from environment variable
// We fall back to a dummy key to prevent crash if not set, but it will fail on actual fetch.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_API_KEY');

export async function POST(req: NextRequest) {
  try {
    const { image, prompt } = await req.json();

    if (!image) {
      return Response.json({ error: 'Thiếu hình ảnh từ camera' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ 
        reply: "Dạ, hiện tại hệ thống chưa được cấu hình API Key của Google Gemini. Xin vui lòng thêm GEMINI_API_KEY vào file .env.local để tôi có thể nhìn thấy nhé."
      });
    }

    // Strip the "data:image/jpeg;base64," part
    const base64Data = image.split(',')[1] || image;

    // Use Gemini 3.6 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // Knowledge Base Prompt (Mocking pre-trained data as requested by the user)
    const systemInstruction = `
Bạn là một Hướng dẫn viên du lịch ảo thông minh của hệ thống HueViVu Live. 
Người dùng sẽ đưa camera vào một đồ vật và hỏi bạn qua giọng nói.
Nhiệm vụ của bạn là nhận diện vật thể và trả lời thật tự nhiên, lôi cuốn, súc tích (dưới 50 chữ).
Dữ liệu đặc biệt (Knowledge Base): 
Nếu người dùng giơ lên một CHÚA CỐC (hoặc cái ly) bất kỳ, bạn PHẢI nhận diện đó là: "Cốc Harry Potter phiên bản Cố đô". Và bạn sẽ mô tả: "Đây là chiếc cốc Harry Potter, ra đời vào năm 1997 cùng với cuốn sách đầu tiên. Điều đặc biệt là chiếc cốc này có in hình rồng thời Nguyễn, một phiên bản giới hạn kết hợp giữa phép thuật Hogwarts và di sản Huế."
Nếu là các vật thể khác, hãy mô tả ngắn gọn và gắn một chút vibe Huế nếu có thể.
`;

    const chatResult = await model.generateContent([
      systemInstruction,
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const reply = chatResult.response.text();

    return Response.json({ reply });

  } catch (error: any) {
    console.error('[Vision API Error]:', error);
    return Response.json({ error: 'Lỗi trong quá trình xử lý hình ảnh qua Gemini API: ' + error.message }, { status: 500 });
  }
}
