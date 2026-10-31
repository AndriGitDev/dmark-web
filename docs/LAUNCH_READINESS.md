# dmark launch readiness

## Implemented

- The standalone design is implemented with the original Kastro yellow and ink star assets from `AndriGitDev/kastro`, preserving their proportions. Social images and square app icons use that same asset.
- Icelandic and English pages have descriptive titles, descriptions, trailing-slash canonicals, reciprocal language alternates, an Icelandic `x-default`, localized Open Graph metadata and 1200 × 630 share images, Twitter large-image cards and descriptive image alternatives.
- The sitemap declares both public pages and their language alternates. Public pages remain indexable. API routes are excluded from crawling and send `X-Robots-Tag: noindex, nofollow, nosnippet`; login confirmation also sends its own noindex header and markup. Private domain state is browser/account data, not public pages or structured data.
- Prerendered product explanations and six FAQs cover the actual five-check scoring model, authentication concepts, guest/account storage, DNS boundaries, SPF snapshot maintenance and DKIM-selector limitations. The same content generates Organization, WebSite, WebApplication and FAQPage structured data. There are no invented reviews or ratings.
- The interface retains a skip link, a single H1, named navigation, labels, dialog semantics and a keyboard-operable checklist. Changes add focus after in-app navigation, invalid-input descriptions and focus, scan/generation announcements, current-navigation states, Home/End tab keys, resolvable panel references, email-dialog focus and error descriptions.
- Input boundaries, declared text colors and focus rings have contrast checks. Controls have minimum target dimensions, coarse-pointer controls are enlarged, sticky-header scroll clearance is provided, motion reduction is retained and forced-colors states are supported. These source-level checks are not a WCAG conformance certification.
- The interface identifies the product as dmark, an open-source email security tool. Source links lead to both repositories, and the footer links to the AGPL license and the current operator’s policy, vulnerability-reporting and contact pages.
- App icons are proper 180/192/512-pixel square PNGs. The manifest describes the dark appearance and uses the matching 192/512 icons. No offline or service-worker capability is claimed.
- Base security headers cover framing, MIME sniffing, referrers, embedded objects and unused camera/microphone/geolocation permissions. Authentication confirmation retains its stricter CSP and no-referrer policy.

## Verification

Run:

```sh
npm ci
npm test
npm run build
npm run test:launch
npx playwright install --with-deps chromium
npm run test:browser
```

`test:launch` reads real build output: both HTML locales, schema/visible-FAQ agreement, metadata, image dimensions/content types, canonical and hreflang links, sitemap, robots, icon files, API noindex rules and declared color contrast. Unit tests also check that schema content and the free-app claim remain consistent with the visible copy.

The GitHub verification workflow runs those commands and retains browser screenshots. The expanded browser suite checks empty/scored workspaces, form errors, summaries, guided setup, SPF generation, sign-in dialogs and both languages with axe-core. It also exercises keyboard tabs, focus, mobile overflow, browser storage and blocked cookies.

Local verification passes the production build, launch checks, unit tests, lint and Chromium browser suite, including axe checks, keyboard behavior, responsive layouts and browser workspace flows. The browser suite uses mocked DNS responses and verifies that no account routes are called. These checks do not verify the deployed Lookup service or real DNS results and do not constitute a WCAG conformance certification.

## After deployment

- Confirm the deployed public pages, sitemap, robots, share images and square icons return successfully. Test a real domain and inspect its selector, record and guidance flows.
- Confirm saved domains survive reload in the same browser, and clearing browser storage removes the workspace. No account backend is used by the public web app.
- Inspect the public URLs and submit `https://dmark.is/sitemap.xml` in the site's Search Console property. Check canonical selection and language alternates after indexing.
- Inspect a shared link in Meta's Sharing Debugger and LinkedIn's Post Inspector; older cached previews may need to be refreshed. Run Google's Rich Results Test and Schema Markup Validator on the deployed URLs. Markup does not guarantee a rich result; ordinary FAQ pages are not promised FAQ rich results.
- Complete a manual keyboard and screen-reader pass, browser zoom/reflow check and checks on real mobile devices. Measure production Core Web Vitals with real traffic; no Lighthouse score or performance guarantee is asserted from build output.

## Reference guidance

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google: FAQ/HowTo rich-result changes](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
- [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C: tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [W3C: modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Next.js: ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response)

GEO work here consists of accessible public explanations, accurate identity/content markup and normal crawlable pages. No special AI-file requirement, guaranteed ranking or AI recommendation is claimed.
