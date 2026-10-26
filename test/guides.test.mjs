import test from "node:test";
import assert from "node:assert/strict";
import { loadTSModule } from "./load-ts.mjs";

const site = loadTSModule("lib/site.ts");
const g = loadTSModule("lib/guides.ts", { "./site": site });

test("both languages publish the same guides with unique slugs and valid links", () => {
  const ids = (l) => g.guides[l].map((x) => x.id).sort();
  assert.deepEqual(ids("is"), ids("en"));
  for (const l of ["is", "en"]) {
    const slugs = g.guides[l].map((x) => x.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const guide of g.guides[l]) {
      assert.match(guide.slug, /^[a-z0-9-]+$/);
      for (const id of guide.related) assert.ok(g.guides[l].some((x) => x.id === id), `${guide.id} -> ${id}`);
      assert.ok(guide.metaTitle.length <= 70, `${l}/${guide.id} title too long`);
      assert.ok(guide.description.length >= 70 && guide.description.length <= 170, `${l}/${guide.id} description length`);
      assert.ok(guide.sources.every((s) => s.url.startsWith("https://")));
    }
  }
});

test("guide paths and hreflang alternates use the localized section", () => {
  assert.equal(g.guidePath("is", "dmarc"), "/is/leidbeiningar/hvad-er-dmarc/");
  assert.equal(g.guidePath("en", "dmarc"), "/en/guides/what-is-dmarc/");
  assert.equal(g.guidePath("en"), "/en/guides/");
  assert.deepEqual(JSON.parse(JSON.stringify(g.guideAlternates("no-email"))), {
    is: "/is/leidbeiningar/len-sem-sendir-ekki-post/",
    en: "/en/guides/domain-without-email/",
    "x-default": "/is/leidbeiningar/len-sem-sendir-ekki-post/",
  });
});

test("answers quote the exact provider records shown on the page", () => {
  for (const l of ["is", "en"]) {
    assert.match(g.guideById(l, "microsoft-365").answer, /v=spf1 include:spf\.protection\.outlook\.com -all/);
    assert.match(g.guideById(l, "google-workspace").answer, /v=spf1 include:_spf\.google\.com ~all/);
    assert.match(g.guideById(l, "no-email").answer, /v=spf1 -all/);
    const ms = g.guideById(l, "microsoft-365").sections.flatMap((s) => s.records ?? []).map((r) => r.value);
    assert.ok(ms.includes("v=spf1 include:spf.protection.outlook.com -all"));
    assert.ok(ms.includes("v=DMARC1; p=none;"));
  }
});

test("structured data mirrors the visible FAQ and uses the canonical origin", () => {
  for (const l of ["is", "en"]) {
    for (const guide of g.guides[l]) {
      const graph = g.guideStructuredData(l, guide)["@graph"];
      const faq = graph.find((n) => n["@type"] === "FAQPage");
      assert.deepEqual(faq.mainEntity.map((q) => q.name), guide.faqs.map((f) => f.question));
      const article = graph.find((n) => n["@type"] === "TechArticle");
      assert.equal(article.url, `https://www.dmark.is${g.guidePath(l, guide.id)}`);
      assert.equal(!!graph.find((n) => n["@type"] === "HowTo"), guide.kind === "provider");
    }
  }
});

test("guide copy contains no em-dashes", () => {
  assert.doesNotMatch(JSON.stringify(g.guides), /—/);
});
