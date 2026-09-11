export function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
const PREFIX = 'parca-workspace-v3:';
export function readJSON(storage, key, fallback) {
  try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function readSettings(storage) {
  const saved = readJSON(storage, 'parca-settings-v3', {});
  return {
    language: saved.language === 'en' ? 'en' : 'tr',
    theme: (saved.theme ?? readJSON(storage, 'parca-editor-theme', 'light')) === 'dark' ? 'dark' : 'light',
    modelId: typeof saved.modelId === 'string' ? saved.modelId : readJSON(storage, 'parca-editor-model', 'car'),
    mode: saved.mode === 'free' ? 'free' : 'model',
    snap: saved.snap !== false,
    favorites: Array.isArray(saved.favorites) ? saved.favorites.filter(s => typeof s === 'string') : [],
  };
}
export function saveSettings(storage, settings) {
  try { storage.setItem('parca-settings-v3', JSON.stringify(settings)); return true; } catch { return false; }
}
export function readWorkspace(storage, modelId) {
  const valid = value => value?.version === 3 && value.modelId === modelId && Array.isArray(value.pieces);
  const current = readJSON(storage, PREFIX + modelId, null);
  if (valid(current)) return {...current, recovered:false};
  const backup = readJSON(storage, PREFIX + modelId + ':backup', null);
  if (valid(backup)) return {...backup, recovered:true};
  const legacy = readJSON(storage, `parca-editor-v2:${modelId}`, []);
  return {version:3, modelId, pieces:Array.isArray(legacy)?legacy:[], savedAt:null, recovered:false};
}
export function saveWorkspace(storage, modelId, pieces, now = Date.now()) {
  const key = PREFIX + modelId;
  const next = JSON.stringify({version:3,modelId,pieces,savedAt:now});
  try {
    const previous = storage.getItem(key);
    // Keep a last valid snapshot. A full storage area must never destroy the current build.
    if (previous) { const parsed=JSON.parse(previous); if(parsed.version===3 && Array.isArray(parsed.pieces)) {
      try { storage.setItem(key + ':backup', previous); } catch { /* primary save may still fit */ }
    }}
  } catch { /* corrupt previous entry must not prevent a repaired save */ }
  try { storage.setItem(key,next); return {ok:true,savedAt:now}; } catch { return {ok:false,savedAt:null}; }
}
