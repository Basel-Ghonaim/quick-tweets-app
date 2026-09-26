import { describe, expect, it } from "vitest";

import { hashtagKey, hashtagsOf, soleHashtag } from "./hashtags";

// Marks and joiners are built from their code points, so none sits in this file unseen.
const cp = (...points: number[]) => String.fromCodePoint(...points);
const FATHA = cp(0x064e);
const KASRA = cp(0x0650);
const SUKUN = cp(0x0652);
const TATWEEL = cp(0x0640);
const HAMZA_ABOVE = cp(0x0654);
const ACUTE = cp(0x0301);
const ZWNJ = cp(0x200c);

const spellingsOf = (text: string) => hashtagsOf(text).map((tag) => tag.spelling);
const allSame = (...tags: string[]) => new Set(tags.map(hashtagKey)).size === 1;

describe("hashtagsOf — where a hashtag begins and ends", () => {
  it("finds hashtags in any script", () => {
    expect(spellingsOf("Reading #القراءة and #WebDev, then #OpenSource!")).toEqual(["القراءة", "WebDev", "OpenSource"]);
  });

  it("starts one after punctuation or a space", () => {
    expect(spellingsOf("(#one) .#two /#three")).toEqual(["one", "two", "three"]);
  });

  it("does not start one inside a word", () => {
    expect(spellingsOf("abc#tag x_#tag 5#tag @abcd#tag")).toEqual([]);
  });

  it("does not find one inside a web address", () => {
    expect(spellingsOf("see https://example.com/#top and http://x.io/a?b=#c then #d")).toEqual(["d"]);
  });

  it("makes one of digits or an underscore alone", () => {
    expect(spellingsOf("We're #1 in #2026 #_")).toEqual(["1", "2026", "_"]);
  });

  it("ends one at a joiner, an emoji or another #", () => {
    expect(spellingsOf(`#abc${ZWNJ}def #tag😀 #one#two ##three`)).toEqual(["abc", "tag", "one", "three"]);
  });

  it("drops one with nothing left once its marks and tatweel are ignored", () => {
    expect(hashtagsOf(`#${FATHA} #${TATWEEL}${SUKUN} #real`)).toEqual([{ key: "real", spelling: "real" }]);
  });

  it("keeps each hashtag once, as the post first spelled it", () => {
    expect(hashtagsOf("#WebDev #webdev and #WEBDEV")).toEqual([{ key: "webdev", spelling: "WebDev" }]);
  });

  it("reads the text as given, since normalising can move where a hashtag begins", () => {
    const written = `a${ACUTE}#tag`;

    expect(spellingsOf(written)).toEqual(["tag"]);
    expect(spellingsOf(written.normalize("NFC"))).toEqual([]);
  });
});

describe("soleHashtag — a text that is one hashtag and nothing else", () => {
  it("gives the spelling of a text that is exactly one hashtag, in any script", () => {
    expect(soleHashtag("#WebDev")).toBe("WebDev");
    expect(soleHashtag("#القراءة")).toBe("القراءة");
  });

  it("gives nothing for a hashtag with more beside it", () => {
    for (const text of ["#WebDev tips", "#one #two", "tips #WebDev", "#WebDev!", " #WebDev"]) {
      expect(soleHashtag(text)).toBeNull();
    }
  });

  it("gives nothing for a # the rule does not make a hashtag", () => {
    for (const text of ["#", "#!", "##", "https://example.com/#top"]) {
      expect(soleHashtag(text)).toBeNull();
    }
  });
});

describe("hashtagKey — when two hashtags are the same", () => {
  it("reads the alef forms as ا, however the hamza was typed", () => {
    expect(allSame("أحمد", "إحمد", "آحمد", "ٱحمد", "احمد", `ا${HAMZA_ABOVE}حمد`)).toBe(true);
  });

  it("ignores the harakat and tatweel", () => {
    expect(allSame("القراءة", `ال${TATWEEL}قر${FATHA}اءة`, `ال${SUKUN}ق${KASRA}ر${FATHA}اء${FATHA}ة`)).toBe(true);
  });

  it("keeps ة apart from ه, and ى apart from ي", () => {
    expect(hashtagKey("مدرسة")).not.toBe(hashtagKey("مدرسه"));
    expect(hashtagKey("على")).not.toBe(hashtagKey("علي"));
  });

  it("keeps the hamza that makes ؤ and ئ", () => {
    expect(hashtagKey("سؤال")).not.toBe(hashtagKey("سوال"));
    expect(hashtagKey("مسائل")).not.toBe(hashtagKey("مسايل"));
  });

  it("counts accents outside Arabic, however they were typed", () => {
    expect(hashtagKey("café")).not.toBe(hashtagKey("cafe"));
    expect(allSame("café", `cafe${ACUTE}`)).toBe(true);
  });

  it("ignores case, in every script", () => {
    expect(allSame("WebDev", "webdev", "WEBDEV")).toBe(true);
    expect(allSame("ΟΔΟΣ", "οδος", "οδοσ")).toBe(true);
    expect(allSame("straße", "STRASSE", "STRAẞE")).toBe(true);
  });

  it("folds every character a hashtag admits to one key, whatever its case", () => {
    const admitted = /[\p{L}\p{M}\p{N}_]/u;
    const split: string[] = [];
    for (let point = 0; point <= 0x10ffff; point++) {
      if (point >= 0xd800 && point <= 0xdfff) continue;
      const ch = cp(point);
      if (!admitted.test(ch)) continue;
      const key = hashtagKey(ch);
      if (hashtagKey(key) !== key || hashtagKey(ch.toUpperCase()) !== key || hashtagKey(ch.toLowerCase()) !== key) {
        split.push(point.toString(16));
      }
    }

    expect(split).toEqual([]);
  });
});
