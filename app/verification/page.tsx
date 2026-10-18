export default function Verification() {
  return <main style={{paddingTop:36,maxWidth:1000}}>
    <a href="/" className="outline-button">← 프로그램 열기</a>
    <h1 style={{fontSize:28,marginTop:28}}>개발 화면과 검증 결과</h1>
    <div className="error-card"><strong>개발 중 · 실사용 정상 구동 확인 전</strong><p>화면 표시와 내부 규칙 검사 7개, 타입 검사, 배포용 빌드가 통과했습니다. 네이버 실제 자료 조회는 실패했습니다. 실제 매매·시세 연동은 미완료이며 팀 공유용으로 완료되지 않았습니다.</p><p>아래 예시 화면은 가상 자료입니다. 실제 아파트 가격을 증명하지 않습니다.</p></div>
    <h2 style={{fontSize:19,marginTop:30}}>화면 예시</h2><p>아파트 검색과 기본 정보 화면 구성입니다.</p><img src="/proof/preview-home.png" width="1157" height="729" alt="가상 자료임을 밝힌 아파트 한눈에 화면 예시" style={{width:"100%",height:"auto",border:"1px solid #e2e8e0",borderRadius:10}}/>
    <h2 style={{fontSize:19,marginTop:30}}>최근 거래 없음 → 시세 표시</h2><p>가상 자료로 동작을 확인했습니다. 제공기관과 기준일을 표시합니다.</p><img src="/proof/preview-market.png" width="1157" height="729" alt="예시 자료의 최근 매매 실거래 없음 표시 아래에 시세와 기준일이 표시된 화면" style={{width:"100%",height:"auto",border:"1px solid #e2e8e0",borderRadius:10}}/>
    <h2 style={{fontSize:19,marginTop:30}}>실제 조회 검증 결과</h2><p>아름마을 검색은 네이버 연결 단계에서 실패했습니다. 실패를 거래 없음으로 바꾸지 않습니다.</p><img src="/proof/live-search-failure.png" width="1157" height="729" alt="실제 검색이 네이버 연결 단계에서 실패했음을 알리는 화면" style={{width:"100%",height:"auto",border:"1px solid #e2e8e0",borderRadius:10}}/>
    <p style={{padding:"24px 0",fontSize:12,color:"#788781"}}>2026년 10월 19일 검증 · 아파트 한눈에 개발 검토 자료</p>
  </main>;
}
