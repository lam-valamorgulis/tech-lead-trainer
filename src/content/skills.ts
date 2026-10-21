// The 26 tech lead Skills (design 4 and 7.7). Each id is a fixed number that never changes,
// matching the numbered list in research/tech-lead-skills.md. The name can change.
// Content tags each Battle turn and each Decision Card with Skill ids; the Trainer Card shows a rate per Skill.

export const SKILLS = [
  { id: 1, name: "Technical vision for the team" },
  { id: 2, name: "System and architecture design" },
  { id: 3, name: "Technical decisions and trade-offs" },
  { id: 4, name: "Design docs and ADRs" },
  { id: 5, name: "Breaking down work, estimating, cutting scope" },
  { id: 6, name: "Code review and code standards" },
  { id: 7, name: "Technical quality and tech debt" },
  { id: 8, name: "Testing strategy and safe delivery" },
  { id: 9, name: "Observability" },
  { id: 10, name: "Production ownership and incident handling" },
  { id: 11, name: "Debugging hard problems across systems" },
  { id: 12, name: "Security and risk thinking" },
  { id: 13, name: "Specifying work for AI agents" },
  { id: 14, name: "Reading and reviewing AI-written code" },
  { id: 15, name: "Judging AI output and owning the verdict" },
  { id: 16, name: "Deep stack knowledge without daily hand-coding" },
  { id: 17, name: "Unblocking the team and delegating" },
  { id: 18, name: "Aligning technical work with product goals" },
  { id: 19, name: "Explaining technical decisions to non-engineers" },
  { id: 20, name: "Technical communication with clients" },
  { id: 21, name: "Technical communication with your manager" },
  { id: 22, name: "Mentoring through technical work" },
  { id: 23, name: "Engineering strategy and standards across teams" },
  { id: 24, name: "Cross-team technical direction and architecture review" },
  { id: 25, name: "Choosing what matters" },
  { id: 26, name: "Presenting to executives and the CTO" },
] as const;

export type SkillId = (typeof SKILLS)[number]["id"];
