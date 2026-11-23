(() => {
  const DAYS = ['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'];
  const SHORT = ['Ne','Po','Út','St','Čt','Pá','So'];
  const form = document.getElementById('book-form');
  const daysEl = document.getElementById('days');
  const timeSel = document.getElementById('time');
  const result = document.getElementById('result');
  let chosen = null;

  // Nejbližších 10 pracovních dnů (Po–Pá). Svátky nejsou zohledněny – demo.
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const list = [];
  if (now.getHours() >= 15) d.setDate(d.getDate() + 1);
  while (list.length < 10) {
    const w = d.getDay();
    if (w >= 1 && w <= 5) list.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  list.forEach(day => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'day';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `${DAYS[day.getDay()]} ${day.getDate()}. ${day.getMonth()+1}.`);
    b.innerHTML = `${SHORT[day.getDay()]}<small>${day.getDate()}. ${day.getMonth()+1}.</small>`;
    b.addEventListener('click', () => {
      daysEl.querySelectorAll('.day').forEach(x => x.setAttribute('aria-pressed','false'));
      b.setAttribute('aria-pressed','true'); chosen = day;
      document.getElementById('err-day').hidden = true;
      fillTimes();
    });
    daysEl.appendChild(b);
  });

  function fillTimes() {
    const prev = timeSel.value;
    timeSel.length = 1;
    const isToday = chosen && chosen.toDateString() === now.toDateString();
    for (let h = 8; h < 16; h++) {
      for (const m of [0, 30]) {
        if (h === 15 && m === 30) continue;
        if (isToday && (h + m/60) <= now.getHours() + now.getMinutes()/60 + 1) continue;
        const t = `${h}:${m ? '30' : '00'}`;
        timeSel.add(new Option(t, t));
      }
    }
    timeSel.value = [...timeSel.options].some(o => o.value === prev) ? prev : '';
  }
  fillTimes();

  // Předvýběr služby z odkazů v sekci Služby
  document.querySelectorAll('[data-preselect]').forEach(a => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name=service][value="${a.dataset.preselect}"]`);
    if (r) { r.checked = true; document.getElementById('err-service').hidden = true; }
  }));

  const setErr = (el, errId, bad) => {
    document.getElementById(errId).hidden = !bad;
    if (el) el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return bad;
  };
  const checks = {
    name: () => setErr(form.name, 'err-name', form.elements.name.value.trim().length < 2),
    phone: () => setErr(form.phone, 'err-phone', form.phone.value.replace(/\D/g,'').length < 9),
    time: () => setErr(timeSel, 'err-time', !timeSel.value),
  };
  form.elements.name.addEventListener('blur', checks.name);
  form.phone.addEventListener('blur', checks.phone);
  timeSel.addEventListener('change', checks.time);
  form.addEventListener('change', e => { if (e.target.name === 'service') document.getElementById('err-service').hidden = true; });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const svc = form.querySelector('input[name=service]:checked');
    const bad = [];
    if (setErr(null, 'err-service', !svc)) bad.push(form.querySelector('input[name=service]'));
    if (setErr(null, 'err-day', !chosen)) bad.push(daysEl.querySelector('.day'));
    if (checks.time()) bad.push(timeSel);
    if (checks.name()) bad.push(form.elements.name);
    if (checks.phone()) bad.push(form.phone);
    if (bad.length) { bad[0].focus(); result.hidden = true; return; }
    const spz = form.spz.value.trim().toUpperCase();
    result.innerHTML = '';
    const s = document.createElement('strong'); s.textContent = 'Ukázka: nic se neodesílá.';
    const p = document.createElement('p'); p.style.margin = '6px 0 0';
    p.textContent = `${svc.value} · ${DAYS[chosen.getDay()]} ${chosen.getDate()}. ${chosen.getMonth()+1}. v ${timeSel.value}` + (spz ? ` · SPZ ${spz}` : '') + '. Ve skutečném webu by servis termín potvrdil telefonem.';
    result.append(s, p); result.hidden = false;
  });

  // Zvýraznění dnešního dne v otevírací době
  const w = now.getDay(), hours = document.getElementById('hours');
  if (w >= 1 && w <= 5) hours.insertAdjacentHTML('afterend', '<br><span class="today">Dnes otevřeno do 16:00</span>');

  // Jemné odhalení sekcí
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const els = document.querySelectorAll('.service, .step-list li, .book-form, .contact-list > div');
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .15 });
    els.forEach(el => { el.classList.add('reveal'); io.observe(el); });
  }
})();
