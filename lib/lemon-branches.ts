import type { LemonBranch } from "./travel.ts";

// Matched Naver Search/Place names, addresses and WGS84 coordinates; Cheongju is excluded.
// Seoul checked 2026-10-19; Gyeonggi/Incheon/Chungcheong checked 2026-11-17.
export const lemonBranches: LemonBranch[] = [
  { id: "seoul", name: "서울본점", address: "서울특별시 송파구 새말로 62 송파푸르지오시티상가 지하1층 7호", coordinates: { lat: 37.4807947, lng: 127.1208608 }, sourceUrl: "https://map.naver.com/p/entry/place/2022238675" },
  { id: "mokdong", name: "목동점", address: "서울특별시 양천구 신목로 102 대경프라자 4층 404호", coordinates: { lat: 37.5235719, lng: 126.8757887 }, sourceUrl: "https://map.naver.com/p/entry/place/2078185182" },
  { id: "mapo", name: "마포직영점", address: "서울특별시 마포구 백범로 205 102동 B233호", coordinates: { lat: 37.5434725, lng: 126.9539511 }, sourceUrl: "https://map.naver.com/p/entry/place/2058566850" },
  { id: "eunpyeong", name: "은평점", address: "서울특별시 은평구 통일로 1010 B111, B112호", coordinates: { lat: 37.6327355, lng: 126.9188717 }, sourceUrl: "https://map.naver.com/p/entry/place/2063583149" },
  { id: "gwanggyo", name: "광교직영점", address: "경기도 수원시 영통구 광교중앙로248번길 7-2 C동 지하1층 B135호", coordinates: { lat: 37.2910333, lng: 127.0666707 }, sourceUrl: "https://map.naver.com/p/entry/place/2076201459" },
  { id: "dongtan", name: "동탄점", address: "경기도 화성시 동탄구 여울로4길 43-9 1층", coordinates: { lat: 37.2161287, lng: 127.0564884 }, sourceUrl: "https://map.naver.com/p/entry/place/1261654597" },
  { id: "namyangju", name: "남양주점", address: "경기도 남양주시 다산순환로 20 B동 2층 13호", coordinates: { lat: 37.6136655, lng: 127.1523525 }, sourceUrl: "https://map.naver.com/p/entry/place/2030967057" },
  { id: "ilsan", name: "일산점", address: "경기도 고양시 일산동구 위시티로 75 풍산 트윈시티 1동 304호", coordinates: { lat: 37.6787872, lng: 126.8111976 }, sourceUrl: "https://map.naver.com/p/entry/place/2081620749" },
  { id: "incheon", name: "인천청라점", address: "인천광역시 서해구 청라커낼로288번길 26 현대썬앤빌더테라스 3층 310호", coordinates: { lat: 37.5336604, lng: 126.6474411 }, sourceUrl: "https://map.naver.com/p/entry/place/1920592177" },
  { id: "cheonan", name: "천안불당점", address: "충청남도 천안시 서북구 불당34길 25-4 3층 302호", coordinates: { lat: 36.8075645, lng: 127.1060045 }, sourceUrl: "https://map.naver.com/p/entry/place/1514794137" },
  { id: "daejeon", name: "대전점", address: "대전광역시 유성구 지족로 298 6층 2호", coordinates: { lat: 36.3876166, lng: 127.3096888 }, sourceUrl: "https://map.naver.com/p/entry/place/1629796881" },
];
