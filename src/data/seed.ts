import { formatISO } from "date-fns";

import {
  BookingLink,
  Itinerary,
  LocalizedText,
  Place,
  RankingSnapshot,
  SharedItinerary,
} from "../types/domain";

const lt = (ko: string, en: string): LocalizedText => ({ ko, en });

export const seedPlaces: Place[] = [
  {
    id: "gamcheon",
    slug: "gamcheon-culture-village",
    district: "Saha-gu",
    categories: ["culture", "photospot", "history"],
    name: lt("감천문화마을", "Gamcheon Culture Village"),
    description: lt(
      "파스텔 톤 골목과 전망 포인트가 이어지는 부산 대표 예술 마을입니다.",
      "A hillside art village with pastel alleys, murals, and iconic viewpoints."
    ),
    signatureStory: lt(
      "전쟁 피란민 정착지에서 시작해 예술 마을로 재생된 장소입니다.",
      "It began as a refugee settlement after the war and later transformed into a community art village."
    ),
    coordinates: { latitude: 35.0979, longitude: 129.0106 },
    indoor: false,
    accessibility: false,
    recommendedStayMinutes: 90,
    popularity: 88,
    crowdBase: 72,
    priceLevel: "value",
  },
  {
    id: "haeundae",
    slug: "haeundae-beach",
    district: "Haeundae-gu",
    categories: ["nature", "photospot", "night"],
    name: lt("해운대 해수욕장", "Haeundae Beach"),
    description: lt(
      "부산을 대표하는 해변으로 낮과 밤 모두 분위기가 달라지는 명소입니다.",
      "Busan's signature beach with a different mood from bright daytime to neon-lit night."
    ),
    signatureStory: lt(
      "도시형 해변 문화와 고층 스카이라인이 동시에 펼쳐지는 상징적인 장소입니다.",
      "A symbolic urban beach where resort energy meets a dramatic skyline."
    ),
    coordinates: { latitude: 35.1587, longitude: 129.1604 },
    indoor: false,
    accessibility: true,
    recommendedStayMinutes: 80,
    popularity: 96,
    crowdBase: 91,
    priceLevel: "balanced",
  },
  {
    id: "gwangalli",
    slug: "gwangalli-beach",
    district: "Suyeong-gu",
    categories: ["night", "photospot", "food"],
    name: lt("광안리 해변", "Gwangalli Beach"),
    description: lt(
      "광안대교 야경과 카페 스트리트가 이어지는 야간 산책 코스입니다.",
      "A nighttime promenade known for bridge views, cafes, and glowing waterfront energy."
    ),
    signatureStory: lt(
      "광안대교 조명이 바다 위를 물들이며 부산의 밤 풍경을 대표합니다.",
      "The illuminated Gwangan Bridge turns the bay into Busan's signature nightscape."
    ),
    coordinates: { latitude: 35.1532, longitude: 129.1187 },
    indoor: false,
    accessibility: true,
    recommendedStayMinutes: 75,
    popularity: 93,
    crowdBase: 87,
    priceLevel: "balanced",
  },
  {
    id: "huinnyeoul",
    slug: "huinnyeoul-culture-village",
    district: "Yeongdo-gu",
    categories: ["culture", "healing", "photospot"],
    name: lt("흰여울문화마을", "Huinnyeoul Culture Village"),
    description: lt(
      "바다 절벽길과 작은 카페가 이어지는 여유로운 감성 산책지입니다.",
      "A serene cliffside village with ocean paths, slow cafes, and film-like scenery."
    ),
    signatureStory: lt(
      "영화 촬영지로도 유명하며 영도 바다를 가장 가까이에서 느낄 수 있습니다.",
      "It is a well-known film location and one of the most intimate sea-facing walks in Busan."
    ),
    coordinates: { latitude: 35.0782, longitude: 129.0432 },
    indoor: false,
    accessibility: false,
    recommendedStayMinutes: 70,
    popularity: 84,
    crowdBase: 62,
    priceLevel: "balanced",
  },
  {
    id: "jagalchi",
    slug: "jagalchi-market",
    district: "Jung-gu",
    categories: ["food", "history", "culture"],
    name: lt("자갈치시장", "Jagalchi Market"),
    description: lt(
      "부산 바다의 활기를 가장 가까이에서 느낄 수 있는 해산물 중심 시장입니다.",
      "A seafood market where you can feel the pulse of Busan's port culture."
    ),
    signatureStory: lt(
      "자갈이 많은 포구에서 이름이 유래되었다는 설이 널리 알려져 있습니다.",
      "Its name is widely linked to the gravelly shoreline where the market took shape."
    ),
    coordinates: { latitude: 35.0968, longitude: 129.0307 },
    indoor: true,
    accessibility: true,
    recommendedStayMinutes: 65,
    popularity: 90,
    crowdBase: 84,
    priceLevel: "balanced",
  },
  {
    id: "cinema-center",
    slug: "busan-cinema-center",
    district: "Haeundae-gu",
    categories: ["culture", "healing", "night"],
    name: lt("영화의전당", "Busan Cinema Center"),
    description: lt(
      "부산국제영화제의 상징 공간으로, 실내외 문화 프로그램과 전시를 즐길 수 있습니다.",
      "The iconic home of BIFF with exhibitions, architecture, and indoor cultural programs."
    ),
    signatureStory: lt(
      "거대한 지붕 구조와 야간 조명이 어우러져 실내 대체 코스로도 매력적입니다.",
      "Its monumental roof and lightscape make it a compelling all-weather stop."
    ),
    coordinates: { latitude: 35.1714, longitude: 129.1275 },
    indoor: true,
    accessibility: true,
    recommendedStayMinutes: 80,
    popularity: 79,
    crowdBase: 51,
    priceLevel: "balanced",
  },
  {
    id: "museum-of-contemporary",
    slug: "busan-moca",
    district: "Saha-gu",
    categories: ["culture", "healing", "history"],
    name: lt("부산현대미술관", "Busan MoCA"),
    description: lt(
      "을숙도 생태 환경과 전시를 함께 경험할 수 있는 실내 중심 문화 공간입니다.",
      "An indoor-first museum that connects contemporary art with the Eulsukdo eco landscape."
    ),
    signatureStory: lt(
      "비나 미세먼지 상황에서 대체 일정으로 넣기 좋은 문화 시설입니다.",
      "It works especially well as an indoor fallback when weather conditions change."
    ),
    coordinates: { latitude: 35.1047, longitude: 128.9784 },
    indoor: true,
    accessibility: true,
    recommendedStayMinutes: 75,
    popularity: 68,
    crowdBase: 36,
    priceLevel: "value",
  },
  {
    id: "haedong",
    slug: "haedong-yonggungsa",
    district: "Gijang-gun",
    categories: ["history", "nature", "photospot"],
    name: lt("해동용궁사", "Haedong Yonggungsa"),
    description: lt(
      "동해를 배경으로 절경을 이루는 해안 사찰입니다.",
      "A dramatic seaside temple known for cliffside views over the East Sea."
    ),
    signatureStory: lt(
      "바다와 사찰이 한 화면에 담겨 부산 여행 사진 명소로 꾸준히 사랑받습니다.",
      "Its cliffside setting makes it one of Busan's most enduring photo spots."
    ),
    coordinates: { latitude: 35.1885, longitude: 129.2234 },
    indoor: false,
    accessibility: false,
    recommendedStayMinutes: 85,
    popularity: 91,
    crowdBase: 78,
    priceLevel: "balanced",
  },
  {
    id: "songdo",
    slug: "songdo-skywalk",
    district: "Seo-gu",
    categories: ["nature", "photospot", "healing"],
    name: lt("송도 스카이워크", "Songdo Skywalk"),
    description: lt(
      "바다 위로 이어지는 산책길과 케이블카 풍경이 매력적인 해안 명소입니다.",
      "A scenic ocean walkway with cable-car views and easy seaside strolling."
    ),
    signatureStory: lt(
      "짧은 체류로도 만족도가 높아 일정 압축 시 다시 배치하기 좋은 포인트입니다.",
      "It delivers a high-impact stop even when your schedule needs to stay compact."
    ),
    coordinates: { latitude: 35.0762, longitude: 129.0223 },
    indoor: false,
    accessibility: true,
    recommendedStayMinutes: 55,
    bookingLabel: lt("해상 케이블카 예약", "Book cable car"),
    bookingUrl: "https://busanaircruise.co.kr",
    popularity: 83,
    crowdBase: 66,
    priceLevel: "balanced",
  },
];

export const seedBookingLinks: BookingLink[] = seedPlaces
  .filter((place) => place.bookingUrl && place.bookingLabel)
  .map((place) => ({
    placeId: place.id,
    provider: "partner",
    label: place.bookingLabel!,
    url: place.bookingUrl!,
  }));

export const seedSharedRoutes: SharedItinerary[] = [
  {
    id: "shared-night-sea",
    itineraryId: "seed-night-sea",
    title: lt("광안리 나이트 워크", "Gwangalli Night Walk"),
    summary: lt(
      "광안리와 영화의전당을 묶은 야경 중심 반나절 코스",
      "A half-day night route pairing Gwangalli with Busan Cinema Center"
    ),
    heroPlaceName: lt("광안리 해변", "Gwangalli Beach"),
    tags: ["night", "food", "photospot"],
    ratingAverage: 4.8,
    currentTravelers: 36,
    score: 91,
  },
  {
    id: "shared-art-port",
    itineraryId: "seed-art-port",
    title: lt("영도 감성 포트 데이", "Yeongdo Port Mood Day"),
    summary: lt(
      "흰여울과 자갈치시장으로 이어지는 로컬 감성 코스",
      "A local mood route connecting Huinnyeoul and Jagalchi"
    ),
    heroPlaceName: lt("흰여울문화마을", "Huinnyeoul Culture Village"),
    tags: ["culture", "food", "healing"],
    ratingAverage: 4.7,
    currentTravelers: 21,
    score: 86,
  },
];

export const seedRanking: RankingSnapshot[] = [
  {
    id: "ranking-gwangalli",
    itineraryId: "seed-night-sea",
    title: lt("오늘 저녁 가장 붐비는 야경 루트", "Tonight's most active night-view route"),
    summary: lt(
      "광안리 해변과 카페 스트리트를 중심으로 실시간 수요가 높아요.",
      "Live traveler demand is strongest around Gwangalli Beach and the cafe strip."
    ),
    highlight: lt("지금 광안리 방향 이동 36명", "36 active travelers are moving toward Gwangalli right now"),
    tags: ["night", "photospot", "food"],
    score: 91,
    currentTravelers: 36,
  },
  {
    id: "ranking-indoor",
    title: lt("비 오는 날 대체 추천", "Top indoor fallback today"),
    summary: lt(
      "영화의전당과 부산현대미술관을 잇는 실내 루트가 상승 중입니다.",
      "The indoor route between Cinema Center and Busan MoCA is trending upward."
    ),
    highlight: lt("실내 대체 요청 급증", "Indoor fallback requests are spiking"),
    tags: ["culture", "healing"],
    score: 77,
    currentTravelers: 12,
  },
];

export const seedItineraryTemplate = (itinerary: Itinerary) => ({
  ...itinerary,
  createdAt: formatISO(new Date()),
});
