import { describe, expect, it } from "vitest";

import {
  SHORTS_TILE_SELECTOR,
  isHomePath,
  isShortsPath,
  isSupportedPath,
  normalizeYouTubePageTitle,
} from "../src/content/feed";
import { recommendationActionForTile } from "../src/content/notInterested";

describe("YouTube feed paths", () => {
  it("recognizes only the Home root as the Home feed", () => {
    expect(isHomePath("/")).toBe(true);
    expect(isHomePath("/feed/subscriptions")).toBe(false);
    expect(isHomePath("/watch")).toBe(false);
  });

  it("recognizes Shorts routes without matching similarly named paths", () => {
    expect(isShortsPath("/shorts")).toBe(true);
    expect(isShortsPath("/shorts/BGVJ2VsQX20")).toBe(true);
    expect(isShortsPath("/shorts/")).toBe(true);
    expect(isShortsPath("/shorts-shelf")).toBe(false);
  });

  it("limits filtering to Home and Shorts", () => {
    expect(isSupportedPath("/")).toBe(true);
    expect(isSupportedPath("/shorts/BGVJ2VsQX20")).toBe(true);
    expect(isSupportedPath("/results")).toBe(false);
  });

  it("extracts the original Shorts title from YouTube's tab title", () => {
    expect(normalizeYouTubePageTitle('(17) 대길이에게 낚여버린 장동식 - YouTube')).toBe(
      "대길이에게 낚여버린 장동식"
    );
    expect(normalizeYouTubePageTitle("원곡자 본인인 줄 알고 난리 난 직캠 - YouTube Shorts")).toBe(
      "원곡자 본인인 줄 알고 난리 난 직캠"
    );
    expect(normalizeYouTubePageTitle("YouTube")).toBeNull();
  });
});

describe("recommendation actions", () => {
  it("uses channel suppression for Shorts and Not interested for Home", () => {
    const shortsTile = {
      matches: (selector: string) => selector === SHORTS_TILE_SELECTOR,
    } as unknown as HTMLElement;
    const homeTile = { matches: () => false } as unknown as HTMLElement;

    expect(recommendationActionForTile(shortsTile)).toBe("do-not-recommend-channel");
    expect(recommendationActionForTile(homeTile)).toBe("not-interested");
  });
});
