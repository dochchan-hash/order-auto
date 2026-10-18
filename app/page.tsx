"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Building2, Check, ChevronDown, Copy, ExternalLink, Info, MapPin, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { Apartment, Prices, SearchItem } from "@/lib/apartment";
import { koreaToday, monthsBefore, pyeong, recentSales, won } from "@/lib/apartment";
import { previewApartment, previewPrices } from "@/lib/preview-data";

async function read<T>(url: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(url, { signal, cache: "no-store" });
  const body = await r.json() as T & { message?: string };
  if (!r.ok) throw new Error(body.message || "조회하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return body;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [composing, setComposing] = useState(false);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [areaId, setAreaId] = useState("");
  const [prices, setPrices] = useState<Prices | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [months, setMonths] = useState(6);
  const [refresh, setRefresh] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const selection = useRef(0);
  const picker = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const isPreview = apartment?.id === "preview";
  const today = koreaToday();
  const area = apartment?.areas.find(a => a.id === areaId);
  const sales = useMemo(() => recentSales(prices?.trades ?? [], months), [prices, months]);
  const latest = sales.filter(t => t.date === sales[0]?.date);
  const low = latest.length ? Math.min(...latest.map(t => t.priceWon)) : 0;
  const high = latest.length ? Math.max(...latest.map(t => t.priceWon)) : 0;

  useEffect(() => {
    if (composing || query.trim().length < 2 || apartment?.name === query) {
      setSearchBusy(false); setItems([]); setSearched(false); setSearchError(""); return;
    }
    const controller = new AbortController();
    setSearchBusy(true); setSearchError(""); setSearched(false); setItems([]); setActive(-1);
    const timer = setTimeout(async () => {
      try {
        const data = await read<{ items: SearchItem[] }>(`/api/search?q=${encodeURIComponent(query.trim())}`, controller.signal);
        if (!controller.signal.aborted) { setItems(data.items); setSearched(true); }
      } catch (e) { if (!controller.signal.aborted) setSearchError(e instanceof Error ? e.message : "검색을 완료하지 못했습니다."); }
      finally { if (!controller.signal.aborted) setSearchBusy(false); }
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, composing, apartment?.name, refresh]);

  useEffect(() => {
    const dismiss = (e: PointerEvent) => { if (!picker.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  async function choose(item: SearchItem) {
    const version = ++selection.current;
    setQuery(item.name); setOpen(false); setItems([]); setApartment(null); setPrices(null); setAreaId(""); setError(""); setLoading(true);
    try {
      const next = await read<Apartment>(`/api/apartment?id=${encodeURIComponent(item.id)}`);
      if (version !== selection.current) return;
      setApartment(next); setQuery(next.name); setAreaId(next.areas[0]?.id ?? "");
      const url = new URL(location.href); url.searchParams.set("complex", item.id); history.replaceState(null, "", url);
    } catch (e) { if (version === selection.current) setError(e instanceof Error ? e.message : "단지 조회에 실패했습니다."); }
    finally { if (version === selection.current) setLoading(false); }
  }

  useEffect(() => {
    const id = new URL(location.href).searchParams.get("complex");
    if (id && /^\d{1,12}$/.test(id)) void choose({ id, name: "", address: "" });
  }, []);

  useEffect(() => {
    if (!apartment || !areaId) return;
    if (apartment.id === "preview") { setPrices(previewPrices(areaId)); setError(""); setLoading(false); return; }
    const controller = new AbortController();
    setPrices(null); setError(""); setLoading(true);
    read<Prices>(`/api/prices?id=${apartment.id}&area=${areaId}`, controller.signal)
      .then(data => { if (!controller.signal.aborted) setPrices(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "가격을 확인하지 못했습니다."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apartment, areaId, refresh]);

  function preview() {
    ++selection.current; setOpen(false); setQuery(previewApartment.name); setApartment(previewApartment);
    setAreaId("59A"); setPrices(previewPrices("59A")); setError(""); setLoading(false);
    const url = new URL(location.href); url.searchParams.delete("complex"); history.replaceState(null, "", url);
  }
  async function copyLink() {
    setCopyError("");
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setCopyError("주소창의 링크를 복사해 주세요."); }
  }

  return <>
    <header className="topbar"><a className="brand" href="/" aria-label="아파트 한눈에 처음으로"><span className="brand-icon"><Building2 size={21}/></span>아파트 <strong>한눈에</strong></a><div className="header-right"><span className="connection"><i/>네이버 부동산 자료</span><button className="quiet share" onClick={copyLink}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "복사했어요" : "링크 복사"}</button></div></header>
    <main>
      <section className="intro"><div><p className="eyebrow">APARTMENT RESEARCH DESK</p><h1>궁금한 아파트,<br/><span>이름 하나로 한눈에.</span></h1><p className="lead">평수와 타입, 준공년도부터 최근 매매 실거래까지.<br/>아파트를 검색하고 필요한 정보를 확인하세요.</p></div><div className="building-art" aria-hidden="true"><span className="art-orbit"/><div className="tower back"><i/><i/><i/><i/><i/><i/></div><div className="tower front"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="art-label"><ShieldCheck size={17}/>정보를 살피는 새로운 방법</div><span className="art-tree"/></div></section>
      <section className="search-panel" aria-label="아파트 검색"><div className="search-picker" ref={picker}><label htmlFor="apartment-search">어떤 아파트를 찾으세요?</label><div className={`search-box ${open ? "focused" : ""}`}><Search size={22}/><input ref={input} id="apartment-search" role="combobox" aria-autocomplete="list" aria-controls="search-results" aria-expanded={open} aria-activedescendant={active >= 0 ? `search-result-${active}` : undefined} value={query} maxLength={50} placeholder="아파트 이름을 2글자 이상 입력하세요" autoComplete="off" onFocus={() => setOpen(true)} onChange={e => { ++selection.current; setQuery(e.target.value); setOpen(true); setApartment(null); setPrices(null); setAreaId(""); setLoading(false); setError(""); }} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={e => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Escape") setOpen(false);
        if (e.key === "ArrowDown" && items.length) { e.preventDefault(); setOpen(true); setActive(v => Math.min(v + 1, items.length - 1)); }
        if (e.key === "ArrowUp" && items.length) { e.preventDefault(); setActive(v => Math.max(v - 1, 0)); }
        if (e.key === "Enter" && open && items.length) { e.preventDefault(); void choose(items[active >= 0 ? active : 0]); }
      }}/>{searchBusy && <RefreshCw className="spin" size={17}/>}<button aria-label="검색 결과 확인" className="search-go" onClick={() => { setOpen(true); input.current?.focus(); }}><ArrowRight size={21}/></button></div>
      {open && query.trim().length >= 2 && apartment?.name !== query && <div className="suggestions" role="listbox" id="search-results" aria-label="아파트 검색 결과">{searchBusy && <p className="search-message" role="status">아파트 이름을 찾고 있습니다…</p>}{searchError && <div className="search-message error-message" role="alert"><strong>검색 자료를 가져오지 못했어요</strong><p>{searchError}</p><button className="text-button" onClick={() => setRefresh(v => v + 1)}>다시 조회</button></div>}{!searchBusy && !searchError && searched && !items.length && <p className="search-message">일치하는 아파트가 없습니다. 지역명과 아파트 이름을 함께 입력해 보세요.</p>}{items.map((item, index) => <button type="button" key={item.id} role="option" id={`search-result-${index}`} aria-selected={active === index} className={active === index ? "active" : ""} onMouseEnter={() => setActive(index)} onClick={() => void choose(item)}><Building2 size={19}/><span><strong>{item.name}</strong><small>{item.address}</small></span><ArrowRight size={16}/></button>)}</div>}</div><div className="search-hint"><MapPin size={14}/><span>같은 이름의 단지는 주소로 구분해 드립니다.</span><button className="text-button preview-button" onClick={preview}>화면 예시 보기 <ArrowRight size={14}/></button></div></section>
      {isPreview && <div className="preview-notice" role="status"><Info size={17}/><span><strong>화면 예시</strong> · 가상 단지와 가상 가격입니다. 실제 아파트 자료가 아닙니다.</span></div>}{copyError && <p role="status" className="copy-error">{copyError}</p>}
      {!apartment && !loading && !error && <section className="empty-state"><div className="empty-icon"><Building2 size={30}/></div><h2>우리 팀의 아파트 리서치, 여기서 시작해요.</h2><p>검색 결과에서 단지를 선택하면 면적별 정보를 함께 보여드립니다.</p><div className="feature-grid"><article><span>01</span><h3>단지의 기본부터</h3><p>주소, 준공년도와 세대수를<br/>한 번에 확인하세요.</p></article><article><span>02</span><h3>타입과 평수를 함께</h3><p>공급·전용면적을 ㎡와 평으로<br/>나란히 살펴보세요.</p></article><article><span>03</span><h3>매매 실거래, 그리고 시세</h3><p>최근 거래가 없으면<br/>그 아래에 시세를 표시합니다.</p></article></div><p className="verification-note"><Info size={14}/>조회한 시점의 네이버 자료를 표시합니다. 실거래 신고·취소 반영에는 시간이 걸릴 수 있습니다.</p></section>}
      {loading && !apartment && <div className="loading-panel" role="status"><RefreshCw className="spin" size={24}/>단지 정보를 확인하고 있습니다…</div>}
      {apartment && <section className="dashboard"><div className="apartment-heading"><div><span className="tag">아파트 {isPreview && "· 화면 예시"}</span><h2>{apartment.name}</h2><p><MapPin size={15}/>{apartment.address}</p></div><a className="outline-button" href={apartment.sourceUrl} target="_blank" rel="noreferrer">네이버 부동산 <ExternalLink size={14}/></a></div><dl className="facts"><div><dt>준공년도 · 사용승인 기준</dt><dd>{apartment.approvalDate ? `${apartment.approvalDate.slice(0, 4)}년` : "확인 필요"}<small>{apartment.approvalDate || "사용승인일 자료 없음"}</small></dd></div><div><dt>전체 세대수</dt><dd>{apartment.households === null ? "확인 필요" : `${apartment.households.toLocaleString()}세대`}<small>단지 전체 기준</small></dd></div><div><dt>면적 타입</dt><dd>{apartment.areas.length}개<small>공급·전용면적 함께 표시</small></dd></div></dl>
      <div className="dashboard-grid"><aside className="area-panel"><div className="section-title"><h3>평형 · 타입</h3><span>{apartment.areas.length}</span></div><p className="muted">원하는 면적을 선택하세요.</p><div className="area-list">{apartment.areas.map(item => <button className={item.id === areaId ? "area active" : "area"} onClick={() => setAreaId(item.id)} key={item.id} aria-pressed={item.id === areaId}><div><strong>{item.label}</strong><span>공급 {pyeong(item.supplyM2)}평</span></div><p>공급 {item.supplyM2}㎡ · 전용 {item.exclusiveM2}㎡</p>{item.id === areaId && <Check size={16}/>}</button>)}</div><p className="area-note">1평 ≈ 3.305785㎡<br/>타입 명칭과 전용면적을 함께 확인하세요.</p></aside><section className="price-panel" aria-label="매매 가격"><div className="price-toolbar"><div><p className="eyebrow">SALE TRANSACTIONS</p><h3>매매 실거래가</h3></div><label className="period">최근 <select aria-label="최근 거래 조회 기간" value={months} onChange={e => setMonths(Number(e.target.value))}><option value={3}>3개월</option><option value={6}>6개월</option><option value={12}>12개월</option></select><ChevronDown size={14}/></label></div>{area && <p className="area-caption">{area.label} · 전용 {area.exclusiveM2}㎡ ({pyeong(area.exclusiveM2)}평)</p>}
      {loading && <div className="loading-panel" role="status"><RefreshCw className="spin" size={23}/>매매 자료를 확인하고 있습니다…</div>}{!loading && error && <div className="error-card" role="alert"><Info size={24}/><h4>가격 조회를 완료하지 못했어요</h4><p>{error}</p><p>조회 실패 상태에서는 최근 거래 유무를 판단하지 않습니다.</p><button className="outline-button" onClick={() => setRefresh(v => v + 1)}><RefreshCw size={14}/>다시 조회</button></div>}
      {!loading && !error && prices && <>{sales.length ? <div className="latest-price"><span>가장 최근 계약금액</span><strong>{low === high ? won(high) : `${won(low)} ~ ${won(high)}`}</strong><p>{sales[0].date} 계약 · {latest.length > 1 ? `동일 날짜 ${latest.length}건` : `${sales[0].floor === null ? "층 정보 없음" : sales[0].floor + "층"}`}</p></div> : <><div className="no-sales"><span className="status-dot"/><h4>최근 매매 실거래 없음</h4><p>{monthsBefore(today, months)} ~ {today} 계약 기준</p></div><div className="market-box"><p className="market-label">대신, 현재 시세를 확인하세요</p><h4>매매 시세</h4>{prices.market ? <><strong>{won(prices.market.lowWon)} ~ {won(prices.market.highWon)}</strong><p>{prices.market.provider} · {prices.market.date} 기준</p><small>해당 면적의 시세이며 실제 계약금액과 다를 수 있습니다.</small></> : <><strong className="no-market">{prices.marketError ? "시세 조회 실패" : "시세 정보 없음"}</strong><p>{prices.marketError || "이 면적의 시세가 제공되지 않습니다."}</p></>}</div></>}
      {sales.length > 0 && <div className="trade-table-wrap"><div className="table-heading"><h4>최근 {months}개월 거래 내역</h4><span>{sales.length}건</span></div><table><thead><tr><th scope="col">계약일</th><th scope="col">층</th><th scope="col">매매금액</th></tr></thead><tbody>{sales.map((trade, index) => <tr key={`${trade.date}-${index}`}><td>{trade.date}</td><td>{trade.floor === null ? "—" : `${trade.floor}층`}</td><td>{won(trade.priceWon)}</td></tr>)}</tbody></table></div>}<div className="data-notes"><p><ShieldCheck size={14}/>취소된 거래를 제외한 매매 계약 기준입니다.</p>{prices.typeNote && <p><Info size={14}/>{prices.typeNote}</p>}<p>조회 시각 {new Date(prices.checkedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p></div></>}
      </section></div></section>}
      {!apartment && error && <div className="error-card" role="alert"><Info size={24}/><h3>단지 조회를 완료하지 못했어요</h3><p>{error}</p><button className="outline-button" onClick={() => input.current?.focus()}>아파트 다시 검색</button></div>}
      <footer><span className="footer-brand">아파트 한눈에</span><p>자료 출처 네이버 부동산 · 실거래가는 매매 기준 · 최근 기준 기본 6개월</p><span>정확한 정보로, 더 편한 리서치.</span></footer>
    </main>
  </>;
}
