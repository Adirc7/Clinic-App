// MediCare design tokens — built around the logo teal (#0C6875).
// Import these instead of hard-coding hex values in screens.

export const colors = {
  // Brand
  primary: '#0C6875',        // logo teal — headers, primary buttons
  primaryDark: '#084B55',
  primaryDeep: '#06363D',
  accent: '#14B8A6',         // bright teal — highlights, active states
  accentSoft: '#E6F6F4',
  primarySoft: '#E7F1F2',

  // Text
  ink: '#0F2A2E',
  heading: '#0F2A2E',
  body: '#4B6468',
  muted: '#8AA0A3',

  // Surfaces
  background: '#F3F7F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FBFB',
  border: '#E3ECEE',

  // Feedback
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  warning: '#F59E0B',
  warningSoft: '#FEF4E2',
  info: '#3B82F6',
  infoSoft: '#EAF2FE',
  success: '#10B981',
  successSoft: '#E7F8F1',
  violet: '#8B5CF6',
  violetSoft: '#F1ECFE',
};

export const gradients = {
  brand: ['#0A5A66', '#0C6875', '#12948F'],   // main header gradient
  brandSoft: ['#E7F4F3', '#F3F7F8'],
  accent: ['#14B8A6', '#0C9488'],
  sunset: ['#F59E0B', '#F97316'],
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const shadow = {
  card: {
    shadowColor: '#0C3A40',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#0C3A40',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  button: {
    shadowColor: '#0C6875',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};

export const type = {
  display: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.ink },
  h3: { fontSize: 15, fontWeight: '700', color: colors.ink },
  body: { fontSize: 14, color: colors.body, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted },
  label: { fontSize: 12, fontWeight: '700', color: colors.body, letterSpacing: 0.3 },
};

export const statusColors = {
  Pending: { fg: '#B45309', bg: '#FEF4E2', icon: 'time-outline' },
  Confirmed: { fg: '#1D4ED8', bg: '#EAF2FE', icon: 'checkmark-circle-outline' },
  Completed: { fg: '#047857', bg: '#E7F8F1', icon: 'checkmark-done-outline' },
  Cancelled: { fg: '#B91C1C', bg: '#FDECEC', icon: 'close-circle-outline' },
  Paid: { fg: '#047857', bg: '#E7F8F1', icon: 'checkmark-done-outline' },
  Overdue: { fg: '#B91C1C', bg: '#FDECEC', icon: 'alert-circle-outline' },
};

/** "Nimal Perera" → "Dr. Nimal Perera" (doesn't double the prefix) */
export const doctorName = (name = '') => (/^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr. ${name.trim()}`);

/** Good morning / afternoon / evening */
export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
