import type { LemonBranch } from "./travel.ts";

// Addresses: official showroom pages; coordinates: corresponding public Kakao place maps, checked 2026-10-19.
export const lemonBranches: LemonBranch[] = [
  { id: "seoul", name: "서울본점", address: "서울 송파구 새말로 62, 송파푸르지오시티 B1 7호", coordinates: { lat: 37.48079248523133, lng: 127.12083921796805 }, sourceUrl: "https://lemon-house.kr/se_location1" },
  { id: "mokdong", name: "목동점", address: "서울 양천구 신목로 102, 대경프라자 4층 404호", coordinates: { lat: 37.523590326730684, lng: 126.87577495903001 }, sourceUrl: "https://lemon-house.kr/se_location2" },
  { id: "mapo", name: "마포직영점", address: "서울 마포구 백범로 205, 공덕푸르지오펜트라우스 102동 B233", coordinates: { lat: 37.543569639742984, lng: 126.95402269848931 }, sourceUrl: "https://lemon-house.kr/se_location3" },
  { id: "gwanggyo", name: "광교직영점", address: "경기 수원시 영통구 광교중앙로248번길 7-2, 원희캐슬광교 C동 B135호", coordinates: { lat: 37.291332019477146, lng: 127.0670479060265 }, sourceUrl: "https://lemon-house.kr/gg_location7" },
  { id: "dongtan", name: "동탄점", address: "경기 화성시 동탄구 여울로4길 43-9", coordinates: { lat: 37.21616523863799, lng: 127.0565395781693 }, sourceUrl: "https://lemon-house.kr/gg_location2" },
  { id: "namyangju", name: "남양주점", address: "경기 남양주시 다산순환로 20, B동 2층 13호", coordinates: { lat: 37.61258011464627, lng: 127.15171383286868 }, sourceUrl: "https://lemon-house.kr/gg_location6" },
  { id: "ilsan", name: "일산점", address: "경기 고양시 일산동구 위시티로 75, 3층", coordinates: { lat: 37.67886779542649, lng: 126.81122298139024 }, sourceUrl: "https://lemon-house.kr/gg_location8", note: "공식 안내에 ‘쇼룸 준비중’ 표기가 있어 방문 전 확인이 필요합니다." },
];
