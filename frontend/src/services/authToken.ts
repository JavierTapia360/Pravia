let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const configureRefreshHandler = (handler: () => Promise<string | null>) => { refreshHandler = handler; };

export async function refreshAccessToken() {
  if (!refreshHandler) return null;
  if (!refreshInFlight) refreshInFlight = refreshHandler().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
