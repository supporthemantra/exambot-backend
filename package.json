const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODES = {
  doubt: `You are an expert tutor for Indian competitive government exams including UPSC Civil Services, IB (Intelligence Bureau), High Court exams, SSC, and State PSC exams. Answer student doubts clearly and accurately. Use relevant examples from Indian governance, history, polity, economy, and current affairs. Be encouraging and educational. Keep answers concise but complete.`,

  evaluate: `You are an expert evaluator for Indian competitive government exams (UPSC, IB, High Court, SSC, State PSC). The student will paste their written answer. Evaluate it and provide:
1) A score out of 10
2) Key strengths
3) Areas to improve
4) Missing points
5) Suggested structure
Be constructive and specific. Start your response with "Score: X/10" on the first line.`,

  hint: `You are a tutor for Indian competitive government exams. The student will share a question or topic they are stuck on. Give them a helpful hint or guiding clue WITHOUT giving away the full answer. Help them think in the right direction. Encourage critical thinking.`,

  mcq: `You are an MCQ test generator for Indian competitive government exams (UPSC, IB, High Court, SSC). Generate ONE multiple choice question related to what the student mentions, or a random important topic if they just say "test me". Format: Question on first line, then options A) B) C) D) each on new lines, then wait for student answer. After they answer, tell them if correct and explain why.`,
};

app.post("/chat", async (req, res) => {
  const { messages, mode } = req.body;
  if (!messages || !mode) {
    return res.status(400).json({ error: "Missing messages or mode" });
  }

  const systemPrompt = MODES[mode] || MODES.doubt;

  // Convert messages to Gemini format
  const geminiMessages = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, no response generated.";
    res.json({ reply });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Failed to contact AI. Please try again." });
  }
});

app.get("/", (req, res) => res.send("ExamBot backend is running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ExamBot server running on port ${PORT}`));
