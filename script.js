(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) root.classList.add('js-anim');

  const DAYS = ['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'];
  const DAYS_ACC = ['neděli','pondělí','úterý','středu','čtvrtek','pátek','sobotu'];
  const SHORT = ['Ne','Po','Út','St','Čt','Pá','So'];

  /* ---------- Čas v Praze + stav otevřeno/zavřeno ---------- */
  // OVĚŘIT OTEVÍRACÍ DOBU – začátek (7:00/8:00) není jistý, proto ho neuvádíme.
  const prague = () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
    const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday);
    return { wd, h: +parts.hour % 24, m: +parts.minute };
  };
  const t = prague();
  const workday = t.wd >= 1 && t.wd <= 5;
  const nextOpen = () => (t.wd === 5 || t.wd === 6 || t.wd === 0) ? 'v pondělí' : 'zítra';
  let statusTxt, open = false;
  if (workday && t.h < 16 && t.h >= 8) { statusTxt = 'Teď otevřeno · do 16:00'; open = true; }
  else if (workday && t.h < 8) statusTxt = 'Dnes otevřeno do 16:00';
  else statusTxt = `Teď zavřeno · otevíráme ${nextOpen()}`;
  ['status-hero', 'status-book', 'status-contact'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    if (id === 'status-hero') el.textContent = `${statusTxt} · Ondřejovská 84, Mnichovice`;
    else el.textContent = statusTxt;
    el.classList.toggle('is-open', open);
  });
  const todayLi = document.querySelector(`#week li[data-d="${t.wd}"]`);
  if (todayLi) { todayLi.classList.add('today'); todayLi.setAttribute('aria-label', `${SHORT[t.wd]} – dnes`); }

  /* ---------- Objednávka ---------- */
  const form = document.getElementById('book-form');
  const daysEl = document.getElementById('days');
  const slotsEl = document.getElementById('slots');
  const summary = document.getElementById('summary');
  const result = document.getElementById('result');
  const plate = document.getElementById('plate-live');
  const spz = document.getElementById('spz');
  const state = { day: null, time: null };

  // 10 pracovních dnů od zítřka (svátky nejsou zohledněny – demo)
  const base = new Date(); base.setHours(12, 0, 0, 0);
  const list = []; const d = new Date(base);
  while (list.length < 10) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w >= 1 && w <= 5) list.push(new Date(d)); }
  list.forEach((day, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'day' + (i >= 5 ? ' week2' : '');
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `${DAYS[day.getDay()]} ${day.getDate()}. ${day.getMonth() + 1}.`);
    b.innerHTML = `<b>${SHORT[day.getDay()]}</b><small>${day.getDate()}. ${day.getMonth() + 1}.</small>`;
    b.addEventListener('click', () => selectIn(daysEl, b, () => { state.day = day; state.time = null; renderSlots(); hideErr('err-day'); }));
    daysEl.appendChild(b);
  });

  function selectIn(container, btn, cb) {
    container.querySelectorAll('[aria-pressed]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true'); cb(); updateSummary();
  }
  function renderSlots() {
    slotsEl.innerHTML = '';
    for (let h = 8; h < 16; h++) for (const m of ['00', '30']) {
      const v = `${h}:${m}`;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'slot'; b.textContent = v;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => selectIn(slotsEl, b, () => { state.time = v; hideErr('err-time'); }));
      slotsEl.appendChild(b);
    }
  }
  // šipky mezi dny a časy
  [daysEl, slotsEl].forEach(c => c.addEventListener('keydown', e => {
    const btns = [...c.querySelectorAll('button')]; const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: c === daysEl ? 5 : 4, ArrowUp: c === daysEl ? -5 : -4 }[e.key];
    if (!step) return; e.preventDefault();
    const n = btns[Math.max(0, Math.min(btns.length - 1, i + step))]; n.focus();
  }));

  const svcInput = () => form.querySelector('input[name=service]:checked');
  function updateSummary() {
    const parts = [];
    const s = svcInput(); if (s) parts.push(s.value.split(' – ')[0]);
    if (state.day) parts.push(`${SHORT[state.day.getDay()]} ${state.day.getDate()}. ${state.day.getMonth() + 1}.`);
    if (state.time) parts.push(state.time);
    const p = spz.value.trim(); if (p) parts.push(p.toUpperCase());
    summary.textContent = parts.length ? parts.join(' · ') : 'Zatím nic nevybráno';
  }
  form.addEventListener('change', e => { if (e.target.name === 'service') { hideErr('err-service'); updateSummary(); } });

  spz.addEventListener('input', () => {
    const v = spz.value.toUpperCase().replace(/[^0-9A-Z ]/g, '');
    spz.value = v; plate.textContent = v || ' '; updateSummary();
  });

  document.querySelectorAll('[data-preselect]').forEach(a => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name=service][value="${a.dataset.preselect}"]`);
    if (r) { r.checked = true; hideErr('err-service'); updateSummary(); }
  }));

  function hideErr(id) { document.getElementById(id).hidden = true; }
  function setErr(input, id, bad) {
    document.getElementById(id).hidden = !bad;
    if (input) input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return bad;
  }
  const nameI = form.elements.namedItem('name'), phoneI = form.elements.namedItem('phone');
  const chkName = () => setErr(nameI, 'err-name', nameI.value.trim().length < 2);
  const chkPhone = () => setErr(phoneI, 'err-phone', phoneI.value.replace(/\D/g, '').length < 9);
  nameI.addEventListener('blur', () => nameI.value && chkName());
  phoneI.addEventListener('blur', () => phoneI.value && chkPhone());

  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = [];
    if (setErr(null, 'err-service', !svcInput())) bad.push(form.querySelector('input[name=service]'));
    if (setErr(null, 'err-day', !state.day)) bad.push(daysEl.querySelector('button'));
    if (setErr(null, 'err-time', state.day && !state.time)) bad.push(slotsEl.querySelector('button'));
    if (!state.day) document.getElementById('err-time').hidden = true;
    if (chkName()) bad.push(nameI);
    if (chkPhone()) bad.push(phoneI);
    if (bad.length) { bad[0].focus(); result.hidden = true; return; }

    const dd = state.day, p = spz.value.trim();
    result.innerHTML = '';
    const s = document.createElement('strong'); s.textContent = 'Ukázka: nic se neodesílá.';
    const pp = document.createElement('p');
    pp.textContent = `${svcInput().value}, ${DAYS_ACC[dd.getDay()]} ${dd.getDate()}. ${dd.getMonth() + 1}. v ${state.time}${p ? ', SPZ ' + p.toUpperCase() : ''}. Na skutečném webu by vám servis termín potvrdil telefonem.`;
    const st = document.createElement('span'); st.className = 'stamp stamp-form'; st.setAttribute('aria-hidden', 'true');
    st.innerHTML = '<span>Ukázka</span>neodesláno';
    const txt = document.createElement('div'); txt.append(s, pp);
    result.append(txt, st); result.hidden = false;
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });

  /* ---------- Mobilní lišta: schovat u objednávky a kontaktu ---------- */
  const bar = document.getElementById('call-bar');
  if ('IntersectionObserver' in window) {
    const vis = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(en => en.isIntersecting ? vis.add(en.target) : vis.delete(en.target));
      bar.classList.toggle('away', vis.size > 0);
    }, { threshold: .05 });
    ['objednat', 'kontakt'].forEach(id => io.observe(document.getElementById(id)));
  }

  /* ---------- Animace ---------- */
  if (!root.classList.contains('js-anim')) {
    const sl = document.getElementById('step-list');
    [...sl.children].forEach(li => li.classList.add('on')); sl.style.setProperty('--prog', 1);
    return;
  }
  const once = (els, cb, th = .3) => {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); } }), { threshold: th });
    els.forEach(el => io.observe(el));
  };
  once(document.querySelectorAll('.drawing'), el => el.classList.add('is-drawn'), .4);
  const reveal = document.querySelectorAll('.svc-body, .frame, .order, .call-card, .contact-list > div, .photos-text');
  reveal.forEach(el => el.classList.add('reveal'));
  once(reveal, el => el.classList.add('in'), .15);

  const steps = document.getElementById('step-list');
  once([steps], () => {
    const lis = [...steps.children];
    lis.forEach((li, i) => setTimeout(() => {
      li.classList.add('on');
      steps.style.setProperty('--prog', lis.length > 1 ? i / (lis.length - 1) : 1);
    }, 250 + i * 450));
  }, .35);
})();
