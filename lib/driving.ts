import type { Journey, LemonBranch, TravelResult } from "./travel.ts";
import { isSeoulGyeonggi } from "./travel.ts";
import { lemonBranches } from "./lemon-branches.ts";
import { loadApartment, object, SourceError } from "./naver.ts";

const cache = new Map<string, { expires: number; value: Journey }>();
const pending = new Map<string, Promise<Journey>>();
let limitedUntil = 0;

export function parseDriving(raw: unknown) {
  const root = object(raw);
  // Naver returns code 1 when both points resolve to the same location.
  if (root?.code === 1) return { durationSeconds: null, distanceMeters: null, nearby: true };
  const routes = object(root?.route)?.["3,1,0,0,0,0"];
  const summary = Array.isArray(routes) ? object(object(routes[0])?.summary) : null;
  if (root?.code !== 0 || !summary || summary.mainOption !== 3 || summary.subOption !== 1 ||
    typeof summary.duration !== "number" || !Number.isFinite(summary.duration) || summary.duration < 0 ||
    typeof summary.distance !== "number" || !Number.isFinite(summary.distance) || summary.distance < 0) {
    throw new SourceError("ROUTE_FORMAT", "추천 자동차 경로를 확인하지 못했습니다.");
  }
  return { durationSeconds: summary.duration / 1000, distanceMeters: summary.distance };
}

export async function drivingTime(branch: LemonBranch, goal: { lat: number; lng: number }, fetcher: typeof fetch = fetch): Promise<Journey> {
  // shortcut: Public web routing may change; switch to a licensed Directions API if its format or access changes.
  const url = new URL("https://map.naver.com/p/api/directions/car");
  Object.entries({ crs: "EPSG:4326", rptype: "4", respversion: "4", output: "json",
    start: `${branch.coordinates.lng},${branch.coordinates.lat}`, goal: `${goal.lng},${goal.lat}`,
    cartype: "1", fueltype: "1", mileage: "11.4", mainoption: "traoptimal,avoidhipassonly",
  }).forEach(([key, value]) => url.searchParams.set(key, value));
  const key = url.href;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.value;
  if (pending.has(key)) return pending.get(key)!;
  const request = (async () => {
    try {
      if (limitedUntil > Date.now()) throw new SourceError("ROUTE_LIMITED", "요청 제한 중입니다. 잠시 후 다시 조회해 주세요.", 503);
      const response = await fetcher(url, { headers: {
        Accept: "application/json, text/plain, */*", Referer: "https://map.naver.com/p/directions/-/-/-/car", "Accept-Language": "ko-KR,ko;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      }, redirect: "manual", signal: AbortSignal.timeout(15000) });
      if (response.status === 429) { limitedUntil = Date.now() + 60000; throw new SourceError("ROUTE_LIMITED", "지도 요청이 제한됐습니다. 잠시 후 다시 조회해 주세요.", 503); }
      if (!response.ok || !response.headers.get("content-type")?.includes("json")) throw new SourceError("ROUTE_UNAVAILABLE", "지도에서 자동차 경로를 가져오지 못했습니다.");
      const result = { branchId: branch.id, ...parseDriving(await response.json()), checkedAt: new Date().toISOString() };
      if (cache.size >= 140) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + 180000, value: result });
      return result;
    } catch (error) {
      return { branchId: branch.id, durationSeconds: null, distanceMeters: null, checkedAt: new Date().toISOString(),
        error: error instanceof SourceError ? error.message : "지도에 연결하지 못했습니다. 잠시 후 다시 조회해 주세요." };
    }
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export async function loadTravel(id: string): Promise<TravelResult> {
  const apartment = await loadApartment(id);
  if (!isSeoulGyeonggi(apartment.address)) throw new SourceError("OUTSIDE_REGION", "차량 이동시간은 서울·경기 지역 아파트에서만 제공합니다.", 400);
  if (!apartment.coordinates) throw new SourceError("LOCATION_MISSING", "이 아파트의 지도 위치를 확인하지 못했습니다.");
  const goal = apartment.coordinates;
  return { provider: "네이버 지도 · 추천 자동차 경로", routes: await Promise.all(lemonBranches.map(branch => drivingTime(branch, goal))) };
}
