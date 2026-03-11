import React, { useState, useEffect, useCallback, useRef } from "react";
import LOGO_WHITE from "./logo-white.png";
import LOGO_DARK  from "./logo-dark.png";

const PCT_COM_CLIENTE = 0.065;
// Los clientes se obtienen dinámicamente desde las cotizaciones guardadas (clientesUnicos)
const CHECKLIST_CLIENTE = [
  { key:"enviado_china",     label:"Enviado a China",                group:"cotizacion" },
  { key:"respuesta_china",   label:"Respuesta de China recibida",    group:"cotizacion" },
  { key:"pago1_cliente",     label:"1er pago recibido del cliente",  group:"pagos" },
  { key:"factura1",          label:"Factura 1er pago emitida",       group:"pagos" },
  { key:"pago_china",        label:"Pago a China realizado",         group:"china" },
  { key:"en_produccion",    label:"En proceso de producción",       group:"china" },
  { key:"almacen_china",    label:"Ingreso en almacén de China",    group:"china" },
  { key:"ctrl_calidad",     label:"Control de calidad en China OK", group:"china" },
  { key:"llego_chile",       label:"Llegó a Chile",                  group:"logistica" },
  { key:"pago2_cliente",     label:"2do pago recibido del cliente",  group:"pagos" },
  { key:"factura2",          label:"Factura 2do pago emitida",       group:"pagos" },
  { key:"retirado_bodega",   label:"Retirado a mi bodega — Completada", group:"logistica" },
];

const CHECKLIST_PROPIA = [
  { key:"enviado_china",     label:"Enviado a China",                group:"cotizacion" },
  { key:"respuesta_china",   label:"Respuesta de China recibida",    group:"cotizacion" },
  { key:"pago_china",        label:"Pago a China realizado",         group:"china" },
  { key:"en_produccion",    label:"En proceso de producción",       group:"china" },
  { key:"almacen_china",    label:"Ingreso en almacén de China",    group:"china" },
  { key:"ctrl_calidad",     label:"Control de calidad en China OK", group:"china" },
  { key:"llego_chile",       label:"Llegó a Chile",                  group:"logistica" },
  { key:"retirado_bodega",   label:"Retirado a mi bodega",           group:"logistica" },
  { key:"en_venta",          label:"Producto en venta / publicado",  group:"venta" },
  { key:"vendido_50",        label:"50% vendido",                    group:"venta" },
  { key:"vendido_100",       label:"100% vendido",                   group:"venta" },
];

const CANALES = [
  { key:"directo",    label:"Venta directa",  icon:"🤝" },
  { key:"marketplace",label:"Marketplace",    icon:"🛒" },
  { key:"dropi",      label:"Dropi",          icon:"📦" },
];

const EST_LABEL = {
  solicitud:"📥 Solicitud recibida", enviado_china:"📨 Enviado a China",
  respuesta_china:"🇨🇳 Respuesta de China recibida",
  enviada_cliente:"Enviada al cliente", re_testeando:"🔄 Re-testeando",
  en_negociacion:"En negociación", aceptada:"Aceptada",
  pagada_china:"Pagada / Importando", en_camino:"En camino",
  en_bodega:"Disponible para retirar", completada:"Completada",
  rechazada_cliente:"❌ Rechazada", no_procesada:"No procesada",
  anulada:"🚫 Anulada",
};
const EST_COLOR = {
  solicitud:"#6a9fd4", enviado_china:"#2a8aaa",
  respuesta_china:"#b8922e",
  enviada_cliente:"#2d78c8", en_negociacion:"#c47830",
  re_testeando:"#6a9fd4", rechazada_cliente:"#c0392b", anulada:"#8b1a2e",
  aceptada:"#1aa358", no_procesada:"#c0392b",
  pagada_china:"#c47830", en_camino:"#a85590", en_bodega:"#3d7fc4", completada:"#0d9870",
};
const PROCESADAS = ["aceptada","pagada_china","en_camino","en_bodega","completada"];

const makeDefaultForm = (usuario) => ({
  tipo:"cliente",
  gestor: usuario?.nombre?.toLowerCase()==="luisa" ? "luisa" : "francisco",
  cliente:"", categoria_cliente:"nuevo", transporte:"maritimo", producto:"", link_alibaba:"",
  fecha_solicitud: new Date().toISOString().split("T")[0],
  unidades:"", precio_china:"", comision_real:"",
  pct_deposito:30, margen_und:"", pct_servicio:4, pct_com_prestamo:6.5, precio_venta_cliente:"",
  fulfillment_und:1000, pct_devolucion:20,
  cda:0, cda_cl:0, cda_descripcion:"", con_iva:false, notas:"", requiere_factura:false,
  nro_factura_cliente:"", link_factura_cliente:"",
  variantes:"", // colores, tallas, cantidades por variante
  fecha_llegada_real:"", sku_china:"",
  fulfillment_cliente:true, sku_bodega:"", fulfillment_producto_creado:false,
  fulfillment_costo_real:"", fulfillment_notas:"",
  dim_largo:"", dim_ancho:"", dim_alto:"", dim_m3:"", dim_und_caja:"", dim_tipo:"caja",
  negociacion_rondas:[], // [{fecha, nota, unidades_prop, precio_prop, estado:"pendiente"|"aplicada"|"rechazada"}]
  // propia
  precio_venta_und:"", pct_margen_objetivo:"",
  canales:[], pct_comision_marketplace:0,
});

// ── Calculations ─────────────────────────────────────────────────
function calcCliente(d) {
  const u=Number(d.unidades)||0, pCh=Number(d.precio_china)||0, comR=Number(d.comision_real)||0;
  const pDep=(Number(d.pct_deposito)||30)/100, mar=Number(d.margen_und)||0;
  const pServ=(Number(d.pct_servicio)||4)/100, fUnd=Number(d.fulfillment_und)||1000;
  const pDev=(Number(d.pct_devolucion)||20)/100, cda=Number(d.cda)||0, cdaCl=Number(d.cda_cl)||cda;
  const conFact=!!d.requiere_factura, conIva=!!d.con_iva;

  // ── Lado China ──
  const tChNeto=pCh*u;                          // costo producto sin IVA
  const ivaChina=conFact?tChNeto*0.19:0;        // IVA que pago al final (2do pago)
  const tCh=tChNeto+ivaChina;                   // total real pagado a China
  const dCh=tChNeto*pDep, prCh=tChNeto*(1-pDep); // depósito y saldo sobre monto NETO
  const p1Ch=dCh+comR+cda, p2Ch=prCh+ivaChina;     // IVA va solo al 2do pago; CDA va al 1er pago
  const totCh=tChNeto+comR+ivaChina+cda, cRUnd=u>0?totCh/u:0;

  // ── Lado Cliente ──
  const pCUnd=pCh+mar, tCl=pCUnd*u, dCl=tCl*pDep, prCl=tCl*(1-pDep);
  const comCl=prCl*((Number(d.pct_com_prestamo)||6.5)/100), serv=tCl*pServ;
  const ivaCliente=conIva?(tCl+comCl+serv+cdaCl)*0.19:0; // IVA que cobro al cliente
  const p1Cl=dCl+comCl+cdaCl, p2Cl=prCl+serv, totCl=tCl+comCl+serv+cdaCl;
  const p1ClIva=conIva?p1Cl*1.19:p1Cl, p2ClIva=conIva?p2Cl*1.19:p2Cl;
  const totClIva=conIva?totCl*1.19:totCl;
  const pfUnd=u>0?totCl/u:0;

  // ── Ganancia ──
  // Ganancia base (sin considerar IVA — margen operacional)
  const ganMar=tCl-tChNeto, difCom=comCl-comR, ganServ=serv, ganCda=cdaCl-cda;
  const ganImp=ganMar+difCom+ganServ+ganCda;
  // Impacto neto IVA: recupero IVA china (crédito fiscal) contra IVA cliente (débito)
  const ivaRecuperado=ivaChina;            // crédito fiscal por compra con factura
  const ivaDebitoCliente=ivaCliente;       // débito fiscal al cobrar con factura
  const ivaNetoFavor=ivaDebitoCliente-ivaRecuperado; // >0 = pago más de lo que recupero
  // Ganancia real después de IVA
  const ganImpConIva=ganImp+(conIva?ivaNetoFavor:0)-(conFact&&!conIva?ivaChina:0);

  const gan1=(dCl-tCh*pDep)+difCom, gan2=(prCl-tCh*(1-pDep))+serv;
  const uDev=Math.round(u*pDev), uFull=u+uDev, ganFull=uFull*fUnd, ganTot=ganImp+ganFull;
  const markup=pCh>0?((pCUnd-pCh)/pCh)*100:0;
  const mgBrut=totCl>0?(ganImp/totCl)*100:0;
  const roi=totCh>0?(ganImp/totCh)*100:0;
  const mult=cRUnd>0?pfUnd/cRUnd:0;
  return { tChNeto,ivaChina,tCh,dCh,prCh,comR,p1Ch,p2Ch,totCh,cRUnd,pCUnd,tCl,dCl,prCl,comCl,serv,cda,cdaCl,ganCda,p1Cl,p2Cl,totCl,p1ClIva,p2ClIva,totClIva,ivaCliente,ivaRecuperado,ivaNetoFavor,ganImpConIva,pfUnd,ganMar,difCom,ganServ,ganImp,gan1,gan2,uDev,uFull,ganFull,ganTot,markup,mgBrut,roi,mult };
}

function calcPropia(d) {
  const u=Number(d.unidades)||0, pCh=Number(d.precio_china)||0, comR=Number(d.comision_real)||0;
  const pDep=(Number(d.pct_deposito)||30)/100;
  const tCh=pCh*u, dCh=tCh*pDep, prCh=tCh*(1-pDep);
  const p1Ch=dCh+comR, p2Ch=prCh, totCh=tCh+comR, cRUnd=u>0?totCh/u:0;
  const pvUnd=Number(d.precio_venta_und)||0;
  const pctMarObj=(Number(d.pct_margen_objetivo)||0)/100;
  const pvDesdeMargen=cRUnd*(1+pctMarObj);
  const pctMktplace=(Number(d.pct_comision_marketplace)||0)/100;
  // Revenue scenarios per channel
  const ingresoDirecto=pvUnd*u;
  const ingresoDespuesComision=pvUnd*(1-pctMktplace)*u;
  const ganDirecto=pvUnd>0?(pvUnd-cRUnd)*u:0;
  const ganMarketplace=pvUnd>0?(pvUnd*(1-pctMktplace)-cRUnd)*u:0;
  const mgBruto=pvUnd>0&&cRUnd>0?((pvUnd-cRUnd)/pvUnd)*100:0;
  const roi=totCh>0?((pvUnd*u-totCh)/totCh)*100:0;
  const markup=cRUnd>0&&pvUnd>0?((pvUnd-cRUnd)/cRUnd)*100:0;
  const ganMargen=pctMarObj>0?(pvDesdeMargen-cRUnd)*u:0;
  return { tCh,dCh,prCh,comR,p1Ch,p2Ch,totCh,cRUnd,pvUnd,pvDesdeMargen,ingresoDirecto,ingresoDespuesComision,ganDirecto,ganMarketplace,ganMargen,mgBruto,roi,markup,pctMktplace };
}

// ── Format ────────────────────────────────────────────────────────
const fmt  = n=>!n&&n!==0?"$0":Number(n).toLocaleString("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0});
const fmtN = n=>Number(n).toLocaleString("es-CL",{maximumFractionDigits:0});
const fmtP = n=>isNaN(n)||n===null?"-":`${Number(n).toFixed(1)}%`;
const todayStr=()=>new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"});
const monthKey=d=>{ try{ const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; }catch{ return ""; }};
const monthLabel=k=>{ try{ const [y,m]=k.split("-"); return new Date(y,Number(m)-1).toLocaleDateString("es-CL",{month:"long",year:"numeric"}); }catch{ return k; }};

// ── UI helpers ────────────────────────────────────────────────────
const ROW=({label,value,accent,big,sub,topLine})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:topLine?"10px 0 7px":"7px 0",borderBottom:"1px solid #f1f5f9",borderTop:topLine?"1px solid #e2e8f0":"none",marginTop:topLine?6:0}}>
    <span style={{color:sub?"#94a3b8":"#64748b",fontSize:sub?12:13}}>{label}</span>
    <span style={{color:accent||(big?"#c9a055":"#0f172a"),fontWeight:big?700:500,fontSize:big?15:13}}>{value}</span>
  </div>
);
const BLOCK=({title,accent,children,bg})=>(
  <div style={{background:bg||"#ffffff",borderRadius:12,padding:20,marginBottom:16,border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
    <div style={{fontSize:11,color:accent||"#040c18",letterSpacing:1.5,fontWeight:700,marginBottom:14,textTransform:"uppercase",borderBottom:"1px solid #f1f5f9",paddingBottom:10}}>{title}</div>
    {children}
  </div>
);
const PAYBOX=({label,amount,detail,color})=>(
  <div style={{background:color+"11",border:`1px solid ${color}33`,borderRadius:9,padding:"12px 14px",marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:detail?4:0}}>
      <span style={{fontSize:13,color,fontWeight:700}}>{label}</span>
      <span style={{fontSize:17,fontWeight:800,color}}>{amount}</span>
    </div>
    {detail&&<div style={{fontSize:11,color:"#666"}}>{detail}</div>}
  </div>
);
const METRIC=({label,value,sub,color})=>(
  <div style={{background:"#f8fafc",borderRadius:9,padding:"10px 12px"}}>
    <div style={{fontSize:10,color:"#64748b",marginBottom:3}}>{label}</div>
    <div style={{fontSize:16,fontWeight:800,color:color||"#c9a055"}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:"#444",marginTop:2}}>{sub}</div>}
  </div>
);
function NInput({label,field,form,setForm,color,placeholder,note}){
  return(
    <div>
      <label style={{display:"block",fontSize:10,color:color||"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>{label}</label>
      <input type="number" value={form[field]??""} placeholder={placeholder||""} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
        style={{width:"100%",background:"#f8fafc",border:`1px solid ${color?color+"55":"#e2e8f0"}`,borderRadius:8,color:color||"#0f172a",padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
      {note&&<div style={{fontSize:10,color:"#64748b",marginTop:3}}>{note}</div>}
    </div>
  );
}
// Error boundary para el tracker expandido
class CardErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={error:false}; }
  static getDerivedStateFromError(){ return {error:true}; }
  render(){
    if(this.state.error) return (
      <div style={{padding:16,background:"#fff1f2",border:"1px solid #fecdd3",borderRadius:10,color:"#c0392b",fontSize:13}}>
        ⚠️ Error al cargar esta sección. <button onClick={()=>this.setState({error:false})} style={{marginLeft:8,background:"none",border:"1px solid #c0392b",borderRadius:6,color:"#c0392b",cursor:"pointer",padding:"2px 10px",fontSize:12}}>Reintentar</button>
      </div>
    );
    return this.props.children;
  }
}

function CheckItem({label,checked,onChange,disabled}){
  return(
    <div onClick={()=>!disabled&&onChange(!checked)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,cursor:disabled?"default":"pointer",background:checked?"#f0fdf4":"#f8fafc",border:`1px solid ${checked?"#1aa35855":"#e2e8f0"}`,opacity:disabled?.4:1,transition:"all .15s"}}>
      <div style={{width:18,height:18,borderRadius:5,flexShrink:0,background:checked?"#1aa358":"transparent",border:`2px solid ${checked?"#1aa358":"#444"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#05100e",fontWeight:800}}>{checked?"✓":""}</div>
      <span style={{fontSize:13,color:checked?"#1aa358":"#475569"}}>{label}</span>
    </div>
  );
}

export default function App({ supabase, usuario, onLogout }){
  const defaultForm = makeDefaultForm(usuario);
  const [tab2,setTab]=useState("calc");
  const [form,setForm]                   = useState(defaultForm);
  const [cotizaciones,setCotizaciones]   = useState([]);
  const cotizacionesRef = useRef([]);
  const [editId,setEditId]               = useState(null);
  const [openId,setOpenId]               = useState(null);
  const [filterEstado,setFilterEstado]   = useState("todos");
  const [filterCliente,setFilterCliente] = useState("todos");
  const [filterGestor,setFilterGestor]   = useState("todos");
  const [searchQuery,setSearchQuery]     = useState("");
  const [toast,setToast]                 = useState(null);
  const [vistaId,setVistaId]             = useState(null);
  const [previewId,setPreviewId]         = useState(null);
  const [printModal,setPrintModal]       = useState(null); // "tracker" | "cliente"
  const [dashFilter,setDashFilter]       = useState("todas");
  const [dashTipo,setDashTipo]           = useState("clientes");
  const [dashClienteFiltro,setDashClienteFiltro] = useState("todos");
  const [clienteSeleccionado,setClienteSeleccionado] = useState(null);
  const [renombrando,setRenombrando]             = useState(false);
  const [nuevoNombreCliente,setNuevoNombreCliente] = useState("");
  const [filtroCliente,setFiltroCliente] = useState("todas");
  const [vistaClienteId,setVistaClienteId] = useState(null);
  const [negForm,setNegForm] = useState({});
  const [notaInput,setNotaInput] = useState({});
  const [notaOculta,setNotaOculta] = useState({});
  const [notaEditando,setNotaEditando] = useState({}); // key: "cotId_i" → {texto, oculta}
  const [resumenChina,setResumenChina] = useState(null);
  const [backupModal,setBackupModal] = useState(null); // null | "export" | "import"
  const [simModal,setSimModal]       = useState(false);
  const [backupText,setBackupText] = useState(""); // {[cotId]: {nota, unidades_prop, precio_prop}}
  const vistaRef                         = useRef(null);
  const vistaClienteRef                  = useRef(null);

  const [cargando,setCargando]=useState(true);

  // ── CARGA INICIAL DESDE SUPABASE ──────────────────────────────
  useEffect(()=>{
    const cargar=async()=>{
      setCargando(true);
      try{
        const {data,error}=await supabase
          .from("cotizaciones")
          .select("id,datos")
          .order("created_at",{ascending:false});
        if(error) throw error;
        if(data&&data.length>0){
          // Datos en Supabase — cargar desde ahí
          const lista=data.map(r=>r.datos);
          cotizacionesRef.current=lista;
          setCotizaciones(lista);
        } else {
          // Supabase vacío — intentar migrar desde localStorage
          const local=localStorage.getItem("zaga_v6");
          if(local){
            const lista=JSON.parse(local);
            if(Array.isArray(lista)&&lista.length>0){
              // Migrar automáticamente a Supabase
              const rows=lista.map(c=>({id:c.id,nro:c.nro||"",cliente:c.cliente||"",gestor:c.gestor||"francisco",estado:c.estado||"solicitud",tipo:c.tipo||"cliente",datos:c}));
              await supabase.from("cotizaciones").upsert(rows,{onConflict:"id"});
              cotizacionesRef.current=lista;
              setCotizaciones(lista);
              showToast(`✓ ${lista.length} cotizaciones migradas a la nube`);
            }
          }
        }
      }catch(e){
        // Fallback a localStorage si falla Supabase
        try{ const r=localStorage.getItem("zaga_v6"); if(r){ const d=JSON.parse(r); cotizacionesRef.current=d; setCotizaciones(d); } }catch(_){}
        showToast("Error de conexión — usando datos locales","err");
      }
      setCargando(false);
    };
    cargar();
  },[]);

  const exportarDatos=()=>{
    try{
      const data=JSON.stringify({version:"zaga_v6",fecha:new Date().toISOString(),cotizaciones},null,2);
      setBackupText(data);
      setBackupModal("export");
    }catch(e){ showToast("Error al exportar","err"); }
  };
  const importarDatos=()=>{
    setBackupText("");
    setBackupModal("import");
  };
  const confirmarImport=async()=>{
    try{
      const parsed=JSON.parse(backupText);
      const lista=parsed.cotizaciones||parsed;
      if(!Array.isArray(lista)) throw new Error();
      await persist(lista);
      showToast(`✓ ${lista.length} cotizaciones importadas`);
      setBackupModal(null); setBackupText("");
    }catch(e){ showToast("JSON inválido — revisa el texto pegado","err"); }
  };

  // ── PERSIST: guarda en Supabase + localStorage como backup ────
  const persist=useCallback(async list=>{
    cotizacionesRef.current=list;
    setCotizaciones(list);
    // Guardar en localStorage como respaldo offline
    try{ localStorage.setItem("zaga_v6",JSON.stringify(list)); }catch(_){}
    // Guardar en Supabase
    try{
      // IDs actuales en memoria
      const idsNuevos=new Set(list.map(c=>c.id));
      // IDs que estaban antes (para detectar eliminaciones)
      const {data:existentes}=await supabase.from("cotizaciones").select("id");
      const idsExistentes=(existentes||[]).map(r=>r.id);
      const idsEliminar=idsExistentes.filter(id=>!idsNuevos.has(id));
      // Upsert toda la lista
      if(list.length>0){
        const rows=list.map(c=>({
          id:c.id,
          nro:c.nro||"",
          cliente:c.cliente||"",
          gestor:c.gestor||"francisco",
          estado:c.estado||"solicitud",
          tipo:c.tipo||"cliente",
          datos:c
        }));
        await supabase.from("cotizaciones").upsert(rows,{onConflict:"id"});
      }
      // Eliminar las que ya no existen
      if(idsEliminar.length>0){
        await supabase.from("cotizaciones").delete().in("id",idsEliminar);
      }
    }catch(e){ console.warn("Supabase sync error:",e); }
  },[supabase]);
  const showToast=(msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  const calcActual = form.tipo==="propia" ? calcPropia(form) : calcCliente(form);
  // Paso 1 = nueva solicitud sin precio China aún → ocultar bloques financieros
  const esPaso1 = !editId && !Number(form.precio_china);

  const handleSave=async()=>{
    if(!form.producto){ showToast("Ingresa el producto","err"); return; }
    if(form.tipo==="cliente"&&!form.cliente){ showToast("Ingresa el nombre del cliente","err"); return; }
    const id=editId||Date.now().toString();
    const prev=editId?cotizaciones.find(c=>c.id===editId):null;
    const nro=prev?.nro||`COT-${String(cotizaciones.length+1).padStart(3,"0")}`;
    const checklDef=form.tipo==="propia"?CHECKLIST_PROPIA:CHECKLIST_CLIENTE;
    const entry={...form,id,nro,calc:calcActual,
      estado:prev?.estado||"solicitud",
      fecha_llegada_est:prev?.fecha_llegada_est||"",
      motivo_no_procesada:prev?.motivo_no_procesada||"",
      checklist:prev?.checklist||Object.fromEntries(checklDef.map(c=>[c.key,false])),
    };
    if(editId) await persist(cotizaciones.map(c=>c.id===editId?{...entry,historial:c.historial}:c));
    else await persist([entry,...cotizaciones]);
    showToast(editId?"Actualizada ✓":"Guardada ✓");
    setEditId(null); setForm(defaultForm); setTab("tracker");
  };

  const handleEstado=async(id,estado)=>{
    await persist(cotizaciones.map(c=>{
      if(c.id!==id) return c;
      let fll=c.fecha_llegada_est;
      if(estado==="pagada_china"&&!fll){ const d=new Date(); d.setDate(d.getDate()+90); fll=d.toISOString().split("T")[0]; }
      return {...c,estado,fecha_llegada_est:fll};
    }));
  };

  const handleCheck=async(id,key,val)=>{
    await persist(cotizaciones.map(c=>{
      if(c.id!==id) return c;
      const chk={...c.checklist,[key]:val};
      let estado=c.estado;
      if(key==="enviado_china"&&val) estado="enviado_china";
      if(key==="respuesta_china"&&val) estado="respuesta_china";
      if(key==="cliente_acepto"&&val) estado="aceptada";
      if(key==="retirado_bodega"&&val) estado="completada";
      if(key==="pago2_cliente"&&val) estado="en_bodega";
      if(key==="vendido_100"&&val) estado="completada";
      const upd2={};
      if(key==="pago1_cliente"&&val&&!c.fecha_pago1_cliente) upd2.fecha_pago1_cliente=new Date().toISOString().split("T")[0];
      let fll=c.fecha_llegada_est;
      if(key==="pago_china"&&val&&!fll){ const d=new Date(); d.setDate(d.getDate()+90); fll=d.toISOString().split("T")[0]; }
      if(key==="pago_china"&&val){ upd2.fecha_pago_china=new Date().toISOString().split("T")[0]; }
      // Auto-registrar fecha real de llegada a bodega
      let fReal=c.fecha_llegada_real||"";
      if(key==="retirado_bodega"&&val&&!fReal) fReal=new Date().toISOString().split("T")[0];
      if(key==="llego_chile"&&val&&!fReal) fReal=new Date().toISOString().split("T")[0];
      return {...c,...upd2,checklist:chk,estado,fecha_llegada_est:fll,fecha_llegada_real:fReal};
    }));
  };

  const handleMotivo=async(id,motivo)=>{ await persist(cotizaciones.map(c=>c.id===id?{...c,motivo_no_procesada:motivo,estado:"no_procesada"}:c)); };
  const handleEdit=(c)=>{ setForm({...defaultForm,...c}); setEditId(c.id); setTab("calc"); };
  const handleDelete=async id=>{ await persist(cotizaciones.filter(c=>c.id!==id)); showToast("Eliminada"); };


  const handleRenameCliente=async(nombreViejo,nombreNuevo)=>{
    if(!nombreNuevo.trim()||nombreNuevo.trim()===nombreViejo) return;
    const nuevo=nombreNuevo.trim();
    await persist(cotizaciones.map(c=>c.cliente===nombreViejo?{...c,cliente:nuevo}:c));
    setClienteSeleccionado(nuevo);
    setRenombrando(false);
    setNuevoNombreCliente("");
    showToast(`Cliente renombrado a "${nuevo}" ✓`);
  };

  const handleSaveSolicitud=async()=>{
    if(!form.producto){ showToast("Ingresa el nombre del producto","err"); return; }
    if(form.tipo==="cliente"&&!form.cliente){ showToast("Ingresa el nombre del cliente","err"); return; }
    const id=editId||Date.now().toString();
    const prev=editId?cotizaciones.find(c=>c.id===editId):null;
    const nro=prev?.nro||`COT-${String(cotizaciones.length+1).padStart(3,"0")}`;
    const checklDef=form.tipo==="propia"?CHECKLIST_PROPIA:CHECKLIST_CLIENTE;
    const entry={...form,id,nro,calc:null,
      estado:prev?.estado||"solicitud",
      fecha_llegada_est:prev?.fecha_llegada_est||"",
      motivo_no_procesada:prev?.motivo_no_procesada||"",
      checklist:prev?.checklist||Object.fromEntries(checklDef.map(c=>[c.key,false])),
    };
    if(editId) await persist(cotizaciones.map(c=>c.id===editId?{...entry}:c));
    else await persist([entry,...cotizaciones]);
    showToast(`Solicitud ${nro} registrada ✓`);
    // Mostrar resumen para China
    setResumenChina(entry);
    setEditId(null); setForm(defaultForm); setTab("tracker");
  };

  // ── Negociación ───────────────────────────────────────────────
  const handleNegAgregar=async(id)=>{
    const f=negForm[id]||{};
    if(!f.nota&&!f.unidades_prop&&!f.precio_prop){ showToast("Agrega al menos una nota o propuesta","err"); return; }
    const ronda={ fecha:new Date().toISOString().split("T")[0], nota:f.nota||"", unidades_prop:f.unidades_prop||"", precio_prop:f.precio_prop||"", estado:"pendiente" };
    await persist(cotizaciones.map(c=>c.id===id?{...c,negociacion_rondas:[...(c.negociacion_rondas||[]),ronda]}:c));
    setNegForm(prev=>({...prev,[id]:{nota:"",unidades_prop:"",precio_prop:""}}));
    showToast("Ronda de negociación registrada ✓");
  };
  const handleNegAplicar=async(id,idx)=>{
    const c=cotizaciones.find(x=>x.id===id); if(!c) return;
    const ronda=c.negociacion_rondas[idx];
    const nuevasRondas=c.negociacion_rondas.map((r,i)=>i===idx?{...r,estado:"aplicada"}:r);
    const updates={negociacion_rondas:nuevasRondas};
    if(ronda.precio_prop) updates.precio_china=ronda.precio_prop;
    if(ronda.unidades_prop) updates.unidades=ronda.unidades_prop;
    // Recalcular con nuevos valores
    const updated={...c,...updates};
    updates.calc=updated.tipo==="propia"?calcPropia(updated):calcCliente(updated);
    await persist(cotizaciones.map(x=>x.id===id?{...x,...updates}:x));
    showToast("Cotización actualizada con nueva propuesta ✓");
  };
  const handleNegRechazar=async(id,idx)=>{
    await persist(cotizaciones.map(c=>c.id===id?{...c,negociacion_rondas:c.negociacion_rondas.map((r,i)=>i===idx?{...r,estado:"rechazada"}:r)}:c));
    showToast("Propuesta marcada como rechazada");
  };

  const getChecklist=c=>c.tipo==="propia"?CHECKLIST_PROPIA:CHECKLIST_CLIENTE;
  const checkProg=c=>{ const def=getChecklist(c); if(!c.checklist) return{done:0,total:def.length}; return{done:def.filter(d=>c.checklist[d.key]).length,total:def.length}; };
  const clientesUnicos=[...new Set(cotizaciones.filter(c=>c.tipo!=="propia"&&c.cliente).map(c=>c.cliente))].sort();
  const filtradas=cotizaciones.filter(c=>{
    if(c.id===openId) return true; // siempre mostrar la cotización con el panel abierto
    const passEstado=filterEstado==="todos"||c.estado===filterEstado;
    const passCliente=filterCliente==="todos"||(filterCliente==="__propias__"?c.tipo==="propia":c.cliente===filterCliente);
    const passGestor=filterGestor==="todos"||c.gestor===filterGestor||(filterGestor==="francisco"&&!c.gestor);
    const q=searchQuery.trim().toLowerCase();
    const passSearch=!q||(c.nro&&c.nro.toString().toLowerCase().includes(q))||(c.cliente&&c.cliente.toLowerCase().includes(q))||(c.producto&&c.producto.toLowerCase().includes(q))||(c.sku_china&&c.sku_china.toLowerCase().includes(q))||(c.sku_bodega&&c.sku_bodega.toLowerCase().includes(q));
    return passEstado&&passCliente&&passGestor&&passSearch;
  });

  // Export via print dialog (no CDN needed)
  const abrirPrint=(tipo)=>{ setPrintModal(tipo); };
  const cerrarPrint=()=>{ setPrintModal(null); };

  const vistaData=vistaId?cotizaciones.find(c=>c.id===vistaId):null;

  // ── Dashboard data ────────────────────────────────────────────
  const dashBase=cotizaciones.filter(c=>dashTipo==="clientes"?c.tipo!=="propia":c.tipo==="propia");
  const dashData=dashBase.filter(c=>{
    const passEstado=dashFilter==="todas"?true:dashFilter==="procesadas"?PROCESADAS.includes(c.estado):!PROCESADAS.includes(c.estado)&&c.estado!=="solicitud";
    const passCliente=dashClienteFiltro==="todos"||c.cliente===dashClienteFiltro;
    return passEstado&&passCliente;
  });

  // Clientes únicos para filtro en dashboard
  const clientesParaDash=[...new Set(cotizaciones.filter(c=>c.tipo!=="propia"&&c.cliente).map(c=>c.cliente))].sort();

  // Cálculo real de pagos a China: solo p1Ch si pago_china está marcado, p2Ch si retirado_bodega
  const calcPagadoChina=c=>{
    if(!c.calc) return 0;
    const p1=c.checklist?.pago_china?(c.calc.p1Ch||0):0;
    const p2=c.checklist?.retirado_bodega?(c.calc.p2Ch||0):0;
    return p1+p2;
  };
  const calcPendienteChina=c=>{
    if(!c.calc) return 0;
    const p1=c.checklist?.pago_china?0:(c.calc.p1Ch||0);
    const p2=c.checklist?.retirado_bodega?0:(c.calc.p2Ch||0);
    return p1+p2;
  };

  // Ganancia real = solo 2do pago cobrado (mercadería en bodega + pago2 recibido)
  // Ganancia estimada = 2do pago pendiente de cobrar
  const calcGananciaReal=c=>{
    if(!c.calc||c.tipo==="propia") return 0;
    return c.checklist?.pago2_cliente?(c.calc.gan2||0):0;
  };
  const calcGananciaEst=c=>{
    if(!c.calc||c.tipo==="propia") return 0;
    return !c.checklist?.pago2_cliente?(c.calc.gan2||0):0;
  };
  const calcGan1Real=c=>{
    if(!c.calc||c.tipo==="propia") return 0;
    return c.checklist?.pago1_cliente?(c.calc.gan1||0):0;
  };

  const totalPagadoChina=dashData.reduce((s,c)=>s+calcPagadoChina(c),0);
  const totalPendienteChina=dashData.reduce((s,c)=>s+calcPendienteChina(c),0);
  const totalGananciaReal=dashData.reduce((s,c)=>s+calcGan1Real(c)+calcGananciaReal(c),0);
  const totalGananciaEst=dashData.reduce((s,c)=>s+calcGananciaEst(c),0);
  const totalGanancia=totalGananciaReal+totalGananciaEst;

  // Total cobrado/pendiente al cliente (solo tipo cliente)
  const calcCobradoCliente=c=>{
    if(!c.calc||c.tipo==="propia") return 0;
    const p1=c.checklist?.pago1_cliente?(c.calc.p1Cl||0):0;
    const p2=c.checklist?.pago2_cliente?(c.calc.p2Cl||0):0;
    return p1+p2;
  };
  const calcPendienteCliente=c=>{
    if(!c.calc||c.tipo==="propia") return 0;
    const p1=c.checklist?.pago1_cliente?0:(c.calc.p1Cl||0);
    const p2=c.checklist?.pago2_cliente?0:(c.calc.p2Cl||0);
    // Solo incluir pendiente si la cot está activa (no rechazada/anulada)
    if(["rechazada_cliente","anulada","no_procesada"].includes(c.estado)) return 0;
    return p1+p2;
  };
  const totalCobradoCliente=dashData.reduce((s,c)=>s+calcCobradoCliente(c),0);
  const totalPendienteCliente=dashData.reduce((s,c)=>s+calcPendienteCliente(c),0);

  // KPI tiempo promedio de tránsito (solo importaciones con fecha real)
  const conFechaReal=cotizaciones.filter(c=>c.fecha_llegada_real&&c.fecha_llegada_est&&c.checklist?.pago_china);
  const promedioTransito=conFechaReal.length>0?Math.round(conFechaReal.reduce((s,c)=>{
    const fP=c.fecha_pago_china?new Date(c.fecha_pago_china):(()=>{const d=new Date(c.fecha_llegada_est);d.setDate(d.getDate()-90);return d;})();
    return s+Math.round((new Date(c.fecha_llegada_real)-fP)/(1000*60*60*24));
  },0)/conFechaReal.length):null;

  const monthlyMap={};
  dashData.forEach(c=>{
    if(!c.calc) return;
    const m1=monthKey(c.fecha_solicitud||"");
    const fll=c.fecha_llegada_real||c.fecha_llegada_est||(c.fecha_solicitud?new Date(new Date(c.fecha_solicitud).setMonth(new Date(c.fecha_solicitud).getMonth()+3)).toISOString().split("T")[0]:"");
    const m2=monthKey(fll);
    const isPropia=c.tipo==="propia";
    if(isPropia){
      const gan2=c.calc.ganDirecto||0;
      if(m2){ if(!monthlyMap[m2]) monthlyMap[m2]={gan1:0,gan2:0,gan2Est:0,entries:[]}; monthlyMap[m2].gan2+=gan2; monthlyMap[m2].entries.push({id:c.id,nro:c.nro,label:c.producto,pago:2,monto:gan2,tipo:"propia",real:true}); }
    } else {
      const gan1=calcGan1Real(c), gan2Real=calcGananciaReal(c), gan2Est=calcGananciaEst(c);
      if(m1&&gan1>0){ if(!monthlyMap[m1]) monthlyMap[m1]={gan1:0,gan2:0,gan2Est:0,entries:[]}; monthlyMap[m1].gan1+=gan1; monthlyMap[m1].entries.push({id:c.id,nro:c.nro,label:c.cliente,pago:1,monto:gan1,tipo:"cliente",real:true}); }
      if(m2){ if(!monthlyMap[m2]) monthlyMap[m2]={gan1:0,gan2:0,gan2Est:0,entries:[]}; if(gan2Real>0){monthlyMap[m2].gan2+=gan2Real; monthlyMap[m2].entries.push({id:c.id,nro:c.nro,label:c.cliente,pago:2,monto:gan2Real,tipo:"cliente",real:true});} if(gan2Est>0){monthlyMap[m2].gan2Est+=gan2Est; monthlyMap[m2].entries.push({id:c.id,nro:c.nro,label:c.cliente,pago:2,monto:gan2Est,tipo:"cliente",real:false});} }
    }
  });
  const months=Object.keys(monthlyMap).sort().reverse();
  const maxBarVal=months.reduce((mx,m)=>Math.max(mx,monthlyMap[m].gan1+monthlyMap[m].gan2+monthlyMap[m].gan2Est),0);

  // ─────────────────────────────────────────────────────────────
  return(
    <div style={{background:"#f1f5f9",minHeight:"100vh",fontFamily:"'Inter','Segoe UI',sans-serif",color:"#0f172a"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        @media print { .no-print { display: none !important; } }
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#94a3b8}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:900px){
          .nav-hdr{flex-wrap:wrap;height:auto !important;padding:10px 0 !important;gap:8px}
          .nav-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px}
          .nav-tabs button{white-space:nowrap;flex-shrink:0;padding:8px 12px !important}
          .hide-mob{display:none !important}
          .g2{grid-template-columns:1fr !important}
          .calc-grid{grid-template-columns:1fr !important}
          .luisa-grid{grid-template-columns:1fr !important}
          .kpi-grid{grid-template-columns:1fr 1fr !important}
          .dash-grid{grid-template-columns:1fr !important}
          .preview-grid{grid-template-columns:1fr !important}
          .clientes-layout{display:block !important}
          .clientes-layout > div{width:100% !important;min-width:0 !important}
          .clientes-detail{min-width:0 !important}
          .clientes-list-mob{display:none !important}
          .clientes-back-btn{display:flex !important}
          .dash-kpi4{grid-template-columns:1fr 1fr !important}
          .dash-kpi5{grid-template-columns:1fr 1fr !important}
          .dash-fin3{grid-template-columns:1fr 1fr !important}
          .cot-card-meta{grid-template-columns:1fr 1fr !important}
          .cot-card-row{flex-direction:column !important}
          .cot-card-right{min-width:0 !important;margin-left:0 !important;margin-top:10px !important;grid-template-columns:1fr 1fr !important}
          .ff-grid{grid-template-columns:1fr !important}
        }
      `}</style>

      {/* HEADER */}
      <div style={{background:"#040c18",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 0 rgba(255,255,255,0.06)"}}>
        {/* TOP BAR */}
        <div className="nav-hdr" style={{maxWidth:1280,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>

          {/* LEFT: Logo + título */}
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <img
              src={LOGO_WHITE}
              alt="ZAGA"
              style={{height:28,width:"auto",objectFit:"contain",mixBlendMode:"screen"}}
            />
            <div style={{width:1,height:18,background:"rgba(255,255,255,0.12)"}}/>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:2.5,textTransform:"uppercase",fontWeight:500}}>Gestión de Importaciones</span>
          </div>

          {/* RIGHT: chips + acciones */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div className="hide-mob" style={{display:"flex",gap:5,alignItems:"center",marginRight:6}}>
              {[
                [cotizaciones.filter(c=>["solicitud","enviada_cliente"].includes(c.estado)).length,"Pendientes","#f59e0b"],
                [cotizaciones.filter(c=>["pagada_china","en_camino"].includes(c.estado)).length,"En tránsito","#60a5fa"],
                [cotizaciones.filter(c=>c.estado==="completada").length,"Completadas","#34d399"],
              ].filter(([n])=>n>0).map(([n,lb,col])=>(
                <div key={lb} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"3px 10px",color:"rgba(255,255,255,0.75)",fontSize:11,display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}/>
                  <span style={{fontWeight:600}}>{n}</span>
                  <span style={{color:"rgba(255,255,255,0.4)"}}>{lb}</span>
                </div>
              ))}
            </div>

            <div style={{width:1,height:18,background:"rgba(255,255,255,0.1)"}}/>

            <button onClick={exportarDatos} style={{background:"transparent",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:500}}>↓ Exportar</button>
            <button onClick={importarDatos} style={{background:"transparent",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:500}}>↑ Importar</button>

            <div style={{width:1,height:18,background:"rgba(255,255,255,0.1)"}}/>

            <div style={{background:"rgba(201,160,85,0.15)",border:"1px solid rgba(201,160,85,0.3)",borderRadius:7,padding:"4px 12px",fontSize:12,fontWeight:600,color:"#c9a055"}}>
              {usuario?.nombre||"Admin"}
            </div>
            <button onClick={onLogout} style={{background:"transparent",color:"rgba(255,255,255,0.4)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer"}}>Salir</button>
          </div>
        </div>

        {/* NAV TABS */}
        <div className="nav-tabs" style={{maxWidth:1280,margin:"0 auto",padding:"0 24px",display:"flex",gap:0,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          {[["calc","Calculadora"],["tracker",`Tracker (${cotizaciones.length})`],["dashboard","Dashboard"],["clientes","Clientes"],["luisa","Luisa"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              background:"transparent",
              color:tab2===k?"#ffffff":"rgba(255,255,255,0.4)",
              border:"none",
              borderBottom:tab2===k?"2px solid #c9a055":"2px solid transparent",
              padding:"11px 18px",
              cursor:"pointer",
              fontWeight:tab2===k?600:400,
              fontSize:13,
              transition:"color .2s",
              fontFamily:"inherit"
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* PANTALLA DE CARGA */}
      {cargando&&(
        <div style={{position:"fixed",inset:0,background:"#f1f5f9",zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
          <div style={{width:40,height:40,border:"3px solid #e2e8f0",borderTop:"3px solid #040c18",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <div style={{fontSize:14,color:"#64748b",fontWeight:500}}>Cargando cotizaciones...</div>
          <div style={{fontSize:12,color:"#94a3b8"}}>Sincronizando con la nube</div>
        </div>
      )}

      {toast&&<div style={{position:"fixed",top:20,right:20,background:toast.type==="err"?"#c0392b":"#1aa358",color:"#fff",padding:"10px 22px",borderRadius:10,zIndex:999,fontWeight:600,fontSize:13,boxShadow:"0 4px 20px #0009",maxWidth:340,textAlign:"center"}}>{toast.msg}</div>}
      <ScrollTopBtn/>


      {/* MODAL RESUMEN PARA CHINA */}
      {resumenChina&&(()=>{
        const c=resumenChina;
        const transp=c.transporte==="aereo"?"✈️ Aéreo":c.transporte==="ambos"?"🚢 Marítimo + ✈️ Aéreo (cotizar ambos)":"🚢 Marítimo";
        const texto=`Hola! Te mando cotización ${c.nro} 🙌${c.categoria_cliente==="premium"?" — ⭐ CLIENTE PREMIUM, prioridad favor":c.categoria_cliente==="recurrente"?" — Cliente recurrente nuestro":""}

📦 Producto: ${c.producto}
🔢 Cantidad: ${c.unidades||"Por confirmar"} unidades
🚚 Tipo de flete: ${transp}
📅 Fecha solicitud: ${c.fecha_solicitud||"Hoy"}${c.link_alibaba?`\n🔗 Link referencia: ${c.link_alibaba}`:""}${c.variantes?`\n\n🎨 Variantes / Especificaciones:\n${c.variantes}`:""}${c.notas?`\n\n📝 Notas adicionales: ${c.notas}`:""}

⏰ Necesito la cotización en máximo 72 horas.
Si tienes alguna sugerencia o información importante del producto, por favor compártela.

Número de seguimiento: ${c.nro}`;
        return(
          <div style={{position:"fixed",inset:0,background:"#000c",zIndex:1300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"#ffffff",borderRadius:16,border:"1px solid #ddd6fe",width:"100%",maxWidth:600,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
              <div style={{padding:"20px 24px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:"#334155"}}>📋 Resumen para tu contacto en China</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:2}}>Copia este texto y pégalo en el chat con tu chinita</div>
                </div>
                <button onClick={()=>setResumenChina(null)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"7px 13px",cursor:"pointer",fontSize:13}}>✕</button>
              </div>
              <div style={{padding:"16px 24px",flex:1,overflow:"hidden",display:"flex",flexDirection:"column",gap:12}}>
                <div style={{fontSize:12,color:"#1aa358",background:"#22c55e11",border:"1px solid #22c55e33",borderRadius:8,padding:"8px 14px"}}>
                  ✓ Solicitud <b>{c.nro}</b> registrada. Ahora comparte este texto con tu contacto en China.
                </div>
                <textarea
                  readOnly value={texto} rows={14}
                  onClick={e=>e.target.select()}
                  style={{flex:1,background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:8,color:"#334155",padding:"12px",fontSize:12,fontFamily:"monospace",outline:"none",resize:"none",lineHeight:1.6}}
                />
              </div>
              <div style={{padding:"16px 24px",borderTop:"1px solid #e2e8f0",display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:11,color:"#64748b"}}>Haz clic en el cuadro → Ctrl+A → Ctrl+C para copiar todo</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setResumenChina(null);setTab("tracker");}} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,cursor:"pointer"}}>Ir al Tracker</button>
                  <button onClick={()=>{setResumenChina(null); const c2=resumenChina; setForm({...defaultForm,...c2}); setEditId(c2.id); setTab("calc");}} style={{background:"#040c18",color:"#ffffff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,cursor:"pointer",fontWeight:700}}>✏️ Agregar precio China ahora</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL BACKUP EXPORT / IMPORT */}
      {backupModal&&(
        <div style={{position:"fixed",inset:0,background:"#000c",zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#ffffff",borderRadius:16,border:"1px solid #e2e8f0",width:"100%",maxWidth:640,maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"20px 24px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{backupModal==="export"?"⬇️ Exportar datos":"⬆️ Importar datos"}</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:2}}>
                  {backupModal==="export"
                    ?"Selecciona todo el texto (Ctrl+A) y cópialo. Pégalo en un archivo .txt o .json y guárdalo."
                    :"Pega aquí el texto de tu backup y presiona Importar."}
                </div>
              </div>
              <button onClick={()=>setBackupModal(null)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"7px 13px",cursor:"pointer",fontSize:13}}>✕</button>
            </div>
            <div style={{padding:"16px 24px",flex:1,overflow:"hidden",display:"flex",flexDirection:"column",gap:12}}>
              {backupModal==="export"&&(
                <div style={{fontSize:12,color:"#334155",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px"}}>
                  💡 <b>Cómo guardar:</b> Haz clic en el cuadro → Ctrl+A (seleccionar todo) → Ctrl+C (copiar) → abre el Bloc de notas o Notes → pega → guarda como <b>zaga_backup.json</b>
                </div>
              )}
              {backupModal==="import"&&(
                <div style={{fontSize:12,color:"#2d78c8",background:"#3b82f611",border:"1px solid #3b82f633",borderRadius:8,padding:"10px 14px"}}>
                  ⚠️ <b>Atención:</b> Esto <b>reemplazará</b> todos los datos actuales con los del backup. Pega el texto del archivo JSON y presiona Importar.
                </div>
              )}
              <textarea
                value={backupText}
                onChange={e=>setBackupText(e.target.value)}
                readOnly={backupModal==="export"}
                spellCheck={false}
                style={{flex:1,minHeight:280,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,color:backupModal==="export"?"#0d9870":"#0f172a",padding:"12px",fontSize:11,fontFamily:"monospace",outline:"none",resize:"none",lineHeight:1.5}}
                onClick={e=>backupModal==="export"&&e.target.select()}
                placeholder={backupModal==="import"?"Pega aquí el contenido de tu archivo zaga_backup.json...":""}
              />
            </div>
            <div style={{padding:"16px 24px",borderTop:"1px solid #e2e8f0",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setBackupModal(null)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"9px 20px",fontSize:13,cursor:"pointer"}}>Cancelar</button>
              {backupModal==="import"&&(
                <button onClick={confirmarImport} style={{background:"#2d78c8",color:"#fff",border:"none",borderRadius:8,padding:"9px 22px",fontSize:13,cursor:"pointer",fontWeight:700}}>⬆️ Importar ahora</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPRESIÓN PANTALLA COMPLETA */}
      {printModal&&(
        <div style={{position:"fixed",inset:0,background:"#fff",zIndex:1100,overflowY:"auto",fontFamily:"'Segoe UI',Arial,sans-serif",color:"#222"}}>
          {/* Barra de acción — se oculta al imprimir */}
          <div className="no-print" style={{background:"#f1f5f9",padding:"12px 24px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}}>
            <div style={{flex:1,color:"#0f172a",fontWeight:700,fontSize:14}}>ZAGA IMP — Vista para imprimir</div>
            <div style={{fontSize:12,color:"#64748b",background:"#f8fafc",borderRadius:8,padding:"6px 14px",border:"1px solid #e2e8f0"}}>
              💡 Presiona <b style={{color:"#0f172a"}}>Ctrl+P</b> (Windows) o <b style={{color:"#0f172a"}}>⌘+P</b> (Mac) para guardar como PDF
            </div>
            <button onClick={cerrarPrint} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,cursor:"pointer",fontWeight:600}}>✕ Cerrar</button>
          </div>
          {/* Contenido del reporte */}
          <div style={{maxWidth:820,margin:"0 auto",padding:"24px 20px"}}>
            {printModal==="tracker"&&vistaData&&vistaData.tipo!=="propia"&&(
              <div>
                {/* Header */}
                <div style={{background:"#040c18",padding:"20px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"12px 12px 0 0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <img src={LOGO_WHITE} alt="ZAGA IMP" style={{height:28,width:"auto",objectFit:"contain"}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"#c9a055"}}>ZAGA IMP</div>
                      <div style={{fontSize:9,color:"#c9a05570",letterSpacing:2,textTransform:"uppercase"}}>Cotización de Importación</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:13,color:"#c9a055",fontWeight:700}}>{vistaData.nro}</div><div style={{fontSize:12,color:"#64748b"}}>{todayStr()}</div></div>
                </div>
                <div style={{border:"2px solid #1a1a2e22",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden",background:"#fff"}}>
                  <div style={{padding:"28px 36px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24,paddingBottom:20,borderBottom:"2px solid #f0f0f0"}}>
                      {[["Cliente",vistaData.cliente],["Producto",vistaData.producto],["Unidades",fmtN(vistaData.unidades)],["Fecha",todayStr()]].map(([l,v])=>(
                        <div key={l}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div><div style={{fontSize:15,fontWeight:700}}>{v}</div></div>
                      ))}
                    </div>
                    <div style={{background:"#f8f9ff",border:"2px solid #1a1a2e22",borderRadius:12,padding:"16px 20px",marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontSize:11,color:"#64748b",marginBottom:2}}>Total importación</div><div style={{fontSize:28,fontWeight:800,color:"#0f172a"}}>{fmt(vistaData.calc?.totCl)}</div></div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:12,color:"#64748b",marginBottom:4}}>Estado: <b style={{color:EST_COLOR[vistaData.estado]||"#888"}}>{EST_LABEL[vistaData.estado]||vistaData.estado}</b></div>
                        {vistaData.fecha_llegada_est&&<div style={{fontSize:12,color:"#64748b"}}>Llegada est: <b>{vistaData.fecha_llegada_est}</b></div>}
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:"#333",marginBottom:12,paddingBottom:6,borderBottom:"2px solid #f0f0f0"}}>💳 Detalle de pagos</div>
                        {[["1er Pago (depósito)",fmt(vistaData.calc?.p1Cl)],["2do Pago (saldo)",fmt(vistaData.calc?.p2Cl)],["Total",fmt(vistaData.calc?.totCl)]].map(([l,v])=>(
                          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>
                            <span style={{fontSize:13,color:"#666"}}>{l}</span>
                            <span style={{fontSize:13,fontWeight:700,color:l==="Total"?"#0f7040":"#222"}}>{v}</span>
                          </div>
                        ))}
                        {vistaData.con_iva&&<div style={{marginTop:8,fontSize:11,color:"#64748b"}}>* Precios no incluyen IVA (19%)</div>}
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:"#333",marginBottom:12,paddingBottom:6,borderBottom:"2px solid #f0f0f0"}}>📦 Detalles del producto</div>
                        {[["Precio/unidad",fmt(vistaData.calc?.pCUnd)],["Unidades",fmtN(vistaData.unidades)],vistaData.link_alibaba&&["Referencia","Ver link"]].filter(Boolean).map(([l,v])=>(
                          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}>
                            <span style={{fontSize:13,color:"#666"}}>{l}</span>
                            <span style={{fontSize:13,fontWeight:700}}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Progreso checklist */}
                    {(()=>{const prog=checkProg(vistaData);return(<div style={{background:"#f8f8f8",borderRadius:10,padding:"14px 18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <span style={{fontSize:12,fontWeight:700,color:"#333"}}>📋 Progreso de la importación</span>
                        <span style={{fontSize:12,color:"#666"}}>{prog.done}/{prog.total} etapas completadas</span>
                      </div>
                      <div style={{height:8,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",background:"#1aa358",borderRadius:4,width:`${(prog.done/prog.total)*100}%`}}/></div>
                    </div>);})()}
                    <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid #f0f0f0",textAlign:"center",fontSize:11,color:"#64748b"}}>Generado por ZAGA IMP · {todayStr()}</div>
                  </div>
                </div>
              </div>
            )}
            {printModal==="cliente"&&clienteSeleccionado&&(
              <div ref={vistaClienteRef}>
                <div style={{background:"#f1f5f9",padding:"24px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"12px 12px 0 0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <img src={LOGO_DARK} alt="ZAGA IMP" style={{height:28,width:"auto",objectFit:"contain"}}/>
                    <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Estado de Importaciones</div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:13,color:"#c9a055",fontWeight:700}}>{clienteSeleccionado}</div><div style={{fontSize:11,color:"#64748b"}}>{todayStr()}</div></div>
                </div>
                <div style={{border:"2px solid #1a1a2e22",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden",background:"#fff"}}>
                  {(()=>{
                    const imps=cotizaciones.filter(c=>c.cliente===clienteSeleccionado&&c.tipo!=="propia");
                    const totP=imps.reduce((s,c)=>s+(c.calc?.totCl||0),0);
                    const totU=imps.reduce((s,c)=>s+(Number(c.unidades)||0),0);
                    const tot1=imps.reduce((s,c)=>s+(c.calc?.p1Cl||0),0);
                    const tot2=imps.reduce((s,c)=>s+(c.calc?.p2Cl||0),0);
                    const comp=imps.filter(c=>c.estado==="completada").length;
                    return(<>
                      <div style={{padding:"20px 32px",borderBottom:"2px solid #f0f0f0",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
                        {[["Total importaciones",imps.length,"#0c1a2e"],["Total facturado",fmt(totP),"#0f7040"],["Unidades",fmtN(totU),"#1d4ed8"],["Completadas",comp,"#0d9870"]].map(([l,v,col])=>(
                          <div key={l} style={{textAlign:"center"}}>
                            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{l}</div>
                            <div style={{fontSize:20,fontWeight:800,color:col}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{padding:"20px 32px"}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#333",marginBottom:12}}>Detalle de importaciones</div>
                        {imps.map(c=>{
                          const sc=EST_COLOR[c.estado]||"#888",sl=EST_LABEL[c.estado]||c.estado,prog=checkProg(c);
                          const diasLL=c.fecha_llegada_est?Math.ceil((new Date(c.fecha_llegada_est)-new Date())/(1000*60*60*24)):null;
                          return(
                            <div key={c.id} style={{borderRadius:10,border:`2px solid ${sc}33`,marginBottom:12,overflow:"hidden"}}>
                              <div style={{background:sc+"11",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${sc}22`}}>
                                <div style={{display:"flex",alignItems:"center",gap:10}}>
                                  <span style={{fontWeight:700,fontSize:13,color:"#222"}}>{c.producto}</span>
                                  <span style={{fontSize:11,color:"#64748b"}}>{c.nro}</span>
                                </div>
                                <span style={{background:sc,color:"#fff",borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700}}>{sl}</span>
                              </div>
                              <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,background:"#fff"}}>
                                {[["Unidades",fmtN(c.unidades)],["Solicitud",c.fecha_solicitud||"-"],["Llegada est.",c.fecha_llegada_est||"-"],["1er pago",fmt(c.calc?.p1Cl)],["2do pago",fmt(c.calc?.p2Cl)]].map(([l,v])=>(
                                  <div key={l}><div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:700,color:"#222"}}>{v}</div></div>
                                ))}
                              </div>
                              <div style={{padding:"8px 16px",background:"#f9f9f9",borderTop:`1px solid ${sc}22`}}>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <div style={{flex:1,height:6,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",background:sc,borderRadius:4,width:`${(prog.done/prog.total)*100}%`}}/></div>
                                  <span style={{fontSize:11,color:"#666",whiteSpace:"nowrap"}}>{prog.done}/{prog.total} etapas</span>
                                  {diasLL!==null&&<span style={{fontSize:11,color:diasLL<0?"#c0392b":"#c47830",whiteSpace:"nowrap",marginLeft:8}}>{diasLL>0?`🚢 ${diasLL}d`:diasLL===0?"¡Llega hoy!":`⚠️ ${Math.abs(diasLL)}d atraso`}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{background:"#f1f5f9",borderRadius:10,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                          <span style={{color:"#64748b",fontSize:13,fontWeight:600}}>{imps.length} importación{imps.length!==1?"es":""} · {fmtN(totU)} unidades</span>
                          <div style={{textAlign:"right"}}>
                            <div style={{color:"#64748b",fontSize:11}}>1er: <span style={{color:"#1aa358",fontWeight:700}}>{fmt(tot1)}</span> · 2do: <span style={{color:"#334155",fontWeight:700}}>{fmt(tot2)}</span></div>
                            <div style={{color:"#334155",fontSize:18,fontWeight:800,marginTop:2}}>Total: {fmt(totP)}</div>
                          </div>
                        </div>
                        <div style={{marginTop:12,fontSize:10,color:"#64748b",textAlign:"center"}}>Generado por ZAGA IMP · {todayStr()}</div>
                      </div>
                    </>);
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PREVIEW INTERNO */}
      {(()=>{
        const p=previewId?cotizaciones.find(c=>c.id===previewId):null;
        if(!p) return null;
        const sc=EST_COLOR[p.estado]||"#888", sl=EST_LABEL[p.estado]||p.estado;
        const isPropia=p.tipo==="propia";
        const chklDef=getChecklist(p);
        const prog=checkProg(p);
        const diasLL=p.fecha_llegada_est?Math.round((new Date(p.fecha_llegada_est)-new Date())/(1000*60*60*24)):null;
        return(
          <div style={{position:"fixed",inset:0,background:"#000c",zIndex:950,overflowY:"auto",padding:"30px 20px"}} onClick={e=>e.target===e.currentTarget&&setPreviewId(null)}>
            <div style={{maxWidth:860,margin:"0 auto",background:"#ffffff",borderRadius:16,border:"1px solid #e2e8f0",overflow:"hidden"}}>
              {/* Header */}
              <div style={{background:"#040c18",padding:"20px 28px",borderBottom:"1px solid #0f1e30",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                    {isPropia?<span style={{background:"#3d7fc422",color:"#3d7fc4",border:"1px solid #8b5cf644",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>🏠 PROPIA</span>:<span style={{fontWeight:800,fontSize:18,color:"#ffffff"}}>{p.cliente}</span>}
                    <span style={{fontSize:13,color:"#94a3b8"}}>{p.nro}</span>
                    <span style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{sl}</span>
                    {diasLL!==null&&!p.fecha_llegada_real&&<span style={{background:"#f9741618",color:"#c47830",border:"1px solid #f9741633",borderRadius:20,padding:"3px 10px",fontSize:11}}>{diasLL>0?`🚢 ${diasLL}d para llegar`:diasLL===0?"¡Llega hoy!":`⚠️ ${Math.abs(diasLL)}d tarde`}</span>}
                    {p.fecha_llegada_real&&<span style={{background:"#10b98122",color:"#0d9870",border:"1px solid #10b98144",borderRadius:20,padding:"3px 10px",fontSize:11}}>✅ Llegó {p.fecha_llegada_real}</span>}
                  </div>
                  <div style={{fontSize:14,color:"#94a3b8",marginBottom:4}}>{p.producto} · <span style={{color:"#e2e8f0",fontWeight:600}}>{fmtN(p.unidades)} unidades</span></div>
                  <div style={{display:"flex",gap:16,fontSize:11,color:"#94a3b8",flexWrap:"wrap"}}>,
                    {p.fecha_solicitud&&<span>📅 Solicitud: {p.fecha_solicitud}</span>}
                    {p.fecha_llegada_est&&<span>🏁 Est: {p.fecha_llegada_est}</span>}
                    {p.sku_china&&<span style={{color:"#b8922e"}}>🏷 SKU China: {p.sku_china}</span>}
                    {p.sku_bodega&&<span style={{color:"#3d7fc4"}}>📦 SKU Bodega: {p.sku_bodega}</span>}
                  </div>
                </div>
                <button onClick={()=>setPreviewId(null)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",marginLeft:12}}>✕ Cerrar</button>
              </div>

              <div style={{padding:"20px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
                {/* Columna izquierda: Pagos */}
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {!isPropia&&p.calc&&(
                    <div>
                      <div style={{fontSize:10,color:"#1aa358",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:10}}>💰 Pagos del Cliente</div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {[["1er Pago",fmt(p.calc.p1Cl),p.checklist?.pago1_cliente],["2do Pago",fmt(p.calc.p2Cl),p.checklist?.pago2_cliente],["Total",fmt(p.calc.totCl),null]].map(([l,v,chk])=>(
                          <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:7,padding:"8px 12px"}}>
                            <span style={{fontSize:12,color:"#64748b"}}>{l}</span>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              {chk!==null&&<span style={{fontSize:10,color:chk?"#1aa358":"#555"}}>{chk?"✓ Cobrado":"⏳ Pendiente"}</span>}
                              <span style={{fontSize:13,fontWeight:700,color:l==="Total"?"#1aa358":"#0f172a"}}>{v}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{fontSize:10,color:"#2d78c8",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:10}}>🇨🇳 Pagos a China</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {/* 1er Pago */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:7,padding:"8px 12px"}}>
                        <span style={{fontSize:12,color:"#64748b"}}>1er Pago</span>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:10,color:p.checklist?.pago_china?"#2d78c8":"#555"}}>{p.checklist?.pago_china?"✓ Pagado":"⏳ Pendiente"}</span>
                          <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmt(p.calc?.p1Ch)}</span>
                        </div>
                      </div>
                      {/* 2do Pago — con desglose IVA si aplica */}
                      <div style={{background:"#f8fafc",borderRadius:7,padding:"8px 12px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:12,color:"#64748b"}}>2do Pago</span>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:10,color:p.checklist?.retirado_bodega?"#2d78c8":"#555"}}>{p.checklist?.retirado_bodega?"✓ Pagado":"⏳ Pendiente"}</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmt(p.calc?.p2Ch)}</span>
                          </div>
                        </div>
                        {p.requiere_factura&&p.calc?.ivaChina>0&&(
                          <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #1a2d4533",display:"flex",flexDirection:"column",gap:3}}>
                            <div style={{display:"flex",justifyContent:"space-between"}}>
                              <span style={{fontSize:10,color:"#64748b"}}>↳ Saldo producto (neto)</span>
                              <span style={{fontSize:11,color:"#334155",fontWeight:600}}>{fmt(p.calc?.prCh)}</span>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between"}}>
                              <span style={{fontSize:10,color:"#c0392b"}}>↳ IVA 19% (total pedido)</span>
                              <span style={{fontSize:11,color:"#c0392b",fontWeight:600}}>{fmt(p.calc?.ivaChina)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Total */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:7,padding:"8px 12px"}}>
                        <span style={{fontSize:12,color:"#64748b"}}>Total</span>
                        <span style={{fontSize:13,fontWeight:700,color:"#2d78c8"}}>{fmt(p.calc?.totCh||p.calc?.tCh)}</span>
                      </div>
                    </div>
                  </div>
                  {!isPropia&&p.calc&&(
                    <div>
                      <div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:10}}>⭐ Ganancias</div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {[["1er pago",fmt(p.calc.gan1)],["2do pago",fmt(p.calc.gan2)],["Total importación",fmt(p.calc.ganImp)],["ROI",fmtP(p.calc.roi)],["Markup",fmtP(p.calc.markup)]].map(([l,v])=>(
                          <div key={l} style={{display:"flex",justifyContent:"space-between",background:"#f8fafc",borderRadius:7,padding:"8px 12px"}}>
                            <span style={{fontSize:12,color:"#64748b"}}>{l}</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#c9a055"}}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isPropia&&p.calc&&(
                    <div>
                      <div style={{fontSize:10,color:"#3d7fc4",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:10}}>📈 Proyección Venta</div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {[["Costo/und",fmt(p.calc.cRUnd)],["Precio venta/und",fmt(p.calc.pvUnd)],["Ganancia directa",fmt(p.calc.ganDirecto)],["Margen bruto",fmtP(p.calc.mgBruto)],["ROI",fmtP(p.calc.roi)]].map(([l,v])=>(
                          <div key={l} style={{display:"flex",justifyContent:"space-between",background:"#f8fafc",borderRadius:7,padding:"8px 12px"}}>
                            <span style={{fontSize:12,color:"#64748b"}}>{l}</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#3d7fc4"}}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna derecha: Checklist + Fulfillment */}
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div>
                    <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:10}}>
                      📋 Seguimiento — <span style={{color:"#1aa358"}}>{prog.done}/{prog.total} completados</span>
                    </div>
                    <div style={{height:4,background:"#e2e8f0",borderRadius:4,overflow:"hidden",marginBottom:12}}>
                      <div style={{height:"100%",background:isPropia?"#3d7fc4":"#1aa358",borderRadius:4,width:`${(prog.done/prog.total)*100}%`}}/>
                    </div>
                    {[{group:"cotizacion",label:"Cotización",color:"#2a8aaa"},{group:"pagos",label:"Pagos",color:"#1aa358"},{group:"china",label:"China",color:"#b8922e"},{group:"logistica",label:"Logística",color:"#c47830"},{group:"venta",label:"Venta",color:"#3d7fc4"}]
                      .filter(g=>chklDef.some(d=>d.group===g.group))
                      .map(({group,label,color})=>(
                      <div key={group} style={{marginBottom:10}}>
                        <div style={{fontSize:10,color,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>{label}</div>
                        {chklDef.filter(d=>d.group===group).map(d=>(
                          <div key={d.key} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,marginBottom:3,background:"#f8fafc"}}>
                            <span style={{fontSize:14,color:p.checklist?.[d.key]?color:"#475569"}}>{p.checklist?.[d.key]?"☑":"☐"}</span>
                            <span style={{fontSize:11,color:p.checklist?.[d.key]?"#0f172a":"#555"}}>{d.label}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {(p.fulfillment_cliente||p.sku_china||p.sku_bodega)&&(
                    <div style={{background:"#f8fafc",borderRadius:10,padding:14,border:"1px solid #e2e8f0"}}>
                      <div style={{fontSize:10,color:"#c47830",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:10}}>📦 Bodega & Fulfillment</div>
                      {p.sku_china&&<div style={{fontSize:12,color:"#b8922e",marginBottom:4}}>🏷 SKU China: <b>{p.sku_china}</b></div>}
                      {p.sku_bodega&&<div style={{fontSize:12,color:"#3d7fc4",marginBottom:4}}>📦 SKU Bodega: <b>{p.sku_bodega}</b></div>}
                      {(p.dim_largo||p.dim_ancho||p.dim_alto)&&(
                        <div style={{fontSize:12,color:"#0d9870",marginBottom:4}}>
                          📐 {(p.dim_tipo||"caja")==="caja"?"Caja":"Und"}: <b>{p.dim_largo||"?"}×{p.dim_ancho||"?"}×{p.dim_alto||"?"} cm</b>
                          {p.dim_m3&&<span style={{marginLeft:8,color:"#1aa358"}}>· <b>{p.dim_m3} m³/{(p.dim_tipo||"caja")==="caja"?"caja":"und"}</b></span>}
                          {(p.dim_tipo||"caja")==="caja"&&p.dim_und_caja&&p.unidades&&(()=>{
                            const nC=Math.ceil(Number(p.unidades)/Number(p.dim_und_caja));
                            const m3T=p.dim_m3?(Number(p.dim_m3)*nC).toFixed(2):null;
                            return <span style={{marginLeft:8,color:"#b8922e"}}>· <b>{p.dim_und_caja} und/caja → {nC} cajas</b>{m3T&&<span style={{color:"#1aa358",fontWeight:800}}> · {m3T} m³ total</span>}</span>;
                          })()}
                          {p.dim_tipo==="unidad"&&p.dim_m3&&p.unidades&&<span style={{marginLeft:8,color:"#1aa358",fontWeight:800}}>· Total: {(Number(p.dim_m3)*Number(p.unidades)).toFixed(2)} m³</span>}
                        </div>
                      )}
                      {p.fulfillment_cliente&&<div style={{fontSize:12,color:"#2a8aaa",marginBottom:4}}>🚚 Fulfillment: <b>{p.fulfillment_producto_creado?"Producto creado ✓":"Pendiente crear producto"}</b></div>}
                      {p.fulfillment_costo_real&&<div style={{fontSize:12,color:"#0f172a",marginBottom:4}}>💵 Costo fulfillment: <b>{fmt(p.fulfillment_costo_real)}</b></div>}
                      {p.fulfillment_notas&&<div style={{fontSize:11,color:"#666",marginTop:6,fontStyle:"italic"}}>📝 {p.fulfillment_notas}</div>}
                    </div>
                  )}
                  {p.notas&&<div style={{background:"#f8fafc",borderRadius:8,padding:12,border:"1px solid #e2e8f0"}}><div style={{fontSize:10,color:"#64748b",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Notas cotización</div><div style={{fontSize:12,color:"#64748b"}}>{p.notas}</div></div>}
                  {p.variantes&&<div style={{background:"#f5f3ff",borderRadius:8,padding:12,border:"1px solid #a78bfa33"}}><div style={{fontSize:10,color:"#334155",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>🎨 Variantes / Especificaciones</div><div style={{fontSize:12,color:"#0f172a",whiteSpace:"pre-wrap",lineHeight:1.6}}>{p.variantes}</div></div>}
                  {(()=>{
                    var hist2 = p.notas_historial||[]
                    if(hist2.length===0&&p.notas_internas) hist2=[{texto:p.notas_internas,fecha:"",autor:"Gestor"}]
                    return hist2.length>0&&(
                      <div style={{background:"#f8fafc",borderRadius:8,padding:12,border:"1px solid #06b6d433"}}>
                        <div style={{fontSize:10,color:"#2a8aaa",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>📌 Notas internas</div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {hist2.map(function(n,i){ return <div key={i}><span style={{fontSize:10,color:"#94a3b8"}}>{n.fecha&&n.fecha+" · "}{n.autor} </span><span style={{fontSize:12,color:"#0f172a"}}>{n.texto}</span></div> })}
                        </div>
                      </div>
                    )
                  })()}
                  {p.link_alibaba&&<a href={p.link_alibaba} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:"#eff6ff",color:"#2d78c8",border:"1px solid #3b82f633",borderRadius:8,padding:"8px 14px",fontSize:12,textDecoration:"none"}}>🔗 Ver referencia en Alibaba</a>}
                  {p.motivo_no_procesada&&<div style={{background:"#fff1f2",borderRadius:8,padding:12,border:"1px solid #ef444433"}}><div style={{fontSize:10,color:"#c0392b",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Motivo no procesada</div><div style={{fontSize:12,color:"#dc2626"}}>{p.motivo_no_procesada}</div></div>}
                  {(p.negociacion_rondas||[]).length>0&&(
                    <div style={{background:"#fffbeb",borderRadius:10,padding:14,border:"1px solid #fde68a"}}>
                      <div style={{fontSize:10,color:"#b8922e",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:10}}>🤝 Historial de Negociación</div>
                      <div style={{display:"flex",flexDirection:"column",gap:7}}>
                        {(p.negociacion_rondas||[]).map((r,i)=>(
                          <div key={i} style={{background:"#ffffff",borderRadius:7,padding:"9px 12px",border:`1px solid ${r.estado==="aplicada"?"#1aa35833":r.estado==="rechazada"?"#c0392b33":"#b8922e22"}`}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <span style={{fontSize:10,color:"#64748b"}}>Ronda {i+1} · {r.fecha}</span>
                              <span style={{fontSize:10,fontWeight:700,color:r.estado==="aplicada"?"#1aa358":r.estado==="rechazada"?"#c0392b":"#b8922e"}}>{r.estado==="aplicada"?"✓ Aplicada":r.estado==="rechazada"?"✗ Rechazada":"⏳ Pendiente"}</span>
                            </div>
                            <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:11,marginBottom:r.nota?4:0}}>
                              {r.unidades_prop&&<span style={{color:"#3d7fc4"}}>📦 Unidades: <b>{fmtN(r.unidades_prop)}</b></span>}
                              {r.precio_prop&&<span style={{color:"#2d78c8"}}>💵 Precio China: <b>{fmt(r.precio_prop)}</b></span>}
                            </div>
                            {r.nota&&<div style={{fontSize:11,color:"#64748b",fontStyle:"italic"}}>"{r.nota}"</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL VISTA CLIENTE */}
      {vistaData&&vistaData.tipo!=="propia"&&(
        <div style={{position:"fixed",inset:0,background:"#000b",zIndex:900,overflowY:"auto",padding:"40px 20px"}} onClick={e=>e.target===e.currentTarget&&setVistaId(null)}>
          <div style={{maxWidth:700,margin:"0 auto"}}>
            <div style={{display:"flex",gap:10,marginBottom:12,justifyContent:"flex-end"}}>
              <button onClick={()=>abrirPrint("tracker")} style={{background:"#c9a055",color:"#05100e",border:"none",borderRadius:9,padding:"10px 22px",fontSize:14,fontWeight:700,cursor:"pointer"}}>🖨️ Imprimir / Guardar PDF</button>
              <button onClick={()=>setVistaId(null)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:9,padding:"10px 20px",fontSize:14,cursor:"pointer"}}>✕ Cerrar</button>
            </div>
            <div ref={vistaRef} style={{background:"#fff",borderRadius:16,overflow:"hidden",color:"#222",fontFamily:"'Segoe UI',Arial,sans-serif"}}>
              <div style={{background:"#ffffff",padding:"20px 36px 14px 36px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"2px solid #f0f0f0"}}>
                <img src={LOGO_DARK} alt="ZAGA IMP" style={{height:48,width:"auto",objectFit:"contain"}}/>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,color:"#c9a055",fontWeight:700}}>{vistaData.nro}</div>
                  <div style={{fontSize:11,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",marginTop:2}}>Cotización de Importación</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{todayStr()}</div>
                </div>
              </div>
              <div style={{padding:"28px 36px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24,paddingBottom:20,borderBottom:"2px solid #f0f0f0"}}>
                  {[["Cliente",vistaData.cliente],["Producto",vistaData.producto],["Unidades",fmtN(vistaData.unidades)],["Fecha",todayStr()]].map(([l,v])=>(
                    <div key={l}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div><div style={{fontSize:15,fontWeight:700}}>{v}</div></div>
                  ))}
                </div>
                <div style={{background:"#f8f9ff",border:"2px solid #1a1a2e22",borderRadius:12,padding:"16px 20px",marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Precio por unidad (base)</div><div style={{fontSize:26,fontWeight:800,color:"#0f172a"}}>{fmt(vistaData.calc?.pCUnd)}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{vistaData.con_iva?"+ IVA":"Sin IVA"}</div></div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Precio final / unidad (todo incluido)</div>
                    <div style={{fontSize:26,fontWeight:800,color:"#0f7040"}}>{fmt(vistaData.calc?.pfUnd)}<span style={{fontSize:13,color:"#64748b",fontWeight:400,marginLeft:4}}>neto</span></div>
                    {vistaData.con_iva&&<div style={{fontSize:18,fontWeight:700,color:"#1a6644",marginTop:2}}>{fmt((vistaData.calc?.pfUnd||0)*1.19)}<span style={{fontSize:12,color:"#64748b",fontWeight:400,marginLeft:4}}>c/IVA</span></div>}
                    <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Incluye comisiones y servicio</div>
                  </div>
                </div>
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:14,fontWeight:700,marginBottom:14,color:"#0f172a"}}>Estructura de Pago</div>
                  <div style={{background:"#f0fdf4",border:"2px solid #22c55e44",borderRadius:10,padding:18,marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontWeight:700,fontSize:15,color:"#0f7040"}}>1er Pago — Al confirmar la orden</span><span style={{fontWeight:800,fontSize:20,color:"#0f7040"}}>{vistaData.con_iva?fmt((vistaData.calc?.p1Cl||0)*1.19):fmt(vistaData.calc?.p1Cl)}</span></div>
                    <div style={{fontSize:12,color:"#666"}}>
                      {[[`Depósito ${vistaData.pct_deposito}% del total`,fmt(vistaData.calc?.dCl)],[`Comisión financiamiento (${(Number(vistaData.pct_com_prestamo)||6.5).toFixed(1)}%)`,fmt(vistaData.calc?.comCl)],...((Number(vistaData.cda_cl)||Number(vistaData.cda))>0?[[vistaData.cda_descripcion||"Certificado",fmt(vistaData.calc?.cdaCl||Number(vistaData.cda_cl)||Number(vistaData.cda)||0)]]:[] ),...(vistaData.con_iva?[["IVA (19%)",fmt((vistaData.calc?.p1Cl||0)*0.19)]]:[] )].map(([l,v])=>(
                        <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #dcfce7"}}><span>{l}</span><span style={{fontWeight:600}}>{v}</span></div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:"#fffbeb",border:"2px solid #f5c84244",borderRadius:10,padding:18}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontWeight:700,fontSize:15,color:"#92400e"}}>2do Pago — Al recibir la mercancía en Chile</span><span style={{fontWeight:800,fontSize:20,color:"#92400e"}}>{vistaData.con_iva?fmt((vistaData.calc?.p2Cl||0)*1.19):fmt(vistaData.calc?.p2Cl)}</span></div>
                    <div style={{fontSize:12,color:"#666"}}>
                      {[[`Saldo importación (${100-Number(vistaData.pct_deposito)}%)`,fmt(vistaData.calc?.prCl)],[`Servicio de importación (${vistaData.pct_servicio}%)`,fmt(vistaData.calc?.serv)],...(vistaData.con_iva?[["IVA (19%)",fmt((vistaData.calc?.p2Cl||0)*0.19)]]:[] )].map(([l,v])=>(
                        <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #fef3c7"}}><span>{l}</span><span style={{fontWeight:600}}>{v}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{background:"#f1f5f9",borderRadius:10,padding:"16px 20px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:"#64748b",fontSize:13}}>TOTAL IMPORTACIÓN</span>
                  <div style={{textAlign:"right"}}><div style={{color:"#0f172a",fontSize:22,fontWeight:800}}>{vistaData.con_iva?fmt((vistaData.calc?.totCl||0)*1.19):fmt(vistaData.calc?.totCl)}</div><div style={{color:"#64748b",fontSize:11,marginTop:2}}>{fmtN(vistaData.unidades)} unidades · {fmt(vistaData.calc?.pfUnd)} /und total</div></div>
                </div>
                <div style={{background:"#f9f9f9",borderRadius:8,padding:14,fontSize:12,color:"#666"}}>
                  <div style={{fontWeight:700,color:"#333",marginBottom:8}}>Consideraciones</div>
                  <div style={{marginBottom:4}}>• Plazo estimado de llegada: <strong>90 días</strong> desde la confirmación y pago.</div>
                  <div style={{marginBottom:4}}>• El {100-Number(vistaData.pct_deposito)}% del valor queda financiado hasta la recepción.</div>
                  <div style={{marginBottom:4}}>• Servicio de fulfillment disponible desde <strong>$1.000</strong>, monto puede variar según necesidad del cliente.</div>
                  {vistaData.notas&&<div style={{marginBottom:4}}>• {vistaData.notas}</div>}
                  <div>• Todos los valores son <strong>{vistaData.con_iva?"con IVA incluido":"sin IVA"}</strong>.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px",overflowX:"hidden"}}>

        {/* ══ CALCULADORA ══ */}
        {tab2==="calc"&&(
          <div>
            {editId&&<div style={{background:"#f5c84218",border:"1px solid #f5c84244",borderRadius:10,padding:"10px 16px",marginBottom:20,fontSize:13,color:"#c9a055"}}>✏️ Editando · <button onClick={()=>{setEditId(null);setForm(defaultForm);}} style={{background:"none",border:"none",color:"#c9a055",cursor:"pointer",textDecoration:"underline"}}>Cancelar</button></div>}

            {/* TIPO TOGGLE */}
            <div style={{display:"flex",gap:8,marginBottom:16,background:"#f1f5f9",borderRadius:12,padding:6,border:"1px solid #e2e8f0",width:"fit-content"}}>
              {[["cliente","👥 Importación para Cliente","#1aa358"],["propia","🏠 Importación Propia","#3d7fc4"]].map(([k,l,col])=>(
                <button key={k} onClick={()=>setForm(f=>({...defaultForm,tipo:k}))} style={{
                  background:form.tipo===k?col+"22":"transparent",
                  color:form.tipo===k?col:"#666",
                  border:`1px solid ${form.tipo===k?col+"55":"transparent"}`,
                  borderRadius:9,padding:"10px 24px",cursor:"pointer",fontWeight:form.tipo===k?700:400,fontSize:13,transition:"all .2s"
                }}>{l}</button>
              ))}
            </div>

            {/* GESTOR SELECTOR */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <span style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Gestionada por</span>
              {[["francisco","👤 Francisco","#2d78c8"],["luisa","👩‍💼 Luisa","#a85590"]].map(([k,l,col])=>(
                <button key={k} onClick={()=>setForm(p=>({...p,gestor:k}))} style={{background:form.gestor===k?col+"18":"#f8fafc",color:form.gestor===k?col:"#64748b",border:`1px solid ${form.gestor===k?col+"66":"#e2e8f0"}`,borderRadius:20,padding:"5px 16px",fontSize:12,cursor:"pointer",fontWeight:form.gestor===k?700:400}}>{l}</button>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:esPaso1?"minmax(0,520px)":"minmax(0,360px) 1fr",gap:20}} className="calc-grid">
              {/* INPUTS */}
              <div>
                <BLOCK title={form.tipo==="propia"?"🏠 Mi importación":"📦 Datos del pedido"} accent={form.tipo==="propia"?"#3d7fc4":"#888"}>
                  {form.tipo==="cliente"&&(
                    <div style={{marginBottom:12}}>
                      <label style={{display:"block",fontSize:10,color:"#777",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Cliente</label>
                      {clientesUnicos.length>0&&(
                        <div style={{marginBottom:8}}>
                          <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>Clientes anteriores:</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {clientesUnicos.map(cl=>(
                              <button key={cl} onClick={()=>setForm(p=>({...p,cliente:cl,categoria_cliente:cotizaciones.filter(c=>c.cliente===cl).slice(-1)[0]?.categoria_cliente||p.categoria_cliente}))}
                                style={{background:form.cliente===cl?"#f0fdf4":"#f8fafc",color:form.cliente===cl?"#1aa358":"#64748b",border:`1px solid ${form.cliente===cl?"#22c55e66":"#e2e8f0"}`,borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer",fontWeight:form.cliente===cl?700:400}}>
                                {cl}
                              </button>
                            ))}
                            <button onClick={()=>setForm(p=>({...p,cliente:""}))}
                              style={{background:(!form.cliente||!clientesUnicos.includes(form.cliente))?"#eff6ff":"#f8fafc",color:(!form.cliente||!clientesUnicos.includes(form.cliente))?"#3d7fc4":"#64748b",border:`1px solid ${(!form.cliente||!clientesUnicos.includes(form.cliente))?"#3d7fc455":"#e2e8f0"}`,borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer",fontWeight:(!form.cliente||!clientesUnicos.includes(form.cliente))?700:400}}>
                              ✦ Nuevo cliente
                            </button>
                          </div>
                        </div>
                      )}
                      <input value={form.cliente||""} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))} placeholder={clientesUnicos.length>0?"Elige arriba o escribe un cliente nuevo":"Nombre del cliente"} style={{width:"100%",background:"#f8fafc",border:`1px solid ${form.cliente&&clientesUnicos.includes(form.cliente)?"#22c55e66":"#e2e8f0"}`,borderRadius:8,color:form.cliente&&clientesUnicos.includes(form.cliente)?"#1aa358":"#0f172a",padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                  )}
                  {form.tipo==="cliente"&&(
                    <div style={{marginBottom:14}}>
                      <label style={{display:"block",fontSize:10,color:"#777",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Categoría del cliente</label>
                      <div style={{display:"flex",gap:6}}>
                        {[["nuevo","🆕 Cliente nuevo","#2a8aaa"],["recurrente","🔄 Ya importó antes","#1aa358"],["premium","⭐ Cliente Premium","#c9a055"]].map(([k,l,col])=>(
                          <button key={k} onClick={()=>setForm(p=>({...p,categoria_cliente:k}))} style={{flex:1,background:form.categoria_cliente===k?col+"18":"#f8fafc",color:form.categoria_cliente===k?col:"#64748b",border:`1px solid ${form.categoria_cliente===k?col+"66":"#e2e8f0"}`,borderRadius:8,padding:"7px 6px",fontSize:11,cursor:"pointer",fontWeight:form.categoria_cliente===k?700:400,textAlign:"center"}}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {form.tipo==="cliente"&&(
                    <div style={{marginBottom:14}}>
                      <label style={{display:"block",fontSize:10,color:"#777",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Tipo de transporte a cotizar</label>
                      <div style={{display:"flex",gap:6}}>
                        {[["maritimo","🚢 Marítimo","#2a8aaa"],["aereo","✈️ Aéreo","#c47830"],["ambos","🚢✈️ Ambos","#3d7fc4"]].map(([k,l,col])=>(
                          <button key={k} onClick={()=>setForm(p=>({...p,transporte:k}))} style={{flex:1,background:form.transporte===k?col+"18":"#f8fafc",color:form.transporte===k?col:"#64748b",border:`1px solid ${form.transporte===k?col+"66":"#e2e8f0"}`,borderRadius:8,padding:"7px 6px",fontSize:11,cursor:"pointer",fontWeight:form.transporte===k?700:400,textAlign:"center"}}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{marginBottom:12}}>
                    <label style={{display:"block",fontSize:10,color:"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Producto</label>
                    <input value={form.producto||""} onChange={e=>setForm(p=>({...p,producto:e.target.value}))} placeholder="Nombre del producto" style={{width:"100%",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:8,color:"#0f172a",padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{display:"block",fontSize:10,color:"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Link referencia</label>
                    <input value={form.link_alibaba||""} onChange={e=>setForm(p=>({...p,link_alibaba:e.target.value}))} placeholder="https://..." style={{width:"100%",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:8,color:"#0f172a",padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{display:"block",fontSize:10,color:"#b8922e",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>🏷 SKU China</label>
                    <input value={form.sku_china||""} onChange={e=>setForm(p=>({...p,sku_china:e.target.value}))} placeholder="Ej: CN-20394-A" style={{width:"100%",background:"#f8fafc",border:"1px solid #f59e0b44",borderRadius:8,color:"#b8922e",padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div>
                      <label style={{display:"block",fontSize:10,color:"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Fecha</label>
                      <input type="date" value={form.fecha_solicitud} onChange={e=>setForm(p=>({...p,fecha_solicitud:e.target.value}))} style={{width:"100%",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:8,color:"#0f172a",padding:"9px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    {form.tipo==="cliente"&&(
                      <div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:18}}>
                        {[["con_iva","Cotizar c/IVA"],["requiere_factura","Requiere factura"]].map(([f,l])=>(
                          <label key={f} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:12,color:"#999"}}><input type="checkbox" checked={form[f]||false} onChange={e=>setForm(p=>({...p,[f]:e.target.checked}))} style={{cursor:"pointer"}}/>{l}</label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{display:"block",fontSize:10,color:"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Notas generales</label>
                    <textarea value={form.notas||""} rows={2} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} style={{width:"100%",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:8,color:"#0f172a",padding:"9px 12px",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:10,color:"#334155",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>🎨 Variantes del producto</label>
                    <textarea value={form.variantes||""} rows={3} onChange={e=>setForm(p=>({...p,variantes:e.target.value}))} placeholder={"Ej:\n- Azul: 50 und\n- Rojo: 30 und\n- Talla S: 20, M: 40, L: 20\n- Sin logo / Con logo bordado"} style={{width:"100%",background:"#f8fafc",border:"1px solid #ddd6fe",borderRadius:8,color:"#334155",padding:"9px 12px",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.6}}/>
                    <div style={{fontSize:10,color:"#444",marginTop:3}}>Colores, tallas, cantidades por variante, especificaciones</div>
                  </div>
                </BLOCK>

                {/* En Paso 1 (nueva sin precio): mostrar solo Unidades con hint */}
                {esPaso1 ? (
                  <div style={{background:"#f8fafc",borderRadius:12,padding:"14px 16px",marginBottom:12,border:"1px solid #e2e8f0"}}>
                    <div style={{fontSize:10,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>📦 Unidades a cotizar</div>
                    <NInput label="Unidades" field="unidades" form={form} setForm={setForm} placeholder="0"/>
                    <div style={{marginTop:10,fontSize:11,color:"#94a3b8",background:"#f1f5f9",borderRadius:8,padding:"8px 12px",border:"1px dashed #cbd5e1"}}>
                      💡 Cuando China responda, edita esta cotización desde el Tracker para ingresar el precio y calcular todo.
                    </div>
                  </div>
                ) : (
                  <BLOCK title="🇨🇳 Cotización China" accent="#2d78c8">
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      <NInput label="Unidades" field="unidades" form={form} setForm={setForm} placeholder="0"/>
                      <NInput label="Precio China / Unid $" field="precio_china" form={form} setForm={setForm} placeholder="0"/>
                      <NInput label="% Depósito" field="pct_deposito" form={form} setForm={setForm} note="Ej: 30 = 30%"/>
                      <NInput label="⚡ Comisión real APP $" field="comision_real" form={form} setForm={setForm} color="#b8922e" placeholder="0" note="Copia de la app"/>
                    </div>
                    {Number(form.comision_real)>0&&Number(form.precio_china)>0&&Number(form.unidades)>0&&(
                      <div style={{fontSize:11,color:"#666",background:"#f8fafc",borderRadius:7,padding:"6px 10px"}}>Tasa implícita: <span style={{color:"#334155"}}>{(Number(form.comision_real)/(Number(form.precio_china)*Number(form.unidades)*(1-Number(form.pct_deposito)/100))*100).toFixed(2)}%</span></div>
                    )}

                    {/* ── DIMENSIONES (solo al editar) ── */}
                    {editId&&(()=>{
                      const dimTipo=form.dim_tipo||"caja";
                      const esCaja=dimTipo==="caja";
                      const undCaja=Number(form.dim_und_caja)||0;
                      const unidades=Number(form.unidades)||0;
                      const nCajas=esCaja&&undCaja>0?Math.ceil(unidades/undCaja):0;
                      const m3Val=Number(form.dim_m3)||0;
                      const m3Total=esCaja?(m3Val*nCajas).toFixed(2):(m3Val*unidades).toFixed(2);
                      return (
                        <div style={{marginTop:14,borderTop:"1px dashed #2d78c833",paddingTop:14}}>
                          <div style={{fontSize:10,color:"#2d78c8",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>📐 Dimensiones del producto</div>

                          {/* SKU China */}
                          <div style={{marginBottom:10}}>
                            <label style={{display:"block",fontSize:10,color:"#b8922e",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>🏷 SKU China</label>
                            <input value={form.sku_china||""} onChange={e=>setForm(p=>({...p,sku_china:e.target.value}))} placeholder="Ej: CN-20394-A" style={{width:"100%",background:"#f8fafc",border:"1px solid #f59e0b44",borderRadius:7,color:"#b8922e",padding:"7px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                          </div>

                          {/* Toggle caja/unidad */}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                            <span style={{fontSize:10,color:"#64748b"}}>Medir por:</span>
                            <div style={{display:"flex",background:"#f1f5f9",borderRadius:7,padding:2,gap:2}}>
                              {[["caja","📦 Caja"],["unidad","🔹 Unidad"]].map(([val,lbl])=>(
                                <button key={val} onClick={()=>setForm(p=>({...p,dim_tipo:val}))} style={{background:dimTipo===val?"#2d78c8":"transparent",color:dimTipo===val?"#fff":"#64748b",border:"none",borderRadius:5,padding:"4px 12px",fontSize:10,cursor:"pointer",fontWeight:dimTipo===val?700:400}}>{lbl}</button>
                              ))}
                            </div>
                          </div>

                          {/* Und por caja */}
                          {esCaja&&(
                            <div style={{background:"#fffbeb",borderRadius:7,padding:"8px 10px",marginBottom:10,border:"1px solid #fde68a"}}>
                              <div style={{fontSize:9,color:"#b8922e",marginBottom:4,fontWeight:700}}>Unidades por caja cerrada</div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <input type="number" value={form.dim_und_caja||""} onChange={e=>setForm(p=>({...p,dim_und_caja:e.target.value}))} placeholder="Ej: 12" style={{width:80,background:"#f8fafc",border:"1px solid #f59e0b55",borderRadius:6,color:"#b8922e",padding:"6px 10px",fontSize:14,outline:"none",fontWeight:800}}/>
                                <span style={{fontSize:11,color:"#64748b"}}>und/caja</span>
                                {undCaja>0&&unidades>0&&<span style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:"#0d9870"}}>{nCajas} cajas necesarias</span>}
                              </div>
                            </div>
                          )}

                          {/* L × A × H */}
                          <div style={{fontSize:9,color:"#64748b",marginBottom:6}}>{esCaja?"Medidas de la caja cerrada (cm)":"Medidas por unidad de producto (cm)"}</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                            {[["dim_largo","Largo"],["dim_ancho","Ancho"],["dim_alto","Alto"]].map(([field,label])=>(
                              <div key={field}>
                                <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>{label} (cm)</div>
                                <input type="number" value={form[field]||""} onChange={e=>{
                                  const v=e.target.value;
                                  const l=field==="dim_largo"?v:form.dim_largo||0;
                                  const an=field==="dim_ancho"?v:form.dim_ancho||0;
                                  const al=field==="dim_alto"?v:form.dim_alto||0;
                                  const m3=l&&an&&al?((Number(l)*Number(an)*Number(al))/1000000).toFixed(4):"";
                                  setForm(p=>({...p,[field]:v,dim_m3:m3||p.dim_m3}));
                                }} placeholder="0" style={{width:"100%",background:"#f1f5f9",border:"1px solid #2d78c833",borderRadius:6,color:"#2d78c8",padding:"6px 8px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                              </div>
                            ))}
                          </div>

                          {/* Resultados m³ */}
                          {m3Val>0&&(
                            <div style={{display:"grid",gridTemplateColumns:esCaja?"1fr 1fr 1fr":"1fr 1fr",gap:6}}>
                              <div>
                                <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>{esCaja?"M³ por caja":"M³ por unidad"}</div>
                                <div style={{background:"#f8fafc",border:"1px solid #2d78c833",borderRadius:6,color:"#2d78c8",padding:"6px 8px",fontSize:12,fontWeight:700}}>{m3Val} m³</div>
                              </div>
                              {esCaja&&undCaja>0&&(
                                <div>
                                  <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>M³ por unidad</div>
                                  <div style={{background:"#f8fafc",border:"1px solid #2d78c833",borderRadius:6,color:"#334155",padding:"6px 8px",fontSize:12,fontWeight:700}}>{(m3Val/undCaja).toFixed(5)} m³</div>
                                </div>
                              )}
                              <div>
                                <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>M³ total carga</div>
                                <div style={{background:"#f0fdf4",border:"1px solid #1aa35844",borderRadius:6,color:"#1aa358",padding:"6px 8px",fontSize:14,fontWeight:800,textAlign:"center"}}>{m3Total} m³</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </BLOCK>
                )}

                {form.tipo==="cliente"&&!esPaso1&&(
                  <BLOCK title="💰 Tu margen ZAGA" accent="#1aa358">
                    {/* Precio final → calcula margen automático */}
                    <div style={{background:"#f0fdf4",borderRadius:9,padding:"12px 14px",marginBottom:14,border:"1px solid #1aa35844"}}>
                      <div style={{fontSize:10,color:"#1aa358",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>💵 Precio de venta al cliente</div>
                      <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                        <div style={{flex:1}}>
                          <label style={{display:"block",fontSize:10,color:"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Precio final $ / und</label>
                          <input
                            type="number"
                            value={form.precio_venta_cliente||""}
                            placeholder={form.precio_china?`Ej: ${Math.ceil((Number(form.precio_china)+Number(form.margen_und||0))/1000)*1000}`:0}
                            onChange={e=>{
                              const pv=Number(e.target.value)||0;
                              const pCh=Number(form.precio_china)||0;
                              const mar=pv>0&&pCh>0?pv-pCh:form.margen_und;
                              setForm(f=>({...f,precio_venta_cliente:e.target.value,margen_und:pv>0&&pCh>0?Math.max(0,mar):""}));
                            }}
                            style={{width:"100%",background:"#f8fafc",border:"1px solid #1aa35866",borderRadius:8,color:"#1aa358",padding:"10px 12px",fontSize:16,fontWeight:800,outline:"none",boxSizing:"border-box"}}
                          />
                        </div>
                        <div style={{textAlign:"center",paddingBottom:10,color:"#64748b",fontSize:18}}>→</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,color:"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Margen $ / und (calculado)</div>
                          <div style={{background:"#f1f5f9",border:"1px solid #1aa35833",borderRadius:8,padding:"10px 12px",fontSize:16,fontWeight:800,color:Number(form.margen_und)>0?"#c9a055":"#555"}}>
                            {Number(form.margen_und)>0?`+ ${fmt(form.margen_und)}`:"—"}
                          </div>
                        </div>
                      </div>
                      {Number(form.precio_china)>0&&Number(form.precio_venta_cliente)>0&&(
                        <div style={{marginTop:8,fontSize:11,color:"#64748b"}}>
                          Markup: <span style={{color:"#334155",fontWeight:700}}>{(((Number(form.precio_venta_cliente)-Number(form.precio_china))/Number(form.precio_china))*100).toFixed(1)}%</span>
                          <span style={{margin:"0 8px",color:"#333"}}>·</span>
                          Precio China: <span style={{color:"#334155"}}>{fmt(form.precio_china)}</span>
                          <span style={{margin:"0 8px",color:"#333"}}>·</span>
                          Diferencia: <span style={{color:"#334155"}}>{fmt(Number(form.precio_venta_cliente)-Number(form.precio_china))}</span>
                        </div>
                      )}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                      <NInput label="% Servicio al cliente" field="pct_servicio" form={form} setForm={setForm} color="#1aa358" note="Ej: 4 = 4%"/>
                      <NInput label="% Comisión préstamo" field="pct_com_prestamo" form={form} setForm={setForm} color="#b8922e" note="Por defecto 6.5%"/>
                      <NInput label="Fulfillment $ / Unidad" field="fulfillment_und" form={form} setForm={setForm} note="Base $1.000"/>
                      <NInput label="% Devolución estimada" field="pct_devolucion" form={form} setForm={setForm} note="Ej: 20 = 20%"/>
                    </div>
                    <div style={{borderTop:"1px solid #e2e8f0",paddingTop:12}}>
                      <div style={{fontSize:11,color:"#c47830",marginBottom:8,fontWeight:600}}>📋 Certificado especial (CDA u otro)</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:8}}>
                        <NInput label="Costo China $" field="cda" form={form} setForm={setForm} color="#c47830" placeholder="0"/>
                        <NInput label="Cobrado cliente $" field="cda_cl" form={form} setForm={setForm} color="#1aa358" placeholder="0"/>
                      </div>
                      <div><label style={{display:"block",fontSize:10,color:"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Descripción</label><input value={form.cda_descripcion||""} placeholder="Ej: CDA, SAG..." onChange={e=>setForm(p=>({...p,cda_descripcion:e.target.value}))} style={{width:"100%",background:"#f8fafc",border:"1px solid #f9741633",borderRadius:8,color:"#0f172a",padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
                    </div>
                  </BLOCK>
                )}

                {form.tipo==="propia"&&!esPaso1&&(
                  <BLOCK title="📈 Estimación de Venta" accent="#3d7fc4">
                    <div style={{fontSize:11,color:"#3d7fc4",marginBottom:12,background:"#8b5cf611",borderRadius:7,padding:"6px 10px",border:"1px solid #8b5cf622"}}>
                      No se cobran servicios adicionales. Solo costo China más tu ganancia estimada de venta.
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                      <NInput label="Precio venta estimado $ / und" field="precio_venta_und" form={form} setForm={setForm} color="#3d7fc4" placeholder="0"/>
                      <NInput label="O bien: % margen objetivo" field="pct_margen_objetivo" form={form} setForm={setForm} color="#3d7fc4" note="Ej: 40 = 40% sobre costo"/>
                    </div>
                    <div style={{borderTop:"1px solid #e2e8f0",paddingTop:12,marginBottom:10}}>
                      <div style={{fontSize:11,color:"#64748b",marginBottom:8,fontWeight:600}}>Canales de venta</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {CANALES.map(c=>{
                          const active=(form.canales||[]).includes(c.key);
                          return(
                            <button key={c.key} onClick={()=>setForm(f=>({...f,canales:active?(f.canales||[]).filter(k=>k!==c.key):[...(f.canales||[]),c.key]}))} style={{background:active?"#eff6ff":"#f8fafc",color:active?"#3d7fc4":"#64748b",border:`1px solid ${active?"#3d7fc466":"#e2e8f0"}`,borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",fontWeight:active?700:400}}>
                              {c.icon} {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {(form.canales||[]).includes("marketplace")&&(
                      <NInput label="% Comisión marketplace" field="pct_comision_marketplace" form={form} setForm={setForm} color="#b8922e" note="Ej: MercadoLibre ~13-17%"/>
                    )}
                  </BLOCK>
                )}
              </div>

              {/* RESULTADOS */}
              <div style={{display:esPaso1?"none":"block"}}>
                {/* TABLA 1: CHINA — siempre igual */}
                <BLOCK title="🧾 Tabla 1 — Cotización China (Costo Real)" accent="#2d78c8">
                  <ROW label="Unidades" value={fmtN(form.unidades||0)}/>
                  <ROW label="Precio China por unidad" value={fmt(form.precio_china||0)}/>
                  <ROW label="Total producto (neto)" value={fmt(calcActual.tChNeto)} big/>
                  {form.requiere_factura&&<ROW label="IVA 19% (compra con factura a China)" value={fmt(calcActual.ivaChina)} accent="#c0392b"/>}
                  {form.requiere_factura&&<ROW label="Total producto con IVA" value={fmt(calcActual.tCh)} accent="#c47830" big/>}
                  <ROW label={`Depósito ${form.pct_deposito}%`} value={fmt(calcActual.dCh)} sub/>
                  <ROW label={`Préstamo ${100-Number(form.pct_deposito)}%`} value={fmt(calcActual.prCh)} sub/>
                  <ROW label="Comisión real según APP" value={fmt(calcActual.comR)} accent="#b8922e"/>
                  {Number(form.cda)>0&&<ROW label={`${form.cda_descripcion||"Certificado especial"}`} value={fmt(calcActual.cda)} accent="#c47830"/>}
                  <div style={{height:6}}/>
                  <PAYBOX label="1er PAGO a China" amount={fmt(calcActual.p1Ch)} color="#2d78c8" detail={`Depósito ${fmt(calcActual.dCh)} + Comisión ${fmt(calcActual.comR)}${Number(form.cda)>0?` + ${form.cda_descripcion||"Certificado"} ${fmt(calcActual.cda)}`:""} (sin IVA)`}/>
                  <PAYBOX label="2do PAGO a China" amount={fmt(calcActual.p2Ch)} color="#2d78c8" detail={form.requiere_factura?`Saldo ${fmt(calcActual.prCh)} + IVA 19% ${fmt(calcActual.ivaChina)}`:"Saldo al recibir la mercancía"}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:9,padding:"10px 14px",marginTop:8}}>
                    <span style={{fontSize:12,color:"#64748b"}}>Costo real por unidad{form.requiere_factura?" (c/IVA China)":""}</span>
                    <span style={{fontSize:19,fontWeight:800,color:"#2d78c8"}}>{fmt(calcActual.cRUnd)}</span>
                  </div>
                </BLOCK>

                {/* TABLA 2: según tipo */}
                {form.tipo==="cliente"&&(
                  <BLOCK title="📄 Tabla 2 — Cotización al Cliente" accent="#1aa358">
                    <ROW label="Precio por unidad (China + margen)" value={fmt(calcActual.pCUnd)} accent="#1aa358" big/>
                    <ROW label="Total importación" value={fmt(calcActual.tCl)}/>
                    <ROW label={`Depósito ${form.pct_deposito}%`} value={fmt(calcActual.dCl)} sub/>
                    <ROW label={`Comisión préstamo ${form.pct_com_prestamo||6.5}%`} value={fmt(calcActual.comCl)} accent="#b8922e"/>
                    {(Number(form.cda_cl)||Number(form.cda))>0&&<ROW label={form.cda_descripcion||"Certificado especial"} value={fmt(calcActual.cdaCl)} accent="#c47830"/>}
                    <ROW label={`Servicio ZAGA ${form.pct_servicio}%`} value={fmt(calcActual.serv)} accent="#1aa358" sub/>
                    {form.con_iva&&<ROW label="IVA 19% (cobrado al cliente)" value={fmt(calcActual.ivaCliente)} accent="#1aa358" sub/>}
                    <div style={{height:6}}/>
                    <PAYBOX label="1er PAGO Cliente" color="#1aa358" amount={form.con_iva?`${fmt(calcActual.p1ClIva)} c/IVA`:fmt(calcActual.p1Cl)} detail={`Depósito ${fmt(calcActual.dCl)} + Comisión ${fmt(calcActual.comCl)}${(Number(form.cda_cl)||Number(form.cda))>0?` + ${form.cda_descripcion||"Certificado"} ${fmt(calcActual.cdaCl)}`:""}`}/>
                    <PAYBOX label="2do PAGO Cliente" color="#1aa358" amount={form.con_iva?`${fmt(calcActual.p2ClIva)} c/IVA`:fmt(calcActual.p2Cl)} detail={`Saldo ${fmt(calcActual.prCl)} + Servicio ${fmt(calcActual.serv)}`}/>
                    <div style={{background:"#f0fdf4",borderRadius:9,padding:"12px 14px",marginTop:8,border:"1px solid #bbf7d0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#64748b"}}>Precio base por unidad</span><span style={{fontSize:15,fontWeight:700,color:"#16a34a"}}>{fmt(calcActual.pCUnd)}</span></div>
                      <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:"#64748b"}}>Precio final / unidad (todo incluido)</span><span style={{fontSize:19,fontWeight:800,color:"#16a34a"}}>{form.con_iva?`${fmt(calcActual.pfUnd*1.19)} c/IVA`:fmt(calcActual.pfUnd)}</span></div>
                    </div>
                  </BLOCK>
                )}

                {form.tipo==="propia"&&(
                  <div style={{background:"#f8fafc",borderRadius:12,padding:20,marginBottom:16,border:"1px solid #e2e8f0"}}>
                    <div style={{fontSize:11,color:"#1d4ed8",letterSpacing:2,fontWeight:700,marginBottom:14,textTransform:"uppercase"}}>📈 Tabla 2 — Estimación de Venta</div>

                    {/* Por precio ingresado */}
                    {Number(form.precio_venta_und)>0&&(
                      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:16,marginBottom:12}}>
                        <div style={{fontSize:12,color:"#3d7fc4",fontWeight:700,marginBottom:10}}>Escenario A — Precio ingresado: {fmt(form.precio_venta_und)} / und</div>
                        <ROW label="Ingreso total estimado" value={fmt(calcActual.ingresoDirecto)}/>
                        <ROW label="Costo total China" value={fmt(calcActual.tCh)} sub/>
                        <ROW label="Ganancia estimada (venta directa)" value={fmt(calcActual.ganDirecto)} accent="#3d7fc4" big/>
                        <ROW label="Markup sobre costo" value={fmtP(calcActual.markup)} accent="#3d7fc4"/>
                        <ROW label="Margen bruto" value={fmtP(calcActual.mgBruto)} accent="#3d7fc4"/>
                        {(form.canales||[]).includes("marketplace")&&Number(form.pct_comision_marketplace)>0&&(
                          <>
                            <div style={{height:6}}/>
                            <ROW label={`Ganancia con marketplace (−${form.pct_comision_marketplace}% comisión)`} value={fmt(calcActual.ganMarketplace)} accent="#b8922e"/>
                            <ROW label="Ingreso neto después de comisión" value={fmt(calcActual.ingresoDespuesComision)} sub/>
                          </>
                        )}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:9,padding:"10px 14px",marginTop:8}}>
                          <span style={{fontSize:12,color:"#64748b"}}>Ganancia por unidad</span>
                          <span style={{fontSize:17,fontWeight:800,color:"#3d7fc4"}}>{fmt((Number(form.precio_venta_und)||0)-(calcActual.cRUnd||0))}</span>
                        </div>
                      </div>
                    )}

                    {/* Por % margen objetivo */}
                    {Number(form.pct_margen_objetivo)>0&&(
                      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:16}}>
                        <div style={{fontSize:12,color:"#3d7fc4",fontWeight:700,marginBottom:10}}>Escenario B — {form.pct_margen_objetivo}% de margen sobre costo</div>
                        <ROW label="Precio de venta sugerido / und" value={fmt(calcActual.pvDesdeMargen)} accent="#3d7fc4" big/>
                        <ROW label="Ganancia estimada total" value={fmt(calcActual.ganMargen)} accent="#3d7fc4"/>
                        <ROW label="Ingreso total estimado" value={fmt(calcActual.pvDesdeMargen*(Number(form.unidades)||0))} sub/>
                        {(form.canales||[]).includes("marketplace")&&Number(form.pct_comision_marketplace)>0&&(
                          <ROW label={`Precio sugerido c/marketplace (para mantener ${form.pct_margen_objetivo}%)`} value={fmt(calcActual.pvDesdeMargen/(1-(Number(form.pct_comision_marketplace)||0)/100))} accent="#b8922e"/>
                        )}
                      </div>
                    )}

                    {!Number(form.precio_venta_und)&&!Number(form.pct_margen_objetivo)&&(
                      <div style={{textAlign:"center",padding:30,color:"#64748b",fontSize:13}}>Ingresa un precio de venta o % de margen para ver la estimación</div>
                    )}
                  </div>
                )}

                {/* TABLA 3: GANANCIA */}
                {form.tipo==="cliente"&&(
                  <div style={{background:"#fffbeb",borderRadius:12,padding:20,marginBottom:16,border:"1px solid #fde68a"}}>
                    <div style={{fontSize:11,color:"#c9a055",letterSpacing:2,fontWeight:700,marginBottom:14,textTransform:"uppercase"}}>⭐ Tabla 3 — Resumen Ganancia ZAGA</div>
                    <ROW label="Ganancia por margen de precio" value={fmt(calcActual.ganMar)} accent="#c9a055"/>
                    <ROW label={`Servicio ZAGA ${form.pct_servicio}%`} value={fmt(calcActual.ganServ)} accent="#c9a055"/>
                    <ROW label="Diferencia comisión (6.5% − real app)" value={fmt(calcActual.difCom)} accent="#aaa" sub/>
                    {calcActual.ganCda!==0&&<ROW label={`Diferencia ${form.cda_descripcion||"Certificado"} (cobrado − costo)`} value={fmt(calcActual.ganCda)} accent={calcActual.ganCda>=0?"#c9a055":"#c0392b"} sub/>}
                    <ROW label="GANANCIA IMPORTACIÓN (sin IVA)" value={fmt(calcActual.ganImp)} big topLine/>
                    {(form.requiere_factura||form.con_iva)&&(
                      <div style={{background:"#fff7ed",borderRadius:8,padding:"12px 14px",margin:"10px 0",border:"1px solid #fed7aa"}}>
                        <div style={{fontSize:10,color:"#92400e",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>🧾 Impacto IVA (Factura)</div>
                        {form.requiere_factura&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"#64748b"}}>IVA pagado a China (19%)</span><span style={{color:"#c0392b",fontWeight:600}}>−{fmt(calcActual.ivaChina)}</span></div>}
                        {form.con_iva&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"#64748b"}}>IVA cobrado al cliente (19%)</span><span style={{color:"#1aa358",fontWeight:600}}>+{fmt(calcActual.ivaCliente)}</span></div>}
                        <div style={{borderTop:"1px solid #c9a05530",paddingTop:8,marginTop:4,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700}}>
                          <span style={{color:"#0f172a"}}>GANANCIA REAL (con IVA)</span>
                          <span style={{color:calcActual.ganImpConIva>=calcActual.ganImp?"#1aa358":"#c0392b",fontSize:16}}>{fmt(calcActual.ganImpConIva)}</span>
                        </div>
                      </div>
                    )}
                    {form.gestor==="luisa"&&calcActual.ganImp>0&&(
                      <div style={{background:"#fdf4ff",borderRadius:8,padding:"10px 14px",margin:"10px 0",border:"1px solid #e9d5ff"}}>
                        <div style={{fontSize:10,color:"#7c3aed",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>👩‍💼 Comisión Luisa (estimada)</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div style={{background:"#f5f3ff",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
                            <div style={{fontSize:9,color:"#64748b",marginBottom:2}}>Si 1–5 cierres mes (20%)</div>
                            <div style={{fontSize:14,fontWeight:800,color:"#7c3aed"}}>{fmt(calcActual.ganImp*0.20)}</div>
                            <div style={{fontSize:10,color:"#1aa358",marginTop:2}}>Empresa: {fmt(calcActual.ganImp*0.80)}</div>
                          </div>
                          <div style={{background:"#f5f3ff",borderRadius:7,padding:"8px 10px",textAlign:"center"}}>
                            <div style={{fontSize:9,color:"#64748b",marginBottom:2}}>Si 6+ cierres mes (25%)</div>
                            <div style={{fontSize:14,fontWeight:800,color:"#7c3aed"}}>{fmt(calcActual.ganImp*0.25)}</div>
                            <div style={{fontSize:10,color:"#1aa358",marginTop:2}}>Empresa: {fmt(calcActual.ganImp*0.75)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,margin:"14px 0"}}>
                      <METRIC label="Markup precio" value={fmtP(calcActual.markup)} sub={`${fmt(calcActual.pCUnd-(Number(form.precio_china)||0))} / und`} color="#c9a055"/>
                      <METRIC label="Margen bruto" value={fmtP(calcActual.mgBrut)} sub="Sobre total cliente" color="#c9a055"/>
                      <METRIC label="ROI sobre costo China" value={fmtP(calcActual.roi)} color="#1aa358"/>
                      <METRIC label="Multiplicador" value={isNaN(calcActual.mult)||!calcActual.mult?"—":`${calcActual.mult.toFixed(2)}×`} color="#1aa358"/>
                    </div>
                    <div style={{background:"#fefce8",borderRadius:9,padding:"12px 14px",marginBottom:14,border:"1px dashed #fde047"}}>
                      <div style={{fontSize:11,color:"#64748b",marginBottom:8,fontWeight:600}}>📦 Estimativo Fulfillment</div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748b"}}>
                        <span>{fmtN(form.unidades||0)} base + {form.pct_devolucion}% dev = {fmtN(calcActual.uFull||0)} und × {fmt(form.fulfillment_und)}</span>
                        <span style={{color:"#c9a055",fontWeight:700}}>{fmt(calcActual.ganFull)}</span>
                      </div>
                      <div style={{fontSize:10,color:"#64748b",marginTop:4}}>* Solo estimativo</div>
                    </div>
                    <div style={{background:"#040c18",borderRadius:10,padding:"16px 18px",border:"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:"#94a3b8"}}>Importación</span><span style={{fontSize:15,fontWeight:700,color:"#c9a055"}}>{fmt(calcActual.ganImp)}</span></div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:13,color:"#94a3b8"}}>Fulfillment (estimado)</span><span style={{fontSize:15,fontWeight:700,color:"#c9a055"}}>{fmt(calcActual.ganFull)}</span></div>
                      <div style={{borderTop:"1px solid #f5c84444",paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,color:"#e2e8f0",fontWeight:600}}>GANANCIA TOTAL ESTIMADA</span><span style={{fontSize:26,fontWeight:800,color:"#c9a055"}}>{fmt(calcActual.ganTot)}</span></div>
                    </div>
                  </div>
                )}

                {/* PASO 1 — solo cuando no hay precio china aún y no es edición con precios */}
                {esPaso1&&form.tipo==="cliente"&&(
                  <div style={{marginBottom:12}}>
                    <div style={{background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:10,padding:"12px 16px",marginBottom:10}}>
                      <div style={{fontSize:11,color:"#334155",fontWeight:700,marginBottom:4}}>📥 PASO 1 — Registrar solicitud del cliente</div>
                      <div style={{fontSize:11,color:"#64748b",lineHeight:1.5}}>¿China aún no te ha respondido el precio? Guarda la solicitud ahora con el link y las variantes. Cuando China responda, editas y agregas el precio para calcular todo.</div>
                    </div>
                    <button onClick={handleSaveSolicitud} style={{width:"100%",background:"#ffffff",border:"2px solid #040c18",borderRadius:10,padding:12,fontSize:13,fontWeight:700,color:"#040c18",cursor:"pointer"}}>
                      📥 Guardar Solicitud (sin precio) - Genera resumen para China
                    </button>
                  </div>
                )}

                <button onClick={handleSave} style={{width:"100%",background:"#040c18",border:"none",borderRadius:10,padding:14,fontSize:15,fontWeight:700,color:"#fff",cursor:"pointer"}}>
                  {editId?"💾 Actualizar cotización completa":"✅ Guardar cotización con precios"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ TRACKER ══ */}
        {tab2==="tracker"&&(
          <div>
            {/* BUSCADOR */}
            <div style={{position:"relative",marginBottom:16}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#64748b",pointerEvents:"none"}}>🔍</span>
              <input
                type="text"
                placeholder="Buscar por nro, cliente, producto o SKU…"
                value={searchQuery}
                onChange={e=>setSearchQuery(e.target.value)}
                style={{width:"100%",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:10,color:"#0f172a",padding:"11px 40px 11px 40px",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border .2s"}}
                onFocus={e=>e.target.style.borderColor="#c9a055"}
                onBlur={e=>e.target.style.borderColor="#1a2d45"}
              />
              {searchQuery&&(
                <button onClick={()=>setSearchQuery("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"#f1f5f9",border:"none",color:"#64748b",borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:12}}>✕</button>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
              {[["Total",cotizaciones.length,"#0f172a"],["Clientes",cotizaciones.filter(c=>c.tipo!=="propia").length,"#1aa358"],["Propias",cotizaciones.filter(c=>c.tipo==="propia").length,"#3d7fc4"],["En tránsito",cotizaciones.filter(c=>["pagada_china","en_camino"].includes(c.estado)).length,"#c47830"],["Completadas",cotizaciones.filter(c=>c.estado==="completada").length,"#0d9870"]].map(([l,v,col])=>(
                <div key={l} style={{background:"#f1f5f9",borderRadius:10,padding:"12px 14px",border:"1px solid #e2e8f0",textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:col}}>{v}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{l}</div></div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>👤 Cliente</span>
              {[["todos","Todos"],["__propias__","🏠 Propias"],...clientesUnicos.map(cl=>[cl,cl])].map(([k,l])=>{
                const cnt=k==="todos"?cotizaciones.length:k==="__propias__"?cotizaciones.filter(c=>c.tipo==="propia").length:cotizaciones.filter(c=>c.cliente===k).length;
                if(k!=="todos"&&k!=="__propias__"&&cnt===0) return null;
                return(
                  <button key={k} onClick={()=>setFilterCliente(k)} style={{
                    background:filterCliente===k?"#1aa35822":"#f8fafc",
                    color:filterCliente===k?"#1aa358":"#666",
                    border:`1px solid ${filterCliente===k?"#22c55e55":"#1a2d45"}`,
                    borderRadius:20,padding:"5px 14px",fontSize:12,cursor:"pointer",
                    fontWeight:filterCliente===k?700:400
                  }}>{l} <span style={{opacity:.6}}>({cnt})</span></button>
                );
              })}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🙋 Gestor</span>
              {[["todos","Todos",null],["francisco","👤 Francisco","#2d78c8"],["luisa","👩‍💼 Luisa","#a85590"]].map(([k,l,col])=>{
                const cnt=k==="todos"?cotizaciones.length:k==="francisco"?cotizaciones.filter(c=>c.gestor===k||(!c.gestor&&k==="francisco")).length:cotizaciones.filter(c=>c.gestor===k).length;
                return(
                  <button key={k} onClick={()=>setFilterGestor(k)} style={{
                    background:filterGestor===k?(col||"#c9a055")+"22":"#f8fafc",
                    color:filterGestor===k?(col||"#c9a055"):"#666",
                    border:`1px solid ${filterGestor===k?(col||"#c9a055")+"55":"#e2e8f0"}`,
                    borderRadius:20,padding:"5px 14px",fontSize:12,cursor:"pointer",
                    fontWeight:filterGestor===k?700:400
                  }}>{l} <span style={{opacity:.6}}>({cnt})</span></button>
                );
              })}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>📋 Estado</span>
              {[["todos","Todos",null],...Object.entries(EST_LABEL).map(([k,l])=>[k,l,EST_COLOR[k]])].map(([k,l,col])=>{
                // Base filtrada por cliente + gestor + búsqueda (sin filtro de estado) para conteos precisos
                const baseParaConteo=cotizaciones.filter(c=>{
                  if(c.id===openId) return false; // no contar el abierto doble
                  const passCliente=filterCliente==="todos"||(filterCliente==="__propias__"?c.tipo==="propia":c.cliente===filterCliente);
                  const passGestor=filterGestor==="todos"||c.gestor===filterGestor||(filterGestor==="francisco"&&!c.gestor);
                  const q=searchQuery.trim().toLowerCase();
                  const passSearch=!q||(c.nro&&c.nro.toString().toLowerCase().includes(q))||(c.cliente&&c.cliente.toLowerCase().includes(q))||(c.producto&&c.producto.toLowerCase().includes(q));
                  return passCliente&&passGestor&&passSearch;
                });
                const cnt=k==="todos"?baseParaConteo.length:baseParaConteo.filter(c=>c.estado===k).length;
                if(k!=="todos"&&cnt===0) return null;
                return(<button key={k} onClick={()=>setFilterEstado(k)} style={{background:filterEstado===k?(col||"#c9a055")+"22":"#f8fafc",color:filterEstado===k?(col||"#c9a055"):"#666",border:`1px solid ${filterEstado===k?(col||"#c9a055")+"55":"#e2e8f0"}`,borderRadius:20,padding:"5px 14px",fontSize:12,cursor:"pointer"}}>{l} ({cnt})</button>);
              })}
            </div>
            {searchQuery&&<div style={{marginBottom:12,fontSize:12,color:"#64748b"}}>
              {filtradas.length>0?<span><span style={{color:"#0f172a",fontWeight:700}}>{filtradas.length}</span> resultado{filtradas.length!==1?"s":""} para <span style={{color:"#0f172a"}}>"{searchQuery}"</span></span>:<span style={{color:"#c0392b"}}>Sin resultados para "{searchQuery}"</span>}
            </div>}
            {filtradas.length===0&&<div style={{textAlign:"center",padding:60,color:"#444"}}><div style={{fontSize:40,marginBottom:12}}>{searchQuery?"🔍":"📦"}</div><div>{searchQuery?`No se encontraron cotizaciones con "${searchQuery}"`:"No hay registros. ¡Empieza en la Calculadora!"}</div></div>}

            {/* ── PANEL DE ALERTAS ── */}
            {(()=>{
              const hoy=new Date();
              const alertas=[];

              cotizaciones.forEach(c=>{
                // 1. En tránsito > 90 días sin llegar
                if(c.checklist?.pago_china&&!c.fecha_llegada_real&&c.fecha_llegada_est){
                  const fPago=new Date(c.fecha_llegada_est); fPago.setDate(fPago.getDate()-90);
                  const dias=Math.round((hoy-fPago)/(1000*60*60*24));
                  if(dias>90) alertas.push({nivel:"critico",ico:"🚨",titulo:`${c.nro} — ${c.producto}`,msg:`${dias} días en tránsito sin llegar a Chile (límite: 90d)`,id:c.id,accion:"gestionar"});
                  else if(dias>75) alertas.push({nivel:"warning",ico:"⚠️",titulo:`${c.nro} — ${c.producto}`,msg:`${dias} días en tránsito — se acerca al límite de 90d`,id:c.id,accion:"gestionar"});
                }

                // 2. Fecha de llegada estimada vencida y no llegó
                if(c.fecha_llegada_est&&!c.fecha_llegada_real&&c.checklist?.pago_china){
                  const diasAtraso=Math.round((hoy-new Date(c.fecha_llegada_est))/(1000*60*60*24));
                  if(diasAtraso>0) alertas.push({nivel:"critico",ico:"📅",titulo:`${c.nro} — ${c.producto}`,msg:`Llegada estimada vencida hace ${diasAtraso} día${diasAtraso!==1?"s":""} (${c.fecha_llegada_est})`,id:c.id,accion:"gestionar"});
                }

                // 3. Cotización enviada al cliente sin respuesta > 7 días
                if(c.estado==="enviada_cliente"&&c.fecha_solicitud){
                  const diasEspera=Math.round((hoy-new Date(c.fecha_solicitud))/(1000*60*60*24));
                  if(diasEspera>7) alertas.push({nivel:"warning",ico:"👤",titulo:`${c.nro} — ${c.producto}`,msg:`Sin respuesta del cliente hace ${diasEspera} días (enviada ${c.fecha_solicitud})`,id:c.id,accion:"gestionar"});
                }

                // 4. Mercadería en bodega con 2do pago cliente pendiente
                if(c.estado==="en_bodega"&&!c.checklist?.pago2_cliente&&c.tipo!=="propia"){
                  alertas.push({nivel:"warning",ico:"💰",titulo:`${c.nro} — ${c.cliente||c.producto}`,msg:`Mercadería en bodega con 2do pago cliente pendiente de cobrar (${fmt(c.calc?.p2Cl)})`,id:c.id,accion:"gestionar"});
                }

                // 5. Fulfillment pendiente de crear producto
                if(c.fulfillment_cliente!==false&&!c.fulfillment_producto_creado&&c.checklist?.retirado_bodega){
                  alertas.push({nivel:"info",ico:"🚚",titulo:`${c.nro} — ${c.producto}`,msg:`Producto en bodega pero pendiente de crear en sistema de fulfillment`,id:c.id,accion:"gestionar"});
                }

                // 6. Negociación con propuestas pendientes > 5 días
                const pendientes=(c.negociacion_rondas||[]).filter(r=>r.estado==="pendiente");
                if(pendientes.length>0){
                  const ultima=pendientes[pendientes.length-1];
                  const diasNeg=Math.round((hoy-new Date(ultima.fecha))/(1000*60*60*24));
                  if(diasNeg>5) alertas.push({nivel:"info",ico:"🤝",titulo:`${c.nro} — ${c.producto}`,msg:`Propuesta de negociación enviada hace ${diasNeg} días sin respuesta de China`,id:c.id,accion:"gestionar"});
                }

                // 7. Primer pago recibido pero sin dimensiones ingresadas
                const tienePrimerPago=c.checklist?.pago1_cliente||c.checklist?.pago_china;
                const sinDimensiones=!c.dim_largo||!c.dim_ancho||!c.dim_alto;
                const sinCajas=c.dim_tipo==="caja"&&!c.dim_und_caja;
                const activa=!["completada","rechazada_cliente","anulada","no_procesada"].includes(c.estado);
                if(tienePrimerPago&&activa&&(sinDimensiones||sinCajas)){
                  const que=sinDimensiones?"dimensiones (L×A×H)":"unidades por caja";
                  alertas.push({nivel:"info",ico:"📐",titulo:`${c.nro} — ${c.cliente||c.producto}`,msg:`Pago recibido pero sin ${que} — proyección M³ incompleta`,id:c.id,accion:"dimensiones"});
                }
              });

              if(alertas.length===0) return null;

              const criticas=alertas.filter(a=>a.nivel==="critico");
              const warnings=alertas.filter(a=>a.nivel==="warning");
              const infos=alertas.filter(a=>a.nivel==="info");

              return(
                <div style={{marginBottom:20,background:"#fff1f2",border:"1px solid #fecdd3",borderRadius:12,overflow:"hidden"}}>
                  <div style={{padding:"12px 18px",background:"#fef2f2",borderBottom:"1px solid #fecdd3",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:16}}>🔔</span>
                      <span style={{fontWeight:700,fontSize:13,color:"#c0392b"}}>Centro de Alertas</span>
                      <span style={{fontSize:12,color:"#64748b"}}>—</span>
                      <span style={{fontSize:12,color:"#64748b"}}>{alertas.length} alerta{alertas.length!==1?"s":""} activa{alertas.length!==1?"s":""}</span>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {criticas.length>0&&<span style={{background:"#ef444422",color:"#c0392b",border:"1px solid #ef444444",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>🚨 {criticas.length} crítica{criticas.length!==1?"s":""}</span>}
                      {warnings.length>0&&<span style={{background:"#b8922e22",color:"#b8922e",border:"1px solid #f59e0b44",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>⚠️ {warnings.length} aviso{warnings.length!==1?"s":""}</span>}
                      {infos.length>0&&<span style={{background:"#2d78c822",color:"#2d78c8",border:"1px solid #3b82f644",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>ℹ️ {infos.length} info</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {alertas.map((a,i)=>{
                      const cfg={
                        critico:{bg:"#1a0a0a",border:"#c0392b33",icon_bg:"#ef444422",color:"#c0392b"},
                        warning:{bg:"#12160a",border:"#b8922e33",icon_bg:"#b8922e22",color:"#b8922e"},
                        info:{bg:"#0a1020",border:"#2d78c833",icon_bg:"#2d78c822",color:"#2d78c8"},
                      }[a.nivel];
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px",background:cfg.bg,borderBottom:i<alertas.length-1?`1px solid ${cfg.border}`:"none"}}>
                          <div style={{width:32,height:32,borderRadius:8,background:cfg.icon_bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{a.ico}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:700,color:cfg.color,marginBottom:2}}>{a.titulo}</div>
                            <div style={{fontSize:11,color:"#64748b"}}>{a.msg}</div>
                          </div>
                          <button onClick={()=>{
                            setTab("tracker");
                            setFilterEstado("todos");
                            if(a.accion==="dimensiones"){
                              setOpenId(a.id);
                              setTimeout(()=>{
                                const el=document.getElementById(`dim-section-${a.id}`);
                                if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
                              },300);
                            } else if(a.accion==="gestionar"){
                              setOpenId(a.id);
                            } else {
                              setPreviewId(a.id);
                            }
                          }} style={{background:cfg.icon_bg,color:cfg.color,border:`1px solid ${cfg.border}`,borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                            {a.accion==="dimensiones"?"📐 Completar →":a.accion==="gestionar"?"Gestionar →":"Ver →"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {filtradas.map(c=>{
                const sc=EST_COLOR[c.estado]||"#888", sl=EST_LABEL[c.estado]||c.estado;
                const prog=checkProg(c), isOpen=openId===c.id, isPropia=c.tipo==="propia";
                const TL_CLIENTE=["solicitud","enviado_china","respuesta_china","enviada_cliente","en_negociacion","re_testeando","aceptada","pagada_china","en_camino","en_bodega","completada"];
                const TL_PROPIA=["solicitud","enviado_china","respuesta_china","pagada_china","en_camino","en_bodega","completada"];
                const tlSteps=isPropia?TL_PROPIA:TL_CLIENTE;
                const tlIdx=c.estado==="no_procesada"?0:Math.max(0,tlSteps.indexOf(c.estado));
                const tlProg={done:tlIdx,total:tlSteps.length-1};
                const diasLL=c.fecha_llegada_est?Math.round((new Date(c.fecha_llegada_est)-new Date())/(1000*60*60*24)):null;
                let tiempoRealTransito=null;
                if(c.fecha_llegada_real&&c.checklist?.pago_china){
                  const fPago=c.fecha_pago_china?new Date(c.fecha_pago_china):(()=>{const d=new Date(c.fecha_llegada_est||new Date());d.setDate(d.getDate()-90);return d;})();
                  tiempoRealTransito=Math.round((new Date(c.fecha_llegada_real)-fPago)/(1000*60*60*24));
                }
                let diasEnTransito=null;
                if(c.checklist?.pago_china&&!c.fecha_llegada_real){
                  const fPago=c.fecha_pago_china?new Date(c.fecha_pago_china):(()=>{const d=new Date(c.fecha_llegada_est||new Date());d.setDate(d.getDate()-90);return d;})();
                  diasEnTransito=Math.round((new Date()-fPago)/(1000*60*60*24));
                }
                const chklDef=getChecklist(c);
                return(
                  <div key={c.id} id={`card-${c.id}`} style={{background:"#f1f5f9",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden"}}>
                    <div style={{padding:20,borderLeft:`4px solid ${isPropia?"#3d7fc4":sc}`}}>
                      <div className="cot-card-row" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                            {isPropia?<span style={{background:"#3d7fc422",color:"#3d7fc4",border:"1px solid #8b5cf644",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>🏠 PROPIA</span>:<span style={{fontWeight:700,fontSize:15}}>{c.cliente}</span>}
                            {!isPropia&&c.categoria_cliente==="premium"&&<span style={{background:"#c9a05522",color:"#c9a055",border:"1px solid #f5c84244",borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700}}>⭐ Premium</span>}
                            {!isPropia&&c.categoria_cliente==="recurrente"&&<span style={{background:"#22c55e18",color:"#1aa358",border:"1px solid #22c55e33",borderRadius:20,padding:"2px 9px",fontSize:10}}>🔄 Recurrente</span>}
                            {!isPropia&&(!c.categoria_cliente||c.categoria_cliente==="nuevo")&&<span style={{background:"#06b6d418",color:"#2a8aaa",border:"1px solid #06b6d433",borderRadius:20,padding:"2px 9px",fontSize:10}}>🆕 Nuevo</span>}
                            {c.transporte==="aereo"&&<span style={{background:"#c4783022",color:"#f97416",border:"1px solid #f9741633",borderRadius:20,padding:"2px 9px",fontSize:10}}>✈️ Aéreo</span>}
                            {c.transporte==="ambos"&&<span style={{background:"#3d7fc422",color:"#3d7fc4",border:"1px solid #8b5cf633",borderRadius:20,padding:"2px 9px",fontSize:10}}>🚢✈️ Ambos</span>}
                            {c.gestor==="luisa"&&<span style={{background:"#a8559022",color:"#a85590",border:"1px solid #ec489933",borderRadius:20,padding:"2px 9px",fontSize:10}}>👩‍💼 Luisa</span>}
                            <span style={{fontSize:11,color:"#64748b"}}>{c.nro}</span>
                            <span style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{sl}</span>
                            {diasLL!==null&&c.checklist?.pago_china&&!c.fecha_llegada_real&&<span style={{background:"#f9741618",color:"#c47830",border:"1px solid #f9741633",borderRadius:20,padding:"2px 10px",fontSize:11}}>{diasLL>0?`🚢 ${diasLL}d`:diasLL===0?"¡Llega hoy!":`⚠️ ${Math.abs(diasLL)}d tarde`}</span>}
                            {c.fulfillment_cliente&&<span style={{background:"#2a8aaa22",color:"#2a8aaa",border:"1px solid #06b6d433",borderRadius:20,padding:"2px 10px",fontSize:11}}>🚚 Fulfillment{c.fulfillment_producto_creado?" ✓":""}</span>}
                            {c.estado==="en_negociacion"&&(c.negociacion_rondas||[]).length>0&&<span style={{background:"#b8922e22",color:"#b8922e",border:"1px solid #f59e0b44",borderRadius:20,padding:"2px 10px",fontSize:11}}>🤝 {(c.negociacion_rondas||[]).filter(r=>r.estado==="pendiente").length} propuesta{(c.negociacion_rondas||[]).filter(r=>r.estado==="pendiente").length!==1?"s":""} pendiente{(c.negociacion_rondas||[]).filter(r=>r.estado==="pendiente").length!==1?"s":""}</span>}
                          </div>
                          <div style={{color:"#64748b",fontSize:13,marginBottom:2}}>{c.producto} · {fmtN(c.unidades)} und</div>
                          {(c.sku_china||c.sku_bodega)&&(
                            <div style={{fontSize:11,marginBottom:2}}>
                              {c.sku_china&&<span style={{color:"#b8922e"}}>🏷 SKU China: <b>{c.sku_china}</b></span>}
                              {c.sku_china&&c.sku_bodega&&<span style={{color:"#64748b"}}> · </span>}
                              {c.sku_bodega&&<span style={{color:"#3d7fc4"}}>📦 Bodega: <b>{c.sku_bodega}</b></span>}
                            </div>
                          )}
                          {c.notas&&<div style={{color:"#64748b",fontSize:12}}>📝 {c.notas}</div>}
                          {(()=>{
                            var ult = (c.notas_historial&&c.notas_historial.length>0)?c.notas_historial[c.notas_historial.length-1]:null
                            var txt = ult?ult.texto:(c.notas_internas||null)
                            return txt&&<div style={{color:"#2a8aaa",fontSize:11,marginTop:2}}>📌 {txt.length>80?txt.substring(0,80)+"…":txt}</div>
                          })()}
                          {c.link_alibaba&&<a href={c.link_alibaba} target="_blank" rel="noopener noreferrer" style={{color:"#2d78c8",fontSize:11}}>🔗 Referencia</a>}
                          {diasEnTransito!==null&&<div style={{fontSize:11,color:"#b8922e",marginTop:2}}>⏱ En tránsito: {diasEnTransito}d</div>}
                          {c.fecha_llegada_real&&<div style={{fontSize:11,color:"#0d9870",marginTop:2}}>✅ Llegó a bodega: {c.fecha_llegada_real}{tiempoRealTransito!==null?` · ${tiempoRealTransito}d de tránsito`:""}</div>}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                            <div style={{flex:1,height:4,background:"#f1f5f9",borderRadius:4,overflow:"hidden",position:"relative"}}>
                              <div style={{height:"100%",background:`linear-gradient(to right,${EST_COLOR[tlSteps[0]]||"#6a9fd4"},${EST_COLOR[c.estado]||"#1aa358"})`,borderRadius:4,width:(c.estado==="no_procesada"||c.estado==="rechazada_cliente"||c.estado==="anulada")?"0%":`${(tlProg.done/tlProg.total)*100}%`,transition:"width .4s"}}/>
                            </div>
                            <span style={{fontSize:11,color:(c.estado==="no_procesada"||c.estado==="rechazada_cliente"||c.estado==="anulada")?"#c0392b":EST_COLOR[c.estado]||"#555",fontWeight:600,whiteSpace:"nowrap"}}>
                              {(c.estado==="no_procesada"||c.estado==="rechazada_cliente"||c.estado==="anulada")?"🚫":`${tlProg.done}/${tlProg.total}`}
                            </span>
                            <span style={{fontSize:10,color:"#333",whiteSpace:"nowrap"}}>({prog.done}/{prog.total} ✓)</span>
                          </div>
                        </div>
                        <div className="cot-card-right" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,minWidth:220,marginLeft:16}}>
                          <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                            <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>{isPropia?"Costo real/und":"Precio/und cliente"}</div>
                            <div style={{fontSize:13,fontWeight:700,color:isPropia?"#2d78c8":"#1aa358"}}>{fmt(isPropia?c.calc?.cRUnd:c.calc?.pCUnd)}</div>
                          </div>
                          <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                            <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>{isPropia?"Precio venta est.":"ROI"}</div>
                            <div style={{fontSize:13,fontWeight:700,color:isPropia?"#3d7fc4":"#475569"}}>{isPropia?fmt(c.calc?.pvUnd||c.precio_venta_und||0):fmtP(c.calc?.roi)}</div>
                          </div>
                          <div style={{background:isPropia?"#eff6ff":"#fffbeb",borderRadius:8,padding:"8px 10px",textAlign:"center",gridColumn:"1/-1",border:`1px solid ${isPropia?"#bfdbfe":"#fde68a"}`}}>
                            <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>Ganancia estimada</div>
                            <div style={{fontSize:17,fontWeight:800,color:isPropia?"#1d4ed8":"#92400e"}}>{fmt(isPropia?(c.calc?.ganDirecto||0):(c.calc?.ganImp||0))}</div>
                          </div>
                        </div>
                      </div>
                      {c.calc&&(
                        <div className="cot-card-meta" style={{display:"grid",gridTemplateColumns:isPropia?"repeat(4,1fr)":"repeat(3,1fr)",gap:8,background:"#f8fafc",borderRadius:9,padding:"10px 14px",marginTop:12}}>
                        {isPropia
                          ? [["Costo total China",fmt(c.calc.tCh||0),"#2d78c8"],["Costo real/und",fmt(c.calc.cRUnd||0),"#2d78c8"],["Precio venta/und",fmt(c.calc.pvUnd||0),"#3d7fc4"],["Margen bruto",fmtP(c.calc.mgBruto),"#475569"]]
                              .map(([l,v,col])=>(<div key={l} style={{textAlign:"center"}}><div style={{fontSize:10,color:"#444",marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:600,color:col}}>{v}</div></div>))
                          : (<>
                              {/* Bloque 1er pago */}
                              <div style={{background:"#fff",borderRadius:7,padding:"8px 10px",border:"1px solid #e2e8f0"}}>
                                <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:.5,marginBottom:4,fontWeight:600}}>1er Pago</div>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}>
                                  <div style={{textAlign:"center",flex:1}}>
                                    <div style={{fontSize:9,color:"#64748b",marginBottom:1}}>Cliente</div>
                                    <div style={{fontSize:12,fontWeight:700,color:"#1aa358"}}>{fmt(c.calc.p1Cl||0)}</div>
                                  </div>
                                  <div style={{width:1,height:24,background:"#e2e8f0"}}/>
                                  <div style={{textAlign:"center",flex:1}}>
                                    <div style={{fontSize:9,color:"#64748b",marginBottom:1}}>China</div>
                                    <div style={{fontSize:12,fontWeight:700,color:"#2d78c8"}}>{fmt(c.calc.p1Ch||0)}</div>
                                  </div>
                                </div>
                              </div>
                              {/* Bloque 2do pago */}
                              <div style={{background:"#fff",borderRadius:7,padding:"8px 10px",border:"1px solid #e2e8f0"}}>
                                <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:.5,marginBottom:4,fontWeight:600}}>2do Pago</div>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}>
                                  <div style={{textAlign:"center",flex:1}}>
                                    <div style={{fontSize:9,color:"#64748b",marginBottom:1}}>Cliente</div>
                                    <div style={{fontSize:12,fontWeight:700,color:"#1aa358"}}>{fmt(c.calc.p2Cl||0)}</div>
                                  </div>
                                  <div style={{width:1,height:24,background:"#e2e8f0"}}/>
                                  <div style={{textAlign:"center",flex:1}}>
                                    <div style={{fontSize:9,color:"#64748b",marginBottom:1}}>China</div>
                                    <div style={{fontSize:12,fontWeight:700,color:"#2d78c8"}}>{fmt(c.calc.p2Ch||0)}</div>
                                  </div>
                                </div>
                              </div>
                              {/* Bloque Total */}
                              <div style={{background:"#fff",borderRadius:7,padding:"8px 10px",border:"1px solid #e2e8f0"}}>
                                <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:.5,marginBottom:4,fontWeight:600}}>Total</div>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}>
                                  <div style={{textAlign:"center",flex:1}}>
                                    <div style={{fontSize:9,color:"#64748b",marginBottom:1}}>Cliente</div>
                                    <div style={{fontSize:12,fontWeight:700,color:"#1aa358"}}>{fmt(c.calc.totCl||0)}</div>
                                  </div>
                                  <div style={{width:1,height:24,background:"#e2e8f0"}}/>
                                  <div style={{textAlign:"center",flex:1}}>
                                    <div style={{fontSize:9,color:"#64748b",marginBottom:1}}>China</div>
                                    <div style={{fontSize:12,fontWeight:700,color:"#2d78c8"}}>{fmt(c.calc.tCh||0)}</div>
                                  </div>
                                </div>
                              </div>
                            </>)
                        }
                        </div>
                      )}
                      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                        <button onClick={()=>setPreviewId(c.id)} style={{background:"#f8fafc",color:"#475569",border:"1px solid #e2e8f0",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>👁 Ver</button>
                        {c.estado==="solicitud"&&<button onClick={()=>setResumenChina(c)} style={{background:"#6a9fd422",color:"#334155",border:"1px solid #ddd6fe",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>📋 Resumen China</button>}
                        <button onClick={()=>setOpenId(isOpen?null:c.id)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>{isOpen?"▲ Cerrar":"▼ Gestionar"}</button>
                        {!isPropia&&<button onClick={()=>setVistaId(c.id)} style={{background:"#2a8aaa22",color:"#2a8aaa",border:"1px solid #06b6d433",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>📄 Vista cliente</button>}
                        <button onClick={()=>handleEdit(c)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>✏️ Editar</button>
                        <button onClick={()=>handleDelete(c.id)} style={{background:"#fff1f2",color:"#c0392b",border:"1px solid #ef444433",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>🗑</button>
                      </div>
                    </div>
                    {isOpen&&<CardErrorBoundary>{(()=>{
                      const CHKL_LABELS={cot_enviada:"Cotización enviada al cliente",cliente_acepto:"Cliente aceptó",pago1_cliente:"1er pago recibido del cliente",factura1:"Factura 1er pago emitida",pago_china:"Pago a China realizado",en_produccion:"En proceso de producción",almacen_china:"Ingreso en almacén de China",ctrl_calidad:"Control de calidad en China OK",despachado:"Despachado desde China",llego_chile:"Llegó a Chile",retirado_bodega:"Retirado a mi bodega",pago2_cliente:"2do pago recibido del cliente",factura2:"Factura 2do pago emitida",en_venta:"Producto en venta / publicado",vendido_50:"50% vendido",vendido_100:"100% vendido"};
                      const CLIENTE_STEPS=[
                        {estado:"solicitud",       icon:"📥",label:"Solicitud recibida",           color:"#334155",checks:[]},
                        {estado:"enviado_china",   icon:"📨",label:"Enviado a China",               color:"#2a8aaa",checks:[]},
                        {estado:"respuesta_china", icon:"🇨🇳",label:"Respuesta recibida de China",  color:"#b8922e",checks:[],special:"respuesta"},
                        {estado:"enviada_cliente", icon:"📤",label:"Enviada al cliente",             color:"#2d78c8",checks:[],special:"decision"},
                        {estado:"re_testeando",    icon:"🔄",label:"Re-testeando",                  color:"#334155",checks:[],special:"retesteando"},
                        {estado:"en_negociacion",  icon:"🤝",label:"En negociación",                color:"#c47830",checks:[],special:"neg"},
                        {estado:"rechazada_cliente",icon:"❌",label:"Rechazada por el cliente",     color:"#c0392b",checks:[],special:"rechazada"},
                        {estado:"aceptada",        icon:"✅",label:"Aceptada",                      color:"#1aa358",checks:[]},
                        {estado:"pagada_china",    icon:"💳",label:"Pagada / Importando",           color:"#c47830",checks:["pago1_cliente","factura1","pago_china","en_produccion","almacen_china","ctrl_calidad"]},
                        {estado:"en_camino",       icon:"🚢",label:"En camino",                     color:"#a85590",checks:[]},
                        {estado:"en_bodega",       icon:"📦",label:"Disponible para retirar",       color:"#3d7fc4",checks:["llego_chile","pago2_cliente","factura2"]},
                        {estado:"completada",      icon:"🎉",label:"Completada",                    color:"#0d9870",checks:["retirado_bodega"]},
                      ];
                      const PROPIA_STEPS=[
                        {estado:"solicitud",     icon:"📥",label:"Solicitud recibida",         color:"#334155",checks:[]},
                        {estado:"enviado_china", icon:"📨",label:"Enviado a China",             color:"#2a8aaa",checks:[]},
                        {estado:"respuesta_china",icon:"🇨🇳",label:"Respuesta recibida de China",color:"#b8922e",checks:[],special:"respuesta"},
                        {estado:"pagada_china",  icon:"💳",label:"Pagada / Importando",         color:"#c47830",checks:["pago_china","en_produccion","almacen_china","ctrl_calidad"]},
                        {estado:"en_camino",     icon:"🚢",label:"En camino",                   color:"#a85590",checks:["despachado"]},
                        {estado:"en_bodega",     icon:"📦",label:"Disponible para retirar",                color:"#3d7fc4",checks:["llego_chile","retirado_bodega"]},
                        {estado:"completada",    icon:"🎉",label:"Completada",                  color:"#0d9870",checks:["en_venta","vendido_50","vendido_100"]},
                      ];
                      const steps=isPropia?PROPIA_STEPS:CLIENTE_STEPS;
                      const curIdx=steps.findIndex(s=>s.estado===c.estado);
                      const isNoProcesada=c.estado==="no_procesada";
                      const isTerminal=isNoProcesada||c.estado==="rechazada_cliente"||c.estado==="anulada";
                      return (
                        <div style={{borderTop:"1px solid #e2e8f0",padding:"20px 24px"}}>
                          {/* Fechas */}
                          <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
                            <div style={{flex:1,minWidth:150}}>
                              <div style={{fontSize:10,color:"#64748b",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>📅 Llegada estimada</div>
                              <input type="date" value={c.fecha_llegada_est||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,fecha_llegada_est:e.target.value}:x));}} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:7,color:"#0f172a",padding:"6px 10px",fontSize:12,outline:"none",width:"100%",boxSizing:"border-box"}}/>
                            </div>
                            <div style={{flex:1,minWidth:150}}>
                              <div style={{fontSize:10,color:"#0d9870",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>✅ Llegada real a bodega</div>
                              <input type="date" value={c.fecha_llegada_real||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,fecha_llegada_real:e.target.value}:x));}} style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,color:"#16a34a",padding:"6px 10px",fontSize:12,outline:"none",width:"100%",boxSizing:"border-box"}}/>
                              {c.fecha_llegada_real&&c.checklist?.pago_china&&(<div style={{fontSize:10,color:"#0d9870",marginTop:3}}>{(()=>{const fP=c.fecha_pago_china?new Date(c.fecha_pago_china):(()=>{const d=new Date(c.fecha_llegada_est||new Date());d.setDate(d.getDate()-90);return d;})();const d=Math.round((new Date(c.fecha_llegada_real)-fP)/(1000*60*60*24));return `Tránsito real: ${d}d ${d<=90?"✓":"(excedió)"}`;})()}</div>)}
                            </div>
                          </div>

                          {/* ── LÍNEA DE TIEMPO UNIFICADA ── */}
                          <div style={{position:"relative",paddingLeft:44}}>
                            {/* línea vertical de fondo */}
                            <div style={{position:"absolute",left:16,top:14,bottom:14,width:2,background:"#e2e8f0",borderRadius:2}}/>
                            {/* línea de progreso */}
                            {curIdx>0&&!isTerminal&&(
                              <div style={{position:"absolute",left:16,top:14,width:2,height:`${Math.min(100,(curIdx/(steps.length-1))*100)}%`,background:`linear-gradient(to bottom,#a78bfa,${steps[Math.min(curIdx,steps.length-1)].color})`,borderRadius:2,transition:"height .4s"}}/>
                            )}

                            {steps.map((step,idx)=>{
                              const isDone=(curIdx>idx)&&!isTerminal;
                              const isCurrent=c.estado===step.estado;
                              const isFuture=curIdx<idx||isTerminal;
                              const dotColor=isCurrent?step.color:isDone?"#0d9870":"#1a2d45";

                              // Ocultar nodos alternativos que no aplican al estado actual
                              const alternativeSteps=["re_testeando","en_negociacion","rechazada_cliente"];
                              if(alternativeSteps.includes(step.estado)){
                                // Solo mostrar si ES el estado actual, o si fue el estado anterior en el camino
                                // (mostramos solo si está activo o fue el camino recorrido)
                                if(!isCurrent&&!isDone) return null;
                              }

                              return (
                                <div key={step.estado} style={{position:"relative",paddingBottom:idx<steps.length-1?20:0}}>
                                  {/* dot */}
                                  <div onClick={()=>handleEstado(c.id,step.estado)} title={`Ir a: ${step.label}`} style={{position:"absolute",left:-44,top:0,width:32,height:32,borderRadius:"50%",background:isCurrent?step.color+"22":isDone?"#10b98115":"#f8fafc",border:`2px solid ${dotColor}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:isDone?14:13,boxShadow:isCurrent?`0 0 14px ${step.color}55`:"none",transition:"all .2s",zIndex:2}}>
                                    {isDone?<span style={{color:"#0d9870",fontWeight:900}}>✓</span>:<span style={{opacity:isFuture?.35:1}}>{step.icon}</span>}
                                  </div>

                                  {/* label */}
                                  <div style={{display:"flex",alignItems:"center",gap:8,minHeight:32}}>
                                    <span onClick={()=>handleEstado(c.id,step.estado)} style={{fontSize:13,fontWeight:isCurrent?700:isDone?500:400,color:isCurrent?step.color:isDone?"#64748b":"#94a3b8",cursor:"pointer",transition:"color .2s"}}>
                                      {step.label}
                                    </span>
                                    {isCurrent&&!isTerminal&&(
                                      <span style={{background:step.color+"22",color:step.color,fontSize:9,fontWeight:700,borderRadius:20,padding:"2px 8px",textTransform:"uppercase",letterSpacing:1,border:`1px solid ${step.color}44`}}>Actual</span>
                                    )}
                                  </div>

                                  {/* sub-checklist - visible cuando actual o pasado */}
                                  {(isCurrent||isDone)&&step.checks.length>0&&(
                                    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6,marginBottom:4}}>
                                      {step.checks.map(key=>{
                                        const isFactura=key.startsWith("factura");
                                        const disabled=isFactura&&!c.requiere_factura;
                                        const lbl=isFactura?(c.requiere_factura?CHKL_LABELS[key]+" ✱":CHKL_LABELS[key]+" (no req.)"):CHKL_LABELS[key];
                                        return <CheckItem key={key} label={lbl} checked={c.checklist?.[key]||false} onChange={v=>handleCheck(c.id,key,v)} disabled={disabled}/>;
                                      })}
                                    </div>
                                  )}

                                  {/* ── PANEL RESPUESTA CHINA ── */}
                                  {isCurrent&&step.special==="respuesta"&&(
                                    <div style={{marginTop:12,marginBottom:4,background:"#fffbeb",borderRadius:12,padding:16,border:"1px solid #fde68a"}}>
                                      <div style={{fontSize:11,color:"#92400e",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>🇨🇳 ¿Qué respondió China?</div>
                                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                        <button onClick={()=>handleEstado(c.id, isPropia?"pagada_china":"enviada_cliente")} style={{background:"#1aa35818",color:"#1aa358",border:"1px solid #1aa35844",borderRadius:9,padding:"12px 16px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                                          <span style={{fontSize:20}}>✅</span>
                                          <div><div>Todo OK — continuar</div><div style={{fontSize:10,color:"#1aa35888",fontWeight:400,marginTop:2}}>{isPropia?"Proceder con la importación propia":"El producto puede ingresar sin problema"}</div></div>
                                        </button>
                                        <button onClick={()=>{ setOpenId(null); handleEdit(c); }} style={{background:"#b8922e18",color:"#b8922e",border:"1px solid #b8922e44",borderRadius:9,padding:"12px 16px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                                          <span style={{fontSize:20}}>📋</span>
                                          <div><div>Requiere CDA — editar cotización</div><div style={{fontSize:10,color:"#b8922e88",fontWeight:400,marginTop:2}}>Agregar costo del certificado y recalcular</div></div>
                                        </button>
                                        <button onClick={()=>handleEstado(c.id,"anulada")} style={{background:"#8b1a2e18",color:"#c0392b",border:"1px solid #8b1a2e44",borderRadius:9,padding:"12px 16px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                                          <span style={{fontSize:20}}>🚫</span>
                                          <div><div>No puede ingresar a Chile — Anular</div><div style={{fontSize:10,color:"#c0392b88",fontWeight:400,marginTop:2}}>El producto no puede ser importado</div></div>
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── PANEL DECISIÓN — Enviada al cliente ── */}
                                  {isCurrent&&step.special==="decision"&&(
                                    <div style={{marginTop:12,marginBottom:4,background:"#f0f9ff",borderRadius:12,padding:16,border:"1px solid #bae6fd"}}>
                                      <div style={{fontSize:11,color:"#0369a1",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>📬 ¿Cuál fue la respuesta del cliente?</div>
                                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                                        <button onClick={()=>handleEstado(c.id,"aceptada")} style={{background:"#1aa35818",color:"#1aa358",border:"1px solid #1aa35844",borderRadius:9,padding:"12px 10px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"center",lineHeight:1.4}}>
                                          <div style={{fontSize:20,marginBottom:4}}>✅</div>
                                          <div>Aceptada</div>
                                          <div style={{fontSize:10,color:"#1aa35888",fontWeight:400,marginTop:2}}>Continúa el proceso</div>
                                        </button>
                                        <button onClick={()=>handleEstado(c.id,"re_testeando")} style={{background:"#2d78c818",color:"#334155",border:"1px solid #2d78c844",borderRadius:9,padding:"12px 10px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"center",lineHeight:1.4}}>
                                          <div style={{fontSize:20,marginBottom:4}}>🔄</div>
                                          <div>Re-testeando</div>
                                          <div style={{fontSize:10,color:"#6a9fd488",fontWeight:400,marginTop:2}}>Cliente va a re-evaluar</div>
                                        </button>
                                        <button onClick={()=>handleEstado(c.id,"en_negociacion")} style={{background:"#c4783018",color:"#c47830",border:"1px solid #c4783044",borderRadius:9,padding:"12px 10px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"center",lineHeight:1.4}}>
                                          <div style={{fontSize:20,marginBottom:4}}>🤝</div>
                                          <div>Negociación</div>
                                          <div style={{fontSize:10,color:"#c4783088",fontWeight:400,marginTop:2}}>Mejora precio o cantidades</div>
                                        </button>
                                        <button onClick={()=>handleEstado(c.id,"rechazada_cliente")} style={{background:"#c0392b18",color:"#c0392b",border:"1px solid #c0392b44",borderRadius:9,padding:"12px 10px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"center",lineHeight:1.4}}>
                                          <div style={{fontSize:20,marginBottom:4}}>❌</div>
                                          <div>Rechazada</div>
                                          <div style={{fontSize:10,color:"#c0392b88",fontWeight:400,marginTop:2}}>No quiere traer el producto</div>
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── PANEL RE-TESTEANDO ── */}
                                  {isCurrent&&step.special==="retesteando"&&(
                                    <div style={{marginTop:10,marginBottom:4,background:"#f1f5f9",borderRadius:10,padding:14,border:"1px solid #2d78c833"}}>
                                      <div style={{fontSize:11,color:"#334155",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>🔄 Cliente re-evaluando</div>
                                      <div style={{fontSize:12,color:"#64748b",marginBottom:12}}>El cliente está analizando si le conviene traer el producto. Cuando tome una decisión, avanza al estado correspondiente.</div>
                                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                        <button onClick={()=>handleEstado(c.id,"aceptada")} style={{background:"#1aa35818",color:"#1aa358",border:"1px solid #1aa35844",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>✅ Decidió aceptar</button>
                                        <button onClick={()=>handleEstado(c.id,"en_negociacion")} style={{background:"#c4783018",color:"#c47830",border:"1px solid #c4783044",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>🤝 Quiere negociar</button>
                                        <button onClick={()=>handleEstado(c.id,"rechazada_cliente")} style={{background:"#c0392b15",color:"#c0392b",border:"1px solid #c0392b33",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>❌ Decidió no traer</button>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── PANEL RECHAZADA POR CLIENTE ── */}
                                  {isCurrent&&step.special==="rechazada"&&(
                                    <div style={{marginTop:10,marginBottom:4,background:"#fff1f2",borderRadius:10,padding:14,border:"1px solid #fecdd3"}}>
                                      <div style={{fontSize:11,color:"#c0392b",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>❌ Cliente rechazó la cotización</div>
                                      <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>El cliente decidió no traer el producto. La cotización queda cerrada.</div>
                                      <button onClick={()=>handleEstado(c.id,"enviada_cliente")} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"6px 14px",fontSize:11,cursor:"pointer"}}>↩ Reabrir cotización</button>
                                    </div>
                                  )}

                                  {/* panel negociación - solo cuando es el paso actual */}
                                  {isCurrent&&step.special==="neg"&&(
                                    <div style={{marginTop:10,marginBottom:4,background:"#fffbeb",borderRadius:10,padding:14,border:"1px solid #fde68a"}}>
                                      <div style={{fontSize:11,color:"#b8922e",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>🤝 Negociación con China</div>

                                      {/* Motivo */}
                                      <div style={{marginBottom:12}}>
                                        <div style={{fontSize:10,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Motivo / Razón</div>
                                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                          {["Precio muy alto","Cliente pidió mejora","Producto no disponible","Sin respuesta","Mejora de precio a China","Aumento de volumen","Otro"].map(m=>(
                                            <button key={m} onClick={()=>handleMotivo(c.id,m)} style={{background:c.motivo_no_procesada===m?"#c4783033":"#f8fafc",color:c.motivo_no_procesada===m?"#c47830":"#666",border:`1px solid ${c.motivo_no_procesada===m?"#c47830":"#1a2d45"}`,borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>{m}</button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Historial de notas */}
                                      {(c.negociacion_rondas||[]).length>0&&(
                                        <div style={{marginBottom:12}}>
                                          <div style={{fontSize:10,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Historial</div>
                                          <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                            {(c.negociacion_rondas||[]).map((r,i)=>(
                                              <div key={i} style={{background:"#ffffff",borderRadius:8,padding:"9px 12px",border:"1px solid #f59e0b22",display:"flex",gap:10,alignItems:"flex-start"}}>
                                                <span style={{fontSize:10,color:"#64748b",whiteSpace:"nowrap",marginTop:1}}>#{i+1} · {r.fecha}</span>
                                                <span style={{fontSize:12,color:"#bbb",fontStyle:"italic",flex:1}}>{r.nota||"Sin nota"}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Registrar nota de esta ronda */}
                                      <div style={{marginBottom:12}}>
                                        <div style={{fontSize:10,color:"#b8922e",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>📝 Nota de esta negociación</div>
                                        <textarea value={negForm[c.id]?.nota||""} rows={2} onChange={e=>setNegForm(p=>({...p,[c.id]:{...p[c.id],nota:e.target.value}}))} placeholder="Ej: China ofreció bajar a $4.2 si pedimos 300 unidades. Pendiente confirmar con cliente..." style={{width:"100%",background:"#f1f5f9",border:"1px solid #f59e0b33",borderRadius:6,color:"#0f172a",padding:"8px 10px",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
                                        <button onClick={()=>handleNegAgregar(c.id)} style={{marginTop:6,background:"#f59e0b15",color:"#b8922e",border:"1px solid #f59e0b33",borderRadius:6,padding:"6px 14px",fontSize:11,cursor:"pointer",fontWeight:600}}>💾 Guardar nota</button>
                                      </div>

                                      {/* Abrir editor para ajustar valores */}
                                      <div style={{background:"#f0f9ff",borderRadius:8,padding:"10px 14px",border:"1px solid #bae6fd",marginBottom:12}}>
                                        <div style={{fontSize:11,color:"#0369a1",fontWeight:600,marginBottom:4}}>¿Conseguiste un nuevo precio?</div>
                                        <div style={{fontSize:11,color:"#64748b",marginBottom:8}}>Abre el editor para ajustar precio China, comisión real APP, margen por unidad y ver el análisis completo antes de confirmar.</div>
                                        <button onClick={()=>{ setOpenId(null); handleEdit(c); }} style={{background:"#f0f9ff",color:"#0369a1",border:"1px solid #3b82f644",borderRadius:7,padding:"8px 18px",fontSize:12,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                                          ✏️ Editar cotización con nuevos valores
                                        </button>
                                      </div>

                                      {/* Acciones finales */}
                                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                        <button onClick={()=>handleEstado(c.id,"aceptada")} style={{background:"#22c55e18",color:"#1aa358",border:"1px solid #bbf7d0",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>✅ Aceptada — continuar</button>
                                        <button onClick={()=>handleEstado(c.id,"no_procesada")} style={{background:"#c0392b15",color:"#c0392b",border:"1px solid #ef444433",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>❌ Rechazada — cerrar cotización</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* estado no_procesada — terminal */}
                            {isNoProcesada&&(
                              <div style={{position:"relative",paddingTop:8}}>
                                <div style={{position:"absolute",left:-44,top:8,width:32,height:32,borderRadius:"50%",background:"#c0392b15",border:"2px solid #ef4444",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>❌</div>
                                <div style={{background:"#fff1f2",borderRadius:10,padding:"12px 16px",border:"1px solid #fecdd3",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:13,fontWeight:700,color:"#c0392b"}}>Cotización rechazada / no procesada</div>
                                    {c.motivo_no_procesada&&<div style={{fontSize:11,color:"#64748b",marginTop:3}}>Motivo: {c.motivo_no_procesada}</div>}
                                  </div>
                                  <button onClick={()=>handleEstado(c.id,"solicitud")} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"6px 14px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>↩ Reabrir</button>
                                </div>
                              </div>
                            )}

                            {/* estado anulada — terminal */}
                            {c.estado==="anulada"&&(
                              <div style={{position:"relative",paddingTop:8}}>
                                <div style={{position:"absolute",left:-44,top:8,width:32,height:32,borderRadius:"50%",background:"#8b1a2e18",border:"2px solid #8b1a2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🚫</div>
                                <div style={{background:"#fff1f2",borderRadius:10,padding:"12px 16px",border:"1px solid #fecdd3",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:13,fontWeight:700,color:"#c0392b"}}>Anulada — No puede ingresar a Chile</div>
                                    <div style={{fontSize:11,color:"#64748b",marginTop:3}}>El producto fue bloqueado por restricciones de importación.</div>
                                  </div>
                                  <button onClick={()=>handleEstado(c.id,"respuesta_china")} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"6px 14px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>↩ Reabrir</button>
                                </div>
                              </div>
                            )}
                            {c.estado==="rechazada_cliente"&&(
                              <div style={{position:"relative",paddingTop:8}}>
                                <div style={{position:"absolute",left:-44,top:8,width:32,height:32,borderRadius:"50%",background:"#c0392b15",border:"2px solid #c0392b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>❌</div>
                                <div style={{background:"#fff1f2",borderRadius:10,padding:"12px 16px",border:"1px solid #fecdd3",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:13,fontWeight:700,color:"#c0392b"}}>Rechazada por el cliente</div>
                                    <div style={{fontSize:11,color:"#64748b",marginTop:3}}>El cliente decidió no traer el producto. Cotización cerrada.</div>
                                  </div>
                                  <button onClick={()=>handleEstado(c.id,"enviada_cliente")} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"6px 14px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>↩ Reabrir</button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ── NOTAS INTERNAS ── */}
                          <div style={{marginTop:20,borderTop:"1px solid #e2e8f0",paddingTop:16}}>
                            <div style={{fontSize:10,color:"#2a8aaa",marginBottom:6,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>📝 Notas internas</div>
                            {/* Historial existente */}
                            {(()=>{
                              var hist = []; try{ if(Array.isArray(c.notas_historial)) hist=c.notas_historial; else if(typeof c.notas_historial==="string"&&c.notas_historial) hist=JSON.parse(c.notas_historial); }catch(e){ hist=[]; }
                              // Migrar notas_internas legacy a historial si aún no fue migrado
                              if(hist.length===0 && c.notas_internas){
                                hist = [{texto:c.notas_internas, fecha: c.fecha_solicitud||"Anterior", autor:"Sistema"}]
                              }
                              return hist.length>0&&(
                                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                                  {hist.map(function(n,i){
                                    var esOculta = n.oculta===true;
                                    var editKey = c.id+"_"+i;
                                    var editando = notaEditando[editKey];
                                    if(editando){
                                      // ── MODO EDICIÓN ──
                                      return (
                                        <div key={i} style={{background:editando.oculta?"#080f1e":"#fffbeb",border:editando.oculta?"1px solid rgba(201,160,85,0.3)":"1px solid #f59e0b55",borderRadius:8,padding:"10px 12px"}}>
                                          <div style={{fontSize:10,color:editando.oculta?"#c9a055":"#b8922e",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>✏️ Editando nota — {n.autor||"Gestor"}</div>
                                          <textarea value={editando.texto} rows={3} onChange={e=>setNotaEditando(p=>({...p,[editKey]:{...p[editKey],texto:e.target.value}}))} style={{width:"100%",background:editando.oculta?"#0c1629":"#fff",border:`1px solid ${editando.oculta?"rgba(201,160,85,0.2)":"#e2e8f0"}`,borderRadius:6,color:editando.oculta?"#cbd5e1":"#0f172a",padding:"8px 10px",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
                                          {/* Checkbox oculta en edición */}
                                          <div onClick={()=>setNotaEditando(p=>({...p,[editKey]:{...p[editKey],oculta:!p[editKey].oculta}}))} style={{display:"flex",alignItems:"center",gap:7,marginTop:8,cursor:"pointer",userSelect:"none",width:"fit-content"}}>
                                            <div style={{width:16,height:16,borderRadius:4,flexShrink:0,background:editando.oculta?"#c9a055":"#fff",border:`2px solid ${editando.oculta?"#c9a055":"#cbd5e1"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:editando.oculta?"#040c18":"#fff",fontWeight:900,transition:"all .15s"}}>{editando.oculta?"✓":""}</div>
                                            <span style={{fontSize:11,color:editando.oculta?"#c9a055":"#64748b",fontWeight:editando.oculta?700:400,transition:"all .15s"}}>🔒 Nota oculta — solo administradores</span>
                                          </div>
                                          <div style={{display:"flex",gap:6,marginTop:8}}>
                                            <button disabled={!editando.texto.trim()} onClick={async()=>{
                                              if(!editando.texto.trim()) return;
                                              var hist2=[]; try{ if(Array.isArray(c.notas_historial)) hist2=[...c.notas_historial]; else if(typeof c.notas_historial==="string"&&c.notas_historial) hist2=JSON.parse(c.notas_historial); }catch(e){ hist2=[]; }
                                              if(hist2.length===0&&c.notas_internas) hist2=[{texto:c.notas_internas,fecha:c.fecha_solicitud||"Anterior",autor:"Sistema"}];
                                              hist2[i]={...hist2[i],texto:editando.texto.trim(),oculta:editando.oculta,editado:new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})};
                                              await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,notas_historial:hist2,notas_internas:""}:x));
                                              setNotaEditando(p=>{var np={...p};delete np[editKey];return np;});
                                            }} style={{background:editando.texto.trim()?"#040c18":"#e2e8f0",color:editando.texto.trim()?"#c9a055":"#94a3b8",border:"none",borderRadius:6,padding:"6px 14px",fontSize:11,cursor:editando.texto.trim()?"pointer":"default",fontWeight:700}}>
                                              💾 Guardar cambios
                                            </button>
                                            <button onClick={()=>setNotaEditando(p=>{var np={...p};delete np[editKey];return np;})} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:6,padding:"6px 14px",fontSize:11,cursor:"pointer",fontWeight:600}}>
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    }
                                    return (
                                      <div key={i} style={{background:esOculta?"#080f1e":"#f0f9ff",border:esOculta?"1px solid rgba(201,160,85,0.25)":"1px solid #06b6d433",borderRadius:8,padding:"10px 12px"}}>
                                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                                            <span style={{fontSize:10,fontWeight:700,color:esOculta?"#94a3b8":"#2a8aaa",textTransform:"uppercase",letterSpacing:0.5}}>📌 {n.autor||"Gestor"}</span>
                                            {esOculta&&<span style={{fontSize:9,fontWeight:700,color:"#c9a055",background:"rgba(201,160,85,0.12)",border:"1px solid rgba(201,160,85,0.3)",borderRadius:4,padding:"1px 6px",letterSpacing:0.5,textTransform:"uppercase"}}>🔒 Solo admins</span>}
                                            {n.editado&&<span style={{fontSize:9,color:esOculta?"#475569":"#94a3b8",fontStyle:"italic"}}>(editado {n.editado})</span>}
                                          </div>
                                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                                            <span style={{fontSize:10,color:esOculta?"#475569":"#94a3b8"}}>{n.fecha}</span>
                                            <button onClick={()=>setNotaEditando(p=>({...p,[editKey]:{texto:n.texto,oculta:n.oculta===true}}))} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,padding:"1px 4px",color:esOculta?"#64748b":"#64748b",opacity:0.7}} title="Editar nota">✏️</button>
                                          </div>
                                        </div>
                                        <div style={{fontSize:12,color:esOculta?"#94a3b8":"#0f172a",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{n.texto}</div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}
                            {/* Agregar nueva nota */}
                            <div style={{background:"#f8fafc",border:"1px solid #06b6d433",borderRadius:8,padding:"10px 12px"}}>
                              <div style={{fontSize:10,color:"#2a8aaa",marginBottom:6,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>+ Nueva nota</div>
                              <textarea value={notaInput[c.id]||""} rows={2} onChange={e=>setNotaInput(p=>({...p,[c.id]:e.target.value}))} placeholder="Escribe una nota..." style={{width:"100%",background:"#fff",border:"1px solid #e2e8f0",borderRadius:6,color:"#0f172a",padding:"8px 10px",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
                              {/* Checkbox nota oculta */}
                              <div onClick={()=>setNotaOculta(p=>({...p,[c.id]:!p[c.id]}))} style={{display:"flex",alignItems:"center",gap:7,marginTop:8,cursor:"pointer",userSelect:"none",width:"fit-content"}}>
                                <div style={{width:16,height:16,borderRadius:4,flexShrink:0,background:notaOculta[c.id]?"#c9a055":"#fff",border:`2px solid ${notaOculta[c.id]?"#c9a055":"#cbd5e1"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:notaOculta[c.id]?"#040c18":"#fff",fontWeight:900,transition:"all .15s"}}>{notaOculta[c.id]?"✓":""}</div>
                                <span style={{fontSize:11,color:notaOculta[c.id]?"#c9a055":"#64748b",fontWeight:notaOculta[c.id]?700:400,transition:"all .15s"}}>🔒 Nota oculta — solo administradores</span>
                              </div>
                              <button disabled={!(notaInput[c.id]||"").trim()} onClick={async()=>{
                                var texto = (notaInput[c.id]||"").trim()
                                if(!texto) return
                                var histPrev = c.notas_historial||[]
                                if(histPrev.length===0&&c.notas_internas) histPrev=[{texto:c.notas_internas,fecha:c.fecha_solicitud||"Anterior",autor:"Sistema"}]
                                var nuevaNota = {texto, fecha:new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"}), autor: usuario?.nombre||"Gestor", oculta: notaOculta[c.id]||false}
                                var updated = [...histPrev, nuevaNota]
                                await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,notas_historial:updated,notas_internas:""}:x))
                                setNotaInput(p=>({...p,[c.id]:""}))
                                setNotaOculta(p=>({...p,[c.id]:false}))
                              }} style={{marginTop:8,background:(notaInput[c.id]||"").trim()?"#040c18":"#e2e8f0",color:(notaInput[c.id]||"").trim()?"#c9a055":"#94a3b8",border:"none",borderRadius:6,padding:"7px 16px",fontSize:11,cursor:(notaInput[c.id]||"").trim()?"pointer":"default",fontWeight:700,transition:"all .2s"}}>
                                💾 Guardar nota
                              </button>
                            </div>

                            {/* FACTURA AL CLIENTE */}
                            {c.requiere_factura&&(
                              <div style={{marginTop:14,background:"#f0fdf4",borderRadius:10,padding:"12px 14px",border:"1px solid #bbf7d0"}}>
                                <div style={{fontSize:10,color:"#1aa358",marginBottom:10,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🧾 Factura al cliente</div>
                                <div style={{display:"flex",gap:8,flexDirection:"column"}}>
                                  <div>
                                    <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>Nº de factura</div>
                                    <input value={c.nro_factura_cliente||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,nro_factura_cliente:e.target.value}:x)); }} placeholder="Ej: 001234" style={{width:"100%",background:"#f8fafc",border:"1px solid #1aa35833",borderRadius:7,color:"#0f172a",padding:"8px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                                  </div>
                                  <div>
                                    <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>Link de la factura (Drive u otro)</div>
                                    <div style={{display:"flex",gap:6}}>
                                      <input value={c.link_factura_cliente||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,link_factura_cliente:e.target.value}:x)); }} placeholder="https://drive.google.com/..." style={{flex:1,background:"#f8fafc",border:"1px solid #1aa35833",borderRadius:7,color:"#0f172a",padding:"8px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                                      {c.link_factura_cliente&&<a href={c.link_factura_cliente} target="_blank" rel="noreferrer" style={{background:"#1aa35820",color:"#1aa358",border:"1px solid #1aa35844",borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>🔗 Abrir</a>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ── SKU + FULFILLMENT ── */}
                          {(c.checklist?.pago_china||c.sku_china)&&(
                            <div style={{marginTop:18,borderTop:"1px solid #e2e8f0",paddingTop:18}}>
                              <div style={{fontSize:10,color:"#c47830",marginBottom:12,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>📦 Post-pago — Bodega & Fulfillment</div>
                              <div className="ff-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                                  <div>
                                    <div style={{fontSize:10,color:"#b8922e",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>🏷 SKU China</div>
                                    <input value={c.sku_china||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,sku_china:e.target.value}:x));}} placeholder="Ej: CN-20394-A" style={{width:"100%",background:"#f8fafc",border:"1px solid #f59e0b44",borderRadius:7,color:"#b8922e",padding:"7px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                                  </div>
                                  <div>
                                    <div style={{fontSize:10,color:"#3d7fc4",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>📦 SKU Bodega (interno)</div>
                                    <input value={c.sku_bodega||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,sku_bodega:e.target.value}:x));}} placeholder="Ej: BOD-001" style={{width:"100%",background:"#f8fafc",border:"1px solid #8b5cf644",borderRadius:7,color:"#3d7fc4",padding:"7px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                                  </div>
                                  {(()=>{
                                    const dimTipo=c.dim_tipo||"caja";
                                    const esCaja=dimTipo==="caja";
                                    const undCaja=Number(c.dim_und_caja)||0;
                                    const unidades=Number(c.unidades)||0;
                                    const nCajas=esCaja&&undCaja>0?Math.ceil(unidades/undCaja):0;
                                    const m3Caja=Number(c.dim_m3)||0;
                                    // m³ totales: si es por caja → m3Caja × nCajas; si es por unidad → m3Caja × unidades
                                    const m3Total=esCaja?(m3Caja*nCajas).toFixed(2):(m3Caja*unidades).toFixed(2);
                                    const m3UndEfectiva=esCaja&&undCaja>0?(m3Caja/undCaja).toFixed(5):m3Caja;
                                    return (
                                    <div id={`dim-section-${c.id}`} style={{background:"#f8fafc",borderRadius:8,padding:12,border:"1px solid #e2e8f0"}}>
                                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                                        <div style={{fontSize:10,color:"#0d9870",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>📐 Dimensiones</div>
                                        {/* Toggle por caja / por unidad */}
                                        <div style={{display:"flex",background:"#ffffff",borderRadius:7,padding:2,gap:2}}>
                                          {[["caja","📦 Por caja"],["unidad","🔹 Por unidad"]].map(([val,lbl])=>(
                                            <button key={val} onClick={async()=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,dim_tipo:val}:x)); }} style={{background:dimTipo===val?"#1a3a2a":"transparent",color:dimTipo===val?"#0d9870":"#555",border:"none",borderRadius:5,padding:"4px 10px",fontSize:10,cursor:"pointer",fontWeight:dimTipo===val?700:400,transition:"all .2s"}}>{lbl}</button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Si es por caja: primero pedir und/caja */}
                                      {esCaja&&(
                                        <div style={{background:"#fffbeb",borderRadius:7,padding:"8px 10px",marginBottom:10,border:"1px solid #fde68a"}}>
                                          <div style={{fontSize:9,color:"#b8922e",marginBottom:4,fontWeight:700}}>📦 Unidades por caja cerrada</div>
                                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                                            <input type="number" value={c.dim_und_caja||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,dim_und_caja:e.target.value}:x));}} placeholder="Ej: 12" style={{width:90,background:"#f8fafc",border:"1px solid #f59e0b55",borderRadius:6,color:"#b8922e",padding:"6px 10px",fontSize:14,outline:"none",fontWeight:800}}/>
                                            <span style={{fontSize:11,color:"#64748b"}}>und/caja</span>
                                            {undCaja>0&&unidades>0&&(
                                              <div style={{marginLeft:"auto",background:"#ffffff",borderRadius:6,padding:"5px 10px",border:"1px solid #0d987044"}}>
                                                <span style={{fontSize:10,color:"#64748b"}}>Cajas necesarias: </span>
                                                <span style={{fontSize:14,fontWeight:800,color:"#0d9870"}}>{nCajas}</span>
                                                <span style={{fontSize:10,color:"#64748b",marginLeft:4}}>({unidades} und ÷ {undCaja})</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Dimensiones L×A×H */}
                                      <div style={{fontSize:9,color:"#64748b",marginBottom:6}}>{esCaja?"Medidas de la caja cerrada (cm)":"Medidas por unidad de producto (cm)"}</div>
                                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                                        {[["dim_largo","Largo"],["dim_ancho","Ancho"],["dim_alto","Alto"]].map(([field,label])=>(
                                          <div key={field}>
                                            <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>{label} (cm)</div>
                                            <input type="number" value={c[field]||""} onChange={async e=>{
                                              const v=e.target.value;
                                              const upd={[field]:v};
                                              const l=field==="dim_largo"?v:c.dim_largo||0;
                                              const an=field==="dim_ancho"?v:c.dim_ancho||0;
                                              const al=field==="dim_alto"?v:c.dim_alto||0;
                                              if(l&&an&&al) upd.dim_m3=((Number(l)*Number(an)*Number(al))/1000000).toFixed(4);
                                              await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,...upd}:x));
                                            }} placeholder="0" style={{width:"100%",background:"#f1f5f9",border:"1px solid #10b98133",borderRadius:6,color:"#0d9870",padding:"6px 8px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Resultados */}
                                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                                        <div>
                                          <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>{esCaja?"M³ por caja (auto)":"M³ por unidad (auto)"}</div>
                                          <div style={{background:"#ffffff",border:"1px solid #10b98133",borderRadius:6,color:"#0d9870",padding:"6px 8px",fontSize:12,fontWeight:700}}>{m3Caja?m3Caja+" m³":"—"}</div>
                                        </div>
                                        {esCaja&&(
                                          <div>
                                            <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>M³ por unidad (÷ {undCaja||"?"})</div>
                                            <div style={{background:"#ffffff",border:"1px solid #10b98122",borderRadius:6,color:"#334155",padding:"6px 8px",fontSize:12,fontWeight:700}}>{undCaja>0&&m3Caja?m3UndEfectiva+" m³":"—"}</div>
                                          </div>
                                        )}
                                        <div>
                                          <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>M³ carga total{esCaja?` (${nCajas||"?"} cajas)`:` (${fmtN(unidades)} und)`}</div>
                                          <div style={{background:"#ffffff",border:"1px solid #10b98155",borderRadius:6,color:"#1aa358",padding:"10px 8px",fontSize:18,fontWeight:800,textAlign:"center"}}>{m3Caja&&(esCaja?nCajas>0:unidades>0)?m3Total+" m³":"—"}</div>
                                        </div>
                                      </div>
                                    </div>
                                    );
                                  })()}
                                </div>
                                <div style={{background:"#f8fafc",borderRadius:10,padding:14,border:"1px solid #e2e8f0"}}>
                                  <div style={{fontSize:10,color:"#2a8aaa",marginBottom:10,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🚚 Fulfillment</div>
                                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:"#0f172a",marginBottom:10}}>
                                    <input type="checkbox" checked={c.fulfillment_cliente!==false} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,fulfillment_cliente:e.target.checked}:x));}} style={{cursor:"pointer",width:15,height:15}}/>
                                    Con fulfillment <span style={{fontSize:10,color:"#64748b",marginLeft:4}}>(desmarcar si esta importación no aplica)</span>
                                  </label>
                                  {c.fulfillment_cliente!==false&&(
                                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:c.fulfillment_producto_creado?"#1aa358":"#666"}}>
                                        <input type="checkbox" checked={c.fulfillment_producto_creado||false} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,fulfillment_producto_creado:e.target.checked}:x));}} style={{cursor:"pointer",width:15,height:15}}/>
                                        ✅ Producto creado en sistema
                                      </label>
                                      <div>
                                        <div style={{fontSize:10,color:"#64748b",marginBottom:3}}>Costo real fulfillment $</div>
                                        <input type="number" value={c.fulfillment_costo_real||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,fulfillment_costo_real:e.target.value}:x));}} placeholder="0" style={{width:"100%",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:6,color:"#0f172a",padding:"6px 9px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                                      </div>
                                      <div>
                                        <div style={{fontSize:10,color:"#64748b",marginBottom:3}}>Notas fulfillment</div>
                                        <textarea value={c.fulfillment_notas||""} rows={2} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,fulfillment_notas:e.target.value}:x));}} placeholder="Instrucciones, detalles..." style={{width:"100%",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:6,color:"#0f172a",padding:"6px 9px",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()||null}</CardErrorBoundary>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {tab2==="dashboard"&&(
          <div>
            {/* Tipo selector + filtros */}
            <div style={{display:"flex",gap:8,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:6,background:"#f1f5f9",borderRadius:10,padding:4,border:"1px solid #e2e8f0"}}>
                {[["clientes","👥 Clientes","#1aa358"],["propias","🏠 Propias","#3d7fc4"]].map(([k,l,col])=>(
                  <button key={k} onClick={()=>{setDashTipo(k);setDashClienteFiltro("todos");}} style={{background:dashTipo===k?col+"22":"transparent",color:dashTipo===k?col:"#666",border:`1px solid ${dashTipo===k?col+"55":"transparent"}`,borderRadius:8,padding:"8px 20px",cursor:"pointer",fontWeight:dashTipo===k?700:400,fontSize:13}}>{l}</button>
                ))}
              </div>
              <span style={{fontSize:12,color:"#64748b"}}>·</span>
              {[["todas","Todas"],["procesadas","✅ Procesadas"],["no_procesadas","❌ No procesadas"]].map(([k,l])=>(
                <button key={k} onClick={()=>setDashFilter(k)} style={{background:dashFilter===k?"#c9a05522":"#f8fafc",color:dashFilter===k?"#c9a055":"#64748b",border:`1px solid ${dashFilter===k?"#c9a05555":"#e2e8f0"}`,borderRadius:20,padding:"6px 16px",fontSize:12,cursor:"pointer",fontWeight:dashFilter===k?700:400}}>{l}</button>
              ))}
              {dashTipo==="clientes"&&clientesParaDash.length>0&&(
                <select value={dashClienteFiltro} onChange={e=>setDashClienteFiltro(e.target.value)} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:20,color:dashClienteFiltro!=="todos"?"#1aa358":"#666",padding:"6px 14px",fontSize:12,cursor:"pointer",outline:"none"}}>
                  <option value="todos">👥 Todos los clientes</option>
                  {clientesParaDash.map(cl=><option key={cl} value={cl}>👤 {cl}</option>)}
                </select>
              )}
            </div>

            {/* KPIs */}
            <div className="dash-kpi4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              <div style={{background:"#f1f5f9",borderRadius:12,padding:"16px 18px",border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:18,marginBottom:4}}>🇨🇳</div>
                <div style={{fontSize:10,color:"#64748b",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>Pagado a China (real)</div>
                <div style={{fontSize:20,fontWeight:800,color:"#2d78c8"}}>{fmt(totalPagadoChina)}</div>
                {totalPendienteChina>0&&<div style={{fontSize:11,color:"#c47830",marginTop:3}}>⏳ Pendiente: {fmt(totalPendienteChina)}</div>}
              </div>
              <div style={{background:"#f1f5f9",borderRadius:12,padding:"16px 18px",border:"1px solid #1aa35833"}}>
                <div style={{fontSize:18,marginBottom:4}}>🧾</div>
                <div style={{fontSize:10,color:"#64748b",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>Cobrado a clientes</div>
                <div style={{fontSize:20,fontWeight:800,color:"#1aa358"}}>{fmt(totalCobradoCliente)}</div>
                {totalPendienteCliente>0&&<div style={{fontSize:11,color:"#c47830",marginTop:3}}>⏳ Por cobrar: {fmt(totalPendienteCliente)}</div>}
                {totalCobradoCliente>0&&totalPagadoChina>0&&<div style={{fontSize:10,color:"#334155",marginTop:2}}>vs China: {fmt(totalCobradoCliente-totalPagadoChina)}</div>}
              </div>
              <div style={{background:"#f1f5f9",borderRadius:12,padding:"16px 18px",border:"1px solid #22c55e33"}}>
                <div style={{fontSize:18,marginBottom:4}}>💰</div>
                <div style={{fontSize:10,color:"#64748b",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>Ganancia cobrada (real)</div>
                <div style={{fontSize:20,fontWeight:800,color:"#1aa358"}}>{fmt(totalGananciaReal)}</div>
                {totalGananciaEst>0&&<div style={{fontSize:11,color:"#b8922e",marginTop:3}}>⏳ Por cobrar: {fmt(totalGananciaEst)}</div>}
              </div>
              <div style={{background:"#f1f5f9",borderRadius:12,padding:"16px 18px",border:"1px solid #e2e8f0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <div style={{fontSize:10,color:"#64748b",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>📦 Importaciones</div>
                  <div style={{fontSize:20,fontWeight:800,color:"#0f172a"}}>{dashData.length}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:"#64748b",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>📈 ROI real</div>
                  <div style={{fontSize:20,fontWeight:800,color:"#0f172a"}}>{fmtP(totalPagadoChina>0?(totalGananciaReal/totalPagadoChina)*100:0)}</div>
                </div>
                {promedioTransito!==null&&<div style={{gridColumn:"1/-1"}}>
                  <div style={{fontSize:10,color:"#64748b",marginBottom:1,textTransform:"uppercase",letterSpacing:1}}>⏱ Tránsito promedio real</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#0d9870"}}>{promedioTransito} días</div>
                </div>}
              </div>
            </div>

            {/* ── PANEL M³ PROYECCIÓN BODEGA ── */}
            {(()=>{
              // Calcular m³ por cotización
              const calcM3=c=>{
                const m3=Number(c.dim_m3)||0;
                if(!m3) return 0;
                const tipo=c.dim_tipo||"caja"; // antiguas sin dim_tipo → asumir caja
                if(tipo==="caja"&&Number(c.dim_und_caja)>0){
                  return m3*Math.ceil(Number(c.unidades)/Number(c.dim_und_caja));
                }
                if(tipo==="caja") return 0; // tiene tipo caja pero sin und_caja → no calcular
                return m3*Number(c.unidades); // por unidad
              };

              // Solo importaciones activas (no terminales, no completadas) con fecha estimada y m³
              const enTransito=cotizaciones.filter(c=>
                c.fecha_llegada_est&&
                calcM3(c)>0&&
                !["completada","rechazada_cliente","anulada","no_procesada"].includes(c.estado)&&
                !c.checklist?.retirado_bodega
              );

              if(enTransito.length===0) return null;

              // Agrupar por mes de llegada estimada
              const porMes={};
              enTransito.forEach(c=>{
                const m=c.fecha_llegada_est.substring(0,7);
                if(!porMes[m]) porMes[m]=[];
                porMes[m].push(c);
              });

              const meses=Object.keys(porMes).sort();
              const m3Max=Math.max(...meses.map(m=>porMes[m].reduce((s,c)=>s+calcM3(c),0)));
              const mesLabels={"01":"Ene","02":"Feb","03":"Mar","04":"Abr","05":"May","06":"Jun","07":"Jul","08":"Ago","09":"Sep","10":"Oct","11":"Nov","12":"Dic"};

              return (
                <div style={{background:"#ffffff",borderRadius:14,padding:20,marginBottom:20,border:"1px solid #0d987044"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#0d9870",marginBottom:2}}>📦 Proyección M³ llegada a bodega</div>
                      <div style={{fontSize:11,color:"#64748b"}}>Importaciones activas con dimensiones · agrupadas por mes de llegada estimada</div>
                    </div>
                    <div style={{background:"#f0fdf4",borderRadius:8,padding:"8px 14px",textAlign:"center",border:"1px solid #bbf7d0"}}>
                      <div style={{fontSize:10,color:"#64748b",marginBottom:1}}>Total proyectado</div>
                      <div style={{fontSize:18,fontWeight:800,color:"#0d9870"}}>{enTransito.reduce((s,c)=>s+calcM3(c),0).toFixed(2)} m³</div>
                    </div>
                  </div>

                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {meses.map(mes=>{
                      const lista=porMes[mes];
                      const m3Mes=lista.reduce((s,c)=>s+calcM3(c),0);
                      const pct=m3Max>0?(m3Mes/m3Max)*100:0;
                      const [yyyy,mm]=mes.split("-");
                      const label=`${mesLabels[mm]||mm} ${yyyy}`;
                      const hoy=new Date();
                      const esPasado=new Date(mes+"-28")<hoy;
                      const esActual=mes===`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
                      return (
                        <div key={mes}>
                          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
                            <div style={{width:80,fontSize:12,fontWeight:700,color:esActual?"#0f172a":esPasado?"#64748b":"#94a3b8",flexShrink:0}}>{label}{esActual&&<span style={{fontSize:9,color:"#c9a055",marginLeft:4}}>← hoy</span>}</div>
                            <div style={{flex:1,height:28,background:"#f1f5f9",borderRadius:6,overflow:"hidden",position:"relative"}}>
                              <div style={{height:"100%",width:`${pct}%`,background:esActual?"linear-gradient(to right,#c9a055,#f5c842)":"linear-gradient(to right,#0d9870,#1aa358)",borderRadius:6,transition:"width .4s",minWidth:pct>0?4:0}}/>
                              <div style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:700,color:"#fff",textShadow:"0 1px 3px #000"}}>{m3Mes.toFixed(2)} m³</div>
                            </div>
                            <div style={{width:24,textAlign:"center",fontSize:11,color:"#64748b",flexShrink:0}}>{lista.length}</div>
                          </div>
                          {/* detalle por cotización */}
                          <div style={{marginLeft:92,display:"flex",flexWrap:"wrap",gap:4}}>
                            {lista.map(c=>(
                              <div key={c.id} style={{background:"#f1f5f9",borderRadius:5,padding:"3px 8px",fontSize:10,color:"#64748b",border:"1px solid #e2e8f0",cursor:"pointer"}} onClick={()=>{ setTab("tracker"); setFilterEstado("todos"); setFilterCliente("todos"); setOpenId(c.id); setTimeout(()=>{ const el=document.getElementById(`card-${c.id}`); if(el) el.scrollIntoView({behavior:"smooth",block:"center"}); },300); }} title="Ver en Tracker">
                                <span style={{color:"#0f172a"}}>{c.producto?.substring(0,22)||(c.tipo==="propia"?"Propia":"—")}</span>
                                <span style={{color:"#0d9870",marginLeft:4}}>{calcM3(c).toFixed(2)}m³</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{marginTop:12,fontSize:10,color:"#333",borderTop:"1px solid #e2e8f0",paddingTop:8}}>* Solo incluye importaciones con dimensiones ingresadas · Las cajas se calculan según und/caja configurado</div>
                </div>
              );
            })()}

            {/* ── PANEL COMISIONES LUISA ── */}
            {(()=>{
              const hoy=new Date();
              const mesActual=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
              const mesAnterior=new Date(hoy.getFullYear(),hoy.getMonth()-1,1);
              const mesAnt=`${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth()+1).padStart(2,"0")}`;

              // Importaciones de Luisa con 1er pago recibido, agrupadas por mes
              const luisaCerradas=cotizaciones.filter(c=>
                c.gestor==="luisa"&&c.tipo!=="propia"&&c.checklist?.pago1_cliente&&c.fecha_pago1_cliente
              );

              // Agrupar por mes de fecha_pago1_cliente
              const porMes={};
              luisaCerradas.forEach(c=>{
                const m=c.fecha_pago1_cliente.substring(0,7);
                if(!porMes[m]) porMes[m]=[];
                porMes[m].push(c);
              });

              const mesesConCierres=Object.keys(porMes).sort().reverse();
              if(mesesConCierres.length===0) return null;

              const calcComisionMes=(lista)=>{
                const pct=lista.length>=6?0.25:0.20;
                const base=lista.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
                return {pct,base,comision:base*pct,nro:lista.length};
              };

              // Pendiente de pago = mes anterior (primeros 5 días del mes actual)
              const pendienteMes=porMes[mesAnt]||[];
              const pendienteCalc=pendienteMes.length>0?calcComisionMes(pendienteMes):null;
              const diasMes=hoy.getDate();

              return (
                <div style={{background:"#040c18",borderRadius:14,padding:20,border:"1px solid #f9a8d4",marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                    <span style={{fontSize:20}}>👩‍💼</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#a85590"}}>Comisiones Luisa</div>
                      <div style={{fontSize:11,color:"#64748b"}}>20% por 1–5 cierres · 25% por 6+ cierres en el mes · Base: ganancia importación</div>
                    </div>
                    <button onClick={()=>setSimModal(true)} style={{background:"#a8559018",color:"#a85590",border:"1px solid #f9a8d4",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"}}>🧮 Simulación total</button>
                  </div>

                  {/* Alerta de pago pendiente */}
                  {pendienteCalc&&diasMes<=10&&(
                    <div style={{background:diasMes<=5?"#c0392b15":"#b8922e11",border:`1px solid ${diasMes<=5?"#c0392b33":"#b8922e33"}`,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:18}}>{diasMes<=5?"🔔":"⏳"}</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:12,color:diasMes<=5?"#c0392b":"#b8922e"}}>
                          {diasMes<=5?"Pago pendiente este mes":"Próximo vencimiento de pago"}
                        </div>
                        <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                          {pendienteCalc.nro} cierres en {monthLabel(mesAnt)} · {fmtP(pendienteCalc.pct*100)} · Base: {fmt(pendienteCalc.base)} → <b style={{color:"#a85590"}}>{fmt(pendienteCalc.comision)}</b>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabla por mes */}
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {mesesConCierres.map(m=>{
                      const lista=porMes[m];
                      const {pct,base,comision,nro}=calcComisionMes(lista);
                      const ganEmpresa=base-comision;
                      const esMesAnt=m===mesAnt;
                      return(
                        <div key={m} style={{background:"#ffffff",borderRadius:10,padding:"12px 16px",border:`1px solid ${esMesAnt?"#e9d5ff":"#e2e8f0"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontWeight:700,fontSize:13,color:esMesAnt?"#a85590":"#aaa",textTransform:"capitalize"}}>{monthLabel(m)}</span>
                              <span style={{background:nro>=6?"#b8922e22":"#2d78c822",color:nro>=6?"#b8922e":"#2d78c8",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:`1px solid ${nro>=6?"#b8922e44":"#2d78c844"}`}}>{nro} {nro>=6?"cierres → 25%":"cierres → 20%"}</span>
                              {esMesAnt&&<span style={{background:"#c0392b18",color:"#c0392b",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:"1px solid #ef444433"}}>⚠ Pagar antes del 5</span>}
                            </div>
                            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Gan. importación base</div>
                                <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmt(base)}</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:9,color:"#a85590",textTransform:"uppercase",letterSpacing:1}}>Comisión Luisa</div>
                                <div style={{fontSize:15,fontWeight:800,color:"#a85590"}}>{fmt(comision)}</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:9,color:"#1aa358",textTransform:"uppercase",letterSpacing:1}}>Empresa neto</div>
                                <div style={{fontSize:15,fontWeight:800,color:"#1aa358"}}>{fmt(ganEmpresa)}</div>
                              </div>
                            </div>
                          </div>
                          {/* Detalle por cotización */}
                          <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
                            {lista.map(c=>{
                              const g=c.calc?.ganImp||0;
                              const com=g*pct;
                              return(
                                <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,padding:"4px 8px",background:"#f8fafc",borderRadius:6}}>
                                  <span style={{color:"#475569"}}>{c.nro} · {c.cliente} · <span style={{color:"#0f172a"}}>{c.producto}</span></span>
                                  <span style={{color:"#64748b"}}>Gan: <b style={{color:"#0f172a"}}>{fmt(g)}</b> → Com: <b style={{color:"#a85590"}}>{fmt(com)}</b></span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {months.length===0?(
              <div style={{textAlign:"center",padding:60,color:"#444"}}><div style={{fontSize:40,marginBottom:12}}>📊</div><div>No hay datos para mostrar.</div></div>
            ):(
              <div>
                <div style={{fontSize:13,color:"#64748b",marginBottom:16,fontWeight:600}}>
                  Ingresos por mes
                  <span style={{fontSize:11,color:"#64748b",fontWeight:400,marginLeft:8}}>
                    🟢 Cobrado real · 🟡 Por cobrar (estimado)
                  </span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {months.map(m=>{
                    const md=monthlyMap[m], total=md.gan1+md.gan2+md.gan2Est;
                    return(
                      <div key={m} style={{background:"#f1f5f9",borderRadius:12,padding:20,border:"1px solid #e2e8f0"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                          <div><div style={{fontWeight:700,fontSize:15,textTransform:"capitalize"}}>{monthLabel(m)}</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>{md.entries.length} movimiento{md.entries.length!==1?"s":""}</div></div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:11,color:"#64748b"}}>Cobrado: <span style={{color:"#1aa358",fontWeight:700}}>{fmt(md.gan1+md.gan2)}</span></div>
                            {md.gan2Est>0&&<div style={{fontSize:11,color:"#b8922e"}}>Por cobrar: {fmt(md.gan2Est)}</div>}
                            <div style={{fontSize:20,fontWeight:800,color:"#0f172a"}}>{fmt(total)}</div>
                          </div>
                        </div>
                        <div style={{marginBottom:14}}>
                          <div style={{height:10,background:"#f1f5f9",borderRadius:5,overflow:"hidden",position:"relative"}}>
                            <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:5,width:`${((md.gan1+md.gan2)/(maxBarVal||1))*100}%`,background:"#1aa358",transition:"width .4s"}}/>
                            <div style={{position:"absolute",top:0,height:"100%",borderRadius:"0 5px 5px 0",left:`${((md.gan1+md.gan2)/(maxBarVal||1))*100}%`,width:`${(md.gan2Est/(maxBarVal||1))*100}%`,background:"#b8922e",opacity:0.7,transition:"all .4s"}}/>
                          </div>
                          <div style={{display:"flex",gap:16,marginTop:6,fontSize:11}}>
                            {md.gan1>0&&<span style={{color:"#1aa358"}}>▌ 1er pago cobrado: {fmt(md.gan1)}</span>}
                            {md.gan2>0&&<span style={{color:"#1aa358"}}>▌ 2do pago cobrado: {fmt(md.gan2)}</span>}
                            {md.gan2Est>0&&<span style={{color:"#b8922e"}}>▌ 2do pago pendiente: {fmt(md.gan2Est)}</span>}
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {md.entries.map((imp,i)=>(
                            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:7,padding:"7px 12px",fontSize:12}}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <span style={{background:imp.real?(imp.pago===1?"#1aa35822":"#1aa35822"):"#b8922e22",color:imp.real?(imp.pago===1?"#1aa358":"#1aa358"):"#b8922e",border:`1px solid ${imp.real?"#1aa35844":"#b8922e44"}`,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700}}>{imp.pago===1?"1er pago":imp.real?"2do pago ✓":"2do pago ⏳"}</span>
                                {imp.tipo==="propia"&&<span style={{background:"#3d7fc422",color:"#3d7fc4",border:"1px solid #8b5cf644",borderRadius:5,padding:"2px 7px",fontSize:10}}>PROPIA</span>}
                                <span style={{color:"#64748b"}}>{imp.label}</span>
                                <span style={{color:"#64748b"}}>·</span>
                                <span onClick={()=>setPreviewId(imp.id)} style={{color:"#2d78c8",cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted"}}>{imp.nro}</span>
                              </div>
                              <span style={{fontWeight:700,color:imp.real?"#1aa358":"#b8922e"}}>{fmt(imp.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MODAL SIMULACIÓN COMISIONES LUISA ══ */}
        {simModal&&(()=>{
          const todas=cotizaciones.filter(c=>c.gestor==="luisa"&&c.tipo!=="propia"&&(c.calc?.ganImp||0)>0);
          const totalGan=todas.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
          const com20=totalGan*0.20, com25=totalGan*0.25;
          const emp20=totalGan-com20, emp25=totalGan-com25;
          return(
            <div style={{position:"fixed",inset:0,background:"#000c",zIndex:1600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
              <div style={{background:"#ffffff",borderRadius:16,border:"1px solid #e9d5ff",width:"100%",maxWidth:680,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
                {/* Header */}
                <div style={{padding:"18px 24px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:"#a85590"}}>🧮 Simulación total — Comisiones Luisa</div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Todas las cotizaciones asignadas a Luisa con ganancia calculada</div>
                  </div>
                  <button onClick={()=>setSimModal(false)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"7px 13px",cursor:"pointer",fontSize:13}}>✕</button>
                </div>

                {/* Resumen 20% vs 25% */}
                <div style={{padding:"16px 24px",borderBottom:"1px solid #1e1e38"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[[20,com20,emp20,"#2d78c8"],[25,com25,emp25,"#b8922e"]].map(([pct,com,emp,col])=>(
                      <div key={pct} style={{background:`${col}11`,border:`1px solid ${col}33`,borderRadius:12,padding:"14px 18px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:col,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Escenario {pct}% · {todas.length} cotizaciones</div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:11,color:"#64748b"}}>Base total ganancia imp.</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmt(totalGan)}</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:11,color:"#a85590"}}>Comisión Luisa ({pct}%)</span>
                            <span style={{fontSize:15,fontWeight:800,color:"#a85590"}}>{fmt(com)}</span>
                          </div>
                          <div style={{borderTop:`1px solid ${col}33`,paddingTop:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:11,color:"#1aa358"}}>Empresa neto</span>
                            <span style={{fontSize:15,fontWeight:800,color:"#1aa358"}}>{fmt(emp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabla detalle */}
                <div style={{flex:1,overflow:"auto",padding:"12px 24px"}}>
                  {todas.length===0?(
                    <div style={{textAlign:"center",padding:40,color:"#444"}}>No hay cotizaciones de Luisa con ganancia calculada aún.</div>
                  ):(
                    <>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr 1fr",gap:8,padding:"6px 8px",marginBottom:6}}>
                        {["NRO","Cliente · Producto","Estado","Gan. imp.","Com. 20% / 25%"].map(h=>(
                          <div key={h} style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>{h}</div>
                        ))}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {todas.map(c=>{
                          const g=c.calc?.ganImp||0;
                          const sc2=EST_COLOR[c.estado]||"#888";
                          return(
                            <div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr 1fr",gap:8,padding:"8px 10px",background:"#f8fafc",borderRadius:8,alignItems:"center",border:"1px solid #1e1e38"}}>
                              <span style={{fontSize:11,color:"#64748b"}}>{c.nro}</span>
                              <div>
                                <div style={{fontSize:12,fontWeight:600,color:"#0f172a"}}>{c.cliente}</div>
                                <div style={{fontSize:10,color:"#64748b"}}>{c.producto}</div>
                              </div>
                              <span style={{background:sc2+"22",color:sc2,fontSize:9,fontWeight:700,borderRadius:20,padding:"2px 7px",border:`1px solid ${sc2}33`,textAlign:"center"}}>{EST_LABEL[c.estado]||c.estado}</span>
                              <span style={{fontSize:13,fontWeight:700,color:"#0f172a",textAlign:"right"}}>{fmt(g)}</span>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:11,color:"#2d78c8"}}>{fmt(g*0.20)}</div>
                                <div style={{fontSize:11,color:"#b8922e"}}>{fmt(g*0.25)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr 1fr",gap:8,padding:"10px 10px",marginTop:8,borderTop:"1px solid #e2e8f0"}}>
                        <div style={{gridColumn:"1/4",fontSize:12,fontWeight:700,color:"#64748b"}}>TOTAL ({todas.length} cotizaciones)</div>
                        <div style={{fontSize:14,fontWeight:800,color:"#0f172a",textAlign:"right"}}>{fmt(totalGan)}</div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:12,fontWeight:800,color:"#2d78c8"}}>{fmt(com20)}</div>
                          <div style={{fontSize:12,fontWeight:800,color:"#b8922e"}}>{fmt(com25)}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══ CLIENTES ══ */}
        {tab2==="clientes"&&(()=>{
          const clientes=[...new Set(cotizaciones.filter(c=>c.tipo!=="propia"&&c.cliente).map(c=>c.cliente))].sort();
          const todasCliente=clienteSeleccionado?cotizaciones.filter(c=>c.cliente===clienteSeleccionado&&c.tipo!=="propia"):[];

          // Estados agrupados para filtro
          const RECHAZADAS=["rechazada_cliente","anulada","no_procesada"];
          const impsCliente=todasCliente.filter(c=>{
            if(filtroCliente==="todas") return true;
            if(filtroCliente==="activas") return !RECHAZADAS.includes(c.estado)&&c.estado!=="completada";
            if(filtroCliente==="completadas") return c.estado==="completada";
            if(filtroCliente==="rechazadas") return RECHAZADAS.includes(c.estado);
            return true;
          });

          // KPIs sobre TODAS (sin filtro)
          const totUnidades=todasCliente.filter(c=>!RECHAZADAS.includes(c.estado)).reduce((s,c)=>s+(Number(c.unidades)||0),0);
          const totPagado=todasCliente.filter(c=>!RECHAZADAS.includes(c.estado)).reduce((s,c)=>s+(c.calc?.totCl||0),0);
          const tot1er=todasCliente.filter(c=>!RECHAZADAS.includes(c.estado)).reduce((s,c)=>s+(c.calc?.p1Cl||0),0);
          const tot2do=todasCliente.filter(c=>!RECHAZADAS.includes(c.estado)).reduce((s,c)=>s+(c.calc?.p2Cl||0),0);
          const enCurso=todasCliente.filter(c=>PROCESADAS.includes(c.estado)&&c.estado!=="completada").length;
          const completadas=todasCliente.filter(c=>c.estado==="completada").length;
          const rechazadas=todasCliente.filter(c=>RECHAZADAS.includes(c.estado)).length;
          const procesadas=todasCliente.filter(c=>PROCESADAS.includes(c.estado)).length;
          const pctConversion=todasCliente.length>0?Math.round((procesadas/todasCliente.length)*100):0;
          const copyVistaCliente=()=>{ abrirPrint("cliente"); };
          return(
            <div className="clientes-layout" style={{display:"grid",gridTemplateColumns:clienteSeleccionado?"260px 1fr":"300px",gap:20}}>
              <div className={clienteSeleccionado?"clientes-list-mob":""}>
                <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:12}}>Clientes ({clientes.length})</div>
                {clientes.length===0&&<div style={{textAlign:"center",padding:40,color:"#444",fontSize:13}}>Sin clientes aún.<br/>Crea cotizaciones de tipo cliente.</div>}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {clientes.map(cl=>{
                    const imps=cotizaciones.filter(c=>c.cliente===cl&&c.tipo!=="propia");
                    const activas=imps.filter(c=>PROCESADAS.includes(c.estado)&&c.estado!=="completada").length;
                    const comp=imps.filter(c=>c.estado==="completada").length;
                    const rech=imps.filter(c=>["rechazada_cliente","anulada","no_procesada"].includes(c.estado)).length;
                    const conv=imps.length>0?Math.round((imps.filter(c=>PROCESADAS.includes(c.estado)).length/imps.length)*100):0;
                    const sel=clienteSeleccionado===cl;
                    const tienePrimerPago=imps.some(c=>c.checklist?.pago1_cliente);
                    const tieneAcceso=imps.some(c=>c.app_email);
                    return(
                      <div key={cl} onClick={()=>{setClienteSeleccionado(sel?null:cl);setFiltroCliente("todas");}} style={{background:sel?"#f0fdf4":"#f8fafc",border:`1px solid ${sel?"#22c55e55":"#e2e8f0"}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all .15s"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <span style={{fontWeight:700,fontSize:13,color:sel?"#1aa358":"#0f172a",flex:1}}>👤 {cl}</span>
                          {tieneAcceso
                            ? <span style={{fontSize:9,fontWeight:700,color:"#16a34a",background:"#f0fdf4",border:"1px solid #22c55e44",borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap"}}>🔐 App activa</span>
                            : tienePrimerPago
                              ? <span style={{fontSize:9,fontWeight:700,color:"#c0392b",background:"#fff1f2",border:"1px solid #ef444444",borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap"}}>⚠️ Sin acceso</span>
                              : null
                          }
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                          <span style={{fontSize:11,color:"#64748b"}}>{imps.length} cotiz.</span>
                          {activas>0&&<span style={{fontSize:11,color:"#c47830"}}>🚢 {activas} activa{activas!==1?"s":""}</span>}
                          {comp>0&&<span style={{fontSize:11,color:"#0d9870"}}>✅ {comp} completada{comp!==1?"s":""}</span>}
                          {rech>0&&<span style={{fontSize:11,color:"#94a3b8"}}>✗ {rech} rechazada{rech!==1?"s":""}</span>}
                        </div>
                        {/* Mini barra conversión */}
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{flex:1,height:3,background:"#e2e8f0",borderRadius:4,overflow:"hidden"}}>
                            <div style={{height:"100%",background:"#1aa358",borderRadius:4,width:`${conv}%`,transition:"width .4s"}}/>
                          </div>
                          <span style={{fontSize:10,color:"#64748b",whiteSpace:"nowrap"}}>{conv}% conv.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {clienteSeleccionado&&(
                <div style={{minWidth:0,overflow:"hidden"}}>
                  {/* Botón volver — solo mobile */}
                  <button className="clientes-back-btn" onClick={()=>setClienteSeleccionado(null)} style={{display:"none",alignItems:"center",gap:6,background:"none",border:"none",color:"#64748b",fontSize:13,cursor:"pointer",marginBottom:12,padding:0,fontWeight:600}}>
                    ← Volver a clientes
                  </button>
                  <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
                    {renombrando ? (
                      <div style={{display:"flex",gap:6,flex:1,alignItems:"center"}}>
                        <input
                          autoFocus
                          value={nuevoNombreCliente}
                          onChange={e=>setNuevoNombreCliente(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter") handleRenameCliente(clienteSeleccionado,nuevoNombreCliente); if(e.key==="Escape"){setRenombrando(false);setNuevoNombreCliente("");}}}
                          style={{flex:1,background:"#fff",border:"2px solid #c9a055",borderRadius:8,padding:"7px 12px",fontSize:16,fontWeight:700,color:"#0f172a",outline:"none"}}
                        />
                        <button onClick={()=>handleRenameCliente(clienteSeleccionado,nuevoNombreCliente)} style={{background:"#1aa358",color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Guardar</button>
                        <button onClick={()=>{setRenombrando(false);setNuevoNombreCliente("");}} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"7px 12px",fontSize:13,cursor:"pointer"}}>Cancelar</button>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                        <div style={{fontWeight:800,fontSize:18,color:"#0f172a"}}>👤 {clienteSeleccionado}</div>
                        <button onClick={()=>{setRenombrando(true);setNuevoNombreCliente(clienteSeleccionado);}} title="Renombrar cliente" style={{background:"#f8fafc",color:"#94a3b8",border:"1px solid #e2e8f0",borderRadius:7,padding:"4px 9px",fontSize:12,cursor:"pointer"}}>✏️</button>
                      </div>
                    )}
                    {!renombrando&&<button onClick={copyVistaCliente} style={{background:"#040c18",color:"#fff",border:"none",borderRadius:9,padding:"9px 20px",fontSize:13,fontWeight:700,cursor:"pointer"}}>🖨️ Imprimir / Guardar PDF</button>}
                    {!renombrando&&<button onClick={()=>setClienteSeleccionado(null)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:9,padding:"9px 14px",fontSize:13,cursor:"pointer"}}>✕</button>}
                  </div>

                  {/* KPIs */}
                  <div className="kpi-grid dash-kpi5" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
                    {[
                      ["Total cotizadas",todasCliente.length,"#0f172a","📋"],
                      ["Procesadas",procesadas,"#16a34a","✅"],
                      ["Completadas",completadas,"#0d9870","🏆"],
                      ["Rechazadas",rechazadas,"#94a3b8","✗"],
                      ["Tasa de cierre",`${pctConversion}%`,pctConversion>=60?"#16a34a":pctConversion>=30?"#c47830":"#ef4444","📈"],
                    ].map(([l,v,col,ic])=>(
                      <div key={l} style={{background:"#ffffff",borderRadius:10,padding:"14px 12px",border:"1px solid #e2e8f0",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                        <div style={{fontSize:18,marginBottom:4}}>{ic}</div>
                        <div style={{fontSize:9,color:"#64748b",marginBottom:3,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                        <div style={{fontSize:16,fontWeight:800,color:col}}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Barra de conversión visual */}
                  <div style={{background:"#ffffff",borderRadius:10,padding:"14px 16px",marginBottom:16,border:"1px solid #e2e8f0"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:6}}>
                      <span>Tasa de cierre — de {todasCliente.length} cotizaciones, {procesadas} fueron procesadas</span>
                      <span style={{fontWeight:700,color:pctConversion>=60?"#16a34a":pctConversion>=30?"#c47830":"#ef4444"}}>{pctConversion}%</span>
                    </div>
                    <div style={{height:8,background:"#f1f5f9",borderRadius:6,overflow:"hidden",display:"flex"}}>
                      <div style={{height:"100%",background:"#1aa358",width:`${todasCliente.length>0?(completadas/todasCliente.length)*100:0}%`,transition:"width .4s"}}/>
                      <div style={{height:"100%",background:"#60a5fa",width:`${todasCliente.length>0?(enCurso/todasCliente.length)*100:0}%`,transition:"width .4s"}}/>
                      <div style={{height:"100%",background:"#fde68a",width:`${todasCliente.length>0?((procesadas-completadas-enCurso)/todasCliente.length)*100:0}%`,transition:"width .4s"}}/>
                      <div style={{height:"100%",background:"#e2e8f0",flex:1}}/>
                    </div>
                    <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap"}}>
                      {[["#1aa358","Completadas",completadas],["#60a5fa","En curso",enCurso],["#e2e8f0","Rechazadas/Anuladas",rechazadas]].map(([col,lb,n])=>(
                        <div key={lb} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#64748b"}}>
                          <div style={{width:8,height:8,borderRadius:2,background:col,flexShrink:0}}/>
                          {lb}: <b style={{color:"#334155"}}>{n}</b>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financiero — solo cotizaciones no rechazadas */}
                  {totPagado>0&&(
                    <div className="dash-fin3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                      {[["Total facturado",fmt(totPagado),"#0f172a"],["1er pago",fmt(tot1er),"#16a34a"],["2do pago",fmt(tot2do),"#334155"]].map(([l,v,col])=>(
                        <div key={l} style={{background:"#f0fdf4",borderRadius:10,padding:"12px 14px",border:"1px solid #bbf7d0",textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#64748b",marginBottom:3,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                          <div style={{fontSize:15,fontWeight:800,color:col}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── ACCESO APP ── */}
                  {(()=>{
                    const tienePrimerPago = todasCliente.some(c=>c.checklist?.pago1_cliente);
                    const appEmail = todasCliente.find(c=>c.app_email)?.app_email || "";
                    const appPass  = todasCliente.find(c=>c.app_pass)?.app_pass  || "";
                    const tieneAcceso = !!appEmail;
                    const persistApp = async(field,val)=>{
                      const updated = cotizacionesRef.current.map(c=>
                        c.cliente===clienteSeleccionado&&c.tipo!=="propia" ? {...c,[field]:val} : c
                      );
                      await persist(updated);
                    };
                    if(!tienePrimerPago && !tieneAcceso) return null;
                    return (
                      <div style={{marginBottom:16,borderRadius:12,border:`2px solid ${tieneAcceso?"#22c55e44":"#ef444455"}`,overflow:"hidden"}}>
                        {/* Header */}
                        <div style={{background:tieneAcceso?"#f0fdf4":"#fff1f2",padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:16}}>{tieneAcceso?"🔐":"🔴"}</span>
                          <span style={{fontWeight:700,fontSize:13,color:tieneAcceso?"#16a34a":"#c0392b",flex:1}}>
                            {tieneAcceso?"Acceso a la app configurado":"⚠️ Acceso a la app pendiente"}
                          </span>
                          {tienePrimerPago&&!tieneAcceso&&(
                            <span style={{background:"#ef444420",color:"#c0392b",fontSize:10,fontWeight:700,borderRadius:20,padding:"3px 10px",border:"1px solid #ef444455"}}>
                              1er pago ✓ — crear usuario
                            </span>
                          )}
                          {tieneAcceso&&(
                            <span style={{background:"#22c55e20",color:"#16a34a",fontSize:10,fontWeight:700,borderRadius:20,padding:"3px 10px",border:"1px solid #22c55e44"}}>
                              Activo
                            </span>
                          )}
                        </div>
                        {/* Body */}
                        <div style={{background:"#fff",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
                          {/* Email */}
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:11,color:"#64748b",width:60,flexShrink:0}}>📧 Email</span>
                            <input
                              value={appEmail}
                              onChange={e=>persistApp("app_email",e.target.value)}
                              placeholder="email@cliente.com"
                              style={{flex:1,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:7,padding:"7px 10px",fontSize:12,color:"#0f172a",outline:"none"}}
                            />
                            {appEmail&&(
                              <button onClick={()=>{navigator.clipboard.writeText(appEmail);showToast("Email copiado ✓");}}
                                style={{background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:7,padding:"7px 10px",fontSize:11,cursor:"pointer",color:"#475569",whiteSpace:"nowrap"}}>
                                📋 Copiar
                              </button>
                            )}
                          </div>
                          {/* Contraseña */}
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:11,color:"#64748b",width:60,flexShrink:0}}>🔑 Clave</span>
                            <input
                              value={appPass}
                              onChange={e=>persistApp("app_pass",e.target.value)}
                              placeholder="Contraseña del cliente"
                              style={{flex:1,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:7,padding:"7px 10px",fontSize:12,color:"#0f172a",outline:"none"}}
                            />
                            {appPass&&(
                              <button onClick={()=>{navigator.clipboard.writeText(appPass);showToast("Contraseña copiada ✓");}}
                                style={{background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:7,padding:"7px 10px",fontSize:11,cursor:"pointer",color:"#475569",whiteSpace:"nowrap"}}>
                                📋 Copiar
                              </button>
                            )}
                          </div>
                          {appEmail&&appPass&&(
                            <button onClick={()=>{navigator.clipboard.writeText(`Email: ${appEmail}\nContraseña: ${appPass}`);showToast("Credenciales copiadas ✓");}}
                              style={{background:"#040c18",color:"#c9a055",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700,alignSelf:"flex-start"}}>
                              📤 Copiar todo para enviar al cliente
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* FILTROS */}
                  <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                    {[
                      ["todas",`Todas (${todasCliente.length})`,null],
                      ["activas",`Activas (${enCurso})`,  "#2563eb"],
                      ["completadas",`Completadas (${completadas})`,"#16a34a"],
                      ["rechazadas",`Rechazadas / Anuladas (${rechazadas})`,"#94a3b8"],
                    ].map(([k,l,col])=>(
                      <button key={k} onClick={()=>setFiltroCliente(k)} style={{
                        background:filtroCliente===k?(col||"#0f172a")+"18":"#f8fafc",
                        color:filtroCliente===k?(col||"#0f172a"):"#64748b",
                        border:`1px solid ${filtroCliente===k?(col||"#0f172a")+"44":"#e2e8f0"}`,
                        borderRadius:20,padding:"5px 14px",fontSize:12,cursor:"pointer",fontWeight:filtroCliente===k?700:400
                      }}>{l}</button>
                    ))}
                  </div>

                  {/* LISTA */}
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
                    {impsCliente.length===0&&<div style={{textAlign:"center",padding:30,color:"#94a3b8",fontSize:13}}>Sin cotizaciones en esta categoría.</div>}
                    {impsCliente.map(c=>{
                      const sc=EST_COLOR[c.estado]||"#888", sl=EST_LABEL[c.estado]||c.estado;
                      const prog=checkProg(c);
                      const diasLL=c.fecha_llegada_est?Math.ceil((new Date(c.fecha_llegada_est)-new Date())/(1000*60*60*24)):null;
                      const isRech=RECHAZADAS.includes(c.estado);
                      return(
                        <div key={c.id} style={{background:isRech?"#fafafa":"#ffffff",borderRadius:10,padding:16,border:"1px solid #e2e8f0",borderLeft:`4px solid ${sc}`,opacity:isRech?.7:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                            <div style={{flex:1}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                                <span style={{fontWeight:700,fontSize:14,color:isRech?"#94a3b8":"#0f172a"}}>{c.producto}</span>
                                <span onClick={()=>setPreviewId(c.id)} style={{fontSize:11,color:"#2d78c8",cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted"}}>{c.nro}</span>
                                <span style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{sl}</span>
                                {diasLL!==null&&!isRech&&<span style={{background:"#f9741618",color:"#c47830",border:"1px solid #f9741633",borderRadius:20,padding:"2px 9px",fontSize:11}}>{diasLL>0?`🚢 ${diasLL}d`:diasLL===0?"¡Llega hoy!":`⚠️ ${Math.abs(diasLL)}d atraso`}</span>}
                              </div>
                              <div style={{fontSize:12,color:"#64748b"}}>📅 {c.fecha_solicitud||"-"}{c.fecha_llegada_est&&!isRech?` · 🏁 ${c.fecha_llegada_est}`:""}</div>
                              {!isRech&&(
                                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                                  <div style={{width:100,height:3,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",background:sc,borderRadius:4,width:`${(prog.done/prog.total)*100}%`}}/></div>
                                  <span style={{fontSize:11,color:"#64748b"}}>{prog.done}/{prog.total} pasos</span>
                                </div>
                              )}
                              {c.motivo_no_procesada&&<div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>Motivo: {c.motivo_no_procesada}</div>}
                            </div>
                            {!isRech&&c.calc&&(
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,minWidth:240}}>
                                {[["Unidades",fmtN(c.unidades),"#0f172a"],["1er Pago",fmt(c.calc?.p1Cl),"#16a34a"],["2do Pago",fmt(c.calc?.p2Cl),"#334155"]].map(([l,v,col])=>(
                                  <div key={l} style={{background:"#f8fafc",borderRadius:7,padding:"7px 8px",textAlign:"center"}}>
                                    <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>{l}</div>
                                    <div style={{fontSize:12,fontWeight:700,color:col}}>{v}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {isRech&&(
                              <div style={{fontSize:12,color:"#94a3b8",alignSelf:"center"}}>{fmtN(c.unidades)} und</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:10}}>📄 Vista para enviar al cliente</div>
                  <div ref={vistaClienteRef} style={{background:"#fff",borderRadius:16,overflow:"hidden",color:"#222",fontFamily:"'Segoe UI',Arial,sans-serif",border:"1px solid #e5e7eb"}}>
                    <div style={{background:"#f1f5f9",padding:"24px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <img src={LOGO_DARK} alt="ZAGA IMP" style={{height:28,width:"auto",objectFit:"contain"}}/>
                    <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Estado de Importaciones</div>
                  </div>
                      <div style={{textAlign:"right"}}><div style={{fontSize:13,color:"#c9a055",fontWeight:700}}>{clienteSeleccionado}</div><div style={{fontSize:11,color:"#64748b"}}>{todayStr()}</div></div>
                    </div>
                    <div style={{padding:"20px 32px",borderBottom:"2px solid #f0f0f0",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
                      {[["Total importaciones",impsCliente.length,"#0c1a2e"],["Total facturado",fmt(totPagado),"#0f7040"],["Unidades",fmtN(totUnidades),"#1d4ed8"],["Completadas",completadas,"#0d9870"]].map(([l,v,col])=>(
                        <div key={l} style={{textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{l}</div>
                          <div style={{fontSize:20,fontWeight:800,color:col}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"20px 32px"}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#333",marginBottom:12}}>Detalle de importaciones</div>
                      {impsCliente.map(c=>{
                        const sc=EST_COLOR[c.estado]||"#888", sl=EST_LABEL[c.estado]||c.estado;
                        const prog=checkProg(c);
                        const diasLL=c.fecha_llegada_est?Math.ceil((new Date(c.fecha_llegada_est)-new Date())/(1000*60*60*24)):null;
                        return(
                          <div key={c.id} style={{borderRadius:10,border:`2px solid ${sc}33`,marginBottom:12,overflow:"hidden"}}>
                            <div style={{background:sc+"11",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${sc}22`}}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <span style={{fontWeight:700,fontSize:13,color:"#222"}}>{c.producto}</span>
                                <span style={{fontSize:11,color:"#64748b"}}>{c.nro}</span>
                              </div>
                              <span style={{background:sc,color:"#fff",borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700}}>{sl}</span>
                            </div>
                            <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,background:"#fff"}}>
                              {[["Unidades",fmtN(c.unidades)],["Solicitud",c.fecha_solicitud||"-"],["Llegada est.",c.fecha_llegada_est||"-"],["1er pago",fmt(c.calc?.p1Cl)],["2do pago",fmt(c.calc?.p2Cl)]].map(([l,v])=>(
                                <div key={l}><div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:700,color:"#222"}}>{v}</div></div>
                              ))}
                            </div>
                            <div style={{padding:"8px 16px",background:"#f9f9f9",borderTop:`1px solid ${sc}22`}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <div style={{flex:1,height:6,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",background:sc,borderRadius:4,width:`${(prog.done/prog.total)*100}%`}}/></div>
                                <span style={{fontSize:11,color:"#666",whiteSpace:"nowrap"}}>{prog.done}/{prog.total} etapas</span>
                                {diasLL!==null&&<span style={{fontSize:11,color:diasLL<0?"#c0392b":"#c47830",whiteSpace:"nowrap",marginLeft:8}}>{diasLL>0?`🚢 ${diasLL}d`:diasLL===0?"¡Llega hoy!":`⚠️ ${Math.abs(diasLL)}d atraso`}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{background:"#f1f5f9",borderRadius:10,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                        <span style={{color:"#64748b",fontSize:13,fontWeight:600}}>TOTALES — {impsCliente.length} importación{impsCliente.length!==1?"es":""} · {fmtN(totUnidades)} unidades</span>
                        <div style={{textAlign:"right"}}>
                          <div style={{color:"#64748b",fontSize:11}}>1er pago: <span style={{color:"#1aa358",fontWeight:700}}>{fmt(tot1er)}</span> · 2do pago: <span style={{color:"#334155",fontWeight:700}}>{fmt(tot2do)}</span></div>
                          <div style={{color:"#334155",fontSize:18,fontWeight:800,marginTop:2}}>Total: {fmt(totPagado)}</div>
                        </div>
                      </div>
                      <div style={{marginTop:12,fontSize:10,color:"#64748b",textAlign:"center"}}>Generado por ZAGA IMP · {todayStr()}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ LUISA DASHBOARD ══ */}
        {tab2==="luisa"&&(()=>{
          const hoy=new Date();
          const mesActual=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
          const mesAnterior=new Date(hoy.getFullYear(),hoy.getMonth()-1,1);
          const mesAnt=`${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth()+1).padStart(2,"0")}`;

          const todas=cotizaciones.filter(c=>c.gestor==="luisa"&&c.tipo!=="propia");
          const enProceso=todas.filter(c=>["enviado_china","respuesta_china","enviada_cliente","en_negociacion","aceptada","pagada_china","en_camino"].includes(c.estado));
          const cerradas=todas.filter(c=>c.checklist?.pago1_cliente&&c.fecha_pago1_cliente);
          const completadas=todas.filter(c=>c.estado==="completada");

          // Ganancias reales por mes (base para comisión)
          const porMes={};
          cerradas.forEach(c=>{
            const m=c.fecha_pago1_cliente.substring(0,7);
            if(!porMes[m]) porMes[m]=[];
            porMes[m].push(c);
          });
          const meses=Object.keys(porMes).sort();

          const calcMes=(lista)=>{
            const n=lista.length, pct=n>=6?0.25:0.20;
            const base=lista.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
            return {n,pct,base,com:base*pct,emp:base*(1-pct)};
          };

          // Mes en curso: cotizaciones con 1er pago en mes actual
          const mesActualList=porMes[mesActual]||[];
          const mesActualCalc=calcMes(mesActualList);

          // Proyección mes actual: + cotizaciones aceptadas sin pago aún
          const proyPendientes=todas.filter(c=>["aceptada"].includes(c.estado)&&!c.checklist?.pago1_cliente);
          const proyBase=mesActualCalc.base+proyPendientes.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
          const proyN=mesActualCalc.n+proyPendientes.length;
          const proyPct=proyN>=6?0.25:0.20;
          const proyComision=proyBase*proyPct;

          // Total histórico
          const totalBase=cerradas.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
          const totalCom20=totalBase*0.20, totalCom25=totalBase*0.25;

          // Estado colores motivacionales
          const motivaFrase=()=>{
            if(cerradas.length===0) return {emoji:"🚀",txt:"¡Hora de cerrar el primer cliente!",col:"#6a9fd4"};
            if(mesActualList.length>=6) return {emoji:"🏆",txt:"¡Nivel 25%! Tienes 6+ cierres este mes",col:"#c9a055"};
            if(mesActualList.length>=3) return {emoji:"🔥",txt:`${6-mesActualList.length} cierres más para alcanzar el 25%`,col:"#c47830"};
            return {emoji:"⭐",txt:`${6-mesActualList.length} cierres más para el nivel 25%`,col:"#1aa358"};
          };
          const mot=motivaFrase();

          return(
            <div>
              {/* HEADER MOTIVACIONAL */}
              <div style={{background:"#ffffff",borderRadius:16,padding:"24px 28px",marginBottom:20,border:"1px solid #e2e8f0",position:"relative",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{position:"absolute",right:20,top:10,fontSize:80,opacity:.06}}>👩‍💼</div>
                <div style={{fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:4}}>Hola, Luisa 👋</div>
                <div style={{fontSize:13,color:"#64748b",marginBottom:16}}>Tu panel de rendimiento · {new Date().toLocaleDateString("es-CL",{month:"long",year:"numeric"})}</div>
                <div style={{display:"inline-flex",alignItems:"center",gap:8,background:mot.col+"22",border:`1px solid ${mot.col}44`,borderRadius:12,padding:"8px 16px"}}>
                  <span style={{fontSize:20}}>{mot.emoji}</span>
                  <span style={{fontSize:13,fontWeight:700,color:mot.col}}>{mot.txt}</span>
                </div>
              </div>

              {/* KPIs PRINCIPALES */}
              <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
                {[
                  {icon:"📋",label:"Cotizaciones totales",val:todas.length,col:"#2563eb",sub:`${enProceso.length} en proceso`},
                  {icon:"✅",label:"Con 1er pago recibido",val:cerradas.length,col:"#16a34a",sub:`${completadas.length} completadas`},
                  {icon:"🏆",label:"Cierres este mes",val:mesActualList.length,col:mesActualList.length>=6?"#c9a055":"#a85590",sub:mesActualList.length>=6?"Nivel 25% 🎉":`Falta${6-mesActualList.length===1?"":"n"} ${6-mesActualList.length} para 25%`},
                  {icon:"💰",label:"Ganancia empresa total",val:fmt(cerradas.reduce((s,c)=>s+(c.calc?.ganImp||0),0)),col:"#c9a055",sub:"Base para tu comisión"},
                ].map(({icon,label,val,col,sub})=>(
                  <div key={label} style={{background:"#f1f5f9",borderRadius:12,padding:"16px 18px",border:`1px solid ${col}33`}}>
                    <div style={{fontSize:18,marginBottom:6}}>{icon}</div>
                    <div style={{fontSize:10,color:"#64748b",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>{label}</div>
                    <div style={{fontSize:typeof val==="string"?16:22,fontWeight:800,color:col}}>{val}</div>
                    {sub&&<div style={{fontSize:10,color:"#64748b",marginTop:3}}>{sub}</div>}
                  </div>
                ))}
              </div>

              {/* MES EN CURSO + PROYECCIÓN */}
              <div className="luisa-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
                {/* Mes actual */}
                <div style={{background:"#ffffff",borderRadius:14,padding:20,border:"1px solid #f9a8d4"}}>
                  <div style={{fontSize:11,color:"#9333ea",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>📅 Mes actual — {monthLabel(mesActual)}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:"#64748b"}}>Cierres confirmados</span>
                      <span style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{mesActualCalc.n}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:"#64748b"}}>Tasa de comisión</span>
                      <span style={{fontSize:14,fontWeight:700,color:mesActualCalc.n>=6?"#c9a055":"#a85590"}}>{fmtP(mesActualCalc.pct*100)}{mesActualCalc.n>=6?" 🏆":""}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:"#64748b"}}>Base ganancia</span>
                      <span style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>{fmt(mesActualCalc.base)}</span>
                    </div>
                    <div style={{borderTop:"1px solid #ec489933",paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:13,color:"#a85590",fontWeight:700}}>Tu comisión estimada</span>
                      <span style={{fontSize:22,fontWeight:800,color:"#a85590"}}>{fmt(mesActualCalc.com)}</span>
                    </div>
                  </div>
                  {/* barra progreso hacia 6 cierres */}
                  <div style={{marginTop:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b",marginBottom:4}}>
                      <span>Progreso hacia nivel 25%</span>
                      <span>{mesActualCalc.n}/6 cierres</span>
                    </div>
                    <div style={{height:6,background:"#e2e8f0",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",background:mesActualCalc.n>=6?"linear-gradient(to right,#f5c842,#f97316)":"linear-gradient(to right,#ec4899,#a855f7)",borderRadius:4,width:`${Math.min(100,(mesActualCalc.n/6)*100)}%`,transition:"width .4s"}}/>
                    </div>
                  </div>
                </div>

                {/* Proyección con aceptadas pendientes */}
                <div style={{background:"#ffffff",borderRadius:14,padding:20,border:"1px solid #bbf7d0"}}>
                  <div style={{fontSize:11,color:"#1aa358",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>🔮 Proyección mes actual</div>
                  <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>Incluye {proyPendientes.length} cotización{proyPendientes.length!==1?"es":""} aceptada{proyPendientes.length!==1?"s":""} pendiente{proyPendientes.length!==1?"s":""} de pago</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:"#64748b"}}>Cierres proyectados</span>
                      <span style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{proyN}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:"#64748b"}}>Tasa proyectada</span>
                      <span style={{fontSize:14,fontWeight:700,color:proyN>=6?"#c9a055":"#1aa358"}}>{fmtP(proyPct*100)}{proyN>=6?" 🏆":""}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,color:"#64748b"}}>Base proyectada</span>
                      <span style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>{fmt(proyBase)}</span>
                    </div>
                    <div style={{borderTop:"1px solid #22c55e33",paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:13,color:"#1aa358",fontWeight:700}}>Comisión proyectada</span>
                      <span style={{fontSize:22,fontWeight:800,color:"#1aa358"}}>{fmt(proyComision)}</span>
                    </div>
                  </div>
                  {proyPendientes.length>0&&(
                    <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
                      {proyPendientes.map(c=>(
                        <div key={c.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"4px 8px",background:"#f0fdf4",borderRadius:6}}>
                          <span style={{color:"#475569"}}>{c.nro} · {c.cliente}</span>
                          <span style={{color:"#16a34a",fontWeight:600}}>+{fmt(c.calc?.ganImp||0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* HISTORIAL POR MES */}
              {meses.length>0&&(
                <div style={{background:"#f1f5f9",borderRadius:14,padding:20,border:"1px solid #e2e8f0",marginBottom:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#a85590",marginBottom:16,textTransform:"uppercase",letterSpacing:1}}>📈 Historial de comisiones por mes</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {[...meses].reverse().map(m=>{
                      const {n,pct,base,com,emp}=calcMes(porMes[m]);
                      const esPendiente=m===mesAnt&&hoy.getDate()<=5;
                      return(
                        <div key={m} style={{background:esPendiente?"#08121e":"#f8fafc",borderRadius:10,padding:"12px 16px",border:`1px solid ${esPendiente?"#c0392b33":"#1a2d45"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontWeight:700,fontSize:13,textTransform:"capitalize",color:esPendiente?"#c0392b":"#0f172a"}}>{monthLabel(m)}</span>
                              <span style={{background:n>=6?"#c9a05522":"#a8559022",color:n>=6?"#c9a055":"#a85590",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:`1px solid ${n>=6?"#c9a05544":"#a8559044"}`}}>{n} {n>=6?"cierres · 25% 🏆":"cierres · 20%"}</span>
                              {esPendiente&&<span style={{background:"#c0392b18",color:"#c0392b",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:"1px solid #ef444433"}}>⚠ Pago pendiente</span>}
                            </div>
                            <div style={{display:"flex",gap:20,alignItems:"center"}}>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase"}}>Base empresa</div>
                                <div style={{fontSize:12,fontWeight:600,color:"#64748b"}}>{fmt(base)}</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:9,color:"#a85590",textTransform:"uppercase"}}>Tu comisión</div>
                                <div style={{fontSize:18,fontWeight:800,color:"#a85590"}}>{fmt(com)}</div>
                              </div>
                            </div>
                          </div>
                          {/* Mini detalle */}
                          <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                            {porMes[m].map(c=>(
                              <div key={c.id} style={{background:"#f1f5f9",borderRadius:6,padding:"3px 10px",fontSize:10,color:"#777"}}>
                                {c.nro} · {c.cliente} · <span style={{color:"#a85590",fontWeight:600}}>{fmt((c.calc?.ganImp||0)*pct)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Total acumulado */}
                  <div style={{marginTop:14,padding:"14px 16px",background:"linear-gradient(135deg,#1a0a20,#200e2a)",borderRadius:10,border:"1px solid #ec489933",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:11,color:"#64748b"}}>Total acumulado ganado</div>
                      <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{cerradas.length} importaciones cerradas</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",marginBottom:2}}>Tu total histórico</div>
                      <div style={{fontSize:26,fontWeight:800,color:"#a85590"}}>{fmt(cerradas.reduce((s,c)=>s+((c.calc?.ganImp||0)*(cerradas.filter(x=>x.fecha_pago1_cliente?.substring(0,7)===c.fecha_pago1_cliente?.substring(0,7)).length>=6?0.25:0.20)),0))}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* IMPORTACIONES EN PROCESO */}
              {enProceso.length>0&&(
                <div style={{background:"#f1f5f9",borderRadius:14,padding:20,border:"1px solid #e2e8f0"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginBottom:14,textTransform:"uppercase",letterSpacing:1}}>🚀 Tus importaciones en proceso ({enProceso.length})</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {enProceso.map(c=>{
                      const sc2=EST_COLOR[c.estado]||"#888";
                      return(
                        <div key={c.id} style={{background:"#f8fafc",borderRadius:10,padding:"12px 16px",border:`1px solid ${sc2}33`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                              <span style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>{c.cliente}</span>
                              <span style={{fontSize:11,color:"#64748b"}}>{c.nro}</span>
                              <span style={{background:sc2+"22",color:sc2,fontSize:10,fontWeight:700,borderRadius:20,padding:"1px 8px",border:`1px solid ${sc2}33`}}>{EST_LABEL[c.estado]}</span>
                            </div>
                            <div style={{fontSize:11,color:"#666"}}>{c.producto}{c.unidades?` · ${fmtN(c.unidades)} und`:""}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase"}}>Ganancia imp. est.</div>
                            <div style={{fontSize:15,fontWeight:800,color:"#0f172a"}}>{fmt(c.calc?.ganImp||0)}</div>
                            <div style={{fontSize:10,color:"#a85590"}}>Tu comisión: {fmt((c.calc?.ganImp||0)*0.20)} – {fmt((c.calc?.ganImp||0)*0.25)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {todas.length===0&&(
                <div style={{textAlign:"center",padding:60,color:"#444"}}>
                  <div style={{fontSize:50,marginBottom:12}}>👩‍💼</div>
                  <div style={{fontSize:16,fontWeight:700,color:"#a85590",marginBottom:8}}>¡Bienvenida Luisa!</div>
                  <div style={{fontSize:13,color:"#64748b"}}>Tus cotizaciones aparecerán aquí cuando estén asignadas a ti.</div>
                </div>
              )}
            </div>
          );
        })()}


      </div>
    </div>
  );
}

function ScrollTopBtn() {
  const [vis, setVis] = useState(false);
  useEffect(()=>{
    const fn = ()=>setVis(window.scrollY>300);
    window.addEventListener('scroll',fn);
    return ()=>window.removeEventListener('scroll',fn);
  },[]);
  if(!vis) return null;
  return (
    <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}
      style={{position:'fixed',bottom:24,right:20,width:44,height:44,borderRadius:'50%',background:'#040c18',border:'2px solid #c9a055',color:'#c9a055',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.15)',zIndex:200,fontWeight:700,fontFamily:"inherit"}}>↑</button>
  );
}
