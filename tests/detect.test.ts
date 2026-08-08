import { describe, expect, it } from "vitest";

import { detectByScript } from "../src/shared/detect";

describe("detectByScript — Korean", () => {
  it("detects pure Korean titles", () => {
    expect(detectByScript("서울 브이로그 하루종일 카페 투어")).toBe("ko");
  });

  it("detects Korean mixed with English words", () => {
    expect(detectByScript("Seoul VLOG 서울 브이로그")).toBe("ko");
    expect(detectByScript("[ENG SUB] 김치찌개 만들기 Kimchi Stew Recipe")).toBe("ko");
  });

  it("does not flag English titles with one Korean word", () => {
    expect(
      detectByScript("The complete history of programming languages explained 한국")
    ).toBeNull();
  });
});

describe("detectByScript — Japanese vs Chinese", () => {
  it("detects Japanese when kana is present", () => {
    expect(detectByScript("東京で一番美味しいラーメン屋さん")).toBe("ja");
  });

  it("detects Chinese for kanji-only titles", () => {
    expect(detectByScript("北京烤鸭制作方法完整教程")).toBe("zh");
  });

  it("prefers Japanese over Chinese when both scripts appear", () => {
    expect(detectByScript("日本の温泉旅行おすすめ")).toBe("ja");
  });
});

describe("detectByScript — other scripts", () => {
  it("detects Russian", () => {
    expect(detectByScript("Как приготовить борщ дома")).toBe("ru");
  });

  it("detects Arabic", () => {
    expect(detectByScript("طريقة عمل الكبسة السعودية")).toBe("ar");
  });

  it("detects Hebrew", () => {
    expect(detectByScript("איך מכינים חומוס ביתי")).toBe("he");
  });

  it("detects Thai", () => {
    expect(detectByScript("วิธีทำต้มยำกุ้งแบบง่ายๆ")).toBe("th");
  });

  it("detects Hindi", () => {
    expect(detectByScript("घर पर बटर चिकन बनाने की विधि")).toBe("hi");
  });
});

describe("detectByScript — non-matches and edge cases", () => {
  it("returns null for English", () => {
    expect(detectByScript("The best moments of the year compilation")).toBeNull();
  });

  it("returns null for Latin-script European languages (AI territory)", () => {
    expect(detectByScript("La mejor receta de paella valenciana")).toBeNull();
  });

  it("returns null for empty and letter-free input", () => {
    expect(detectByScript("")).toBeNull();
    expect(detectByScript("2024 🔥🔥 #1")).toBeNull();
    expect(detectByScript("한")).toBeNull(); // below minimum letter count
  });

  it("ignores digits, punctuation and emoji when computing the ratio", () => {
    expect(detectByScript("!!! 대박 🔥🔥🔥 2024 !!!")).toBe("ko");
  });
});
