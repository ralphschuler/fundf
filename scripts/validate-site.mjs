import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const siteRoot = path.join(repositoryRoot, "site");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else if (entry.isFile()) files.push(fullPath);
  }

  return files;
}

function localTarget(fromFile, reference) {
  if (
    reference.startsWith("mailto:") ||
    reference.startsWith("tel:") ||
    reference.startsWith("data:") ||
    reference.startsWith("http://") ||
    reference.startsWith("https://")
  ) {
    return null;
  }

  if (reference.startsWith("#")) return fromFile;

  check(!reference.startsWith("/"), `${fromFile}: root-absolute path is not Project Pages safe: ${reference}`);
  const cleanReference = reference.split(/[?#]/, 1)[0];
  if (!cleanReference) return null;

  let target = path.resolve(path.dirname(fromFile), cleanReference);
  if (cleanReference.endsWith("/")) target = path.join(target, "index.html");

  const relativeTarget = path.relative(siteRoot, target);
  const staysInsideSite =
    relativeTarget !== ".." &&
    !relativeTarget.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeTarget);
  check(staysInsideSite, `${fromFile}: reference escapes site directory: ${reference}`);
  if (!staysInsideSite) return null;

  return target;
}

async function validateHtml(file, config) {
  const html = await readFile(file, "utf8");
  const relative = path.relative(repositoryRoot, file);
  const h1Count = (html.match(/<h1(?:\s|>)/gi) ?? []).length;

  check(/^<!DOCTYPE html>/i.test(html), `${relative}: missing HTML5 doctype`);
  check(/<html\s[^>]*lang="de"/i.test(html), `${relative}: missing lang=de`);
  check(/<html\s[^>]*class="[^"]*\bno-js\b[^"]*\bpreview-locked\b/i.test(html), `${relative}: preview must start fail-closed`);
  check(/<meta\s+name="viewport"/i.test(html), `${relative}: missing viewport meta tag`);
  check(/<meta\s+name="description"/i.test(html), `${relative}: missing description`);
  check(/<meta\s+name="robots"\s+content="noindex, nofollow"/i.test(html), `${relative}: draft must stay noindex`);
  check(/<title>[^<]+<\/title>/i.test(html), `${relative}: missing title`);
  check(/<main(?:\s|>)/i.test(html), `${relative}: missing main landmark`);
  check(h1Count === 1, `${relative}: expected exactly one h1, found ${h1Count}`);
  check(/assets\/js\/auth\.js/.test(html), `${relative}: preview gate script missing`);
  check(/href="#main-content"/.test(html), `${relative}: skip link missing`);

  if (path.basename(file) === "index.html") {
    check(/<fieldset[^>]*\bdisabled\b[^>]*\bdata-contact-fields\b/i.test(html), `${relative}: contact fields must be disabled until JavaScript is ready`);
    check(html.includes(config.business.phoneDisplay), `${relative}: unexpected phone fallback`);
    check(html.includes(config.business.email), `${relative}: unexpected email fallback`);
    check(html.includes(config.business.serviceArea), `${relative}: unexpected service-area fallback`);
  }

  if (path.basename(file) === "404.html") {
    check(html.includes("setProjectBase"), `${relative}: nested Project Pages requests need a project-root base`);
  }

  if (path.basename(file) === "impressum.html") {
    const expectedFallbacks = [
      config.business.legalName,
      config.business.owner,
      config.business.email,
      config.business.phoneDisplay,
      config.business.address.street,
      config.business.address.postalCode,
      config.business.address.city,
      config.legal.vatId,
      config.legal.tradeRegister,
      config.legal.supervisoryAuthority,
      config.legal.responsibleForContent
    ];
    expectedFallbacks.forEach((value) => {
      check(html.includes(value), `${relative}: expected placeholder fallback is missing: ${value}`);
    });
  }

  if (path.basename(file) === "datenschutz.html") {
    [
      config.business.legalName,
      config.business.email,
      config.business.address.street,
      config.business.address.postalCode,
      config.business.address.city
    ].forEach((value) => {
      check(html.includes(value), `${relative}: expected placeholder fallback is missing: ${value}`);
    });
  }

  const references = [...html.matchAll(/(?:href|src)\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2]);
  for (const reference of references) {
    const target = localTarget(file, reference);
    if (!target) continue;

    try {
      const targetStat = await stat(target);
      check(targetStat.isFile(), `${relative}: local target is not a file: ${reference}`);

      const hashIndex = reference.indexOf("#");
      if (hashIndex !== -1) {
        const rawFragment = reference.slice(hashIndex + 1).split("?", 1)[0];
        if (rawFragment) {
          const targetHtml = target === file ? html : await readFile(target, "utf8");
          const ids = new Set(
            [...targetHtml.matchAll(/\sid\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2])
          );
          const fragment = decodeURIComponent(rawFragment);
          check(ids.has(fragment), `${relative}: missing fragment target: ${reference}`);
        }
      }
    } catch {
      failures.push(`${relative}: missing local target: ${reference}`);
    }
  }
}

async function validateConfig() {
  const configPath = path.join(siteRoot, "content", "site-content.js");
  const rawConfig = await readFile(configPath, "utf8");
  const serializedConfig = rawConfig
    .replace(/^\s*export\s+default\s+/, "")
    .replace(/;\s*$/, "");
  const config = JSON.parse(serializedConfig);

  check(config.schemaVersion === 1, "site/content/site-content.js: schemaVersion must be 1");
  check(Boolean(config.meta?.draft), "site/content/site-content.js: draft must remain true for the preview");
  check(Boolean(config.business?.name), "site/content/site-content.js: business.name is required");
  check(Boolean(config.business?.email), "site/content/site-content.js: business.email is required");
  check(config.business?.emailReady === false, "site/content/site-content.js: placeholder email must not be activated");
  check(config.business?.phoneReady === false, "site/content/site-content.js: placeholder phone must not be activated");
  check(Array.isArray(config.home?.services) && config.home.services.length >= 4, "site/content/site-content.js: at least four services are required");
  check(Array.isArray(config.home?.process) && config.home.process.length >= 3, "site/content/site-content.js: process is incomplete");
  check(Array.isArray(config.home?.faq) && config.home.faq.length >= 3, "site/content/site-content.js: FAQ is incomplete");

  const expectedPreviewValues = new Map([
    ["business.name", "Fliese & Fuge"],
    ["business.shortName", "F&F"],
    ["business.legalName", "[Unternehmensname und Rechtsform]"],
    ["business.owner", "[Vor- und Nachname]"],
    ["business.email", "kontakt@fliese-und-fuge.example"],
    ["business.emailReady", false],
    ["business.phoneDisplay", "01234 567890"],
    ["business.phoneHref", "+491234567890"],
    ["business.phoneReady", false],
    ["business.address.street", "[Straße und Hausnummer]"],
    ["business.address.postalCode", "[PLZ]"],
    ["business.address.city", "[Ort]"],
    ["business.address.country", "Deutschland"],
    ["business.serviceArea", "Musterstadt und Umgebung"],
    ["legal.vatId", "[Umsatzsteuer-ID, falls vorhanden]"],
    ["legal.tradeRegister", "[Register und Registernummer, falls vorhanden]"],
    ["legal.supervisoryAuthority", "[Zuständige Aufsichtsbehörde, falls erforderlich]"],
    ["legal.responsibleForContent", "[Vor- und Nachname, Anschrift]"]
  ]);

  for (const [key, expected] of expectedPreviewValues) {
    const actual = key.split(".").reduce((value, part) => value?.[part], config);
    check(actual === expected, `site/content/site-content.js: ${key} must remain the approved example value`);
  }

  return config;
}

const config = await validateConfig();

const allFiles = await walk(siteRoot);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
check(htmlFiles.length >= 5, `Expected at least five HTML pages, found ${htmlFiles.length}`);

for (const htmlFile of htmlFiles) await validateHtml(htmlFile, config);

for (const file of allFiles) {
  if (!/\.(?:html|js|css|txt)$/i.test(file)) continue;
  const contents = await readFile(file, "utf8");
  const emailAddresses = contents.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  emailAddresses.forEach((email) => {
    check(email === config.business.email, `${path.relative(repositoryRoot, file)}: unexpected email address: ${email}`);
  });
}

check(allFiles.some((file) => file.endsWith("assets/css/styles.css")), "Main stylesheet is missing");
check(allFiles.some((file) => file.endsWith("assets/js/app.js")), "Application script is missing");
check(allFiles.some((file) => file.endsWith("assets/js/auth.js")), "Preview gate script is missing");
check(!allFiles.some((file) => file.endsWith("robots.txt")), "Project Pages robots.txt is ineffective; rely on static noindex meta tags");

if (failures.length > 0) {
  console.error("Static site validation failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Static site validation passed: ${htmlFiles.length} HTML pages and ${allFiles.length} total files.`);
