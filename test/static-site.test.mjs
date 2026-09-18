import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {loadTSModule, root} from './load-ts.mjs';

const scan = loadTSModule('lib/scan.ts');
const live = loadTSModule('lib/live-scan.ts');
function fixture() {
 return {type:'domain', query:'example.com', emailSecurity:{
  spf:{record:'v=spf1 -all',lookupCount:0,chain:[],permErrors:[],warnings:[],state:'green',reason:'Hardfail'},
  dmarc:{record:'v=DMARC1; p=reject; rua=mailto:reports@example.com',tags:{p:'reject',pct:100},state:'green',reason:'Reject policy'},
  dkim:{state:'red',reason:'No common selector found'},
 }};
}
test('Next includes a request-time route; marketing has no simulated fallback',()=>{
 assert.doesNotMatch(readFileSync(join(root,'next.config.mjs'),'utf8'),/output:\s*["']export/);
 const component=readFileSync(join(root,'components/dmark-marketing.tsx'),'utf8');
 assert.match(component,/fetch\("\/api\/scan\//); assert.doesNotMatch(component,/mockScan/);
});
test('live ratings reflect records, not domain-name substrings',()=>{
 const data=fixture();let result=live.mapLookupResponse(data,'example.com',20);
 assert.equal(result.audit.grade,'A');assert.equal(result.source,'live');assert.equal(result.audit.safe,false);
 // Unprobed custom DKIM selectors cannot downgrade the SPF/DMARC rating.
 assert.equal(result.assessment.dkimState,'red');
 data.emailSecurity.dmarc.tags.p='none';result=live.mapLookupResponse(data,'example.com',20);
 assert.equal(result.audit.grade,'F');
 data.emailSecurity.dmarc.tags={p:'reject',pct:25};result=live.mapLookupResponse(data,'example.com',20);
 assert.notEqual(result.status,'PASS');
});
test('incomplete evidence suppresses the rating and avoids policy weakening advice',()=>{
 const data=fixture();data.emailSecurity.spf.chain=[{error:'blocked (private/reserved)'}];
 const result=live.mapLookupResponse(data,'example.com',20);
 assert.equal(result.audit.grade,'—');assert.equal(result.assessment.incomplete,true);
 assert.equal(scan.buildSpfFinding(result).tone,'warning');
 assert.match(scan.buildScanRemediationPlan(result).steps[2].detail,/Do not weaken/);
});
test('SPF overrun fails; malformed, mismatched or partial responses are rejected',()=>{
 const data=fixture();data.emailSecurity.spf.lookupCount=12;
 assert.equal(live.mapLookupResponse(data,'example.com',20).status,'FAIL');
 assert.throws(()=>live.mapLookupResponse({},'example.com',20));
 assert.throws(()=>live.mapLookupResponse(data,'different.com',20));
 data.errors={dns:'timed out'};assert.throws(()=>live.mapLookupResponse(data,'example.com',20));
});
test('validates domains and keeps domain names out of analytics',()=>{
 assert.equal(scan.validateScannableDomain(' https://www.KASTRO.is/mail ').domain,'kastro.is');
 assert.ok(scan.validateScannableDomain('andri@kastro.is').error);
 assert.ok(scan.validateScannableDomain('127.0.0.1').error);
 const events=loadTSModule('lib/privacy-events.ts');
 assert.deepEqual({...events.sanitizePrivacyEventProperties({source:'live_scanner',domain:'private.example'})},{source:'live_scanner'});
});
function route(fetch) {return loadTSModule('app/api/scan/route.ts', {'@/lib/scan':scan,'@/lib/live-scan':live,fetch});}
const request=(domain='example.com',origin='https://dmark.is')=>new Request('https://dmark.is/api/scan/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({domain})});
test('route forwards only a validated domain to the fixed upstream and filters unrelated data',async()=>{
 let called=false;
 const r=route(async(url,options)=>{
  called=true;assert.equal(url.origin,'https://lookup.kastro.is');assert.equal(url.searchParams.get('q'),'example.com');assert.equal(options.redirect,'error');
  return Response.json({...fixture(),whois:{raw:'not needed'}});
 });
 const response=await r.POST(request());const data=await response.json();
 assert.equal(response.status,200);assert.equal(data.source,'live');assert.equal(data.whois,undefined);assert.equal(called,true);
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('route rejects invalid input and cross-origin requests without calling upstream',async()=>{
 const r=route(()=>{throw Error('Must not fetch');});
 assert.equal((await r.POST(request('https://user@internal.example'))).status,400);
 assert.equal((await r.POST(request('example.com','https://other.example'))).status,403);
 assert.equal((await r.POST(request('x'.repeat(2000)))).status,400);
});
test('upstream throttling, network failure, and malformed data never produce a grade',async()=>{
 for (const [fetch,status] of [
  [async()=>new Response('',{status:429}),429],
  [async()=>{throw Error('network');},502],
  [async()=>Response.json({error:'no records'}),502],
  [async()=>new Response('x'.repeat(512001)),502],
 ]) {
  const response=await route(fetch).POST(request());assert.equal(response.status,status);
  const data=await response.json();assert.ok(data.code);assert.equal(data.audit,undefined);
 }
});
