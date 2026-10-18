import { loadPrices, SourceError } from "@/lib/naver";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (!/^\d{1,12}$/.test(params.get("id") ?? "") || !/^\d{1,12}$/.test(params.get("area") ?? "")) {
    return Response.json({ code: "INVALID_ID", message: "단지와 면적을 다시 선택해 주세요." }, { status: 400 });
  }
  try { return Response.json(await loadPrices(params.get("id")!, params.get("area")!)); }
  catch (error) {
    if (error instanceof SourceError) return Response.json({ code: error.code, message: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return Response.json({ code: "SERVER_ERROR", message: "매매 가격을 확인하지 못했습니다." }, { status: 500 });
  }
}
