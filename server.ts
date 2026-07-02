/**
 * server.ts — Express Development Server
 *
 * The primary entry point for local development (npm run dev / npm start).
 * Combines Express API routes with Vite's dev middleware for a unified
 * development experience on a single port (3000).
 *
 * API Routes:
 * - POST /api/parse-resume: Server-side Gemini AI resume parsing.
 *   Accepts { fileType, base64Data } and returns structured resume JSON.
 *   Returns 412 if GEMINI_API_KEY is missing/placeholder (signals frontend
 *   to fall back to client-side Gemini proxy).
 *
 * Development Mode:
 * - Vite middleware handles HMR, module resolution, and SPA routing
 *
 * Production Mode:
 * - Serves static files from dist/ and handles SPA fallback routing
 *
 * Environment Variables:
 * - GEMINI_API_KEY: Google Gemini API key for resume parsing
 * - NODE_ENV: Controls dev vs production mode
 *
 * Note: This file runs via `tsx` (TypeScript execution) — not compiled by Vite.
 * The Vercel deployment uses api/parse-resume.ts instead (serverless function).
 */
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { RESUME_PARSER_SYSTEM_PROMPT, ATS_EVALUATION_SYSTEM_PROMPT } from './src/lib/aiPrompt';
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { globalRateLimiter } from "./src/utils/rateLimiter.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images/PDFs
  app.use(express.json({ limit: "50mb" }));

  // API route for secure server-side parsing (used in production/Vercel)
  app.post("/api/parse-resume", async (req, res) => {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      if (globalRateLimiter.isRateLimited(ip as string)) {
        return res.status(429).json({ error: "Too many requests from this IP. Please try again later." });
      }

      const { fileType, base64Data } = req.body;

      if (!base64Data || !fileType) {
        return res.status(400).json({ error: "Missing fileData or fileType" });
      }

      // Check if the server has a real API key configured.
      // If deployed on Vercel, this is where the real key lives.
      const apiKey = process.env.GEMINI_API_KEY;
      
      // AI Studio might inject "AI Studio Free Tier" or similar placeholder texts.
      // A valid Gemini key is typically 39 characters long and doesn't contain spaces.
      const isPlaceholderKey = !apiKey || apiKey.includes(' ') || apiKey.length < 20;

      if (isPlaceholderKey) {
        // We return 412 Precondition Failed to explicitly tell the frontend:
        // "There is no real server key. Falling back to frontend proxy mode!"
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
                required: ["name"],
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
                },
              },
              skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      });

      const jsonStr = result.text?.trim();
      if (!jsonStr) throw new Error("Empty response from AI");

      const parsedResult = JSON.parse(jsonStr);
      res.json(parsedResult);
    } catch (error: any) {
      console.error("Secure API Parse Error:", error);
      res.status(500).json({ error: "Failed to parse resume" });
    }
  });

  // ATS check API route
  app.post("/api/ats-check", async (req, res) => {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
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
        model: "gemini-3.1-flash-lite-preview",
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
      res.json(parsedResult);
    } catch (error: any) {
      console.error("Secure API ATS Check Error:", error);
      res.status(500).json({ error: "Failed to perform ATS check" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
        // use sendFile because we might have multiple routes like /edit
        res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
