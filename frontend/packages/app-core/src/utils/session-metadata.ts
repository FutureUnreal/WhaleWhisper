export type SessionMetadata = Record<string, string | number | boolean>;

export function buildSessionMetadata(
  options: { locale?: string } = {}
): SessionMetadata | undefined {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return undefined;
  }

  const meta: SessionMetadata = {};
  const resolvedLocale = options.locale || navigator.language;
  if (resolvedLocale) {
    meta.locale = resolvedLocale;
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone) {
    meta.timezone = timeZone;
  }

  const isMobile =
    (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile ||
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  meta.device = isMobile ? "mobile" : "desktop";

  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    (navigator as Navigator & { platform?: string }).platform;
  if (platform) {
    meta.platform = platform;
  }

  if (navigator.userAgent) {
    meta.user_agent = navigator.userAgent;
  }

  const darkMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  meta.dark_mode = darkMode;

  if (window.screen) {
    meta.screen = `${window.screen.width}x${window.screen.height}`;
  }
  if (window.innerWidth && window.innerHeight) {
    meta.viewport = `${window.innerWidth}x${window.innerHeight}`;
  }
  if (window.devicePixelRatio) {
    meta.pixel_ratio = Number(window.devicePixelRatio.toFixed(2));
  }

  return Object.keys(meta).length ? meta : undefined;
}
