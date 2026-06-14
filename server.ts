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

      const prompt = `You are an expert HR system.
Extract the person's resume details from the provided document perfectly.
Structure the text correctly and return ONLY the JSON matching the required schema.
Ensure all names, titles, locations, emails, and summaries are accurate.
If a section isn't found, leave the array empty or the string null. 
Do not hallucinate data.

IMPORTANT FOR SKILLS: 
Group related skills together intelligently into categories based on ecosystems or domains.
Look for programming languages, frameworks, AI tools, etc., and group them logically.
Format each skill entry STRICTLY as "Category: Skill1, Skill2, Skill3".
For example: "Python: Django, Flask, OpenCV" or "Frontend: React, TypeScript, Tailwind".
Do not just output single disconnected skills if they can be categorized.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [{ text: prompt }, { inlineData: { data: base64Data, mimeType: fileType } }],
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
