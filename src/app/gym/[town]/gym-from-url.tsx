"use client";

import { useParams } from "next/navigation";
import { AuthGate } from "../../auth-gate";
import { SpeakerButton } from "../../speaker-button";
import { GymScreen } from "./gym-screen";

export function GymFromUrl() {
  const { town } = useParams<{ town: string }>();
  return (
    <AuthGate>
      {(signedIn) => (
        <>
          <SpeakerButton {...signedIn} />
          <GymScreen townId={town} programStartDate={signedIn.profile.programStartDate} />
        </>
      )}
    </AuthGate>
  );
}
