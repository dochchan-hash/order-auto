import test from 'node:test';
import assert from 'node:assert/strict';
import { lemonBranches } from '../lib/lemon-branches.ts';
import { isSeoulGyeonggi, durationLabel, carRouteLink } from '../lib/travel.ts';
import { parseDriving, drivingTime } from '../lib/driving.ts';

test('feature is restricted to Seoul and Gyeonggi, never a similarly named street',()=>{
  for(const address of ['서울시 강남구 언주로30길 56','서울특별시 마포구 백범로 205','경기도 화성시 효행로707번길 7']) assert.equal(isSeoulGyeonggi(address),true);
  for(const address of ['인천광역시 서구 청라동','부산시 서울로 1','서울시아파트','화면 확인을 위한 가상 단지입니다']) assert.equal(isSeoulGyeonggi(address),false);
});
test('Naver recommendation is selected explicitly, milliseconds and meters are preserved',()=>{
  const raw={code:0,route:{'2,1,0,0,0,0':[{summary:{duration:1,distance:2,mainOption:2,subOption:1}}],'3,1,0,0,0,0':[{summary:{duration:6083778,distance:48491,mainOption:3,subOption:1}}]}};
  assert.deepEqual(parseDriving(raw),{durationSeconds:6083.778,distanceMeters:48491});
  assert.equal(durationLabel(parseDriving(raw).durationSeconds),'1시간 41분');
  assert.throws(()=>parseDriving({code:1,route:raw.route}));
  assert.throws(()=>parseDriving({code:0,route:{}}));
  assert.throws(()=>parseDriving({code:0,route:{'3,1,0,0,0,0':[{summary:{duration:-1,distance:10,mainOption:3,subOption:1}}]}}));
});
test('successful driving requests deduplicate and cache actual fetch time; failures never become zero minutes',async()=>{
  let calls=0;
  const branch=lemonBranches[0], goal={lat:37.3,lng:127.1};
  const fetcher=async(url,options)=>{
    calls++; assert.equal(url.searchParams.get('start'),`${branch.coordinates.lng},${branch.coordinates.lat}`);
    assert.equal(url.searchParams.get('goal'),'127.1,37.3'); assert.equal(options.redirect,'manual');
    return Response.json({code:0,route:{'3,1,0,0,0,0':[{summary:{duration:900000,distance:12000,mainOption:3,subOption:1}}]}});
  };
  const [first,second]=await Promise.all([drivingTime(branch,goal,fetcher),drivingTime(branch,goal,fetcher)]);
  assert.equal(first.durationSeconds,900); assert.deepEqual(first,second);
  assert.deepEqual(await drivingTime(branch,goal,fetcher),first); assert.equal(calls,1);
  const failed=await drivingTime(branch,{lat:37.4,lng:127.2},async()=>new Response('<html>error</html>',{status:503}));
  assert.equal(failed.durationSeconds,null); assert.equal(failed.distanceMeters,null); assert.match(failed.error,/가져오지/);
});
test('Naver Seoul/Gyeonggi matches have eight unique branches including Eunpyeong and no Incheon',()=>{
  assert.equal(lemonBranches.length,8);
  assert.equal(new Set(lemonBranches.map(b=>b.id)).size,8);
  assert.equal(new Set(lemonBranches.map(b=>b.sourceUrl)).size,8);
  for(const branch of lemonBranches) {
    assert.ok(branch.coordinates.lat>37&&branch.coordinates.lat<38);
    assert.ok(branch.coordinates.lng>126&&branch.coordinates.lng<128);
    assert.match(branch.sourceUrl,/^https:\/\/map\.naver\.com\/p\/entry\/place\/\d+$/);
    assert.equal(isSeoulGyeonggi(branch.address),true);
  }
  const eunpyeong=lemonBranches.find(b=>b.id==='eunpyeong');
  assert.ok(eunpyeong);
  assert.match(eunpyeong.sourceUrl,/2063583149$/);
  assert.match(eunpyeong.address,/은평구 통일로 1010/);
});
test('duration and explicit driving link preserve branch to apartment direction',()=>{
  assert.equal(durationLabel(40),'1분 미만');
  assert.equal(durationLabel(600),'10분');
  assert.equal(durationLabel(3600),'1시간');
  assert.equal(durationLabel(3661),'1시간 1분');
  const branch={...lemonBranches.find(b=>b.id==='mapo'),coordinates:{lat:37.543569639742984,lng:126.95402269848931}};
  const apt={name:'테스트, A/1',coordinates:{lat:37.200851,lng:127.007246}};
  const link=carRouteLink(branch,apt);
  assert.ok(link.startsWith('https://map.naver.com/p/directions/3zgELN,2AL5kY,'));
  assert.ok(link.includes('/3ziTec,2AwHLM,'));
  assert.ok(link.endsWith('/-/car'));
  assert.ok(link.includes(encodeURIComponent(apt.name)));
  assert.equal(carRouteLink(branch,{...apt,coordinates:null}),null);
});
