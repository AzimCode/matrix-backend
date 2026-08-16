// Small DOM helpers shared by the admin views.

export const $ = (id) => document.getElementById(id);

/** Escapes text before it goes anywhere near innerHTML. */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let toastTimer = null;
export function toast(message, isError = false) {
  const el = $('toast');
  el.textContent = message;
  el.className = isError ? 'toast err' : 'toast';
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, isError ? 6000 : 3000);
}

/** ISO timestamp → the yyyy-mm-dd an <input type="date"> expects. */
export function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

/** Empty date inputs must become undefined, not '', or validation rejects them. */
export function fromDateInput(value) {
  return value ? new Date(value).toISOString() : undefined;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Comma/newline separated text → array, dropping blanks. */
export function toList(text) {
  return String(text || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function fromList(list) {
  return (list ?? []).join(', ');
}

/**
 * Strips keys whose value is '' so a blank optional field is omitted rather
 * than sent as an empty string — the API validates URLs and emails on any
 * value that is present.
 */
export function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function confirmDelete(what) {
  return window.confirm(`Удалить ${what}? Действие необратимо.`);
}
