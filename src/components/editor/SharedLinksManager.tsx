// Lets the owner stop the live link and revoke snapshot links, from inside the share modal.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNotice } from '../../contexts/NoticeContext';
import { useSharedLinks, type SharedLink } from '../../hooks/useSharedLinks';

interface SharedLinksManagerProps {
  uid: string | undefined;
  hasLiveLink: boolean;
  onStopLive: () => void;
}

export default function SharedLinksManager({ uid, hasLiveLink, onStopLive }: SharedLinksManagerProps) {
  const { t, i18n } = useTranslation();
  const { notify } = useNotice();
  const { links, revokeSnapshot } = useSharedLinks(uid);

  const revoke = async (link: SharedLink) => {
    try {
      await revokeSnapshot(link.id);
      notify(t('editor.sharedLinks.revoked'));
    } catch (error) {
      console.error('Failed to revoke snapshot link:', error);
      notify(t('editor.sharedLinks.revokeFailed'), 'error');
    }
  };

  return (
    <section aria-label={t('editor.sharedLinks.title')} className="flex flex-col gap-3 w-full text-left p-4 rounded-xl border border-[#eceae4] bg-[#f9f8f5]">
      {hasLiveLink && (
        <button
          type="button"
          onClick={onStopLive}
          className="self-start px-3 py-1.5 rounded-full text-xs border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
        >
          {t('editor.sharedLinks.stopLive')}
        </button>
      )}
      <h4 className="text-sm font-medium text-[#1c1c1c]">{t('editor.sharedLinks.snapshotsTitle')}</h4>
      {links.length === 0 ? (
        <p className="text-xs text-[#5f5f5d]">{t('editor.sharedLinks.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-40 overflow-y-auto">
          {links.map((link) => {
            const date = new Date(link.createdAt).toLocaleString(i18n.language);
            return (
              <li key={link.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex flex-col">
                  <span className="truncate text-[#1c1c1c]">{link.profileName}</span>
                  <span className="text-xs text-[#5f5f5d]">{date}</span>
                </span>
                <button
                  type="button"
                  onClick={() => revoke(link)}
                  aria-label={t('editor.sharedLinks.revokeLabel', { name: link.profileName, date })}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                >
                  {t('editor.sharedLinks.revoke')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-[#5f5f5d]">{t('editor.sharedLinks.oldLinksNote')}</p>
    </section>
  );
}
