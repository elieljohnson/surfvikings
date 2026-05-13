import { describe, expect, it } from 'vitest';
import { generateICalendar, type CalendarEvent } from './icalendar';

const evt: CalendarEvent = {
  uid: 'bolinas-patch-1747094400000@surfvikings.com',
  startMs: Date.parse('2026-05-14T14:00:00Z'),
  endMs:   Date.parse('2026-05-14T18:00:00Z'),
  title: '🌊 The Patch · Peak 78',
  description: 'Swell: 4.2ft @ 12s WNW\n8kt offshore\nRising tide → 4.1ft',
  location: 'Bolinas, CA',
};

describe('generateICalendar', () => {
  it('wraps events in VCALENDAR boundaries', () => {
    const ics = generateICalendar([evt]);
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
  });

  it('includes the required PRODID + VERSION headers', () => {
    const ics = generateICalendar([]);
    expect(ics).toMatch(/VERSION:2\.0/);
    expect(ics).toMatch(/PRODID:.*Surf Vikings/);
  });

  it('emits DTSTART / DTEND as UTC YYYYMMDDTHHMMSSZ', () => {
    const ics = generateICalendar([evt]);
    expect(ics).toMatch(/DTSTART:20260514T140000Z/);
    expect(ics).toMatch(/DTEND:20260514T180000Z/);
  });

  it('escapes commas, semicolons, and backslashes per RFC 5545', () => {
    const ics = generateICalendar([{
      ...evt,
      title: 'Spot, with comma; and \\backslash',
      description: 'Line one\nLine two',
    }]);
    expect(ics).toContain('SUMMARY:Spot\\, with comma\\; and \\\\backslash');
    expect(ics).toContain('Line one\\nLine two');
  });

  it('emits a VALARM 60 minutes before the event by default', () => {
    const ics = generateICalendar([evt]);
    expect(ics).toMatch(/BEGIN:VALARM[\s\S]+TRIGGER:-PT60M[\s\S]+END:VALARM/);
  });

  it('honors a custom alarm offset when provided', () => {
    const ics = generateICalendar([{ ...evt, alarmMinutesBefore: 30 }]);
    expect(ics).toMatch(/TRIGGER:-PT30M/);
  });

  it('skips degenerate windows where endMs <= startMs', () => {
    const ics = generateICalendar([{ ...evt, endMs: evt.startMs }]);
    expect(ics).not.toMatch(/BEGIN:VEVENT/);
  });

  it('uses CRLF line endings as the spec demands', () => {
    const ics = generateICalendar([evt]);
    expect(ics).toMatch(/\r\n/);
    // Should not have bare LF outside of escaped \\n inside text fields
    const bareLF = ics.replace(/\r\n/g, '');
    expect(bareLF.includes('\n')).toBe(false);
  });

  it('folds lines longer than 75 octets per RFC 5545', () => {
    const longTitle = 'X'.repeat(200);
    const ics = generateICalendar([{ ...evt, title: longTitle }]);
    // Continuation lines start with a single space
    expect(ics).toMatch(/\r\n /);
    // No raw line in the output should exceed 75 chars
    const rawLines = ics.split('\r\n');
    for (const line of rawLines) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });

  it('returns a valid empty calendar when given no events', () => {
    const ics = generateICalendar([]);
    expect(ics).toMatch(/BEGIN:VCALENDAR/);
    expect(ics).toMatch(/END:VCALENDAR/);
    expect(ics).not.toMatch(/BEGIN:VEVENT/);
  });
});
