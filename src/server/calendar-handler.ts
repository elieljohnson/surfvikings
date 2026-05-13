// Edge function handler for /api/calendar.ics.
//
// Subscription URL pattern:
//   /api/calendar.ics?spots=bolinas-patch,stinson,muir-beach
//
// Returns a personalized iCalendar feed of the next Best Windows for the
// listed favorite spots. The query string IS the subscription — no server
// state, no DB, no signup. Each user's calendar app polls the URL on its
// own schedule (typically every few hours).

import { buildConditions } from './fetchers';
import { generateICalendar, type CalendarEvent } from './icalendar';
import {
  SPOTS, findBestWindows, hourLabel, degToCardinal,
} from '../lib/data';
import { hoursToTimeline } from '../lib/api';

/** Cap events per spot so the calendar doesn't get spammed with marginal
 *  peaks. Top 3 by score over the 7-day window is plenty for planning. */
const MAX_EVENTS_PER_SPOT = 3;

export async function handleCalendar(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const spotsParam = url.searchParams.get('spots') ?? '';
  const spotIds = spotsParam.split(',').map((s) => s.trim()).filter(Boolean);

  // Empty subscription: return a valid (empty) calendar rather than 400,
  // so calendar apps don't show a permanent error state if the user
  // somehow lands here with no favorites.
  if (spotIds.length === 0) {
    return calendarResponse(generateICalendar([]));
  }

  const validSpots = spotIds
    .map((id) => SPOTS.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  if (validSpots.length === 0) {
    return calendarResponse(generateICalendar([]));
  }

  // Same data path the dashboard uses — buildConditions returns the
  // 7-day merged forecast per spot. We then map each spot's timeline
  // into the same ForecastHour[] the scoring engine produces, run
  // findBestWindows, and turn each window into a VEVENT.
  let payload;
  try {
    payload = await buildConditions(validSpots.map((s) => s.id), req.signal);
  } catch {
    // Network hiccup. Return empty calendar rather than 500 so the
    // user's calendar app doesn't permanently lose the subscription.
    return calendarResponse(generateICalendar([]));
  }

  const events: CalendarEvent[] = [];
  for (const spot of validSpots) {
    const wire = payload.spots[spot.id];
    if (!wire?.length) continue;
    const timeline = hoursToTimeline(spot, wire, 168);
    // Anchor hour 0 of the timeline to the first hour's actual epoch so
    // events keep stable timestamps across feed refreshes (UID stability).
    const anchorMs = wire[0]?.t ?? Date.now();
    const windows = findBestWindows(timeline)
      .sort((a, b) => b.peak - a.peak)
      .slice(0, MAX_EVENTS_PER_SPOT);

    for (const w of windows) {
      const startMs = anchorMs + w.start * 3600_000;
      // Window inclusive of the `end` hour, so add one more hour for
      // calendar coverage (a 7am–11am peak should render as 4 hours).
      const endMs   = anchorMs + (w.end + 1) * 3600_000;
      const peakHr  = timeline[w.peakHour];
      // Deep-link straight to the spot detail page — when the user taps
      // the calendar event they jump into live conditions, not the
      // dashboard. Read by App.tsx via ?spot= param on mount.
      const deepLink = `https://surfvikings.com/app?spot=${spot.id}`;
      events.push({
        uid: `${spot.id}-${startMs}@surfvikings.com`,
        startMs,
        endMs,
        title: `🌊 ${spot.name} · Peak ${Math.round(w.peak)}`,
        description: buildDescription(spot.name, peakHr, w, deepLink),
        location: spot.regionLabel,
        url: deepLink,
      });
    }
  }

  return calendarResponse(generateICalendar(events));
}

function buildDescription(
  spotName: string,
  peak: ReturnType<typeof hoursToTimeline>[number] | undefined,
  w: { peak: number; peakHour: number },
  deepLink: string,
): string {
  // Final line is the deep-link as plain text — most calendar apps
  // autolink URLs in description bodies, providing a clickable fallback
  // for any client that doesn't render the structured URL property.
  const open = `Open in Surf Vikings → ${deepLink}`;
  if (!peak) return `${spotName} · Peak ${Math.round(w.peak)}\n\n${open}`;
  const swell = `Swell: ${peak.swellHeight.toFixed(1)}ft @ ${Math.round(peak.swellPeriod)}s ${degToCardinal(peak.swellDirection)}`;
  const wind  = `Wind: ${Math.round(peak.windSpeed)}kt ${degToCardinal(peak.windDirection)}`;
  const tide  = `Tide: ${peak.tideHeight.toFixed(1)}ft ${peak.tideRising ? 'rising' : 'falling'}`;
  const peakAt = `Peak at ${hourLabel(w.peakHour)}`;
  return [peakAt, swell, wind, tide, '', open].join('\n');
}

function calendarResponse(ics: string): Response {
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="surf-vikings.ics"',
      // Cache at the edge for 30 min — forecast doesn't change that fast,
      // and calendar apps poll on their own cadence (PT3H hint in the
      // ICS body). Public so Vercel's CDN can serve repeat subscribers.
      'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
