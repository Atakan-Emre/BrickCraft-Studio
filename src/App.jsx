import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowCounterClockwise, ArrowClockwise, ArrowDown, ArrowUp, ArrowSquareOut, ArrowsOut, Check, CheckCircle, CaretDown, Cube, Cursor, DownloadSimple, Eye, FolderOpen, GridFour, Hand, Info, Lightbulb, MagnifyingGlass, Minus, Moon, Mouse, Plus, Stack, Star, Sun, Trash, UploadSimple, X } from '@phosphor-icons/react';
import { flushSync } from 'react-dom';
import { BuildCanvas } from './BuildCanvas';
import { colorInfo, prepareModel, thumbnail } from './parts3d';
import { historyReducer, INITIAL_HISTORY, validPlacements } from './editor-state';
import {partName} from './part-name';
import { MODEL_LIST } from './catalog';
import { LanguageContext, useLanguage } from './i18n';
import { readSettings, saveSettings, readWorkspace, saveWorkspace, browserStorage } from './storage';
const modelCache = new Map(), progressListeners=new Map(), modelProgress=new Map();
function getModel(id, progress) {
  if(progress){const listeners=progressListeners.get(id)||new Set();listeners.add(progress);progressListeners.set(id,listeners);progress(modelProgress.get(id)||0);}
  if(!modelCache.has(id))modelCache.set(id,fetch(`/models/${id}.json`).then(r=>{if(!r.ok)throw new Error('Model file unavailable');return r.json();}).then(raw=>prepareModel(raw,value=>{modelProgress.set(id,value);progressListeners.get(id)?.forEach(fn=>fn(value));})).finally(()=>progressListeners.delete(id)).catch(error=>{modelCache.delete(id);throw error;}));
  return modelCache.get(id);
}
function download(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], {
    type
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function PartImage({
  model,
  group
}) {
  const element = useRef(),
    [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        observer.disconnect();
        thumbnail(model.loaded[group.part], group.color, `${group.part}:${group.color}`).then(src => {
          if (active) setUrl(src);
        });
      }
    }, {
      rootMargin: '100px'
    });
    observer.observe(element.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [model, group.part, group.color]);
  return <span className="part-image" ref={element}>{url ? <img src={url} alt="" draggable="false" /> : <span className="image-loading" />}</span>;
}
function ModelImage({id}) {
  const {t}=useLanguage();
  return <img src={`/models/previews/${id}.png?v=2`} alt={t('{name} tamamlanmış 3B model',{name:t(MODEL_LIST.find(m=>m.id===id).title)})} draggable="false" loading="lazy"/>;
}
function IconButton({
  label,
  children,
  ...props
}) {
  return <button className="icon-button" title={label} aria-label={label} {...props}>{children}</button>;
}
function Modal({
  title,
  children,
  onClose,
  wide = false
}) {
  const {
    t
  } = useLanguage();
  const ref = useRef();
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={onClose} onClick={e => {
    if (e.target === ref.current) onClose();
  }}><header><div><span className="eyebrow">{t("BRICKCRAFT STUDIO")}</span><h2>{title}</h2></div><IconButton label={t("Pencereyi kapat")} onClick={onClose}><X size={22} /></IconButton></header>{children}</dialog>;
}
export function App() {
  const [settings] = useState(() => {try{return readSettings(browserStorage());}catch{return readSettings(null);}});
  const [language, setLanguage] = useState(settings.language);
  return <LanguageContext.Provider value={language}><Workbench settings={settings} language={language} setLanguage={setLanguage} /></LanguageContext.Provider>;
}
function Workbench({
  settings,
  language,
  setLanguage
}) {
  const {
    t
  } = useLanguage();
  const shortName = name => partName(name, language);
  const [modelId, setModelId] = useState(() => {
    const saved = settings.modelId;
    return MODEL_LIST.some(m => m.id === saved) ? saved : 'car';
  });
  const [theme, setTheme] = useState(settings.theme);
  const [model, setModel] = useState(null),
    [loading, setLoading] = useState(0),
    [error, setError] = useState('');
  const [history, dispatch] = useReducer(historyReducer, INITIAL_HISTORY);
  const [selected, setSelected] = useState(null),
    [draft, setDraft] = useState(null);
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [color, setColor] = useState('all');
  const [tool, setTool] = useState('move');
  const [reference, setReference] = useState(false),
    [snap, setSnap] = useState(settings.snap),
    [hintOpen, setHintOpen] = useState(false);
  const [modal, setModal] = useState(null),
    [mode, setMode] = useState(settings.mode),
    [toast, setToast] = useState('');
  const [saveError, setSaveError] = useState(false),
    [mobilePanel, setMobilePanel] = useState('parts');
  const [favorites,setFavorites] = useState(settings.favorites);
  const [favoritesOnly,setFavoritesOnly] = useState(false), [availableOnly,setAvailableOnly] = useState(false);
  const [catalogFilter,setCatalogFilter] = useState('all');
  const [savedAt,setSavedAt] = useState(null), [saving,setSaving] = useState(false), [restored,setRestored] = useState(false);
  const [placementStatus,setPlacementStatus] = useState(null), [compare,setCompare] = useState(false);
  const [settingsError,setSettingsError] = useState(false);
  const savedSignature = useRef('');
  const toggleFavorite = key => setFavorites(items => items.includes(key)?items.filter(k=>k!==key):[...items,key]);
  const canvas = useRef(),
    fileInput = useRef();
  const placements = history.present;
  const catalog = MODEL_LIST.find(m => m.id === modelId) || MODEL_LIST[0];
  const notify = message => setToast(message);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(()=>setToast(''),[language]);
  useEffect(() => {
    document.documentElement.dataset.theme=theme;
    document.documentElement.lang=language;
    document.title=language==='tr'?'BrickCraft Studio — Kendi tarzında yap.':'BrickCraft Studio — Build Your Way.';
    setSettingsError(!saveSettings(browserStorage(),{language,theme,modelId,mode,snap,favorites}));
  },[language,theme,modelId,mode,snap,favorites]);
  useEffect(() => {
    let active = true;
    setModel(null);setRestored(false);setCompare(false);setFavoritesOnly(false);setAvailableOnly(false);savedSignature.current='';
    setLoading(0);
    setError('');
    setSelected(null);
    setDraft(null);
    setHintOpen(false);
    setReference(false);
    setQuery('');
    setColor('all');
    setCategory('all');
    getModel(modelId, progress => {
      if (active) setLoading(progress);
    }).then(next => {
      if (!active) return;
      const workspace=readWorkspace(browserStorage(),modelId);
      const saved = validPlacements(workspace.pieces,next);
      setSavedAt(workspace.savedAt);setRestored(saved.length>0);if(saved.length)setMobilePanel(null);
      if(workspace.savedAt && !workspace.recovered && saved.length===workspace.pieces.length)savedSignature.current=JSON.stringify(saved);
      if(workspace.recovered)notify(t('Yedek kayıt kurtarıldı.'));
      dispatch({
        type: 'load',
        pieces: saved
      });
      setModel(next);
      setLoading(1);

    }).catch(e => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [modelId]);
  useEffect(() => {
    if(model?.id!==modelId)return;
    const signature=JSON.stringify(placements);
    if(savedSignature.current===signature)return;
    setSaving(true);
    const result=saveWorkspace(browserStorage(),modelId,placements);
    if(result.ok){savedSignature.current=signature;setSavedAt(result.savedAt);}
    setSaveError(!result.ok);setSaving(false);
  },[placements,model,modelId]);
  const used = useMemo(() => {
    const counts = {};
    placements.forEach(p => {
      const key = `${p.part}:${p.color}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [placements]);
  const activePiece = draft || placements.find(p => p.id === selected);
  const activeInfo = activePiece && model?.parts[activePiece.part];
  const completed = placements.filter(p => p.targetId).length;
  const hint = useMemo(() => {
    if (!hintOpen || !model) return null;
    const occupied = new Set(placements.map(p => p.targetId).filter(Boolean));
    const candidates = model.pieces.filter(p => !occupied.has(p.id)).sort((a,b)=>a.bottom-b.bottom || a.id.localeCompare(b.id));
    const matching = activePiece && candidates.find(p => p.part === activePiece.part && p.color === activePiece.color);
    return matching || candidates[0] || null;
  }, [hintOpen, model, placements, activePiece?.part, activePiece?.color]);
  const filtered = useMemo(() => model?.groups.filter(group => {
    const name = shortName(group.name).toLocaleLowerCase(language);
    const match = !query || `${name} ${group.name} ${group.sourceId} ${colorInfo(group.color, language).name}`.toLocaleLowerCase(language).includes(query.toLocaleLowerCase(language));
    return match && (!favoritesOnly || favorites.includes(group.key)) && (!availableOnly || mode==='free' || (used[group.key]||0)<group.count) && (color === 'all' || group.color === color) && (category === 'all' || category === 'plates' && /Plate|Tile/.test(group.name) || category === 'bricks' && /Brick|Slope/.test(group.name) || category === 'technic' && /Technic|Axle|Pin|Gear/.test(group.name));
  }) || [], [model, query, color, category, language, favorites, favoritesOnly, availableOnly, used, mode]);
  const commit = (piece, isNew) => {if(piece.targetId)setHintOpen(false);dispatch({
    type: 'set',
    pieces: current => isNew ? [...current, piece] : current.map(p => p.id === piece.id ? piece : p)
  });};
  const remove = () => {
    if (draft) {
      canvas.current?.cancel();
      return;
    }
    if (selected) {
      dispatch({
        type: 'set',
        pieces: current => current.filter(p => p.id !== selected)
      });
      setSelected(null);
    }
  };
  const undo = () => {
    canvas.current?.cancel();
    dispatch({
      type: 'undo'
    });
    setSelected(null);
  };
  const redo = () => {
    canvas.current?.cancel();
    dispatch({
      type: 'redo'
    });
    setSelected(null);
  };
  const startPart = (group, event) => {
    if (reference || tool !== 'move') flushSync(() => {
      setReference(false);
      setTool('move');
    });
    if (mode === 'model' && (used[group.key] || 0) >= group.count) {
      notify(t("Bu parçaların hepsi masada. Daha fazlası için serbest yapımı seç."));
      return;
    }
    canvas.current?.startPart(group, event);
    setMobilePanel(null);
  };
  const hintHasAvailable = hint && (model?.groups.find(g => g.part === hint.part && g.color === hint.color)?.count || 0) > (used[`${hint.part}:${hint.color}`] || 0);
  const hintHasSelected = hint && activePiece && !draft && activePiece.part === hint.part && activePiece.color === hint.color && !activePiece.targetId;
  const duplicate = () => {
    if (activePiece) {
      const group = model.groups.find(g => g.part === activePiece.part && g.color === activePiece.color);
      if (group) startPart(group);
    }
  };
  useEffect(() => {
    const onKey = event => {
      if (event.target.closest('input,textarea,select') || modal) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if (key === 'r') {
        event.preventDefault();
        canvas.current?.rotate(event.shiftKey ? 'x' : 'y');
      } else if (key === 'f') {event.preventDefault();canvas.current?.focus();} else if(key==='d'&&!event.metaKey&&!event.ctrlKey){event.preventDefault();duplicate();} else if (key === '?') {
        event.preventDefault();
        setModal('help');
      } else if (key === 'h') {
        event.preventDefault();
        setHintOpen(v => !v);
      } else if (key === 'escape') canvas.current?.cancel();else if (key === 'delete' || key === 'backspace') {
        event.preventDefault();
        remove();
      } else if (key === 'arrowup') {
        event.preventDefault();
        canvas.current?.move('y', .4);
      } else if (key === 'arrowdown') {
        event.preventDefault();
        canvas.current?.move('y', -.4);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const exportBuild = () => download(`${t(catalog.title)}-yapim.json`, JSON.stringify({
    format: 'parca-atolyesi',
    version: 2,
    modelId,
    pieces: placements
  }, null, 2));
  const importBuild = async event => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      const saved = JSON.parse(await file.text());
      if (saved.format !== 'parca-atolyesi' || saved.modelId !== modelId) throw new Error(t("Bu dosya farklı bir modele ait. Önce ilgili modeli aç."));
      const valid = validPlacements(saved.pieces, model);
      if (valid.length !== (Array.isArray(saved.pieces)?saved.pieces.length:-1)) throw new Error(t("Dosyada geçersiz parçalar var."));
      dispatch({
        type: 'set',
        pieces: valid
      });
      notify(t("Yapım dosyan açıldı."));
    } catch (e) {
      notify(e.message || t("Dosya açılamadı."));
    }
    event.target.value = '';
  };
  const exportParts = () => download(`${t(catalog.title)}-malzemeler.csv`, '\uFEFF'+[t('Parça'),language==='tr'?'Ad':'Name',t('Renk'),t('Gereken'),t('Masada'),t('Kalan')].join(';')+'\n' + model.groups.map(g => [g.sourceId, shortName(g.name), colorInfo(g.color, language).name, g.count, used[g.key] || 0, Math.max(0, g.count - (used[g.key] || 0))].join(';')).join('\n'), 'text/csv;charset=utf-8');
  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="#" onClick={e => e.preventDefault()}><span className="brand-symbol"><Cube size={24} weight="fill" /></span><span>brick<span className="brand-light">craft studio</span><small>{t("KENDİ TARZINDA YAP.")}</small></span></a>
      <span className="header-divider" />
      <button className="project-switch" onClick={() => setModal('models')}><span className="project-dot" /><span>{t(catalog.title)}<small>{t("Kişisel çalışma alanın")}</small></span><CaretDown size={15} /></button>
      <div className="header-actions"><span className={`save-state ${saveError||settingsError?'save-error':''}`} title={savedAt?`${t('Son kayıt')}: ${new Date(savedAt).toLocaleTimeString(language,{hour:'2-digit',minute:'2-digit'})}`:t('Yalnızca bu tarayıcıda saklanır.')}><CheckCircle size={16} />{saveError||settingsError ? t('Kayıt alanı dolu') : saving?t('Kaydediliyor…'):t('Bu cihazda kayıtlı')}</span><div className="language-switch" role="group" aria-label={t('Dil seçimi')}>{['tr','en'].map(lang=><button key={lang} aria-pressed={language===lang} aria-label={lang==='tr'?'Türkçe':'English'} onClick={()=>setLanguage(lang)}>{lang.toUpperCase()}</button>)}</div><div className="theme-switch" aria-label={t("Tema seçimi")}><button aria-label={t("Açık tema")} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Sun size={17} /></button><button aria-label={t("Koyu tema")} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Moon size={17} /></button></div><button className="button secondary export-button" onClick={exportBuild} disabled={!model}><DownloadSimple size={16} />{t("Yapımı kaydet")}</button></div>
    </header>
    <div className="mobile-tabs"><button onClick={() => setMobilePanel(mobilePanel === 'parts' ? null : 'parts')}><Stack />{t("Parçalar")}</button><button onClick={() => setMobilePanel(mobilePanel === 'tools' ? null : 'tools')}><Cursor />{t("Araçlar")}</button><button onClick={() => setModal('models')}><GridFour />{t("Modeller")}</button></div>
    <main className="workspace">
      <aside className={`parts-panel ${mobilePanel === 'parts' ? 'mobile-open' : ''}`}>
        <div className="panel-title"><div><span className="eyebrow">{t("MALZEME DEPOSU")}</span><h2>{t("Parçaların")}<span>{model?.groups.length || '—'}</span></h2></div><IconButton label={t("Malzeme listesini aç")} onClick={() => setModal('inventory')} disabled={!model}><Stack size={20} /></IconButton></div>
        <div className="build-mode"><button className={mode === 'model' ? 'active' : ''} onClick={() => setMode('model')}>{t("Model parçaları")}</button><button className={mode === 'free' ? 'active' : ''} onClick={() => setMode('free')}>{t("Serbest yapım")}</button></div>
        <label className="search"><MagnifyingGlass size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("Parça veya numara ara")} aria-label={t("Parça ara")} />{query && <button onClick={() => setQuery('')} aria-label={t("Aramayı temizle")}><X size={14} /></button>}</label>
        <div className="part-filters"><select aria-label={t("Parça türü")} value={category} onChange={e => setCategory(e.target.value)}><option value="all">{t("Tüm parçalar")}</option><option value="bricks">{t("Tuğla ve eğimler")}</option><option value="plates">{t("Plakalar")}</option><option value="technic">{t("Teknik parçalar")}</option></select><select aria-label={t("Renk filtresi")} value={color} onChange={e => setColor(e.target.value)}><option value="all">{t("Tüm renkler")}</option>{[...new Set(model?.groups.map(g => g.color))].map(c => <option key={c} value={c}>{colorInfo(c, language).name}</option>)}</select></div>
        <div className="tray-options"><button aria-pressed={availableOnly} onClick={()=>setAvailableOnly(v=>!v)}><Check size={13}/>{t('Yalnızca kalanlar')}</button><button aria-pressed={favoritesOnly} onClick={()=>setFavoritesOnly(v=>!v)}><Star size={13} weight={favoritesOnly?'fill':'regular'}/>{t('Favoriler')}</button></div><div className="tray-meta"><span>{filtered.length} {t("parça çeşidi")}</span><span>{t("Tut ve sürükle")} <Hand size={13} /></span></div>
        <div className="parts-grid">
          {!model ? <div className="tray-loading">{t("Parçalar hazırlanıyor…")}</div> : !filtered.length ? <div className="no-results"><MagnifyingGlass size={26} /><p>{t("Bu aramada parça yok.")}</p><button onClick={() => {
              setQuery('');
              setCategory('all');
              setColor('all');setFavoritesOnly(false);setAvailableOnly(false);
            }}>{t("Filtreleri temizle")}</button></div> : filtered.map(group => {
            const remaining = Math.max(0, group.count - (used[group.key] || 0));
            return <div key={group.key} className="part-slot"><button className={`part-card ${activePiece?.part === group.part && activePiece?.color === group.color ? 'selected' : ''} ${mode === 'model' && !remaining ? 'exhausted' : ''}`} title={`${shortName(group.name)} · ${colorInfo(group.color, language).name}\n${t('Tut ve masaya sürükle. Klavyeyle seçmek için Enter.')}`} aria-label={`${shortName(group.name)} ${group.sourceId}, ${t('{count} adet', {
              count: remaining
            })}`} onPointerDown={e => {
              if (e.button === 0) {
                e.preventDefault();
                startPart(group, e);
              }
            }} onClick={e => {
              if (e.detail === 0) startPart(group);
            }} disabled={!model}>
              <span className="part-count">{mode === 'free' ? '∞' : remaining}<span>×</span></span><PartImage model={model} group={group} /><strong>{shortName(group.name)}</strong><span className="part-code"><i style={{
                  background: colorInfo(group.color, language).hex
                }} />{group.sourceId.replace('.dat', '')}</span>
            </button><button className="favorite-toggle" aria-label={`${t(favorites.includes(group.key)?'Favoriden çıkar':'Favoriye ekle')} · ${group.sourceId}`} aria-pressed={favorites.includes(group.key)} onClick={()=>toggleFavorite(group.key)}><Star size={13} weight={favorites.includes(group.key)?'fill':'regular'}/></button></div>;
          })}
        </div>
        <div className="tray-footer"><Info size={15} /><span>{mode === 'free' ? t("Sınırsız parça. Kendi tasarımını oluştur.") : t("Her parça, kaynak modelin gerçek geometrisi.")}</span></div>
      </aside>
      <section className={`stage ${reference ? 'reference-view' : ''}`} aria-label={t("Yapım masası")}>
        <BuildCanvas ref={canvas} model={model} placements={placements} selected={selected} onSelect={setSelected} onDraft={setDraft} onCommit={commit} theme={theme} tool={tool} reference={reference} snap={snap} hint={hint} onPlacementStatus={setPlacementStatus} onNotice={key=>notify(t(key))} canvasLabel={t('3 boyutlu LEGO yapım alanı')} />
        <div className="stage-header"><div className="view-tabs"><button className={!reference ? 'active' : ''} onClick={() => setReference(false)}><Cursor size={15} />{t("Yapım masam")}</button><button className={reference ? 'active' : ''} onClick={() => {
              setReference(true);
              setHintOpen(false);
            }} disabled={!model}><Eye size={16} />{t("Bitmiş model")}</button></div><div className="stage-history"><IconButton label={t("Geri al (⌘Z)")} disabled={!history.past.length || reference} onClick={undo}><ArrowCounterClockwise size={18} /></IconButton><IconButton label={t("İleri al (⌘⇧Z)")} disabled={!history.future.length || reference} onClick={redo}><ArrowClockwise size={18} /></IconButton></div></div>
        {!model && <div className="stage-loading"><span className="spinner" /><h2>{error ? t("Model yüklenemedi") : t("Atölyen hazırlanıyor")}</h2><p>{error ? t('Model dosyası açılamadı.') : t('Gerçek parça geometrileri yükleniyor · %{percent}', {
              percent: Math.round(loading * 100)
            })}</p>{error && <button className="button primary" onClick={() => location.reload()}>{t("Tekrar dene")}</button>}<div className="loading-track"><i style={{
              width: `${loading * 100}%`
            }} /></div></div>}
        {restored && placements.length>0 && !draft && !reference && <div className="resume-badge"><CheckCircle size={14}/>{t('Kaldığın yerden')} <span>· {placements.length} {t('parça',{count:placements.length})}</span></div>}
        {compare && !reference && <div className="compare-card"><div><span>{t('Model rehberi')}</span><IconButton label={t('Referansı gizle')} onClick={()=>setCompare(false)}><X size={15}/></IconButton></div><ModelImage id={modelId}/></div>}
        {model && !placements.length && !draft && !reference && <div className="empty-stage"><span className="empty-icon"><Hand size={27} /></span><h1>{t("Şimdi sıra sende.")}</h1><p>{t("Soldan bir parçayı tut, masaya sürükle.")}<br />{t("Çevir, birleştir, kendi ellerinle yap.")}</p><span className="empty-shortcut"><kbd>R</kbd> {t("döndür")} <span>·</span> <kbd>H</kbd> {t("ipucu")}</span></div>}
        {reference && model && <div className="reference-label"><Eye size={16} /><span>{t("Bitmiş modeli inceliyorsun")}</span><button onClick={() => setReference(false)}>{t("Yapıma dön")}</button></div>}
        {placementStatus && !reference && <div role="status" className={`placement-feedback ${placementStatus==='overlap'?'invalid':''}`}><span/><b>{t(({floor:'Zemine hazır',surface:'Yüzeye hizalandı',stud:'Çıkıntılar hizalandı',overlap:'Parçalar çakışıyor',free:'Serbest konum',target:'Hedefe hizalandı'})[placementStatus])}</b></div>}
        {draft && !reference && <div className="held-banner"><Hand size={16} /><span>{t("Parça elinde · Masaya tıkla veya sürükleyip bırak")}</span><button onClick={() => canvas.current?.cancel()}>{t("İptal")} <kbd>Esc</kbd></button></div>}
        {hintOpen && !reference && model && <div className="hint-card"><div><Lightbulb size={20} /><strong>{t("Bir küçük ipucu")}</strong><IconButton label={t("İpucunu kapat")} onClick={() => setHintOpen(false)}><X size={17} /></IconButton></div>{hint ? <><p><b>{shortName(model.parts[hint.part].name)}</b> {t("parçasının örnek konumu masada saydam olarak görünüyor.")}</p><button className="button secondary" disabled={!hintHasAvailable && !hintHasSelected} onClick={() => canvas.current?.focusHint()}>{t("Parçayı hedefte elime al")} <ArrowSquareOut size={15} /></button><button className="hint-find" onClick={()=>{setQuery(model.parts[hint.part].sourceId);setColor(hint.color);setCategory('all');setFavoritesOnly(false);setAvailableOnly(false);setMobilePanel('parts');}}>{t('Bu parçayı depoda bul')}</button><small>{!hintHasAvailable && !hintHasSelected ? t("Bu parçaların hepsi masada. Hedefe taşımak için masadaki birini seç.") : t("Yerleştirmek için masaya tıkla. İstersen konumunu değiştir.")}</small></> : <p>{t("Tüm hedef parçaları yerleştirdin. Eline sağlık!")}</p>}</div>}
        <div className="object-tools"><button className={tool === 'move' ? 'active' : ''} onClick={() => setTool('move')} disabled={reference} aria-label={t("Taşıma aracı")}><Cursor size={18} /><span>{t("Taşı")}</span></button><button className={tool === 'rotate' ? 'active' : ''} onClick={() => setTool('rotate')} disabled={reference || !activePiece} aria-label={t("Döndürme halkalarını aç")}><ArrowClockwise size={18} /><span>{t("Çevir")}</span></button></div><div className="camera-tools"><IconButton label={t("İzometrik görünüm ve ortala")} onClick={() => canvas.current?.fit()}><Cube size={20} /></IconButton><IconButton label={t("Üstten görünüm")} onClick={() => canvas.current?.fit('top')}><GridFour size={20} /></IconButton><IconButton label={t("Önden görünüm")} onClick={() => canvas.current?.fit('front')}><Eye size={20} /></IconButton><span /><IconButton label={t("Çalışmayı ekrana sığdır")} onClick={() => canvas.current?.fit()}><ArrowsOut size={20} /></IconButton></div>
        <div className="stage-bottom"><button className={`snap-toggle ${snap ? 'on' : ''}`} onClick={() => setSnap(!snap)} aria-pressed={snap}><span className="switch-track"><i /></span>{t("Izgaraya hizala")}</button><button className={`hint-button ${hintOpen ? 'active' : ''}`} onClick={() => {
            setReference(false);
            setHintOpen(v => !v);
          }} disabled={!model}><Lightbulb size={18} />{t("İpucu iste")}<kbd>H</kbd></button></div>
      </section>
      <aside className={`details-panel ${activePiece&&!reference?'has-piece':'no-piece'} ${mobilePanel === 'tools' ? 'mobile-open' : ''}`}>
        <div className="detail-section selected-section"><span className="eyebrow">{t("PARÇA KONTROLÜ")}</span><h2>{activePiece ? t("Elindeki parça") : t("Tut. Çevir. Yerleştir.")}</h2>
          {activePiece && activeInfo ? <div className="selected-part"><PartImage model={model} group={activePiece} /><div><strong>{shortName(activeInfo.name)}</strong><small>{activeInfo.sourceId} · {colorInfo(activePiece.color, language).name}</small></div></div> : <p className="muted">{t("Masadaki bir parçaya veya depodaki parçalardan birine dokun.")}</p>}
          <div className="piece-controls"><div className="control-label">{t("DÖNDÜR")} <span>{t("Her tıklama 90°")}</span></div>
          <div className="rotate-buttons">{['x', 'y', 'z'].map(axis => <button key={axis} disabled={!activePiece || reference} onClick={() => canvas.current?.rotate(axis)} aria-label={t('{axis} ekseninde döndür', {
              axis: axis.toUpperCase()
            })}><ArrowClockwise size={18} /><strong>{axis.toUpperCase()}</strong></button>)}</div>
          <div className="control-label">{t("YÜKSEKLİK")} <span>{t("1 kademe = 1 plaka")}</span></div>
          <div className="height-controls"><button disabled={!activePiece || reference} onClick={() => canvas.current?.move('y', -.4)} aria-label={t("Bir plaka aşağı")}><Minus size={16} /></button><span>{activePiece ? t('{count} plaka', {
                count: (activePiece.position[1] / .4).toFixed(1)
              }) : '—'}</span><button disabled={!activePiece || reference} onClick={() => canvas.current?.move('y', .4)} aria-label={t("Bir plaka yukarı")}><Plus size={16} /></button></div>
          <details className="precision-position"><summary>{t("Hassas konum")} <CaretDown size={12} /></summary><div className="position-inputs">{['x', 'y', 'z'].map((axis, index) => <label key={axis}><span>{axis.toUpperCase()}</span><input aria-label={t('{axis} konumu', {
                  axis: axis.toUpperCase()
                })} type="number" step={axis === 'y' ? .4 : .5} disabled={!activePiece || reference} value={activePiece ? Number(activePiece.position[index].toFixed(2)) : ''} placeholder="—" onChange={e => canvas.current?.move(axis, Number(e.target.value), true)} /></label>)}</div></details>
          <div className="quick-piece-actions"><button disabled={!activePiece||reference} onClick={()=>canvas.current?.focus()}><ArrowsOut size={14}/>{t('Parçaya yaklaş (F)')}</button><button disabled={!activePiece||reference} onClick={()=>canvas.current?.ground()}><ArrowDown size={14}/>{t('Tabana indir')}</button></div><div className="piece-actions"><button disabled={!activePiece || reference} onClick={duplicate}><Plus size={15} />{t("Kopyala")}</button><button disabled={!activePiece || reference} onClick={remove}><Trash size={15} />{t("Kaldır")}</button></div></div>
        </div>
        <div className="detail-section reference-section"><div className="section-row"><span className="eyebrow">{t("YAPTIĞIN MODEL")}</span><button onClick={() => setModal('models')}>{t("Değiştir")} <CaretDown size={12} /></button></div><button className="model-thumbnail" onClick={() => {
            setReference(true);
            setHintOpen(false);
          }} disabled={!model} aria-label={t("Bitmiş modeli 3 boyutlu incele")}>{model && <ModelImage id={modelId} />}<span><ArrowsOut size={14} />{t("3B incele")}</span></button><button className="compare-toggle" aria-pressed={compare} onClick={()=>{setReference(false);setCompare(v=>!v);}}>{compare?t('Referansı gizle'):t('Yan yana karşılaştır')}<Eye size={14}/></button><h3>{t(catalog.title)}</h3><p className="model-subtitle">{t(catalog.tag)} <span>·</span> {catalog.source}</p><div className="model-stats"><div><strong>{catalog.count.toLocaleString(language)}</strong><span>{t("kaynak parça")}</span></div><div><strong>{placements.length}</strong><span>{t("masada")}</span></div></div><div className="progress-track"><i style={{
              width: `${completed / catalog.count * 100}%`
            }} /></div><p className="progress-caption">{completed} {t("parça hedefe yerleşti",{count:completed})} <span>{(completed/catalog.count).toLocaleString(language,{style:'percent',maximumFractionDigits:0})}</span></p><button className="source-link" onClick={() => setModal('sources')}><Info size={14} />{t("Tasarımcı ve kaynak bilgileri")} <ArrowSquareOut size={12} /></button></div>
        <button className="help-link" onClick={() => setModal('help')}><Mouse size={18} />{t("Kontroller ve kısayollar")}<span>?</span></button>
      </aside>
    </main>
    <footer className="status-bar"><span><i className="status-dot" />{draft ? t("Bir parça elinde") : reference ? t("Model inceleme") : mode === 'free' ? t("Serbest yapım") : t("Yapım alanı")}<b>·</b>{placements.length} {t("parça",{count:placements.length})}</span><span className="status-instructions"><Mouse size={13} />{t("Boş alanda sürükle: kamerayı çevir")} <b>·</b> {t("Tekerlek: yakınlaş")} <b>·</b> {t("Sağ tuş: kaydır")}</span><button onClick={() => setModal('help')}>{t("Kısayollar")} <kbd>?</kbd></button></footer>
    {toast && <div role="status" className="toast"><CheckCircle size={18} />{toast}</div>}
    <div className="sr-only" aria-live="polite">{draft ? t("Parça seçildi. Masaya yerleştirebilirsin.") : t('{count} parça masada.', {
        count: placements.length
      })}</div>
    <input type="file" accept=".json" ref={fileInput} hidden onChange={importBuild} />
    {modal === 'models' && <Modal title={t("Bir sonraki yapını seç.")} onClose={() => setModal(null)} wide><p className="modal-intro">{t("Gerçek parça geometrileri. Detaylı tasarımlar. Baştan sona senin yapımın.")}</p><div className="catalog-filters">{[['all','Tümü'],['vehicles','Araçlar ve uzay'],['architecture','Mimari'],['nature','Doğa']].map(([value,label])=><button key={value} aria-pressed={catalogFilter===value} onClick={()=>setCatalogFilter(value)}>{t(label)}</button>)}</div><div className="model-catalog">{MODEL_LIST.filter(item=>catalogFilter==='all'||item.category===catalogFilter).map(item => <button className={`catalog-card ${modelId === item.id ? 'current' : ''}`} key={item.id} onClick={() => {
          if (item.id !== modelId) setModelId(item.id);
          setModal(null);
        }}><div className="catalog-image"><ModelImage id={item.id} /><span className="source-badge">{item.source}</span>{item.isNew&&<span className="new-badge">{t('Yeni')}</span>}</div><div className="catalog-copy"><span className="eyebrow">{t(item.tag)}</span><h3>{t(item.title)}{modelId === item.id && <CheckCircle size={20} weight="fill" />}</h3><p>{t(item.description)}</p><div><span>{item.count.toLocaleString(language)} {t("parça")}</span><span>{t(item.label)}</span></div><small className="catalog-resume">{readWorkspace(browserStorage(),item.id).pieces.length?`${t('Kaldığın yerden')} · ${readWorkspace(browserStorage(),item.id).pieces.length} ${t('parça')}`:t('Yeni bir başlangıç')}</small></div></button>)}</div><p className="modal-footnote">{t("Parça sayıları model dosyalarından hesaplanır. Her modeldeki yapımın ayrı kaydedilir.")}</p></Modal>}
    {modal === 'inventory' && model && <Modal title={t("Malzeme listen")} onClose={() => setModal(null)} wide><div className="inventory-intro"><p>{t(catalog.title)} · {catalog.count.toLocaleString(language)} {t("parça")} · {model.groups.length} {t("parça / renk çeşidi")}</p><button className="button primary" onClick={exportParts}><DownloadSimple size={16} />{t("CSV indir")}</button></div><div className="inventory-table"><table><thead><tr><th>{t("Parça")}</th><th>{t("Renk")}</th><th>{t("Gereken")}</th><th>{t("Masada")}</th><th>{t("Kalan")}</th></tr></thead><tbody>{model.groups.map(g => <tr key={g.key}><td><strong>{shortName(g.name)}</strong><small>{g.sourceId}</small></td><td><i className="color-chip" style={{
                  background: colorInfo(g.color, language).hex
                }} />{colorInfo(g.color, language).name}</td><td>{g.count}</td><td>{used[g.key] || 0}</td><td>{Math.max(0, g.count - (used[g.key] || 0))}</td></tr>)}</tbody></table></div></Modal>}
    {modal === 'sources' && model && <Modal title={t("Modelin hikâyesi ve kaynakları")} onClose={() => setModal(null)}><div className="source-content"><h3>{t(catalog.title)}</h3><p>{t("Tasarımcı:")} <b>{model.metadata.author}</b></p><p>{t("Bu modelin lisansı:")} <a href={model.metadata.licenseUrl} target="_blank" rel="noreferrer">{model.metadata.license}</a>{t(". Parça geometrileri LDraw topluluk kütüphanesinden gelir; özgün yazar ve lisans bilgileri dosyalarda korunur.")}</p><p>{modelId === 'car' ? t("Ferrari modelinde çıkartmalar bulunmuyor. Dosyada 1.157 öğe var; kutu üzerindeki parça sayısıyla farklılık gösterebilir.") : modelId === 'eiffel' ? t("Kulenin esnek aks geometrisi kaynak dosyadaki şekliyle korunur.") : modelId==='shuttle'?t('Discovery, Hubble teleskobu açık konumdayken gösterilir. Kaynakta teleskop bağlantı braketi ve katlı güneş paneli boruları yoktur. Bazı bilgi etiketlerinin görselleri kaynakta bulunmaz.'): modelId==='bonsai'?t('Sakura varyantı, pembe çiçekleri ve sergileme kaidesiyle aktarılmıştır.'): modelId==='bouquet'?t('Buketteki tüm çiçekler ayrı hareket ettirilebilir parçalardan oluşur.'): t("GitHub’daki Carriage House tasarımının mimari parçaları, odaları ve araçları birlikte aktarılmıştır. Karbonit desenli parçada geometrik baskı kullanılır; küçük baskı ayrıntıları farklı olabilir.")}</p><p>{t("Alt gruplar ayrı, hareket ettirilebilir parçalara dönüştürüldü. Bu bir topluluk yapım aracıdır; LEGO Group ile bağlantılı değildir.")}</p><div className="source-actions"><a className="button primary" href={model.metadata.sourcePage} target="_blank" rel="noreferrer">{t("Özgün model sayfası")} <ArrowSquareOut size={15} /></a><a className="button secondary" href={model.metadata.sourceFile} download>{t("Kaynak MPD")} <DownloadSimple size={15} /></a></div><a href="/ldraw/CAreadme.txt" target="_blank" rel="noreferrer">{t("LDraw lisans bilgileri")}</a></div></Modal>}
    {modal === 'help' && <Modal title={t("Masanın kontrolü sende.")} onClose={() => setModal(null)}><div className="help-content"><div className="help-step"><span>01</span><div><h3>{t("Tut ve yerleştir")}</h3><p>{t("Depodaki parçayı masaya sürükle. Masadaki parçayı tekrar tutup taşı. Klavyeyle parça seçmek için Enter, yerleştirmek için masaya tıkla.")}</p></div></div><div className="help-step"><span>02</span><div><h3>{t("Çevir ve birleştir")}</h3><p>{t("“Çevir” aracını aç, parçanın çevresindeki halkaları tutup döndür. R ile yatay, Shift + R ile X ekseninde döndür. Sağdaki X / Y / Z kontrollerini kullan. Ok tuşlarıyla yüksekliği bir plaka değiştir. Izgaraya hizala açıkken halkalar 15° aralıklarla döner; kapalıyken serbesttir.")}</p></div></div><div className="help-step"><span>03</span><div><h3>{t("İstediğin zaman yardım al")}</h3><p>{t("H ile örnek konumu gör. “Parçayı hedefte elime al” konum ve yönü hazırlar; yerleştirmek için yine sen tıklarsın.")}</p></div></div><p className="help-note">{t('Düz tuğla ve plakalar, birbirlerinin çıkıntılarına hizalanır; gövdeler çakışıyorsa yerleştirme durdurulur. Özel parçalar için yüzey ve ızgara hizalaması kullanılır. Teknik pim ve menteşeler için fiziksel bağlantı doğrulaması henüz yok.')}</p><div className="shortcut-list"><span>{t("Geri al")} <kbd>⌘ / Ctrl Z</kbd></span><span>{t("Parçayı kaldır")} <kbd>Delete</kbd></span><span>{t("Elindeki parçayı bırak")} <kbd>Esc</kbd></span><span>{t("Kamerayı kaydır")} <kbd>{t("Sağ tuş")}</kbd></span></div><div className="source-actions"><button className="button secondary" onClick={() => {
            setModal(null);
            fileInput.current.click();
          }} disabled={!model}><UploadSimple size={16} />{t("Yapım dosyası aç")}</button><button className="button secondary" onClick={() => setModal('clear')} disabled={!placements.length}><Trash size={16} />{t("Masayı temizle")}</button></div></div></Modal>}
    {modal === 'clear' && <Modal title={t("Masayı temizle")} onClose={() => setModal(null)}><p className="modal-intro">{t('Masadaki {count} parça depoya dönecek. Bu işlemi geri alabilirsin.', {
          count: placements.length
        })}</p><div className="source-actions"><button className="button secondary" onClick={() => setModal(null)}>{t("Vazgeç")}</button><button className="button primary" onClick={() => {
          canvas.current?.cancel();
          dispatch({
            type: 'set',
            pieces: []
          });
          setSelected(null);
          setModal(null);
        }}>{t("Masayı temizle")}</button></div></Modal>}
  </div>;
}
