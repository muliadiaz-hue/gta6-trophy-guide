// Saved progress for the guide: what the player has earned, the PSN
// progress counters, and whether the spoiler guard is on. Everything lives
// in one localStorage entry, keyed by trophy name (names are the stable
// official ones), so an export from one browser imports cleanly into another.
export const STORAGE_KEY = 'gta6-trophy-guide-v1';

export function blankState() {
  return { earned: {}, progress: {}, spoiler: true, version: 1 };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return blankState();
    return {
      earned: parsed.earned && typeof parsed.earned === 'object' ? parsed.earned : {},
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
      spoiler: parsed.spoiler !== false,
      version: 1,
    };
  } catch {
    return blankState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full store: the guide still works for this visit,
    // it just cannot remember anything. Nothing else depends on the save.
  }
}

export function isEarned(state, trophy) {
  return Boolean(state.earned[trophy.name]);
}

export function earnedDate(state, trophy) {
  return state.earned[trophy.name] || null;
}

export function setEarned(state, trophy, earned) {
  if (earned) state.earned[trophy.name] = new Date().toISOString();
  else delete state.earned[trophy.name];
  saveState(state);
}

export function progressOf(state, trophy) {
  if (trophy.psn_count == null) return null;
  const n = Number(state.progress[trophy.name]);
  return Number.isFinite(n) ? Math.max(0, Math.min(trophy.psn_count, n)) : 0;
}

// Step a PSN counter up or down. Reaching the target earns the trophy;
// stepping back below it un-earns it again, so the two can never disagree.
export function stepProgress(state, trophy, delta) {
  if (trophy.psn_count == null) return progressOf(state, trophy);
  const next = progressOf(state, trophy) + delta;
  const clamped = Math.max(0, Math.min(trophy.psn_count, next));
  state.progress[trophy.name] = clamped;
  if (clamped >= trophy.psn_count) state.earned[trophy.name] = new Date().toISOString();
  else delete state.earned[trophy.name];
  saveState(state);
  return clamped;
}

export function setSpoiler(state, on) {
  state.spoiler = on;
  saveState(state);
}

// A trophy's name is hidden while the spoiler guard is on, the trophy is a
// story trophy, and the player has not earned it yet.
export function isMasked(state, trophy) {
  return state.spoiler && trophy.story && !isEarned(state, trophy);
}

// Import a file exported by this guide (or hand-made with the same shape).
// Only names from the official 55 are kept; the rest is ignored, and the
// caller gets a count of what was recognised.
export function importState(state, trophies, data) {
  const known = new Map(trophies.map((t) => [t.name, t]));
  let keptEarned = 0;
  let keptProgress = 0;
  if (data && typeof data === 'object') {
    if (data.earned && typeof data.earned === 'object') {
      for (const [name, when] of Object.entries(data.earned)) {
        if (known.has(name)) {
          state.earned[name] = typeof when === 'string' ? when : new Date().toISOString();
          keptEarned += 1;
        }
      }
    }
    if (data.progress && typeof data.progress === 'object') {
      for (const [name, n] of Object.entries(data.progress)) {
        const trophy = known.get(name);
        if (trophy && trophy.psn_count != null && Number.isFinite(Number(n))) {
          state.progress[name] = Math.max(0, Math.min(trophy.psn_count, Number(n)));
          keptProgress += 1;
        }
      }
    }
  }
  saveState(state);
  return { keptEarned, keptProgress };
}

export function exportState(state) {
  return JSON.stringify(
    { app: 'leonida-platinum-gta6-trophy-guide', version: 1, exported_at: new Date().toISOString(), earned: state.earned, progress: state.progress },
    null,
    2,
  );
}
