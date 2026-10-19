/** A short, readable label for the device, for example "iPhone, installed app". */
export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const platform = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : "Other";
  const installed = window.matchMedia("(display-mode: standalone)").matches;
  return `${platform}, ${installed ? "installed app" : "browser"}`;
}
