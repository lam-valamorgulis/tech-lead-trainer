import { townSchema, type Town } from "./schema.ts";

// A small valid town for tests. It never ships in the app.
// Tests copy it with `fixtureTown()` and break one thing at a time.

const source = { title: "MDN: HTTP caching", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" };

export function fixtureTown() {
  const town = {
    id: "t99",
    number: 1,
    name: "Fixture Town",
    creatures: [
      {
        id: "cache",
        name: "Cache",
        catch: {
          question: "Why does a browser keep a copy of a page?",
          choices: ["To load it faster next time", "To hide it from the server", "To make it smaller"],
          correctChoice: 0,
          explanation: "A saved copy can be shown without a new download.",
        },
        card: {
          text: "A cache keeps a copy of a response. The next request can use the copy. This saves time and network.",
          example: "Your browser shows the shop logo from its cache on the second visit.",
          source,
        },
        review: {
          question: "What does a cache keep?",
          answer: "A copy of a response, so the next request can skip the download.",
        },
        workedExample: {
          problem: "The product page loads slowly for every visitor.",
          steps: ["Find the parts that change rarely.", "Let the browser cache them for one hour."],
          answer: "Cache the logo and the styles. Keep the price fresh.",
        },
        moves: [
          {
            id: "cache.ttl",
            name: "TTL",
            catch: {
              question: "What tells a cache when a copy is too old?",
              choices: ["A time to live", "A cookie", "A status code"],
              correctChoice: 0,
              explanation: "The time to live says how long the copy stays fresh.",
            },
            card: {
              text: "TTL means time to live. It says how long a cached copy stays fresh.",
              example: "max-age=3600 keeps the logo fresh for one hour.",
              source,
            },
            review: { question: "What does TTL mean?", answer: "Time to live: how long a copy stays fresh." },
          },
          {
            id: "cache.no-store",
            name: "No store",
            catch: {
              question: "Which header stops a cache from keeping a copy?",
              choices: ["Cache-Control: no-store", "Content-Type", "Set-Cookie"],
              correctChoice: 0,
              explanation: "no-store tells every cache to keep no copy.",
            },
            card: {
              text: "no-store tells caches to keep no copy. Every request goes to the server.",
              example: "A bank sends no-store on the account page.",
              source,
            },
            review: { question: "What does no-store do?", answer: "It tells caches to keep no copy of the response." },
          },
        ],
      },
      {
        id: "cookie",
        name: "Cookie",
        catch: {
          question: "How does a server remember you between requests?",
          choices: ["It sends a cookie", "It reads your screen", "It keeps the connection open forever"],
          correctChoice: 0,
          explanation: "The browser sends the cookie back with each request.",
        },
        card: {
          text: "A cookie is a small piece of data. The server sends it, and the browser sends it back.",
          example: "The shop keeps your cart in a cookie.",
          source,
        },
        review: { question: "Who sends a cookie back?", answer: "The browser, with each request to the same site." },
        workedExample: {
          problem: "A customer loses the cart on every page.",
          steps: ["Store a cart id in a cookie."],
          answer: "The cookie brings the cart id back with each request.",
        },
        moves: [
          {
            id: "cookie.http-only",
            name: "HttpOnly",
            catch: {
              question: "What keeps page scripts from reading a cookie?",
              choices: ["The HttpOnly attribute", "A long name", "A short value"],
              correctChoice: 0,
              explanation: "HttpOnly hides the cookie from scripts on the page.",
            },
            card: {
              text: "HttpOnly hides a cookie from page scripts. The browser still sends it to the server.",
              example: "The shop marks its session cookie HttpOnly.",
              source,
            },
            review: { question: "What does HttpOnly do?", answer: "It hides the cookie from page scripts." },
          },
        ],
      },
      {
        id: "proxy",
        name: "Proxy",
        catch: {
          question: "What sits between the browser and the server and passes requests on?",
          choices: ["A proxy", "A cookie", "A status code"],
          correctChoice: 0,
          explanation: "A proxy receives the request and sends it on.",
        },
        card: {
          text: "A proxy sits between the client and the server. It passes requests on and can keep copies.",
          example: "A CDN is a proxy close to the visitor.",
          source,
        },
        review: { question: "Where does a proxy sit?", answer: "Between the client and the server." },
        workedExample: {
          problem: "Visitors far away wait for every page.",
          steps: ["Put a proxy close to them.", "Let it keep copies of the pages."],
          answer: "The proxy answers from a nearby copy.",
        },
        moves: [
          {
            id: "proxy.cdn",
            name: "CDN",
            catch: {
              question: "What brings copies of a site close to visitors?",
              choices: ["A CDN", "A cookie", "A form"],
              correctChoice: 0,
              explanation: "A CDN keeps copies on servers near visitors.",
            },
            card: {
              text: "A CDN is a group of proxies around the world. Each one keeps copies near visitors.",
              example: "A visitor in Hanoi gets the logo from a server in Singapore.",
              source,
            },
            review: { question: "What is a CDN?", answer: "Proxies around the world that keep copies near visitors." },
          },
        ],
      },
    ],
    placement: [
      { creatureId: "cache", question: "What does a cache keep?", answer: "A copy of a response." },
      { creatureId: "cookie", question: "What is a cookie?", answer: "Small data the browser sends back." },
      { creatureId: "proxy", question: "What is a proxy?", answer: "A server between the client and the server." },
    ],
    confusablePairs: [["cache", "cookie"]],
    scenarios: [
      {
        id: "t99-sale-day",
        name: "Sale day",
        opponentType: "traffic",
        problem: "A sale starts at noon. Ten times more people open the shop.",
        // Best moves: cache.ttl, cache.no-store, proxy.cdn. A team with Cache and Proxy can win.
        turns: [
          {
            threat: "Every visitor downloads the same logo and styles again.",
            moves: [
              { moveId: "cache.ttl", damage: 2, counterattack: "The logo loads fast, but a new logo takes an hour to show." },
              { moveId: "proxy.cdn", damage: 1, counterattack: "Far visitors are faster, but each first load is still slow." },
              { moveId: "cookie.http-only", damage: 0, counterattack: "Scripts cannot read the cookie, but the page is still slow." },
            ],
            modelAnswer: "Give the logo and styles a long TTL. Browsers keep a copy, so the server sends each file once.",
            keyPoints: [
              "The logo and styles rarely change.",
              "A TTL lets browsers reuse their copy.",
              "A new logo shows only after the TTL ends.",
            ],
          },
          {
            threat: "The new sale price does not show. Visitors see the old price.",
            moves: [
              { moveId: "cache.no-store", damage: 2, counterattack: "Prices are fresh, but each price check now reaches the server." },
              { moveId: "proxy.cdn", damage: 1, counterattack: "Near copies update sooner, but some visitors still see the old price." },
              { moveId: "cache.ttl", damage: 0, counterattack: "The old price stays until its copy is too old." },
            ],
            modelAnswer: "Mark the price response no-store. Every visitor then gets the current price from the server.",
            keyPoints: [
              "A price must never come from an old copy.",
              "No store stops every cache from keeping it.",
              "Each price check now costs a server request.",
            ],
          },
          {
            threat: "Visitors far away wait three seconds for each page.",
            moves: [
              { moveId: "proxy.cdn", damage: 2, counterattack: "Pages now load near each visitor, but the network costs more." },
              { moveId: "cache.no-store", damage: 0, counterattack: "Every page is fetched again, so far visitors wait longer." },
              { moveId: "cookie.http-only", damage: 0, counterattack: "The cookie is safer, but far visitors still wait." },
            ],
            modelAnswer: "Put a CDN in front of the shop. Its servers near each visitor answer instead of the far origin.",
            keyPoints: [
              "Distance makes each request slow.",
              "A CDN keeps copies near the visitor.",
              "The CDN costs money for the network.",
            ],
          },
        ],
      },
    ],
  };
  // Four more battles with the same moves, so a Gym has its 5 battles (#26).
  const [saleDay] = town.scenarios;
  town.scenarios.push(...GYM_COPIES.map(([id, name]) => ({ ...structuredClone(saleDay), id, name })));
  return town;
}

const GYM_COPIES = [
  ["t99-flash-sale", "Flash sale"],
  ["t99-holiday-rush", "Holiday rush"],
  ["t99-launch-day", "Launch day"],
  ["t99-price-drop", "Price drop"],
] as const;

export const fixtureLedger = [
  "t99",
  "cache",
  "cache.ttl",
  "cache.no-store",
  "cookie",
  "cookie.http-only",
  "proxy",
  "proxy.cdn",
  "t99-sale-day",
  ...GYM_COPIES.map(([id]) => id),
];

export function fixtureGlossary() {
  return {
    words: [
      { word: "response", definition: "The message a server sends back to a request." },
      { word: "logo", definition: "The small picture that shows the name of a shop." },
    ],
  };
}

/** A small weekend boss for the fixture town, in the same Markdown shape as content/weekends. */
export function fixtureBossMarkdown() {
  return [
    "# Weekend 1 boss: the slow sale page",
    "",
    "## The situation (example made up)",
    "",
    "The sale page of `shop.example` loads slowly. Visitors leave before it shows.",
    "Two things go wrong:",
    "",
    "1. Every visitor downloads the same logo again.",
    "2. Visitors far away wait for each page.",
    "",
    "## Mermaid diagram starter",
    "",
    "```mermaid",
    "sequenceDiagram",
    "    participant Browser",
    "    participant Shop",
    "    Browser->>Shop: GET /sale",
    "```",
  ].join("\n");
}

const apiSource = { title: "MDN: 429 Too Many Requests", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429" };

/** A creature with one move, for the fixture town 2. */
function apiCreature(id: string, name: string, moveId: string, moveName: string) {
  return {
    id,
    name,
    catch: {
      question: `What is ${name}?`,
      choices: [`A tool for ${name.toLowerCase()} in an API`, "A kind of cookie", "A status page"],
      correctChoice: 0,
      explanation: `${name} is a tool of API design.`,
    },
    card: { text: `${name} is a tool of API design.`, example: `A shop API uses ${name.toLowerCase()}.`, source: apiSource },
    review: { question: `What is ${name}?`, answer: "A tool of API design." },
    workedExample: {
      problem: "A partner breaks the shop API.",
      steps: [`Use ${name.toLowerCase()}.`],
      answer: `${name} keeps the API safe.`,
    },
    moves: [
      {
        id: moveId,
        name: moveName,
        catch: {
          question: `What is ${moveName}?`,
          choices: [`A part of ${name.toLowerCase()}`, "A kind of cookie", "A status page"],
          correctChoice: 0,
          explanation: `${moveName} is a part of ${name.toLowerCase()}.`,
        },
        card: { text: `${moveName} is a part of ${name.toLowerCase()}.`, example: `A shop API uses ${moveName.toLowerCase()}.`, source: apiSource },
        review: { question: `What is ${moveName}?`, answer: `A part of ${name.toLowerCase()}.` },
      },
    ],
  };
}

/**
 * A small valid town 2 with the "two-types" twist (#36), for tests. It never ships in the app.
 * Its battle is a two-type opponent: each turn says which of its two types attacks.
 * The move tables also use moves of the town 1 fixture, so check it together with fixtureTown().
 */
export function fixtureTwistTown() {
  return {
    id: "t98",
    number: 2,
    name: "Fixture Town Two",
    twist: { kind: "two-types" },
    creatures: [
      apiCreature("rate-limit", "Rate limit", "rate-limit.quota", "Quota"),
      apiCreature("api-key", "API key", "api-key.rotate", "Key rotation"),
    ],
    placement: [
      { creatureId: "rate-limit", question: "What does a rate limit do?", answer: "It caps the requests of one client." },
      { creatureId: "api-key", question: "What is an API key?", answer: "A secret that names the client." },
    ],
    confusablePairs: [],
    scenarios: [
      {
        id: "t98-public-api",
        name: "Public API launch",
        opponentType: "traffic",
        secondType: "security",
        problem: "The shop opens its API to every partner on Monday.",
        // Best moves: rate-limit.quota, api-key.rotate, rate-limit.quota.
        turns: [
          {
            threatType: "traffic",
            threat: "One partner sends 500 requests each second and slows everyone.",
            moves: [
              { moveId: "rate-limit.quota", damage: 2, counterattack: "The partner slows down, but its big jobs take longer." },
              { moveId: "api-key.rotate", damage: 0, counterattack: "The partner gets a new key and sends just as much." },
              { moveId: "proxy.cdn", damage: 1, counterattack: "Some answers come from copies, but the writes still pile up." },
            ],
            modelAnswer: "Give each partner a quota. One partner can then never use all the capacity.",
            keyPoints: ["One client can use all the capacity.", "A quota caps each client.", "Big jobs now take longer."],
          },
          {
            threatType: "security",
            threat: "A leaked API key is used from an unknown server.",
            moves: [
              { moveId: "api-key.rotate", damage: 2, counterattack: "The leaked key stops working, but the partner must update its key." },
              { moveId: "rate-limit.quota", damage: 1, counterattack: "The stranger is slower, but it still reads data." },
              { moveId: "cookie.http-only", damage: 0, counterattack: "Scripts cannot read the cookie, but the key still works." },
            ],
            modelAnswer: "Rotate the leaked key at once. The old key stops working, and the partner gets a new one.",
            keyPoints: ["A leaked key works for anyone.", "Rotation makes the old key useless.", "The partner must update its key."],
          },
          {
            threatType: "traffic",
            threat: "A partner retries every failed call at once, and the load comes back.",
            moves: [
              { moveId: "rate-limit.quota", damage: 2, counterattack: "The retries wait their turn, but the partner sees more errors." },
              { moveId: "api-key.rotate", damage: 0, counterattack: "The key changes, but the retries keep coming." },
              { moveId: "proxy.cdn", damage: 0, counterattack: "The copies do not help, because every retry is new." },
            ],
            modelAnswer: "Keep the quota and answer 429 with a wait time. The partner then retries later.",
            keyPoints: ["Retries at once bring the load back.", "The quota still protects the API.", "The partner sees more errors."],
          },
        ],
      },
    ],
  };
}

export const fixtureTwistLedger = ["t98", "rate-limit", "rate-limit.quota", "api-key", "api-key.rotate", "t98-public-api"];

/** A 3-screen Lesson for a fixture item. Screen 2 holds the catch answer. */
function fixtureLesson(name: string, answer: string) {
  return {
    screens: [
      { text: `${name} is a tool of the web.`, diagram: "flowchart LR\n  Browser --> Server" },
      { text: `Shops use ${name.toLowerCase()} every day.` },
      { text: answer },
    ],
    answerScreen: 2,
    source,
  };
}

const reasons = (right: string, wrong: [string, string]) => [
  { text: right, right: true },
  { text: wrong[0], right: false },
  { text: wrong[1], right: false },
];

/** The v1.5 fields of one fixture turn, in turn order: a Constraint, 3 Reasons and the Skills. */
const SALE_DAY_V2 = [
  {
    constraint: "The logo changes once a year.",
    reasons: reasons("A rarely changed file is safe to keep for long.", ["A long TTL makes prices fresh.", "Browsers never keep logos."]),
    skills: [3],
  },
  {
    constraint: "The price changes every minute during the sale.",
    reasons: reasons("A price must never come from an old copy.", ["No store makes every page faster.", "A CDN always has the newest price."]),
    skills: [3, 10],
  },
  {
    constraint: "Half the visitors live on another continent.",
    reasons: reasons("A copy near the visitor cuts the travel time.", ["No store makes far pages faster.", "A cookie makes the page lighter."]),
    skills: [2],
  },
];

/**
 * The fixture town with every v1.5 field (#93): a Town Intro, Skills, Lessons, sprites, System
 * Map nodes, a trade-off question, Decision Cards, v1.5 battles, a Gym twin, a Meeting Battle and
 * an Agent Diff Battle. Seam C uses it in place of fixtureTown(), so the app must run with it.
 */
export function fixtureTownV2(): Town {
  const town = fixtureTown();
  const [cache, cookie, proxy] = town.creatures;
  const saleDay = town.scenarios[0];
  saleDay.turns.forEach((turn, i) => Object.assign(turn, structuredClone(SALE_DAY_V2[i])));
  const saleSource = { title: "Cloudflare: What is a CDN?", url: "https://www.cloudflare.com/learning/cdn/what-is-a-cdn/" };
  Object.assign(saleDay, { source: saleSource });
  const [, ...copies] = town.scenarios;
  for (const copy of copies) Object.assign(copy, structuredClone({ turns: saleDay.turns, source: saleSource }));
  Object.assign(copies[0], { reverses: "t99-sale-day" });

  const v2 = {
    ...town,
    intro: {
      title: "How a page reaches you",
      screens: ["A page travels from a server to your browser.", "Caches and proxies keep copies on the way, so pages load faster."],
      diagram: "flowchart LR\n  Browser --> CDN\n  CDN --> Server",
      source,
    },
    skills: [2, 3],
    creatures: [
      {
        ...cache,
        sprite: 12,
        mapNode: "cache",
        lesson: fixtureLesson("Cache", "A cache keeps a copy, so the next visit loads faster."),
        tradeOff: {
          id: "cache.trade-off.fresh-prices",
          situation: "Prices change every minute. The product page is slow.",
          options: ["Cache the page for one hour", "Cache the page but not the price", "Cache nothing"],
          rightOption: 1,
          reasons: reasons("The page is fast and the price stays fresh.", ["One hour is short enough for prices.", "Caching nothing is always safest."]),
          explanation: "Cache what rarely changes. Fetch the price each time.",
          skills: [3],
        },
        decisionCards: [
          {
            id: "cache.decision.logo",
            situation: "The shop logo changes once a year.",
            options: ["Give it a long TTL", "Mark it no-store"],
            rightOption: 0,
            reasons: reasons("A file that rarely changes can be kept for long.", ["No store makes it load faster.", "Logos must always be fresh."]),
            explanation: "A long TTL saves a download on every visit.",
            skills: [3],
          },
        ],
        moves: cache.moves.map((move) => ({ ...move, lesson: fixtureLesson(move.name, move.catch.explanation) })),
      },
      { ...cookie, sprite: 7, mapNode: "browser", lesson: fixtureLesson("Cookie", "A cookie is small data the browser sends back.") },
      { ...proxy, sprite: 30, mapNode: "cdn" },
    ],
    scenarios: [
      ...town.scenarios,
      {
        id: "t99-late-launch",
        name: "Late launch",
        kind: "meeting",
        person: "client",
        opponentType: "outage",
        source: { title: "Atlassian: Incident communication", url: "https://www.atlassian.com/incident-management/incident-communication" },
        problem: "The client asks why the sale page is late.",
        turns: [0, 1, 2].map((i) => ({
          threat: "Why is the sale page late?",
          constraint: "The client launches on Friday.",
          moves: [
            { moveId: `answer.facts-${i}`, label: "Give the cause, the new date and the risk.", damage: 2, counterattack: "The client trusts the new date." },
            { moveId: `answer.blame-${i}`, label: "Say the server team was slow.", damage: 0, counterattack: "The client now doubts the whole team." },
            { moveId: `answer.vague-${i}`, label: "Say it will be ready soon.", damage: 1, counterattack: "The client asks again tomorrow." },
          ],
          reasons: reasons("A clear cause and date let the client plan.", ["Blame protects the team.", "A vague answer avoids a fight."]),
          skills: [20],
          modelAnswer: "Say what went wrong, the new date and the one risk left.",
          keyPoints: ["Name the cause.", "Give a new date.", "Say the risk left."],
        })),
      },
      {
        id: "t99-cache-diff",
        name: "Cache diff",
        kind: "agent-diff",
        opponentType: "data",
        source: { title: "MDN: Cache-Control", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control" },
        problem: "An agent added caching to the price endpoint.",
        diff: '+ res.set("Cache-Control", "max-age=3600");\n  res.json(price);',
        turns: [0, 1, 2].map(() => ({
          threat: "The price response is now cached for one hour.",
          constraint: "The release goes out tonight.",
          moves: [
            { moveId: "verdict.block", damage: 2, counterattack: "The release waits, but no old price reaches a shopper." },
            { moveId: "verdict.approve", damage: 0, counterattack: "Shoppers see old prices for an hour." },
            { moveId: "verdict.ask-for-test", damage: 1, counterattack: "A test finds it, but the release is late." },
          ],
          reasons: reasons("A cached price shows shoppers the wrong amount.", ["Caching always makes an API safer.", "A test is never needed for headers."]),
          skills: [14, 15],
          modelAnswer: "Block it. A price must never be cached for an hour.",
          keyPoints: ["The price must stay fresh.", "One hour of old prices is a real loss.", "Ask for no-store on prices."],
        })),
      },
    ],
  };
  // Parsed, so tests get the typed town and can change one field at a time.
  return townSchema.parse(v2);
}

export const fixtureLedgerV2 = [...fixtureLedger, "cache.trade-off.fresh-prices", "cache.decision.logo", "t99-late-launch", "t99-cache-diff"];
