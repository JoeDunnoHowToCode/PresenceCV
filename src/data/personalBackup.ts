/**
 * personalBackup.ts — Owner's Personal Resume Backup
 *
 * Contains the project owner's (Joe Chou) actual resume data as a hardcoded
 * backup template. This is only accessible via the "Restore Backup" button
 * in EditPage, which is gated behind an email check (mujoecs@gmail.com).
 *
 * Purpose: Quick recovery mechanism if the owner's Firestore data is
 * accidentally deleted or corrupted.
 *
 * Exports: PERSONAL_TEMPLATE_BACKUP (ResumeData)
 * Consumed by: useResume.ts (loadPersonalBackup function)
 */
import { ResumeData } from '../types';

export const PERSONAL_TEMPLATE_BACKUP: ResumeData = {
  themeColor: "#e5e5e5",
  enableAnimation: true,
  profile: {
    name: "Joe Chou",
    title: "Software Engineer",
    location: "Taiwan",
    email: "mujoecs@gmail.com",
    summary: "Software Engineer with practical experience in backend development, data analysis, and automation. Proficient in Python (Django, Machine Learning, Computer Vision), C# (UiPath RPA), and Smart Contract development (Sui Move). Highly passionate about learning new technologies and solving complex problems. Excellent English communication skills, ready to collaborate in international environments. Seeking full-time software engineering roles to drive product value.",
    summaryAlign: 'left',
    summaryWidth: 100,
    contactItems: [
      { id: "c1", icon: "MapPin", text: "Taiwan", url: "" },
      { id: "c2", icon: "Mail", text: "mujoecs@gmail.com", url: "mailto:mujoecs@gmail.com" }
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
          title: "Software Engineer", 
          subtitle: "CTBC Financial holding Co., Ltd.", 
          period: "Jul 2025 - Present", 
          description: "RPA project requirement analysis, design, development, and maintenance. Internal system requirement analysis (SA).\n#SoftwareDesign #SystemArchitecture #C Sharp" 
        },
        { 
          id: "e2", 
          title: "On-site Interpreter", 
          subtitle: "JOMEL", 
          period: "Mar 2026 - Mar 2026", 
          description: "Assisted in real-time bilingual translation for events, ensuring accurate information delivery and smooth event execution." 
        },
        { 
          id: "e3", 
          title: "English Teaching", 
          subtitle: "GINI Education", 
          period: "Oct 2024 - Feb 2025", 
          description: "Children's English teaching. Planned and executed teaching activities, designed teaching media, and provided adaptive tutoring." 
        },
        { 
          id: "e4", 
          title: "IT Intern", 
          subtitle: "CTBC Financial holding Co., Ltd.", 
          period: "Jul 2023 - Aug 2023", 
          description: "FinTech competitor analysis, report writing, FSC policy research, and openbanking data analysis." 
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
          title: "BSc Information Technology", 
          subtitle: "University of the West of England (UK)", 
          period: "Sep 2023 - Jun 2024", 
          description: "Graduated with comprehensive knowledge in IT." 
        },
        { 
          id: "edu2", 
          title: "BSc Artificial Intelligence", 
          subtitle: "CTBC Business School", 
          period: "Sep 2020 - Jun 2024", 
          description: "Focused on AI, Machine Learning, and Data Science." 
        }
      ]
    },
    skills: {
      id: "skills",
      title: "Expertise",
      type: "tags",
      items: [
        { id: "s1", text: "Python: Django, OpenCV, NLP, Matplotlib, Data Mining" },
        { id: "s2", text: "AI & Machine Learning: TensorFlow, Fine-tuning" },
        { id: "s3", text: "Web3: Smart Contracts, Sui Move" },
        { id: "s4", text: "RPA: C#, UiPath" },
        { id: "s5", text: "Prompt Engineering: Few-Shot Prompting, Tone & Style Control" },
        { id: "s6", text: "API & System Integration: RESTful API, AI API Integration, Error Handling, Firebase, GCP" }
      ]
    },
    languages: {
      id: "languages",
      title: "Languages",
      type: "tags",
      items: [
        { id: "l1", text: "English: TOEIC 865, IELTS 6.5" },
        { id: "l2", text: "Mandarin: Native" }
      ]
    }
  }
};
