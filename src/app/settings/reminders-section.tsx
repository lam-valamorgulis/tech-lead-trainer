"use client";

import { useEffect, useState, type FormEvent } from "react";
import { deviceLabel } from "@/lib/events/device";
import { saveReminderTimes, type Profile } from "@/lib/profile";
import {
  currentDevice,
  fetchPublicKey,
  notificationsBlocked,
  pushSupported,
  turnOffPush,
  turnOnPush,
} from "@/lib/reminders/push-browser";
import { removePushSubscription, savePushSubscription } from "@/lib/reminders/push-subscriptions";
import { browserClient } from "@/lib/supabase/browser";

type Device =
  | { name: "loading" }
  | { name: "not-set-up" }
  | { name: "unsupported" }
  | { name: "blocked" }
  | { name: "off"; publicKey: string }
  | { name: "on"; publicKey: string }
  | { name: "working" }
  | { name: "failed" };

/** Reminder times and the one-tap switch for this device (ticket #20, design 2). */
export function RemindersSection({
  userId,
  profile,
  setProfile,
}: {
  userId: string;
  profile: Profile;
  setProfile: (profile: Profile) => void;
}) {
  return (
    <section className="stack" aria-labelledby="reminders-title">
      <h2 id="reminders-title">Reminders</h2>
      <DeviceSwitch />
      <ReminderTimes userId={userId} profile={profile} setProfile={setProfile} />
      <p className="lead">
        Keep the same reminder time for your first 12 weeks. One fixed cue every day helps the habit grow.
      </p>
    </section>
  );
}

const DEVICE_MESSAGES: Record<Device["name"], string> = {
  loading: "",
  "not-set-up": "Reminders are not set up yet.",
  unsupported: "To get reminders on iPhone, add this app to your Home Screen. Then open it from there.",
  blocked: "Notifications are blocked for this app. Allow them in your phone or browser settings, then open this page again.",
  off: "Reminders are off on this device.",
  on: "Reminders are on for this device.",
  working: "One moment…",
  failed: "",
};

function DeviceSwitch() {
  const [device, setDevice] = useState<Device>({ name: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<Device> {
      // No keys means the owner has not run the setup yet: reminders stay off, with no error.
      const publicKey = await fetchPublicKey();
      if (!publicKey) return { name: "not-set-up" };
      if (!pushSupported()) return { name: "unsupported" };
      if (notificationsBlocked()) return { name: "blocked" };
      const subscription = await currentDevice();
      if (!subscription) return { name: "off", publicKey };
      // Saved again in case this device was turned on under another account. Reminders are
      // already on here, so a failed save does not change what the screen says.
      await savePushSubscription(browserClient(), subscription, deviceLabel()).catch(() => undefined);
      return { name: "on", publicKey };
    }
    load().then(
      (next) => !cancelled && setDevice(next),
      () => !cancelled && setDevice({ name: "failed" }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn(publicKey: string) {
    setDevice({ name: "working" });
    try {
      const subscription = await turnOnPush(publicKey);
      if (!subscription) {
        setDevice(notificationsBlocked() ? { name: "blocked" } : { name: "off", publicKey });
        return;
      }
      await savePushSubscription(browserClient(), subscription, deviceLabel());
      setDevice({ name: "on", publicKey });
    } catch {
      setDevice({ name: "failed" });
    }
  }

  async function turnOff(publicKey: string) {
    setDevice({ name: "working" });
    try {
      const endpoint = await turnOffPush();
      if (endpoint) await removePushSubscription(browserClient(), endpoint);
      setDevice({ name: "off", publicKey });
    } catch {
      setDevice({ name: "failed" });
    }
  }

  return (
    <>
      {/* The live regions stay on the page, so a screen reader hears every change. */}
      <p role="status" className="lead">
        {DEVICE_MESSAGES[device.name]}
      </p>
      <p role="alert" className="error">
        {device.name === "failed" ? "We could not change reminders on this device. Try again." : ""}
      </p>
      {device.name === "off" && (
        <button type="button" className="button-main" onClick={() => void turnOn(device.publicKey)}>
          Turn on reminders
        </button>
      )}
      {device.name === "on" && (
        <button type="button" className="button-quiet" onClick={() => void turnOff(device.publicKey)}>
          Turn off reminders
        </button>
      )}
    </>
  );
}

function ReminderTimes({
  userId,
  profile,
  setProfile,
}: {
  userId: string;
  profile: Profile;
  setProfile: (profile: Profile) => void;
}) {
  const [morning, setMorning] = useState(profile.morningReminderTime);
  const [evening, setEvening] = useState(profile.eveningReminderTime);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const valid = isTime(morning) && isTime(evening);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setStatus("saving");
    try {
      await saveReminderTimes(browserClient(), userId, { morning, evening });
      setStatus("saved");
      setProfile({ ...profile, morningReminderTime: morning, eveningReminderTime: evening });
    } catch {
      setStatus("failed");
    }
  }

  return (
    <form className="stack" onSubmit={save}>
      <label className="field">
        <span className="field-label">Morning reminder</span>
        <input
          type="time"
          required
          value={morning}
          onChange={(event) => {
            setMorning(event.target.value);
            setStatus("idle");
          }}
        />
      </label>
      <label className="field">
        <span className="field-label">Evening reminder</span>
        <input
          type="time"
          required
          value={evening}
          onChange={(event) => {
            setEvening(event.target.value);
            setStatus("idle");
          }}
        />
      </label>
      <p className="lead">These times use your home time zone. The evening reminder comes only on days you have not practised yet.</p>
      <p role="status" className="lead">
        {status === "saved" ? "Reminder times saved." : ""}
      </p>
      <p role="alert" className="error">
        {status === "failed" ? "We could not save the times. Try again." : ""}
      </p>
      <button type="submit" className="button-quiet" disabled={!valid || status === "saving"}>
        Save times
      </button>
    </form>
  );
}

/** "HH:MM", 24-hour. A time input gives "" while it is half filled in. */
function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
