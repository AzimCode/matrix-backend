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

export async function renderExperience() {
  loading();
  const items = await api.listExperience();

  panel().innerHTML = `
    <div class="section-head">
      <div class="section-title">// ОПЫТ РАБОТЫ</div>
      <button id="add" class="btn">+ ДОБАВИТЬ</button>
    </div>
    <div id="list">${items.length ? '' : '<div class="empty">Пока пусто</div>'}</div>`;

  const list = $('list');
  items.forEach((item) => list.appendChild(experienceCard(item)));
  $('add').onclick = () => list.prepend(experienceCard(null));
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

  const val = (c) => el.querySelector(c).value.trim();
  const payload = () => ({
    company: val('.f-company'),
    position: val('.f-position'),
    ...clean({ location: val('.f-location') }),
    startDate: fromDateInput(el.querySelector('.f-start').value),
    endDate: fromDateInput(el.querySelector('.f-end').value),
    current: el.querySelector('.f-current').checked,
    description: el.querySelector('.f-desc').value,
    achievements: toList(el.querySelector('.f-ach').value),
    technologies: toList(val('.f-tech')),
    sortOrder: Number(val('.f-sort')) || 0,
  });

  el.querySelector('.f-save').onclick = (e) =>
    withSave(e.target, async () => {
      if (isNew) {
        await api.createExperience(payload());
        toast('Запись создана');
        renderExperience();
      } else {
        await api.updateExperience(item.id, payload());
        toast('Сохранено');
      }
    });

  el.querySelector('.f-del').onclick = async () => {
    if (isNew) return el.remove();
    if (!confirmDelete(`запись «${item.company}»`)) return;
    try {
      await api.deleteExperience(item.id);
      toast('Удалено');
      renderExperience();
    } catch (err) {
      fail(err);
    }
  };

  return el;
}

// ── Projects ─────────────────────────────────────────────────

export async function renderProjects() {
  loading();
  const res = await api.listProjects();
  const items = res.items ?? [];

  panel().innerHTML = `
    <div class="section-head">
      <div class="section-title">// ПРОЕКТЫ</div>
      <button id="add" class="btn">+ ДОБАВИТЬ</button>
    </div>
    <p class="hint">Только проекты со статусом PUBLISHED попадают на сайт.</p>
    <div id="list">${items.length ? '' : '<div class="empty">Пока пусто</div>'}</div>`;

  const list = $('list');
  items.forEach((item) => list.appendChild(projectCard(item)));
  $('add').onclick = () => list.prepend(projectCard(null));
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

  const val = (c) => el.querySelector(c).value.trim();
  const payload = () => ({
    title: val('.f-title'),
    description: el.querySelector('.f-desc').value,
    year: Number(val('.f-year')),
    ...clean({
      subtitle: val('.f-subtitle'),
      role: val('.f-role'),
      client: val('.f-client'),
      coverImage: val('.f-cover'),
      liveUrl: val('.f-live'),
      githubUrl: val('.f-github'),
    }),
    technologies: toList(val('.f-tech')),
    featured: el.querySelector('.f-featured').checked,
    status: val('.f-status'),
    sortOrder: Number(val('.f-sort')) || 0,
  });

  el.querySelector('.f-save').onclick = (e) =>
    withSave(e.target, async () => {
      if (isNew) {
        await api.createProject(payload());
        toast('Проект создан');
        renderProjects();
      } else {
        await api.updateProject(item.id, payload());
        toast('Сохранено');
      }
    });

  el.querySelector('.f-del').onclick = async () => {
    if (isNew) return el.remove();
    if (!confirmDelete(`проект «${item.title}»`)) return;
    try {
      await api.deleteProject(item.id);
      toast('Удалено');
      renderProjects();
    } catch (err) {
      fail(err);
    }
  };

  return el;
}

// ── Skills ───────────────────────────────────────────────────

export async function renderSkills() {
  loading();
  const { skills, relations } = await api.skillMatrix();

  panel().innerHTML = `
    <div class="section-head">
      <div class="section-title">// МАТРИЦА НАВЫКОВ</div>
      <button id="add" class="btn">+ ДОБАВИТЬ</button>
    </div>
    <p class="hint">Категория задаёт колонку матрицы на сайте, уровень — размер точки. Связи рисуют линии между навыками.</p>
    <div id="list">${skills.length ? '' : '<div class="empty">Пока пусто</div>'}</div>`;

  const list = $('list');
  skills.forEach((s) => list.appendChild(skillCard(s, skills, relations)));
  $('add').onclick = () => list.prepend(skillCard(null, skills, relations));
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

  const val = (c) => el.querySelector(c).value.trim();
  const payload = () => ({
    name: val('.f-name'),
    category: val('.f-cat'),
    level: Number(val('.f-level')) || 1,
    ...clean({ color: val('.f-color') }),
    ...(val('.f-years') ? { years: Number(val('.f-years')) } : {}),
    sortOrder: Number(val('.f-sort')) || 0,
  });

  el.querySelector('.f-save').onclick = (e) =>
    withSave(e.target, async () => {
      if (isNew) {
        await api.createSkill(payload());
        toast('Навык создан');
      } else {
        await api.updateSkill(item.id, payload());
        toast('Сохранено');
      }
      renderSkills();
    });

  el.querySelector('.f-del').onclick = async () => {
    if (isNew) return el.remove();
    if (!confirmDelete(`навык «${item.name}»`)) return;
    try {
      await api.deleteSkill(item.id);
      toast('Удалено');
      renderSkills();
    } catch (err) {
      fail(err);
    }
  };

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

export async function renderEducation() {
  loading();
  const items = await api.listEducation();
  panel().innerHTML = `
    <div class="section-head">
      <div class="section-title">// ОБРАЗОВАНИЕ</div>
      <button id="add" class="btn">+ ДОБАВИТЬ</button>
    </div>
    <div id="list">${items.length ? '' : '<div class="empty">Пока пусто</div>'}</div>`;
  const list = $('list');
  items.forEach((i) => list.appendChild(educationCard(i)));
  $('add').onclick = () => list.prepend(educationCard(null));
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

  const val = (c) => el.querySelector(c).value.trim();
  const payload = () => ({
    institution: val('.f-inst'),
    degree: val('.f-degree'),
    ...clean({ field: val('.f-field'), description: el.querySelector('.f-desc').value.trim() }),
    startDate: fromDateInput(el.querySelector('.f-start').value),
    endDate: fromDateInput(el.querySelector('.f-end').value),
    sortOrder: Number(val('.f-sort')) || 0,
  });

  el.querySelector('.f-save').onclick = (e) =>
    withSave(e.target, async () => {
      if (isNew) {
        await api.createEducation(payload());
        toast('Создано');
        renderEducation();
      } else {
        await api.updateEducation(item.id, payload());
        toast('Сохранено');
      }
    });

  el.querySelector('.f-del').onclick = async () => {
    if (isNew) return el.remove();
    if (!confirmDelete(`запись «${item.institution}»`)) return;
    try {
      await api.deleteEducation(item.id);
      toast('Удалено');
      renderEducation();
    } catch (err) {
      fail(err);
    }
  };

  return el;
}

export async function renderCertificates() {
  loading();
  const items = await api.listCertificates();
  panel().innerHTML = `
    <div class="section-head">
      <div class="section-title">// СЕРТИФИКАТЫ</div>
      <button id="add" class="btn">+ ДОБАВИТЬ</button>
    </div>
    <div id="list">${items.length ? '' : '<div class="empty">Пока пусто</div>'}</div>`;
  const list = $('list');
  items.forEach((i) => list.appendChild(certificateCard(i)));
  $('add').onclick = () => list.prepend(certificateCard(null));
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

  const val = (c) => el.querySelector(c).value.trim();
  const payload = () => ({
    title: val('.f-title'),
    issuer: val('.f-issuer'),
    issueDate: fromDateInput(el.querySelector('.f-date').value),
    ...clean({ credentialUrl: val('.f-url'), credentialId: val('.f-cid') }),
    sortOrder: Number(val('.f-sort')) || 0,
  });

  el.querySelector('.f-save').onclick = (e) =>
    withSave(e.target, async () => {
      if (isNew) {
        await api.createCertificate(payload());
        toast('Создано');
        renderCertificates();
      } else {
        await api.updateCertificate(item.id, payload());
        toast('Сохранено');
      }
    });

  el.querySelector('.f-del').onclick = async () => {
    if (isNew) return el.remove();
    if (!confirmDelete(`сертификат «${item.title}»`)) return;
    try {
      await api.deleteCertificate(item.id);
      toast('Удалено');
      renderCertificates();
    } catch (err) {
      fail(err);
    }
  };

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
    el.querySelector('.f-del')?.addEventListener('click', async () => {
      if (!confirmDelete(`версию «${r.version}»`)) return;
      try {
        await api.deleteResume(r.id);
        toast('Удалено');
        renderResume();
      } catch (err) {
        fail(err);
      }
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
          <div class="card-sub">${esc(m.name)} — ${esc(m.email)} · ${formatDate(m.createdAt)}</div>
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
    el.querySelector('.f-del').onclick = async () => {
      if (!confirmDelete('сообщение')) return;
      try {
        await api.deleteMessage(m.id);
        toast('Удалено');
        renderMessages();
      } catch (err) {
        fail(err);
      }
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
