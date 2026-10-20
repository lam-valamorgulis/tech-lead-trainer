"use client";

import { useParams } from "next/navigation";
import { AuthGate } from "../../auth-gate";
import { PlacementScreen } from "./placement-screen";

export function PlacementFromUrl() {
  const { town } = useParams<{ town: string }>();
  return <AuthGate>{() => <PlacementScreen townId={town} />}</AuthGate>;
}
