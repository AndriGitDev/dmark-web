import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTSModule} from './load-ts.mjs';
const token='a'.repeat(43),csrf='b'.repeat(43);
const url='https://dmark.is/api/account/confirm/?locale=en&token='+token;
function route(proxy){return loadTSModule('app/api/account/confirm/route.ts',{'@/lib/account-proxy':{proxyAccount:proxy,sameOrigin:loadTSModule('lib/account-proxy.ts').sameOrigin}})}
test('login link GET only prepares confirmation and never consumes a token',async()=>{
 const calls=[];const handler=route(async(_request,action)=>{calls.push(action);return Response.json({csrf},{headers:{'Set-Cookie':'dmark_account=session; HttpOnly'}})});
 const result=await handler.GET(new Request(url));assert.equal(result.status,200);assert.deepEqual(calls,['me']);assert.match(await result.text(),/method="post"/);assert.equal(result.headers.get('referrer-policy'),'no-referrer');assert.match(result.headers.get('content-security-policy'),/form-action 'self'/);
});
test('login confirmation POST consumes the token only with valid origin and CSRF',async()=>{
 let calls=0;const handler=route(async(_request,action,options)=>{calls++;assert.equal(action,'finish');assert.equal(options.csrf,csrf);assert.equal(JSON.parse(options.body).token,token);return Response.json({authenticated:true})});
 const request=origin=>new Request(url,{method:'POST',headers:{origin},body:new URLSearchParams({token,csrf,locale:'en'})});
 assert.equal((await handler.POST(request('https://evil.example'))).status,403);assert.equal(calls,0);
 const result=await handler.POST(request('https://dmark.is'));assert.equal(result.status,303);assert.equal(result.headers.get('location'),'/en/?account=connected');assert.equal(calls,1);
});
