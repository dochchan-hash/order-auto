import test from 'node:test';
import assert from 'node:assert/strict';
import { formatArea, monthsBefore, recentSales, koreaToday, pyeong, won } from '../lib/apartment.ts';
import { naverGet, parseSearch, parseApartment, parseTrades, parseMarket, dateValue, SourceError } from '../lib/naver.ts';
import { maskToken, unmaskToken } from '../lib/naver-session.ts';

async function withSession(respond) {
  const encoded = await maskToken('public-guest-test-token');
  const flight = JSON.stringify([1, JSON.stringify({maskedAttestToken:encoded})]);
  return async (url, options) => String(url) === 'https://fin.land.naver.com/'
    ? new Response(`<script>self.__next_f.push(${flight})</script>`, {headers:{'set-cookie':'guest=test; Path=/; HttpOnly'}})
    : respond(url, options);
}

test('calendar cutoff clamps month ends, with Korea timezone', () => {
  assert.equal(monthsBefore('2024-08-31', 6), '2024-02-29');
  assert.equal(monthsBefore('2026-03-31', 1), '2026-02-28');
  assert.equal(koreaToday(new Date('2026-10-18T15:00:00Z')), '2026-10-19');
});
test('sales include cutoff, exclude cancellations, future and old contracts, never mutate source', () => {
  const trades = [
    { date:'2026-04-19', priceWon:500000000, floor:3, cancelled:false },
    { date:'2026-04-18', priceWon:400000000, floor:2, cancelled:false },
    { date:'2026-10-19', priceWon:900000000, floor:9, cancelled:true },
    { date:'2026-10-20', priceWon:800000000, floor:8, cancelled:false },
    { date:'2026-10-10', priceWon:700000000, floor:7, cancelled:false },
  ];
  const before = structuredClone(trades);
  assert.deepEqual(recentSales(trades,6,'2026-10-19').map(t=>t.date), ['2026-10-10','2026-04-19']);
  assert.deepEqual(trades,before);
  assert.equal(recentSales(trades.slice(1,4),6,'2026-10-19').length,0);
});
test('money uses won explicitly; conversion is rounded for display only', () => {
  assert.equal(won(580000000),'5억 8,000만원');
  assert.equal(won(700000000),'7억원');
  assert.equal(pyeong(84.97),'25.7');
});
test('area unit display rounds pyeong and preserves supplied square metres', () => {
  assert.equal(formatArea(94.95, 'pyeong'), '28.7평');
  assert.equal(formatArea(69.93, 'pyeong'), '21.2평');
  assert.equal(formatArea(94.95, 'm2'), '94.95m²');
  assert.equal(formatArea(113.1, 'm2'), '113.1m²');
});
test('unknown search shape is an error, only actual empty list is no matches', () => {
  assert.deepEqual(parseSearch({list:[]}),[]);
  assert.throws(()=>parseSearch({error:'blocked'}), SourceError);
  assert.throws(()=>parseSearch({list:[{complexNumber:1}]}), SourceError);
  assert.deepEqual(parseSearch({list:[{complexNumber:42,complexName:'검증 단지',legalDivisionName:'검증 주소',type:'A01'},{complexNumber:43,complexName:'오피스텔',legalDivisionName:'검증 주소',type:'A02'}]}),[{id:'42',name:'검증 단지',address:'검증 주소'}]);
});
test('successful requests are deduplicated and cached', async () => {
  let count=0;
  const fake=await withSession(async (url, options)=>{
    count++;
    assert.equal(options.redirect,'manual');
    assert.equal(options.headers.Cookie,'guest=test');
    assert.match(await unmaskToken(options.headers['x-attest']),/^\d+\.public-guest-test-token$/);
    return Response.json({isSuccess:true,result:{list:[]}});
  });
  const args=['/test-success',{test:'1'},fake];
  assert.deepEqual(await Promise.all([naverGet(...args),naverGet(...args)]),[{list:[]},{list:[]}]);
  await naverGet(...args);
  assert.equal(count,1);
});
test('HTML, bad JSON and network failures cannot become no sales', async () => {
  await assert.rejects(naverGet('/test-html',{},await withSession(async()=>new Response('<html>blocked</html>'))),{code:'SOURCE_FORMAT'});
  await assert.rejects(naverGet('/test-json',{},await withSession(async()=>Response.json({error:'denied'}))),{code:'SOURCE_FORMAT'});
  await assert.rejects(naverGet('/test-unsuccessful',{},await withSession(async()=>Response.json({isSuccess:false,result:[]}))),{code:'SOURCE_FORMAT'});
  await assert.rejects(naverGet('/test-network',{},async()=>{throw new Error('offline')}),{code:'SOURCE_UNAVAILABLE'});
});
test('actual Naver field names, date validation and won values are preserved', () => {
  const apt = parseApartment('23758',{name:'아름마을신한미지엔',type:'A01',address:{city:'경기도',division:'화성시 병점구',roadName:'효행로707번길 7'},coordinates:{xCoordinate:127.007246,yCoordinate:37.200851},useApprovalDate:'20060929',totalHouseholdNumber:708},[{number:1,name:'94',supplyArea:94.95,exclusiveArea:69.93}]);
  assert.equal(apt.approvalDate,'2006-09-29');
  assert.equal(apt.areas[0].exclusiveM2,69.93);
  assert.equal(apt.address,'경기도 화성시 병점구 효행로707번길 7');
  assert.deepEqual(apt.coordinates,{lat:37.200851,lng:127.007246});
  const trades = parseTrades([{tradeDate:'2026-10-03',floor:5,dealPrice:270000000,isDelete:false},{tradeDate:'2026-09-29',floor:4,dealPrice:250000000,isDelete:true}]);
  assert.equal(won(trades[0].priceWon),'2억 7,000만원');
  assert.equal(recentSales(trades,6,'2026-10-19').length,1);
  assert.equal(dateValue('20260230'),null);
  assert.throws(()=>parseTrades([{tradeDate:'2026-10-03',dealPrice:270000000}]),SourceError);
  assert.throws(()=>parseApartment('1',{name:'bad',type:'A01'},[{number:1,name:'bad',supplyArea:-1,exclusiveArea:0}]),SourceError);
});
test('institution sale market price is distinct from missing or malformed data', () => {
  assert.deepEqual(parseMarket([{cp:'kbstar',baseDate:'2026-10-12',dealPriceRange:{floor:230000000,ceiling:270000000}},{cp:'kab',baseDate:'2026-10-12',dealPriceRange:{floor:235000000,ceiling:265000000}}]),{lowWon:235000000,highWon:265000000,date:'2026-10-12',provider:'한국부동산원'});
  assert.equal(parseMarket([]),null);
  assert.throws(()=>parseMarket({error:'blocked'}),SourceError);
  assert.throws(()=>parseMarket([{cp:'kab',baseDate:'2026-10-12',dealPriceRange:{floor:265000000,ceiling:235000000}}]),SourceError);
});
test('429 creates a cooldown and cannot produce an empty success', async () => {
  await assert.rejects(naverGet('/test-limit',{},await withSession(async()=>Response.json({detailCode:'TOO_MANY_REQUESTS'},{status:429,headers:{'retry-after':'60'}}))),{code:'SOURCE_LIMITED'});
  let contacted=false;
  await assert.rejects(naverGet('/test-limit-again',{},async()=>{contacted=true;return Response.json({result:[]})}),{code:'SOURCE_LIMITED'});
  assert.equal(contacted,false);
});
