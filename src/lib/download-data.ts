import { browserClient } from "@/lib/supabase/browser";

/** True on iPhone and iPad, where the share sheet's "Save to Files" is the way to keep a file. */
export function usesShareSheet(): boolean {
  const ua = navigator.userAgent;
  const appleTouch = /iPhone|iPad/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
  return appleTouch && typeof navigator.canShare === "function";
}

/** Fetches GET /api/export as a file. */
export async function fetchMyData(): Promise<File> {
  const { data } = await browserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  const response = await fetch("/api/export", { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GET /api/export: ${response.status}`);
  const name = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "tech-lead-trainer.json";
  return new File([await response.blob()], name, { type: "application/json" });
}

/**
 * Opens the share sheet. iOS allows this only straight after a tap, so call it from the
 * tap handler of its own button, never after an await.
 */
export function shareFile(file: File): Promise<"shared" | "cancelled"> {
  return navigator.share({ files: [file], title: file.name }).then(
    () => "shared" as const,
    (error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
      throw error;
    },
  );
}

/** Saves the file through the browser's download. */
export function saveFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
