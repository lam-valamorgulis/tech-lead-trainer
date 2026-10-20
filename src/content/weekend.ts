// Weekend content (design 3 and 8, ticket #32). The boss of a town lives in a Markdown file in
// content/weekends/month-NN/. The content build reads the parts the app shows. Runs in Node only.

/** A piece of the situation: a paragraph, or a numbered list. Inline `code` stays in backticks. */
export type SituationBlock = { kind: "paragraph"; text: string } | { kind: "list"; items: string[] };

export type Boss = {
  title: string;
  situation: SituationBlock[];
  mermaidStarter: string;
  /** The "## Coach prompt" text block, as one line. Null when the file has none. */
  coachPrompt: string | null;
  /** The model answer file as Markdown, without its title. Null when the town has none. */
  modelAnswer: string | null;
};

/** The lines inside the first fenced block of a language, such as ```mermaid, after a start line. */
function fencedBlock(lines: string[], language: string, from = 0): string[] | null {
  const open = lines.findIndex((line, index) => index >= from && line.trim() === "```" + language);
  const close = lines.findIndex((line, index) => index > open && line.trim() === "```");
  return open === -1 || close === -1 ? null : lines.slice(open + 1, close);
}

/**
 * Reads the title, "## The situation", the first Mermaid block and the coach prompt of a boss file,
 * and keeps its model answer file when there is one.
 */
export function parseBoss(markdown: string, modelAnswerMarkdown?: string): Boss {
  const lines = markdown.split("\n");
  const title = lines.find((line) => line.startsWith("# "))?.slice(2).trim();
  if (!title) throw new Error("The boss file needs a # title.");

  const start = lines.findIndex((line) => line.startsWith("## The situation"));
  if (start === -1) throw new Error('The boss file needs a "## The situation" section.');
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const section = lines.slice(start + 1, end === -1 ? undefined : end);

  const situation: SituationBlock[] = [];
  let paragraph: string[] = [];
  const closeParagraph = () => {
    if (paragraph.length > 0) situation.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of section) {
    const line = raw.trim();
    const item = line.match(/^\d+\.\s+(.*)$/);
    if (item) {
      closeParagraph();
      const last = situation.at(-1);
      if (last?.kind === "list") last.items.push(item[1]);
      else situation.push({ kind: "list", items: [item[1]] });
    } else if (line === "") {
      closeParagraph();
    } else {
      paragraph.push(line);
    }
  }
  closeParagraph();

  const mermaidStarter = (fencedBlock(lines, "mermaid") ?? []).join("\n");
  const promptStart = lines.findIndex((line) => line.startsWith("## Coach prompt"));
  const prompt = promptStart === -1 ? null : fencedBlock(lines, "text", promptStart);
  const coachPrompt = prompt ? prompt.map((line) => line.trim()).filter(Boolean).join(" ") : null;

  const modelAnswer = modelAnswerMarkdown
    ? modelAnswerMarkdown
        .split("\n")
        .filter((line, index) => !(index === 0 && line.startsWith("# ")))
        .join("\n")
        .trim()
    : null;

  return { title, situation, mermaidStarter, coachPrompt, modelAnswer };
}
