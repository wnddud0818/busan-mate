import { StartArea, StartAreaId } from "../types/domain";

export const startAreas: StartArea[] = [
  {
    id: "seomyeon",
    name: { ko: "서면", en: "Seomyeon" },
    district: { ko: "부산진구", en: "Busanjin-gu" },
    coordinates: { latitude: 35.1578, longitude: 129.0592 },
  },
  {
    id: "haeundae",
    name: { ko: "해운대", en: "Haeundae" },
    district: { ko: "해운대구", en: "Haeundae-gu" },
    coordinates: { latitude: 35.1631, longitude: 129.1635 },
  },
  {
    id: "gwangalli",
    name: { ko: "광안리", en: "Gwangalli" },
    district: { ko: "수영구", en: "Suyeong-gu" },
    coordinates: { latitude: 35.1531, longitude: 129.1186 },
  },
  {
    id: "nampo",
    name: { ko: "남포", en: "Nampo" },
    district: { ko: "중구", en: "Jung-gu" },
    coordinates: { latitude: 35.0985, longitude: 129.0298 },
  },
  {
    id: "busan-station",
    name: { ko: "부산역", en: "Busan Station" },
    district: { ko: "동구", en: "Dong-gu" },
    coordinates: { latitude: 35.1151, longitude: 129.0414 },
  },
];

export const startAreaIds = startAreas.map((area) => area.id) as [StartAreaId, ...StartAreaId[]];

export const startAreasById = startAreas.reduce<Record<StartAreaId, StartArea>>(
  (map, area) => {
    map[area.id] = area;
    return map;
  },
  {} as Record<StartAreaId, StartArea>
);

export const getStartArea = (startAreaId: StartAreaId) => startAreasById[startAreaId];
