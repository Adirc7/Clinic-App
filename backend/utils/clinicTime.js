/**
 * Calendar maths in the CLINIC's timezone, independent of the server's clock.
 *
 * Hosts like Vercel always run in UTC and don't allow setting TZ, so "today",
 * holidays and weekday checks are done here with a fixed offset.
 * Sri Lanka is UTC+05:30 all year (no daylight saving). Override with
 * CLINIC_UTC_OFFSET_MINUTES if the clinic is elsewhere.
 */
const OFFSET_MIN = Number.isFinite(Number(process.env.CLINIC_UTC_OFFSET_MINUTES))
  ? Number(process.env.CLINIC_UTC_OFFSET_MINUTES)
  : 330;
const OFFSET_MS = OFFSET_MIN * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Shift an instant so its UTC fields read as clinic wall-clock time
const shifted = (value) => new Date(new Date(value).getTime() + OFFSET_MS);

/** Clinic-local 'YYYY-MM-DD' for an instant */
const toDateKey = (value) => shifted(value).toISOString().slice(0, 10);

/** 0 (Sunday) … 6 (Saturday) in clinic time */
const weekday = (value) => shifted(value).getUTCDay();

/** Instant at which the clinic-local day containing `value` starts */
const startOfDay = (value) => {
  const s = shifted(value);
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()) - OFFSET_MS);
};

/** { start, end } instants bounding the clinic-local day of `value` */
const dayRange = (value) => {
  const start = startOfDay(value);
  return { start, end: new Date(start.getTime() + DAY_MS) };
};

/** Start of today (clinic time), optionally plus N days */
const todayStart = (plusDays = 0) => new Date(startOfDay(Date.now()).getTime() + plusDays * DAY_MS);

module.exports = { toDateKey, weekday, startOfDay, dayRange, todayStart, OFFSET_MIN };
