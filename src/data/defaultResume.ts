/**
 * defaultResume.ts — Default Resume Template
 *
 * Provides the initial resume data shown to new users. Contains a fictional
 * "Alex Rivera" profile with sample experience, education, skills, and languages.
 *
 * This template is used when:
 * - A user visits for the first time (no localStorage or Firestore data)
 * - A user resets their data via resetToDefault() in useResume
 * - A new user is detected (isNewUser flag in AuthContext)
 *
 * Exports: DEFAULT_RESUME (ResumeData)
 * Consumed by: useResume.ts
 */
import { ResumeData } from '../types';

export const DEFAULT_RESUME: ResumeData = {
  themeColor: "#e5e5e5",
  enableAnimation: true,
  profile: {
    name: "Alex Rivera",
    title: "Product Designer",
    location: "Metropolis, Earth",
    email: "hello@alexrivera.design",
    summary: "Visionary Product Designer with a focus on creating intuitive, human-centered digital experiences. Expert in bridging the gap between user needs and business goals through elegant design and strategic thinking.",
    summaryAlign: 'center',
    summaryWidth: 100,
    contactItems: [
      { id: "c1", icon: "MapPin", text: "Metropolis, Earth", url: "" },
      { id: "c2", icon: "Mail", text: "hello@alexrivera.design", url: "mailto:hello@alexrivera.design" }
    ]
  },
  blockOrder: ["experience", "education", "skills", "languages"],
  blocks: {
    experience: {
      id: "experience",
      title: "Experience",
      type: "list",
      items: [
        { 
          id: "e1", 
          title: "Senior Product Designer", 
          subtitle: "Design Studio X", 
          period: "Jan 2022 - Present", 
          description: "Led the design of award-winning mobile applications and cross-platform design systems.\n#ProductDesign #UIUX #DesignSystems" 
        }
      ]
    },
    education: {
      id: "education",
      title: "Education",
      type: "list",
      items: [
        { 
          id: "edu1", 
          title: "BFA in Communication Design", 
          subtitle: "University of Arts", 
          period: "Sep 2014 - Jun 2018", 
          description: "Focus on interactive media and typography." 
        }
      ]
    },
    skills: {
      id: "skills",
      title: "Expertise",
      type: "tags",
      items: [
        { id: "s1", text: "Visual Design (Figma, Adobe XD)" },
        { id: "s2", text: "User Research & Testing" },
        { id: "s3", text: "Design Systems & Prototyping" }
      ]
    },
    languages: {
      id: "languages",
      title: "Languages",
      type: "tags",
      items: [
        { id: "l1", text: "English (Native)" },
        { id: "l2", text: "Spanish (Fluent)" }
      ]
    }
  }
};
