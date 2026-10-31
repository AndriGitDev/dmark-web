import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTSModule } from './load-ts.mjs';
const site = loadTSModule('lib/site.ts');
const { contentForLocale, publicStructuredData } = loadTSModule('lib/public-content.ts', { './site': site });
for (const locale of ['is', 'en']) {
  test(`${locale}: public schema uses the same FAQ answers as visible content and declares a free app honestly`, () => {
    const content = contentForLocale(locale);
    const graph = publicStructuredData(locale)['@graph'];
    const faq = graph.find(node => node['@type'] === 'FAQPage');
    assert.equal(faq.inLanguage, locale);
    assert.equal(faq.mainEntity.length, content.faqs.length);
    content.faqs.forEach((item, i) => {
      assert.equal(faq.mainEntity[i].name, item.question);
      assert.equal(faq.mainEntity[i].acceptedAnswer.text, item.answer);
    });
    const app = graph.find(node => node['@type'] === 'WebApplication');
    assert.equal(app.url, `https://www.dmark.is/${locale}/`);
    assert.equal(app.description, content.intro);
    assert.equal(app.isAccessibleForFree, true);
    assert.equal(app.name, 'dmark');
    assert.deepEqual(Array.from(app.codeRepository), ['https://github.com/AndriGitDev/dmark-web', 'https://github.com/AndriGitDev/dmark-app']);
    assert.equal(app.license, 'https://github.com/AndriGitDev/dmark-web/blob/main/LICENSE');
    assert.equal(app.aggregateRating, undefined);
    assert.equal(app.review, undefined);
  });
}
test('unrecognised content locales fall back to Icelandic', () => {
  assert.equal(contentForLocale('xx').title, contentForLocale('is').title);
});
