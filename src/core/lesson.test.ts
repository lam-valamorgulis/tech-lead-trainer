import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown, fixtureTownV2 } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import { catchQueue } from "./catch.ts";
import { afterTry, CATCH_TRIES, lessonOf } from "./lesson.ts";

const v2Items = () => catchQueue(buildBundle([fixtureTownV2()]).towns[0]);
const v1Items = () => catchQueue(buildBundle([townSchema.parse(fixtureTown())]).towns[0]);

describe("lessonOf", () => {
  it("gives the 3 Lesson screens of an item, its source, and the screen that holds the catch answer", () => {
    const cache = v2Items()[0];
    const lesson = lessonOf(cache);
    expect(lesson.screens.map((s) => s.text)).toEqual([
      "Cache is a tool of the web.",
      "Shops use cache every day.",
      "A cache keeps a copy of a response, so the next visit loads faster.",
    ]);
    expect(lesson.screens[0].diagram).toBe("flowchart LR\n  Browser --> Server");
    expect(lesson.answerScreen).toBe(2);
    expect(lesson.source.url).toBe("https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching");
  });

  it("shows an item with no Lesson yet as one screen made of its card, so old content keeps working", () => {
    const proxy = v2Items().find((item) => item.id === "proxy")!;
    expect(lessonOf(proxy)).toEqual({
      screens: [{ text: proxy.card.text, example: proxy.card.example }],
      answerScreen: 0,
      source: proxy.card.source,
    });
    expect(v1Items().every((item) => lessonOf(item).screens.length === 1)).toBe(true);
  });
});

describe("afterTry", () => {
  it("catches the item on a right answer, at the first or the second try", () => {
    expect(afterTry(1, true)).toBe("caught");
    expect(afterTry(2, true)).toBe("caught");
  });

  it("shows the look-back after a wrong first try, and gives one more try", () => {
    expect(afterTry(1, false)).toBe("look-back");
  });

  it("ends after a wrong second try: there are at most two tries", () => {
    expect(CATCH_TRIES).toBe(2);
    expect(afterTry(2, false)).toBe("missed");
  });
});
