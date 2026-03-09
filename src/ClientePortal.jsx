import { useState, useEffect } from 'react'

const EST_LABEL = {
  solicitud:"Solicitud recibida", enviado_china:"Enviado a proveedor",
  respuesta_china:"Cotizando en China", enviada_cliente:"Cotización lista",
  re_testeando:"En revisión", en_negociacion:"En negociación",
  aceptada:"Aceptada", pagada_china:"Importando",
  en_camino:"En camino a Chile", en_bodega:"Lista para retirar",
  completada:"Completada", rechazada_cliente:"No procesada",
  no_procesada:"No procesada", anulada:"Anulada",
}
const EST_COLOR = {
  solicitud:"#6a9fd4", enviado_china:"#2a8aaa", respuesta_china:"#b8922e",
  enviada_cliente:"#2d78c8", en_negociacion:"#c47830", re_testeando:"#6a9fd4",
  rechazada_cliente:"#c0392b", anulada:"#8b1a2e", aceptada:"#1aa358",
  no_procesada:"#c0392b", pagada_china:"#e08c30", en_camino:"#a85590",
  en_bodega:"#3d7fc4", completada:"#0d9870",
}
const EST_ICON = {
  solicitud:"📥", enviado_china:"📨", respuesta_china:"🇨🇳", enviada_cliente:"📋",
  re_testeando:"🔄", en_negociacion:"💬", aceptada:"✅", pagada_china:"💳",
  en_camino:"🚢", en_bodega:"📦", completada:"🏁", rechazada_cliente:"❌",
  no_procesada:"❌", anulada:"🚫",
}
const TIMELINE = [
  { key:"enviado_china",   label:"Enviado",    icon:"📨" },
  { key:"respuesta_china", label:"Cotizado",   icon:"🇨🇳" },
  { key:"cliente_acepto",  label:"Aceptado",   icon:"✅" },
  { key:"pago1_cliente",   label:"1er pago",   icon:"💳" },
  { key:"pago_china",      label:"Pagado",     icon:"🏦" },
  { key:"en_produccion",   label:"Producción", icon:"🏭" },
  { key:"ctrl_calidad",    label:"Calidad OK", icon:"🔍" },
  { key:"despachado",      label:"Despachado", icon:"🚀" },
  { key:"llego_chile",     label:"En Chile",   icon:"🛬" },
  { key:"pago2_cliente",   label:"2do pago",   icon:"💳" },
  { key:"retirado_bodega", label:"Completado", icon:"🏁" },
]
const CHECKLIST_FULL = [
  { key:"enviado_china",   label:"Solicitud enviada al proveedor",   icon:"📨" },
  { key:"respuesta_china", label:"Cotización del proveedor recibida",icon:"🇨🇳" },
  { key:"cot_enviada",     label:"Propuesta enviada",                icon:"📋" },
  { key:"cliente_acepto",  label:"Propuesta aceptada",               icon:"✅" },
  { key:"pago1_cliente",   label:"1er pago recibido",                icon:"💳" },
  { key:"pago_china",      label:"Pago al proveedor realizado",      icon:"🏦" },
  { key:"en_produccion",   label:"En proceso de producción",         icon:"🏭" },
  { key:"almacen_china",   label:"En almacén China",                 icon:"📦" },
  { key:"ctrl_calidad",    label:"Control de calidad aprobado",      icon:"🔍" },
  { key:"despachado",      label:"Despachado desde China",           icon:"🚀" },
  { key:"llego_chile",     label:"Llegó a Chile",                    icon:"🛬" },
  { key:"pago2_cliente",   label:"2do pago recibido",                icon:"💳" },
  { key:"retirado_bodega", label:"Importación completada",           icon:"🏁" },
]
const fmt = n => !n&&n!==0?"$0":Number(n).toLocaleString("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0})
const fmtN = n => Number(n).toLocaleString("es-CL",{maximumFractionDigits:0})
const fmtDate = d => { try{ return new Date(d+'T12:00:00').toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}) }catch{ return d } }
const diasRestantes = d => { try{ return Math.ceil((new Date(d+'T12:00:00')-new Date())/(1000*60*60*24)) }catch{ return null } }
const FILTROS = [{key:"todas",label:"Todas"},{key:"en_proceso",label:"En proceso"},{key:"en_camino",label:"En camino"},{key:"completada",label:"Completadas"}]

export default function ClientePortal({ supabase, perfil, onLogout }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [filtro, setFiltro] = useState("todas")
  const [busqueda, setBusqueda] = useState("")
  const [tabDetalle, setTabDetalle] = useState({})

  useEffect(() => {
    cargar()
    const canal = supabase.channel('zaga_cliente_rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'cotizaciones'},()=>cargar())
      .subscribe()
    return ()=>supabase.removeChannel(canal)
  },[])

  const cargar = async () => {
    const { data, error } = await supabase.from('cotizaciones').select('datos').order('created_at',{ascending:false})
    if(data&&!error) setCotizaciones(data.map(r=>typeof r.datos==='string'?JSON.parse(r.datos):r.datos))
    setLoading(false)
  }

  const getTab = id => tabDetalle[id]||"timeline"
  const setTab = (id,tab) => setTabDetalle(p=>({...p,[id]:tab}))

  const todas = cotizaciones.filter(c=>!['anulada','no_procesada','rechazada_cliente'].includes(c.estado))
  const enProceso = todas.filter(c=>!['completada','solicitud'].includes(c.estado))
  const enCamino = todas.filter(c=>c.estado==='en_camino')
  const completadas = todas.filter(c=>c.estado==='completada')
  const totalInvertido = todas.reduce((s,c)=>s+(c.calc?(c.con_iva?(c.calc.totClIva||c.calc.totCl||0):(c.calc.totCl||0)):0),0)
  const pagosPendientes = todas.filter(c=>c.calc&&(!c.checklist?.pago1_cliente||(!c.checklist?.pago2_cliente&&['en_bodega','completada'].includes(c.estado))))
  const proximaLlegada = enProceso.filter(c=>c.fecha_llegada_est).sort((a,b)=>new Date(a.fecha_llegada_est)-new Date(b.fecha_llegada_est))[0]

  const filtradas = todas.filter(c=>{
    const passFiltro = filtro==="todas"?true:filtro==="en_proceso"?!['completada','solicitud','en_camino'].includes(c.estado):filtro==="en_camino"?c.estado==='en_camino':c.estado==='completada'
    const q = busqueda.trim().toLowerCase()
    return passFiltro&&(!q||c.producto?.toLowerCase().includes(q)||c.nro?.toLowerCase().includes(q))
  })

  return (
    <div style={{background:"#040c18",minHeight:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#dce8f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:#070e1b} ::-webkit-scrollbar-thumb{background:#1a2d45;border-radius:3px}
        .card{background:#0a1525;border:1px solid #162035;border-radius:18px;overflow:hidden;transition:all .2s}
        .card:hover{border-color:#c9a05525;box-shadow:0 8px 32px #00000040}
        .tab-btn{background:transparent;border:none;cursor:pointer;padding:8px 16px 10px;font-size:12px;font-weight:600;border-radius:0;transition:all .2s;font-family:inherit;border-bottom:2px solid transparent}
        .tab-btn.active{color:#c9a055;border-bottom-color:#c9a055}
        .tab-btn:not(.active){color:#3a4a5a}
        .filtro-btn{background:transparent;border:1px solid #162035;cursor:pointer;padding:7px 16px;font-size:12px;font-weight:600;border-radius:20px;transition:all .2s;font-family:inherit;color:#4a5a6a}
        .filtro-btn.active{background:#c9a05520;border-color:#c9a05550;color:#c9a055}
        .filtro-btn:hover:not(.active){border-color:#2a3a4a;color:#8a9aaa}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .anim-in{animation:fadeIn .3s ease forwards}
        .live-dot{width:7px;height:7px;border-radius:50%;background:#0d9870;display:inline-block;animation:pulse 2s infinite}
        @media(max-width:640px){.stats-grid{grid-template-columns:1fr 1fr!important}.check-grid{grid-template-columns:1fr!important}.header-row{flex-wrap:wrap;height:auto!important;padding:12px 0!important;gap:10px}}
      `}</style>

      {/* HEADER */}
      <div style={{background:"linear-gradient(180deg,#08111f,#060d19)",borderBottom:"1px solid #0f1e30",padding:"0 20px",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 24px #000a"}}>
        <div className="header-row" style={{maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:58}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,background:"linear-gradient(135deg,#c9a055,#7a5a20)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 2px 14px #c9a05535"}}>🌏</div>
            <div>
              <div style={{fontWeight:800,fontSize:14,letterSpacing:1,color:"#dce8f0",fontFamily:"'DM Serif Display',serif"}}>ZAGA Import</div>
              <div style={{fontSize:8,color:"#c9a05560",letterSpacing:2,textTransform:"uppercase"}}>Portal de seguimiento</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:"#0d9870",fontWeight:700,background:"#0d987018",borderRadius:20,padding:"4px 12px",border:"1px solid #0d987030"}}>
              <span className="live-dot" style={{marginRight:5}}/>En vivo
            </span>
            <span style={{fontSize:12,color:"#c9a055",fontWeight:700,background:"#c9a05514",borderRadius:20,padding:"4px 14px",border:"1px solid #c9a05530"}}>👤 {perfil.nombre}</span>
            <button onClick={onLogout} style={{background:"transparent",color:"#3a4a5a",border:"1px solid #162035",borderRadius:8,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:600}}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 20px"}}>
        {loading ? (
          <div style={{textAlign:"center",padding:80,color:"#4a5a6a"}}>
            <div style={{fontSize:36,marginBottom:12,animation:"pulse 1.5s infinite"}}>🌏</div>
            <div>Cargando tus importaciones...</div>
          </div>
        ) : todas.length===0 ? (
          <div style={{textAlign:"center",padding:80}}>
            <div style={{fontSize:64,marginBottom:16}}>📦</div>
            <div style={{fontSize:20,fontWeight:800,color:"#c9a055",fontFamily:"'DM Serif Display',serif",marginBottom:8}}>¡Bienvenido, {perfil.nombre}!</div>
            <div style={{fontSize:13,color:"#4a5a6a",lineHeight:1.6}}>Tus importaciones aparecerán aquí<br/>en cuanto estén registradas.</div>
          </div>
        ) : (<>
          {/* BIENVENIDA */}
          <div style={{marginBottom:20}} className="anim-in">
            <div style={{fontSize:22,fontWeight:800,color:"#dce8f0",fontFamily:"'DM Serif Display',serif"}}>Hola, {perfil.nombre} 👋</div>
            <div style={{fontSize:13,color:"#4a5a6a",marginTop:3}}>
              {enProceso.length>0?`Tienes ${enProceso.length} importación${enProceso.length>1?"es":""} activa${enProceso.length>1?"s":""}.`:completadas.length>0?"Todas tus importaciones están completadas.":"Bienvenido a tu portal."}
            </div>
          </div>

          {/* ALERTA PAGOS */}
          {pagosPendientes.length>0&&(
            <div className="anim-in" style={{background:"#1a060318",border:"1px solid #c0392b40",borderRadius:14,padding:"13px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:22}}>⚠️</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#e74c3c",marginBottom:1}}>Tienes pagos pendientes</div>
                <div style={{fontSize:11,color:"#8a4a3a"}}>{pagosPendientes.map(c=>c.producto).join(" · ")}</div>
              </div>
            </div>
          )}

          {/* PRÓXIMA LLEGADA */}
          {proximaLlegada&&(()=>{
            const dias=diasRestantes(proximaLlegada.fecha_llegada_est)
            return(
              <div className="anim-in" style={{background:"linear-gradient(135deg,#081a30,#050f1f)",border:"1px solid #c9a05530",borderRadius:14,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontSize:30}}>🚢</div>
                  <div>
                    <div style={{fontSize:10,color:"#c9a055",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Próxima llegada estimada</div>
                    <div style={{fontSize:14,fontWeight:700,color:"#dce8f0"}}>{proximaLlegada.producto}</div>
                    <div style={{fontSize:11,color:"#4a5a6a",marginTop:2}}>{fmtDate(proximaLlegada.fecha_llegada_est)}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:34,fontWeight:800,color:dias<=15?"#e08c30":dias<=30?"#c9a055":"#6a9fd4",lineHeight:1}}>{dias!=null?(dias>0?dias:"¡Hoy!"):"–"}</div>
                  {dias>0&&<div style={{fontSize:10,color:"#4a5a6a"}}>días restantes</div>}
                </div>
              </div>
            )
          })()}

          {/* STATS */}
          <div className="stats-grid anim-in" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[
              {label:"Total",value:todas.length,icon:"📦",color:"#6a9fd4"},
              {label:"En proceso",value:enProceso.length,icon:"⚙️",color:"#e08c30"},
              {label:"En camino",value:enCamino.length,icon:"🚢",color:"#a85590"},
              {label:"Completadas",value:completadas.length,icon:"✅",color:"#0d9870"},
            ].map(s=>(
              <div key={s.label} style={{background:"#0a1525",border:`1px solid ${s.color}20`,borderRadius:14,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:8,right:10,fontSize:20,opacity:.12}}>{s.icon}</div>
                <div style={{fontSize:10,color:s.color,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:28,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* TOTAL INVERTIDO */}
          <div className="anim-in" style={{background:"linear-gradient(135deg,#0d1a2e,#080f1c)",border:"1px solid #c9a05522",borderRadius:14,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:11,color:"#c9a055",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>💰 Total invertido con ZAGA</div>
              <div style={{fontSize:11,color:"#2a3a4a",marginTop:2}}>Suma acumulada de todas tus importaciones</div>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:"#c9a055",fontFamily:"'DM Serif Display',serif"}}>{fmt(totalInvertido)}</div>
          </div>

          {/* FILTROS */}
          <div className="anim-in" style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            {FILTROS.map(f=>(
              <button key={f.key} className={`filtro-btn${filtro===f.key?" active":""}`} onClick={()=>setFiltro(f.key)}>
                {f.label}
              </button>
            ))}
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Buscar producto..."
              style={{flex:1,minWidth:140,background:"#0a1525",border:"1px solid #162035",borderRadius:20,color:"#dce8f0",padding:"7px 16px",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
          </div>

          {/* LISTA */}
          {filtradas.length===0?(
            <div style={{textAlign:"center",padding:48,color:"#3a4a5a"}}>
              <div style={{fontSize:32,marginBottom:8}}>🔍</div>
              <div style={{fontSize:13}}>No hay importaciones que coincidan</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {filtradas.map((c,idx)=>{
                const isOpen=openId===c.id
                const color=EST_COLOR[c.estado]||"#6a9fd4"
                const icon=EST_ICON[c.estado]||"📦"
                const label=EST_LABEL[c.estado]||c.estado
                const cl=c.calc, conIva=!!c.con_iva
                const p1=cl?(conIva?(cl.p1ClIva||cl.p1Cl||0):(cl.p1Cl||0)):0
                const p2=cl?(conIva?(cl.p2ClIva||cl.p2Cl||0):(cl.p2Cl||0)):0
                const tot=cl?(conIva?(cl.totClIva||cl.totCl||0):(cl.totCl||0)):0
                const pagado1=c.checklist?.pago1_cliente, pagado2=c.checklist?.pago2_cliente
                const done=CHECKLIST_FULL.filter(d=>c.checklist?.[d.key]).length
                const pct=Math.round((done/CHECKLIST_FULL.length)*100)
                const dias=c.fecha_llegada_est&&!['completada','en_bodega'].includes(c.estado)?diasRestantes(c.fecha_llegada_est):null
                const pasoActual=TIMELINE.findIndex(t=>!c.checklist?.[t.key])
                const tab=getTab(c.id)

                return(
                  <div key={c.id} className="card anim-in" style={{animationDelay:`${idx*0.04}s`}}>
                    {/* CARD HEADER */}
                    <div onClick={()=>setOpenId(isOpen?null:c.id)} style={{padding:"16px 20px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                          <span style={{background:color+"18",color,fontSize:11,fontWeight:700,borderRadius:20,padding:"3px 10px",border:`1px solid ${color}35`}}>{icon} {label}</span>
                          <span style={{fontSize:11,color:"#2a3a4a",fontWeight:600}}>{c.nro}</span>
                          {dias!==null&&dias<=30&&(
                            <span style={{background:dias<=7?"#c0392b18":dias<=15?"#e08c3018":"#1a2d4522",color:dias<=7?"#e74c3c":dias<=15?"#e08c30":"#6a9fd4",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:`1px solid ${dias<=7?"#c0392b33":dias<=15?"#e08c3033":"#1a2d4555"}`}}>
                              {dias<=0?"¡Llega hoy!":`${dias}d para llegar`}
                            </span>
                          )}
                        </div>
                        <div style={{fontSize:15,fontWeight:700,color:"#dce8f0",marginBottom:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.producto}</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {c.unidades&&<span style={{fontSize:11,color:"#3a5060",background:"#0d1a25",borderRadius:6,padding:"2px 8px"}}>📦 {fmtN(c.unidades)} und</span>}
                          {c.transporte&&<span style={{fontSize:11,color:"#3a5060",background:"#0d1a25",borderRadius:6,padding:"2px 8px"}}>{c.transporte==='aereo'?'✈️ Aéreo':c.transporte==='ambos'?'🚢✈️ Ambos':'🚢 Marítimo'}</span>}
                          {c.fecha_solicitud&&<span style={{fontSize:11,color:"#3a5060",background:"#0d1a25",borderRadius:6,padding:"2px 8px"}}>📅 {fmtDate(c.fecha_solicitud)}</span>}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <span style={{fontSize:11,color:"#2a3a4a",fontWeight:600}}>{pct}%</span>
                          <div style={{width:56,height:5,background:"#0d1a25",borderRadius:3,overflow:"hidden"}}>
                            <div style={{width:`${pct}%`,height:"100%",background:c.estado==='completada'?"#0d9870":color,borderRadius:3,transition:"width .4s"}}/>
                          </div>
                        </div>
                        {tot>0&&<div style={{fontSize:14,fontWeight:800,color:"#c9a055"}}>{fmt(tot)}</div>}
                        <div style={{fontSize:16,color:"#1a2d45",transition:"transform .2s",transform:isOpen?"rotate(180deg)":"none"}}>⌄</div>
                      </div>
                    </div>

                    {/* DETALLE */}
                    {isOpen&&(
                      <div style={{borderTop:"1px solid #0f1e30"}}>
                        {/* Tabs */}
                        <div style={{display:"flex",padding:"0 20px",borderBottom:"1px solid #0f1e30",gap:4}}>
                          {[["timeline","🗺️ Seguimiento"],["pagos","💳 Pagos"],["detalle","📋 Detalle"]].map(([k,l])=>(
                            <button key={k} className={`tab-btn${tab===k?" active":""}`} onClick={()=>setTab(c.id,k)}>{l}</button>
                          ))}
                        </div>

                        <div style={{padding:"18px 20px"}}>

                          {/* TAB TIMELINE */}
                          {tab==="timeline"&&(
                            <div>
                              <div style={{overflowX:"auto",paddingBottom:8}}>
                                <div style={{display:"flex",alignItems:"flex-start",minWidth:"max-content",padding:"4px 2px"}}>
                                  {TIMELINE.map((step,i)=>{
                                    const checked=c.checklist?.[step.key]
                                    const isCurrent=i===pasoActual&&pasoActual>=0
                                    const isPast=pasoActual>=0?i<pasoActual:checked
                                    return(
                                      <div key={step.key} style={{display:"flex",alignItems:"center"}}>
                                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,width:68}}>
                                          <div style={{width:34,height:34,borderRadius:"50%",background:checked?"#0d987020":isCurrent?color+"25":"#0d1a25",border:`2px solid ${checked?"#0d9870":isCurrent?color:"#162035"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,position:"relative",boxShadow:isCurrent?`0 0 14px ${color}40`:"none",transition:"all .3s"}}>
                                            {step.icon}
                                            {checked&&<div style={{position:"absolute",bottom:-2,right:-2,width:13,height:13,borderRadius:"50%",background:"#0d9870",border:"2px solid #040c18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",fontWeight:800}}>✓</div>}
                                          </div>
                                          <div style={{fontSize:9,color:checked?"#0d9870":isCurrent?color:"#2a3a4a",fontWeight:checked||isCurrent?700:400,textAlign:"center",lineHeight:1.3,width:66}}>{step.label}</div>
                                        </div>
                                        {i<TIMELINE.length-1&&<div style={{width:16,height:2,background:(isPast||checked)&&i<pasoActual-1?"#0d9870":"#0d1a25",marginTop:-18,flexShrink:0}}/>}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                              {/* Estado actual */}
                              <div style={{marginTop:14,background:`${color}10`,border:`1px solid ${color}28`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                                <div style={{fontSize:22}}>{icon}</div>
                                <div>
                                  <div style={{fontSize:10,color:"#4a5a6a",marginBottom:1}}>Estado actual</div>
                                  <div style={{fontSize:14,fontWeight:700,color}}>{label}</div>
                                  {c.fecha_llegada_est&&!['completada','en_bodega'].includes(c.estado)&&(
                                    <div style={{fontSize:11,color:"#4a5a6a",marginTop:2}}>
                                      Llegada estimada: <span style={{color:"#c9a055",fontWeight:600}}>{fmtDate(c.fecha_llegada_est)}</span>
                                      {dias!==null&&dias>0&&<span style={{color:"#6a9fd4"}}> · {dias} días</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {c.estado==='completada'&&(
                                <div style={{marginTop:12,background:"#0d987015",border:"1px solid #0d987035",borderRadius:12,padding:"14px",textAlign:"center"}}>
                                  <div style={{fontSize:26,marginBottom:4}}>🏁</div>
                                  <div style={{fontSize:14,fontWeight:700,color:"#0d9870"}}>¡Importación completada!</div>
                                  {c.fecha_llegada_real&&<div style={{fontSize:11,color:"#4a5a6a",marginTop:2}}>Completada el {fmtDate(c.fecha_llegada_real)}</div>}
                                </div>
                              )}
                            </div>
                          )}

                          {/* TAB PAGOS */}
                          {tab==="pagos"&&(
                            <div style={{display:"flex",flexDirection:"column",gap:10}}>
                              <div style={{background:"#0d1a25",borderRadius:10,padding:"13px 16px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                                  <span style={{fontSize:11,color:"#4a5a6a"}}>Progreso de pago</span>
                                  <span style={{fontSize:11,color:"#c9a055",fontWeight:700}}>{pagado1&&pagado2?"100%":pagado1?"30%":"0%"} completado</span>
                                </div>
                                <div style={{height:7,background:"#162035",borderRadius:4,overflow:"hidden"}}>
                                  <div style={{width:pagado1&&pagado2?"100%":pagado1?"30%":"0%",height:"100%",background:"linear-gradient(90deg,#c9a055,#0d9870)",borderRadius:4,transition:"width .5s"}}/>
                                </div>
                              </div>
                              {[
                                {label:`1er pago · ${c.pct_deposito||30}% del total`,amount:p1,paid:pagado1,pending:"Pendiente de pago",done:"✓ Pagado y confirmado",note:""},
                                {label:`2do pago · ${100-(c.pct_deposito||30)}% del total`,amount:p2,paid:pagado2,pending:"Se paga al recibir la mercadería",done:"✓ Pagado y confirmado",note:""},
                              ].map((row,i)=>(
                                <div key={i} style={{background:row.paid?"#0d987012":"#0d1a25",border:`1px solid ${row.paid?"#0d987030":"#162035"}`,borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                  <div>
                                    <div style={{fontSize:11,color:"#4a5a6a",marginBottom:3}}>{row.label}</div>
                                    <div style={{fontSize:20,fontWeight:800,color:row.paid?"#0d9870":"#dce8f0"}}>{fmt(row.amount)}</div>
                                    <div style={{fontSize:10,color:row.paid?"#0d9870":"#4a5a6a",marginTop:3,fontWeight:row.paid?600:400}}>{row.paid?row.done:row.pending}</div>
                                  </div>
                                  <div style={{width:42,height:42,borderRadius:"50%",background:row.paid?"#0d987018":"#162035",border:`2px solid ${row.paid?"#0d9870":"#1a2d45"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                                    {row.paid?"✅":"⏳"}
                                  </div>
                                </div>
                              ))}
                              <div style={{background:"linear-gradient(135deg,#0d1520,#080e1a)",border:"1px solid #c9a05528",borderRadius:12,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                <div>
                                  <div style={{fontSize:11,color:"#c9a055",fontWeight:700,marginBottom:1}}>Total importación</div>
                                  <div style={{fontSize:11,color:"#2a3a4a"}}>{c.unidades?`${fmtN(c.unidades)} unidades`:""}{conIva?" · Con IVA":""}</div>
                                </div>
                                <div style={{fontSize:22,fontWeight:800,color:"#c9a055",fontFamily:"'DM Serif Display',serif"}}>{fmt(tot)}</div>
                              </div>
                            </div>
                          )}

                          {/* TAB DETALLE */}
                          {tab==="detalle"&&(
                            <div style={{display:"flex",flexDirection:"column",gap:10}}>
                              <div className="check-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                                {CHECKLIST_FULL.map((step,i)=>{
                                  const checked=c.checklist?.[step.key]
                                  return(
                                    <div key={step.key} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,background:checked?"#0d987010":"#0d1a25",border:`1px solid ${checked?"#0d987022":"#0f1e30"}`}}>
                                      <div style={{width:17,height:17,borderRadius:5,background:checked?"#0d9870":"transparent",border:`2px solid ${checked?"#0d9870":"#1a2d45"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",flexShrink:0,fontWeight:800}}>{checked?"✓":""}</div>
                                      <span style={{fontSize:11,color:checked?"#1aa358":"#3a4a5a",lineHeight:1.3}}>{step.icon} {step.label}</span>
                                    </div>
                                  )
                                })}
                              </div>
                              {c.variantes&&(
                                <div style={{background:"#0d1a25",borderRadius:10,padding:"12px 14px",border:"1px solid #162035"}}>
                                  <div style={{fontSize:10,color:"#c9a055",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>🎨 Especificaciones</div>
                                  <div style={{fontSize:12,color:"#6a7a8a",whiteSpace:"pre-line",lineHeight:1.7}}>{c.variantes}</div>
                                </div>
                              )}
                              {c.notas&&(
                                <div style={{background:"#0d1a25",borderRadius:10,padding:"12px 14px",border:"1px solid #162035"}}>
                                  <div style={{fontSize:10,color:"#6a9fd4",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>📝 Notas</div>
                                  <div style={{fontSize:12,color:"#6a7a8a",lineHeight:1.7}}>{c.notas}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>)}

        <div style={{textAlign:"center",marginTop:48,fontSize:11,color:"#0f1e30"}}>ZAGA Import · zagaimp.com · {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}
