import { CLAUDE_NEW_CHAT } from "@/core/discuss";

/**
 * Copies a package and opens a new Claude chat (design 10, UI rule 12). Call it inside the tap:
 * iPhone Safari allows the clipboard write and the new tab only there. The write starts first.
 * Returns null when there is no clipboard at all: then the app stays, so the learner can copy
 * the text by hand. Otherwise it resolves to whether the copy worked.
 */
export function copyAndOpenClaude(text: string): Promise<boolean> | null {
  let write: Promise<void> | undefined;
  try {
    write = navigator.clipboard?.writeText(text);
  } catch {
    write = undefined;
  }
  if (!write) return null;
  window.open(CLAUDE_NEW_CHAT, "_blank", "noopener");
  return write.then(
    () => true,
    () => false,
  );
}
