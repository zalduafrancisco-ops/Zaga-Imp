import { useState, useEffect } from 'react'
import LOGO_WHITE from "./logo-white.png"

// PortalChina.jsx - Portal Agente China - ZAGA IMP
// Sin login interno - auth manejado por Supabase (rol agente_china)
// ACTUALIZACION: 5 tabs + dashboard + filtro premium

// ─── Grupos de estados por tab ───────────────────────────────────────────────
const ESTADOS_PEND_COT      = ["enviado_china", "re_testeando"]
const ESTADOS_PEND_CLIENTE  = ["respuesta_china", "enviada_cliente", "en_negociacion"]
const ESTADOS_CONFIRMADAS   = ["aceptada", "pagada_china"]
const ESTADOS_CAMINO        = ["en_camino"]
const ESTADOS_COMPLETADAS   = ["completada"]

const TODOS_ESTADOS = [
  ...ESTADOS_PEND_COT, ...ESTADOS_PEND_CLIENTE,
  ...ESTADOS_CONFIRMADAS, ...ESTADOS_CAMINO, ...ESTADOS_COMPLETADAS,
]

// ─── Colores y etiquetas de estado ───────────────────────────────────────────
const EST_COLOR = {
  enviado_china:   "#2a8aaa",
  re_testeando:    "#6a9fd4",
  respuesta_china: "#b8922e",
  enviada_cliente: "#2d78c8",
  en_negociacion:  "#c47830",
  aceptada:        "#1aa358",
  pagada_china:    "#c47830",
  en_camino:       "#a85590",
  completada:      "#0d9870",
}
const EST_BG = {
  enviado_china:   "#e8f5f9",
  re_testeando:    "#eef4fb",
  respuesta_china: "#fdf6e3",
  enviada_cliente: "#eff6ff",
  en_negociacion:  "#fdf0e3",
  aceptada:        "#eafaf1",
  pagada_china:    "#fdf0e3",
  en_camino:       "#f8f0fb",
  completada:      "#f0fdf4",
}
const EST_ES = {
  enviado_china:   "Pendiente de cotizacion",
  re_testeando:    "Re-testeando precio",
  respuesta_china: "Cotizacion recibida",
  enviada_cliente: "Enviada al cliente",
  en_negociacion:  "En negociacion",
  aceptada:        "Orden aceptada",
  pagada_china:    "Pago realizado",
  en_camino:       "En camino",
  completada:      "Completada",
}
const EST_ZH = {
  enviado_china:   "等待报价",
  re_testeando:    "重新议价中",
  respuesta_china: "报价已收到",
  enviada_cliente: "已发给客户",
  en_negociacion:  "谈判中",
  aceptada:        "订单已接受",
  pagada_china:    "付款已完成",
  en_camino:       "运输中",
  completada:      "已完成",
}

const TRANSP_ES = { maritimo:"Maritimo", aereo:"Aereo", ambos:"Maritimo + Aereo" }
const TRANSP_ZH = { maritimo:"海运", aereo:"空运", ambos:"海运+空运" }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return "-"
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString("es-CL", { day:"2-digit", month:"short", year:"numeric" })
}
function fmtDateZH(str) {
  if (!str) return "-"
  const d = new Date(str)
  if (isNaN(d)) return str
  return `${d.getFullYear()}年${String(d.getMonth()+1).padStart(2,"0")}月${String(d.getDate()).padStart(2,"0")}日`
}
function fmtCLP(n) {
  if (!n || isNaN(n)) return "$0"
  return "$" + Math.round(n).toLocaleString("es-CL")
}
function fmtUSD(n) {
  if (!n || isNaN(n)) return "US$0"
  return "US$" + Number(n).toLocaleString("en-US", { minimumFractionDigits:0, maximumFractionDigits:0 })
}
function fmtCNY(n) {
  if (!n || isNaN(n)) return "¥0"
  return "¥" + Math.round(n).toLocaleString("zh-CN")
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PortalChina({ supabase, onLogout }) {
  const [tab, setTab]               = useState("pend_cot")
  const [cots, setCots]             = useState([])
  const [expanded, setExpanded]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [pulse, setPulse]           = useState(false)
  const [soloPremium, setSoloPremium] = useState(false)

  useEffect(() => {
    loadData()
    const channel = supabase.channel("zaga-portal-china-v3")
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
      const relevantes = data
        .map(r => ({ ...r.datos, _id: r.id, _updated: r.updated_at || r.created_at }))
        .filter(c => TODOS_ESTADOS.includes(c.estado))
        .sort((a, b) => new Date(b._updated) - new Date(a._updated))
      setCots(relevantes)
    }
    setLoading(false)
  }

  // ─── Grupos por tab ───────────────────────────────────────────────────────
  const pendCot     = cots.filter(c => ESTADOS_PEND_COT.includes(c.estado))
  const pendCliente = cots.filter(c => ESTADOS_PEND_CLIENTE.includes(c.estado))
  const confirmadas = cots.filter(c => ESTADOS_CONFIRMADAS.includes(c.estado))
  const camino      = cots.filter(c => ESTADOS_CAMINO.includes(c.estado))
  const completadas = cots.filter(c => ESTADOS_COMPLETADAS.includes(c.estado))

  const tabMap = {
    pend_cot:     pendCot,
    pend_cliente: pendCliente,
    confirmadas:  confirmadas,
    camino:       camino,
    completadas:  completadas,
    dashboard:    [],
  }

  const listaBruta = tabMap[tab] || []
  const shown = soloPremium
    ? listaBruta.filter(c => c.categoria_cliente === "premium")
    : listaBruta

  // Hay premium en tabs activas (no completadas/dashboard)?
  const hayPremium = cots.some(c =>
    c.categoria_cliente === "premium" &&
    [...ESTADOS_PEND_COT, ...ESTADOS_PEND_CLIENTE, ...ESTADOS_CONFIRMADAS, ...ESTADOS_CAMINO].includes(c.estado)
  )

  const TABS = [
    {
      id:"pend_cot",
      label:"待报价 Pend. cotización",
      count: pendCot.length,
      urgent: pendCot.length > 0,
    },
    {
      id:"pend_cliente",
      label:"待客户 Pend. cliente",
      count: pendCliente.length,
      urgent: false,
    },
    {
      id:"confirmadas",
      label:"已确认 Confirmadas",
      count: confirmadas.length,
      urgent: false,
    },
    {
      id:"camino",
      label:"运输中 En camino",
      count: camino.length,
      urgent: false,
    },
    {
      id:"completadas",
      label:"已完成 Completadas",
      count: completadas.length,
      urgent: false,
    },
    {
      id:"dashboard",
      label:"📊 数据",
      count: null,
      urgent: false,
    },
  ]

  const EMPTY_MSG = {
    pend_cot:     { zh:"暂无待报价请求",        es:"No hay solicitudes esperando cotizacion" },
    pend_cliente: { zh:"暂无等待客户确认的报价",  es:"No hay cotizaciones pendientes de respuesta del cliente" },
    confirmadas:  { zh:"暂无进行中订单",         es:"No hay ordenes confirmadas" },
    camino:       { zh:"暂无运输中货物",          es:"No hay envios en camino" },
    completadas:  { zh:"暂无已完成记录",          es:"No hay importaciones completadas" },
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{
        background:"#040c18",
        borderBottom:"2px solid #c9a05530",
        padding:"0 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        height:54, position:"sticky", top:0, zIndex:100,
        boxShadow:"0 2px 12px #00000040",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <img src={LOGO_WHITE} alt="ZAGA IMP" style={{ height:32, objectFit:"contain" }} />
          <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", letterSpacing:2, textTransform:"uppercase" }}>
            Gestion de Importaciones
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {pendCot.length > 0 && (
            <div style={{
              display:"flex", alignItems:"center", gap:6,
              background:"#c9a05520", border:"1px solid #c9a05540",
              borderRadius:20, padding:"4px 12px",
            }}>
              <div style={{
                width:7, height:7, borderRadius:"50%",
                background:"#c9a055",
                boxShadow: pulse ? "0 0 8px #c9a055" : "none",
                transition:"all 0.3s",
              }}/>
              <span style={{ fontSize:12, fontWeight:700, color:"#c9a055" }}>
                {pendCot.length} 待报价
              </span>
            </div>
          )}
          <button
            onClick={() => onLogout && onLogout()}
            style={{
              background:"transparent", border:"1px solid #ffffff20",
              color:"#94a3b8", borderRadius:8, padding:"6px 16px",
              cursor:"pointer", fontSize:12, fontWeight:600,
              fontFamily:"inherit", transition:"all 0.15s",
            }}
          >
            退出 / Salir
          </button>
        </div>
      </div>

      {/* ── SUBHEADER ───────────────────────────────────────────────── */}
      <div style={{
        background:"#040c18",
        borderBottom:"1px solid #1e293b",
        padding:"8px 24px 12px",
      }}>
        <div style={{ fontSize:13, color:"#c9a055", fontWeight:700, letterSpacing:0.3 }}>
          代理商门户 — Portal Agente China
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────────────── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 24px", overflowX:"auto" }}>
        <div style={{ display:"flex", gap:0, minWidth:"max-content" }}>
          {TABS.map(t => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setExpanded(null); }}
                style={{
                  padding:"14px 18px",
                  background:"transparent",
                  border:"none",
                  borderBottom: isActive ? "2px solid #c9a055" : "2px solid transparent",
                  color: isActive ? "#0f172a" : "#64748b",
                  fontWeight: isActive ? 700 : 500,
                  fontSize:13,
                  cursor:"pointer",
                  display:"flex", alignItems:"center", gap:7,
                  fontFamily:"inherit",
                  transition:"all 0.15s",
                  marginBottom:-1,
                  whiteSpace:"nowrap",
                }}
              >
                {t.label}
                {t.count !== null && t.count > 0 && (
                  <span style={{
                    background: isActive ? "#040c18" : (t.urgent ? "#c9a055" : "#e2e8f0"),
                    color: isActive ? "#c9a055" : (t.urgent ? "#040c18" : "#64748b"),
                    borderRadius:20, padding:"1px 8px",
                    fontSize:11, fontWeight:800,
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── FILTRO PREMIUM ──────────────────────────────────────────── */}
      {tab !== "dashboard" && hayPremium && (
        <div style={{ maxWidth:900, margin:"12px auto 0", padding:"0 16px" }}>
          <button
            onClick={() => setSoloPremium(!soloPremium)}
            style={{
              background: soloPremium ? "#c9a055" : "#fff",
              color: soloPremium ? "#040c18" : "#94a3b8",
              border: `1px solid ${soloPremium ? "#c9a055" : "#e2e8f0"}`,
              borderRadius:20, padding:"5px 14px",
              fontSize:12, cursor:"pointer", fontWeight:700,
              transition:"all 0.15s", fontFamily:"inherit",
            }}
          >
            ⭐ {soloPremium ? "⭐ Solo Premium — activo (quitar filtro)" : "Filtrar: solo clientes Premium"}
          </button>
        </div>
      )}

      {/* ── CONTENIDO ───────────────────────────────────────────────── */}
      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 16px 48px" }}>
        {tab === "dashboard" ? (
          <DashboardChina
            cots={cots}
            pendCot={pendCot}
            pendCliente={pendCliente}
            confirmadas={confirmadas}
            camino={camino}
            completadas={completadas}
          />
        ) : loading ? (
          <div style={{ textAlign:"center", padding:64, color:"#94a3b8" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
            <div style={{ fontWeight:600 }}>加载中 / Cargando...</div>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign:"center", padding:64, color:"#94a3b8" }}>
            <div style={{ fontSize:40, marginBottom:14 }}>📭</div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4, color:"#475569" }}>
              {soloPremium ? "暂无 Premium 记录" : (EMPTY_MSG[tab]?.zh || "暂无记录")}
            </div>
            <div style={{ fontSize:13 }}>
              {soloPremium ? "No hay elementos Premium en esta categoria" : (EMPTY_MSG[tab]?.es || "Sin registros")}
            </div>
            {soloPremium && (
              <button
                onClick={() => setSoloPremium(false)}
                style={{ marginTop:14, background:"#f1f5f9", color:"#64748b", border:"1px solid #e2e8f0", borderRadius:20, padding:"6px 16px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}
              >
                Quitar filtro Premium
              </button>
            )}
          </div>
        ) : (
          shown.map(c => {
            const uid = c._id || c.id
            return (
              <CotCard
                key={uid}
                c={c}
                supabase={supabase}
                recargar={loadData}
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardChina({ cots, pendCot, pendCliente, confirmadas, camino, completadas }) {
  // Totales sobre cotizaciones procesadas (confirmadas + camino + completadas)
  const procesadas = [...confirmadas, ...camino, ...completadas]

  const totalCLPCompletadas = completadas.reduce((s, c) => s + (c.calc?.totCl || 0), 0)
  const totalCLPProcesadas  = procesadas.reduce((s, c) => s + (c.calc?.totCl || 0), 0)

  // USD: precio_china * unidades (precio China generalmente en USD)
  const totalUSDProcesadas = procesadas.reduce((s, c) => {
    return s + ((Number(c.precio_china) || 0) * (Number(c.unidades) || 0))
  }, 0)
  const totalUSDCompletadas = completadas.reduce((s, c) => {
    return s + ((Number(c.precio_china) || 0) * (Number(c.unidades) || 0))
  }, 0)

  // CNY estimado: USD * 7.2
  const CNY_RATE = 7.2
  const totalCNYProcesadas  = totalUSDProcesadas * CNY_RATE
  const totalCNYCompletadas = totalUSDCompletadas * CNY_RATE

  const totalUnidades = procesadas.reduce((s, c) => s + (Number(c.unidades) || 0), 0)
  const totalUnidadesComp = completadas.reduce((s, c) => s + (Number(c.unidades) || 0), 0)

  const statCard = (icon, zh, es, val, color) => (
    <div style={{
      background:"#fff", borderRadius:12, padding:"16px 14px",
      border:"1px solid #e2e8f0", textAlign:"center",
      boxShadow:"0 1px 4px #00000008",
    }}>
      <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:10, color:"#94a3b8", marginBottom:2 }}>{zh}</div>
      <div style={{ fontSize:9, color:"#94a3b8", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{es}</div>
      <div style={{ fontSize:22, fontWeight:800, color: color || "#0f172a" }}>{val}</div>
    </div>
  )

  const moneyCard = (icon, zh, es, clp, usd, cny) => (
    <div style={{
      background:"#fff", borderRadius:12, padding:"18px 16px",
      border:"1px solid #e2e8f0", boxShadow:"0 1px 4px #00000008",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{zh}</div>
          <div style={{ fontSize:10, color:"#94a3b8" }}>{es}</div>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"#64748b" }}>🇨🇱 CLP</span>
          <span style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{fmtCLP(clp)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"#64748b" }}>🇺🇸 USD</span>
          <span style={{ fontWeight:800, fontSize:15, color:"#1a6db8" }}>{fmtUSD(usd)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"#64748b" }}>🇨🇳 CNY <span style={{ fontSize:9, color:"#94a3b8" }}>(est. 7.2x)</span></span>
          <span style={{ fontWeight:800, fontSize:15, color:"#c0392b" }}>{fmtCNY(cny)}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:17, color:"#040c18", marginBottom:4 }}>
          📊 数据概览 / Panel de Datos
        </div>
        <div style={{ fontSize:12, color:"#94a3b8" }}>
          Resumen de todas las importaciones visibles en el portal
        </div>
      </div>

      {/* KPIs estado */}
      <div style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
        Estado actual / 当前状态
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {statCard("📋", "待报价", "Pend. cotización",  pendCot.length,     pendCot.length > 0 ? "#c47830" : "#0f172a")}
        {statCard("💬", "待客户确认", "Pend. cliente",  pendCliente.length, "#2d78c8")}
        {statCard("✅", "已确认", "Confirmadas",        confirmadas.length, "#1aa358")}
        {statCard("🚢", "运输中", "En camino",          camino.length,      "#a85590")}
        {statCard("🏆", "已完成", "Completadas",        completadas.length, "#0d9870")}
        {statCard("📦", "总单位数", "Unidades totales proc.", totalUnidades.toLocaleString("es-CL"), "#040c18")}
      </div>

      {/* Totales financieros */}
      <div style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
        Totales importados / 进口总额
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        {moneyCard("🏆", "已完成订单", "Solo completadas", totalCLPCompletadas, totalUSDCompletadas, totalCNYCompletadas)}
        {moneyCard("📊", "全部处理中", "Confirmadas + camino + completadas", totalCLPProcesadas, totalUSDProcesadas, totalCNYProcesadas)}
      </div>

      {/* Nota CNY */}
      <div style={{
        background:"#fffbeb", border:"1px solid #c9a05540", borderRadius:8,
        padding:"10px 14px", fontSize:11, color:"#b8922e",
      }}>
        ⚠️ CNY estimado usando tipo de cambio fijo 1 USD = 7.2 CNY — solo referencial. /
        CNY金额使用固定汇率 1美元=7.2人民币估算，仅供参考。
      </div>

      {/* Detalle por tab si hay datos */}
      {completadas.length > 0 && (
        <div style={{ marginTop:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
            Historial completadas / 已完成记录
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {completadas.map(c => {
              const uid = c._id || c.id
              const usd = (Number(c.precio_china) || 0) * (Number(c.unidades) || 0)
              return (
                <div key={uid} style={{
                  background:"#fff", borderRadius:10, padding:"12px 16px",
                  border:"1px solid #e2e8f0", borderLeft:"4px solid #0d9870",
                  display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8,
                }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{c.producto || "-"}</div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>
                      {fmtDateZH(c.fecha_solicitud)} · {c.unidades || "-"} 件 / unidades
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    {c.calc?.totCl > 0 && <div style={{ fontWeight:700, fontSize:13, color:"#0d9870" }}>{fmtCLP(c.calc.totCl)}</div>}
                    {usd > 0 && <div style={{ fontSize:11, color:"#94a3b8" }}>{fmtUSD(usd)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tarjeta de cotización ────────────────────────────────────────────────────
function CotCard({ c, expanded, onToggle, supabase, recargar }) {
  const est   = c.estado || "enviado_china"
  const color = EST_COLOR[est] || "#64748b"
  const bg    = EST_BG[est]   || "#f1f5f9"
  const isUrg = est === "enviado_china" || est === "re_testeando"
  const nro   = c.nro_cotizacion || c.nro || String(c._id || "").slice(-6).toUpperCase() || "-"

  // ── Historial de notas China ──
  const getHistorial = () => {
    try {
      if (Array.isArray(c.notas_china_historial)) return c.notas_china_historial
    } catch(e) {}
    return []
  }

  const [nuevaTexto, setNuevaTexto]       = useState("")
  const [guardando, setGuardando]         = useState(false)
  const [errorMsg, setErrorMsg]           = useState("")
  const [editandoId, setEditandoId]       = useState(null)
  const [editTexto, setEditTexto]         = useState("")
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [eliminandoId, setEliminandoId]   = useState(null)

  // Funcion central: guarda el array de notas en Supabase
  // IMPORTANTE: lee datos frescos antes de escribir para no pisar cambios del admin
  async function persistirNotas(nuevoHistorial, esNueva) {
    // 1. Leer version actual de Supabase
    const { data: fresh, error: fetchErr } = await supabase
      .from("cotizaciones")
      .select("datos")
      .eq("id", c._id)
      .single()
    if (fetchErr || !fresh) throw new Error("No se pudo leer cotizacion actualizada: " + (fetchErr?.message||""))

    // 2. Solo modificar las dos claves de notas, sin tocar el resto
    const newDatos = {
      ...fresh.datos,
      notas_china_historial: nuevoHistorial,
      nota_china_nueva: esNueva,
    }
    const { data: filas, error } = await supabase
      .from("cotizaciones")
      .update({ datos: newDatos })
      .eq("id", c._id)
      .select("id")
    if (error) throw new Error("Error Supabase: " + (error.message||"") + " code:" + (error.code||""))
    if (!filas || filas.length === 0) {
      throw new Error("SIN_PERMISOS")
    }
  }

  // Agregar nota nueva
  async function handleGuardar() {
    if (!nuevaTexto.trim() || guardando) return
    setGuardando(true)
    setErrorMsg("")
    try {
      const hist = getHistorial()
      const nuevaNota = {
        id: Date.now().toString(),
        texto: nuevaTexto.trim(),
        fecha: new Date().toISOString(),
      }
      await persistirNotas([...hist, nuevaNota], true)
      setNuevaTexto("")
      recargar()
    } catch(e) {
      const esSinPermisos = (e?.message||"").includes("SIN_PERMISOS")
      setErrorMsg(esSinPermisos
        ? "⚠️ Sin permisos para guardar. El administrador debe ejecutar el SQL en Supabase para habilitar este permiso."
        : "❌ Error al guardar: " + (e?.message||"Sin detalles"))
    }
    setGuardando(false)
  }

  // Guardar edicion
  async function handleGuardarEdicion(notaId) {
    if (!editTexto.trim() || guardandoEdit) return
    setGuardandoEdit(true)
    setErrorMsg("")
    try {
      const hist = getHistorial().map(n =>
        n.id === notaId ? { ...n, texto: editTexto.trim(), editado: new Date().toISOString() } : n
      )
      await persistirNotas(hist, c.nota_china_nueva || false)
      setEditandoId(null)
      setEditTexto("")
      recargar()
    } catch(e) {
      setErrorMsg("❌ Error al guardar edicion.")
    }
    setGuardandoEdit(false)
  }

  // Eliminar nota
  async function handleEliminar(notaId) {
    setEliminandoId(notaId)
    setErrorMsg("")
    try {
      const hist = getHistorial().filter(n => n.id !== notaId)
      await persistirNotas(hist, hist.length > 0 ? c.nota_china_nueva || false : false)
      recargar()
    } catch(e) {
      setErrorMsg("❌ Error al eliminar.")
    }
    setEliminandoId(null)
  }

  let notasArr = []
  try {
    if (Array.isArray(c.notas_historial)) notasArr = c.notas_historial
    else if (typeof c.notas_historial === "string" && c.notas_historial) notasArr = JSON.parse(c.notas_historial)
  } catch(e) { notasArr = [] }
  if (notasArr.length === 0 && c.notas_internas) notasArr = [{ texto:c.notas_internas, oculta:false }]
  const visibles = notasArr.filter(n => !n.oculta)
  const historialChina = getHistorial()

  return (
    <div style={{
      background:"#fff",
      border:`1px solid ${isUrg ? color+"60" : "#e2e8f0"}`,
      borderLeft: `4px solid ${color}`,
      borderRadius:12,
      marginBottom:10,
      overflow:"hidden",
      boxShadow: isUrg ? `0 2px 12px ${color}18` : "0 1px 4px #00000008",
      transition:"all 0.2s",
    }}>

      {/* CABECERA */}
      <div
        onClick={onToggle}
        style={{
          padding:"14px 18px", cursor:"pointer",
          display:"flex", justifyContent:"space-between", alignItems:"center", gap:12,
        }}
      >
        <div style={{ flex:1, minWidth:0 }}>

          {/* Fila superior: badge estado + nro + premium */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
            <span style={{
              background:bg, color:color,
              border:`1px solid ${color}40`,
              borderRadius:20, padding:"3px 10px",
              fontSize:11, fontWeight:700, whiteSpace:"nowrap",
            }}>
              {EST_ZH[est] || est}
            </span>
            <span style={{
              background:"#f8fafc", color:"#94a3b8",
              border:"1px solid #e2e8f0",
              borderRadius:20, padding:"3px 10px",
              fontSize:11, fontWeight:600, whiteSpace:"nowrap",
              fontFamily:"monospace",
            }}>
              {EST_ES[est] || ""}
            </span>
            {c.categoria_cliente === "premium" && (
              <span style={{
                background:"#fdf6e3", color:"#b8922e",
                border:"1px solid #c9a05540",
                borderRadius:20, padding:"3px 10px",
                fontSize:11, fontWeight:800,
              }}>
                ⭐ Premium
              </span>
            )}
            {isUrg && (
              <span style={{
                background:"#fef9ec", color:"#b8922e",
                border:"1px solid #c9a05540",
                borderRadius:20, padding:"3px 10px",
                fontSize:11, fontWeight:800,
              }}>
                需要报价 / Requiere cotizacion
              </span>
            )}
          </div>

          {/* Nombre producto */}
          <div style={{ fontWeight:700, fontSize:15, color:"#0f172a", lineHeight:1.3, marginBottom:10 }}>
            {c.producto || "-"}
            <span style={{ fontSize:11, color:"#94a3b8", fontWeight:400, marginLeft:6 }}>/ 产品名称 Nombre del producto</span>
          </div>

          {/* Datos rapidos */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
            <Dato label="数量 / Unidades" valor={c.unidades || "-"} bold color="#040c18" />
            <Dato
              label="运输 / Transporte"
              valor={`${TRANSP_ZH[c.transporte]||"海运"} / ${TRANSP_ES[c.transporte]||"Maritimo"}`}
            />
            <Dato
              label="发送日期 / Fecha solicitud"
              valor={fmtDateZH(c.fecha_solicitud)}
              sub={fmtDate(c.fecha_solicitud)}
            />
            <Dato label="编号 / N solicitud" valor={`#${nro}`} mono />
          </div>
        </div>

        {/* Chevron */}
        <div style={{
          width:28, height:28, borderRadius:"50%", flexShrink:0,
          background:"#f1f5f9", border:"1px solid #e2e8f0",
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"#64748b", fontSize:10,
          transition:"transform 0.2s",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ▼
        </div>
      </div>

      {/* DETALLE EXPANDIDO */}
      {expanded && (
        <div style={{
          borderTop:"1px solid #f1f5f9",
          padding:"16px 18px",
          display:"flex", flexDirection:"column", gap:16,
          background:"#fafbfc",
        }}>

          {/* Link Alibaba */}
          <Campo es="阿里巴巴链接" zh="Link de Alibaba">
            {c.link_alibaba ? (
              <a
                href={c.link_alibaba}
                target="_blank"
                rel="noreferrer"
                style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  background:"#040c18", color:"#c9a055",
                  borderRadius:8, padding:"9px 16px",
                  textDecoration:"none", fontWeight:700, fontSize:13,
                  fontFamily:"inherit",
                }}
              >
                🔗 查看产品 / Ver en Alibaba
              </a>
            ) : (
              <span style={{ fontSize:13, color:"#94a3b8", fontStyle:"italic" }}>暂无链接 / Sin link</span>
            )}
          </Campo>

          {/* SKU */}
          {c.sku_china && (
            <Campo es="产品编号" zh="SKU / Codigo China">
              <span style={{
                fontFamily:"monospace", background:"#f1f5f9",
                border:"1px solid #e2e8f0", padding:"6px 12px",
                borderRadius:6, fontSize:13, color:"#0f172a",
                display:"inline-block", letterSpacing:1,
              }}>
                {c.sku_china}
              </span>
            </Campo>
          )}

          {/* Variantes */}
          {c.variantes && (
            <Campo es="规格 / 颜色 / 变体" zh="Variantes / Colores / Especificaciones">
              <div style={{
                background:"#f8fafc", border:"1px solid #e2e8f0",
                padding:"12px 14px", borderRadius:8,
                fontSize:13, lineHeight:1.65, color:"#334155",
                whiteSpace:"pre-wrap", maxHeight:180, overflowY:"auto",
              }}>
                {c.variantes}
              </div>
            </Campo>
          )}

          {/* Notas visibles */}
          {visibles.length > 0 && (
            <Campo es="备注说明" zh="Notas / Observaciones">
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {visibles.slice(-3).map((n, i) => (
                  <div key={i} style={{
                    background:"#fffbeb",
                    borderLeft:`3px solid #c9a055`,
                    padding:"10px 14px", borderRadius:"0 8px 8px 0",
                    fontSize:13, lineHeight:1.6, color:"#334155",
                  }}>
                    <div>{n.texto}</div>
                    {n.fecha && (
                      <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>{n.fecha}</div>
                    )}
                  </div>
                ))}
              </div>
            </Campo>
          )}

          {/* Notas de negociacion — solo visible en estado en_negociacion */}
          {est === "en_negociacion" && Array.isArray(c.negociacion_rondas) && c.negociacion_rondas.filter(r => r.nota).length > 0 && (
            <div style={{
              background:"#fffbeb",
              border:"1px solid #f59e0b44",
              borderRadius:10,
              overflow:"hidden",
            }}>
              {/* Header */}
              <div style={{
                background:"#fef3c7",
                borderBottom:"1px solid #f59e0b33",
                padding:"9px 14px",
                display:"flex", alignItems:"center", gap:8,
              }}>
                <span style={{ fontSize:14 }}>🤝</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#92400e" }}>
                    谈判记录 / Historial de negociacion
                  </div>
                  <div style={{ fontSize:10, color:"#b45309", marginTop:1 }}>
                    来自ZAGA管理员的谈判说明 / Notas del administrador ZAGA sobre esta negociacion
                  </div>
                </div>
                <span style={{
                  marginLeft:"auto",
                  background:"#92400e", color:"#fef3c7",
                  borderRadius:20, padding:"2px 9px",
                  fontSize:11, fontWeight:700,
                }}>
                  {c.negociacion_rondas.filter(r => r.nota).length} nota{c.negociacion_rondas.filter(r => r.nota).length !== 1 ? "s" : ""}
                </span>
              </div>
              {/* Lista de rondas con nota */}
              <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:8 }}>
                {c.negociacion_rondas.filter(r => r.nota).map((r, i) => (
                  <div key={i} style={{
                    background:"#fff",
                    border:"1px solid #f59e0b22",
                    borderLeft:"3px solid #f59e0b",
                    borderRadius:"0 8px 8px 0",
                    padding:"10px 14px",
                  }}>
                    <div style={{ fontSize:13, color:"#0f172a", lineHeight:1.65, whiteSpace:"pre-wrap" }}>
                      {r.nota}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6, flexWrap:"wrap", gap:4 }}>
                      <div style={{ fontSize:10, color:"#94a3b8" }}>
                        {r.fecha ? fmtDateZH(r.fecha) + " — " + fmtDate(r.fecha) : ""}
                      </div>
                      {r.estado && (
                        <span style={{
                          fontSize:10, fontWeight:700,
                          color: r.estado === "aplicada" ? "#1aa358" : r.estado === "rechazada" ? "#c0392b" : "#c47830",
                          background: r.estado === "aplicada" ? "#f0fdf4" : r.estado === "rechazada" ? "#fef2f2" : "#fdf0e3",
                          border: `1px solid ${r.estado === "aplicada" ? "#bbf7d0" : r.estado === "rechazada" ? "#fecdd3" : "#f59e0b33"}`,
                          borderRadius:20, padding:"2px 9px",
                        }}>
                          {r.estado === "aplicada" ? "✓ 已采用 / Aplicada"
                           : r.estado === "rechazada" ? "✗ 已拒绝 / Rechazada"
                           : "⏳ 待确认 / Pendiente"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fecha llegada estimada — solo en tab camino */}
          {c.fecha_llegada_est && ESTADOS_CAMINO.includes(est) && (
            <Campo es="预计到达时间" zh="Fecha estimada de llegada">
              <div style={{
                display:"inline-flex", gap:10, alignItems:"center",
                background:"#f8f0fb", border:"1px solid #a8559040",
                padding:"9px 16px", borderRadius:8,
              }}>
                <span>🚢</span>
                <div>
                  <div style={{ fontWeight:700, color:"#a85590", fontSize:14 }}>
                    {fmtDateZH(c.fecha_llegada_est)}
                  </div>
                  <div style={{ fontSize:11, color:"#a85590", opacity:0.7, marginTop:2 }}>
                    {fmtDate(c.fecha_llegada_est)}
                  </div>
                </div>
              </div>
            </Campo>
          )}

          {/* ── NOTAS PARA ZAGA ── */}
          {/* No mostrar seccion de notas en completadas (historico, solo lectura) */}
          {!ESTADOS_COMPLETADAS.includes(est) && (
            <div style={{ borderTop:"1px solid #e2e8f0", paddingTop:16 }}>

              {/* Titulo seccion */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <span style={{ fontSize:15 }}>📩</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#040c18", letterSpacing:0.3 }}>
                    留言给ZAGA / Notas para administracion
                  </div>
                  <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>
                    只有ZAGA管理员可以看到 / Solo visible para administradores ZAGA
                  </div>
                </div>
                {historialChina.length > 0 && (
                  <span style={{
                    marginLeft:"auto", background:"#040c18", color:"#c9a055",
                    borderRadius:20, padding:"2px 10px",
                    fontSize:11, fontWeight:700,
                  }}>
                    {historialChina.length}
                  </span>
                )}
              </div>

              {/* Error message */}
              {errorMsg && (
                <div style={{
                  background:"#fef2f2", border:"1px solid #fecdd3",
                  borderRadius:8, padding:"10px 14px", marginBottom:12,
                  fontSize:12, color:"#c0392b", whiteSpace:"pre-wrap", lineHeight:1.6,
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Historial de notas existentes */}
              {historialChina.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
                  {historialChina.map((nota) => {
                    const esEditando   = editandoId === nota.id
                    const esEliminando = eliminandoId === nota.id
                    return (
                      <div key={nota.id} style={{
                        background: esEditando ? "#fffbeb" : "#f0f9ff",
                        border: esEditando ? "1px solid #c9a05560" : "1px solid #06b6d430",
                        borderLeft: `3px solid ${esEditando ? "#c9a055" : "#2a8aaa"}`,
                        borderRadius:"0 8px 8px 0",
                        padding:"10px 14px",
                        opacity: esEliminando ? 0.5 : 1,
                        transition:"opacity 0.2s",
                      }}>
                        {esEditando ? (
                          <div>
                            <textarea
                              value={editTexto}
                              onChange={e => setEditTexto(e.target.value)}
                              rows={3}
                              autoFocus
                              style={{
                                width:"100%", background:"#fff",
                                border:"1px solid #e2e8f0", borderRadius:6,
                                color:"#0f172a", padding:"8px 10px",
                                fontSize:12, outline:"none", resize:"vertical",
                                boxSizing:"border-box", lineHeight:1.5,
                                fontFamily:"inherit",
                              }}
                            />
                            <div style={{ display:"flex", gap:6, marginTop:8 }}>
                              <button
                                disabled={!editTexto.trim() || guardandoEdit}
                                onClick={() => handleGuardarEdicion(nota.id)}
                                style={{
                                  background: editTexto.trim() && !guardandoEdit ? "#040c18" : "#e2e8f0",
                                  color: editTexto.trim() && !guardandoEdit ? "#c9a055" : "#94a3b8",
                                  border:"none", borderRadius:6,
                                  padding:"6px 14px", fontSize:11,
                                  cursor: editTexto.trim() && !guardandoEdit ? "pointer" : "default",
                                  fontWeight:700, fontFamily:"inherit",
                                }}
                              >
                                {guardandoEdit ? "保存中..." : "💾 保存 / Guardar"}
                              </button>
                              <button
                                onClick={() => { setEditandoId(null); setEditTexto(""); }}
                                style={{
                                  background:"#f1f5f9", color:"#64748b",
                                  border:"1px solid #e2e8f0", borderRadius:6,
                                  padding:"6px 14px", fontSize:11,
                                  cursor:"pointer", fontFamily:"inherit",
                                }}
                              >
                                取消 / Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize:13, color:"#0f172a", lineHeight:1.65, whiteSpace:"pre-wrap", marginBottom:6 }}>
                              {nota.texto}
                            </div>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
                              <div style={{ fontSize:10, color:"#94a3b8" }}>
                                {nota.fecha ? fmtDateZH(nota.fecha) + " — " + fmtDate(nota.fecha) : ""}
                                {nota.editado && <span style={{ marginLeft:6, fontStyle:"italic" }}>(已编辑)</span>}
                              </div>
                              <div style={{ display:"flex", gap:6 }}>
                                <button
                                  onClick={() => { setEditandoId(nota.id); setEditTexto(nota.texto); setErrorMsg(""); }}
                                  style={{
                                    background:"#f1f5f9", color:"#475569",
                                    border:"1px solid #e2e8f0", borderRadius:5,
                                    padding:"3px 10px", fontSize:11,
                                    cursor:"pointer", fontFamily:"inherit",
                                  }}
                                >
                                  ✏️ 编辑
                                </button>
                                <button
                                  disabled={esEliminando}
                                  onClick={() => handleEliminar(nota.id)}
                                  style={{
                                    background:"#fef2f2", color:"#c0392b",
                                    border:"1px solid #fecdd3", borderRadius:5,
                                    padding:"3px 10px", fontSize:11,
                                    cursor: esEliminando ? "default" : "pointer",
                                    fontFamily:"inherit",
                                  }}
                                >
                                  🗑️ 删除
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Formulario nueva nota */}
              <div style={{
                background:"#f8fafc",
                border:"1px solid #e2e8f0",
                borderRadius:8, padding:"12px 14px",
              }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#475569", marginBottom:7, textTransform:"uppercase", letterSpacing:0.5 }}>
                  + 新留言 / Nueva nota
                </div>
                <textarea
                  value={nuevaTexto}
                  onChange={e => { setNuevaTexto(e.target.value); setErrorMsg(""); }}
                  placeholder={"写下报价、问题或意见...\nEscriba su cotizacion, preguntas u observaciones..."}
                  rows={3}
                  style={{
                    width:"100%", background:"#fff",
                    border:"1px solid #e2e8f0", borderRadius:6,
                    color:"#0f172a", padding:"9px 12px",
                    fontSize:13, outline:"none", resize:"vertical",
                    boxSizing:"border-box", lineHeight:1.6,
                    fontFamily:"inherit",
                  }}
                />
                <button
                  disabled={!nuevaTexto.trim() || guardando}
                  onClick={handleGuardar}
                  style={{
                    marginTop:8,
                    background: nuevaTexto.trim() && !guardando ? "#040c18" : "#e2e8f0",
                    color: nuevaTexto.trim() && !guardando ? "#c9a055" : "#94a3b8",
                    border:"none", borderRadius:7,
                    padding:"9px 20px", fontSize:13,
                    cursor: nuevaTexto.trim() && !guardando ? "pointer" : "default",
                    fontWeight:700, fontFamily:"inherit", transition:"all 0.2s",
                  }}
                >
                  {guardando ? "发送中... / Enviando..." : "📩 发送留言 / Enviar nota"}
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function Dato({ label, valor, bold, color, mono, sub }) {
  return (
    <div>
      <div style={{
        fontWeight: bold ? 700 : 500,
        fontSize: bold ? 15 : 13,
        color: color || "#475569",
        fontFamily: mono ? "monospace" : "inherit",
        lineHeight: 1,
      }}>
        {valor}
      </div>
      {sub && <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
      <div style={{ fontSize:10, color:"#94a3b8", marginTop: sub ? 0 : 3 }}>{label}</div>
    </div>
  )
}

function Campo({ es, zh, children }) {
  return (
    <div>
      <div style={{ display:"flex", gap:5, alignItems:"baseline", marginBottom:7 }}>
        <span style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:0.5 }}>
          {es}
        </span>
        <span style={{ fontSize:10, color:"#94a3b8" }}>/ {zh}</span>
      </div>
      {children}
    </div>
  )
}
