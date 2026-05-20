import { pingSupabase } from "./lib/supabase.js";
import { CAL_LINK } from "./lib/config.js";
import {
  initAuth,
  teardownAuth,
  handleSignIn,
  handleMagicLinkSignIn,
  handleSignUp,
  handleSignOut,
  getCachedProfile,
} from "./auth";
import { handleIdeaSubmit, loadUserIdeas } from "./ideas";
import { showToast, clearError } from "./ui";
import { openSettings } from "./settings";
import { safeName } from "./sanitize.js";
import { initModals } from "./components/Modals.js";
import { initCursor } from "./cursor.js";
import { getRenderer, startLoop } from "./render.js";
import { initAnimations } from "./animations.js";
import { DOMCache } from "./dom-cache.js";

// ── Session state ──────────────────────────────────────────────────────────
let _session = null;
let _ideasLoaded = false;

let navJoinBtn, navUserWrap, navUserName, navLogoutBtn, navSettingsBtn, navMeetingBtn;
let authTabLogin, authTabRegister, authPanelLogin, authPanelRegister;
let loginForm, registerForm, registerConfirmMsg;
let ideaRoleGate, ideaFormWrap, heroSubmitBtn, ctaSubmitBtn, meetingCtaBtn, calModalCloseBtn;
let authModalCloseBtn, ideaModalCloseBtn;

function resolveRefs() {
  navJoinBtn     = document.getElementById("nav-join-btn");
  navUserWrap    = document.getElementById("nav-user-wrap");
  navUserName    = document.getElementById("nav-user-name");
  navLogoutBtn   = document.getElementById("nav-logout-btn");
  navSettingsBtn = document.getElementById("nav-settings-btn");

  loginForm          = document.getElementById("login-form");
  registerForm       = document.getElementById("register-form");
  authTabLogin       = document.getElementById("auth-tab-login");
  authTabRegister    = document.getElementById("auth-tab-register");
  authPanelLogin     = document.getElementById("auth-panel-login");
  authPanelRegister  = document.getElementById("auth-panel-register");
  registerConfirmMsg = document.getElementById("register-confirm-msg");

  ideaRoleGate  = document.getElementById("idea-role-gate");
  ideaFormWrap  = document.getElementById("idea-form-wrap");
  heroSubmitBtn = document.getElementById("hero-submit-btn");
  ctaSubmitBtn  = document.getElementById("cta-submit-btn");
  meetingCtaBtn = document.getElementById("meeting-cta-btn");

  navMeetingBtn = document.getElementById("nav-meeting-btn");

  calModalCloseBtn  = document.getElementById("cal-modal-close");
  authModalCloseBtn = document.getElementById("auth-modal-close");
  ideaModalCloseBtn = document.getElementById("idea-modal-close");
}

function updateUI(session) {
  _session = session;
  if (session) {
    if (navJoinBtn)  navJoinBtn.hidden  = true;
    if (navUserWrap) navUserWrap.hidden = false;
    const name = safeName(
      session.user.user_metadata?.full_name ||
      session.user.email?.split("@")[0]     ||
      "User"
    );
    if (navUserName) navUserName.textContent = name;
    if (!_ideasLoaded) {
      _ideasLoaded = true;
      loadUserIdeas(session.user.id);
    }
  } else {
    if (navJoinBtn)  navJoinBtn.hidden  = false;
    if (navUserWrap) navUserWrap.hidden = true;
    _ideasLoaded = false;
  }
}

function switchAuthTab(tab) {
  const isLogin = tab === "login";
  authTabLogin?.classList.toggle("modal-tab--active", isLogin);
  authTabRegister?.classList.toggle("modal-tab--active", !isLogin);
  if (authPanelLogin)    authPanelLogin.hidden    = !isLogin;
  if (authPanelRegister) authPanelRegister.hidden = isLogin;
  if (registerConfirmMsg) registerConfirmMsg.hidden = true;
  if (registerForm)       registerForm.hidden = false;
  clearError("login-error");
  clearError("register-error");
}

function openAuthModal(defaultTab = "login") {
  switchAuthTab(defaultTab);
  const target = document.getElementById("auth-modal");
  if (target) {
    target.classList.add("modal--open");
    target.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

function openIdeaModal() {
  if (!_session) {
    openAuthModal("register");
    return;
  }
  const profile = getCachedProfile();
  const isVisionary = profile?.role_type === "visionary";
  if (ideaRoleGate) ideaRoleGate.hidden = isVisionary;
  if (ideaFormWrap) ideaFormWrap.hidden = !isVisionary;
  clearError("idea-error");
  const target = document.getElementById("idea-modal");
  if (target) {
    target.classList.add("modal--open");
    target.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

// ── Cal embed modal ───────────────────────────────────────────────────────
// The iframe src is set lazily (on first open) so we never load Cal.com on
// initial page load, and we re-use the same iframe between open/close so the
// user keeps their booking state if they reopen the modal.
let _calFrameLoaded = false;
function buildCalEmbedSrc() {
  // Cal.com supports embed mode via ?embed=1 + theme + layout query params.
  // Strip any non-embed-friendly query string from CAL_LINK first.
  const base = CAL_LINK.split("?")[0];
  const params = new URLSearchParams({
    embed: "1",
    theme: "dark",
    layout: "month_view",
  });
  return `${base}?${params.toString()}`;
}
function openCalModal() {
  const target  = document.getElementById("cal-modal");
  const frame   = document.getElementById("cal-modal-frame");
  const spinner = document.getElementById("cal-modal-spinner");
  if (!target || !frame) return;
  if (!_calFrameLoaded) {
    if (spinner) spinner.classList.remove("is-hidden");
    frame.addEventListener("load", () => {
      _calFrameLoaded = true;
      if (spinner) spinner.classList.add("is-hidden");
    }, { once: true });
    frame.src = buildCalEmbedSrc();
  } else if (spinner) {
    spinner.classList.add("is-hidden");
  }
  target.classList.add("modal--open");
  target.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeCalModal() {
  const target = document.getElementById("cal-modal");
  if (!target) return;
  target.classList.remove("modal--open");
  target.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Generic close-on-backdrop / ESC handler — covers cal, auth, idea modals.
function bindGenericModalClosers() {
  // Backdrop click: if the user clicks the .modal-overlay directly (not a child),
  // close it. The .modal-card stops propagation implicitly because clicks on
  // children are caught by closest('.modal-overlay') matching the parent.
  document.addEventListener("click", (e) => {
    const overlay = e.target.closest(".modal-overlay");
    if (overlay && e.target === overlay && overlay.classList.contains("modal--open")) {
      overlay.classList.remove("modal--open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".modal-overlay.modal--open").forEach((m) => {
      m.classList.remove("modal--open");
      m.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "";
  });
}

function wireEvents() {
  navSettingsBtn?.addEventListener("click", () => openSettings());

  authTabLogin?.addEventListener("click",    () => switchAuthTab("login"));
  authTabRegister?.addEventListener("click", () => switchAuthTab("register"));

  navLogoutBtn?.addEventListener("click", async () => {
    await handleSignOut();
    showToast("Signed out successfully.", "info");
  });

  // ── PRIMARY WORKFLOWS ────────────────────────────────────────────────────
  // Submit Your Idea (hero CTA + final CTA) → idea modal (opens auth if needed)
  heroSubmitBtn?.addEventListener("click", openIdeaModal);
  ctaSubmitBtn?.addEventListener("click",  openIdeaModal);

  // Join Now (nav) → auth modal on Register tab
  navJoinBtn?.addEventListener("click", () => openAuthModal("register"));

  // Request a Meeting (nav CTA) + Request a Closed Meeting (final CTA)
  //   → embedded Cal.com modal (no external redirect)
  navMeetingBtn?.addEventListener("click", openCalModal);
  meetingCtaBtn?.addEventListener("click", openCalModal);

  // Explicit modal close buttons
  calModalCloseBtn?.addEventListener("click", closeCalModal);
  authModalCloseBtn?.addEventListener("click", () => {
    const m = document.getElementById("auth-modal");
    if (!m) return;
    m.classList.remove("modal--open");
    m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  });
  ideaModalCloseBtn?.addEventListener("click", () => {
    const m = document.getElementById("idea-modal");
    if (!m) return;
    m.classList.remove("modal--open");
    m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  });

  // Generic ESC + backdrop closer covers all .modal-overlay instances
  bindGenericModalClosers();

  // ── Login form ──────────────────────────────────────────────────────────
  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email    = document.getElementById("login-email")?.value    ?? "";
    const password = document.getElementById("login-password")?.value ?? "";
    handleSignIn(email, password, () => {
      const modal = document.getElementById("auth-modal");
      if (modal) {
        modal.classList.remove("modal--open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
      showToast("Welcome back!");
    });
  });

  document.getElementById("magic-link-submit")?.addEventListener("click", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value ?? "";
    handleMagicLinkSignIn(email, () => {
      const modal = document.getElementById("auth-modal");
      if (modal) {
        modal.classList.remove("modal--open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
      showToast("Magic link sent! Check your inbox.");
    });
  });

  // ── Register form ───────────────────────────────────────────────────────
  registerForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = {
      fullName:  document.getElementById("register-name")?.value     ?? "",
      email:     document.getElementById("register-email")?.value    ?? "",
      password:  document.getElementById("register-password")?.value ?? "",
      roleType:  document.getElementById("register-role")?.value     ?? "",
      skillsRaw: document.getElementById("register-skills")?.value   ?? "",
    };
    handleSignUp(
      fields,
      () => {
        const modal = document.getElementById("auth-modal");
        if (modal) {
          modal.classList.remove("modal--open");
          modal.setAttribute("aria-hidden", "true");
          document.body.style.overflow = "";
        }
        showToast("Welcome to UrLife!");
      },
      () => {
        if (registerConfirmMsg) registerConfirmMsg.hidden = false;
        if (registerForm)       registerForm.hidden = true;
      }
    );
  });

  // ── Idea form ───────────────────────────────────────────────────────────
  document.getElementById("idea-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!_session) {
      const modal = document.getElementById("idea-modal");
      if (modal) {
        modal.classList.remove("modal--open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
      openAuthModal();
      return;
    }
    const fields = {
      title:     document.getElementById("idea-title")?.value    ?? "",
      industry:  document.getElementById("idea-industry")?.value ?? "",
      problem:   document.getElementById("idea-problem")?.value  ?? "",
      skillsRaw: document.getElementById("idea-skills")?.value   ?? "",
    };
    handleIdeaSubmit(fields, _session);
  });
}

// ── Duplicate-element cleanup ──────────────────────────────────────────────
// renderApp() (called synchronously from index.html before this module loads)
// sets app.innerHTML, which includes Modals() output.  The canonical modal
// shells and canvas are static elements in index.html that sit BEFORE #app in
// the DOM.  Any element with the same ID inside #app is a stale duplicate:
// it confuses getElementById (which returns the first match — the static one)
// and produces invisible ghost nodes that waste memory.
function purgeDuplicates() {
  const canonical = document.getElementById('canvas3d');

  // Kill every canvas in the entire document that is not #canvas3d
  document.querySelectorAll('canvas').forEach(c => {
    if (c !== canonical) c.remove();
  });

  // Remove modal/toast duplicates injected into #app by renderApp() → Modals()
  const app = document.getElementById('app');
  if (app) {
    ['modal-auth', 'modal-idea', 'toast-container'].forEach(id =>
      app.querySelector(`#${id}`)?.remove()
    );
  }

  // Runtime guard: MutationObserver intercepts any canvas spawned by a
  // runaway render loop after boot and removes it before it can paint
  new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeName === 'CANVAS' && node !== canonical) {
          node.remove();
        } else if (node.querySelectorAll) {
          node.querySelectorAll('canvas').forEach(c => {
            if (c !== canonical) c.remove();
          });
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// ── Boot sequence ──────────────────────────────────────────────────────────
async function boot() {
  // ① MAGIC LINK GUARD — Supabase token in URL → hand off to initAuth and halt normal boot
  const isMagicCallback =
    window.location.hash.includes("access_token") ||
    window.location.search.includes("token_hash")  ||
    window.location.search.includes("type=magiclink");

  if (isMagicCallback) {
    await initAuth(updateUI);
    return;
  }

  // Strip renderApp()-injected duplicates before anything else reads the DOM
  purgeDuplicates();

  // ① DOM CACHE — populate all element refs once; used by cursor, animations, etc.
  DOMCache.init();

  // ② CURSOR
  initCursor();

  // ③ MODALS — single delegated listener, phase 4 singleton
  initModals();

  // ④ RENDERER — phase 2 singleton guard prevents double-init
  const renderer = getRenderer();
  if (renderer) startLoop();

  // ⑤ ANIMATIONS
  initAnimations();

  // ⑥ AUTH — resolve DOM refs, wire events, then subscribe to session
  resolveRefs();
  wireEvents();
  await initAuth(updateUI);
}

// ── Entry point ────────────────────────────────────────────────────────────
// Guard against the dynamic-import timing race: if DOMContentLoaded already
// fired by the time this module loads, run boot() immediately.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => boot());
} else {
  boot();
}

window.addEventListener("beforeunload", teardownAuth);

pingSupabase().then((connected) => {
  if (connected) {
    console.log("🔥 UrLife Nexus Connected Successfully!");
  } else {
    console.error("🚨 Connection Failed");
  }
});
