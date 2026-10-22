import { diffLines } from "@/core/agent-diff";

const CHANGE_WORDS = { added: "Added: ", removed: "Removed: ", same: "" } as const;

/**
 * The agent's diff in an Agent Diff Battle (#106). Monospace, at least 14 px, so it reads on an
 * iPhone without zoom. Long lines never wrap: the block scrolls sideways, on its own, and the page
 * does not. Each added or removed line has its sign and a tint, so it reads without colour too
 * (design 9 rule 7), and a screen reader hears "Added" or "Removed" before it.
 */
export function DiffBlock({ diff }: { diff: string }) {
  return (
    // Focusable, so a keyboard can scroll it sideways too.
    <div className="diff-block" role="region" aria-label="The agent's diff" tabIndex={0} data-testid="diff-block">
      <pre className="diff-code">
        {diffLines(diff).map((line, index) => (
          // The lines never change order, and two lines may hold the same code.
          <span key={index} className={`diff-line diff-${line.change}`}>
            <span className="diff-sign" aria-hidden="true">
              {line.sign}
            </span>
            {line.change !== "same" && <span className="visually-hidden">{CHANGE_WORDS[line.change]}</span>}
            {line.code}
          </span>
        ))}
      </pre>
    </div>
  );
}
