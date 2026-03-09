import { useState } from 'react'
import LOGO_DARK from "./logo-dark.png"

export default function Login({ supabase }) {
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !pass) { setError('Ingresa tu email y contraseña'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (err) { setError('Email o contraseña incorrectos'); setLoading(false) }
  }

  return (
    <div style={{ background:'#f1f5f9', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        .li { width:100%; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; color:#0f172a; padding:12px 16px; font-size:14px; outline:none; transition:border .2s; font-family:inherit; box-sizing:border-box; }
        .li:focus { border-color:#0f172a; box-shadow:0 0 0 3px rgba(15,23,42,0.08); }
        .li::placeholder { color:#cbd5e1; }
        .lb { width:100%; background:#0f172a; color:#ffffff; border:none; border-radius:10px; padding:14px; font-size:14px; font-weight:600; cursor:pointer; transition:background .2s; font-family:inherit; letter-spacing:.3px; }
        .lb:hover:not(:disabled) { background:#1e293b; }
        .lb:disabled { opacity:.5; cursor:not-allowed; }
      `}</style>

      <div style={{ width:'100%', maxWidth:400 }}>

        {/* Logo limpio sin fondo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <img src={LOGO_DARK} alt="ZAGA" style={{ height:52, width:'auto', marginBottom:14 }}/>
          <div style={{ fontSize:11, color:'#94a3b8', letterSpacing:3, textTransform:'uppercase' }}>Gestión de Importaciones</div>
        </div>

        {/* Card */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:20, padding:'36px 32px', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Iniciar sesión</div>
          <div style={{ fontSize:13, color:'#94a3b8', marginBottom:28 }}>Ingresa con tu cuenta ZAGA</div>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:11, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>Email</label>
              <input className="li" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email"/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>Contraseña</label>
              <input className="li" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password"/>
            </div>
            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#dc2626' }}>⚠ {error}</div>
            )}
            <button className="lb" type="submit" disabled={loading} style={{ marginTop:8 }}>
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:'#cbd5e1' }}>
          zagaimp.com · Plataforma interna
        </div>
      </div>
    </div>
  )
}
