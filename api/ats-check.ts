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
    let ipStr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (Array.isArray(ipStr)) {
      ipStr = ipStr[0];
    } else if (typeof ipStr === 'string' && ipStr.includes(',')) {
      ipStr = ipStr.split(',')[0].trim();
    }

    if (globalRateLimiter.isRateLimited(ipStr)) {
      return res.status(429).json({ error: "Too many requests from this IP. Please try again later." });
    }

    // Authenticate user via Firebase ID Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized. Missing or invalid Authorization header." });
    }
    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      const { adminAuth } = await import('./firebase-admin');
      if (!adminAuth) throw new Error("adminAuth not initialized");
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      console.error("Firebase ID Token verification failed:", err);
      return res.status(401).json({ error: "Unauthorized. Invalid ID token." });
    }
    const uid = decodedToken.uid;
    const isAdmin = uid === process.env.ADMIN_UID;

    const { resumeData, jobDescription } = req.body;

    if (!resumeData || !jobDescription) {
      return res.status(400).json({ error: "Missing resumeData or jobDescription" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isPlaceholderKey = !apiKey || apiKey.includes(' ') || apiKey.length < 20;

    if (isPlaceholderKey) {
      return res.status(412).json({ error: "NO_SERVER_KEY" });
    }

    // Check Quota using Admin SDK Transaction
    const { adminDb } = await import('./firebase-admin');
    if (!adminDb) {
       return res.status(500).json({ error: "Firebase DB not initialized" });
    }
    const userLimitsRef = adminDb.collection('user_limits').doc(uid);
    const todayStr = new Date().toISOString().split('T')[0];

    let allowed = false;
    try {
      await adminDb.runTransaction(async (t: any) => {
        const doc = await t.get(userLimitsRef);
        let count = 0;
        if (doc.exists) {
          const data = doc.data();
          if (data?.date === todayStr) {
            count = data.count || 0;
          }
        }
        
        if (count >= 5 && !isAdmin) {
          throw new Error("QUOTA_EXCEEDED");
        }
        
        // Reservation: increment early to prevent concurrent bypass
        t.set(userLimitsRef, { date: todayStr, count: count + 1 }, { merge: true });
        allowed = true;
      });
    } catch (err: any) {
      if (err.message === "QUOTA_EXCEEDED") {
        return res.status(429).json({ error: "Daily limit reached (5/5). Please try again tomorrow." });
      }
      throw err;
    }

    const ai = new GoogleGenAI({ apiKey });
    let parsedResult;

    try {
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

      parsedResult = JSON.parse(jsonStr);
    } catch (aiError: any) {
      console.error("Gemini ATS failed, releasing quota reservation...", aiError);
      // Release reservation
      try {
        await adminDb.runTransaction(async (t: any) => {
          const doc = await t.get(userLimitsRef);
          if (doc.exists) {
            const data = doc.data();
            if (data?.date === todayStr && data.count > 0) {
              t.set(userLimitsRef, { count: data.count - 1 }, { merge: true });
            }
          }
        });
      } catch (releaseErr) {
        console.error("Failed to release quota reservation:", releaseErr);
      }
      return res.status(500).json({ error: "Failed to perform ATS check." });
    }

    res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error("Vercel Secure ATS Check Error:", error);
    res.status(500).json({ error: "Failed to perform ATS check on Vercel backend" });
  }
}
