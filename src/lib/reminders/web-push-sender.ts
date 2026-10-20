import webpush from "web-push";
import type { VapidDetails } from "./config";
import type { PushResult, PushSender } from "./send-reminders";

/** One hour, like the reminder window: a later morning reminder is no longer useful. */
const TIME_TO_LIVE_SECONDS = 60 * 60;

// The push services of Safari (iPhone and Mac), Chrome, Firefox and Edge. The server sends
// only to these hosts, so a stored address can never make it call any other server.
const PUSH_SERVICE_HOSTS = [/^web\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];

export function isPushServiceEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_SERVICE_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

function hostOf(endpoint: string): string {
  try {
    return new URL(endpoint).hostname;
  } catch {
    return "(not a URL)";
  }
}

/** Sends one push with `web-push`. A device the push service no longer knows comes back "gone". */
export function webPushSender(vapid: VapidDetails): PushSender {
  return async (subscription, payload): Promise<PushResult> => {
    if (!isPushServiceEndpoint(subscription.endpoint)) {
      // Logged, so a new real push service shows up in the logs instead of losing its devices silently.
      console.warn("push refused for an unknown host", hostOf(subscription.endpoint));
      return "gone";
    }
    try {
      await webpush.sendNotification(subscription, payload, {
        vapidDetails: vapid,
        TTL: TIME_TO_LIVE_SECONDS,
      });
      return "sent";
    } catch (error) {
      if (error instanceof webpush.WebPushError && (error.statusCode === 404 || error.statusCode === 410)) return "gone";
      console.error("web push failed", error instanceof webpush.WebPushError ? error.statusCode : error);
      return "failed";
    }
  };
}
