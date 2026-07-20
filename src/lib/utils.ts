export const copyTextToClipboard = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn("Clipboard API failed:", err);
    }
  }
  // Fallback
  const textArea = document.createElement("textarea");
  textArea.value = text;
  // Prevent scrolling to bottom
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  textArea.remove();
};

export function formatUrl(url: string): string {
  if (!url) return '';
  url = url.trim();
  if (!url) return '';

  // Whitelist of allowed protocols
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

  // Already has protocol - validate against whitelist
  const protocolMatch = url.match(/^([a-z]+:)/i);
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase();
    return allowedProtocols.includes(protocol) ? url : '';
  }

  // If it's an email address without mailto
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(url)) return `mailto:${url}`;

  // Default to https for bare domains/URLs
  return `https://${url}`;
}
