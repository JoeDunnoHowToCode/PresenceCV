
import React from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { useResume } from '../../hooks/useResume';
import { User } from 'firebase/auth';

export type UseResumeReturn = ReturnType<typeof useResume>;

export interface EditorLayoutProps extends UseResumeReturn {
  user: User | null;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  direction: number;
  setDirection: React.Dispatch<React.SetStateAction<number>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  openIconMenuId: string | null;
  setOpenIconMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setProfileToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  setBlockToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLogoutModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openShareModal: () => void;
  isSharing: boolean;
  tabsContainerRef: React.RefObject<HTMLDivElement | null>;
  handleTabClick: (tabId: string) => void;
  snapshotUrl: string | null;
  setSnapshotUrl: React.Dispatch<React.SetStateAction<string | null>>;
  copiedSection: 'snapshot' | 'live' | null;
  setCopiedSection: React.Dispatch<React.SetStateAction<'snapshot' | 'live' | null>>;
  isInitializingLive: boolean;
  handleCopyLink: (url: string, section: 'snapshot' | 'live') => void;
  ensureLiveLink: () => void;

  isShareModalOpen: boolean;
  setIsShareModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  blockToDelete: string | null;
  profileToDelete: string | null;
  setIsImportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  variants: any;

  handleExportPDF: () => void;
}
