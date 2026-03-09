import { useState, useEffect } from 'react'

const EST_LABEL = {
  solicitud:"Solicitud recibida", enviado_china:"Enviado a proveedor",
  respuesta_china:"Cotizando en China", enviada_cliente:"Cotizacion lista",
  re_testeando:"En revision", en_negociacion:"En negociacion",
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
  {key:"enviado_china",label:"Enviado",icon:"📨"},
  {key:"respuesta_china",label:"Cotizado",icon:"🇨🇳"},
  {key:"cliente_acepto",label:"Aceptado",icon:"✅"},
  {key:"pago1_cliente",label:"1er pago",icon:"💳"},
  {key:"pago_china",label:"Pagado",icon:"🏦"},
  {key:"en_produccion",label:"Produccion",icon:"🏭"},
  {key:"ctrl_calidad",label:"Calidad OK",icon:"🔍"},
  {key:"despachado",label:"Despachado",icon:"🚀"},
  {key:"llego_chile",label:"En Chile",icon:"🛬"},
  {key:"pago2_cliente",label:"2do pago",icon:"💳"},
  {key:"retirado_bodega",label:"Completado",icon:"🏁"},
]
const CHECKLIST_FULL = [
  {key:"enviado_china",label:"Solicitud enviada al proveedor",icon:"📨"},
  {key:"respuesta_china",label:"Cotizacion del proveedor recibida",icon:"🇨🇳"},
  {key:"cot_enviada",label:"Propuesta enviada",icon:"📋"},
  {key:"cliente_acepto",label:"Propuesta aceptada",icon:"✅"},
  {key:"pago1_cliente",label:"1er pago recibido",icon:"💳"},
  {key:"pago_china",label:"Pago al proveedor realizado",icon:"🏦"},
  {key:"en_produccion",label:"En proceso de produccion",icon:"🏭"},
  {key:"almacen_china",label:"En almacen China",icon:"📦"},
  {key:"ctrl_calidad",label:"Control de calidad aprobado",icon:"🔍"},
  {key:"despachado",label:"Despachado desde China",icon:"🚀"},
  {key:"llego_chile",label:"Llego a Chile",icon:"🛬"},
  {key:"pago2_cliente",label:"2do pago recibido",icon:"💳"},
  {key:"retirado_bodega",label:"Importacion completada",icon:"🏁"},
]
const fmt = n => !n&&n!==0?"$0":Number(n).toLocaleString("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0})
const fmtN = n => Number(n).toLocaleString("es-CL",{maximumFractionDigits:0})
const fmtDate = d => { try{ return new Date(d+'T12:00:00').toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}) }catch(e){ return d } }
const getDias = d => { try{ return Math.ceil((new Date(d+'T12:00:00')-new Date())/(1000*60*60*24)) }catch(e){ return null } }
const FILTROS = [{key:"todas",label:"Todas"},{key:"en_proceso",label:"En proceso"},{key:"en_camino",label:"En camino"},{key:"completada",label:"Completadas"}]

function RondaNeg(props) {
  var r = props.r
  var i = props.i
  var borderColor = "#1a2d45"
  if (r.estado === "aplicada") borderColor = "#1aa35830"
  if (r.estado === "rechazada") borderColor = "#c0392b25"
  var border = "1px solid " + borderColor
  return (
    <div style={{background:"#08111f",borderRadius:8,padding:"10px 12px",border:border,marginBottom:6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,marginBottom:r.nota?6:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#8a9aaa"}}>Ronda {i+1} · {r.fecha}</span>
          {r.estado==="aplicada" && <span style={{fontSize:9,fontWeight:700,color:"#1aa358",background:"#1aa35818",borderRadius:10,padding:"2px 8px",border:"1px solid #1aa35830"}}>Aplicada</span>}
          {r.estado==="rechazada" && <span style={{fontSize:9,fontWeight:700,color:"#e74c3c",background:"#c0392b18",borderRadius:10,padding:"2px 8px",border:"1px solid #c0392b30"}}>Rechazada</span>}
          {r.estado==="pendiente" && <span style={{fontSize:9,fontWeight:700,color:"#c9a055",background:"#c9a05518",borderRadius:10,padding:"2px 8px",border:"1px solid #c9a05530"}}>En revision</span>}
        </div>
        <div style={{display:"flex",gap:10}}>
          {r.unidades_prop && <span style={{fontSize:11,color:"#8a9aaa"}}>📦 {r.unidades_prop} und</span>}
          {r.precio_prop && <span style={{fontSize:11,color:"#c9a055",fontWeight:600}}>Precio propuesto</span>}
        </div>
      </div>
      {r.nota && <div style={{fontSize:12,color:"#8a9aaa",lineHeight:1.6}}>{r.nota}</div>}
    </div>
  )
}

export default function ClientePortal({ supabase, perfil, onLogout }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [filtro, setFiltro] = useState("todas")
  const [busqueda, setBusqueda] = useState("")
  const [tabs, setTabs] = useState({})

  useEffect(() => {
    cargar()
    var canal = supabase.channel('zaga_cliente_rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'cotizaciones'},()=>cargar())
      .subscribe()
    return function() { supabase.removeChannel(canal) }
  }, [])

  var cargar = async function() {
    var result = await supabase.from('cotizaciones').select('datos').order('created_at',{ascending:false})
    if(result.data && !result.error) {
      setCotizaciones(result.data.map(function(r){ return typeof r.datos==='string'?JSON.parse(r.datos):r.datos }))
    }
    setLoading(false)
  }

  var getTab = function(id) { return tabs[id] || "timeline" }
  var setTab = function(id, t) { setTabs(function(p){ var n={...p}; n[id]=t; return n }) }

  var todas = cotizaciones.filter(function(c){ return !['anulada','no_procesada','rechazada_cliente'].includes(c.estado) })
  var enProceso = todas.filter(function(c){ return !['completada','solicitud'].includes(c.estado) })
  var enCamino = todas.filter(function(c){ return c.estado==='en_camino' })
  var completadas = todas.filter(function(c){ return c.estado==='completada' })
  var totalInvertido = todas.filter(function(c){ return c.checklist && c.checklist.pago1_cliente }).reduce(function(s,c){
    if(!c.calc) return s
    return s + (c.con_iva ? (c.calc.totClIva||c.calc.totCl||0) : (c.calc.totCl||0))
  },0)
  var pendientesConf = todas.filter(function(c){ return c.calc && !c.checklist?.pago1_cliente && !['solicitud','rechazada_cliente','anulada','no_procesada'].includes(c.estado) })
  var proxLlegada = enProceso.filter(function(c){ return c.fecha_llegada_est }).sort(function(a,b){ return new Date(a.fecha_llegada_est)-new Date(b.fecha_llegada_est) })[0]

  var abrirCot = function(id) {
    setFiltro("todas")
    setOpenId(id)
    setTimeout(function(){
      var el = document.getElementById("cot-"+id)
      if(el) el.scrollIntoView({behavior:"smooth",block:"center"})
    }, 150)
  }

  var filtradas = todas.filter(function(c){
    var pF = filtro==="todas" ? true : filtro==="en_proceso" ? !['completada','solicitud','en_camino'].includes(c.estado) : filtro==="en_camino" ? c.estado==='en_camino' : c.estado==='completada'
    var q = busqueda.trim().toLowerCase()
    return pF && (!q || (c.producto&&c.producto.toLowerCase().includes(q)) || (c.nro&&c.nro.toLowerCase().includes(q)))
  })

  return (
    <div style={{background:"#040c18",minHeight:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#dce8f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#070e1b}
        ::-webkit-scrollbar-thumb{background:#1a2d45;border-radius:3px}
        .zcard{background:#0a1525;border:1px solid #162035;border-radius:18px;overflow:hidden;transition:all .2s}
        .zcard:hover{border-color:#c9a05525;box-shadow:0 8px 32px #00000040}
        .ztab{background:transparent;border:none;cursor:pointer;padding:8px 16px 10px;font-size:12px;font-weight:600;border-bottom:2px solid transparent;color:#3a4a5a;font-family:inherit;transition:all .2s}
        .ztab.on{color:#c9a055;border-bottom-color:#c9a055}
        .zfbtn{background:transparent;border:1px solid #162035;cursor:pointer;padding:7px 16px;font-size:12px;font-weight:600;border-radius:20px;font-family:inherit;color:#4a5a6a;transition:all .2s}
        .zfbtn.on{background:#c9a05520;border-color:#c9a05550;color:#c9a055}
        .zfbtn:hover{border-color:#2a3a4a;color:#8a9aaa}
        @keyframes zpulse{0%,100%{opacity:1}50%{opacity:.4}}
        .zdot{width:7px;height:7px;border-radius:50%;background:#0d9870;display:inline-block;animation:zpulse 2s infinite}
      `}</style>

      {/* HEADER */}
      <div style={{background:"linear-gradient(180deg,#08111f,#060d19)",borderBottom:"1px solid #0f1e30",padding:"0 20px",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 24px #000a"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,flexWrap:"wrap",gap:8,padding:"8px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,background:"linear-gradient(135deg,#c9a055,#7a5a20)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🌏</div>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:"#dce8f0",fontFamily:"'DM Serif Display',serif"}}>ZAGA Import</div>
              <div style={{fontSize:8,color:"#c9a05560",letterSpacing:2,textTransform:"uppercase"}}>Portal de seguimiento</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:"#0d9870",fontWeight:700,background:"#0d987018",borderRadius:20,padding:"4px 12px",border:"1px solid #0d987030"}}>
              <span className="zdot" style={{marginRight:5}}/>En vivo
            </span>
            <span style={{fontSize:12,color:"#c9a055",fontWeight:700,background:"#c9a05514",borderRadius:20,padding:"4px 14px",border:"1px solid #c9a05530"}}>👤 {perfil.nombre}</span>
            <button onClick={onLogout} style={{background:"transparent",color:"#3a4a5a",border:"1px solid #162035",borderRadius:8,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:600}}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 20px"}}>

        {loading ? (
          <div style={{textAlign:"center",padding:80,color:"#4a5a6a"}}>
            <div style={{fontSize:36,marginBottom:12}}>🌏</div>
            <div>Cargando tus importaciones...</div>
          </div>
        ) : todas.length===0 ? (
          <div style={{textAlign:"center",padding:80}}>
            <div style={{fontSize:64,marginBottom:16}}>📦</div>
            <div style={{fontSize:20,fontWeight:800,color:"#c9a055",fontFamily:"'DM Serif Display',serif",marginBottom:8}}>Bienvenido, {perfil.nombre}!</div>
            <div style={{fontSize:13,color:"#7a8a9a",lineHeight:1.6}}>Tus importaciones apareceran aqui en cuanto esten registradas.</div>
          </div>
        ) : (
          <div>
            {/* BIENVENIDA */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:22,fontWeight:800,color:"#dce8f0",fontFamily:"'DM Serif Display',serif"}}>Hola, {perfil.nombre} 👋</div>
              <div style={{fontSize:13,color:"#8a9aaa",marginTop:3}}>
                {enProceso.length>0 ? "Tienes "+enProceso.length+" importacion"+(enProceso.length>1?"es":"")+" activa"+(enProceso.length>1?"s":"")+".":"Todas tus importaciones estan al dia."}
              </div>
            </div>

            {/* ALERTA PENDIENTES CONFIRMACION */}
            {pendientesConf.length>0 && (
              <div style={{background:"#0d1a2e",border:"1px solid #c9a05535",borderRadius:14,padding:"14px 18px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span style={{fontSize:18}}>🔔</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#c9a055"}}>Cotizaciones pendientes de confirmacion</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {pendientesConf.map(function(c){
                    return (
                      <div key={c.id} onClick={function(){ abrirCot(c.id) }}
                        style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#08111f",border:"1px solid #c9a05520",borderRadius:10,padding:"10px 14px",cursor:"pointer"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{background:"#c9a05520",color:"#c9a055",fontSize:11,fontWeight:800,borderRadius:8,padding:"3px 10px",border:"1px solid #c9a05530"}}>{c.nro}</span>
                          <span style={{fontSize:12,color:"#8a9aaa"}}>{c.producto}</span>
                        </div>
                        <span style={{fontSize:11,color:"#c9a055",fontWeight:600}}>Ver →</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* PROXIMA LLEGADA */}
            {proxLlegada && (function(){
              var dias = getDias(proxLlegada.fecha_llegada_est)
              var dColor = dias<=15?"#e08c30":dias<=30?"#c9a055":"#6a9fd4"
              return (
                <div style={{background:"linear-gradient(135deg,#081a30,#050f1f)",border:"1px solid #c9a05530",borderRadius:14,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:30}}>🚢</span>
                    <div>
                      <div style={{fontSize:10,color:"#c9a055",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Proxima llegada estimada</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#dce8f0"}}>{proxLlegada.producto}</div>
                      <div style={{fontSize:11,color:"#8a9aaa",marginTop:2}}>{fmtDate(proxLlegada.fecha_llegada_est)}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:34,fontWeight:800,color:dColor,lineHeight:1}}>{dias!=null?(dias>0?dias:"Hoy!"):"?"}</div>
                    {dias>0 && <div style={{fontSize:10,color:"#8a9aaa"}}>dias restantes</div>}
                  </div>
                </div>
              )
            })()}

            {/* STATS */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
              {[
                {label:"Total",value:todas.length,icon:"📦",color:"#6a9fd4"},
                {label:"En proceso",value:enProceso.length,icon:"⚙️",color:"#e08c30"},
                {label:"En camino",value:enCamino.length,icon:"🚢",color:"#a85590"},
                {label:"Completadas",value:completadas.length,icon:"✅",color:"#0d9870"},
              ].map(function(s){
                return (
                  <div key={s.label} style={{background:"#0a1525",border:"1px solid "+s.color+"20",borderRadius:14,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:8,right:10,fontSize:20,opacity:.12}}>{s.icon}</div>
                    <div style={{fontSize:10,color:s.color,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{s.label}</div>
                    <div style={{fontSize:28,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
                  </div>
                )
              })}
            </div>

            {/* TOTAL INVERTIDO */}
            <div style={{background:"linear-gradient(135deg,#0d1a2e,#080f1c)",border:"1px solid #c9a05522",borderRadius:14,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:11,color:"#c9a055",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>💰 Total invertido con ZAGA</div>
                <div style={{fontSize:11,color:"#6a7a8a",marginTop:2}}>Solo importaciones con primer pago confirmado</div>
              </div>
              <div style={{fontSize:28,fontWeight:800,color:"#c9a055",fontFamily:"'DM Serif Display',serif"}}>{fmt(totalInvertido)}</div>
            </div>

            {/* FILTROS */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              {FILTROS.map(function(f){
                return <button key={f.key} className={"zfbtn"+(filtro===f.key?" on":"")} onClick={function(){ setFiltro(f.key) }}>{f.label}</button>
              })}
              <input value={busqueda} onChange={function(e){ setBusqueda(e.target.value) }} placeholder="🔍 Buscar producto..."
                style={{flex:1,minWidth:140,background:"#0a1525",border:"1px solid #162035",borderRadius:20,color:"#dce8f0",padding:"7px 16px",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
            </div>

            {/* LISTA */}
            {filtradas.length===0 ? (
              <div style={{textAlign:"center",padding:48,color:"#3a4a5a"}}>
                <div style={{fontSize:32,marginBottom:8}}>🔍</div>
                <div>No hay importaciones que coincidan</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {filtradas.map(function(c, idx){
                  var isOpen = openId===c.id
                  var color = EST_COLOR[c.estado]||"#6a9fd4"
                  var icon = EST_ICON[c.estado]||"📦"
                  var label = EST_LABEL[c.estado]||c.estado
                  var cl = c.calc
                  var conIva = !!c.con_iva
                  var p1 = cl?(conIva?(cl.p1ClIva||cl.p1Cl||0):(cl.p1Cl||0)):0
                  var p2 = cl?(conIva?(cl.p2ClIva||cl.p2Cl||0):(cl.p2Cl||0)):0
                  var tot = cl?(conIva?(cl.totClIva||cl.totCl||0):(cl.totCl||0)):0
                  var pagado1 = c.checklist&&c.checklist.pago1_cliente
                  var pagado2 = c.checklist&&c.checklist.pago2_cliente
                  var done = CHECKLIST_FULL.filter(function(d){ return c.checklist&&c.checklist[d.key] }).length
                  var pct = Math.round((done/CHECKLIST_FULL.length)*100)
                  var dias = (c.fecha_llegada_est&&!['completada','en_bodega'].includes(c.estado))?getDias(c.fecha_llegada_est):null
                  var pasoActual = TIMELINE.findIndex(function(t){ return !(c.checklist&&c.checklist[t.key]) })
                  var tab = getTab(c.id)
                  var pctPago = pagado1&&pagado2?100:pagado1?30:0

                  return (
                    <div key={c.id} id={"cot-"+c.id} className="zcard">
                      {/* HEADER CARD */}
                      <div onClick={function(){ setOpenId(isOpen?null:c.id) }} style={{padding:"16px 20px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                            <span style={{background:color+"18",color:color,fontSize:11,fontWeight:700,borderRadius:20,padding:"3px 10px",border:"1px solid "+color+"35"}}>{icon} {label}</span>
                            <span style={{fontSize:11,color:"#6a7a8a",fontWeight:600}}>{c.nro}</span>
                            {dias!==null&&dias<=30&&(
                              <span style={{background:dias<=7?"#c0392b18":"#1a2d4522",color:dias<=7?"#e74c3c":"#6a9fd4",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:"1px solid "+(dias<=7?"#c0392b33":"#1a2d4555")}}>
                                {dias<=0?"Llega hoy!":dias+"d para llegar"}
                              </span>
                            )}
                          </div>
                          <div style={{fontSize:15,fontWeight:700,color:"#dce8f0",marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.producto}</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {c.unidades&&<span style={{fontSize:11,color:"#7a9aaa",background:"#0d1a25",borderRadius:6,padding:"2px 8px"}}>📦 {fmtN(c.unidades)} und</span>}
                            {c.transporte&&<span style={{fontSize:11,color:"#7a9aaa",background:"#0d1a25",borderRadius:6,padding:"2px 8px"}}>{c.transporte==='aereo'?'✈️ Aereo':c.transporte==='ambos'?'🚢✈️ Ambos':'🚢 Maritimo'}</span>}
                            {c.fecha_solicitud&&<span style={{fontSize:11,color:"#7a9aaa",background:"#0d1a25",borderRadius:6,padding:"2px 8px"}}>📅 {fmtDate(c.fecha_solicitud)}</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <span style={{fontSize:11,color:"#7a8a9a",fontWeight:600}}>{pct}%</span>
                            <div style={{width:56,height:5,background:"#0d1a25",borderRadius:3,overflow:"hidden"}}>
                              <div style={{width:pct+"%",height:"100%",background:c.estado==='completada'?"#0d9870":color,borderRadius:3}}/>
                            </div>
                          </div>
                          {tot>0&&<div style={{fontSize:14,fontWeight:800,color:"#c9a055"}}>{fmt(tot)}</div>}
                          <div style={{fontSize:16,color:"#1a2d45",transition:"transform .2s",transform:isOpen?"rotate(180deg)":"none"}}>⌄</div>
                        </div>
                      </div>

                      {/* DETALLE */}
                      {isOpen&&(
                        <div style={{borderTop:"1px solid #0f1e30"}}>
                          <div style={{display:"flex",padding:"0 20px",borderBottom:"1px solid #0f1e30",gap:4}}>
                            {[["timeline","🗺️ Seguimiento"],["pagos","💳 Pagos"],["detalle","📋 Detalle"]].map(function(item){
                              return <button key={item[0]} className={"ztab"+(tab===item[0]?" on":"")} onClick={function(){ setTab(c.id,item[0]) }}>{item[1]}</button>
                            })}
                          </div>

                          <div style={{padding:"18px 20px"}}>

                            {/* TAB TIMELINE */}
                            {tab==="timeline"&&(
                              <div>
                                <div style={{overflowX:"auto",paddingBottom:8}}>
                                  <div style={{display:"flex",alignItems:"flex-start",minWidth:"max-content",padding:"4px 2px"}}>
                                    {TIMELINE.map(function(step,i){
                                      var checked = c.checklist&&c.checklist[step.key]
                                      var isCurrent = i===pasoActual&&pasoActual>=0
                                      var stepColor = checked?"#0d9870":isCurrent?color:"#162035"
                                      var textColor = checked?"#0d9870":isCurrent?color:"#4a5a6a"
                                      var bgColor = checked?"#0d987020":isCurrent?color+"25":"#0d1a25"
                                      return (
                                        <div key={step.key} style={{display:"flex",alignItems:"center"}}>
                                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,width:68}}>
                                            <div style={{width:34,height:34,borderRadius:"50%",background:bgColor,border:"2px solid "+stepColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,position:"relative"}}>
                                              {step.icon}
                                              {checked&&<div style={{position:"absolute",bottom:-2,right:-2,width:13,height:13,borderRadius:"50%",background:"#0d9870",border:"2px solid #040c18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",fontWeight:800}}>✓</div>}
                                            </div>
                                            <div style={{fontSize:9,color:textColor,fontWeight:checked||isCurrent?700:400,textAlign:"center",lineHeight:1.3,width:66}}>{step.label}</div>
                                          </div>
                                          {i<TIMELINE.length-1&&<div style={{width:16,height:2,background:checked&&i<pasoActual-1?"#0d9870":"#0d1a25",marginTop:-18,flexShrink:0}}/>}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                                <div style={{marginTop:14,background:color+"10",border:"1px solid "+color+"28",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                                  <span style={{fontSize:22}}>{icon}</span>
                                  <div>
                                    <div style={{fontSize:10,color:"#8a9aaa",marginBottom:1}}>Estado actual</div>
                                    <div style={{fontSize:14,fontWeight:700,color:color}}>{label}</div>
                                    {c.fecha_llegada_est&&!['completada','en_bodega'].includes(c.estado)&&(
                                      <div style={{fontSize:11,color:"#8a9aaa",marginTop:2}}>
                                        Llegada estimada: <span style={{color:"#c9a055",fontWeight:600}}>{fmtDate(c.fecha_llegada_est)}</span>
                                        {dias!==null&&dias>0&&<span style={{color:"#6a9fd4"}}> · {dias} dias</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {c.estado==='completada'&&(
                                  <div style={{marginTop:12,background:"#0d987015",border:"1px solid #0d987035",borderRadius:12,padding:"14px",textAlign:"center"}}>
                                    <div style={{fontSize:26,marginBottom:4}}>🏁</div>
                                    <div style={{fontSize:14,fontWeight:700,color:"#0d9870"}}>Importacion completada!</div>
                                    {c.fecha_llegada_real&&<div style={{fontSize:11,color:"#8a9aaa",marginTop:2}}>Completada el {fmtDate(c.fecha_llegada_real)}</div>}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* TAB PAGOS */}
                            {tab==="pagos"&&(
                              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                                <div style={{background:"#0d1a25",borderRadius:10,padding:"13px 16px"}}>
                                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                                    <span style={{fontSize:11,color:"#8a9aaa"}}>Progreso de pago</span>
                                    <span style={{fontSize:11,color:"#c9a055",fontWeight:700}}>{pctPago}% completado</span>
                                  </div>
                                  <div style={{height:7,background:"#162035",borderRadius:4,overflow:"hidden"}}>
                                    <div style={{width:pctPago+"%",height:"100%",background:"linear-gradient(90deg,#c9a055,#0d9870)",borderRadius:4,transition:"width .5s"}}/>
                                  </div>
                                </div>
                                {[
                                  {label:"1er pago · "+(c.pct_deposito||30)+"% del total",amount:p1,paid:pagado1,pendingMsg:"Pendiente de pago"},
                                  {label:"2do pago · "+(100-(c.pct_deposito||30))+"% del total",amount:p2,paid:pagado2,pendingMsg:"Se paga al recibir la mercaderia"},
                                ].map(function(row,ri){
                                  return (
                                    <div key={ri} style={{background:row.paid?"#0d987012":"#0d1a25",border:"1px solid "+(row.paid?"#0d987030":"#162035"),borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                      <div>
                                        <div style={{fontSize:11,color:"#8a9aaa",marginBottom:3}}>{row.label}</div>
                                        <div style={{fontSize:20,fontWeight:800,color:row.paid?"#0d9870":"#dce8f0"}}>{fmt(row.amount)}</div>
                                        <div style={{fontSize:10,color:row.paid?"#0d9870":"#7a8a9a",marginTop:3,fontWeight:row.paid?600:400}}>{row.paid?"Pagado y confirmado ✓":row.pendingMsg}</div>
                                      </div>
                                      <div style={{width:42,height:42,borderRadius:"50%",background:row.paid?"#0d987018":"#162035",border:"2px solid "+(row.paid?"#0d9870":"#1a2d45"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                                        {row.paid?"✅":"⏳"}
                                      </div>
                                    </div>
                                  )
                                })}
                                <div style={{background:"linear-gradient(135deg,#0d1520,#080e1a)",border:"1px solid #c9a05528",borderRadius:12,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                  <div>
                                    <div style={{fontSize:11,color:"#c9a055",fontWeight:700,marginBottom:1}}>Total importacion</div>
                                    <div style={{fontSize:11,color:"#6a7a8a"}}>{c.unidades?fmtN(c.unidades)+" unidades":""}{conIva?" · Con IVA":""}</div>
                                  </div>
                                  <div style={{fontSize:22,fontWeight:800,color:"#c9a055",fontFamily:"'DM Serif Display',serif"}}>{fmt(tot)}</div>
                                </div>
                              </div>
                            )}

                            {/* TAB DETALLE */}
                            {tab==="detalle"&&(
                              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                                  {CHECKLIST_FULL.map(function(step){
                                    var checked = c.checklist&&c.checklist[step.key]
                                    return (
                                      <div key={step.key} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,background:checked?"#0d987010":"#0d1a25",border:"1px solid "+(checked?"#0d987022":"#0f1e30")}}>
                                        <div style={{width:17,height:17,borderRadius:5,background:checked?"#0d9870":"transparent",border:"2px solid "+(checked?"#0d9870":"#1a2d45"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",flexShrink:0,fontWeight:800}}>{checked?"✓":""}</div>
                                        <span style={{fontSize:11,color:checked?"#1aa358":"#7a8a9a",lineHeight:1.3}}>{step.icon} {step.label}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                                {c.variantes&&(
                                  <div style={{background:"#0d1a25",borderRadius:10,padding:"12px 14px",border:"1px solid #162035"}}>
                                    <div style={{fontSize:10,color:"#c9a055",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>🎨 Especificaciones</div>
                                    <div style={{fontSize:12,color:"#8a9aaa",whiteSpace:"pre-line",lineHeight:1.7}}>{c.variantes}</div>
                                  </div>
                                )}
                                {c.notas&&(
                                  <div style={{background:"#0d1a25",borderRadius:10,padding:"12px 14px",border:"1px solid #162035"}}>
                                    <div style={{fontSize:10,color:"#6a9fd4",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>📝 Notas</div>
                                    <div style={{fontSize:12,color:"#8a9aaa",lineHeight:1.7}}>{c.notas}</div>
                                  </div>
                                )}
                                {c.negociacion_rondas&&c.negociacion_rondas.length>0&&(
                                  <div style={{background:"#0d1a25",borderRadius:10,padding:"12px 14px",border:"1px solid #b8922e30"}}>
                                    <div style={{fontSize:10,color:"#b8922e",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>💬 Historial de negociacion</div>
                                    {c.negociacion_rondas.map(function(r,i){
                                      return <RondaNeg key={i} r={r} i={i} />
                                    })}
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
          </div>
        )}

        <div style={{textAlign:"center",marginTop:48,fontSize:11,color:"#0f1e30"}}>ZAGA Import · zagaimp.com · {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}
