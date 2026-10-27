// Date helpers that use the DEVICE's local timezone.
// Do NOT use date.toISOString().split('T')[0] for calendar keys — toISOString is UTC,
// so in Sri Lanka (UTC+5:30) a local-midnight date becomes the previous day.

/** Local date → 'YYYY-MM-DD' */
export const toDateKey = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Today + n days (local), at midnight */
export const addDays = (n, from = new Date()) => {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};

/** 'YYYY-MM-DD' → local Date at midnight */
export const fromDateKey = (key) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** e.g. "Mon, 3 Nov 2026" */
export const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
