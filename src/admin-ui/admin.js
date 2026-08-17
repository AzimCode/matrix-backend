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

  // The site is on a different host, so the panel has to be told where it is
  // rather than guessing from its own address — getting that wrong is what
  // sends people to the API root looking for the site.
  const link = $('site-link');
  try {
    const { siteUrl } = await api.config();
    if (siteUrl) {
      link.href = siteUrl;
      link.hidden = false;
    } else {
      link.hidden = true;
    }
  } catch {
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

/**
 * Reporting every failure as "wrong password" is actively misleading: the
 * login route is rate limited at 5 attempts a minute, so someone retrying a
 * *correct* password gets throttled and told their credentials are wrong.
 * Only an actual 401 means bad credentials.
 */
function loginErrorText(err) {
  if (!(err instanceof ApiError)) {
    return 'Сервер недоступен. Проверьте подключение.';
  }
  switch (err.code) {
    case 'UNAUTHORIZED':
      return 'Неверная почта или пароль';
    case 'ACCOUNT_LOCKED':
      return err.message;
    case 'RATE_LIMITED':
    case 'HTTP_429':
      return 'Слишком много попыток входа. Подождите минуту и попробуйте снова.';
    case 'VALIDATION_ERROR':
      return err.fullMessage;
    case 'TIMEOUT':
      return 'Сервер не ответил вовремя. Проверьте подключение и попробуйте снова.';
    case 'NETWORK':
      return 'Не удалось связаться с сервером. Возможно, запрос блокируется сетью или расширением браузера.';
    default:
      return err.message || 'Не удалось войти';
  }
}

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
    errEl.textContent = loginErrorText(err);
    // On a phone the message lands below the fold behind the keyboard, so an
    // unscrolled failure reads as "nothing happened".
    errEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } finally {
    btn.disabled = false;
    btn.textContent = 'AUTHENTICATE';
  }
});

// Typing a long password blind on a phone is its own source of failed logins.
$('pw-toggle').addEventListener('click', () => {
  const input = $('login-password');
  const shown = input.type === 'text';
  input.type = shown ? 'password' : 'text';
  $('pw-toggle').textContent = shown ? 'показать' : 'скрыть';
  input.focus();
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
