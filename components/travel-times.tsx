"use client";
import { useEffect, useState } from "react";
import { Car, ExternalLink, RefreshCw } from "lucide-react";
import type { Apartment } from "@/lib/apartment";
import { lemonBranches } from "@/lib/lemon-branches";
import { carRouteLink, durationLabel, isSeoulGyeonggi } from "@/lib/travel";
import type { TravelResult } from "@/lib/travel";

export function TravelTimes({ apartment, enabled, onToggle }: { apartment: Apartment; enabled: boolean; onToggle: () => void }) {
  const [data, setData] = useState<TravelResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const eligible = isSeoulGyeonggi(apartment.address) && !!apartment.coordinates;

  useEffect(() => {
    if (!enabled || !eligible) { setData(null); setBusy(false); setError(""); return; }
    const controller = new AbortController();
    setData(null); setError(""); setBusy(true);
    fetch(`/api/travel?id=${encodeURIComponent(apartment.id)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const body = await response.json() as TravelResult & { message?: string };
        if (!response.ok) throw new Error(body.message || "차량 이동시간을 가져오지 못했습니다.");
        return body as TravelResult;
      })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "차량 경로 조회 실패"); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [enabled, eligible, apartment.id, refresh]);

  const rows = lemonBranches.map(branch => ({ branch, route: data?.routes.find(r => r.branchId === branch.id) }))
    .toSorted((a, b) => (a.route?.durationSeconds ?? Infinity) - (b.route?.durationSeconds ?? Infinity));

  return <section className="travel-panel" aria-label="레몬하우스 지점 차량 이동시간">
    <div className="travel-heading"><div><p className="eyebrow">LEMONHOUSE · DRIVING TIME</p><h3><Car size={20}/>레몬하우스 지점별 이동시간</h3><p>서울·경기 {lemonBranches.length}개 지점 → {apartment.name}</p></div>
      <button type="button" role="switch" aria-label="레몬하우스 차량 이동시간 표시" aria-checked={enabled && eligible} disabled={!eligible} className="travel-switch" onClick={onToggle}><span/>{enabled && eligible ? "켜짐" : "꺼짐"}</button>
    </div>
    {!eligible ? <p className="travel-off">서울·경기 지역의 실제 아파트에서 사용할 수 있습니다.</p> : !enabled ? <p className="travel-off">기능을 켜면 지점에서 이 아파트까지의 차량 예상 소요시간을 확인합니다.</p> : <>
      <div className="travel-summary"><p>{busy ? "지점별 자동차 경로를 확인하고 있습니다…" : "추천 자동차 경로 · 소요시간이 짧은 순"}</p><button type="button" className="text-button" disabled={busy} onClick={() => setRefresh(v => v + 1)}><RefreshCw size={13} className={busy ? "spin" : ""}/>다시 조회</button></div>
      {error && <p className="travel-error" role="alert">{error}</p>}
      <div className="travel-table-wrap" aria-busy={busy}><table className="travel-table"><thead><tr><th scope="col">출발 지점</th><th scope="col">차량 소요시간</th><th scope="col">거리</th><th scope="col">경로</th></tr></thead><tbody>{rows.map(({ branch, route }) => {
        const link = carRouteLink(branch, apartment);
        return <tr key={branch.id}><td><a href={branch.sourceUrl} target="_blank" rel="noreferrer">{branch.name} <ExternalLink size={11}/></a><small>{branch.address}</small>{branch.note && <small className="branch-note">{branch.note}</small>}</td>
          <td>{busy ? <span role="status">조회 중…</span> : route?.durationSeconds !== null && route?.durationSeconds !== undefined ? <strong>{durationLabel(route.durationSeconds)}</strong> : <span className="travel-error">조회 실패</span>}{route?.error && <small>{route.error}</small>}{route && <small>{new Date(route.checkedAt).toLocaleTimeString("ko-KR", {timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit"})} 조회</small>}</td>
          <td>{route?.distanceMeters === null || route?.distanceMeters === undefined ? "—" : `${(route.distanceMeters / 1000).toFixed(1)}km`}</td><td>{link && <a className="outline-button" href={link} target="_blank" rel="noreferrer">지도 보기 <ExternalLink size={12}/></a>}</td></tr>;
      })}</tbody></table></div>
      <p className="travel-footnote">{data?.provider ? `${data.provider} · ` : ""}조회 시점의 예상 시간이며 교통상황·진입로에 따라 달라집니다. 지점 주소는 레몬하우스 공식 지점안내(2026-10-19 확인) 기준입니다.</p>
    </>}
  </section>;
}
