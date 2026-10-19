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
        moves: [],
      },
    ],
    placement: [
      { creatureId: "cache", question: "What does a cache keep?", answer: "A copy of a response." },
      { creatureId: "cookie", question: "What is a cookie?", answer: "Small data the browser sends back." },
    ],
    confusablePairs: [["cache", "cookie"]],
  };
}

export const fixtureLedger = ["t99", "cache", "cache.ttl", "cookie"];

export function fixtureGlossary() {
  return { words: [{ word: "response", definition: "The message a server sends back to a request." }] };
}
