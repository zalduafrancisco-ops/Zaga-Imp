import { useState, useEffect } from 'react'
import LOGO_WHITE from "./logo-white.png"

// PortalChina.jsx - Portal de Agente China - ZAGA IMP
// Bilingue: Espanol arriba / Chino abajo
// Sin precios, sin nombres de cliente, sin notas ocultas
// Auth: manejado por Supabase (rol agente_china)

// Tab 1 - Pendientes de respuesta o en negociacion con China
const ESTADOS_PENDIENTE = ["enviado_china", "respuesta_china", "re_testeando", "en_negociacion"]
// Tab 2 - Confirmadas / pagadas
const ESTADOS_ACTIVOS   = ["aceptada", "pagada_china"]
// Tab 3 - En camino
const ESTADOS_CAMINO    = ["en_camino"]

const EST_INFO = {
  enviado_china:   ["Pendiente de cotizacion", "等待报价", "#c9a055"],
  respuesta_china: ["Cotizacion recibida",      "报价已收到", "#3d9fd4"],
  re_testeando:    ["Re-testeando precio",      "重新议价中", "#6a9fd4"],
  en_negociacion:  ["En negociacion",           "谈判中",    "#c47830"],
  aceptada:        ["Orden aceptada",           "订单已接受", "#1aa358"],
  pagada_china:    ["Pago realizado",           "付款已完成", "#0d9870"],
  en_camino:       ["En camino a destino",      "运输中",    "#a85590"],
}

const TRANSP = {
  maritimo: ["Maritimo", "海运"],
  aereo:    ["Aereo",    "空运"],
  ambos:    ["Maritimo + Aereo", "海运+空运"],
}

function fmtDate(str) {
  if (!str) return "-"
  const d = new Date(str)
  if (isNaN(d)) return str
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0")
  return `${y}/${m}/${day}`
}

function fmtDateZH(str) {
  if (!str) return "-"
  const d = new Date(str)
  if (isNaN(d)) return str
  return `${d.getFullYear()}年${String(d.getMonth()+1).padStart(2,"0")}月${String(d.getDate()).padStart(2,"0")}日`
}

export default function PortalChina({ supabase, onLogout }) {
  const [tab, setTab]           = useState("pending")
  const [cots, setCots]         = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [pulse, setPulse]       = useState(false)

  useEffect(() => {
    loadData()
    const channel = supabase.channel("zaga-portal-china-v1")
      .on("postgres_changes", { event:"*", schema:"public", table:"cotizaciones" }, () => {
        loadData()
        setPulse(true)
        setTimeout(() => setPulse(false), 1800)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from("cotizaciones")
      .select("id,datos,created_at,updated_at")
    if (!error && data) {
      const todos = [...ESTADOS_PENDIENTE, ...ESTADOS_ACTIVOS, ...ESTADOS_CAMINO]
      const relevantes = data
        .map(r => ({ ...r.datos, _id: r.id, _updated: r.updated_at || r.created_at }))
        .filter(c => todos.includes(c.estado))
        .sort((a, b) => {
          const pA = ESTADOS_PENDIENTE.includes(a.estado) ? 0 : 1
          const pB = ESTADOS_PENDIENTE.includes(b.estado) ? 0 : 1
          if (pA !== pB) return pA - pB
          return new Date(b._updated) - new Date(a._updated)
        })
      setCots(relevantes)
    }
    setLoading(false)
  }

  const pending  = cots.filter(c => ESTADOS_PENDIENTE.includes(c.estado))
  const active   = cots.filter(c => ESTADOS_ACTIVOS.includes(c.estado))
  const shipping = cots.filter(c => ESTADOS_CAMINO.includes(c.estado))
  const shown = tab === "pending" ? pending : tab === "active" ? active : shipping

  return (
    <div style={{
      minHeight:"100vh", background:"#040c18", color:"#e8e0d0",
      fontFamily:"'Inter','Segoe UI',sans-serif",
    }}>
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background:"radial-gradient(ellipse 70% 40% at 50% 0%,#c9a05506 0%,transparent 60%)",
      }}/>

      {/* HEADER */}
      <div style={{
        background:"linear-gradient(135deg,#040c18 0%,#071428 100%)",
        borderBottom:"1px solid #c9a05525",
        padding:"14px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <img src={LOGO_WHITE} alt="ZAGA IMP" style={{ height:42, objectFit:"contain" }} />
          <div>
            <div style={{ fontWeight:800, fontSize:"0.88em", color:"#c9a055", letterSpacing:0.4 }}>
              代理商门户 / Portal Agente China
            </div>
            <div style={{ fontSize:"0.65em", opacity:0.35, marginTop:1 }}>
              ZAGA IMP
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{
              width:7, height:7, borderRadius:"50%",
              background: pulse ? "#1aa358" : "#1aa35870",
              boxShadow: pulse ? "0 0 8px #1aa358" : "none",
              transition:"all 0.3s",
            }}/>
            <div style={{ fontSize:"0.62em", opacity:0.35 }}>
              <div>实时 / En vivo</div>
            </div>
          </div>
          <button
            onClick={() => onLogout && onLogout()}
            style={{
              background:"#c9a05516", border:"1px solid #c9a05538",
              color:"#c9a055", borderRadius:8, padding:"7px 14px",
              cursor:"pointer", fontSize:"0.8em", fontWeight:600,
              fontFamily:"inherit",
            }}
          >
            退出 / Salir
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ padding:"16px 16px 0", maxWidth:740, margin:"0 auto", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", gap:8 }}>
          {[
            { id:"pending",  badge:pending.length,  label:"Pendientes / 待处理",     urgent: pending.length > 0 },
            { id:"active",   badge:active.length,   label:"Confirmadas / 已确认" },
            { id:"shipping", badge:shipping.length, label:"En camino / 运输中" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex:1, padding:"11px 8px", borderRadius:11, border:"1px solid",
                borderColor: tab === t.id ? "#c9a055" : (t.urgent ? "#c9a05545" : "#c9a05520"),
                background: tab === t.id ? "#c9a05516" : (t.urgent ? "#c9a05508" : "transparent"),
                color: tab === t.id ? "#c9a055" : "#6a8aaa",
                cursor:"pointer", transition:"all 0.18s", fontFamily:"inherit",
              }}
            >
              <div style={{ fontWeight:800, fontSize:"0.82em", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                {t.label}
                {t.badge > 0 && (
                  <span style={{
                    background: tab === t.id ? "#c9a055" : (t.urgent ? "#c9a055" : "#6a8aaa"),
                    color:"#040c18", borderRadius:20, padding:"1px 6px",
                    fontSize:"0.75em", fontWeight:900, minWidth:16, textAlign:"center",
                  }}>
                    {t.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* LISTA */}
      <div style={{ padding:"14px 16px 40px", maxWidth:740, margin:"0 auto", position:"relative", zIndex:1 }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:56, opacity:0.3 }}>
            <div style={{ fontSize:"1.8em", marginBottom:10 }}>加载中…</div>
            <div style={{ fontSize:"0.8em" }}>Cargando...</div>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign:"center", padding:56, opacity:0.28 }}>
            <div style={{ fontSize:"2.4em", marginBottom:12 }}>📭</div>
            <div style={{ fontWeight:700, fontSize:"1.05em", marginBottom:4 }}>
              {tab === "pending" ? "No hay solicitudes pendientes" : tab === "active" ? "No hay ordenes activas" : "No hay envios en camino"}
            </div>
            <div style={{ fontSize:"0.8em", opacity:0.7 }}>
              {tab === "pending" ? "暂无待处理请求" : tab === "active" ? "暂无进行中订单" : "暂无运输中货物"}
            </div>
          </div>
        ) : (
          shown.map(c => {
            const uid = c._id || c.id
            return (
              <CotCard
                key={uid}
                c={c}
                expanded={expanded === uid}
                onToggle={() => setExpanded(expanded === uid ? null : uid)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

function CotCard({ c, expanded, onToggle }) {
  const est     = c.estado || "enviado_china"
  const estInfo = EST_INFO[est] || ["Sin estado", "-", "#6a9fd4"]
  const isPend  = ESTADOS_PENDIENTE.includes(est)
  const isUrg   = est === "enviado_china"
  const transp  = TRANSP[c.transporte] || TRANSP["maritimo"]
  const nro     = c.nro_cotizacion || c.nro || String(c._id || "").slice(-6).toUpperCase() || "-"

  let notasArr = []
  try {
    if (Array.isArray(c.notas_historial)) notasArr = c.notas_historial
    else if (typeof c.notas_historial === "string" && c.notas_historial) notasArr = JSON.parse(c.notas_historial)
  } catch(e) { notasArr = [] }
  if (notasArr.length === 0 && c.notas_internas) notasArr = [{ texto:c.notas_internas, fecha:"", oculta:false }]
  const visibles = notasArr.filter(n => !n.oculta)

  return (
    <div style={{
      background: isUrg ? "linear-gradient(160deg,#08203a 0%,#0a1828 100%)" : "#071428",
      border: isUrg ? "1.5px solid #c9a05558" : "1px solid #c9a05520",
      borderRadius:15, marginBottom:14, overflow:"hidden",
      boxShadow: isUrg ? "0 6px 28px #c9a05512" : "none",
    }}>

      {/* CABECERA */}
      <div onClick={onToggle} style={{ padding:"16px 18px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>

          {/* Badge estado */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            <span style={{
              background:`${estInfo[2]}20`, border:`1px solid ${estInfo[2]}55`,
              color:estInfo[2], borderRadius:20, padding:"4px 11px",
              fontSize:"0.73em", fontWeight:700, whiteSpace:"nowrap",
            }}>
              {estInfo[0]}
              <span style={{ opacity:0.5, fontWeight:400, marginLeft:6 }}>{estInfo[1]}</span>
            </span>
            {isUrg && (
              <span style={{
                background:"#c9a05520", border:"1px solid #c9a05560",
                color:"#c9a055", borderRadius:20, padding:"4px 10px",
                fontSize:"0.7em", fontWeight:800,
              }}>
                需要报价 Requiere cotizacion
              </span>
            )}
          </div>

          {/* Producto */}
          <div style={{ fontWeight:800, fontSize:"1.06em", color:"#e8e0d0", lineHeight:1.3, marginBottom:2 }}>
            {c.producto || "-"}
          </div>
          <div style={{ fontSize:"0.66em", opacity:0.38, marginBottom:12 }}>
            产品名称 / Nombre del producto
          </div>

          {/* Datos rapidos */}
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight:900, fontSize:"1.12em", color:"#c9a055", lineHeight:1 }}>{c.unidades || "-"}</div>
              <div style={{ fontSize:"0.62em", opacity:0.38, marginTop:2 }}>数量 / Unidades</div>
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:"0.88em", color:"#8ab4d4", lineHeight:1 }}>
                {transp[0]}
              </div>
              <div style={{ fontSize:"0.62em", opacity:0.38, marginTop:2 }}>{transp[1]} / Transporte</div>
            </div>
            <div>
              <div style={{ fontWeight:500, fontSize:"0.8em", color:"#8ab4d4", lineHeight:1 }}>
                {fmtDate(c.fecha_solicitud)}
              </div>
              <div style={{ fontSize:"0.62em", opacity:0.38, marginTop:2 }}>
                {fmtDateZH(c.fecha_solicitud)} / Fecha envio
              </div>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:"0.78em", color:"#5a7a9a", fontFamily:"monospace", lineHeight:1 }}>#{nro}</div>
              <div style={{ fontSize:"0.62em", opacity:0.38, marginTop:2 }}>编号 / N solicitud</div>
            </div>
          </div>
        </div>

        <div style={{
          width:28, height:28, borderRadius:"50%", flexShrink:0,
          background:"#c9a05514", border:"1px solid #c9a05530",
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"#c9a055", fontSize:"0.75em", marginTop:2,
          transition:"transform 0.2s",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          v
        </div>
      </div>

      {/* DETALLE */}
      {expanded && (
        <div style={{ borderTop:"1px solid #c9a05518", padding:"18px 18px", display:"flex", flexDirection:"column", gap:18 }}>

          <Section es="Link de Alibaba" zh="阿里巴巴链接">
            {c.link_alibaba ? (
              <a href={c.link_alibaba} target="_blank" rel="noreferrer" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                background:"linear-gradient(135deg,#c9a05518,#c9a05508)",
                border:"1px solid #c9a05548", color:"#c9a055",
                borderRadius:10, padding:"11px 18px",
                textDecoration:"none", fontWeight:700, fontSize:"0.88em",
                fontFamily:"'Inter','Segoe UI',sans-serif",
              }}>
                Ver producto en Alibaba / 查看产品
              </a>
            ) : (
              <div style={{ fontSize:"0.82em", opacity:0.35, fontStyle:"italic" }}>Sin link / 暂无链接</div>
            )}
          </Section>

          {c.sku_china && (
            <Section es="SKU / Codigo China" zh="产品编号">
              <div style={{
                fontFamily:"'Courier New',monospace",
                background:"#0a1a2e", border:"1px solid #c9a05525",
                padding:"8px 14px", borderRadius:8,
                fontSize:"0.94em", color:"#d0c8a8", display:"inline-block", letterSpacing:1,
              }}>
                {c.sku_china}
              </div>
            </Section>
          )}

          {c.variantes && (
            <Section es="Variantes / Colores / Especificaciones" zh="规格 / 颜色 / 变体">
              <div style={{
                background:"#0a1a2e", border:"1px solid #c9a05520",
                padding:"13px 16px", borderRadius:10,
                fontSize:"0.88em", lineHeight:1.65, color:"#d0c8a8",
                whiteSpace:"pre-wrap", maxHeight:200, overflowY:"auto",
              }}>
                {c.variantes}
              </div>
            </Section>
          )}

          {visibles.length > 0 && (
            <Section es="Notas / Observaciones" zh="备注 / 说明">
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {visibles.slice(-3).map((n, i) => (
                  <div key={i} style={{
                    background:"#0a1a2e", borderLeft:"3px solid #c9a055",
                    padding:"11px 14px", borderRadius:"0 9px 9px 0",
                    fontSize:"0.86em", lineHeight:1.6, color:"#d0c8a8",
                  }}>
                    <div>{n.texto}</div>
                    {n.fecha && <div style={{ opacity:0.35, fontSize:"0.75em", marginTop:5 }}>{n.fecha}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {c.fecha_llegada_est && ESTADOS_CAMINO.includes(est) && (
            <Section es="Fecha de llegada estimada" zh="预计到达时间">
              <div style={{
                display:"inline-flex", gap:10, alignItems:"center",
                background:"#a8559018", border:"1px solid #a8559040",
                padding:"10px 16px", borderRadius:10,
              }}>
                <span style={{ fontSize:"1.2em" }}>🚢</span>
                <div>
                  <div style={{ fontWeight:700, color:"#c080d0", fontSize:"0.95em" }}>{fmtDate(c.fecha_llegada_est)}</div>
                  <div style={{ fontSize:"0.72em", opacity:0.5, marginTop:2 }}>{fmtDateZH(c.fecha_llegada_est)}</div>
                </div>
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ es, zh, children }) {
  return (
    <div>
      <div style={{ display:"flex", gap:5, alignItems:"baseline", marginBottom:9 }}>
        <span style={{ fontSize:"0.76em", fontWeight:700, color:"#c9a055" }}>{es}</span>
        <span style={{ fontSize:"0.66em", opacity:0.35, color:"#e8e0d0" }}>/ {zh}</span>
      </div>
      {children}
    </div>
  )
}
