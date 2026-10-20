"use client";

import { useParams } from "next/navigation";
import { AuthGate } from "../../../auth-gate";
import { AdrScreen } from "./adr-screen";

export function AdrFromUrl() {
  const { town } = useParams<{ town: string }>();
  return <AuthGate>{() => <AdrScreen townId={town} />}</AuthGate>;
}
