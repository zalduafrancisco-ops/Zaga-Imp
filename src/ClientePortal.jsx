import { useState, useEffect } from 'react'

// ── Constantes compartidas ────────────────────────────────────────
const EST_LABEL = {
  solicitud:"📥 Solicitud recibida", enviado_china:"📨 Enviado a China",
  respuesta_china:"🇨🇳 Cotizando en China",
  enviada_cliente:"📋 Cotización lista", re_testeando:"🔄 En revisión",
  en_negociacion:"💬 En negociación", aceptada:"✅ Aceptada",
  pagada_china:"💳 Importando", en_camino:"🚢 En camino a Chile",
  en_bodega:"📦 Lista para retirar", completada:"🏁 Completada",
  rechazada_cliente:"❌ No procesada", no_procesada:"❌ No procesada",
  anulada:"🚫 Anulada",
}
const EST_COLOR = {
  solicitud:"#6a9fd4", enviado_china:"#2a8aaa",
  respuesta_china:"#b8922e", enviada_cliente:"#2d78c8",
  en_negociacion:"#c47830", re_testeando:"#6a9fd4",
  rechazada_cliente:"#c0392b", anulada:"#8b1a2e",
  aceptada:"#1aa358", no_procesada:"#c0392b",
  pagada_china:"#c47830", en_camino:"#a85590",
  en_bodega:"#3d7fc4", completada:"#0d9870",
}

const CHECKLIST_CLIENTE = [
  { key:"enviado_china",   label:"Solicitud enviada a proveedor",    icon:"📨" },
  { key:"respuesta_china", label:"Cotización de proveedor recibida", icon:"🇨🇳" },
  { key:"cot_enviada",     label:"Propuesta enviada a ti",           icon:"📋" },
  { key:"cliente_acepto",  label:"Propuesta aceptada",               icon:"✅" },
  { key:"pago1_cliente",   label:"1er pago recibido",                icon:"💳" },
  { key:"pago_china",      label:"Pago a proveedor realizado",       icon:"🏦" },
  { key:"en_produccion",   label:"En producción",                    icon:"🏭" },
  { key:"almacen_china",   label:"En almacén China",                 icon:"📦" },
  { key:"ctrl_calidad",    label:"Control de calidad OK",            icon:"🔍" },
  { key:"despachado",      label:"Despachado desde China",           icon:"🚀" },
  { key:"llego_chile",     label:"Llegó a Chile",                    icon:"🛬" },
  { key:"pago2_cliente",   label:"2do pago recibido",                icon:"💳" },
  { key:"retirado_bodega", label:"Importación completada",           icon:"🏁" },
]

const fmt = n => !n && n !== 0 ? "$0" : Number(n).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
const fmtN = n => Number(n).toLocaleString("es-CL", { maximumFractionDigits: 0 })

export default function ClientePortal({ supabase, perfil, onLogout }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    cargar()
    // Suscripción en tiempo real
    const canal = supabase
      .channel('cotizaciones_cliente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, () => cargar())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [])

  const cargar = async () => {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('datos')
      .order('created_at', { ascending: false })
    if (data && !error) {
      setCotizaciones(data.map(r => typeof r.datos === 'string' ? JSON.parse(r.datos) : r.datos))
    }
    setLoading(false)
  }

  // Solo importaciones activas (no rechazadas/anuladas)
  const activas = cotizaciones.filter(c => !['rechazada_cliente', 'anulada', 'no_procesada'].includes(c.estado))
  const completadas = cotizaciones.filter(c => c.estado === 'completada')
  const enProceso = cotizaciones.filter(c => !['completada', 'rechazada_cliente', 'anulada', 'no_procesada', 'solicitud'].includes(c.estado))

  const totalInvertido = activas.reduce((s, c) => {
    const cl = c.calc
    if (!cl) return s
    return s + (c.con_iva ? (cl.totClIva || cl.totCl || 0) : (cl.totCl || 0))
  }, 0)

  return (
    <div style={{ background: '#040c18', minHeight: '100vh', fontFamily: "'DM Sans','Segoe UI',sans-serif", color: '#dce8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#070e1b} ::-webkit-scrollbar-thumb{background:#1a2d45;border-radius:3px}
        .cot-card { background:#0a1525; border:1px solid #1a2d45; border-radius:16px; padding:0; overflow:hidden; transition:border .2s; }
        .cot-card:hover { border-color:#c9a05530; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(180deg,#0a1525 0%,#080f1c 100%)', borderBottom: '1px solid #1a2d45', padding: '0 24px', boxShadow: '0 2px 20px #000a' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#c9a055,#8a6a30)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 2px 12px #c9a05540' }}>🌏</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1.5, color: '#dce8f0', fontFamily: "'DM Serif Display',serif" }}>ZAGA Import</div>
              <div style={{ fontSize: 9, color: '#c9a05570', letterSpacing: 2, textTransform: 'uppercase' }}>Mis importaciones</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, color: '#4a5a6a' }}>
              <span style={{ color: '#c9a055', fontWeight: 600 }}>{perfil.nombre}</span>
            </div>
            <button onClick={onLogout} style={{ background: 'transparent', color: '#4a5a6a', border: '1px solid #1a2d45', borderRadius: 8, padding: '6px 14px', fontSize: 11, cursor: 'pointer' }}>
              Salir
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#4a5a6a' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div>Cargando tus importaciones...</div>
          </div>
        ) : cotizaciones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>📦</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#c9a055', marginBottom: 8 }}>¡Bienvenido {perfil.nombre}!</div>
            <div style={{ fontSize: 13, color: '#4a5a6a' }}>Tus importaciones aparecerán aquí una vez que estén registradas.</div>
          </div>
        ) : (
          <>
            {/* TÍTULO */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#dce8f0', fontFamily: "'DM Serif Display',serif" }}>
                Hola, {perfil.nombre} 👋
              </div>
              <div style={{ fontSize: 13, color: '#4a5a6a', marginTop: 4 }}>
                Aquí puedes ver el estado de todas tus importaciones con ZAGA
              </div>
            </div>

            {/* STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 32 }}>
              {[
                { label: 'Total importaciones', value: activas.length, icon: '📦', color: '#6a9fd4' },
                { label: 'En proceso', value: enProceso.length, icon: '🚢', color: '#c47830' },
                { label: 'Completadas', value: completadas.length, icon: '✅', color: '#0d9870' },
                { label: 'Total invertido', value: fmt(totalInvertido), icon: '💰', color: '#c9a055', big: true },
              ].map(s => (
                <div key={s.label} style={{ background: '#0a1525', border: `1px solid ${s.color}22`, borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: s.big ? 16 : 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#4a5a6a', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* LISTA DE IMPORTACIONES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cotizaciones.map(c => {
                const isOpen = openId === c.id
                const color = EST_COLOR[c.estado] || '#6a9fd4'
                const label = EST_LABEL[c.estado] || c.estado
                const cl = c.calc
                const conIva = !!c.con_iva
                const p1 = cl ? (conIva ? cl.p1ClIva : cl.p1Cl) || 0 : 0
                const p2 = cl ? (conIva ? cl.p2ClIva : cl.p2Cl) || 0 : 0
                const tot = cl ? (conIva ? cl.totClIva : cl.totCl) || 0 : 0
                const pagado1 = c.checklist?.pago1_cliente
                const pagado2 = c.checklist?.pago2_cliente

                // Progreso checklist
                const checkDef = CHECKLIST_CLIENTE
                const done = cl ? checkDef.filter(d => c.checklist?.[d.key]).length : 0
                const total = checkDef.length
                const pct = Math.round((done / total) * 100)

                return (
                  <div key={c.id} className="cot-card">
                    {/* HEADER CARD */}
                    <div
                      onClick={() => setOpenId(isOpen ? null : c.id)}
                      style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Número + estado */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#4a5a6a', fontWeight: 600 }}>{c.nro}</span>
                          <span style={{ background: color + '20', color, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', border: `1px solid ${color}40` }}>
                            {label}
                          </span>
                        </div>
                        {/* Producto */}
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#dce8f0', marginBottom: 4 }}>
                          {c.producto}
                        </div>
                        {/* Detalles */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#4a5a6a' }}>
                          {c.unidades && <span>📦 {fmtN(c.unidades)} unidades</span>}
                          {c.transporte && <span>{c.transporte === 'aereo' ? '✈️ Aéreo' : c.transporte === 'ambos' ? '🚢✈️ Marítimo + Aéreo' : '🚢 Marítimo'}</span>}
                          {c.fecha_solicitud && <span>📅 Solicitado: {new Date(c.fecha_solicitud + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                          {c.fecha_llegada_est && !['completada','en_bodega'].includes(c.estado) && (
                            <span style={{ color: '#c47830' }}>🗓 Llegada est: {new Date(c.fecha_llegada_est + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          )}
                        </div>
                      </div>

                      {/* Progreso + flecha */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: '#4a5a6a', marginBottom: 4 }}>{done}/{total} pasos</div>
                        <div style={{ width: 80, height: 6, background: '#0c1a2e', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: c.estado === 'completada' ? '#0d9870' : color, borderRadius: 3, transition: 'width .4s' }} />
                        </div>
                        <div style={{ fontSize: 18, color: '#2a3a4a', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>⌄</div>
                      </div>
                    </div>

                    {/* DETALLE EXPANDIDO */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #1a2d45', padding: '20px 22px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                          {/* PAGOS */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#c9a055', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>💳 Tus pagos</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {/* Pago 1 */}
                              <div style={{ background: pagado1 ? '#1aa35811' : '#0c1a2e', border: `1px solid ${pagado1 ? '#1aa35833' : '#1a2d45'}`, borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: 11, color: '#4a5a6a', marginBottom: 2 }}>1er pago ({c.pct_deposito || 30}%)</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: pagado1 ? '#1aa358' : '#dce8f0' }}>{fmt(p1)}</div>
                                  </div>
                                  <div style={{ fontSize: 20 }}>{pagado1 ? '✅' : '⏳'}</div>
                                </div>
                                {pagado1 && <div style={{ fontSize: 10, color: '#1aa358', marginTop: 4 }}>Recibido ✓</div>}
                              </div>
                              {/* Pago 2 */}
                              <div style={{ background: pagado2 ? '#1aa35811' : '#0c1a2e', border: `1px solid ${pagado2 ? '#1aa35833' : '#1a2d45'}`, borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: 11, color: '#4a5a6a', marginBottom: 2 }}>2do pago ({100 - (c.pct_deposito || 30)}%)</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: pagado2 ? '#1aa358' : '#dce8f0' }}>{fmt(p2)}</div>
                                  </div>
                                  <div style={{ fontSize: 20 }}>{pagado2 ? '✅' : '⏳'}</div>
                                </div>
                                {pagado2 && <div style={{ fontSize: 10, color: '#1aa358', marginTop: 4 }}>Recibido ✓</div>}
                              </div>
                              {/* Total */}
                              <div style={{ background: 'linear-gradient(135deg,#0c1520,#080e1a)', border: '1px solid #c9a05530', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: '#c9a055', fontWeight: 700 }}>Total importación</span>
                                <span style={{ fontSize: 17, fontWeight: 800, color: '#c9a055' }}>{fmt(tot)}</span>
                              </div>
                            </div>
                          </div>

                          {/* CHECKLIST */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6a9fd4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>📋 Seguimiento</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                              {CHECKLIST_CLIENTE.map((step, i) => {
                                const checked = c.checklist?.[step.key]
                                return (
                                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: checked ? '#1aa35810' : '#0c1a2e', border: `1px solid ${checked ? '#1aa35830' : '#0f1e30'}`, opacity: !checked && i > 0 && !c.checklist?.[CHECKLIST_CLIENTE[i-1]?.key] ? 0.4 : 1 }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 6, background: checked ? '#1aa358' : 'transparent', border: `2px solid ${checked ? '#1aa358' : '#2a3a4a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', flexShrink: 0, fontWeight: 800 }}>
                                      {checked ? '✓' : ''}
                                    </div>
                                    <span style={{ fontSize: 11, color: checked ? '#1aa358' : '#4a5a6a' }}>{step.icon} {step.label}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Variantes / notas si hay */}
                        {c.variantes && (
                          <div style={{ marginTop: 16, background: '#0c1a2e', borderRadius: 10, padding: '12px 14px', border: '1px solid #1a2d45' }}>
                            <div style={{ fontSize: 10, color: '#c9a055', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>🎨 Variantes / Especificaciones</div>
                            <div style={{ fontSize: 12, color: '#8a9aaa', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{c.variantes}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: '#1a2d45' }}>
          ZAGA Import · zagaimp.com · Todos los derechos reservados
        </div>
      </div>
    </div>
  )
}
