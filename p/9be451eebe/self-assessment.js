// The readiness self-assessment's stepper (ADR-0037; research W10, recommendation A4 and (b) 5), built by
// tools/site.py --batch2 into the preview. It reads Part 3's six tables from this page, so every question, "Yes looks
// like" and chapter is the page's own wording, and asks them one dimension at a time. The result uses only the page's
// words: "ready" or "gap" per dimension, the score out of the dimension's maximum, and the "Reading your scores" row
// for each gap. It gives no verdict: Part 4's verdict also needs Parts 1 and 2 and the W and D marks.
// No network, no storage, no tracking: the answers live in this page until it is closed or reloaded. On screen the
// stepper replaces Part 3's tables and the score sheet; printed, and without JavaScript, the tables are the sheet.
(() => {
  const doc = document.querySelector('.doc');
  if (!doc) return;
  const after = (h) => {
    const els = [];
    for (let el = h.nextElementSibling; el && !/^H[1-4]$/.test(el.tagName); el = el.nextElementSibling) els.push(el);
    return els;
  };
  const textOf = (el) => el.textContent.replace(/\s+/g, ' ').trim();

  const dims = [];
  let sheet = null;
  let reading = null;
  for (const h of doc.querySelectorAll('h3')) {
    const t = textOf(h);
    const m = t.match(/^3\.(\d) (.+?)(?: \[handbook[^\]]*\])?$/);
    if (m) {
      const block = after(h);
      const table = block.map((el) => el.querySelector('table')).find(Boolean);
      const read = block.find((el) => el.tagName === 'P');
      if (!table) return;
      const qs = [...table.tBodies[0].rows].map((tr) => ({
        id: textOf(tr.cells[0]),
        q: tr.cells[1].innerHTML,
        looks: tr.cells[2].innerHTML,
        ch: textOf(tr.cells[3]),
      }));
      const heads = [...table.tHead.rows[0].cells].map(textOf);
      dims.push({ name: m[2], title: h.innerHTML, read: read ? read.innerHTML : '', qs, heads, els: [h, ...block] });
    } else if (t === 'Score sheet') {
      sheet = [h, ...after(h)];
    } else if (t === 'Reading your scores') {
      const table = after(h).map((el) => el.querySelector('table')).find(Boolean);
      if (table) reading = [...table.tBodies[0].rows].map((tr) => [...tr.cells].map((c) => c.innerHTML));
    }
  }
  if (dims.length !== 6 || !sheet || !reading) return; // the page changed shape: leave the static sheet alone
  const rule = [...doc.querySelectorAll('p')].find((p) => textOf(p).startsWith('A dimension where every answer is Yes'));
  const verdict = [...doc.querySelectorAll('h2')].find((h) => textOf(h).startsWith('Part 4.'));
  const OPTIONS = [['Yes', 2], ['Partly', 1], ['No', 0]];

  const el = (tag, attrs = {}, html) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (html !== undefined) n.innerHTML = html;
    return n;
  };

  const form = el('form', { class: 'stepper', 'aria-labelledby': 'stepper-h', novalidate: '' });
  form.append(
    el('h3', { id: 'stepper-h' }, 'Score it here, one dimension at a time'),
    el('p', { class: 'sub' }, 'The same questions as the sheet. Nothing you choose is sent or kept: reloading the page clears it.'),
  );
  const progress = el('p', { class: 'progress', 'aria-live': 'polite' });
  const stage = el('div');
  const nav = el('div', { class: 'nav' });
  const back = el('button', { type: 'button', class: 'quiet' }, 'Back');
  const next = el('button', { type: 'submit', class: 'btn' });
  nav.append(back, next);
  form.append(progress, stage, nav);

  const answers = {};
  let step = 0;

  function dimension(d, i) {
    const wrap = el('div');
    wrap.append(el('h4', { tabindex: '-1' }, d.title));
    if (d.read) wrap.append(el('p', { class: 'sub' }, d.read));
    for (const q of d.qs) {
      const fs = el('fieldset', { 'aria-describedby': `looks-${q.id}` });
      fs.append(el('legend', {}, `<span class="pn">${q.id}</span>${q.q} <span class="cite">${d.heads[3]} ${q.ch}</span>`));
      fs.append(el('p', { class: 'looks', id: `looks-${q.id}` }, `<b>${d.heads[2]}</b> ${q.looks}`));
      const opts = el('div', { class: 'opts' });
      for (const [word, value] of OPTIONS) {
        const label = el('label');
        const input = el('input', { type: 'radio', name: q.id, value: String(value) });
        if (answers[q.id] === value) input.checked = true;
        input.addEventListener('change', () => { answers[q.id] = value; });
        label.append(input, document.createTextNode(word));
        opts.append(label);
      }
      fs.append(opts);
      wrap.append(fs);
    }
    progress.textContent = `Dimension ${i + 1} of ${dims.length}: ${d.name}`;
    next.textContent = i < dims.length - 1 ? 'Next dimension' : 'See the scores';
    return wrap;
  }

  function result() {
    const wrap = el('div');
    wrap.append(el('h4', { tabindex: '-1' }, 'Your scores'));
    const rows = [];
    const unanswered = [];
    let total = 0;
    let of = 0;
    for (const d of dims) {
      let score = 0;
      let allYes = true;
      for (const q of d.qs) {
        const a = answers[q.id];
        if (a === undefined) unanswered.push(q.id);
        score += a || 0;
        if (a !== 2) allYes = false;
      }
      total += score;
      of += d.qs.length * 2;
      rows.push([d.name, score, d.qs.length * 2, allYes ? 'ready' : 'gap']);
    }
    const tbl = el('div', { class: 'tbl result', tabindex: '0', role: 'region', 'aria-labelledby': 'stepper-h' });
    tbl.innerHTML = '<table><thead><tr><th scope="col">Dimension</th><th scope="col">Score</th><th scope="col">Of</th>'
      + '<th scope="col">Ready or gap</th></tr></thead><tbody>'
      + rows.map(([n, s, o, w]) => `<tr><td>${n}</td><td>${s}</td><td>${o}</td><td>${w}</td></tr>`).join('')
      + `<tr><td><strong>Total</strong></td><td><strong>${total}</strong></td><td><strong>${of}</strong></td><td></td></tr>`
      + '</tbody></table>';
    wrap.append(tbl);
    if (unanswered.length) {
      wrap.append(el('p', { class: 'sub' }, `Not answered, so scored No (if nobody in the room knows, answer No): ${unanswered.join(', ')}.`));
    }
    const gaps = rows.filter((r) => r[3] === 'gap');
    if (gaps.length) {
      wrap.append(el('p', {}, '<strong>Reading your scores</strong>'));
      const ul = el('ul', { class: 'gaps' });
      for (const [name] of gaps) {
        const row = reading.find((r) => r[0].replace(/<[^>]+>/g, '').trim() === name);
        if (row) ul.append(el('li', {}, `<b>${row[0]}.</b> ${row[1]}. ${row[2]}.`));
      }
      wrap.append(ul);
    }
    if (rule) wrap.append(el('p', {}, rule.innerHTML));
    if (verdict) wrap.append(el('p', {}, `The verdict also needs Parts 1 and 2: <a href="#${verdict.id}">${verdict.innerHTML}</a>.`));
    progress.textContent = 'Scores';
    next.textContent = 'Start again';
    return wrap;
  }

  function show(focus) {
    stage.replaceChildren(step < dims.length ? dimension(dims[step], step) : result());
    back.hidden = step === 0;
    if (focus) stage.querySelector('h4').focus();
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (step < dims.length) step += 1;
    else {
      for (const k of Object.keys(answers)) delete answers[k];
      step = 0;
    }
    show(true);
  });
  back.addEventListener('click', () => {
    step = Math.max(0, step - 1);
    show(true);
  });

  for (const n of [...dims.flatMap((d) => d.els), ...sheet]) n.classList.add('p3-static');
  dims[0].els[0].before(form);
  document.documentElement.classList.add('has-stepper');
  show(false);
})();
