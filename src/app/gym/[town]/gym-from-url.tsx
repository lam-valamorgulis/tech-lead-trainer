"use client";

import { useParams } from "next/navigation";
import { AuthGate } from "../../auth-gate";
import { GymScreen } from "./gym-screen";

export function GymFromUrl() {
  const { town } = useParams<{ town: string }>();
  return <AuthGate>{({ profile }) => <GymScreen townId={town} programStartDate={profile.programStartDate} />}</AuthGate>;
}
