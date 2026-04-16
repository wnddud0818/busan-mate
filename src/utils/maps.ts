import { Platform } from "react-native";

import { Coordinates, NavigationLinks } from "../types/domain";

const encodeCoords = ({ latitude, longitude }: Coordinates) =>
  `${latitude},${longitude}`;

const buildNaverMapUrl = ({ latitude, longitude }: Coordinates) =>
  Platform.OS === "web"
    ? `https://map.naver.com/p/search/${latitude},${longitude}`
    : `nmap://place?lat=${latitude}&lng=${longitude}&appname=com.busanmate.app`;

export const buildNavigationLinks = (coordinates: Coordinates): NavigationLinks => {
  const coords = encodeCoords(coordinates);

  return {
    appleMaps: `http://maps.apple.com/?ll=${coords}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${coords}`,
    naverMap: buildNaverMapUrl(coordinates),
    kakaoMap: `kakaomap://look?p=${coords}`,
    tMap: `tmap://search?name=${coords}`,
  };
};
