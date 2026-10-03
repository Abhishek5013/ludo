/**
 * Resolves the API base URL.
 * When frontend is deployed to Vercel and backend is on Render/Railway,
 * this returns the remote backend URL (e.g., https://ludo-backend.onrender.com).
 * In unified full-stack mode, this returns an empty string to use relative paths.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL;
  if (envUrl && envUrl.trim() !== '') {
    const isRemoteBrowser =
      window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (!isRemoteBrowser || !envUrl.includes('localhost')) {
      return envUrl.replace(/\/$/, '');
    }
  }
  return '';
}
