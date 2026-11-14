import type { Apartment } from "./apartment.ts";

export type LemonBranch = {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  sourceUrl: string;
};
export type Journey = {
  branchId: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  checkedAt: string;
  nearby?: boolean;
  error?: string;
};
export type TravelResult = { routes: Journey[]; provider: string };

export function isSeoulGyeonggi(address: string) {
  return /^(서울시|서울특별시|경기도)\s/.test(address);
}

export function durationLabel(seconds: number) {
  if (seconds < 60) return "1분 미만";
  const minutes = Math.round(seconds / 60);
  return [minutes >= 60 ? `${Math.floor(minutes / 60)}시간` : "", minutes % 60 ? `${minutes % 60}분` : ""].filter(Boolean).join(" ");
}

export function routeLink(branch: LemonBranch, apartment: Apartment, mode: "car" | "walk" = "car") {
  if (!apartment.coordinates) return null;
  const from = `${coordinate(branch.coordinates.lng)},${coordinate(branch.coordinates.lat)},${encodeURIComponent(`레몬하우스 ${branch.name}`)},,SIMPLE_POI`;
  const to = `${coordinate(apartment.coordinates.lng)},${coordinate(apartment.coordinates.lat)},${encodeURIComponent(apartment.name)},,SIMPLE_POI`;
  return `https://map.naver.com/p/directions/${from}/${to}/-/${mode}`;
}

function coordinate(value: number) {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let n = Math.round(value * 1e7) + 2e9, result = "";
  do { result = alphabet[n % 62] + result; n = Math.floor(n / 62); } while (n > 0);
  return result;
}
