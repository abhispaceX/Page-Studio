import { describe, expect, it } from "vitest";

import { bumpVersion, parseVersion, formatVersion, INITIAL_VERSION } from "@/lib/publish/version";

describe("bumpVersion", () => {
  it("returns INITIAL_VERSION when no current version", () => {
    expect(bumpVersion(null, "none")).toBe(INITIAL_VERSION);
    expect(bumpVersion(null, "patch")).toBe(INITIAL_VERSION);
    expect(bumpVersion(undefined, "minor")).toBe(INITIAL_VERSION);
  });

  it("none leaves the version unchanged", () => {
    expect(bumpVersion("2.5.7", "none")).toBe("2.5.7");
  });

  it("patch increments patch", () => {
    expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4");
  });

  it("minor zeroes patch, increments minor", () => {
    expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
  });

  it("major zeroes minor + patch, increments major", () => {
    expect(bumpVersion("1.2.3", "major")).toBe("2.0.0");
  });

  it("rejects malformed input", () => {
    expect(() => parseVersion("v1.2.3")).toThrow();
    expect(() => parseVersion("1.2")).toThrow();
  });

  it("roundtrips parse / format", () => {
    expect(formatVersion(parseVersion("9.8.7"))).toBe("9.8.7");
  });
});
