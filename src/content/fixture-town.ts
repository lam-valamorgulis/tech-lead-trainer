// A small valid town for tests. It never ships in the app.
// Tests copy it with `fixtureTown()` and break one thing at a time.

const source = { title: "MDN: HTTP caching", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" };

export function fixtureTown() {
  return {
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
          },
          {
            threat: "The new sale price does not show. Visitors see the old price.",
            moves: [
              { moveId: "cache.no-store", damage: 2, counterattack: "Prices are fresh, but each price check now reaches the server." },
              { moveId: "proxy.cdn", damage: 1, counterattack: "Near copies update sooner, but some visitors still see the old price." },
              { moveId: "cache.ttl", damage: 0, counterattack: "The old price stays until its copy is too old." },
            ],
          },
          {
            threat: "Visitors far away wait three seconds for each page.",
            moves: [
              { moveId: "proxy.cdn", damage: 2, counterattack: "Pages now load near each visitor, but the network costs more." },
              { moveId: "cache.no-store", damage: 0, counterattack: "Every page is fetched again, so far visitors wait longer." },
              { moveId: "cookie.http-only", damage: 0, counterattack: "The cookie is safer, but far visitors still wait." },
            ],
          },
        ],
      },
    ],
  };
}

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
];

export function fixtureGlossary() {
  return { words: [{ word: "response", definition: "The message a server sends back to a request." }] };
}
