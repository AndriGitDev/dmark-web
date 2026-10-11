import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = path => readFileSync(join(root, '.next/server/app', path));
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name.toLowerCase(), decode(value)]));
function pngDimensions(data) {
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}
for (const locale of ['is', 'en']) {
  const html = read(`${locale}.html`).toString();
  const tags = [...html.matchAll(/<(?:meta|link)\b[^>]*>/g)].map(([tag]) => attrs(tag));
  const meta = name => tags.find(tag => tag.name === name || tag.property === name)?.content;
  assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
  assert.equal(tags.find(tag => tag.rel === 'canonical')?.href, `https://dmark.is/${locale}/`);
  for (const [language, target] of [['is', 'is'], ['en', 'en'], ['x-default', 'is']])
    assert.equal(tags.find(tag => tag.hreflang === language)?.href, `https://dmark.is/${target}/`);
  assert.equal(meta('og:url'), `https://dmark.is/${locale}/`);
  assert.equal(meta('og:image'), `https://dmark.is/social/${locale}/`);
  assert.equal(meta('twitter:image'), meta('og:image'));
  assert.equal(meta('twitter:card'), 'summary_large_image');
  assert.equal(meta('og:image:width'), '1200');
  assert.equal(meta('og:image:height'), '630');
  assert.ok(meta('og:image:alt'));
  assert.ok(meta('description').length > 50);
  assert.equal(meta('robots'), 'index, follow');
  assert.equal([...html.matchAll(/<h1\b[^>]*>/g)].length, 1);
  const jsonld = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(jsonld.length, 1);
  const graph = JSON.parse(jsonld[0][1])['@graph'];
  const faq = graph.find(node => node['@type'] === 'FAQPage');
  const visible = decode(html.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ''));
  for (const question of faq.mainEntity) {
    assert.ok(visible.includes(question.name), `Missing visible question: ${question.name}`);
    assert.ok(visible.includes(question.acceptedAnswer.text), `Missing visible answer: ${question.name}`);
  }
  assert.ok(html.includes('href="#workspace"'));
  assert.ok(html.includes('id="add-domain-hint"'));
  assert.ok(html.includes('aria-describedby="add-domain-hint"'));
  assert.ok(html.includes('id="account-dialog-description"'));
  assert.deepEqual(pngDimensions(read(`social/${locale}.body`)), [1200, 630]);
  const imageHeaders = JSON.parse(read(`social/${locale}.meta`)).headers;
  assert.match(imageHeaders['content-type'], /image\/png/);
}
const sitemap = read('sitemap.xml.body').toString();
for (const locale of ['is', 'en']) {
  assert.ok(sitemap.includes(`<loc>https://dmark.is/${locale}/</loc>`));
  assert.ok(sitemap.includes(`hreflang="${locale}"`));
}
assert.ok(sitemap.includes('hreflang="x-default"'));
const robots = read('robots.txt.body').toString();
assert.ok(robots.includes('Allow: /'));
assert.ok(robots.includes('Disallow: /api/'));
assert.ok(robots.includes('Sitemap: https://dmark.is/sitemap.xml'));
const manifest = JSON.parse(read('manifest.webmanifest.body'));
for (const icon of manifest.icons) {
  const size = Number(icon.sizes.split('x')[0]);
  assert.deepEqual(pngDimensions(read(`icons/${size}.body`)), [size, size]);
}
assert.deepEqual(pngDimensions(read('icons/180.body')), [180, 180]);
const headers = JSON.parse(readFileSync(join(root, '.next/routes-manifest.json'))).headers;
assert.ok(headers.some(rule => rule.source === '/api/:path*' && rule.headers.some(h => h.key === 'X-Robots-Tag' && h.value.includes('noindex'))));
console.log('Launch checks passed: both rendered locales, canonical/hreflang, social metadata and PNGs, visible schema/FAQ agreement, one H1, form descriptions, sitemap, robots, app icons and API noindex headers.');

const css = readFileSync(join(root, 'app/globals.css'), 'utf8');
const colors = Object.fromEntries([...css.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, value]) => [name, value]));
function luminance(hex) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((x,y) => y-x); return (values[0]+0.05)/(values[1]+0.05); }
for (const [front, back] of [['ink','paper'], ['ink','dark'], ['muted','surface'], ['dim','paper'], ['dim','surface'], ['paper','lime'], ['green','paper'], ['red','paper']])
  assert.ok(contrast(colors[front],colors[back]) >= 4.5, `Text contrast: ${front} on ${back}`);
const border = css.match(/\.account-dialog input \{ border-color: (#[0-9a-f]{6});/i)[1];
assert.ok(contrast(border, colors.surface) >= 3, 'Input boundary contrast');
assert.ok(contrast(colors.lime, colors.paper) >= 3, 'Focus contrast');
console.log('Contrast checks passed for declared text, controls and focus colors.');
