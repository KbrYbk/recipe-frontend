import { describe, expect, it } from "vitest";
import { isCookieBannerAccepted } from "../src/lib/cookieBanner";

const store = (data: Record<string, string>) => (key: string) => data[key] ?? null;

describe("isCookieBannerAccepted", () => {
  it("shows the banner when nothing is stored", () => {
    expect(isCookieBannerAccepted(store({}))).toBe(false);
  });
  it("accepts the original key", () => {
    expect(isCookieBannerAccepted(store({ "swageda:cookie-accepted": "true" }))).toBe(true);
  });
  it("accepts the intermediate 'accepted' value", () => {
    expect(isCookieBannerAccepted(store({ "swageda:cookie-consent": "accepted" }))).toBe(true);
  });
  it("shows the banner again after a previous 'rejected'", () => {
    expect(isCookieBannerAccepted(store({ "swageda:cookie-consent": "rejected" }))).toBe(false);
  });
});
