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
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import parseResumeHandler from './api/parse-resume.ts';
import atsCheckHandler from './api/ats-check.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images/PDFs
  app.use(express.json({ limit: "50mb" }));

  // Use the exact same handler from the Vercel API for local development
  // This guarantees local testing is identical to production.
  app.post("/api/parse-resume", async (req, res) => {
    await parseResumeHandler(req, res);
  });

  // Use the exact same handler from the Vercel API for local development
  app.post("/api/ats-check", async (req, res) => {
    await atsCheckHandler(req, res);
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
