import { browserClient } from "@/lib/supabase/browser";

/** True on iPhone and iPad, where the share sheet's "Save to Files" is the way to keep a file. */
function isAppleTouchDevice(): boolean {
  return /iPhone|iPad/.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/**
 * Fetches GET /api/export and hands the file to the learner: the share sheet on iPhone,
 * a normal download everywhere else.
 */
export async function downloadMyData(): Promise<"shared" | "downloaded" | "cancelled"> {
  const { data } = await browserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const response = await fetch("/api/export", { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GET /api/export: ${response.status}`);
  const name = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "tech-lead-trainer.json";
  const file = new File([await response.blob()], name, { type: "application/json" });

  if (isAppleTouchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // The share sheet did not open. Fall back to a normal download.
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
