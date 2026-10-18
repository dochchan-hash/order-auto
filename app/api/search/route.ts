import { searchApartments, SourceError } from "@/lib/naver";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 50 || /[\u0000-\u001f]/.test(q)) return Response.json({ code: "INVALID_QUERY", message: "아파트 이름을 2~50자로 입력해 주세요." }, { status: 400 });
  try { return Response.json({ items: await searchApartments(q), checkedAt: new Date().toISOString() }); }
  catch (error) {
    if (error instanceof SourceError) return Response.json({ code: error.code, message: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return Response.json({ code: "SERVER_ERROR", message: "검색을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
