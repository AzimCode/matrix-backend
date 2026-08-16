import { api, ApiError } from './api.js';
import { $, toast } from './ui.js';
import {
  renderProfile,
  renderExperience,
  renderProjects,
  renderSkills,
  renderEducation,
  renderCertificates,
  renderResume,
  renderMessages,
  renderAccount,
} from './views.js';

const VIEWS = {
  profile: renderProfile,
  experience: renderExperience,
  projects: renderProjects,
  skills: renderSkills,
  education: renderEducation,
  certificates: renderCertificates,
  resume: renderResume,
  messages: renderMessages,
  account: () => renderAccount(showLogin),
};

function showLogin() {
  $('app-view').hidden = true;
  $('login-view').hidden = false;
  $('login-password').value = '';
}

async function showApp(user) {
  $('login-view').hidden = true;
  $('app-view').hidden = false;
  $('whoami').textContent = `${user.email} · ${user.role}`;

  // The public site lives on its own domain; derive nothing, just link to the
  // known one when configured, else hide the link.
  const link = $('site-link');
  const siteUrl = document.documentElement.dataset.siteUrl;
  if (siteUrl) {
    link.href = siteUrl;
  } else {
    link.hidden = true;
  }

  await openTab(localStorage.getItem('admin.tab') || 'profile');
}

async function openTab(name) {
  const view = VIEWS[name] ? name : 'profile';
  localStorage.setItem('admin.tab', view);

  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === view);
  });

  try {
    await VIEWS[view]();
  } catch (err) {
    // An expired session surfaces as 401 on the first data call after the
    // access token lapses; try one silent refresh before forcing a re-login.
    if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
      showLogin();
      toast('Сессия истекла — войдите заново', true);
      return;
    }
    $('panel').innerHTML = `<div class="empty">Не удалось загрузить: ${err.message}</div>`;
  }
}

$('tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) openTab(tab.dataset.tab);
});

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('login-submit');
  const errEl = $('login-error');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const { user } = await api.login($('login-email').value.trim(), $('login-password').value);
    await showApp(user);
  } catch (err) {
    errEl.textContent =
      err instanceof ApiError && err.code === 'ACCOUNT_LOCKED'
        ? err.message
        : 'Неверная почта или пароль';
  } finally {
    btn.disabled = false;
    btn.textContent = 'AUTHENTICATE';
  }
});

$('logout').addEventListener('click', async () => {
  try {
    await api.logout();
  } catch {
    // Even if the call fails the local session is finished; fall through.
  }
  showLogin();
});

// Restore an existing session on load rather than always showing the form.
(async () => {
  try {
    const user = await api.me();
    await showApp(user);
  } catch {
    showLogin();
  }
})();
