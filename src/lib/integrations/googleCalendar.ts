export function getAuthUrl(): string {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:3000/api/integrations/google-calendar/callback";
  
  if (!clientId) throw new Error("Missing GOOGLE_CALENDAR_CLIENT_ID");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  // Required scopes for read-only calendar access
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.calendarlist.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent"); // Ensure refresh token is returned
  return url.toString();
}

export async function exchangeCode(code: string) {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:3000/api/integrations/google-calendar/callback";
  
  if (!clientId || !clientSecret) throw new Error("Missing Google Calendar credentials");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }).toString()
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) throw new Error("Missing Google Calendar credentials");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    }).toString()
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return res.json();
}

export async function getUserProfile(accessToken: string) {
  // To get the user's email, we can call the userinfo endpoint
  // Google OAuth2 tokens with calendar scopes might not inherently have email scope unless requested, 
  // but if we need the email, we should add email scope or fetch primary calendar ID.
  // The primary calendar ID represents the user's email usually.
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch primary calendar: ${await res.text()}`);
  return res.json(); // contains 'id' which is typically the email address
}

export async function fetchEvents(accessToken: string, timeMin: Date, timeMax: Date) {
  // Fetch events from the primary calendar
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("singleEvents", "true"); // Expands recurring events into single instances
  url.searchParams.set("orderBy", "startTime");
  
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to list calendar events: ${await res.text()}`);
  }
  
  const data = await res.json();
  return data.items || [];
}
