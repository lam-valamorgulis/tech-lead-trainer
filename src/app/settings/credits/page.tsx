import Link from "next/link";

// Ticket #99, design 9 and 11: every outside art pack is named here. The CC-BY portraits must
// name their maker and link to the page; the licence files sit next to the images in public/sprites.

type Pack = { what: string; title: string; by: string; licence: string; licenceUrl?: string; url: string };

const PACKS: Pack[] = [
  {
    what: "Creatures",
    title: "50+ Monsters Pack 2D",
    by: "isaiah658 (monsters 26 and 47 from designs by j0j0n4th4n)",
    licence: "CC0, public domain",
    url: "https://opengameart.org/content/50-monsters-pack-2d",
  },
  {
    what: "Portraits of people",
    title: "64px portraits",
    by: "peb (pebonius)",
    licence: "CC-BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    url: "https://opengameart.org/content/64px-portraits",
  },
];

export default function CreditsPage() {
  return (
    <main className="shell">
      <h1>Credits</h1>
      <ul className="stack credits">
        {PACKS.map((pack) => (
          <li key={pack.title} className="card stack">
            <h2>{pack.what}</h2>
            <p>
              <a href={pack.url} target="_blank" rel="noopener noreferrer">
                {pack.title}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>{" "}
              by {pack.by}.
            </p>
            <p className="lead">
              Licence:{" "}
              {pack.licenceUrl ? (
                <a href={pack.licenceUrl} target="_blank" rel="noopener noreferrer">
                  {pack.licence}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              ) : (
                pack.licence
              )}
            </p>
          </li>
        ))}
        <li className="card stack">
          <h2>Sounds and music</h2>
          <p>Made for this app, in code. No outside sound is used.</p>
        </li>
        <li className="card stack">
          <h2>Map and town icons</h2>
          <p>Drawn for this app, in code. No outside art is used.</p>
        </li>
        <li className="card stack">
          <h2>Pixel font</h2>
          <p>
            Press Start 2P by CodeMan38, under the{" "}
            <a href="https://openfontlicense.org" target="_blank" rel="noopener noreferrer">
              SIL Open Font License
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            .
          </p>
        </li>
      </ul>
      <Link href="/settings" className="button button-quiet back">
        Back
      </Link>
    </main>
  );
}
