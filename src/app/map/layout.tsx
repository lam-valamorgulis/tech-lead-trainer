import { MapMusic } from "./map-music";

/** The map and every town's page share the map music (design 5, UI rule 13). */
export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MapMusic />
      {children}
    </>
  );
}
