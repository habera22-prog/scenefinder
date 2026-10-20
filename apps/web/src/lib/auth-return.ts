const RETURN_KEY = "scenefinder.auth-return";
export function rememberAuthReturn(path: string) {
  if (path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")) {
    window.sessionStorage.setItem(RETURN_KEY, path);
  }
}
export function consumeAuthReturn() {
  const path = window.sessionStorage.getItem(RETURN_KEY);
  window.sessionStorage.removeItem(RETURN_KEY);
  return path?.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
    ? path
    : "/";
}
