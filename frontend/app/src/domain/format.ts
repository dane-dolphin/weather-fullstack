function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatTemp(f: number): string {
  return Math.round(f).toString();
}

const TIME_FMT = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export function formatTime(d: Date | string): string {
  return TIME_FMT.format(toDate(d));
}

const WEEKDAY_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const MONTH_DAY_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

export function formatDate(d: Date | string): string {
  const date = toDate(d);
  return `${WEEKDAY_FMT.format(date)} · ${MONTH_DAY_FMT.format(date)} · ${TIME_FMT.format(date)}`;
}

const HOUR_FMT = new Intl.DateTimeFormat('en-US', { hour: 'numeric' });

export function formatHourLabel(d: Date | string): string {
  return HOUR_FMT.format(toDate(d));
}

export function formatWind(mphFromApi: number): string {
  return Math.round(mphFromApi).toString();
}

export function formatExpiresLabel(iso: string): string {
  return `Until ${formatTime(iso)}`;
}
