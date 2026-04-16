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
  {
    id: "centum-city",
    name: { ko: "센텀시티", en: "Centum City" },
    district: { ko: "해운대구", en: "Haeundae-gu" },
    coordinates: { latitude: 35.1692, longitude: 129.1295 },
  },
  {
    id: "sasang",
    name: { ko: "사상", en: "Sasang" },
    district: { ko: "사상구", en: "Sasang-gu" },
    coordinates: { latitude: 35.1627, longitude: 128.9857 },
  },
  {
    id: "gimhae-airport",
    name: { ko: "김해공항", en: "Gimhae Airport" },
    district: { ko: "강서구", en: "Gangseo-gu" },
    coordinates: { latitude: 35.1796, longitude: 128.9382 },
  },
  {
    id: "songdo",
    name: { ko: "송도", en: "Songdo" },
    district: { ko: "서구", en: "Seo-gu" },
    coordinates: { latitude: 35.0763, longitude: 129.0167 },
  },
  {
    id: "osiria",
    name: { ko: "오시리아", en: "Osiria" },
    district: { ko: "기장군", en: "Gijang-gun" },
    coordinates: { latitude: 35.1967, longitude: 129.2271 },
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
