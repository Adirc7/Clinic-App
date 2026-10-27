// Shared design tokens — the MediCare teal palette used across the app.
// Import these instead of hard-coding hex values in new screens.
export const colors = {
  primary: '#0DB591',
  primaryDark: '#0A6B5B',
  primaryDeep: '#004237',
  primarySoft: '#E8F5F1',
  ink: '#123F39',
  heading: '#1A4B44',
  body: '#4E6B68',
  muted: '#87A2A0',
  border: '#DCEBE8',
  surface: '#FFFFFF',
  background: '#F5FAF9',
  danger: '#E53935',
  dangerSoft: '#FDECEE',
  warning: '#FF9800',
  warningSoft: '#FFF4E5',
  info: '#3A7BFF',
  infoSoft: '#EAF1FF',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#0A6B5B',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

export const statusColors = {
  Pending: { fg: '#B26A00', bg: '#FFF4E5' },
  Confirmed: { fg: '#0077B6', bg: '#E6F3FA' },
  Completed: { fg: '#0A8A5F', bg: '#E8F5F1' },
  Cancelled: { fg: '#C62828', bg: '#FDECEE' },
  Paid: { fg: '#0A8A5F', bg: '#E8F5F1' },
  Overdue: { fg: '#C62828', bg: '#FDECEE' },
};

/** "Nimal Perera" → "Dr. Nimal Perera" (doesn't double the prefix) */
export const doctorName = (name = '') => (/^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr. ${name.trim()}`);
