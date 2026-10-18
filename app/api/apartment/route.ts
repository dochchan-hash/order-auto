import { loadApartment, SourceError } from "@/lib/naver";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^\d{1,12}$/.test(id)) return Response.json({ code: "INVALID_ID", message: "올바른 아파트를 선택해 주세요." }, { status: 400 });
  try { return Response.json(await loadApartment(id)); }
  catch (error) {
    if (error instanceof SourceError) return Response.json({ code: error.code, message: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return Response.json({ code: "SERVER_ERROR", message: "단지 정보를 확인하지 못했습니다." }, { status: 500 });
  }
}
