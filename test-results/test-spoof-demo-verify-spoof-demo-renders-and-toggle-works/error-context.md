# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test-spoof-demo.spec.ts >> verify spoof demo renders and toggle works
- Location: test-spoof-demo.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3001/en", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('verify spoof demo renders and toggle works', async ({ page }) => {
> 4  |   await page.goto('http://localhost:3001/en');
     |              ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  5  |
  6  |   // Verify main heading
  7  |   await expect(page.locator('h1')).toContainText('borrow your brand');
  8  |
  9  |   // Find Spoof Demo section
  10 |   const demoSection = page.locator('#threat');
  11 |   await expect(demoSection).toBeVisible();
  12 |
  13 |   // Check default state (Without DMARK)
  14 |   await expect(page.getByText('Northwind Billing')).toHaveCount(2);
  15 |   await expect(page.getByText('sent via 185.220.101.4')).toBeVisible();
  16 |
  17 |   // Toggle to "With DMARK"
  18 |   await page.getByRole('button', { name: 'With DMARK · p=reject' }).click();
  19 |
  20 |   // Verify one is rejected
  21 |   await expect(page.getByText('Rejected at receiver')).toBeVisible();
  22 |
  23 |   // Take screenshot
  24 |   await page.screenshot({ path: 'spoof_demo_verify.png' });
  25 | });
  26 |
```