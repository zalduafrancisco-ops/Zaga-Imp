import { useState, useEffect } from 'react'
import LOGO_WHITE from "./logo-white.png"

// PortalChina.jsx - Portal Agente China - ZAGA IMP
// Bilingue Espanol / Chino - Sin precios, sin nombres cliente, sin notas ocultas
// Auth manejado por Supabase (rol agente_china) - sin login interno

const ESTADOS_PENDIENTE = ["enviado_china", "respuesta_china", "re_testeando", "en_negociacion"]
const ESTADOS_ACTIVOS   = ["aceptada", "pagada_china"]
const ESTADOS_CAMINO    = ["en_camino"]

const EST_INFO = {
  enviado_china:   ["Pendiente de cotizacion", "等待报价",  "#c9a055"],
  respuesta_china: ["Cotizacion recibida",      "报价已收到", "#3d9fd4"],
  re_testeando:    ["Re-testeando precio",      "重新议价中", "#6a9fd4"],
  en_negociacion:  ["En negociacion",           "谈判中",    "#c47830"],
  aceptada:        ["Orden aceptada",           "订单已接受", "#1aa358"],
  pagada_china:    ["Pago realizado",           "付款已完成", "#0d9870"],
  en_camino:       ["En camino",                "运输中",    "#a85590"],
}

const TRANSP = {
  maritimo: ["Maritimo",         "海运"],
  aereo:    ["Aereo",            "空运"],
  ambos:    ["Maritimo + Aereo", "海运+空运"],
}

function fmtDate(str) {
  if (!str) return "-"
  const d = new Date(str)
  if (isNaN(d)) return str
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`
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
      minHeight:"100vh",
      background:"#040c18",
      color:"#e8e0d0",
      fontFamily:"'Inter','Segoe UI',sans-serif",
    }}>

      {/* Fondo decorativo */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background:"radial-gradient(ellipse 70% 40% at 50% 0%, #c9a05508 0%, transparent 65%)",
      }}/>

      {/* HEADER */}
      <div style={{
        background:"linear-gradient(180deg, #071428 0%, #040c18 100%)",
        borderBottom:"1px solid #c9a05530",
        padding:"14px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100,
        boxShadow:"0 4px 24px #00000060",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <img src={LOGO_WHITE} alt="ZAGA IMP" style={{ height:42, objectFit:"contain" }} />
          <div>
            <div style={{ fontWeight:800, fontSize:"0.9em", color:"#c9a055", letterSpacing:0.5 }}>
              代理商门户
            </div>
            <div style={{ fontSize:"0.65em", color:"#c9a05560", marginTop:1 }}>
              Portal Agente China
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{
              width:7, height:7, borderRadius:"50%",
              background: pulse ? "#1aa358" : "#1aa35860",
              boxShadow: pulse ? "0 0 10px #1aa358" : "none",
              transition:"all 0.3s",
            }}/>
            <span style={{ fontSize:"0.65em", color:"#c9a05550" }}>实时 / En vivo</span>
          </div>
          <button
            onClick={() => onLogout && onLogout()}
            style={{
              background:"transparent", border:"1px solid #c9a05540",
              color:"#c9a055", borderRadius:8, padding:"7px 16px",
              cursor:"pointer", fontSize:"0.8em", fontWeight:600,
              fontFamily:"inherit", transition:"all 0.15s",
            }}
          >
            退出 / Salir
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ padding:"20px 16px 0", maxWidth:760, margin:"0 auto", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", gap:8 }}>
          {[
            { id:"pending",  count:pending.length,  es:"Pendientes",    zh:"待处理", urgent:pending.length > 0 },
            { id:"active",   count:active.length,   es:"Confirmadas",   zh:"已确认" },
            { id:"shipping", count:shipping.length, es:"En camino",     zh:"运输中" },
          ].map(t => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex:1, padding:"12px 10px",
                  borderRadius:12,
                  border:"1px solid",
                  borderColor: isActive ? "#c9a055" : t.urgent ? "#c9a05540" : "#c9a05518",
                  background: isActive ? "#c9a05518" : t.urgent ? "#c9a05508" : "transparent",
                  color: isActive ? "#c9a055" : "#5a7a9a",
                  cursor:"pointer", transition:"all 0.18s",
                  fontFamily:"inherit",
                }}
              >
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <span style={{ fontWeight:800, fontSize:"0.88em" }}>{t.es}</span>
                  {t.count > 0 && (
                    <span style={{
                      background: isActive || t.urgent ? "#c9a055" : "#5a7a9a",
                      color:"#040c18", borderRadius:20,
                      padding:"1px 7px", fontSize:"0.72em", fontWeight:900,
                    }}>{t.count}</span>
                  )}
                </div>
                <div style={{ fontSize:"0.65em", color: isActive ? "#c9a05580" : "#5a7a9a60", marginTop:2 }}>{t.zh}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* LISTA */}
      <div style={{ padding:"16px 16px 48px", maxWidth:760, margin:"0 auto", position:"relative", zIndex:1 }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:64, color:"#c9a05540" }}>
            <div style={{ fontSize:"2em", marginBottom:10 }}>⏳</div>
            <div style={{ fontWeight:600, color:"#c9a05560" }}>加载中 / Cargando...</div>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign:"center", padding:64 }}>
            <div style={{ fontSize:"2.5em", marginBottom:14, opacity:0.3 }}>📭</div>
            <div style={{ fontWeight:700, color:"#c9a05550", marginBottom:4 }}>
              {tab === "pending" ? "No hay solicitudes pendientes"
               : tab === "active" ? "No hay ordenes activas"
               : "No hay envios en camino"}
            </div>
            <div style={{ fontSize:"0.82em", color:"#c9a05530" }}>
              {tab === "pending" ? "暂无待处理请求"
               : tab === "active" ? "暂无进行中订单"
               : "暂无运输中货物"}
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
  const info    = EST_INFO[est] || ["Sin estado", "-", "#6a9fd4"]
  const isUrg   = est === "enviado_china"
  const isNeg   = est === "en_negociacion" || est === "re_testeando"
  const transp  = TRANSP[c.transporte] || TRANSP["maritimo"]
  const nro     = c.nro_cotizacion || c.nro || String(c._id || "").slice(-6).toUpperCase() || "-"

  let notasArr = []
  try {
    if (Array.isArray(c.notas_historial)) notasArr = c.notas_historial
    else if (typeof c.notas_historial === "string" && c.notas_historial) notasArr = JSON.parse(c.notas_historial)
  } catch(e) { notasArr = [] }
  if (notasArr.length === 0 && c.notas_internas) notasArr = [{ texto:c.notas_internas, oculta:false }]
  const visibles = notasArr.filter(n => !n.oculta)

  const borderColor = isUrg ? "#c9a055" : isNeg ? "#c47830" : "#c9a05520"
  const bgCard = isUrg
    ? "linear-gradient(160deg, #0d1f38 0%, #081628 100%)"
    : isNeg
    ? "linear-gradient(160deg, #1a1000 0%, #0d0d0d 100%)"
    : "#071428"

  return (
    <div style={{
      background: bgCard,
      border:`1.5px solid ${borderColor}`,
      borderRadius:14,
      marginBottom:12,
      overflow:"hidden",
      boxShadow: isUrg ? "0 4px 24px #c9a05514" : "none",
      transition:"all 0.2s",
    }}>

      {/* CABECERA */}
      <div
        onClick={onToggle}
        style={{ padding:"16px 18px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}
      >
        <div style={{ flex:1, minWidth:0 }}>

          {/* Badges */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            <span style={{
              background:`${info[2]}18`,
              border:`1px solid ${info[2]}50`,
              color:info[2],
              borderRadius:20, padding:"4px 12px",
              fontSize:"0.72em", fontWeight:700,
            }}>
              {info[0]}
              <span style={{ opacity:0.45, fontWeight:400, marginLeft:6 }}>{info[1]}</span>
            </span>
            {isUrg && (
              <span style={{
                background:"#c9a05514", border:"1px solid #c9a05550",
                color:"#c9a055", borderRadius:20, padding:"4px 10px",
                fontSize:"0.7em", fontWeight:800,
              }}>
                Requiere cotizacion / 需要报价
              </span>
            )}
          </div>

          {/* Producto */}
          <div style={{ fontWeight:800, fontSize:"1.05em", color:"#e8e0d0", lineHeight:1.3, marginBottom:2 }}>
            {c.producto || "-"}
          </div>
          <div style={{ fontSize:"0.65em", color:"#c9a05540", marginBottom:12 }}>
            产品名称 / Nombre del producto
          </div>

          {/* Datos rapidos */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:22 }}>

            <div>
              <div style={{ fontWeight:900, fontSize:"1.1em", color:"#c9a055" }}>{c.unidades || "-"}</div>
              <div style={{ fontSize:"0.62em", color:"#c9a05545", marginTop:2 }}>数量 / Unidades</div>
            </div>

            <div>
              <div style={{ fontWeight:600, fontSize:"0.86em", color:"#6a9fd4" }}>{transp[0]}</div>
              <div style={{ fontSize:"0.62em", color:"#c9a05545", marginTop:2 }}>{transp[1]} / Transporte</div>
            </div>

            <div>
              <div style={{ fontWeight:500, fontSize:"0.82em", color:"#6a9fd4" }}>{fmtDate(c.fecha_solicitud)}</div>
              <div style={{ fontSize:"0.62em", color:"#c9a05545", marginTop:2 }}>{fmtDateZH(c.fecha_solicitud)} / Fecha</div>
            </div>

            <div>
              <div style={{ fontWeight:700, fontSize:"0.78em", color:"#3a5a7a", fontFamily:"monospace" }}>#{nro}</div>
              <div style={{ fontSize:"0.62em", color:"#c9a05545", marginTop:2 }}>编号 / N solicitud</div>
            </div>

          </div>
        </div>

        {/* Chevron */}
        <div style={{
          width:28, height:28, borderRadius:"50%", flexShrink:0,
          background:"#c9a05512", border:"1px solid #c9a05530",
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"#c9a055", fontSize:"0.7em",
          transition:"transform 0.2s",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ▼
        </div>
      </div>

      {/* DETALLE EXPANDIDO */}
      {expanded && (
        <div style={{
          borderTop:"1px solid #c9a05520",
          padding:"18px 18px",
          display:"flex", flexDirection:"column", gap:18,
          background:"#040c1880",
        }}>

          {/* Link Alibaba */}
          <Seccion es="Link de Alibaba" zh="阿里巴巴链接">
            {c.link_alibaba ? (
              <a
                href={c.link_alibaba}
                target="_blank"
                rel="noreferrer"
                style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  background:"#c9a05514", border:"1px solid #c9a05545",
                  color:"#c9a055", borderRadius:10, padding:"11px 18px",
                  textDecoration:"none", fontWeight:700, fontSize:"0.88em",
                  fontFamily:"inherit",
                }}
              >
                🔗 Ver producto en Alibaba / 查看产品
              </a>
            ) : (
              <span style={{ fontSize:"0.82em", color:"#c9a05530", fontStyle:"italic" }}>
                Sin link / 暂无链接
              </span>
            )}
          </Seccion>

          {/* SKU */}
          {c.sku_china && (
            <Seccion es="SKU / Codigo China" zh="产品编号">
              <span style={{
                fontFamily:"'Courier New',monospace",
                background:"#0a1a2e", border:"1px solid #c9a05525",
                padding:"8px 14px", borderRadius:8,
                fontSize:"0.94em", color:"#d0c8a8",
                display:"inline-block", letterSpacing:1,
              }}>
                {c.sku_china}
              </span>
            </Seccion>
          )}

          {/* Variantes */}
          {c.variantes && (
            <Seccion es="Variantes / Colores / Especificaciones" zh="规格 / 颜色 / 变体">
              <div style={{
                background:"#0a1a2e", border:"1px solid #c9a05520",
                padding:"13px 16px", borderRadius:10,
                fontSize:"0.88em", lineHeight:1.65, color:"#d0c8a8",
                whiteSpace:"pre-wrap", maxHeight:200, overflowY:"auto",
              }}>
                {c.variantes}
              </div>
            </Seccion>
          )}

          {/* Notas visibles */}
          {visibles.length > 0 && (
            <Seccion es="Notas / Observaciones" zh="备注说明">
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {visibles.slice(-3).map((n, i) => (
                  <div key={i} style={{
                    background:"#0a1a2e",
                    borderLeft:"3px solid #c9a055",
                    padding:"11px 14px", borderRadius:"0 9px 9px 0",
                    fontSize:"0.86em", lineHeight:1.6, color:"#d0c8a8",
                  }}>
                    <div>{n.texto}</div>
                    {n.fecha && <div style={{ fontSize:"0.75em", color:"#c9a05540", marginTop:5 }}>{n.fecha}</div>}
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {/* Fecha llegada — solo si en camino */}
          {c.fecha_llegada_est && ESTADOS_CAMINO.includes(est) && (
            <Seccion es="Fecha estimada de llegada" zh="预计到达时间">
              <div style={{
                display:"inline-flex", gap:12, alignItems:"center",
                background:"#a8559014", border:"1px solid #a8559040",
                padding:"10px 18px", borderRadius:10,
              }}>
                <span style={{ fontSize:"1.3em" }}>🚢</span>
                <div>
                  <div style={{ fontWeight:700, color:"#c080d0", fontSize:"0.96em" }}>{fmtDate(c.fecha_llegada_est)}</div>
                  <div style={{ fontSize:"0.7em", color:"#a85590", marginTop:2 }}>{fmtDateZH(c.fecha_llegada_est)}</div>
                </div>
              </div>
            </Seccion>
          )}

        </div>
      )}
    </div>
  )
}

function Seccion({ es, zh, children }) {
  return (
    <div>
      <div style={{ display:"flex", gap:6, alignItems:"baseline", marginBottom:9 }}>
        <span style={{ fontSize:"0.74em", fontWeight:700, color:"#c9a055", letterSpacing:0.3 }}>{es}</span>
        <span style={{ fontSize:"0.65em", color:"#c9a05540" }}>/ {zh}</span>
      </div>
      {children}
    </div>
  )
}
