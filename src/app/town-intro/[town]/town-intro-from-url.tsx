"use client";

import { useParams } from "next/navigation";
import { getTown } from "@/content";
import { TownIntroView } from "../../new-town";

export function TownIntroFromUrl() {
  const { town: id } = useParams<{ town: string }>();
  const town = getTown(id);
  if (!town?.intro) return <h1>This town has no Town Intro yet.</h1>;
  return (
    <>
      <h1>
        Town {town.number}: {town.name}
      </h1>
      <TownIntroView intro={town.intro} />
    </>
  );
}
