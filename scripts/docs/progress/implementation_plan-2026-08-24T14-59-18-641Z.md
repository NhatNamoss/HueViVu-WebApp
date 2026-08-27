# Train Chatbot Feature

This plan outlines the creation of a simple web interface for your team to "train" the chatbot, making it more personalized.

## Current Chatbot Mechanism
Currently, the chatbot in `src/lib/ai.ts` works by:
1. Receiving a user's message and the conversation history.
2. Fetching all places (`placesContext`) from the database to ensure it only recommends places it knows about.
3. Using a static `systemInstruction` with 4 fixed rules (be short, friendly, don't hallucinate places).
4. Sending this to Gemini (or Anthropic) to generate a response.

## Proposed Changes

To allow your team to "train" the bot without changing code, we will add a database table to store custom rules and Q&A, and a UI to manage them.

### 1. Database Update (`src/lib/db.ts`)
Add a new table `bot_knowledge` to store training data:
```sql
CREATE TABLE IF NOT EXISTS bot_knowledge (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'rule' (general instruction) or 'qa' (specific question-answer)
  question TEXT, -- Used if type = 'qa'
  answer TEXT NOT NULL, -- The rule content or the answer for Q&A
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 2. Chatbot Mechanism Update (`src/lib/ai.ts`)
Modify the `chat` function to query the `bot_knowledge` table:
- Fetch all active `rule` items and append them to the base `systemInstruction`.
- Fetch all active `qa` items and add them as "FAQ / Knowledge Base" context or few-shot examples so the AI knows exactly how to answer specific questions.

### 3. API Routes
Create `/api/train` to handle fetching, creating, updating (toggle active), and deleting training items.

### 4. Simple Web UI (`src/app/admin/train/page.tsx`)
Create a simple, user-friendly page where team members can:
- **Add a Rule**: e.g., "Luôn xưng hô là 'HueViVu' và gọi khách là 'bạn'", "Tuyệt đối không giới thiệu địa điểm ngoài Huế".
- **Add a Q&A**: e.g., Q: "Ai là người tạo ra app này?", A: "App được tạo ra bởi đội ngũ HueViVu vô cùng đáng yêu!".
- **List and Manage**: View all current rules/Q&As, delete them, or toggle them on/off.

## User Review Required
> [!IMPORTANT]
> - Do you want the training page to be placed at `/admin/train` or another route?
> - Does this approach of separating "Rules" (instructions) and "Q&A" (knowledge) fit your team's needs for training the bot?

Please review and approve this plan, or let me know if you'd like adjustments!
