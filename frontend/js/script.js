"use strict";

const BUSINESS_CONFIG = {
  name: "Okine Augustine",
  location: "Cameroon",
  services: [
    "Web Design & Development",
    "Photography",
    "Videography",
    "Video Editing",
    "AI & Automation",
    "Other Digital Services"
  ],
  pricingMessage: "Pricing depends on the requirements and scope of each project.",
  whatsappNumber: "237677788180",
  email: "okineaugustine26@gmail.com",
  phone: "677788180",
  domain: "https://YOUR-DOMAIN.com",
  analyticsId: "G-XXXXXXXXXX",
  socialLinks: {
    instagram: "",
    tiktok: "https://www.tiktok.com/@augustinevisuals?_r=1&_t=ZS-9A65EQ712iw",
    facebook: "",
    youtube: "",
    linkedin: ""
  }
};

const API_ENDPOINTS = Object.freeze({ chat: "/api/chat", bookings: "/api/bookings" });
const API_BASE_URL = window.PUBLIC_API_BASE_URL || "";

async function publicApi(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.headers || {}), ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}) }
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error("The website data service is temporarily unavailable."); }
  if (!response.ok || payload.success === false) throw new Error(payload.message || "The website data service is temporarily unavailable.");
  return payload.data;
}

function openWhatsApp(message) {
  const number = BUSINESS_CONFIG.whatsappNumber.replace(/\D/g, "");
  if (!number || /x/i.test(BUSINESS_CONFIG.whatsappNumber) || number.length < 8) {
    window.alert("WhatsApp is not configured yet. Replace whatsappNumber in js/script.js with your number, including the country code.");
    return;
  }
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

document.addEventListener("click", (event) => {
  const serviceLink = event.target.closest("[data-whatsapp-service]");
  if (!serviceLink) return;
  event.preventDefault();
  openWhatsApp(`Hello ${BUSINESS_CONFIG.name}, I would like to ask about your ${serviceLink.dataset.whatsappService} service.`);
});

function fieldValue(form, name) {
  const field = form.elements.namedItem(name);
  return field && typeof field.value === "string" ? field.value.trim() : "";
}

function buildRequestMessage(form, kind) {
  const fields = kind === "booking"
    ? [["Name", "name"], ["Phone", "phone"], ["Email", "email"], ["Service", "service"], ["Preferred date", "preferredDate"], ["Preferred time", "preferredTime"], ["Location", "location"], ["Project description", "description"]]
    : [["Full name", "name"], ["Phone", "phone"], ["Email", "email"], ["Service", "service"], ["Project description", "description"], ["Location", "location"], ["Preferred completion date", "preferredDate"], ["Budget", "budget"]];
  const heading = kind === "booking" ? "Booking request" : "Quote request";
  const lines = [`Hello ${BUSINESS_CONFIG.name}, I would like to send a ${heading.toLowerCase()}.`, ""];
  fields.forEach(([label, name]) => {
    const value = fieldValue(form, name);
    if (value) lines.push(`${label}: ${value}`);
  });
  return lines.join("\n");
}

function setBusinessDetails() {
  document.querySelectorAll("[data-business-name]").forEach((element) => {
    element.textContent = BUSINESS_CONFIG.name;
  });
  document.querySelectorAll("[data-business-location]").forEach((element) => {
    element.textContent = BUSINESS_CONFIG.location;
  });
  document.querySelectorAll("[data-pricing-message]").forEach((element) => {
    element.textContent = BUSINESS_CONFIG.pricingMessage;
  });
  document.querySelectorAll("[data-business-email]").forEach((element) => {
    element.textContent = BUSINESS_CONFIG.email;
    element.href = `mailto:${BUSINESS_CONFIG.email}`;
  });
  document.querySelectorAll("[data-business-phone]").forEach((element) => {
    element.textContent = BUSINESS_CONFIG.phone;
    if (element.tagName === "A") element.href = `tel:${BUSINESS_CONFIG.phone.replace(/[^\d+]/g, "")}`;
  });
  document.querySelectorAll("[data-whatsapp-number]").forEach((element) => {
    const number = BUSINESS_CONFIG.whatsappNumber.replace(/\D/g, "");
    if (!number) return;
    element.textContent = number.startsWith("237") && number.length === 12
      ? `+237 ${number.slice(3, 6)} ${number.slice(6, 9)} ${number.slice(9)}`
      : `+${number}`;
    element.href = `https://wa.me/${number}`;
    element.target = "_blank";
    element.rel = "noopener noreferrer";
    element.setAttribute("aria-label", `Chat on WhatsApp at ${element.textContent}`);
  });
  document.querySelectorAll("[data-social]").forEach((element) => {
    const url = BUSINESS_CONFIG.socialLinks[element.dataset.social];
    if (url) {
      const safeUrl = safeHttpUrl(url);
      if (safeUrl) {
        element.href = safeUrl;
        element.target = "_blank";
        element.rel = "noopener noreferrer";
        element.removeAttribute("aria-disabled");
      } else {
        element.href = "contact.html#social-links";
        element.setAttribute("aria-label", `${element.dataset.social} profile URL is not configured`);
        element.setAttribute("aria-disabled", "true");
      }
    } else {
      element.href = "contact.html#social-links";
      element.setAttribute("aria-label", `${element.dataset.social} profile link placeholder; add its URL in js/script.js`);
      element.setAttribute("aria-disabled", "true");
    }
    element.onclick = (event) => {
      if (element.getAttribute("aria-disabled") === "true") event.preventDefault();
    };
  });
  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
  document.querySelectorAll(".contact-side h2").forEach((element) => {
    element.textContent = BUSINESS_CONFIG.name;
  });
  document.querySelectorAll(".contact-side .contact-fact:first-of-type span").forEach((element) => {
    element.textContent = BUSINESS_CONFIG.location;
  });
  document.querySelectorAll(".footer-location").forEach((element) => {
    element.textContent = `${BUSINESS_CONFIG.location.toUpperCase()} · WORKING WORLDWIDE`;
  });
  const quoteServices = document.querySelector("#quote-service");
  const bookingServices = document.querySelector("#booking-service");
  [quoteServices, bookingServices].filter(Boolean).forEach((select) => {
    const placeholder = select.querySelector("option[disabled]");
    select.replaceChildren(placeholder);
    const services = select === bookingServices
      ? BUSINESS_CONFIG.services.filter((service) => /photography|videography|video editing|other/i.test(service))
      : BUSINESS_CONFIG.services;
    services.forEach((service) => select.add(new Option(service, service)));
  });
}

function mapPortfolioCategory(category) {
  return ({ "Web Design": "web", Photography: "photography", Videography: "videography", "Video Editing": "editing", "AI & Automation": "ai", Other: "other" })[category] || "other";
}

function renderDynamicServices(services) {
  const grid = document.querySelector(".service-grid");
  const serviceDetails = document.querySelector(".service-detail-list");
  if (!services.length) {
    if (grid) grid.innerHTML = "<p class=\"service-empty\">No services are published right now.</p>";
    if (serviceDetails) serviceDetails.innerHTML = "<p class=\"service-empty\">No services are published right now.</p>";
    return;
  }
  const quoteService = document.querySelector("#quote-service");
  const bookingService = document.querySelector("#booking-service");
  [quoteService, bookingService].filter(Boolean).forEach((select) => {
    const placeholder = select.querySelector("option[disabled]");
    select.replaceChildren(placeholder);
    const options = select === bookingService ? services.filter((service) => /photography|videography|video editing|other/i.test(service.name)) : services;
    options.forEach((service) => select.add(new Option(service.name, service.name)));
  });
  const icons = ["⌘", "◉", "▶", "✳", "⌁", "＋"];
  const classes = ["icon-web", "icon-photo", "icon-video", "icon-edit", "icon-ai", "icon-other"];
  if (grid) grid.innerHTML = services.map((service, index) => `<article class="service-card"><span class="service-number">${String(index + 1).padStart(2, "0")}</span>${service.image && safeImageUrl(service.image) ? `<img class="service-card-image" src="${escapeAttribute(safeImageUrl(service.image))}" alt="" loading="lazy">` : `<span class="service-icon ${classes[index % classes.length]}" aria-hidden="true">${icons[index % icons.length]}</span>`}<h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.shortDescription)}</p><span class="service-price">${escapeHtml(service.displayPrice || "Contact for a Quote")}</span><a class="text-link" href="services.html#${serviceSlug(service.name)}">Explore service <span aria-hidden="true">↗</span></a></article>`).join("");
  if (serviceDetails) serviceDetails.innerHTML = services.map((service, index) => `<article class="service-detail" id="${serviceSlug(service.name)}"><span class="detail-index">${String(index + 1).padStart(2, "0")} / ${escapeHtml(service.category || "DIGITAL").toUpperCase()}</span><div class="detail-main"><h2>${escapeHtml(service.name)}</h2><p>${escapeHtml(service.fullDescription || service.shortDescription)}</p><h3>Typical project requirements</h3><p>Share your goals, intended audience, preferred timing and any relevant materials. Scope and deliverables are agreed together after discussing your requirements.</p></div><aside class="detail-aside"><h3>Pricing</h3><p>${escapeHtml(service.displayPrice || "Contact for a Quote")}. Pricing depends on the requirements and scope of each project.</p><div class="detail-actions"><a class="button button-primary" href="contact.html#quote">Request a Quote ↗</a><a class="button button-outline" href="contact.html" data-whatsapp-service="${escapeAttribute(service.name)}">Chat on WhatsApp ↗</a></div></aside></article>`).join("");
  if (serviceDetails) setupWhatsAppLinks();
}

function renderDynamicFaqs(faqs) {
  const list = document.querySelector("#faq-list");
  if (!list) return;
  list.innerHTML = faqs.length ? faqs.map((faq) => `<details class="faq-item"><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`).join("") : "<p class=\"faq-empty\">No FAQs are published right now.</p>";
}

function renderDynamicPortfolio(projects) {
  const grid = document.querySelector("#portfolio-grid");
  const preview = document.querySelector(".portfolio-mini");
  if (!projects.length) {
    if (preview) preview.hidden = true;
    if (grid) grid.innerHTML = "<p class=\"portfolio-disclaimer\">No data available.</p>";
    const intro = document.querySelector("[data-portfolio-intro]");
    if (intro) intro.textContent = "No portfolio projects are currently published.";
    document.querySelectorAll(".portfolio-disclaimer").forEach((disclaimer) => { disclaimer.hidden = true; });
    return;
  }
  const intro = document.querySelector("[data-portfolio-intro]");
  if (intro) intro.textContent = "Selected projects and creative work.";
  document.querySelectorAll(".portfolio-disclaimer").forEach((disclaimer) => { disclaimer.hidden = true; });
  if (preview && !grid) {
    const project = projects[0];
    const image = preview.querySelector("img");
    const label = preview.querySelector(".mini-label");
    const note = document.querySelector(".portfolio-note");
    const safeImage = project.image ? safeImageUrl(project.image) : "";
    if (safeImage && image) { image.src = safeImage; image.alt = `${project.title} portfolio image`; }
    if (label) label.innerHTML = `${escapeHtml(project.category)}<br><b>${escapeHtml(project.title)}</b>`;
    if (note) note.textContent = project.description;
    preview.hidden = false;
    return;
  }
  if (preview) preview.hidden = true;
  if (!grid) return;
  grid.innerHTML = projects.map((project) => {
    const category = mapPortfolioCategory(project.category);
    const safeImage = project.image ? escapeAttribute(safeImageUrl(project.image) || "images/project-placeholder.svg") : "images/project-placeholder.svg";
    const imageAlt = project.image ? `${project.title} portfolio image` : `Placeholder image for ${project.title}`;
    const projectUrl = project.projectUrl ? safeHttpUrl(project.projectUrl) : "";
    return `<article class="project-card" data-category="${category}"><div class="project-cover"><img src="${safeImage}" alt="${escapeAttribute(imageAlt)}" loading="lazy"><span class="project-type">${escapeHtml(project.category)}</span>${project.featured ? "<span class=\"project-placeholder-label\">FEATURED</span>" : ""}</div><div class="project-body"><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.description)}</p>${projectUrl ? `<a href="${escapeAttribute(projectUrl)}" target="_blank" rel="noopener noreferrer">View project ↗</a>` : ""}</div></article>`;
  }).join("");
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function safeImageUrl(value) {
  const url = safeHttpUrl(value);
  if (!url || new URL(url).origin !== window.location.origin && !url.startsWith("https://")) return "";
  return url;
}

function serviceSlug(name) {
  const known = {
    "Web Design & Development": "web-design", Photography: "photography", Videography: "videography",
    "Video Editing": "video-editing", "AI & Automation": "ai-automation", "Other Digital Services": "other-services"
  };
  return known[name] || String(name).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "service";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

async function loadPublicContent() {
  const tasks = [
    ["/api/business", (data) => {
      if (!data) return;
      Object.assign(BUSINESS_CONFIG, {
        name: data.name || BUSINESS_CONFIG.name,
        location: data.location || BUSINESS_CONFIG.location,
        email: data.email || BUSINESS_CONFIG.email,
        phone: data.phone || BUSINESS_CONFIG.phone,
        whatsappNumber: data.whatsappNumber || BUSINESS_CONFIG.whatsappNumber
      });
      document.querySelectorAll("[data-business-name]").forEach((element) => { element.textContent = BUSINESS_CONFIG.name; });
      document.querySelectorAll("[data-business-phone]").forEach((element) => { element.textContent = BUSINESS_CONFIG.phone; });
      document.querySelectorAll("[data-business-email]").forEach((element) => { element.textContent = BUSINESS_CONFIG.email; element.href = `mailto:${BUSINESS_CONFIG.email}`; });
      document.querySelectorAll(".wordmark span").forEach((element) => { element.textContent = BUSINESS_CONFIG.name.replace(/^Okine\s*/i, ""); });
      document.querySelectorAll(".footer-brand .wordmark").forEach((element) => { element.setAttribute("aria-label", BUSINESS_CONFIG.name); });
      setBusinessDetails();
      document.querySelectorAll("[data-profile-image]").forEach((image) => {
        const safeImage = data.profileImage ? safeImageUrl(data.profileImage) : "";
        if (safeImage) {
          image.src = safeImage;
          image.alt = `${BUSINESS_CONFIG.name} portrait`;
          image.closest(".portrait-frame")?.querySelector(".image-label")?.remove();
        }
      });
      document.querySelectorAll("[data-professional-title]").forEach((element) => {
        element.textContent = data.professionalTitle || "";
      });
      document.querySelectorAll("[data-about-description]").forEach((element) => {
        element.textContent = data.aboutDescription || "";
      });
    }],
    ["/api/services", renderDynamicServices],
    ["/api/faqs", renderDynamicFaqs],
    ["/api/portfolio", renderDynamicPortfolio],
    ["/api/social-links", (links) => {
      BUSINESS_CONFIG.socialLinks = { instagram: "", tiktok: "", facebook: "", youtube: "", linkedin: "" };
      links.forEach((link) => {
        const key = link.platform.toLowerCase();
        BUSINESS_CONFIG.socialLinks[key] = link.url;
      });
      setBusinessDetails();
    }],
    ["/api/settings", (settings) => {
      if (!settings) return;
      if (settings.websiteTitle) document.title = settings.websiteTitle;
      const description = document.querySelector('meta[name="description"]');
      if (description && settings.metaDescription) description.content = settings.metaDescription;
      const socialTitle = document.querySelector('meta[property="og:title"]');
      if (socialTitle && settings.websiteTitle) socialTitle.content = settings.websiteTitle;
      const socialDescription = document.querySelector('meta[property="og:description"]');
      if (socialDescription && settings.metaDescription) socialDescription.content = settings.metaDescription;
      document.querySelectorAll(".footer-bottom > span:first-child").forEach((element) => { if (settings.copyrightText) element.textContent = settings.copyrightText; });
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && settings.primaryWebsiteUrl) canonical.href = `${settings.primaryWebsiteUrl.replace(/\/$/, "")}${window.location.pathname}`;
      if (settings.whatsappNumber) BUSINESS_CONFIG.whatsappNumber = settings.whatsappNumber;
      if (settings.contactEmail) BUSINESS_CONFIG.email = settings.contactEmail;
      document.querySelectorAll("[data-whatsapp]").forEach((link) => { link.dataset.whatsappNumber = BUSINESS_CONFIG.whatsappNumber; });
      if (settings.maintenanceMode && !document.body.classList.contains("maintenance-page")) {
        const banner = document.createElement("div");
        banner.className = "maintenance-banner";
        banner.setAttribute("role", "status");
        banner.textContent = "This website is in maintenance mode. Please contact Okine Augustine directly for current information.";
        document.body.prepend(banner);
      }
      setBusinessDetails();
    }]
  ];
  await Promise.allSettled(tasks.map(async ([path, render]) => render(await publicApi(path))));
}

function setupNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".primary-nav");
  if (!toggle || !nav) return;
  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
    nav.classList.remove("is-open");
  };
  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    nav.classList.toggle("is-open", isOpen);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function setupWhatsAppLinks() {
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openWhatsApp(link.dataset.whatsapp || `Hello ${BUSINESS_CONFIG.name}, I would like to get in touch.`);
    });
  });
  document.querySelectorAll("[data-whatsapp-service]").forEach((link) => {
    link.href = "#contact";
  });
}

function setupForms() {
  document.querySelectorAll("form[data-request-form]").forEach((form) => {
    const status = form.querySelector("[data-form-status]");
    const kind = form.dataset.requestForm;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      submitPublicRequest(form, kind, status);
    });
    const whatsappButton = form.querySelector("[data-form-whatsapp]");
    if (whatsappButton) {
      whatsappButton.addEventListener("click", () => {
        if (!form.reportValidity()) return;
        openWhatsApp(buildRequestMessage(form, kind));
      });
    }
  });
  document.querySelectorAll("form[data-contact-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const status = form.querySelector("[data-form-status]");
      const payload = Object.fromEntries(new FormData(form).entries());
      try {
        await publicApi("/api/contact-requests", { method: "POST", body: JSON.stringify(payload) });
        status.textContent = "Your message was received. Okine Augustine will review it.";
        form.reset();
      } catch (error) {
        status.textContent = `${error.message} Your message was not sent; use WhatsApp below instead.`;
      }
      status.setAttribute("role", "status");
    });
    form.querySelector("[data-contact-form-whatsapp]")?.addEventListener("click", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      const message = [`Hello ${BUSINESS_CONFIG.name}, I have a question.`, `Name: ${data.name}`, `Email: ${data.email}`, data.phone ? `Phone: ${data.phone}` : "", `Message: ${data.message}`].filter(Boolean).join("\n");
      openWhatsApp(message);
    });
  });
}

async function submitPublicRequest(form, kind, status) {
  const payload = Object.fromEntries(new FormData(form).entries());
  const endpoint = kind === "booking" ? "/api/bookings" : "/api/quote-requests";
  try {
    const result = await publicApi(endpoint, { method: "POST", body: JSON.stringify(payload) });
    if (status) status.textContent = kind === "booking" ? "Your request was received and will be reviewed before confirmation." : "Your quote request was received.";
    form.reset();
    if (result.status === "Pending") window.dispatchEvent(new CustomEvent("oa:request-submitted", { detail: { kind } }));
  } catch (error) {
    if (status) status.textContent = `${error.message} Your request was not sent; use the WhatsApp option below instead.`;
  }
  status?.setAttribute("role", "status");
}

function setupPortfolioFilters() {
  const controls = document.querySelectorAll("[data-filter]");
  if (!controls.length) return;
  controls.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      controls.forEach((control) => control.setAttribute("aria-pressed", String(control === button)));
      document.querySelectorAll("#portfolio-grid [data-category]").forEach((project) => {
        project.hidden = filter !== "all" && project.dataset.category !== filter;
      });
    });
  });
}

function setupPortfolioProjectLinks() {
  document.querySelectorAll(".project-card[data-project-url]").forEach((card) => {
    const projectUrl = card.dataset.projectUrl.trim();
    if (!projectUrl) return;
    let url;
    try {
      url = new URL(projectUrl, window.location.href);
    } catch {
      return;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    const link = document.createElement("a");
    link.className = "project-link";
    link.href = url.href;
    link.textContent = "View project ↗";
    if (url.origin !== window.location.origin) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    card.querySelector(".project-body")?.append(link);
  });
}

function setupAssistant() {
  const dialog = document.querySelector("#assistant-dialog");
  const trigger = document.querySelector(".assistant-trigger");
  const close = document.querySelector(".dialog-close");
  if (!dialog || !trigger) return;
  trigger.addEventListener("click", () => dialog.showModal());
  close?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setBusinessDetails();
  setupNavigation();
  setupWhatsAppLinks();
  setupForms();
  setupPortfolioFilters();
  setupPortfolioProjectLinks();
  setupAssistant();
  loadPublicContent();
});