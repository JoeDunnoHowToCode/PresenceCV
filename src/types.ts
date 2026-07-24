/**
 * types.ts — Core TypeScript Type Definitions
 *
 * Defines all shared data model interfaces for PresenceCV. These types are
 * consumed by nearly every file in the project (hooks, pages, components).
 *
 * Data Hierarchy:
 *   ResumeData (top-level)
 *     ├── Profile (personal info, photo, contact items)
 *     ├── blockOrder: string[] (ordered IDs referencing blocks)
 *     └── blocks: Record<string, Block>
 *           ├── Block (type: 'list') → items: ListItem[]
 *           └── Block (type: 'tags') → items: TagItem[]
 *
 * Persistence: ResumeData is serialized to localStorage and Firestore
 * via the useResume hook. The AppState wrapper (in useResume.ts) holds
 * multiple named profiles, each containing a ResumeData.
 */
import { z } from 'zod';

export interface ContactItem {
  id: string;
  icon: string;
  text: string;
  url: string;
}

export interface Profile {
  name: string;
  title: string;
  location: string;
  email: string;
  summary: string;
  contactItems?: ContactItem[];
  summaryWidth?: number;
  photo?: string;
  photoPosition?: 'left' | 'right';
}

export interface ListItem {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  description: string;
}

export interface TagItem {
  id: string;
  text: string;
}

export interface Block {
  id: string;
  title: string;
  icon?: string;
  type: 'list' | 'tags';
  items: (ListItem | TagItem)[];
}

export interface ResumeData {
  themeColor: string;
  enableAnimation: boolean;
  profile: Profile;
  blockOrder: string[];
  blocks: Record<string, Block>;
  liveId?: string;
  updateToken?: string;
  isPro?: boolean;
}

export const ParsedResumeSchema = z.object({
  profile: z.object({
    name: z.string(),
    title: z.string().catch(''),
    location: z.string().catch(''),
    email: z.string().catch(''),
    summary: z.string().catch(''),
  }).catch({ name: "Unknown" }),
  contactItems: z.array(z.object({
    icon: z.string().catch('Link'),
    text: z.string().catch(''),
    url: z.string().catch('#')
  })).catch([]),
  experience: z.array(z.object({
    title: z.string().catch(''),
    subtitle: z.string().catch(''),
    period: z.string().catch(''),
    description: z.string().catch('')
  })).catch([]),
  education: z.array(z.object({
    title: z.string().catch(''),
    subtitle: z.string().catch(''),
    period: z.string().catch(''),
    description: z.string().catch('')
  })).catch([]),
  skills: z.array(z.string()).catch([]),
});

export type ParsedResumeData = z.infer<typeof ParsedResumeSchema>;
