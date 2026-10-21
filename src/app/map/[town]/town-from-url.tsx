"use client";

import { useParams } from "next/navigation";
import { parseTownNumber } from "@/core/town-map";
import { AuthGate } from "../../auth-gate";
import { SpeakerButton } from "../../speaker-button";
import { townName } from "../town-look";
import { TownScreen } from "./town-screen";

export function TownFromUrl() {
  const { town } = useParams<{ town: string }>();
  const number = parseTownNumber(town);
  if (number === null) {
    return (
      <>
        <h1>Map</h1>
        <p className="lead">There is no town at this address. The map has towns 1 to 12.</p>
      </>
    );
  }
  return (
    <>
      {/* A short title, so it never runs under the speaker and Feedback buttons in the top corner. */}
      <h1>Town {number}</h1>
      <h2 className="town-name">{townName(number)}</h2>
      <AuthGate>
        {(signedIn) => (
          <>
            <SpeakerButton {...signedIn} />
            <TownScreen number={number} programStartDate={signedIn.profile.programStartDate} />
          </>
        )}
      </AuthGate>
    </>
  );
}
