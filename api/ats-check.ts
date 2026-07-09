import { GoogleGenAI, Type } from "@google/genai";
import { ATS_EVALUATION_SYSTEM_PROMPT } from "../src/lib/aiPrompt";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', 
    },
  },
};

import { globalRateLimiter } from "../src/utils/rateLimiter";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (globalRateLimiter.isRateLimited(ip as string)) {
      return res.status(429).json({ error: "Too many requests from this IP. Please try again later." });
    }

    const { resumeData, jobDescription } = req.body;

    if (!resumeData || !jobDescription) {
      return res.status(400).json({ error: "Missing resumeData or jobDescription" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isPlaceholderKey = !apiKey || apiKey.includes(' ') || apiKey.length < 20;

    if (isPlaceholderKey) {
      return res.status(412).json({ error: "NO_SERVER_KEY" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: ATS_EVALUATION_SYSTEM_PROMPT },
        { text: `Resume Data: ${JSON.stringify(resumeData)}\n\nJob Description: ${jobDescription}` }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            aiSuggestion: { type: Type.STRING },
          },
        },
      },
    });

    const jsonStr = result.text?.trim();
    if (!jsonStr) throw new Error("Empty response from AI");

    const parsedResult = JSON.parse(jsonStr);
    res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error("Vercel Secure ATS Check Error:", error);
    res.status(500).json({ error: "Failed to perform ATS check on Vercel backend" });
  }
}
