# Contributing to dmark

Issues and pull requests are welcome at <https://github.com/AndriGitDev/dmark-web>.

## Reporting a problem

Describe the problem, what you expected and a minimal way to reproduce it. A domain name that shows the behavior helps, as long as it is one you are happy to make public.

Do not include credentials, private email, real DMARC report payloads or customer data in issues, logs or fixtures.

Report vulnerabilities privately, as described in the [security policy](SECURITY.md), and not in a public issue.

## Making a change

1. Read the [README](README.md) for local setup and [docs/PROJECT.md](docs/PROJECT.md) for what dmark does and does not do.
2. Keep the change focused, and explain in the pull request how you verified it.
3. Run the checks before you open the pull request:

   ```sh
   npm test
   npm run lint
   npm run build
   npm run test:launch
   ```

4. For interface changes, also run the browser suite:

   ```sh
   npx playwright install chromium
   npm run test:browser
   ```

Interface text exists in Icelandic and English. Update both `messages/is.json` and `messages/en.json`, and any inline copy, in the same change.

Good contributions improve accuracy, clear guidance, privacy, accessibility or reproducible operation. Changes that add accounts, tracking or stored scan results do not fit the project.

## License

Contributions are made under the GNU Affero General Public License version 3 (`AGPL-3.0-only`), the same license as the project. Preserve third-party notices, and make sure you have permission to contribute the code or assets.
