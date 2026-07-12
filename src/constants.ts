import * as LucideIcons from 'lucide-react';

// --- Plan Limits ---
// Maximum number of resume profiles for free users.
// Increase or adjust per-plan as needed.
export const MAX_FREE_PROFILES = 3;

export const ICONS: Record<string, any> = {
  info: LucideIcons.User,
  experience: LucideIcons.Briefcase,
  education: LucideIcons.GraduationCap,
  skills: LucideIcons.Code,
  languages: LucideIcons.Globe
};

export const THEME_COLORS = [
  '#e5e5e5', // Default White
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
];

export const AVAILABLE_ICONS = ['MapPin', 'Mail', 'Phone', 'Link', 'Github', 'Linkedin', 'Twitter', 'Globe', 'Briefcase', 'GraduationCap', 'Code', 'User', 'Award', 'Layout', 'Star', 'Folder', 'File'];
export const AVAILABLE_BLOCK_ICONS = ['Briefcase', 'GraduationCap', 'Code', 'Globe', 'User', 'Award', 'Layout', 'Star', 'Folder', 'File', 'Book', 'Heart', 'Coffee', 'Cpu'];
