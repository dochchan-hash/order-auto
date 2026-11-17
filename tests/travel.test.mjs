import test from 'node:test';
import assert from 'node:assert/strict';
import { lemonBranches } from '../lib/lemon-branches.ts';
import { isSeoulGyeonggi, durationLabel, routeLink } from '../lib/travel.ts';
import { parseDriving, drivingTime } from '../lib/driving.ts';

test('destination apartments remain restricted to Seoul/Gyeonggi despite adding branches from other regions',()=>{
  for(const address of ['서울시 강남구 언주로30길 56','서울특별시 마포구 백범로 205','경기도 화성시 효행로707번길 7']) assert.equal(isSeoulGyeonggi(address),true,address);
  for(const address of ['인천광역시 서해구 청라동','대전광역시 유성구 지족로 298','세종특별자치시 한누리대로 1','충청남도 천안시 서북구 불당34길 25-4','충청북도 청주시 흥덕구 경산로44번길 14','부산시 서울로 1','충청북도로 14','서울시아파트','화면 확인을 위한 가상 단지입니다']) assert.equal(isSeoulGyeonggi(address),false,address);
});
test('Naver recommendation is selected explicitly, milliseconds and meters are preserved',()=>{
  const raw={code:0,route:{'2,1,0,0,0,0':[{summary:{duration:1,distance:2,mainOption:2,subOption:1}}],'3,1,0,0,0,0':[{summary:{duration:6083778,distance:48491,mainOption:3,subOption:1}}]}};
  assert.deepEqual(parseDriving(raw),{durationSeconds:6083.778,distanceMeters:48491});
  assert.equal(durationLabel(parseDriving(raw).durationSeconds),'1시간 41분');
  assert.throws(()=>parseDriving({code:3,route:raw.route}));
  assert.throws(()=>parseDriving({code:0,route:{}}));
  assert.throws(()=>parseDriving({code:0,route:{'3,1,0,0,0,0':[{summary:{duration:-1,distance:10,mainOption:3,subOption:1}}]}}));
});

test('same-position response is nearby, without inventing a driving or walking duration',async()=>{
  const raw={code:1,message:'출발지와 도착지가 동일합니다. 확인 후 다시 지정해주세요.'};
  assert.deepEqual(parseDriving(raw),{durationSeconds:null,distanceMeters:null,nearby:true});
  const branch=lemonBranches.find(b=>b.id==='mapo');
  const route=await drivingTime(branch,branch.coordinates,async()=>Response.json(raw));
  assert.equal(route.nearby,true);
  assert.equal(route.durationSeconds,null);
  assert.equal(route.distanceMeters,null);
  assert.equal(route.error,undefined);
});

test('nearby coordinates keep real driving routes and do not disguise source failures',async()=>{
  const branch=lemonBranches.find(b=>b.id==='mapo');
  const goal={lat:37.54357,lng:126.95405};
  const route=await drivingTime(branch,goal,async()=>Response.json({code:0,route:{'3,1,0,0,0,0':[{summary:{duration:79947,distance:330,mainOption:3,subOption:1}}]}}));
  assert.equal(route.durationSeconds,79.947);
  assert.equal(route.distanceMeters,330);
  assert.equal(route.nearby,undefined);
  const failureGoal={...goal,lng:126.95406};
  for(const fetcher of [async()=>new Response('unavailable',{status:503}),async()=>Response.json({code:3}),async()=>Response.json({code:0,route:{}})]) {
    const failed=await drivingTime(branch,failureGoal,fetcher);
    assert.equal(failed.nearby,undefined);
    assert.equal(failed.durationSeconds,null);
    assert.ok(failed.error);
  }
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
test('Naver matches include Incheon Cheongna, Cheonan Buldang and Daejeon among 11 unique branches, excluding Cheongju',()=>{
  assert.equal(lemonBranches.length,11);
  assert.equal(new Set(lemonBranches.map(b=>b.id)).size,11);
  assert.equal(new Set(lemonBranches.map(b=>b.sourceUrl)).size,11);
  for(const branch of lemonBranches) {
    assert.ok(branch.coordinates.lat>36&&branch.coordinates.lat<38);
    assert.ok(branch.coordinates.lng>126&&branch.coordinates.lng<128);
    assert.match(branch.sourceUrl,/^https:\/\/map\.naver\.com\/p\/entry\/place\/\d+$/);
    assert.match(branch.address,/^(서울특별시|경기도|인천광역시|충청남도|대전광역시)\s/);
  }
  const eunpyeong=lemonBranches.find(b=>b.id==='eunpyeong');
  assert.ok(eunpyeong);
  assert.match(eunpyeong.sourceUrl,/2063583149$/);
  assert.match(eunpyeong.address,/은평구 통일로 1010/);
  assert.equal(lemonBranches.some(b=>b.id==='cheongju'||b.name.includes('청주')),false);
  for(const [id,placeId,city] of [['incheon','1920592177','인천광역시'],['cheonan','1514794137','천안시'],['daejeon','1629796881','대전광역시']]) {
    const branch=lemonBranches.find(b=>b.id===id);
    assert.ok(branch?.address.includes(city));
    assert.equal(branch.sourceUrl,`https://map.naver.com/p/entry/place/${placeId}`);
  }
});
test('duration and explicit driving link preserve branch to apartment direction',()=>{
  assert.equal(durationLabel(40),'1분 미만');
  assert.equal(durationLabel(600),'10분');
  assert.equal(durationLabel(3600),'1시간');
  assert.equal(durationLabel(3661),'1시간 1분');
  const branch={...lemonBranches.find(b=>b.id==='mapo'),coordinates:{lat:37.543569639742984,lng:126.95402269848931}};
  const apt={name:'테스트, A/1',coordinates:{lat:37.200851,lng:127.007246}};
  const link=routeLink(branch,apt);
  assert.ok(link.startsWith('https://map.naver.com/p/directions/3zgELN,2AL5kY,'));
  assert.ok(link.includes('/3ziTec,2AwHLM,'));
  assert.ok(link.endsWith('/-/car'));
  assert.ok(link.includes(encodeURIComponent(apt.name)));
  assert.equal(routeLink(branch,apt,'walk'),link.replace(/\/car$/,'/walk'));
  assert.equal(routeLink(branch,{...apt,coordinates:null}),null);
  assert.equal(routeLink(branch,{...apt,coordinates:null},'walk'),null);
});
