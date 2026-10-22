"use client";

import { useParams } from "next/navigation";
import { parseTownNumber } from "@/core/town-map";
import { AuthGate } from "../../auth-gate";
import { SilentModeHint, SpeakerButton } from "../../speaker-button";
import { townName } from "../town-look";
import { TownScreen } from "./town-screen";

export function TownFromUrl() {
  const { town } = useParams<{ town: string }>();
  const number = parseTownNumber(town);
  return (
    <>
      {/* A short title, so it never runs under the speaker and Feedback buttons in the top corner. */}
      <h1>{number === null ? "Map" : `Town ${number}`}</h1>
      {number !== null && <h2 className="town-name">{townName(number)}</h2>}
      {/* The map music plays here too, so the speaker button and the silent-mode line come with it. */}
      <AuthGate>
        {(signedIn) => (
          <>
            <SpeakerButton {...signedIn} />
            <SilentModeHint />
            {number === null ? (
              <p className="lead">There is no town at this address. The map has towns 1 to 12.</p>
            ) : (
              <TownScreen number={number} programStartDate={signedIn.profile.programStartDate} />
            )}
          </>
        )}
      </AuthGate>
    </>
  );
}
