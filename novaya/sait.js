/* АКСИОМА — главная: движение как у Turner, меню, вкладки, расчёт.
   Подключается с defer; если что-то сломается до конца файла, страница покажется без анимаций (см. <head>). */
(() => {
  const root = document.documentElement;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const twoFrames = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)'), fineMQ = matchMedia('(pointer: fine)');
  const stackMQ = matchMedia('(max-width: 1180px) and (max-aspect-ratio: 1/1), (max-width: 760px)');
  const phoneMQ = matchMedia('(max-width: 760px)');
  let reduce = reduceMQ.matches, fine = fineMQ.matches;
  const isMac = /Mac/.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.userAgent);
  const M = { wheel: isMac ? 0.5 : 0.84, heroImg: 0.36, heroTitle: 0.06, pimg: 22, gpx: 6 };   // скорости: как у Turner (Lenis 1.2 с, фото 0.2 от прокрутки), чуть сильнее — у нас фото, не видео
  const nav = $('#nav');
  let vwSet = '';
  const setVW = () => { const v = root.clientWidth / 100 + 'px'; if (v !== vwSet){ vwSet = v; root.style.setProperty('--vw', v); } };   // сетка по ширине без полосы прокрутки (Windows); не трогаем, если ширина та же — на айфоне resize бывает при каждом скрытии адресной строки
  setVW();
  /* высота экрана запоминается при открытии: на телефоне панели браузера (Safari, Chrome, Telegram, WhatsApp)
     прячутся при прокрутке и меняют высоту окна — из-за этого дом в шапке прыгал. Пересчитываем только при повороте. */
  const coarseMQ = matchMedia('(pointer: coarse)');
  let frozenW = -1;
  function freezeVH(){
    const w = root.clientWidth;
    if (coarseMQ.matches && w === frozenW) return;
    frozenW = w;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:100lvh;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe); const lvh = probe.offsetHeight; probe.remove();
    const vis = innerHeight;
    let big = Math.max(lvh || 0, vis);
    if (coarseMQ.matches && big - vis < 40) big = vis + Math.round(vis * 0.12);   // встроенный браузер мессенджера не знает «большой» высоты — берём запас
    root.style.setProperty('--vh-l', big + 'px');
    root.style.setProperty('--vh-cut', (big - vis) + 'px');
    root.classList.toggle('short', vis <= 640);
  }
  freezeVH();

  /* ── плавная прокрутка с инерцией (как Lenis у Turner): колесо мыши и тачпад ── */
  let target = scrollY, current = scrollY, gliding = false, gT = 0, lastSet = -1, menuOpen = false;
  const maxY = () => root.scrollHeight - innerHeight;
  function stopGlide(){ gliding = false; gT = 0; lastSet = -1; target = current = scrollY; }
  function glide(t){
    if (!gliding) return;
    if (lastSet >= 0 && Math.abs(scrollY - lastSet) > 2){ stopGlide(); return; }   // страницу прокрутил кто-то другой (клавиши, поиск, полоса) — не спорим с ним
    const dt = gT ? Math.min(64, t - gT) : 16.7; gT = t;
    current = lerp(current, target, 1 - Math.exp(-dt / 188));
    if (Math.abs(target - current) < 0.4){ current = target; gliding = false; gT = 0; }
    scrollTo(0, current); lastSet = scrollY;
    if (gliding) requestAnimationFrame(glide); else lastSet = -1;
  }
  function glideTo(y){ target = clamp(y, 0, maxY()); if (!gliding){ gliding = true; current = scrollY; lastSet = -1; requestAnimationFrame(glide); } }
  function onWheel(e){
    if (menuOpen || e.ctrlKey || e.defaultPrevented) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    const k = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
    if (!gliding) target = scrollY;
    glideTo(target + e.deltaY * k * M.wheel);
  }
  let wheelOn = false;
  function syncWheel(){
    const want = !reduce && fine; if (want === wheelOn) return; wheelOn = want;
    if (want) addEventListener('wheel', onWheel, {passive:false}); else { removeEventListener('wheel', onWheel); stopGlide(); }
  }
  syncWheel();
  addEventListener('scroll', () => { if (!gliding) target = current = scrollY; }, {passive:true});
  addEventListener('keydown', e => { if (gliding && ['PageDown', 'PageUp', ' ', 'Home', 'End', 'ArrowDown', 'ArrowUp'].includes(e.key)) stopGlide(); });
  addEventListener('pointerdown', () => { if (gliding) stopGlide(); }, {passive:true});

  /* ── меню ── */
  const burger = $('#burger'), menu = $('#menu'), behind = [$('main'), $('.foot')];
  function openMenu(byKeys){
    menuOpen = true; stopGlide(); root.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Закрыть меню');
    behind.forEach(el => { if (el) el.inert = true; });
    if (byKeys) setTimeout(() => { const a = menu.querySelector('a'); if (a) a.focus({preventScroll:true}); }, 80);
  }
  function closeMenu(focusBack){
    menuOpen = false; root.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Открыть меню');
    behind.forEach(el => { if (el) el.inert = false; });
    if (focusBack) burger.focus({preventScroll:true});
  }
  burger.addEventListener('click', e => menuOpen ? closeMenu(e.detail === 0) : openMenu(e.detail === 0));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) closeMenu(true); });

  /* ── якоря: заголовок раздела не прячется под верхней полосой ── */
  function anchorY(el, id){
    if (id === '#top') return 0;
    const top = el.getBoundingClientRect().top + scrollY;
    if (phoneMQ.matches) return top - (nav.offsetHeight + 16);      // на телефоне полоса всегда видна
    return top - (top < scrollY ? 110 : 40);                        // на компьютере она прячется при прокрутке вниз
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id === '#'){ e.preventDefault(); return; }
    const el = document.querySelector(id); if (!el) return; e.preventDefault();
    if (menuOpen) closeMenu(false);
    if (a.dataset.q) pickType(a.dataset.q);   // «Рассчитать ремонт» → в расчёте уже выбран ремонт
    const y = anchorY(el, id);
    if (reduce || !fine) scrollTo({top:y, behavior: reduce ? 'auto' : 'smooth'}); else glideTo(y);
    if (e.detail === 0 && id !== '#top'){ if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus({preventScroll:true}); }   // с клавиатуры — фокус туда же
  }));

  /* ── появление блоков ── */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } }),
    {rootMargin: phoneMQ.matches ? '0px 0px -6% 0px' : '0px 0px -15% 0px'});   // на телефоне раньше — без пустых полос внизу экрана
  $$('[data-reveal], .h2 .brush').forEach(el => io.observe(el));

  /* ── манифест: слова проявляются по мере прокрутки (текст не превращается в HTML) ── */
  const man = $('[data-words]'), words = [];
  if (man){
    const parts = man.textContent.trim().split(/[ \t\r\n]+/); man.textContent = '';
    parts.forEach((w, i) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; man.append(s); if (i < parts.length - 1) man.append(' '); words.push(s); });
  }

  /* ── всё, что движется от прокрутки ── */
  const heroPin = $('#heroPin'), hero = $('#hero'), heroImgs = $$('#hero [data-hero="img"]'), heroTitle = $('#hero [data-hero="title"]'), heroTags = $$('#hero [data-hero="tag"]');
  const pimgBoxes = $$('.pimg:not(.pimg--x)'), pimgsX = $$('.pimg--x img');
  const build = $('#proekt'), stage = build.querySelector('.stage');
  const steps3 = build.querySelectorAll('.steps3 article'), dots3 = build.querySelectorAll('.steps3-dots i'), ready = $('#ready');
  const stageList = $('#stageList'), stgs = stageList.querySelectorAll('.stg');
  const gal = $('#doma'), galStage = gal.querySelector('.stage'), track = $('#track'), gBar = $('#gBar'), gCount = $('#gCount'), gcards = track.querySelectorAll('.gcard');
  let lastY = scrollY, vh = innerHeight, vw = root.clientWidth;
  const inView = r => r.bottom > -60 && r.top < vh + 60;
  /* фото в рамках двигаем только те, что сейчас на экране */
  const visPimg = new Set();
  const pio = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visPimg.add(e.target) : visPimg.delete(e.target)), {rootMargin:'80px 0px'});
  pimgBoxes.forEach(b => { if (b.querySelector('img')) pio.observe(b); });

  /* кадр считается только когда что-то движется (раньше цикл крутился вечно и грел телефон) */
  let raf = 0, still = 0, prevY = -1;
  const kick = () => { still = 0; if (!raf) raf = requestAnimationFrame(frame); };
  function frame(){
    raf = 0;
    const y = scrollY, desk = !phoneMQ.matches;
    if (!reduce){
      /* шапка: дом уходит медленнее страницы, «Аксиома» парит над ним */
      if (stackMQ.matches){
        /* телефон: шапка стоит, «Аксиома» почти не двигается, шов уходит влево — дом становится цветным */
        const pr = heroPin.getBoundingClientRect();
        if (pr.bottom > 0){
          const hp = clamp(-pr.top / Math.max(1, pr.height - hero.offsetHeight), 0, 1);
          const hk = clamp((hp - 0.04) / 0.86, 0, 1), hs = hk * hk * (3 - 2 * hk);
          hero.style.setProperty('--cutx', (50 * (1 - hs)).toFixed(2) + 'cqw');
          heroImgs.forEach(el => el.style.transform = '');
          heroTitle.style.transform = `translate3d(0,${(-hp * 18).toFixed(1)}px,0)`;
          heroTags.forEach(el => el.style.opacity = clamp(1 - hp * 3, 0, 1).toFixed(3));
        }
      } else if (y < vh * 1.4){
        hero.style.removeProperty('--cutx');
        const p = y / vh;
        heroImgs.forEach(el => el.style.transform = `translate3d(0,${(y * M.heroImg).toFixed(1)}px,0)`);
        heroTitle.style.transform = `translate3d(0,${(y * M.heroTitle).toFixed(1)}px,0)`;
        heroTags.forEach(el => el.style.opacity = clamp(1 - p * 2.2, 0, 1).toFixed(3));
      }
      /* фото в рамках чуть сдвигаются внутри рамки */
      for (const box of visPimg){
        const r = box.getBoundingClientRect();
        const t = clamp((vh - r.top) / (vh + r.height), 0, 1);
        box.firstElementChild.style.setProperty('--py', ((t - 0.5) * M.pimg).toFixed(2) + '%');
      }
    }
    /* манифест */
    if (words.length){
      const r = man.getBoundingClientRect();
      if (inView(r)){
        const n = clamp((vh * (desk ? 0.85 : 0.95) - r.top) / (r.height + vh * 0.35), 0, 1) * words.length;
        words.forEach((w, i) => w.style.setProperty('--o', clamp(0.16 + (n - i) * 0.84, 0.16, 1).toFixed(2)));
      }
    }
    /* от чертежа к дому: шов едет, чертёж становится домом */
    const br = build.getBoundingClientRect();
    if (inView(br)){
      const bp = clamp(-br.top / Math.max(1, br.height - stage.offsetHeight), 0, 1);
      const sp = clamp((bp - 0.05) / 0.8, 0, 1), seam = 100 - sp * sp * (3 - 2 * sp) * 100;
      stage.style.setProperty('--seam', seam.toFixed(2) + 'cqw');
      stage.style.setProperty('--tag-o', clamp((100 - seam) / 6, 0, 1).toFixed(2));
      const rt = 'готовность ' + Math.round(100 - seam) + '%'; if (ready.textContent !== rt) ready.textContent = rt;
      const x = seam / 100 * vw, half = ready.offsetWidth / 2 + 12;   // табличка не уезжает за края экрана
      stage.style.setProperty('--tag-dx', (clamp(x, Math.max(110, half), vw - half) - x).toFixed(1) + 'px');
      if (!reduce) stage.style.setProperty('--drift', (1.08 - bp * 0.08).toFixed(4));
      const k = seam > 66 ? 0 : seam > 33 ? 1 : 2;
      steps3.forEach((a, i) => a.classList.toggle('on', i === k));
      dots3.forEach((d, i) => d.classList.toggle('on', i <= k));
    }
    /* этапы: зелёная линия и активный шаг */
    const sr = stageList.getBoundingClientRect();
    if (inView(sr)){
      stageList.style.setProperty('--fill', clamp((vh * 0.6 - sr.top) / sr.height, 0, 1).toFixed(3));
      stgs.forEach(s => s.classList.toggle('on', s.getBoundingClientRect().top < vh * 0.6));
    }
    /* дома: лента едет вбок, пока листаем вниз */
    const gr = gal.getBoundingClientRect();
    if (desk && inView(gr)){
      const gp = clamp(-gr.top / Math.max(1, gr.height - galStage.offsetHeight), 0, 1);
      const dist = track.scrollWidth - vw;
      track.style.transform = `translate3d(${(-dist * gp * gp * (3 - 2 * gp)).toFixed(1)}px,0,0)`;
      gBar.parentElement.style.setProperty('--gp', gp.toFixed(3));
      const gc = Math.min(gcards.length, 1 + Math.floor(gp * gcards.length * 0.999)) + ' / ' + gcards.length; if (gCount.textContent !== gc) gCount.textContent = gc;
      if (!reduce) for (const img of pimgsX){
        const r = img.parentElement.getBoundingClientRect();
        const c = (r.left + r.width / 2 - vw / 2) / vw;
        img.style.setProperty('--px', (-c * M.gpx).toFixed(2) + '%');
      }
    }
    /* навигация: компактная после 40 px; на компьютере прячется при прокрутке вниз */
    nav.classList.toggle('is-compact', y > 40);
    if (desk && !menuOpen && y > 160 && y > lastY + 1) nav.classList.add('is-hidden');
    else if (!desk || menuOpen || y < lastY - 1 || y <= 160) nav.classList.remove('is-hidden');
    lastY = y;
    if (y !== prevY || gliding) still = 0; prevY = y;
    if (++still < 6) raf = requestAnimationFrame(frame);
  }
  addEventListener('scroll', kick, {passive:true});
  addEventListener('resize', () => { vh = innerHeight; vw = root.clientWidth; setVW(); freezeVH(); kick(); });
  addEventListener('load', kick);
  if (document.fonts) document.fonts.ready.then(kick);
  reduceMQ.addEventListener('change', e => { reduce = e.matches; syncWheel(); kick(); });
  fineMQ.addEventListener('change', e => { fine = e.matches; syncWheel(); });
  kick();

  /* поворот телефона: страница меняет длину — возвращаем читателя в тот же раздел */
  let anchor = null;
  const blocks = $$('main > section, main > div, footer');
  addEventListener('scroll', () => {
    const m = innerHeight / 2;
    for (const b of blocks){ const r = b.getBoundingClientRect(); if (r.top <= m && r.bottom >= m){ anchor = {b, f: (m - r.top) / r.height}; break; } }
  }, {passive:true});
  matchMedia('(orientation: portrait)').addEventListener('change', () => twoFrames(() => {
    if (!anchor) return; const r = anchor.b.getBoundingClientRect();
    stopGlide(); scrollTo(0, scrollY + r.top + anchor.f * r.height - innerHeight / 2);
  }));

  /* шапка ушла с экрана — её анимации на паузе */
  new IntersectionObserver(([e]) => hero.classList.toggle('off', !e.isIntersecting)).observe(hero);

  /* лента домов на телефоне: счётчик при листании пальцем */
  track.addEventListener('scroll', () => { if (!phoneMQ.matches) return; const step = gcards[1].offsetLeft - gcards[0].offsetLeft; gCount.textContent = Math.min(gcards.length, Math.round(track.scrollLeft / step) + 1) + ' / ' + gcards.length; }, {passive:true});

  /* ── вкладки «Почему нам доверяют»: клик, наведение мышью, стрелки; сами листаются, пока блок на экране ── */
  const tabsEl = $('#tabs'), tabBtns = $$('#tabs [role="tab"]'), panes = $$('#tabs .tab-pane'), tabImgs = $$('#tabs .tab-img .pimg'), timerWrap = $('#tabs .timer'), timerBar = $('#tabTimer');
  let tab = 0, pinned = false, lastPtr = 'mouse';
  function setTab(i, focus){
    tab = i;
    tabBtns.forEach((b, j) => { const on = j === i; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    panes.forEach((p, j) => p.classList.toggle('on', j === i)); tabImgs.forEach((p, j) => p.classList.toggle('on', j === i));
    tabBtns[i].parentElement.appendChild(timerWrap);   // полоска-таймер переезжает к активной вкладке и начинает заново
    if (focus) tabBtns[i].focus();
  }
  const pin = () => { pinned = true; tabsEl.classList.remove('run'); };
  tabsEl.addEventListener('pointerdown', e => { lastPtr = e.pointerType; });
  tabBtns.forEach((b, i) => {
    b.addEventListener('click', () => { setTab(i); if (lastPtr !== 'mouse') pin(); });   // пальцем выбрал — не перелистываем у него из-под руки
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setTab(i); });
  });
  tabsEl.querySelector('[role="tablist"]').addEventListener('keydown', e => {
    const n = tabBtns.length, k = e.key;
    const to = k === 'ArrowDown' || k === 'ArrowRight' ? (tab + 1) % n : k === 'ArrowUp' || k === 'ArrowLeft' ? (tab - 1 + n) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
    if (to < 0) return; e.preventDefault(); pin(); setTab(to, true);
  });
  timerBar.addEventListener('animationend', () => { if (!pinned && tabsEl.classList.contains('run')) setTab((tab + 1) % tabBtns.length); });
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ if (!pinned) tabsEl.classList.add('run'); }
    else { tabsEl.classList.remove('run'); pinned = false; }
  }), {threshold:.4}).observe(tabsEl);

  /* ── квиз: считает ориентир как на старом сайте (площадь × цена за м²), заявку не отправляет ── */
  const PACKS = {
    dom:    [['Коробка', 45000], ['Тёплый контур', 56000], ['Дом под ключ', 65000], ['Премиум под ключ', 82000]],
    remont: [['Косметический', 6500], ['Капитальный', 12000], ['Дизайнерский', 18000], ['Премиум', 26000]],
    kom:    [['Базовый запуск', 9000], ['Капитальный', 14000], ['Под ключ', 20000], ['Премиум', 28000]],
  };
  const fmt = n => n.toLocaleString('ru-RU').replace(/\s/g, ' ');
  const qs = $$('.q-step'), qBar = $('#qBar'), qLabel = $('#qLabel'), qNext = $('#qNext'), qBack = $('#qBack'), qDone = $('#qDone'), sheet = $('#sheet');
  const qType = $('#qType'), qPack = $('#qPack'), qArea = $('#qArea'), qAreaOut = $('#qAreaOut'), qTotal = $('#qTotal');
  const qForm = $('#qForm'), qErr = $('#qErr'), fName = qForm.elements.name, fPhone = qForm.elements.phone, fAgree = qForm.elements.agree;
  let q = 0, kind = 'dom', price = 56000;
  const markSel = g => g.querySelectorAll('.opt').forEach(o => o.setAttribute('aria-pressed', o.classList.contains('sel') ? 'true' : 'false'));
  function renderPacks(){
    qPack.replaceChildren(...PACKS[kind].map(([n, p], i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt' + (i === 1 ? ' sel' : ''); b.dataset.p = p;
      const t = document.createElement('span'); t.className = 'opt-t'; t.append(n);
      const s = document.createElement('small'); s.textContent = 'от ' + fmt(p) + ' ₽/м²'; t.append(s); b.append(t); return b;
    }));
    markSel(qPack); price = PACKS[kind][1][1]; total();
  }
  function total(){ qAreaOut.textContent = qArea.value + ' м²'; qTotal.textContent = 'от ' + fmt(qArea.value * price) + ' ₽'; }
  function showQ(scroll){
    qs.forEach((s, i) => s.classList.toggle('on', i === q)); qBar.style.width = ((q + 1) / qs.length * 100) + '%';
    qLabel.textContent = q < qs.length - 1 ? `Вопрос ${q + 1} из ${qs.length}` : 'Финальный шаг';
    qBack.style.visibility = q ? 'visible' : 'hidden'; qNext.textContent = q < qs.length - 1 ? 'Далее' : 'Получить расчёт';
    qDone.classList.remove('on'); qErr.hidden = true;
    if (scroll) qs[q].querySelector('h3').focus({preventScroll:true});
    if (scroll && phoneMQ.matches){   // на телефоне вопрос не уезжает под верхнюю полосу
      const r = sheet.getBoundingClientRect(), top = nav.offsetHeight + 12;
      if (r.top < top && r.height < innerHeight - top) scrollTo({top: scrollY + r.top - top, behavior: reduce ? 'auto' : 'smooth'});
    }
  }
  /* телефон: +7 (XXX) XXX-XX-XX; 8 в начале — это тоже +7 */
  const digits = v => { let d = v.replace(/\D/g, ''); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); if (d.length === 10) d = '7' + d; return d; };
  function fmtPhone(v){
    let d = v.replace(/\D/g, ''); if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1); else if (d[0] !== '7') d = '7' + d;
    const p = d.slice(1, 11); let s = '+7';
    if (p.length) s += ' (' + p.slice(0, 3); if (p.length >= 3) s += ')'; if (p.length > 3) s += ' ' + p.slice(3, 6);
    if (p.length > 6) s += '-' + p.slice(6, 8); if (p.length > 8) s += '-' + p.slice(8, 10);
    return s;
  }
  fPhone.addEventListener('input', e => {
    if (e.inputType && !e.inputType.startsWith('insert')) return;              // стирание не мешаем
    if (fPhone.selectionStart === fPhone.value.length) fPhone.value = fmtPhone(fPhone.value);
  });
  fPhone.addEventListener('blur', () => { fPhone.value = fmtPhone(fPhone.value); });
  [fName, fPhone, fAgree].forEach(el => el.addEventListener('input', () => el.removeAttribute('aria-invalid')));
  function validate(){
    const errs = [], bad = (el, msg) => { el.setAttribute('aria-invalid', 'true'); errs.push([el, msg]); };
    [fName, fPhone, fAgree].forEach(el => el.removeAttribute('aria-invalid'));
    const d = digits(fPhone.value);
    if (fName.value.trim().length < 2) bad(fName, 'Напишите, как к вам обращаться.');
    if (!(d.length === 11 && d[0] === '7')) bad(fPhone, 'Проверьте телефон: нужно 10 цифр после +7.');
    if (!fAgree.checked) bad(fAgree, 'Отметьте согласие на обработку данных.');
    if (errs.length){ qErr.textContent = errs.map(x => x[1]).join(' '); qErr.hidden = false; errs[0][0].focus(); return false; }
    qErr.hidden = true; fPhone.value = fmtPhone(d); return true;
  }
  qNext.addEventListener('click', () => {
    if (q < qs.length - 1){ q++; showQ(true); return; }
    if (validate()) qDone.classList.add('on');   // макет: никуда не отправляем
  });
  qBack.addEventListener('click', () => { if (q){ q--; showQ(true); } });
  qForm.addEventListener('submit', e => { e.preventDefault(); qNext.click(); });
  $$('.opts').forEach(g => { markSel(g); g.addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b) return;
    g.querySelectorAll('.opt').forEach(o => o.classList.toggle('sel', o === b)); markSel(g);
    if (b.dataset.k){ kind = b.dataset.k; renderPacks(); }
    if (b.dataset.a){ qArea.value = b.dataset.a; total(); }
    if (b.dataset.p){ price = +b.dataset.p; total(); }
  }); });
  qArea.addEventListener('input', () => { $$('#qAreaBtns .opt').forEach(o => o.classList.toggle('sel', o.dataset.a === qArea.value)); markSel($('#qAreaBtns')); total(); });
  renderPacks();
  function pickType(id){ const o = qType.querySelector(`[data-id="${id}"]`); if (!o) return; o.click(); q = 0; showQ(false); }

  /* ── старт шапки: ждём только то, что нужно шапке (раньше ждали все картинки страницы) ──
     надпись — когда готовы шрифт и «Аксиома»; чертёж — когда загружен; дом «достраивается», когда фото раскодировано */
  const urlOf = (el, ...props) => { const cs = getComputedStyle(el); for (const p of props){ const m = (cs[p] || '').match(/url\(["']?([^"')]+)["']?\)/); if (m) return m[1]; } return null; };
  const loaded = urls => new Promise(res => {
    const want = urls.filter(Boolean).map(u => new URL(u, location.href).href);
    (function check(){ if (want.every(u => performance.getEntriesByName(u).length)) res(); else setTimeout(check, 50); })();
  });
  const capped = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  const word = $('#hero .script .word'), stroke = $('#hero .script .stroke');
  const uWord = urlOf(word, 'webkitMaskImage', 'maskImage'), uStroke = urlOf(stroke, 'webkitMaskImage', 'maskImage');
  const uDraw = urlOf($('#hero .frame--draw'), 'webkitMaskImage', 'maskImage', 'backgroundImage'), uPhoto = urlOf($('#hero .frame--photo'), 'backgroundImage');
  const fontsP = document.fonts ? Promise.all([document.fonts.load('200 30px Onest', 'Строительная компания'), document.fonts.ready]).catch(() => {}) : Promise.resolve();
  capped(Promise.all([fontsP, loaded([uWord, uStroke])]), 1600).then(() => twoFrames(() => root.classList.remove('is-loading')));
  capped(loaded([uDraw]), 2600).then(() => root.classList.remove('draw-wait'));
  const photoP = uPhoto ? loaded([uPhoto]).then(() => { const i = new Image(); i.src = uPhoto; return i.decode().catch(() => {}); }) : Promise.resolve();
  capped(photoP, 7000).then(() => twoFrames(() => { root.classList.remove('photo-wait'); setTimeout(() => root.classList.add('is-ready'), 1900); }));

  window.AX_OK = true;
})();
