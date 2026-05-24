import { useState, useEffect } from "react"
import LOGO_WHITE from "./logo-white.png"

// PortalSunny.jsx — Portal Agente Aéreo Sunny (空运货运)
// Auth manejado por Supabase (rol agente_aereo). RLS filtra solo cotizaciones aéreas.
// Captura editable en Tab 1: precio FOB, dimensiones, peso, modo cobro, Form F, días producción.
// Diseño aprobado en PORTAL_SUNNY_DESIGN.md (commit e7eaeb2).

const TC_RMB_USD = 7.03 // TC con margen ~1.7% sobre WU real (CLP/RMB ≈ 135.14 vs WU 132.93)
// Proxy de imágenes para dominios con hotlink protection (Alibaba, Taobao, 1688, etc.)
const proxyImg = (url) => {
  if (!url || typeof url !== "string") return url
  if (/alicdn\.com|alibaba\.com|taobao\.com|tmall\.com|aliyuncs\.com|1688\.com/i.test(url)) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`
  }
  return url
}

// ─── Estados que ve Sunny por tab ───────────────────────────────────────────
const ESTADOS_PEND_COT     = ["solicitud"]
const ESTADOS_PEND_CLIENTE = ["cotizada"]
const ESTADOS_CONFIRMADAS  = ["pagada"]
const ESTADOS_CAMINO       = ["en_camino"]
const ESTADOS_COMPLETADAS  = ["completada"]
const ESTADOS_NO_PROSPERO  = ["no_prospero"]
const TODOS_ESTADOS = [
  ...ESTADOS_PEND_COT, ...ESTADOS_PEND_CLIENTE,
  ...ESTADOS_CONFIRMADAS, ...ESTADOS_CAMINO, ...ESTADOS_COMPLETADAS,
  ...ESTADOS_NO_PROSPERO,
]

// ─── Estilos chino/español ──────────────────────────────────────────────────
const EST_ES = {
  solicitud:   "Pendiente de cotizar",
  cotizada:    "Cotizada",
  pagada:      "Pagada / Importando",
  en_camino:   "En camino",
  en_bodega:   "En bodega",
  completada:  "Completada",
  no_prospero: "No prosperó",
}
const EST_ZH = {
  solicitud:   "等待报价",
  cotizada:    "已报价",
  pagada:      "付款已完成",
  en_camino:   "运输中",
  en_bodega:   "已到仓库",
  completada:  "已完成",
  no_prospero: "未成交",
}
const EST_COLOR = {
  solicitud:   "#c47830",
  cotizada:    "#2d78c8",
  pagada:      "#1aa358",
  en_camino:   "#a85590",
  en_bodega:   "#3d7fc4",
  completada:  "#0d9870",
  no_prospero: "#c0392b",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return "—"
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString("es-CL", { day:"2-digit", month:"short", year:"numeric" })
}
function fmtUSD(n) {
  if (!n || isNaN(n)) return "US$0"
  return "US$" + Number(n).toLocaleString("en-US", { maximumFractionDigits:2 })
}
function fmtRMB(n) {
  if (!n || isNaN(n)) return "¥0"
  return "¥" + Number(n).toLocaleString("zh-CN", { maximumFractionDigits:2 })
}
function fmtN(n, d=2) {
  if (!n || isNaN(n)) return "0"
  return Number(n).toLocaleString("en-US", { maximumFractionDigits:d })
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function PortalSunny({ supabase, onLogout }) {
  const [tab, setTab]           = useState("pend_cot")
  const [cots, setCots]         = useState([])
  const [ops, setOps]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [pulse, setPulse]       = useState(false)
  const [editingId, setEditing] = useState(null)

  useEffect(() => {
    loadData()
    const channel = supabase.channel("zaga-portal-sunny-v1")
      .on("postgres_changes", { event:"*", schema:"public", table:"cotizaciones" }, () => {
        loadData()
        setPulse(true)
        setTimeout(() => setPulse(false), 1800)
      })
      .on("postgres_changes", { event:"*", schema:"public", table:"operaciones" }, () => {
        loadData()
      })
      .subscribe()
    let ultimoRefreshFoco = Date.now()
    const onVisibilidad = () => {
      if (document.visibilityState === "visible") {
        const ahora = Date.now()
        if (ahora - ultimoRefreshFoco > 5000) {
          ultimoRefreshFoco = ahora
          loadData()
        }
      }
    }
    document.addEventListener("visibilitychange", onVisibilidad)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener("visibilitychange", onVisibilidad)
    }
  }, [])

  async function loadData() {
    setLoading(true)
    const [cotsRes, opsRes] = await Promise.all([
      supabase.from("cotizaciones").select("id,datos,created_at,updated_at"),
      supabase.from("operaciones").select("id,datos,created_at,updated_at"),
    ])
    if (!cotsRes.error && cotsRes.data) {
      const relevantes = cotsRes.data
        .map(r => ({ ...r.datos, _id: r.id, _updated: r.updated_at || r.created_at }))
        .filter(c => TODOS_ESTADOS.includes(c.estado))
        .filter(c => c.transporte === "aereo")
        .sort((a, b) => new Date(b._updated) - new Date(a._updated))
      setCots(relevantes)
    }
    if (!opsRes.error && opsRes.data) {
      // Guardar TODAS las ops (para badge en cards + dropdown de "ya consolidadas")
      const todasOps = opsRes.data
        .map(r => ({ ...r.datos, _id: r.id, _updated: r.updated_at || r.created_at }))
        .sort((a, b) => new Date(b._updated) - new Date(a._updated))
      setOps(todasOps)
    }
    setLoading(false)
  }

  // ─── Grupos por tab ───────────────────────────────────────────────────────
  // Pend. cotizar incluye:
  //   1. cots con estado 'solicitud' (admin pide cotización)
  //   2. cots en 'solicitud' o 'cotizada' vinculadas a OP en borrador
  //      pero SOLO si el admin aún NO aplicó el consolidado al cliente.
  //      Una vez aplicado, las cots pasan a "Pend. cliente" y desaparecen de aquí.
  const opsBorradorMap = new Map()
  ;(Array.isArray(ops) ? ops : []).forEach(o => {
    if (!o || !o._id) return
    if ((!o.estado || o.estado === "borrador") && o.consolidado_aplicado_cliente !== true) {
      const cotIds = new Set(Array.isArray(o.cotizaciones) ? o.cotizaciones : [])
      opsBorradorMap.set(o._id, cotIds)
    }
  })
  const cotEnOpBorrador = (c) => {
    if (!c) return false
    // FUENTE DE VERDAD: op.cotizaciones (array). Si admin saca cot de una OP,
    // la quita del array. Confiar solo en c.operacion_id daría falsos positivos
    // si el admin no limpió el campo (queda como dato obsoleto).
    for (const [, cotIds] of opsBorradorMap) {
      if (cotIds.has(c._id) || cotIds.has(c.id)) return true
    }
    return false
  }
  const pendCot = cots.filter(c => {
    if (!c) return false
    if (ESTADOS_PEND_COT.includes(c.estado)) return true
    if ((c.estado === "solicitud" || c.estado === "cotizada") && cotEnOpBorrador(c)) return true
    return false
  })
  const pendCliente = cots.filter(c => ESTADOS_PEND_CLIENTE.includes(c.estado))
  const confirmadas = cots.filter(c => ESTADOS_CONFIRMADAS.includes(c.estado))
  const camino      = cots.filter(c => ESTADOS_CAMINO.includes(c.estado))
  const completadas = cots.filter(c => ESTADOS_COMPLETADAS.includes(c.estado))
  const noProspero  = cots.filter(c => ESTADOS_NO_PROSPERO.includes(c.estado))

  const tabMap = {
    pend_cot:     pendCot,
    pend_cliente: pendCliente,
    confirmadas:  confirmadas,
    camino:       camino,
    completadas:  completadas,
    no_prospero:  noProspero,
    dashboard:    [],
  }
  const shown = tabMap[tab] || []

  const opsPendientes = ops.filter(o => o.recotizacion_pendiente_sunny === true && !o.recotizacion_completada_sunny)

  const TABS = [
    { id:"pend_cot",     label:"待报价 Pend. cotizar",  count: pendCot.length,     urgent: pendCot.length > 0 },
    { id:"recotizar",    label:"🔄 待重新报价 Recotizar consolidado", count: opsPendientes.length, urgent: opsPendientes.length > 0 },
    { id:"pend_cliente", label:"待客户 Pend. cliente",  count: pendCliente.length, urgent: false },
    { id:"confirmadas",  label:"已确认 Confirmadas",    count: confirmadas.length, urgent: false },
    { id:"camino",       label:"运输中 En camino",      count: camino.length,      urgent: false },
    { id:"completadas",  label:"已完成 Completadas",    count: completadas.length, urgent: false },
    { id:"no_prospero",  label:"未成交 No prosperaron", count: noProspero.length,  urgent: false },
    { id:"mis_pagos",    label:"💰 我的付款 Mis pagos", count: null,               urgent: false },
    { id:"dashboard",    label:"📊 数据",               count: null,               urgent: false },
  ]

  const EMPTY_MSG = {
    pend_cot:     { zh:"暂无待报价请求",       es:"No hay solicitudes esperando cotización" },
    pend_cliente: { zh:"暂无等待客户确认",     es:"No hay cotizaciones esperando al cliente" },
    confirmadas:  { zh:"暂无确认订单",         es:"No hay órdenes confirmadas" },
    camino:       { zh:"暂无运输中货物",        es:"No hay envíos en camino" },
    completadas:  { zh:"暂无已完成记录",        es:"No hay completadas" },
    no_prospero:  { zh:"暂无未成交记录",        es:"No hay cotizaciones que no prosperaron" },
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{
        background:"#040c18", borderBottom:"2px solid #c4783040", padding:"0 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        height:54, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px #00000040",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <img src={LOGO_WHITE} alt="ZAGA IMP" style={{ height:32, objectFit:"contain" }} />
          <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", letterSpacing:2, textTransform:"uppercase" }}>
            ✈️ 空运货运 — Cotizador Aéreo
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {pendCot.length > 0 && (
            <div style={{
              display:"flex", alignItems:"center", gap:6,
              background:"#c4783025", border:"1px solid #c4783055",
              borderRadius:20, padding:"4px 12px",
            }}>
              <div style={{
                width:7, height:7, borderRadius:"50%",
                background:"#c47830",
                boxShadow: pulse ? "0 0 8px #c47830" : "none",
                transition:"all 0.3s",
              }}/>
              <span style={{ fontSize:12, fontWeight:700, color:"#c47830" }}>
                {pendCot.length} 待报价
              </span>
            </div>
          )}
          <button onClick={loadData}
            title="刷新 / Refrescar datos"
            style={{ background:"transparent", border:"1px solid #ffffff20", color:"#94a3b8",
              borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>
            🔄 刷新
          </button>
          <button onClick={() => onLogout && onLogout()}
            style={{ background:"transparent", border:"1px solid #ffffff20", color:"#94a3b8",
              borderRadius:8, padding:"6px 16px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>
            退出 / Salir
          </button>
        </div>
      </div>

      {/* ── SUBHEADER ───────────────────────────────────────────────── */}
      <div style={{ background:"#040c18", borderBottom:"1px solid #1e293b", padding:"8px 24px 12px" }}>
        <div style={{ fontSize:13, color:"#c47830", fontWeight:700, letterSpacing:0.3 }}>
          代理商门户 / Portal Sunny — Agente aéreo
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────────────── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 24px", overflowX:"auto" }}>
        <div style={{ display:"flex", gap:0, minWidth:"max-content" }}>
          {TABS.map(t => {
            const isActive = tab === t.id
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setEditing(null); }}
                style={{
                  padding:"14px 18px", background:"transparent", border:"none",
                  borderBottom: isActive ? "2px solid #c47830" : "2px solid transparent",
                  color: isActive ? "#0f172a" : "#64748b",
                  fontWeight: isActive ? 700 : 500, fontSize:13, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:7, fontFamily:"inherit",
                  marginBottom:-1, whiteSpace:"nowrap",
                }}>
                {t.label}
                {t.count !== null && t.count > 0 && (
                  <span style={{
                    background: isActive ? "#040c18" : (t.urgent ? "#c47830" : "#e2e8f0"),
                    color: isActive ? "#c47830" : (t.urgent ? "#fff" : "#64748b"),
                    borderRadius:20, padding:"1px 8px", fontSize:11, fontWeight:800,
                  }}>{t.count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── CONTENIDO ───────────────────────────────────────────────── */}
      <div style={{ maxWidth:920, margin:"0 auto", padding:"20px 16px 48px" }}>
        {tab === "dashboard" ? (
          <Dashboard cots={cots} pendCot={pendCot} confirmadas={confirmadas} camino={camino} completadas={completadas} />
        ) : tab === "mis_pagos" ? (
          <MisPagosTab ops={ops} cots={cots} />
        ) : tab === "recotizar" ? (
          loading ? <Empty zh="加载中" es="Cargando..." emoji="⏳" /> :
          opsPendientes.length === 0 ? <Empty zh="暂无重新报价请求" es="No hay operaciones esperando recotización" emoji="🔄" /> :
          opsPendientes.map(op => (
            <OpRecotizarCard key={op._id} op={op} cots={cots} supabase={supabase} onSaved={loadData} onEditCot={(cotId)=>{
              // Llevar a Pend cotizar, EXPANDIR la cot elegida, y hacer scroll a ella
              setTab("pend_cot")
              setEditing(cotId)
              setTimeout(()=>{
                const el = document.getElementById("cot-" + cotId)
                if (el) el.scrollIntoView({behavior:"smooth", block:"center"})
              }, 250)
            }} />
          ))
        ) : loading ? (
          <Empty zh="加载中" es="Cargando..." emoji="⏳" />
        ) : shown.length === 0 ? (
          <Empty zh={EMPTY_MSG[tab]?.zh} es={EMPTY_MSG[tab]?.es} emoji="📭" />
        ) : (()=>{
          // Agrupar shown por operacion_id; las que no tienen op quedan sueltas
          const grupos = new Map() // opId → array de cots
          const sueltas = []
          shown.forEach(c => {
            if (c.operacion_id && ops.some(o => o._id === c.operacion_id)) {
              if (!grupos.has(c.operacion_id)) grupos.set(c.operacion_id, [])
              grupos.get(c.operacion_id).push(c)
            } else {
              sueltas.push(c)
            }
          })
          // Sunny puede editar solo antes que la carga zarpe: pend_cot, pend_cliente, confirmadas.
          // En camino / completadas / no_prospero: read-only (la operación ya está en tránsito o cerrada).
          const TABS_EDITABLES = ["pend_cot","pend_cliente","confirmadas"]
          const CardComp = TABS_EDITABLES.includes(tab) ? CotEditable : CotReadOnly
          const renderCard = (c) => (
            <CardComp key={c._id} c={c} supabase={supabase} ops={ops} isExpanded={editingId === c._id}
              onExpand={() => setEditing(editingId === c._id ? null : c._id)} onSaved={loadData} />
          )
          return (
            <>
              {Array.from(grupos.entries()).map(([opId, cotsDeOp]) => {
                const op = ops.find(o => o._id === opId)
                if (!op) return cotsDeOp.map(renderCard)
                return (
                  <OpGroupCard key={opId} op={op} cots={cotsDeOp} supabase={supabase} onSaved={loadData} editingId={editingId}>
                    {cotsDeOp.map(renderCard)}
                  </OpGroupCard>
                )
              })}
              {sueltas.map(renderCard)}
            </>
          )
        })()}
      </div>
    </div>
  )
}

// ─── Card de grupo de operación consolidada (agrupa cots + chat de grupo) ─
function OpGroupCard({ op, cots, supabase, onSaved, children, editingId }) {
  const [expanded, setExpanded] = useState(false)
  // Auto-expandir si alguna cot del grupo coincide con editingId (click "Editar" desde Recotizar)
  useEffect(() => {
    if (editingId && cots.some(c => c._id === editingId)) {
      setExpanded(true)
    }
  }, [editingId, cots])
  const [nuevoMsg, setNuevoMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const historial = Array.isArray(op.notas_grupo_historial) ? op.notas_grupo_historial : []
  const totalUnd = cots.reduce((s, c) => s + (Number(c.unidades) || 0), 0)
  const clientes = [...new Set(cots.map(c => c.cliente).filter(Boolean))]
  const cbmTotal = Number(op.costos_china?.cbm) || 0
  const pesoTotal = Number(op.costos_china?.peso_kg) || 0

  async function enviarMensaje() {
    const txt = nuevoMsg.trim()
    if (!txt) return
    setSaving(true); setMsg(null)
    try {
      const { data: fresca, error: errLoad } = await supabase
        .from("operaciones").select("datos").eq("id", op._id).single()
      if (errLoad || !fresca) throw new Error("No se pudo leer la operación")
      const histPrev = Array.isArray(fresca.datos.notas_grupo_historial) ? [...fresca.datos.notas_grupo_historial] : []
      const nuevaNota = {
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        autor: "agente_aereo",
        autorNombre: "Sunny",
        texto: txt,
      }
      const datosMerged = {
        ...fresca.datos,
        notas_grupo_historial: [...histPrev, nuevaNota],
        nota_grupo_nueva: true,
      }
      const { error: errSave } = await supabase
        .from("operaciones").update({ datos: datosMerged, updated_at: new Date().toISOString() })
        .eq("id", op._id).select("id")
      if (errSave) throw errSave
      setNuevoMsg("")
      setMsg({ tipo: "ok", txt: "✅ 已发送给小组 / Enviado al grupo" })
      onSaved && onSaved()
      setTimeout(() => setMsg(null), 1500)
    } catch(e) {
      setMsg({ tipo: "err", txt: "⚠️ " + (e.message || "Error") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: "#fffbeb", borderRadius: 12, marginBottom: 14,
      border: "2px solid #fde68a", overflow: "hidden",
    }}>
      <div onClick={()=>setExpanded(!expanded)} style={{
        padding: "12px 16px", cursor: "pointer", background: "#fef3c7",
        borderBottom: expanded ? "1px solid #fde68a" : "none",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ background: "#040c18", color: "#c47830", borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
              ✈️ {op.nro}
            </span>
            <span style={{ background: "#fff", color: "#854d0e", border: "1px solid #fde68a", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
              {cots.length} 件 cotizaciones
            </span>
            <span style={{ background: "#fff", color: "#854d0e", border: "1px solid #fde68a", borderRadius: 5, padding: "2px 8px", fontSize: 10 }}>
              {fmtN(totalUnd, 0)} und
            </span>
            {cbmTotal > 0 && (
              <span style={{ background: "#fff", color: "#854d0e", border: "1px solid #fde68a", borderRadius: 5, padding: "2px 8px", fontSize: 10 }}>
                📐 {fmtN(cbmTotal, 2)} m³
              </span>
            )}
            {pesoTotal > 0 && (
              <span style={{ background: "#fff", color: "#854d0e", border: "1px solid #fde68a", borderRadius: 5, padding: "2px 8px", fontSize: 10 }}>
                ⚖️ {fmtN(pesoTotal, 0)} kg
              </span>
            )}
            {historial.length > 0 && (
              <span style={{ background: "#fff", color: "#2d78c8", border: "1px solid #bfdbfe", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                💬 {historial.length}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#854d0e", fontWeight: 700 }}>
            操作合并 / Operación consolidada · 👤 {clientes.join(" + ") || "—"}
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#854d0e" }}>{expanded ? "▾" : "▸"}</div>
      </div>

      {/* Chat + cotizaciones (expandible al click del header) */}
      {expanded && (
        <>
        <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #fde68a" }}>
          <div style={{ fontSize: 11, color: "#854d0e", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            💬 小组消息 / Chat del grupo (visible para todas las cots)
          </div>
          {historial.length === 0 ? (
            <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
              还没有消息 / Aún sin mensajes
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>
              {historial.map((n, i) => {
                const esSunny = n.autor === "agente_aereo"
                return (
                  <div key={n.id || i} style={{
                    background: esSunny ? "#fff7ed" : "#eff6ff",
                    border: "1px solid " + (esSunny ? "#fed7aa" : "#bfdbfe"),
                    borderRadius: 8, padding: "7px 10px", fontSize: 12,
                    alignSelf: esSunny ? "flex-end" : "flex-start", maxWidth: "85%",
                  }}>
                    <div style={{ fontSize: 9, color: esSunny ? "#c47830" : "#2d78c8", fontWeight: 700, marginBottom: 2 }}>
                      {esSunny ? "Sunny" : (n.autorNombre || "Admin")} · {fmtDate(n.fecha)}
                    </div>
                    <div style={{ color: "#0f172a", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{n.texto}</div>
                  </div>
                )
              })}
            </div>
          )}
          <textarea value={nuevoMsg} onChange={e=>setNuevoMsg(e.target.value)} rows={2}
            placeholder="写消息小组... / Mensaje al grupo (afecta a todas las cotizaciones)..."
            style={{ width: "100%", background: "#fff", border: "1px solid #fde68a", borderRadius: 7, padding: "7px 10px", fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 6 }}/>
          {msg && (
            <div style={{
              marginBottom: 6, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: msg.tipo === "ok" ? "#f0fdf4" : "#fef2f2",
              color: msg.tipo === "ok" ? "#15803d" : "#dc2626",
              border: "1px solid " + (msg.tipo === "ok" ? "#bbf7d0" : "#fecaca"),
            }}>{msg.txt}</div>
          )}
          <button onClick={enviarMensaje} disabled={saving || !nuevoMsg.trim()}
            style={{
              width: "100%", padding: "8px 14px", fontSize: 12, fontWeight: 700,
              background: (saving || !nuevoMsg.trim()) ? "#cbd5e1" : "#c47830",
              color: "#fff", border: "none", borderRadius: 7,
              cursor: (saving || !nuevoMsg.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}>
            {saving ? "发送中..." : "📤 发送给小组 / Enviar al grupo"}
          </button>
        </div>

        {/* Cards de las cotizaciones del grupo (solo visibles al expandir) */}
        <div style={{ padding: "10px 12px 12px", background: "#fffbeb" }}>
          <div style={{ fontSize: 10, color: "#854d0e", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            📦 报价 / Cotizaciones del grupo ({cots.length})
          </div>
          {children}
        </div>
        </>
      )}
    </div>
  )
}

// ─── Componente vacío ────────────────────────────────────────────────────────
function Empty({ zh, es, emoji }) {
  return (
    <div style={{ textAlign:"center", padding:64, color:"#94a3b8" }}>
      <div style={{ fontSize:40, marginBottom:14 }}>{emoji}</div>
      <div style={{ fontWeight:700, fontSize:15, marginBottom:4, color:"#475569" }}>{zh || ""}</div>
      <div style={{ fontSize:13 }}>{es || ""}</div>
    </div>
  )
}

// ─── Card editable (Tab 1: Pend. cotizar) ────────────────────────────────────
function CotEditable({ c, supabase, ops, isExpanded, onExpand, onSaved }) {
  const opVinculada = c.operacion_id && Array.isArray(ops) ? ops.find(o => o._id === c.operacion_id) : null
  const [form, setForm] = useState({
    sku_china:             c.sku_china || "",
    material_china:        c.material_china || "",
    imagen_url_sunny:      c.imagen_url_sunny || "",
    peso_unitario_g:       c.peso_unitario_g || "",
    unidad_medida:         c.unidad_medida || "pcs",
    precio_china_rmb:      c.precio_china_rmb || "",
    dim_largo:             c.dim_largo || "",
    dim_ancho:             c.dim_ancho || "",
    dim_alto:              c.dim_alto || "",
    dim_und_caja:          c.dim_und_caja || "",
    dim_tipo:              c.dim_tipo || "caja",
    peso_kg:               c.peso_kg || "",
    aer_modo_cobro_sunny:  c.aer_modo_cobro_sunny || "auto",
    aer_tarifa_sunny_kg:   c.aer_tarifa_sunny_kg ?? 9.55,
    aer_tarifa_sunny_cbm:  c.aer_tarifa_sunny_cbm ?? "",
    aer_tarifa_sunny_rmb_kg: c.aer_tarifa_sunny_rmb_kg ?? "",
    comision_sunny_pct:    c.comision_sunny_pct ?? 5,
    cost_cert_origen_rmb:  c.cost_cert_origen_rmb ?? 150,
    cost_doc_operacion_rmb: c.cost_doc_operacion_rmb ?? 150,
    cost_despacho_aduanero_rmb: c.cost_despacho_aduanero_rmb ?? 200,
    cost_compra_docs_rmb:  c.cost_compra_docs_rmb ?? 350,
    cost_transporte_interno_cn_rmb: c.cost_transporte_interno_cn_rmb ?? 0,
    seguro_pct:            ((c.seguro_pct ?? 0.002) * 100),
    seguro_min_rmb:        c.seguro_min_rmb ?? 150,
    form_f_incluido:       c.form_f_incluido !== false,
    dias_estimados_china:  c.dias_estimados_china || "",
    nota_nueva:            "",
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState(null)
  const [nuevaImgUrl, setNuevaImgUrl] = useState("")

  // Lista de URLs de imagen separadas por "|||" (consistente con el admin)
  const imagenes = (form.imagen_url_sunny || "").split("|||").map(s=>s.trim()).filter(Boolean)
  const setImagenes = (arr) => setForm(p => ({ ...p, imagen_url_sunny: arr.join("|||") }))

  // ─── Cálculo en vivo ──────────────────────────────────────────────────────
  const unidades = Number(c.unidades) || 0
  const undCaja  = Number(form.dim_und_caja) || 0
  const esCaja   = form.dim_tipo === "caja"
  const nCajas   = esCaja && undCaja > 0 ? Math.ceil(unidades / undCaja) : 0
  const m3Caja   = (Number(form.dim_largo)||0) * (Number(form.dim_ancho)||0) * (Number(form.dim_alto)||0) / 1000000
  const m3Total  = esCaja ? m3Caja * nCajas : m3Caja * unidades
  const pesoReal = Number(form.peso_kg) || 0
  const pesoTotal = esCaja ? pesoReal * nCajas : pesoReal * unidades
  const volCm3   = (Number(form.dim_largo)||0) * (Number(form.dim_ancho)||0) * (Number(form.dim_alto)||0) * (esCaja ? nCajas : unidades)
  const pesoVol  = volCm3 / 6000
  const pesoCobrable = Math.max(pesoTotal, pesoVol)
  const precioUSD = Number(form.precio_china_rmb) > 0 ? Number(form.precio_china_rmb) / TC_RMB_USD : 0
  const totalFOB  = precioUSD * unidades

  // Flete según modo — usa tarifa RMB/kg si está, fallback a USD/kg
  const modo = form.aer_modo_cobro_sunny || "auto"
  const tarifaRmbKg = Number(form.aer_tarifa_sunny_rmb_kg) || 0
  const tarifaKgUSD = tarifaRmbKg > 0 ? tarifaRmbKg / TC_RMB_USD : (Number(form.aer_tarifa_sunny_kg) || 0)
  const tarifaCbm = Number(form.aer_tarifa_sunny_cbm) || 0
  let fleteEstimado = 0  // en USD
  let fleteBase = ""
  if (modo === "peso" && tarifaKgUSD > 0) {
    fleteEstimado = pesoTotal * tarifaKgUSD
    fleteBase = `${fmtN(pesoTotal,1)} kg × ${tarifaRmbKg>0 ? `¥${fmtN(tarifaRmbKg,2)}/kg` : `${fmtN(tarifaKgUSD,2)} USD/kg`}`
  } else if (modo === "volumen" && tarifaCbm > 0) {
    fleteEstimado = m3Total * tarifaCbm
    fleteBase = `${fmtN(m3Total,3)} m³ × ${fmtN(tarifaCbm,2)} USD/m³`
  } else if (modo === "auto" && tarifaKgUSD > 0) {
    fleteEstimado = pesoCobrable * tarifaKgUSD
    fleteBase = `${fmtN(pesoCobrable,1)} kg cobrable × ${tarifaRmbKg>0 ? `¥${fmtN(tarifaRmbKg,2)}/kg` : `${fmtN(tarifaKgUSD,2)} USD/kg`}`
  }
  const fleteEstimadoRMB = fleteEstimado * TC_RMB_USD

  // ─── Cálculo desglose completo Sunny (comisión + extras envío) ──────────
  const subtotalMercanciaRMB = Number(form.precio_china_rmb) * unidades || 0
  const comisionRMB     = subtotalMercanciaRMB * (Number(form.comision_sunny_pct) || 0) / 100
  const seguroMinRMB    = Number(form.seguro_min_rmb) || 0
  const seguroCalculado = subtotalMercanciaRMB * (Number(form.seguro_pct) || 0) / 100
  const seguroRMBcot    = Math.max(seguroMinRMB, seguroCalculado)
  const certOrigenRMB   = Number(form.cost_cert_origen_rmb) || 0
  const docOperacionRMB = Number(form.cost_doc_operacion_rmb) || 0
  const despachoRMB     = Number(form.cost_despacho_aduanero_rmb) || 0
  const compraDocsRMB   = Number(form.cost_compra_docs_rmb) || 0
  const transporteCnRMB = Number(form.cost_transporte_interno_cn_rmb) || 0
  const otrosGastosRMB  = certOrigenRMB + docOperacionRMB + despachoRMB + compraDocsRMB + transporteCnRMB + seguroRMBcot
  const totalCotRMB     = subtotalMercanciaRMB + comisionRMB + fleteEstimadoRMB + otrosGastosRMB
  const totalCotUSD     = totalCotRMB / TC_RMB_USD

  // ─── Calcular m³ cuando cambia L/A/H ─────────────────────────────────────
  function onDim(field, v) {
    setForm(p => ({ ...p, [field]: v }))
  }

  // ─── Ajustar cantidad al empaque (cuando la caja cerrada da otra cifra) ──
  async function handleAjustarCantidad(unidadesNuevas) {
    const unidadesOriginales = c.unidades_originales || unidades
    const confirmMsg = `调整数量 / Ajustar ${c.nro || "cotización"} a ${unidadesNuevas} und?\n\n客户要求 / Cliente pidió: ${unidadesOriginales} und\n包装调整 / Ajustado al empaque: ${unidadesNuevas} und\n\n✅ 确认后将通知客户 / Se le avisa al cliente del incremento.`
    if (!confirm(confirmMsg)) return
    setSaving(true)
    setMsg(null)
    try {
      const { data: fresca, error: errLoad } = await supabase
        .from("cotizaciones").select("datos").eq("id", c._id).single()
      if (errLoad || !fresca) throw new Error("No se pudo leer la cotización")
      const datosMerged = {
        ...fresca.datos,
        unidades: unidadesNuevas,
        unidades_originales: fresca.datos.unidades_originales || unidadesOriginales,
        fecha_ajuste_cantidad: new Date().toISOString().split("T")[0],
      }
      const { error: errSave } = await supabase
        .from("cotizaciones")
        .update({ datos: datosMerged, updated_at: new Date().toISOString() })
        .eq("id", c._id).select("id")
      if (errSave) throw errSave
      setMsg({ tipo:"ok", txt:`✅ 已调整 / Ajustada a ${unidadesNuevas} und` })
      setTimeout(() => onSaved && onSaved(), 1200)
    } catch (e) {
      console.error(e)
      setMsg({ tipo:"err", txt:"⚠️ Error: " + (e.message || "no se pudo ajustar") })
    } finally {
      setSaving(false)
    }
  }

  // ─── Guardar (borrador o envío final) ────────────────────────────────────
  async function persistirRespuestaSunny(enviarAdmin) {
    setSaving(true)
    setMsg(null)
    try {
      // 1) Leer datos FRESCOS de Supabase (anti-race)
      const { data: fresca, error: errLoad } = await supabase
        .from("cotizaciones")
        .select("datos")
        .eq("id", c._id)
        .single()
      if (errLoad || !fresca) throw new Error("No se pudo leer la cotización")

      // 2) Merge: solo campos de Sunny
      const datosMerged = { ...fresca.datos }
      const camposSunny = [
        "sku_china", "material_china", "imagen_url_sunny", "peso_unitario_g", "unidad_medida",
        "precio_china_rmb",
        "dim_largo", "dim_ancho", "dim_alto", "dim_und_caja", "dim_tipo",
        "peso_kg",
        "aer_modo_cobro_sunny", "aer_tarifa_sunny_kg", "aer_tarifa_sunny_cbm",
        "aer_tarifa_sunny_rmb_kg",
        "comision_sunny_pct",
        "cost_cert_origen_rmb", "cost_doc_operacion_rmb",
        "cost_despacho_aduanero_rmb", "cost_compra_docs_rmb",
        "cost_transporte_interno_cn_rmb",
        "seguro_min_rmb",
        "form_f_incluido", "dias_estimados_china",
      ]
      for (const k of camposSunny) {
        if (form[k] !== undefined && form[k] !== "") datosMerged[k] = form[k]
      }
      // seguro_pct: se guarda como decimal (0.002), pero en form está como %
      if (form.seguro_pct !== undefined && form.seguro_pct !== "") {
        datosMerged.seguro_pct = (Number(form.seguro_pct) || 0) / 100
      }
      // 3) Calcular m³ por unidad o caja (cuadrado)
      if (Number(form.dim_largo) && Number(form.dim_ancho) && Number(form.dim_alto)) {
        datosMerged.dim_m3 = ((Number(form.dim_largo)*Number(form.dim_ancho)*Number(form.dim_alto))/1000000).toFixed(4)
      }
      // 4) Notas: agregar nueva si existe
      if (form.nota_nueva && form.nota_nueva.trim()) {
        const hist = Array.isArray(fresca.datos.notas_china_historial) ? [...fresca.datos.notas_china_historial] : []
        hist.push({
          fecha: new Date().toISOString(),
          autor: "Sunny",
          texto: form.nota_nueva.trim(),
          oculta: false,
        })
        datosMerged.notas_china_historial = hist
        datosMerged.nota_china_nueva = true
      }
      // 5) Si se envía a admin, cambiar estado SOLO si está en "solicitud".
      // No retroceder cots ya cotizadas/pagadas/en_camino — solo guardar los datos editados.
      if (enviarAdmin) {
        if (c.estado === "solicitud") {
          datosMerged.estado = "cotizada"
          datosMerged.fecha_respuesta_china = new Date().toISOString().split("T")[0]
        }
        // En estados posteriores: mantiene estado, solo persiste cambios de costos/peso/dim
      }
      // 6) UPDATE
      const { error: errSave } = await supabase
        .from("cotizaciones")
        .update({ datos: datosMerged, updated_at: new Date().toISOString() })
        .eq("id", c._id)
        .select("id")
      if (errSave) throw errSave

      setMsg({ tipo:"ok", txt: enviarAdmin ? "✅ 已发送 / Enviado a admin" : "✅ 已保存 / Guardado" })
      setForm(p => ({ ...p, nota_nueva: "" }))
      onSaved && onSaved()
      if (enviarAdmin) setTimeout(() => onExpand && onExpand(), 1200)
    } catch (e) {
      console.error(e)
      setMsg({ tipo:"err", txt:"⚠️ Error: " + (e.message || "no se pudo guardar") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div id={"cot-" + c._id} style={{
      background:"#fff", borderRadius:12, marginBottom:14,
      border: isExpanded ? "2px solid #c47830" : "1px solid #e2e8f0",
      overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
      transition:"all 0.2s",
    }}>
      {/* HEADER CARD ── compacto */}
      <div onClick={onExpand} style={{
        padding:"12px 16px", cursor:"pointer",
        display:"flex", alignItems:"center", gap:12,
        background: isExpanded ? "#fff7ed" : "#fff",
        borderBottom: isExpanded ? "1px solid #fed7aa" : "none",
      }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
            {c.nro && (
              <span style={{
                background:"#040c18", color:"#c47830", borderRadius:5,
                padding:"2px 8px", fontSize:10, fontWeight:800, letterSpacing:0.5,
              }}>
                {c.nro}
              </span>
            )}
            <span style={{
              background:"#c4783020", color:"#c47830", border:"1px solid #c4783055",
              borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700,
            }}>
              {EST_ZH[c.estado]} / {EST_ES[c.estado]}
            </span>
            {opVinculada && (
              <span style={{ background:"#fef9c3", color:"#854d0e", border:"1px solid #fde68a", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:800 }}>
                ✈️ 在 {opVinculada.nro} / En {opVinculada.nro}
              </span>
            )}
            <span style={{ fontSize:10, color:"#94a3b8" }}>· {fmtDate(c._updated)}</span>
          </div>
          <div style={{ fontWeight:700, fontSize:14, color:"#0f172a", marginBottom:2 }}>
            {c.producto || "Sin nombre"}
          </div>
          {c.cliente && (
            <div style={{ fontSize:11, color:"#64748b", marginBottom:2 }}>
              👤 客户 / Cliente: <b style={{ color:"#475569" }}>{c.cliente}</b>
            </div>
          )}
          <div style={{ fontSize:12, color:"#64748b" }}>
            📦 {Number(c.unidades || 0).toLocaleString("es-CL")} 件 unidades
            {c.link_alibaba && <> · <a href={c.link_alibaba} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ color:"#2d78c8", textDecoration:"underline" }}>🔗 Link</a></>}
          </div>
        </div>
        <div style={{ fontSize:22, color:"#94a3b8" }}>{isExpanded ? "▾" : "▸"}</div>
      </div>

      {/* FORM EDITABLE */}
      {isExpanded && (
        <div style={{ padding:"16px 20px", background:"#fafafa" }}>
          {/* Info admin (read-only) */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:9, padding:"10px 14px", marginBottom:14, fontSize:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>
              📦 来自管理员 / Info del admin
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, color:"#475569" }}>
              <div><b>产品 Producto:</b> {c.producto || "—"}</div>
              <div><b>数量 Cantidad:</b> {Number(c.unidades||0).toLocaleString("es-CL")} und</div>
              {c.variantes && <div style={{ gridColumn:"1 / -1" }}><b>规格 Variantes:</b> {c.variantes}</div>}
              {c.notas && <div style={{ gridColumn:"1 / -1", color:"#92400e", background:"#fffbeb", borderRadius:6, padding:"5px 8px", marginTop:4 }}><b>📌 备注 Nota admin:</b> {c.notas}</div>}
              {c.imagen_url && (() => {
                const img = c.imagen_url.split("|||")[0]
                return img ? <div style={{ gridColumn:"1 / -1", marginTop:4 }}><img src={proxyImg(img)} alt="" referrerPolicy="no-referrer" style={{ maxWidth:140, borderRadius:6, border:"1px solid #e2e8f0" }} onError={e=>e.target.style.display="none"}/></div> : null
              })()}
            </div>
          </div>

          {/* SECCIÓN 1: SKU + Imagen + Precio */}
          <Section title="📋 请填写 / Por favor llenar">
            <Field label="中国 SKU / SKU China">
              <input value={form.sku_china} onChange={e=>setForm(p=>({...p, sku_china:e.target.value}))} placeholder="Ej: SK-EAR-2940-A" style={inp}/>
            </Field>
            <Field label="🧪 材料 / Material">
              <input value={form.material_china} onChange={e=>setForm(p=>({...p, material_china:e.target.value}))} placeholder="例如：塑胶+橡胶+不锈钢 / Ej: Plástico + Caucho + Acero inoxidable" style={inp}/>
            </Field>
            <Field label={`📷 图片链接 / Imágenes del producto (URLs)${imagenes.length>0?` · ${imagenes.length}`:""}`}>
              <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:7, padding:8 }}>
                {/* Miniaturas con botón eliminar */}
                {imagenes.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                    {imagenes.map((url, idx) => (
                      <div key={idx} style={{ position:"relative", width:64, height:64 }}>
                        <img src={proxyImg(url)} alt="" referrerPolicy="no-referrer" style={{ width:64, height:64, objectFit:"cover", borderRadius:5, border:"1px solid #e2e8f0", display:"block" }} onError={e=>{ e.target.parentNode.style.opacity=".3" }}/>
                        <button type="button" onClick={()=>setImagenes(imagenes.filter((_,i)=>i!==idx))} title="删除 / Eliminar" style={{ position:"absolute", top:-5, right:-5, width:18, height:18, background:"#c0392b", color:"#fff", border:"none", borderRadius:"50%", cursor:"pointer", fontSize:13, lineHeight:"18px", textAlign:"center", padding:0, fontWeight:900 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Input agregar nueva URL */}
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {nuevaImgUrl && /^https?:\/\//i.test(nuevaImgUrl) && (
                    <img src={proxyImg(nuevaImgUrl)} alt="" referrerPolicy="no-referrer" style={{ width:32, height:32, objectFit:"cover", borderRadius:4, border:"1px solid #e2e8f0", flexShrink:0 }} onError={e=>{ e.target.style.display="none" }}/>
                  )}
                  <input
                    value={nuevaImgUrl}
                    onChange={e=>setNuevaImgUrl(e.target.value)}
                    onKeyDown={e=>{
                      if (e.key === "Enter" && nuevaImgUrl.trim()) {
                        setImagenes([...imagenes, nuevaImgUrl.trim()])
                        setNuevaImgUrl("")
                      }
                    }}
                    placeholder="粘贴URL并按回车 / Pegar URL y Enter"
                    style={{ ...inp, padding:"6px 9px", fontSize:12 }}
                  />
                  <button type="button" disabled={!nuevaImgUrl.trim()} onClick={()=>{
                    if (!nuevaImgUrl.trim()) return
                    setImagenes([...imagenes, nuevaImgUrl.trim()])
                    setNuevaImgUrl("")
                  }} style={{ background: nuevaImgUrl.trim() ? "#c47830" : "#cbd5e1", color:"#fff", border:"none", borderRadius:6, padding:"6px 12px", fontSize:12, fontWeight:700, cursor: nuevaImgUrl.trim() ? "pointer" : "not-allowed", whiteSpace:"nowrap", fontFamily:"inherit" }}>➕ 添加 Agregar</button>
                </div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:6, fontStyle:"italic" }}>
                  可添加多张图片 / Puedes agregar varias imágenes (URL de Google Drive, WeChat, Imgur, etc.)
                </div>
              </div>
            </Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <Field label="单件重量 / Peso unitario (g)">
                <input type="number" step="0.1" value={form.peso_unitario_g} onChange={e=>setForm(p=>({...p, peso_unitario_g:e.target.value}))} placeholder="例如 22 / Ej: 22" style={inp}/>
              </Field>
              <Field label="单位 / Unidad">
                <select value={form.unidad_medida} onChange={e=>setForm(p=>({...p, unidad_medida:e.target.value}))} style={inp}>
                  <option value="pcs">pcs / 件 (pieza)</option>
                  <option value="set">set / 套 (juego)</option>
                  <option value="par">par / 对</option>
                  <option value="kg">kg / 公斤</option>
                </select>
              </Field>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="FOB 价格 / Precio FOB (RMB / und)">
                <input type="number" step="0.01" value={form.precio_china_rmb} onChange={e=>setForm(p=>({...p, precio_china_rmb:e.target.value}))} placeholder="0.00" style={inp}/>
              </Field>
              <Field label="自动 / Calculado USD (TC 7.03)">
                <div style={{ ...inp, background:"#f1f5f9", color:"#475569", fontWeight:700 }}>
                  {precioUSD > 0 ? fmtUSD(precioUSD) : "—"}
                </div>
              </Field>
            </div>
            {subtotalMercanciaRMB > 0 && (
              <div style={{ background:"#fff7ed", border:"1.5px solid #c47830", borderRadius:8, padding:"10px 14px", marginTop:4, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:10, color:"#92400e", fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>总金额 / Total Valor (Exw)</div>
                  <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>{unidades} und × ¥{form.precio_china_rmb}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:20, fontWeight:800, color:"#c47830" }}>{fmtRMB(subtotalMercanciaRMB)}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>≈ {fmtUSD(totalFOB)}</div>
                </div>
              </div>
            )}
          </Section>

          {/* SECCIÓN 2: Dimensiones */}
          <Section title="📐 箱尺寸 / Dimensiones de la caja">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:6 }}>
              <Field label="箱装 / Und por caja">
                <input type="number" value={form.dim_und_caja} onChange={e=>onDim("dim_und_caja", e.target.value)} placeholder="例如 200 / Ej: 200" style={inp}/>
              </Field>
              <Field label="单箱重量 / Peso por caja (kg)">
                <input type="number" step="0.01" value={form.peso_kg} onChange={e=>onDim("peso_kg", e.target.value)} placeholder="例如 8.5 / Ej: 8.5" style={inp}/>
              </Field>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 }}>
              <Field label="长 / Largo (cm)">
                <input type="number" step="0.1" value={form.dim_largo} onChange={e=>onDim("dim_largo", e.target.value)} placeholder="0" style={inp}/>
              </Field>
              <Field label="宽 / Ancho (cm)">
                <input type="number" step="0.1" value={form.dim_ancho} onChange={e=>onDim("dim_ancho", e.target.value)} placeholder="0" style={inp}/>
              </Field>
              <Field label="高 / Alto (cm)">
                <input type="number" step="0.1" value={form.dim_alto} onChange={e=>onDim("dim_alto", e.target.value)} placeholder="0" style={inp}/>
              </Field>
            </div>

            {/* CÁLCULO EN VIVO */}
            {(m3Caja > 0 || pesoReal > 0) && (
              <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 12px", fontSize:11, color:"#15803d", lineHeight:1.6 }}>
                <div style={{ fontWeight:700, marginBottom:4 }}>💚 实时计算 / Cálculo en vivo:</div>
                {m3Caja > 0 && <div>▸ 单箱体积 / m³ por caja: <b>{fmtN(m3Caja,4)} m³</b></div>}
                {nCajas > 0 && <div>▸ 总箱数 / N° cajas: <b>{nCajas}</b> ({Number(c.unidades||0)} und ÷ {undCaja} por caja)</div>}
                {m3Total > 0 && <div>▸ 总体积 / m³ total: <b style={{ color: m3Total < 1 ? "#dc2626" : "#15803d" }}>{fmtN(m3Total,3)} m³</b></div>}
                {pesoReal > 0 && pesoTotal > 0 && <div>▸ 总重量 / Peso total: <b>{fmtN(pesoTotal,1)} kg</b></div>}
                {pesoVol > 0 && <div>▸ 体积重量 / Peso volumétrico (÷6000): <b>{fmtN(pesoVol,1)} kg</b></div>}
                {pesoCobrable > 0 && <div>▸ 计费重量 / Peso cobrable: <b>{fmtN(pesoCobrable,1)} kg</b> {pesoVol > pesoTotal ? "(volumétrico manda)" : "(real manda)"}</div>}
              </div>
            )}

            {/* ALERTA <1 m³ */}
            {m3Total > 0 && m3Total < 1 && (
              <div style={{ marginTop:8, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"8px 12px", fontSize:11, color:"#dc2626", lineHeight:1.5 }}>
                ⚠️ <b>体积小于 1 m³ / Volumen menor a 1 m³</b> ({fmtN(m3Total,3)} m³). 需要与其他订单合并发货 / Hay que consolidar con otra cotización.
              </div>
            )}

            {/* ALERTA cantidad ajustada al embalaje (cuando real != pedido) */}
            {esCaja && nCajas > 0 && undCaja > 0 && (nCajas * undCaja) !== unidades && (
              <div style={{ marginTop:8, background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:"9px 12px", fontSize:11, color:"#92400e", lineHeight:1.5 }}>
                📦 <b>实际数量 / Cantidad real con embalaje: {nCajas * undCaja} und</b> ({nCajas} cajas × {undCaja} und).
                <br/>客户要求 / Cliente pidió: <b>{unidades} und</b>.
                {(nCajas * undCaja) > unidades
                  ? <> 差额 / Diferencia: <b>+{(nCajas * undCaja) - unidades} und</b> extra por completar caja.</>
                  : <> ⚠️ El embalaje no cubre la cantidad pedida.</>}
                {(nCajas * undCaja) > unidades && (
                  <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <button
                      onClick={() => handleAjustarCantidad(nCajas * undCaja)}
                      disabled={saving}
                      style={{
                        background: saving ? "#fed7aa" : "#c47830",
                        color: "#fff", border: "none", borderRadius: 7,
                        padding: "7px 14px", fontSize: 11, fontWeight: 700,
                        cursor: saving ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                        boxShadow: "0 1px 3px rgba(196,120,48,0.3)",
                      }}>
                      📐 调整到 / Ajustar a {nCajas * undCaja} und
                    </button>
                    <span style={{ fontSize: 10, color: "#92400e", fontStyle: "italic" }}>
                      自动通知客户 / Se avisa al cliente automáticamente
                    </span>
                  </div>
                )}
                {c.unidades_originales && Number(c.unidades_originales) !== Number(c.unidades) && (
                  <div style={{ marginTop:6, padding:"4px 8px", background:"#dbeafe", border:"1px solid #93c5fd", borderRadius:6, fontSize:10, color:"#1e40af", fontStyle:"italic" }}>
                    ℹ️ 已调整 / Ya ajustada: {c.unidades_originales} → {c.unidades} und ({c.fecha_ajuste_cantidad || "—"})
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* SECCIÓN 3: Modo cobro flete + tarifas */}
          <Section title="✈️ 计费方式 / Modo de cobro flete">
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              {[
                ["auto",    "🔀 自动 Auto"],
                ["peso",    "⚖️ 重量 Peso"],
                ["volumen", "📦 体积 Volumen"],
              ].map(([k,l]) => (
                <button key={k} onClick={()=>setForm(p=>({...p, aer_modo_cobro_sunny:k}))}
                  style={{
                    flex:1, padding:"7px 8px", fontSize:11, cursor:"pointer", fontWeight:600,
                    background: modo===k ? "#c47830" : "#fff",
                    color: modo===k ? "#fff" : "#64748b",
                    border:"1px solid " + (modo===k ? "#c47830" : "#fed7aa"),
                    borderRadius:7, fontFamily:"inherit",
                  }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="RMB/kg (人民币 / 重量)">
                <input type="number" step="0.01" value={form.aer_tarifa_sunny_rmb_kg} onChange={e=>setForm(p=>({...p, aer_tarifa_sunny_rmb_kg:e.target.value}))} placeholder="例如 65 / Ej: 65" style={inp}/>
              </Field>
              <Field label="USD/m³ (体积)">
                <input type="number" step="0.01" value={form.aer_tarifa_sunny_cbm} onChange={e=>setForm(p=>({...p, aer_tarifa_sunny_cbm:e.target.value}))} placeholder="—" style={inp}/>
              </Field>
            </div>
            <div style={{ fontSize:10, color:"#94a3b8", marginTop:-4, marginBottom:8, fontStyle:"italic" }}>
              💡 填写 RMB/kg 后，USD 自动计算（汇率 7.03）/ Si llenas RMB/kg, el USD se calcula automático (TC 7.03). USD legacy: {fmtUSD(Number(form.aer_tarifa_sunny_kg)||0)}
            </div>
            {fleteEstimado > 0 && (
              <div style={{ marginTop:4, background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:7, padding:"7px 11px", fontSize:11, color:"#92400e" }}>
                ▸ 估算运费 / Flete estimado: <b style={{ fontSize:13 }}>{fmtRMB(fleteEstimadoRMB)}</b> ≈ {fmtUSD(fleteEstimado)} ({fleteBase})
              </div>
            )}
          </Section>

          {/* SECCIÓN 4: Comisión Sunny + costos del envío */}
          <Section title="💼 佣金 + 其他费用 / Comisión Sunny + Otros costos del envío (RMB)">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <Field label="佣金 % / Comisión (% mercancía)">
                <input type="number" step="0.1" value={form.comision_sunny_pct} onChange={e=>setForm(p=>({...p, comision_sunny_pct:e.target.value}))} placeholder="5" style={inp}/>
              </Field>
              <Field label="佣金金额 / Comisión RMB">
                <div style={{ ...inp, background:"#fff7ed", color:"#c47830", fontWeight:700 }}>{fmtRMB(comisionRMB)}</div>
              </Field>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
              <Field label="原产地证 / Cert. origen RMB">
                <input type="number" step="1" value={form.cost_cert_origen_rmb} onChange={e=>setForm(p=>({...p, cost_cert_origen_rmb:e.target.value}))} placeholder="150" style={inp}/>
              </Field>
              <Field label="操作文件费 / Doc. operación RMB">
                <input type="number" step="1" value={form.cost_doc_operacion_rmb} onChange={e=>setForm(p=>({...p, cost_doc_operacion_rmb:e.target.value}))} placeholder="150" style={inp}/>
              </Field>
              <Field label="报关费 / Despacho aduanero CN RMB">
                <input type="number" step="1" value={form.cost_despacho_aduanero_rmb} onChange={e=>setForm(p=>({...p, cost_despacho_aduanero_rmb:e.target.value}))} placeholder="200" style={inp}/>
              </Field>
              <Field label="文件采购 / Compra docs RMB">
                <input type="number" step="1" value={form.cost_compra_docs_rmb} onChange={e=>setForm(p=>({...p, cost_compra_docs_rmb:e.target.value}))} placeholder="350" style={inp}/>
              </Field>
              <Field label="国内运输 / Transporte interno CN RMB">
                <input type="number" step="1" value={form.cost_transporte_interno_cn_rmb} onChange={e=>setForm(p=>({...p, cost_transporte_interno_cn_rmb:e.target.value}))} placeholder="0" style={inp}/>
              </Field>
              <Field label={`保险 % / Seguro % (sobre ¥${fmtN(subtotalMercanciaRMB,0)})`}>
                <input type="number" step="0.01" value={form.seguro_pct} onChange={e=>setForm(p=>({...p, seguro_pct:e.target.value}))} placeholder="0.2" style={inp}/>
              </Field>
              <Field label="保险最低 / Seguro mínimo RMB">
                <input type="number" step="1" value={form.seguro_min_rmb} onChange={e=>setForm(p=>({...p, seguro_min_rmb:e.target.value}))} placeholder="150" style={inp}/>
              </Field>
            </div>
            <div style={{ background:"#fefce8", border:"1px dashed #fde047", borderRadius:7, padding:"7px 11px", fontSize:10.5, color:"#78350f", lineHeight:1.55, marginBottom:6 }}>
              <b>📋 保险规则 / Regla seguro:</b> 150 RMB únicos por consolidado si total ≤ 75.000 RMB · si supera, 0,2% del valor de mercancías. En consolidados se cobra <u>una sola vez</u> sobre el total de la OP.
            </div>
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:7, padding:"7px 11px", fontSize:11, color:"#475569" }}>
              ▸ 保险金额 / Seguro RMB: <b style={{ color:"#0f172a" }}>{fmtRMB(seguroRMBcot)}</b>
              {seguroRMBcot > seguroCalculado && <span style={{ color:"#c47830", marginLeft:6, fontStyle:"italic" }}>({form.seguro_pct}% = ¥{fmtN(seguroCalculado,0)} → mínimo ¥{fmtN(seguroMinRMB,0)} aplicado)</span>}
              {transporteCnRMB > 0 && <><br/>▸ 国内运输 / Transporte interno CN: <b style={{ color:"#0f172a" }}>{fmtRMB(transporteCnRMB)}</b></>}
              <br/>▸ 其他总计 / Subtotal otros gastos (sin flete): <b style={{ color:"#0f172a" }}>{fmtRMB(otrosGastosRMB)}</b>
            </div>
          </Section>

          {/* SECCIÓN 4: Form F + días producción */}
          <Section title="📜 其他 / Otros datos">
            <div style={{ marginBottom:10 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"8px 12px",
                background: form.form_f_incluido ? "#f0fdf4" : "#fef2f2",
                border:"1px solid " + (form.form_f_incluido ? "#bbf7d0" : "#fecaca"),
                borderRadius:7,
              }}>
                <input type="checkbox" checked={form.form_f_incluido} onChange={e=>setForm(p=>({...p, form_f_incluido:e.target.checked}))}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color: form.form_f_incluido ? "#15803d" : "#dc2626" }}>
                    Form F (中智自贸协定 / TLC Chile-China) {form.form_f_incluido ? "包含 incluido ✅" : "不包含 NO incluido ❌"}
                  </div>
                  <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>
                    {form.form_f_incluido ? "智利关税 0% / Arancel 0% en Chile" : "智利关税 6% / Arancel 6% — encarece para el cliente"}
                  </div>
                </div>
              </label>
            </div>
            <Field label="预计生产时间 / Días estimados producción">
              <input type="number" value={form.dias_estimados_china} onChange={e=>setForm(p=>({...p, dias_estimados_china:e.target.value}))} placeholder="例如 15 / Ej: 15" style={inp}/>
            </Field>
          </Section>

          {/* SECCIÓN RESUMEN ECONÓMICO TOTAL */}
          {totalCotRMB > 0 && (
            <div style={{ background:"linear-gradient(135deg,#fff7ed 0%,#fef3c7 100%)", border:"2px solid #c47830", borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#854d0e", fontWeight:800, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>
                💰 报价总览 / Resumen económico de la cotización
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5, fontSize:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", color:"#475569" }}>
                  <span>货值 Mercancía (Exw):</span>
                  <b style={{ color:"#0f172a" }}>{fmtRMB(subtotalMercanciaRMB)}</b>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", color:"#475569" }}>
                  <span>佣金 Comisión Sunny ({form.comision_sunny_pct||0}%):</span>
                  <b style={{ color:"#0f172a" }}>{fmtRMB(comisionRMB)}</b>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", color:"#475569", borderTop:"1px solid #fed7aa", paddingTop:4 }}>
                  <span>FOB con comisión:</span>
                  <b style={{ color:"#0f172a" }}>{fmtRMB(subtotalMercanciaRMB + comisionRMB)}</b>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", color:"#475569" }}>
                  <span>空运 Flete aéreo:</span>
                  <b style={{ color:"#0f172a" }}>{fmtRMB(fleteEstimadoRMB)}</b>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", color:"#475569" }}>
                  <span>其他 Otros gastos (cert+doc+despacho+compra+seguro):</span>
                  <b style={{ color:"#0f172a" }}>{fmtRMB(otrosGastosRMB)}</b>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", borderTop:"2px solid #c47830", paddingTop:8, marginTop:5 }}>
                  <b style={{ color:"#854d0e", fontSize:14 }}>总计 TOTAL CHINA:</b>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:"#c47830" }}>{fmtRMB(totalCotRMB)}</div>
                    <div style={{ fontSize:11, color:"#64748b", fontWeight:400 }}>≈ {fmtUSD(totalCotUSD)} (TC {TC_RMB_USD})</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize:10, color:"#92400e", marginTop:10, lineHeight:1.6, fontStyle:"italic", textAlign:"center" }}>
                这是您向 ZAGA 收取的总金额（从中国出货为止，包括所有费用）。<br/>
                ZAGA 之后会加上智利海关 + 利润。
                <div style={{ marginTop:3, opacity:0.85 }}>
                  Este total es lo que cobras a ZAGA (todo incluido hasta despacho desde China). ZAGA agrega después aduana Chile + margen.
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 5: Nota */}
          <Section title="✉️ 备注 / Nota para admin">
            <textarea value={form.nota_nueva} onChange={e=>setForm(p=>({...p, nota_nueva:e.target.value}))} rows={3}
              placeholder="可选 / Opcional. 例如：库存情况、颜色限制、生产周期变化... / Ej: stock, restricción color, lead time..."
              style={{ ...inp, resize:"vertical", minHeight:60, fontFamily:"inherit" }}/>
          </Section>

          {/* MENSAJE */}
          {msg && (
            <div style={{
              marginBottom:10, padding:"8px 12px", borderRadius:7, fontSize:12, fontWeight:600,
              background: msg.tipo==="ok" ? "#f0fdf4" : "#fef2f2",
              border:"1px solid " + (msg.tipo==="ok" ? "#bbf7d0" : "#fecaca"),
              color: msg.tipo==="ok" ? "#15803d" : "#dc2626",
            }}>{msg.txt}</div>
          )}

          {/* BOTONES */}
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <button onClick={()=>persistirRespuestaSunny(false)} disabled={saving}
              style={{ ...btn, background:"#fff", color:"#64748b", border:"1px solid #cbd5e1", flex:1 }}>
              💾 {saving ? "..." : "保存草稿 / Guardar borrador"}
            </button>
            <button onClick={()=>persistirRespuestaSunny(true)} disabled={saving}
              style={{
                ...btn,
                background:"#c47830",
                color:"#fff",
                cursor: saving ? "wait" : "pointer",
                flex:2,
                opacity: saving ? 0.6 : 1,
              }}>
              ✅ {saving ? "发送中... / Enviando..." : "发送给管理员 / Enviar a admin"}
            </button>
          </div>
          {!form.precio_china_rmb && !form.nota_nueva && (
            <div style={{ marginTop:8, fontSize:11, color:"#94a3b8", fontStyle:"italic", textAlign:"center" }}>
              💡 建议先填写 FOB 价格或备注 再发送 / Llena precio FOB o agrega una nota antes de enviar
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Card read-only (tabs 2-5) — con badge OP + chat expandible ───────────
function CotReadOnly({ c, supabase, ops, isExpanded, onExpand, onSaved }) {
  const opVinculada = c.operacion_id && Array.isArray(ops) ? ops.find(o => o._id === c.operacion_id) : null
  const [nuevoMsg, setNuevoMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const historial = Array.isArray(c.notas_china_historial) ? c.notas_china_historial : []

  async function enviarMensaje() {
    const txt = nuevoMsg.trim()
    if (!txt) return
    setSaving(true); setMsg(null)
    try {
      const { data: fresca, error: errLoad } = await supabase
        .from("cotizaciones").select("datos").eq("id", c._id).single()
      if (errLoad || !fresca) throw new Error("No se pudo leer la cotización")
      const histPrev = Array.isArray(fresca.datos.notas_china_historial) ? [...fresca.datos.notas_china_historial] : []
      const nuevaNota = {
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        autor: "agente_aereo",
        autorNombre: "Sunny",
        texto: txt,
        oculta: false,
      }
      const datosMerged = {
        ...fresca.datos,
        notas_china_historial: [...histPrev, nuevaNota],
        nota_china_nueva: true,
      }
      const { error: errSave } = await supabase
        .from("cotizaciones").update({ datos: datosMerged, updated_at: new Date().toISOString() })
        .eq("id", c._id).select("id")
      if (errSave) throw errSave
      setNuevoMsg("")
      setMsg({ tipo:"ok", txt:"✅ 已发送 / Enviado" })
      onSaved && onSaved()
      setTimeout(() => setMsg(null), 1500)
    } catch(e) {
      setMsg({ tipo:"err", txt:"⚠️ " + (e.message || "Error al enviar") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background:"#fff", borderRadius:10, marginBottom:10,
      border: isExpanded ? "2px solid #c47830" : "1px solid #e2e8f0",
      overflow:"hidden", transition:"all 0.2s",
    }}>
      <div onClick={onExpand} style={{ padding:"12px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
            {c.nro && (
              <span style={{ background:"#040c18", color:"#c47830", borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:800, letterSpacing:0.5 }}>
                {c.nro}
              </span>
            )}
            <span style={{
              background: (EST_COLOR[c.estado]||"#94a3b8") + "20",
              color: EST_COLOR[c.estado]||"#475569",
              border:"1px solid " + (EST_COLOR[c.estado]||"#cbd5e1") + "55",
              borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700,
            }}>
              {EST_ZH[c.estado]} / {EST_ES[c.estado]}
            </span>
            {opVinculada && (
              <span style={{ background:"#fef9c3", color:"#854d0e", border:"1px solid #fde68a", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:800 }}>
                ✈️ 在 {opVinculada.nro} / En {opVinculada.nro}
              </span>
            )}
            <span style={{ fontSize:10, color:"#94a3b8" }}>· {fmtDate(c._updated)}</span>
          </div>
          <div style={{ fontWeight:700, fontSize:14, color:"#0f172a", marginBottom:2 }}>
            {c.producto || "—"}
          </div>
          {c.cliente && (
            <div style={{ fontSize:11, color:"#64748b", marginBottom:2 }}>
              👤 客户 / Cliente: <b style={{ color:"#475569" }}>{c.cliente}</b>
            </div>
          )}
          <div style={{ fontSize:11, color:"#64748b" }}>
            📦 {Number(c.unidades || 0).toLocaleString("es-CL")} 件 unidades
            {c.sku_china && <> · 🏷 {c.sku_china}</>}
            {Number(c.dim_m3) > 0 && <> · 📐 {fmtN(Number(c.dim_m3)*Number(c.unidades||0),3)} m³ total</>}
            {Number(c.peso_kg) > 0 && <> · ⚖️ {c.peso_kg} kg</>}
            {historial.length > 0 && <> · 💬 {historial.length} {historial.length===1?"mensaje":"mensajes"}</>}
          </div>
        </div>
        <div style={{ fontSize:22, color:"#94a3b8" }}>{isExpanded ? "▾" : "▸"}</div>
      </div>

      {isExpanded && (
        <div style={{ padding:"12px 16px 16px", borderTop:"1px solid #f1f5f9", background:"#fafafa" }}>
          {/* Info producto */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px", marginBottom:10, fontSize:11, color:"#475569" }}>
            <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              {c.imagen_url_sunny && (() => {
                const imgs = c.imagen_url_sunny.split("|||").map(s=>s.trim()).filter(s => /^https?:\/\//i.test(s))
                if (imgs.length === 0) return null
                return (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, flexShrink:0, maxWidth:170 }}>
                    {imgs.slice(0,4).map((url, idx) => (
                      <img key={idx} src={proxyImg(url)} alt="" referrerPolicy="no-referrer" style={{ width:imgs.length===1?80:50, height:imgs.length===1?80:50, borderRadius:5, objectFit:"cover", border:"1px solid #e2e8f0" }} onError={e=>e.target.style.display="none"}/>
                    ))}
                    {imgs.length > 4 && <div style={{ width:50, height:50, borderRadius:5, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b", fontSize:11, fontWeight:700 }}>+{imgs.length-4}</div>}
                  </div>
                )
              })()}
              <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {c.sku_china && <div><b>SKU:</b> {c.sku_china}</div>}
                {c.unidad_medida && <div><b>Unidad:</b> {c.unidad_medida}</div>}
                {c.material_china && <div style={{ gridColumn:"1 / -1" }}><b>🧪 Material:</b> {c.material_china}</div>}
                {c.precio_china_rmb && <div><b>FOB:</b> ¥{c.precio_china_rmb}/und</div>}
                {Number(c.peso_unitario_g) > 0 && <div><b>Peso/und:</b> {c.peso_unitario_g} g</div>}
                {Number(c.dim_largo) > 0 && <div><b>Caja:</b> {c.dim_largo}×{c.dim_ancho}×{c.dim_alto} cm</div>}
                {Number(c.peso_kg) > 0 && <div><b>Peso/caja:</b> {c.peso_kg} kg</div>}
                {c.dim_und_caja && <div><b>Und/caja:</b> {c.dim_und_caja}</div>}
                {c.form_f_incluido !== undefined && <div><b>Form F:</b> {c.form_f_incluido ? "✓ Sí" : "✗ No"}</div>}
              </div>
            </div>
            {(c.link_alibaba || c.imagen_url_sunny) && (
              <div style={{ marginTop:6, display:"flex", gap:12, fontSize:11 }}>
                {c.link_alibaba && <a href={c.link_alibaba} target="_blank" rel="noopener noreferrer" style={{ color:"#2d78c8" }}>🔗 Link producto</a>}
                {c.imagen_url_sunny && <a href={c.imagen_url_sunny} target="_blank" rel="noopener noreferrer" style={{ color:"#c47830" }}>📷 Ver imagen</a>}
              </div>
            )}
          </div>

          {/* Resumen económico (read-only) */}
          {(() => {
            const u = Number(c.unidades) || 0
            const precioRmb = Number(c.precio_china_rmb) || 0
            const subtotalMerc = precioRmb * u
            if (subtotalMerc === 0) return null
            const comisionPct = Number(c.comision_sunny_pct) || 0
            const seguroPct = Number(c.seguro_pct) || 0
            const undCaja = Number(c.dim_und_caja) || 0
            const esCaja = c.dim_tipo === "caja"
            const nCajas = esCaja && undCaja > 0 ? Math.ceil(u/undCaja) : 0
            const pesoTotal = (Number(c.peso_kg)||0) * (esCaja ? nCajas : u)
            const tarifaRmbKg = Number(c.aer_tarifa_sunny_rmb_kg) || (Number(c.aer_tarifa_sunny_kg)||0) * TC_RMB_USD
            const flete = pesoTotal * tarifaRmbKg
            const comision = subtotalMerc * comisionPct / 100
            const seguroMin = Number(c.seguro_min_rmb) || 0
            const seguro = Math.max(seguroMin, subtotalMerc * seguroPct)
            const transporteCn = Number(c.cost_transporte_interno_cn_rmb) || 0
            const otros = (Number(c.cost_cert_origen_rmb)||0) + (Number(c.cost_doc_operacion_rmb)||0) + (Number(c.cost_despacho_aduanero_rmb)||0) + (Number(c.cost_compra_docs_rmb)||0) + transporteCn + seguro
            const total = subtotalMerc + comision + flete + otros
            if (total === 0) return null
            return (
              <div style={{ background:"#fff7ed", border:"1.5px solid #c47830", borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
                <div style={{ fontSize:10, color:"#854d0e", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>
                  💰 报价总览 / Resumen Sunny
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"2px 12px", fontSize:11, color:"#475569" }}>
                  <span>货值 Mercancía:</span><b style={{ color:"#0f172a", textAlign:"right" }}>{fmtRMB(subtotalMerc)}</b>
                  {comision > 0 && <><span>佣金 Comisión ({comisionPct}%):</span><b style={{ color:"#0f172a", textAlign:"right" }}>{fmtRMB(comision)}</b></>}
                  {flete > 0 && <><span>空运 Flete:</span><b style={{ color:"#0f172a", textAlign:"right" }}>{fmtRMB(flete)}</b></>}
                  {otros > 0 && <><span>其他 Otros gastos:</span><b style={{ color:"#0f172a", textAlign:"right" }}>{fmtRMB(otros)}</b></>}
                </div>
                <div style={{ borderTop:"2px solid #c47830", marginTop:6, paddingTop:5, display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                  <b style={{ color:"#854d0e", fontSize:12 }}>总计 TOTAL:</b>
                  <div style={{ textAlign:"right" }}>
                    <b style={{ color:"#c47830", fontSize:15 }}>{fmtRMB(total)}</b>
                    <span style={{ fontSize:10, color:"#64748b", marginLeft:6 }}>≈ {fmtUSD(total/TC_RMB_USD)}</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Chat */}
          <Section title="💬 消息 / Mensajes">
            {historial.length === 0 ? (
              <div style={{ fontSize:11, color:"#94a3b8", fontStyle:"italic", textAlign:"center", padding:"10px 0" }}>
                还没有消息 / Aún sin mensajes
              </div>

            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:240, overflowY:"auto", marginBottom:8 }}>
                {historial.filter(n=>!n.oculta).map((n, i) => {
                  const esSunny = n.autor === "agente_aereo" || n.autor === "agente_china"
                  return (
                    <div key={n.id || i} style={{
                      background: esSunny ? "#fff7ed" : "#eff6ff",
                      border: "1px solid " + (esSunny ? "#fed7aa" : "#bfdbfe"),
                      borderRadius: 8, padding:"7px 10px", fontSize:12,
                      alignSelf: esSunny ? "flex-end" : "flex-start", maxWidth:"85%",
                    }}>
                      <div style={{ fontSize:9, color: esSunny ? "#c47830" : "#2d78c8", fontWeight:700, marginBottom:2 }}>
                        {esSunny ? "Sunny" : (n.autorNombre || "Admin")} · {fmtDate(n.fecha)}
                      </div>
                      <div style={{ color:"#0f172a", whiteSpace:"pre-wrap", lineHeight:1.4 }}>{n.texto}</div>
                    </div>
                  )
                })}
              </div>
            )}
            <textarea value={nuevoMsg} onChange={e=>setNuevoMsg(e.target.value)} rows={2}
              placeholder="写消息... / Escribir mensaje..."
              style={{ width:"100%", background:"#fff", border:"1px solid #e2e8f0", borderRadius:7, padding:"7px 10px", fontSize:12, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", marginBottom:6 }}/>
            {msg && (
              <div style={{
                marginBottom:6, padding:"6px 10px", borderRadius:6, fontSize:11, fontWeight:600,
                background: msg.tipo==="ok" ? "#f0fdf4" : "#fef2f2",
                color: msg.tipo==="ok" ? "#15803d" : "#dc2626",
                border:"1px solid " + (msg.tipo==="ok" ? "#bbf7d0" : "#fecaca"),
              }}>{msg.txt}</div>
            )}
            <button onClick={enviarMensaje} disabled={saving || !nuevoMsg.trim()}
              style={{
                width:"100%", padding:"8px 14px", fontSize:12, fontWeight:700,
                background: (saving || !nuevoMsg.trim()) ? "#cbd5e1" : "#c47830",
                color:"#fff", border:"none", borderRadius:7,
                cursor: (saving || !nuevoMsg.trim()) ? "not-allowed" : "pointer", fontFamily:"inherit",
              }}>
              {saving ? "发送中... / Enviando..." : "📤 发送 / Enviar"}
            </button>
          </Section>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard (tab 6) ───────────────────────────────────────────────────────
function Dashboard({ cots, pendCot, confirmadas, camino, completadas }) {
  const totalCot = cots.length
  const respuestasMes = cots.filter(c => {
    if (c.estado === "solicitud") return false
    if (!c.fecha_respuesta_china) return false
    const d = new Date(c.fecha_respuesta_china)
    const ahora = new Date()
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear()
  }).length
  const enTransito = camino.length
  const cerradasMes = completadas.filter(c => {
    if (!c.fecha_llegada_real) return false
    const d = new Date(c.fecha_llegada_real)
    const ahora = new Date()
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear()
  }).length

  const Kpi = ({ label, value, hint, color }) => (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:18, flex:1, minWidth:180 }}>
      <div style={{ fontSize:11, color:"#94a3b8", fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:800, color: color || "#0f172a", lineHeight:1 }}>{value}</div>
      {hint && <div style={{ fontSize:11, color:"#64748b", marginTop:6 }}>{hint}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ fontSize:18, fontWeight:800, color:"#0f172a", marginBottom:14 }}>
        📊 仪表板 / Dashboard
      </div>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:18 }}>
        <Kpi label="待报价 Pend. cotizar" value={pendCot.length} hint={pendCot.length > 0 ? "有等待中的请求 / Hay solicitudes esperando" : "全部就绪 / Todo al día"} color="#c47830"/>
        <Kpi label="本月已报价 Cotizadas mes" value={respuestasMes} hint="本月发送的回复 / Respuestas enviadas este mes" color="#1aa358"/>
        <Kpi label="运输中 En tránsito" value={enTransito} hint="在途货物 / Envíos en camino" color="#a85590"/>
        <Kpi label="本月完成 Cerradas mes" value={cerradasMes} hint="本月到达 / Llegaron en este mes" color="#0d9870"/>
      </div>
      <Kpi label="总活跃 Total activas" value={totalCot} hint="所有可见的航空报价 / Todas las cotizaciones aéreas que ves"/>
    </div>
  )
}

// ─── Card de operación a recotizar (tab nuevo) ──────────────────────────────
function OpRecotizarCard({ op, cots, supabase, onSaved, onEditCot }) {
  const cotsEnOp = cots.filter(c => (op.cotizaciones || []).includes(c._id))
  const nCots = cotsEnOp.length

  // Estados del formulario completo (todo en RMB)
  const [comisionPct, setComisionPct]    = useState(op.comision_sunny_pct ?? 5)
  const [fleteRmbKg, setFleteRmbKg]      = useState(op.flete_rmb_kg_consolidado ?? "")
  const [certOrigen, setCertOrigen]      = useState(op.cost_cert_origen_rmb ?? 150)
  const [docOperacion, setDocOperacion]  = useState(op.cost_doc_operacion_rmb ?? 150)
  const [despachoAd, setDespachoAd]      = useState(op.cost_despacho_aduanero_rmb ?? 200)
  const [compraDocs, setCompraDocs]      = useState(op.cost_compra_docs_rmb ?? 350)
  const [transporteCn, setTransporteCn]  = useState(op.cost_transporte_interno_cn_rmb ?? 0)
  const [seguroPct, setSeguroPct]        = useState((op.seguro_pct ?? 0.002) * 100)
  const [seguroMinRmb, setSeguroMinRmb]  = useState(op.seguro_min_rmb ?? 150)
  const [nota, setNota] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  // ─── Totales mercancía + envío ─────────────────────────────────────────────
  const totalCbm = cotsEnOp.reduce((s, c) => {
    const m3 = Number(c.dim_m3) || 0
    const u  = Number(c.unidades) || 0
    const undCaja = Number(c.dim_und_caja) || 0
    const esCaja  = c.dim_tipo === "caja"
    return s + (esCaja && undCaja > 0 ? m3 * Math.ceil(u/undCaja) : m3 * u)
  }, 0)
  const totalPeso = cotsEnOp.reduce((s, c) => {
    const p = Number(c.peso_kg) || 0
    const u = Number(c.unidades) || 0
    const undCaja = Number(c.dim_und_caja) || 0
    const esCaja  = c.dim_tipo === "caja"
    return s + (esCaja && undCaja > 0 ? p * Math.ceil(u/undCaja) : p * u)
  }, 0)
  const totalUnd = cotsEnOp.reduce((s, c) => s + (Number(c.unidades) || 0), 0)

  // Valor mercancía en RMB (Exw, sin comisión)
  const valorMercanciaRMB = cotsEnOp.reduce((s, c) => {
    const p = Number(c.precio_china_rmb) || 0
    const u = Number(c.unidades) || 0
    return s + p * u
  }, 0)

  // Cálculos en vivo
  const comisionRMB     = valorMercanciaRMB * (Number(comisionPct) || 0) / 100
  const totalFOBRmb     = valorMercanciaRMB + comisionRMB
  const fleteRMB        = totalPeso * (Number(fleteRmbKg) || 0)
  const certOrigenTotal = (Number(certOrigen) || 0) * nCots
  const seguroMin       = Number(seguroMinRmb) || 0
  const seguroCalc      = valorMercanciaRMB * (Number(seguroPct) || 0) / 100
  const seguroRMB       = Math.max(seguroMin, seguroCalc)
  const transporteCnRMB = Number(transporteCn) || 0
  const otrosGastos     = certOrigenTotal + (Number(docOperacion)||0) + (Number(despachoAd)||0) + (Number(compraDocs)||0) + transporteCnRMB + seguroRMB
  const totalEnvioRMB   = fleteRMB + otrosGastos
  const totalChinaRMB   = totalFOBRmb + totalEnvioRMB
  const totalChinaUSD   = totalChinaRMB / TC_RMB_USD

  async function confirmar() {
    setSaving(true)
    setMsg(null)
    try {
      const { data: fresca, error: errLoad } = await supabase
        .from("operaciones").select("datos").eq("id", op._id).single()
      if (errLoad || !fresca) throw new Error("No se pudo leer operación")
      const datosMerged = { ...fresca.datos }
      datosMerged.comision_sunny_pct        = Number(comisionPct) || 0
      if (fleteRmbKg !== "") {
        datosMerged.flete_rmb_kg_consolidado = Number(fleteRmbKg)
        datosMerged.flete_usd_kg_consolidado = Number(fleteRmbKg) / TC_RMB_USD
      }
      datosMerged.cost_cert_origen_rmb      = Number(certOrigen) || 0
      datosMerged.cost_doc_operacion_rmb    = Number(docOperacion) || 0
      datosMerged.cost_despacho_aduanero_rmb= Number(despachoAd) || 0
      datosMerged.cost_compra_docs_rmb      = Number(compraDocs) || 0
      datosMerged.cost_transporte_interno_cn_rmb = Number(transporteCn) || 0
      datosMerged.seguro_pct                = (Number(seguroPct) || 0) / 100
      datosMerged.seguro_min_rmb            = Number(seguroMinRmb) || 0
      datosMerged.recotizacion_completada_sunny = true
      datosMerged.recotizacion_pendiente_sunny  = false
      datosMerged.fecha_respuesta_sunny     = new Date().toISOString()
      if (nota.trim()) {
        const hist = Array.isArray(fresca.datos.notas_sunny) ? [...fresca.datos.notas_sunny] : []
        hist.push({ fecha: new Date().toISOString(), autor: "Sunny", texto: nota.trim() })
        datosMerged.notas_sunny = hist
      }
      const { error: errSave } = await supabase
        .from("operaciones").update({ datos: datosMerged, updated_at: new Date().toISOString() })
        .eq("id", op._id).select("id")
      if (errSave) throw errSave
      setMsg({ tipo:"ok", txt:"✅ 已发送 / Cotización enviada al admin" })
      setTimeout(() => onSaved && onSaved(), 1200)
    } catch (e) {
      console.error(e)
      setMsg({ tipo:"err", txt:"⚠️ Error: " + (e.message || "no se pudo guardar") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background:"#fff", borderRadius:12, marginBottom:14, border:"2px solid #c47830", overflow:"hidden" }}>
      <div style={{ padding:"12px 16px", background:"#fff7ed", borderBottom:"1px solid #fed7aa" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
          <span style={{ background:"#040c18", color:"#c47830", borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:800 }}>
            🔄 {op.nro}
          </span>
          <span style={{ fontSize:10, fontWeight:700, color:"#92400e", background:"#fff", border:"1px solid #fed7aa", borderRadius:5, padding:"2px 8px" }}>
            管理员请求合并报价 / Admin pidió cotizar consolidado
          </span>
        </div>
        <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>
          📦 {nCots} 件 cotizaciones · {fmtN(totalUnd,0)} und · {fmtN(totalCbm,3)} m³ · {fmtN(totalPeso,1)} kg
        </div>
      </div>

      <div style={{ padding:"16px 20px" }}>
        {/* Lista de cots con valor mercancía */}
        <Section title="📋 操作中的报价 / Cotizaciones en la operación">
          {cotsEnOp.map(c => {
            const p = Number(c.precio_china_rmb) || 0
            const u = Number(c.unidades) || 0
            const subtotal = p * u
            const sinDatos = p === 0
            return (
              <div key={c._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid #f1f5f9", fontSize:12, gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <b style={{ color:"#0f172a" }}>{c.nro || "?"}</b> · {c.producto || "—"}
                  <span style={{ color:"#94a3b8", marginLeft:6 }}>· 👤 {c.cliente || "—"}</span>
                  {sinDatos && <span style={{ marginLeft:6, fontSize:10, color:"#dc2626", background:"#fef2f2", border:"1px solid #fecaca", padding:"1px 6px", borderRadius:8, fontWeight:700 }}>⚠️ Sin datos</span>}
                </div>
                <div style={{ color:"#64748b", fontSize:11, textAlign:"right", whiteSpace:"nowrap" }}>
                  {u} und × ¥{p} = <b style={{ color:"#0f172a" }}>{fmtRMB(subtotal)}</b>
                </div>
                {onEditCot && (
                  <button onClick={()=>onEditCot(c._id)} title="编辑 / Ir a editar esta cotización" style={{ background:"#fff", color:"#c47830", border:"1px solid #fed7aa", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700, fontFamily:"inherit", whiteSpace:"nowrap" }}>✏️ 编辑</button>
                )}
              </div>
            )
          })}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0 4px", marginTop:4, borderTop:"2px solid #fed7aa", fontSize:13 }}>
            <b style={{ color:"#854d0e" }}>总货值 / Valor mercancía total (Exw)</b>
            <b style={{ color:"#0f172a" }}>{fmtRMB(valorMercanciaRMB)}</b>
          </div>
        </Section>

        {/* SECCIÓN: COMISIÓN SUNNY */}
        <Section title="💼 佣金 / Comisión Sunny">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Field label="佣金% / Comisión (% sobre mercancía)">
              <input type="number" step="0.1" value={comisionPct} onChange={e=>setComisionPct(e.target.value)} placeholder="5" style={inp}/>
            </Field>
            <Field label="佣金金额 / Comisión RMB (calculado)">
              <div style={{ ...inp, background:"#fff7ed", color:"#c47830", fontWeight:700 }}>
                {fmtRMB(comisionRMB)}
              </div>
            </Field>
          </div>
        </Section>

        {/* SECCIÓN: FLETE AÉREO */}
        <Section title="✈️ 空运费 / Flete aéreo consolidado">
          <Field label="费率 RMB/kg / Tarifa flete RMB por kg">
            <input type="number" step="0.01" value={fleteRmbKg} onChange={e=>setFleteRmbKg(e.target.value)} placeholder="Ej: 65" style={inp}/>
          </Field>
          {fleteRMB > 0 && (
            <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:7, padding:"8px 11px", fontSize:11, color:"#92400e" }}>
              ▸ Flete total: <b>{fmtN(totalPeso,1)} kg × ¥{fleteRmbKg} = {fmtRMB(fleteRMB)}</b>
            </div>
          )}
        </Section>

        {/* SECCIÓN: OTROS GASTOS DEL ENVÍO */}
        <Section title="📦 其他费用 / Otros gastos del envío (defaults editables)">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:8 }}>
            <Field label={`原产地证 RMB / Cert. origen (×${nCots} productos)`}>
              <input type="number" step="1" value={certOrigen} onChange={e=>setCertOrigen(e.target.value)} placeholder="150" style={inp}/>
            </Field>
            <Field label="原产地证 总 / Total cert. (RMB)">
              <div style={{ ...inp, background:"#f1f5f9", color:"#475569", fontWeight:700 }}>{fmtRMB(certOrigenTotal)}</div>
            </Field>
            <Field label="操作文件费 / Doc. operación RMB">
              <input type="number" step="1" value={docOperacion} onChange={e=>setDocOperacion(e.target.value)} placeholder="150" style={inp}/>
            </Field>
            <Field label="报关费 / Despacho aduanero CN RMB">
              <input type="number" step="1" value={despachoAd} onChange={e=>setDespachoAd(e.target.value)} placeholder="200" style={inp}/>
            </Field>
            <Field label="文件采购 / Compra documentos RMB">
              <input type="number" step="1" value={compraDocs} onChange={e=>setCompraDocs(e.target.value)} placeholder="350" style={inp}/>
            </Field>
            <Field label="国内运输 / Transporte interno CN RMB">
              <input type="number" step="1" value={transporteCn} onChange={e=>setTransporteCn(e.target.value)} placeholder="0" style={inp}/>
            </Field>
            <Field label={`保险 % / Seguro % (sobre ¥${fmtN(valorMercanciaRMB,0)})`}>
              <input type="number" step="0.01" value={seguroPct} onChange={e=>setSeguroPct(e.target.value)} placeholder="0.2" style={inp}/>
            </Field>
            <Field label="保险最低 / Seguro mínimo RMB">
              <input type="number" step="1" value={seguroMinRmb} onChange={e=>setSeguroMinRmb(e.target.value)} placeholder="150" style={inp}/>
            </Field>
          </div>
          <div style={{ background:"#fefce8", border:"1px dashed #fde047", borderRadius:7, padding:"7px 11px", fontSize:10.5, color:"#78350f", lineHeight:1.55, marginBottom:6 }}>
            <b>📋 保险规则 / Regla seguro:</b> 150 RMB únicos por consolidado si total ≤ 75.000 RMB · si supera, se cobra 0,2% del valor de mercancías
            <br/><span style={{ color: valorMercanciaRMB > 75000 ? "#c47830" : "#16a34a", fontWeight:600 }}>
              {valorMercanciaRMB > 75000
                ? `▸ Total ¥${fmtN(valorMercanciaRMB,0)} > ¥75.000 → aplica 0,2% = ${fmtRMB(seguroRMB)}`
                : `▸ Total ¥${fmtN(valorMercanciaRMB,0)} ≤ ¥75.000 → aplica mínimo ${fmtRMB(seguroRMB)}`}
            </span>
          </div>
          <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:7, padding:"8px 11px", fontSize:11, color:"#475569", lineHeight:1.7 }}>
            ▸ 原产地证 Cert. origen: <b>{fmtRMB(certOrigenTotal)}</b> ({nCots} × ¥{certOrigen})<br/>
            ▸ 操作文件 Doc. operación: <b>{fmtRMB(Number(docOperacion)||0)}</b><br/>
            ▸ 报关费 Despacho aduanero: <b>{fmtRMB(Number(despachoAd)||0)}</b><br/>
            ▸ 文件采购 Compra docs: <b>{fmtRMB(Number(compraDocs)||0)}</b><br/>
            {transporteCnRMB > 0 && <>▸ 国内运输 Transporte interno CN: <b>{fmtRMB(transporteCnRMB)}</b><br/></>}
            ▸ 保险 Seguro ({seguroPct}%): <b>{fmtRMB(seguroRMB)}</b>
              {seguroRMB > seguroCalc && <span style={{ color:"#c47830", marginLeft:6, fontStyle:"italic" }}>(calc ¥{fmtN(seguroCalc,0)} → mín ¥{fmtN(seguroMin,0)})</span>}<br/>
            <div style={{ borderTop:"1px solid #e2e8f0", paddingTop:5, marginTop:5 }}>
              <b style={{ color:"#854d0e" }}>其他总计 / Subtotal otros gastos: {fmtRMB(otrosGastos)}</b>
            </div>
          </div>
        </Section>

        {/* RESUMEN GENERAL */}
        <Section title="💰 总计 / Resumen total">
          <div style={{ background:"#fff7ed", border:"2px solid #c47830", borderRadius:10, padding:"12px 14px", fontSize:12, lineHeight:1.8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", color:"#475569" }}>
              <span>货值 Mercancía (Exw):</span>
              <b style={{ color:"#0f172a" }}>{fmtRMB(valorMercanciaRMB)}</b>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", color:"#475569" }}>
              <span>佣金 Comisión Sunny ({comisionPct}%):</span>
              <b style={{ color:"#0f172a" }}>{fmtRMB(comisionRMB)}</b>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #fed7aa", paddingTop:4, marginTop:4, color:"#475569" }}>
              <span>FOB con comisión:</span>
              <b style={{ color:"#0f172a" }}>{fmtRMB(totalFOBRmb)}</b>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", color:"#475569" }}>
              <span>空运 Flete aéreo:</span>
              <b style={{ color:"#0f172a" }}>{fmtRMB(fleteRMB)}</b>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", color:"#475569" }}>
              <span>其他 Otros gastos:</span>
              <b style={{ color:"#0f172a" }}>{fmtRMB(otrosGastos)}</b>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", borderTop:"2px solid #c47830", paddingTop:7, marginTop:7, fontSize:14 }}>
              <b style={{ color:"#854d0e" }}>总计 TOTAL CHINA:</b>
              <div style={{ textAlign:"right" }}>
                <div><b style={{ color:"#c47830" }}>{fmtRMB(totalChinaRMB)}</b></div>
                <div style={{ fontSize:11, color:"#64748b", fontWeight:400 }}>≈ {fmtUSD(totalChinaUSD)} (TC {TC_RMB_USD})</div>
              </div>
            </div>
          </div>
        </Section>

        {/* Nota opcional */}
        <Section title="✉️ 备注 / Nota al admin (opcional)">
          <textarea value={nota} onChange={e=>setNota(e.target.value)} rows={2}
            placeholder="例如：特殊条件、生产 ETA... / Ej: condiciones especiales, ETA producción..."
            style={{ ...inp, resize:"vertical", minHeight:50, fontFamily:"inherit" }}/>
        </Section>

        {msg && (
          <div style={{
            marginBottom:10, padding:"8px 12px", borderRadius:7, fontSize:12, fontWeight:600,
            background: msg.tipo==="ok" ? "#f0fdf4" : "#fef2f2",
            border:"1px solid " + (msg.tipo==="ok" ? "#bbf7d0" : "#fecaca"),
            color: msg.tipo==="ok" ? "#15803d" : "#dc2626",
          }}>{msg.txt}</div>
        )}

        <button onClick={confirmar} disabled={saving || !fleteRmbKg}
          style={{ ...btn, width:"100%", background: fleteRmbKg ? "#c47830" : "#cbd5e1", color:"#fff", cursor: fleteRmbKg && !saving ? "pointer" : "not-allowed" }}>
          ✅ {saving ? "发送中..." : "确认报价 / Confirmar cotización consolidada"}
        </button>
      </div>
    </div>
  )
}

// ─── Mini componentes UI ─────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"14px 16px", marginBottom:12 }}>
      <div style={{ fontSize:11, color:"#c47830", fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:8 }}>
      <label style={{ display:"block", fontSize:10, color:"#64748b", fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</label>
      {children}
    </div>
  )
}
const inp = {
  width:"100%", background:"#fff", border:"1px solid #e2e8f0", borderRadius:7,
  padding:"8px 11px", fontSize:13, outline:"none", boxSizing:"border-box",
  color:"#0f172a", fontFamily:"inherit",
}
const btn = {
  padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer",
  borderRadius:8, fontFamily:"inherit", transition:"all 0.15s",
}

// ─── TAB MIS PAGOS — Sunny ve cuánto le debe ZAGA por OP y cuánto ya recibió ─
// Read-only. Si admin actualiza pagos_reales, se refleja por realtime (postgres_changes).
function MisPagosTab({ ops, cots }) {
  // OPs con al menos 1 cot aérea — excluye OPs en estado "completada" totalmente cerradas
  const opsActivas = (Array.isArray(ops) ? ops : [])
    .filter(o => o && o._id)
    .filter(o => {
      const cotsOp = cots.filter(c => c.operacion_id === o._id || (Array.isArray(o.cotizaciones) && o.cotizaciones.includes(c._id)))
      return cotsOp.length > 0
    })
    .sort((a, b) => new Date(b._updated || 0) - new Date(a._updated || 0))

  if (opsActivas.length === 0) {
    return <Empty zh="暂无操作" es="No hay operaciones con pagos para mostrar" emoji="💰" />
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ background:"#040c18", borderRadius:12, padding:"14px 18px", color:"#fff" }}>
        <div style={{ fontSize:14, fontWeight:800, color:"#c47830", marginBottom:4 }}>💰 我的付款 / Mis pagos</div>
        <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.5 }}>
          每个操作的总成本 RMB + ZAGA 已支付的 3 笔款 (实时同步)
          <br/>Costo total por OP en RMB y los 3 pagos que ZAGA realizó. Se sincroniza automáticamente.
        </div>
      </div>
      {opsActivas.map(op => <OpPagoCard key={op._id} op={op} cots={cots} />)}
    </div>
  )
}

function OpPagoCard({ op, cots }) {
  const [expanded, setExpanded] = useState(true)
  const cotsOp = cots.filter(c => c.operacion_id === op._id || (Array.isArray(op.cotizaciones) && op.cotizaciones.includes(c._id)))
  if (cotsOp.length === 0) return null

  // Calcular total RMB acordado de la OP (suma de las cots)
  let totalRMB = 0
  const desgloseRMB = []
  for (const c of cotsOp) {
    const u = Number(c.unidades) || 0
    const merc = (Number(c.precio_china_rmb)||0) * u
    const comPct = Number(c.comision_sunny_pct ?? op.comision_sunny_pct) || 0
    const com = merc * comPct / 100
    // Flete: usar tarifa RMB/kg si está, sino USD/kg
    const tarifaRmbKg = Number(c.aer_tarifa_sunny_rmb_kg || op.flete_rmb_kg_consolidado) || 0
    const tarifaUsdKg = Number(c.aer_tarifa_sunny_kg) || 0
    const pesoKg = (Number(c.peso_kg)||0) * (Number(c.dim_und_caja)>0 ? Math.ceil(u/Number(c.dim_und_caja)) : 0)
    const fleteRmb = tarifaRmbKg > 0 ? pesoKg * tarifaRmbKg : pesoKg * tarifaUsdKg * TC_RMB_USD
    const certOrigen = Number(c.cost_cert_origen_rmb) || 0
    const sub = merc + com + fleteRmb + certOrigen
    desgloseRMB.push({ nro: c.nro, cliente: c.cliente, merc, com, fleteRmb, certOrigen, sub })
    totalRMB += sub
  }
  // Extras OP (compartidos: docs, despacho, transporte interno, seguro)
  const extrasOpRMB =
    (Number(op.cost_doc_operacion_rmb) || 0) +
    (Number(op.cost_despacho_aduanero_rmb) || 0) +
    (Number(op.cost_compra_docs_rmb) || 0) +
    (Number(op.cost_transporte_interno_cn_rmb) || 0)
  totalRMB += extrasOpRMB

  // Pagos realizados
  const pagos = op.pagos_reales?.egresos || {}
  const pagoDefs = [
    { key:"pago1_sunny", lbl:"1er pago 第1次付款" },
    { key:"pago2_sunny", lbl:"2do pago 第2次付款" },
    { key:"pago3_sunny", lbl:"3er pago 第3次付款" },
  ]
  let totalRmbPagado = 0, totalClpPagado = 0
  const pagosCalc = pagoDefs.map(p => {
    const e = pagos[p.key] || {}
    const rmb = Number(e.rmb) || 0
    const tc = Number(e.tc_wu) || 0
    const clp = Number(e.clp_enviado) || 0
    const com = Number(e.comision) || 0
    const ivaCom = e.iva_comision != null && e.iva_comision !== "" ? Number(e.iva_comision) : com * 0.19
    const totalClp = clp + com + ivaCom
    totalRmbPagado += rmb
    totalClpPagado += totalClp
    return { ...p, rmb, tc, clp, com, ivaCom, totalClp, fecha: e.fecha, nota: e.nota, pagado: rmb > 0 || clp > 0 }
  })
  const saldoRmb = totalRMB - totalRmbPagado

  return (
    <div style={{ background:"#fff", border:"2px solid #fde68a", borderRadius:12, overflow:"hidden" }}>
      <div onClick={()=>setExpanded(!expanded)} style={{ padding:"12px 16px", cursor:"pointer", background:"#fef3c7", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
            <span style={{ background:"#040c18", color:"#c47830", borderRadius:5, padding:"3px 9px", fontSize:12, fontWeight:800 }}>✈️ {op.nro}</span>
            <span style={{ background:"#fff", color:"#854d0e", border:"1px solid #fde68a", borderRadius:5, padding:"2px 8px", fontSize:11 }}>{cotsOp.length} cot · {cotsOp.reduce((s,c)=>s+(Number(c.unidades)||0),0)} und</span>
            <span style={{ background:saldoRmb<=0?"#dcfce7":"#fef3c7", color:saldoRmb<=0?"#15803d":"#92400e", border:`1px solid ${saldoRmb<=0?"#22c55e":"#fbbf24"}`, borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:700 }}>
              {saldoRmb<=0 ? "✓ 已全部支付 Pagado completo" : `⏳ 待付款 / Saldo ¥${fmtN(saldoRmb,0)}`}
            </span>
          </div>
          <div style={{ fontSize:12, color:"#854d0e", display:"flex", gap:12, flexWrap:"wrap" }}>
            <span>总额 / Total acordado: <b>¥{fmtN(totalRMB,2)}</b></span>
            <span>已付 / Pagado: <b>¥{fmtN(totalRmbPagado,2)}</b></span>
            <span>CLP pagado: <b>${fmtN(totalClpPagado,0)}</b></span>
          </div>
        </div>
        <div style={{ fontSize:22, color:"#854d0e" }}>{expanded ? "▾" : "▸"}</div>
      </div>

      {expanded && (
        <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:14 }}>
          {/* Desglose RMB por cot */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#475569", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>
              📦 报价分解 / Desglose por cotización (RMB)
            </div>
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px" }}>
              {desgloseRMB.map((d,i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto auto auto", gap:8, padding:"5px 0", borderTop: i>0?"1px solid #e2e8f0":"none", fontSize:11 }}>
                  <div>
                    <div style={{ fontWeight:700, color:"#0f172a" }}>{d.nro}</div>
                    <div style={{ fontSize:10, color:"#94a3b8" }}>{d.cliente || "—"}</div>
                  </div>
                  <span style={{ color:"#64748b" }}>货物 Merc: <b style={{ color:"#0f172a" }}>¥{fmtN(d.merc,0)}</b></span>
                  <span style={{ color:"#64748b" }}>佣金 Com: <b style={{ color:"#0f172a" }}>¥{fmtN(d.com,0)}</b></span>
                  <span style={{ color:"#64748b" }}>运费 Flete: <b style={{ color:"#0f172a" }}>¥{fmtN(d.fleteRmb,0)}</b></span>
                  <span style={{ color:"#64748b" }}>原产地 Cert: <b style={{ color:"#0f172a" }}>¥{fmtN(d.certOrigen,0)}</b></span>
                  <span style={{ color:"#0f172a", fontWeight:700 }}>= ¥{fmtN(d.sub,0)}</span>
                </div>
              ))}
              {extrasOpRMB > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, padding:"7px 0", borderTop:"1px dashed #cbd5e1", fontSize:11, marginTop:4 }}>
                  <span style={{ color:"#64748b" }}>⚙️ 其他费用 / Extras OP (docs, despacho, transporte interno)</span>
                  <span style={{ color:"#0f172a", fontWeight:700 }}>¥{fmtN(extrasOpRMB,0)}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0 2px", borderTop:"2px solid #c47830", marginTop:6, fontSize:12 }}>
                <span style={{ color:"#92400e", fontWeight:800 }}>总金额 / TOTAL RMB acordado</span>
                <span style={{ color:"#c47830", fontWeight:800, fontSize:14 }}>¥{fmtN(totalRMB,2)}</span>
              </div>
            </div>
          </div>

          {/* 3 pagos */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#475569", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>
              💸 3 笔付款 / Los 3 pagos a ti
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8 }}>
              {pagosCalc.map(p => (
                <div key={p.key} style={{
                  background: p.pagado ? "#f0fdf4" : "#f8fafc",
                  border: `2px solid ${p.pagado ? "#22c55e44" : "#e2e8f0"}`,
                  borderRadius:8, padding:"10px 12px",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, color: p.pagado ? "#15803d" : "#64748b" }}>{p.lbl}</span>
                    {p.pagado ? <span style={{ fontSize:9, background:"#16a34a", color:"#fff", borderRadius:5, padding:"1px 6px" }}>✓ 已付</span>
                              : <span style={{ fontSize:9, background:"#e2e8f0", color:"#64748b", borderRadius:5, padding:"1px 6px" }}>⏳ Pendiente</span>}
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color: p.pagado ? "#15803d" : "#94a3b8", marginBottom:2 }}>
                    ¥{fmtN(p.rmb, 0)}
                  </div>
                  {p.pagado && (
                    <>
                      <div style={{ fontSize:10, color:"#64748b" }}>TC: <b style={{ color:"#0f172a" }}>{fmtN(p.tc, 2)}</b></div>
                      <div style={{ fontSize:10, color:"#64748b" }}>CLP: <b style={{ color:"#0f172a" }}>${fmtN(p.clp, 0)}</b></div>
                      {p.com > 0 && <div style={{ fontSize:10, color:"#64748b" }}>Com WU: <b style={{ color:"#0f172a" }}>${fmtN(p.com, 0)}</b></div>}
                      <div style={{ fontSize:10, color:"#92400e", marginTop:3, paddingTop:3, borderTop:"1px dashed #e2e8f0" }}>
                        Total: <b>${fmtN(p.totalClp, 0)}</b>
                      </div>
                      {p.fecha && <div style={{ fontSize:10, color:"#3d7fc4", marginTop:2 }}>📅 {fmtDate(p.fecha)}</div>}
                      {p.nota && <div style={{ fontSize:10, color:"#475569", marginTop:2, fontStyle:"italic" }}>"{p.nota}"</div>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Resumen final */}
          <div style={{ background: saldoRmb<=0 ? "#dcfce7" : "#fffbeb", border:`2px solid ${saldoRmb<=0 ? "#22c55e" : "#fbbf24"}`, borderRadius:8, padding:"10px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, color: saldoRmb<=0 ? "#15803d" : "#92400e", fontWeight:700 }}>
                  {saldoRmb<=0 ? "✅ 已全部支付 / Totalmente pagada" : "⏳ Saldo pendiente / 待付款"}
                </div>
                <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>
                  Pagado ¥{fmtN(totalRmbPagado, 0)} de ¥{fmtN(totalRMB, 0)}
                </div>
              </div>
              <div style={{ fontSize:18, fontWeight:800, color: saldoRmb<=0 ? "#15803d" : "#92400e" }}>
                {saldoRmb<=0 ? "✓" : `¥${fmtN(saldoRmb, 0)}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
