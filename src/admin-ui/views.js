// One render function per tab. Each returns nothing and owns its own DOM,
// re-rendering from the server after every mutation so the panel never drifts
// from what the API actually stored.

import { api, ApiError } from './api.js';
import { $, esc, toast, toDateInput, fromDateInput, formatDate, toList, fromList, clean, confirmDelete } from './ui.js';

const panel = () => $('panel');

function fail(err) {
  const message = err instanceof ApiError ? err.fullMessage : err.message;
  toast(message, true);
  console.error(err);
}

async function withSave(button, fn) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = '...';
  try {
    await fn();
  } catch (err) {
    fail(err);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function loading() {
  panel().innerHTML = '<div class="loading">загрузка...</div>';
}

/** Field readers bound to one card, so every card doesn't redeclare them. */
function fields(el) {
  const raw = (sel) => el.querySelector(sel).value;
  return {
    raw,
    val: (sel) => raw(sel).trim(),
    num: (sel, fallback = 0) => Number(raw(sel).trim()) || fallback,
    checked: (sel) => el.querySelector(sel).checked,
    date: (sel) => fromDateInput(raw(sel)),
  };
}

/**
 * The shell every entity tab shares: load, a header with an add button, and a
 * list that says so when it is empty.
 */
async function renderList({ title, hint, load, card, empty = 'Пока пусто' }) {
  loading();
  const items = await load();

  panel().innerHTML = `
    <div class="section-head">
      <div class="section-title">// ${esc(title)}</div>
      <button id="add" class="btn">+ ДОБАВИТЬ</button>
    </div>
    ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
    <div id="list">${items.length ? '' : `<div class="empty">${esc(empty)}</div>`}</div>`;

  const list = $('list');
  items.forEach((item) => list.appendChild(card(item, items)));
  $('add').onclick = () => list.prepend(card(null, items));
}

/**
 * Wires a card's save and delete buttons.
 *
 * Each entity tab used to carry its own copy: the same isNew branch, the same
 * confirm, and a hand-rolled try/catch doing by hand what withSave already
 * does. Delete now reports failures exactly the way save does, which the
 * copies had drifted away from.
 */
function wireCard(el, opts) {
  const { isNew, label, payload, create, update, remove, refresh } = opts;
  const { createdToast = 'Создано', refreshOnUpdate = false } = opts;

  el.querySelector('.f-save').onclick = (e) =>
    withSave(e.target, async () => {
      if (isNew) {
        await create(payload());
        toast(createdToast);
        refresh();
        return;
      }
      await update(payload());
      toast('Сохранено');
      if (refreshOnUpdate) refresh();
    });

  el.querySelector('.f-del').onclick = (e) => {
    // An unsaved card exists only in the browser, so there is nothing to ask
    // about and nothing to delete on the server.
    if (isNew) return el.remove();
    if (!confirmDelete(label)) return undefined;
    return withSave(e.target, async () => {
      await remove();
      toast('Удалено');
      refresh();
    });
  };
}

// ── Profile ──────────────────────────────────────────────────

export async function renderProfile() {
  loading();
  const p = await api.getProfile();
  const s = p.socialLinks ?? {};

  panel().innerHTML = `
    <div class="section-head"><div class="section-title">// ПРОФИЛЬ</div></div>
    <div class="card">
      <div class="grid">
        <label class="field"><span>ИМЯ</span><input id="p-name" value="${esc(p.name)}" /></label>
        <label class="field"><span>ДОЛЖНОСТЬ</span><input id="p-headline" value="${esc(p.headline)}" /></label>
        <label class="field"><span>ЛОКАЦИЯ</span><input id="p-location" value="${esc(p.location)}" /></label>
        <label class="field"><span>EMAIL</span><input id="p-email" type="email" value="${esc(p.email)}" /></label>
        <label class="field"><span>ТЕЛЕФОН (не публикуется)</span><input id="p-phone" value="${esc(p.phone)}" /></label>
        <label class="field"><span>САЙТ</span><input id="p-website" value="${esc(p.website)}" /></label>
        <label class="field full"><span>О СЕБЕ</span><textarea id="p-bio">${esc(p.bio)}</textarea></label>
        <label class="field"><span>АВАТАР (URL)</span><input id="p-avatar" value="${esc(p.avatarUrl)}" /></label>
      </div>
    </div>

    <div class="section-head"><div class="section-title">// ССЫЛКИ</div></div>
    <div class="card">
      <div class="grid">
        <label class="field"><span>GITHUB</span><input id="s-github" value="${esc(s.github)}" /></label>
        <label class="field"><span>LINKEDIN</span><input id="s-linkedin" value="${esc(s.linkedin)}" /></label>
        <label class="field"><span>TELEGRAM</span><input id="s-telegram" value="${esc(s.telegram)}" /></label>
        <label class="field"><span>TWITTER</span><input id="s-twitter" value="${esc(s.twitter)}" /></label>
        <label class="field"><span>DRIBBBLE</span><input id="s-dribbble" value="${esc(s.dribbble)}" /></label>
        <label class="field"><span>BEHANCE</span><input id="s-behance" value="${esc(s.behance)}" /></label>
      </div>
    </div>

    <div class="section-head"><div class="section-title">// MATRIX</div></div>
    <p class="hint">Эти поля управляют заставкой и статусом на сайте. Пересборка не нужна — изменения видны сразу.</p>
    <div class="card">
      <div class="grid">
        <label class="field"><span>ДОСТУПНОСТЬ</span>
          <select id="p-availability">
            ${['AVAILABLE', 'BUSY', 'UNAVAILABLE'].map((v) => `<option value="${v}"${p.availability === v ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
        <label class="field"><span>СТАТУС СИСТЕМЫ</span>
          <select id="p-systemStatus">
            ${['ONLINE', 'OFFLINE', 'MAINTENANCE'].map((v) => `<option value="${v}"${p.systemStatus === v ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
        <label class="field"><span>ЦВЕТ СВЕЧЕНИЯ</span><input id="p-accent" value="${esc(p.accentColor)}" /></label>
        <label class="field"><span>ВЕРСИЯ ПРОФИЛЯ</span><input id="p-version" value="${esc(p.profileVersion)}" /></label>
        <label class="field full"><span>СТРОКИ ЗАГРУЗКИ (по одной на строку)</span><textarea id="p-terminal">${esc((p.terminalMessages ?? []).join('\n'))}</textarea></label>
      </div>
      <div class="row-actions"><button id="p-save" class="btn btn-primary">СОХРАНИТЬ</button></div>
    </div>`;

  $('p-save').onclick = (e) =>
    withSave(e.target, async () => {
      await api.updateProfile({
        ...clean({
          name: $('p-name').value.trim(),
          headline: $('p-headline').value.trim(),
          location: $('p-location').value.trim(),
          email: $('p-email').value.trim(),
          phone: $('p-phone').value.trim(),
          website: $('p-website').value.trim(),
          avatarUrl: $('p-avatar').value.trim(),
          accentColor: $('p-accent').value.trim(),
          profileVersion: $('p-version').value.trim(),
        }),
        bio: $('p-bio').value,
        availability: $('p-availability').value,
        systemStatus: $('p-systemStatus').value,
        terminalMessages: toList($('p-terminal').value.replace(/,/g, '\n')),
        socialLinks: clean({
          github: $('s-github').value.trim(),
          linkedin: $('s-linkedin').value.trim(),
          telegram: $('s-telegram').value.trim(),
          twitter: $('s-twitter').value.trim(),
          dribbble: $('s-dribbble').value.trim(),
          behance: $('s-behance').value.trim(),
        }),
      });
      toast('Профиль сохранён');
    });
}

// ── Experience ───────────────────────────────────────────────

export function renderExperience() {
  return renderList({
    title: 'ОПЫТ РАБОТЫ',
    load: () => api.listExperience(),
    card: experienceCard,
  });
}

function experienceCard(item) {
  const isNew = !item;
  const d = item ?? { company: '', position: '', location: '', description: '', achievements: [], technologies: [], sortOrder: 0, current: false };
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="grid">
      <label class="field"><span>КОМПАНИЯ</span><input class="f-company" value="${esc(d.company)}" /></label>
      <label class="field"><span>ДОЛЖНОСТЬ</span><input class="f-position" value="${esc(d.position)}" /></label>
      <label class="field"><span>ЛОКАЦИЯ</span><input class="f-location" value="${esc(d.location)}" /></label>
      <label class="field"><span>ПОРЯДОК</span><input class="f-sort" type="number" value="${d.sortOrder ?? 0}" /></label>
      <label class="field"><span>НАЧАЛО</span><input class="f-start" type="date" value="${toDateInput(d.startDate)}" /></label>
      <label class="field"><span>ОКОНЧАНИЕ</span><input class="f-end" type="date" value="${toDateInput(d.endDate)}" /></label>
      <label class="field check full"><input class="f-current" type="checkbox"${d.current ? ' checked' : ''} /><span>по настоящее время</span></label>
      <label class="field full"><span>ОПИСАНИЕ</span><textarea class="f-desc">${esc(d.description)}</textarea></label>
      <label class="field full"><span>ДОСТИЖЕНИЯ (через запятую или с новой строки)</span><textarea class="f-ach">${esc((d.achievements ?? []).join('\n'))}</textarea></label>
      <label class="field full"><span>ТЕХНОЛОГИИ (через запятую)</span><input class="f-tech" value="${esc(fromList(d.technologies))}" /></label>
    </div>
    <div class="row-actions">
      <button class="btn btn-primary f-save">${isNew ? 'СОЗДАТЬ' : 'СОХРАНИТЬ'}</button>
      <button class="btn btn-danger f-del">УДАЛИТЬ</button>
    </div>`;

  const f = fields(el);
  const payload = () => ({
    company: f.val('.f-company'),
    position: f.val('.f-position'),
    ...clean({ location: f.val('.f-location') }),
    startDate: f.date('.f-start'),
    endDate: f.date('.f-end'),
    current: f.checked('.f-current'),
    description: f.raw('.f-desc'),
    achievements: toList(f.raw('.f-ach')),
    technologies: toList(f.val('.f-tech')),
    sortOrder: f.num('.f-sort'),
  });

  wireCard(el, {
    isNew,
    payload,
    label: `запись «${d.company}»`,
    createdToast: 'Запись создана',
    create: (body) => api.createExperience(body),
    update: (body) => api.updateExperience(item.id, body),
    remove: () => api.deleteExperience(item.id),
    refresh: renderExperience,
  });

  return el;
}

// ── Projects ─────────────────────────────────────────────────

export function renderProjects() {
  return renderList({
    title: 'ПРОЕКТЫ',
    hint: 'Только проекты со статусом PUBLISHED попадают на сайт.',
    load: async () => (await api.listProjects()).items ?? [],
    card: projectCard,
  });
}

function projectCard(item) {
  const isNew = !item;
  const d = item ?? { title: '', description: '', year: new Date().getFullYear(), technologies: [], featured: false, status: 'PUBLISHED', sortOrder: 0 };
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="grid">
      <label class="field"><span>НАЗВАНИЕ</span><input class="f-title" value="${esc(d.title)}" /></label>
      <label class="field"><span>ПОДЗАГОЛОВОК</span><input class="f-subtitle" value="${esc(d.subtitle)}" /></label>
      <label class="field"><span>ГОД</span><input class="f-year" type="number" value="${esc(d.year)}" /></label>
      <label class="field"><span>РОЛЬ</span><input class="f-role" value="${esc(d.role)}" /></label>
      <label class="field"><span>КЛИЕНТ</span><input class="f-client" value="${esc(d.client)}" /></label>
      <label class="field"><span>ПОРЯДОК</span><input class="f-sort" type="number" value="${d.sortOrder ?? 0}" /></label>
      <label class="field full"><span>ОПИСАНИЕ</span><textarea class="f-desc">${esc(d.description)}</textarea></label>
      <label class="field full"><span>ТЕХНОЛОГИИ (через запятую)</span><input class="f-tech" value="${esc(fromList(d.technologies))}" /></label>
      <label class="field"><span>ОБЛОЖКА (URL)</span><input class="f-cover" value="${esc(d.coverImage)}" /></label>
      <label class="field"><span>ССЫЛКА НА ПРОЕКТ</span><input class="f-live" value="${esc(d.liveUrl)}" /></label>
      <label class="field"><span>GITHUB</span><input class="f-github" value="${esc(d.githubUrl)}" /></label>
      <label class="field"><span>СТАТУС</span>
        <select class="f-status">
          ${['PUBLISHED', 'DRAFT', 'ARCHIVED'].map((v) => `<option value="${v}"${d.status === v ? ' selected' : ''}>${v}</option>`).join('')}
        </select>
      </label>
      <label class="field check full"><input class="f-featured" type="checkbox"${d.featured ? ' checked' : ''} /><span>избранный</span></label>
    </div>
    <div class="row-actions">
      <button class="btn btn-primary f-save">${isNew ? 'СОЗДАТЬ' : 'СОХРАНИТЬ'}</button>
      <button class="btn btn-danger f-del">УДАЛИТЬ</button>
    </div>`;

  const f = fields(el);
  const payload = () => ({
    title: f.val('.f-title'),
    description: f.raw('.f-desc'),
    // No fallback: a blank year must fail validation rather than silently
    // becoming a real year.
    year: Number(f.val('.f-year')),
    ...clean({
      subtitle: f.val('.f-subtitle'),
      role: f.val('.f-role'),
      client: f.val('.f-client'),
      coverImage: f.val('.f-cover'),
      liveUrl: f.val('.f-live'),
      githubUrl: f.val('.f-github'),
    }),
    technologies: toList(f.val('.f-tech')),
    featured: f.checked('.f-featured'),
    status: f.val('.f-status'),
    sortOrder: f.num('.f-sort'),
  });

  wireCard(el, {
    isNew,
    payload,
    label: `проект «${d.title}»`,
    createdToast: 'Проект создан',
    create: (body) => api.createProject(body),
    update: (body) => api.updateProject(item.id, body),
    remove: () => api.deleteProject(item.id),
    refresh: renderProjects,
  });

  return el;
}

// ── Skills ───────────────────────────────────────────────────

export function renderSkills() {
  // Relations arrive alongside the skills but are needed by the cards, which
  // renderList only hands the list itself; captured here as load runs first.
  let relations = [];
  return renderList({
    title: 'МАТРИЦА НАВЫКОВ',
    hint: 'Категория задаёт колонку матрицы на сайте, уровень — размер точки. Связи рисуют линии между навыками.',
    load: async () => {
      const matrix = await api.skillMatrix();
      relations = matrix.relations ?? [];
      return matrix.skills ?? [];
    },
    card: (item, skills) => skillCard(item, skills, relations),
  });
}

function skillCard(item, allSkills, relations) {
  const isNew = !item;
  const d = item ?? { name: '', category: '', level: 3, sortOrder: 0 };
  const mine = isNew ? [] : relations.filter((r) => r.skillId === item.id);
  const nameOf = (id) => allSkills.find((s) => s.id === id)?.name ?? id;

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="grid">
      <label class="field"><span>НАЗВАНИЕ</span><input class="f-name" value="${esc(d.name)}" /></label>
      <label class="field"><span>КАТЕГОРИЯ</span><input class="f-cat" value="${esc(d.category)}" placeholder="DESIGN / ENGINEERING / ..." /></label>
      <label class="field"><span>УРОВЕНЬ (1–5)</span><input class="f-level" type="number" min="1" max="5" value="${d.level}" /></label>
      <label class="field"><span>ЛЕТ ОПЫТА</span><input class="f-years" type="number" step="0.5" value="${d.years ?? ''}" /></label>
      <label class="field"><span>ЦВЕТ</span><input class="f-color" value="${esc(d.color)}" placeholder="#5dff8d" /></label>
      <label class="field"><span>ПОРЯДОК</span><input class="f-sort" type="number" value="${d.sortOrder ?? 0}" /></label>
    </div>
    ${isNew ? '' : `
      <div class="card-sub" style="margin-top:14px">СВЯЗИ: ${mine.length ? mine.map((r) => `<span class="badge">${esc(nameOf(r.relatedSkillId))} (${r.strength}) <a href="#" data-unlink="${esc(r.relatedSkillId)}" style="color:var(--danger);text-decoration:none">×</a></span>`).join(' ') : '<span style="color:var(--text-faint)">нет</span>'}</div>
      <div class="row-actions">
        <select class="f-rel" style="max-width:220px">
          <option value="">— связать с —</option>
          ${allSkills.filter((s) => s.id !== item.id).map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}
        </select>
        <input class="f-strength" type="number" min="1" max="5" value="3" style="max-width:80px" title="сила связи" />
        <button class="btn btn-sm f-link">СВЯЗАТЬ</button>
      </div>`}
    <div class="row-actions">
      <button class="btn btn-primary f-save">${isNew ? 'СОЗДАТЬ' : 'СОХРАНИТЬ'}</button>
      <button class="btn btn-danger f-del">УДАЛИТЬ</button>
    </div>`;

  const f = fields(el);
  const payload = () => ({
    name: f.val('.f-name'),
    category: f.val('.f-cat'),
    level: f.num('.f-level', 1),
    ...clean({ color: f.val('.f-color') }),
    ...(f.val('.f-years') ? { years: Number(f.val('.f-years')) } : {}),
    sortOrder: f.num('.f-sort'),
  });

  wireCard(el, {
    isNew,
    payload,
    label: `навык «${d.name}»`,
    createdToast: 'Навык создан',
    create: (body) => api.createSkill(body),
    update: (body) => api.updateSkill(item.id, body),
    remove: () => api.deleteSkill(item.id),
    refresh: renderSkills,
    // A rename has to redraw every other card's relation badges, which show
    // this skill by name.
    refreshOnUpdate: true,
  });

  el.querySelector('.f-link')?.addEventListener('click', async (e) => {
    const target = el.querySelector('.f-rel').value;
    if (!target) return;
    await withSave(e.target, async () => {
      await api.addSkillRelation(item.id, target, Number(el.querySelector('.f-strength').value) || 1);
      toast('Связь создана');
      renderSkills();
    });
  });

  el.querySelectorAll('[data-unlink]').forEach((a) => {
    a.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        await api.removeSkillRelation(item.id, a.dataset.unlink);
        toast('Связь удалена');
        renderSkills();
      } catch (err) {
        fail(err);
      }
    });
  });

  return el;
}

// ── Education / Certificates ─────────────────────────────────

export function renderEducation() {
  return renderList({
    title: 'ОБРАЗОВАНИЕ',
    load: () => api.listEducation(),
    card: educationCard,
  });
}

function educationCard(item) {
  const isNew = !item;
  const d = item ?? { institution: '', degree: '', field: '', description: '', sortOrder: 0 };
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="grid">
      <label class="field"><span>УЧЕБНОЕ ЗАВЕДЕНИЕ</span><input class="f-inst" value="${esc(d.institution)}" /></label>
      <label class="field"><span>СТЕПЕНЬ</span><input class="f-degree" value="${esc(d.degree)}" /></label>
      <label class="field"><span>СПЕЦИАЛЬНОСТЬ</span><input class="f-field" value="${esc(d.field)}" /></label>
      <label class="field"><span>ПОРЯДОК</span><input class="f-sort" type="number" value="${d.sortOrder ?? 0}" /></label>
      <label class="field"><span>НАЧАЛО</span><input class="f-start" type="date" value="${toDateInput(d.startDate)}" /></label>
      <label class="field"><span>ОКОНЧАНИЕ</span><input class="f-end" type="date" value="${toDateInput(d.endDate)}" /></label>
      <label class="field full"><span>ОПИСАНИЕ</span><textarea class="f-desc">${esc(d.description)}</textarea></label>
    </div>
    <div class="row-actions">
      <button class="btn btn-primary f-save">${isNew ? 'СОЗДАТЬ' : 'СОХРАНИТЬ'}</button>
      <button class="btn btn-danger f-del">УДАЛИТЬ</button>
    </div>`;

  const f = fields(el);
  const payload = () => ({
    institution: f.val('.f-inst'),
    degree: f.val('.f-degree'),
    ...clean({ field: f.val('.f-field'), description: f.val('.f-desc') }),
    startDate: f.date('.f-start'),
    endDate: f.date('.f-end'),
    sortOrder: f.num('.f-sort'),
  });

  wireCard(el, {
    isNew,
    payload,
    label: `запись «${d.institution}»`,
    create: (body) => api.createEducation(body),
    update: (body) => api.updateEducation(item.id, body),
    remove: () => api.deleteEducation(item.id),
    refresh: renderEducation,
  });

  return el;
}

export function renderCertificates() {
  return renderList({
    title: 'СЕРТИФИКАТЫ',
    load: () => api.listCertificates(),
    card: certificateCard,
  });
}

function certificateCard(item) {
  const isNew = !item;
  const d = item ?? { title: '', issuer: '', sortOrder: 0 };
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="grid">
      <label class="field"><span>НАЗВАНИЕ</span><input class="f-title" value="${esc(d.title)}" /></label>
      <label class="field"><span>КЕМ ВЫДАН</span><input class="f-issuer" value="${esc(d.issuer)}" /></label>
      <label class="field"><span>ДАТА ВЫДАЧИ</span><input class="f-date" type="date" value="${toDateInput(d.issueDate)}" /></label>
      <label class="field"><span>ПОРЯДОК</span><input class="f-sort" type="number" value="${d.sortOrder ?? 0}" /></label>
      <label class="field"><span>ССЫЛКА</span><input class="f-url" value="${esc(d.credentialUrl)}" /></label>
      <label class="field"><span>ID СЕРТИФИКАТА</span><input class="f-cid" value="${esc(d.credentialId)}" /></label>
    </div>
    <div class="row-actions">
      <button class="btn btn-primary f-save">${isNew ? 'СОЗДАТЬ' : 'СОХРАНИТЬ'}</button>
      <button class="btn btn-danger f-del">УДАЛИТЬ</button>
    </div>`;

  const f = fields(el);
  const payload = () => ({
    title: f.val('.f-title'),
    issuer: f.val('.f-issuer'),
    issueDate: f.date('.f-date'),
    ...clean({ credentialUrl: f.val('.f-url'), credentialId: f.val('.f-cid') }),
    sortOrder: f.num('.f-sort'),
  });

  wireCard(el, {
    isNew,
    payload,
    label: `сертификат «${d.title}»`,
    create: (body) => api.createCertificate(body),
    update: (body) => api.updateCertificate(item.id, body),
    remove: () => api.deleteCertificate(item.id),
    refresh: renderCertificates,
  });

  return el;
}

// ── Resume ───────────────────────────────────────────────────

export async function renderResume() {
  loading();
  const items = await api.listResumes();

  panel().innerHTML = `
    <div class="section-head"><div class="section-title">// РЕЗЮМЕ (PDF)</div></div>
    <p class="hint">Кнопка скачивания появляется на сайте только когда есть активная версия. Файл отдаётся по временной ссылке, прямого доступа к хранилищу нет.</p>
    <div class="card">
      <div class="grid">
        <label class="field"><span>ФАЙЛ (PDF, до 10 МБ)</span><input id="r-file" type="file" accept="application/pdf" /></label>
        <label class="field"><span>ВЕРСИЯ (необязательно)</span><input id="r-version" placeholder="2026.1" /></label>
      </div>
      <div class="row-actions"><button id="r-upload" class="btn btn-primary">ЗАГРУЗИТЬ</button></div>
    </div>
    <div id="list">${items.length ? '' : '<div class="empty">Резюме ещё не загружено</div>'}</div>`;

  const list = $('list');
  items.forEach((r) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div class="card-head">
        <div>
          <div class="card-title">${esc(r.version)} ${r.active ? '<span class="badge new">АКТИВНАЯ</span>' : ''}</div>
          <div class="card-sub">загружено ${formatDate(r.uploadedAt)}</div>
        </div>
        <div class="card-actions">
          ${r.active ? '' : '<button class="btn btn-sm f-act">СДЕЛАТЬ АКТИВНОЙ</button>'}
          ${r.active ? '' : '<button class="btn btn-sm btn-danger f-del">УДАЛИТЬ</button>'}
        </div>
      </div>`;
    el.querySelector('.f-act')?.addEventListener('click', async (e) => {
      await withSave(e.target, async () => {
        await api.activateResume(r.id);
        toast('Версия активирована');
        renderResume();
      });
    });
    el.querySelector('.f-del')?.addEventListener('click', (e) => {
      if (!confirmDelete(`версию «${r.version}»`)) return undefined;
      return withSave(e.target, async () => {
        await api.deleteResume(r.id);
        toast('Удалено');
        renderResume();
      });
    });
    list.appendChild(el);
  });

  $('r-upload').onclick = (e) =>
    withSave(e.target, async () => {
      const file = $('r-file').files?.[0];
      if (!file) throw new Error('Выберите PDF-файл');
      await api.uploadResume(file, $('r-version').value.trim() || undefined);
      toast('Резюме загружено и активировано');
      renderResume();
    });
}

// ── Messages ─────────────────────────────────────────────────

export async function renderMessages() {
  loading();
  const res = await api.listMessages();
  const items = res.items ?? [];

  panel().innerHTML = `
    <div class="section-head"><div class="section-title">// СООБЩЕНИЯ (${items.length})</div></div>
    <p class="hint">IP отправителей не сохраняются — только их хэш, для защиты от спама.</p>
    <div id="list">${items.length ? '' : '<div class="empty">Сообщений нет</div>'}</div>`;

  const list = $('list');
  items.forEach((m) => {
    const el = document.createElement('div');
    el.className = 'card';
    const badge = m.status === 'NEW' ? 'new' : m.status === 'SPAM' ? 'spam' : '';
    el.innerHTML = `
      <div class="card-head">
        <div>
          <div class="card-title">${esc(m.subject)} <span class="badge ${badge}">${esc(m.status)}</span></div>
          <div class="card-sub">${esc(m.name)} — <a href="mailto:${esc(m.email)}" class="link">${esc(m.email)}</a>${
            m.phone ? ` · <a href="tel:${esc(m.phone)}" class="link">${esc(m.phone)}</a>` : ''
          } · ${formatDate(m.createdAt)}</div>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm f-arch">В АРХИВ</button>
          <button class="btn btn-sm f-spam">СПАМ</button>
          <button class="btn btn-sm btn-danger f-del">УДАЛИТЬ</button>
        </div>
      </div>
      <div class="msg-body">${esc(m.message)}</div>`;

    const setStatus = async (status, btn) => {
      await withSave(btn, async () => {
        await api.setMessageStatus(m.id, status);
        toast('Статус обновлён');
        renderMessages();
      });
    };
    el.querySelector('.f-arch').onclick = (e) => setStatus('ARCHIVED', e.target);
    el.querySelector('.f-spam').onclick = (e) => setStatus('SPAM', e.target);
    el.querySelector('.f-del').onclick = (e) => {
      if (!confirmDelete('сообщение')) return undefined;
      return withSave(e.target, async () => {
        await api.deleteMessage(m.id);
        toast('Удалено');
        renderMessages();
      });
    };
    list.appendChild(el);
  });
}

// ── Account ──────────────────────────────────────────────────

export async function renderAccount(onLoggedOut) {
  loading();
  const me = await api.me();

  panel().innerHTML = `
    <div class="section-head"><div class="section-title">// АККАУНТ</div></div>
    <div class="card">
      <div class="card-sub">${esc(me.email)} · роль ${esc(me.role)}</div>
    </div>

    <div class="section-head"><div class="section-title">// СМЕНА ПАРОЛЯ</div></div>
    <p class="hint">После смены все сессии завершаются, включая текущую — потребуется войти заново.</p>
    <div class="card">
      <div class="grid">
        <label class="field"><span>ТЕКУЩИЙ ПАРОЛЬ</span><input id="a-cur" type="password" autocomplete="current-password" /></label>
        <label class="field"><span>НОВЫЙ ПАРОЛЬ</span><input id="a-new" type="password" autocomplete="new-password" /></label>
      </div>
      <p class="hint" style="margin-top:12px">Минимум 12 символов, строчная и заглавная буквы, цифра.</p>
      <div class="row-actions"><button id="a-save" class="btn btn-primary">СМЕНИТЬ ПАРОЛЬ</button></div>
    </div>`;

  $('a-save').onclick = (e) =>
    withSave(e.target, async () => {
      await api.changePassword($('a-cur').value, $('a-new').value);
      toast('Пароль изменён — войдите заново');
      setTimeout(onLoggedOut, 1200);
    });
}
