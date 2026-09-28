"use strict";

const API_BASE = window.PUBLIC_API_BASE_URL || "";
const state = { section: "overview", admin: null, dialogMode: "", resource: "", recordId: "", rows: [] };
const content = document.querySelector("#section-content");
const dialog = document.querySelector("#editor-dialog");
const editorForm = document.querySelector("#editor-form");

const labels = {
  overview: "Dashboard", services: "Services", portfolio: "Portfolio", faqs: "FAQs", bookings: "Bookings",
  "quote-requests": "Quote Requests", "contact-requests": "Contact Requests", customers: "Customers",
  business: "Business Information", settings: "Website Settings", "social-links": "Social Links", media: "Media", account: "Admin Account"
};

const schema = {
  services: { title: "Service", fields: [
    ["name", "Service Name", "text", true], ["shortDescription", "Short Description", "textarea", true],
    ["fullDescription", "Full Description", "textarea"], ["category", "Category", "text"], ["image", "Service Image URL or relative path", "text"],
    ["price", "Price (leave empty if unknown)", "number"], ["priceType", "Price Type", "select", true, ["Fixed Price", "Starting From", "Contact for Quote"]],
    ["active", "Active", "checkbox"], ["displayOrder", "Display Order", "number"]
  ] },
  portfolio: { title: "Portfolio Project", fields: [
    ["title", "Project Title", "text", true], ["category", "Category", "select", true, ["Web Design", "Photography", "Videography", "Video Editing", "AI & Automation", "Other"]],
    ["description", "Description", "textarea", true], ["image", "Image URL or relative path", "text"], ["projectUrl", "Project URL", "url"], ["date", "Date", "date"],
    ["featured", "Featured", "checkbox"], ["active", "Active", "checkbox"]
  ] },
  faqs: { title: "FAQ", fields: [
    ["question", "Question", "text", true], ["answer", "Answer", "textarea", true], ["category", "Category", "text"],
    ["keywords", "Keywords (comma separated)", "text"], ["active", "Active", "checkbox"], ["displayOrder", "Display Order", "number"]
  ] },
  customers: { title: "Customer", fields: [
    ["name", "Name", "text", true], ["phone", "Phone", "tel"], ["email", "Email", "email"],
    ["location", "Location", "text"], ["notes", "Notes", "textarea"], ["status", "Status", "select", true, ["Active", "Inactive"]]
  ] },
  "social-links": { title: "Social Link", fields: [
    ["platform", "Platform", "select", true, ["Instagram", "TikTok", "Facebook", "YouTube", "LinkedIn"]],
    ["url", "URL", "url"], ["active", "Active", "checkbox"]
  ] }
};

const statusOptions = {
  bookings: ["Pending", "Reviewed", "Confirmed", "Cancelled", "Completed"],
  "quote-requests": ["Pending", "Reviewing", "Quoted", "Accepted", "Rejected", "Completed"],
  "contact-requests": ["New", "Read", "Replied", "Closed"]
};

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.headers || {}), ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}) }
  });
  let payload;
  try { payload = await response.json(); } catch { payload = { success: false, message: "The server returned an unreadable response." }; }
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  document.querySelector("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formField([name, label, type = "text", required = false, options = []], value = "") {
  const requiredMark = required ? " *" : "";
  if (type === "checkbox") return `<label class="check-row"><input name="${name}" type="checkbox" ${value ? "checked" : ""}> ${label}</label>`;
  if (type === "textarea") return `<label class="wide">${label}${requiredMark}<textarea name="${name}" ${required ? "required" : ""}>${esc(value)}</textarea></label>`;
  if (type === "select") return `<label>${label}${requiredMark}<select name="${name}" ${required ? "required" : ""}>${options.map((option) => `<option ${String(value) === option ? "selected" : ""}>${esc(option)}</option>`).join("")}</select></label>`;
  const inputType = ["number", "date", "email", "url", "tel"].includes(type) ? type : "text";
  const inputValue = type === "date" && value ? String(value).slice(0, 10) : value ?? "";
  return `<label>${label}${requiredMark}<input name="${name}" type="${inputType}" value="${esc(inputValue)}" ${type === "number" ? "min=\"0\" step=\"any\"" : ""} ${required ? "required" : ""}></label>`;
}

function bindNavigation() {
  document.querySelectorAll("[data-section]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-section]").forEach((item) => item.classList.toggle("active", item === button));
    state.section = button.dataset.section;
    document.querySelector("#current-section-label").textContent = labels[state.section];
    document.querySelector("#sidebar").classList.remove("open");
    renderSection();
  }));
  document.querySelector("#sidebar-toggle").addEventListener("click", () => document.querySelector("#sidebar").classList.toggle("open"));
  document.addEventListener("click", (event) => {
    const sidebar = document.querySelector("#sidebar");
    if (window.innerWidth <= 720 && sidebar.classList.contains("open") && !sidebar.contains(event.target) && !event.target.closest("#sidebar-toggle")) sidebar.classList.remove("open");
  });
}

async function openApp(admin) {
  state.admin = admin;
  document.querySelector("#login-view").hidden = true;
  document.querySelector("#app-view").hidden = false;
  await refreshNotifications();
  await renderSection();
  window.clearInterval(state.notificationTimer);
  state.notificationTimer = window.setInterval(refreshNotifications, 60000);
}

function showLogin(message = "") {
  window.clearInterval(state.notificationTimer);
  document.querySelector("#login-view").hidden = false;
  document.querySelector("#app-view").hidden = true;
  document.querySelector("#login-message").textContent = message;
}

async function refreshNotifications() {
  try {
    const overview = await api("/admin/overview");
    const counts = { bookings: overview.counts.pendingBookings, quotes: overview.counts.pendingQuotes, contacts: overview.counts.pendingContacts };
    Object.entries(counts).forEach(([key, count]) => {
      const node = document.querySelector(`[data-count="${key}"]`);
      if (node) node.textContent = count ? `(${count})` : "";
    });
  } catch { /* Navigation stays usable; each section reports its own API state. */ }
}

function sectionHeader(title, description, action = "") {
  return `<div class="section-head"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${action ? `<div class="section-actions">${action}</div>` : ""}</div>`;
}

async function renderSection() {
  content.setAttribute("aria-busy", "true");
  try {
    const renderer = {
      overview: renderOverview,
      services: () => renderResource("services"), portfolio: () => renderResource("portfolio"), faqs: () => renderResource("faqs"),
      bookings: () => renderResource("bookings"), "quote-requests": () => renderResource("quote-requests"),
      "contact-requests": () => renderResource("contact-requests"), customers: () => renderResource("customers"),
      business: renderBusiness, settings: renderSettings, "social-links": () => renderResource("social-links"), media: renderMedia, account: renderAccount
    };
    await renderer[state.section]();
  } catch (error) {
    content.innerHTML = `${sectionHeader(labels[state.section], "Manage your website information.")}<div class="panel"><div class="empty-state">${esc(error.message)}${error.status === 401 ? " Sign in again to continue." : ""}</div></div>`;
    if (error.status === 401) showLogin("Your session has ended. Sign in again.");
  } finally { content.setAttribute("aria-busy", "false"); }
}

async function renderOverview() {
  const overview = await api("/admin/overview");
  const { counts, recent } = overview;
  const metrics = [["Total Services", counts.services, "⌘"], ["Portfolio Projects", counts.portfolio, "▧"], ["Pending Bookings", counts.pendingBookings, "◷"], ["Pending Quote Requests", counts.pendingQuotes, "↗"], ["Total Customers", counts.customers, "♙"], ["Total FAQs", counts.faqs, "?"]];
  const card = (title, items, label) => `<section class="panel"><div class="panel-head"><h2>${title}</h2><button class="text-button" data-go="${label}">View all</button></div><div class="recent-list">${items.length ? items.map((item) => `<div class="recent-row"><span><b>${esc(item.customerName || item.name || item.question || item.email)}</b><small>${esc(item.service || item.email || item.status || "")}</small></span><small>${formatDate(item.createdAt)}</small></div>`).join("") : "<div class=\"empty-state\">No data available.</div>"}</div></section>`;
  content.innerHTML = `${sectionHeader("Dashboard", "A current view of your content and incoming requests.")}<div class="metrics-grid">${metrics.map(([label, value, mark]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><i class="metric-mark">${mark}</i></article>`).join("")}</div><div class="overview-columns">${card("Recent Bookings", recent.bookings, "bookings")}${card("Recent Quote Requests", recent.quotes, "quote-requests")}${card("Recent Contact Requests", recent.contacts, "contact-requests")}</div>`;
  content.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => document.querySelector(`[data-section="${button.dataset.go}"]`).click()));
}

function tableCell(item, field) {
  if (field === "createdAt" || field === "updatedAt" || field === "date" || field === "preferredDate" || field === "preferredCompletionDate" || field === "firstContact" || field === "lastContact") return formatDate(item[field]);
  return item[field] == null || item[field] === "" ? "—" : esc(item[field]);
}

function resourceColumns(resource) {
  return ({
    services: [["name", "Service"], ["category", "Category"], ["priceType", "Price type"], ["price", "Price"], ["active", "Active"], ["displayOrder", "Order"]],
    portfolio: [["title", "Project"], ["category", "Category"], ["date", "Date"], ["featured", "Featured"], ["active", "Active"]],
    faqs: [["question", "Question"], ["category", "Category"], ["active", "Active"], ["displayOrder", "Order"]],
    bookings: [["customerName", "Customer"], ["phone", "Phone"], ["service", "Service"], ["preferredDate", "Preferred date"], ["createdAt", "Received"], ["status", "Status"]],
    "quote-requests": [["customerName", "Customer"], ["phone", "Phone"], ["email", "Email"], ["service", "Service"], ["location", "Location"], ["createdAt", "Received"], ["status", "Status"]],
    "contact-requests": [["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["createdAt", "Received"], ["status", "Status"]],
    customers: [["name", "Customer"], ["phone", "Phone"], ["email", "Email"], ["location", "Location"], ["lastContact", "Last contact"], ["status", "Status"]],
    "social-links": [["platform", "Platform"], ["url", "URL"], ["active", "Active"]]
  })[resource];
}

async function renderResource(resource, filter = {}) {
  const query = new URLSearchParams(Object.entries(filter).filter(([, value]) => value));
  const rows = await api(`/admin/${resource}${query.size ? `?${query}` : ""}`);
  state.rows = rows;
  const columns = resourceColumns(resource);
  const canEdit = Boolean(schema[resource]);
  const canCreate = canEdit && resource !== "social-links";
  const add = canCreate ? `<button class="button primary" data-add>Add ${schema[resource].title}</button>` : "";
  const search = resource === "services" || resource === "faqs" || resource === "social-links" ? "" : `<input class="toolbar-control search-control" id="resource-search" type="search" value="${esc(filter.search || "")}" placeholder="Search ${labels[resource].toLowerCase()}…" aria-label="Search ${labels[resource].toLowerCase()}">`;
  const statuses = statusOptions[resource];
  const filters = `${search}${statuses ? `<select id="status-filter" class="toolbar-control" aria-label="Filter by status"><option value="">All statuses</option>${statuses.map((status) => `<option ${filter.status === status ? "selected" : ""}>${status}</option>`).join("")}</select>` : ""}${resource === "portfolio" ? `<select id="category-filter" class="toolbar-control" aria-label="Filter by category"><option value="">All categories</option>${schema.portfolio.fields.find(([name]) => name === "category")[4].map((category) => `<option ${filter.category === category ? "selected" : ""}>${category}</option>`).join("")}</select>` : ""}`;
  const showDetails = ["bookings", "quote-requests", "contact-requests"].includes(resource);
  const actions = `<div class="row-actions">${showDetails ? `<button class="text-button" data-detail="${esc(resource)}" data-id="{{id}}">Details</button>` : ""}${canEdit ? `<button class="text-button" data-edit="${resource}" data-id="{{id}}">Edit</button>` : ""}${resource !== "social-links" ? `<button class="text-button delete" data-delete="${resource}" data-id="{{id}}">Delete</button>` : ""}${resource === "quote-requests" ? `<button class="text-button" data-contact-whatsapp="{{id}}">WhatsApp</button>` : ""}</div>`;
  content.innerHTML = `${sectionHeader(labels[resource], sectionDescription(resource), add)}<div class="toolbar">${filters}</div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr>${columns.map(([, label]) => `<th>${label}</th>`).join("")}<th>Actions</th></tr></thead><tbody id="table-body"></tbody></table></div><div class="empty-inline" id="empty-inline" hidden>No data available.</div></section>`;
  drawRows(resource, rows, columns, actions);
  content.querySelector("[data-add]")?.addEventListener("click", () => openEditor(resource));
  bindRowActions(resource);
  const rerender = async () => {
    const filters = { search: content.querySelector("#resource-search")?.value || "", status: content.querySelector("#status-filter")?.value || "", category: content.querySelector("#category-filter")?.value || "" };
    const selection = content.querySelector("#resource-search")?.selectionStart;
    await renderResource(resource, filters);
    const searchInput = content.querySelector("#resource-search");
    if (searchInput) { searchInput.focus(); if (selection !== null) searchInput.setSelectionRange(selection, selection); }
  };
  content.querySelector("#resource-search")?.addEventListener("input", debounce(rerender, 220));
  content.querySelector("#status-filter")?.addEventListener("change", rerender);
  content.querySelector("#category-filter")?.addEventListener("change", rerender);
}

function sectionDescription(resource) {
  return ({ services: "Edit the services shown on your public website. Empty prices display as Contact for a Quote.", portfolio: "Publish only genuine work you have permission to show.", faqs: "Manage the answers visitors see on your website.", bookings: "Review booking requests. No appointment is confirmed automatically.", "quote-requests": "Review enquiries and follow up directly with customers.", "contact-requests": "Track general contact form submissions.", customers: "Customer details are matched by phone or email when provided.", "social-links": "Only active, valid profiles are shown publicly." })[resource] || "Manage website records.";
}

function debounce(callback, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => callback(...args), delay); };
}

function drawRows(resource, rows, columns, actions) {
  const body = content.querySelector("#table-body");
  const empty = content.querySelector("#empty-inline");
  if (!rows.length) { body.innerHTML = ""; empty.hidden = false; return; }
  empty.hidden = true;
  body.innerHTML = rows.map((item) => `<tr data-row-id="${esc(item._id)}">${columns.map(([field]) => {
    if (field === "status" && statusOptions[resource]) return `<td><select class="status-select" data-status-resource="${resource}" data-id="${esc(item._id)}" aria-label="Update status">${statusOptions[resource].map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></td>`;
    if (field === "active" || field === "featured") return `<td>${item[field] ? "Yes" : "No"}</td>`;
    if (field === "question" || field === "title" || field === "customerName" || field === "name") return `<td><strong>${tableCell(item, field)}</strong></td>`;
    if (field === "url" && item.url) return `<td><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Open ↗</a></td>`;
    return `<td>${tableCell(item, field)}</td>`;
  }).join("")}<td>${actions.replaceAll("{{id}}", esc(item._id))}</td></tr>`).join("");
}

function bindRowActions(resource) {
  content.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openEditor(resource, button.dataset.id)));
  content.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteRecord(button.dataset.delete, button.dataset.id)));
  content.querySelectorAll("[data-detail]").forEach((button) => button.addEventListener("click", () => showRecordDetails(button.dataset.detail, button.dataset.id)));
  content.querySelectorAll("[data-status-resource]").forEach((select) => select.addEventListener("change", () => updateStatus(select.dataset.statusResource, select.dataset.id, select.value)));
  content.querySelectorAll("[data-contact-whatsapp]").forEach((button) => button.addEventListener("click", () => contactQuote(button.dataset.contactWhatsapp)));
}

async function updateStatus(resource, id, status) {
  try { await api(`/admin/${resource}/${id}`, { method: "PUT", body: JSON.stringify({ status }) }); showToast("Status updated."); await refreshNotifications(); }
  catch (error) { showToast(error.message, true); await renderSection(); }
}

async function deleteRecord(resource, id) {
  const item = state.rows.find((row) => row._id === id);
  const name = item?.name || item?.title || item?.question || item?.customerName || labels[resource].toLowerCase().slice(0, -1);
  if (!window.confirm(`Delete “${name}”? This action cannot be undone.`)) return;
  try { await api(`/admin/${resource}/${id}`, { method: "DELETE" }); showToast("Record deleted."); await refreshNotifications(); await renderSection(); }
  catch (error) { showToast(error.message, true); }
}

function showRecordDetails(resource, id) {
  const item = state.rows.find((row) => row._id === id);
  if (!item) return;
  const lines = Object.entries(item).filter(([key]) => !["_id", "__v", "customer", "updatedAt"].includes(key)).map(([key, value]) => `<p><b>${esc(key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`))}:</b> ${esc(Array.isArray(value) ? value.join(", ") : value && typeof value === "object" ? formatDate(value) : value || "—")}</p>`).join("");
  document.querySelector("#editor-kicker").textContent = labels[resource].toUpperCase();
  document.querySelector("#editor-title").textContent = "Request details";
  document.querySelector("#editor-fields").innerHTML = `<div class="detail-content">${lines}</div>`;
  document.querySelector("#editor-message").textContent = "";
  document.querySelector(".dialog-actions").hidden = true;
  editorForm.dataset.mode = "details";
  dialog.showModal();
}

function openEditor(resource, id = "") {
  const definition = schema[resource];
  if (!definition) return;
  const item = state.rows.find((row) => row._id === id) || {
    active: ["services", "portfolio", "faqs", "customers"].includes(resource),
    displayOrder: resource === "services" || resource === "faqs" ? state.rows.length : 0,
    status: "Active"
  };
  state.resource = resource;
  state.recordId = id;
  document.querySelector("#editor-kicker").textContent = labels[resource].toUpperCase();
  document.querySelector("#editor-title").textContent = `${id ? "Edit" : "Add"} ${definition.title}`;
  document.querySelector("#editor-message").textContent = "";
  document.querySelector(".dialog-actions").hidden = false;
  editorForm.dataset.mode = "edit";
  document.querySelector("#editor-fields").innerHTML = definition.fields.map((field) => formField(field, field[0] === "keywords" ? (item.keywords || []).join(", ") : item[field[0]])).join("");
  dialog.showModal();
  document.querySelector("#editor-fields input, #editor-fields textarea, #editor-fields select")?.focus();
}

function editorValues() {
  const definition = schema[state.resource];
  const values = {};
  for (const [name, , type] of definition.fields) {
    const input = editorForm.elements.namedItem(name);
    if (type === "checkbox") values[name] = input.checked;
    else if (name === "keywords") values[name] = input.value.split(",").map((item) => item.trim()).filter(Boolean);
    else if (name === "price") values[name] = input.value === "" ? null : Number(input.value);
    else if (type === "date") values[name] = input.value || null;
    else if (name === "displayOrder") values[name] = input.value === "" ? 0 : Number(input.value);
    else values[name] = input.value.trim();
  }
  return values;
}

editorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (editorForm.dataset.mode !== "edit") return;
  const values = editorValues();
  const endpoint = `/admin/${state.resource}${state.recordId ? `/${state.recordId}` : ""}`;
  try {
    await api(endpoint, { method: state.recordId ? "PUT" : "POST", body: JSON.stringify(values) });
    dialog.close(); showToast("Changes saved."); await refreshNotifications(); await renderSection();
  } catch (error) { document.querySelector("#editor-message").textContent = error.message; }
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => dialog.close()));
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

async function renderBusiness() {
  const data = await api("/admin/business");
  const fields = [["name", "Business / Professional Name", "text"], ["professionalTitle", "Professional Title", "text"], ["aboutDescription", "About Description", "textarea"], ["location", "Location", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["whatsappNumber", "WhatsApp Number (include country code)", "tel"], ["profileImage", "Profile Image URL", "url"]];
  content.innerHTML = `${sectionHeader("Business Information", "These details are shared with the public website and API.")}<form class="content-form" id="business-form"><h2>Professional profile</h2><div class="form-grid">${fields.map((field) => formField(field, data?.[field[0]])).join("")}</div><button class="button primary" type="submit">Save information</button><p class="form-message" id="business-message" role="status"></p></form>`;
  content.querySelector("#business-form").addEventListener("submit", (event) => saveSimpleForm(event, "/admin/business", "business-message"));
}

async function renderSettings() {
  const data = await api("/admin/settings");
  const fields = [["websiteTitle", "Website Title", "text"], ["metaDescription", "Meta Description", "textarea"], ["whatsappNumber", "WhatsApp Number", "tel"], ["contactEmail", "Contact Email", "email"], ["copyrightText", "Copyright Text", "text"], ["googleAnalyticsId", "Google Analytics ID (optional)", "text"], ["primaryWebsiteUrl", "Primary Website URL", "url"]];
  content.innerHTML = `${sectionHeader("Website Settings", "Configure public metadata and behavior. No secret credentials are stored here.")}<form class="content-form" id="settings-form"><h2>Public website</h2><div class="form-grid">${fields.map((field) => formField(field, data?.[field[0]])).join("")}<label class="check-row wide"><input name="maintenanceMode" type="checkbox" ${data?.maintenanceMode ? "checked" : ""}> Maintenance Mode</label></div><button class="button primary" type="submit">Save settings</button><p class="form-message" id="settings-message" role="status"></p></form>`;
  content.querySelector("#settings-form").addEventListener("submit", (event) => saveSimpleForm(event, "/admin/settings", "settings-message"));
}

async function saveSimpleForm(event, endpoint, messageId) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll('input[type="checkbox"]').forEach((input) => { values[input.name] = input.checked; });
  try { await api(endpoint, { method: "PUT", body: JSON.stringify(values) }); showToast("Changes saved."); document.querySelector(`#${messageId}`).textContent = "Saved."; }
  catch (error) { document.querySelector(`#${messageId}`).textContent = error.message; }
}

async function renderAccount() {
  const account = await api("/admin/account");
  content.innerHTML = `${sectionHeader("Admin Account", "Manage your sign-in email and password.")}<form class="content-form" id="account-form"><h2>Login credentials</h2><div class="form-grid"><label>Email<input name="email" type="email" value="${esc(account.email)}" autocomplete="username" required></label><label>Current password (required to change password)<input name="currentPassword" type="password" autocomplete="current-password"></label><label>New password<input name="newPassword" type="password" minlength="12" autocomplete="new-password"><small class="helper-text">Use at least 12 characters. Leave blank to keep the current password.</small></label></div><button class="button primary" type="submit">Update account</button><p class="form-message" id="account-message" role="status"></p></form>`;
  content.querySelector("#account-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries());
    try { const result = await api("/admin/account", { method: "PUT", body: JSON.stringify(values) }); state.admin = result; showToast("Account updated."); form.querySelector("#account-message").textContent = "Saved."; }
    catch (error) { form.querySelector("#account-message").textContent = error.message; }
  });
}

async function renderMedia() {
  const [rows, storage] = await Promise.all([api("/admin/media"), api("/admin/media/storage-status")]);
  const requirement = storage.configured ? "Cloudflare R2 is configured. Uploads can be enabled." : `Uploads are unavailable. Configure these environment values first: ${storage.missing.join(", ")}. No file has been uploaded.`;
  const items = rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>File</th><th>Type</th><th>Size</th><th>Added</th><th>URL</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${esc(row.originalName)}</strong></td><td>${esc(row.mediaType)}</td><td>${(row.size / 1024).toFixed(0)} KB</td><td>${formatDate(row.createdAt)}</td><td><a href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">Open ↗</a></td></tr>`).join("")}</tbody></table></div>` : "<div class=\"empty-state\">No data available.</div>";
  content.innerHTML = `${sectionHeader("Media", "Manage images hosted in object storage.")}<div class="notification-strip">${esc(requirement)}</div><form class="content-form" id="upload-form" enctype="multipart/form-data"><h2>Upload image</h2><div class="form-grid"><label>Image file<input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/avif" required><small class="helper-text">JPEG, PNG, WebP or AVIF. Maximum size: 5 MB.</small></label><label>Media type<select name="mediaType" required><option>Profile image</option><option>Portfolio image</option><option>Service image</option><option>Other website image</option></select></label></div><button class="button primary" type="submit" ${storage.configured ? "" : "disabled"}>Upload image</button><p class="form-message" id="media-message" role="status"></p></form><section class="panel" style="margin-top:16px"><div class="panel-head"><h2>Uploaded images</h2></div>${items}</section>`;
  content.querySelector("#upload-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const formData = new FormData(event.currentTarget);
    try { await api("/admin/media/upload", { method: "POST", body: formData }); showToast("Image uploaded."); await renderMedia(); }
    catch (error) { content.querySelector("#media-message").textContent = error.message; }
  });
}

async function contactQuote(id) {
  const quote = state.rows.find((row) => row._id === id);
  if (!quote) return;
  const popup = window.open("about:blank", "_blank");
  if (!popup) return showToast("Allow pop-ups to open WhatsApp for this request.", true);
  const business = await api("/business").catch(() => null);
  const settings = await api("/settings").catch(() => null);
  const number = (settings?.whatsappNumber || business?.whatsappNumber || "").replace(/\D/g, "");
  if (!number) { popup.close(); return showToast("Add a WhatsApp number in Website Settings first.", true); }
  const message = `Hello ${quote.customerName}, thank you for asking about ${quote.service}. I would like to discuss your project request.`;
  popup.location = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

async function logout() {
  try { await api("/admin/logout", { method: "POST" }); } catch { /* Clear local UI if the session already expired. */ }
  showLogin("You have been logged out.");
}

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#login-message");
  message.textContent = "Signing in…";
  try {
    const result = await api("/admin/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
    form.reset();
    await openApp(result);
  } catch (error) { message.textContent = error.message; }
});

document.querySelector("#logout-button").addEventListener("click", logout);
bindNavigation();

api("/admin/session").then(openApp).catch((error) => {
  if (error.status === 503) showLogin(error.message);
  else showLogin("");
});