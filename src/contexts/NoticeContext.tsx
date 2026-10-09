// In-app notices: replaces window.alert() with dismissable, screen-reader-announced messages.
import React, { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

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
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(0);

  const notify = useCallback((message: string, tone: NoticeTone = 'info') => {
    const id = nextId.current++;
    setNotices((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setNotices((current) => current.filter((notice) => notice.id !== id));
    }, NOTICE_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none print:hidden">
        {notices.map((notice) => (
          <div
            key={notice.id}
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto w-full rounded-2xl border bg-white/90 backdrop-blur-md shadow-xl px-4 py-3 text-sm ${
              notice.tone === 'error' ? 'border-red-200 text-red-700' : 'border-[#eceae4] text-gray-900'
            }`}
          >
            {notice.message}
          </div>
        ))}
      </div>
    </NoticeContext.Provider>
  );
}

export const useNotice = () => useContext(NoticeContext);
