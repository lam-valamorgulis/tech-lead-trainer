// Reads the emails that local Supabase "sends". They land in Mailpit, never in a real inbox.

type MailSummary = { ID: string };
type MailMessage = { Subject: string; Text: string; HTML: string };

async function search(mailUrl: string, to: string): Promise<MailSummary[]> {
  const query = encodeURIComponent(`to:"${to}"`);
  const response = await fetch(`${mailUrl}/api/v1/search?query=${query}`);
  if (!response.ok) throw new Error(`Mailpit search failed: ${response.status}`);
  const body = (await response.json()) as { messages: MailSummary[] };
  return body.messages;
}

/** Waits for the newest email sent to `to`. */
export async function waitForMail(mailUrl: string, to: string, timeoutMs = 10_000): Promise<MailMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [newest] = await search(mailUrl, to);
    if (newest) {
      const response = await fetch(`${mailUrl}/api/v1/message/${newest.ID}`);
      return (await response.json()) as MailMessage;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email to ${to} after ${timeoutMs} ms.`);
}

export async function countMail(mailUrl: string, to: string): Promise<number> {
  return (await search(mailUrl, to)).length;
}

export function codeFrom(mail: MailMessage): string {
  const match = mail.Text.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`No 6-digit code in the email: ${mail.Text}`);
  return match[1];
}
