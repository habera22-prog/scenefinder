const ASSET_BASE_URL =
  process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "http://localhost:4000";

export function resolveAssetUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${ASSET_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
