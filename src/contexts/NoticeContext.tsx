/* eslint-disable react-refresh/only-export-components */
// In-app notices: replaces window.alert() with dismissable, screen-reader-announced messages.
import React, { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type NoticeTone = 'info' | 'error';

const NOTICE_DURATION_MS = 6000;

interface Notice {
  id: number;
  message: string;
  tone: NoticeTone;
}

interface NoticeContextValue {
  notify: (message: string, tone?: NoticeTone) => void;
}

// No-op default so components and hooks rendered without the provider (e.g. in tests) still work.
const NoticeContext = createContext<NoticeContextValue>({ notify: () => {} });

export function NoticeProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const notify = useCallback((message: string, tone: NoticeTone = 'info') => {
    const id = nextId.current++;
    setNotices((current) => [...current, { id, message, tone }]);
    setTimeout(() => dismiss(id), NOTICE_DURATION_MS);
  }, [dismiss]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none print:hidden">
        {notices.map((notice) => (
          <div
            key={notice.id}
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto w-full flex items-start gap-3 rounded-2xl border bg-white/90 backdrop-blur-md shadow-xl px-4 py-3 text-sm ${
              notice.tone === 'error' ? 'border-red-200 text-red-700' : 'border-[#eceae4] text-gray-900'
            }`}
          >
            <span className="flex-1">{notice.message}</span>
            <button
              type="button"
              onClick={() => dismiss(notice.id)}
              aria-label={t('common.dismiss')}
              className="shrink-0 rounded-full p-0.5 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </NoticeContext.Provider>
  );
}

export const useNotice = () => useContext(NoticeContext);
