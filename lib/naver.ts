import type { Apartment, Area, SearchItem, Trade, MarketPrice, Prices } from "./apartment.ts";
import { koreaToday, monthsBefore } from "./apartment.ts";
import { naverHeaders } from "./naver-session.ts";

export class SourceError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}

// Only confirmed successful responses are cached. A failed lookup is never an empty result.
const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
let limitedUntil = 0;

export async function naverGet(path: string, params: Record<string, string | string[]>, fetcher: typeof fetch = fetch): Promise<unknown> {
  const url = new URL("https://fin.land.naver.com/front-api/v1" + path);
  Object.entries(params).forEach(([k, v]) => Array.isArray(v) ? v.forEach(item => url.searchParams.append(`${k}[]`, item)) : url.searchParams.set(k, v));
  const key = url.href;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.value;
  if (limitedUntil > Date.now()) throw new SourceError("SOURCE_LIMITED", "네이버에서 데이터 요청을 제한하고 있습니다. 잠시 후 다시 조회해 주세요.", 503);
  if (pending.has(key)) return pending.get(key)!;
  const request = (async () => {
    let response: Response;
    try { response = await fetcher(url, { headers: await naverHeaders(fetcher), signal: AbortSignal.timeout(12000), redirect: "manual" }); }
    catch (error) {
      const failure = error instanceof Error ? error : null;
      console.warn("naver_connection_failure", { name: failure?.name, message: failure?.message, path });
      throw new SourceError("SOURCE_UNAVAILABLE", "네이버에 연결하지 못했습니다. 거래 유무는 아직 확인되지 않았습니다.");
    }
    if (response.status === 429) {
      const retry = response.headers.get("retry-after");
      const seconds = Number(retry);
      const retryDate = retry ? Date.parse(retry) : NaN;
      limitedUntil = Date.now() + Math.max(60000, Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Number.isFinite(retryDate) ? retryDate - Date.now() : 60000);
      throw new SourceError("SOURCE_LIMITED", "네이버에서 데이터 요청을 제한하고 있습니다. 거래 유무는 아직 확인되지 않았습니다.", 503);
    }
    if (!response.ok) throw new SourceError("SOURCE_REJECTED", "네이버 자료를 가져오지 못했습니다. 원문에서 확인하거나 잠시 후 다시 조회해 주세요.");
    if (!response.headers.get("content-type")?.includes("json")) throw new SourceError("SOURCE_FORMAT", "네이버 데이터 형식이 변경되어 조회를 완료하지 못했습니다.");
    let body: unknown;
    try { body = await response.json(); } catch { throw new SourceError("SOURCE_FORMAT", "네이버 응답을 읽지 못했습니다."); }
    const root = object(body);
    if (!root || root.isSuccess !== true || !("result" in root) || root.result === undefined) throw new SourceError("SOURCE_FORMAT", "네이버 데이터 형식을 확인하지 못했습니다.");
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 300000, value: root.result });
    return root.result;
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function requiredList(value: unknown): unknown[] {
  const list = Array.isArray(value) ? value : object(value)?.list;
  if (!Array.isArray(list)) throw new SourceError("SOURCE_FORMAT", "네이버 목록 형식이 변경되어 조회를 완료하지 못했습니다.");
  return list;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseSearch(value: unknown): SearchItem[] {
  return requiredList(value).map(item => {
    const row = object(item);
    if (!row || !/^\d+$/.test(String(row.complexNumber)) || typeof row.complexName !== "string" || typeof row.legalDivisionName !== "string" || typeof row.type !== "string") throw new SourceError("SOURCE_FORMAT", "네이버 검색 결과 형식을 확인하지 못했습니다.");
    return { id: String(row.complexNumber), name: row.complexName, address: row.legalDivisionName, type: row.type };
  }).filter(row => row.type === "A01").slice(0, 12).map(({ id, name, address }) => ({ id, name, address }));
}

export async function searchApartments(keyword: string) {
  return parseSearch(await naverGet("/search/autocomplete/complexes", { keyword, page: "0", size: "20" }));
}

export function dateValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
}

export function parseApartment(id: string, raw: unknown, rawAreas: unknown): Apartment {
  const info = object(raw);
  if (!info || typeof info.name !== "string" || info.type !== "A01") throw new SourceError("SOURCE_FORMAT", "아파트 단지 정보 형식을 확인하지 못했습니다.");
  const areas: Area[] = requiredList(rawAreas).map(item => {
    const row = object(item);
    if (!row || !/^\d+$/.test(String(row.number)) || typeof row.name !== "string" || (number(row.supplyArea) ?? 0) <= 0 || (number(row.exclusiveArea) ?? 0) <= 0) throw new SourceError("SOURCE_FORMAT", "네이버 면적 정보 형식을 확인하지 못했습니다.");
    return { id: String(row.number), label: row.name, supplyM2: row.supplyArea as number, exclusiveM2: row.exclusiveArea as number };
  });
  if (!areas.length) throw new SourceError("SOURCE_FORMAT", "이 단지의 면적 정보를 확인하지 못했습니다.");
  const address = object(info.address);
  const addressParts = address?.roadName ? [address.city, address.division, address.roadName] : [address?.city, address?.division, address?.sector, address?.jibun];
  return {
    id, name: info.name,
    address: addressParts.filter(p => typeof p === "string" && p).join(" ") || "주소 정보 확인 필요",
    approvalDate: dateValue(info.useApprovalDate), households: number(info.totalHouseholdNumber),
    sourceUrl: `https://fin.land.naver.com/complexes/${id}?tab=complex-info`, areas,
  };
}

export async function loadApartment(id: string): Promise<Apartment> {
  const [raw, rawAreas] = await Promise.all([
    naverGet("/complex", { complexNumber: id }),
    naverGet("/complex/pyeongList", { complexNumber: id }),
  ]);
  return parseApartment(id, raw, rawAreas);
}

export function parseTrades(raw: unknown): Trade[] {
  return requiredList(raw).map(item => {
    const row = object(item);
    const date = dateValue(row?.tradeDate);
    const price = number(row?.dealPrice);
    if (!row || !date || price === null || !Number.isSafeInteger(price) || price <= 0 || typeof row.isDelete !== "boolean") throw new SourceError("SOURCE_FORMAT", "네이버 매매 자료 형식을 확인하지 못했습니다.");
    return { date, priceWon: price, floor: number(row.floor), cancelled: row.isDelete };
  });
}

const providers: Record<string, string> = { kab: "한국부동산원", kbstar: "KB부동산", neonet: "부동산뱅크" };
export function parseMarket(raw: unknown): MarketPrice | null {
  const rows = requiredList(raw).map(object);
  for (const cp of Object.keys(providers)) {
    const row = rows.find(r => r?.cp === cp && r.dealPriceRange);
    if (!row) continue;
    const range = object(row.dealPriceRange);
    const low = number(range?.floor), high = number(range?.ceiling), date = dateValue(row.baseDate);
    if (low === null || high === null || !Number.isSafeInteger(low) || !Number.isSafeInteger(high) || low <= 0 || high < low || !date) throw new SourceError("SOURCE_FORMAT", "네이버 매매 시세 형식을 확인하지 못했습니다.");
    return { lowWon: low, highWon: high, date, provider: providers[cp] };
  }
  if (rows.some(r => !r || typeof r.cp !== "string" || !providers[r.cp])) throw new SourceError("SOURCE_FORMAT", "시세 제공기관을 확인하지 못했습니다.");
  return null;
}

export async function loadPrices(id: string, area: string): Promise<Prices> {
  const apartment = await loadApartment(id);
  if (!apartment.areas.some(a => a.id === area)) throw new SourceError("INVALID_AREA", "이 아파트의 면적을 다시 선택해 주세요.", 400);
  const today = koreaToday();
  const params = { complexNumber: id, pyeongTypeNumber: area, realEstateType: "A01" };
  const [trades, market] = await Promise.all([
    naverGet("/complex/pyeong/realPrice/list", { ...params, tradeType: "A1", startDate: monthsBefore(today, 12), endDate: today }).then(parseTrades),
    naverGet("/complex/marketPrice/recent", { ...params, cpList: Object.keys(providers) }).then(parseMarket).then(value => ({ value, error: undefined as string | undefined })).catch(() => ({ value: null, error: "시세를 가져오지 못했습니다. 잠시 후 다시 조회해 주세요." })),
  ]);
  return { trades, market: market.value, marketError: market.error, checkedAt: new Date().toISOString(), sourceUrl: apartment.sourceUrl,
    typeNote: "네이버가 선택한 평형에 연결한 실거래입니다. 같은 전용면적의 A/B 타입은 구분되지 않을 수 있습니다." };
}
