import siteConfig from "../../content/site-content.js";

const THEME_PROPERTIES = {
  primary: "--color-primary",
  primaryDark: "--color-primary-dark",
  secondary: "--color-secondary",
  ink: "--color-ink",
  paper: "--color-paper",
  warm: "--color-warm",
  muted: "--color-muted",
  border: "--color-border"
};

function getValue(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateConfig(config) {
  const requiredStrings = [
    config?.meta?.siteName,
    config?.meta?.title,
    config?.business?.name,
    config?.business?.email,
    config?.home?.hero?.headline,
    config?.home?.hero?.text
  ];

  return (
    config?.schemaVersion === 1 &&
    requiredStrings.every(isNonEmptyString) &&
    Array.isArray(config?.home?.services) &&
    Array.isArray(config?.home?.process) &&
    Array.isArray(config?.home?.faq)
  );
}

function loadConfig() {
  return validateConfig(siteConfig)
    ? { config: siteConfig, source: "module" }
    : { config: null, source: "html" };
}

function applyTheme(theme = {}) {
  for (const [key, property] of Object.entries(THEME_PROPERTIES)) {
    const value = theme[key];

    if (isNonEmptyString(value) && CSS.supports("color", value)) {
      document.documentElement.style.setProperty(property, value);
    }
  }
}

function applyMeta(config) {
  document.documentElement.lang = config.meta.locale?.slice(0, 2) || "de";

  const page = document.body.dataset.page;
  if (page === "home") {
    document.title = config.meta.title;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", config.meta.description);
  }

  const robots = document.querySelector('meta[name="robots"]');
  robots?.setAttribute(
    "content",
    config.meta.draft ? "noindex, nofollow" : "index, follow"
  );

  const banner = document.querySelector("[data-draft-banner]");
  if (banner) {
    banner.textContent = config.meta.draftMessage;
    banner.hidden = !config.meta.draft;
  }
}

function bindText(config) {
  document.querySelectorAll("[data-bind]").forEach((element) => {
    const value = getValue(config, element.dataset.bind);

    if (value !== undefined && value !== null && value !== "") {
      element.textContent = String(value);
    }
  });

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll("[data-address]").forEach((element) => {
    const { street, postalCode, city, country } = config.business.address;
    element.textContent = [street, `${postalCode} ${city}`, country]
      .filter(isNonEmptyString)
      .join(", ");
  });
}

function configureContactLinks(config) {
  const { business } = config;
  const contactTarget = document.body.dataset.page === "home" ? "#kontakt" : "./#kontakt";

  document.querySelectorAll("[data-email-link]").forEach((link) => {
    link.textContent = business.email;

    if (business.emailReady) {
      link.href = `mailto:${business.email}`;
      link.removeAttribute("aria-disabled");
    } else {
      link.href = contactTarget;
      link.setAttribute("aria-disabled", "true");
      link.title = "Beispieladresse – bitte in site/content/site-content.js ersetzen";
    }
  });

  document.querySelectorAll("[data-phone-link]").forEach((link) => {
    link.textContent = business.phoneDisplay;

    if (business.phoneReady) {
      link.href = `tel:${business.phoneHref}`;
      link.removeAttribute("aria-disabled");
    } else {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.title = "Beispielnummer – bitte in site/content/site-content.js ersetzen";
    }
  });
}

function renderNavigation(config) {
  const navigation = document.querySelector("[data-home-nav]");
  if (!navigation || !Array.isArray(config.navigation)) {
    return;
  }

  const fragment = document.createDocumentFragment();
  config.navigation.forEach((item) => {
    if (!isNonEmptyString(item?.label) || !isNonEmptyString(item?.href)) {
      return;
    }

    const link = createElement("a", "", item.label);
    link.href = item.href;
    fragment.append(link);
  });

  const cta = createElement("a", "button", "Projekt anfragen");
  cta.href = "#kontakt";
  fragment.append(cta);
  navigation.replaceChildren(fragment);
}

function renderTrust(items) {
  const container = document.querySelector("[data-trust-list]");
  if (!container || !Array.isArray(items) || items.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const article = createElement("article", "trust-item");
    article.append(createElement("span", "trust-item__number", item.number));
    const copy = createElement("div");
    copy.append(
      createElement("h3", "", item.title),
      createElement("p", "", item.text)
    );
    article.append(copy);
    fragment.append(article);
  });
  container.replaceChildren(fragment);
}

function renderServices(items) {
  const container = document.querySelector("[data-services-list]");
  if (!container || !Array.isArray(items) || items.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const article = createElement("article", "service-card");
    article.id = item.id || "";
    article.append(
      createElement("span", "service-card__number", item.number),
      createElement("h3", "", item.title),
      createElement("p", "", item.description)
    );

    if (Array.isArray(item.details) && item.details.length > 0) {
      const list = createElement("ul");
      item.details.forEach((detail) => list.append(createElement("li", "", detail)));
      article.append(list);
    }

    fragment.append(article);
  });
  container.replaceChildren(fragment);
}

function renderProjectTypes(items) {
  const container = document.querySelector("[data-project-list]");
  if (!container || !Array.isArray(items) || items.length === 0) {
    return;
  }

  const allowedVariants = new Set(["red", "yellow", "dark"]);
  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const article = createElement("article", "project-card");
    article.dataset.variant = allowedVariants.has(item.variant) ? item.variant : "red";

    const visual = createElement("div", "project-card__visual");
    visual.setAttribute("aria-hidden", "true");
    visual.append(createElement("span", "project-card__placeholder", "Bildfläche"));

    const body = createElement("div", "project-card__body");
    body.append(
      createElement("p", "project-card__label", item.label),
      createElement("h3", "", item.title),
      createElement("p", "", item.text)
    );

    article.append(visual, body);
    fragment.append(article);
  });
  container.replaceChildren(fragment);
}

function renderProcess(items) {
  const container = document.querySelector("[data-process-list]");
  if (!container || !Array.isArray(items) || items.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const article = createElement("article", "process-step");
    article.append(
      createElement("span", "process-step__number", item.step),
      createElement("h3", "", item.title),
      createElement("p", "", item.text)
    );
    fragment.append(article);
  });
  container.replaceChildren(fragment);
}

function renderPrinciples(items) {
  const container = document.querySelector("[data-principles-list]");
  if (!container || !Array.isArray(items) || items.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const article = createElement("article", "principle");
    article.append(
      createElement("h3", "", item.title),
      createElement("p", "", item.text)
    );
    fragment.append(article);
  });
  container.replaceChildren(fragment);
}

function renderFaq(items) {
  const container = document.querySelector("[data-faq-list]");
  if (!container || !Array.isArray(items) || items.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const details = createElement("details", "faq-item");
    const summary = createElement("summary", "", item.question);
    const answer = createElement("div", "faq-item__answer");
    answer.append(createElement("p", "", item.answer));
    details.append(summary, answer);
    fragment.append(details);
  });
  container.replaceChildren(fragment);
}

function populateServiceOptions(options) {
  const select = document.querySelector("#service");
  if (!select || !Array.isArray(options) || options.length === 0) {
    return;
  }

  const placeholder = select.querySelector("option[value='']")?.cloneNode(true);
  const fragment = document.createDocumentFragment();
  if (placeholder) {
    fragment.append(placeholder);
  }

  options.forEach((label) => {
    const option = createElement("option", "", label);
    option.value = label;
    fragment.append(option);
  });
  select.replaceChildren(fragment);
}

function showFormStatus(message, { focus = true } = {}) {
  const status = document.querySelector("[data-form-status]");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.add("is-visible");
  if (focus) status.focus();
}

function configureContactForm(config) {
  const form = document.querySelector("[data-contact-form]");
  const fields = form?.querySelector("[data-contact-fields]");
  if (!form || !fields) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      showFormStatus("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    if (!config.business.emailReady) {
      showFormStatus(
        "Die Empfängeradresse ist in diesem Entwurf noch ein Platzhalter. Bitte zuerst die echte E-Mail-Adresse in site/content/site-content.js hinterlegen."
      );
      return;
    }

    const values = new FormData(form);
    const service = String(values.get("service") || "Nicht angegeben");
    const subject = `${config.home.contact.emailSubject}: ${service}`;
    const body = [
      "Guten Tag,",
      "",
      "ich interessiere mich für folgendes Projekt:",
      "",
      `Name: ${values.get("name")}`,
      `E-Mail: ${values.get("email")}`,
      `Telefon: ${values.get("phone") || "Nicht angegeben"}`,
      `Ort / PLZ: ${values.get("location") || "Nicht angegeben"}`,
      `Vorhaben: ${service}`,
      "",
      "Nachricht:",
      String(values.get("message") || ""),
      "",
      "Datenschutzhinweis wurde bestätigt."
    ].join("\r\n");

    const mailto = `mailto:${config.business.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.assign(mailto);
    showFormStatus(
      "Ihr E-Mail-Programm wird geöffnet. Bitte prüfen und senden Sie die vorbereitete Nachricht dort ab."
    );
  });

  if (!config.business.emailReady) {
    showFormStatus(
      "Das Formular ist in dieser Vorschau deaktiviert, bis eine bestätigte Empfängeradresse hinterlegt wurde.",
      { focus: false }
    );
    return;
  }

  fields.disabled = false;
  form.removeAttribute("aria-disabled");
}

function configureMobileNavigation() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const navigation = document.querySelector("[data-navigation]");
  if (!toggle || !navigation) {
    return;
  }

  const closeMenu = () => {
    navigation.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Menü";
    document.body.classList.remove("menu-open");
  };

  toggle.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Schließen" : "Menü";
    document.body.classList.toggle("menu-open", isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && navigation.classList.contains("is-open")) {
      const focusable = [
        toggle,
        ...navigation.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ];
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    if (event.key === "Escape") {
      closeMenu();
      toggle.focus();
    }
  });

  const wideViewport = window.matchMedia("(min-width: 54.01rem)");
  wideViewport.addEventListener("change", (event) => {
    if (event.matches) {
      closeMenu();
    }
  });
}

function showConfigWarning(source) {
  if (source === "module") {
    return;
  }

  const warning = createElement(
    "div",
    "config-error",
    "Die Inhaltskonfiguration ist ungültig. Die fest hinterlegten Beispielinhalte bleiben sichtbar."
  );
  warning.setAttribute("role", "status");

  const anchor = document.querySelector(".utility-bar") || document.body.firstChild;
  anchor?.after(warning);
}

function applyConfig(config) {
  applyTheme(config.theme);
  applyMeta(config);
  bindText(config);
  configureContactLinks(config);
  renderNavigation(config);
  renderTrust(config.home.trust);
  renderServices(config.home.services);
  renderProjectTypes(config.home.projectTypes);
  renderProcess(config.home.process);
  renderPrinciples(config.home.principles);
  renderFaq(config.home.faq);
  populateServiceOptions(config.contactForm.serviceOptions);
  configureContactForm(config);
}

function init() {
  configureMobileNavigation();
  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const result = loadConfig();
  if (result.config) {
    applyConfig(result.config);
  }
  showConfigWarning(result.source);
}

init();
