/**
 * Sanitizes a MongoDB connection URI.
 * Handles:
 * - Surrounding quotes or whitespace
 * - Accidental angle brackets around <username> and <password> commonly left from Atlas templates
 * - Unescaped special characters (such as @ in password) by URL-encoding credentials
 */
export function cleanMongoUri(uri: string | undefined): string | null {
  if (!uri || typeof uri !== 'string') return null;
  let str = uri.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  if (!str) return null;

  // Check prefix: mongodb:// or mongodb+srv://
  const prefixMatch = str.match(/^(mongodb(?:\+srv)?:\/\/)/i);
  if (!prefixMatch) return str;

  const prefix = prefixMatch[1];
  const withoutPrefix = str.slice(prefix.length);

  // Find the LAST '@' which separates userinfo from hosts
  const lastAtIndex = withoutPrefix.lastIndexOf('@');
  if (lastAtIndex === -1) {
    return str;
  }

  const userInfo = withoutPrefix.slice(0, lastAtIndex);
  const hostAndOptions = withoutPrefix.slice(lastAtIndex + 1);

  // Split userinfo by the FIRST ':'
  const firstColonIndex = userInfo.indexOf(':');
  if (firstColonIndex === -1) {
    const rawUser = userInfo.replace(/^<|>$/g, '');
    let user: string;
    try {
      user = encodeURIComponent(decodeURIComponent(rawUser));
    } catch {
      user = encodeURIComponent(rawUser);
    }
    return `${prefix}${user}@${hostAndOptions}`;
  }

  const rawUser = userInfo.slice(0, firstColonIndex).replace(/^<|>$/g, '');
  const rawPass = userInfo.slice(firstColonIndex + 1).replace(/^<|>$/g, '');

  let user: string;
  let pass: string;
  try {
    user = encodeURIComponent(decodeURIComponent(rawUser));
  } catch {
    user = encodeURIComponent(rawUser);
  }
  try {
    pass = encodeURIComponent(decodeURIComponent(rawPass));
  } catch {
    pass = encodeURIComponent(rawPass);
  }

  return `${prefix}${user}:${pass}@${hostAndOptions}`;
}
