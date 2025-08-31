const KEY = "certificates.userAdded";

export function getLocalCertificates() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLocalCertificate(cert) {
  const all = getLocalCertificates();
  all.unshift(cert);
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export function updateLocalCertificate(updated) {
  const all = getLocalCertificates();
  const idx = all.findIndex((c) => c.id === updated.id);
  if (idx >= 0) all[idx] = { ...all[idx], ...updated };
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export function removeLocalCertificate(id) {
  const all = getLocalCertificates().filter((c) => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export function getLocalCertificateById(id) {
  return getLocalCertificates().find((c) => c.id === id);
}

export function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
