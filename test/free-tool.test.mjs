import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTSModule } from './load-ts.mjs';

const scan = loadTSModule('lib/scan.ts');
const records = loadTSModule('lib/authentication-records.ts');
const workspace = loadTSModule('lib/domain-workspace.ts', { './scan': scan, './authentication-records': records });

test('saved domains normalize, deduplicate and discard untrusted fields and checklist IDs', () => {
  const result = workspace.parseWorkspace(JSON.stringify([
    {domain:'Kastro.is',completed:['spf','invented'],token:'never store'},
    {domain:'https://www.KASTRO.is/',completed:['dkim','dkim']},
    {domain:'person@company.is',completed:['dmarc']},
    {domain:'example.com',completed:['bimi','spf']},
  ]));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    {domain:'kastro.is',completed:['dkim']},
    {domain:'example.com',completed:['spf','bimi']},
  ]);
  for (const raw of [null,'invalid','{}','"domains"','x'.repeat(33000)]) assert.equal(workspace.parseWorkspace(raw).length,0);
});

test('selectors cannot introduce URLs, email addresses or DNS search paths', () => {
  for (const value of ['selector1','google','s2026.mail','selector_1']) assert.equal(records.validSelector(value),true,value);
  for (const value of ['','../../secret','https://host','s@host','selector.','s'.repeat(64),'a b']) assert.equal(records.validSelector(value),false,value);
});

test('DKIM and BIMI queries use only fixed domain-derived names and join split TXT chunks', async () => {
  const names=[];
  const result=await records.lookupAuthenticationRecords('example.com','selector1', async name=> {
    names.push(name);
    return name.includes('_bimi') ? [['v=BIMI1; l=https://example.com/logo.svg;',' a=https://example.com/cert.pem']]
      : [['v=DKIM1; k=rsa; p=','MIIBexample']];
  });
  assert.deepEqual(names.sort(),['default._bimi.example.com','selector1._domainkey.example.com']);
  assert.equal(result.bimi.state,'published');assert.equal(result.dkim.state,'published');
});

test('DNS failures remain unknown, while revoked keys and duplicate records are flagged', async () => {
  const failed=await records.lookupAuthenticationRecords('example.com','',async()=>{throw Object.assign(new Error('timeout'),{code:'ETIMEOUT'});});
  assert.equal(failed.bimi.state,'error');assert.equal(failed.dkim,undefined);
  const absent=await records.lookupAuthenticationRecords('example.com','',async()=>{throw Object.assign(new Error('missing'),{code:'ENODATA'});});
  assert.equal(absent.bimi.state,'missing');
  const revoked=await records.lookupAuthenticationRecords('example.com','s',async name=>name.includes('_bimi')?[['v=BIMI1; l=https://example.com/logo.svg'],['v=BIMI1; l=https://example.com/other.svg']]:[['v=DKIM1; p=']]);
  assert.equal(revoked.bimi.state,'invalid');assert.equal(revoked.dkim.state,'invalid');
});


test('cookie workspace preserves selectors and tasks without scan data', () => {
 const domains=[{domain:'example.com',completed:['spf','bimi'],selector:'selector1'}];
 const cookie=workspace.workspaceCookie+'='+workspace.encodeWorkspace(domains);
 assert.deepEqual(JSON.parse(JSON.stringify(workspace.readWorkspaceCookie('unrelated=1; '+cookie))),domains);
 for(const value of ['%ZZ',encodeURIComponent('{"v":99,"d":[]}'),encodeURIComponent('{"v":2,"d":[["example.com",99,"s"]]}')])assert.equal(workspace.readWorkspaceCookie(workspace.workspaceCookie+'='+value).length,0);
 assert.throws(()=>workspace.encodeWorkspace(Array.from({length:21},(_,i)=>({domain:`d${i}.com`,completed:[]}))),/COOKIE_LIMIT/);
 assert.throws(()=>workspace.encodeWorkspace(Array.from({length:20},(_,i)=>({domain:`d${i}.${'a'.repeat(60)}.${'b'.repeat(60)}.com`,completed:[],selector:'s'.repeat(60)}))),/COOKIE_LIMIT/);
});

