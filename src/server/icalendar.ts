// Pure RFC 5545 iCalendar generator for Surf Vikings' Best Windows.
//
// One VEVENT per forecasted peak per favorite spot. Calendar apps (Apple,
// Google, Outlook) treat the feed as a subscribed calendar and refresh
// every few hours. We add a VALARM trigger at -1h so the OS fires its
// own notification before the window starts.
//
// Why this exists: a surf-app's "alert me when conditions are firing"
// problem reduces to "create a calendar event the user already trusts
// their OS to notify them about" — no push subscription store, no DB,
// no privacy tradeoff. The .ics URL itself is the subscription.

export interface CalendarEvent {
  /** Stable identifier — calendar apps key off this to update vs duplicate.
   *  Use `${spotId}-${startMs}@surfvikings.com`. */
  uid: string;
  /** Event start, epoch ms (UTC). */
  startMs: number;
  /** Event end, epoch ms (UTC). Must be > startMs. */
  endMs: number;
  /** SUMMARY field — what the calendar shows as the event title. */
  title: string;
  /** Free-text body. Newlines preserved; commas auto-escaped per spec. */
  description: string;
  /** Optional LOCATION — calendar apps surface this and may "open in maps". */
  location?: string;
  /** Minutes before startMs to fire the OS notification. Default 60. */
  alarmMinutesBefore?: number;
}

const PRODID = '-//Surf Vikings//Forecast//EN';
const CALNAME = 'Surf Vikings · Forecast';
const CALDESC = 'Best surf windows for your favorite spots';
/** Hint to calendar apps for how often to re-poll. PT3H = 3 hours. The
 *  underlying forecast refreshes a few times a day at most. */
const REFRESH_INTERVAL = 'PT3H';

/** Generate the full iCalendar text. Caller passes already-prepared
 *  CalendarEvent[] — the generator does no I/O or scoring, just format. */
export function generateICalendar(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `NAME:${CALNAME}`,
    `X-WR-CALNAME:${CALNAME}`,
    `X-WR-CALDESC:${escapeText(CALDESC)}`,
    'X-WR-TIMEZONE:America/Los_Angeles',
    `REFRESH-INTERVAL;VALUE=DURATION:${REFRESH_INTERVAL}`,
    `X-PUBLISHED-TTL:${REFRESH_INTERVAL}`,
  ];

  const dtstamp = formatUtc(Date.now());
  for (const e of events) {
    if (e.endMs <= e.startMs) continue; // skip degenerate windows
    const alarmMin = e.alarmMinutesBefore ?? 60;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${formatUtc(e.startMs)}`);
    lines.push(`DTEND:${formatUtc(e.endMs)}`);
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeText(e.title)}`);
    lines.push(`TRIGGER:-PT${alarmMin}M`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  // RFC 5545 requires CRLF line endings.
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** RFC 5545 §3.1: lines longer than 75 octets must be folded — split at
 *  75 chars with the continuation indented by a single space. Calendar
 *  apps unfold transparently. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + (i === 0 ? 75 : 74));
    chunks.push(i === 0 ? chunk : ` ${chunk}`);
    i += i === 0 ? 75 : 74;
  }
  return chunks.join('\r\n');
}

/** RFC 5545 §3.3.11: TEXT-type fields must escape commas, semicolons,
 *  newlines, and backslashes. Order matters — backslash first. */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** RFC 5545 §3.3.5: form is `YYYYMMDDTHHMMSSZ`, all UTC. */
function formatUtc(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
    + 'T'
    + `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
    + 'Z'
  );
}
