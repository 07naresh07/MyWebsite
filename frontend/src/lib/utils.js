// lib/utils.js
export function openEmailLink(e, to, subject = "", body = "") {
  e.preventDefault();
  const mailto = `mailto:${encodeURIComponent(to)}`
    + (subject ? `?subject=${encodeURIComponent(subject)}` : "")
    + (body ? `${subject ? "&" : "?"}body=${encodeURIComponent(body)}` : "");

  // Try mailto first
  window.location.href = mailto;

  // Gmail fallback if mailto handler is missing
  setTimeout(() => {
    if (document.hasFocus()) {
      const gmail = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}`
        + (subject ? `&su=${encodeURIComponent(subject)}` : "")
        + (body ? `&body=${encodeURIComponent(body)}` : "");
      window.open(gmail, "_blank", "noopener,noreferrer");
    }
  }, 600);
}
