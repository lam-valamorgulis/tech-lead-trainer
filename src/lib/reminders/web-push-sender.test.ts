import { describe, expect, it } from "vitest";
import { isPushServiceEndpoint, webPushSender } from "./web-push-sender";

describe("isPushServiceEndpoint", () => {
  it("accepts the push services of Safari, Chrome, Firefox and Edge", () => {
    expect(isPushServiceEndpoint("https://web.push.apple.com/QGx2abc")).toBe(true);
    expect(isPushServiceEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushServiceEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isPushServiceEndpoint("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true);
  });

  it("refuses any other host, plain http and text that is not a URL", () => {
    expect(isPushServiceEndpoint("https://example.com/push")).toBe(false);
    expect(isPushServiceEndpoint("https://web.push.apple.com.example.com/x")).toBe(false);
    expect(isPushServiceEndpoint("http://web.push.apple.com/x")).toBe(false);
    expect(isPushServiceEndpoint("not a url")).toBe(false);
  });
});

describe("webPushSender", () => {
  it("never calls a host that is not a push service, and forgets that device", async () => {
    const send = webPushSender({ subject: "mailto:a@example.test", publicKey: "x", privateKey: "y" });
    expect(await send({ endpoint: "https://internal.example.test/admin", keys: { p256dh: "p", auth: "a" } }, "{}")).toBe("gone");
  });
});
