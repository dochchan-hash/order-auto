import { lemonBranches } from "@/lib/lemon-branches";

export default function Verification() {
  return <main style={{paddingTop:36,maxWidth:1000}}>
    <a href="/" className="outline-button">← 프로그램 열기</a>
    <h1 style={{fontSize:28,marginTop:28}}>실제 자료 조회 · 구동 확인</h1>
    <p>2026년 10월 19일 네이버 실제 자료로 검색 → 단지 → 평형 → 매매 실거래와 기관 시세 조회를 확인했습니다. 아래는 가상 예시가 아닌 웹앱의 실제 조회 화면입니다. 가격은 캡처 당시 자료입니다.</p>
    <h2 style={{fontSize:19,marginTop:30}}>실제 단지와 매매 실거래</h2>
    <p>아름마을신한미지엔 · 2006년 사용승인 · 708세대 · 4개 평형. 94형의 최근 매매는 2026년 10월 3일, 5층, 2억 7,000만원이며 네이버 원문과 대조했습니다.</p>
    <img src="/proof/live-sale.png" alt="아름마을신한미지엔의 실제 면적과 최근 매매 거래 내역이 표시된 구동 화면" style={{width:"100%",height:"auto",border:"1px solid #e2e8e0",borderRadius:10}}/>
    <h2 style={{fontSize:19,marginTop:30}}>최근 거래 없음 → 시세 표시</h2>
    <p>타워팰리스1차 327형 · 최근 3개월 거래 없음. 아래에 한국부동산원 매매 시세 77억~83억원, 2026년 10월 12일 기준을 표시합니다. 조회 실패는 거래 없음으로 처리하지 않습니다.</p>
    <img src="/proof/live-market.png" alt="실제 타워팰리스 평형에서 최근 매매 실거래 없음 아래 기관 시세와 기준일이 표시된 화면" style={{width:"100%",height:"auto",border:"1px solid #e2e8e0",borderRadius:10}}/>
    <h2 style={{fontSize:19,marginTop:30}}>레몬하우스 서울·경기 지점 차량 이동시간</h2>
    <p>네이버 검색·플레이스의 지점명·주소·위치를 대조한 {lemonBranches.length}개 지점이며 인천은 제외합니다. 지점에서 아파트까지의 차량 경로를 조회합니다. 스위치를 켜면 소요시간·거리·조회 시각을 표시하고, 끄면 숨깁니다. 각 지점의 네이버 등록 정보를 아래에서 확인할 수 있습니다.</p>
    <ul style={{paddingLeft:22,lineHeight:2.1}}>{lemonBranches.map(branch => <li key={branch.id}><a href={branch.sourceUrl} target="_blank" rel="noreferrer" style={{textDecoration:"underline"}}>레몬하우스 {branch.name}</a><span style={{fontSize:12,color:"#788781"}}> · {branch.address}</span></li>)}</ul>
    <p style={{padding:"24px 0",fontSize:12,color:"#788781"}}>출처 네이버 부동산·네이버 지도·네이버 플레이스 · 신고 반영과 교통상황에 따라 자료가 달라질 수 있습니다.</p>
  </main>;
}
