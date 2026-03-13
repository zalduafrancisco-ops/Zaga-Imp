import { useState } from 'react'
import LOGO_DARK from "./logo-dark.png"

export default function Login({ supabase }) {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

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
        .lb { width:100%; background:#0f172a; color:#ffffff; border:none; border-radius:10px; padding:14px; font-size:14px; font-weight:600; cursor:pointer; transition:background .2s; font-family:inherit; }
        .lb:hover:not(:disabled) { background:#1e293b; }
        .lb:disabled { opacity:.5; cursor:not-allowed; }
        .eye { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94a3b8; font-size:16px; padding:4px; line-height:1; }
        .eye:hover { color:#475569; }
      `}</style>

      <div style={{ width:'100%', maxWidth:420 }}>

        <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'40px 32px 28px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
          <img src={LOGO_DARK} alt="ZAGA" style={{ height:70, width:'auto', display:'block', margin:'0 auto 16px' }}/>
          <div style={{ fontSize:11, color:'#94a3b8', letterSpacing:3, textTransform:'uppercase' }}>Gestión de Importaciones</div>
        </div>

        <div style={{ background:'#fff', borderRadius:'0 0 20px 20px', padding:'28px 32px 36px', boxShadow:'0 8px 32px rgba(0,0,0,0.08)', border:'1px solid #e2e8f0', borderTop:'none' }}>
          <div style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Iniciar sesión</div>
          <div style={{ fontSize:13, color:'#94a3b8', marginBottom:28 }}>Ingresa con tu cuenta ZAGA</div>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:11, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>Email</label>
              <input className="li" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email"/>
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>Contraseña</label>
              <div style={{ position:'relative' }}>
                <input
                  className="li"
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={e=>setPass(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight:44 }}
                />
                <button type="button" className="eye" onClick={()=>setShowPass(v=>!v)} title={showPass?'Ocultar':'Mostrar'}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#dc2626' }}>
                ⚠ {error}
              </div>
            )}

            <button className="lb" type="submit" disabled={loading} style={{ marginTop:8 }}>
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'#cbd5e1' }}>
          zagaimp.com · Plataforma interna
        </div>
      </div>
    </div>
  )
}
