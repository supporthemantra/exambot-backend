const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cors({ origin: "*" }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const WEBSITE_KNOWLEDGE = `
ABOUT HEMANTRA (https://hemantra.com):
- Founded by Hemant Sir, an ex-Para Military Officer and mentor for competitive government exams.

COURSES:
- UPSC CAPF: https://hemantra.com/capf-assistant-commandant/
- Delhi High Court: https://hemantra.com/court-exams/
- IB SA 2025: https://hemantra.com/ib/
- NABARD: https://hemantra.com/nabard/
- DSSSB: https://hemantra.com/dsssb/
- Bank Exams: https://hemantra.com/bank-exams/
- NCERT Foundation: https://hemantra.com/ncert/
- Free Courses: https://hemantra.com/free-courses/
- All Courses: https://hemantra.com/course-list/

STUDY MATERIALS:
- Daily Dispatch: https://hemantra.com/daily-dispatch-capf-ac/
- Monthly Magazine: https://hemantra.com/monthly-magazine/
- Monthly PIB: https://hemantra.com/monthly-pib/
- Essay Writing: https://hemantra.com/essay-writting/
- Argument Writing: https://hemantra.com/arguement-writting/
- All Materials: https://hemantra.com/study-materials/

DAILY DISPATCH BY MONTH:
- June 2026: https://hemantra.com/june-2/
- May 2026: https://hemantra.com/may-2026/
- April 2026: https://hemantra.com/april-2/
- March 2026: https://hemantra.com/march-2026/
- February 2026: https://hemantra.com/february-2026/
- January 2026: https://hemantra.com/january-2026/

OTHER:
- Dashboard: https://hemantra.com/dashboard/
- Contact: https://hemantra.com/contact-us/
`;

const SYSTEM_BASE = `You are HeMantra AI, a professional study assistant for HeMantra (https://hemantra.com), founded by Hemant Sir.

${WEBSITE_KNOWLEDGE}

TONE AND LANGUAGE RULES:
1. Always respond in clear, professional English.
2. If the student writes in Hindi, respond in simple professional Hinglish — never randomly mix Hindi into an English reply.
3. Match reply length to question complexity. Short question = short answer. Detailed question = detailed answer.
4. Never use casual greetings like "Namaste", "Bilkul sahi", "kaise ho".
5. Only mention HeMantra resources when directly relevant.
6. Be precise, helpful, and respectful — like a knowledgeable senior mentor.
7. For simple greetings like "hi" or "hello", respond briefly and ask how you can help. Nothing more.`;

const MODES = {
  doubt: `${SYSTEM_BASE}

YOUR ROLE: Answer student doubts about UPSC CAPF, Delhi High Court, IB, DSSSB, NABARD, Bank Exams, SSC, and State PSC exams. When asked about study materials or resources, provide the exact URL.`,

  evaluate: `${SYSTEM_BASE}

YOUR ROLE: Evaluate the student's answer copy. The student may have submitted text, a PDF, or images of handwritten/typed answers.

IMPORTANT: If images are provided, carefully read ALL visible text in the images — including handwritten content — and evaluate it thoroughly. Do NOT ask the student to paste the content again.

Provide your evaluation in this format:
Score: X/10

Strengths:
- [point 1]
- [point 2]

Areas to Improve:
- [point 1]
- [point 2]

Missing Points:
- [point 1]

Suggested Structure:
[brief suggestion]

Be specific, fair, and constructive.`,
};

app.post("/chat", async (req, res) => {
  const { messages, mode, images } = req.body;
  if (!messages || !mode) return res.status(400).json({ error: "Missing messages or mode" });

  const systemPrompt = MODES[mode] || MODES.doubt;

  try {
    let finalMessages;

    if (images && images.length > 0 && mode === "evaluate") {
      // Use vision-capable model with images
      const lastUserMsg = messages[messages.length - 1];
      const historyWithoutLast = messages.slice(0, -1);

      // Build multimodal content
      const imageContents = images.map(function(imgData) {
        const base64 = imgData.includes(",") ? imgData.split(",")[1] : imgData;
        const mediaType = imgData.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        return {
          type: "image_url",
          image_url: { url: "data:" + mediaType + ";base64," + base64 }
        };
      });

      const multimodalContent = [
        { type: "text", text: lastUserMsg.content },
        ...imageContents
      ];

      finalMessages = [
        { role: "system", content: systemPrompt },
        ...historyWithoutLast,
        { role: "user", content: multimodalContent }
      ];

      // Use vision model for images
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          max_tokens: 1500,
          temperature: 0.4,
          messages: finalMessages,
        }),
      });

      const data = await response.json();
      if (data.error) return res.status(500).json({ error: data.error.message });
      const reply = data.choices?.[0]?.message?.content || "Sorry, could not evaluate the image.";
      return res.json({ reply });

    } else {
      // Text-only — use standard model
      finalMessages = [
        { role: "system", content: systemPrompt },
        ...messages
      ];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          temperature: 0.5,
          messages: finalMessages,
        }),
      });

      const data = await response.json();
      if (data.error) return res.status(500).json({ error: data.error.message });
      const reply = data.choices?.[0]?.message?.content || "Sorry, no response generated.";
      return res.json({ reply });
    }

  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Failed to contact AI. Please try again." });
  }
});

app.get("/", (req, res) => res.send("HeMantra AI backend is running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HeMantra AI server running on port ${PORT}`));
