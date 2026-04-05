(function () {
  const root = document.querySelector("[data-gp-app]");
  if (!root) return;

  const ALLOWED_STATUSES = ["Aprovar", "Iniciar", "Desenvolvimento"];
  const ALL_STATUSES = ["Aprovar", "Iniciar", "Desenvolvimento", "Homologação", "Finalizado", "Cancelado"];
  const PRIORITIES = ["Baixa", "Media", "Alta", "Critica"];
  const STATUS_CLASS = {
    Aprovar: "is-approve",
    Iniciar: "is-start",
    Desenvolvimento: "is-progress"
  };
  const PRIORITY_CLASS = {
    Baixa: "is-low",
    Media: "is-medium",
    Alta: "is-high",
    Critica: "is-critical"
  };
  const VIEW = { boot: "boot", guest: "guest", mfa: "mfa", private: "private" };

  const refs = {
    publicShell: document.querySelector("[data-gp-public-shell]"),
    boot: root.querySelector("[data-boot-state]"),
    guest: root.querySelector("[data-guest-view]"),
    loginModal: root.querySelector("[data-login-modal]"),
    loginOpenButton: root.querySelector("[data-login-open-button]"),
    loginCloseButton: root.querySelector("[data-login-close-button]"),
    mfa: root.querySelector("[data-mfa-view]"),
    privateTemplate: root.querySelector("[data-private-template]"),
    private: root.querySelector("[data-private-view]"),
    configAlert: root.querySelector("[data-config-alert]"),
    loginForm: root.querySelector("[data-login-form]"),
    loginSubmit: root.querySelector("[data-login-submit]"),
    loginFeedback: root.querySelector("[data-login-feedback]"),
    mfaTitle: root.querySelector("[data-mfa-title]"),
    mfaDescription: root.querySelector("[data-mfa-description]"),
    mfaEnrollPanel: root.querySelector("[data-mfa-enroll-panel]"),
    mfaChallengePanel: root.querySelector("[data-mfa-challenge-panel]"),
    mfaQrImage: root.querySelector("[data-mfa-qr-image]"),
    mfaQrFallback: root.querySelector("[data-mfa-qr-fallback]"),
    mfaSecret: root.querySelector("[data-mfa-secret]"),
    mfaEnrollForm: root.querySelector("[data-mfa-enroll-form]"),
    mfaEnrollSubmit: root.querySelector("[data-mfa-enroll-submit]"),
    mfaChallengeForm: root.querySelector("[data-mfa-challenge-form]"),
    mfaChallengeSubmit: root.querySelector("[data-mfa-challenge-submit]"),
    mfaFeedback: root.querySelector("[data-mfa-feedback]"),
    companyName: null,
    userSummary: null,
    roleChip: null,
    mfaChip: null,
    sessionChip: null,
    scopeSummary: null,
    recordSummary: null,
    refreshButton: null,
    logoutButton: null,
    retryButton: null,
    searchInput: null,
    statusFilter: null,
    priorityFilter: null,
    ownerFilter: null,
    visibleCounter: null,
    dashboardFeedback: null,
    loading: null,
    empty: null,
    tableWrap: null,
    tableBody: null,
    mobileList: null,
    kpiVisible: null,
    kpiApprove: null,
    kpiStart: null,
    kpiProgress: null,
    adminPanel: null,
    adminForm: null,
    adminRecordSelect: null,
    adminSaveSubmit: null,
    adminResetButton: null,
    adminDeleteButton: null,
    adminFeedback: null,
    adminActionsHead: null
  };

  const state = {
    client: null,
    session: null,
    profile: null,
    demandas: [],
    adminDemandas: [],
    visible: [],
    aal: { currentLevel: "aal1", nextLevel: "aal1" },
    mfa: { factorId: null, qrCode: "", secret: "", verified: [] },
    filters: { search: "", status: "Todos", priority: "Todas", owner: "Todos" },
    authBusy: false,
    loginModalClosableAt: 0,
    syncInFlight: null,
    suppressSignedOutEvent: false
  };

  const hide = (el, yes) => el && (el.hidden = yes);
  const isAdmin = () => Boolean(
    state.profile
    && state.profile.role === "admin"
    && String(state.profile.email || "").toLowerCase() === "aensistemas@gmail.com"
  );
  const mfaRequired = () => Boolean(state.profile && state.profile.mfa_required);
  const esc = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const roleLabel = (value) => ({ gp: "GP", consultor: "Consultor", admin: "Admin" }[value] || "Sem papel");
  const priorityLabel = (value) => ({ Media: "Média", Critica: "Crítica" }[value] || value || "Média");
  const shortText = (value) => (String(value || "").trim() || "Sem descrição").slice(0, 170).replace(/\s+/g, " ");
  const hour = (value) => Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: Number(value || 0) % 1 ? 1 : 0,
    maximumFractionDigits: 1
  }) + "h";
  const dateTime = (value) => !value
    ? "Sem data"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

  function setView(view) {
    hide(refs.publicShell, view !== VIEW.guest);
    hide(refs.boot, view !== VIEW.boot);
    hide(refs.guest, view !== VIEW.guest);
    hide(refs.mfa, view !== VIEW.mfa);
    hide(refs.private, view !== VIEW.private);
    if (view !== VIEW.guest) closeLoginModal();
  }

  function refreshPrivateRefs() {
    refs.companyName = root.querySelector("[data-company-name]");
    refs.userSummary = root.querySelector("[data-user-summary]");
    refs.roleChip = root.querySelector("[data-role-chip]");
    refs.mfaChip = root.querySelector("[data-mfa-chip]");
    refs.sessionChip = root.querySelector("[data-session-chip]");
    refs.scopeSummary = root.querySelector("[data-scope-summary]");
    refs.recordSummary = root.querySelector("[data-record-summary]");
    refs.refreshButton = root.querySelector("[data-refresh-button]");
    refs.logoutButton = root.querySelector("[data-logout-button]");
    refs.retryButton = root.querySelector("[data-retry-button]");
    refs.searchInput = root.querySelector("[data-search-input]");
    refs.statusFilter = root.querySelector("[data-status-filter]");
    refs.priorityFilter = root.querySelector("[data-priority-filter]");
    refs.ownerFilter = root.querySelector("[data-owner-filter]");
    refs.visibleCounter = root.querySelector("[data-visible-counter]");
    refs.dashboardFeedback = root.querySelector("[data-dashboard-feedback]");
    refs.loading = root.querySelector("[data-loading-state]");
    refs.empty = root.querySelector("[data-empty-state]");
    refs.tableWrap = root.querySelector("[data-table-wrap]");
    refs.tableBody = root.querySelector("[data-demandas-body]");
    refs.mobileList = root.querySelector("[data-mobile-list]");
    refs.kpiVisible = root.querySelector("[data-kpi-visible]");
    refs.kpiApprove = root.querySelector("[data-kpi-approve]");
    refs.kpiStart = root.querySelector("[data-kpi-start]");
    refs.kpiProgress = root.querySelector("[data-kpi-progress]");
    refs.adminPanel = root.querySelector("[data-admin-panel]");
    refs.adminForm = root.querySelector("[data-admin-form]");
    refs.adminRecordSelect = root.querySelector("[data-admin-record-select]");
    refs.adminSaveSubmit = root.querySelector("[data-admin-save-submit]");
    refs.adminResetButton = root.querySelector("[data-admin-reset-button]");
    refs.adminDeleteButton = root.querySelector("[data-admin-delete-button]");
    refs.adminFeedback = root.querySelector("[data-admin-feedback]");
    refs.adminActionsHead = root.querySelector("[data-admin-actions-head]");
  }

  function clearPrivateView() {
    if (refs.private) {
      refs.private.innerHTML = "";
      delete refs.private.dataset.bound;
      delete refs.private.dataset.rendered;
      hide(refs.private, true);
    }
    refreshPrivateRefs();
  }

  function bindPrivateEvents() {
    if (!refs.private || refs.private.dataset.bound === "true") return;
    if (refs.logoutButton) refs.logoutButton.addEventListener("click", handleLogout);
    if (refs.refreshButton) refs.refreshButton.addEventListener("click", loadDashboard);
    if (refs.retryButton) refs.retryButton.addEventListener("click", loadDashboard);
    if (refs.searchInput) refs.searchInput.addEventListener("input", function (event) {
      state.filters.search = event.target.value || "";
      applyFilters();
    });
    if (refs.statusFilter) refs.statusFilter.addEventListener("change", function (event) {
      state.filters.status = event.target.value || "Todos";
      applyFilters();
    });
    if (refs.priorityFilter) refs.priorityFilter.addEventListener("change", function (event) {
      state.filters.priority = event.target.value || "Todas";
      applyFilters();
    });
    if (refs.ownerFilter) refs.ownerFilter.addEventListener("change", function (event) {
      state.filters.owner = event.target.value || "Todos";
      applyFilters();
    });
    if (refs.adminForm) refs.adminForm.addEventListener("submit", saveAdminDemand);
    if (refs.adminResetButton) refs.adminResetButton.addEventListener("click", function () {
      clearAdminForm("Formulário pronto para uma nova demanda.", "info");
    });
    if (refs.adminDeleteButton) refs.adminDeleteButton.addEventListener("click", function () {
      const idField = refs.adminForm && refs.adminForm.elements.namedItem("id");
      if (idField && idField.value) deleteAdminDemand(idField.value);
    });
    if (refs.adminRecordSelect) refs.adminRecordSelect.addEventListener("change", handleAdminRecordChange);
    if (refs.tableBody) refs.tableBody.addEventListener("click", handleAdminActions);
    if (refs.mobileList) refs.mobileList.addEventListener("click", handleAdminActions);
    refs.private.dataset.bound = "true";
  }

  function ensurePrivateView() {
    if (!refs.private || !refs.privateTemplate) return;
    if (refs.private.dataset.rendered !== "true") {
      refs.private.innerHTML = refs.privateTemplate.innerHTML;
      refs.private.dataset.rendered = "true";
    }
    refreshPrivateRefs();
    bindPrivateEvents();
  }

  function openLoginModal() {
    hide(refs.loginModal, false);
    refs.loginModal.classList.remove("is-closing");
    refs.loginModal.dataset.closing = "false";
    state.loginModalClosableAt = Date.now() + 450;
    const emailInput = refs.loginForm ? refs.loginForm.querySelector('input[name="email"]') : null;
    if (emailInput) window.setTimeout(function () { emailInput.focus(); }, 0);
  }

  function closeLoginModal(options) {
    const settings = options || {};
    const onDone = typeof settings.onDone === "function" ? settings.onDone : null;
    if (!refs.loginModal || refs.loginModal.hidden) {
      if (onDone) onDone();
      return;
    }
    if (refs.loginModal.dataset.closing === "true") return;
    refs.loginModal.dataset.closing = "true";
    refs.loginModal.classList.add("is-closing");
    window.setTimeout(function () {
      refs.loginModal.classList.remove("is-closing");
      refs.loginModal.dataset.closing = "false";
      hide(refs.loginModal, true);
      if (onDone) onDone();
    }, 320);
  }

  function redirectHomeFromLoginModal() {
    if (
      state.authBusy
      || !refs.loginModal
      || refs.loginModal.hidden
      || Date.now() < state.loginModalClosableAt
    ) {
      return;
    }
    closeLoginModal({
      onDone: function () {
        window.location.assign("/");
      }
    });
  }

  function setBusy(yes) {
    state.authBusy = yes;
    [
      "loginCloseButton",
      "loginSubmit",
      "refreshButton",
      "logoutButton",
      "retryButton",
      "mfaEnrollSubmit",
      "mfaChallengeSubmit",
      "adminSaveSubmit",
      "adminResetButton",
      "adminDeleteButton"
    ].forEach(function (key) {
      if (refs[key]) refs[key].disabled = yes;
    });
    hide(refs.loading, !yes || refs.private.hidden);
  }

  function setInline(element, message, tone) {
    if (!element) return;
    element.className = "aen-gp-inline-state";
    element.textContent = message || "";
    if (message) element.classList.add("is-" + (tone || "info"));
  }

  function setDash(message, tone) {
    if (!refs.dashboardFeedback) return;
    refs.dashboardFeedback.className = "aen-gp-alert";
    refs.dashboardFeedback.textContent = message || "";
    if (message) refs.dashboardFeedback.classList.add("is-" + (tone || "info"));
    refs.dashboardFeedback.hidden = !message;
  }

  function setAdminFeedback(message, tone) {
    setInline(refs.adminFeedback, message || "", tone || "info");
  }

  function setBoot(message) {
    setView(VIEW.boot);
    const title = refs.boot && refs.boot.querySelector("strong");
    if (title) title.textContent = message || "Validando sessão e regras de acesso...";
  }

  function resetFilters() {
    state.filters = { search: "", status: "Todos", priority: "Todas", owner: "Todos" };
    if (refs.searchInput) refs.searchInput.value = "";
    if (refs.statusFilter) refs.statusFilter.value = "Todos";
    if (refs.priorityFilter) refs.priorityFilter.value = "Todas";
    if (refs.ownerFilter) refs.ownerFilter.value = "Todos";
  }

  function clearAdminForm(message, tone) {
    if (refs.adminForm) refs.adminForm.reset();
    if (refs.adminForm && refs.adminForm.elements.namedItem("id")) {
      refs.adminForm.elements.namedItem("id").value = "";
    }
    if (refs.adminRecordSelect) refs.adminRecordSelect.value = "";
    if (refs.adminDeleteButton) refs.adminDeleteButton.hidden = true;
    if (message) setAdminFeedback(message, tone || "info");
  }

  function resetData() {
    state.demandas = [];
    state.adminDemandas = [];
    state.visible = [];
    resetFilters();
    clearPrivateView();
  }

  async function logAudit(eventType, eventStatus, details) {
    if (!state.client || !state.session) return;
    try {
      await state.client.rpc("log_audit_event", {
        p_event_type: eventType,
        p_event_status: eventStatus || "success",
        p_details: details || {}
      });
    } catch (_error) {
      console.warn("Falha ao registrar auditoria.");
    }
  }

  async function fetchAal() {
    if (!state.client || !state.client.auth.mfa) return state.aal;
    const result = await state.client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (result.data) {
      state.aal.currentLevel = result.data.currentLevel || "aal1";
      state.aal.nextLevel = result.data.nextLevel || state.aal.currentLevel;
    }
    return state.aal;
  }

  async function fetchFactors() {
    state.mfa = { factorId: null, qrCode: "", secret: "", verified: [] };
    if (!state.client || !state.client.auth.mfa) return [];
    const result = await state.client.auth.mfa.listFactors();
    if (result.error) throw result.error;
    const all = result.data && result.data.all ? result.data.all : [];
    state.mfa.verified = all.filter(function (factor) {
      return factor.factor_type === "totp" && factor.status === "verified";
    });
    return all;
  }

  function renderProfile() {
    const user = state.session && state.session.user ? state.session.user : null;
    const scope = isAdmin() ? "Visão administrativa" : (state.profile && state.profile.empresa) || "Empresa não vinculada";
    if (refs.companyName) refs.companyName.textContent = scope;
    if (refs.userSummary) refs.userSummary.textContent = [state.profile && state.profile.nome, user && user.email].filter(Boolean).join(" · ") || "Sessão autenticada";
    if (refs.roleChip) refs.roleChip.textContent = "Papel: " + roleLabel(state.profile && state.profile.role);
    if (refs.mfaChip) refs.mfaChip.textContent = mfaRequired()
      ? (state.aal.currentLevel === "aal2" ? "MFA: validado" : "MFA: pendente")
      : "MFA: não exigido";
    if (refs.sessionChip) refs.sessionChip.textContent = state.aal.currentLevel === "aal2" ? "Sessão MFA" : "Sessão padrão";
    if (refs.scopeSummary) refs.scopeSummary.textContent = isAdmin()
      ? "Acesso administrativo da AEN SYSTEMS liberado para gestão de demandas."
      : "Escopo restrito à empresa " + state.profile.empresa;
    hide(refs.adminPanel, !isAdmin());
    if (refs.adminActionsHead) refs.adminActionsHead.hidden = !isAdmin();
  }

  function optionList(values, allLabel, formatLabel) {
    return '<option value="' + esc(allLabel) + '">' + esc(allLabel) + "</option>" + values
      .filter(Boolean)
      .sort(function (a, b) { return String(a).localeCompare(String(b), "pt-BR"); })
      .map(function (value) {
        const label = typeof formatLabel === "function" ? formatLabel(value) : value;
        return '<option value="' + esc(value) + '">' + esc(label) + "</option>";
      })
      .join("");
  }

  function fillFilters() {
    const priorities = [];
    const owners = [];
    state.demandas.forEach(function (item) {
      if (item.prioridade && priorities.indexOf(item.prioridade) === -1) priorities.push(item.prioridade);
      const owner = item.gerente_projetos || item.responsavel;
      if (owner && owners.indexOf(owner) === -1) owners.push(owner);
    });
    if (refs.priorityFilter) refs.priorityFilter.innerHTML = optionList(priorities, "Todas", priorityLabel);
    if (refs.ownerFilter) refs.ownerFilter.innerHTML = optionList(owners, "Todos");
  }

  function renderKpis() {
    const total = state.visible.length;
    let approve = 0;
    let start = 0;
    let progress = 0;
    state.visible.forEach(function (item) {
      if (item.status === "Aprovar") approve += 1;
      if (item.status === "Iniciar") start += 1;
      if (item.status === "Desenvolvimento") progress += 1;
    });
    if (refs.kpiVisible) refs.kpiVisible.textContent = String(total);
    if (refs.kpiApprove) refs.kpiApprove.textContent = String(approve);
    if (refs.kpiStart) refs.kpiStart.textContent = String(start);
    if (refs.kpiProgress) refs.kpiProgress.textContent = String(progress);
    if (refs.visibleCounter) refs.visibleCounter.textContent = total + " registros visíveis";
    if (refs.recordSummary) {
      refs.recordSummary.textContent = isAdmin()
        ? state.demandas.length + " registros ativos visíveis. O painel administrativo carrega todos os registros para edição."
        : state.demandas.length + " registros autorizados antes dos filtros.";
    }
  }

  function rowActions(item) {
    if (!isAdmin()) return "";
    return '<td data-label="Ações"><div class="aen-gp-table-actions">'
      + '<button class="aen-gp-action-btn" type="button" data-admin-edit-id="' + esc(item.id) + '">Editar</button>'
      + '<button class="aen-gp-action-btn is-danger" type="button" data-admin-delete-id="' + esc(item.id) + '">Excluir</button>'
      + "</div></td>";
  }

  function cardActions(item) {
    if (!isAdmin()) return "";
    return '<div class="aen-gp-mobile-actions">'
      + '<button class="aen-gp-action-btn" type="button" data-admin-edit-id="' + esc(item.id) + '">Editar</button>'
      + '<button class="aen-gp-action-btn is-danger" type="button" data-admin-delete-id="' + esc(item.id) + '">Excluir</button>'
      + "</div>";
  }

  function applyFilters() {
    const search = state.filters.search.trim().toLowerCase();
    state.visible = state.demandas.filter(function (item) {
      const okStatus = state.filters.status === "Todos" || item.status === state.filters.status;
      const okPriority = state.filters.priority === "Todas" || item.prioridade === state.filters.priority;
      const ownerValue = item.gerente_projetos || item.responsavel;
      const okOwner = state.filters.owner === "Todos" || ownerValue === state.filters.owner;
      if (!okStatus || !okPriority || !okOwner) return false;
      if (!search) return true;
      const text = [
        item.empresa,
        item.gerente_projetos,
        item.consultor,
        item.cliente,
        item.titulo,
        item.descricao,
        item.documento_lrc_email,
        item.os_item_ticket,
        item.responsavel,
        item.status,
        priorityLabel(item.prioridade)
      ].join(" ").toLowerCase();
      return text.indexOf(search) !== -1;
    });

    if (refs.tableBody) {
      refs.tableBody.innerHTML = state.visible.map(function (item) {
        const statusClass = STATUS_CLASS[item.status] || "is-progress";
        const priorityClass = PRIORITY_CLASS[item.prioridade] || "is-medium";
        return (
          "<tr>"
          + '<td data-label="Empresa">' + esc(item.empresa || "-") + "</td>"
          + '<td data-label="Gerente de Projetos">' + esc(item.gerente_projetos || "-") + "</td>"
          + '<td data-label="Consultor">' + esc(item.consultor || "-") + "</td>"
          + '<td data-label="Cliente">' + esc(item.cliente || "-") + "</td>"
          + '<td data-label="Título"><div class="aen-gp-title-cell"><strong>' + esc(item.titulo || "Sem título") + "</strong></div></td>"
          + '<td data-label="Descrição">' + esc(shortText(item.descricao)) + "</td>"
          + '<td data-label="Documento LRC/E-mail">' + esc(item.documento_lrc_email || "-") + "</td>"
          + '<td data-label="OS/Item/Ticket">' + esc(item.os_item_ticket || "-") + "</td>"
          + '<td data-label="Status"><span class="aen-gp-status-badge ' + statusClass + '">' + esc(item.status) + "</span></td>"
          + '<td data-label="Prioridade"><span class="aen-gp-priority-badge ' + priorityClass + '">' + esc(priorityLabel(item.prioridade)) + "</span></td>"
          + '<td data-label="Responsável">' + esc(item.responsavel || "-") + "</td>"
          + '<td data-label="Horas">' + esc(hour(item.horas_gastas) + " / " + hour(item.horas_previstas)) + "</td>"
          + '<td data-label="Atualização">' + esc(dateTime(item.data_atualizacao)) + "</td>"
          + rowActions(item)
          + "</tr>"
        );
      }).join("");
    }

    if (refs.mobileList) {
      refs.mobileList.innerHTML = state.visible.map(function (item) {
        const statusClass = STATUS_CLASS[item.status] || "is-progress";
        const priorityClass = PRIORITY_CLASS[item.prioridade] || "is-medium";
        return (
          '<article class="aen-card aen-gp-mobile-card">'
          + '<div class="aen-gp-mobile-card-head"><strong>' + esc(item.titulo || "Sem título") + '</strong><span class="aen-gp-chip">' + esc(item.empresa || "-") + "</span></div>"
          + '<p class="aen-muted">' + esc(shortText(item.descricao)) + "</p>"
          + '<div class="aen-gp-mobile-meta">'
          + "<span><small>Gerente de Projetos</small>" + esc(item.gerente_projetos || "-") + "</span>"
          + "<span><small>Consultor</small>" + esc(item.consultor || "-") + "</span>"
          + "<span><small>Cliente</small>" + esc(item.cliente || "-") + "</span>"
          + "<span><small>Documento LRC/E-mail</small>" + esc(item.documento_lrc_email || "-") + "</span>"
          + "<span><small>OS/Item/Ticket</small>" + esc(item.os_item_ticket || "-") + "</span>"
          + "<span><small>Responsável</small>" + esc(item.responsavel || "-") + "</span>"
          + '<span><small>Status</small><span class="aen-gp-status-badge ' + statusClass + '">' + esc(item.status) + "</span></span>"
          + '<span><small>Prioridade</small><span class="aen-gp-priority-badge ' + priorityClass + '">' + esc(priorityLabel(item.prioridade)) + "</span></span>"
          + "<span><small>Horas</small>" + esc(hour(item.horas_gastas) + " / " + hour(item.horas_previstas)) + "</span>"
          + "<span><small>Atualização</small>" + esc(dateTime(item.data_atualizacao)) + "</span>"
          + "</div>"
          + cardActions(item)
          + "</article>"
        );
      }).join("");
    }

    hide(refs.tableWrap, state.visible.length === 0);
    hide(refs.mobileList, state.visible.length === 0);
    hide(refs.empty, state.visible.length > 0);
    renderKpis();
  }

  function showGuest(message, tone) {
    state.session = null;
    state.profile = null;
    resetData();
    setDash("", "info");
    setInline(refs.mfaFeedback, "", "info");
    setView(VIEW.guest);
    setInline(refs.loginFeedback, message || "", tone || "info");
    openLoginModal();
  }

  async function resetSessionAndShowGuest(message, tone, options) {
    const settings = options || {};
    state.suppressSignedOutEvent = true;
    state.session = null;
    state.profile = null;
    try {
      if (state.client) {
        const result = await state.client.auth.signOut({ scope: settings.scope || "local" });
        if (result && result.error) console.warn(result.error);
      }
    } catch (error) {
      console.warn(error);
    }
    showGuest(message || "", tone || "info");
  }

  function showMfa(mode, title, description) {
    setView(VIEW.mfa);
    hide(refs.mfaEnrollPanel, mode !== "enroll");
    hide(refs.mfaChallengePanel, mode !== "challenge");
    if (refs.mfaTitle) refs.mfaTitle.textContent = title;
    if (refs.mfaDescription) refs.mfaDescription.textContent = description;
    setInline(refs.mfaFeedback, "", "info");
    if (mode === "enroll") {
      const qr = state.mfa.qrCode || "";
      const src = qr.indexOf("data:") === 0
        ? qr
        : (qr.indexOf("<svg") === 0 ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qr) : qr);
      if (refs.mfaQrImage) {
        refs.mfaQrImage.src = src || "";
        refs.mfaQrImage.hidden = !src;
      }
      hide(refs.mfaQrFallback, Boolean(src));
      if (refs.mfaSecret) refs.mfaSecret.textContent = state.mfa.secret || "---";
    }
  }

  function adminRecordLabel(item) {
    const title = item.titulo || "Sem título";
    return [item.referencia_externa, item.empresa, item.status, title].filter(Boolean).join(" · ");
  }

  function hydrateAdminRecordSelect() {
    if (!refs.adminRecordSelect) return;
    refs.adminRecordSelect.innerHTML = '<option value="">Nova demanda</option>' + state.adminDemandas.map(function (item) {
      return '<option value="' + esc(item.id) + '">' + esc(adminRecordLabel(item)) + "</option>";
    }).join("");
  }

  function findAdminDemanda(id) {
    return state.adminDemandas.find(function (item) { return item.id === id; }) || null;
  }

  function fillAdminForm(item) {
    if (!refs.adminForm || !item) return;
    refs.adminForm.elements.namedItem("id").value = item.id || "";
    refs.adminForm.elements.namedItem("referencia_externa").value = item.referencia_externa || "";
    refs.adminForm.elements.namedItem("empresa").value = item.empresa || "";
    refs.adminForm.elements.namedItem("cliente").value = item.cliente || "";
    refs.adminForm.elements.namedItem("gerente_projetos").value = item.gerente_projetos || "";
    refs.adminForm.elements.namedItem("consultor").value = item.consultor || "";
    refs.adminForm.elements.namedItem("titulo").value = item.titulo || "";
    refs.adminForm.elements.namedItem("descricao").value = item.descricao || "";
    refs.adminForm.elements.namedItem("documento_lrc_email").value = item.documento_lrc_email || "";
    refs.adminForm.elements.namedItem("os_item_ticket").value = item.os_item_ticket || "";
    refs.adminForm.elements.namedItem("status").value = item.status || "Aprovar";
    refs.adminForm.elements.namedItem("prioridade").value = item.prioridade || "Media";
    refs.adminForm.elements.namedItem("responsavel").value = item.responsavel || "";
    refs.adminForm.elements.namedItem("horas_previstas").value = item.horas_previstas || 0;
    refs.adminForm.elements.namedItem("horas_gastas").value = item.horas_gastas || 0;
    if (refs.adminRecordSelect) refs.adminRecordSelect.value = item.id || "";
    if (refs.adminDeleteButton) refs.adminDeleteButton.hidden = false;
    setAdminFeedback("Registro carregado para edição.", "info");
    refs.adminForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function enforceAccess() {
    const profile = await state.client
      .from("profiles")
      .select("id, email, nome, empresa, role, ativo, mfa_required")
      .eq("id", state.session.user.id)
      .maybeSingle();
    if (profile.error) throw profile.error;
    state.profile = profile.data || null;

    if (!state.profile) {
      await logAudit("access_denied", "warning", { reason: "profile_missing" });
      await resetSessionAndShowGuest("Seu perfil ainda não foi configurado. Solicite o vínculo ao administrador.", "warning");
      return false;
    }

    await fetchAal();
    renderProfile();

    if (!state.profile.ativo) {
      await logAudit("access_denied", "warning", { reason: "inactive_profile" });
      await resetSessionAndShowGuest("Seu acesso está desativado. Solicite revisão ao administrador.", "warning");
      return false;
    }

    if (!state.profile.empresa && !isAdmin()) {
      await logAudit("access_denied", "warning", { reason: "company_missing" });
      await resetSessionAndShowGuest("Seu usuário não está vinculado a uma empresa autorizada.", "warning");
      return false;
    }

    if (mfaRequired()) {
      await fetchFactors();
      if (!state.mfa.verified.length) {
        const enroll = await state.client.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "AENSYSTEMS MFA"
        });
        if (enroll.error) throw enroll.error;
        state.mfa.factorId = enroll.data.id;
        state.mfa.secret = enroll.data.totp ? enroll.data.totp.secret || "" : "";
        state.mfa.qrCode = enroll.data.totp ? enroll.data.totp.qr_code || "" : "";
        await logAudit("mfa_enroll_started", "success", { role: state.profile.role });
        showMfa("enroll", "Ativar MFA da conta", "Cadastre o aplicativo autenticador e valide o código de 6 dígitos para liberar a sessão.");
        return false;
      }

      state.mfa.factorId = state.mfa.verified[0].id;
      if (state.aal.currentLevel !== "aal2") {
        showMfa("challenge", "Confirmar MFA", "Sua senha foi validada. Agora informe o código TOTP para concluir a autenticação.");
        return false;
      }
    }

    return true;
  }

  async function loadAdminDemandas() {
    if (!isAdmin()) return;
    const result = await state.client
      .from("demandas")
      .select("id, referencia_externa, empresa, cliente, gerente_projetos, consultor, titulo, descricao, documento_lrc_email, os_item_ticket, status, responsavel, prioridade, horas_previstas, horas_gastas, data_criacao, data_atualizacao")
      .order("data_atualizacao", { ascending: false });
    if (result.error) throw result.error;
    state.adminDemandas = result.data || [];
    hydrateAdminRecordSelect();
  }

  async function loadDashboard() {
    if (!state.session || !state.profile) return;
    ensurePrivateView();
    setView(VIEW.private);
    setBusy(true);
    setDash("", "info");

    try {
      const result = await state.client
        .from("demandas")
        .select("id, referencia_externa, empresa, cliente, gerente_projetos, consultor, titulo, descricao, documento_lrc_email, os_item_ticket, status, responsavel, prioridade, horas_previstas, horas_gastas, data_criacao, data_atualizacao")
        .in("status", ALLOWED_STATUSES)
        .order("data_atualizacao", { ascending: false });
      if (result.error) throw result.error;
      state.demandas = result.data || [];
      if (isAdmin()) await loadAdminDemandas();
      fillFilters();
      applyFilters();
      renderProfile();
      if (!state.demandas.length) setDash("Nenhuma demanda ativa foi encontrada para o seu escopo atual.", "info");
      await logAudit("dashboard_view", "success", {
        empresa: state.profile.empresa,
        role: state.profile.role,
        aal: state.aal.currentLevel
      });
    } catch (error) {
      console.error(error);
      resetData();
      hide(refs.empty, false);
      setDash("Não foi possível carregar os dados autorizados. Revise o schema, as policies e a configuração do Supabase.", "error");
      await logAudit("access_denied", "error", { reason: "dashboard_load_failed" });
    } finally {
      setBusy(false);
    }
  }

  async function syncSession(opts) {
    if (state.syncInFlight) return state.syncInFlight;
    state.syncInFlight = syncSessionInternal(opts);
    try {
      return await state.syncInFlight;
    } finally {
      state.syncInFlight = null;
    }
  }

  async function syncSessionInternal(opts) {
    const options = opts || {};
    if (!options.silent) setBoot("Validando sessão e regras de acesso...");
    const session = await state.client.auth.getSession();
    state.session = session.data ? session.data.session : null;
    if (!state.session) {
      showGuest(options.message || "", options.tone || "info");
      return;
    }
    const user = await state.client.auth.getUser();
    if (user.error || !user.data || !user.data.user) {
      await resetSessionAndShowGuest("Faça login para acessar a Área das GPs.", "info");
      return;
    }
    if (await enforceAccess()) await loadDashboard();
  }

  function authError(error) {
    const message = String((error && error.message) || "").toLowerCase();
    if (message.indexOf("invalid login credentials") !== -1 || message.indexOf("invalid email or password") !== -1 || message.indexOf("email not confirmed") !== -1) {
      return "E-mail ou senha inválidos.";
    }
    if (message.indexOf("too many requests") !== -1) {
      return "Muitas tentativas em sequência. Aguarde um momento e tente novamente.";
    }
    return "Não foi possível autenticar agora.";
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (state.authBusy) return;
    const data = new FormData(refs.loginForm);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (!email || !password) {
      return setInline(refs.loginFeedback, "Informe e-mail e senha.", "warning");
    }
    setBusy(true);
    setInline(refs.loginFeedback, "Validando acesso...", "info");
    try {
      if (state.session) {
        await syncSession({ silent: true });
        return;
      }
      const result = await state.client.auth.signInWithPassword({ email: email, password: password });
      if (result.error) throw result.error;
      refs.loginForm.reset();
      state.session = result.data ? result.data.session : null;
      try {
        await state.client.auth.signOut({ scope: "others" });
      } catch (error) {
        console.warn("Não foi possível encerrar sessões antigas.", error);
      }
      setInline(refs.loginFeedback, "Senha validada. Conferindo perfil e MFA...", "success");
      await syncSession({ silent: true });
      await logAudit("login_success", "success", { aal: state.aal.currentLevel });
    } catch (error) {
      console.error(error);
      setInline(refs.loginFeedback, authError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnroll(event) {
    event.preventDefault();
    const code = String(new FormData(refs.mfaEnrollForm).get("code") || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return setInline(refs.mfaFeedback, "Informe um código TOTP de 6 dígitos.", "warning");
    }
    setBusy(true);
    setInline(refs.mfaFeedback, "Validando o código de ativação...", "info");
    try {
      const challenge = await state.client.auth.mfa.challenge({ factorId: state.mfa.factorId });
      if (challenge.error) throw challenge.error;
      const verify = await state.client.auth.mfa.verify({
        factorId: state.mfa.factorId,
        challengeId: challenge.data.id,
        code: code
      });
      if (verify.error) throw verify.error;
      refs.mfaEnrollForm.reset();
      await fetchAal();
      await logAudit("mfa_enroll_completed", "success", { aal: state.aal.currentLevel });
      setInline(refs.mfaFeedback, "MFA ativado com sucesso. Liberando a área privada...", "success");
      await syncSession({ silent: true });
    } catch (error) {
      console.error(error);
      setInline(refs.mfaFeedback, "Não foi possível validar o código informado.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleChallenge(event) {
    event.preventDefault();
    const code = String(new FormData(refs.mfaChallengeForm).get("code") || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return setInline(refs.mfaFeedback, "Informe um código TOTP de 6 dígitos.", "warning");
    }
    setBusy(true);
    setInline(refs.mfaFeedback, "Validando MFA...", "info");
    try {
      const verify = await state.client.auth.mfa.challengeAndVerify({
        factorId: state.mfa.factorId,
        code: code
      });
      if (verify.error) throw verify.error;
      refs.mfaChallengeForm.reset();
      await fetchAal();
      await logAudit("mfa_challenge_completed", "success", { aal: state.aal.currentLevel });
      setInline(refs.mfaFeedback, "MFA validado. Carregando a área privada...", "success");
      await syncSession({ silent: true });
    } catch (error) {
      console.error(error);
      setInline(refs.mfaFeedback, "Código MFA inválido ou expirado.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setDash("Encerrando sessão...", "info");
    try {
      await logAudit("logout", "success", { aal: state.aal.currentLevel });
      state.suppressSignedOutEvent = true;
      const result = await state.client.auth.signOut();
      if (result.error) throw result.error;
      showGuest("Sessão encerrada com sucesso.", "success");
    } catch (error) {
      console.error(error);
      setDash("Não foi possível encerrar a sessão.", "error");
    } finally {
      setBusy(false);
    }
  }

  function readAdminPayload() {
    const form = new FormData(refs.adminForm);
    const payload = {
      referencia_externa: String(form.get("referencia_externa") || "").trim(),
      empresa: String(form.get("empresa") || "").trim(),
      cliente: String(form.get("cliente") || "").trim(),
      gerente_projetos: String(form.get("gerente_projetos") || "").trim(),
      consultor: String(form.get("consultor") || "").trim(),
      titulo: String(form.get("titulo") || "").trim(),
      descricao: String(form.get("descricao") || "").trim(),
      documento_lrc_email: String(form.get("documento_lrc_email") || "").trim(),
      os_item_ticket: String(form.get("os_item_ticket") || "").trim(),
      status: String(form.get("status") || "").trim(),
      responsavel: String(form.get("responsavel") || "").trim(),
      prioridade: String(form.get("prioridade") || "").trim(),
      horas_previstas: Number(form.get("horas_previstas") || 0),
      horas_gastas: Number(form.get("horas_gastas") || 0)
    };

    if (!payload.referencia_externa || !payload.empresa || !payload.cliente || !payload.titulo || !payload.status || !payload.responsavel) {
      throw new Error("Preencha todos os campos obrigatórios.");
    }
    if (ALL_STATUSES.indexOf(payload.status) === -1) {
      throw new Error("Selecione um status válido.");
    }
    if (PRIORITIES.indexOf(payload.prioridade) === -1) {
      throw new Error("Selecione uma prioridade válida.");
    }
    if (
      Number.isNaN(payload.horas_previstas)
      || Number.isNaN(payload.horas_gastas)
      || payload.horas_previstas < 0
      || payload.horas_gastas < 0
    ) {
      throw new Error("As horas previstas e gastas devem ser números maiores ou iguais a zero.");
    }
    return payload;
  }

  async function saveAdminDemand(event) {
    event.preventDefault();
    if (!isAdmin()) return;
    setBusy(true);
    setAdminFeedback("Salvando registro...", "info");
    try {
      const payload = readAdminPayload();
      const id = refs.adminForm.elements.namedItem("id").value;
      let result;
      if (id) {
        result = await state.client.from("demandas").update(payload).eq("id", id).select("id").single();
      } else {
        result = await state.client.from("demandas").insert(payload).select("id").single();
      }
      if (result.error) throw result.error;
      await logAudit(id ? "demandas_update" : "demandas_insert", "success", {
        id: result.data.id,
        empresa: payload.empresa,
        status: payload.status
      });
      clearAdminForm(id ? "Registro atualizado com sucesso." : "Registro criado com sucesso.", "success");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      if (error && error.code === "23505") {
        setAdminFeedback("Já existe um registro com essa referência para a empresa selecionada.", "error");
      } else {
        setAdminFeedback(error.message || "Não foi possível salvar o registro.", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteAdminDemand(id) {
    if (!isAdmin() || !id) return;
    const item = findAdminDemanda(id);
    const label = item ? adminRecordLabel(item) : "este registro";
    if (!window.confirm("Excluir " + label + "? Esta ação não poderá ser desfeita.")) return;
    setBusy(true);
    setAdminFeedback("Excluindo registro...", "warning");
    try {
      const result = await state.client.from("demandas").delete().eq("id", id);
      if (result.error) throw result.error;
      await logAudit("demandas_delete", "success", { id: id });
      clearAdminForm("Registro excluído com sucesso.", "success");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      setAdminFeedback("Não foi possível excluir o registro.", "error");
    } finally {
      setBusy(false);
    }
  }

  function handleAdminRecordChange(event) {
    const id = event.target.value || "";
    if (!id) {
      clearAdminForm("Formulário pronto para uma nova demanda.", "info");
      return;
    }
    const item = findAdminDemanda(id);
    if (item) fillAdminForm(item);
  }

  function handleAdminActions(event) {
    const editButton = event.target.closest("[data-admin-edit-id]");
    const deleteButton = event.target.closest("[data-admin-delete-id]");
    if (editButton) {
      const item = findAdminDemanda(editButton.getAttribute("data-admin-edit-id"));
      if (item) fillAdminForm(item);
      return;
    }
    if (deleteButton) {
      deleteAdminDemand(deleteButton.getAttribute("data-admin-delete-id"));
    }
  }

  function initSupabase() {
    const config = window.AEN_SUPABASE_CONFIG || {};
    const createClient = window.supabase && typeof window.supabase.createClient === "function"
      ? window.supabase.createClient
      : null;
    if (!config.url || !config.anonKey || !createClient) {
      hide(refs.configAlert, false);
      setView(VIEW.guest);
      setInline(refs.loginFeedback, "Configuração pendente. Conecte o Supabase antes de liberar esta área.", "warning");
      return false;
    }
    state.client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: config.storageKey || "aensystems-gp-auth"
      }
    });
    state.client.auth.onAuthStateChange(function (event, session) {
      state.session = session;
      window.setTimeout(function () {
        if (event === "INITIAL_SESSION") {
          return;
        }
        if (!session && state.suppressSignedOutEvent && event === "SIGNED_OUT") {
          state.suppressSignedOutEvent = false;
          return;
        }
        if (!session) {
          return showGuest("", "info");
        }
        if (
          !state.authBusy
          && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "MFA_CHALLENGE_VERIFIED")
        ) {
          syncSession({ silent: true });
        }
      }, 0);
    });
    return true;
  }

  function bind() {
    if (refs.loginOpenButton) refs.loginOpenButton.addEventListener("click", openLoginModal);
    if (refs.loginCloseButton) {
      refs.loginCloseButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        redirectHomeFromLoginModal();
      });
    }
    if (refs.loginForm) refs.loginForm.addEventListener("submit", handleLogin);
    if (refs.mfaEnrollForm) refs.mfaEnrollForm.addEventListener("submit", handleEnroll);
    if (refs.mfaChallengeForm) refs.mfaChallengeForm.addEventListener("submit", handleChallenge);
  }

  async function init() {
    bind();
    resetData();
    setBoot("Validando sessão e regras de acesso...");
    if (!initSupabase()) return;
    try {
      await syncSession({ silent: false });
    } catch (error) {
      console.error(error);
      showGuest("Não foi possível inicializar a Área das GPs. Revise a configuração do Supabase e tente novamente.", "error");
    }
  }

  init();
})();
