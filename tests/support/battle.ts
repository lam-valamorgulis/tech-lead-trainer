import { local } from "./e2e";
import { sql } from "./local-admin";

/**
 * Seeds a catch of each item for this email. With `daysAgo` 0 the items were caught today, so
 * today has no catch and no review of them. With `daysAgo` 1 each one is due for review today.
 */
export async function catchItems(email: string, itemIds: string[], daysAgo = 0) {
  for (const itemId of itemIds) {
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                 answer_text, correct, confidence, phase)
       select id, gen_random_uuid(), gen_random_uuid(), now() - make_interval(days => $3), $2,
              case when position('.' in $2) > 0 then 'move' else 'creature' end, '0123456789abcdef', 'seed', true, 3,
              'before-card' from u`,
      [email, itemId, daysAgo],
    );
  }
}
