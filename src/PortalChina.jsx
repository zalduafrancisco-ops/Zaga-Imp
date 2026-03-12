import { useState, useEffect } from 'react'
import LOGO_WHITE from "./logo-white.png"

// ─────────────────────────────────────────────────────────────────────────────
//  PortalChina.jsx — Portal de Agente China — ZAGA IMP
//  Bilingüe: 中文 arriba / Español abajo (para verificación de Francisco)
//  Sin precios, sin nombres de cliente, sin notas ocultas
//
//  CONTRASEÑA: Cambia CHINA_PASS abajo cuando quieras.
//  INTEGRACIÓN: En App.jsx, cuando perfil.tipo === "china_agente", renderiza
//               <PortalChina supabase={supabase} onLogout={handleLogout} />
// ─────────────────────────────────────────────────────────────────────────────

const CHINA_PASS = "zaga2024"   // ← Cambia la contraseña aquí

// Estados relevantes para el agente China
const ESTADOS_PENDIENTE = ["enviado_china"]
const ESTADOS_ACTIVOS   = ["aceptada","pagada_china","en_produccion","almacen_china","ctrl_calidad"]
const ESTADOS_CAMINO    = ["en_camino"]

// Estado → [Chino, Español, color hex]
const EST_INFO = {
  enviado_china:  ["⏳ 待报价",    "Pendiente cotización",   "#c9a055"],
  aceptada:       ["✅ 订单已接受",  "Orden aceptada",         "#1aa358"],
  pagada_china:   ["💰 付款处理中", "Pago en proceso",         "#c47830"],
  en_produccion:  ["🏭 生产中",    "En producción",           "#3d9fd4"],
  almacen_china:  ["📦 中国仓库",  "En almacén China",        "#9060d4"],
  ctrl_calidad:   ["🔍 质量检验",  "Control de calidad",      "#3d9fd4"],
  en_camino:      ["🚢 运输中",    "En camino a destino",     "#a85590"],
}

// Transporte → [Chino, Español]
const TRANSP = {
  maritimo: ["🚢 海运",     "Marítimo"],
  aereo:    ["✈️ 空运",    "Aéreo"],
  ambos:    ["🚢✈️ 海运+空运", "Marítimo + Aéreo"],
}

function fmtDate(str) {
  if (!str) return "—"
  const d = new Date(str)
  if (isNaN(d)) return str
  // Formato legible para China: YYYY年MM月DD日
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0")
  return `${y}年${m}月${day}日`
}

function fmtDateES(str) {
  if (!str) return "—"
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PortalChina({ supabase, onLogout }) {
  const [logged, setLogged]       = useState(() => sessionStorage.getItem("zaga_china_v1") === "1")
  const [passInput, setPassInput] = useState("")
  const [loginErr, setLoginErr]   = useState(false)
  const [tab, setTab]             = useState("pending")
  const [cots, setCots]           = useState([])
  const [expanded, setExpanded]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [pulse, setPulse]         = useState(false)  // animación al recibir update

  // Carga de datos al hacer login
  useEffect(() => {
    if (!logged) return
    loadData()
    const channel = supabase.channel("zaga-portal-china-v1")
      .on("postgres_changes", { event:"*", schema:"public", table:"cotizaciones" }, () => {
        loadData()
        setPulse(true)
        setTimeout(() => setPulse(false), 1800)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [logged])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from("cotizaciones")
      .select("id,datos,created_at,updated_at")
    if (!error && data) {
      const todos_estados = [...ESTADOS_PENDIENTE, ...ESTADOS_ACTIVOS, ...ESTADOS_CAMINO]
      const relevantes = data
        .map(r => ({ ...r.datos, _id: r.id, _updated: r.updated_at || r.created_at }))
        .filter(c => todos_estados.includes(c.estado))
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

  function handleLogin() {
    if (passInput === CHINA_PASS) {
      sessionStorage.setItem("zaga_china_v1", "1")
      setLogged(true)
      setLoginErr(false)
    } else {
      setLoginErr(true)
      setPassInput("")
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("zaga_china_v1")
    setLogged(false)
    if (onLogout) onLogout()
  }

  const pending  = cots.filter(c => ESTADOS_PENDIENTE.includes(c.estado))
  const active   = cots.filter(c => ESTADOS_ACTIVOS.includes(c.estado))
  const shipping = cots.filter(c => ESTADOS_CAMINO.includes(c.estado))
  const shown = tab === "pending" ? pending : tab === "active" ? active : shipping

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (!logged) {
    return (
      <div style={{
        minHeight:"100vh", background:"#040c18",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        fontFamily:"'Inter','Segoe UI',sans-serif", padding:24,
      }}>
        {/* Fondo decorativo */}
        <div style={{
          position:"fixed", inset:0, pointerEvents:"none",
          background:"radial-gradient(ellipse 60% 50% at 50% 0%,#c9a05508 0%,transparent 70%)",
        }}/>
        <img src={LOGO_WHITE} alt="ZAGA IMP" style={{ height:56, objectFit:"contain", marginBottom:32, position:"relative" }} />
        <div style={{
          background:"#071428", border:"1px solid #c9a05538",
          borderRadius:20, padding:"36px 32px", width:"100%", maxWidth:380,
          boxShadow:"0 32px 80px #00000080, 0 0 0 1px #c9a05510",
          position:"relative",
        }}>
          {/* Header bilingüe */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:"1.6em", fontWeight:800, color:"#c9a055", letterSpacing:0.5, marginBottom:6 }}>
              代理商登录
            </div>
            <div style={{ fontSize:"0.8em", opacity:0.38, color:"#e8e0d0", fontWeight:400 }}>
              Acceso Agente China — ZAGA IMP
            </div>
          </div>

          {/* Campo contraseña */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", gap:5, marginBottom:8, alignItems:"baseline" }}>
              <span style={{ fontSize:"0.82em", fontWeight:700, color:"#c9a055" }}>密码</span>
              <span style={{ fontSize:"0.72em", opacity:0.38, color:"#e8e0d0" }}>/ Contraseña</span>
            </div>
            <input
              type="password"
              value={passInput}
              onChange={e => { setPassInput(e.target.value); setLoginErr(false) }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              autoFocus
              style={{
                width:"100%", padding:"13px 16px",
                background:"#0a1a2e",
                border:`1.5px solid ${loginErr ? "#e05a5a70" : "#c9a05530"}`,
                borderRadius:10, color:"#e8e0d0", fontSize:"1.05em",
                outline:"none", boxSizing:"border-box",
                transition:"border-color 0.2s",
                fontFamily:"inherit",
              }}
            />
          </div>

          {/* Error message */}
          {loginErr && (
            <div style={{
              color:"#e07878", fontSize:"0.78em", marginBottom:14,
              textAlign:"center", padding:"8px 12px",
              background:"#e05a5a12", border:"1px solid #e05a5a30", borderRadius:7,
            }}>
              <div>密码错误，请重试</div>
              <div style={{ opacity:0.6, fontSize:"0.9em", marginTop:2 }}>Contraseña incorrecta</div>
            </div>
          )}

          {/* Botón login */}
          <button
            onClick={handleLogin}
            style={{
              width:"100%", padding:"14px",
              background:"linear-gradient(135deg,#c9a055 0%,#a8823c 100%)",
              border:"none", borderRadius:10,
              color:"#040c18", fontWeight:800, fontSize:"1em",
              cursor:"pointer", letterSpacing:0.3,
              boxShadow:"0 4px 20px #c9a05530",
              transition:"transform 0.1s, box-shadow 0.1s",
              fontFamily:"inherit",
            }}
          >
            登录 <span style={{ opacity:0.65, fontWeight:500 }}>/ Ingresar</span>
          </button>
        </div>
        <div style={{ marginTop:28, opacity:0.18, fontSize:"0.72em", color:"#e8e0d0" }}>
          ZAGA IMP © 2025
        </div>
      </div>
    )
  }

  // ── PORTAL PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh", background:"#040c18", color:"#e8e0d0",
      fontFamily:"'Inter','Segoe UI',sans-serif",
    }}>
      {/* Fondo decorativo sutil */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background:"radial-gradient(ellipse 70% 40% at 50% 0%,#c9a05506 0%,transparent 60%)",
      }}/>

      {/* ── HEADER ── */}
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
              代理商门户
            </div>
            <div style={{ fontSize:"0.65em", opacity:0.35, marginTop:1 }}>
              Portal Agente China
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* Indicador real-time */}
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{
              width:7, height:7, borderRadius:"50%",
              background: pulse ? "#1aa358" : "#1aa35870",
              boxShadow: pulse ? "0 0 8px #1aa358" : "none",
              transition:"all 0.3s",
            }}/>
            <div style={{ fontSize:"0.62em", opacity:0.35 }}>
              <div>实时</div>
              <div>En vivo</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background:"#c9a05516", border:"1px solid #c9a05538",
              color:"#c9a055", borderRadius:8, padding:"7px 14px",
              cursor:"pointer", fontSize:"0.8em", fontWeight:600,
              fontFamily:"inherit",
            }}
          >
            退出 <span style={{ opacity:0.5, fontWeight:400 }}>/ Salir</span>
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ padding:"16px 16px 0", maxWidth:740, margin:"0 auto", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", gap:8 }}>
          {[
            { id:"pending",  badge: pending.length,  zh:"⏳ 待报价",    es:"Pendientes",   urgent: pending.length > 0 },
            { id:"active",   badge: active.length,   zh:"🏭 进行中",    es:"En producción" },
            { id:"shipping", badge: shipping.length, zh:"🚢 运输中",    es:"En camino" },
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
              <div style={{ fontWeight:800, fontSize:"0.9em", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                {t.zh}
                {t.badge > 0 && (
                  <span style={{
                    background: tab === t.id ? "#c9a055" : (t.urgent ? "#c9a055" : "#6a8aaa"),
                    color: "#040c18", borderRadius:20, padding:"1px 6px",
                    fontSize:"0.7em", fontWeight:900, minWidth:16, textAlign:"center",
                  }}>
                    {t.badge}
                  </span>
                )}
              </div>
              <div style={{ fontSize:"0.67em", opacity:0.55, marginTop:2 }}>{t.es}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── LISTA DE COTIZACIONES ── */}
      <div style={{ padding:"14px 16px 40px", maxWidth:740, margin:"0 auto", position:"relative", zIndex:1 }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:56, opacity:0.3 }}>
            <div style={{ fontSize:"1.8em", marginBottom:10 }}>⏳</div>
            <div style={{ fontWeight:600 }}>加载中</div>
            <div style={{ fontSize:"0.8em", marginTop:3 }}>Cargando…</div>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign:"center", padding:56, opacity:0.28 }}>
            <div style={{ fontSize:"2.4em", marginBottom:12 }}>📭</div>
            <div style={{ fontWeight:700, fontSize:"1.05em", marginBottom:4 }}>
              {tab === "pending" ? "暂无待报价请求"
               : tab === "active" ? "暂无进行中订单"
               : "暂无运输中货物"}
            </div>
            <div style={{ fontSize:"0.8em" }}>
              {tab === "pending" ? "No hay solicitudes pendientes de cotización"
               : tab === "active" ? "No hay órdenes en producción actualmente"
               : "No hay envíos en camino actualmente"}
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

// ─────────────────────────────────────────────────────────────────────────────
//  TARJETA INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────
function CotCard({ c, expanded, onToggle }) {
  const est     = c.estado || "enviado_china"
  const estInfo = EST_INFO[est] || ["📄", est, "#6a9fd4"]
  const isPend  = ESTADOS_PENDIENTE.includes(est)
  const transp  = TRANSP[c.transporte] || TRANSP["maritimo"]
  const nro     = c.nro_cotizacion || c.nro || String(c._id || "").slice(-6).toUpperCase() || "—"

  // Notas visibles (sin ocultas)
  let notasArr = []
  try {
    if (Array.isArray(c.notas_historial)) {
      notasArr = c.notas_historial
    } else if (typeof c.notas_historial === "string" && c.notas_historial) {
      notasArr = JSON.parse(c.notas_historial)
    }
  } catch(e) { notasArr = [] }
  if (notasArr.length === 0 && c.notas_internas) {
    notasArr = [{ texto: c.notas_internas, fecha: "", oculta: false }]
  }
  const visibles = notasArr.filter(n => !n.oculta)

  return (
    <div style={{
      background: isPend
        ? "linear-gradient(160deg,#08203a 0%,#0a1828 100%)"
        : "#071428",
      border: isPend ? "1.5px solid #c9a05558" : "1px solid #c9a05520",
      borderRadius: 15,
      marginBottom: 14,
      overflow:"hidden",
      boxShadow: isPend ? "0 6px 28px #c9a05512" : "none",
      transition:"all 0.2s",
    }}>

      {/* ── CABECERA — siempre visible ── */}
      <div
        onClick={onToggle}
        style={{
          padding:"16px 18px", cursor:"pointer",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12,
        }}
      >
        <div style={{ flex:1, minWidth:0 }}>

          {/* Badges de estado */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            <span style={{
              background:`${estInfo[2]}20`, border:`1px solid ${estInfo[2]}55`,
              color: estInfo[2], borderRadius:20, padding:"4px 11px",
              fontSize:"0.73em", fontWeight:700, whiteSpace:"nowrap",
            }}>
              {estInfo[0]}
              <span style={{ opacity:0.5, fontWeight:400, marginLeft:5 }}>/ {estInfo[1]}</span>
            </span>
            {isPend && (
              <span style={{
                background:"#e05a5a15", border:"1px solid #e05a5a45",
                color:"#e07878", borderRadius:20, padding:"4px 10px",
                fontSize:"0.7em", fontWeight:800, whiteSpace:"nowrap",
                animation: "none",
              }}>
                需要报价 / Necesita cotización
              </span>
            )}
          </div>

          {/* Nombre del producto — en ambos idiomas si hay traducción, si no el mismo */}
          <div style={{ fontWeight:800, fontSize:"1.06em", color:"#e8e0d0", lineHeight:1.3, marginBottom:2 }}>
            {c.producto || "—"}
          </div>
          <div style={{ fontSize:"0.66em", opacity:0.38, marginBottom:12 }}>
            产品名称 / Nombre del producto
          </div>

          {/* Fila de datos rápidos */}
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            {/* Cantidad */}
            <div>
              <div style={{ fontWeight:900, fontSize:"1.12em", color:"#c9a055", lineHeight:1 }}>
                {c.unidades || "—"}
              </div>
              <div style={{ fontSize:"0.62em", opacity:0.38, marginTop:2 }}>
                <div>数量</div>
                <div>Unidades</div>
              </div>
            </div>
            {/* Transporte */}
            <div>
              <div style={{ fontWeight:600, fontSize:"0.88em", color:"#8ab4d4", lineHeight:1 }}>
                {transp[0]}
              </div>
              <div style={{ fontSize:"0.62em", opacity:0.38, marginTop:2 }}>
                <div>运输方式</div>
                <div>{transp[1]}</div>
              </div>
            </div>
            {/* Fecha */}
            <div>
              <div style={{ fontWeight:500, fontSize:"0.8em", color:"#8ab4d4", lineHeight:1 }}>
                {fmtDate(c.fecha_solicitud)}
              </div>
              <div style={{ fontSize:"0.62em", opacity:0.38, marginTop:2 }}>
                <div>发送日期</div>
                <div style={{ opacity:0.7 }}>{fmtDateES(c.fecha_solicitud)}</div>
              </div>
            </div>
            {/* Nro */}
            <div>
              <div style={{ fontWeight:700, fontSize:"0.78em", color:"#5a7a9a", fontFamily:"monospace", lineHeight:1 }}>
                #{nro}
              </div>
              <div style={{ fontSize:"0.62em", opacity:0.38, marginTop:2 }}>
                <div>编号</div>
                <div>N° solicitud</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chevron */}
        <div style={{
          width:28, height:28, borderRadius:"50%", flexShrink:0,
          background:"#c9a05514", border:"1px solid #c9a05530",
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"#c9a055", fontSize:"0.75em", marginTop:2,
          transition:"transform 0.2s",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ▼
        </div>
      </div>

      {/* ── DETALLE EXPANDIDO ── */}
      {expanded && (
        <div style={{ borderTop:"1px solid #c9a05518", padding:"18px 18px", display:"flex", flexDirection:"column", gap:18 }}>

          {/* Link Alibaba — lo más importante */}
          <Section zh="阿里巴巴链接" es="Link de Alibaba">
            {c.link_alibaba ? (
              <a
                href={c.link_alibaba}
                target="_blank"
                rel="noreferrer"
                style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  background:"linear-gradient(135deg,#c9a05518,#c9a05508)",
                  border:"1px solid #c9a05548", color:"#c9a055",
                  borderRadius:10, padding:"11px 18px",
                  textDecoration:"none", fontWeight:700, fontSize:"0.88em",
                  boxShadow:"0 2px 12px #c9a05515",
                  fontFamily:"'Inter','Segoe UI',sans-serif",
                }}
              >
                🔗 查看产品
                <span style={{ opacity:0.5, fontWeight:400, marginLeft:2 }}>/ Ver producto en Alibaba</span>
              </a>
            ) : (
              <div style={{ fontSize:"0.82em", opacity:0.35, fontStyle:"italic" }}>
                暂无链接 / Sin link de Alibaba
              </div>
            )}
          </Section>

          {/* SKU China */}
          {c.sku_china && (
            <Section zh="产品编号" es="SKU / Código China">
              <div style={{
                fontFamily:"'Courier New',monospace",
                background:"#0a1a2e", border:"1px solid #c9a05525",
                padding:"8px 14px", borderRadius:8,
                fontSize:"0.94em", color:"#d0c8a8",
                display:"inline-block", letterSpacing:1,
              }}>
                {c.sku_china}
              </div>
            </Section>
          )}

          {/* Variantes / Specs */}
          {c.variantes && (
            <Section zh="规格 / 颜色 / 变体" es="Variantes / Colores / Especificaciones">
              <div style={{
                background:"#0a1a2e", border:"1px solid #c9a05520",
                padding:"13px 16px", borderRadius:10,
                fontSize:"0.88em", lineHeight:1.65,
                color:"#d0c8a8", whiteSpace:"pre-wrap",
                maxHeight:200, overflowY:"auto",
              }}>
                {c.variantes}
              </div>
            </Section>
          )}

          {/* Notas visibles — máximo las últimas 3 */}
          {visibles.length > 0 && (
            <Section zh="备注 / 说明" es="Notas / Observaciones">
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {visibles.slice(-3).map((n, i) => (
                  <div key={i} style={{
                    background:"#0a1a2e",
                    borderLeft:"3px solid #c9a055",
                    padding:"11px 14px", borderRadius:"0 9px 9px 0",
                    fontSize:"0.86em", lineHeight:1.6, color:"#d0c8a8",
                  }}>
                    <div>{n.texto}</div>
                    {n.fecha && (
                      <div style={{ opacity:0.35, fontSize:"0.75em", marginTop:5 }}>
                        {n.fecha}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Fecha llegada estimada — si existe y está en camino */}
          {c.fecha_llegada_est && ESTADOS_CAMINO.includes(est) && (
            <Section zh="预计到达时间" es="Fecha de llegada estimada">
              <div style={{
                display:"inline-flex", gap:10, alignItems:"center",
                background:"#a8559018", border:"1px solid #a8559040",
                padding:"10px 16px", borderRadius:10,
              }}>
                <span style={{ fontSize:"1.2em" }}>🚢</span>
                <div>
                  <div style={{ fontWeight:700, color:"#c080d0", fontSize:"0.95em" }}>
                    {fmtDate(c.fecha_llegada_est)}
                  </div>
                  <div style={{ fontSize:"0.72em", opacity:0.5, marginTop:2 }}>
                    {fmtDateES(c.fecha_llegada_est)}
                  </div>
                </div>
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sección bilingüe con título
// ─────────────────────────────────────────────────────────────────────────────
function Section({ zh, es, children }) {
  return (
    <div>
      <div style={{ display:"flex", gap:5, alignItems:"baseline", marginBottom:9 }}>
        <span style={{ fontSize:"0.76em", fontWeight:700, color:"#c9a055", letterSpacing:0.3 }}>{zh}</span>
        <span style={{ fontSize:"0.66em", opacity:0.35, color:"#e8e0d0" }}>/ {es}</span>
      </div>
      {children}
    </div>
  )
}
