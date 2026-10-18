import type { Apartment, Prices } from "./apartment";
import { koreaToday, monthsBefore } from "./apartment";
// Fictional records are available only through the explicitly labelled preview button.
export const previewApartment: Apartment = {
  id: "preview", name: "한눈에 예시 아파트", address: "화면 확인을 위한 가상 단지입니다",
  approvalDate: "2015-09-18", households: 720, sourceUrl: "https://fin.land.naver.com/",
  areas: [
    { id: "59A", label: "59A", supplyM2: 81.32, exclusiveM2: 59.94 },
    { id: "84A", label: "84A", supplyM2: 112.12, exclusiveM2: 84.97 },
    { id: "84B", label: "84B", supplyM2: 113.01, exclusiveM2: 84.99 },
  ],
};
export function previewPrices(area: string): Prices {
  const today = koreaToday();
  return {
    trades: area === "59A" ? [
      { date: monthsBefore(today, 1), priceWon: 580000000, floor: 12, cancelled: false },
      { date: monthsBefore(today, 2), priceWon: 565000000, floor: 7, cancelled: false },
      { date: today, priceWon: 620000000, floor: 18, cancelled: true },
    ] : area === "84A" ? [{ date: monthsBefore(today, 14), priceWon: 710000000, floor: 9, cancelled: false }] : [],
    market: area === "84A" ? { lowWon: 700000000, highWon: 760000000, date: today, provider: "가상 제공기관 · 화면 예시" } : null,
    checkedAt: new Date().toISOString(), sourceUrl: "https://fin.land.naver.com/",
    typeNote: "화면 예시입니다. 실제 단지와 거래 가격을 나타내지 않습니다.",
  };
}
