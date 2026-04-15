import {
  buildTourPlaceFromApi,
  derivePlacePriceLevel,
  estimateTourPlaceSpend,
  parseTourPriceText,
} from "../tour-pricing";

describe("tour pricing", () => {
  it("parses free admission text as zero cost", () => {
    expect(parseTourPriceText("무료")).toBe(0);
    expect(parseTourPriceText("Free admission")).toBe(0);
  });

  it("prefers adult pricing when a fee guide includes multiple audiences", () => {
    expect(
      parseTourPriceText(
        "[63 Sky Art]<br>Adults 20,000 won / Teenagers 18,000 won / Children 16,000 won"
      )
    ).toBe(20000);
  });

  it("uses parsed intro pricing when a supported Tour API detail field is present", () => {
    const pricing = estimateTourPlaceSpend({
      contentTypeId: "14",
      detailItems: [
        {
          usefee: "성인 4,500원 / 청소년 3,000원 / 어린이 2,000원",
        },
      ],
      fallbackEstimatedSpendKrw: 22000,
      fallbackPriceLevel: "balanced",
    });

    expect(pricing.estimatedSpendKrw).toBe(4500);
    expect(pricing.priceLevel).toBe("value");
  });

  it("falls back to heuristic pricing when detail text has no usable amount", () => {
    const pricing = estimateTourPlaceSpend({
      contentTypeId: "15",
      detailItems: [
        {
          usetimefestival: "유료 / 사전예매 권장",
        },
      ],
      fallbackEstimatedSpendKrw: 24000,
      fallbackPriceLevel: "balanced",
    });

    expect(pricing.estimatedSpendKrw).toBe(24000);
    expect(pricing.priceLevel).toBe("balanced");
  });

  it("derives a per-guest estimate from lodging room fees", () => {
    const pricing = estimateTourPlaceSpend({
      contentTypeId: "32",
      detailItems: [
        {
          roombasecount: "2",
          roomoffseasonminfee1: "80000",
          roomoffseasonminfee2: "200000",
          roompeakseasonminfee1: "220000",
          roompeakseasonminfee2: "220000",
        },
      ],
      fallbackEstimatedSpendKrw: 24000,
      fallbackPriceLevel: "balanced",
    });

    expect(pricing.estimatedSpendKrw).toBe(40000);
    expect(pricing.priceLevel).toBe("premium");
  });

  it("maps parsed pricing into a live Tour API place", () => {
    const place = buildTourPlaceFromApi({
      item: {
        contentid: "126128",
        contenttypeid: "14",
        title: "부산 테스트 미술관",
        addr1: "부산 해운대구",
        mapx: "129.1200",
        mapy: "35.1600",
      },
      detailItems: [
        {
          usefee: "Adults 13,000 won / Children 8,000 won",
        },
      ],
      index: 0,
    });

    expect(place.estimatedSpendKrw).toBe(13000);
    expect(place.priceLevel).toBe("value");
    expect(place.categories).toContain("culture");
  });

  it("classifies parsed spend into value, balanced, and premium bands", () => {
    expect(derivePlacePriceLevel(18000)).toBe("value");
    expect(derivePlacePriceLevel(24000)).toBe("balanced");
    expect(derivePlacePriceLevel(33000)).toBe("premium");
  });
});
