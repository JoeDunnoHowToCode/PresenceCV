/**
 * api/parse-resume.ts — Vercel Serverless Function for Resume Parsing
 *
 * This is the production-deployment equivalent of the /api/parse-resume route
 * defined in server.ts. Deployed as a Vercel Serverless Function at /api/parse-resume.
 *
 * Request: POST { fileType: string, base64Data: string }
 * Response: Structured resume JSON (profile, contactItems, experience, education, skills)
 *
 * Key Behaviors:
 * - Returns 412 if GEMINI_API_KEY env var is missing/placeholder, telling the
 *   frontend to fall back to client-side Gemini proxy mode
 * - Returns 405 for non-POST methods
 * - Body size limit: 4MB (Vercel's hard limit is 4.5MB)
 *
 * AI Prompt:
 * - Comprehensive ATS-style extraction prompt covering contact items, experience,
 *   education, and categorized skills
 * - Uses Gemini structured output (responseSchema) for reliable JSON parsing
 *
 * Environment Variables: GEMINI_API_KEY
 * Consumed by: ImportResumeModal.tsx (via fetch POST)
 */
import { GoogleGenAI, Type } from "@google/genai";
import { RESUME_PARSER_SYSTEM_PROMPT } from "../src/lib/aiPrompt";

// Vercel serverless function configuration
// We set a 4MB limit here to ensure that Base64 payloads don't exceed Vercel's 4.5MB hard limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', 
    },
  },
};

import { globalRateLimiter } from "../src/utils/rateLimiter";

export default async function handler(req: any, res: any) {
  // Prevent any non-POST methods immediately
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (globalRateLimiter.isRateLimited(ip as string)) {
      return res.status(429).json({ error: "Too many requests from this IP. Please try again later." });
    }

    const { fileType, base64Data } = req.body;

    if (!base64Data || !fileType) {
      return res.status(400).json({ error: "Missing fileData or fileType" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isPlaceholderKey = !apiKey || apiKey.includes(' ') || apiKey.length < 20;

    if (isPlaceholderKey) {
      // Return 412 so the frontend knows there's no real Vercel key configured
      return res.status(412).json({ error: "NO_SERVER_KEY" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ text: RESUME_PARSER_SYSTEM_PROMPT }, { inlineData: { data: base64Data, mimeType: fileType } }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            profile: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                title: { type: Type.STRING },
                location: { type: Type.STRING },
                email: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
              required: ["name", "title", "location", "email", "summary"],
            },
            contactItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  icon: { type: Type.STRING, description: "One of: Mail, Phone, Globe, Linkedin, Github, Twitter" },
                  text: { type: Type.STRING, description: "Display text, e.g., email address, phone number, or handle" },
                  url: { type: Type.STRING, description: "The actual URL or mailto:/tel: link. If it's an email, prefix with mailto:. If it's a phone, prefix with tel:" }
                },
                required: ["icon", "text", "url"]
              }
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  period: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["title", "subtitle", "period", "description"]
              },
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  period: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["title", "subtitle", "period", "description"]
              },
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["profile", "contactItems", "experience", "education", "skills"]
        },
      },
    });

    const jsonStr = result.text?.trim();
    if (!jsonStr) throw new Error("Empty response from AI");

    const parsedResult = JSON.parse(jsonStr);
    res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error("Vercel Secure API Parse Error:", error);
    res.status(500).json({ error: "Failed to parse resume on Vercel backend" });
  }
}
