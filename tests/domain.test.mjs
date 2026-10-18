import test from 'node:test';
import assert from 'node:assert/strict';
import { monthsBefore, recentSales, koreaToday, pyeong, won } from '../lib/apartment.ts';
import { naverGet, parseSearch, SourceError } from '../lib/naver.ts';

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
test('unknown search shape is an error, only actual empty list is no matches', () => {
  assert.deepEqual(parseSearch({list:[]}),[]);
  assert.throws(()=>parseSearch({error:'blocked'}), SourceError);
  assert.throws(()=>parseSearch({list:[{complexNumber:1}]}), SourceError);
  assert.deepEqual(parseSearch({list:[{complexNumber:42,complexName:'검증 단지',legalDivisionName:'검증 주소'}]}),[{id:'42',name:'검증 단지',address:'검증 주소'}]);
});
test('successful requests are deduplicated and cached', async () => {
  let count=0;
  const fake=async()=>{count++;return Response.json({result:{list:[]}})};
  const args=['/test-success',{test:'1'},fake];
  assert.deepEqual(await Promise.all([naverGet(...args),naverGet(...args)]),[{list:[]},{list:[]}]);
  await naverGet(...args);
  assert.equal(count,1);
});
test('HTML, bad JSON and network failures cannot become no sales', async () => {
  await assert.rejects(naverGet('/test-html',{},async()=>new Response('<html>blocked</html>')),{code:'SOURCE_FORMAT'});
  await assert.rejects(naverGet('/test-json',{},async()=>Response.json({error:'denied'})),{code:'SOURCE_FORMAT'});
  await assert.rejects(naverGet('/test-network',{},async()=>{throw new Error('offline')}),{code:'SOURCE_UNAVAILABLE'});
});
test('429 creates a cooldown and cannot produce an empty success', async () => {
  await assert.rejects(naverGet('/test-limit',{},async()=>Response.json({detailCode:'TOO_MANY_REQUESTS'},{status:429,headers:{'retry-after':'60'}})),{code:'SOURCE_LIMITED'});
  let contacted=false;
  await assert.rejects(naverGet('/test-limit-again',{},async()=>{contacted=true;return Response.json({result:[]})}),{code:'SOURCE_LIMITED'});
  assert.equal(contacted,false);
});
