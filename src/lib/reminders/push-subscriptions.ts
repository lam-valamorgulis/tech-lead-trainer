import type { SupabaseClient } from "@supabase/supabase-js";

/** What the browser's `PushSubscription.toJSON()` gives, and what the push service needs. */
export type StoredSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Saves this device for the signed-in user. Saving the same device again changes nothing. */
export async function savePushSubscription(
  client: SupabaseClient,
  subscription: StoredSubscription,
  device: string,
): Promise<void> {
  const { error } = await client.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      device: device.slice(0, 100),
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) throw error;
}

export async function removePushSubscription(client: SupabaseClient, endpoint: string): Promise<void> {
  const { error } = await client.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}
