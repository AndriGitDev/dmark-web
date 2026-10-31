# dmark

dmark is an open-source email security tool. Its purpose is to make email-authentication findings understandable and independently reviewable.

## Available in the web app

- On-demand SPF and DMARC checks, common DKIM-selector discovery, explicit selector checks and BIMI publication checks.
- A transparent five-check DNS readiness score, with explanations of incomplete evidence and limitations.
- Domain checklists saved in the browser without accounts or email addresses.
- English and Icelandic setup guidance and an on-demand SPF snapshot generator.

Users publish DNS changes through their own provider. Scores describe observed DNS configuration; they do not certify message authentication or guarantee delivery. The web app does not provide continuous monitoring or receive DMARC reports.

## Source and data flow

The [web app](https://github.com/AndriGitDev/dmark-web) and [Go backend](https://github.com/AndriGitDev/dmark-app) form dmark. A public web check currently uses Kastro Lookup for SPF/DMARC evidence and queries public DNS for supplementary records. The public web app does not use account services; the Go backend retains separate organization and account APIs for operator deployments. See the README for deployment configuration, storage behavior and operational limitations.

Resource limits protect the service and apply consistently. Contributions should improve accuracy, clear guidance, privacy, accessibility and reproducible operation.
