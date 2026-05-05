// All screens: Onboarding, Home, Quiniela, Live, Leaderboard, Invite, Pricing
const { useState, useEffect, useMemo, useRef } = React;

// ─── ONBOARDING ───────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const slides = [
    {
      eyebrow:'Mundial 2026',
      title:'Predice. Compite. Gana.',
      desc:'Crea tu liga privada con amigos y predice los 72 partidos del Mundial.',
      icon: '⚽',
      color: P.green,
    },
    {
      eyebrow:'Compite con tu equipo',
      title:'Liga privada en 30 segundos',
      desc:'Invita por link a 10, 25 o 50 amigos. Oficina, familia, o tu grupo del fin.',
      icon: '🏆',
      color: P.greenMid,
    },
    {
      eyebrow:'Cada predicción cuenta',
      title:'Sube en la tabla en tiempo real',
      desc:'Puntos por marcador exacto, ganador, y rachas. Sin trampas, sin enredos.',
      icon: '🔥',
      color: P.gold,
    },
  ];
  const s = slides[step];
  return (
    <div style={{flex:1,background:`linear-gradient(180deg, ${P.bg} 0%, ${P.surface} 100%)`,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
      <PitchMarks opacity={0.08} />
      {/* Glow */}
      <div style={{position:'absolute',top:'30%',left:'50%',transform:'translateX(-50%)',width:300,height:300,borderRadius:'50%',background:`radial-gradient(circle, ${s.color}55 0%, transparent 70%)`,pointerEvents:'none',transition:'all 0.4s'}}/>

      {/* Skip */}
      <div style={{padding:'16px 20px',display:'flex',justifyContent:'flex-end',position:'relative',zIndex:2}}>
        {step < 2 && <button onClick={onDone} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Saltar</button>}
      </div>

      {/* Content */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 32px',textAlign:'center',position:'relative',zIndex:1}}>
        <div style={{fontSize:96,marginBottom:24,filter:'drop-shadow(0 8px 24px rgba(0,0,0,0.4))'}}>{s.icon}</div>
        <div style={{fontSize:11,fontWeight:700,color:P.gold,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>{s.eyebrow}</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:34,color:'#fff',lineHeight:1.05,marginBottom:14,letterSpacing:-0.3}}>{s.title}</div>
        <div style={{fontSize:15,color:'rgba(255,255,255,0.65)',lineHeight:1.5,maxWidth:280}}>{s.desc}</div>
      </div>

      {/* Dots */}
      <div style={{display:'flex',justifyContent:'center',gap:7,padding:'0 0 24px',position:'relative',zIndex:1}}>
        {slides.map((_,i) => (
          <div key={i} style={{
            width: i===step ? 24 : 7, height:7, borderRadius:4,
            background: i===step ? P.gold : 'rgba(255,255,255,0.2)',
            transition:'all 0.3s',
          }}/>
        ))}
      </div>

      {/* CTA */}
      <div style={{padding:'0 24px 32px',position:'relative',zIndex:2}}>
        {step < 2 ? (
          <button onClick={() => setStep(s => s+1)} style={{
            width:'100%',padding:'15px',borderRadius:14,border:'none',
            background:P.gold,color:P.text,
            fontSize:15,fontWeight:800,letterSpacing:0.3,cursor:'pointer',
            boxShadow:`0 8px 24px ${P.gold}55`,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
          }}>
            Continuar <Ic.ChevR />
          </button>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <button onClick={onDone} style={{
              width:'100%',padding:'15px',borderRadius:14,border:'none',
              background:P.gold,color:P.text,
              fontSize:15,fontWeight:800,letterSpacing:0.3,cursor:'pointer',
              boxShadow:`0 8px 24px ${P.gold}55`,
            }}>Crear mi liga</button>
            <button onClick={onDone} style={{
              width:'100%',padding:'14px',borderRadius:14,
              background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',
              color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',
            }}>Unirme con un código</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────
function HomeScreen({ activeQ, quinielas, setActiveQ, onGoTo, onOpenLeague, onAddNew }) {
  const predictions = activeQ.predictions;
  const totalMatches = MOCK_GROUPS.length * 6;
  const filled = Object.keys(predictions).filter(k => predictions[k]?.h !== '' && predictions[k]?.a !== '').length;
  const pct = Math.round((filled / totalMatches) * 100);
  const remaining = totalMatches - filled;

  const me = MOCK_LEADERBOARD.find(x => x.isMe);
  const ahead = MOCK_LEADERBOARD[me.rank - 2];
  const behind = MOCK_LEADERBOARD[me.rank];

  return (
    <div style={{flex:1,overflowY:'auto',background:P.cardSoft}}>
      {/* Header strip */}
      <div style={{background:`linear-gradient(165deg, ${P.green} 0%, ${P.surface} 100%)`,padding:'14px 18px 78px',position:'relative',overflow:'hidden'}}>
        <PitchMarks opacity={0.06} />
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',fontWeight:500,marginBottom:2}}>Hola,</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:22,color:'#fff',lineHeight:1}}>Antonio</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={{width:36,height:36,borderRadius:11,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.12)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative'}}>
              <Ic.Bell />
              <div style={{position:'absolute',top:8,right:8,width:7,height:7,borderRadius:'50%',background:P.gold,border:'1.5px solid #1a3528'}}/>
            </button>
            <div style={{width:36,height:36,borderRadius:11,background:P.gold,display:'flex',alignItems:'center',justifyContent:'center',color:P.text,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:15}}>A</div>
          </div>
        </div>
        {/* Quiniela selector */}
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',gap:8}}>
          <QuinielaSelector quinielas={quinielas} activeId={activeQ.id} onChange={setActiveQ} onAddNew={onAddNew}/>
          <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(0,0,0,0.25)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'5px 10px'}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:P.gold,boxShadow:`0 0 8px ${P.gold}`,animation:'pulse 2s infinite'}}/>
            <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:1,textTransform:'uppercase'}}>42 días</span>
          </div>
        </div>
      </div>

      {/* Floating progress card */}
      <div style={{padding:'0 14px',marginTop:-62,position:'relative',zIndex:2}}>
        <div onClick={onOpenLeague} style={{background:'#fff',borderRadius:18,padding:'16px 16px 14px',boxShadow:'0 8px 28px rgba(13,61,46,0.12)',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:38,height:38,borderRadius:11,background:P.green,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{color:'#fff'}}><Ic.Trophy /></span>
              </div>
              <div>
                <div style={{fontSize:10,color:P.textLight,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>Liga activa</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:17,color:P.text,lineHeight:1.1}}>{activeQ.name}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4,background:P.cardSoft,borderRadius:8,padding:'4px 8px'}}>
              <Ic.Users />
              <span style={{fontSize:11,fontWeight:700,color:P.textMid}}>{activeQ.members}/{activeQ.maxMembers}</span>
            </div>
          </div>

          {/* Progress */}
          <div style={{marginBottom:6}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:600,color:P.textMid}}>Tus predicciones</span>
              <span style={{fontSize:12,fontWeight:800,color:P.green}}>{filled}/{totalMatches}</span>
            </div>
            <div style={{height:8,background:P.cardSoft,borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg, ${P.greenBright}, ${P.gold})`,borderRadius:4,transition:'width 0.3s'}}/>
            </div>
          </div>

          {remaining > 0 && (
            <div style={{display:'flex',alignItems:'center',gap:5,marginTop:10,padding:'6px 10px',background:`${P.gold}15`,borderRadius:8}}>
              <span style={{color:P.gold}}><Ic.Fire /></span>
              <span style={{fontSize:11,fontWeight:700,color:'#a07b00'}}>Te faltan {remaining} partidos</span>
            </div>
          )}
        </div>
      </div>

      {/* Position card */}
      <div style={{padding:'12px 14px 0'}}>
        <div onClick={() => onGoTo('table')} style={{background:`linear-gradient(135deg, ${P.green} 0%, ${P.greenMid} 100%)`,borderRadius:18,padding:'14px 16px',position:'relative',overflow:'hidden',cursor:'pointer'}}>
          <div style={{position:'absolute',right:-20,top:-20,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
          <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                <span style={{color:P.gold}}><Ic.Fire /></span>
                <span style={{fontSize:11,fontWeight:700,color:P.gold,letterSpacing:1.5,textTransform:'uppercase'}}>Tu posición</span>
              </div>
              <div style={{display:'flex',alignItems:'baseline',gap:10}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:48,color:'#fff',lineHeight:0.9}}>#{me.rank}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{me.pts} pts</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.6)'}}>{me.exact} exactos · {me.acc}% precisión</div>
                </div>
              </div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:8,fontWeight:600}}>
                {ahead ? `${ahead.pts - me.pts} pts del #1 · ` : ''}{behind ? `+${me.pts - behind.pts} sobre #${behind.rank}` : ''}
              </div>
            </div>
            <div style={{color:'rgba(255,255,255,0.5)'}}><Ic.ChevR /></div>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div style={{padding:'14px 14px 0'}}>
        <button onClick={() => onGoTo('quiniela')} style={{
          width:'100%',padding:'15px',borderRadius:14,border:'none',
          background:P.gold, color:P.text,
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:16,letterSpacing:0.5,
          cursor:'pointer',boxShadow:`0 6px 20px ${P.gold}55`,
          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
        }}>
          {remaining > 0 ? `Completar ${remaining} predicciones` : 'Ver predicciones'}
          <Ic.ChevR />
        </button>
      </div>

      {/* Live preview */}
      <div style={{padding:'18px 14px 0'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:P.red,boxShadow:`0 0 8px ${P.red}`,animation:'pulse 1.5s infinite'}}/>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:15,color:P.text,letterSpacing:0.3}}>EN VIVO AHORA</span>
          </div>
          <button onClick={() => onGoTo('live')} style={{background:'none',border:'none',color:P.green,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:2}}>
            Ver todos <Ic.ChevR />
          </button>
        </div>
        <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:6}}>
          {MOCK_LIVE.slice(0,3).map(m => (
            <div key={m.id} onClick={() => onGoTo('live')} style={{
              minWidth:160,background:'#fff',borderRadius:14,padding:'10px 12px',
              border:`1px solid ${P.border}`,boxShadow:'0 1px 4px rgba(13,61,46,0.04)',cursor:'pointer',
              flexShrink:0,
            }}>
              <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:P.red,animation:'pulse 1.5s infinite'}}/>
                <span style={{fontSize:9,fontWeight:800,color:P.red,letterSpacing:1}}>{m.minute}' {m.status}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:0}}>
                  <span style={{fontSize:18}}>{FLAGS[m.home]}</span>
                  <span style={{fontSize:12,fontWeight:700,color:P.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.home}</span>
                </div>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:16,color:P.text}}>{m.hs}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
                <div style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:0}}>
                  <span style={{fontSize:18}}>{FLAGS[m.away]}</span>
                  <span style={{fontSize:12,fontWeight:700,color:P.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.away}</span>
                </div>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:16,color:P.text}}>{m.as}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{height:24}}/>
    </div>
  );
}

// ─── QUINIELA (PREDICTIONS) ───────────────────────────────
function QuinielaScreen({ activeQ, quinielas, setActiveQ, setPrediction, onSubmit, onAddNew, onCopyFrom }) {
  const predictions = activeQ.predictions;
  const [active, setActive] = useState('A');
  const [mode, setMode] = useState('pending'); // all | pending
  const [showCopy, setShowCopy] = useState(false);
  const toast = useToast();
  const inputRefs = useRef({});

  const totalMatches = MOCK_GROUPS.length * 6;
  const filled = Object.keys(predictions).filter(k => predictions[k]?.h !== '' && predictions[k]?.a !== '').length;
  const pct = Math.round((filled / totalMatches) * 100);
  const allDone = filled === totalMatches;

  const groupMatches = useMemo(() => {
    const g = MOCK_GROUPS.find(g => g.id === active);
    return buildMatches(g);
  }, [active]);

  const groupProgress = (gid) => {
    const g = MOCK_GROUPS.find(g => g.id === gid);
    const ms = buildMatches(g);
    const done = ms.filter((_,i) => {
      const k = `${gid}-${i}`;
      return predictions[k]?.h !== '' && predictions[k]?.a !== '';
    }).length;
    return { done, total: ms.length };
  };

  const handleInput = (key, side, val) => {
    const cleaned = val.replace(/\D/g,'').slice(0,2);
    setPrediction(key, side, cleaned);
    // Auto-advance
    if (cleaned && side === 'h') {
      const next = inputRefs.current[`${key}-a`];
      if (next) next.focus();
    }
  };

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:P.cardSoft,overflow:'hidden'}}>
      {/* Top bar with progress */}
      <div style={{background:'#fff',borderBottom:`1px solid ${P.border}`,padding:'10px 14px 10px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,gap:8}}>
          <QuinielaSelector quinielas={quinielas} activeId={activeQ.id} onChange={setActiveQ} onAddNew={onAddNew}/>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            {quinielas.length > 1 && (
              <button onClick={() => setShowCopy(true)} title="Copiar de otra quiniela" style={{
                display:'flex',alignItems:'center',gap:4,
                background:P.cardSoft,border:`1px solid ${P.border}`,borderRadius:9,
                padding:'5px 9px',color:P.green,fontSize:11,fontWeight:700,cursor:'pointer',
              }}>
                <Ic.Copy /> Copiar
              </button>
            )}
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20,color:P.green,lineHeight:1}}>{filled}<span style={{color:P.textLight,fontSize:13}}>/{totalMatches}</span></div>
              <div style={{fontSize:9,color:P.textLight,fontWeight:600}}>{pct}%</div>
            </div>
          </div>
        </div>
        <div style={{height:6,background:P.cardSoft,borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg, ${P.greenBright}, ${P.gold})`,transition:'width 0.3s'}}/>
        </div>

        {/* Filter chips */}
        <div style={{display:'flex',gap:6,marginTop:10}}>
          {[['all','Todos'],['pending','Pendientes']].map(([id,l]) => (
            <button key={id} onClick={() => setMode(id)} style={{
              padding:'5px 11px',borderRadius:18,border:'none',cursor:'pointer',
              background: mode===id ? P.text : P.cardSoft,
              color: mode===id ? '#fff' : P.textMid,
              fontSize:11,fontWeight:700,letterSpacing:0.2,
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Group tabs */}
      <div style={{background:'#fff',borderBottom:`1px solid ${P.border}`,padding:'8px 14px 10px'}}>
        <div style={{display:'flex',gap:6,overflowX:'auto'}}>
          {MOCK_GROUPS.map(g => {
            const p = groupProgress(g.id);
            const isActive = active === g.id;
            const complete = p.done === p.total;
            return (
              <button key={g.id} onClick={() => setActive(g.id)} style={{
                minWidth:48,padding:'7px 0',borderRadius:11,border:'none',cursor:'pointer',
                background: isActive ? P.green : P.cardSoft,
                color: isActive ? '#fff' : P.text,
                display:'flex',flexDirection:'column',alignItems:'center',gap:1,
                position:'relative',
                boxShadow: isActive ? `0 4px 12px ${P.green}55` : 'none',
                transition:'all 0.15s',
              }}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:15,letterSpacing:0.3}}>{g.id}</span>
                <span style={{fontSize:8,fontWeight:700,opacity:isActive?0.85:0.5}}>{p.done}/{p.total}</span>
                {complete && (
                  <div style={{position:'absolute',top:3,right:3,width:8,height:8,borderRadius:'50%',background:P.greenBright,border:'1.5px solid #fff'}}/>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Match list */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:14,color:P.textMid,letterSpacing:1.5,textTransform:'uppercase',marginBottom:10}}>
          Grupo {active}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {groupMatches.map(([h,a],mi) => {
            const k = `${active}-${mi}`;
            const v = predictions[k] || {h:'', a:''};
            const done = v.h !== '' && v.a !== '';
            if (mode === 'pending' && done) return null;
            return (
              <div key={k} style={{
                background:'#fff',borderRadius:14,padding:'12px 14px',
                border: done ? `1.5px solid ${P.greenBright}40` : `1px solid ${P.border}`,
                boxShadow: done ? `0 0 0 3px ${P.greenBright}10` : '0 1px 3px rgba(13,61,46,0.04)',
                position:'relative',
              }}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
                  <span style={{fontSize:9,fontWeight:800,color:P.textLight,letterSpacing:1.2,textTransform:'uppercase'}}>Partido {mi+1}</span>
                  {done && <div style={{display:'flex',alignItems:'center',gap:3,color:P.greenBright,fontSize:10,fontWeight:700}}><Ic.Check /> Listo</div>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:10}}>
                  {/* Home */}
                  <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                    <span style={{fontSize:22}}>{FLAGS[h] || '🏳️'}</span>
                    <span style={{fontSize:13,fontWeight:700,color:P.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{h}</span>
                  </div>
                  {/* Score inputs */}
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <input
                      ref={el => inputRefs.current[`${k}-h`] = el}
                      value={v.h}
                      onChange={e => handleInput(k, 'h', e.target.value)}
                      placeholder="—"
                      inputMode="numeric"
                      style={{width:38,height:38,borderRadius:10,border:`1.5px solid ${done ? P.greenBright+'66' : P.border}`,textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18,color:P.text,background:done ? P.greenBright+'12' : P.cardSoft,outline:'none'}}
                    />
                    <span style={{fontSize:11,color:P.textLight,fontWeight:700}}>vs</span>
                    <input
                      ref={el => inputRefs.current[`${k}-a`] = el}
                      value={v.a}
                      onChange={e => handleInput(k, 'a', e.target.value)}
                      placeholder="—"
                      inputMode="numeric"
                      style={{width:38,height:38,borderRadius:10,border:`1.5px solid ${done ? P.greenBright+'66' : P.border}`,textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:18,color:P.text,background:done ? P.greenBright+'12' : P.cardSoft,outline:'none'}}
                    />
                  </div>
                  {/* Away */}
                  <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end',minWidth:0}}>
                    <span style={{fontSize:13,fontWeight:700,color:P.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textAlign:'right'}}>{a}</span>
                    <span style={{fontSize:22}}>{FLAGS[a] || '🏳️'}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {mode === 'pending' && groupMatches.every((_,mi) => {
            const v = predictions[`${active}-${mi}`];
            return v?.h !== '' && v?.a !== '';
          }) && (
            <div style={{padding:'40px 20px',textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:8}}>✅</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:18,color:P.text}}>¡Grupo {active} completo!</div>
              <div style={{fontSize:12,color:P.textLight,marginTop:4}}>Todas las predicciones de este grupo están listas</div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{background:'#fff',borderTop:`1px solid ${P.border}`,padding:'10px 14px 12px'}}>
        {!allDone && (
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,padding:'7px 10px',background:`${P.gold}12`,borderRadius:9}}>
            <span style={{color:P.gold,display:'flex'}}><Ic.Lock /></span>
            <span style={{fontSize:11,fontWeight:700,color:'#8a6700'}}>Completa los {totalMatches - filled} partidos restantes para enviar</span>
          </div>
        )}
        <button disabled={!allDone} onClick={() => { onSubmit(); toast('¡Quiniela enviada! 🎉', 'success'); }} style={{
          width:'100%',padding:'13px',borderRadius:13,border:'none',
          background: allDone ? P.gold : P.border,
          color: allDone ? P.text : P.textLight,
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:15,letterSpacing:0.5,
          cursor: allDone ? 'pointer' : 'not-allowed',
          boxShadow: allDone ? `0 4px 14px ${P.gold}55` : 'none',
          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
        }}>
          {allDone ? <><Ic.Save /> Enviar quiniela final</> : <><Ic.Lock /> Guardar ({filled}/{totalMatches})</>}
        </button>
      </div>

      {/* Copy from another quiniela sheet */}
      <Sheet open={showCopy} onClose={() => setShowCopy(false)} title="Copiar predicciones">
        <div style={{paddingBottom:14}}>
          <div style={{fontSize:12,color:P.textMid,marginBottom:12,lineHeight:1.5}}>Copia tus predicciones de otra quiniela. Esto reemplazará todas tus predicciones actuales en <b>{activeQ.name}</b>.</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {quinielas.filter(q => q.id !== activeQ.id).map(q => {
              const f = Object.values(q.predictions).filter(p => p.h !== '' && p.a !== '').length;
              return (
                <button key={q.id} onClick={() => { onCopyFrom(q.id); setShowCopy(false); toast(`Copiado de ${q.name}`, 'success'); }} style={{
                  display:'flex',alignItems:'center',gap:11,
                  padding:'11px 13px',background:P.cardSoft,border:`1.5px solid ${P.border}`,
                  borderRadius:12,cursor:'pointer',textAlign:'left',width:'100%',
                }}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:q.color}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:P.text}}>{q.name}</div>
                    <div style={{fontSize:11,color:P.textLight}}>{f}/72 predicciones · {q.members}/{q.maxMembers} jugadores</div>
                  </div>
                  <span style={{color:P.green,display:'flex'}}><Ic.ChevR /></span>
                </button>
              );
            })}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

// ─── LIVE SCREEN ──────────────────────────────────────────
function LiveScreen({ activeQ, quinielas, setActiveQ, onAddNew }) {
  const [selected, setSelected] = useState(null);
  const [tabF, setTabF] = useState('live'); // live | today
  const predictions = activeQ.predictions;

  // Today's matches: live ones + a couple upcoming
  const today = [
    ...MOCK_LIVE.map(m => ({ ...m, kind:'live', predKey: 'A-0' })),
    { id:'u1', kind:'upcoming', home:'Francia', away:'Alemania', time:'15:00', predKey:'D-0' },
    { id:'u2', kind:'upcoming', home:'Italia',  away:'Portugal',  time:'18:30', predKey:'E-0' },
    { id:'u3', kind:'upcoming', home:'Uruguay', away:'Inglaterra',time:'21:00', predKey:'F-0' },
  ];

  // assign predKeys to live ones (real-app: matches would have IDs mapping to keys)
  const liveWithKeys = MOCK_LIVE.map((m, i) => ({ ...m, kind:'live', predKey: ['A-0','B-0','C-0'][i] }));
  const upcomingOnly = today.filter(t => t.kind === 'upcoming');
  const list = tabF === 'live' ? liveWithKeys : [...liveWithKeys, ...upcomingOnly];

  // points helper
  const calcPoints = (pred, hs, as) => {
    if (!pred || pred.h === '' || pred.a === '') return null;
    const ph = parseInt(pred.h), pa = parseInt(pred.a);
    if (ph === hs && pa === as) return { pts:5, label:'Marcador exacto', color:P.gold };
    const realRes = hs > as ? 'h' : hs < as ? 'a' : 'd';
    const predRes = ph > pa ? 'h' : ph < pa ? 'a' : 'd';
    if (realRes === predRes) return { pts:2, label:'Resultado correcto', color:P.greenBright };
    return { pts:0, label:'No acertaste', color:P.textLight };
  };

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:P.cardSoft,overflow:'hidden'}}>
      {/* Header */}
      <div style={{background:`linear-gradient(180deg, ${P.surface} 0%, ${P.green} 100%)`,padding:'12px 14px 16px',position:'relative',overflow:'hidden',flexShrink:0}}>
        <PitchMarks opacity={0.06}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <QuinielaSelector quinielas={quinielas} activeId={activeQ.id} onChange={setActiveQ} onAddNew={onAddNew}/>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:P.red,boxShadow:`0 0 10px ${P.red}`,animation:'pulse 1.5s infinite'}}/>
              <span style={{fontSize:10,fontWeight:800,color:P.red,letterSpacing:1.5,textTransform:'uppercase'}}>{liveWithKeys.length} en vivo</span>
            </div>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:22,color:'#fff',lineHeight:1}}>Hoy · {new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'short'}).replace(/^./,c=>c.toUpperCase())}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:3}}>Compara tus predicciones vs los marcadores reales</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{background:'#fff',borderBottom:`1px solid ${P.border}`,padding:'8px 14px',flexShrink:0}}>
        <div style={{display:'flex',gap:6}}>
          {[['live',`En vivo · ${liveWithKeys.length}`],['today',`Todos hoy · ${liveWithKeys.length + upcomingOnly.length}`]].map(([id,l]) => (
            <button key={id} onClick={() => setTabF(id)} style={{
              padding:'6px 12px',borderRadius:18,border:'none',cursor:'pointer',
              background: tabF===id ? P.text : P.cardSoft,
              color: tabF===id ? '#fff' : P.textMid,
              fontSize:11,fontWeight:700,letterSpacing:0.2,
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Match cards */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
        {list.map(m => {
          const pred = predictions[m.predKey];
          const isLive = m.kind === 'live';
          const score = isLive ? calcPoints(pred, m.hs, m.as) : null;
          return (
            <div key={m.id} onClick={() => isLive && setSelected(m)} style={{background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(13,61,46,0.06)',border:`1px solid ${P.border}`,cursor: isLive ? 'pointer' : 'default'}}>
              {/* Status bar */}
              <div style={{
                background: isLive ? (m.status==='HT' ? P.gold : P.red) : P.cardSoft,
                color: isLive ? '#fff' : P.textMid,
                padding:'5px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',
              }}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  {isLive && m.status !== 'HT' && <div style={{width:6,height:6,borderRadius:'50%',background:'#fff',animation:'pulse 1.5s infinite'}}/>}
                  {!isLive && <span style={{display:'flex',color:P.textMid}}><Ic.Clock /></span>}
                  <span style={{fontSize:10,fontWeight:800,letterSpacing:1}}>
                    {isLive ? (m.status === 'HT' ? 'DESCANSO' : `${m.minute}'  ${m.status === '1T' ? '1ER TIEMPO' : '2DO TIEMPO'}`) : `HOY ${m.time}`}
                  </span>
                </div>
                {isLive && score && (
                  <div style={{display:'flex',alignItems:'center',gap:4,background:'rgba(255,255,255,0.2)',borderRadius:6,padding:'1px 7px'}}>
                    <span style={{fontSize:9,fontWeight:800,letterSpacing:0.5}}>{score.pts > 0 ? `+${score.pts} PTS` : 'SIN PTS'}</span>
                  </div>
                )}
              </div>

              {/* Score */}
              <div style={{padding:'12px 14px 10px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:9,flex:1,minWidth:0}}>
                    <span style={{fontSize:28}}>{FLAGS[m.home]}</span>
                    <span style={{fontSize:14,fontWeight:700,color:P.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.home}</span>
                  </div>
                  {isLive ? (
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:30,color:P.text,lineHeight:1}}>{m.hs}</span>
                      <span style={{fontSize:11,color:P.textLight,fontWeight:700}}>·</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:30,color:P.text,lineHeight:1}}>{m.as}</span>
                    </div>
                  ) : (
                    <div style={{fontSize:13,fontWeight:700,color:P.textMid,padding:'3px 10px',background:P.cardSoft,borderRadius:8}}>vs</div>
                  )}
                  <div style={{display:'flex',alignItems:'center',gap:9,flex:1,minWidth:0,justifyContent:'flex-end'}}>
                    <span style={{fontSize:14,fontWeight:700,color:P.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textAlign:'right'}}>{m.away}</span>
                    <span style={{fontSize:28}}>{FLAGS[m.away]}</span>
                  </div>
                </div>

                {/* Prediction comparison */}
                <div style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'8px 11px',borderRadius:10,
                  background: score ? `${score.color}12` : P.cardSoft,
                  border: `1px solid ${score ? score.color+'33' : P.border}`,
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{fontSize:9,fontWeight:800,color:P.textLight,letterSpacing:1,textTransform:'uppercase'}}>Tu predicción</span>
                    {pred && pred.h !== '' && pred.a !== '' ? (
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:14,color:P.text}}>{pred.h} - {pred.a}</span>
                    ) : (
                      <span style={{fontSize:11,fontWeight:700,color:P.textLight,fontStyle:'italic'}}>Sin predicción</span>
                    )}
                  </div>
                  {score && (
                    <div style={{display:'flex',alignItems:'center',gap:4,fontSize:10,fontWeight:800,color:score.color}}>
                      {score.pts === 5 && <span style={{display:'flex'}}><Ic.Target /></span>}
                      {score.pts === 2 && <span style={{display:'flex'}}><Ic.Check /></span>}
                      {score.pts === 0 && <span style={{display:'flex'}}><Ic.X /></span>}
                      <span style={{textTransform:'uppercase',letterSpacing:0.5}}>{score.label}</span>
                    </div>
                  )}
                </div>

                {/* Last events strip (live only) */}
                {isLive && (
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                    {m.events.slice(-3).map((e,i) => (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:4,background:P.cardSoft,borderRadius:7,padding:'2px 7px',fontSize:10,fontWeight:700,color:P.textMid}}>
                        <span style={{color:P.textLight,fontSize:9}}>{e.min}'</span>
                        {e.type === 'goal' && <span>⚽</span>}
                        {e.type === 'yellow' && <Ic.Card color="#fbbf24"/>}
                        {e.type === 'red' && <Ic.Card color={P.red}/>}
                        <span>{e.player.split(' ').slice(-1)[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.home} vs ${selected.away}` : ''}>
        {selected && (
          <div>
            <div style={{background:`linear-gradient(135deg, ${P.green} 0%, ${P.greenMid} 100%)`,borderRadius:16,padding:'16px',color:'#fff',marginBottom:14,position:'relative',overflow:'hidden'}}>
              <PitchMarks opacity={0.08}/>
              <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-around'}}>
                <div style={{textAlign:'center',flex:1}}>
                  <div style={{fontSize:36,marginBottom:4}}>{FLAGS[selected.home]}</div>
                  <div style={{fontSize:12,fontWeight:700,opacity:0.85}}>{selected.home}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:42,lineHeight:1}}>{selected.hs} - {selected.as}</div>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1,opacity:0.7,marginTop:4}}>{selected.minute}'  {selected.status}</div>
                </div>
                <div style={{textAlign:'center',flex:1}}>
                  <div style={{fontSize:36,marginBottom:4}}>{FLAGS[selected.away]}</div>
                  <div style={{fontSize:12,fontWeight:700,opacity:0.85}}>{selected.away}</div>
                </div>
              </div>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,color:P.textMid,letterSpacing:1.5,textTransform:'uppercase',marginBottom:8}}>Eventos</div>
            <div style={{display:'flex',flexDirection:'column',gap:8,paddingBottom:14}}>
              {selected.events.slice().reverse().map((e,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:P.cardSoft,borderRadius:10,padding:'9px 12px'}}>
                  <div style={{width:34,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,color:P.green}}>{e.min}'</div>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {e.type === 'goal' ? <span>⚽</span> : e.type === 'yellow' ? <Ic.Card color="#fbbf24"/> : <Ic.Card color={P.red}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:P.text}}>{e.player}</div>
                    <div style={{fontSize:11,color:P.textLight}}>{e.type === 'goal' ? '⚽ Gol' : e.type === 'yellow' ? '🟨 Amarilla' : '🟥 Roja'} · {e.team === 'h' ? selected.home : selected.away}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────
function LeaderboardScreen({ activeQ, quinielas, setActiveQ, onAddNew }) {
  const me = MOCK_LEADERBOARD.find(x => x.isMe);
  const top3 = MOCK_LEADERBOARD.slice(0,3);
  const rest = MOCK_LEADERBOARD.slice(3);

  return (
    <div style={{flex:1,overflowY:'auto',background:P.cardSoft}}>
      {/* Header */}
      <div style={{background:`linear-gradient(180deg, ${P.surface} 0%, ${P.green} 100%)`,padding:'12px 14px 100px',position:'relative',overflow:'hidden'}}>
        <PitchMarks opacity={0.07}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <QuinielaSelector quinielas={quinielas} activeId={activeQ.id} onChange={setActiveQ} onAddNew={onAddNew}/>
            <button style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:9,padding:'5px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Esta semana</button>
          </div>
          <div style={{fontSize:10,fontWeight:800,color:P.gold,letterSpacing:2,textTransform:'uppercase',marginBottom:3}}>Clasificación</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:22,color:'#fff',lineHeight:1}}>{activeQ.name}</div>

          {/* Podium */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr 1fr',gap:8,alignItems:'flex-end',marginTop:18}}>
            {[top3[1], top3[0], top3[2]].map((p,i) => {
              const heights = [78, 100, 64];
              const ranks = [2,1,3];
              const colors = ['#c0c0c0', P.gold, '#cd7f32'];
              return (
                <div key={p.rank} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                  {ranks[i] === 1 && <div style={{color:P.gold,marginBottom:2}}><Ic.Crown /></div>}
                  <div style={{width:48,height:48,borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,boxShadow:`0 4px 12px rgba(0,0,0,0.2), 0 0 0 3px ${colors[i]}`,marginBottom:6}}>{p.avatar}</div>
                  <div style={{fontSize:11,fontWeight:700,color:'#fff',marginBottom:2,textAlign:'center',maxWidth:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.6)',marginBottom:6}}>{p.pts} pts</div>
                  <div style={{
                    width:'100%',height:heights[i],
                    background:`linear-gradient(180deg, ${colors[i]} 0%, ${colors[i]}88 100%)`,
                    borderRadius:'10px 10px 0 0',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:24,color:'#fff',
                    border:`1px solid rgba(255,255,255,0.15)`,borderBottom:'none',
                  }}>{ranks[i]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* My status card (overlapping) */}
      <div style={{padding:'0 14px',marginTop:-82,position:'relative',zIndex:2}}>
        <div style={{background:'#fff',borderRadius:16,padding:'12px 14px',boxShadow:'0 8px 24px rgba(13,61,46,0.15)',border:`2px solid ${P.gold}`}}>
          <div style={{display:'flex',alignItems:'center',gap:11}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:24,color:P.gold,minWidth:28,textAlign:'center'}}>#{me.rank}</div>
            <div style={{width:42,height:42,borderRadius:'50%',background:P.cardSoft,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,border:`2px solid ${P.gold}`}}>{me.avatar}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:P.text}}>Tú</div>
              <div style={{display:'flex',gap:8,marginTop:2}}>
                <span style={{fontSize:10,color:P.textMid,fontWeight:600}}>🎯 {me.exact} exactos</span>
                <span style={{fontSize:10,color:P.textMid,fontWeight:600}}>{me.acc}% precisión</span>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:22,color:P.green,lineHeight:1}}>{me.pts}</div>
              <div style={{fontSize:9,color:P.textLight,fontWeight:700,letterSpacing:0.5}}>PUNTOS</div>
            </div>
          </div>
          <div style={{marginTop:10,padding:'8px 11px',background:`${P.gold}15`,borderRadius:9,display:'flex',alignItems:'center',gap:7}}>
            <span style={{color:P.gold}}><Ic.Fire /></span>
            <span style={{fontSize:11,fontWeight:700,color:'#8a6700'}}>+{me.pts - MOCK_LEADERBOARD[me.rank].pts} pts sobre #{me.rank+1} · Aún puedes ganar 🏆</span>
          </div>
        </div>
      </div>

      {/* Rest of ranking */}
      <div style={{padding:'14px 14px 0'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:14,color:P.textMid,letterSpacing:1.5,textTransform:'uppercase',marginBottom:8,paddingLeft:4}}>Tabla completa</div>
        <div style={{background:'#fff',borderRadius:14,overflow:'hidden',border:`1px solid ${P.border}`,boxShadow:'0 1px 4px rgba(13,61,46,0.04)'}}>
          {MOCK_LEADERBOARD.map((p,i) => (
            <div key={p.rank} style={{
              display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
              borderBottom: i < MOCK_LEADERBOARD.length-1 ? `1px solid ${P.border}` : 'none',
              background: p.isMe ? `${P.gold}08` : '#fff',
            }}>
              <div style={{minWidth:24,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:16,color: p.rank<=3 ? P.gold : P.textMid,textAlign:'center'}}>{p.rank}</div>
              <div style={{width:32,height:32,borderRadius:'50%',background:P.cardSoft,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{p.avatar}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight: p.isMe ? 800 : 600,color:P.text}}>{p.name}{p.isMe && <span style={{fontSize:9,fontWeight:800,color:P.gold,marginLeft:6,letterSpacing:1}}>TÚ</span>}</div>
                <div style={{fontSize:10,color:P.textLight}}>🎯 {p.exact} · {p.acc}%</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:16,color:P.text,lineHeight:1}}>{p.pts}</div>
                <div style={{fontSize:8,color:P.textLight,fontWeight:700,letterSpacing:0.5}}>PTS</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{height:24}}/>
    </div>
  );
}

// ─── INVITE ──────────────────────────────────────────────
function InviteScreen({ activeQ, quinielas, setActiveQ, onUpgrade, onAddNew }) {
  const [code] = useState('MUNDIAL-' + activeQ.id.toUpperCase());
  const link = `quiniela.app/join/${code}`;
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const filled = activeQ.members, max = activeQ.maxMembers;
  const remaining = max - filled;

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(()=>{});
    setCopied(true);
    toast('Link copiado al portapapeles', 'success');
    setTimeout(() => setCopied(false), 1500);
  };

  const share = (channel) => {
    toast(`Compartiendo en ${channel}…`, 'info');
  };

  return (
    <div style={{flex:1,overflowY:'auto',background:P.cardSoft}}>
      {/* Top bar with selector */}
      <div style={{padding:'10px 14px 4px',display:'flex',alignItems:'center',justifyContent:'space-between',background:P.surface}}>
        <QuinielaSelector quinielas={quinielas} activeId={activeQ.id} onChange={setActiveQ} onAddNew={onAddNew}/>
        <button onClick={onAddNew} style={{display:'flex',alignItems:'center',gap:4,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:9,padding:'5px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
          <Ic.Plus /> Nueva
        </button>
      </div>
      {/* Header card */}
      <div style={{padding:'10px 14px 0',background:P.surface}}>
        <div style={{borderRadius:18,overflow:'hidden',background:`linear-gradient(150deg, ${P.green} 0%, ${P.greenMid} 60%, #2a8c66 100%)`,position:'relative',boxShadow:`0 8px 24px ${P.green}66`}}>
          <PitchMarks opacity={0.07}/>
          {/* Glow */}
          <div style={{position:'absolute',top:-30,right:-30,width:140,height:140,borderRadius:'50%',background:`${P.gold}33`,filter:'blur(30px)'}}/>
          <div style={{position:'relative',zIndex:1,padding:'18px 16px 16px'}}>
            <div style={{fontSize:10,fontWeight:800,color:P.gold,letterSpacing:2,textTransform:'uppercase',marginBottom:5}}>Invita a tu liga</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:24,color:'#fff',lineHeight:1.05,marginBottom:4}}>{activeQ.name}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',marginBottom:14}}>Comparte el link y compite con tus amigos</div>

            {/* Spots */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <div style={{display:'flex',marginRight:4}}>
                {[...Array(Math.min(filled,5))].map((_,i) => (
                  <div key={i} style={{
                    width:30,height:30,borderRadius:'50%',
                    background:['#7c3aed','#ec4899','#10b981','#f59e0b','#3b82f6'][i],
                    border:'2.5px solid #1a3528',
                    marginLeft: i===0 ? 0 : -10,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:11,fontWeight:800,color:'#fff',
                  }}>{['CM','SR','PG','ML','DF'][i]}</div>
                ))}
                {filled > 5 && <div style={{width:30,height:30,borderRadius:'50%',background:'#fff',border:'2.5px solid #1a3528',marginLeft:-10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:P.text}}>+{filled-5}</div>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:16,color:'#fff',lineHeight:1}}>{filled}/{max} jugadores</div>
                <div style={{fontSize:10,color:P.gold,fontWeight:700,marginTop:2}}>🔥 Solo {remaining} cupos restantes</div>
              </div>
            </div>

            {/* Link box */}
            <div style={{background:'rgba(0,0,0,0.25)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'10px 12px',display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:1}}>Link de invitación</div>
                <div style={{fontSize:12,color:'#fff',fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{link}</div>
              </div>
              <button onClick={copy} style={{background:copied?P.greenBright:P.gold,border:'none',borderRadius:9,padding:'7px 11px',color:P.text,fontSize:11,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>
                {copied ? <><Ic.Check />Listo</> : <><Ic.Copy />Copiar</>}
              </button>
            </div>

            {/* Primary CTA */}
            <button onClick={() => share('WhatsApp')} style={{
              width:'100%',padding:'13px',
              background:'#25D366',border:'none',borderRadius:12,color:'#fff',
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:15,letterSpacing:0.5,
              display:'flex',alignItems:'center',justifyContent:'center',gap:8,
              cursor:'pointer',boxShadow:'0 4px 14px rgba(37,211,102,0.5)',
            }}>
              <Ic.WApp /> Compartir en WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Other channels */}
      <div style={{padding:'12px 14px 0'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,color:P.textMid,letterSpacing:1.5,textTransform:'uppercase',marginBottom:8,paddingLeft:4}}>Más opciones</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <button onClick={() => share('SMS')} style={{display:'flex',alignItems:'center',gap:8,padding:'12px',background:'#fff',border:`1px solid ${P.border}`,borderRadius:12,cursor:'pointer'}}>
            <div style={{width:32,height:32,borderRadius:9,background:`${P.green}15`,display:'flex',alignItems:'center',justifyContent:'center',color:P.green}}><Ic.Share /></div>
            <span style={{fontSize:13,fontWeight:700,color:P.text}}>SMS / Email</span>
          </button>
          <button onClick={() => share('Sistema')} style={{display:'flex',alignItems:'center',gap:8,padding:'12px',background:'#fff',border:`1px solid ${P.border}`,borderRadius:12,cursor:'pointer'}}>
            <div style={{width:32,height:32,borderRadius:9,background:`${P.gold}15`,display:'flex',alignItems:'center',justifyContent:'center',color:P.gold}}><Ic.Share /></div>
            <span style={{fontSize:13,fontWeight:700,color:P.text}}>Más apps</span>
          </button>
        </div>
      </div>

      {/* Upgrade banner */}
      <div style={{padding:'14px 14px 0'}}>
        <div onClick={onUpgrade} style={{background:`linear-gradient(135deg, ${P.gold} 0%, #b8860b 100%)`,borderRadius:14,padding:'12px 14px',display:'flex',alignItems:'center',gap:11,cursor:'pointer',boxShadow:`0 4px 14px ${P.gold}44`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:-10,top:-10,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.15)'}}/>
          <div style={{width:38,height:38,borderRadius:11,background:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',position:'relative'}}>
            <Ic.Sparkle />
          </div>
          <div style={{flex:1,position:'relative'}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:15,color:'#fff',lineHeight:1.1}}>¿Necesitas más cupos?</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.85)',marginTop:1}}>Sube a 25 o 50 jugadores · desde $99</div>
          </div>
          <div style={{color:'#fff',position:'relative'}}><Ic.ChevR /></div>
        </div>
      </div>

      {/* Players list */}
      <div style={{padding:'14px 14px 0'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,padding:'0 4px'}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,color:P.textMid,letterSpacing:1.5,textTransform:'uppercase'}}>En la liga · {filled}</span>
        </div>
        <div style={{background:'#fff',borderRadius:14,overflow:'hidden',border:`1px solid ${P.border}`}}>
          {MOCK_LEADERBOARD.slice(0, filled).map((p, i) => (
            <div key={p.rank} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderBottom: i < filled-1 ? `1px solid ${P.border}` : 'none'}}>
              <div style={{width:34,height:34,borderRadius:'50%',background:P.cardSoft,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>{p.avatar}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight: p.isMe ? 800 : 600,color:P.text}}>{p.name}{p.isMe && <span style={{fontSize:9,fontWeight:800,color:P.gold,marginLeft:6,letterSpacing:1}}>TÚ</span>}</div>
                <div style={{fontSize:10,color:P.textLight}}>{i === 0 ? 'Admin · ' : ''}Activo</div>
              </div>
              {i === 0 && <span style={{fontSize:10,fontWeight:800,background:`${P.gold}18`,color:'#8a6700',borderRadius:6,padding:'2px 7px',letterSpacing:0.5}}>ADMIN</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{height:24}}/>
    </div>
  );
}

// ─── PRICING (Buy a new quiniela) ──────────────────────
function PricingScreen({ onClose, onPurchase }) {
  const [selected, setSelected] = useState(1);
  const [name, setName] = useState('Mi nueva quiniela');
  const toast = useToast();
  const plans = [
    { id:0, name:'Casual',  spots:10,  price:'$0',   priceN:0,   note:'Gratis',                tag:'Free',          features:['Hasta 10 jugadores','72 partidos','Tabla en tiempo real'] },
    { id:1, name:'Squad',   spots:25,  price:'$99',  priceN:99,  note:'Pago único',            tag:'Más popular',   popular:true, features:['Hasta 25 jugadores','Stats avanzadas','Sin anuncios','Branding personalizado'] },
    { id:2, name:'Stadium', spots:50,  price:'$199', priceN:199, note:'Pago único',            tag:'Mejor valor',   features:['Hasta 50 jugadores','Multi-quinielas ilimitadas','Soporte prioritario','Premios automáticos'] },
  ];
  const colors = ['#3b82f6','#d4a017','#10b981','#ec4899','#7c3aed','#f97316'];

  const buy = () => {
    const p = plans[selected];
    onPurchase({
      name: name.trim() || 'Nueva quiniela',
      maxMembers: p.spots,
      color: colors[Math.floor(Math.random()*colors.length)],
      planName: p.name,
    });
    toast(`¡Liga "${name}" creada!`, 'success');
    setTimeout(onClose, 600);
  };

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:P.cardSoft,overflow:'hidden'}}>
      {/* Top bar */}
      <div style={{display:'flex',alignItems:'center',padding:'10px 14px',background:'#fff',borderBottom:`1px solid ${P.border}`}}>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:9,background:P.cardSoft,border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:P.text,cursor:'pointer'}}>
          <Ic.ChevL />
        </button>
        <div style={{flex:1,textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:17,color:P.text}}>Comprar quiniela</div>
        <div style={{width:32}}/>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 14px'}}>
        {/* Hero */}
        <div style={{textAlign:'center',marginBottom:14}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:`${P.gold}18`,border:`1px solid ${P.gold}33`,borderRadius:20,padding:'4px 11px',marginBottom:10}}>
            <span style={{color:P.gold}}><Ic.Sparkle /></span>
            <span style={{fontSize:10,fontWeight:800,color:'#8a6700',letterSpacing:1.5,textTransform:'uppercase'}}>Nueva quiniela</span>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:22,color:P.text,lineHeight:1.1,marginBottom:6}}>Crea otra liga,<br/>compite con otro grupo</div>
          <div style={{fontSize:12,color:P.textLight,maxWidth:280,margin:'0 auto'}}>Cada quiniela tiene su propia tabla, predicciones y participantes.</div>
        </div>

        {/* Name input */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:800,color:P.textMid,letterSpacing:1,textTransform:'uppercase',marginBottom:6,paddingLeft:4}}>Nombre de la liga</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Familia Mundial 2026" style={{
            width:'100%',padding:'12px 14px',borderRadius:12,
            border:`1.5px solid ${P.border}`,background:'#fff',
            fontSize:14,fontWeight:600,color:P.text,outline:'none',
          }}/>
        </div>

        {/* Plan cards */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {plans.map(p => {
            const isSel = selected === p.id;
            return (
              <div key={p.id} onClick={() => setSelected(p.id)} style={{
                background: p.popular && isSel ? `linear-gradient(135deg, ${P.green} 0%, ${P.greenMid} 100%)` : '#fff',
                color: p.popular && isSel ? '#fff' : P.text,
                borderRadius:18,padding:'14px 16px',
                border: isSel ? `2.5px solid ${p.popular ? P.gold : P.green}` : `1.5px solid ${P.border}`,
                cursor:'pointer',position:'relative',
                boxShadow: isSel ? '0 8px 24px rgba(13,61,46,0.15)' : '0 1px 4px rgba(13,61,46,0.04)',
                transition:'all 0.2s',
              }}>
                {p.tag && (
                  <div style={{
                    position:'absolute',top:-9,right:14,
                    background: p.popular ? P.gold : (p.id === 0 ? P.greenBright : P.text),
                    color: p.popular ? P.text : '#fff',
                    fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase',
                    padding:'3px 9px',borderRadius:6,
                  }}>{p.tag}</div>
                )}
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:20,letterSpacing:0.3,lineHeight:1}}>{p.name}</div>
                    <div style={{fontSize:11,opacity:0.7,marginTop:3}}>Hasta {p.spots} jugadores</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:26,lineHeight:1}}>{p.price}</div>
                    <div style={{fontSize:9,opacity:0.6,fontWeight:700,letterSpacing:0.5,marginTop:1}}>{p.note}</div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {p.features.map((f, i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,opacity:0.92}}>
                      <span style={{color: p.popular && isSel ? P.gold : P.greenBright,display:'flex'}}><Ic.Check /></span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                {/* Use case hint */}
                {p.id === 1 && (
                  <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${p.popular && isSel ? 'rgba(255,255,255,0.15)' : P.border}`,fontSize:11,opacity:0.8,fontStyle:'italic'}}>
                    💡 Perfecto para grupos de oficina y familia
                  </div>
                )}
                {p.id === 2 && (
                  <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${P.border}`,fontSize:11,opacity:0.8,fontStyle:'italic'}}>
                    💡 Mejor para ligas grandes y eventos
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{textAlign:'center',marginTop:14,fontSize:11,color:P.textLight}}>
          🔒 Pago seguro · Garantía 7 días
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{background:'#fff',borderTop:`1px solid ${P.border}`,padding:'10px 14px 12px'}}>
        <button onClick={buy} style={{
          width:'100%',padding:'14px',borderRadius:13,border:'none',
          background: P.gold,color:P.text,
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:16,letterSpacing:0.5,
          cursor:'pointer',boxShadow:`0 6px 20px ${P.gold}55`,
          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
        }}>
          {plans[selected].priceN === 0 ? `Crear "${(name||'liga').slice(0,18)}" gratis` : `Comprar · ${plans[selected].price}`}
          <Ic.ChevR />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  Onboarding, HomeScreen, QuinielaScreen, LiveScreen, LeaderboardScreen, InviteScreen, PricingScreen,
});
