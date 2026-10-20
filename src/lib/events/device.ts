const PLATFORMS: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Mac/, "Mac"],
  [/Windows/, "Windows"],
];

/** A short, readable label for the device, for example "iPhone, installed app". */
export function deviceLabel(): string {
  const ua = navigator.userAgent;
  // iPadOS says "Macintosh" but has a touch screen.
  const platform =
    /Mac/.test(ua) && navigator.maxTouchPoints > 1
      ? "iPad"
      : (PLATFORMS.find(([pattern]) => pattern.test(ua))?.[1] ?? "Other");
  const installed = window.matchMedia("(display-mode: standalone)").matches;
  return `${platform}, ${installed ? "installed app" : "browser"}`;
}
