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
  // Already has protocol or is a mailto/tel link
  if (/^([a-z]+:)/i.test(url)) return url;
  // If it's an email address without mailto
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(url)) return `mailto:${url}`;
  // Default to https
  return `https://${url}`;
}
