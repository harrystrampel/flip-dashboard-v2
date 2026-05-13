import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Store,
  CalendarIcon,
  Briefcase,
  User,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Trash2,
  Lightbulb,
  Download,
  Upload,
  Info
} from 'lucide-react';

// ============ STORAGE HELPERS ============
function localStorageSet(key, value) {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return { value };
  } catch (e) {
    console.error('localStorage set failed:', e);
    return null;
  }
}

function localStorageGet(key) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? { value: v } : null;
  } catch (e) {
    return null;
  }
}

// ============ MARKETPLACE DATA LOADER ============
// Loaded async from /marketplace.json (in public/). Falls back to embedded copy.
// Cache busting: appends ?v=YYYYMMDDHH to bypass Safari's aggressive caching on PWAs.
let MARKETPLACE = [];
let LAST_DATA_UPDATE = '2026-05-13';

async function loadMarketplaceData() {
  try {
    const cacheBust = new Date().toISOString().slice(0, 13).replace(/[-T]/g, '');
    const res = await fetch(`/marketplace.json?v=${cacheBust}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    MARKETPLACE = data.items || [];
    LAST_DATA_UPDATE = data.lastUpdate || LAST_DATA_UPDATE;
    return true;
  } catch (e) {
    console.error('Failed to load marketplace.json:', e);
    return false;
  }
}


// ============ DATA ============
const CONFIDENCE_BADGES = {
  verified:    { dot: '#3F5530', bg: '#D4DCC8', label: 'GEVERIFIEERD',  desc: 'Prijs bevestigd via NL/EU retailer' },
  estimate:    { dot: '#A87E1A', bg: '#F5E6C4', label: 'SCHATTING',     desc: 'Prijs op basis van vergelijkbare items' },
  speculative: { dot: '#A04545', bg: '#E8C9C0', label: 'SPECULATIEF',   desc: 'Toekomstige waarde — hoge onzekerheid' }
};

const STATUS_OPTIONS = ['Actief', 'Verkocht'];
const STATUS_COLORS = {
  'Actief': { bg: '#D4DCC8', text: '#3F5530', dot: '#6B8A4F' },
  'Verkocht': { bg: '#D9C9C0', text: '#6B2E2E', dot: '#A04545' },
  // Legacy migration fallbacks
  'Open': { bg: '#D4DCC8', text: '#3F5530', dot: '#6B8A4F' },
  'Pre-ordered': { bg: '#D4DCC8', text: '#3F5530', dot: '#6B8A4F' },
  'Gekocht': { bg: '#D4DCC8', text: '#3F5530', dot: '#6B8A4F' }
};
const CATEGORY_STYLES = {
  'Pokemon': { bg: '#1F2937', text: '#FBF8F1', label: 'POKÉMON' },
  'LEGO': { bg: '#7A2E2E', text: '#FBF8F1', label: 'LEGO' },
  'Sports': { bg: '#0F4C81', text: '#FBF8F1', label: 'SPORTS' },
  'Vintage Gaming': { bg: '#4A1A6E', text: '#FBF8F1', label: 'GAMING' },
  'Magic: The Gathering': { bg: '#3D2817', text: '#FBF8F1', label: 'MTG' },
  'Sneakers': { bg: '#1F1815', text: '#FBF8F1', label: 'SNEAKERS' },
  'Other': { bg: '#6B6358', text: '#FBF8F1', label: 'COLLECTIBLES' }
};

const TIPS = [
  { title: 'Inkopen — waar het goedkoopst', items: ['DE/BE/CZ shops 10–25% goedkoper dan NL: Cardgate.eu, Kaboom-Schoolyard.de, Magicbazar.de, Gameware.at, Fanaticka.cz','NL Pokemon: €230–300 voor zelfde box — altijd 4-5 shops vergelijken','LEGO: Bol/Amazon NL hebben regelmatig 15-25% korting','LEGO exclusives: alleen via LEGO.com NL op release day om 09:00','US import vermijden: door BTW (21%), douane (€15-25), verzending €25-45 betaal je netto €224-258 ipv €148 retail'] },
  { title: 'Verkopen — waar het meeste oplevert', items: ['eBay (UK/EU): grootste publiek, fees ~10-13%. Filter "Sold listings"','Marktplaats: lokale NL, 0% fees, sneller maar lager','Catawiki: veilingplatform premium items, fees 12.5%','Vinted Pro: voor kleine items, fees 5%','Whatnot: livestream-verkoop, hoogste marge sportkaarten/Pokemon singles','Verkoop op piekmomenten: tijdens hype-events'] },
  { title: 'Timing & strategie', items: ['Pokemon: pre-orders 2-4 weken voor release — prijzen laagst','Pokemon BB: verkoop binnen 1-4 weken na release voor piek','Pokemon sealed lange termijn: 2-3 jaar voor 50-100%','LEGO retirement: koop 3-6 mnd voor retirement, wacht 1+ jaar met verkopen','LEGO GWPs: koop hoofdset, verkoop GWP los','Multi-shop ordering — 4-5 boxes per shop max'] },
  { title: 'LEGO-specifiek', items: ['Bewaar doos plat opgevouwen + handleiding = 30-50% meer resale','Sealed waarde stijgt veel meer dan opened','Stack GWPs voor extra marge','VIP-punten LEGO.com: 5% terug','Modulars: 17% jaarlijkse groei','UCS Star Wars: hoogste lange-termijn maar 5+ jaar bewaren'] },
  { title: 'Pokemon-specifiek', items: ['Sealed bewaren is waardevoller dan openen','ETB heeft lagere marge maar liquider','BB heeft hoogste totale waarde','Engelse boxes: liquide internationale markt','Japanse boxes: betere print, lagere instap, Master Ball exclusives','30th Celebration (sept 2026) = grootste event van het jaar'] },
  { title: 'Algemene principes', items: ['Fees stapelen: reken NETTO marge na alle fees','Reputation per platform compound: 500+ verkopen = 5-10% premium','Verkopen is moeilijker dan kopen','Tijd is kostenpost: reken €15-25/uur','Volume > marge: 50 × €20 > 5 × €100','Spreid over minimaal 5 items'] }
];

// ============ PRODUCT VISUAL ============
function ProductVisual({ category, variant, theme, productName }) {
  const type = theme.type;
  const isBB = variant === 'Booster Box' || type === 'pkm-bb';
  const isETB = variant === 'Elite Trainer Box' || type === 'pkm-etb';
  const isPkmSingle = type === 'pkm-single' || type === 'pkm-vintage' || type === 'mtg';
  const isSport = type === 'sport';
  const isGaming = type === 'gaming';
  const id = `${productName}-${variant || 'default'}`;

  if (isBB && (category === 'Pokemon' || !category)) {
    return (
      <svg viewBox="0 0 200 150" style={{ width: '100%', height: '100%' }}>
        <defs><linearGradient id={`bb-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={theme.primary} /><stop offset="100%" stopColor={theme.secondary} /></linearGradient></defs>
        <rect x="56" y="24" width="92" height="110" rx="3" fill="#000" opacity="0.15" />
        <rect x="52" y="20" width="92" height="110" rx="3" fill={`url(#bb-${id})`} />
        <rect x="52" y="20" width="92" height="14" fill="#000" opacity="0.25" />
        <circle cx="98" cy="56" r="14" fill="#FBF8F1" opacity="0.95" />
        <circle cx="98" cy="56" r="14" fill="none" stroke="#1F1815" strokeWidth="1.5" />
        <line x1="84" y1="56" x2="112" y2="56" stroke="#1F1815" strokeWidth="1.5" />
        <circle cx="98" cy="56" r="4" fill="#FBF8F1" stroke="#1F1815" strokeWidth="1.5" />
        <rect x="60" y="78" width="76" height="20" rx="1" fill="#FBF8F1" opacity="0.92" />
        <text x="98" y="91" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="9" fontWeight="600" fill={theme.primary}>{theme.label.length > 14 ? theme.label.slice(0, 14) : theme.label}</text>
        <rect x="52" y="113" width="92" height="17" fill="#000" opacity="0.4" />
        <text x="98" y="125" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill={theme.accent} letterSpacing="0.18em">BOOSTER BOX · 36</text>
      </svg>
    );
  }
  if (isETB) {
    return (
      <svg viewBox="0 0 200 150" style={{ width: '100%', height: '100%' }}>
        <defs><linearGradient id={`etb-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={theme.secondary} /><stop offset="100%" stopColor={theme.primary} /></linearGradient></defs>
        <rect x="24" y="40" width="156" height="84" rx="3" fill="#000" opacity="0.15" />
        <rect x="20" y="36" width="156" height="84" rx="3" fill={`url(#etb-${id})`} />
        <rect x="20" y="36" width="156" height="12" fill="#000" opacity="0.25" />
        <rect x="36" y="58" width="18" height="22" rx="1" fill="#FBF8F1" opacity="0.9" />
        <rect x="40" y="56" width="18" height="22" rx="1" fill="#FBF8F1" opacity="0.7" />
        <rect x="44" y="54" width="18" height="22" rx="1" fill="#FBF8F1" opacity="0.5" />
        <rect x="70" y="60" width="14" height="14" rx="2" fill="#FBF8F1" opacity="0.9" />
        <rect x="92" y="58" width="76" height="20" rx="1" fill="#FBF8F1" opacity="0.92" />
        <text x="130" y="71" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="8" fontWeight="600" fill={theme.primary}>{theme.label.length > 16 ? theme.label.slice(0, 14) + '…' : theme.label}</text>
        <rect x="20" y="104" width="156" height="16" fill="#000" opacity="0.4" />
        <text x="98" y="115" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill={theme.accent} letterSpacing="0.18em">ELITE TRAINER BOX</text>
      </svg>
    );
  }
  if (isPkmSingle) {
    return (
      <svg viewBox="0 0 200 150" style={{ width: '100%', height: '100%' }}>
        <defs><linearGradient id={`card-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={theme.primary} /><stop offset="100%" stopColor={theme.secondary} /></linearGradient></defs>
        <rect x="78" y="20" width="64" height="106" rx="4" fill="#000" opacity="0.2" />
        <rect x="74" y="16" width="64" height="106" rx="4" fill={`url(#card-${id})`} stroke={theme.accent} strokeWidth="1.5" />
        <rect x="80" y="26" width="52" height="44" rx="2" fill="#FBF8F1" opacity="0.15" />
        <circle cx="106" cy="48" r="14" fill={theme.accent} opacity="0.8" />
        <circle cx="106" cy="48" r="8" fill="#FBF8F1" opacity="0.4" />
        <rect x="80" y="76" width="52" height="12" rx="1" fill="#000" opacity="0.4" />
        <text x="106" y="85" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="7" fontWeight="700" fill={theme.accent}>{theme.label.length > 12 ? theme.label.slice(0, 12) : theme.label}</text>
        <rect x="80" y="92" width="52" height="2" fill="#FBF8F1" opacity="0.5" />
        <rect x="80" y="98" width="40" height="2" fill="#FBF8F1" opacity="0.3" />
        <rect x="80" y="104" width="44" height="2" fill="#FBF8F1" opacity="0.3" />
        <rect x="80" y="112" width="52" height="6" rx="1" fill={theme.accent} opacity="0.6" />
      </svg>
    );
  }
  if (isSport) {
    return (
      <svg viewBox="0 0 200 150" style={{ width: '100%', height: '100%' }}>
        <defs><linearGradient id={`sport-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={theme.primary} /><stop offset="100%" stopColor={theme.secondary} /></linearGradient></defs>
        <rect x="36" y="22" width="128" height="108" rx="3" fill="#000" opacity="0.15" />
        <rect x="32" y="18" width="128" height="108" rx="3" fill={`url(#sport-${id})`} />
        <polygon points="32,18 80,18 60,40 32,40" fill={theme.accent} opacity="0.9" />
        <polygon points="160,18 160,40 132,40 112,18" fill={theme.accent} opacity="0.9" />
        <circle cx="96" cy="62" r="14" fill="#FBF8F1" opacity="0.85" />
        <rect x="82" y="76" width="28" height="22" rx="4" fill="#FBF8F1" opacity="0.85" />
        <rect x="44" y="102" width="104" height="20" rx="1" fill="#000" opacity="0.5" />
        <text x="96" y="115" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fontWeight="700" fill={theme.accent} letterSpacing="0.15em">{theme.label.length > 16 ? theme.label.slice(0, 14) + '…' : theme.label}</text>
      </svg>
    );
  }
  if (isGaming) {
    return (
      <svg viewBox="0 0 200 150" style={{ width: '100%', height: '100%' }}>
        <defs><linearGradient id={`game-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={theme.primary} /><stop offset="100%" stopColor={theme.secondary} /></linearGradient></defs>
        <rect x="46" y="22" width="108" height="108" rx="2" fill="#000" opacity="0.2" />
        <rect x="42" y="18" width="108" height="108" rx="2" fill={`url(#game-${id})`} />
        <rect x="42" y="18" width="108" height="18" fill="#000" opacity="0.4" />
        <rect x="52" y="44" width="88" height="56" rx="2" fill="#FBF8F1" opacity="0.95" />
        <rect x="60" y="52" width="72" height="32" rx="1" fill={theme.primary} opacity="0.8" />
        <text x="96" y="72" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="11" fontWeight="700" fill={theme.accent}>{theme.label.length > 12 ? theme.label.slice(0, 12) : theme.label}</text>
        <text x="96" y="93" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6" fontWeight="600" fill={theme.primary}>SEALED · GRADED</text>
      </svg>
    );
  }
  // LEGO
  return (
    <svg viewBox="0 0 200 150" style={{ width: '100%', height: '100%' }}>
      <defs><linearGradient id={`lego-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={theme.primary} /><stop offset="100%" stopColor={theme.secondary} /></linearGradient></defs>
      <rect x="28" y="24" width="148" height="108" rx="3" fill="#000" opacity="0.15" />
      <rect x="24" y="20" width="148" height="108" rx="3" fill={`url(#lego-${id})`} />
      <rect x="24" y="20" width="44" height="28" fill="#FFC92E" />
      <text x="46" y="38" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="10" fontWeight="700" fill="#D62718">LEGO</text>
      <g opacity="0.9"><circle cx="84" cy="58" r="6" fill={theme.accent} /><circle cx="100" cy="58" r="6" fill={theme.accent} /><circle cx="116" cy="58" r="6" fill={theme.accent} /><circle cx="132" cy="58" r="6" fill={theme.accent} /><circle cx="84" cy="74" r="6" fill={theme.accent} /><circle cx="100" cy="74" r="6" fill={theme.accent} /><circle cx="116" cy="74" r="6" fill={theme.accent} /><circle cx="132" cy="74" r="6" fill={theme.accent} /></g>
      <rect x="34" y="96" width="128" height="24" rx="1" fill="#FBF8F1" opacity="0.95" />
      <text x="98" y="111" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="9" fontWeight="600" fill={theme.primary}>{theme.label.length > 20 ? theme.label.slice(0, 18) + '…' : theme.label}</text>
    </svg>
  );
}

// ============ MAIN APP ============
function AppInner() {
  const [tab, setTab] = useState('marketplace');
  const [data, setDataState] = useState({});
  const [viewedVariant, setViewedVariant] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const result = localStorageGet('flip-data-v3');
        if (result && result.value) {
          let parsed = JSON.parse(result.value);
          // ONE-TIME MIGRATION: convert legacy statuses (Open/Pre-ordered/Gekocht → Actief)
          let migrated = false;
          Object.keys(parsed).forEach(key => {
            const item = parsed[key];
            if (item && typeof item === 'object' && item.status && ['Open', 'Pre-ordered', 'Gekocht'].includes(item.status)) {
              parsed[key] = { ...item, status: 'Actief' };
              migrated = true;
            }
          });
          if (migrated) {
            try { localStorageSet('flip-data-v3', JSON.stringify(parsed)); } catch (e) {}
          }
          setDataState(parsed);
        }
      } catch (e) {}
      setLoaded(true);
    }
    load();
  }, []);

  const setData = async (newData) => {
    setDataState(newData);
    try { localStorageSet('flip-data-v3', JSON.stringify(newData)); } catch (e) {}
  };

  const updateQty = (id, variant, delta, suggestedRetail) => {
    const key = variant ? `${id}__${variant}` : id;
    const current = data[key] || { qty: 0, status: 'Actief', salePrice: 0, purchasePrice: suggestedRetail || 0 };
    const newQty = Math.max(0, current.qty + delta);
    const purchasePrice = current.purchasePrice || suggestedRetail || 0;
    // Migrate legacy statuses
    const status = ['Open', 'Pre-ordered', 'Gekocht'].includes(current.status) ? 'Actief' : (current.status || 'Actief');
    // Track addedDate: set first time qty goes from 0 to positive
    const addedDate = current.addedDate || (current.qty === 0 && newQty > 0 ? new Date().toISOString() : current.addedDate);
    setData({ ...data, [key]: { ...current, qty: newQty, purchasePrice, status, addedDate } });
  };
  const updateStatus = (id, variant) => {
    const key = variant ? `${id}__${variant}` : id;
    const current = data[key] || { qty: 0, status: 'Actief', salePrice: 0, purchasePrice: 0 };
    const newStatus = current.status === 'Verkocht' ? 'Actief' : 'Verkocht';
    // Track soldDate: set when first marked Verkocht; clear if toggled back
    const soldDate = newStatus === 'Verkocht' ? (current.soldDate || new Date().toISOString()) : null;
    setData({ ...data, [key]: { ...current, status: newStatus, soldDate } });
  };
  const deleteItem = (id, variant) => {
    const key = variant ? `${id}__${variant}` : id;
    const newData = { ...data };
    delete newData[key];
    setData(newData);
  };
  const updateSalePrice = (id, variant, price) => {
    const key = variant ? `${id}__${variant}` : id;
    const current = data[key] || { qty: 0, status: 'Actief', salePrice: 0, purchasePrice: 0 };
    setData({ ...data, [key]: { ...current, salePrice: price } });
  };
  const updatePurchasePrice = (id, variant, price) => {
    const key = variant ? `${id}__${variant}` : id;
    const current = data[key] || { qty: 0, status: 'Actief', salePrice: 0, purchasePrice: 0 };
    setData({ ...data, [key]: { ...current, purchasePrice: price } });
  };
  const updateImage = (id, imageData) => {
    setData({ ...data, [`__img_${id}`]: imageData });
  };
  const getImage = (id) => data[`__img_${id}`] || null;

  if (!loaded) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#FBF8F1', color: '#1F1815', fontFamily: '"Inter", -apple-system, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        .serif { font-family: 'Fraunces', Georgia, serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.25s ease; }
        input[type="number"] { -moz-appearance: textfield; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <div style={{ paddingBottom: '70px' }}>
        {tab === 'marketplace' && <MarketplaceTab data={data} updateQty={updateQty} viewedVariant={viewedVariant} setViewedVariant={setViewedVariant} getImage={getImage} updateImage={updateImage} />}
        {tab === 'calendar' && <CalendarTab data={data} />}
        {tab === 'portfolio' && <PortfolioTab data={data} updateQty={updateQty} updateStatus={updateStatus} updateSalePrice={updateSalePrice} updatePurchasePrice={updatePurchasePrice} deleteItem={deleteItem} getImage={getImage} setTab={setTab} />}
        {tab === 'account' && <AccountTab data={data} setData={setData} />}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(31, 24, 21, 0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(168,126,26,0.3)', padding: '8px 0', display: 'flex', zIndex: 100 }}>
        <TabBtn icon={<Store size={20} />} label="Marketplace" active={tab === 'marketplace'} onClick={() => setTab('marketplace')} />
        <TabBtn icon={<CalendarIcon size={20} />} label="Kalender" active={tab === 'calendar'} onClick={() => setTab('calendar')} />
        <TabBtn icon={<Briefcase size={20} />} label="Portfolio" active={tab === 'portfolio'} onClick={() => setTab('portfolio')} />
        <TabBtn icon={<User size={20} />} label="Account" active={tab === 'account'} onClick={() => setTab('account')} />
      </div>
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ flex: 1, background: 'transparent', border: 'none', padding: '6px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: active ? '#A87E1A' : '#A89D8C', cursor: 'pointer' }}>
      {icon}
      <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500, letterSpacing: '0.04em' }}>{label}</span>
    </button>
  );
}

// ============ MARKETPLACE TAB ============
function MarketplaceTab({ data, updateQty, viewedVariant, setViewedVariant, getImage, updateImage }) {
  // Filter state with sessionStorage persistence (survives nav to detail and back)
  const getStored = (key, fallback) => {
    try {
      const v = sessionStorage.getItem(`flip-filter-${key}`);
      return v !== null ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  };
  const setStored = (key, value, setter) => {
    setter(value);
    try { sessionStorage.setItem(`flip-filter-${key}`, JSON.stringify(value)); } catch (e) {}
  };

  const [searchQuery, _setSearchQuery] = useState(() => getStored('search', ''));
  const [categoryFilter, _setCategoryFilter] = useState(() => getStored('category', 'all'));
  const [priorityFilter, _setPriorityFilter] = useState(() => getStored('priority', 0));
  const [subcategoryFilter, _setSubcategoryFilter] = useState(() => getStored('subcategory', 'all'));
  const [priceFilter, _setPriceFilter] = useState(() => getStored('price', 'all'));
  const [releaseFilter, _setReleaseFilter] = useState(() => getStored('release', 'all'));
  const [confidenceFilter, _setConfidenceFilter] = useState(() => getStored('confidence', 'all'));
  const [sortBy, _setSortBy] = useState(() => getStored('sort', 'priority'));
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);

  const setSearchQuery = (v) => setStored('search', v, _setSearchQuery);
  const setCategoryFilter = (v) => setStored('category', v, _setCategoryFilter);
  const setPriorityFilter = (v) => setStored('priority', v, _setPriorityFilter);
  const setSubcategoryFilter = (v) => setStored('subcategory', v, _setSubcategoryFilter);
  const setPriceFilter = (v) => setStored('price', v, _setPriceFilter);
  const setReleaseFilter = (v) => setStored('release', v, _setReleaseFilter);
  const setConfidenceFilter = (v) => setStored('confidence', v, _setConfidenceFilter);
  const setSortBy = (v) => setStored('sort', v, _setSortBy);

  const categories = useMemo(() => ['all', ...Array.from(new Set(MARKETPLACE.map(i => i.category)))], []);
  const subcategoryOptions = useMemo(() => {
    const items = categoryFilter === 'all' ? MARKETPLACE : MARKETPLACE.filter(i => i.category === categoryFilter);
    return ['all', ...Array.from(new Set(items.map(i => i.subcategory).filter(Boolean)))];
  }, [categoryFilter]);

  // Reset subcategory if it doesn't apply to new category
  useEffect(() => {
    if (subcategoryFilter !== 'all' && !subcategoryOptions.includes(subcategoryFilter)) {
      setSubcategoryFilter('all');
    }
  }, [categoryFilter, subcategoryOptions, subcategoryFilter]);

  const getItemPrice = (item) => item.variants ? Math.min(...Object.values(item.variants).map(v => v.retail)) : item.retail;

  const filtered = useMemo(() => {
    const now = new Date();
    return MARKETPLACE.filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (subcategoryFilter !== 'all' && item.subcategory !== subcategoryFilter) return false;
      if (priorityFilter > 0 && item.priority < priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q) && !(item.subcategory || '').toLowerCase().includes(q)) return false;
      }
      if (priceFilter !== 'all') {
        const price = getItemPrice(item);
        if (priceFilter === 'low' && price >= 100) return false;
        if (priceFilter === 'mid' && (price < 100 || price >= 300)) return false;
        if (priceFilter === 'high' && (price < 300 || price >= 1000)) return false;
        if (priceFilter === 'premium' && price < 1000) return false;
      }
      if (releaseFilter !== 'all') {
        const itemDate = new Date(item.date);
        if (releaseFilter === 'upcoming' && itemDate <= now) return false;
        if (releaseFilter === 'retirement' && item.dateType !== 'retirement') return false;
        if (releaseFilter === 'available' && item.dateType !== 'available') return false;
        if (releaseFilter === 'vintage' && ((now - itemDate) / (1000 * 60 * 60 * 24 * 365)) < 5) return false;
      }
      if (confidenceFilter !== 'all') {
        const conf = item.confidence || 'estimate';
        if (conf !== confidenceFilter) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority;
      if (sortBy === 'price-low') return getItemPrice(a) - getItemPrice(b);
      if (sortBy === 'price-high') return getItemPrice(b) - getItemPrice(a);
      if (sortBy === 'date-soon') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'date-late') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'gain') {
        const ag = a.variants ? Math.max(...Object.values(a.variants).map(v => v.gain)) : a.gain;
        const bg = b.variants ? Math.max(...Object.values(b.variants).map(v => v.gain)) : b.gain;
        return bg - ag;
      }
      return 0;
    });
  }, [searchQuery, categoryFilter, priorityFilter, subcategoryFilter, priceFilter, releaseFilter, confidenceFilter, sortBy]);

  const activeFilterCount = (subcategoryFilter !== 'all' ? 1 : 0) + (priceFilter !== 'all' ? 1 : 0) + (releaseFilter !== 'all' ? 1 : 0) + (priorityFilter > 0 ? 1 : 0) + (sortBy !== 'priority' ? 1 : 0) + (confidenceFilter !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setSubcategoryFilter('all');
    setPriceFilter('all');
    setReleaseFilter('all');
    setPriorityFilter(0);
    setSortBy('priority');
    setConfidenceFilter('all');
  };

  if (selected) return <ProductDetail item={selected} onBack={() => setSelected(null)} data={data} updateQty={updateQty} viewedVariant={viewedVariant} setViewedVariant={setViewedVariant} getImage={getImage} updateImage={updateImage} />;

  return (
    <div>
      <div style={{ background: 'linear-gradient(180deg, #2A201A 0%, #1F1815 100%)', color: '#FBF8F1', padding: '28px 20px 20px', borderBottom: '1px solid #A87E1A' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#A87E1A', marginBottom: '6px', fontWeight: 500 }}>MARKETPLACE</div>
        <h1 className="serif" style={{ fontSize: '30px', fontWeight: 400, margin: '0 0 18px', letterSpacing: '-0.02em' }}>Alle collectibles</h1>
        <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={16} color="#A89D8C" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Zoek producten…" style={{ flex: 1, background: 'transparent', border: 'none', color: '#FBF8F1', fontSize: '14px', outline: 'none' }} />
          {searchQuery && <X size={16} color="#A89D8C" onClick={() => setSearchQuery('')} style={{ cursor: 'pointer' }} />}
        </div>
      </div>

      {/* Compact filter strip */}
      <div style={{ padding: '10px 12px 8px', background: '#FBF8F1', borderBottom: '1px solid #E8E2D5', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', flex: 1, paddingRight: '4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)} style={{ padding: '5px 10px', background: categoryFilter === c ? '#1F1815' : '#FFFFFF', color: categoryFilter === c ? '#FBF8F1' : '#1F1815', border: `1px solid ${categoryFilter === c ? '#1F1815' : '#E8E2D5'}`, borderRadius: '14px', fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' }}>
                {c === 'all' ? 'ALLES' : (CATEGORY_STYLES[c]?.label || c.toUpperCase())}
              </button>
            ))}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '5px 10px', background: activeFilterCount > 0 ? '#A87E1A' : (showFilters ? '#1F1815' : '#FFFFFF'), color: (activeFilterCount > 0 || showFilters) ? '#FBF8F1' : '#1F1815', border: `1px solid ${activeFilterCount > 0 ? '#A87E1A' : (showFilters ? '#1F1815' : '#E8E2D5')}`, borderRadius: '14px', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            FILTERS {activeFilterCount > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0 5px', borderRadius: '8px', fontSize: '9px' }}>{activeFilterCount}</span>}
            {showFilters ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <div style={{ fontSize: '10px', color: '#8B8378' }}>{filtered.length} producten</div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} style={{ background: 'transparent', border: 'none', color: '#A04545', fontSize: '10px', fontWeight: 600, cursor: 'pointer', padding: 0, letterSpacing: '0.04em' }}>
              WIS FILTERS ×
            </button>
          )}
        </div>
      </div>

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="fade-in" style={{ background: '#F4EFE4', borderBottom: '1px solid #E8E2D5', padding: '14px 16px' }}>
          {subcategoryOptions.length > 1 && (
            <FilterGroup label="Type">
              {subcategoryOptions.map(s => (
                <FilterChip key={s} active={subcategoryFilter === s} onClick={() => setSubcategoryFilter(s)} label={s === 'all' ? 'Alle' : s} />
              ))}
            </FilterGroup>
          )}
          <FilterGroup label="Prijs">
            <FilterChip active={priceFilter === 'all'} onClick={() => setPriceFilter('all')} label="Alle" />
            <FilterChip active={priceFilter === 'low'} onClick={() => setPriceFilter('low')} label="< €100" />
            <FilterChip active={priceFilter === 'mid'} onClick={() => setPriceFilter('mid')} label="€100–300" />
            <FilterChip active={priceFilter === 'high'} onClick={() => setPriceFilter('high')} label="€300–1000" />
            <FilterChip active={priceFilter === 'premium'} onClick={() => setPriceFilter('premium')} label="€1000+" />
          </FilterGroup>
          <FilterGroup label="Status">
            <FilterChip active={releaseFilter === 'all'} onClick={() => setReleaseFilter('all')} label="Alle" />
            <FilterChip active={releaseFilter === 'upcoming'} onClick={() => setReleaseFilter('upcoming')} label="Aankomend" />
            <FilterChip active={releaseFilter === 'retirement'} onClick={() => setReleaseFilter('retirement')} label="Retirement" />
            <FilterChip active={releaseFilter === 'available'} onClick={() => setReleaseFilter('available')} label="Beschikbaar" />
            <FilterChip active={releaseFilter === 'vintage'} onClick={() => setReleaseFilter('vintage')} label="Vintage (5+ jr)" />
          </FilterGroup>
          <FilterGroup label="Prioriteit">
            <FilterChip active={priorityFilter === 0} onClick={() => setPriorityFilter(0)} label="Alle" />
            <FilterChip active={priorityFilter === 4} onClick={() => setPriorityFilter(4)} label="4★+" gold />
            <FilterChip active={priorityFilter === 5} onClick={() => setPriorityFilter(5)} label="5★ enkel" gold />
          </FilterGroup>
          <FilterGroup label="Bron / Betrouwbaarheid">
            <FilterChip active={confidenceFilter === 'all'} onClick={() => setConfidenceFilter('all')} label="Alle" />
            <FilterChip active={confidenceFilter === 'verified'} onClick={() => setConfidenceFilter('verified')} label="🟢 Geverifieerd" />
            <FilterChip active={confidenceFilter === 'estimate'} onClick={() => setConfidenceFilter('estimate')} label="🟡 Schatting" />
            <FilterChip active={confidenceFilter === 'speculative'} onClick={() => setConfidenceFilter('speculative')} label="🔴 Speculatief" />
          </FilterGroup>
          <FilterGroup label="Sorteer op">
            <FilterChip active={sortBy === 'priority'} onClick={() => setSortBy('priority')} label="Prioriteit" />
            <FilterChip active={sortBy === 'gain'} onClick={() => setSortBy('gain')} label="Hoogste +%" />
            <FilterChip active={sortBy === 'price-low'} onClick={() => setSortBy('price-low')} label="Prijs ↑" />
            <FilterChip active={sortBy === 'price-high'} onClick={() => setSortBy('price-high')} label="Prijs ↓" />
            <FilterChip active={sortBy === 'date-soon'} onClick={() => setSortBy('date-soon')} label="Datum ↑" />
          </FilterGroup>
        </div>
      )}

      <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {filtered.map(item => <MarketCard key={item.id} item={item} onClick={() => setSelected(item)} customImage={getImage(item.id)} />)}
      </div>
      {filtered.length === 0 && (
        <div style={{ padding: '60px 30px', textAlign: 'center' }}>
          <div className="serif" style={{ fontSize: '16px', color: '#8B8378', marginBottom: '12px' }}>Geen producten gevonden</div>
          <button onClick={clearFilters} style={{ padding: '10px 18px', background: '#1F1815', color: '#FBF8F1', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer' }}>WIS FILTERS</button>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '6px', fontWeight: 700 }}>{label.toUpperCase()}</div>
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, gold }) {
  const activeColor = gold ? '#A87E1A' : '#1F1815';
  return (
    <button onClick={onClick} style={{ padding: '5px 11px', background: active ? activeColor : '#FFFFFF', color: active ? '#FBF8F1' : '#1F1815', border: `1px solid ${active ? activeColor : '#D4CCB8'}`, borderRadius: '14px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.02em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label}
    </button>
  );
}

function MarketCard({ item, onClick, customImage }) {
  const catStyle = CATEGORY_STYLES[item.category] || { bg: '#444', text: '#FBF8F1', label: item.category.toUpperCase() };
  const minRetail = item.variants ? Math.min(...Object.values(item.variants).map(v => v.retail)) : item.retail;
  const maxGain = item.variants ? Math.max(...Object.values(item.variants).map(v => v.gain)) : item.gain;
  const confidence = item.confidence || 'estimate';
  const badge = CONFIDENCE_BADGES[confidence];
  return (
    <div onClick={onClick} style={{ background: '#FFFFFF', border: '1px solid #E8E2D5', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
      {/* Confidence dot in top-right corner */}
      <div title={badge.desc} style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: badge.dot, border: '1.5px solid #FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', zIndex: 2 }} />
      <div style={{ aspectRatio: '4/3', background: '#F4EFE4', overflow: 'hidden' }}>
        {customImage ? (
          <img src={customImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <ProductVisual category={item.category} variant={item.variants ? Object.keys(item.variants)[0] : null} theme={item.theme} productName={item.id} />
        )}
      </div>
      <div style={{ padding: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
          <span style={{ background: catStyle.bg, color: catStyle.text, fontSize: '7.5px', letterSpacing: '0.1em', padding: '2px 5px', fontWeight: 700, borderRadius: '2px' }}>{catStyle.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#A87E1A' }}>{'★'.repeat(item.priority)}</span>
        </div>
        <div className="serif" style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.25, marginBottom: '4px', color: '#1F1815', minHeight: '32px' }}>{item.name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="mono" style={{ fontSize: '11.5px', color: '#1F1815', fontWeight: 600 }}>€{minRetail}+</div>
          <div className="mono" style={{ background: maxGain >= 50 ? '#3F5530' : maxGain >= 30 ? '#5C7A3F' : '#7A8C6A', color: '#FBF8F1', fontSize: '9px', padding: '2px 6px', borderRadius: '2px', fontWeight: 700 }}>+{maxGain}%</div>
        </div>
      </div>
    </div>
  );
}

function ProductDetail({ item, onBack, data, updateQty, viewedVariant, setViewedVariant, getImage, updateImage }) {
  const catStyle = CATEGORY_STYLES[item.category] || { bg: '#444', text: '#FBF8F1', label: item.category.toUpperCase() };
  const firstVariant = item.variants ? Object.keys(item.variants)[0] : null;
  const currentVariant = viewedVariant[item.id] || firstVariant;
  const customImage = getImage(item.id);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      // Compress image before saving
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width, h = img.height;
        if (w > h && w > maxDim) { h = h * (maxDim / w); w = maxDim; }
        else if (h > maxDim) { w = w * (maxDim / h); h = maxDim; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        updateImage(item.id, compressed);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ paddingBottom: '20px' }}>
      <div style={{ background: '#FBF8F1', padding: '14px 20px', borderBottom: '1px solid #E8E2D5', position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#1F1815', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>← Terug</button>
      </div>
      <div style={{ width: '100%', height: '240px', background: '#F4EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {customImage ? (
          <img src={customImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <ProductVisual category={item.category} variant={currentVariant} theme={item.theme} productName={item.id} />
        )}
        <button onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(31,24,21,0.85)', backdropFilter: 'blur(10px)', color: '#FBF8F1', border: 'none', padding: '7px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
          📷 {customImage ? 'Vervang foto' : 'Foto toevoegen'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ background: catStyle.bg, color: catStyle.text, fontSize: '9px', letterSpacing: '0.12em', padding: '3px 7px', fontWeight: 700, borderRadius: '2px' }}>{catStyle.label}</span>
          <span className="mono" style={{ fontSize: '11px', color: '#6B6358' }}>{item.dateLabel}</span>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#A87E1A' }}>{'★'.repeat(item.priority)}<span style={{ color: '#E8E2D5' }}>{'★'.repeat(5 - item.priority)}</span></span>
        </div>
        <h1 className="serif" style={{ fontSize: '24px', fontWeight: 500, margin: '0 0 6px', letterSpacing: '-0.01em', lineHeight: 1.15 }}>{item.name}</h1>
        {item.sublabel && <div style={{ fontSize: '12px', color: '#8B8378' }}>{item.sublabel}</div>}
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {item.variants ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(item.variants).map(([vName, v]) => {
              const isSelected = currentVariant === vName;
              const inPortfolio = data[`${item.id}__${vName}`]?.qty || 0;
              return (
                <div key={vName} onClick={() => setViewedVariant({ ...viewedVariant, [item.id]: vName })} style={{ border: `1.5px solid ${isSelected ? '#A87E1A' : '#E8E2D5'}`, borderRadius: '8px', padding: '14px', background: isSelected ? 'rgba(168,126,26,0.06)' : '#FFFFFF', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <div className="serif" style={{ fontSize: '15px', fontWeight: 600, color: '#1F1815' }}>{vName}</div>
                      <div style={{ fontSize: '10.5px', color: '#8B8378', marginTop: '2px' }}>{v.sublabel}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>€{v.retail} → <span style={{ color: '#3F5530' }}>€{v.expected}</span></div>
                      <div className="mono" style={{ marginTop: '4px', background: v.gain >= 50 ? '#3F5530' : v.gain >= 30 ? '#5C7A3F' : '#7A8C6A', color: '#FBF8F1', fontSize: '9px', padding: '2px 6px', borderRadius: '2px', fontWeight: 700, display: 'inline-block' }}>+{v.gain}%</div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); updateQty(item.id, vName, 1, v.retail); }} style={{ width: '100%', padding: '10px', background: inPortfolio > 0 ? '#3F5530' : '#1F1815', color: '#FBF8F1', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Plus size={14} />{inPortfolio > 0 ? `IN PORTFOLIO (${inPortfolio})` : 'TOEVOEGEN AAN PORTFOLIO'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ border: '1px solid #E8E2D5', borderRadius: '8px', padding: '14px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>€{item.retail} → <span style={{ color: '#3F5530' }}>€{item.expected}</span></div>
              <div className="mono" style={{ background: item.gain >= 50 ? '#3F5530' : item.gain >= 30 ? '#5C7A3F' : '#7A8C6A', color: '#FBF8F1', fontSize: '10px', padding: '3px 8px', borderRadius: '2px', fontWeight: 700 }}>+{item.gain}%</div>
            </div>
            <button onClick={() => updateQty(item.id, null, 1, item.retail)} style={{ width: '100%', padding: '10px', background: (data[item.id]?.qty || 0) > 0 ? '#3F5530' : '#1F1815', color: '#FBF8F1', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Plus size={14} />{(data[item.id]?.qty || 0) > 0 ? `IN PORTFOLIO (${data[item.id].qty})` : 'TOEVOEGEN AAN PORTFOLIO'}
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '0 20px 16px' }}>
        {(() => {
          const conf = item.confidence || 'estimate';
          const b = CONFIDENCE_BADGES[conf];
          return (
            <div style={{ background: b.bg, border: `1px solid ${b.dot}40`, borderRadius: '6px', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: b.dot, flexShrink: 0, marginTop: '4px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.14em', fontWeight: 700, color: '#2A201A', marginBottom: '3px' }}>{b.label}</div>
                <div style={{ fontSize: '11.5px', color: '#3F352A', lineHeight: 1.4 }}>{b.desc}</div>
                {item.source && item.sourceName && (
                  <div style={{ marginTop: '6px', fontSize: '11px' }}>
                    <span style={{ color: '#6B5C4A' }}>Bron: </span>
                    <a href={item.source} target="_blank" rel="noopener noreferrer" style={{ color: '#1F4A73', textDecoration: 'underline', wordBreak: 'break-word' }}>{item.sourceName}</a>
                    {item.verifiedDate && <span style={{ color: '#6B5C4A', display: 'block', marginTop: '2px' }}>Geverifieerd op {item.verifiedDate}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '12px', fontWeight: 700 }}>WAAROM HET STIJGT</div>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
          {item.reasoning.map((r, i) => (
            <li key={i} style={{ fontSize: '13px', lineHeight: 1.55, color: '#2A201A', paddingLeft: '16px', position: 'relative', marginBottom: '8px' }}>
              <span style={{ position: 'absolute', left: 0, top: '9px', width: '8px', height: '1px', background: '#A87E1A' }} />{r}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: '#F4EFE4', border: '1px solid #E8E2D5', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '4px', fontWeight: 700 }}>TIJDSHORIZON</div>
            <div className="mono" style={{ fontSize: '12px', color: '#1F1815', fontWeight: 500 }}>{item.horizon}</div>
          </div>
          <div style={{ background: '#F4EFE4', border: '1px solid #E8E2D5', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '4px', fontWeight: 700 }}>RISICO</div>
            <div className="mono" style={{ fontSize: '12px', color: '#1F1815', fontWeight: 500 }}>{item.risk}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ background: '#1F1815', color: '#FBF8F1', padding: '14px 16px', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A87E1A', marginBottom: '6px', fontWeight: 700 }}>ACTIE</div>
          <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{item.action}</div>
        </div>
      </div>

      {item.retailers && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '8px', fontWeight: 700 }}>WAAR TE KOPEN</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {item.retailers.map((r, i) => (
              <span key={i} style={{ background: '#F4EFE4', border: '1px solid #E8E2D5', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, color: '#1F1815' }}>{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ CALENDAR TAB ============
function CalendarTab({ data }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 4, 1));
  const [selectedDate, setSelectedDate] = useState(null);

  const eventsByDate = useMemo(() => {
    const map = {};
    MARKETPLACE.forEach(item => {
      if (item.dateType === 'available') return;
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
  const monthName = currentMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  return (
    <div>
      <div style={{ background: 'linear-gradient(180deg, #2A201A 0%, #1F1815 100%)', color: '#FBF8F1', padding: '28px 20px 22px', borderBottom: '1px solid #A87E1A' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#A87E1A', marginBottom: '6px', fontWeight: 500 }}>KALENDER</div>
        <h1 className="serif" style={{ fontSize: '30px', fontWeight: 400, margin: 0, letterSpacing: '-0.02em' }}>Release & retirement</h1>
      </div>

      <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FBF8F1', borderBottom: '1px solid #E8E2D5' }}>
        <button onClick={() => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); setSelectedDate(null); }} style={{ background: 'transparent', border: '1px solid #D4CCB8', borderRadius: '6px', padding: '7px', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={18} color="#1F1815" /></button>
        <div className="serif" style={{ fontSize: '18px', fontWeight: 500, textTransform: 'capitalize' }}>{monthName}</div>
        <button onClick={() => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); setSelectedDate(null); }} style={{ background: 'transparent', border: '1px solid #D4CCB8', borderRadius: '6px', padding: '7px', cursor: 'pointer', display: 'flex' }}><ChevronRight size={18} color="#1F1815" /></button>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {['M', 'D', 'W', 'D', 'V', 'Z', 'Z'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#8B8378', letterSpacing: '0.1em', padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {Array.from({ length: adjustedFirst }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const events = eventsByDate[dateKey] || [];
            const hasEvent = events.length > 0;
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;
            const dotColors = hasEvent ? [...new Set(events.map(e => e.category))].map(c => CATEGORY_STYLES[c]?.bg || '#444').slice(0, 3) : [];
            return (
              <button key={day} onClick={() => hasEvent && setSelectedDate(isSelected ? null : dateKey)} className="mono" style={{ aspectRatio: '1', background: isSelected ? '#1F1815' : isToday ? 'rgba(168,126,26,0.1)' : hasEvent ? '#FFFFFF' : 'transparent', border: `1px solid ${isSelected ? '#1F1815' : isToday ? '#A87E1A' : hasEvent ? '#E8E2D5' : 'transparent'}`, borderRadius: '6px', color: isSelected ? '#FBF8F1' : '#1F1815', fontSize: '13px', fontWeight: hasEvent ? 600 : 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: hasEvent ? 'pointer' : 'default', padding: 0 }}>
                {day}
                {hasEvent && <div style={{ display: 'flex', gap: '2px', marginTop: '3px' }}>{dotColors.map((c, j) => <div key={j} style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? '#A87E1A' : c }} />)}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate ? (
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '12px', fontWeight: 700 }}>
            {new Date(selectedDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </div>
          {selectedEvents.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      ) : (
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '12px', fontWeight: 700 }}>DEZE MAAND</div>
          {Object.entries(eventsByDate).filter(([key]) => key.startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)).sort().map(([key, events]) => (
            <div key={key} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#A87E1A', letterSpacing: '0.08em', marginBottom: '8px' }}>
                {new Date(key).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' }).toUpperCase()}
              </div>
              {events.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          ))}
          {Object.entries(eventsByDate).filter(([key]) => key.startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)).length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8B8378', fontSize: '13px', fontStyle: 'italic' }}>Geen events deze maand</div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }) {
  const catStyle = CATEGORY_STYLES[event.category] || { bg: '#444', text: '#FBF8F1', label: event.category.toUpperCase() };
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E2D5', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ background: catStyle.bg, color: catStyle.text, fontSize: '8px', letterSpacing: '0.1em', padding: '2px 6px', fontWeight: 700, borderRadius: '2px' }}>{catStyle.label}</span>
        <span style={{ background: event.dateType === 'release' ? '#3F5530' : '#6B2E2E', color: '#FBF8F1', fontSize: '8px', letterSpacing: '0.1em', padding: '2px 6px', fontWeight: 700, borderRadius: '2px' }}>{event.dateType === 'release' ? 'RELEASE' : 'RETIREMENT'}</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#A87E1A' }}>{'★'.repeat(event.priority)}</span>
      </div>
      <div className="serif" style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.25, marginBottom: '6px' }}>{event.name}</div>
      <div style={{ fontSize: '11.5px', color: '#6B6358', lineHeight: 1.5 }}>{event.action}</div>
    </div>
  );
}

// ============ PORTFOLIO TAB ============
function PortfolioTab({ data, updateQty, updateStatus, updateSalePrice, updatePurchasePrice, deleteItem, getImage, setTab }) {
  const [subTab, setSubTab] = useState('actief'); // 'actief' | 'verkocht'
  const [expanded, setExpanded] = useState({}); // { itemKey: true }
  const [showAllTime, setShowAllTime] = useState(false);

  const allItems = [];
  MARKETPLACE.forEach(opp => {
    if (opp.variants) {
      Object.entries(opp.variants).forEach(([vName, v]) => {
        const key = `${opp.id}__${vName}`;
        const d = data[key];
        if (d && d.qty > 0) allItems.push({ opp, variant: vName, v, d, key });
      });
    } else {
      const d = data[opp.id];
      if (d && d.qty > 0) allItems.push({ opp, variant: null, v: { retail: opp.retail, expected: opp.expected, gain: opp.gain }, d, key: opp.id });
    }
  });

  // Migrate legacy statuses on display
  const normalizeStatus = (s) => ['Open', 'Pre-ordered', 'Gekocht'].includes(s) ? 'Actief' : (s || 'Actief');
  allItems.forEach(it => { it.d = { ...it.d, status: normalizeStatus(it.d.status) }; });

  const actieveItems = allItems.filter(it => it.d.status !== 'Verkocht');
  const verkochteItems = allItems.filter(it => it.d.status === 'Verkocht');
  const items = subTab === 'actief' ? actieveItems : verkochteItems;

  // === STATS BEREKENING ===
  // Actief: huidige posities die nog niet verkocht zijn
  let ingekochteWaarde = 0;        // som van qty × aankoopprijs (actieve items)
  let verwachteWaarde = 0;         // som van qty × expected (actieve items)
  // Verkocht: geschiedenis
  let gerealiseerdeOmzet = 0;      // som van qty × verkoopprijs
  let kostenBasisVerkocht = 0;     // som van qty × aankoopprijs (verkochte items)
  let aantalVerkopen = 0;          // aantal verkocht-transacties met salePrice > 0

  allItems.forEach(({ v, d }) => {
    const pp = d.purchasePrice || v.retail;
    if (d.status === 'Verkocht') {
      if (d.salePrice > 0) {
        gerealiseerdeOmzet += d.qty * d.salePrice;
        kostenBasisVerkocht += d.qty * pp;
        aantalVerkopen += 1;
      }
    } else {
      ingekochteWaarde += d.qty * pp;
      verwachteWaarde += d.qty * v.expected;
    }
  });

  const verwachteWinst = verwachteWaarde - ingekochteWaarde;
  const verwachteWinstPct = ingekochteWaarde > 0 ? Math.round((verwachteWinst / ingekochteWaarde) * 100) : 0;
  const gerealiseerdeWinst = gerealiseerdeOmzet - kostenBasisVerkocht;
  const gerealiseerdeWinstPct = kostenBasisVerkocht > 0 ? Math.round((gerealiseerdeWinst / kostenBasisVerkocht) * 100) : 0;

  // ALL-TIME STATS (incl. verkochte items)
  const allTimeKosten = ingekochteWaarde + kostenBasisVerkocht;
  const allTimeWaarde = verwachteWaarde + gerealiseerdeOmzet;
  const allTimeTotaalWinst = (verwachteWaarde - ingekochteWaarde) + gerealiseerdeWinst;
  const aantalActief = actieveItems.length;
  const aantalSoldUnits = verkochteItems.reduce((s, it) => s + it.d.qty, 0);
  const aantalActiefUnits = actieveItems.reduce((s, it) => s + it.d.qty, 0);

  const toggleExpand = (key) => setExpanded({ ...expanded, [key]: !expanded[key] });

  return (
    <div>
      <div style={{ background: 'linear-gradient(180deg, #2A201A 0%, #1F1815 100%)', color: '#FBF8F1', padding: '28px 24px 28px', borderBottom: '1px solid rgba(168,126,26,0.4)' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#A87E1A', marginBottom: '6px', fontWeight: 500 }}>PORTFOLIO</div>
        <h1 className="serif" style={{ fontSize: '22px', fontWeight: 400, margin: '0 0 32px', letterSpacing: '-0.02em', color: '#E8DFCB' }}>Mijn portfolio</h1>

        {/* HERO: huidige portfolio waarde */}
        <div style={{ marginBottom: '20px' }}>
          <div className="serif" style={{ fontSize: '46px', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1, color: '#FBF8F1' }}>
            €{verwachteWaarde.toLocaleString('nl-NL')}
          </div>
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: '#A89D8C', marginTop: '8px', fontWeight: 500 }}>
            VERWACHTE WAARDE · {aantalActiefUnits} {aantalActiefUnits === 1 ? 'stuk' : 'stuks'}
          </div>
          {verwachteWinst !== 0 && (
            <div className="mono" style={{ fontSize: '13px', color: verwachteWinst > 0 ? '#C8A340' : '#D9837C', marginTop: '6px', fontWeight: 500 }}>
              {verwachteWinst > 0 ? '+' : ''}€{verwachteWinst.toLocaleString('nl-NL')} verwachte winst {ingekochteWaarde > 0 && <span style={{ color: '#8B8378' }}>· {verwachteWinst > 0 ? '+' : ''}{verwachteWinstPct}%</span>}
            </div>
          )}
        </div>

        {/* Subtle divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 0 18px' }} />

        {/* Inline secondary stats — typography only, no boxes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 28px', fontSize: '10px', letterSpacing: '0.12em' }}>
          <div>
            <div style={{ color: '#8B8378', fontWeight: 500, marginBottom: '4px' }}>INGEKOCHT</div>
            <div className="mono" style={{ fontSize: '13px', color: '#E8DFCB', fontWeight: 500, letterSpacing: '0' }}>€{ingekochteWaarde.toLocaleString('nl-NL')}</div>
          </div>
          {gerealiseerdeOmzet > 0 && (
            <>
              <div>
                <div style={{ color: '#8B8378', fontWeight: 500, marginBottom: '4px' }}>GEREALISEERD</div>
                <div className="mono" style={{ fontSize: '13px', color: '#E8DFCB', fontWeight: 500, letterSpacing: '0' }}>€{gerealiseerdeOmzet.toLocaleString('nl-NL')}</div>
              </div>
              <div>
                <div style={{ color: '#8B8378', fontWeight: 500, marginBottom: '4px' }}>WINST</div>
                <div className="mono" style={{ fontSize: '13px', color: gerealiseerdeWinst > 0 ? '#9CC177' : gerealiseerdeWinst < 0 ? '#D9837C' : '#E8DFCB', fontWeight: 500, letterSpacing: '0' }}>{gerealiseerdeWinst > 0 ? '+' : ''}€{gerealiseerdeWinst.toLocaleString('nl-NL')}</div>
              </div>
              <div>
                <div style={{ color: '#8B8378', fontWeight: 500, marginBottom: '4px' }}>GEM. ROI</div>
                <div className="mono" style={{ fontSize: '13px', color: gerealiseerdeWinstPct > 0 ? '#9CC177' : gerealiseerdeWinstPct < 0 ? '#D9837C' : '#E8DFCB', fontWeight: 500, letterSpacing: '0' }}>{gerealiseerdeWinstPct > 0 ? '+' : ''}{gerealiseerdeWinstPct}%</div>
              </div>
            </>
          )}
        </div>

        {/* All-time stats toggle */}
        {(aantalSoldUnits > 0 || aantalActiefUnits > 0) && (
          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => setShowAllTime(!showAllTime)} style={{ width: '100%', background: 'transparent', border: 'none', padding: '4px 0', color: '#A89D8C', fontSize: '10px', letterSpacing: '0.14em', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>ALL-TIME OVERZICHT {showAllTime ? '−' : '+'}</span>
              <span className="mono" style={{ fontSize: '11px', color: allTimeTotaalWinst > 0 ? '#A87E1A' : '#A89D8C', letterSpacing: '0' }}>{allTimeTotaalWinst > 0 ? '+' : ''}€{allTimeTotaalWinst.toLocaleString('nl-NL')}</span>
            </button>
            {showAllTime && (
              <div className="fade-in" style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '20px 28px', fontSize: '10px', letterSpacing: '0.12em' }}>
                <div>
                  <div style={{ color: '#8B8378', fontWeight: 500, marginBottom: '4px' }}>OOIT GEKOCHT</div>
                  <div className="mono" style={{ fontSize: '13px', color: '#E8DFCB', fontWeight: 500, letterSpacing: '0' }}>€{allTimeKosten.toLocaleString('nl-NL')}</div>
                  <div style={{ fontSize: '9px', color: '#6B6358', marginTop: '2px', letterSpacing: '0', textTransform: 'lowercase' }}>{aantalActiefUnits + aantalSoldUnits} stuks totaal</div>
                </div>
                <div>
                  <div style={{ color: '#8B8378', fontWeight: 500, marginBottom: '4px' }}>OOIT WAARDE</div>
                  <div className="mono" style={{ fontSize: '13px', color: '#E8DFCB', fontWeight: 500, letterSpacing: '0' }}>€{allTimeWaarde.toLocaleString('nl-NL')}</div>
                  <div style={{ fontSize: '9px', color: '#6B6358', marginTop: '2px', letterSpacing: '0', textTransform: 'lowercase' }}>verwacht + verkocht</div>
                </div>
                <div>
                  <div style={{ color: '#8B8378', fontWeight: 500, marginBottom: '4px' }}>ALL-TIME WINST</div>
                  <div className="mono" style={{ fontSize: '13px', color: allTimeTotaalWinst > 0 ? '#C8A340' : '#A89D8C', fontWeight: 500, letterSpacing: '0' }}>{allTimeTotaalWinst > 0 ? '+' : ''}€{allTimeTotaalWinst.toLocaleString('nl-NL')}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      {allItems.length > 0 && (
        <div style={{ display: 'flex', background: '#FBF8F1', borderBottom: '1px solid #E8E2D5', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setSubTab('actief')} style={{ flex: 1, padding: '14px 12px', background: 'transparent', border: 'none', borderBottom: `2px solid ${subTab === 'actief' ? '#1F1815' : 'transparent'}`, fontSize: '11px', letterSpacing: '0.12em', fontWeight: 700, color: subTab === 'actief' ? '#1F1815' : '#8B8378', cursor: 'pointer' }}>
            ACTIEF <span style={{ marginLeft: '4px', fontSize: '10px', color: subTab === 'actief' ? '#6B8A4F' : '#A89D8C' }}>({actieveItems.length})</span>
          </button>
          <button onClick={() => setSubTab('verkocht')} style={{ flex: 1, padding: '14px 12px', background: 'transparent', border: 'none', borderBottom: `2px solid ${subTab === 'verkocht' ? '#1F1815' : 'transparent'}`, fontSize: '11px', letterSpacing: '0.12em', fontWeight: 700, color: subTab === 'verkocht' ? '#1F1815' : '#8B8378', cursor: 'pointer' }}>
            VERKOCHT <span style={{ marginLeft: '4px', fontSize: '10px', color: subTab === 'verkocht' ? '#A04545' : '#A89D8C' }}>({verkochteItems.length})</span>
          </button>
        </div>
      )}

      {/* Items list */}
      {allItems.length === 0 ? (
        <div style={{ padding: '60px 30px', textAlign: 'center' }}>
          <ShoppingBag size={42} color="#C5BCAB" style={{ marginBottom: '16px' }} />
          <div className="serif" style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Nog geen items</div>
          <div style={{ fontSize: '13px', color: '#8B8378', lineHeight: 1.5, marginBottom: '20px' }}>Voeg producten toe vanuit de Marketplace</div>
          <button onClick={() => setTab('marketplace')} style={{ padding: '12px 24px', background: '#1F1815', color: '#FBF8F1', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer' }}>NAAR MARKETPLACE →</button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '40px 30px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#8B8378', lineHeight: 1.5 }}>
            {subTab === 'actief' ? 'Alle items zijn verkocht 🎉' : 'Nog geen items verkocht.'}
          </div>
        </div>
      ) : (
        <div>
          {items.map(({ opp, variant, v, d, key }) => (
            <PortfolioRow key={key} opp={opp} variant={variant} v={v} d={d} customImage={getImage(opp.id)}
              isExpanded={!!expanded[key]} onToggleExpand={() => toggleExpand(key)}
              onInc={() => updateQty(opp.id, variant, 1, v.retail)} onDec={() => updateQty(opp.id, variant, -1, v.retail)}
              onStat={() => updateStatus(opp.id, variant)} onSale={(p) => updateSalePrice(opp.id, variant, p)}
              onPurchase={(p) => updatePurchasePrice(opp.id, variant, p)}
              onDelete={() => deleteItem(opp.id, variant)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioRow({ opp, variant, v, d, customImage, isExpanded, onToggleExpand, onInc, onDec, onStat, onSale, onPurchase, onDelete }) {
  const catStyle = CATEGORY_STYLES[opp.category] || { bg: '#444', text: '#FBF8F1', label: opp.category.toUpperCase() };
  const pp = d.purchasePrice || v.retail;
  const sub = d.qty * pp;
  const subE = d.qty * v.expected;
  const vw = subE - sub;
  const rev = d.qty * (d.salePrice || 0);
  const gw = rev - sub;
  const isSold = d.status === 'Verkocht';
  const advisedDiff = pp - v.retail;
  const totaalWaarde = isSold && d.salePrice > 0 ? rev : subE;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const formatDate = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return null; }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
    }
  };

  return (
    <div style={{ borderBottom: '1px solid #E8E2D5', background: isSold ? '#FAF6EE' : '#FFFFFF' }}>
      {/* Compact row */}
      <div style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={onToggleExpand}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '48px', background: '#F4EFE4', borderRadius: '4px', flexShrink: 0, overflow: 'hidden' }}>
            {customImage ? (
              <img src={customImage} alt={opp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <ProductVisual category={opp.category} variant={variant} theme={opp.theme} productName={opp.id} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
              <span style={{ background: catStyle.bg, color: catStyle.text, fontSize: '7px', letterSpacing: '0.08em', padding: '1px 4px', fontWeight: 700, borderRadius: '2px' }}>{catStyle.label}</span>
              {variant && <span style={{ fontSize: '9px', color: '#8B8378' }}>· {variant}</span>}
            </div>
            <div className="serif" style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.25, color: isSold ? '#6B6358' : '#1F1815' }}>{opp.name}</div>
            <div className="mono" style={{ fontSize: '11px', color: '#8B8378', marginTop: '2px' }}>
              {d.qty}× €{isSold && d.salePrice > 0 ? d.salePrice : pp} = <span style={{ color: '#1F1815', fontWeight: 600 }}>€{totaalWaarde.toLocaleString('nl-NL')}</span>
            </div>
          </div>
          <div style={{ flexShrink: 0, color: '#8B8378', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <ChevronDown size={18} />
          </div>
        </div>

        {/* Direct controls: qty + verkocht toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '10px' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #D4CCB8', borderRadius: '6px', overflow: 'hidden' }}>
            <div onClick={onDec} style={{ width: '32px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #E8E2D5', cursor: 'pointer' }}><Minus size={12} strokeWidth={2.5} /></div>
            <div className="mono" style={{ width: '38px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>{d.qty}</div>
            <div onClick={onInc} style={{ width: '32px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #E8E2D5', cursor: 'pointer' }}><Plus size={12} strokeWidth={2.5} /></div>
          </div>
          <button onClick={onStat} style={{ background: isSold ? '#D9C9C0' : '#FFFFFF', color: isSold ? '#6B2E2E' : '#3F5530', border: `1px solid ${isSold ? '#A04545' : '#6B8A4F'}`, padding: '6px 11px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.06em', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '5px', height: '5px', background: isSold ? '#A04545' : '#6B8A4F', borderRadius: '50%' }} />
            {isSold ? 'VERKOCHT' : 'MARKEER VERKOCHT'}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="fade-in" style={{ padding: '0 16px 16px', background: '#F8F4EB', borderTop: '1px solid #E8E2D5' }}>
          <div style={{ paddingTop: '14px' }}>
            {/* Dates row */}
            {(d.addedDate || d.soldDate) && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '10px', color: '#8B8378' }}>
                {d.addedDate && (
                  <div>
                    <span style={{ letterSpacing: '0.1em', fontWeight: 700 }}>TOEGEVOEGD:</span>{' '}
                    <span className="mono">{formatDate(d.addedDate)}</span>
                  </div>
                )}
                {d.soldDate && (
                  <div>
                    <span style={{ letterSpacing: '0.1em', fontWeight: 700, color: '#6B2E2E' }}>VERKOCHT:</span>{' '}
                    <span className="mono">{formatDate(d.soldDate)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Purchase price input */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E8E2D5', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.14em', color: '#8B8378', fontWeight: 700 }}>JOUW AANKOOPPRIJS P/S</div>
                <div className="mono" style={{ fontSize: '10px', color: '#A89D8C' }}>advies €{v.retail}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="mono" style={{ fontSize: '14px', color: '#6B6358', fontWeight: 600 }}>€</div>
                <input type="number" inputMode="decimal" value={d.purchasePrice || ''} onChange={(e) => onPurchase(parseFloat(e.target.value) || 0)} placeholder={String(v.retail)} style={{ flex: 1, padding: '6px 10px', border: '1px solid #D4CCB8', borderRadius: '4px', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, background: '#FBF8F1', outline: 'none' }} />
                {advisedDiff !== 0 && pp > 0 && (
                  <span className="mono" style={{ fontSize: '10px', color: advisedDiff < 0 ? '#3F5530' : '#A04545', fontWeight: 700 }}>
                    {advisedDiff < 0 ? '−' : '+'}€{Math.abs(advisedDiff)}
                  </span>
                )}
              </div>
            </div>

            {/* Stats grid: kosten + verwachte winst (always shown), and revenue/profit if verkocht */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Cell label="INGEKOCHT" value={`€${sub.toLocaleString('nl-NL')}`} sub={`${d.qty}× €${pp}`} />
              <Cell label="VERWACHTE WINST" value={`${vw >= 0 ? '+' : ''}€${vw.toLocaleString('nl-NL')}`} sub={`verkoop ~€${v.expected}`} color={vw >= 0 ? '#3F5530' : '#A04545'} />
            </div>

            {isSold && (
              <div style={{ marginTop: '10px', background: '#FBF8F1', border: '1px solid #D9C9C0', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.14em', color: '#6B2E2E', marginBottom: '8px', fontWeight: 700 }}>VERKOOPPRIJS PER STUK</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div className="mono" style={{ fontSize: '14px', color: '#6B6358', fontWeight: 600 }}>€</div>
                  <input type="number" inputMode="decimal" value={d.salePrice || ''} onChange={(e) => onSale(parseFloat(e.target.value) || 0)} placeholder="0" style={{ flex: 1, padding: '7px 10px', border: '1px solid #D4CCB8', borderRadius: '4px', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, background: '#FFFFFF', outline: 'none' }} />
                </div>
                {d.salePrice > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <Cell label="OPBRENGST" value={`€${rev.toLocaleString('nl-NL')}`} sub={`${d.qty}× €${d.salePrice}`} />
                    <Cell label="WINST" value={`${gw >= 0 ? '+' : ''}€${gw.toLocaleString('nl-NL')}`} sub={`${gw >= 0 ? '+' : ''}${sub > 0 ? Math.round((gw / sub) * 100) : 0}% ROI`} color={gw >= 0 ? '#3F5530' : '#A04545'} />
                  </div>
                )}
              </div>
            )}

            {/* Delete button for sold items only */}
            {isSold && (
              <button onClick={handleDelete} style={{ marginTop: '10px', width: '100%', background: confirmDelete ? '#A04545' : 'transparent', color: confirmDelete ? '#FBF8F1' : '#A04545', border: `1px solid ${confirmDelete ? '#A04545' : 'rgba(160,69,69,0.3)'}`, padding: '9px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.08em', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Trash2 size={12} />
                {confirmDelete ? 'TAP NOGMAALS OM TE BEVESTIGEN' : 'VERWIJDER UIT GESCHIEDENIS'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, sub, color }) {
  return (
    <div style={{ background: '#FBF8F1', border: '1px solid #E8E2D5', borderRadius: '4px', padding: '8px 10px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.12em', color: '#8B8378', marginBottom: '3px', fontWeight: 700 }}>{label}</div>
      <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: color || '#1F1815' }}>{value}</div>
      {sub && <div style={{ fontSize: '9.5px', color: '#A89D8C', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

// ============ ACCOUNT TAB ============
function AccountTab({ data, setData }) {
  const [showTips, setShowTips] = useState(false);
  const [activeTip, setActiveTip] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const handleReset = () => {
    if (confirmReset) { setData({}); setConfirmReset(false); } else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 5000); }
  };

  const handleExport = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const exportData = {
      version: 1,
      exportDate: now.toISOString(),
      data: data
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flip-dashboard-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = (e) => {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        // Validate structure
        if (!parsed || typeof parsed !== 'object') throw new Error('Ongeldig bestand');
        // Accept both new format ({version, data}) and legacy format (just data object)
        const payload = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
        // Sanity check: should be an object with string keys
        if (typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Verwacht een object met portfolio items');
        const itemCount = Object.keys(payload).filter(k => !k.startsWith('__img_')).length;
        setData(payload);
        setImportSuccess(`${itemCount} items succesvol geïmporteerd`);
        setTimeout(() => setImportSuccess(null), 5000);
      } catch (err) {
        setImportError(`Importeren mislukt: ${err.message}`);
        setTimeout(() => setImportError(null), 6000);
      }
    };
    reader.onerror = () => {
      setImportError('Bestand kon niet gelezen worden');
      setTimeout(() => setImportError(null), 6000);
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Calculate storage usage
  const calcStorageUsage = () => {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          total += (localStorage[key]?.length || 0) + key.length;
        }
      }
      return total;
    } catch (e) {
      // window.storage in chat preview — estimate from data
      return JSON.stringify(data).length;
    }
  };
  const storageBytes = calcStorageUsage();
  const storageMB = (storageBytes / 1024 / 1024).toFixed(2);
  const storagePct = Math.min(100, (storageBytes / (5 * 1024 * 1024)) * 100);
  const storageWarning = storagePct > 80;
  const itemCount = Object.keys(data).filter(k => !k.startsWith('__img_')).length;
  const imageCount = Object.keys(data).filter(k => k.startsWith('__img_')).length;

  if (showTips) {
    return (
      <div>
        <div style={{ background: 'linear-gradient(180deg, #2A201A 0%, #1F1815 100%)', color: '#FBF8F1', padding: '28px 20px 20px', borderBottom: '1px solid #A87E1A' }}>
          <button onClick={() => setShowTips(false)} style={{ background: 'transparent', border: 'none', color: '#FBF8F1', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>← Terug</button>
          <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#A87E1A', marginBottom: '6px', fontWeight: 500 }}>STRATEGIE & TIPS</div>
          <h1 className="serif" style={{ fontSize: '26px', fontWeight: 400, margin: 0, letterSpacing: '-0.02em' }}>Adviezen</h1>
        </div>
        <div style={{ padding: '14px 20px 0', background: '#FBF8F1', borderBottom: '1px solid #E8E2D5' }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '12px' }}>
            {TIPS.map((tip, i) => (
              <button key={i} onClick={() => setActiveTip(i)} style={{ padding: '7px 11px', background: activeTip === i ? '#1F1815' : 'transparent', color: activeTip === i ? '#FBF8F1' : '#6B6358', border: `1px solid ${activeTip === i ? '#1F1815' : '#D4CCB8'}`, borderRadius: '14px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}>
                {TIPS[i].title.split(' — ')[0]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <div className="serif" style={{ fontSize: '17px', fontWeight: 600, marginBottom: '14px', lineHeight: 1.25 }}>{TIPS[activeTip].title}</div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {TIPS[activeTip].items.map((item, j) => (
              <li key={j} style={{ fontSize: '13.5px', lineHeight: 1.55, color: '#2A201A', paddingLeft: '16px', position: 'relative', marginBottom: '12px' }}>
                <span style={{ position: 'absolute', left: 0, top: '9px', width: '8px', height: '1px', background: '#A87E1A' }} />{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(180deg, #2A201A 0%, #1F1815 100%)', color: '#FBF8F1', padding: '28px 20px 22px', borderBottom: '1px solid #A87E1A' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#A87E1A', marginBottom: '6px', fontWeight: 500 }}>ACCOUNT</div>
        <h1 className="serif" style={{ fontSize: '30px', fontWeight: 400, margin: 0, letterSpacing: '-0.02em' }}>Instellingen</h1>
      </div>

      {/* iOS PWA storage warning */}
      <div style={{ margin: '16px 20px 0', background: '#F5E6C4', border: '1px solid #A87E1A', borderRadius: '8px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</div>
        <div style={{ flex: 1, fontSize: '11.5px', lineHeight: 1.5, color: '#5C4A1F' }}>
          <div style={{ fontWeight: 700, marginBottom: '3px' }}>Belangrijk: iOS wist PWA-data na 7 dagen</div>
          <div>Als je de app langer dan 7 dagen niet opent, verwijdert iOS automatisch je portfolio. <strong>Maak elke 1-2 weken een backup</strong> via "Exporteer data" en sla op in iCloud Drive of e-mail.</div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '12px', fontWeight: 700 }}>STRATEGIE</div>
        <SetBtn icon={<Lightbulb size={16} color="#A87E1A" />} title="Strategie & Tips" sub="Alle adviezen, inkopen, verkopen, timing" onClick={() => setShowTips(true)} />
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '12px', fontWeight: 700 }}>DATA</div>

        {/* Export */}
        <SetBtn
          icon={<Download size={16} color="#3F5530" />}
          title="Exporteer data"
          sub={`Backup van ${itemCount} items + ${imageCount} foto's als JSON`}
          onClick={handleExport}
        />

        {/* Import */}
        <SetBtn
          icon={<Upload size={16} color="#1F4A73" />}
          title="Importeer data"
          sub="Herstel uit JSON backup-bestand"
          onClick={handleImportClick}
        />
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: 'none' }} />

        {importSuccess && (
          <div className="fade-in" style={{ background: '#D4DCC8', border: '1px solid #6B8A4F', borderRadius: '6px', padding: '10px 12px', marginTop: '8px', fontSize: '12px', color: '#3F5530', fontWeight: 600 }}>
            ✓ {importSuccess}
          </div>
        )}
        {importError && (
          <div className="fade-in" style={{ background: '#E8C9C0', border: '1px solid #A04545', borderRadius: '6px', padding: '10px 12px', marginTop: '8px', fontSize: '12px', color: '#6B2E2E', fontWeight: 600 }}>
            ✗ {importError}
          </div>
        )}

        {/* Reset */}
        <SetBtn icon={<Trash2 size={16} color={confirmReset ? "#FBF8F1" : "#A04545"} />} title={confirmReset ? "Tap nogmaals om te bevestigen" : "Wis alle data"} sub={confirmReset ? "Dit kan niet ongedaan worden gemaakt" : "Reset portfolio compleet"} onClick={handleReset} danger={confirmReset} />

        {/* Storage usage */}
        <div style={{ marginTop: '14px', background: '#FFFFFF', border: `1px solid ${storageWarning ? '#A04545' : '#E8E2D5'}`, borderRadius: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', color: storageWarning ? '#A04545' : '#8B8378', fontWeight: 700 }}>OPSLAGGEBRUIK</div>
            <div className="mono" style={{ fontSize: '11px', fontWeight: 600, color: storageWarning ? '#A04545' : '#1F1815' }}>{storageMB} MB / 5 MB</div>
          </div>
          <div style={{ height: '5px', background: '#F4EFE4', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${storagePct}%`, background: storageWarning ? '#A04545' : storagePct > 50 ? '#A87E1A' : '#6B8A4F', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: '10px', color: '#8B8378', marginTop: '6px' }}>
            {itemCount} items · {imageCount} foto's
            {storageWarning && <span style={{ color: '#A04545', fontWeight: 600 }}> · Bijna vol — verwijder oude foto's of items</span>}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#8B8378', marginBottom: '12px', fontWeight: 700 }}>OVER</div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2D5', borderRadius: '8px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Info size={14} color="#6B6358" />
            <div className="serif" style={{ fontSize: '14px', fontWeight: 600 }}>Flip Dashboard v2.3</div>
          </div>
          <div style={{ fontSize: '12px', color: '#6B6358', lineHeight: 1.5 }}>Persoonlijke flip portfolio tracker voor Pokemon, LEGO, sportskaarten en andere collectibles. Data lokaal opgeslagen.</div>
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #E8E2D5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3F5530', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', color: '#6B6358' }}>
                <span style={{ fontWeight: 600 }}>Marketplace data:</span> laatst geüpdatet {LAST_DATA_UPDATE}
              </div>
            </div>
            {(() => {
              const counts = MARKETPLACE.reduce((acc, i) => { const c = i.confidence || 'estimate'; acc[c] = (acc[c]||0)+1; return acc; }, {});
              return (
                <div style={{ display: 'flex', gap: '6px', fontSize: '10px', flexWrap: 'wrap' }}>
                  <div style={{ background: '#D4DCC8', color: '#3F5530', padding: '3px 7px', borderRadius: '3px', fontWeight: 600 }}>🟢 {counts.verified||0} geverifieerd</div>
                  <div style={{ background: '#F5E6C4', color: '#7A5C2E', padding: '3px 7px', borderRadius: '3px', fontWeight: 600 }}>🟡 {counts.estimate||0} schatting</div>
                  <div style={{ background: '#E8C9C0', color: '#6B2E2E', padding: '3px 7px', borderRadius: '3px', fontWeight: 600 }}>🔴 {counts.speculative||0} speculatief</div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function SetBtn({ icon, title, sub, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ width: '100%', background: danger ? '#A04545' : '#FFFFFF', border: `1px solid ${danger ? '#A04545' : '#E8E2D5'}`, borderRadius: '8px', padding: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left' }}>
      {icon}
      <div style={{ flex: 1 }}>
        <div className="serif" style={{ fontSize: '14px', fontWeight: 600, color: danger ? '#FBF8F1' : '#1F1815', marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: danger ? 'rgba(255,255,255,0.8)' : '#8B8378' }}>{sub}</div>
      </div>
    </button>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { loadMarketplaceData().then(() => setLoaded(true)); }, []);
  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBF8F1', color: '#1F1815', fontFamily: 'serif', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '22px', fontWeight: 400 }}>Flip Dashboard</div>
        <div style={{ fontSize: '12px', color: '#8B8378', letterSpacing: '0.12em' }}>DATA LADEN…</div>
      </div>
    );
  }
  return <AppInner />;
}
