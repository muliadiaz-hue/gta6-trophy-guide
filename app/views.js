// Rendering for the four tabs. Every string that comes from the data file
// goes through escapeHtml before it lands in the page, and every source
// link is built from the URLs in data/source_links — no address is written
// into this file, so the guide itself never names a network location.
import { isEarned, isMasked, progressOf } from './store.js';

export const KIND_LABELS = {
  story: 'Story',
  'side-story': 'Side story',
  collectible: 'Collectibles',
  activity: 'Activities',
  robbery: 'Robbery',
  misc: 'Misc',
  completion: '100%',
  platinum: 'Platinum',
};

export const STAGES = [
  { n: 0, title: 'Before you start', advice: 'Spoiler guard ON, and save discipline from day one: a manual save at the start of every chapter, plus one untouched save from just before the final mission. You get 15 manual slots and 1 autosave. There is no mission replay and no New Game Plus. Cheats switch off trophies and saving — keep them off on your trophy save.', ids: [] },
  { n: 1, title: 'Chapter 1 — Gone Fishing', advice: 'Play the opening, beat Cal at fishing, finish one arcade game — and do Lucia’s balcony meditation before Chapter 1 ends. It is the one thing in the game that can be missed.', ids: [2, 3, 20, 21, 28] },
  { n: 2, title: 'Chapter 2 — two protagonists', advice: 'Jason and Lucia are both playable now, and partner trophies open. Garages open after Daily Driver, Scooter Bros after Moses — start discovering vehicles and registering cheap cars.', ids: [4, 8, 16, 46, 47, 54, 55] },
  { n: 3, title: 'Chapter 3 — Vice City opens up', advice: 'Race Against Yago the moment it appears. Jewelry jobs open with the Snap Gun. Rob three shops with your partner while the heat is on.', ids: [5, 9, 10, 11, 34, 39] },
  { n: 4, title: 'Chapter 4 — the big jobs', advice: 'Bank vaults open near the end of the chapter. Bring your partner — vault jobs hand you a 4-star Wanted Level, which is also how Hot Together pops.', ids: [6, 12, 13, 33, 40, 41, 43] },
  { n: 5, title: 'Side stories — all stay open', advice: 'All six side-story finales stay available after the credits. Andy’s, Billy’s and Tyrone’s strands do not count toward Strangers & Freaks — they have their own trophies.', ids: [22, 23, 24, 25, 26, 27, 29] },
  { n: 6, title: 'The 100% grind', advice: 'The long post-story grind. Work the counters: 300 stunts, 70 of 80 Challenges, 200 of 277 vehicles, 8 vaults, 39 illegal operations, 100 WAiNK scans, 18 meditation spots, 52 areas.', ids: [14, 15, 17, 18, 19, 30, 31, 32, 35, 36, 37, 38, 42, 44, 45, 48, 49, 50, 51, 52, 53] },
  { n: 7, title: 'Finale — the last mission', advice: 'Load your untouched pre-finale save, finish the final mission for the second gold — then the platinum pops on its own.', ids: [7, 1] },
];

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function gradeBadge(grade) {
  return `<span class="grade grade-${grade}">${escapeHtml(grade)}</span>`;
}

function kindTags(trophy) {
  const tags = trophy.kind.map((k) => `<span class="tag">${escapeHtml(KIND_LABELS[k] || k)}</span>`).join('');
  const missable = trophy.missable ? '<span class="tag missable">Missable</span>' : '';
  const hidden = trophy.hidden ? '<span class="tag hidden-tag">Hidden</span>' : '';
  return tags + missable + hidden;
}

function counterHtml(state, trophy) {
  if (trophy.psn_count == null) return '';
  const n = progressOf(state, trophy);
  const name = escapeHtml(trophy.name);
  return `<span class="counter"><span class="stepper"><button type="button" data-step="-1" data-trophy="${name}" aria-label="Decrease progress">−</button><span>${n} / ${trophy.psn_count}</span><button type="button" data-step="1" data-trophy="${name}" aria-label="Increase progress">+</button></span></span>`;
}

export function filterTrophies(data, ui) {
  const q = (ui.search || '').trim().toLowerCase();
  return data.trophies.filter((t) => {
    if (ui.kind !== 'all') {
      if (ui.kind === 'story' && !t.story) return false;
      if (ui.kind === 'missable' && !t.missable) return false;
      if (!['story', 'missable'].includes(ui.kind) && !t.kind.includes(ui.kind)) return false;
    }
    if (ui.grade !== 'all' && t.grade !== ui.grade) return false;
    if (ui.status === 'earned' && !ui.isEarned(t)) return false;
    if (ui.status === 'remaining' && ui.isEarned(t)) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function renderChecklist(data, state, ui) {
  const list = filterTrophies(data, ui);
  if (list.length === 0) return '<p class="empty">No trophies match these filters.</p>';
  return list.map((t) => {
    const earned = isEarned(state, t);
    const masked = isMasked(state, t);
    const name = escapeHtml(t.name);
    const head = masked
      ? `<div class="trophy-name masked">Hidden story trophy</div><div class="trophy-desc">Earn it to reveal — the spoiler guard is on.</div>`
      : `<div class="trophy-name">${name}</div><div class="trophy-desc"><q>${escapeHtml(t.description)}</q></div>`;
    return `<div class="trophy${earned ? ' earned' : ''}${ui.selectedId === t.id ? ' selected' : ''}" role="listitem">
      <input type="checkbox" data-earn="${name}" ${earned ? 'checked' : ''} aria-label="Mark ${masked ? 'hidden story trophy' : name} earned">
      <div data-select="${t.id}" role="button" tabindex="0">${head}<div class="trophy-tags">${kindTags(t)}</div></div>
      <div class="trophy-side">${gradeBadge(t.grade)}${counterHtml(state, t)}</div>
    </div>`;
  }).join('');
}

export function renderGuidePane(data, state, selectedId) {
  const trophy = data.trophies.find((t) => t.id === selectedId);
  if (!trophy) {
    return `<p class="guide-empty">Pick a trophy from the list to see its guide — what to do, where, when it can be missed, and the sources it comes from.</p>
    <p class="guide-empty">Start with <strong>Positive Mental Attitude</strong>: it is the only trophy that can be missed, and the miss is in Chapter 1.</p>`;
  }
  if (isMasked(state, trophy)) {
    return `<h2>Hidden story trophy</h2><p class="guide-desc">The spoiler guard is on, and this trophy is still unearned.</p>
    <div class="note-box"><strong>Spoiler guard:</strong> story trophies stay hidden until you earn them. Turn the guard off in the filters above, or earn the trophy, to see its guide.</div>
    <p class="guide-meta">${gradeBadge(trophy.grade)}</p>`;
  }
  const sources = trophy.sources.map((s) => {
    const url = data.source_links[s];
    return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(s)}</a>` : escapeHtml(s);
  }).join('');
  const warning = trophy.missable_note
    ? `<div class="warn-box"><strong>Missable:</strong> ${escapeHtml(trophy.missable_note)}</div>` : '';
  const unconfirmed = trophy.guide.includes('No confirmed unlock method')
    ? `<div class="note-box"><strong>Unconfirmed at launch:</strong> no guide has verified how this trophy unlocks yet. The description above is the only hint — this guide does not invent a method.</div>` : '';
  const earned = isEarned(state, trophy);
  return `<h2>${escapeHtml(trophy.name)}</h2>
  <p class="guide-desc"><q>${escapeHtml(trophy.description)}</q></p>
  <p class="guide-meta">${gradeBadge(trophy.grade)}${kindTags(trophy)}${counterHtml(state, trophy)}</p>
  <label class="spoiler-toggle"><input type="checkbox" data-earn="${escapeHtml(trophy.name)}" ${earned ? 'checked' : ''}> Earned</label>
  <h3>Guide</h3><p class="guide-body">${escapeHtml(trophy.guide)}</p>
  ${warning}${unconfirmed}
  <h3>Sources</h3><p class="sources">${sources}</p>`;
}

export function nextUp(data, state) {
  for (const stage of STAGES) {
    for (const id of stage.ids) {
      const t = data.trophies.find((x) => x.id === id);
      if (t && !isEarned(state, t)) return { trophy: t, stage };
    }
  }
  return null;
}

export function renderRoadmap(data, state) {
  const stages = STAGES.map((stage) => {
    const trophies = stage.ids.map((id) => data.trophies.find((t) => t.id === id)).filter(Boolean);
    const done = trophies.filter((t) => isEarned(state, t)).length;
    const chips = trophies.map((t) => {
      const masked = isMasked(state, t);
      const label = masked ? 'Hidden story trophy' : t.name;
      return `<button type="button" class="chip${isEarned(state, t) ? ' done' : ''}" data-select="${t.id}" data-goto="checklist"><span class="dot dot-${t.grade}"></span>${escapeHtml(label)}</button>`;
    }).join('');
    return `<div class="stage"><h3>Stage ${stage.n} — ${escapeHtml(stage.title)}<span class="stage-count">${done} / ${trophies.length} earned</span></h3><p>${escapeHtml(stage.advice)}</p><div class="chips">${chips || '<span class="tag">No trophies — setup only</span>'}</div></div>`;
  }).join('');
  return stages;
}

export function renderNextUp(data, state) {
  const found = nextUp(data, state);
  if (!found) {
    return `<h2>Next up</h2><div class="next-name">Vice Got a Price! — yours.</div><p>Every trophy is earned. The platinum should have popped already.</p>`;
  }
  const { trophy, stage } = found;
  const masked = isMasked(state, trophy);
  const name = masked ? 'Hidden story trophy' : trophy.name;
  const hint = masked
    ? 'A story trophy in this stage — the spoiler guard hides its name until you earn it.'
    : trophy.description;
  return `<h2>Next up</h2><div class="next-name">${escapeHtml(name)}</div><p>Stage ${stage.n} — ${escapeHtml(stage.title)} · ${escapeHtml(hint)}</p><button type="button" class="btn" data-select="${trophy.id}" data-goto="checklist">Open its guide</button>`;
}

export function renderMissables(data, state) {
  const pma = data.trophies.find((t) => t.name === 'Positive Mental Attitude');
  const yago = data.trophies.find((t) => t.name === 'Strangers & Freaks');
  const demo = data.trophies.filter((t) => t.story && !isEarned(state, t)).slice(0, 3).map((t) => {
    return `<div class="trophy"><input type="checkbox" disabled aria-label="Hidden story trophy"><div><div class="trophy-name masked">Hidden story trophy</div><div class="trophy-desc">Earn it to reveal — the spoiler guard is on.</div><div class="trophy-tags"><span class="tag">Story</span><span class="tag hidden-tag">Hidden</span></div></div><div class="trophy-side">${gradeBadge(t.grade)}</div></div>`;
  }).join('');
  return `<div class="card risk"><h2>The one missable: Positive Mental Attitude</h2>
  <p>${escapeHtml(pma ? pma.guide : '')}</p>
  <p><strong>Save discipline that covers it:</strong> a manual save at the start of every chapter, plus one untouched save from before the final mission. There are 15 manual slots and 1 autosave — use them.</p></div>
  <div class="card"><h2>Time-sensitive, not confirmed missable: Race Against Yago</h2>
  <p>Yago’s street-racing strand appears in Chapter 3 with an hourglass icon. Do it the moment it appears — save first, then race. It counts toward Strangers &amp; Freaks${yago ? ` (${progressOf(state, yago)} / ${yago.psn_count} strands)` : ''}.</p></div>
  <div class="card"><h2>Everything else stays available</h2>
  <p>All six side-story finales and the whole 100% checklist stay open after the credits — including the stunts, Challenges, vehicles, vaults and illegal operations. The 100% checklist itself only appears after the story (Progress, then Stats, then 100% Completion), but work done earlier still counts.</p>
  <p><strong>Cheats switch off trophies and saving.</strong> Keep them off on your trophy save.</p></div>
  <div class="card"><h2>Spoiler guard — what it looks like</h2>
  <p>With the guard on, unearned story trophies show like this until you earn them — grade visible, name and description hidden:</p>
  <div class="spoiler-demo">${demo}</div></div>`;
}

export function renderProgress(data, state) {
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  const totals = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
  const bars = grades.map((g) => {
    const done = data.trophies.filter((t) => t.grade === g && isEarned(state, t)).length;
    const total = totals[g];
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<div class="grade-row"><span>${g[0].toUpperCase() + g.slice(1)}</span><span class="bar"><span class="fill fill-${g}" style="display:block;width:${pct}%"></span></span><span>${done} / ${total}</span></div>`;
  }).join('');
  const counters = data.trophies.filter((t) => t.psn_count != null).map((t) => {
    const n = progressOf(state, t);
    const pct = Math.round((n / t.psn_count) * 100);
    const label = isMasked(state, t) ? 'Hidden story trophy' : t.name;
    return `<div class="counter-row"><span>${escapeHtml(label)}</span><span>${n} / ${t.psn_count}</span><span class="bar"><span class="fill" style="display:block;width:${pct}%"></span></span></div>`;
  }).join('');
  const earnedTotal = data.trophies.filter((t) => isEarned(state, t)).length;
  return `<div class="card"><h2>Your progress — ${earnedTotal} / 55</h2><div class="grade-bars">${bars}</div></div>
  <div class="card"><h2>PSN progress counters</h2><div class="counter-list">${counters}</div></div>
  <div class="card"><h2>Save &amp; share</h2>
  <p>Progress lives only in this browser. Export a backup, or import one from another device — only the 55 official trophy names are recognised.</p>
  <button type="button" class="btn" id="export-btn">Export progress</button>
  <button type="button" class="btn ghost" id="import-btn">Import progress</button>
  <input type="file" id="import-file" accept="application/json,.json" hidden>
  <button type="button" class="btn ghost" id="reset-btn">Reset progress</button>
  <p class="import-msg" id="import-msg" aria-live="polite"></p></div>
  <div class="card about"><h2>About &amp; sources</h2>
  <p>Names, descriptions and grades are the official PS5 trophy list as mirrored by Exophase and PSNProfiles (frozen 18 Nov 2026). Rockstar, Sony and Microsoft have published no separate official list page — this guide says so honestly rather than inventing one.</p>
  <p>Guides are written in this guide’s own words from Exophase, PSNProfiles, Output Lag, Press-Start, HowToVideoGame and CryptoGames. Five trophies had no confirmed unlock method at launch — their guides say so instead of inventing one. Time estimates (about 200 hours for the platinum) are press estimates, not official figures.</p>
  <p>Unofficial fan guide. No Rockstar logo, artwork or game screenshots are used. No online trophies exist in this list — every trophy is single-player.</p></div>`;
}
