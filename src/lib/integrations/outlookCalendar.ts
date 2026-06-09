export function getAuthUrl(state: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || "http://localhost:3000/api/integrations/outlook-calendar/callback";
  const tenant = process.env.MICROSOFT_TENANT || "common";
  
  if (!clientId) throw new Error("Missing MICROSOFT_CLIENT_ID");

  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  // Required read-only scopes
  url.searchParams.set("scope", "offline_access User.Read Calendars.Read");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account"); 
  return url.toString();
}

export async function exchangeCode(code: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || "http://localhost:3000/api/integrations/outlook-calendar/callback";
  const tenant = process.env.MICROSOFT_TENANT || "common";

  if (!clientId || !clientSecret) throw new Error("Missing Microsoft credentials");

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }).toString()
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to exchange Microsoft code: ${error}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenant = process.env.MICROSOFT_TENANT || "common";
  
  if (!clientId || !clientSecret) throw new Error("Missing Microsoft credentials");

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }).toString()
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to refresh Microsoft token: ${error}`);
  }

  return res.json();
}

export async function fetchUserProfile(accessToken: string) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch user profile: ${await res.text()}`);
  return res.json(); // returns user profile containing 'userPrincipalName' (usually email)
}

export async function fetchCalendarEvents(accessToken: string, timeMin: Date, timeMax: Date) {
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", timeMin.toISOString());
  url.searchParams.set("endDateTime", timeMax.toISOString());
  // Optional: Select only fields we care about, but default includes them
  url.searchParams.set("$top", "1000"); // pagination size
  url.searchParams.set("$orderby", "start/dateTime");
  
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Prefer: 'outlook.timezone="America/New_York"'
  };

  const res = await fetch(url.toString(), { headers });
  
  if (!res.ok) {
    throw new Error(`Failed to list calendar events: ${await res.text()}`);
  }
  
  const data = await res.json();
  return data.value || []; // Microsoft Graph returns array in 'value'
}
