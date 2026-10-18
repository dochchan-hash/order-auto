export type Apartment = {
  id: string;
  name: string;
  address: string;
  approvalDate: string | null;
  households: number | null;
  sourceUrl: string;
  areas: Area[];
};
export type Area = {
  id: string;
  label: string;
  supplyM2: number;
  exclusiveM2: number;
};
export type SearchItem = Pick<Apartment, "id" | "name" | "address">;
export type Trade = {
  date: string;
  priceWon: number;
  floor: number | null;
  cancelled: boolean;
};
export type MarketPrice = {
  lowWon: number;
  highWon: number;
  date: string;
  provider: string;
};
export type Prices = {
  trades: Trade[];
  market: MarketPrice | null;
  checkedAt: string;
  sourceUrl: string;
  marketError?: string;
  typeNote?: string;
};
export type ApiError = { message: string; code: string };

export function pyeong(m2: number) {
  return (m2 / 3.305785).toFixed(1);
}

export function won(value: number) {
  const man = Math.round(value / 10000);
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  return [eok ? `${eok.toLocaleString("ko-KR")}억` : "", rest ? `${rest.toLocaleString("ko-KR")}만` : ""].filter(Boolean).join(" ") + "원";
}

export function koreaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function monthsBefore(today: string, months: number) {
  const [year, month, day] = today.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 - months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}

export function recentSales(trades: Trade[], months: number, today = koreaToday()) {
  const since = monthsBefore(today, months);
  return trades.filter(t => !t.cancelled && t.priceWon > 0 && t.date >= since && t.date <= today)
    .toSorted((a, b) => b.date.localeCompare(a.date) || b.priceWon - a.priceWon);
}
