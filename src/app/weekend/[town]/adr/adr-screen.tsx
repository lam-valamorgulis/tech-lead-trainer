"use client";

import { useState } from "react";
import { adrCoachPrompt, getTown } from "@/content";
import {
  ADR_SECTIONS,
  ADR_STATUSES,
  adrOutcomeDue,
  adrPackage,
  outcomeDateRange,
  validOutcomeDate,
  type AdrSectionKey,
  type AdrStatus,
} from "@/core/adr";
import { learningDay } from "@/core/day";
import { currentLearningDay } from "@/lib/learning-log";
import type { Profile } from "@/lib/profile";
import { browserClient } from "@/lib/supabase/browser";
import { loadAdr, saveAdr, type AdrDoc } from "@/lib/weekend-doc";
import { formatDay } from "../../../format-day";
import { ColleagueRead, DiscussDoc, DocField, SaveStatus, WeekendTabs } from "../../weekend-parts";
import { useAutosaved } from "../use-autosaved-doc";

type AdrState = { adr: AdrDoc; writtenOn: string; today: string };

const EMPTY_SECTIONS = Object.fromEntries(ADR_SECTIONS.map(({ key }) => [key, ""])) as Record<AdrSectionKey, string>;

/**
 * The weekend ADR (design 3, week 2): one decision from real work, with a prediction, and a date
 * 4 to 8 weeks later to check what really happened. The app reminds the learner on that date.
 */
export function AdrScreen({ townId, profile }: { townId: string; profile: Profile }) {
  const documentKey = `${townId}-adr`;
  const { value, failed, saveState, change } = useAutosaved<AdrState>(
    documentKey,
    async () => {
      const client = browserClient();
      const today = await currentLearningDay(client);
      const found = await loadAdr(client, documentKey);
      // The first day in the home time zone, like every learning day (design 12.4).
      if (found)
        return {
          adr: found.adr,
          writtenOn: learningDay(found.createdAt, profile.homeTimeZone, profile.dayCutoffHour),
          today,
        };
      // A new ADR starts with the check date 6 weeks out.
      const adr = {
        sections: EMPTY_SECTIONS,
        status: "proposed" as const,
        outcomeCheckDate: outcomeDateRange(today).suggested,
      };
      return { adr, writtenOn: today, today };
    },
    (state) => saveAdr(browserClient(), documentKey, state.adr),
  );
  if (!getTown(townId)) return <p className="lead">This town does not exist.</p>;
  if (failed)
    return (
      <p role="alert" className="error">
        We could not load your ADR. Check your connection.
      </p>
    );
  if (!value) return <p className="lead">Loading…</p>;

  const update = (adr: AdrDoc) => change({ ...value, adr });
  return (
    <div className="stack">
      <WeekendTabs townId={townId} current="adr" />
      <section className="card stack" aria-labelledby="adr-page-title">
        <h2 id="adr-page-title">Week 2: one ADR for a real decision at work</h2>
        <p>
          An ADR (architecture decision record) is a short note about one decision: what you decided, why, and what
          happens because of it. Pick one small decision from your work in the last month.
        </p>
      </section>
      {adrOutcomeDue(
        {
          outcomeCheckDate: value.adr.outcomeCheckDate,
          outcome: value.adr.sections.outcome,
        },
        value.today,
      ) && (
        <p className="notice" role="status">
          Your check date has come. Write what really happened, under your prediction.
        </p>
      )}
      <AdrEditor state={value} onChange={update} />
      <SaveStatus state={saveState} />
      <ColleagueRead documentKey={documentKey} saveDocument={() => saveAdr(browserClient(), documentKey, value.adr)} />
      <DiscussDoc text={() => adrPackage({ adr: value.adr, coachPrompt: adrCoachPrompt(townId) })} />
    </div>
  );
}

function AdrEditor({ state, onChange }: { state: AdrState; onChange: (adr: AdrDoc) => void }) {
  const { adr } = state;
  const setSection = (key: AdrSectionKey, text: string) =>
    onChange({ ...adr, sections: { ...adr.sections, [key]: text } });
  return (
    <section className="stack" aria-label="ADR">
      {ADR_SECTIONS.map(({ key, title, hint }) => (
        <DocField key={key} id={`adr-${key}`} title={title} hint={hint}>
          {(props) => (
            <textarea
              {...props}
              rows={key === "title" ? 1 : 4}
              maxLength={20000}
              value={adr.sections[key]}
              onChange={(event) => setSection(key, event.target.value)}
            />
          )}
        </DocField>
      ))}
      <DocField id="adr-status" title="Status" hint="Deprecated: no longer used. Superseded: replaced by a newer ADR.">
        {(props) => (
          <select
            {...props}
            value={adr.status}
            onChange={(event) => onChange({ ...adr, status: event.target.value as AdrStatus })}
          >
            {ADR_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        )}
      </DocField>
      <CheckDate
        writtenOn={state.writtenOn}
        value={adr.outcomeCheckDate}
        onChange={(date) => onChange({ ...adr, outcomeCheckDate: date })}
      />
    </section>
  );
}

/** The day to check the real outcome: 4 to 8 weeks after the ADR was written (design 3). */
function CheckDate({
  writtenOn,
  value,
  onChange,
}: {
  writtenOn: string;
  value: string | null;
  onChange: (date: string) => void;
}) {
  const range = outcomeDateRange(writtenOn);
  const [problem, setProblem] = useState(false);
  return (
    <DocField
      id="adr-check-date"
      title="Check the real outcome on"
      hint={`Between ${formatDay(range.earliest)} and ${formatDay(range.latest)}: 4 to 8 weeks after you wrote this ADR. The app reminds you that morning.`}
    >
      {(props) => (
        <>
          <input
            {...props}
            type="date"
            min={range.earliest}
            max={range.latest}
            value={value ?? ""}
            onChange={(event) => {
              const ok = validOutcomeDate(writtenOn, event.target.value);
              setProblem(!ok);
              if (ok) onChange(event.target.value);
            }}
          />
          {problem && (
            <p role="alert" className="error">
              Pick a day between {formatDay(range.earliest)} and {formatDay(range.latest)}.
            </p>
          )}
        </>
      )}
    </DocField>
  );
}
