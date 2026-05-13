// Vercel Edge Function entry for /api/calendar.ics.
//
// The .ics extension in the filename is preserved by Vercel's routing,
// so the URL surfers paste into Apple/Google Calendar looks correct
// ("calendar.ics") and the file content-type matches the path.

import { handleCalendar } from '../src/server/calendar-handler';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  return handleCalendar(req);
}
