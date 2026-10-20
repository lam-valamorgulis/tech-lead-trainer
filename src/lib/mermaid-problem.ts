// Mermaid errors in plain words (ticket #32). Mermaid's own messages name parser tokens, such as
// "Expecting 'TXT', got 'NEWLINE'", which a learner cannot act on.

const TYPE_HINT = "such as sequenceDiagram or flowchart TD";

/** A Mermaid error message as one plain sentence or two. */
export function mermaidProblem(message: string): string {
  if (message.startsWith("No diagram type detected")) {
    const text = message.slice(message.indexOf("text:") + "text:".length).trim();
    return text === ""
      ? `The diagram is empty. Start with a type, ${TYPE_HINT}.`
      : `The first line must name the diagram type, ${TYPE_HINT}.`;
  }
  if (/got 'EOF'/.test(message)) return "The diagram ends before it is finished. Check the last line.";
  const line = message.match(/error on line (\d+)/i);
  if (line) return `The diagram has a mistake on line ${line[1]}. Check the arrows and the names on that line.`;
  return "The diagram could not be drawn. Check each line.";
}
