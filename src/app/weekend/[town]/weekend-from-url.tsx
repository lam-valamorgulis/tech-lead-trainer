"use client";

import { useParams } from "next/navigation";
import { AuthGate } from "../../auth-gate";
import { WeekendScreen } from "./weekend-screen";

export function WeekendFromUrl() {
  const { town } = useParams<{ town: string }>();
  return <AuthGate>{() => <WeekendScreen townId={town} />}</AuthGate>;
}
