import { useState, useEffect } from 'react'
import LOGO_WHITE from "./logo-white.png"
import LOGO_DARK from "./logo-dark.png"

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
  solicitud:"#3b82f6", enviado_china:"#0ea5e9", respuesta_china:"#f59e0b",
  enviada_cliente:"#3b82f6", en_negociacion:"#f97316", re_testeando:"#3b82f6",
  rechazada_cliente:"#ef4444", anulada:"#94a3b8", aceptada:"#22c55e",
  no_procesada:"#ef4444", pagada_china:"#f97316", en_camino:"#a855f7",
  en_bodega:"#3b82f6", completada:"#16a34a",
}
const EST_BG = {
  solicitud:"#eff6ff", enviado_china:"#f0f9ff", respuesta_china:"#fffbeb",
  enviada_cliente:"#eff6ff", en_negociacion:"#fff7ed", re_testeando:"#eff6ff",
  rechazada_cliente:"#fef2f2", anulada:"#f9fafb", aceptada:"#f0fdf4",
  no_procesada:"#fef2f2", pagada_china:"#fff7ed", en_camino:"#faf5ff",
  en_bodega:"#eff6ff", completada:"#f0fdf4",
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
  {key:"ctrl_calidad",label:"Calidad",icon:"🔍"},
  {key:"despachado",label:"Despachado",icon:"🚀"},
  {key:"llego_chile",label:"En Chile",icon:"🛬"},
  {key:"pago2_cliente",label:"2do pago",icon:"💳"},
  {key:"retirado_bodega",label:"Completado",icon:"🏁"},
]
const CHECKLIST_FULL = [
  {key:"enviado_china",label:"Solicitud enviada al proveedor",icon:"📨"},
  {key:"respuesta_china",label:"Cotizacion del proveedor recibida",icon:"🇨🇳"},
  {key:"cot_enviada",label:"Propuesta enviada al cliente",icon:"📋"},
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
const RECHAZADAS_EST = ["rechazada_cliente","no_procesada","anulada"]
const PROCESADAS_EST = ["aceptada","pagada_china","en_camino","en_bodega","completada"]

const fmt = function(n){ return (!n&&n!==0)?"-":Number(n).toLocaleString("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}) }
const fmtN = function(n){ return Number(n).toLocaleString("es-CL",{maximumFractionDigits:0}) }
const fmtDate = function(d){ try{ return new Date(d+'T12:00:00').toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}) }catch(e){ return d } }
const getDias = function(d){ try{ return Math.ceil((new Date(d+'T12:00:00')-new Date())/(1000*60*60*24)) }catch(e){ return null } }

function RondaNeg(props) {
  var r = props.r; var i = props.i
  var bColor = r.estado==="aplicada"?"#bbf7d0":r.estado==="rechazada"?"#fecaca":"#e2e8f0"
  return (
    <div style={{background:"#f8fafc",border:"1px solid "+bColor,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,marginBottom:r.nota?6:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:"#64748b",fontWeight:600}}>Ronda {i+1}{r.fecha?" · "+r.fecha:""}</span>
          {r.estado==="aplicada"&&<span style={{fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",borderRadius:20,padding:"2px 10px",border:"1px solid #bbf7d0"}}>Aplicada</span>}
          {r.estado==="rechazada"&&<span style={{fontSize:10,fontWeight:700,color:"#dc2626",background:"#fef2f2",borderRadius:20,padding:"2px 10px",border:"1px solid #fecaca"}}>Rechazada</span>}
          {r.estado==="pendiente"&&<span style={{fontSize:10,fontWeight:700,color:"#d97706",background:"#fffbeb",borderRadius:20,padding:"2px 10px",border:"1px solid #fde68a"}}>En revision</span>}
        </div>
      </div>
      {r.nota&&<div style={{fontSize:12,color:"#475569",lineHeight:1.6}}>{r.nota}</div>}
    </div>
  )
}

function ScrollTop() {
  var [visible, setVisible] = useState(false)
  useEffect(function(){
    var onScroll = function(){ setVisible(window.scrollY > 300) }
    window.addEventListener('scroll', onScroll)
    return function(){ window.removeEventListener('scroll', onScroll) }
  },[])
  if(!visible) return null
  return (
    <button
      onClick={function(){ window.scrollTo({top:0,behavior:'smooth'}) }}
      style={{position:'fixed',bottom:24,right:20,width:44,height:44,borderRadius:'50%',background:'#040c18',border:'2px solid #c9a055',color:'#c9a055',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.2)',zIndex:200,transition:'all .2s',fontWeight:700}}
      title="Volver arriba"
    >↑</button>
  )
}

export default function ClientePortal({ supabase, perfil, onLogout }) {
  var [cotizaciones, setCotizaciones] = useState([])
  var [loading, setLoading] = useState(true)
  var [openId, setOpenId] = useState(null)
  var [filtro, setFiltro] = useState("todas")
  var [busqueda, setBusqueda] = useState("")
  var [tabs, setTabs] = useState({})

  useEffect(function(){
    cargar()
    var canal = supabase.channel('zaga_cliente_rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'cotizaciones'},function(){ cargar() })
      .subscribe()
    return function(){ supabase.removeChannel(canal) }
  },[])

  var cargar = async function(){
    var result = await supabase.from('cotizaciones').select('datos').order('created_at',{ascending:false})
    if(result.data&&!result.error){
      setCotizaciones(result.data.map(function(r){ return typeof r.datos==='string'?JSON.parse(r.datos):r.datos }))
    }
    setLoading(false)
  }

  var getTab = function(id){ return tabs[id]||"timeline" }
  var setTab = function(id,t){ setTabs(function(p){ var n=Object.assign({},p); n[id]=t; return n }) }

  // ── Totales sobre TODAS las cotizaciones ──────────────────────
  var todas = cotizaciones
  var activas = todas.filter(function(c){ return !RECHAZADAS_EST.includes(c.estado)&&!['completada','solicitud'].includes(c.estado) })
  var enCamino = todas.filter(function(c){ return c.estado==='en_camino' })
  var completadas = todas.filter(function(c){ return c.estado==='completada' })
  var rechazadas = todas.filter(function(c){ return RECHAZADAS_EST.includes(c.estado) })
  var procesadas = todas.filter(function(c){ return PROCESADAS_EST.includes(c.estado) })
  var solicitudes = todas.filter(function(c){ return c.estado==='solicitud' })
  var pctConversion = todas.length>0?Math.round((procesadas.length/todas.length)*100):0

  var totalInvertido = todas.filter(function(c){ return c.checklist&&c.checklist.pago1_cliente }).reduce(function(s,c){
    if(!c.calc) return s
    return s+(c.con_iva?(c.calc.totClIva||c.calc.totCl||0):(c.calc.totCl||0))
  },0)
  var pendientesConf = todas.filter(function(c){ return c.calc&&!(c.checklist&&c.checklist.pago1_cliente)&&!['solicitud','rechazada_cliente','anulada','no_procesada'].includes(c.estado) })
  var proxLlegada = activas.filter(function(c){ return c.fecha_llegada_est }).sort(function(a,b){ return new Date(a.fecha_llegada_est)-new Date(b.fecha_llegada_est) })[0]

  var abrirCot = function(id){
    setFiltro("todas")
    setOpenId(id)
    setTimeout(function(){
      var el = document.getElementById("cot-"+id)
      if(el) el.scrollIntoView({behavior:"smooth",block:"center"})
    },150)
  }

  var filtradas = todas.filter(function(c){
    var pF = true
    if(filtro==="activas") pF = !RECHAZADAS_EST.includes(c.estado)&&!['completada','solicitud'].includes(c.estado)
    else if(filtro==="en_camino") pF = c.estado==='en_camino'
    else if(filtro==="completada") pF = c.estado==='completada'
    else if(filtro==="no_procesada") pF = RECHAZADAS_EST.includes(c.estado)
    var q = busqueda.trim().toLowerCase()
    return pF&&(!q||(c.producto&&c.producto.toLowerCase().includes(q))||(c.nro&&c.nro.toLowerCase().includes(q)))
  })

  return (
    <div style={{background:"#f1f5f9",minHeight:"100vh",fontFamily:"'Inter','Segoe UI',sans-serif",color:"#0f172a"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        .zcard{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;transition:box-shadow .2s,border-color .2s}
        .zcard:hover{box-shadow:0 4px 20px rgba(0,0,0,0.08);border-color:#cbd5e1}
        .ztab{background:transparent;border:none;cursor:pointer;padding:10px 16px 11px;font-size:13px;font-weight:600;border-bottom:2px solid transparent;color:#94a3b8;font-family:inherit;transition:all .2s;white-space:nowrap}
        .ztab.on{color:#040c18;border-bottom-color:#c9a055}
        .ztab:hover:not(.on){color:#475569}
        .zfbtn{background:#fff;border:1px solid #e2e8f0;cursor:pointer;padding:7px 14px;font-size:12px;font-weight:500;border-radius:20px;font-family:inherit;color:#64748b;transition:all .2s;white-space:nowrap}
        .zfbtn.on{background:#040c18;border-color:#040c18;color:#ffffff}
        .zfbtn:hover:not(.on){border-color:#94a3b8;color:#334155}
        .zbtn-outline{background:transparent;border:1px solid #e2e8f0;cursor:pointer;padding:6px 14px;font-size:12px;font-weight:500;border-radius:8px;font-family:inherit;color:#64748b;transition:all .2s}
        .zbtn-outline:hover{border-color:#94a3b8;color:#334155}
        @keyframes zfadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes zpulse{0%,100%{opacity:1}50%{opacity:.5}}
        .zfade{animation:zfadein .25s ease forwards}
        .zdot{width:7px;height:7px;border-radius:50%;background:#16a34a;display:inline-block;animation:zpulse 2s infinite;margin-right:5px}
        @media(max-width:640px){
          .stats-row{grid-template-columns:1fr 1fr !important}
          .check-grid{grid-template-columns:1fr !important}
          .header-actions{gap:6px !important}
          .cot-header{flex-direction:column !important;align-items:flex-start !important}
          .cot-meta{flex-direction:row;justify-content:space-between;width:100%;margin-top:8px}
          .arrival-card{flex-direction:column !important;gap:10px !important}
          .arrival-days{text-align:left !important}
          .filtros-row{gap:5px !important}
        }
      `}</style>

      {/* HEADER */}
      <div style={{background:"#040c18",padding:"0 20px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
        <div style={{maxWidth:920,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,gap:12}}>
          <img src={LOGO_WHITE} alt="ZAGA" style={{height:28,width:"auto",objectFit:"contain"}}/>
          <div className="header-actions" style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:11,color:"#16a34a",fontWeight:700,background:"rgba(22,163,74,0.15)",borderRadius:20,padding:"4px 12px",border:"1px solid rgba(22,163,74,0.25)"}}>
              <span className="zdot"/>En vivo
            </span>
            <span style={{fontSize:12,color:"#c9a055",fontWeight:600,background:"rgba(201,160,85,0.12)",borderRadius:20,padding:"4px 14px",border:"1px solid rgba(201,160,85,0.25)",whiteSpace:"nowrap"}}>👤 {perfil.nombre}</span>
            <button className="zbtn-outline" onClick={onLogout} style={{color:"#94a3b8",borderColor:"rgba(255,255,255,0.15)"}}>Salir</button>
          </div>
        </div>
      </div>

      {/* SUBHEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"14px 20px"}}>
        <div style={{maxWidth:920,margin:"0 auto"}}>
          <div style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Portal de Importaciones</div>
        </div>
      </div>

      <div style={{maxWidth:920,margin:"0 auto",padding:"24px 16px"}}>

        {loading ? (
          <div style={{textAlign:"center",padding:80,color:"#94a3b8"}}>
            <div style={{fontSize:36,marginBottom:12}}>🌏</div>
            <div style={{fontSize:14}}>Cargando tus importaciones...</div>
          </div>
        ) : todas.length===0 ? (
          <div style={{textAlign:"center",padding:80}}>
            <div style={{fontSize:64,marginBottom:16}}>📦</div>
            <div style={{fontSize:20,fontWeight:700,color:"#0f172a",marginBottom:8}}>Bienvenido, {perfil.nombre}!</div>
            <div style={{fontSize:14,color:"#64748b",lineHeight:1.6}}>Tus importaciones apareceran aqui en cuanto esten registradas.</div>
          </div>
        ) : (
          <div>

            {/* BIENVENIDA */}
            <div style={{marginBottom:20}} className="zfade">
              <div style={{fontSize:20,fontWeight:700,color:"#0f172a"}}>Hola, {perfil.nombre} 👋</div>
              <div style={{fontSize:13,color:"#64748b",marginTop:4}}>
                {activas.length>0
                  ? "Tienes "+activas.length+" importacion"+(activas.length>1?"es":"")+" activa"+(activas.length>1?"s":"")+"."
                  : completadas.length>0?"Todo al dia con tus importaciones."
                  : "Tus cotizaciones estan siendo revisadas."}
              </div>
            </div>

            {/* ALERTA PENDIENTES */}
            {pendientesConf.length>0&&(
              <div className="zfade" style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:14,padding:"14px 16px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:16}}>🔔</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#92400e"}}>Cotizaciones pendientes de confirmacion</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {pendientesConf.map(function(c){
                    return (
                      <div key={c.id} onClick={function(){ abrirCot(c.id) }}
                        style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",cursor:"pointer"}}
                        onMouseEnter={function(e){ e.currentTarget.style.borderColor="#f59e0b" }}
                        onMouseLeave={function(e){ e.currentTarget.style.borderColor="#fde68a" }}>
                        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                          <span style={{background:"#040c18",color:"#c9a055",fontSize:11,fontWeight:700,borderRadius:6,padding:"3px 10px",flexShrink:0}}>{c.nro}</span>
                          <span style={{fontSize:12,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.producto}</span>
                        </div>
                        <span style={{fontSize:12,color:"#92400e",fontWeight:600,flexShrink:0,marginLeft:8}}>Ver →</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* PROXIMA LLEGADA */}
            {proxLlegada&&(function(){
              var dias = getDias(proxLlegada.fecha_llegada_est)
              return (
                <div className="arrival-card zfade" style={{background:"#040c18",borderRadius:14,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:44,height:44,background:"rgba(201,160,85,0.15)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🚢</div>
                    <div>
                      <div style={{fontSize:10,color:"#c9a055",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Proxima llegada estimada</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#f8fafc"}}>{proxLlegada.producto}</div>
                      <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{fmtDate(proxLlegada.fecha_llegada_est)}</div>
                    </div>
                  </div>
                  <div className="arrival-days" style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:36,fontWeight:800,color:"#c9a055",lineHeight:1}}>{dias!=null?(dias>0?dias:"Hoy!"):"?"}</div>
                    {dias>0&&<div style={{fontSize:11,color:"#64748b"}}>dias restantes</div>}
                  </div>
                </div>
              )
            })()}

            {/* KPIs — 5 tiles */}
            <div className="stats-row zfade" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:12}}>
              {[
                {label:"Cotizadas",value:todas.length,icon:"📋",color:"#2563eb"},
                {label:"En proceso",value:activas.length,icon:"⚙️",color:"#ea580c"},
                {label:"En camino",value:enCamino.length,icon:"🚢",color:"#7c3aed"},
                {label:"Completadas",value:completadas.length,icon:"🏁",color:"#16a34a"},
                {label:"No procesadas",value:rechazadas.length,icon:"✗",color:"#94a3b8"},
              ].map(function(s){
                return (
                  <div key={s.label} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"13px 10px",position:"relative",overflow:"hidden",textAlign:"center",cursor:"pointer"}}
                    onClick={function(){ setFiltro(s.label==="Cotizadas"?"todas":s.label==="En proceso"?"activas":s.label==="En camino"?"en_camino":s.label==="Completadas"?"completada":"no_procesada") }}>
                    <div style={{position:"absolute",top:8,right:10,fontSize:18,opacity:.1}}>{s.icon}</div>
                    <div style={{fontSize:9,color:s.color,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>{s.label}</div>
                    <div style={{fontSize:24,fontWeight:800,color:"#0f172a",lineHeight:1}}>{s.value}</div>
                  </div>
                )
              })}
            </div>

            {/* BARRA DE CONVERSION */}
            <div className="zfade" style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 18px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,color:"#64748b",fontWeight:600}}>
                  Tasa de conversion — de {todas.length} cotizacion{todas.length!==1?"es":""}, {procesadas.length} {procesadas.length===1?"fue procesada":"fueron procesadas"}
                </div>
                <div style={{fontSize:18,fontWeight:800,color:pctConversion>=60?"#16a34a":pctConversion>=30?"#d97706":"#64748b"}}>
                  {pctConversion}%
                </div>
              </div>
              <div style={{height:8,background:"#f1f5f9",borderRadius:6,overflow:"hidden",display:"flex"}}>
                <div style={{height:"100%",background:"#16a34a",width:(todas.length>0?(completadas.length/todas.length)*100:0)+"%",transition:"width .6s"}}/>
                <div style={{height:"100%",background:"#60a5fa",width:(todas.length>0?(activas.length/todas.length)*100:0)+"%",transition:"width .6s"}}/>
                <div style={{height:"100%",background:"#fde68a",width:(todas.length>0?(solicitudes.length/todas.length)*100:0)+"%",transition:"width .6s"}}/>
                <div style={{height:"100%",background:"#f1f5f9",flex:1}}/>
              </div>
              <div style={{display:"flex",gap:14,marginTop:7,flexWrap:"wrap"}}>
                {[["#16a34a","Completadas",completadas.length],["#60a5fa","En proceso",activas.length],["#fde68a","Solicitudes",solicitudes.length],["#e2e8f0","No procesadas",rechazadas.length]].map(function(item){
                  return (
                    <div key={item[1]} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#64748b"}}>
                      <div style={{width:8,height:8,borderRadius:2,background:item[0],flexShrink:0,border:item[0]==="#e2e8f0"||item[0]==="#fde68a"?"1px solid #cbd5e1":"none"}}/>
                      {item[1]}: <b style={{color:"#334155",marginLeft:2}}>{item[2]}</b>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* TOTAL INVERTIDO */}
            {totalInvertido>0&&(
              <div className="zfade" style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div>
                  <div style={{fontSize:12,color:"#64748b",fontWeight:600,marginBottom:2}}>💰 Total invertido con ZAGA</div>
                  <div style={{fontSize:11,color:"#94a3b8"}}>Solo importaciones con 1er pago confirmado</div>
                </div>
                <div style={{fontSize:26,fontWeight:800,color:"#040c18"}}>{fmt(totalInvertido)}</div>
              </div>
            )}

            {/* FILTROS + BUSQUEDA */}
            <div className="filtros-row zfade" style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              {[
                {key:"todas",   label:"Todas ("+todas.length+")"},
                {key:"activas", label:"En proceso ("+activas.length+")"},
                {key:"en_camino",label:"En camino ("+enCamino.length+")"},
                {key:"completada",label:"Completadas ("+completadas.length+")"},
                {key:"no_procesada",label:"No procesadas ("+rechazadas.length+")"},
              ].map(function(f){
                return <button key={f.key} className={"zfbtn"+(filtro===f.key?" on":"")} onClick={function(){ setFiltro(f.key) }}>{f.label}</button>
              })}
              <div style={{flex:1,minWidth:160,position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#94a3b8"}}>🔍</span>
                <input value={busqueda} onChange={function(e){ setBusqueda(e.target.value) }} placeholder="Buscar producto o numero..."
                  style={{width:"100%",background:"#fff",border:"1px solid #e2e8f0",borderRadius:20,color:"#0f172a",padding:"8px 16px 8px 34px",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>

            {/* LISTA */}
            {filtradas.length===0?(
              <div style={{textAlign:"center",padding:48,color:"#94a3b8"}}>
                <div style={{fontSize:32,marginBottom:8}}>🔍</div>
                <div style={{fontSize:13}}>No hay importaciones que coincidan</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {filtradas.map(function(c,idx){
                  var isOpen = openId===c.id
                  var isRech = RECHAZADAS_EST.includes(c.estado)
                  var color = EST_COLOR[c.estado]||"#3b82f6"
                  var bg = EST_BG[c.estado]||"#eff6ff"
                  var icon = EST_ICON[c.estado]||"📦"
                  var label = EST_LABEL[c.estado]||c.estado
                  var cl = c.calc; var conIva = !!c.con_iva
                  var p1 = cl?(conIva?(cl.p1ClIva||cl.p1Cl||0):(cl.p1Cl||0)):0
                  var p2 = cl?(conIva?(cl.p2ClIva||cl.p2Cl||0):(cl.p2Cl||0)):0
                  var tot = cl?(conIva?(cl.totClIva||cl.totCl||0):(cl.totCl||0)):0
                  var pagado1 = c.checklist&&c.checklist.pago1_cliente
                  var pagado2 = c.checklist&&c.checklist.pago2_cliente
                  var done = CHECKLIST_FULL.filter(function(d){ return c.checklist&&c.checklist[d.key] }).length
                  var pct = Math.round((done/CHECKLIST_FULL.length)*100)
                  var dias = (c.fecha_llegada_est&&!isRech&&!['completada','en_bodega'].includes(c.estado))?getDias(c.fecha_llegada_est):null
                  var pasoActual = TIMELINE.findIndex(function(t){ return !(c.checklist&&c.checklist[t.key]) })
                  var tab = getTab(c.id)
                  var pctPago = pagado1&&pagado2?100:pagado1?30:0

                  return (
                    <div key={c.id} id={"cot-"+c.id} className="zcard zfade" style={{animationDelay:(idx*0.04)+"s",opacity:isRech?0.72:1}}>

                      {/* CARD HEADER */}
                      <div className="cot-header" onClick={function(){ setOpenId(isOpen?null:c.id) }}
                        style={{padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:isRech?"#fafafa":"#fff"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}>
                            <span style={{background:bg,color:color,fontSize:11,fontWeight:700,borderRadius:20,padding:"3px 10px",border:"1px solid "+color+"30"}}>{icon} {label}</span>
                            <span style={{fontSize:11,color:"#94a3b8",fontWeight:500}}>{c.nro}</span>
                            {dias!==null&&dias<=30&&(
                              <span style={{background:dias<=7?"#fef2f2":"#eff6ff",color:dias<=7?"#dc2626":"#2563eb",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:"1px solid "+(dias<=7?"#fecaca":"#bfdbfe")}}>
                                {dias<=0?"Llega hoy!":dias+"d para llegar"}
                              </span>
                            )}
                          </div>
                          <div style={{fontSize:15,fontWeight:700,color:isRech?"#94a3b8":"#0f172a",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.producto}</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {c.unidades&&<span style={{fontSize:11,color:"#64748b",background:"#f8fafc",borderRadius:6,padding:"2px 8px",border:"1px solid #e2e8f0"}}>📦 {fmtN(c.unidades)} und</span>}
                            {c.transporte&&<span style={{fontSize:11,color:"#64748b",background:"#f8fafc",borderRadius:6,padding:"2px 8px",border:"1px solid #e2e8f0"}}>{c.transporte==='aereo'?'✈️ Aereo':c.transporte==='ambos'?'🚢✈️ Ambos':'🚢 Maritimo'}</span>}
                            {c.fecha_solicitud&&<span style={{fontSize:11,color:"#64748b",background:"#f8fafc",borderRadius:6,padding:"2px 8px",border:"1px solid #e2e8f0"}}>📅 {fmtDate(c.fecha_solicitud)}</span>}
                            {isRech&&c.motivo_no_procesada&&<span style={{fontSize:11,color:"#94a3b8",background:"#fef2f2",borderRadius:6,padding:"2px 8px",border:"1px solid #fecaca"}}>Motivo: {c.motivo_no_procesada}</span>}
                          </div>
                        </div>

                        <div className="cot-meta" style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
                          {!isRech&&(
                            <div style={{display:"flex",alignItems:"center",gap:7}}>
                              <span style={{fontSize:11,color:"#94a3b8"}}>{pct}%</span>
                              <div style={{width:60,height:5,background:"#f1f5f9",borderRadius:3,overflow:"hidden"}}>
                                <div style={{width:pct+"%",height:"100%",background:c.estado==='completada'?"#16a34a":color,borderRadius:3,transition:"width .4s"}}/>
                              </div>
                            </div>
                          )}
                          {tot>0&&!isRech&&<div style={{fontSize:14,fontWeight:800,color:"#040c18"}}>{fmt(tot)}</div>}
                          <div style={{fontSize:18,color:"#cbd5e1",transition:"transform .2s",transform:isOpen?"rotate(180deg)":"none"}}>⌄</div>
                        </div>
                      </div>

                      {/* DETALLE EXPANDIDO */}
                      {isOpen&&(
                        <div style={{borderTop:"1px solid #f1f5f9"}}>
                          <div style={{display:"flex",padding:"0 16px",borderBottom:"1px solid #f1f5f9",overflowX:"auto",gap:0}}>
                            {(isRech
                              ? [["detalle","📋 Detalle"]]
                              : [["timeline","🗺️ Seguimiento"],["pagos","💳 Pagos"],["detalle","📋 Detalle"]]
                            ).map(function(item){
                              return <button key={item[0]} className={"ztab"+(tab===item[0]?" on":"")} onClick={function(){ setTab(c.id,item[0]) }}>{item[1]}</button>
                            })}
                          </div>

                          <div style={{padding:"16px"}}>

                            {/* TAB TIMELINE */}
                            {tab==="timeline"&&!isRech&&(
                              <div>
                                <div style={{overflowX:"auto",paddingBottom:8}}>
                                  <div style={{display:"flex",alignItems:"flex-start",minWidth:"max-content",padding:"4px 2px"}}>
                                    {TIMELINE.map(function(step,i){
                                      var checked = c.checklist&&c.checklist[step.key]
                                      var isCurrent = i===pasoActual&&pasoActual>=0
                                      var circBorder = checked?"#16a34a":isCurrent?color:"#e2e8f0"
                                      var circBg = checked?"#f0fdf4":isCurrent?bg:"#f8fafc"
                                      var textC = checked?"#16a34a":isCurrent?color:"#94a3b8"
                                      return (
                                        <div key={step.key} style={{display:"flex",alignItems:"center"}}>
                                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,width:64}}>
                                            <div style={{width:32,height:32,borderRadius:"50%",background:circBg,border:"2px solid "+circBorder,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,position:"relative",boxShadow:isCurrent?"0 0 0 3px "+color+"20":"none",transition:"all .3s"}}>
                                              {step.icon}
                                              {checked&&<div style={{position:"absolute",bottom:-2,right:-2,width:13,height:13,borderRadius:"50%",background:"#16a34a",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#fff",fontWeight:800}}>✓</div>}
                                            </div>
                                            <div style={{fontSize:9,color:textC,fontWeight:checked||isCurrent?700:400,textAlign:"center",lineHeight:1.3,width:62}}>{step.label}</div>
                                          </div>
                                          {i<TIMELINE.length-1&&<div style={{width:14,height:2,background:checked&&i<pasoActual-1?"#16a34a":"#e2e8f0",marginTop:-18,flexShrink:0}}/>}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                                <div style={{marginTop:14,background:bg,border:"1px solid "+color+"25",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                                  <span style={{fontSize:20}}>{icon}</span>
                                  <div>
                                    <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>Estado actual</div>
                                    <div style={{fontSize:14,fontWeight:700,color:color}}>{label}</div>
                                    {c.fecha_llegada_est&&!['completada','en_bodega'].includes(c.estado)&&(
                                      <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                                        Llegada estimada: <span style={{color:"#d97706",fontWeight:600}}>{fmtDate(c.fecha_llegada_est)}</span>
                                        {dias!==null&&dias>0&&<span style={{color:"#2563eb"}}> · {dias} dias</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {c.estado==='completada'&&(
                                  <div style={{marginTop:12,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"14px",textAlign:"center"}}>
                                    <div style={{fontSize:24,marginBottom:4}}>🏁</div>
                                    <div style={{fontSize:14,fontWeight:700,color:"#16a34a"}}>Importacion completada!</div>
                                    {c.fecha_llegada_real&&<div style={{fontSize:11,color:"#64748b",marginTop:2}}>Completada el {fmtDate(c.fecha_llegada_real)}</div>}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* TAB PAGOS */}
                            {tab==="pagos"&&!isRech&&(
                              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                                <div style={{background:"#f8fafc",borderRadius:10,padding:"13px 14px",border:"1px solid #e2e8f0"}}>
                                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                                    <span style={{fontSize:12,color:"#64748b",fontWeight:500}}>Progreso de pago</span>
                                    <span style={{fontSize:12,color:"#040c18",fontWeight:700}}>{pctPago}% completado</span>
                                  </div>
                                  <div style={{height:8,background:"#e2e8f0",borderRadius:4,overflow:"hidden"}}>
                                    <div style={{width:pctPago+"%",height:"100%",background:"linear-gradient(90deg,#c9a055,#16a34a)",borderRadius:4,transition:"width .5s"}}/>
                                  </div>
                                </div>
                                {[
                                  {label:"1er pago · "+(c.pct_deposito||30)+"% del total",amount:p1,paid:pagado1,pendingMsg:"Pendiente de pago"},
                                  {label:"2do pago · "+(100-(c.pct_deposito||30))+"% del total",amount:p2,paid:pagado2,pendingMsg:"Se paga al recibir la mercaderia"},
                                ].map(function(row,ri){
                                  return (
                                    <div key={ri} style={{background:row.paid?"#f0fdf4":"#fff",border:"1px solid "+(row.paid?"#bbf7d0":"#e2e8f0"),borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                                      <div>
                                        <div style={{fontSize:11,color:"#64748b",marginBottom:4,fontWeight:500}}>{row.label}</div>
                                        <div style={{fontSize:20,fontWeight:800,color:row.paid?"#16a34a":"#0f172a"}}>{fmt(row.amount)}</div>
                                        <div style={{fontSize:11,color:row.paid?"#16a34a":"#94a3b8",marginTop:4,fontWeight:row.paid?600:400}}>{row.paid?"Pagado y confirmado ✓":row.pendingMsg}</div>
                                      </div>
                                      <div style={{width:42,height:42,borderRadius:"50%",background:row.paid?"#dcfce7":"#f8fafc",border:"2px solid "+(row.paid?"#86efac":"#e2e8f0"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                                        {row.paid?"✅":"⏳"}
                                      </div>
                                    </div>
                                  )
                                })}
                                <div style={{background:"#040c18",borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                                  <div>
                                    <div style={{fontSize:12,color:"#c9a055",fontWeight:600,marginBottom:2}}>Total importacion</div>
                                    <div style={{fontSize:11,color:"#475569"}}>{c.unidades?fmtN(c.unidades)+" unidades":""}{conIva?" · Con IVA":""}</div>
                                  </div>
                                  <div style={{fontSize:22,fontWeight:800,color:"#c9a055"}}>{fmt(tot)}</div>
                                </div>
                              </div>
                            )}

                            {/* TAB DETALLE */}
                            {tab==="detalle"&&(
                              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                                {isRech&&(
                                  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
                                    <span style={{fontSize:18}}>❌</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#dc2626",marginBottom:2}}>{label}</div>
                                      <div style={{fontSize:12,color:"#7f1d1d"}}>{c.motivo_no_procesada||"Esta cotizacion no fue procesada."}</div>
                                    </div>
                                  </div>
                                )}
                                {!isRech&&(
                                  <div className="check-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                                    {CHECKLIST_FULL.map(function(step){
                                      var checked = c.checklist&&c.checklist[step.key]
                                      return (
                                        <div key={step.key} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:checked?"#f0fdf4":"#f8fafc",border:"1px solid "+(checked?"#bbf7d0":"#e2e8f0")}}>
                                          <div style={{width:16,height:16,borderRadius:4,background:checked?"#16a34a":"#fff",border:"2px solid "+(checked?"#16a34a":"#cbd5e1"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",flexShrink:0,fontWeight:800}}>{checked?"✓":""}</div>
                                          <span style={{fontSize:11,color:checked?"#15803d":"#64748b",lineHeight:1.3}}>{step.icon} {step.label}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                                {c.variantes&&(
                                  <div style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #e2e8f0"}}>
                                    <div style={{fontSize:10,color:"#c9a055",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>🎨 Especificaciones</div>
                                    <div style={{fontSize:12,color:"#475569",whiteSpace:"pre-line",lineHeight:1.7}}>{c.variantes}</div>
                                  </div>
                                )}
                                {c.notas&&(
                                  <div style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #e2e8f0"}}>
                                    <div style={{fontSize:10,color:"#2563eb",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>📝 Notas</div>
                                    <div style={{fontSize:12,color:"#475569",lineHeight:1.7}}>{c.notas}</div>
                                  </div>
                                )}
                                {c.negociacion_rondas&&c.negociacion_rondas.length>0&&(
                                  <div style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #fde68a"}}>
                                    <div style={{fontSize:10,color:"#d97706",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>💬 Historial de negociacion</div>
                                    {c.negociacion_rondas.map(function(r,i){
                                      return <RondaNeg key={i} r={r} i={i}/>
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

        <ScrollTop/>

        <div style={{textAlign:"center",marginTop:48,fontSize:11,color:"#cbd5e1",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <img src={LOGO_DARK} alt="ZAGA" style={{height:16,opacity:.3}}/>
          <span>ZAGA Import · zagaimp.com · {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  )
}
