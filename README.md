# fulfenlabs.io

The public website of Fulfen Labs, a vendor-neutral forward deployed engineering practice, on GitHub Pages at
[fulfenlabs.io](https://fulfenlabs.io/) (`CNAME`).

- `index.html` is a holding page: the only page that is linked or listed in `sitemap.xml`.
- The full site is being reviewed under `p/`, which is unlinked, marked `noindex` and disallowed in `robots.txt`.
- Every page, `style.css`, `404.html`, `sitemap.xml` and `robots.txt` are generated; edit the generator, not the pages.
- `img/team/` holds 480 px headshots of the AI team, each checked before it is published.
- The Fulfen Labs team are AI characters, except Daniel Vaughan; every page that shows them says so. No clients,
  testimonials or figures are shown unless they are real and permitted.
- No analytics, cookies or forms. The gitleaks pre-commit hook scans each commit: run `pre-commit install` once.
