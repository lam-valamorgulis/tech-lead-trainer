// The browser side of push. iPhone needs iOS 16.4+ and the app on the Home Screen (design 11).

import type { StoredSubscription } from "./push-subscriptions";

/** False in iPhone Safari before Add to Home Screen, and in browsers without push. */
export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function notificationsBlocked(): boolean {
  return Notification.permission === "denied";
}

/** Asks the server for the public push key. Null means the owner has not added the keys yet. */
export async function fetchPublicKey(): Promise<string | null> {
  const response = await fetch("/api/reminders/key", { cache: "no-store" });
  if (!response.ok) throw new Error(`GET /api/reminders/key gave ${response.status}`);
  const body: { publicKey: string | null } = await response.json();
  return body.publicKey;
}

function registerWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

/** This device's push subscription, or null when reminders are off here. */
export async function currentDevice(): Promise<StoredSubscription | null> {
  const subscription = await (await registerWorker()).pushManager.getSubscription();
  return subscription ? toStored(subscription) : null;
}

/**
 * Must run straight from a tap: iPhone shows the permission question only then.
 * Returns null when the learner says no.
 */
export async function turnOnPush(publicKey: string): Promise<StoredSubscription | null> {
  // The first await of the tap, so the tap still counts on iPhone.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const registration = await registerWorker();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(publicKey),
  });
  return toStored(subscription);
}

/** Turns push off on this device. Returns the endpoint that was removed, if any. */
export async function turnOffPush(): Promise<string | null> {
  const subscription = await (await registerWorker()).pushManager.getSubscription();
  if (!subscription) return null;
  await subscription.unsubscribe();
  return subscription.endpoint;
}

function toStored(subscription: PushSubscription): StoredSubscription {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("The push subscription has no keys.");
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

function base64UrlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const base64 = (text + "=".repeat((4 - (text.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
