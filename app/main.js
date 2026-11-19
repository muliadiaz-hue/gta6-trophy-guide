// Boot for the guide: load the data, restore saved progress, render the
// active tab, and wire every control through one delegated listener per
// event type. Query flags exist for screenshots only (?tab=roadmap,
// ?guide=<trophy name>, ?seed=demo loads a fixed demo state in memory and
// never writes it): the guide a player opens has none of them.
import { blankState, exportState, importState, isEarned, loadState, saveState, setEarned, setSpoiler, stepProgress } from './store.js';
import { filterTrophies, renderChecklist, renderGuidePane, renderMissables, renderNextUp, renderProgress, renderRoadmap } from './views.js';

const DEMO_EARNED = ['Just Like Paradise', 'Paradise Lost', 'Baited My Tackle', 'Stick Fiddler', 'Trust', 'T**s Ass Drug Money', 'Let’s Go Bowling', 'Personal Best', 'Little Boxes', 'On the Spot', 'Master of None', 'Hot Together', 'Sneakthief'];
const DEMO_PROGRESS = { 'Cunning Stunts': 120, 'You WAiNKer!': 40, 'Whip It Good': 63, 'Positive Mental Attitude': 7, 'Strangers & Freaks': 3, 'A Long Road': 41 };

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

let data = null;
let state = loadState();
let ui = { search: '', kind: 'all', grade: 'all', status: 'all', selectedId: null, tab: 'checklist' };

// Demo state for screenshots: fixed, in memory only, never persisted.
if (params.get('seed') === 'demo') {
  state = blankState();
  for (const name of DEMO_EARNED) state.earned[name] = '2026-11-19T10:00:00.000Z';
  state.progress = { ...DEMO_PROGRESS };
}
if (params.get('tab')) ui.tab = params.get('tab');

function renderAll() {
  const earnedTotal = data.trophies.filter((t) => isEarned(state, t)).length;
  $('earned-count').textContent = earnedTotal;
  $('progress-fill').style.width = `${Math.round((earnedTotal / data.trophies.length) * 100)}%`;
  $('platinum-pct').textContent = `${Math.round((earnedTotal / data.trophies.length) * 100)}% to platinum`;
  const byGrade = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const done = data.trophies.filter((t) => t.grade === g && isEarned(state, t)).length;
    return `${done} ${g}`;
  }).join(' · ');
  $('grade-line').textContent = byGrade;

  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${ui.tab}`));

  if (ui.tab === 'checklist') {
    $('trophy-list').innerHTML = renderChecklist(data, state, { ...ui, isEarned: (t) => isEarned(state, t) });
    const shown = filterTrophies(data, { ...ui, isEarned: (t) => isEarned(state, t) }).length;
    $('result-count').textContent = `Showing ${shown} of ${data.trophies.length} trophies${earnedTotal ? ` · ${earnedTotal} earned` : ''}`;
    $('guide-pane').innerHTML = renderGuidePane(data, state, ui.selectedId);
    $('spoiler').checked = state.spoiler;
  } else if (ui.tab === 'roadmap') {
    $('next-up').innerHTML = renderNextUp(data, state);
    $('roadmap').innerHTML = renderRoadmap(data, state);
  } else if (ui.tab === 'missables') {
    $('missables').innerHTML = renderMissables(data, state);
  } else if (ui.tab === 'progress') {
    $('progress-view').innerHTML = renderProgress(data, state);
    wireProgressButtons();
  }
}

function wireProgressButtons() {
  const exportBtn = $('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  const importBtn = $('import-btn');
  const importFile = $('import-file');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', async () => {
      const file = importFile.files && importFile.files[0];
      const msg = $('import-msg');
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const { keptEarned, keptProgress } = importState(state, data.trophies, parsed);
        if (msg) msg.textContent = `Imported ${keptEarned} earned trophies and ${keptProgress} progress counters.`;
      } catch {
        if (msg) msg.textContent = 'That file could not be read as a progress export.';
      }
      importFile.value = '';
      renderAll();
    });
  }
  const resetBtn = $('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (window.confirm('Reset all progress? This clears every earned trophy and counter.')) {
      state = blankState();
      saveState(state);
      ui.selectedId = null;
      renderAll();
    }
  });
}

document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
  ui.tab = b.dataset.tab;
  renderAll();
}));
$('search').addEventListener('input', (e) => { ui.search = e.target.value; renderAll(); });
$('kind-filter').addEventListener('change', (e) => { ui.kind = e.target.value; renderAll(); });
$('grade-filter').addEventListener('change', (e) => { ui.grade = e.target.value; renderAll(); });
$('status-filter').addEventListener('change', (e) => { ui.status = e.target.value; renderAll(); });
$('spoiler').addEventListener('change', (e) => { setSpoiler(state, e.target.checked); renderAll(); });

document.addEventListener('click', (e) => {
  const stepBtn = e.target.closest('[data-step]');
  if (stepBtn) {
    const trophy = data.trophies.find((t) => t.name === stepBtn.dataset.trophy);
    if (trophy) { stepProgress(state, trophy, Number(stepBtn.dataset.step)); renderAll(); }
    return;
  }
  const selectEl = e.target.closest('[data-select]');
  if (selectEl) {
    ui.selectedId = Number(selectEl.dataset.select);
    if (selectEl.dataset.goto) ui.tab = selectEl.dataset.goto;
    else ui.tab = 'checklist';
    renderAll();
    return;
  }
});

document.addEventListener('change', (e) => {
  const earnBox = e.target.closest('[data-earn]');
  if (!earnBox) return;
  const trophy = data.trophies.find((t) => t.name === earnBox.dataset.earn);
  if (trophy) { setEarned(state, trophy, earnBox.checked); renderAll(); }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const selectEl = e.target.closest('[data-select]');
  if (selectEl) {
    e.preventDefault();
    ui.selectedId = Number(selectEl.dataset.select);
    ui.tab = 'checklist';
    renderAll();
  }
});

async function boot() {
  const response = await fetch('data/trophies.json');
  data = await response.json();
  const guideName = params.get('guide');
  if (guideName) {
    const found = data.trophies.find((t) => t.name.toLowerCase() === guideName.toLowerCase());
    if (found) ui.selectedId = found.id;
  }
  if (!ui.selectedId) {
    const pma = data.trophies.find((t) => t.name === 'Positive Mental Attitude');
    if (pma) ui.selectedId = pma.id;
  }
  renderAll();
  window.__shotReady = true;
}

boot();
