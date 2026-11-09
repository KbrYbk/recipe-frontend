import { describe, expect, it } from "vitest";
import { indexNowKeyFile } from "../src/lib/indexnow";

describe("IndexNow key file", () => {
  const key = "a1b2c3d4e5f6a7b8";
  it("отдаёт ключ только по своему имени", () => {
    expect(indexNowKeyFile(key, key)).toBe(key);
    expect(indexNowKeyFile("other1234", key)).toBeNull();
    expect(indexNowKeyFile(undefined, key)).toBeNull();
  });
  it("нет ключа или он невалиден — 404", () => {
    expect(indexNowKeyFile("anything", undefined)).toBeNull();
    expect(indexNowKeyFile("", "")).toBeNull();
    expect(indexNowKeyFile("short", "short")).toBeNull();
    expect(indexNowKeyFile("bad key!", "bad key!")).toBeNull();
  });
});
