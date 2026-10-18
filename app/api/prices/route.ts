// Live price mapping must be verified against a successful source response before enabling it.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (!/^\d{1,12}$/.test(params.get("id") ?? "") || !/^\d{1,12}$/.test(params.get("area") ?? "")) {
    return Response.json({ code: "INVALID_ID", message: "단지와 면적을 다시 선택해 주세요." }, { status: 400 });
  }
  return Response.json({ code: "SOURCE_UNVERIFIED", message: "네이버 가격 연동 검증이 완료되지 않았습니다. 실제 거래 유무와 시세를 아직 확인할 수 없습니다." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
