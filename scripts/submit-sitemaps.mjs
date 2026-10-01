#!/usr/bin/env node
/**
 * Submits this site's sitemaps to Google Search Console (service account)
 * and pings IndexNow (Bing, Yandex, etc.) with the URLs found in them.
 *
 * Needs only Node 18+ (no dependencies).
 * Secret:  GSC_SERVICE_ACCOUNT_JSON  (service-account key; its e-mail must be Owner
 *          of the property in Search Console). Without it, the Google step is skipped.
 * Sitemaps are discovered from ${DIR}/robots.txt ("Sitemap:" lines).
 * IndexNow key file: public/<key>.txt (any 8-128 hex file whose content equals its name).
 */
import { readFileSync, readdirSync, appendFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';

const DIR = process.env.SITE_DIR || 'public';
const out = [];
const log = (s = '') => { console.log(s); out.push(s); };

const robots = readFileSync(`${DIR}/robots.txt`, 'utf8');
const sitemaps = [...robots.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
if (!sitemaps.length) { log(`No "Sitemap:" line in ${DIR}/robots.txt. Nothing to do.`); process.exit(0); }
const host = new URL(sitemaps[0]).hostname.replace(/^www\./, '');
log(`## Sitemap submission for ${host}`);

/* ---------- Google Search Console ---------- */
const b64 = (b) => Buffer.from(b).toString('base64url');
async function gscToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64(JSON.stringify({
    iss: creds.client_email, scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000,
  }));
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(creds.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${body}.${sig}` }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token: ${JSON.stringify(j)}`);
  return j.access_token;
}

let failed = false;
const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
if (!raw) {
  log('\n**Google:** secret GSC_SERVICE_ACCOUNT_JSON not set, skipped.');
} else {
  try {
    const creds = JSON.parse(raw);
    const token = await gscToken(creds);
    const auth = { authorization: `Bearer ${token}` };
    const candidates = [`sc-domain:${host}`, `https://${host}/`, `https://www.${host}/`];
    log(`\n**Google** (as ${creds.client_email})`);
    let site = null;
    for (const c of candidates) {
      const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(c)}`, { headers: auth });
      if (r.ok) { site = c; break; }
      log(`- property \`${c}\`: HTTP ${r.status} (not accessible)`);
    }
    if (!site) {
      failed = true;
      log(`- No accessible property. Add ${creds.client_email} as Owner in Search Console for ${host}.`);
    } else {
      log(`- using property \`${site}\``);
      for (const sm of sitemaps) {
        const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(sm)}`;
        const put = await fetch(url, { method: 'PUT', headers: auth });
        if (!put.ok) { failed = true; log(`- ${sm}: submit failed, HTTP ${put.status} ${(await put.text()).slice(0, 200)}`); continue; }
        const g = await (await fetch(url, { headers: auth })).json();
        const found = (g.contents || []).map((c) => `${c.type}: ${c.submitted ?? '?'} submitted`).join(', ');
        log(`- ${sm}: submitted OK. last read ${g.lastDownloaded || 'pending'}; errors ${g.errors ?? 0}, warnings ${g.warnings ?? 0}${found ? `; ${found}` : ''}`);
      }
    }
  } catch (e) { failed = true; log(`- Google step error: ${e.message}`); }
}

/* ---------- IndexNow (Bing, Yandex, ...) ---------- */
const keyFile = existsSync(DIR) ? readdirSync(DIR).find((f) => /^[a-f0-9]{16,64}\.txt$/i.test(f) && readFileSync(`${DIR}/${f}`, 'utf8').trim() === f.replace(/\.txt$/, '')) : null;
if (!keyFile) {
  log(`\n**IndexNow:** no key file in ${DIR}/, skipped.`);
} else {
  const key = keyFile.replace(/\.txt$/, '');
  const urls = new Set();
  for (const sm of sitemaps) {
    try {
      const xml = await (await fetch(sm)).text();
      for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) if (!m[1].endsWith('.xml')) urls.add(m[1]);
    } catch (e) { log(`- could not read ${sm}: ${e.message}`); }
  }
  const list = [...urls].slice(0, 1000);
  if (!list.length) { log('\n**IndexNow:** no URLs found in sitemaps.'); }
  else {
    const send = () => fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList: list }),
    });
    let r = await send();
    // IndexNow validates the key file asynchronously; a 403/429 right after a deploy or a
    // repeat submission is usually transient, so retry once before warning.
    if (![200, 202].includes(r.status)) { await new Promise((ok) => setTimeout(ok, 20000)); r = await send(); }
    const okNow = [200, 202].includes(r.status);
    log(`\n**IndexNow:** ${list.length} URLs sent, HTTP ${r.status} ${okNow ? '(accepted)' : `(warning, not fatal) ${(await r.text()).slice(0, 200)}`}`);
  }
}

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join('\n') + '\n');
process.exit(failed ? 1 : 0);
