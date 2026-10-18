import type { Apartment, Area, SearchItem } from "./apartment";

export class SourceError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}

// Only confirmed successful responses are cached. A failed lookup is never an empty result.
const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
let limitedUntil = 0;

export async function naverGet(path: string, params: Record<string, string>, fetcher: typeof fetch = fetch): Promise<unknown> {
  const url = new URL("https://fin.land.naver.com/front-api/v1" + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const key = url.href;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.value;
  if (limitedUntil > Date.now()) throw new SourceError("SOURCE_LIMITED", "네이버에서 데이터 요청을 제한하고 있습니다. 잠시 후 다시 조회해 주세요.", 503);
  if (pending.has(key)) return pending.get(key)!;
  const request = (async () => {
    let response: Response;
    try { response = await fetcher(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000), redirect: "error" }); }
    catch { throw new SourceError("SOURCE_UNAVAILABLE", "네이버에 연결하지 못했습니다. 거래 유무는 아직 확인되지 않았습니다."); }
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
    if (!root || !("result" in root) || root.result === undefined) throw new SourceError("SOURCE_FORMAT", "네이버 데이터 형식을 확인하지 못했습니다.");
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
    if (!row || !/^\d+$/.test(String(row.complexNumber)) || typeof row.complexName !== "string" || typeof row.legalDivisionName !== "string") throw new SourceError("SOURCE_FORMAT", "네이버 검색 결과 형식을 확인하지 못했습니다.");
    return { id: String(row.complexNumber), name: row.complexName, address: row.legalDivisionName };
  }).slice(0, 12);
}

export async function searchApartments(keyword: string) {
  return parseSearch(await naverGet("/search/autocomplete/apartmentComplexes", { keyword, page: "0", size: "20" }));
}

export async function loadApartment(id: string): Promise<Apartment> {
  const [raw, rawAreas] = await Promise.all([
    naverGet("/complex", { complexNumber: id }),
    naverGet("/complex/pyeongList", { complexNumber: id }),
  ]);
  const info = object(raw);
  if (!info || typeof info.complexName !== "string") throw new SourceError("SOURCE_FORMAT", "네이버 단지 정보 형식을 확인하지 못했습니다.");
  const areas: Area[] = requiredList(rawAreas).map(item => {
    const row = object(item);
    if (!row || !/^\d+$/.test(String(row.pyeongTypeNumber)) || typeof row.pyeongTypeName !== "string" || !number(row.supplySpace) || !number(row.exclusiveSpace)) throw new SourceError("SOURCE_FORMAT", "네이버 면적 정보 형식을 확인하지 못했습니다.");
    return { id: String(row.pyeongTypeNumber), label: row.pyeongTypeName, supplyM2: row.supplySpace as number, exclusiveM2: row.exclusiveSpace as number };
  });
  if (!areas.length) throw new SourceError("SOURCE_FORMAT", "이 단지의 면적 정보를 확인하지 못했습니다.");
  const address = object(info.address);
  return {
    id, name: info.complexName,
    address: typeof address?.fullAddress === "string" ? address.fullAddress : "주소 정보 확인 필요",
    approvalDate: typeof info.useApprovalDate === "string" ? info.useApprovalDate : null,
    households: number(info.totalHouseholdNumber),
    sourceUrl: `https://fin.land.naver.com/complexes/${id}?tab=complex-info`, areas,
  };
}
