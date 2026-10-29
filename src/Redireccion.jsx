// Aviso de cambio de dirección (29-oct-2026).
// Todo el trabajo de importaciones pasó a zagahub.cl: este panel ya no se usa
// para cotizar. El código antiguo (App.jsx y portales) queda en el repo por si
// hay que revisar algo; para volver atrás basta con restaurar main.jsx.
import { useEffect, useState } from "react"
import logo from "./logo-dark.png"

const DESTINO = "https://zagahub.cl/login"
const SEGUNDOS = 8

export default function Redireccion() {
  const [quedan, setQuedan] = useState(SEGUNDOS)

  useEffect(() => {
    if (quedan <= 0) { window.location.replace(DESTINO); return }
    const t = setTimeout(() => setQuedan(quedan - 1), 1000)
    return () => clearTimeout(t)
  }, [quedan])

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f5f4", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 460, width: "100%", background: "#fff", border: "1px solid #e7e5e4", borderRadius: 16, padding: "28px 24px", textAlign: "center" }}>
        <img src={logo} alt="ZAGA" style={{ height: 34, marginBottom: 18 }} onError={(e) => { e.currentTarget.style.display = "none" }} />
        <h1 style={{ fontSize: 20, margin: "0 0 6px", color: "#1c1917" }}>Este panel cambió de dirección</h1>
        <p style={{ fontSize: 17, margin: "0 0 16px", color: "#1c1917" }}>本系统已迁移到新地址</p>
        <p style={{ fontSize: 14, color: "#57534e", lineHeight: 1.5, margin: "0 0 4px" }}>
          Ahora todo se hace en <b>zagahub.cl</b>. Entra con tu correo; si no recuerdas la clave, pídela a ZAGA.
        </p>
        <p style={{ fontSize: 14, color: "#57534e", lineHeight: 1.5, margin: "0 0 20px" }}>
          现在请使用 <b>zagahub.cl</b>，用你的邮箱登录；忘记密码请联系ZAGA。
        </p>
        <a href={DESTINO} style={{ display: "block", background: "#f5c518", color: "#000", fontWeight: 700, fontSize: 15, padding: "12px 16px", borderRadius: 12, textDecoration: "none" }}>
          Ir a zagahub.cl · 前往 zagahub.cl
        </a>
        <p style={{ fontSize: 12, color: "#a8a29e", marginTop: 14 }}>
          Te llevamos solo en {quedan} s · {quedan} 秒后自动跳转
        </p>
      </div>
    </div>
  )
}
