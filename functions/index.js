const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

exports.summarizeReflections = onCall(
  { secrets: [GEMINI_API_KEY] },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    // 2. Input validation
    const reflections = request.data.reflections;
    if (!Array.isArray(reflections) || reflections.length === 0) {
      throw new HttpsError("invalid-argument", "No reflections provided.");
    }

    // 3. Gemini client
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());

    // 4. Prompt
    const prompt = `
You are analyzing a series of personal daily reflections.

Tasks:
- Identify the dominant emotional tone
- Identify recurring mental or behavioral patterns
- Produce a concise, analytical summary

Rules:
- No advice
- No motivational language
- Neutral, reflective tone

Reflections:
${reflections.join("\\n---\\n")}
`;

    try {
      // 5. Call Gemini (requires @google/generative-ai up to date)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const summary = result.response.text();

      // 6. Return result
      return { summary };
    } catch (err) {
      console.error("Gemini API error:", err);
      throw new HttpsError("internal", "AI summarization failed.");
    }
  }
);


