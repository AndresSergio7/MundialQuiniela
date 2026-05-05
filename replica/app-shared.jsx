// Shared tokens, icons, decorations, mock data, toast/sheet primitives
const P = {
  // Premium dark green + gold palette (Sleeper / DraftKings inspired)
  bg:        '#0a1410',
  surface:   '#0f1d18',
  surfaceLt: '#142922',
  card:      '#ffffff',
  cardSoft:  '#f6f8f5',
  green:     '#0d3d2e',     // deep pitch green
  greenMid:  '#1a6b4c',
  greenBright:'#2dbe7e',    // success / live
  gold:      '#d4a017',     // accent
  goldLight: '#f0c043',
  red:       '#dc2626',
  text:      '#0a1410',
  textMid:   '#4a5a52',
  textLight: '#8a9a92',
  border:    '#e3e8e4',
  borderDark:'rgba(255,255,255,0.08)',
};

// ── ICONS (stroke / currentColor) ─────────────────────────
const Ic = {
  Home:   ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Ball:   ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2c-2 4-2 16 0 20M12 2c2 4 2 16 0 20M2 12h20"/></svg>,
  Live:   ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M16.24 7.76a6 6 0 010 8.49M7.76 7.76a6 6 0 000 8.49"/></svg>,
  Table:  ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16M9 22v-3M15 22v-3M12 17c-4.4 0-8-4-8-9V4h16v4c0 5-3.6 9-8 9z"/></svg>,
  Users:  ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  ChevR:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>,
  ChevD:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevL:  ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>,
  Plus:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X:      ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:  ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  CheckCircle: ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Share:  ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>,
  Copy:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  WApp:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1c-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.9-.4-1.7-.9-2.5-1.7-.6-.6-1.2-1.4-1.7-2.2-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.1-.3.2-.5 0-.2 0-.4-.1-.5l-.9-2.2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.4-1 .9-1.4 2-1.4 3.2.1 1.4.7 2.7 1.5 3.8 1.7 2.4 3.8 4.4 6.4 5.6.7.4 1.3.6 2 .8.7.2 1.4.2 2.1.1.8-.1 2.4-1 2.7-2 .3-1 .3-1.8.2-2-.1-.2-.3-.3-.6-.4zM12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.7.9 3.7 1.4 5.7 1.4h.1c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5C18.2 1.2 15.2 0 12 0zm0 22c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.5 15.7 2 13.9 2 12c0-5.5 4.5-10 10-10 2.7 0 5.2 1 7.1 2.9 1.9 1.9 2.9 4.4 2.9 7.1 0 5.5-4.5 10-10 10z"/></svg>,
  Save:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>,
  Trophy: ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16M9 22v-3M15 22v-3M12 17c-4.4 0-8-4-8-9V4h16v4c0 5-3.6 9-8 9z"/></svg>,
  Fire:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>,
  Crown:  ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 3v-1h14v1c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1z"/></svg>,
  Clock:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Trash:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  Bell:   ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  Settings:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Whistle:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="14" r="6"/><path d="M14 10l8-4-2 6h-5"/></svg>,
  Card:   ({color="#fbbf24"})=><svg width="12" height="14" viewBox="0 0 12 14" fill={color}><rect width="12" height="14" rx="1.5"/></svg>,
  Sub:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  Star:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Sparkle:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.5 8 8 2.5-8 2.5L12 21l-2.5-8-8-2.5 8-2.5z"/></svg>,
  Lock:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  Target: ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>,
};

// ── COUNTRY EMOJI / FLAG (text glyphs - safe & legal) ─────
const FLAGS = {
  'México':'🇲🇽','Canadá':'🇨🇦','EEUU':'🇺🇸','Argentina':'🇦🇷','Brasil':'🇧🇷','España':'🇪🇸',
  'Francia':'🇫🇷','Alemania':'🇩🇪','Italia':'🇮🇹','Portugal':'🇵🇹','Uruguay':'🇺🇾','Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Países Bajos':'🇳🇱','Bélgica':'🇧🇪','Croacia':'🇭🇷','Japón':'🇯🇵','Corea del Sur':'🇰🇷','Marruecos':'🇲🇦',
  'Senegal':'🇸🇳','Australia':'🇦🇺','Suiza':'🇨🇭','Polonia':'🇵🇱','Dinamarca':'🇩🇰','Ecuador':'🇪🇨',
};

// ── PITCH MARKS BG ────────────────────────────────────────
function PitchMarks({ opacity=0.05 }) {
  return (
    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 390 200" preserveAspectRatio="xMidYMid slice">
      <circle cx="195" cy="220" r="80" fill="none" stroke={`rgba(255,255,255,${opacity*1.5})`} strokeWidth="1.2"/>
      <line x1="195" y1="140" x2="195" y2="220" stroke={`rgba(255,255,255,${opacity*1.5})`} strokeWidth="1.2"/>
      <rect x="125" y="180" width="140" height="40" rx="2" fill="none" stroke={`rgba(255,255,255,${opacity})`} strokeWidth="1"/>
      <circle cx="195" cy="195" r="2" fill={`rgba(255,255,255,${opacity*2})`}/>
    </svg>
  );
}

// ── TOAST CONTEXT ─────────────────────────────────────────
const ToastCtx = React.createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((msg, type='info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{position:'absolute',top:88,left:14,right:14,zIndex:999,display:'flex',flexDirection:'column',gap:6,pointerEvents:'none'}}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type==='success'?P.greenBright : t.type==='error'?P.red : P.text,
            color:'#fff', borderRadius:12, padding:'10px 14px',
            display:'flex', alignItems:'center', gap:10,
            boxShadow:'0 8px 24px rgba(0,0,0,0.35)',
            animation:'toastIn 0.25s ease',
            fontSize:13, fontWeight:600,
          }}>
            <div style={{width:22,height:22,borderRadius:6,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {t.type==='success' ? <Ic.Check /> : t.type==='error' ? <Ic.X /> : <Ic.Sparkle />}
            </div>
            <span style={{flex:1}}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast() { return React.useContext(ToastCtx); }

// ── BOTTOM SHEET ──────────────────────────────────────────
function Sheet({ open, onClose, title, children, height='auto' }) {
  if (!open) return null;
  return (
    <div style={{position:'absolute',inset:0,zIndex:900}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',animation:'fadeIn 0.2s'}}/>
      <div style={{
        position:'absolute',bottom:0,left:0,right:0,
        background:'#fff',borderRadius:'24px 24px 0 0',
        paddingBottom:24, maxHeight:'85%', display:'flex', flexDirection:'column',
        animation:'slideUp 0.3s ease',
        boxShadow:'0 -10px 40px rgba(0,0,0,0.25)',
      }}>
        <div style={{display:'flex',justifyContent:'center',padding:'8px 0 0'}}>
          <div style={{width:36,height:4,borderRadius:2,background:P.border}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px 12px'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:20,color:P.text,letterSpacing:0.3}}>{title}</div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:'50%',background:P.cardSoft,border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:P.textMid,cursor:'pointer'}}>
            <Ic.X />
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'0 18px'}}>{children}</div>
      </div>
    </div>
  );
}

// ── MOCK DATA ─────────────────────────────────────────────
const MOCK_GROUPS = [
  { id:'A', teams:['México','Canadá','Marruecos','Australia'] },
  { id:'B', teams:['EEUU','Argentina','Senegal','Suiza'] },
  { id:'C', teams:['Brasil','España','Polonia','Dinamarca'] },
  { id:'D', teams:['Francia','Alemania','Croacia','Ecuador'] },
  { id:'E', teams:['Italia','Portugal','Bélgica','Japón'] },
  { id:'F', teams:['Uruguay','Inglaterra','Países Bajos','Corea del Sur'] },
];
function buildMatches(group) {
  const t = group.teams;
  return [
    [t[0],t[1]],[t[2],t[3]],
    [t[0],t[2]],[t[1],t[3]],
    [t[0],t[3]],[t[1],t[2]],
  ];
}
const MOCK_LIVE = [
  { id:'l1', home:'México', away:'Canadá', hs:2, as:1, minute:67, status:'2T', events:[
    { min:12, type:'goal', team:'h', player:'R. Jiménez' },
    { min:34, type:'yellow', team:'a', player:'A. Davies' },
    { min:55, type:'goal', team:'a', player:'J. David' },
    { min:62, type:'goal', team:'h', player:'H. Lozano' },
  ]},
  { id:'l2', home:'EEUU', away:'Argentina', hs:0, as:0, minute:23, status:'1T', events:[
    { min:8, type:'yellow', team:'h', player:'T. Adams' },
  ]},
  { id:'l3', home:'Brasil', away:'España', hs:1, as:1, minute:45, status:'HT', events:[
    { min:15, type:'goal', team:'h', player:'Vinícius Jr.' },
    { min:41, type:'goal', team:'a', player:'Pedri' },
  ]},
];
const MOCK_LEADERBOARD = [
  { rank:1, name:'Carlos M.',   pts:124, exact:7, acc:78, isMe:false, avatar:'🇲🇽' },
  { rank:2, name:'Tú',           pts:121, exact:6, acc:75, isMe:true,  avatar:'⚡' },
  { rank:3, name:'Sofía R.',     pts:115, exact:5, acc:71, isMe:false, avatar:'🌟' },
  { rank:4, name:'Pablo G.',     pts:108, exact:5, acc:68, isMe:false, avatar:'🔥' },
  { rank:5, name:'Marina L.',    pts: 96, exact:4, acc:62, isMe:false, avatar:'🎯' },
  { rank:6, name:'Diego F.',     pts: 89, exact:3, acc:58, isMe:false, avatar:'⚽' },
  { rank:7, name:'Ana T.',       pts: 81, exact:3, acc:54, isMe:false, avatar:'🌈' },
  { rank:8, name:'Luis R.',      pts: 72, exact:2, acc:48, isMe:false, avatar:'🦅' },
];

// ── QUINIELA SELECTOR DROPDOWN ───────────────────────────
function QuinielaSelector({ quinielas, activeId, onChange, onAddNew }) {
  const [open, setOpen] = React.useState(false);
  const active = quinielas.find(q => q.id === activeId) || quinielas[0];
  return (
    <div style={{position:'relative'}}>
      <button onClick={() => setOpen(o => !o)} style={{
        display:'flex',alignItems:'center',gap:7,
        background:'rgba(255,255,255,0.08)',
        border:'1px solid rgba(255,255,255,0.12)',
        borderRadius:10,padding:'5px 10px 5px 11px',
        color:'#fff',cursor:'pointer',
      }}>
        <div style={{width:6,height:6,borderRadius:'50%',background:active.color || P.gold}}/>
        <span style={{fontSize:12,fontWeight:700,letterSpacing:0.2,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{active.name}</span>
        <span style={{opacity:0.6,display:'flex'}}><Ic.ChevD /></span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{position:'fixed',inset:0,zIndex:50}}/>
          <div style={{
            position:'absolute',top:'calc(100% + 6px)',left:0,
            background:'#fff',borderRadius:12,
            boxShadow:'0 12px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
            zIndex:51,minWidth:230,overflow:'hidden',
          }}>
            <div style={{padding:'8px 12px 4px',fontSize:9,fontWeight:800,color:P.textLight,letterSpacing:1.2,textTransform:'uppercase'}}>Mis quinielas</div>
            {quinielas.map(q => {
              const isActive = q.id === activeId;
              const filled = q.predictions ? Object.values(q.predictions).filter(p => p.h !== '' && p.a !== '').length : 0;
              return (
                <button key={q.id} onClick={() => { onChange(q.id); setOpen(false); }} style={{
                  display:'flex',alignItems:'center',gap:10,width:'100%',
                  padding:'9px 12px',background: isActive ? P.cardSoft : '#fff',
                  border:'none',cursor:'pointer',textAlign:'left',
                }}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:q.color || P.gold,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:P.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{q.name}</div>
                    <div style={{fontSize:10,color:P.textLight,fontWeight:600}}>{q.members}/{q.maxMembers} · {filled}/72 predicciones</div>
                  </div>
                  {isActive && <span style={{color:P.green,display:'flex'}}><Ic.Check /></span>}
                </button>
              );
            })}
            <div style={{borderTop:`1px solid ${P.border}`}}/>
            <button onClick={() => { onAddNew(); setOpen(false); }} style={{
              display:'flex',alignItems:'center',gap:8,width:'100%',
              padding:'10px 12px',background:'#fff',border:'none',cursor:'pointer',
              color:P.green,fontSize:12,fontWeight:700,
            }}>
              <span style={{display:'flex'}}><Ic.Plus /></span> Comprar nueva quiniela
            </button>
          </div>
        </>
      )}
    </div>
  );
}

Object.assign(window, {
  P, Ic, FLAGS, PitchMarks, ToastProvider, useToast, Sheet,
  MOCK_GROUPS, buildMatches, MOCK_LIVE, MOCK_LEADERBOARD,
  QuinielaSelector,
});
