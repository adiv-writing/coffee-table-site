# Coffee Table — author website

A simple static site for `coffeetablepoetry.com`. No Node backend, database, or paid web hosting required.

## Preview locally

Open `index.html` in a browser, or in this folder run `python3 -m http.server 8000` and visit http://localhost:8000.

## Before publishing

1. Edit the text in `index.html` to your liking.
2. The contact form uses Web3Forms. Its public access key is configured in `index.html`; receiving email settings are managed in Web3Forms.
3. Keep poems under journal consideration off the site unless you have checked their prior-publication policies.

## Publish to GitHub Pages

1. Make a **public** GitHub repository named `coffeetable-site` (GitHub Pages on a free plan requires a public repository).
2. Upload `index.html`, `styles.css`, `script.js`, `phrases.js`, and the complete `assets` folder to its **root**, or `git init`, commit, and push them. Keep the README if you like.
3. Under repository **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, and save.
4. Test the GitHub Pages URL shown in Settings → Pages before changing your domain's DNS.
5. In **Settings → Pages → Custom domain**, enter `coffeetablepoetry.com` and save. Follow GitHub's domain verification instructions if asked.
6. At Porkbun → Domain Management → Details → DNS, set these four A records for the apex (@ / blank host, per Porkbun UI):

   - 185.199.108.153
   - 185.199.109.153
   - 185.199.110.153
   - 185.199.111.153

   Delete *conflicting* A/AAAA records for the apex that point elsewhere; **do not** delete unrelated MX/TXT records (especially email or verification records).
7. Optional but recommended: add a CNAME record `www` → `YOUR_GITHUB_USERNAME.github.io` (replace the username). Do not put `https://` in the CNAME value. If GitHub asks for another configuration, follow its current docs.
8. After DNS and certificate issuance, enable **Enforce HTTPS** under Settings → Pages. DNS propagation / certificate provisioning can take time.

Official docs: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Contact

The contact form posts to Web3Forms using a public access key, keeping the receiving email out of the page. JavaScript shows inline success/error feedback, prevents duplicate submissions, and preserves messages on failure. Without JavaScript, the form uses Web3Forms' hosted success page. Name, email and message are required; a hidden honeypot helps filter spam. Never put private email passwords or secret API keys in client-side HTML/JS.

## Notes

The site uses Google Fonts, so visitors need an internet connection to load those fonts; system fonts are used as fallbacks.
