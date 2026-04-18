export const APP_TIMEZONE = "Asia/Manila";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const longDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  month: "long",
  day: "numeric",
  year: "numeric",
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getDateKeyInTimezone(date = new Date()) {
  return dateKeyFormatter.format(date);
}

export function getTimezoneNowLabel(date = new Date()) {
  return `${longDateTimeFormatter.format(date)} GMT+8`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return `${utcDate.getUTCFullYear()}-${pad(utcDate.getUTCMonth() + 1)}-${pad(
    utcDate.getUTCDate()
  )}`;
}

export function normalizeDateKey(value: string | Date) {
  if (value instanceof Date) {
    return getDateKeyInTimezone(value);
  }

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return getDateKeyInTimezone(parsed);
  }

  return raw;
}

export function timeLabelToMinutes(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
}

export function getNowMinutesInTimezone(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return hour * 60 + minute;
}

export function compareDateKeys(left: string, right: string) {
  return normalizeDateKey(left).localeCompare(normalizeDateKey(right));
}

export function formatDateWithMonthName(value: string | Date) {
  const normalized = normalizeDateKey(value);
  const parsed = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return longDateFormatter.format(parsed);
}
