import { useState, useEffect } from 'react'
import LOGO_WHITE from "./logo-white.png"

// PortalChina.jsx - Portal Agente China - ZAGA IMP
// Diseno alineado al cotizador_importaciones.jsx
// Sin login interno - auth manejado por Supabase (rol agente_china)

const ESTADOS_PENDIENTE = ["enviado_china", "respuesta_china", "re_testeando", "en_negociacion"]
const ESTADOS_ACTIVOS   = ["aceptada", "pagada_china"]
const ESTADOS_CAMINO    = ["en_camino"]

const EST_COLOR = {
  enviado_china:   "#2a8aaa",
  respuesta_china: "#b8922e",
  re_testeando:    "#6a9fd4",
  en_negociacion:  "#c47830",
  aceptada:        "#1aa358",
  pagada_china:    "#c47830",
  en_camino:       "#a85590",
}
const EST_BG = {
  enviado_china:   "#e8f5f9",
  respuesta_china: "#fdf6e3",
  re_testeando:    "#eef4fb",
  en_negociacion:  "#fdf0e3",
  aceptada:        "#eafaf1",
  pagada_china:    "#fdf0e3",
  en_camino:       "#f8f0fb",
}
const EST_ES = {
  enviado_china:   "Pendiente de cotizacion",
  respuesta_china: "Cotizacion recibida",
  re_testeando:    "Re-testeando precio",
  en_negociacion:  "En negociacion",
  aceptada:        "Orden aceptada",
  pagada_china:    "Pago realizado",
  en_camino:       "En camino",
}
const EST_ZH = {
  enviado_china:   "等待报价",
  respuesta_china: "报价已收到",
  re_testeando:    "重新议价中",
  en_negociacion:  "谈判中",
  aceptada:        "订单已接受",
  pagada_china:    "付款已完成",
  en_camino:       "运输中",
}

const TRANSP_ES = { maritimo:"Maritimo", aereo:"Aereo", ambos:"Maritimo + Aereo" }
const TRANSP_ZH = { maritimo:"海运", aereo:"空运", ambos:"海运+空运" }

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

export default function PortalChina({ supabase, onLogout }) {
  const [tab, setTab]           = useState("pending")
  const [cots, setCots]         = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [pulse, setPulse]       = useState(false)

  useEffect(() => {
    loadData()
    const channel = supabase.channel("zaga-portal-china-v2")
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
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* HEADER — identico al cotizador */}
      <div style={{
        background:"#040c18",
        borderBottom:"2px solid #c9a05530",
        padding:"0 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        height:54, position:"sticky", top:0, zIndex:100,
        boxShadow:"0 2px 12px #00000040",
      }}>
        {/* Logo + titulo */}
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <img src={LOGO_WHITE} alt="ZAGA IMP" style={{ height:32, objectFit:"contain" }} />
          <div style={{
            fontSize:12, fontWeight:700, color:"#94a3b8",
            letterSpacing:2, textTransform:"uppercase",
          }}>
            Gestion de Importaciones
          </div>
        </div>

        {/* Derecha */}
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {/* Badge pendientes */}
          {pending.length > 0 && (
            <div style={{
              display:"flex", alignItems:"center", gap:6,
              background:"#c9a05520", border:"1px solid #c9a05540",
              borderRadius:20, padding:"4px 12px",
            }}>
              <div style={{
                width:7, height:7, borderRadius:"50%",
                background: pulse ? "#c9a055" : "#c9a055",
                boxShadow: pulse ? "0 0 8px #c9a055" : "none",
                transition:"all 0.3s",
              }}/>
              <span style={{ fontSize:12, fontWeight:700, color:"#c9a055" }}>
                {pending.length} 待处理
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

      {/* SUBHEADER con nombre portal */}
      <div style={{
        background:"#040c18",
        borderBottom:"1px solid #1e293b",
        padding:"8px 24px 12px",
      }}>
        <div style={{ fontSize:13, color:"#c9a055", fontWeight:700, letterSpacing:0.3 }}>
          代理商门户 — Portal Agente China
        </div>
      </div>

      {/* TABS */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 24px" }}>
        <div style={{ display:"flex", gap:0 }}>
          {[
            { id:"pending",  count:pending.length,  label:"待处理 Pendientes",  urgent:pending.length > 0 },
            { id:"active",   count:active.length,   label:"已确认 Confirmadas" },
            { id:"shipping", count:shipping.length, label:"运输中 En camino" },
          ].map(t => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding:"14px 20px",
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
                }}
              >
                {t.label}
                {t.count > 0 && (
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

      {/* CONTENIDO */}
      <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 16px 48px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:64, color:"#94a3b8" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
            <div style={{ fontWeight:600 }}>加载中 / Cargando...</div>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign:"center", padding:64, color:"#94a3b8" }}>
            <div style={{ fontSize:40, marginBottom:14 }}>📭</div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4, color:"#475569" }}>
              {tab === "pending" ? "暂无待处理请求"
               : tab === "active" ? "暂无进行中订单"
               : "暂无运输中货物"}
            </div>
            <div style={{ fontSize:13 }}>
              {tab === "pending" ? "No hay solicitudes pendientes"
               : tab === "active" ? "No hay ordenes activas"
               : "No hay envios en camino"}
            </div>
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

function CotCard({ c, expanded, onToggle, supabase, recargar }) {
  const est    = c.estado || "enviado_china"
  const color  = EST_COLOR[est] || "#64748b"
  const bg     = EST_BG[est]   || "#f1f5f9"
  const isUrg  = est === "enviado_china"
  const nro    = c.nro_cotizacion || c.nro || String(c._id || "").slice(-6).toUpperCase() || "-"

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

  // Función central: guarda el array de notas en Supabase
  async function persistirNotas(nuevoHistorial, esNueva) {
    const { _id, _updated, ...datosSinMeta } = c
    const newDatos = {
      ...datosSinMeta,
      notas_china_historial: nuevoHistorial,
      nota_china_nueva: esNueva,
    }
    const { error } = await supabase
      .from("cotizaciones")
      .update({ datos: newDatos })
      .eq("id", c._id)
    if (error) throw error
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
      setErrorMsg("❌ Error al guardar. Verifica tu conexión e intenta de nuevo.\n" + (e?.message || ""))
    }
    setGuardando(false)
  }

  // Guardar edición
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
      setErrorMsg("❌ Error al guardar edición.")
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

          {/* Fila superior: badge estado + nro */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
            <span style={{
              background: bg, color: color,
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
            {isUrg && (
              <span style={{
                background:"#fdf6e3", color:"#b8922e",
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

          {/* Fecha llegada estimada */}
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

          {/* ── 留言 NOTAS PARA ZAGA ── */}
          <div style={{ borderTop:"1px solid #e2e8f0", paddingTop:16 }}>

            {/* Título sección */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <span style={{ fontSize:15 }}>📩</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#040c18", letterSpacing:0.3 }}>
                  留言给ZAGA / Notas para administración
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
                  const esEditando = editandoId === nota.id
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
                        /* Modo edición */
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
                        /* Modo vista */
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
                placeholder={"写下报价、问题或意见...\nEscriba su cotización, preguntas u observaciones..."}
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

        </div>
      )}
    </div>
  )
}

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
