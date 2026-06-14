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

    const prompt = `You are an expert ATS (Applicant Tracking System) data extractor.
Extract ALL resume details from the provided document with 100% completeness.
Do NOT skip, summarize, or infer any data that is not explicitly present in the document.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — CONTACT ITEMS (HIGHEST PRIORITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scan the ENTIRE document for every URL, link, handle, email, and phone number.
Extract each one into "contactItems" as a separate object: { "label": "...", "url": "..." }.

Rules by type — follow EXACTLY:

EMAIL
  - label: "Email"
  - url: MUST start with "mailto:" → e.g., "mailto:john@example.com"

PHONE
  - label: "Phone"
  - url: MUST start with "tel:" → e.g., "tel:+886912345678"
    If no country code is present, infer from context (Taiwan → +886, US → +1, UK → +44).
    Remove spaces, dashes, and parentheses from the number.

LINKEDIN
  - label: "LinkedIn"
  - url: MUST start with "https://www.linkedin.com/in/"
    Examples of input → output:
      "linkedin.com/in/johndoe"      → "https://www.linkedin.com/in/johndoe"
      "/in/johndoe"                  → "https://www.linkedin.com/in/johndoe"
      "LinkedIn: johndoe"            → "https://www.linkedin.com/in/johndoe"

GITHUB
  - label: "GitHub"
  - url: MUST start with "https://github.com/"
    Examples of input → output:
      "github.com/johndoe"           → "https://github.com/johndoe"
      "@johndoe (GitHub)"            → "https://github.com/johndoe"
      "GitHub: johndoe"              → "https://github.com/johndoe"

TWITTER / X
  - label: "Twitter" or "X"
  - url: MUST start with "https://x.com/" or "https://twitter.com/"
    Examples of input → output:
      "@johndoe (Twitter)"           → "https://x.com/johndoe"
      "twitter.com/johndoe"          → "https://twitter.com/johndoe"

BEHANCE
  - label: "Behance"
  - url: MUST start with "https://www.behance.net/"
    Example: "behance.net/johndoe"   → "https://www.behance.net/johndoe"

DRIBBBLE
  - label: "Dribbble"
  - url: MUST start with "https://dribbble.com/"
    Example: "dribbble.com/johndoe"  → "https://dribbble.com/johndoe"

MEDIUM / SUBSTACK / BLOG
  - label: "Medium", "Substack", or "Blog"
  - url: Prepend "https://" if no protocol is present.
    Example: "medium.com/@johndoe"   → "https://medium.com/@johndoe"

PORTFOLIO / WEBSITE / OTHER URL
  - label: Use a descriptive name (e.g., "Portfolio", "Website", "Personal Site")
  - url: MUST start with "https://" — if "http://" is shown, keep as-is; if no protocol, prepend "https://"
    Example: "johndoe.com"           → "https://johndoe.com"

IMPORTANT:
  - Never output a bare domain like "linkedin.com/in/johndoe" — always include the full protocol.
  - Never set "url" to null, "", or "#" if a usable link or identifier is present.
  - If a URL appears outside the contact section (e.g., a project link, a publication link), still include it in contactItems with an appropriate label.
  - Each contactItem must be a distinct object — do not combine multiple links into one.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — WORK EXPERIENCE & EDUCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extract ALL entries in chronological order as they appear. Do not merge, skip, or truncate any.

For each entry:
  - "title": Job title OR degree name
      Examples: "Senior Product Manager", "Software Engineer Intern",
                "Bachelor of Business Administration", "MSc in Computer Science"
  - "subtitle": Company name OR school name, including location if stated in the document
      Examples: "Google, Mountain View, CA", "National Taiwan University, Taipei",
                "McKinsey & Company", "HSBC, Hong Kong"
  - "period": Exact date range as written in the document
      Examples: "Jul 2023 – Sep 2023", "2021 – 2024", "Mar 2020 – Present"
      Use "Present" if the role is ongoing. Do NOT invent or estimate dates.
  - "description": Reproduce ALL bullet points, responsibilities, achievements, and details.
      Use "•" as the bullet character and "\n" between each item.
      Do NOT leave this empty if the source contains any content for this entry.
      Examples of well-formatted descriptions:
        Tech role:
          "• Developed RESTful APIs using Node.js serving 500K daily active users\n• Reduced page load time by 40% through lazy loading and code splitting\n• Mentored 3 junior engineers and conducted bi-weekly code reviews"
        Business/Finance role:
          "• Led cross-functional team of 12 to deliver $2M product launch on time and under budget\n• Analyzed market entry strategy for Southeast Asia, resulting in 18% revenue growth\n• Prepared board-level presentations and quarterly financial reports for C-suite"
        Marketing role:
          "• Managed $500K annual digital advertising budget across Google, Meta, and LinkedIn\n• Increased organic traffic by 65% through SEO strategy and content optimization\n• Launched influencer campaign reaching 2M impressions with 4.2% engagement rate"
        Design role:
          "• Redesigned onboarding flow, improving user activation rate from 32% to 58%\n• Conducted 20+ usability tests and translated insights into design iterations\n• Maintained and extended a design system used by 8 product teams"
        Education entry:
          "• Major: Finance, Minor: Data Analytics\n• GPA: 3.8/4.0, Dean's List 2022–2023\n• Thesis: The Impact of Open Banking on Consumer Financial Behavior"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — SKILLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Group all skills from the document into intelligent domain categories.
Format each entry STRICTLY as: "Category: Skill1, Skill2, Skill3"

Choose category names appropriate to the candidate's field. Examples by domain:

Software / Engineering:
  "Languages & Frameworks: TypeScript, React, Next.js, Node.js"
  "Blockchain: Sui Move, Solana, Web3.js, Ethers.js"
  "Cloud & DevOps: GCP, AWS, Docker, GitHub Actions, Vercel"
  "Tools & Platforms: GitHub, VS Code, UiPath, Figma, Postman"
  "Databases: PostgreSQL, MongoDB, Redis, Supabase"

Business / Finance / Consulting:
  "Strategy & Analysis: Market Research, Competitive Analysis, Business Development"
  "Finance: Financial Modeling, DCF Valuation, P&L Management, Excel"
  "Project Management: Agile, Scrum, Stakeholder Management, OKRs"
  "Tools: PowerPoint, Tableau, Salesforce, SAP, Bloomberg Terminal"

Marketing / Creative:
  "Digital Marketing: SEO, SEM, Google Analytics, Meta Ads, Email Marketing"
  "Content & Brand: Copywriting, Brand Strategy, Content Calendar Management"
  "Design Tools: Figma, Adobe Photoshop, Illustrator, Canva"
  "Analytics: Google Analytics 4, Mixpanel, A/B Testing, Hotjar"

General (all candidates):
  "Spoken Languages: English (Fluent), Mandarin (Native), Japanese (Intermediate)"
  "Certifications: AWS Certified Developer, CFA Level II, Google Analytics Certified"
  "Soft Skills: Leadership, Public Speaking, Cross-functional Collaboration"

IMPORTANT:
  - Only include skills explicitly stated in the document.
  - Do not fabricate skills not present in the source.
  - If a skill fits multiple categories, place it in the most relevant one only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Return ONLY valid JSON matching the required schema.
- Do NOT hallucinate, infer, or fabricate any data not present in the document.
- Do NOT include markdown code fences (\`\`\`), commentary, or any text outside the JSON object.
- All string values must be properly escaped (e.g., use \n for newlines inside strings).
- If a field has no data in the document, return null for that field — do not omit the key.`;

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
            contactItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  icon: { type: Type.STRING, description: "One of: Mail, Phone, Globe, Linkedin, Github, Twitter" },
                  text: { type: Type.STRING, description: "Display text, e.g., email address, phone number, or handle" },
                  url: { type: Type.STRING, description: "The actual URL or mailto:/tel: link. If it's an email, prefix with mailto:. If it's a phone, prefix with tel:" }
                }
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
    res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error("Vercel Secure API Parse Error:", error);
    res.status(500).json({ error: "Failed to parse resume on Vercel backend" });
  }
}
