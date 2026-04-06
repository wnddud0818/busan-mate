import { Coordinates, NavigationLinks } from "../types/domain";

const encodeCoords = ({ latitude, longitude }: Coordinates) =>
  `${latitude},${longitude}`;

export const buildNavigationLinks = (coordinates: Coordinates): NavigationLinks => {
  const coords = encodeCoords(coordinates);

  return {
    appleMaps: `http://maps.apple.com/?ll=${coords}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${coords}`,
    naverMap: `nmap://place?lat=${coordinates.latitude}&lng=${coordinates.longitude}&appname=com.busanmate.app`,
    kakaoMap: `kakaomap://look?p=${coords}`,
    tMap: `tmap://search?name=${coords}`,
  };
};
