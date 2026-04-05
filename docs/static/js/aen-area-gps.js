(function () {
  const root = document.querySelector("[data-gp-app]");
  if (!root) return;

  const ALLOWED_STATUSES = ["Aprovar", "Iniciar", "Desenvolvimento"];
  const STATUS_CLASS = { Aprovar: "is-approve", Iniciar: "is-start", Desenvolvimento: "is-progress" };
  const PRIORITY_CLASS = { Baixa: "is-low", Media: "is-medium", "Média": "is-medium", Alta: "is-high", Critica: "is-critical", "Crítica": "is-critical" };
  const VIEW = { boot: "boot", guest: "guest", mfa: "mfa", private: "private" };

  const refs = {
    boot: root.querySelector("[data-boot-state]"),
    guest: root.querySelector("[data-guest-view]"),
    mfa: root.querySelector("[data-mfa-view]"),
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
    companyName: root.querySelector("[data-company-name]"),
    userSummary: root.querySelector("[data-user-summary]"),
    roleChip: root.querySelector("[data-role-chip]"),
    mfaChip: root.querySelector("[data-mfa-chip]"),
    sessionChip: root.querySelector("[data-session-chip]"),
    scopeSummary: root.querySelector("[data-scope-summary]"),
    recordSummary: root.querySelector("[data-record-summary]"),
    refreshButton: root.querySelector("[data-refresh-button]"),
    logoutButton: root.querySelector("[data-logout-button]"),
    retryButton: root.querySelector("[data-retry-button]"),
    searchInput: root.querySelector("[data-search-input]"),
    statusFilter: root.querySelector("[data-status-filter]"),
    priorityFilter: root.querySelector("[data-priority-filter]"),
    ownerFilter: root.querySelector("[data-owner-filter]"),
    visibleCounter: root.querySelector("[data-visible-counter]"),
    dashboardFeedback: root.querySelector("[data-dashboard-feedback]"),
    loading: root.querySelector("[data-loading-state]"),
    empty: root.querySelector("[data-empty-state]"),
    tableWrap: root.querySelector("[data-table-wrap]"),
    tableBody: root.querySelector("[data-demandas-body]"),
    mobileList: root.querySelector("[data-mobile-list]"),
    kpiVisible: root.querySelector("[data-kpi-visible]"),
    kpiApprove: root.querySelector("[data-kpi-approve]"),
    kpiStart: root.querySelector("[data-kpi-start]"),
    kpiProgress: root.querySelector("[data-kpi-progress]")
  };

  const state = {
    client: null,
    session: null,
    profile: null,
    demandas: [],
    visible: [],
    aal: { currentLevel: "aal1", nextLevel: "aal1" },
    mfa: { factorId: null, qrCode: "", secret: "", verified: [] },
    filters: { search: "", status: "Todos", priority: "Todas", owner: "Todos" }
  };

  const hide = (el, yes) => el && (el.hidden = yes);
  const isAdmin = () => state.profile && state.profile.role === "admin";
  const mfaRequired = () => Boolean(state.profile && state.profile.mfa_required);
  const esc = (v) => String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const shortText = (v) => (String(v || "").trim() || "Sem descrição").slice(0, 170).replace(/\s+/g, " ");
  const hour = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: Number(v || 0) % 1 ? 1 : 0, maximumFractionDigits: 1 }) + "h";
  const dateTime = (v) => !v ? "Sem data" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(v));
  const roleLabel = (v) => ({ gp: "GP", consultor: "Consultor", admin: "Admin" }[v] || "Sem papel");

  function setView(view) {
    hide(refs.boot, view !== VIEW.boot);
    hide(refs.guest, view !== VIEW.guest);
    hide(refs.mfa, view !== VIEW.mfa);
    hide(refs.private, view !== VIEW.private);
  }

  function setBusy(yes) {
    ["loginSubmit", "refreshButton", "logoutButton", "retryButton", "mfaEnrollSubmit", "mfaChallengeSubmit"].forEach(function (key) {
      if (refs[key]) refs[key].disabled = yes;
    });
    hide(refs.loading, !yes || refs.private.hidden);
  }

  function setInline(el, msg, tone) {
    if (!el) return;
    el.className = "aen-gp-inline-state";
    el.textContent = msg || "";
    if (msg) el.classList.add("is-" + (tone || "info"));
  }

  function setDash(msg, tone) {
    if (!refs.dashboardFeedback) return;
    refs.dashboardFeedback.className = "aen-gp-alert";
    refs.dashboardFeedback.textContent = msg || "";
    if (msg) refs.dashboardFeedback.classList.add("is-" + (tone || "info"));
    refs.dashboardFeedback.hidden = !msg;
  }

  function setBoot(msg) {
    setView(VIEW.boot);
    const title = refs.boot && refs.boot.querySelector("strong");
    if (title) title.textContent = msg || "Validando sessão e regras de acesso...";
  }

  function resetFilters() {
    state.filters = { search: "", status: "Todos", priority: "Todas", owner: "Todos" };
    if (refs.searchInput) refs.searchInput.value = "";
    if (refs.statusFilter) refs.statusFilter.value = "Todos";
    if (refs.priorityFilter) refs.priorityFilter.value = "Todas";
    if (refs.ownerFilter) refs.ownerFilter.value = "Todos";
  }

  function resetData() {
    state.demandas = [];
    state.visible = [];
    resetFilters();
    if (refs.tableBody) refs.tableBody.innerHTML = "";
    if (refs.mobileList) refs.mobileList.innerHTML = "";
    hide(refs.tableWrap, true);
    hide(refs.mobileList, true);
    hide(refs.empty, true);
    if (refs.visibleCounter) refs.visibleCounter.textContent = "0 registros visíveis";
  }

  async function logAudit(eventType, eventStatus, details) {
    if (!state.client || !state.session) return;
    try {
      await state.client.rpc("log_audit_event", {
        p_event_type: eventType,
        p_event_status: eventStatus || "success",
        p_details: details || {}
      });
    } catch (_e) {
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
    if (refs.mfaChip) refs.mfaChip.textContent = mfaRequired() ? (state.aal.currentLevel === "aal2" ? "MFA: validado" : "MFA: pendente") : "MFA: não exigido";
    if (refs.sessionChip) refs.sessionChip.textContent = state.aal.currentLevel === "aal2" ? "Sessão MFA" : "Sessão padrão";
    if (refs.scopeSummary) refs.scopeSummary.textContent = isAdmin() ? "Acesso administrativo preparado para expansão." : "Escopo restrito à empresa " + state.profile.empresa;
  }

  function optionList(values, allLabel) {
    return '<option value="' + allLabel + '">' + allLabel + "</option>" + values.filter(Boolean).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR");
    }).map(function (value) {
      return '<option value="' + esc(value) + '">' + esc(value) + "</option>";
    }).join("");
  }

  function fillFilters() {
    const priorities = [];
    const owners = [];
    state.demandas.forEach(function (item) {
      if (item.prioridade && priorities.indexOf(item.prioridade) === -1) priorities.push(item.prioridade);
      if (item.responsavel && owners.indexOf(item.responsavel) === -1) owners.push(item.responsavel);
    });
    if (refs.priorityFilter) refs.priorityFilter.innerHTML = optionList(priorities, "Todas");
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
    if (refs.recordSummary) refs.recordSummary.textContent = state.demandas.length + " registros autorizados antes dos filtros.";
  }

  function applyFilters() {
    const search = state.filters.search.trim().toLowerCase();
    state.visible = state.demandas.filter(function (item) {
      const okStatus = state.filters.status === "Todos" || item.status === state.filters.status;
      const okPriority = state.filters.priority === "Todas" || item.prioridade === state.filters.priority;
      const okOwner = state.filters.owner === "Todos" || item.responsavel === state.filters.owner;
      if (!okStatus || !okPriority || !okOwner) return false;
      if (!search) return true;
      const text = [item.empresa, item.cliente, item.titulo, item.descricao, item.responsavel, item.status, item.prioridade].join(" ").toLowerCase();
      return text.indexOf(search) !== -1;
    });

    if (refs.tableBody) {
      refs.tableBody.innerHTML = state.visible.map(function (item) {
        const s = STATUS_CLASS[item.status] || "is-progress";
        const p = PRIORITY_CLASS[item.prioridade] || "is-medium";
        return (
          "<tr>" +
          '<td data-label="Empresa">' + esc(item.empresa || "-") + "</td>" +
          '<td data-label="Cliente">' + esc(item.cliente || "-") + "</td>" +
          '<td data-label="Título"><div class="aen-gp-title-cell"><strong>' + esc(item.titulo || "Sem título") + '</strong><span class="aen-muted">' + esc(shortText(item.descricao)) + "</span></div></td>" +
          '<td data-label="Status"><span class="aen-gp-status-badge ' + s + '">' + esc(item.status) + "</span></td>" +
          '<td data-label="Prioridade"><span class="aen-gp-priority-badge ' + p + '">' + esc(item.prioridade || "Media") + "</span></td>" +
          '<td data-label="Responsável">' + esc(item.responsavel || "-") + "</td>" +
          '<td data-label="Horas">' + esc(hour(item.horas_gastas) + " / " + hour(item.horas_previstas)) + "</td>" +
          '<td data-label="Atualização">' + esc(dateTime(item.data_atualizacao)) + "</td>" +
          "</tr>"
        );
      }).join("");
    }

    if (refs.mobileList) {
      refs.mobileList.innerHTML = state.visible.map(function (item) {
        const s = STATUS_CLASS[item.status] || "is-progress";
        const p = PRIORITY_CLASS[item.prioridade] || "is-medium";
        return (
          '<article class="aen-card aen-gp-mobile-card">' +
          '<div class="aen-gp-mobile-card-head"><strong>' + esc(item.titulo || "Sem título") + '</strong><span class="aen-gp-chip">' + esc(item.empresa || "-") + "</span></div>" +
          '<p class="aen-muted">' + esc(shortText(item.descricao)) + "</p>" +
          '<div class="aen-gp-mobile-meta">' +
          "<span><small>Cliente</small>" + esc(item.cliente || "-") + "</span>" +
          "<span><small>Responsável</small>" + esc(item.responsavel || "-") + "</span>" +
          '<span><small>Status</small><span class="aen-gp-status-badge ' + s + '">' + esc(item.status) + "</span></span>" +
          '<span><small>Prioridade</small><span class="aen-gp-priority-badge ' + p + '">' + esc(item.prioridade || "Media") + "</span></span>" +
          "<span><small>Horas</small>" + esc(hour(item.horas_gastas) + " / " + hour(item.horas_previstas)) + "</span>" +
          "<span><small>Atualização</small>" + esc(dateTime(item.data_atualizacao)) + "</span>" +
          "</div></article>"
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
      const src = qr.indexOf("data:") === 0 ? qr : (qr.indexOf("<svg") === 0 ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qr) : qr);
      if (refs.mfaQrImage) {
        refs.mfaQrImage.src = src || "";
        refs.mfaQrImage.hidden = !src;
      }
      hide(refs.mfaQrFallback, Boolean(src));
      if (refs.mfaSecret) refs.mfaSecret.textContent = state.mfa.secret || "---";
    }
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
      await state.client.auth.signOut();
      showGuest("Seu perfil ainda não foi configurado. Solicite o vínculo ao administrador.", "warning");
      return false;
    }

    await fetchAal();
    renderProfile();

    if (!state.profile.ativo) {
      await logAudit("access_denied", "warning", { reason: "inactive_profile" });
      await state.client.auth.signOut();
      showGuest("Seu acesso está desativado. Solicite revisão ao administrador.", "warning");
      return false;
    }

    if (!state.profile.empresa && !isAdmin()) {
      await logAudit("access_denied", "warning", { reason: "company_missing" });
      await state.client.auth.signOut();
      showGuest("Seu usuário não está vinculado a uma empresa autorizada.", "warning");
      return false;
    }

    if (mfaRequired()) {
      await fetchFactors();
      if (!state.mfa.verified.length) {
        const enroll = await state.client.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Consultor AENSYSTEMS"
        });
        if (enroll.error) throw enroll.error;
        state.mfa.factorId = enroll.data.id;
        state.mfa.secret = enroll.data.totp ? enroll.data.totp.secret || "" : "";
        state.mfa.qrCode = enroll.data.totp ? enroll.data.totp.qr_code || "" : "";
        await logAudit("mfa_enroll_started", "success", { role: state.profile.role });
        showMfa("enroll", "Ativar MFA da conta consultor", "Cadastre o aplicativo autenticador e valide o código de 6 dígitos para liberar a sessão.");
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

  async function loadDashboard() {
    if (!state.session || !state.profile) return;
    setView(VIEW.private);
    setBusy(true);
    setDash("", "info");

    try {
      const result = await state.client
        .from("demandas")
        .select("id, empresa, cliente, titulo, descricao, status, responsavel, prioridade, horas_previstas, horas_gastas, data_criacao, data_atualizacao")
        .in("status", ALLOWED_STATUSES)
        .order("data_atualizacao", { ascending: false });
      if (result.error) throw result.error;
      state.demandas = result.data || [];
      fillFilters();
      applyFilters();
      renderProfile();
      if (!state.demandas.length) setDash("Nenhuma demanda ativa foi encontrada para o seu escopo atual.", "info");
      await logAudit("dashboard_view", "success", { empresa: state.profile.empresa, role: state.profile.role, aal: state.aal.currentLevel });
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
    const options = opts || {};
    if (!options.silent) setBoot("Validando sessão e regras de acesso...");
    const session = await state.client.auth.getSession();
    state.session = session.data ? session.data.session : null;
    if (!state.session) {
      showGuest(options.message || "", options.tone || "info");
      return;
    }
    if (await enforceAccess()) await loadDashboard();
  }

  function authError(error) {
    const message = String((error && error.message) || "").toLowerCase();
    if (message.indexOf("invalid login credentials") !== -1 || message.indexOf("invalid email or password") !== -1 || message.indexOf("email not confirmed") !== -1) return "E-mail ou senha inválidos.";
    if (message.indexOf("too many requests") !== -1) return "Muitas tentativas em sequência. Aguarde um momento e tente novamente.";
    return "Não foi possível autenticar agora.";
  }

  async function handleLogin(event) {
    event.preventDefault();
    const data = new FormData(refs.loginForm);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (!email || !password) return setInline(refs.loginFeedback, "Informe e-mail e senha.", "warning");
    setBusy(true);
    setInline(refs.loginFeedback, "Validando acesso...", "info");
    try {
      const result = await state.client.auth.signInWithPassword({ email: email, password: password });
      if (result.error) throw result.error;
      refs.loginForm.reset();
      state.session = result.data ? result.data.session : null;
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
    if (!/^\d{6}$/.test(code)) return setInline(refs.mfaFeedback, "Informe um código TOTP de 6 dígitos.", "warning");
    setBusy(true);
    setInline(refs.mfaFeedback, "Validando o código de ativação...", "info");
    try {
      const challenge = await state.client.auth.mfa.challenge({ factorId: state.mfa.factorId });
      if (challenge.error) throw challenge.error;
      const verify = await state.client.auth.mfa.verify({ factorId: state.mfa.factorId, challengeId: challenge.data.id, code: code });
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
    if (!/^\d{6}$/.test(code)) return setInline(refs.mfaFeedback, "Informe um código TOTP de 6 dígitos.", "warning");
    setBusy(true);
    setInline(refs.mfaFeedback, "Validando MFA...", "info");
    try {
      const verify = await state.client.auth.mfa.challengeAndVerify({ factorId: state.mfa.factorId, code: code });
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

  function initSupabase() {
    const config = window.AEN_SUPABASE_CONFIG || {};
    const createClient = window.supabase && typeof window.supabase.createClient === "function" ? window.supabase.createClient : null;
    if (!config.url || !config.anonKey || !createClient) {
      hide(refs.configAlert, false);
      setView(VIEW.guest);
      setInline(refs.loginFeedback, "Configuração pendente. Conecte o Supabase antes de liberar esta área.", "warning");
      return false;
    }
    state.client = createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: config.storageKey || "aensystems-gp-auth" }
    });
    state.client.auth.onAuthStateChange(function (event, session) {
      const hadSession = Boolean(state.session);
      state.session = session;
      window.setTimeout(function () {
        if (!session) return showGuest(hadSession && event === "SIGNED_OUT" ? "Sua sessão foi encerrada ou expirou. Faça login novamente." : "", hadSession ? "warning" : "info");
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "MFA_CHALLENGE_VERIFIED") syncSession({ silent: true });
      }, 0);
    });
    return true;
  }

  function bind() {
    if (refs.loginForm) refs.loginForm.addEventListener("submit", handleLogin);
    if (refs.mfaEnrollForm) refs.mfaEnrollForm.addEventListener("submit", handleEnroll);
    if (refs.mfaChallengeForm) refs.mfaChallengeForm.addEventListener("submit", handleChallenge);
    if (refs.logoutButton) refs.logoutButton.addEventListener("click", handleLogout);
    if (refs.refreshButton) refs.refreshButton.addEventListener("click", loadDashboard);
    if (refs.retryButton) refs.retryButton.addEventListener("click", loadDashboard);
    if (refs.searchInput) refs.searchInput.addEventListener("input", function (event) { state.filters.search = event.target.value || ""; applyFilters(); });
    if (refs.statusFilter) refs.statusFilter.addEventListener("change", function (event) { state.filters.status = event.target.value || "Todos"; applyFilters(); });
    if (refs.priorityFilter) refs.priorityFilter.addEventListener("change", function (event) { state.filters.priority = event.target.value || "Todas"; applyFilters(); });
    if (refs.ownerFilter) refs.ownerFilter.addEventListener("change", function (event) { state.filters.owner = event.target.value || "Todos"; applyFilters(); });
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
