import { describe, expect, it } from "vitest";
import {
  buildShareUrl,
  decodeShareSettings,
  encodeShareSettings,
  readSharePayload,
  SHARE_VERSION,
} from "../../src/lib/share-link";
import {
  DEFAULT_PROJECT_SETTINGS,
  type ProjectSettings,
} from "../../src/lib/project";

const settings = (overrides: Partial<ProjectSettings> = {}): ProjectSettings =>
  structuredClone({ ...DEFAULT_PROJECT_SETTINGS, ...overrides });

/** The payload as it exists on the wire, for asserting on what's actually encoded. */
function decodePayloadJson(payload: string): Record<string, unknown> {
  const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

describe("encode/decode round-trip", () => {
  it("restores default settings unchanged", () => {
    const decoded = decodeShareSettings(encodeShareSettings(settings()));
    expect(decoded?.settings).toEqual(settings());
    expect(decoded?.backgroundImageOmitted).toBe(false);
  });

  it("restores every non-default field", () => {
    const source = settings({
      letters: "abc",
      letterCase: "preserve",
      designId: "playfair-display-circle",
      frameId: "dotted-circle",
      frameGap: 55,
      lettersColor: "#ff0000",
      lettersOpacity: 0.42,
      frameColor: "#00ff00",
      frameFilled: true,
      backgroundKind: "gradient",
      backgroundColor: "#123456",
      backgroundGradient: {
        style: "radial",
        angle: 90,
        stops: [
          { color: "#000000", offset: 0 },
          { color: "#ffffff", offset: 50 },
          { color: "#abcdef", offset: 100 },
        ],
      },
    });

    expect(decodeShareSettings(encodeShareSettings(source))?.settings).toEqual(
      source,
    );
  });

  it("preserves mixed-case letters left behind by the ABC toggle", () => {
    // Reachable state: type "Max" in Abc mode, then switch back to ABC.
    // The toggle deliberately doesn't re-case existing letters (ADR 0008),
    // so the sender sees "Max" with letterCase "upper" — and the recipient
    // must too, rather than "MAX".
    const source = settings({ letters: "Max", letterCase: "upper" });
    const decoded = decodeShareSettings(encodeShareSettings(source));

    expect(decoded?.settings.letters).toBe("Max");
    expect(decoded?.settings).toEqual(source);
  });

  it("survives a URL round-trip through the hash", () => {
    const source = settings({ letters: "ZZ", lettersColor: "#010203" });
    const url = new URL(buildShareUrl("https://monomix.app/", source));
    const payload = readSharePayload(url.hash);

    expect(payload).not.toBeNull();
    expect(decodeShareSettings(payload!)?.settings).toEqual(source);
  });
});

describe("field coverage", () => {
  // The short-key <-> long-key mapping is spelled out twice in share-link.ts
  // (once per direction), so a newly added ProjectSettings field can silently
  // stop travelling in links. This canary fails the moment the shape changes:
  // decide whether the new field belongs in a share link, then update this
  // list and both directions of the encoder.
  it("knows about every ProjectSettings field", () => {
    expect(Object.keys(DEFAULT_PROJECT_SETTINGS).sort()).toEqual([
      "backgroundColor",
      "backgroundGradient",
      "backgroundImage",
      "backgroundKind",
      "designId",
      "frameColor",
      "frameFilled",
      "frameGap",
      "frameId",
      "letterCase",
      "letters",
      "lettersColor",
      "lettersOpacity",
    ]);
  });
});

describe("payload compactness", () => {
  it("omits fields that match the defaults", () => {
    const payload = decodePayloadJson(encodeShareSettings(settings()));
    // Only the version marker and the letters themselves.
    expect(Object.keys(payload).sort()).toEqual(["l", "v"]);
    expect(payload.v).toBe(SHARE_VERSION);
    expect(payload.l).toBe(DEFAULT_PROJECT_SETTINGS.letters);
  });

  it("keeps a typical link short enough to paste anywhere", () => {
    const url = buildShareUrl(
      "https://monomix.app/",
      settings({ letters: "AB", frameId: "circle", lettersColor: "#c2185b" }),
    );
    expect(url.length).toBeLessThan(200);
  });

  it("uses only URL-safe base64 characters", () => {
    const payload = encodeShareSettings(
      settings({ letters: "QRS", frameColor: "#ff00ff", frameFilled: true }),
    );
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("background image", () => {
  it("flags an active image background as omitted and carries no data URL", () => {
    const payload = encodeShareSettings(
      settings({
        backgroundKind: "image",
        backgroundImage: "data:image/png;base64,AAAA",
      }),
    );

    expect(decodePayloadJson(payload).bi).toBe(1);
    expect(
      atob(payload.replaceAll("-", "+").replaceAll("_", "/")),
    ).not.toContain("data:image");

    const decoded = decodeShareSettings(payload);
    expect(decoded?.backgroundImageOmitted).toBe(true);
    // The kind is kept so the recipient lands on the Image control with an
    // empty picker (renders transparent) rather than silently on Transparent.
    expect(decoded?.settings.backgroundKind).toBe("image");
    expect(decoded?.settings.backgroundImage).toBeNull();
  });

  it("does not flag an image stashed behind another active background", () => {
    const payload = encodeShareSettings(
      settings({
        backgroundKind: "color",
        backgroundImage: "data:image/png;base64,AAAA",
      }),
    );
    expect(decodeShareSettings(payload)?.backgroundImageOmitted).toBe(false);
  });
});

describe("untrusted payloads", () => {
  it("rejects garbage, empty, and non-object payloads", () => {
    expect(decodeShareSettings("not-base64!!")).toBeNull();
    expect(decodeShareSettings("")).toBeNull();
    expect(decodeShareSettings(btoa("[1,2,3]"))).toBeNull();
    expect(decodeShareSettings(btoa("null"))).toBeNull();
  });

  it("rejects a payload truncated in transit", () => {
    const payload = encodeShareSettings(settings({ letters: "TRUNC" }));
    expect(
      decodeShareSettings(payload.slice(0, payload.length - 6)),
    ).toBeNull();
  });

  it("rejects an unrecognized format version rather than half-parsing it", () => {
    expect(
      decodeShareSettings(
        btoa(JSON.stringify({ v: SHARE_VERSION + 1, l: "AB" })),
      ),
    ).toBeNull();
    expect(decodeShareSettings(btoa(JSON.stringify({ l: "AB" })))).toBeNull();
  });

  it("caps letters at 3 valid A-Z characters, like the letters field does", () => {
    const decoded = decodeShareSettings(
      btoa(JSON.stringify({ v: SHARE_VERSION, l: "ABCDEFGHIJ" })),
    );
    expect(decoded?.settings.letters).toBe("ABC");
  });

  it("strips non-A-Z characters a link tried to smuggle in", () => {
    const decoded = decodeShareSettings(
      btoa(JSON.stringify({ v: SHARE_VERSION, l: "<>M" })),
    );
    expect(decoded?.settings.letters).toBe("M");
  });

  it("keeps letters exactly as sent, whatever letterCase the payload carries", () => {
    // letterCase governs future keystrokes only, never a retroactive re-case
    // (ADR 0008) — so decoding must not fold case either way.
    const upperMode = decodeShareSettings(
      btoa(JSON.stringify({ v: SHARE_VERSION, l: "abc" })),
    );
    expect(upperMode?.settings.letters).toBe("abc");

    const preserveMode = decodeShareSettings(
      btoa(JSON.stringify({ v: SHARE_VERSION, l: "ABC", c: "preserve" })),
    );
    expect(preserveMode?.settings.letters).toBe("ABC");
  });

  it("falls back to defaults for malformed individual fields", () => {
    const decoded = decodeShareSettings(
      btoa(
        JSON.stringify({
          v: SHARE_VERSION,
          l: "AB",
          g: "not-a-number",
          lo: 42,
          bg: { s: "spiral", a: 0, p: [["#fff", 0]] },
        }),
      ),
    );

    expect(decoded?.settings.frameGap).toBe(DEFAULT_PROJECT_SETTINGS.frameGap);
    expect(decoded?.settings.lettersOpacity).toBe(
      DEFAULT_PROJECT_SETTINGS.lettersOpacity,
    );
    // Unknown style / a single stop are both rejected by isGradient.
    expect(decoded?.settings.backgroundGradient).toEqual(
      DEFAULT_PROJECT_SETTINGS.backgroundGradient,
    );
  });
});

describe("readSharePayload", () => {
  it("reads the payload with or without a leading #", () => {
    expect(readSharePayload("#m=abc")).toBe("abc");
    expect(readSharePayload("m=abc")).toBe("abc");
  });

  it("ignores hashes that aren't share links", () => {
    expect(readSharePayload("#about")).toBeNull();
    expect(readSharePayload("")).toBeNull();
    expect(readSharePayload("#")).toBeNull();
    expect(readSharePayload("#m=")).toBeNull();
  });
});

describe("buildShareUrl", () => {
  it("replaces any existing hash instead of stacking payloads", () => {
    const first = buildShareUrl("https://monomix.app/#about", settings());
    const second = buildShareUrl(first, settings({ letters: "QQ" }));

    expect(second.match(/#/g)).toHaveLength(1);
    expect(
      decodeShareSettings(readSharePayload(new URL(second).hash)!)?.settings
        .letters,
    ).toBe("QQ");
  });

  it("keeps the origin and path of the page it was built from", () => {
    const url = new URL(
      buildShareUrl("https://monomix.app/app?x=1", settings()),
    );
    expect(url.origin).toBe("https://monomix.app");
    expect(url.pathname).toBe("/app");
    expect(url.search).toBe("?x=1");
  });
});
