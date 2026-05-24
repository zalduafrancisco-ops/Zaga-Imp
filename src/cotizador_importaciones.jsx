import React, { useState, useEffect, useCallback, useRef } from "react";
import LOGO_WHITE from "./logo-white.png";
import LOGO_DARK  from "./logo-dark.png";

const PCT_COM_CLIENTE = 0.065;
// Los clientes se obtienen dinámicamente desde las cotizaciones guardadas (clientesUnicos)
const CHECKLIST_CLIENTE = [
  { key:"solicitud",     label:"Enviado a China",                group:"cotizacion" },
  { key:"china_cotizo",      label:"China respondió cotización",     group:"cotizacion" },
  { key:"pago1_cliente",     label:"1er pago recibido del cliente",  group:"pagos" },
  { key:"factura1",          label:"Factura 1er pago emitida",       group:"pagos" },
  { key:"pago_china",        label:"Pago a China realizado",         group:"china" },
  { key:"en_produccion",     label:"En proceso de producción",       group:"china" },
  { key:"almacen_china",     label:"Ingreso en almacén de China",    group:"china" },
  { key:"ctrl_calidad",      label:"Control de calidad en China OK", group:"china" },
  { key:"llego_chile",       label:"Llegó a Chile",                  group:"logistica" },
  { key:"pago2_cliente",     label:"2do pago recibido del cliente",  group:"pagos" },
  { key:"factura2",          label:"Factura 2do pago emitida",       group:"pagos" },
  { key:"retirado_bodega",   label:"Retirado a mi bodega — Completada", group:"logistica" },
];

const CHECKLIST_PROPIA = [
  { key:"solicitud",     label:"Enviado a China",                group:"cotizacion" },
  { key:"china_cotizo",      label:"China respondió cotización",     group:"cotizacion" },
  { key:"pago_china",        label:"Pago a China realizado",         group:"china" },
  { key:"en_produccion",     label:"En proceso de producción",       group:"china" },
  { key:"almacen_china",     label:"Ingreso en almacén de China",    group:"china" },
  { key:"ctrl_calidad",      label:"Control de calidad en China OK", group:"china" },
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

// ── Estados simplificados (migración 2026-05-19, de 14 → 7) ────────────────
// Razón "no_prospero" detallada queda en datos.razon_no_prospero (rechazada_cliente/anulada/no_procesada)
const EST_LABEL = {
  solicitud:   "📝 Solicitud",
  cotizada:    "💬 Cotizada",
  pagada:      "💰 Pagada",
  en_camino:   "✈️ En camino",
  en_bodega:   "🇨🇱 En bodega",
  completada:  "✓ Completada",
  no_prospero: "❌ No prosperó",
};
const EST_COLOR = {
  solicitud:   "#6a9fd4",
  cotizada:    "#2d78c8",
  pagada:      "#c47830",
  en_camino:   "#a85590",
  en_bodega:   "#3d7fc4",
  completada:  "#0d9870",
  no_prospero: "#c0392b",
};
// Estados que indican que la cotización avanzó (cliente pagó o después)
const PROCESADAS = ["pagada","en_camino","en_bodega","completada"];

// ── Mapeo estado operación → estado cotización ─────────────────────────────
// Estados unificados: op y cot usan los mismos 7 nombres.
const OP_COT_STATE_MAP = {
  borrador:    null,            // no propagar (op en armado)
  cotizada:    "cotizada",
  pagada:      "pagada",
  en_camino:   "en_camino",
  en_bodega:   "en_bodega",
  completada:  "completada",
  no_prospero: "no_prospero",
};
// Estados terminales de cotización que NO deben sobrescribirse al propagar
const COT_ESTADOS_TERMINALES = ["no_prospero"];

const makeDefaultForm = (usuario) => ({
  tipo:"cliente",
  gestor: usuario?.nombre?.toLowerCase()==="luisa" ? "luisa" : "francisco",
  cliente:"", categoria_cliente:"nuevo", transporte:"maritimo", producto:"", link_alibaba:"", imagen_url:"",
  fecha_solicitud: new Date().toISOString().split("T")[0],
  unidades:"", precio_china:"", comision_real:"",
  pct_deposito:30, margen_und:"", pct_servicio:4, pct_com_prestamo:6.5, precio_venta_cliente:"",
  fulfillment_und:1200, pct_devolucion:20,
  cda:0, cda_cl:0, cda_descripcion:"", con_iva:false, pago_100:false, notas:"", requiere_factura:false,
  // Modelo marítimo v2 (default para cots NUEVAS desde 2026-05-24):
  // - margen default 15% sobre precio China
  // - sin % servicio al cliente
  // - comisión 6.5% calculada (cliente sobre 70% precio cliente, china sobre 70% precio china)
  // Cots viejas no tienen este flag → siguen usando fórmula vieja con servicio + comR manual.
  modelo_v2:true,
  // Aéreo — costos aduaneros (editables, prefijados según agente)
  form_f_incluido:true, incluir_aforo:true,
  aer_honorarios:150000, aer_edi:15000, aer_despacho:50000, aer_aeropuerto:68000, aer_aforo:48000,
  // Aéreo — modo de cobro Sunny (auto = max chargeable | peso = USD/kg | volumen = USD/CBM)
  aer_modo_cobro_sunny:"auto", aer_tarifa_sunny_kg:9.55, aer_tarifa_sunny_cbm:"",
  // Auto-margen — % margen bruto objetivo (sobre venta) usado por el botón "🎯 Calcular precio"
  pct_margen_target_cliente:25,
  // Portal Sunny — campos que llena Sunny al cotizar (RMB nativo, días estimados producción)
  precio_china_rmb:"", dias_estimados_china:"",
  // Ajuste manual final — precio POR UNIDAD c/IVA realmente acordado con el cliente
  // Si vacío: usa precio calculado. Si lleno: total = precio_und × unidades, diff ajusta margen ZAGA.
  precio_final_acordado_und:"",
  nro_factura_cliente:"", link_factura_cliente:"",
  variantes:"", // colores, tallas, cantidades por variante
  fecha_llegada_real:"", sku_china:"",
  fulfillment_cliente:true, sku_bodega:"", fulfillment_producto_creado:false,
  fulfillment_costo_real:"", fulfillment_notas:"",
  dim_largo:"", dim_ancho:"", dim_alto:"", dim_m3:"", dim_und_caja:"", dim_tipo:"caja", peso_kg:"",
  negociacion_rondas:[], // [{fecha, nota, unidades_prop, precio_prop, estado:"pendiente"|"aplicada"|"rechazada"}]
  // propia
  precio_venta_und:"", pct_margen_objetivo:"",
  canales:[], pct_comision_marketplace:0,
});

// ── Calculations ─────────────────────────────────────────────────
function calcCliente(d) {
  const isAereo = d.transporte === "aereo";
  const u=Number(d.unidades)||0, pCh=Number(d.precio_china)||0, comR=Number(d.comision_real)||0;
  // En aéreo: forzar pago 100%, sin comisión préstamo, servicio default 6%, con factura
  const pDep = isAereo ? 1 : (Number(d.pct_deposito)||30)/100;
  const mar=Number(d.margen_und)||0;
  const pctServDefault = isAereo ? 6 : 4;
  const pServ=(Number(d.pct_servicio)||pctServDefault)/100, fUnd=Number(d.fulfillment_und)||1200;
  const pDev=(Number(d.pct_devolucion)||20)/100;
  const conFact=!!d.requiere_factura, conIva = isAereo ? true : !!d.con_iva, pago100 = isAereo ? true : !!d.pago_100;
  // Modelo marítimo v2: cots NUEVAS (desde 2026-05-24) → comisión calculada 6.5% sobre china,
  // no se ingresa manual. Cots viejas (sin modelo_v2) → comR manual como siempre.
  const esV2Mar = !isAereo && !pago100 && d.modelo_v2 === true;
  const comREff = pago100 ? 0 : (esV2Mar ? (pCh * u * (1-pDep) * 0.065) : comR);

  // ── CDA aéreo: solo NETOS que se trasladan al cliente como ítem en factura ──
  // El IVA aduana (19% × CIF) NO se cobra al cliente como ítem — ZAGA lo paga en el despacho
  // y lo recupera como crédito fiscal en F29. Es neutro vs el IVA del producto que cobra al cliente.
  let cda, cdaCl, aer = null;
  if (isAereo) {
    const aforoOn = d.incluir_aforo !== false;
    const aduFijo = (Number(d.aer_honorarios)||150000) +
                    (Number(d.aer_edi)||15000) +
                    (Number(d.aer_despacho)||50000) +
                    (Number(d.aer_aeropuerto)||68000) +
                    (aforoOn ? (Number(d.aer_aforo)||48000) : 0);
    const formF = d.form_f_incluido !== false;
    const arancelPct = formF ? 0 : 0.06;
    // IVA agente Leslie aplica SOLO sobre servicios del agente: honorarios + EDI + despacho.
    // Aeropuerto + aforo NO son del agente (son cargos fiscales del aeropuerto), no llevan IVA agente.
    const baseIvaAgente = (Number(d.aer_honorarios)||150000) +
                          (Number(d.aer_edi)||15000) +
                          (Number(d.aer_despacho)||50000);
    const ivaAgente = baseIvaAgente * 0.19;

    const cifReal = pCh * u;          // mi CIF real (lo que pago a China)
    const cifCl   = (pCh + mar) * u;  // CIF mostrado al cliente (precio venta)

    const arancelReal = cifReal * arancelPct;
    const arancelCl   = cifCl   * arancelPct;
    // IVA aduana = 19% × (CIF + arancel) — base correcta según Aduana Chile
    const ivaAduanaReal = (cifReal + arancelReal) * 0.19;  // info: lo que paga ZAGA (recuperable F29)
    const ivaAduanaCl   = (cifCl   + arancelCl)   * 0.19;  // info: equivalente sobre venta

    // CDA al cliente: SOLO NETOS (aduana fija + arancel si Form F OFF). IVA agente va aparte como IVA del line.
    cda   = aduFijo + arancelReal;   // neto que ZAGA traslada como costo
    cdaCl = aduFijo + arancelCl;     // neto que se cobra al cliente
    aer = { aduFijo, ivaAgente, ivaAduanaReal, ivaAduanaCl, arancelReal, arancelCl, formF, aforoOn, arancelPct,
            difArancel: arancelCl - arancelReal };
  } else {
    cda = Number(d.cda)||0;
    cdaCl = Number(d.cda_cl)||cda;
  }

  // ── Lado China ──
  const tChNeto=pCh*u;                          // costo producto sin IVA
  // En aéreo (importación) China NO emite factura con IVA chileno → ivaChina siempre 0.
  // El IVA chileno se paga una sola vez en aduana al SII sobre el CIF declarado.
  // Para marítimo o compras locales con factura, ivaChina aplica normal.
  const ivaChina = (conFact && !isAereo) ? tChNeto*0.19 : 0;
  const tCh=tChNeto+ivaChina;                   // total real pagado a China
  const totCh=tChNeto+comREff+ivaChina+cda, cRUnd=u>0?totCh/u:0;
  const dCh=pago100?0:tChNeto*pDep, prCh=pago100?0:tChNeto*(1-pDep); // split 30/70 solo si NO pago 100%
  const p1Ch=pago100?totCh:dCh+comREff+cda, p2Ch=pago100?0:prCh+ivaChina; // pago_100: todo va al 1er pago

  // ── Lado Cliente ──
  const pCUnd=pCh+mar, tCl=pCUnd*u;
  const dCl=pago100?0:tCl*pDep, prCl=pago100?0:tCl*(1-pDep);
  // V2: comisión cliente = 6.5% × saldo cliente (calculada). V1: comCl = comR (manual app).
  // V2: sin servicio. V1: serv = % sobre tCl.
  const comCl = pago100 ? 0 : (esV2Mar ? prCl * 0.065 : comREff);
  const serv = esV2Mar ? 0 : tCl * pServ;
  // IVA cliente: en aéreo se aplica IVA 19% a TODOS los netos (mercadería + gestión aduanera + servicio),
  // como factura normal. cdaCl ahora es solo neto (sin IVA dentro), entonces se trata igual que marítimo.
  const ivaCliente = isAereo
    ? (tCl + cdaCl + serv) * 0.19
    : (conIva ? (tCl+comCl+serv+cdaCl)*0.19 : 0);
  const totCl=tCl+comCl+serv+cdaCl;
  const p1Cl=pago100?totCl:dCl+comCl+cdaCl, p2Cl=pago100?0:prCl+serv;
  const p1ClIva = isAereo ? p1Cl*1.19 : (conIva?p1Cl*1.19:p1Cl);
  const p2ClIva = isAereo ? p2Cl*1.19 : (conIva?p2Cl*1.19:p2Cl);
  const totClIva = isAereo ? totCl*1.19 : (conIva?totCl*1.19:totCl);
  const pfUnd=u>0?totCl/u:0;

  // ── Ganancia ──
  // Ganancia base (sin considerar IVA — margen operacional)
  const ganMar=tCl-tChNeto, difCom=comCl-comREff, ganServ=serv, ganCda=cdaCl-cda;
  const ganImp=ganMar+difCom+ganServ+ganCda;
  // ── IVA flow correcto ──
  // Crédito fiscal: TODOS los IVA pagados con factura (China + agente + aduana en aéreo)
  const ivaAgenteAer = (isAereo && aer) ? aer.ivaAgente : 0;
  const ivaAduanaAer = (isAereo && aer) ? aer.ivaAduanaReal : 0;
  const ivaRecuperado = (conFact ? ivaChina : 0) + ivaAgenteAer + ivaAduanaAer;
  const ivaDebitoCliente = ivaCliente;       // débito fiscal al cobrar con factura
  const saldoF29 = conIva ? (ivaDebitoCliente - ivaRecuperado) : 0; // <0 = SII paga a ZAGA
  const ivaNetoFavor = ivaDebitoCliente - (conFact ? ivaChina : 0); // legacy compat — solo China
  // Ganancia real con IVA:
  //   Si conIva: IVAs son neutros (se compensan en F29) → ganImp queda igual
  //   Si !conIva: ZAGA pierde los IVAs que pagó (no puede compensar sin débito)
  const ivaPerdido = conIva ? 0 : ivaRecuperado;
  const ganImpConIva = ganImp - ivaPerdido;

  const gan1=pago100?ganImp:(dCl-tCh*pDep)+difCom, gan2=pago100?0:(prCl-tCh*(1-pDep))+serv;

  // ── Ajuste manual: si hay precio_final_acordado_und, sobrescribe totClIva y ajusta margen ──
  const precioFinalAcordadoUnd = Number(d.precio_final_acordado_und) || 0;
  const precioFinalAcordadoTotal = precioFinalAcordadoUnd > 0 && u > 0 ? precioFinalAcordadoUnd * u : 0;
  let totClIvaFinal = totClIva;
  let ajusteManual = 0;
  let ganImpAjustado = ganImp;
  if (precioFinalAcordadoTotal > 0) {
    totClIvaFinal = precioFinalAcordadoTotal;
    // El ajuste va al margen: diff entre acordado y calculado (ambos c/IVA), pasado a neto
    const totClFinalNeto = precioFinalAcordadoTotal / 1.19;
    const totClCalculadoNeto = totCl;
    ajusteManual = totClFinalNeto - totClCalculadoNeto; // CLP netos: positivo = cobré más, negativo = descuento
    ganImpAjustado = ganImp + ajusteManual;
  }

  const uDev=Math.round(u*pDev), uFull=u+uDev, ganFull=uFull*fUnd, ganTot=ganImpAjustado+ganFull;
  // Costo real NETO total (sin IVAs recuperables si conIva, incluyendo IVAs perdidos si !conIva)
  const costoNetoReal = tChNeto + comREff + cda + ivaPerdido;
  const cRUndNeto = u>0 ? costoNetoReal / u : 0;
  const markup=pCh>0?((pCUnd-pCh)/pCh)*100:0;
  // Margen bruto: si hay ajuste manual, usa el TOTAL FINAL (neto) y la ganancia ajustada
  const totClParaMg = precioFinalAcordadoTotal > 0 ? precioFinalAcordadoTotal / 1.19 : totCl;
  const mgBrut = totClParaMg > 0 ? (ganImpAjustado / totClParaMg) * 100 : 0;
  // ROI sobre costo neto real (excluye IVAs recuperables) — métrica más honesta
  const roi = costoNetoReal>0 ? (ganImpAjustado/costoNetoReal)*100 : 0;
  const mult=cRUnd>0?pfUnd/cRUnd:0;
  return { tChNeto,ivaChina,tCh,dCh,prCh,comR:comREff,p1Ch,p2Ch,totCh,cRUnd,cRUndNeto,pCUnd,tCl,dCl,prCl,comCl,serv,cda,cdaCl,ganCda,p1Cl,p2Cl,totCl,p1ClIva,p2ClIva,totClIva,totClIvaFinal,ajusteManual,ganImpAjustado,precioFinalAcordadoUnd,precioFinalAcordadoTotal,ivaCliente,ivaRecuperado,ivaNetoFavor,saldoF29,ganImpConIva,pfUnd,ganMar,difCom,ganServ,ganImp,gan1,gan2,uDev,uFull,ganFull,ganTot,markup,mgBrut,roi,mult,aer,isAereo };
}

// ── Costo real ZAGA por cot (suma China RMB + Chile CLP + IVAs) ───────────
// Devuelve el desglose completo del costo que ZAGA absorbe (sin margen) y compara
// con el precio cobrado al cliente para mostrar ganancia real.
// cotsEnOp: array completo de cots de la OP, para calcular share y prorratear aduana
function calcCostoRealZaga(d, op, cotsEnOp = []) {
  const u = Number(d.unidades) || 0;
  // TC variable por OP (Francisco puede ajustar para cada operación)
  const TC_RMB_USD = Number(op?.tc_rmb_usd ?? d?.tc_rmb_usd) || 7.03;
  const tc = Number(op?.tc_usd_clp ?? op?.pago?.tc_efectivo ?? d?.tc_usd_clp ?? d?.pago?.tc_efectivo) || 950;
  const calc = calcCliente(d);

  // ─── Helpers de medida por cot ─────────────────────────────────────────
  const getCbm = (c) => {
    const m3 = Number(c.dim_m3) || 0;
    const uc = Number(c.unidades) || 0;
    const undC = Number(c.dim_und_caja) || 0;
    const esC = c.dim_tipo === "caja";
    return esC && undC > 0 ? m3 * Math.ceil(uc / undC) : m3 * uc;
  };
  const getPesoReal = (c) => {
    const p = Number(c.peso_kg) || 0;
    const uc = Number(c.unidades) || 0;
    const undC = Number(c.dim_und_caja) || 0;
    const esC = c.dim_tipo === "caja";
    return esC && undC > 0 ? p * Math.ceil(uc / undC) : p * uc;
  };

  // ─── Share por CBM (preferido; suma=1) ──────────────────────────────────
  // Compartidos de envío (aduana, doc op, despacho CN, etc.) se prorratean por
  // CBM porque es lo que físicamente ocupan en el contenedor/AWB. Coherente
  // con cómo Sunny cobra el flete (por peso volumétrico).
  // Fallback: VALOR mercancía si no hay CBM. Luego peso. Luego 1/N.
  const getValorMercRMB = (c) => {
    const rmb = Number(c.precio_china_rmb) || 0;
    const uc  = Number(c.unidades) || 0;
    return rmb * uc;
  };
  let share = 1;
  let totalCbmOp = 0, totalPesoOp = 0, totalValorOp = 0;
  if (op && cotsEnOp && cotsEnOp.length > 1) {
    totalCbmOp = cotsEnOp.reduce((s, c) => s + getCbm(c), 0);
    totalValorOp = cotsEnOp.reduce((s, c) => s + getValorMercRMB(c), 0);
    totalPesoOp = cotsEnOp.reduce((s, c) => s + getPesoReal(c), 0);
    const valorCot = getValorMercRMB(d);
    const cbmCot = getCbm(d);
    const pesoCot = getPesoReal(d);
    if (totalCbmOp > 0 && cbmCot > 0) {
      share = cbmCot / totalCbmOp;
    } else if (totalValorOp > 0 && valorCot > 0) {
      share = valorCot / totalValorOp;
    } else if (totalPesoOp > 0) {
      share = pesoCot / totalPesoOp;
    } else {
      share = 1 / cotsEnOp.length;
    }
    if (share === 0) share = 1 / cotsEnOp.length;
  }

  // ─── Datos básicos del cot ─────────────────────────────────────────────
  const precioRmb = Number(d.precio_china_rmb) || 0;
  const precioCLPLegacy = Number(d.precio_china) || 0;
  const tieneDataRmb = precioRmb > 0;
  const valorMercanciaCLPLegacy = precioCLPLegacy * u;

  const _take = (k) => Number(op?.[k] ?? d?.[k]) || 0;
  const _takeMax = (k) => {
    const opVal  = Number(op?.[k])  || 0;
    const cotVal = Number(d?.[k])   || 0;
    return Math.max(opVal, cotVal);
  };

  // ─── Lado China — calcular TODO a nivel OP, luego prorratear ──────────
  //
  // Reglas:
  //   - mercancía: DIRECTO por cot (precio_china_rmb × und). Cada producto
  //     tiene su propio FOB Exw, no se prorratea.
  //   - comisión Sunny: % sobre mercancía → directo por cot también.
  //   - flete: pesoCobrable_cot × tarifa. Directo por cot, sum=flete_total.
  //   - cert origen: PER COT/PRODUCTO (1 cert por SKU). No se prorratea.
  //   - doc op, despacho aduanero CN, compra docs, transporte interno CN:
  //     FIJO POR OP. Se prorratea por share CBM.
  //   - seguro: max(min, mercancía_op × pct). Calculado a nivel OP, prorrateado.
  //   - logística Yiwu (legacy), otros_usd (legacy), formF: fijos por OP,
  //     prorrateado.
  const cc = op?.costos_china || {};
  const useLegacyCC = (Number(cc.productos_rmb) || 0) > 0;

  // -- Mercancía y comisión del cot (DIRECTO)
  let mercanciaCotRMB;
  if (tieneDataRmb) {
    mercanciaCotRMB = precioRmb * u;
  } else if (useLegacyCC && cotsEnOp.length > 0) {
    // Proxy: distribuye productos_rmb por share del precio legacy CLP.
    // Mientras Sunny no llene precio_china_rmb por cot, usamos legacy como proxy.
    const sumLegacy = cotsEnOp.reduce((s,c) => s + (Number(c.precio_china)||0)*(Number(c.unidades)||0), 0);
    const shareMerc = sumLegacy > 0 ? (precioCLPLegacy * u) / sumLegacy : (1 / cotsEnOp.length);
    mercanciaCotRMB = (Number(cc.productos_rmb) || 0) * shareMerc;
  } else {
    mercanciaCotRMB = 0;
  }

  // Comisión Sunny (% sobre mercancía cot, directo)
  let comisionPctEff = _take("comision_sunny_pct");
  if (!comisionPctEff && useLegacyCC) comisionPctEff = Number(cc.comision_pct) || 0;
  const comisionRMB = mercanciaCotRMB * comisionPctEff / 100;

  // Flete: peso real cot × tarifa RMB/kg
  const pesoTotalCot = getPesoReal(d);
  let tarifaRmbKg = Number(op?.flete_rmb_kg_consolidado ?? d.aer_tarifa_sunny_rmb_kg) || 0;
  if (!tarifaRmbKg && useLegacyCC) tarifaRmbKg = Number(cc.flete_rmb_kg) || 0;
  if (!tarifaRmbKg) tarifaRmbKg = (Number(d.aer_tarifa_sunny_kg) || 0) * TC_RMB_USD;
  const fleteRMB = pesoTotalCot * tarifaRmbKg;

  // Cert origen: per cot/producto (no se prorratea)
  let certOrigen = _takeMax("cost_cert_origen_rmb");
  // (Legacy OP-001 no tiene este campo separado — solo en top-level del nuevo modelo)

  // Fijos POR OP — prorratear por share CBM
  let docOp_op       = _takeMax("cost_doc_operacion_rmb");
  let despacho_op    = _takeMax("cost_despacho_aduanero_rmb");
  let compraDocs_op  = _takeMax("cost_compra_docs_rmb");
  let transporteCn_op= _takeMax("cost_transporte_interno_cn_rmb");
  let logistica_op   = 0;
  let otrosUSD_op    = 0;
  let formFUSD_op    = 0;
  if (useLegacyCC) {
    logistica_op = Number(cc.logistica_rmb) || 0;
    otrosUSD_op  = Number(cc.otros_usd) || 0;
    const nCots  = cotsEnOp.length || 1;
    formFUSD_op  = (Number(cc.form_f_usd_por_producto) || 0) * nCots;
  }

  // Seguro a nivel OP, prorrateado
  const seguroPct = _take("seguro_pct") || (useLegacyCC ? Number(cc.seguro_pct)/100 : 0);
  // Nota: cc.seguro_pct viene como 0.2 (% directo); cost_*_rmb del nuevo modelo viene como 0.002 (decimal).
  // Si seguroPct quedó > 1, asumimos que viene como % directo y dividimos.
  const seguroPctNorm = seguroPct > 1 ? seguroPct / 100 : seguroPct;
  const seguroMin = _take("seguro_min_rmb");
  const mercanciaOpRMB = useLegacyCC
    ? (Number(cc.productos_rmb) || 0)
    : cotsEnOp.reduce((s,c) => s + (Number(c.precio_china_rmb)||0)*(Number(c.unidades)||0), 0);
  const seguroOpCalc = mercanciaOpRMB * seguroPctNorm;
  const seguroOpRMB = tieneDataRmb || useLegacyCC
    ? Math.max(seguroMin, seguroOpCalc)
    : 0;

  // Compartidos del OP (en RMB) prorrateados para esta cot:
  const compartidosCotRMB =
      docOp_op       * share
    + despacho_op    * share
    + compraDocs_op  * share
    + transporteCn_op* share
    + logistica_op   * share
    + seguroOpRMB    * share;
  // Compartidos USD (legacy) prorrateados:
  const compartidosCotUSD = (otrosUSD_op + formFUSD_op) * share;

  // Total RMB y CLP del cot
  const valorMercanciaRMB = mercanciaCotRMB; // alias para retornar
  const seguroRMB         = seguroOpRMB * share;
  const otrosGastosRMB    = certOrigen + compartidosCotRMB;
  const totalChinaRMB     = mercanciaCotRMB + comisionRMB + fleteRMB + otrosGastosRMB;
  const totalChinaCLP_RMB = (totalChinaRMB / TC_RMB_USD) * tc;
  const totalChinaCLP_USD = compartidosCotUSD * tc;
  // Total China = RMB convertido + USD convertido. Si no hay datos RMB ni costos_china,
  // fallback al precio_china legacy CLP × und (sin extras).
  let totalChinaCLP;
  if (tieneDataRmb || useLegacyCC) {
    totalChinaCLP = totalChinaCLP_RMB + totalChinaCLP_USD;
  } else {
    totalChinaCLP = valorMercanciaCLPLegacy;
  }
  const _usoOpLegacy = useLegacyCC && !tieneDataRmb;
  // Para mantener compatibilidad de campos del return (seguroCalc para badge)
  const seguroCalc = seguroOpCalc * share;
  // Variables del return originales (renombradas a la convención existente)
  const _valorMercanciaRMB = valorMercanciaRMB;
  const _fleteRMB = fleteRMB;
  const docOp = docOp_op * share;
  const despacho = despacho_op * share;
  const compraDocs = compraDocs_op * share;
  const transporteCn = transporteCn_op * share;
  const comisionPct = comisionPctEff;
  const pesoTotal = pesoTotalCot;

  // ─── LADO CHILE (en CLP, ya calculado por calcCliente) ────────────────────
  // cda = aduana fija + arancel real (ZAGA lo paga, neto)
  // En consolidado: ZAGA paga UNA aduana por despacho, NO una por cot.
  // Prorrateamos por share (igual modo que calcConsolidado) cuando hay OP.
  const cdaCompleto = Number(calc.cda) || 0;
  const cdaReal     = cdaCompleto * share;
  const ivaAgenteAer = (calc.aer?.ivaAgente || 0) * share;

  // IVA aduana = 19% × (CIF + arancel) donde CIF = FOB (mercancía) + flete internacional + seguro
  // (en Chile, Aduana calcula IVA sobre el CIF declarado). Cuando hay consolidado,
  // calculamos CIF total OP y prorrateamos por share (igual que aduana fija).
  let ivaAduanaAer = 0;
  if (op && cotsEnOp && cotsEnOp.length > 1) {
    const arancelPctOp = Number(calc.aer?.arancelPct) || 0;
    const mercOpRMB = cotsEnOp.reduce((s, c) =>
      s + (Number(c.precio_china_rmb) || 0) * (Number(c.unidades) || 0), 0);
    if (mercOpRMB > 0) {
      // Flete internacional OP (suma de peso × tarifa por cot)
      const tarifaKg = Number(op?.flete_rmb_kg_consolidado) || Number(op?.costos_china?.flete_rmb_kg) || 0;
      const fleteOpRMB = cotsEnOp.reduce((s, c) => {
        const u_ = Number(c.unidades) || 0;
        const uc_ = Number(c.dim_und_caja) || 0;
        const esC_ = c.dim_tipo === "caja";
        const p_ = Number(c.peso_kg) || 0;
        const pReal_ = esC_ && uc_ > 0 ? p_ * Math.ceil(u_ / uc_) : p_ * u_;
        return s + pReal_ * tarifaKg;
      }, 0);
      // Seguro OP (max entre min y % × mercancía)
      const seguroPctOp_ = Number(op?.seguro_pct) || (Number(op?.costos_china?.seguro_pct) || 0) / 100;
      const seguroMinOp_ = Number(op?.seguro_min_rmb) || 0;
      const seguroOpRMB = Math.max(seguroMinOp_, mercOpRMB * seguroPctOp_);
      // CIF declarado en aduana = FOB + flete + seguro
      const cifOpRMB = mercOpRMB + fleteOpRMB + seguroOpRMB;
      const cifOpCLP = (cifOpRMB / TC_RMB_USD) * tc;
      const arancelOpCLP = cifOpCLP * arancelPctOp;
      const ivaAduanaOpCLP = (cifOpCLP + arancelOpCLP) * 0.19;
      ivaAduanaAer = ivaAduanaOpCLP * share;
    } else {
      // Fallback: usar el calc.aer individual (cot legacy con precio_china CLP)
      ivaAduanaAer = (calc.aer?.ivaAduanaReal || 0) * share;
    }
  } else {
    ivaAduanaAer = (calc.aer?.ivaAduanaReal || 0) * share;
  }
  const ivaChinaCLP  = Number(calc.ivaChina) || 0; // China IVA es por cot (no compartido)
  // Costo Chile neto que ZAGA absorbe (sin servicio FF que es ingreso, sin IVAs recuperables)
  const totalChileCLP = cdaReal;
  // IVA total recuperable (vía F29 cuando con_iva=true)
  const ivaRecuperableCLP = ivaAgenteAer + ivaAduanaAer + ivaChinaCLP;

  // ─── TOTAL COSTO ZAGA ──────────────────────────────────────────────────────
  // Costo neto operacional (lo que ZAGA realmente desembolsa de "su bolsillo")
  const costoZAGANeto = totalChinaCLP + totalChileCLP;
  // Si NO hay factura (sin IVA al cliente), los IVAs recuperables se pierden → costo sube
  const conIva = !!d.con_iva || d.transporte === "aereo";
  const ivaPerdido = conIva ? 0 : ivaRecuperableCLP;
  const costoZAGAReal = costoZAGANeto + ivaPerdido;

  // ─── PRECIO COBRADO AL CLIENTE ────────────────────────────────────────────
  const precioClienteIva = Number(calc.totClIvaFinal) || Number(calc.totClIva) || 0;
  const precioClienteNeto = precioClienteIva / 1.19;

  // ─── GANANCIA REAL ────────────────────────────────────────────────────────
  const ganRealNeto = precioClienteNeto - costoZAGAReal;
  const margenRealPct = precioClienteNeto > 0 ? (ganRealNeto / precioClienteNeto) * 100 : 0;

  return {
    // China
    valorMercanciaRMB: _valorMercanciaRMB, comisionRMB, fleteRMB: _fleteRMB, otrosGastosRMB, totalChinaRMB, totalChinaCLP,
    valorMercanciaCLPLegacy, tieneDataRmb, usoOpLegacy: _usoOpLegacy,
    detalleChina: { certOrigen, docOp, despacho, compraDocs, transporteCn, seguroRMB, seguroCalc, seguroMin, seguroAplicaMin: seguroRMB > seguroCalc },
    pesoTotal, tarifaRmbKg, comisionPct, seguroPct,
    // Chile
    cdaReal, cdaCompleto, share, ivaAgenteAer, ivaAduanaAer, ivaChinaCLP, ivaRecuperableCLP, ivaPerdido, totalChileCLP,
    // Total
    costoZAGANeto, costoZAGAReal,
    precioClienteIva, precioClienteNeto,
    ganRealNeto, margenRealPct,
    tc, TC_RMB_USD,
  };
}

// ── Cálculo de consolidación aérea ──────────────────────────────────────────
// Dada una cotización y la operación a la que pertenece (con todas sus cots),
// devuelve standalone, consolidado y ahorro distribuido según regla:
//   - 100% al cliente si todas las cots de la op son del MISMO cliente
//   - 50/50 cliente / margen ZAGA si la op es multi-cliente
// Distribución de costos compartidos = AUTO según modo cobro Sunny (peso/volumen).
function calcConsolidado(cot, op, cotsEnOp) {
  if (!op || !cotsEnOp || cotsEnOp.length === 0) return null;

  const calcStand = calcCliente(cot);
  const cc = op.costos_china || {};
  const tc = Number(op?.pago?.tc_efectivo) || 950;

  // Helpers — m³ y peso COBRABLE (max entre real y volumétrico ÷6000) por cotización
  const getCbm = (c) => {
    const m3 = Number(c.dim_m3) || 0;
    const u = Number(c.unidades) || 0;
    const undCaja = Number(c.dim_und_caja) || 0;
    const esCaja = c.dim_tipo === "caja";
    return esCaja && undCaja > 0 ? m3 * Math.ceil(u / undCaja) : m3 * u;
  };
  // Peso cobrable = max(peso real total, peso volumétrico = CBM × 166,67)
  // Esto evita subestimar el flete cuando la carga es voluminosa (densidad baja).
  const getPeso = (c) => {
    const p = Number(c.peso_kg) || 0;
    const u = Number(c.unidades) || 0;
    const undCaja = Number(c.dim_und_caja) || 0;
    const esCaja = c.dim_tipo === "caja";
    const pesoReal = esCaja && undCaja > 0 ? p * Math.ceil(u / undCaja) : p * u;
    const cbm = getCbm(c);
    const pesoVol = cbm * 166.67; // 1 m³ ÷ 6000 cm³/kg = 166,67 kg
    return Math.max(pesoReal, pesoVol);
  };

  const totalCbmOp = cotsEnOp.reduce((s, c) => s + getCbm(c), 0);
  const totalPesoOp = cotsEnOp.reduce((s, c) => s + getPeso(c), 0);
  const cbmCot = getCbm(cot);
  const pesoCot = getPeso(cot);
  const shareCbm = totalCbmOp > 0 ? cbmCot / totalCbmOp : 0;
  const sharePeso = totalPesoOp > 0 ? pesoCot / totalPesoOp : 0;

  // Modo AUTO: usa el mayor share (lo que más le toca pagar a esta cot)
  const modo = cot.aer_modo_cobro_sunny || "auto";
  const share = modo === "peso" ? sharePeso
              : modo === "volumen" ? shareCbm
              : Math.max(shareCbm, sharePeso);
  const modoUsado = modo === "auto" ? (sharePeso >= shareCbm ? "peso" : "volumen") : modo;

  // Ahorro 1 — Aduana fija prorrateada (standalone paga 100%, consolidado paga share)
  const cdaStandaloneCl = calcStand.cdaCl;            // neto cliente (servicios aduana)
  const cdaConsolidadoCl = cdaStandaloneCl * share;
  const ahorroCdaCl = cdaStandaloneCl - cdaConsolidadoCl;

  // Ahorro 2 — Flete: tarifa standalone Sunny vs tarifa consolidada Sunny (si la dio)
  // Lógica RMB nativo con fallback USD legacy. RMB → USD via tc_rmb_usd = 7.03 (margen ~1.7% sobre WU)
  const TC_RMB_USD = Number(op?.tc_rmb_usd) || 7.03;
  const fleteRmbKg = Number(cc.flete_rmb_kg) || 0;
  const fleteUsdKgLegacy = Number(cc.flete_usd_kg) || 0;
  const tarifaOpKg = fleteRmbKg > 0 ? fleteRmbKg / TC_RMB_USD : fleteUsdKgLegacy;
  const fleteRmbKgConsolidado = Number(op.flete_rmb_kg_consolidado) || 0;
  const fleteUsdKgConsolidadoLegacy = Number(op.flete_usd_kg_consolidado) || 0;
  const tarifaConsolidadoKg = fleteRmbKgConsolidado > 0 ? fleteRmbKgConsolidado / TC_RMB_USD
                            : (fleteUsdKgConsolidadoLegacy > 0 ? fleteUsdKgConsolidadoLegacy : tarifaOpKg);
  const tarifaStandaloneKg = Number(cot.aer_tarifa_sunny_kg) || tarifaOpKg;
  const fleteStandaloneCl = pesoCot * tarifaStandaloneKg * tc;
  const fleteConsolidadoCl = pesoCot * tarifaConsolidadoKg * tc;
  const ahorroFleteCl = Math.max(0, fleteStandaloneCl - fleteConsolidadoCl);

  // Ahorro total bruto (positivo = consolidado es más barato)
  const ahorroTotalCl = Math.max(0, ahorroCdaCl + ahorroFleteCl);

  // ¿Cliente único o multi-cliente?
  const clientesUnicos = [...new Set(cotsEnOp.map(c => c.cliente).filter(Boolean))];
  const clienteUnico = clientesUnicos.length === 1;

  // Distribución del ahorro — modo manual del admin o auto por defecto
  // op.distribucion_ahorro: "auto" (default) | "cliente_100" | "split_50_50"
  const modoDistrib = op.distribucion_ahorro || "auto";
  let ahorroCliente, ahorroZaga;
  if (modoDistrib === "cliente_100") {
    ahorroCliente = ahorroTotalCl;
    ahorroZaga = 0;
  } else if (modoDistrib === "split_50_50") {
    ahorroCliente = ahorroTotalCl / 2;
    ahorroZaga = ahorroTotalCl / 2;
  } else {
    // auto: 100% cliente único, 50/50 multi-cliente
    ahorroCliente = clienteUnico ? ahorroTotalCl : ahorroTotalCl / 2;
    ahorroZaga = clienteUnico ? 0 : ahorroTotalCl / 2;
  }

  // ── Override con precio acordado manual ────────────────────────────────────
  // Si la cot tiene precio_final_acordado_und, ese es el precio que se cobró al cliente.
  // En ese caso recalculamos: consolidado = precio acordado × und (c/IVA),
  // y el "ahorro vs standalone" se vuelve informativo (puede ser positivo o negativo).
  const uCot = Number(cot.unidades) || 0;
  const precioAcordadoUnd = Number(cot.precio_final_acordado_und) || 0;
  const tieneAcordado = precioAcordadoUnd > 0 && uCot > 0;

  let totClConsolidado;     // neto
  let totClIvaConsolidado;  // c/IVA
  let pCUndConsolidado;     // /und neto

  if (tieneAcordado) {
    // Usar precio acordado real (viene c/IVA)
    totClIvaConsolidado = precioAcordadoUnd * uCot;
    totClConsolidado = totClIvaConsolidado / 1.19;
    pCUndConsolidado = totClConsolidado / uCot;
    // Recalcular ahorro real: standalone (c/IVA) vs acordado (c/IVA)
    const standaloneCIva = calcStand.totClIva || (calcStand.totCl * 1.19);
    const diffCIva = standaloneCIva - totClIvaConsolidado;
    // En modo cliente_100: ahorro cliente = diff, ZAGA = 0
    // En modo split_50_50: ahorro cliente = diff/2, ZAGA = diff/2
    // En modo auto + cliente_unico: ahorro cliente = diff, ZAGA = 0
    // En modo auto + multi-cliente: ahorro cliente = diff/2, ZAGA = diff/2
    // (recalculamos según modoDistrib)
    if (modoDistrib === "cliente_100" || (modoDistrib === "auto" && clienteUnico)) {
      ahorroCliente = diffCIva;
      ahorroZaga = 0;
    } else {
      ahorroCliente = diffCIva / 2;
      ahorroZaga = diffCIva / 2;
    }
  } else {
    totClConsolidado = Math.max(0, calcStand.totCl - ahorroCliente);
    totClIvaConsolidado = totClConsolidado * 1.19;
    pCUndConsolidado = uCot > 0 ? totClConsolidado / uCot : 0;
  }

  // ─── Desglose extras China nuevos (comisión Sunny + 5 extras envío) ────────
  // Solo se computan si la OP tiene los campos seteados (Sunny ya recotizó consolidado)
  const nCots = cotsEnOp.length;
  const valorMercanciaCotRMB = (Number(cot.precio_china_rmb) || 0) * uCot;
  const valorMercanciaOpRMB  = cotsEnOp.reduce((s,c) => s + (Number(c.precio_china_rmb) || 0) * (Number(c.unidades) || 0), 0);

  // Fallback: si OP no tiene el campo (Sunny todavía no recotizó), usar el de la cot individual
  // Para costos fijos en RMB: 0 en OP = "no seteado" → tomar el mayor entre OP y cot.
  // (Sunny puede editar a nivel cot DESPUES de recotizar la OP; el cot gana si OP=0.)
  const _max = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);
  const comisionPct = Number(op.comision_sunny_pct ?? cot.comision_sunny_pct) || 0;
  const seguroPct   = Number(op.seguro_pct ?? cot.seguro_pct) || 0; // ej 0.002 = 0.2%
  const seguroMin   = Number(op.seguro_min_rmb ?? cot.seguro_min_rmb) || 0; // mínimo RMB (default 150 cuando Sunny lo setea)
  const certOrigen      = _max(op.cost_cert_origen_rmb,        cot.cost_cert_origen_rmb);
  const docOperacion    = _max(op.cost_doc_operacion_rmb,      cot.cost_doc_operacion_rmb);
  const despachoAd      = _max(op.cost_despacho_aduanero_rmb,  cot.cost_despacho_aduanero_rmb);
  const compraDocs      = _max(op.cost_compra_docs_rmb,        cot.cost_compra_docs_rmb);
  const transporteCnRmb = _max(op.cost_transporte_interno_cn_rmb, cot.cost_transporte_interno_cn_rmb);

  // Seguro a nivel OP con mínimo, prorrateado por valor de la cot
  const seguroOpTotalRMB    = Math.max(seguroMin, valorMercanciaOpRMB * seguroPct);
  const shareValorMercancia = valorMercanciaOpRMB > 0 ? valorMercanciaCotRMB / valorMercanciaOpRMB : 0;
  const seguroCotRMB        = seguroOpTotalRMB * shareValorMercancia;

  const comisionCotRMB     = valorMercanciaCotRMB * comisionPct / 100;
  const certOrigenCotRMB   = certOrigen; // 1 por cotización
  const docOperacionCotRMB = docOperacion * share;
  const despachoCotRMB     = despachoAd   * share;
  const compraDocsCotRMB   = compraDocs   * share;
  const transporteCnCotRMB = transporteCnRmb * share; // prorrateado por share
  const extrasChinaCotRMB  = comisionCotRMB + seguroCotRMB + certOrigenCotRMB + docOperacionCotRMB + despachoCotRMB + compraDocsCotRMB + transporteCnCotRMB;
  const extrasChinaCotCl   = extrasChinaCotRMB / TC_RMB_USD * tc; // RMB → USD → CLP
  const tieneExtrasChina   = (comisionPct + seguroPct + certOrigen + docOperacion + despachoAd + compraDocs + transporteCnRmb) > 0;

  return {
    standalone: {
      totCl: calcStand.totCl,
      totClIva: calcStand.totClIva || calcStand.totCl * 1.19,
      ganImp: calcStand.ganImp,
      cdaCl: cdaStandaloneCl,
      pCUnd: calcStand.pCUnd,
    },
    consolidado: {
      totCl: totClConsolidado,
      totClIva: totClIvaConsolidado,
      ganImp: calcStand.ganImp + ahorroZaga,
      cdaCl: cdaConsolidadoCl,
      pCUnd: pCUndConsolidado,
      esPrecioAcordado: tieneAcordado,
    },
    ahorro: {
      totalCl: ahorroTotalCl,
      cliente: ahorroCliente,
      zaga: ahorroZaga,
      ahorroCda: ahorroCdaCl,
      ahorroFlete: ahorroFleteCl,
      clienteUnico,
      modoDistrib, // "auto" | "cliente_100" | "split_50_50"
      share,
      shareCbm,
      sharePeso,
      modoUsado,
    },
    extrasChina: tieneExtrasChina ? {
      comisionPct,
      seguroPct,
      valorMercanciaCotRMB,
      valorMercanciaOpRMB,
      comisionCotRMB,
      seguroCotRMB,
      certOrigenCotRMB,
      docOperacionCotRMB,
      despachoCotRMB,
      compraDocsCotRMB,
      transporteCnCotRMB,
      extrasChinaCotRMB,
      extrasChinaCotCl,
      nCots,
      tcRmbUsd: TC_RMB_USD,
    } : null,
  };
}

// Encuentra el margen/unidad (mar) tal que mgBrut sobre venta = targetMg (ej. 0.25 = 25%).
// Bisección numérica: robusta ante IVA, aforo, arancel, servicio%, todos los términos dependientes.
function findMarParaMargen(d, targetMg = 0.25) {
  const u = Number(d.unidades) || 0;
  const pCh = Number(d.precio_china) || 0;
  if (u <= 0 || pCh <= 0) return 0;
  let lo = 0;
  let hi = pCh * 30; // tope: 30x precio China cubre cualquier escenario realista
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const calc = calcCliente({ ...d, margen_und: mid });
    const mg = (calc.mgBrut || 0) / 100;
    if (mg < targetMg) lo = mid;
    else hi = mid;
    if (hi - lo < 0.5) break; // precisión: medio peso por unidad
  }
  return Math.round((lo + hi) / 2);
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
const fmtRMB = n=>!n&&n!==0?"¥0":"¥"+Number(n).toLocaleString("es-CL",{maximumFractionDigits:0});
const fmtN = n=>Number(n).toLocaleString("es-CL",{maximumFractionDigits:0});
// Parsea imagen_url que puede contener múltiples URLs separadas por "|||"
const getImagenes = (url) => url ? url.split('|||').filter(Boolean) : [];
// Proxy de imágenes para dominios con hotlink protection (Alibaba, Taobao, 1688, etc.)
// wsrv.nl es un proxy gratuito que reemite la imagen sin headers problemáticos.
const proxyImg = (url) => {
  if (!url || typeof url !== "string") return url;
  if (/alicdn\.com|alibaba\.com|taobao\.com|tmall\.com|aliyuncs\.com|1688\.com/i.test(url)) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
};
const fmtP = n=>isNaN(n)||n===null?"-":`${Number(n).toFixed(1)}%`;
const todayStr=()=>new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"});
const monthKey=d=>{ try{ const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; }catch{ return ""; }};
const monthLabel=k=>{ try{ const [y,m]=k.split("-"); return new Date(y,Number(m)-1).toLocaleDateString("es-CL",{month:"long",year:"numeric"}); }catch{ return k; }};
const fmtFechaCorta=s=>{ if(!s) return ""; const [y,m,d]=String(s).split("-"); const mm=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]; return `${d}-${mm[Number(m)-1]||""}-${y}`; };

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
// ─── Bloque "Pagos reales de la OP" — admin lleva ingresos por cliente + egresos a Sunny/Chile ───
function PagosRealesOp({ op, cots, supabase, setOperaciones, totVentaIva, totCostoNeto, fmt }){
  const [pagos, setPagos] = useState(op.pagos_reales || {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const cotsActivas = cots.filter(c => !["no_prospero"].includes(c.estado));
  const clientes = [...new Set(cotsActivas.map(c => (c.cliente||"").trim()).filter(Boolean))];

  // Helpers ingresos por cliente
  const cobradoTeoricoCliente = (cl) => cotsActivas
    .filter(c => (c.cliente||"").trim() === cl)
    .reduce((s, c) => s + ((Number(c.precio_final_acordado_und)||0) * (Number(c.unidades)||0)), 0);
  const getIngreso = (cl) => Number(pagos.ingresos_por_cliente?.[cl]?.recibido) || 0;
  const setIngreso = (cl, val) => setPagos(p => ({
    ...p,
    ingresos_por_cliente: { ...(p.ingresos_por_cliente||{}), [cl]: { ...(p.ingresos_por_cliente?.[cl]||{}), recibido: Number(val)||0 } }
  }));
  const setIngresoFecha = (cl, val) => setPagos(p => ({
    ...p,
    ingresos_por_cliente: { ...(p.ingresos_por_cliente||{}), [cl]: { ...(p.ingresos_por_cliente?.[cl]||{}), fecha: val } }
  }));
  const setIngresoFactNro = (cl, val) => setPagos(p => ({
    ...p,
    ingresos_por_cliente: { ...(p.ingresos_por_cliente||{}), [cl]: { ...(p.ingresos_por_cliente?.[cl]||{}), factura_nro: val } }
  }));
  const setIngresoFactLink = (cl, val) => setPagos(p => ({
    ...p,
    ingresos_por_cliente: { ...(p.ingresos_por_cliente||{}), [cl]: { ...(p.ingresos_por_cliente?.[cl]||{}), factura_link: val } }
  }));

  // Helpers egresos
  const egresosDefs = [
    { key:"pago1_sunny", lbl:"1er pago Sunny", emoji:"🇨🇳" },
    { key:"pago2_sunny", lbl:"2do pago Sunny", emoji:"🇨🇳" },
    { key:"pago3_sunny", lbl:"3er pago Sunny", emoji:"🇨🇳" },
    { key:"pago_final_chile", lbl:"Pago final Chile (Leslie / aduana)", emoji:"🇨🇱" },
    { key:"pagos_extras", lbl:"Pagos extras / diferencias", emoji:"⚙️" },
  ];
  const getEgreso = (k) => Number(pagos.egresos?.[k]?.monto) || 0;
  const setEgreso = (k, field, val) => setPagos(p => ({
    ...p,
    egresos: { ...(p.egresos||{}), [k]: { ...(p.egresos?.[k]||{}), [field]: field==="monto" ? (Number(val)||0) : val } }
  }));

  // Helpers RMB/WU para pagos Sunny
  const isPagoSunny = (k) => k.startsWith("pago") && k.includes("sunny");
  const calcTotalCLPPagoSunny = (k) => {
    const e = pagos.egresos?.[k] || {};
    const clp = Number(e.clp_enviado) || 0;
    const com = Number(e.comision) || 0;
    const ivaCom = Number(e.iva_comision) || (com * 0.19);
    return clp + com + ivaCom;
  };
  // Pago Chile (Leslie + IVA aduana) — 2 componentes
  const isPagoChile = (k) => k === "pago_final_chile";
  const calcTotalChile = (k) => {
    const e = pagos.egresos?.[k] || {};
    return (Number(e.servicio_aduana) || 0) + (Number(e.iva_aduana) || 0);
  };
  const setEgresoCampo = (k, field, val) => setPagos(p => ({
    ...p,
    egresos: { ...(p.egresos||{}), [k]: { ...(p.egresos?.[k]||{}), [field]: field==="fecha"||field==="nota" ? val : (Number(val)||0) } }
  }));

  // Totales
  const totIngresoTeorico = cotsActivas.reduce((s, c) => s + ((Number(c.precio_final_acordado_und)||0) * (Number(c.unidades)||0)), 0);
  const totIngresoReal = clientes.reduce((s, cl) => s + getIngreso(cl), 0);
  const porCobrar = totIngresoTeorico - totIngresoReal;
  // Total egreso: pagos Sunny y Chile usan sus formulas detalladas, otros usan monto directo
  const totEgresoReal = egresosDefs.reduce((s, e) => {
    if (isPagoSunny(e.key)) {
      const c = calcTotalCLPPagoSunny(e.key);
      return s + (c > 0 ? c : getEgreso(e.key));
    }
    if (isPagoChile(e.key)) {
      const c = calcTotalChile(e.key);
      return s + (c > 0 ? c : getEgreso(e.key));
    }
    return s + getEgreso(e.key);
  }, 0);
  const gananciaTeorica = (totIngresoTeorico/1.19) - totCostoNeto;
  // Ganancia real: si faltan pagos por cargar, usamos el costo teórico como
  // egreso estimado para no inflar artificialmente la ganancia.
  // Solo usamos el egreso real cuando supera el teórico (pagos más caros de lo previsto).
  const egresoParaReal = Math.max(totEgresoReal, totCostoNeto);
  const ingresoParaReal = totIngresoReal > 0 ? totIngresoReal : totIngresoTeorico;
  const faltaCargarPagos = totEgresoReal > 0 && totEgresoReal < totCostoNeto;
  const noHayPagosRegistrados = totEgresoReal === 0;
  const noHayIngresosRegistrados = totIngresoReal === 0;
  const gananciaReal = (ingresoParaReal/1.19) - egresoParaReal;
  const diffGanancia = gananciaReal - gananciaTeorica;

  async function guardar(){
    setSaving(true);
    setMsg(null);
    try {
      const { data: fresca } = await supabase.from("operaciones").select("datos").eq("id", op.id).single();
      const datosMerged = { ...(fresca?.datos||op), pagos_reales: pagos };
      const { error } = await supabase.from("operaciones").update({ datos: datosMerged, updated_at: new Date().toISOString() }).eq("id", op.id);
      if (error) throw error;
      setOperaciones(prev => prev.map(o => o.id===op.id ? { ...o, pagos_reales: pagos } : o));
      setMsg({ tipo:"ok", txt:"✅ Pagos guardados" });
      setTimeout(()=>setMsg(null), 2000);
    } catch(e){
      setMsg({ tipo:"err", txt:"⚠️ " + (e.message||"Error al guardar") });
    } finally {
      setSaving(false);
    }
  }

  // Inputs con formato $ (CLP) / ¥ (RMB) — separadores de miles
  const moneyInput = (val, onChange, currency="$", w=130, ph) => {
    const n = Number(val) || 0;
    const display = n > 0 ? currency + n.toLocaleString("es-CL") : "";
    return (
      <input type="text" value={display} placeholder={ph || (currency+"0")}
        onChange={e => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          onChange(Number(raw) || 0);
        }}
        style={{width:w,padding:"5px 7px",border:"1px solid #cbd5e1",borderRadius:6,fontSize:12,textAlign:"right",fontFamily:"inherit",background:"#fff"}}/>
    );
  };
  const numInput = (val, onChange, w=130, ph) => moneyInput(val, onChange, "$", w, ph);
  const rmbInput = (val, onChange, w=120) => moneyInput(val, onChange, "¥", w, "¥0");
  const decInput = (val, onChange, w=80, step="0.01", ph="0,00") => (
    <input type="number" step={step} min="0" value={val||""} placeholder={ph}
      onChange={e=>onChange(Number(e.target.value)||0)}
      style={{width:w,padding:"5px 7px",border:"1px solid #cbd5e1",borderRadius:6,fontSize:12,textAlign:"right",fontFamily:"inherit",background:"#fff"}}/>
  );
  const dateInput = (val, onChange) => (
    <input type="date" value={val||""} onChange={e=>onChange(e.target.value)}
      style={{padding:"5px 7px",border:"1px solid #cbd5e1",borderRadius:6,fontSize:11,fontFamily:"inherit",background:"#fff",color:"#475569"}}/>
  );

  return (
    <div style={{marginTop:14,padding:14,background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:10}}>
      <div style={{fontSize:11,color:"#0f172a",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <span>💰 Pagos reales OP {op.nro} — seguimiento ingresos / egresos</span>
        {msg && <span style={{fontSize:11,fontWeight:600,color:msg.tipo==="ok"?"#16a34a":"#c0392b"}}>{msg.txt}</span>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* INGRESOS POR CLIENTE */}
        <div style={{background:"#fff",borderRadius:8,border:"1px solid #bbf7d0",padding:12}}>
          <div style={{fontSize:11,color:"#15803d",fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>📥 Ingresos por cliente</div>
          {clientes.length===0 && <div style={{fontSize:11,color:"#94a3b8",fontStyle:"italic"}}>Sin clientes activos en esta OP</div>}
          {clientes.map(cl => {
            const teor = cobradoTeoricoCliente(cl);
            const real = getIngreso(cl);
            const dif = teor - real;
            const factNro = pagos.ingresos_por_cliente?.[cl]?.factura_nro || "";
            const factLink = pagos.ingresos_por_cliente?.[cl]?.factura_link || "";
            const tieneFactura = !!(factNro || factLink);
            return (
              <div key={cl} style={{padding:"8px 10px",background:"#f0fdf4",border:"1px solid #dcfce7",borderRadius:7,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>👤 {cl}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>Cobrar c/IVA: <b style={{color:"#15803d"}}>{fmt(teor)}</b></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:8,alignItems:"center",fontSize:11,marginBottom:6}}>
                  <span style={{color:"#475569"}}>Recibido:</span>
                  {numInput(real, v=>setIngreso(cl, v))}
                  {dateInput(pagos.ingresos_por_cliente?.[cl]?.fecha, v=>setIngresoFecha(cl, v))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"auto 90px 1fr auto",gap:6,alignItems:"center",fontSize:11,marginBottom:6}}>
                  <span style={{color:"#475569"}}>🧾 Factura:</span>
                  <input type="text" placeholder="N°" value={factNro}
                    onChange={e=>setIngresoFactNro(cl, e.target.value)}
                    style={{padding:"5px 7px",border:"1px solid #cbd5e1",borderRadius:6,fontSize:11,fontFamily:"inherit",background:"#fff"}}/>
                  <input type="url" placeholder="Link (Drive/OneDrive)" value={factLink}
                    onChange={e=>setIngresoFactLink(cl, e.target.value)}
                    style={{padding:"5px 7px",border:"1px solid #cbd5e1",borderRadius:6,fontSize:11,fontFamily:"inherit",background:"#fff",color:"#475569"}}/>
                  {factLink ? (
                    <a href={factLink} target="_blank" rel="noreferrer"
                      style={{background:"#16a34a",color:"#fff",textDecoration:"none",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                      📄 Ver
                    </a>
                  ) : (
                    <span style={{fontSize:10,color:"#c0392b",fontWeight:600,whiteSpace:"nowrap"}}>Sin facturar</span>
                  )}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
                  <span style={{fontWeight:700,color:dif>0?"#c0392b":(dif<0?"#1aa358":"#64748b")}}>
                    {dif>0 ? `⏳ Por cobrar: ${fmt(dif)}` : (dif<0 ? `⚠️ Cobró ${fmt(-dif)} de más` : "✓ Cobrado al día")}
                  </span>
                  {tieneFactura && <span style={{fontSize:10,color:"#16a34a",fontWeight:600}}>✓ Facturado{factNro?` (N° ${factNro})`:""}</span>}
                </div>
              </div>
            );
          })}
          <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #dcfce7",display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800}}>
            <span style={{color:"#0f172a"}}>TOTAL recibido</span>
            <span style={{color:"#15803d"}}>{fmt(totIngresoReal)}</span>
          </div>
          {porCobrar>0 && (
            <div style={{marginTop:4,padding:"6px 10px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:6,fontSize:11,color:"#92400e",fontWeight:600}}>
              ⏳ Por cobrar a clientes: {fmt(porCobrar)}
            </div>
          )}
        </div>

        {/* EGRESOS */}
        <div style={{background:"#fff",borderRadius:8,border:"1px solid #fed7aa",padding:12}}>
          <div style={{fontSize:11,color:"#c47830",fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>📤 Egresos / Pagos hechos por ZAGA</div>
          {egresosDefs.map(e => {
            const eData = pagos.egresos?.[e.key] || {};
            if (isPagoSunny(e.key)) {
              const rmb = Number(eData.rmb) || 0;
              const tc = Number(eData.tc_wu) || 0;
              const clp = Number(eData.clp_enviado) || 0;
              const com = Number(eData.comision) || 0;
              const ivaComAuto = com * 0.19;
              // Si iva_comision no está seteado o = 0, mostramos el auto. Si fue editado, mostramos el editado.
              const ivaCom = eData.iva_comision != null && eData.iva_comision !== "" ? Number(eData.iva_comision) : ivaComAuto;
              const totalCLP = clp + com + ivaCom;
              const clpDesdeRMB = rmb * tc; // sugerencia: lo que daría según TC × RMB
              return (
                <div key={e.key} style={{padding:"10px 12px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:7,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>{e.emoji} {e.lbl}</div>
                    {dateInput(eData.fecha, v=>setEgreso(e.key,"fecha",v))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"100px 1fr 80px 1fr",gap:6,alignItems:"center",fontSize:11,marginBottom:6}}>
                    <span style={{color:"#475569"}}>¥ RMB enviado:</span>
                    {rmbInput(rmb, v=>setEgreso(e.key,"rmb",v))}
                    <span style={{color:"#475569",textAlign:"right"}}>TC WU:</span>
                    {decInput(tc, v=>setEgreso(e.key,"tc_wu",v), 100, "0.01", "ej. 137")}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"100px 1fr",gap:6,alignItems:"center",fontSize:11,marginBottom:6}}>
                    <span style={{color:"#475569"}}>CLP pagado:</span>
                    {numInput(clp, v=>setEgreso(e.key,"clp_enviado",v))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"100px 1fr 100px 1fr",gap:6,alignItems:"center",fontSize:11,marginBottom:6}}>
                    <span style={{color:"#475569"}}>Comisión WU:</span>
                    {numInput(com, v=>{ setEgreso(e.key,"comision",v); setEgreso(e.key,"iva_comision", v*0.19); })}
                    <span style={{color:"#475569",textAlign:"right"}}>IVA comisión:</span>
                    {numInput(ivaCom, v=>setEgreso(e.key,"iva_comision",v))}
                  </div>
                  <div style={{padding:"7px 10px",background:"#fef3c7",border:"1px solid #fde68a",borderRadius:6,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,marginBottom:6}}>
                    <span style={{fontWeight:600,color:"#78350f"}}>💵 Total CLP pagado real:</span>
                    <span style={{fontWeight:800,color:"#0f172a"}}>{fmt(totalCLP)}</span>
                  </div>
                  <input type="text" placeholder="Nota (opcional)" value={eData.nota||""}
                    onChange={ev=>setEgreso(e.key,"nota",ev.target.value)}
                    style={{width:"100%",padding:"5px 7px",border:"1px solid #fed7aa",borderRadius:6,fontSize:11,fontFamily:"inherit",background:"#fff",color:"#475569"}}/>
                </div>
              );
            }
            if (isPagoChile(e.key)) {
              const serv = Number(eData.servicio_aduana) || 0;
              const iva = Number(eData.iva_aduana) || 0;
              const totalChile = serv + iva;
              return (
                <div key={e.key} style={{padding:"10px 12px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:7,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>{e.emoji} {e.lbl}</div>
                    {dateInput(eData.fecha, v=>setEgreso(e.key,"fecha",v))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"160px 1fr",gap:6,alignItems:"center",fontSize:11,marginBottom:6}}>
                    <span style={{color:"#475569"}}>🛃 Servicio aduana:</span>
                    {numInput(serv, v=>setEgreso(e.key,"servicio_aduana",v))}
                  </div>
                  <div style={{fontSize:10,color:"#92400e",fontStyle:"italic",marginBottom:6,marginLeft:6}}>
                    Honorarios + EDI + despacho + aeropuerto + aforo + IVA agente Leslie
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"160px 1fr",gap:6,alignItems:"center",fontSize:11,marginBottom:6}}>
                    <span style={{color:"#475569"}}>🧾 IVA productos (aduana):</span>
                    {numInput(iva, v=>setEgreso(e.key,"iva_aduana",v))}
                  </div>
                  <div style={{fontSize:10,color:"#92400e",fontStyle:"italic",marginBottom:6,marginLeft:6}}>
                    IVA del CIF al fisco — recuperable F29
                  </div>
                  <div style={{padding:"7px 10px",background:"#fef3c7",border:"1px solid #fde68a",borderRadius:6,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,marginBottom:6}}>
                    <span style={{fontWeight:600,color:"#78350f"}}>💵 Total pagado Chile:</span>
                    <span style={{fontWeight:800,color:"#0f172a"}}>{fmt(totalChile)}</span>
                  </div>
                  <input type="text" placeholder="Nota (opcional)" value={eData.nota||""}
                    onChange={ev=>setEgreso(e.key,"nota",ev.target.value)}
                    style={{width:"100%",padding:"5px 7px",border:"1px solid #fed7aa",borderRadius:6,fontSize:11,fontFamily:"inherit",background:"#fff",color:"#475569"}}/>
                </div>
              );
            }
            // Pagos no Sunny ni Chile: monto simple (pagos extras)
            return (
              <div key={e.key} style={{padding:"8px 10px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:7,marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:"#0f172a",marginBottom:6}}>{e.emoji} {e.lbl}</div>
                <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:8,alignItems:"center",fontSize:11,marginBottom:5}}>
                  <span style={{color:"#475569"}}>Monto:</span>
                  {numInput(getEgreso(e.key), v=>setEgreso(e.key,"monto",v))}
                  {dateInput(eData.fecha, v=>setEgreso(e.key,"fecha",v))}
                </div>
                <input type="text" placeholder="Nota (opcional)" value={eData.nota||""}
                  onChange={ev=>setEgreso(e.key,"nota",ev.target.value)}
                  style={{width:"100%",padding:"5px 7px",border:"1px solid #fed7aa",borderRadius:6,fontSize:11,fontFamily:"inherit",background:"#fff",color:"#475569"}}/>
              </div>
            );
          })}
          <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #fed7aa",display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:800}}>
            <span style={{color:"#0f172a"}}>TOTAL pagado real ZAGA</span>
            <span style={{color:"#c47830"}}>{fmt(totEgresoReal)}</span>
          </div>
        </div>
      </div>

      {/* COMPARATIVO TEÓRICO vs REAL */}
      <div style={{marginTop:14,padding:14,background:"#0f1e30",borderRadius:8,color:"#fff"}}>
        <div style={{fontSize:10,color:"#c9a055",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>📊 Comparativo teórico (cotizador) vs real (caja)</div>

        {/* Ganancia en GRANDE: 2 cards lado a lado */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div style={{background:"#1a2740",borderRadius:10,padding:"18px 20px",border:"1px solid #c9a05533"}}>
            <div style={{fontSize:10,color:"#c9a055",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>🧮 Ganancia teórica neta</div>
            <div style={{fontSize:28,fontWeight:900,color:"#cbd5e1",lineHeight:1.2}}>{fmt(gananciaTeorica)}</div>
            <div style={{fontSize:10,color:"#64748b",marginTop:4,fontStyle:"italic"}}>según cálculos del cotizador</div>
          </div>
          <div style={{background: gananciaReal>=gananciaTeorica?"#14532d":"#3f2410",borderRadius:10,padding:"18px 20px",border:`2px solid ${gananciaReal>=gananciaTeorica?"#16a34a":"#fbbf24"}`}}>
            <div style={{fontSize:10,color: gananciaReal>=gananciaTeorica?"#bbf7d0":"#fde68a",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>
              🏆 Ganancia REAL neta {(faltaCargarPagos || noHayPagosRegistrados || noHayIngresosRegistrados) && <span style={{fontWeight:600,color:"#fde68a"}}>(estimada)</span>}
            </div>
            <div style={{fontSize:32,fontWeight:900,color: gananciaReal>=gananciaTeorica?"#22c55e":"#fbbf24",lineHeight:1.2}}>{fmt(gananciaReal)}</div>
            {(faltaCargarPagos || noHayPagosRegistrados) && (
              <div style={{fontSize:10,color:"#fde68a",marginTop:4,fontStyle:"italic"}}>
                {noHayPagosRegistrados
                  ? `Usando costo teórico como egreso (${fmt(totCostoNeto)}). Carga pagos a Sunny/Chile para ver ganancia real.`
                  : `Faltan pagos por cargar: $${(totCostoNeto - totEgresoReal).toLocaleString("es-CL")} pendientes vs teórico.`}
              </div>
            )}
            {noHayIngresosRegistrados && !faltaCargarPagos && !noHayPagosRegistrados && (
              <div style={{fontSize:10,color:"#fde68a",marginTop:4,fontStyle:"italic"}}>Cliente aún no pagó — usando cobrado teórico.</div>
            )}
            {!faltaCargarPagos && !noHayPagosRegistrados && !noHayIngresosRegistrados && Math.abs(diffGanancia)>1000 && (
              <div style={{fontSize:12,fontWeight:700,color:diffGanancia>=0?"#22c55e":"#fca5a5",marginTop:4}}>
                {diffGanancia>=0?"▲ +":"▼ "}{fmt(Math.abs(diffGanancia))} vs teórico ({diffGanancia>=0?"ganaste más":"perdiste"})
              </div>
            )}
            {!faltaCargarPagos && !noHayPagosRegistrados && !noHayIngresosRegistrados && Math.abs(diffGanancia)<=1000 && (
              <div style={{fontSize:10,color:"#94a3b8",marginTop:4,fontStyle:"italic"}}>✓ Real al día con lo esperado</div>
            )}
          </div>
        </div>

        {/* Datos auxiliares en pequeño */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,fontSize:11,paddingTop:12,borderTop:"1px solid #1a2740"}}>
          <div>
            <div style={{fontSize:9,color:"#94a3b8",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>Cobrado teórico</div>
            <div style={{fontWeight:700}}>{fmt(totIngresoTeorico)}</div>
          </div>
          <div>
            <div style={{fontSize:9,color:"#94a3b8",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>Cobrado real</div>
            <div style={{fontWeight:700,color:"#22c55e"}}>{fmt(totIngresoReal)}</div>
          </div>
          <div>
            <div style={{fontSize:9,color:"#94a3b8",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>Costo teórico</div>
            <div style={{fontWeight:700}}>{fmt(totCostoNeto)}</div>
          </div>
          <div>
            <div style={{fontSize:9,color:"#94a3b8",marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>Pagado real</div>
            <div style={{fontWeight:700,color:"#c47830"}}>{fmt(totEgresoReal)}</div>
          </div>
        </div>
      </div>

      <div style={{marginTop:12,display:"flex",gap:10,alignItems:"center",justifyContent:"flex-end"}}>
        <button onClick={guardar} disabled={saving}
          style={{background:saving?"#cbd5e1":"#1aa358",color:"#fff",border:"none",borderRadius:7,padding:"8px 18px",fontSize:12,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
          {saving?"Guardando...":"💾 Guardar pagos"}
        </button>
      </div>
    </div>
  );
}

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
  // Operaciones consolidadas (aéreas)
  const [operaciones, setOperaciones] = useState([]);
  const [opEditId, setOpEditId] = useState(null);          // operación en edición
  const [opOpenId, setOpOpenId] = useState(null);          // operación expandida en lista
  const [opForm, setOpForm] = useState(null);              // formulario operación
  const [opDistribucion, setOpDistribucion] = useState("cbm"); // cbm | unidades
  const [editId,setEditId]               = useState(null);
  // Autocompletar margen 15% del precio China en marítimo v2, solo si está vacío y crea nueva cot.
  useEffect(()=>{
    if(editId) return;
    if(!form.modelo_v2) return;
    const transMar = form.transporte === "maritimo" || form.transporte === "ambos";
    if(!transMar) return;
    const pCh = Number(form.precio_china)||0;
    if(pCh <= 0) return;
    if(form.margen_und !== "" && Number(form.margen_und) > 0) return;
    const sugerido = Math.round(pCh * 0.15);
    setForm(p => ({...p, margen_und: sugerido}));
  }, [form.precio_china, form.transporte, form.modelo_v2, editId]);
  const [openId,setOpenId]               = useState(null);
  const [filterEstado,setFilterEstado]   = useState("todos");
  const [filterCliente,setFilterCliente] = useState("todos");
  const [filterGestor,setFilterGestor]   = useState("todos");
  const [filterTransporte,setFilterTransporte] = useState("todos");
  const [mostrarOtrosClientes,setMostrarOtrosClientes] = useState(false);
  const [mostrarOtrosClientesCalc,setMostrarOtrosClientesCalc] = useState(false);
  const [searchQuery,setSearchQuery]     = useState("");
  const [toast,setToast]                 = useState(null);
  const [vistaId,setVistaId]             = useState(null);
  const [previewId,setPreviewId]         = useState(null);
  const [printModal,setPrintModal]       = useState(null); // "tracker" | "cliente" | "op_cliente"
  const [vistaOpId,setVistaOpId]         = useState(null);
  const [vistaOpCliente,setVistaOpCliente] = useState(null);
  const [vistaValidarId,setVistaValidarId] = useState(null); // ID de cot aérea para validar
  const [validarForm,setValidarForm]     = useState({}); // costos Chile editables + margen + precio acordado
  const [margenesPorCot,setMargenesPorCot] = useState({}); // {cotId: pct} margen objetivo por cot en panel OP
  // Notificaciones cots nuevas creadas por cliente (autoservicio portal cliente)
  const [cotsVistas,setCotsVistas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zaga_cots_cliente_vistas")||"[]") } catch(e) { return [] }
  });
  const cotsClienteNuevasIdsRef = useRef(new Set());
  const yaInicializoNotifRef = useRef(false);
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
  const [notaClienteInput,setNotaClienteInput] = useState({});
  const [notaOculta,setNotaOculta] = useState({});
  const [notaEditando,setNotaEditando] = useState({}); // key: "cotId_i" → {texto, oculta}
  const [gestTab, setGestTab] = useState({});          // tab activa gestionar: "notas"|"cliente"|"china"
  const [chatOpen, setChatOpen] = useState({});        // mini-chat inline: {cotId: "cliente"|"china"|null}
  const [notaChinaInput, setNotaChinaInput] = useState({});
  const [newImgInput, setNewImgInput] = useState({});    // {cotId: url en progreso}
  const [imgIdx, setImgIdx] = useState({});              // {cotId: índice imagen activa carousel}
  const [resumenChina,setResumenChina] = useState(null);
  const [backupModal,setBackupModal] = useState(null); // null | "export" | "import"
  const [simModal,setSimModal]       = useState(false);
  const [backupText,setBackupText] = useState(""); // {[cotId]: {nota, unidades_prop, precio_prop}}
  const vistaRef                         = useRef(null);
  const vistaClienteRef                  = useRef(null);

  const [cargando,setCargando]=useState(true);
  const [alertasLeidas,setAlertasLeidas]=useState(()=>{
    try{ return new Set(JSON.parse(localStorage.getItem("zaga_alertas_leidas")||"[]")); }
    catch(e){ return new Set(); }
  });
  const [clientCodes,setClientCodes]=useState(()=>{
    try{ return JSON.parse(localStorage.getItem("zaga_client_codes")||"{}"); }
    catch(e){ return {}; }
  });

  // ── Recargar datos desde Supabase (carga inicial + botón Refrescar) ─────
  const cargar = async () => {
    setCargando(true);
    try{
      const {data,error}=await supabase
        .from("cotizaciones")
        .select("id,datos")
        .order("created_at",{ascending:false});
      if(error) throw error;
      if(data&&data.length>0){
        const lista=data.map(r=>{
          const c = Object.assign({},r.datos,{id:r.id});
          // Regenerar calc on-the-fly si esta vacio (algunas cots viejas
          // o migradas pueden tener calc:null y romper paneles de ganancia)
          if (!c.calc && c.tipo !== "propia") {
            try { c.calc = calcCliente(c); } catch(_){}
          } else if (!c.calc && c.tipo === "propia") {
            try { c.calc = calcPropia(c); } catch(_){}
          }
          return c;
        });
        cotizacionesRef.current=lista;
        setCotizaciones(lista);
      } else {
        const local=localStorage.getItem("zaga_v6");
        if(local){
          const lista=JSON.parse(local);
          if(Array.isArray(lista)&&lista.length>0){
            const rows=lista.map(c=>({id:c.id,nro:c.nro||"",cliente:c.cliente||"",gestor:c.gestor||"francisco",estado:c.estado||"solicitud",tipo:c.tipo||"cliente",datos:c}));
            await supabase.from("cotizaciones").upsert(rows,{onConflict:"id"});
            cotizacionesRef.current=lista;
            setCotizaciones(lista);
            showToast(`✓ ${lista.length} cotizaciones migradas a la nube`);
          }
        }
      }
    }catch(e){
      try{ const r=localStorage.getItem("zaga_v6"); if(r){ const d=JSON.parse(r); cotizacionesRef.current=d; setCotizaciones(d); } }catch(_){}
      showToast("Error de conexión — usando datos locales","err");
    }
    try{
      const {data:opData}=await supabase.from("operaciones").select("id,datos,created_at,updated_at").order("created_at",{ascending:false});
      if(opData&&Array.isArray(opData)){
        setOperaciones(opData.map(r=>({...r.datos,id:r.id,_created:r.created_at,_updated:r.updated_at})));
      }
    }catch(e){ /* tabla operaciones puede no existir aún */ }
    setCargando(false);
  };

  // ── CARGA INICIAL + REAL-TIME ──────────────────────────────
  useEffect(()=>{
    cargar();
    // ── REAL-TIME: detectar cambios del agente China (notas) ──
    const channel=supabase.channel("zaga-cotizador-admin-v1")
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"cotizaciones"},async(payload)=>{
        const {data}=await supabase.from("cotizaciones").select("id,datos").eq("id",payload.new.id).single();
        if(data){
          // FIX: garantizar id real de columna Supabase, no datos.id (puede ser null)
          const nd=Object.assign({},data.datos,{id:data.id});
          const prevList=cotizacionesRef.current;
          const prev=prevList.find(x=>x.id===nd.id);
          // Alerta si llegó nota china nueva
          if(nd?.nota_china_nueva&&Array.isArray(nd?.notas_china_historial)&&nd.notas_china_historial.length>0){
            const prevNotas=prev?.notas_china_historial||[];
            if(nd.notas_china_historial.length>prevNotas.length){
              showToast(`🇨🇳 El agente China dejó una nota en "${nd.nro||nd.producto||"cotización"}"`, "ok");
            }
          }
          // Alerta si llegó nota nueva del cliente (contamos no leídas por admin)
          const prevCliNoLeidas=(prev?.notas_cliente_historial||[]).filter(n=>n.autor==="cliente"&&!n.leida_por_admin).length;
          const newCliNoLeidas=(nd?.notas_cliente_historial||[]).filter(n=>n.autor==="cliente"&&!n.leida_por_admin).length;
          if(newCliNoLeidas>prevCliNoLeidas){
            showToast(`💬 Cliente dejó nota en "${nd.nro||nd.producto||"cotización"}"`, "ok");
          }
          const updated=prevList.map(x=>x.id===nd.id?nd:x);
          cotizacionesRef.current=updated;
          setCotizaciones(updated);
          try{ localStorage.setItem("zaga_v6",JSON.stringify(updated)); }catch(_){}
        }
      })
      .subscribe();
    // ── AUTO-REFRESH al volver a la tab (visibilitychange) ──
    // Cuando el admin vuelve a la pestaña después de estar en otra ventana/tab
    // (WhatsApp, otra app, etc.), refresca datos automáticamente. Evita ver
    // valores stale si el realtime websocket no propagó.
    let ultimoRefreshFoco = Date.now();
    const onVisibilidad = () => {
      if (document.visibilityState === "visible") {
        const ahora = Date.now();
        // Solo refrescar si pasaron >5 segundos desde el último refresh por foco
        // (evita refrescos en cascada por cambios rápidos entre tabs)
        if (ahora - ultimoRefreshFoco > 5000) {
          ultimoRefreshFoco = ahora;
          cargar();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilidad);
    return ()=>{
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisibilidad);
    };
  },[]);

  // ── NOTIFICACIÓN cots nuevas creadas por cliente desde portal ──
  // Detecta cots con creada_por_cliente=true y estado=solicitud que no están
  // en cotsVistas. Si aparecen NUEVAS respecto al render anterior, reproduce beep.
  useEffect(() => {
    const nuevas = cotizaciones.filter(c => c.creada_por_cliente === true && c.estado === "solicitud" && !cotsVistas.includes(c.id));
    const ids = nuevas.map(c => c.id);
    const newOnes = ids.filter(id => !cotsClienteNuevasIdsRef.current.has(id));
    if (yaInicializoNotifRef.current && newOnes.length > 0 && tab2 !== "tracker") {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 880;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
        }
      } catch(e) {}
      showToast(`🔔 ${newOnes.length} cotización${newOnes.length>1?"es":""} nueva${newOnes.length>1?"s":""} del cliente`, "ok");
    }
    cotsClienteNuevasIdsRef.current = new Set(ids);
    yaInicializoNotifRef.current = true;
  }, [cotizaciones, cotsVistas]);

  // Al entrar a tracker, marcar todas las cots cliente nuevas como vistas
  useEffect(() => {
    if (tab2 === "tracker") {
      const idsNuevas = cotizaciones.filter(c => c.creada_por_cliente === true && c.estado === "solicitud" && !cotsVistas.includes(c.id)).map(c => c.id);
      if (idsNuevas.length > 0) {
        const nuevoSet = [...new Set([...cotsVistas, ...idsNuevas])];
        setCotsVistas(nuevoSet);
        try { localStorage.setItem("zaga_cots_cliente_vistas", JSON.stringify(nuevoSet)); } catch(e) {}
      }
    }
  }, [tab2, cotizaciones]);

  const cotsNuevasCount = cotizaciones.filter(c => c.creada_por_cliente === true && c.estado === "solicitud" && !cotsVistas.includes(c.id)).length;

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

  // ── PERSIST: solo UPSERT. NUNCA borra cotizaciones de otros usuarios.
  // BUG histórico: antes hacía DELETE de los IDs que no estaban en memoria local,
  // lo que borraba el trabajo de quien estuviera editando en paralelo.
  // Para borrar, usar handleDelete (DELETE explícito por ID).
  const persist=useCallback(async list=>{
    cotizacionesRef.current=list;
    setCotizaciones(list);
    // Guardar en localStorage como respaldo offline
    try{ localStorage.setItem("zaga_v6",JSON.stringify(list)); }catch(_){}
    // Guardar en Supabase — solo UPSERT, jamás DELETE masivo
    try{
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
    }catch(e){ console.warn("Supabase sync error:",e); }
  },[supabase]);
  const showToast=(msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  const calcActual = form.tipo==="propia" ? calcPropia(form) : calcCliente(form);
  // Paso 1 = nueva solicitud sin precio China aún → ocultar bloques financieros
  const esPaso1 = !editId && !Number(form.precio_china);

  const handleSave=async()=>{
    if(!form.producto){ showToast("Ingresa el producto","err"); return; }
    if(form.tipo==="cliente"&&!form.cliente){ showToast("Ingresa el nombre del cliente","err"); return; }
    const checklDef=form.tipo==="propia"?CHECKLIST_PROPIA:CHECKLIST_CLIENTE;

    // ── MODO AMBOS: crear 2 cots independientes (marítima + aérea) con la misma info base ──
    // Solo aplica al CREAR (no al editar). Cada cot tendrá su propio nro consecutivo,
    // su propio transporte y sus unidades específicas. El resto de campos se comparten.
    if(!editId && form.transporte === "ambos"){
      const undMar = Number(form.unidades)||0;
      const undAer = Number(form.unidades_aereo)||0;
      if(undMar<=0 || undAer<=0){ showToast("Ingresa unidades para marítimo y aéreo","err"); return; }
      const base = {...form};
      delete base.unidades_aereo; // no se persiste, es solo input del form
      const baseChecklist = Object.fromEntries(checklDef.map(c=>[c.key,false]));
      const now = Date.now();
      const nroBase = cotizaciones.length;
      // Cot marítima
      const cotMar = {
        ...base, transporte:"maritimo", unidades: undMar,
        id: now.toString(), nro:`COT-${String(nroBase+1).padStart(3,"0")}`,
        estado:"solicitud", fecha_llegada_est:"", motivo_no_procesada:"",
        checklist:{...baseChecklist},
      };
      cotMar.calc = calcCliente(cotMar);
      // Cot aérea (hereda flags aéreos)
      const cotAer = {
        ...base, transporte:"aereo", unidades: undAer,
        pago_100:true, con_iva:true, requiere_factura:true,
        pct_servicio: (!base.pct_servicio||Number(base.pct_servicio)===4) ? 6 : base.pct_servicio,
        id: (now+1).toString(), nro:`COT-${String(nroBase+2).padStart(3,"0")}`,
        estado:"solicitud", fecha_llegada_est:"", motivo_no_procesada:"",
        checklist:{...baseChecklist},
      };
      cotAer.calc = calcCliente(cotAer);
      await persist([cotAer, cotMar, ...cotizaciones]);
      showToast(`✓ Creadas ${cotMar.nro} (🚢) y ${cotAer.nro} (✈️)`);
      setEditId(null); setForm(defaultForm); setTab("tracker");
      return;
    }

    // ── MODO NORMAL: una sola cot ──
    const id=editId||Date.now().toString();
    const prev=editId?cotizaciones.find(c=>c.id===editId):null;
    const nro=prev?.nro||`COT-${String(cotizaciones.length+1).padStart(3,"0")}`;
    const entry={...form,id,nro,calc:calcActual,
      estado:prev?.estado||"solicitud",
      fecha_llegada_est:prev?.fecha_llegada_est||"",
      motivo_no_procesada:prev?.motivo_no_procesada||"",
      checklist:prev?.checklist||Object.fromEntries(checklDef.map(c=>[c.key,false])),
    };
    delete entry.unidades_aereo; // limpieza por si quedó del form
    if(editId) await persist(cotizaciones.map(c=>c.id===editId?{...entry,historial:c.historial}:c));
    else await persist([entry,...cotizaciones]);
    showToast(editId?"Actualizada ✓":"Guardada ✓");
    setEditId(null); setForm(defaultForm); setTab("tracker");
  };

  // Marca cot como "no prosperó" + la saca de la OP si pertenecía a una.
  const handleMarcarNoProspero = async (id) => {
    const cot = cotizaciones.find(c => c.id === id);
    if (!cot) return;
    const opVinc = cot.operacion_id ? operaciones.find(o => o.id === cot.operacion_id) : null;
    const enOpMsg = opVinc ? `\n\nTambién se quitará automáticamente de ${opVinc.nro} (consolidado).` : "";
    if (!confirm(`¿Marcar ${cot.nro || "esta cot"} como NO PROSPERÓ?\n\nQuedará cerrada en "❌ No procesadas". El cliente verá el estado actualizado.${enOpMsg}\n\nEsta acción no afecta los precios ni cálculos de las otras cots del consolidado (sus precios quedan intactos).`)) return;
    try {
      // 1. Actualizar cot: estado no_prospero + limpiar operacion_id
      const { operacion_id, ...rest } = cot;
      const newCotDatos = { ...rest, estado: "no_prospero" };
      delete newCotDatos.id;
      await supabase.from("cotizaciones")
        .update({ datos: newCotDatos, estado: "no_prospero", updated_at: new Date().toISOString() })
        .eq("id", id);
      // 2. Si pertenecía a una OP: sacarla del array op.cotizaciones
      if (opVinc) {
        const newCotsArr = (opVinc.cotizaciones || []).filter(cId => cId !== id);
        const newOpDatos = { ...opVinc, cotizaciones: newCotsArr };
        delete newOpDatos.id;
        await supabase.from("operaciones")
          .update({ datos: newOpDatos, updated_at: new Date().toISOString() })
          .eq("id", opVinc.id);
        setOperaciones(prev => prev.map(o => o.id === opVinc.id ? { ...newOpDatos, id: opVinc.id } : o));
      }
      // 3. Actualizar state local
      setCotizaciones(prev => prev.map(c => c.id === id ? { ...newCotDatos, id } : c));
      showToast(`✓ ${cot.nro || "Cotización"} marcada como No prosperó${opVinc ? " y removida de " + opVinc.nro : ""}`);
    } catch (e) {
      console.error(e);
      showToast("Error: " + (e.message || "no se pudo actualizar"), "err");
    }
  };

  const handleEstado=async(id,estado)=>{
    const cot = cotizaciones.find(c => c.id === id);
    const estadoAnterior = cot?.estado;
    await persist(cotizaciones.map(c=>{
      if(c.id!==id) return c;
      let fll=c.fecha_llegada_est;
      if(estado==="pagada"&&!fll){ const d=new Date(); const diasLlegada=c.transporte==="aereo"?25:90; d.setDate(d.getDate()+diasLlegada); fll=d.toISOString().split("T")[0]; }
      // Auto-marcar pago1_cliente cuando estado pasa a pagada (admin marcó como pagada → cliente pagó)
      let chk=c.checklist||{};
      let fechaP1=c.fecha_pago1_cliente;
      if(estado==="pagada"&&!chk.pago1_cliente){
        chk={...chk,pago1_cliente:true};
        if(!fechaP1) fechaP1=new Date().toISOString().split("T")[0];
      }
      return {...c,estado,fecha_llegada_est:fll,checklist:chk,fecha_pago1_cliente:fechaP1};
    }));
    if (estadoAnterior !== estado) {
      const lblNuevo = EST_LABEL[estado] || estado;
      showToast(`✓ ${cot?.nro || "cotización"} → ${lblNuevo}`);
    }
  };

  // Guarda y sincroniza explícitamente: re-persiste cot + recarga datos para todos
  const handleGuardarSincronizar = async (id) => {
    const cot = cotizaciones.find(c => c.id === id);
    if (!cot) return;
    try {
      // Re-upsert explícito de la cot actual
      await supabase.from("cotizaciones").upsert([{
        id: cot.id,
        nro: cot.nro || "",
        cliente: cot.cliente || "",
        gestor: cot.gestor || "francisco",
        estado: cot.estado || "solicitud",
        tipo: cot.tipo || "cliente",
        datos: cot,
        updated_at: new Date().toISOString(),
      }], { onConflict: "id" });
      // Recargar todo desde Supabase para que el admin vea lo más fresco
      await cargar();
      showToast(`✓ ${cot.nro || "Cotización"} guardada — sincronizado en todos los portales`);
    } catch (e) {
      showToast("Error al guardar: " + (e.message || ""), "err");
    }
  };

  const handleCheck=async(id,key,val)=>{
    await persist(cotizaciones.map(c=>{
      if(c.id!==id) return c;
      const chk={...c.checklist,[key]:val};
      let estado=c.estado;
      if(key==="solicitud"&&val) estado="solicitud";
      if(key==="cotizada"&&val) estado="cotizada";
      if(key==="cliente_acepto"&&val) estado="pagada";
      if(key==="retirado_bodega"&&val) estado="completada";
      if(key==="pago2_cliente"&&val) estado="en_bodega";
      if(key==="vendido_100"&&val) estado="completada";
      const upd2={};
      if(key==="pago1_cliente"&&val&&!c.fecha_pago1_cliente) upd2.fecha_pago1_cliente=new Date().toISOString().split("T")[0];
      let fll=c.fecha_llegada_est;
      if(key==="pago_china"&&val&&!fll){ const d=new Date(); const diasLlegada=c.transporte==="aereo"?25:90; d.setDate(d.getDate()+diasLlegada); fll=d.toISOString().split("T")[0]; }
      if(key==="pago_china"&&val){ upd2.fecha_pago_china=new Date().toISOString().split("T")[0]; }
      // Auto-registrar fecha real de llegada a bodega
      let fReal=c.fecha_llegada_real||"";
      if(key==="retirado_bodega"&&val&&!fReal) fReal=new Date().toISOString().split("T")[0];
      if(key==="llego_chile"&&val&&!fReal) fReal=new Date().toISOString().split("T")[0];
      return {...c,...upd2,checklist:chk,estado,fecha_llegada_est:fll,fecha_llegada_real:fReal};
    }));
  };

  const handleMotivo=async(id,motivo)=>{ await persist(cotizaciones.map(c=>c.id===id?{...c,motivo_no_procesada:motivo}:c)); };

  // Ajusta unidades para cuadrar con el empaque del proveedor (cajas completas).
  // Guarda la cantidad original para mostrar al cliente que se incrementó por embalaje.
  const handleAjustarCantidad = async (id, unidadesNuevas, unidadesOriginales) => {
    const cot = cotizaciones.find(c => c.id === id);
    if (!cot) return;
    if (!confirm(`Ajustar cantidad de ${cot.nro || "cotización"} a ${unidadesNuevas} und?\n\nCantidad original (pedido cliente): ${unidadesOriginales} und.\nNueva cantidad ajustada al empaque: ${unidadesNuevas} und.\n\nSe le avisará al cliente que se aumentó por completar caja.`)) return;
    await persist(cotizaciones.map(c => {
      if (c.id !== id) return c;
      return {
        ...c,
        unidades: unidadesNuevas,
        unidades_originales: c.unidades_originales || unidadesOriginales,
        fecha_ajuste_cantidad: new Date().toISOString().split("T")[0],
      };
    }));
    showToast(`✓ ${cot.nro || "Cotización"} ajustada: ${unidadesOriginales} → ${unidadesNuevas} und`);
  };
  const handleEdit=(c)=>{ setForm({...defaultForm,...c}); setEditId(c.id); setTab("calc"); };
  // DELETE explícito por ID (única forma autorizada de borrar). Confirma antes.
  const handleDelete=async id=>{
    const cot=cotizaciones.find(c=>c.id===id);
    const nro=cot?.nro||id;
    if(!confirm(`¿Eliminar definitivamente la cotización ${nro}? Esta acción no se puede deshacer.`)) return;
    try{
      // 1) Borrar en Supabase por ID exacto
      const {error}=await supabase.from("cotizaciones").delete().eq("id",id);
      if(error) throw error;
      // 2) Quitar de memoria local + localStorage
      const nueva=cotizaciones.filter(c=>c.id!==id);
      cotizacionesRef.current=nueva;
      setCotizaciones(nueva);
      try{ localStorage.setItem("zaga_v6",JSON.stringify(nueva)); }catch(_){}
      showToast(`✓ ${nro} eliminada`);
    }catch(e){
      showToast("Error al eliminar: "+(e.message||""),"err");
    }
  };


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

  // Asigna y persiste codigos unicos de cliente (CLI-001, CLI-002...)
  // El orden se basa en la fecha de la primera cotizacion de cada cliente
  const getClientCode=(nombre)=>{
    if(!nombre) return null;
    if(clientCodes[nombre]) return clientCodes[nombre];
    const porFecha=[...new Set(cotizaciones.filter(c=>c.tipo!=="propia"&&c.cliente).map(c=>c.cliente))]
      .map(cl=>({ cl, fecha: cotizaciones.filter(c=>c.cliente===cl).map(c=>c.fecha_solicitud||"").sort()[0]||"9999" }))
      .sort((a,b)=>a.fecha.localeCompare(b.fecha));
    const nuevos={...clientCodes};
    let changed=false;
    porFecha.forEach((item,i)=>{
      const code=`CLI-${String(i+1).padStart(3,"0")}`;
      if(!nuevos[item.cl]){ nuevos[item.cl]=code; changed=true; }
    });
    if(changed){
      setClientCodes(nuevos);
      try{ localStorage.setItem("zaga_client_codes",JSON.stringify(nuevos)); }catch(e){}
    }
    return nuevos[nombre]||null;
  };
  const filtradas=cotizaciones.filter(c=>{
    if(c.id===openId) return true; // siempre mostrar la cotización con el panel abierto
    const passEstado=filterEstado==="todos"||c.estado===filterEstado;
    const passCliente=filterCliente==="todos"||(filterCliente==="__propias__"?c.tipo==="propia":c.cliente===filterCliente);
    const passGestor=filterGestor==="todos"||c.gestor===filterGestor||(filterGestor==="francisco"&&!c.gestor);
    const passTransporte=filterTransporte==="todos"||c.transporte===filterTransporte||(filterTransporte==="maritimo"&&(!c.transporte||c.transporte==="ambos"));
    const q=searchQuery.trim().toLowerCase();
    const passSearch=!q||(c.nro&&c.nro.toString().toLowerCase().includes(q))||(c.cliente&&c.cliente.toLowerCase().includes(q))||(c.producto&&c.producto.toLowerCase().includes(q))||(c.sku_china&&c.sku_china.toLowerCase().includes(q))||(c.sku_bodega&&c.sku_bodega.toLowerCase().includes(q));
    return passEstado&&passCliente&&passGestor&&passTransporte&&passSearch;
  });

  // Export via print dialog (no CDN needed)
  const abrirPrint=(tipo)=>{ setPrintModal(tipo); };
  const cerrarPrint=()=>{ setPrintModal(null); setVistaOpId(null); setVistaOpCliente(null); };

  const _vistaRaw=vistaId?cotizaciones.find(c=>c.id===vistaId):null;
  // CRÍTICO: usar el calc HISTÓRICO de Supabase si existe (los montos cobrados al cliente
  // quedan CONGELADOS). Solo recalcular si calc está vacío (cots viejas sin calc o que el
  // admin borró manualmente para forzar recálculo con fórmula nueva).
  // No hacer recálculo on-the-fly de cots ya guardadas: el cliente pagó exactamente esos montos.
  const vistaData=_vistaRaw
    ? {..._vistaRaw, calc: _vistaRaw.calc || (_vistaRaw.tipo==="propia"?calcPropia(_vistaRaw):calcCliente(_vistaRaw))}
    : null;

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
    if(["no_prospero"].includes(c.estado)) return 0;
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
          .op-card{padding:12px !important}
          .op-card-header{flex-direction:column !important;align-items:stretch !important;gap:10px !important}
          .op-title-row{flex-wrap:wrap !important;gap:6px !important}
          .op-title-row select{flex:1 1 100% !important;padding:8px 10px !important;font-size:12px !important;margin-top:4px !important}
          .op-card-actions{display:grid !important;grid-template-columns:1fr 1fr !important;gap:6px !important;width:100% !important}
          .op-card-actions button{width:100% !important;padding:10px 6px !important;font-size:11px !important}
          .op-card-actions button:first-child{grid-column:1 / -1 !important}
          .op-cons-block{padding:10px !important;margin-top:12px !important}
          .op-cons-table th,.op-cons-table td{padding:5px 6px !important;font-size:10px !important}
          .op-cons-table td:first-child div:first-child{font-size:11px !important}
          .op-cons-footer{font-size:9px !important}
          .op-bottom-actions{display:grid !important;grid-template-columns:1fr !important;gap:6px !important;margin-top:12px !important}
          .op-bottom-actions button{width:100% !important;padding:11px 10px !important;font-size:12px !important}
          /* Vista cliente OP consolidada — optimizada para 1 pantallazo móvil */
          .opvc-wrap{padding:4px 0 !important}
          .print-modal-inner{padding:46px 14px 20px !important}
          .opvc-header{padding:8px 12px !important;flex-wrap:nowrap !important;gap:6px !important}
          .opvc-header img{height:20px !important}
          .opvc-header-sub{display:none !important}
          .opvc-header-r{text-align:right !important}
          .opvc-header-r .opvc-header-date{display:none !important}
          .opvc-banner{padding:8px 12px !important;gap:6px !important;grid-template-columns:repeat(3,1fr) !important}
          .opvc-banner .opvc-kpi-3{display:block !important}
          .opvc-banner .opvc-kpi-hide-mob{display:none !important}
          .opvc-banner .opvc-kpi-lbl{font-size:8px !important;margin-bottom:1px !important;letter-spacing:0.5px !important}
          .opvc-banner .opvc-kpi-val{font-size:13px !important}
          .opvc-alert{padding:6px 12px !important;font-size:10px !important}
          .opvc-alert div:first-child{font-size:10.5px !important}
          .opvc-alert div:last-child{font-size:13px !important}
          .opvc-body{padding:8px 12px !important}
          .opvc-body .opvc-section-ttl{display:none !important}
          /* Cards de cotización ULTRA compactas en móvil: 2 líneas */
          .opvc-cot{margin-bottom:4px !important;border-width:1px !important;border-radius:6px !important}
          .opvc-cot-hdr{display:none !important}
          .opvc-cot-grid{display:none !important}
          .opvc-cot-mob{display:block !important;padding:7px 10px !important;font-size:11px !important;line-height:1.4 !important}
          .opvc-cot-mob .row1{display:flex !important;justify-content:space-between !important;align-items:flex-start !important;gap:10px !important;margin-bottom:3px !important}
          .opvc-cot-mob .prod-wrap{flex:1 !important;min-width:0 !important}
          .opvc-cot-mob .nro-chip{display:inline-block !important;background:#040c18 !important;color:#c47830 !important;font-size:8.5px !important;font-weight:800 !important;padding:1px 6px !important;border-radius:3px !important;margin-right:6px !important;vertical-align:middle !important;letter-spacing:0.3px !important}
          .opvc-cot-mob .prod{font-weight:700 !important;color:#0f172a !important;font-size:11.5px !important;word-wrap:break-word !important}
          .opvc-cot-mob .tot{font-weight:800 !important;color:#1aa358 !important;font-size:12.5px !important;flex-shrink:0 !important;white-space:nowrap !important}
          .opvc-cot-mob .row2{display:flex !important;justify-content:space-between !important;align-items:center !important;color:#64748b !important;font-size:10px !important;gap:8px !important}
          .opvc-cot-mob .llegada{color:#c47830 !important;font-weight:700 !important;font-style:italic !important;white-space:nowrap !important}
          .opvc-pay{padding:10px 12px !important;margin-top:8px !important;border-radius:9px !important}
          .opvc-pay-ttl{font-size:9px !important;margin-bottom:7px !important;letter-spacing:1px !important}
          .opvc-pay-box{padding:7px 10px !important;border-radius:6px !important}
          .opvc-pay-box-lbl{font-size:10px !important}
          .opvc-pay-box-sub{display:none !important}
          .opvc-pay-box-val{font-size:14px !important;margin-top:2px !important}
          .opvc-pay-total{font-size:11px !important;margin-top:7px !important;padding-top:7px !important}
          .opvc-pay-total-val{font-size:17px !important}
          .opvc-msg{padding:7px 10px !important;margin-top:7px !important;font-size:9.5px !important;line-height:1.4 !important;border-radius:6px !important}
          .opvc-footer{display:none !important}
          .opvc-detalle-section-ttl{display:none !important}
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
                [cotizaciones.filter(c=>["solicitud","cotizada"].includes(c.estado)).length,"Pendientes","#f59e0b"],
                [cotizaciones.filter(c=>["pagada","en_camino"].includes(c.estado)).length,"En tránsito","#60a5fa"],
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

            <button onClick={cargar} title="Refrescar datos (recarga cotizaciones + operaciones)" style={{background:"transparent",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:500}}>🔄 Refrescar</button>
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
          {[["calc","Calculadora"],["tracker",`Tracker (${cotizaciones.length})`],["operaciones",`✈️ Operaciones${operaciones.length>0?` (${operaciones.length})`:""}`],["dashboard","Dashboard"],["clientes","Clientes"],["luisa","Luisa"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{position:"relative",
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
            }}>
              {l}
              {k==="tracker" && cotsNuevasCount > 0 && (
                <span style={{position:"absolute",top:6,right:6,background:"#ef4444",color:"#fff",borderRadius:10,minWidth:18,height:18,fontSize:10,fontWeight:800,padding:"0 5px",display:"inline-flex",alignItems:"center",justifyContent:"center",animation:"pulse 1.5s ease-in-out infinite",boxShadow:"0 0 0 0 rgba(239,68,68,0.4)"}}>
                  🔔{cotsNuevasCount}
                </span>
              )}
            </button>
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
        const esPropia=c.tipo==="propia";
        const transp=c.transporte==="aereo"?"✈️ Aéreo":c.transporte==="ambos"?"🚢 Marítimo + ✈️ Aéreo (cotizar ambos)":"🚢 Marítimo";
        const saludo=esPropia
          ? `Hola! Te mando cotización ${c.nro} 🙌`
          : `Hola! Te mando cotización ${c.nro} 🙌${c.categoria_cliente==="premium"?" — ⭐ CLIENTE PREMIUM, prioridad favor":c.categoria_cliente==="recurrente"?" — Cliente recurrente nuestro":""}`;
        const texto=`${saludo}

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
          {/* Botón cerrar flotante */}
          <button className="no-print" onClick={cerrarPrint} style={{position:"fixed",top:10,right:10,zIndex:20,background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:20,padding:"6px 14px",fontSize:13,cursor:"pointer",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>✕ Cerrar</button>
          {/* Contenido del reporte */}
          <div className="print-modal-inner" style={{maxWidth:820,margin:"0 auto",padding:"24px 20px"}}>
            {printModal==="tracker"&&vistaData&&vistaData.tipo!=="propia"&&(()=>{
              // Vista cliente individual — limpia, estilo OP cliente
              const cot = vistaData;
              const u = Number(cot.unidades) || 0;
              const isAereo = cot.transporte === "aereo";
              // IVA: aéreo siempre lleva IVA; marítimo respeta flag con_iva del form
              const conIva = isAereo || !!cot.con_iva;
              // Precio: usar acordado si existe, sino calcular según conIva
              const precioAcordadoUnd = Number(cot.precio_final_acordado_und) || 0;
              const totClConIva = Number(cot.calc?.totClIvaFinal) || Number(cot.calc?.totClIva) || (Number(cot.calc?.totCl)||0)*1.19 || 0;
              const totClSinIva = Number(cot.calc?.totCl) || 0;
              const totalFinal = precioAcordadoUnd > 0 ? precioAcordadoUnd * u : (conIva ? totClConIva : totClSinIva);
              const precioFinalUnd = u > 0 ? totalFinal / u : 0;
              // Llegada esti.: aérea 25d, marítima 90d desde pago1 o solicitud
              const calcLlegada = () => {
                if (cot.fecha_llegada_real) return cot.fecha_llegada_real;
                const dias = isAereo ? 25 : 90;
                let base;
                if ((cot.checklist?.pago1_cliente || ["pagada","en_camino","en_bodega","completada"].includes(cot.estado)) && cot.fecha_pago1_cliente) {
                  base = cot.fecha_pago1_cliente;
                } else {
                  base = cot.fecha_solicitud || cot.fecha_respuesta_china;
                }
                if (!base) return cot.fecha_llegada_est || null;
                const d = new Date(base);
                d.setDate(d.getDate() + dias);
                return d.toISOString().split("T")[0];
              };
              const fechaLlegada = calcLlegada();
              const diasLlegada = fechaLlegada ? Math.ceil((new Date(fechaLlegada) - new Date()) / (1000*60*60*24)) : null;
              // Pagos: usar p1/p2 ya calculados (respetan pct_deposito del form). Si pago100, p1=total.
              const tienePago100 = !!cot.pago_100 || isAereo;
              const p1Calc = conIva ? (Number(cot.calc?.p1ClIva)||0) : (Number(cot.calc?.p1Cl)||0);
              const p2Calc = conIva ? (Number(cot.calc?.p2ClIva)||0) : (Number(cot.calc?.p2Cl)||0);
              const sumCalc = p1Calc + p2Calc;
              // Si hubo ajuste (precio acordado), reescalar p1/p2 proporcionalmente al nuevo total
              const factor = sumCalc > 0 && totalFinal > 0 ? totalFinal / sumCalc : 1;
              let p1 = tienePago100 ? totalFinal : p1Calc * factor;
              let p2 = tienePago100 ? 0 : p2Calc * factor;
              if (!tienePago100 && sumCalc === 0) { p1 = totalFinal*0.5; p2 = totalFinal*0.5; }
              // Desglose de componentes (estilo COT-001: Depósito + Comisión / Saldo + Servicio)
              const ivaMult = conIva ? 1.19 : 1;
              const pctDep = Number(cot.pct_deposito) || 30;
              const pctServ = Number(cot.pct_servicio) || 4;
              const pctCom = Number(cot.pct_com_prestamo) || 6.5;
              const depMonto = (Number(cot.calc?.dCl)||0) * ivaMult * factor;
              const comMonto = (Number(cot.calc?.comCl)||0) * ivaMult * factor;
              const cdaMonto = (Number(cot.calc?.cdaCl)||0) * ivaMult * factor;
              const saldoMonto = (Number(cot.calc?.prCl)||0) * ivaMult * factor;
              const servMonto = (Number(cot.calc?.serv)||0) * ivaMult * factor;
              const sufIva = conIva ? "c/IVA" : "sin IVA";
              const lblTotal = conIva ? "TOTAL CON IVA" : "TOTAL SIN IVA";
              return (
                <div ref={vistaClienteRef} className="opvc-wrap">
                  <div className="opvc-header" style={{background:"#f1f5f9",padding:"24px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"12px 12px 0 0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <img src={LOGO_DARK} alt="ZAGA IMP" style={{height:28,width:"auto",objectFit:"contain"}}/>
                      <div>
                        <div className="opvc-header-sub" style={{fontSize:11,color:"#64748b"}}>{isAereo?"Cotización Aérea":"Cotización Marítima"}</div>
                        <div style={{fontSize:14,color:"#c9a055",fontWeight:700}}>{cot.nro}</div>
                      </div>
                    </div>
                    <div className="opvc-header-r" style={{textAlign:"right"}}>
                      <div style={{fontSize:13,color:"#c9a055",fontWeight:700}}>{cot.cliente}</div>
                      <div className="opvc-header-date" style={{fontSize:11,color:"#64748b"}}>{todayStr()}</div>
                    </div>
                  </div>
                  <div style={{border:"2px solid #1a1a2e22",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden",background:"#fff"}}>
                    {/* Banner KPIs */}
                    <div className="opvc-banner" style={{padding:"18px 32px",background:"#040c18",color:"#fff",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
                      <div><div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Unidades</div><div className="opvc-kpi-val" style={{fontSize:18,fontWeight:800,color:"#fff"}}>{fmtN(u)}</div></div>
                      <div><div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Precio / und</div><div className="opvc-kpi-val" style={{fontSize:18,fontWeight:800,color:"#c9a055"}}>{fmt(precioFinalUnd)}</div></div>
                      <div><div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Total {sufIva}</div><div className="opvc-kpi-val" style={{fontSize:18,fontWeight:800,color:"#22c55e"}}>{fmt(totalFinal)}</div></div>
                      <div className="opvc-kpi-hide-mob">
                        <div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Transporte</div>
                        <div className="opvc-kpi-val" style={{fontSize:14,fontWeight:700,color:"#c47830"}}>{isAereo?"✈️ Aéreo":"🚢 Marítimo"}</div>
                        {diasLlegada!==null && <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{diasLlegada>0?`≈ ${diasLlegada} días`:diasLlegada===0?"≈ Hoy":"Atrasado"}</div>}
                      </div>
                    </div>

                    {/* Cuerpo */}
                    <div className="opvc-body" style={{padding:"20px 32px"}}>
                      <div className="opvc-section-ttl opvc-detalle-section-ttl" style={{fontSize:12,fontWeight:700,color:"#333",marginBottom:12}}>Detalle del producto</div>
                      <div className="opvc-cot" style={{borderRadius:10,border:"2px solid #1a1a2e22",marginBottom:10,overflow:"hidden"}}>
                        <div className="opvc-cot-hdr" style={{background:"#f8fafc",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e2e8f0"}}>
                          <div>
                            <span className="opvc-cot-hdr-prod" style={{fontWeight:700,fontSize:13,color:"#222"}}>{cot.producto}</span>
                            <span className="opvc-cot-hdr-nro" style={{fontSize:11,color:"#64748b",marginLeft:8}}>{cot.nro}</span>
                          </div>
                          <span className="opvc-cot-hdr-badge" style={{background:"#c47830",color:"#fff",borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700}}>{isAereo?"✈️ Aéreo":"🚢 Marítimo"}</span>
                        </div>
                        <div className="opvc-cot-grid" style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,background:"#fff"}}>
                          <div>
                            <div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Unidades</div>
                            <div className="opvc-cell-val" style={{fontSize:13,fontWeight:700,color:"#222"}}>{fmtN(u)}</div>
                            {cot.unidades_originales && Number(cot.unidades_originales) !== Number(cot.unidades) && (
                              <div style={{fontSize:9,color:"#c47830",fontStyle:"italic",marginTop:2}}>📦 ajustada (pediste {cot.unidades_originales})</div>
                            )}
                          </div>
                          <div><div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>$/und {sufIva}</div><div className="opvc-cell-val" style={{fontSize:13,fontWeight:700,color:"#222"}}>{fmt(precioFinalUnd)}</div></div>
                          <div><div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Total {sufIva}</div><div className="opvc-cell-val" style={{fontSize:13,fontWeight:800,color:"#1aa358"}}>{fmt(totalFinal)}</div></div>
                          <div><div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Llegada esti.</div><div className="opvc-cell-val" style={{fontSize:12,fontWeight:700,color:"#c47830",fontStyle:"italic"}}>≈ {fechaLlegada||"—"}</div></div>
                        </div>
                        {/* Versión móvil compacta */}
                        <div className="opvc-cot-mob" style={{display:"none"}}>
                          <div className="row1">
                            <div className="prod-wrap">
                              <span className="nro-chip">{cot.nro}</span>
                              <span className="prod">{cot.producto}</span>
                            </div>
                            <span className="tot">{fmt(totalFinal)}</span>
                          </div>
                          <div className="row2">
                            <span>{fmtN(u)} und × {fmt(precioFinalUnd)}</span>
                            <span className="llegada">≈ Llegada esti. {fechaLlegada||"—"}</span>
                          </div>
                          {cot.unidades_originales && Number(cot.unidades_originales) !== Number(cot.unidades) && (
                            <div style={{marginTop:4,padding:"4px 7px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:5,fontSize:10,color:"#92400e",fontStyle:"italic"}}>📦 Cantidad ajustada: {cot.unidades_originales} → <b>{u}</b> und (completar caja)</div>
                          )}
                        </div>
                      </div>

                      {/* Bloque pagos */}
                      <div className="opvc-pay" style={{background:"#040c18",borderRadius:12,padding:"18px 22px",color:"#fff",marginTop:14}}>
                        <div className="opvc-pay-ttl" style={{fontSize:10,color:"#c9a055",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:12}}>💰 Plan de pagos</div>
                        {tienePago100 ? (
                          <div className="opvc-pay-box" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0f1e30",borderRadius:8,padding:"12px 16px"}}>
                            <div><div className="opvc-pay-box-lbl" style={{fontSize:12,color:"#94a3b8"}}>💰 Pago único (100%)</div><div className="opvc-pay-box-sub" style={{fontSize:10,color:"#64748b",marginTop:2}}>Al confirmar</div></div>
                            <div className="opvc-pay-box-val" style={{fontSize:20,fontWeight:800,color:"#22c55e"}}>{fmt(p1)}</div>
                          </div>
                        ) : (
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                            <div className="opvc-pay-box" style={{background:"#0f1e30",borderRadius:8,padding:"12px 16px"}}>
                              <div className="opvc-pay-box-lbl" style={{fontSize:11,color:"#94a3b8"}}>1er pago</div>
                              <div className="opvc-pay-box-sub" style={{fontSize:9,color:"#64748b",marginTop:2,marginBottom:6}}>Al confirmar</div>
                              <div className="opvc-pay-box-val" style={{fontSize:18,fontWeight:800,color:"#22c55e",marginBottom:8}}>{fmt(p1)}</div>
                              <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.6,borderTop:"1px solid #1a2740",paddingTop:6}}>
                                <div style={{display:"flex",justifyContent:"space-between"}}><span>Depósito {pctDep}%</span><b style={{color:"#cbd5e1"}}>{fmt(depMonto)}</b></div>
                                {comMonto>0 && <div style={{display:"flex",justifyContent:"space-between"}}><span>Comisión préstamo</span><b style={{color:"#cbd5e1"}}>{fmt(comMonto)}</b></div>}
                                {cdaMonto>0 && <div style={{display:"flex",justifyContent:"space-between"}}><span>Gestión aduana</span><b style={{color:"#cbd5e1"}}>{fmt(cdaMonto)}</b></div>}
                              </div>
                            </div>
                            <div className="opvc-pay-box" style={{background:"#0f1e30",borderRadius:8,padding:"12px 16px"}}>
                              <div className="opvc-pay-box-lbl" style={{fontSize:11,color:"#94a3b8"}}>2do pago</div>
                              <div className="opvc-pay-box-sub" style={{fontSize:9,color:"#64748b",marginTop:2,marginBottom:6}}>Antes del despacho</div>
                              <div className="opvc-pay-box-val" style={{fontSize:18,fontWeight:800,color:"#fbbf24",marginBottom:8}}>{fmt(p2)}</div>
                              <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.6,borderTop:"1px solid #1a2740",paddingTop:6}}>
                                <div style={{display:"flex",justifyContent:"space-between"}}><span>Saldo {100-pctDep}%</span><b style={{color:"#cbd5e1"}}>{fmt(saldoMonto)}</b></div>
                                {servMonto>0 && <div style={{display:"flex",justifyContent:"space-between"}}><span>Servicio {pctServ}%</span><b style={{color:"#cbd5e1"}}>{fmt(servMonto)}</b></div>}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="opvc-pay-total" style={{marginTop:14,paddingTop:12,borderTop:"1px solid #1a2740",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:12,color:"#94a3b8"}}>{lblTotal}</span>
                          <span className="opvc-pay-total-val" style={{fontSize:22,fontWeight:800,color:"#c9a055"}}>{fmt(totalFinal)}</span>
                        </div>
                      </div>

                      {/* Mensaje cierre */}
                      <div className="opvc-msg" style={{marginTop:16,padding:"14px 18px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0",fontSize:12,color:"#475569",lineHeight:1.5}}>
                        <b style={{color:"#040c18"}}>Vigencia:</b> 7 días · <b style={{color:"#040c18"}}>Modalidad:</b> {isAereo?"Aérea":"Marítima"}{fechaLlegada && <> · <b style={{color:"#040c18"}}>Llegada esti.:</b> {fechaLlegada}</>}<br/>
                        <b style={{color:"#040c18"}}>Datos de pago:</b> coordinar con ZAGA al confirmar. <em>* Las fechas son estimadas y pueden variar según producción y aduana.</em>
                      </div>

                      <div className="opvc-footer" style={{marginTop:12,fontSize:10,color:"#64748b",textAlign:"center"}}>
                        ZAGA SpA · RUT 77874968-8 · Santiago, Chile · {todayStr()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
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
                    const imps=cotizaciones.filter(c=>c.cliente===clienteSeleccionado&&c.tipo!=="propia"&&c.estado!=="no_prospero");
                    const totP=imps.reduce((s,c)=>s+(c.calc?.totClIvaFinal||c.calc?.totClIva||(c.calc?.totCl||0)*1.19),0);
                    const totU=imps.reduce((s,c)=>s+(Number(c.unidades)||0),0);
                    const tot1=imps.reduce((s,c)=>s+(c.calc?.p1ClIva||(c.calc?.p1Cl||0)*1.19),0);
                    const tot2=imps.reduce((s,c)=>s+(c.calc?.p2ClIva||(c.calc?.p2Cl||0)*1.19),0);
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
                                {[["Unidades",fmtN(c.unidades)],["Solicitud",c.fecha_solicitud||"-"],["Llegada est.",c.fecha_llegada_est||"-"],["1er pago",fmt(c.calc?.p1ClIva||(c.calc?.p1Cl||0)*1.19)],["2do pago",fmt(c.calc?.p2ClIva||(c.calc?.p2Cl||0)*1.19)]].map(([l,v])=>(
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

            {/* ── VISTA CLIENTE — OP CONSOLIDADA (cotización formal por cliente) ── */}
            {printModal==="op_cliente"&&vistaOpId&&vistaOpCliente&&(()=>{
              const op = operaciones.find(o=>o.id===vistaOpId);
              if (!op) return null;
              const cotsOp = cotizaciones.filter(c => (op.cotizaciones||[]).includes(c.id));
              const vistaOpClienteT = (vistaOpCliente||"").trim();
              const cotsCliente = cotsOp.filter(c => (c.cliente||"").trim() === vistaOpClienteT && !["no_prospero"].includes(c.estado));
              if (cotsCliente.length === 0) return null;
              const aplicado = op.consolidado_aplicado_cliente === true;
              // Vista cliente:
              // - Si OP YA APLICADA: usar precios guardados (precio_final_acordado_und)
              //   = exactamente lo que el cliente ve en su portal.
              // - Si NO aplicada: preview con margenesPorCot del panel admin
              //   (cambios live sin guardar).
              const consolidados = cotsCliente.map(c => {
                const calcStandard = calcConsolidado(c, op, cotsOp);
                if (!aplicado) {
                  const margenPanel = margenesPorCot[c.id] ?? c.margen_objetivo_pct;
                  if (margenPanel != null && margenPanel > 0) {
                    const cz = calcCostoRealZaga(c, op, cotsOp);
                    const costoNeto = (cz.totalChinaCLP || 0) + (cz.totalChileCLP || 0) + (cz.ivaAgenteAer || 0);
                    const und = Number(c.unidades) || 0;
                    if (und > 0 && costoNeto > 0) {
                      const precioNetoUnd = (costoNeto / und) / (1 - margenPanel/100);
                      const totClNeto = precioNetoUnd * und;
                      const totClIvaOverride = totClNeto * 1.19;
                      return { cot:c, calc: { ...calcStandard, consolidado: { ...(calcStandard?.consolidado||{}), totCl: totClNeto, totClIva: totClIvaOverride, esPreviewPanel: true } } };
                    }
                  }
                }
                return { cot:c, calc: calcStandard };
              });
              const esPreviewPanel = consolidados.some(x => x.calc?.consolidado?.esPreviewPanel);
              const totConsolidadoIva = consolidados.reduce((s,x)=>s+(x.calc?.consolidado?.totClIva||0), 0);
              const totStandaloneIva = consolidados.reduce((s,x)=>s+(x.calc?.standalone?.totClIva||0), 0);
              const ahorroIva = totStandaloneIva - totConsolidadoIva;
              const totUnd = cotsCliente.reduce((s,c)=>s+(Number(c.unidades)||0), 0);
              // Pagos: aéreo SIEMPRE pago único (regla negocio).
              // Marítimo: 50/50 a menos que la cot tenga pago_100 explícito.
              const tienePago100 = cotsCliente.every(c => c.transporte === "aereo" || c.pago_100);
              const p1 = tienePago100 ? totConsolidadoIva : totConsolidadoIva / 2;
              const p2 = tienePago100 ? 0 : totConsolidadoIva / 2;
              // Llegada estimada aérea = base + 25 días
              // Base = fecha pago cliente si ya pagó (más preciso, ya corren los 25d reales),
              // sino fecha solicitud (estimado teórico antes de pago)
              const calcLlegadaEst = (cot) => {
                if (cot.fecha_llegada_real) return cot.fecha_llegada_real; // ya llegó
                let base;
                if ((cot.checklist?.pago1_cliente || cot.estado === "pagada" || cot.estado === "en_camino" || cot.estado === "en_bodega" || cot.estado === "completada") && cot.fecha_pago1_cliente) {
                  base = cot.fecha_pago1_cliente;
                } else {
                  base = cot.fecha_solicitud || cot.fecha_respuesta_china;
                }
                if (!base) return null;
                const d = new Date(base);
                d.setDate(d.getDate() + 25);
                return d.toISOString().split("T")[0];
              };
              const fechasLlegada = cotsCliente.map(calcLlegadaEst).filter(Boolean);
              const fechaLlegadaMax = fechasLlegada.length > 0 ? fechasLlegada.sort().slice(-1)[0] : null;
              const diasLlegada = fechaLlegadaMax ? Math.ceil((new Date(fechaLlegadaMax)-new Date())/(1000*60*60*24)) : null;
              return (
                <div ref={vistaClienteRef} className="opvc-wrap">
                  <div className="opvc-header" style={{background:"#f1f5f9",padding:"24px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"12px 12px 0 0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <img src={LOGO_DARK} alt="ZAGA IMP" style={{height:28,width:"auto",objectFit:"contain"}}/>
                      <div>
                        <div className="opvc-header-sub" style={{fontSize:11,color:"#64748b"}}>Cotización Consolidada Aérea</div>
                        <div style={{fontSize:14,color:"#c9a055",fontWeight:700}}>{op.nro}</div>
                      </div>
                    </div>
                    <div className="opvc-header-r" style={{textAlign:"right"}}>
                      <div style={{fontSize:13,color:"#c9a055",fontWeight:700}}>{vistaOpCliente}</div>
                      <div className="opvc-header-date" style={{fontSize:11,color:"#64748b"}}>{todayStr()}</div>
                    </div>
                  </div>
                  <div style={{border:"2px solid #1a1a2e22",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden",background:"#fff"}}>
                    {/* Banner con resumen + ahorro si aplica */}
                    <div className="opvc-banner" style={{padding:"18px 32px",background:"#040c18",color:"#fff",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
                      <div><div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Productos</div><div className="opvc-kpi-val" style={{fontSize:18,fontWeight:800,color:"#c9a055"}}>{cotsCliente.length}</div></div>
                      <div><div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Unidades</div><div className="opvc-kpi-val" style={{fontSize:18,fontWeight:800,color:"#fff"}}>{fmtN(totUnd)}</div></div>
                      <div><div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Total c/IVA</div><div className="opvc-kpi-val" style={{fontSize:18,fontWeight:800,color:"#22c55e"}}>{fmt(totConsolidadoIva)}</div></div>
                      <div className="opvc-kpi-hide-mob">
                        <div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Transporte</div>
                        <div className="opvc-kpi-val" style={{fontSize:14,fontWeight:700,color:"#c47830"}}>✈️ Aéreo</div>
                        {diasLlegada!==null && <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{diasLlegada>0?`≈ ${diasLlegada} días`:diasLlegada===0?"≈ Hoy":"Atrasado"}</div>}
                      </div>
                    </div>

                    {ahorroIva > 0 && (
                      <div className="opvc-alert" style={{padding:"12px 32px",background:"#f0fdf4",borderBottom:"1px solid #bbf7d0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontSize:12,color:"#15803d",fontWeight:700}}>💎 Ahorro por consolidar c/IVA</div>
                        <div style={{fontSize:16,color:"#15803d",fontWeight:800}}>{fmt(ahorroIva)}</div>
                      </div>
                    )}

                    {!aplicado && (
                      <div className="opvc-alert no-print" style={{padding:"10px 32px",background:"#fff7ed",borderBottom:"1px solid #fed7aa",fontSize:11,color:"#92400e",fontStyle:"italic"}}>
                        ⚠️ Esta cotización aún NO ha sido aplicada al cliente (el cliente no la ve en su portal). Para que la vea, presiona "✅ Aplicar consolidado al cliente" en el panel admin.
                      </div>
                    )}
                    {esPreviewPanel && !aplicado && (
                      <div className="opvc-alert no-print" style={{padding:"10px 32px",background:"#ecfeff",borderBottom:"1px solid #a5f3fc",fontSize:11,color:"#0e7490",fontStyle:"italic"}}>
                        👁 <b>Preview con % util del panel admin</b> — los precios que ves se calculan en vivo con los porcentajes que estás editando arriba. Nada está guardado en las cotizaciones aún.
                      </div>
                    )}

                    {/* Detalle productos */}
                    <div className="opvc-body" style={{padding:"20px 32px"}}>
                      <div className="opvc-section-ttl opvc-detalle-section-ttl" style={{fontSize:12,fontWeight:700,color:"#333",marginBottom:12}}>Detalle de productos</div>
                      {consolidados.map(({cot,calc})=>{
                        const totIva = calc?.consolidado?.totClIva || 0;
                        const pUnd = totIva / (Number(cot.unidades)||1);
                        return (
                          <div key={cot.id} className="opvc-cot" style={{borderRadius:10,border:"2px solid #1a1a2e22",marginBottom:10,overflow:"hidden"}}>
                            <div className="opvc-cot-hdr" style={{background:"#f8fafc",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e2e8f0"}}>
                              <div>
                                <span className="opvc-cot-hdr-prod" style={{fontWeight:700,fontSize:13,color:"#222"}}>{cot.producto}</span>
                                <span className="opvc-cot-hdr-nro" style={{fontSize:11,color:"#64748b",marginLeft:8}}>{cot.nro}</span>
                              </div>
                              <span className="opvc-cot-hdr-badge" style={{background:"#c47830",color:"#fff",borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700}}>✈️ Aéreo</span>
                            </div>
                            <div className="opvc-cot-grid" style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,background:"#fff"}}>
                              <div>
                                <div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Unidades</div>
                                <div className="opvc-cell-val" style={{fontSize:13,fontWeight:700,color:"#222"}}>{fmtN(cot.unidades)}</div>
                                {cot.unidades_originales && Number(cot.unidades_originales) !== Number(cot.unidades) && (
                                  <div style={{fontSize:9,color:"#c47830",fontStyle:"italic",marginTop:2}}>📦 ajustada (pediste {cot.unidades_originales})</div>
                                )}
                              </div>
                              <div><div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>$/und c/IVA</div><div className="opvc-cell-val" style={{fontSize:13,fontWeight:700,color:"#222"}}>{fmt(pUnd)}</div></div>
                              <div><div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Total c/IVA</div><div className="opvc-cell-val" style={{fontSize:13,fontWeight:800,color:"#1aa358"}}>{fmt(totIva)}</div></div>
                              <div><div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Llegada esti.</div><div className="opvc-cell-val" style={{fontSize:12,fontWeight:700,color:"#c47830",fontStyle:"italic"}}>≈ {calcLlegadaEst(cot)||"—"}</div></div>
                            </div>
                            {/* Versión compacta móvil (display:none desktop, block en mobile via @media) */}
                            <div className="opvc-cot-mob" style={{display:"none"}}>
                              <div className="row1">
                                <div className="prod-wrap">
                                  <span className="nro-chip">{cot.nro}</span>
                                  <span className="prod">{cot.producto}</span>
                                </div>
                                <span className="tot">{fmt(totIva)}</span>
                              </div>
                              <div className="row2">
                                <span>{fmtN(cot.unidades)} und × {fmt(pUnd)}</span>
                                <span className="llegada">≈ Llegada esti. {calcLlegadaEst(cot)||"—"}</span>
                              </div>
                              {cot.unidades_originales && Number(cot.unidades_originales) !== Number(cot.unidades) && (
                                <div style={{marginTop:4,padding:"4px 7px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:5,fontSize:10,color:"#92400e",fontStyle:"italic"}}>
                                  📦 Cantidad ajustada: {cot.unidades_originales} → <b>{cot.unidades}</b> und (completar caja)
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Bloque pagos */}
                      <div className="opvc-pay" style={{background:"#040c18",borderRadius:12,padding:"18px 22px",color:"#fff",marginTop:14}}>
                        <div className="opvc-pay-ttl" style={{fontSize:10,color:"#c9a055",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:12}}>💰 Plan de pagos</div>
                        {tienePago100 ? (
                          <div className="opvc-pay-box" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0f1e30",borderRadius:8,padding:"12px 16px"}}>
                            <div><div className="opvc-pay-box-lbl" style={{fontSize:12,color:"#94a3b8"}}>💰 Pago único (100%)</div><div style={{fontSize:10,color:"#64748b",marginTop:2}}>Al confirmar</div></div>
                            <div className="opvc-pay-box-val" style={{fontSize:20,fontWeight:800,color:"#22c55e"}}>{fmt(p1)}</div>
                          </div>
                        ) : (
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                            <div className="opvc-pay-box" style={{background:"#0f1e30",borderRadius:8,padding:"12px 16px"}}>
                              <div className="opvc-pay-box-lbl" style={{fontSize:11,color:"#94a3b8"}}>1er pago (50%)</div>
                              <div style={{fontSize:9,color:"#64748b",marginTop:2,marginBottom:4}}>Al confirmar</div>
                              <div className="opvc-pay-box-val" style={{fontSize:18,fontWeight:800,color:"#22c55e"}}>{fmt(p1)}</div>
                            </div>
                            <div className="opvc-pay-box" style={{background:"#0f1e30",borderRadius:8,padding:"12px 16px"}}>
                              <div className="opvc-pay-box-lbl" style={{fontSize:11,color:"#94a3b8"}}>2do pago (50%)</div>
                              <div style={{fontSize:9,color:"#64748b",marginTop:2,marginBottom:4}}>Antes del despacho</div>
                              <div className="opvc-pay-box-val" style={{fontSize:18,fontWeight:800,color:"#fbbf24"}}>{fmt(p2)}</div>
                            </div>
                          </div>
                        )}
                        <div className="opvc-pay-total" style={{marginTop:14,paddingTop:12,borderTop:"1px solid #1a2740",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:12,color:"#94a3b8"}}>TOTAL CON IVA</span>
                          <span className="opvc-pay-total-val" style={{fontSize:22,fontWeight:800,color:"#c9a055"}}>{fmt(totConsolidadoIva)}</span>
                        </div>
                      </div>

                      {/* Mensaje cierre + datos */}
                      <div className="opvc-msg" style={{marginTop:16,padding:"14px 18px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0",fontSize:12,color:"#475569",lineHeight:1.5}}>
                        <b style={{color:"#040c18"}}>Vigencia:</b> 7 días · <b style={{color:"#040c18"}}>Modalidad:</b> Aérea consolidada{fechaLlegadaMax && <> · <b style={{color:"#040c18"}}>Llegada esti.:</b> {fechaLlegadaMax}</>}<br/>
                        <b style={{color:"#040c18"}}>Datos de pago:</b> coordinar con ZAGA al confirmar. <em>* Las fechas son estimadas y pueden variar según producción y aduana.</em>
                      </div>

                      <div className="opvc-footer" style={{marginTop:12,fontSize:10,color:"#64748b",textAlign:"center"}}>
                        ZAGA SpA · RUT 77874968-8 · Santiago, Chile · {todayStr()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL VISTA VALIDAR — cotización aérea con desglose costos + precio sugerido */}
      {vistaValidarId && (()=>{
        const c = cotizaciones.find(x => x.id === vistaValidarId);
        if (!c) return null;
        const u = Number(c.unidades) || 0;
        const opVinc = c.operacion_id ? operaciones.find(o => o.id === c.operacion_id) : null;
        const cotsOpVinc = opVinc ? cotizaciones.filter(x => (opVinc.cotizaciones||[]).includes(x.id)) : [];
        // TCs editables (en validarForm o fallback al OP/cot/default)
        const TC_RMB_USD = Number(validarForm.tc_rmb_usd ?? opVinc?.tc_rmb_usd ?? c.tc_rmb_usd) || 7.03;
        const tc = Number(validarForm.tc_usd_clp ?? opVinc?.tc_usd_clp ?? opVinc?.pago?.tc_efectivo ?? c.tc_usd_clp ?? c?.pago?.tc_efectivo) || 950;

        // ─── Lado China (desde Sunny) ──────────────────────────────────────
        const precioRmb = Number(c.precio_china_rmb) || 0;
        const valorMercanciaRMB = precioRmb * u;
        const undCaja = Number(c.dim_und_caja) || 0;
        const esCaja = c.dim_tipo === "caja";
        const nCajas = esCaja && undCaja > 0 ? Math.ceil(u/undCaja) : 0;
        const pesoCaja = Number(c.peso_kg) || 0;
        const pesoTotal = esCaja && undCaja > 0 ? pesoCaja * nCajas : pesoCaja * u;
        const tarifaRmbKg = Number(opVinc?.flete_rmb_kg_consolidado ?? c.aer_tarifa_sunny_rmb_kg) || 0;
        const fleteRMB = pesoTotal * tarifaRmbKg;
        const _t = (k) => Number(opVinc?.[k] ?? c[k]) || 0;
        // Para costos fijos en RMB: 0 en OP = "no seteado" → tomar el mayor.
        const _tMax = (k) => Math.max(Number(opVinc?.[k]) || 0, Number(c?.[k]) || 0);
        const comisionPct = _t("comision_sunny_pct");
        const seguroPct = _t("seguro_pct");
        const seguroMin = _t("seguro_min_rmb");
        const certOrigen = _tMax("cost_cert_origen_rmb");
        const docOp = _tMax("cost_doc_operacion_rmb");
        const despacho = _tMax("cost_despacho_aduanero_rmb");
        const compraDocs = _tMax("cost_compra_docs_rmb");
        const transporteCn = _tMax("cost_transporte_interno_cn_rmb");
        const comisionRMB = valorMercanciaRMB * comisionPct / 100;
        const seguroRMB = Math.max(seguroMin, valorMercanciaRMB * seguroPct);
        const otrosRMB = certOrigen + docOp + despacho + compraDocs + transporteCn + seguroRMB;
        const totalChinaRMB = valorMercanciaRMB + comisionRMB + fleteRMB + otrosRMB;
        const totalChinaCLP = (totalChinaRMB / TC_RMB_USD) * tc;

        // Si está en OP, prorratear aduana por share equitativo (igual lógica que calcCostoRealZaga)
        let shareAduana = 1;
        if (opVinc && cotsOpVinc.length > 1) {
          const todasTienenPeso = cotsOpVinc.every(x => Number(x.peso_kg) > 0);
          if (!todasTienenPeso) {
            shareAduana = 1 / cotsOpVinc.length;
          } else {
            const totalPesoOp = cotsOpVinc.reduce((s,x) => {
              const p = Number(x.peso_kg) || 0;
              const uc = Number(x.unidades) || 0;
              const udC = Number(x.dim_und_caja) || 0;
              const esC = x.dim_tipo === "caja";
              return s + (esC && udC > 0 ? p * Math.ceil(uc/udC) : p * uc);
            }, 0);
            shareAduana = totalPesoOp > 0 ? pesoTotal / totalPesoOp : 1/cotsOpVinc.length;
          }
        }

        // ─── Lado Chile (editable por admin en validarForm) ────────────────
        const honorarios = Number(validarForm.aer_honorarios) || 0;
        const edi = Number(validarForm.aer_edi) || 0;
        const despChile = Number(validarForm.aer_despacho) || 0;
        const aeropuerto = Number(validarForm.aer_aeropuerto) || 0;
        const aforoMonto = validarForm.incluir_aforo ? (Number(validarForm.aer_aforo) || 0) : 0;
        const transpInterno = Number(validarForm.transp_interno_cl) || 0;
        const agencia = Number(validarForm.agencia) || 0;
        const formF = c.form_f_incluido !== false;
        const arancelPct = formF ? 0 : 0.06;
        const cifReal = (totalChinaCLP); // costo China en CLP es la base CIF
        const arancelReal = cifReal * arancelPct;
        const aduanaFijaCompleta = honorarios + edi + despChile + aeropuerto + aforoMonto + arancelReal;
        const aduanaFijaProrra = aduanaFijaCompleta * shareAduana;
        const totalChileCLP = aduanaFijaProrra + transpInterno + agencia;

        // ─── Costo ZAGA + precio sugerido ──────────────────────────────────
        const costoZAGA = totalChinaCLP + totalChileCLP;
        const costoZAGAUnd = u > 0 ? costoZAGA / u : 0;
        const margenPct = Number(validarForm.margen_obj_pct) || 25;
        const precioSugUnd = costoZAGAUnd / (1 - margenPct/100);
        const precioSugUndIva = precioSugUnd * 1.19;
        const precioAcordado = Number(validarForm.precio_acordado_und) || 0;
        const precioFinalUnd = precioAcordado > 0 ? precioAcordado : precioSugUndIva;
        const precioFinalNetoUnd = precioFinalUnd / 1.19;
        const totalClienteIva = precioFinalUnd * u;
        const gananciaReal = (precioFinalNetoUnd - costoZAGAUnd) * u;
        const margenReal = precioFinalNetoUnd > 0 ? ((precioFinalNetoUnd - costoZAGAUnd) / precioFinalNetoUnd) * 100 : 0;

        const cerrar = () => { setVistaValidarId(null); setValidarForm({}); };
        const guardar = async () => {
          // Persistir TC en la OP (si existe) o en la cot (si va sola)
          if (opVinc) {
            const newOp = {...opVinc, tc_rmb_usd: TC_RMB_USD, tc_usd_clp: tc};
            delete newOp.id; delete newOp._id; delete newOp._created; delete newOp._updated;
            await supabase.from("operaciones").update({datos: newOp, updated_at: new Date().toISOString()}).eq("id", opVinc.id);
            setOperaciones(prev => prev.map(o => o.id === opVinc.id ? {...newOp, id: opVinc.id} : o));
          }
          await persist(cotizaciones.map(x => {
            if (x.id !== c.id) return x;
            return {
              ...x,
              aer_honorarios: honorarios,
              aer_edi: edi,
              aer_despacho: despChile,
              aer_aeropuerto: aeropuerto,
              aer_aforo: Number(validarForm.aer_aforo) || 0,
              incluir_aforo: validarForm.incluir_aforo !== false,
              transp_interno_cl: transpInterno,
              agencia,
              margen_obj_pct: margenPct,
              precio_final_acordado_und: precioAcordado > 0 ? precioAcordado : precioSugUndIva,
              tc_rmb_usd: TC_RMB_USD,
              tc_usd_clp: tc,
            };
          }));
          showToast(`✓ ${c.nro || "cot"} validada · Precio acordado: ${fmt(precioFinalUnd)}/und · TC RMB ${TC_RMB_USD} / USD ${tc}. Estado NO cambió.`);
          cerrar();
        };

        return (
          <div style={{position:"fixed",inset:0,background:"#000c",zIndex:1200,overflowY:"auto",padding:"20px 16px"}} onClick={e=>e.target===e.currentTarget&&cerrar()}>
            <div style={{maxWidth:980,margin:"0 auto",background:"#fff",borderRadius:14,overflow:"hidden",border:"1px solid #e2e8f0"}}>
              {/* Header */}
              <div style={{background:"#040c18",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",fontWeight:700,marginBottom:2}}>🛬 Validar cotización aérea</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>{c.nro || "—"} · {c.producto || ""}</div>
                  <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>👤 {c.cliente} · {fmtN(u)} und · {opVinc?<span style={{color:"#c47830"}}>en {opVinc.nro} (share aduana {fmtP(shareAduana*100)})</span>:"cot individual"}</div>
                </div>
                <button onClick={cerrar} style={{background:"#1a2740",color:"#94a3b8",border:"1px solid #2d4163",borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer"}}>✕ Cerrar</button>
              </div>

              {/* TIPO DE CAMBIO — editable por OP, en barra superior (no rompe el grid 2-col) */}
              <div style={{margin:"12px 24px 0",padding:"8px 14px",background:"#fefce8",border:"1px solid #fde047",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{fontSize:11,color:"#a16207",fontWeight:700}}>💱 Tipo de cambio para esta {opVinc?"OP":"cotización"}</div>
                <div style={{display:"flex",gap:14,alignItems:"center"}}>
                  <label style={{fontSize:11,color:"#475569",display:"flex",alignItems:"center",gap:5}}>
                    RMB → USD:
                    <input type="number" step="0.01" value={validarForm.tc_rmb_usd||7.03} onChange={e=>setValidarForm(p=>({...p,tc_rmb_usd:e.target.value}))} style={{width:70,padding:"3px 6px",border:"1px solid #facc15",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"inherit",background:"#fff"}}/>
                  </label>
                  <label style={{fontSize:11,color:"#475569",display:"flex",alignItems:"center",gap:5}}>
                    USD → CLP:
                    <input type="number" step="1" value={validarForm.tc_usd_clp||950} onChange={e=>setValidarForm(p=>({...p,tc_usd_clp:e.target.value}))} style={{width:70,padding:"3px 6px",border:"1px solid #facc15",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"inherit",background:"#fff"}}/>
                  </label>
                </div>
              </div>

              <div style={{padding:"16px 24px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {/* SECCIÓN 1 — 🇨🇳 Datos confirmados por Sunny (read-only) */}
                <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10,padding:14}}>
                  <div style={{fontSize:11,color:"#92400e",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>🇨🇳 1. Datos confirmados por Sunny (read-only)</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",rowGap:5,columnGap:10,fontSize:12,color:"#475569"}}>
                    {c.material_china && <><span>🧪 Material:</span><b style={{color:"#0f172a",textAlign:"right"}}>{c.material_china}</b></>}
                    <span>FOB Exw / und:</span><b style={{color:"#0f172a",textAlign:"right"}}>¥{precioRmb}</b>
                    <span>Mercancía total ({u} und):</span><b style={{color:"#0f172a",textAlign:"right"}}>{fmtRMB(valorMercanciaRMB)}</b>
                    <span>Comisión Sunny ({comisionPct}%):</span><b style={{color:"#0f172a",textAlign:"right"}}>{fmtRMB(comisionRMB)}</b>
                    <span>Peso/caja × cajas ({pesoCaja}×{nCajas||"?"}):</span><b style={{color:"#0f172a",textAlign:"right"}}>{fmtN(pesoTotal,1)} kg</b>
                    <span>CBM/caja × cajas:</span><b style={{color:"#0f172a",textAlign:"right"}}>{fmtN(Number(c.dim_m3)||0,4)} × {nCajas} = {fmtN((Number(c.dim_m3)||0)*nCajas,3)} m³</b>
                    <span>Flete RMB/kg:</span><b style={{color:"#0f172a",textAlign:"right"}}>¥{fmtN(tarifaRmbKg,2)}</b>
                    <span>Flete total ({fmtN(pesoTotal,1)}×{fmtN(tarifaRmbKg,2)}):</span><b style={{color:"#0f172a",textAlign:"right"}}>{fmtRMB(fleteRMB)}</b>
                    <span>+ Cert origen ({certOrigen}):</span><b style={{color:"#0f172a",textAlign:"right"}}>¥{certOrigen}</b>
                    <span>+ Doc op / despacho / compra:</span><b style={{color:"#0f172a",textAlign:"right"}}>¥{docOp+despacho+compraDocs}</b>
                    <span>+ Transporte CN:</span><b style={{color:"#0f172a",textAlign:"right"}}>{fmtRMB(transporteCn)}</b>
                    <span>+ Seguro:</span><b style={{color:"#0f172a",textAlign:"right"}}>{fmtRMB(seguroRMB)}</b>
                  </div>
                  <div style={{marginTop:8,padding:"6px 9px",background:"#fefce8",border:"1px dashed #fde047",borderRadius:6,fontSize:10.5,color:"#78350f",lineHeight:1.5}}>
                    <b>Regla seguro:</b> 150 RMB únicos por consolidado si total mercancía ≤ ¥75.000 · si supera, 0,2% sobre el total.
                    {valorMercanciaRMB > 75000
                      ? <span style={{color:"#c47830",fontWeight:600}}> ▸ Aplica 0,2%</span>
                      : <span style={{color:"#16a34a",fontWeight:600}}> ▸ Aplica mínimo</span>}
                  </div>
                  <div style={{borderTop:"2px solid #c47830",marginTop:10,paddingTop:8,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:800}}>
                    <span style={{color:"#854d0e"}}>Total China:</span>
                    <span style={{color:"#c47830"}}>{fmtRMB(totalChinaRMB)} ≈ {fmt(totalChinaCLP)}</span>
                  </div>
                </div>

                {/* SECCIÓN 2 — 🇨🇱 Costos Chile (editable) */}
                <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:14}}>
                  <div style={{fontSize:11,color:"#1e40af",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>🇨🇱 2. Costos Chile (editable)</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",rowGap:6,columnGap:10,fontSize:12,color:"#475569",alignItems:"center"}}>
                    <label>Honorarios agente:</label>
                    <input type="number" value={validarForm.aer_honorarios||0} onChange={e=>setValidarForm(p=>({...p,aer_honorarios:e.target.value}))} style={{width:120,padding:"5px 8px",border:"1px solid #cbd5e1",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"inherit"}}/>
                    <label>EDI:</label>
                    <input type="number" value={validarForm.aer_edi||0} onChange={e=>setValidarForm(p=>({...p,aer_edi:e.target.value}))} style={{width:120,padding:"5px 8px",border:"1px solid #cbd5e1",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"inherit"}}/>
                    <label>Despacho aduanero:</label>
                    <input type="number" value={validarForm.aer_despacho||0} onChange={e=>setValidarForm(p=>({...p,aer_despacho:e.target.value}))} style={{width:120,padding:"5px 8px",border:"1px solid #cbd5e1",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"inherit"}}/>
                    <label>Cargos aeropuerto:</label>
                    <input type="number" value={validarForm.aer_aeropuerto||0} onChange={e=>setValidarForm(p=>({...p,aer_aeropuerto:e.target.value}))} style={{width:120,padding:"5px 8px",border:"1px solid #cbd5e1",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"inherit"}}/>
                    <label style={{display:"flex",alignItems:"center",gap:6}}><input type="checkbox" checked={validarForm.incluir_aforo!==false} onChange={e=>setValidarForm(p=>({...p,incluir_aforo:e.target.checked}))}/>Aforo:</label>
                    <input type="number" value={validarForm.aer_aforo||0} onChange={e=>setValidarForm(p=>({...p,aer_aforo:e.target.value}))} disabled={validarForm.incluir_aforo===false} style={{width:120,padding:"5px 8px",border:"1px solid #cbd5e1",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"inherit",opacity:validarForm.incluir_aforo===false?0.5:1}}/>
                    <label>Arancel {formF?"0% (Form F)":"6%"}:</label>
                    <b style={{textAlign:"right",color:"#0f172a"}}>{fmt(arancelReal)}</b>
                    <label>Transporte interno CL:</label>
                    <input type="number" value={validarForm.transp_interno_cl||0} onChange={e=>setValidarForm(p=>({...p,transp_interno_cl:e.target.value}))} style={{width:120,padding:"5px 8px",border:"1px solid #cbd5e1",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"inherit"}}/>
                    <label>Agencia / extras:</label>
                    <input type="number" value={validarForm.agencia||0} onChange={e=>setValidarForm(p=>({...p,agencia:e.target.value}))} style={{width:120,padding:"5px 8px",border:"1px solid #cbd5e1",borderRadius:5,fontSize:12,textAlign:"right",fontFamily:"inherit"}}/>
                  </div>
                  {opVinc && shareAduana < 1 && (
                    <div style={{marginTop:8,fontSize:10,color:"#1e40af",fontStyle:"italic",lineHeight:1.4}}>📐 Aduana fija + arancel prorrateados por share {fmtP(shareAduana*100)} (1 envío consolidado).</div>
                  )}
                  <div style={{borderTop:"2px solid #2d78c8",marginTop:10,paddingTop:8,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:800}}>
                    <span style={{color:"#1e40af"}}>Total Chile:</span>
                    <span style={{color:"#2d78c8"}}>{fmt(totalChileCLP)}</span>
                  </div>
                </div>

                {/* SECCIÓN 3 — 💰 Cálculo final */}
                <div style={{gridColumn:"1 / -1",background:"#040c18",borderRadius:10,padding:16,color:"#fff"}}>
                  <div style={{fontSize:11,color:"#c9a055",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>💰 3. Cálculo final</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
                    <div style={{background:"#0f1e30",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Costo China / und</div>
                      <div style={{fontSize:18,fontWeight:800,color:"#c47830"}}>{fmt(totalChinaCLP/u)}</div>
                    </div>
                    <div style={{background:"#0f1e30",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Costo Chile / und</div>
                      <div style={{fontSize:18,fontWeight:800,color:"#2d78c8"}}>{fmt(totalChileCLP/u)}</div>
                    </div>
                    <div style={{background:"#1a2740",borderRadius:8,padding:"10px 12px",border:"1px solid #c9a05544"}}>
                      <div style={{fontSize:9,color:"#c9a055",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>💼 Costo ZAGA / und</div>
                      <div style={{fontSize:20,fontWeight:800,color:"#c9a055"}}>{fmt(costoZAGAUnd)}</div>
                    </div>
                    <div style={{background:"#0f1e30",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3,display:"flex",justifyContent:"space-between"}}>
                        <span>🎯 Precio sugerido c/IVA</span>
                        <input type="number" step="1" value={validarForm.margen_obj_pct||25} onChange={e=>setValidarForm(p=>({...p,margen_obj_pct:e.target.value}))} style={{width:50,padding:"1px 4px",border:"1px solid #1a2740",borderRadius:3,fontSize:9,textAlign:"right",background:"#1a2740",color:"#94a3b8"}}/>
                      </div>
                      <div style={{fontSize:20,fontWeight:800,color:"#22c55e"}}>{fmt(precioSugUndIva)}</div>
                      <div style={{fontSize:9,color:"#94a3b8",marginTop:2}}>Neto: {fmt(precioSugUnd)}</div>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 4 — 🎯 Aplicar precio */}
                <div style={{gridColumn:"1 / -1",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:16}}>
                  <div style={{fontSize:11,color:"#15803d",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>🎯 4. Precio final acordado</div>
                  <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:240}}>
                      <label style={{fontSize:11,color:"#475569",fontWeight:600,display:"block",marginBottom:4}}>Precio final por unidad (c/IVA) — editable</label>
                      <input type="number" step="1" value={validarForm.precio_acordado_und||""} onChange={e=>setValidarForm(p=>({...p,precio_acordado_und:e.target.value}))} placeholder={`Sugerido: ${fmt(precioSugUndIva)}`} style={{width:"100%",padding:"10px 14px",border:"1px solid #bbf7d0",borderRadius:8,fontSize:18,fontWeight:700,color:"#15803d",fontFamily:"inherit",background:"#fff",outline:"none"}}/>
                      <div style={{fontSize:10,color:"#15803d",marginTop:4,fontStyle:"italic"}}>Si dejás vacío, se usa el sugerido ({fmt(precioSugUndIva)} = costo + 25% margen).</div>
                    </div>
                    <div style={{flex:1,minWidth:240,background:"#fff",borderRadius:8,padding:"10px 14px",border:"1px solid #bbf7d0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#475569",marginBottom:4}}>
                        <span>Total cliente c/IVA ({u} und):</span>
                        <b style={{color:"#15803d",fontSize:15}}>{fmt(totalClienteIva)}</b>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#475569"}}>
                        <span>Ganancia real / margen:</span>
                        <b style={{color:gananciaReal>=0?"#15803d":"#c0392b",fontSize:13}}>{fmt(gananciaReal)} · {fmtP(margenReal)}</b>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:14,justifyContent:"flex-end"}}>
                    <button onClick={cerrar} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 18px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
                    <button onClick={guardar} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",fontSize:14,fontWeight:800,cursor:"pointer",boxShadow:"0 2px 6px rgba(22,163,74,0.3)"}}>💾 Guardar precio acordado</button>
                  </div>
                  <div style={{marginTop:8,fontSize:10,color:"#475569",fontStyle:"italic",textAlign:"right"}}>El estado NO cambia. Tú decides cuándo pasar la cot a "Cotizada" para que el cliente la vea.</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                        {(p.pago_100?[["💰 Pago Único",fmt(p.calc.p1Cl),p.checklist?.pago1_cliente],["Total",fmt(p.calc.totCl),null]]:[["1er Pago",fmt(p.calc.p1Cl),p.checklist?.pago1_cliente],["2do Pago",fmt(p.calc.p2Cl),p.checklist?.pago2_cliente],["Total",fmt(p.calc.totCl),null]]).map(([l,v,chk])=>(
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
                      {p.pago_100 ? (
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:7,padding:"8px 12px"}}>
                          <span style={{fontSize:12,color:"#64748b"}}>💰 Pago Único</span>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:10,color:p.checklist?.pago_china?"#2d78c8":"#555"}}>{p.checklist?.pago_china?"✓ Pagado":"⏳ Pendiente"}</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmt(p.calc?.p1Ch)}</span>
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                      {/* Total */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:7,padding:"8px 12px"}}>
                        <span style={{fontSize:12,color:"#64748b"}}>Total</span>
                        <span style={{fontSize:13,fontWeight:700,color:"#2d78c8"}}>{fmt(p.calc?.totCh||p.calc?.tCh)}</span>
                      </div>
                    </div>
                  </div>
                  {!isPropia&&(()=>{
                    // Si la cot pertenece a una OP consolidada, calcular ganancia con
                    // calcCostoRealZaga (respeta el reparto consolidado de aduana y extras).
                    // Sino, usar calcCliente standalone.
                    const opVincP = p.operacion_id ? operaciones.find(o => o.id === p.operacion_id) : null;
                    let ganImpC, gan1C, gan2C, margenC, markupC;
                    let esConsolidado = false;
                    if (opVincP) {
                      const cotsOpVincP = cotizaciones.filter(x => (opVincP.cotizaciones||[]).includes(x.id));
                      try {
                        const cz = calcCostoRealZaga(p, opVincP, cotsOpVincP);
                        ganImpC = cz.ganRealNeto || 0;
                        if (p.transporte === "aereo") { gan1C = ganImpC; gan2C = 0; }
                        else { gan1C = ganImpC * 0.3; gan2C = ganImpC * 0.7; }
                        margenC = cz.margenRealPct || 0;
                        markupC = (cz.costoZAGAReal||0) > 0 ? (((cz.precioClienteNeto||0) - (cz.costoZAGAReal||0)) / cz.costoZAGAReal) * 100 : 0;
                        esConsolidado = true;
                      } catch(_){}
                    }
                    if (!esConsolidado) {
                      const _c = p.calc || calcCliente(p);
                      if(!_c) return null;
                      ganImpC = _c.ganImp; gan1C = _c.gan1; gan2C = _c.gan2;
                      margenC = _c.roi; markupC = _c.markup;
                    }
                    return (
                    <div>
                      <div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:10}}>
                        ⭐ Ganancias {esConsolidado && <span style={{color:"#c9a055",fontWeight:600,fontSize:9,marginLeft:6}}>(consolidado · {opVincP.nro})</span>}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {[["1er pago",fmt(gan1C)],["2do pago",fmt(gan2C)],["Total importación",fmt(ganImpC)],["Margen",fmtP(margenC)],["Markup",fmtP(markupC)]].map(([l,v])=>(
                          <div key={l} style={{display:"flex",justifyContent:"space-between",background:"#f8fafc",borderRadius:7,padding:"8px 12px"}}>
                            <span style={{fontSize:12,color:"#64748b"}}>{l}</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#c9a055"}}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  })()}
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
                  {(p.sku_china||p.sku_bodega||p.dim_largo||p.dim_ancho||p.dim_alto)&&(
                    <div style={{background:"#f8fafc",borderRadius:10,padding:14,border:"1px solid #e2e8f0"}}>
                      <div style={{fontSize:10,color:"#c47830",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:10}}>📦 Bodega</div>
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
                  {getImagenes(p.imagen_url)[0]&&<img src={proxyImg(getImagenes(p.imagen_url)[0])} alt={p.producto} referrerPolicy="no-referrer" onError={e=>{e.target.style.display='none'}} style={{width:"100%",maxHeight:220,objectFit:"contain",borderRadius:10,border:"1px solid #e2e8f0",background:"#f8fafc",marginBottom:4}}/>}
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
      {vistaData&&vistaData.tipo!=="propia"&&(()=>{
        // Vista cliente individual — limpia, estilo OP cliente
        const cot = vistaData;
        const u = Number(cot.unidades) || 0;
        const isAereo = cot.transporte === "aereo";
        // IVA: aéreo siempre lleva IVA; marítimo respeta flag con_iva
        const conIva = isAereo || !!cot.con_iva;
        const precioAcordadoUnd = Number(cot.precio_final_acordado_und) || 0;
        const totClConIva = Number(cot.calc?.totClIvaFinal) || Number(cot.calc?.totClIva) || (Number(cot.calc?.totCl)||0)*1.19 || 0;
        const totClSinIva = Number(cot.calc?.totCl) || 0;
        const totalFinal = precioAcordadoUnd > 0 ? precioAcordadoUnd * u : (conIva ? totClConIva : totClSinIva);
        const precioFinalUnd = u > 0 ? totalFinal / u : 0;
        const sufIva = conIva ? "c/IVA" : "sin IVA";
        const lblTotal = conIva ? "TOTAL CON IVA" : "TOTAL SIN IVA";
        const calcLlegadaInd = () => {
          if (cot.fecha_llegada_real) return cot.fecha_llegada_real;
          const dias = isAereo ? 25 : 90;
          let base;
          if ((cot.checklist?.pago1_cliente || ["pagada","en_camino","en_bodega","completada"].includes(cot.estado)) && cot.fecha_pago1_cliente) {
            base = cot.fecha_pago1_cliente;
          } else {
            base = cot.fecha_solicitud || cot.fecha_respuesta_china;
          }
          if (!base) return cot.fecha_llegada_est || null;
          const d = new Date(base);
          d.setDate(d.getDate() + dias);
          return d.toISOString().split("T")[0];
        };
        const fechaLlegada = calcLlegadaInd();
        const diasLlegada = fechaLlegada ? Math.ceil((new Date(fechaLlegada) - new Date()) / (1000*60*60*24)) : null;
        const tienePago100 = !!cot.pago_100 || isAereo;
        const p1Calc = conIva ? (Number(cot.calc?.p1ClIva)||0) : (Number(cot.calc?.p1Cl)||0);
        const p2Calc = conIva ? (Number(cot.calc?.p2ClIva)||0) : (Number(cot.calc?.p2Cl)||0);
        const sumCalc = p1Calc + p2Calc;
        const factor = sumCalc > 0 && totalFinal > 0 ? totalFinal / sumCalc : 1;
        let p1 = tienePago100 ? totalFinal : p1Calc * factor;
        let p2 = tienePago100 ? 0 : p2Calc * factor;
        if (!tienePago100 && sumCalc === 0) { p1 = totalFinal*0.5; p2 = totalFinal*0.5; }
        // Desglose (estilo COT-001: Depósito + Comisión / Saldo + Servicio)
        const ivaMult = conIva ? 1.19 : 1;
        const pctDep = Number(cot.pct_deposito) || 30;
        const pctServ = Number(cot.pct_servicio) || 4;
        const pctCom = Number(cot.pct_com_prestamo) || 6.5;
        const depMonto = (Number(cot.calc?.dCl)||0) * ivaMult * factor;
        const comMonto = (Number(cot.calc?.comCl)||0) * ivaMult * factor;
        const cdaMonto = (Number(cot.calc?.cdaCl)||0) * ivaMult * factor;
        const saldoMonto = (Number(cot.calc?.prCl)||0) * ivaMult * factor;
        const servMonto = (Number(cot.calc?.serv)||0) * ivaMult * factor;
        return (
        <div style={{position:"fixed",inset:0,background:"#000b",zIndex:900,overflowY:"auto",padding:"12px 8px"}} onClick={e=>e.target===e.currentTarget&&setVistaId(null)}>
          <div style={{maxWidth:820,margin:"0 auto"}}>
            <div style={{display:"flex",gap:8,marginBottom:8,justifyContent:"flex-end"}}>
              <button onClick={()=>abrirPrint("tracker")} style={{background:"#c9a055",color:"#05100e",border:"none",borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>🖨️ Imprimir / Guardar PDF</button>
              <button onClick={()=>setVistaId(null)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:9,padding:"8px 14px",fontSize:13,cursor:"pointer"}}>✕ Cerrar</button>
            </div>
            <div ref={vistaRef} className="opvc-wrap" style={{background:"#fff",borderRadius:14,overflow:"hidden",color:"#222",fontFamily:"'Segoe UI',Arial,sans-serif"}}>
              {/* Header limpio */}
              <div className="opvc-header" style={{background:"#f1f5f9",padding:"24px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <img src={LOGO_DARK} alt="ZAGA IMP" style={{height:28,width:"auto",objectFit:"contain"}}/>
                  <div>
                    <div className="opvc-header-sub" style={{fontSize:11,color:"#64748b"}}>{isAereo?"Cotización Aérea":"Cotización Marítima"}</div>
                    <div style={{fontSize:14,color:"#c9a055",fontWeight:700}}>{cot.nro}</div>
                  </div>
                </div>
                <div className="opvc-header-r" style={{textAlign:"right"}}>
                  <div style={{fontSize:13,color:"#c9a055",fontWeight:700}}>{cot.cliente}</div>
                  <div className="opvc-header-date" style={{fontSize:11,color:"#64748b"}}>{todayStr()}</div>
                </div>
              </div>

              {/* Banner KPIs */}
              <div className="opvc-banner" style={{padding:"18px 32px",background:"#040c18",color:"#fff",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
                <div><div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Unidades</div><div className="opvc-kpi-val" style={{fontSize:18,fontWeight:800,color:"#fff"}}>{fmtN(u)}</div></div>
                <div><div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Precio / und</div><div className="opvc-kpi-val" style={{fontSize:18,fontWeight:800,color:"#c9a055"}}>{fmt(precioFinalUnd)}</div></div>
                <div><div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Total {sufIva}</div><div className="opvc-kpi-val" style={{fontSize:18,fontWeight:800,color:"#22c55e"}}>{fmt(totalFinal)}</div></div>
                <div className="opvc-kpi-hide-mob">
                  <div className="opvc-kpi-lbl" style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Transporte</div>
                  <div className="opvc-kpi-val" style={{fontSize:14,fontWeight:700,color:"#c47830"}}>{isAereo?"✈️ Aéreo":"🚢 Marítimo"}</div>
                  {diasLlegada!==null && <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{diasLlegada>0?`≈ ${diasLlegada} días`:diasLlegada===0?"≈ Hoy":"Atrasado"}</div>}
                </div>
              </div>

              <div className="opvc-body" style={{padding:"20px 32px"}}>
                <div className="opvc-section-ttl opvc-detalle-section-ttl" style={{fontSize:12,fontWeight:700,color:"#333",marginBottom:12}}>Detalle del producto</div>
                <div className="opvc-cot" style={{borderRadius:10,border:"2px solid #1a1a2e22",marginBottom:10,overflow:"hidden"}}>
                  <div className="opvc-cot-hdr" style={{background:"#f8fafc",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e2e8f0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {getImagenes(cot.imagen_url)[0]&&<img src={proxyImg(getImagenes(cot.imagen_url)[0])} alt={cot.producto} referrerPolicy="no-referrer" onError={e=>{e.target.style.display='none'}} style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:"1px solid #e2e8f0",flexShrink:0}}/>}
                      <div>
                        <div className="opvc-cot-hdr-prod" style={{fontWeight:700,fontSize:13,color:"#222"}}>{cot.producto}</div>
                        <div className="opvc-cot-hdr-nro" style={{fontSize:11,color:"#64748b"}}>{cot.nro}</div>
                      </div>
                    </div>
                    <span className="opvc-cot-hdr-badge" style={{background:"#c47830",color:"#fff",borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700}}>{isAereo?"✈️ Aéreo":"🚢 Marítimo"}</span>
                  </div>
                  <div className="opvc-cot-grid" style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,background:"#fff"}}>
                    <div>
                      <div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Unidades</div>
                      <div className="opvc-cell-val" style={{fontSize:13,fontWeight:700,color:"#222"}}>{fmtN(u)}</div>
                      {cot.unidades_originales && Number(cot.unidades_originales) !== Number(cot.unidades) && (
                        <div style={{fontSize:9,color:"#c47830",fontStyle:"italic",marginTop:2}}>📦 ajustada (pediste {cot.unidades_originales})</div>
                      )}
                    </div>
                    <div><div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>$/und {sufIva}</div><div className="opvc-cell-val" style={{fontSize:13,fontWeight:700,color:"#222"}}>{fmt(precioFinalUnd)}</div></div>
                    <div><div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Total {sufIva}</div><div className="opvc-cell-val" style={{fontSize:13,fontWeight:800,color:"#1aa358"}}>{fmt(totalFinal)}</div></div>
                    <div><div className="opvc-cell-lbl" style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Llegada esti.</div><div className="opvc-cell-val" style={{fontSize:12,fontWeight:700,color:"#c47830",fontStyle:"italic"}}>≈ {fechaLlegada||"—"}</div></div>
                  </div>
                  {/* Versión móvil compacta */}
                  <div className="opvc-cot-mob" style={{display:"none"}}>
                    <div className="row1">
                      <div className="prod-wrap">
                        <span className="nro-chip">{cot.nro}</span>
                        <span className="prod">{cot.producto}</span>
                      </div>
                      <span className="tot">{fmt(totalFinal)}</span>
                    </div>
                    <div className="row2">
                      <span>{fmtN(u)} und × {fmt(precioFinalUnd)}</span>
                      <span className="llegada">≈ Llegada esti. {fechaLlegada||"—"}</span>
                    </div>
                  </div>
                </div>
                {/* Plan de pagos (estilo OP cliente) */}
                <div className="opvc-pay" style={{background:"#040c18",borderRadius:12,padding:"18px 22px",color:"#fff",marginTop:14}}>
                  <div className="opvc-pay-ttl" style={{fontSize:10,color:"#c9a055",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:12}}>💰 Plan de pagos</div>
                  {tienePago100 ? (
                    <div className="opvc-pay-box" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0f1e30",borderRadius:8,padding:"12px 16px"}}>
                      <div><div className="opvc-pay-box-lbl" style={{fontSize:12,color:"#94a3b8"}}>💰 Pago único (100%)</div><div className="opvc-pay-box-sub" style={{fontSize:10,color:"#64748b",marginTop:2}}>Al confirmar</div></div>
                      <div className="opvc-pay-box-val" style={{fontSize:20,fontWeight:800,color:"#22c55e"}}>{fmt(p1)}</div>
                    </div>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div className="opvc-pay-box" style={{background:"#0f1e30",borderRadius:8,padding:"12px 16px"}}>
                        <div className="opvc-pay-box-lbl" style={{fontSize:11,color:"#94a3b8"}}>1er pago</div>
                        <div className="opvc-pay-box-sub" style={{fontSize:9,color:"#64748b",marginTop:2,marginBottom:6}}>Al confirmar</div>
                        <div className="opvc-pay-box-val" style={{fontSize:18,fontWeight:800,color:"#22c55e",marginBottom:8}}>{fmt(p1)}</div>
                        <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.6,borderTop:"1px solid #1a2740",paddingTop:6}}>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span>Depósito {pctDep}%</span><b style={{color:"#cbd5e1"}}>{fmt(depMonto)}</b></div>
                          {comMonto>0 && <div style={{display:"flex",justifyContent:"space-between"}}><span>Comisión préstamo</span><b style={{color:"#cbd5e1"}}>{fmt(comMonto)}</b></div>}
                          {cdaMonto>0 && <div style={{display:"flex",justifyContent:"space-between"}}><span>Gestión aduana</span><b style={{color:"#cbd5e1"}}>{fmt(cdaMonto)}</b></div>}
                        </div>
                      </div>
                      <div className="opvc-pay-box" style={{background:"#0f1e30",borderRadius:8,padding:"12px 16px"}}>
                        <div className="opvc-pay-box-lbl" style={{fontSize:11,color:"#94a3b8"}}>2do pago</div>
                        <div className="opvc-pay-box-sub" style={{fontSize:9,color:"#64748b",marginTop:2,marginBottom:6}}>Antes del despacho</div>
                        <div className="opvc-pay-box-val" style={{fontSize:18,fontWeight:800,color:"#fbbf24",marginBottom:8}}>{fmt(p2)}</div>
                        <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.6,borderTop:"1px solid #1a2740",paddingTop:6}}>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span>Saldo {100-pctDep}%</span><b style={{color:"#cbd5e1"}}>{fmt(saldoMonto)}</b></div>
                          {servMonto>0 && <div style={{display:"flex",justifyContent:"space-between"}}><span>Servicio {pctServ}%</span><b style={{color:"#cbd5e1"}}>{fmt(servMonto)}</b></div>}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="opvc-pay-total" style={{marginTop:14,paddingTop:12,borderTop:"1px solid #1a2740",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,color:"#94a3b8"}}>{lblTotal}</span>
                    <span className="opvc-pay-total-val" style={{fontSize:22,fontWeight:800,color:"#c9a055"}}>{fmt(totalFinal)}</span>
                  </div>
                </div>

                {/* Mensaje cierre */}
                <div className="opvc-msg" style={{marginTop:16,padding:"14px 18px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0",fontSize:12,color:"#475569",lineHeight:1.5}}>
                  <b style={{color:"#040c18"}}>Vigencia:</b> 7 días · <b style={{color:"#040c18"}}>Modalidad:</b> {isAereo?"Aérea":"Marítima"}{fechaLlegada && <> · <b style={{color:"#040c18"}}>Llegada esti.:</b> {fechaLlegada}</>}<br/>
                  <b style={{color:"#040c18"}}>Datos de pago:</b> coordinar con ZAGA al confirmar. <em>* Las fechas son estimadas y pueden variar según producción y aduana.</em>
                </div>

                <div className="opvc-footer" style={{marginTop:12,fontSize:10,color:"#64748b",textAlign:"center"}}>
                  ZAGA SpA · RUT 77874968-8 · Santiago, Chile · {todayStr()}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}


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
                      {clientesUnicos.length>0&&(()=>{
                        const clientesConCount = clientesUnicos.map(cl => ({
                          key: cl,
                          count: cotizaciones.filter(c=>c.cliente===cl).length,
                        })).filter(c => c.count > 0).sort((a,b) => b.count - a.count);
                        const TOP_N = 5;
                        const topClientes = clientesConCount.slice(0, TOP_N);
                        const otrosClientes = clientesConCount.slice(TOP_N);
                        const otrosCotsTotal = otrosClientes.reduce((s,c)=>s+c.count, 0);
                        const filtroEnOtros = otrosClientes.some(c => c.key === form.cliente);
                        const chipStyle = (activo, esTop) => ({
                          background: activo ? "#f0fdf4" : (esTop ? "#fef9c3" : "#f8fafc"),
                          color: activo ? "#1aa358" : (esTop ? "#854d0e" : "#64748b"),
                          border: `1px solid ${activo ? "#22c55e66" : (esTop ? "#fde68a" : "#e2e8f0")}`,
                          borderRadius: 20, padding: "4px 12px", fontSize: 12, cursor: "pointer",
                          fontWeight: activo ? 700 : (esTop ? 600 : 400),
                        });
                        const setCliente = (cl) => setForm(p=>({...p,cliente:cl,categoria_cliente:cotizaciones.filter(c=>c.cliente===cl).slice(-1)[0]?.categoria_cliente||p.categoria_cliente}));
                        return (
                        <div style={{marginBottom:8}}>
                          <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>Clientes anteriores ({clientesUnicos.length}):</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                            {topClientes.map((c, idx) => (
                              <button key={c.key} onClick={()=>setCliente(c.key)} style={chipStyle(form.cliente===c.key, idx<3)}>
                                {idx<3 && "⭐ "}{c.key} <span style={{opacity:.6}}>({c.count})</span>
                              </button>
                            ))}
                            {otrosClientes.length > 0 && (
                              <button onClick={()=>setMostrarOtrosClientesCalc(!mostrarOtrosClientesCalc)} style={{
                                background: filtroEnOtros ? "#f0fdf4" : (mostrarOtrosClientesCalc ? "#eef6ff" : "#f8fafc"),
                                color: filtroEnOtros ? "#1aa358" : (mostrarOtrosClientesCalc ? "#2d78c8" : "#64748b"),
                                border: `1px solid ${filtroEnOtros ? "#22c55e66" : (mostrarOtrosClientesCalc ? "#bfdbfe" : "#e2e8f0")}`,
                                borderRadius: 20, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600,
                              }}>
                                {mostrarOtrosClientesCalc ? "▴" : "▾"} Otros {otrosClientes.length} <span style={{opacity:.6}}>({otrosCotsTotal} cots)</span>
                              </button>
                            )}
                            <button onClick={()=>setForm(p=>({...p,cliente:""}))}
                              style={{background:(!form.cliente||!clientesUnicos.includes(form.cliente))?"#eff6ff":"#f8fafc",color:(!form.cliente||!clientesUnicos.includes(form.cliente))?"#3d7fc4":"#64748b",border:`1px solid ${(!form.cliente||!clientesUnicos.includes(form.cliente))?"#3d7fc455":"#e2e8f0"}`,borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer",fontWeight:(!form.cliente||!clientesUnicos.includes(form.cliente))?700:400}}>
                              ✦ Nuevo cliente
                            </button>
                          </div>
                          {mostrarOtrosClientesCalc && otrosClientes.length > 0 && (
                            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",paddingLeft:10,paddingTop:6,paddingBottom:4,borderLeft:"2px solid #e2e8f0",marginLeft:6,marginTop:6}}>
                              {otrosClientes.map(c => (
                                <button key={c.key} onClick={()=>setCliente(c.key)} style={chipStyle(form.cliente===c.key, false)}>
                                  {c.key} <span style={{opacity:.6}}>({c.count})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        );
                      })()}
                      <input value={form.cliente||""} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))} placeholder={clientesUnicos.length>0?"Elige arriba o escribe un cliente nuevo":"Nombre del cliente"} style={{width:"100%",background:"#f8fafc",border:`1px solid ${form.cliente&&clientesUnicos.includes(form.cliente)?"#22c55e66":"#e2e8f0"}`,borderRadius:8,color:form.cliente&&clientesUnicos.includes(form.cliente)?"#1aa358":"#0f172a",padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box",marginTop:8}}/>
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
                        {[["maritimo","🚢 Marítimo","#2a8aaa"],["aereo","✈️ Aéreo","#c47830"],["ambos","🔄 Ambos","#7c3aed"]].map(([k,l,col])=>(
                          <button key={k} onClick={()=>setForm(p=>{
                            const next={...p,transporte:k};
                            // Al elegir aéreo: forzar pago 100%, factura, IVA cliente, servicio 6%
                            if(k==="aereo"){
                              next.pago_100=true;
                              next.con_iva=true;
                              next.requiere_factura=true;
                              if(!p.pct_servicio||Number(p.pct_servicio)===4) next.pct_servicio=6;
                            }
                            // Al volver a marítimo desde aéreo/ambos, devolver defaults marítimos
                            if(k==="maritimo"){
                              next.pago_100=false;
                              if(!p.pct_servicio||Number(p.pct_servicio)===6) next.pct_servicio=4;
                            }
                            return next;
                          })} style={{flex:1,background:form.transporte===k?col+"18":"#f8fafc",color:form.transporte===k?col:"#64748b",border:`1px solid ${form.transporte===k?col+"66":"#e2e8f0"}`,borderRadius:8,padding:"7px 6px",fontSize:11,cursor:"pointer",fontWeight:form.transporte===k?700:400,textAlign:"center"}}>
                            {l}
                          </button>
                        ))}
                      </div>
                      {form.transporte==="ambos"&&(
                        <div style={{fontSize:11,color:"#7c3aed",background:"#faf5ff",borderRadius:7,padding:"6px 10px",border:"1px solid #e9d5ff",marginTop:8}}>🔄 Se crearán <b>2 cotizaciones independientes</b> al guardar — una marítima y una aérea con los datos base que ingreses.</div>
                      )}
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
                    <label style={{display:"block",fontSize:10,color:"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Imagen del producto (URL)</label>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input value={form.imagen_url||""} onChange={e=>setForm(p=>({...p,imagen_url:e.target.value}))} placeholder="Clic derecho en la imagen → Copiar dirección de imagen" style={{flex:1,background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:8,color:"#0f172a",padding:"9px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                      {getImagenes(form.imagen_url)[0]&&<img src={proxyImg(getImagenes(form.imagen_url)[0])} referrerPolicy="no-referrer" onError={e=>{e.target.style.display='none'}} style={{width:44,height:44,objectFit:"cover",borderRadius:6,border:"1px solid #e2e8f0",flexShrink:0}}/>}
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div>
                      <label style={{display:"block",fontSize:10,color:"#777",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Fecha</label>
                      <input type="date" value={form.fecha_solicitud} onChange={e=>setForm(p=>({...p,fecha_solicitud:e.target.value}))} style={{width:"100%",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:8,color:"#0f172a",padding:"9px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    {form.tipo==="cliente"&&(
                      <div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:18}}>
                        {[["con_iva","Cotizar c/IVA"],["pago_100","Pago 100% (sin split 30/70)"],["requiere_factura","Requiere factura"]].map(([f,l])=>(
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
                    {form.transporte==="ambos" ? (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <NInput label="🚢 Und. marítimas" field="unidades" form={form} setForm={setForm} placeholder="0"/>
                        <NInput label="✈️ Und. aéreas" field="unidades_aereo" form={form} setForm={setForm} placeholder="0"/>
                      </div>
                    ) : (
                      <NInput label="Unidades" field="unidades" form={form} setForm={setForm} placeholder="0"/>
                    )}
                    <div style={{marginTop:10,fontSize:11,color:"#94a3b8",background:"#f1f5f9",borderRadius:8,padding:"8px 12px",border:"1px dashed #cbd5e1"}}>
                      💡 Cuando China responda, edita esta cotización desde el Tracker para ingresar el precio y calcular todo.
                    </div>
                  </div>
                ) : (
                  <BLOCK title="🇨🇳 Cotización China" accent="#2d78c8">
                    {(()=>{
                      const esMaritimoV2 = form.modelo_v2 === true && (form.transporte === "maritimo" || form.transporte === "ambos") && !form.pago_100;
                      return esMaritimoV2 && (
                        <div style={{fontSize:11,color:"#5b21b6",background:"#faf5ff",borderRadius:8,padding:"8px 12px",border:"1px solid #e9d5ff",marginBottom:10}}>
                          ✨ <b>Modelo marítimo v2:</b> margen 15% sugerido al ingresar precio China · comisión 6.5% calculada automática · sin ítem servicio.
                        </div>
                      );
                    })()}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      {form.transporte==="ambos" ? (
                        <>
                          <NInput label="🚢 Und. marítimas" field="unidades" form={form} setForm={setForm} placeholder="0"/>
                          <NInput label="✈️ Und. aéreas" field="unidades_aereo" form={form} setForm={setForm} placeholder="0"/>
                        </>
                      ) : (
                        <NInput label="Unidades" field="unidades" form={form} setForm={setForm} placeholder="0"/>
                      )}
                      <NInput label="Precio China / Unid $" field="precio_china" form={form} setForm={setForm} placeholder="0"/>
                      {form.transporte!=="aereo"&&<>
                        <NInput label="% Depósito" field="pct_deposito" form={form} setForm={setForm} note="Ej: 30 = 30%"/>
                        {/* V1 only: en v2 la comisión se calcula automáticamente (6.5% × 70% precio China) */}
                        {form.modelo_v2 !== true && (
                          <NInput label="⚡ Comisión real APP $" field="comision_real" form={form} setForm={setForm} color="#b8922e" placeholder="0" note="Copia de la app"/>
                        )}
                      </>}
                    </div>
                    {form.transporte==="aereo"&&(
                      <div style={{fontSize:11,color:"#92400e",background:"#fff7ed",borderRadius:7,padding:"6px 10px",border:"1px solid #fed7aa",marginBottom:8}}>✈️ Aéreo: pago 100% — depósito y comisión préstamo no aplican</div>
                    )}
                    {form.transporte!=="aereo"&&Number(form.comision_real)>0&&Number(form.precio_china)>0&&Number(form.unidades)>0&&(
                      <div style={{fontSize:11,color:"#666",background:"#f8fafc",borderRadius:7,padding:"6px 10px"}}>Tasa implícita: <span style={{color:"#334155"}}>{(Number(form.comision_real)/(Number(form.precio_china)*Number(form.unidades)*(1-Number(form.pct_deposito)/100))*100).toFixed(2)}%</span></div>
                    )}

                    {/* ── DIMENSIONES + PESO (siempre visible — crítico en aéreo para validar m³ y peso cobrable) ── */}
                    {(()=>{
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

                          {/* Alerta mínimo 1 m³ Sunny — solo aéreo */}
                          {form.transporte==="aereo"&&Number(m3Total)>0&&Number(m3Total)<1&&(
                            <div style={{marginTop:10,background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:7,padding:"8px 12px",fontSize:11,color:"#92400e",lineHeight:1.5}}>
                              ⚠️ <strong>Carga inferior a 1 m³</strong> ({m3Total} m³). Sunny no acepta envíos individuales menores a 1 m³ — debe consolidarse con otra cotización (ver tab ✈️ Operaciones).
                            </div>
                          )}

                          {/* ── PESO (importante en aéreo) ── */}
                          {(()=>{
                            const pesoReal=Number(form.peso_kg)||0;
                            // Volumen total cm³ → kg volumétrico (÷ 6000 estándar aéreo)
                            const volCm3 = esCaja
                              ? (Number(form.dim_largo)||0) * (Number(form.dim_ancho)||0) * (Number(form.dim_alto)||0) * (nCajas||0)
                              : (Number(form.dim_largo)||0) * (Number(form.dim_ancho)||0) * (Number(form.dim_alto)||0) * unidades;
                            const pesoVol = volCm3 / 6000;
                            const pesoCobrable = Math.max(pesoReal, pesoVol);
                            const isAereoForm = form.transporte === "aereo";
                            return (
                              <div style={{marginTop:12,paddingTop:12,borderTop:"1px dashed "+(isAereoForm?"#fed7aa":"#e2e8f0")}}>
                                <div style={{fontSize:9,color:isAereoForm?"#c47830":"#64748b",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>
                                  ⚖️ Peso de la carga {isAereoForm?"(crítico en aéreo)":"(opcional)"}
                                </div>
                                <div style={{display:"grid",gridTemplateColumns:isAereoForm&&pesoReal>0&&pesoVol>0?"1fr 1fr 1fr":"1fr",gap:6,marginBottom:6}}>
                                  <div>
                                    <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>Peso real total (kg)</div>
                                    <input type="number" value={form.peso_kg||""} onChange={e=>setForm(p=>({...p,peso_kg:e.target.value}))} placeholder="Ej: 17" style={{width:"100%",background:"#f1f5f9",border:"1px solid "+(isAereoForm?"#c4783055":"#2d78c833"),borderRadius:6,color:isAereoForm?"#c47830":"#2d78c8",padding:"6px 8px",fontSize:12,outline:"none",boxSizing:"border-box",fontWeight:700}}/>
                                  </div>
                                  {isAereoForm&&pesoReal>0&&pesoVol>0&&(<>
                                    <div>
                                      <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>Peso volumétrico (kg)</div>
                                      <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:6,color:"#c47830",padding:"6px 8px",fontSize:12,fontWeight:700}}>{pesoVol.toFixed(2)} kg</div>
                                      <div style={{fontSize:8,color:"#92400e",marginTop:2}}>L×A×H ÷ 6000</div>
                                    </div>
                                    <div>
                                      <div style={{fontSize:9,color:"#64748b",marginBottom:3}}>Peso cobrable</div>
                                      <div style={{background:pesoVol>pesoReal?"#fef3c7":"#f0fdf4",border:"1px solid "+(pesoVol>pesoReal?"#fde68a":"#bbf7d0"),borderRadius:6,color:pesoVol>pesoReal?"#92400e":"#15803d",padding:"6px 8px",fontSize:13,fontWeight:800,textAlign:"center"}}>{pesoCobrable.toFixed(2)} kg</div>
                                      <div style={{fontSize:8,color:pesoVol>pesoReal?"#92400e":"#15803d",marginTop:2,fontWeight:700}}>{pesoVol>pesoReal?"⚠ Volumétrico manda":"✓ Real manda"}</div>
                                    </div>
                                  </>)}
                                </div>
                                {isAereoForm&&pesoReal>0&&pesoVol>pesoReal*1.15&&(
                                  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,padding:"6px 10px",fontSize:10,color:"#dc2626",lineHeight:1.5}}>
                                    ⚠ Peso volumétrico mucho mayor que el real ({(pesoVol/pesoReal*100-100).toFixed(0)}% más). Verificar con el proveedor que el precio CIP cubra el flete por peso volumétrico.
                                  </div>
                                )}
                                {isAereoForm&&pesoReal===0&&(
                                  <div style={{fontSize:10,color:"#92400e",fontStyle:"italic"}}>💡 Pedirle el peso al proveedor para validar el flete CIP</div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </BLOCK>
                )}

                {/* ── BLOQUE CONFIGURACIÓN AÉREA — eliminado de la calculadora.
                       Los temas aéreos (aduana, flete Sunny, Form F) ahora se gestionan
                       desde el botón "🛬 Validar" de cada cot aérea en el Tracker. ── */}
                {false&&form.tipo==="cliente"&&form.transporte==="aereo"&&(
                  <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{fontSize:11,color:"#c47830",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>✈️ Configuración aérea</div>
                      <div style={{fontSize:10,color:"#92400e",fontStyle:"italic"}}>Pago 100% · Sin comisión préstamo · Con factura</div>
                    </div>
                    {/* Form F toggle */}
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:10,padding:"7px 10px",background:form.form_f_incluido!==false?"#f0fdf4":"#fef2f2",borderRadius:7,border:"1px solid "+(form.form_f_incluido!==false?"#bbf7d0":"#fecaca")}}>
                      <input type="checkbox" checked={form.form_f_incluido!==false} onChange={e=>setForm(p=>({...p,form_f_incluido:e.target.checked}))} style={{margin:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:form.form_f_incluido!==false?"#15803d":"#dc2626"}}>Form F (TLC Chile-China) incluido</div>
                        <div style={{fontSize:10,color:"#64748b"}}>{form.form_f_incluido!==false?"Arancel 0% sobre CIF ✅":"Arancel 6% sobre CIF — se traslada al cliente dentro de costos aduaneros"}</div>
                      </div>
                    </label>
                    {/* Costos aduaneros editables */}
                    <div style={{fontSize:10,color:"#92400e",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Costos aduaneros (editables)</div>
                    {/* Sugerencia automática honorarios Leslie: max(USD 150 × TC, CIF × 0,35%) */}
                    {(()=>{
                      const TC_ADUANERO = 896.03;
                      const cifClp = (Number(form.precio_china)||0)*(Number(form.unidades)||0) + (Number(form.margen_und)||0)*(Number(form.unidades)||0);
                      const minimo = 150 * TC_ADUANERO; // USD 150 × TC aduanero
                      const porPct = cifClp * 0.0035;   // 0,35% sobre CIF
                      const sugerido = Math.round(Math.max(minimo, porPct));
                      const honorariosActual = Number(form.aer_honorarios) || 0;
                      const diff = honorariosActual - sugerido;
                      return (
                        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"7px 10px",marginBottom:6,fontSize:10,color:"#854d0e",lineHeight:1.5}}>
                          💡 <b>Sugerencia honorarios Leslie:</b> {fmt(sugerido)} <span style={{color:"#94a3b8"}}>(max entre USD 150 × $896,03 = {fmt(minimo)} y CIF × 0,35% = {fmt(porPct)})</span>
                          {cifClp > 0 && honorariosActual > 0 && Math.abs(diff) > 1000 && (
                            <button onClick={()=>setForm(p=>({...p,aer_honorarios:sugerido}))} style={{marginLeft:8,background:"#fbbf24",color:"#040c18",border:"none",borderRadius:5,padding:"2px 8px",fontSize:10,cursor:"pointer",fontWeight:700}}>
                              Aplicar →
                            </button>
                          )}
                        </div>
                      );
                    })()}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      {[
                        ["aer_honorarios","Honorarios aduana"],
                        ["aer_edi","Transmisión EDI"],
                        ["aer_despacho","Gastos despacho"],
                        ["aer_aeropuerto","Gastos aeropuerto"],
                      ].map(([k,l])=>(
                        <div key={k}>
                          <label style={{display:"block",fontSize:9,color:"#92400e",marginBottom:3}}>{l}</label>
                          <input type="number" value={form[k]??""} onChange={e=>setForm(p=>({...p,[k]:e.target.value===""?"":Number(e.target.value)}))} style={{width:"100%",background:"#ffffff",border:"1px solid #fed7aa",borderRadius:6,color:"#0f172a",padding:"6px 9px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                      ))}
                    </div>
                    {/* Aforo con checkbox */}
                    <div style={{display:"flex",gap:10,alignItems:"flex-end",marginBottom:8}}>
                      <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"6px 10px",background:form.incluir_aforo!==false?"#fff7ed":"#f8fafc",borderRadius:6,border:"1px solid #fed7aa",flex:"0 0 auto"}}>
                        <input type="checkbox" checked={form.incluir_aforo!==false} onChange={e=>setForm(p=>({...p,incluir_aforo:e.target.checked}))} style={{margin:0}}/>
                        <span style={{fontSize:11,color:"#92400e",fontWeight:600}}>Incluir aforo</span>
                      </label>
                      <div style={{flex:1}}>
                        <label style={{display:"block",fontSize:9,color:"#92400e",marginBottom:3}}>Aforo (condicional)</label>
                        <input type="number" disabled={form.incluir_aforo===false} value={form.aer_aforo??""} onChange={e=>setForm(p=>({...p,aer_aforo:e.target.value===""?"":Number(e.target.value)}))} style={{width:"100%",background:form.incluir_aforo===false?"#f1f5f9":"#ffffff",border:"1px solid #fed7aa",borderRadius:6,color:"#0f172a",padding:"6px 9px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                    </div>
                    {/* Modo de cobro flete Sunny */}
                    <div style={{fontSize:10,color:"#92400e",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1,marginTop:4}}>Modo de cobro flete Sunny</div>
                    <div style={{display:"flex",gap:4,marginBottom:8}}>
                      {[["auto","🔀 Auto (max)"],["peso","⚖️ Por peso (joyas/denso)"],["volumen","📦 Por volumen"]].map(([k,l])=>(
                        <button key={k} onClick={()=>setForm(p=>({...p,aer_modo_cobro_sunny:k}))} style={{flex:1,background:(form.aer_modo_cobro_sunny||"auto")===k?"#fff7ed":"#ffffff",color:(form.aer_modo_cobro_sunny||"auto")===k?"#c47830":"#64748b",border:"1px solid "+((form.aer_modo_cobro_sunny||"auto")===k?"#c47830":"#fed7aa"),borderRadius:6,padding:"6px 4px",fontSize:10,cursor:"pointer",fontWeight:(form.aer_modo_cobro_sunny||"auto")===k?700:500}}>{l}</button>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      <div>
                        <label style={{display:"block",fontSize:9,color:"#92400e",marginBottom:3}}>Tarifa USD/kg (peso)</label>
                        <input type="number" step="0.01" value={form.aer_tarifa_sunny_kg??""} onChange={e=>setForm(p=>({...p,aer_tarifa_sunny_kg:e.target.value===""?"":Number(e.target.value)}))} placeholder="9.55" style={{width:"100%",background:"#ffffff",border:"1px solid #fed7aa",borderRadius:6,color:"#0f172a",padding:"6px 9px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      <div>
                        <label style={{display:"block",fontSize:9,color:"#92400e",marginBottom:3}}>Tarifa USD/CBM (volumen)</label>
                        <input type="number" step="0.01" value={form.aer_tarifa_sunny_cbm??""} onChange={e=>setForm(p=>({...p,aer_tarifa_sunny_cbm:e.target.value===""?"":Number(e.target.value)}))} placeholder="—" style={{width:"100%",background:"#ffffff",border:"1px solid #fed7aa",borderRadius:6,color:"#0f172a",padding:"6px 9px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                    </div>
                    <div style={{fontSize:10,color:"#92400e",fontStyle:"italic",marginBottom:8,lineHeight:1.4}}>
                      💡 Auto = se cobra el mayor entre peso y volumen (regla IATA). Por peso = joyas y productos densos. Por volumen = productos voluminosos. Pedir a Sunny tarifa USD/CBM cuando aplique.
                    </div>
                    {/* Total prefijado */}
                    <div style={{background:"#fff",borderRadius:7,padding:"8px 12px",border:"1px solid #fed7aa",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:"#92400e",fontWeight:700}}>Subtotal aduana neto</span>
                      <span style={{fontSize:14,fontWeight:800,color:"#c47830"}}>{fmt((Number(form.aer_honorarios)||0)+(Number(form.aer_edi)||0)+(Number(form.aer_despacho)||0)+(Number(form.aer_aeropuerto)||0)+(form.incluir_aforo!==false?(Number(form.aer_aforo)||0):0))}</span>
                    </div>
                    {/* Recordatorio dólar aduanero */}
                    <div style={{marginTop:10,background:"#fef9c3",border:"1px solid #fde68a",borderRadius:7,padding:"8px 12px",fontSize:10,color:"#854d0e",lineHeight:1.5}}>
                      💡 <strong>Dólar aduanero:</strong> el IVA aduana real puede variar según el dólar aduanero del mes (fijado por Aduana). Verificar con la agente antes del despacho. <a href="https://www.aduana.cl/indicadores-equivalencias/aduana/2025-12-30/115957.html" target="_blank" rel="noopener noreferrer" style={{color:"#854d0e",textDecoration:"underline",fontWeight:700}}>Ver dólar del mes →</a>
                    </div>
                  </div>
                )}

                {form.tipo==="cliente"&&!esPaso1&&(
                  <BLOCK title="💰 Tu margen ZAGA" accent="#1aa358">
                    {/* 🎯 Auto-margen objetivo aéreo — eliminado (se gestiona en 🛬 Validar) */}
                    {false&&form.transporte==="aereo"&&Number(form.precio_china)>0&&Number(form.unidades)>0&&(
                      <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:9,padding:"10px 14px",marginBottom:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                          <span style={{fontSize:12,color:"#92400e",fontWeight:700}}>🎯 Auto-precio para</span>
                          <input type="number" min="1" max="80" step="1" value={form.pct_margen_target_cliente??25} onChange={e=>setForm(p=>({...p,pct_margen_target_cliente:e.target.value===""?"":Number(e.target.value)}))} style={{width:68,padding:"5px 8px",border:"1px solid #fbbf24",borderRadius:6,fontSize:14,fontWeight:800,color:"#92400e",textAlign:"center",outline:"none",background:"#ffffff"}}/>
                          <span style={{fontSize:12,color:"#92400e",fontWeight:700}}>% margen sobre venta</span>
                          <button onClick={()=>{
                            const target=(Number(form.pct_margen_target_cliente)||25)/100;
                            const mar=findMarParaMargen(form,target);
                            const calc=calcCliente({...form,margen_und:mar});
                            const precioRedondeado=Math.round((Number(form.precio_china)||0)+mar);
                            setForm(p=>({...p,margen_und:mar,precio_venta_cliente:precioRedondeado}));
                          }} style={{marginLeft:"auto",background:"#c47830",color:"#fff",border:"none",borderRadius:7,padding:"7px 16px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 1px 3px rgba(196,120,48,0.3)"}}>
                            Calcular precio →
                          </button>
                        </div>
                        <div style={{fontSize:10,color:"#92400e",marginTop:6,fontStyle:"italic",lineHeight:1.4}}>
                          Encuentra el precio venta/und que da exactamente el % de margen bruto sobre la venta total (gross margin = ganImp/totCl). Considera todos los costos: producto, aduana, servicio, comisión.
                        </div>
                      </div>
                    )}
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

                    {/* 🎯 AJUSTE MANUAL — Precio final POR UNIDAD acordado con cliente (override del calculado) */}
                    {Number(form.unidades)>0&&Number(form.precio_china)>0&&(()=>{
                      const u = Number(form.unidades) || 0;
                      const totClIvaCalc = calcActual.totClIva || 0;
                      const pUndCalc = u > 0 ? totClIvaCalc / u : 0; // precio por unidad calculado c/IVA
                      const acordadoUnd = Number(form.precio_final_acordado_und) || 0;
                      const acordadoTotal = acordadoUnd > 0 ? acordadoUnd * u : 0;
                      const diffTotal = acordadoTotal > 0 ? acordadoTotal - totClIvaCalc : 0;
                      const diffUnd = acordadoUnd > 0 ? acordadoUnd - pUndCalc : 0;
                      return (
                        <div style={{background:"#fef3c7",border:"1px solid #fbbf24",borderRadius:9,padding:"12px 14px",marginBottom:14}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:6}}>
                            <span style={{fontSize:11,color:"#92400e",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>🎯 Precio final POR UNIDAD acordado (ajuste manual)</span>
                            <span style={{fontSize:10,color:"#94a3b8",fontStyle:"italic"}}>Override del calculado · diff va al margen ZAGA</span>
                          </div>
                          <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
                            <div style={{flex:1,minWidth:160}}>
                              <label style={{display:"block",fontSize:9,color:"#92400e",marginBottom:3,textTransform:"uppercase",letterSpacing:0.5,fontWeight:700}}>Precio FINAL c/IVA por unidad</label>
                              <input type="number" value={form.precio_final_acordado_und||""} placeholder={pUndCalc > 0 ? `Calc: ${fmt(pUndCalc)}` : "0"}
                                onChange={e=>setForm(p=>({...p,precio_final_acordado_und:e.target.value}))}
                                style={{width:"100%",background:"#fff",border:"1px solid #fbbf24",borderRadius:7,color:"#92400e",padding:"10px 12px",fontSize:15,fontWeight:800,outline:"none",boxSizing:"border-box"}}/>
                              <div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>× {fmtN(u)} unidades</div>
                            </div>
                            {acordadoTotal > 0 && (
                              <div style={{flex:1,minWidth:160,background:"#fff",border:"1px solid #fde68a",borderRadius:7,padding:"8px 12px"}}>
                                <div style={{fontSize:9,color:"#92400e",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>Total acordado c/IVA</div>
                                <div style={{fontSize:17,fontWeight:800,color:"#92400e"}}>{fmt(acordadoTotal)}</div>
                                <div style={{fontSize:10,color:"#64748b",marginTop:2}}>
                                  = {fmt(acordadoUnd)} × {fmtN(u)}
                                </div>
                              </div>
                            )}
                            {acordadoTotal > 0 && (
                              <div style={{flex:1,minWidth:160,background:"#fff",border:"1px solid #fde68a",borderRadius:7,padding:"8px 12px"}}>
                                <div style={{fontSize:9,color:"#92400e",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>Diferencia vs calculado</div>
                                <div style={{fontSize:15,fontWeight:800,color: diffTotal >= 0 ? "#15803d" : "#dc2626"}}>
                                  {diffTotal >= 0 ? "+" : ""}{fmt(diffTotal)}
                                </div>
                                <div style={{fontSize:10,color:"#64748b",marginTop:2}}>
                                  ({diffUnd >= 0 ? "+" : ""}{fmt(diffUnd)} /und) {diffTotal >= 0 ? "📈 +margen" : "📉 -margen"}
                                </div>
                              </div>
                            )}
                          </div>
                          {acordadoTotal > 0 && (
                            <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #fde68a",fontSize:11,color:"#92400e"}}>
                              Calculado/und: <b>{fmt(pUndCalc)}</b> · Acordado/und: <b>{fmt(acordadoUnd)}</b> · Total acordado: <b>{fmt(acordadoTotal)}</b> · Margen ajustado: <b style={{color:"#15803d"}}>{fmt(calcActual.ganImpAjustado)}</b> ({calcActual.mgBrut.toFixed(1)}%)
                            </div>
                          )}
                          {!acordadoTotal && (
                            <div style={{marginTop:6,fontSize:10,color:"#854d0e",fontStyle:"italic"}}>
                              💡 Dejar vacío para usar el precio calculado. Llenar el precio POR UNIDAD que efectivamente acordaste con el cliente.
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {(()=>{
                      const esMaritimoV2 = form.modelo_v2 === true && (form.transporte === "maritimo" || form.transporte === "ambos") && !form.pago_100;
                      // V2: ocultar % servicio (eliminado) y % comisión préstamo (fijo 6.5%)
                      if (esMaritimoV2) return null;
                      return (
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                          <NInput label="% Servicio al cliente" field="pct_servicio" form={form} setForm={setForm} color="#1aa358" note="Ej: 4 = 4%"/>
                          <NInput label="% Comisión préstamo" field="pct_com_prestamo" form={form} setForm={setForm} color="#b8922e" note="Por defecto 6.5%"/>
                        </div>
                      );
                    })()}
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
                  {form.requiere_factura&&!calcActual.isAereo&&<ROW label="IVA 19% (compra con factura a China)" value={fmt(calcActual.ivaChina)} accent="#c0392b"/>}
                  {form.requiere_factura&&!calcActual.isAereo&&<ROW label="Total producto con IVA" value={fmt(calcActual.tCh)} accent="#c47830" big/>}
                  {!form.pago_100&&<ROW label={`Depósito ${form.pct_deposito}%`} value={fmt(calcActual.dCh)} sub/>}
                  {!form.pago_100&&<ROW label={`Préstamo ${100-Number(form.pct_deposito)}%`} value={fmt(calcActual.prCh)} sub/>}
                  {!form.pago_100&&!calcActual.isAereo&&<ROW label="Comisión real según APP" value={fmt(calcActual.comR)} accent="#b8922e"/>}
                  {!calcActual.isAereo&&Number(form.cda)>0&&<ROW label={`${form.cda_descripcion||"Certificado especial"}`} value={fmt(calcActual.cda)} accent="#c47830"/>}
                  <div style={{height:6}}/>
                  {/* En AÉREO: desglosar A CHINA / A AGENCIA ADUANA / IVA ADUANA AL SII */}
                  {calcActual.isAereo&&calcActual.aer ? (()=>{
                    const aer=calcActual.aer;
                    const aChina = calcActual.tChNeto + calcActual.ivaChina;
                    const aAgencia = aer.aduFijo + aer.arancelReal + aer.ivaAgente; // neto + arancel + IVA agente
                    const aSII = aer.ivaAduanaReal; // recuperable F29
                    const totalDesembolso = aChina + aAgencia + aSII;
                    return (
                      <>
                        <PAYBOX label="✈️ PAGO a China (producto CIP)" amount={fmt(aChina)} color="#2d78c8" detail={`Producto CIP Santiago ${fmt(calcActual.tChNeto)} — sin IVA chileno (importación) — al confirmar`}/>
                        <PAYBOX label="🏢 PAGO a Agencia Aduana" amount={fmt(aAgencia)} color="#c47830" detail={`Servicios ${fmt(aer.aduFijo)}${aer.arancelReal>0?` + arancel ${fmt(aer.arancelReal)}`:""} + IVA agente ${fmt(aer.ivaAgente)} — al despacho`}/>
                        <PAYBOX label="🏛️ IVA Aduana al SII" amount={fmt(aSII)} color="#7c3aed" detail={`19% × CIF${aer.arancelReal>0?" + arancel":""} ${fmt(aer.ivaAduanaReal)} — al despacho · recuperable como crédito fiscal F29`}/>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:9,padding:"10px 14px",marginTop:6,border:"1px dashed #cbd5e1"}}>
                          <span style={{fontSize:11,color:"#64748b",fontWeight:600}}>Total desembolso día despacho (caja real)</span>
                          <span style={{fontSize:15,fontWeight:800,color:"#0f172a"}}>{fmt(totalDesembolso)}</span>
                        </div>
                        <div style={{fontSize:10,color:"#64748b",marginTop:4,fontStyle:"italic",textAlign:"center"}}>El IVA Aduana se recupera como crédito fiscal en F29 — no es costo real</div>
                      </>
                    );
                  })() : form.pago_100
                    ? <PAYBOX label="PAGO ÚNICO a China" amount={fmt(calcActual.p1Ch)} color="#2d78c8" detail={`Producto ${fmt(calcActual.tChNeto)}${form.requiere_factura?` + IVA 19% ${fmt(calcActual.ivaChina)}`:""}${Number(form.cda)>0?` + ${form.cda_descripcion||"Certificado"} ${fmt(calcActual.cda)}`:""}`}/>
                    : <>
                        <PAYBOX label="1er PAGO a China" amount={fmt(calcActual.p1Ch)} color="#2d78c8" detail={`Depósito ${fmt(calcActual.dCh)} + Comisión ${fmt(calcActual.comR)}${Number(form.cda)>0?` + ${form.cda_descripcion||"Certificado"} ${fmt(calcActual.cda)}`:""} (sin IVA)`}/>
                        <PAYBOX label="2do PAGO a China" amount={fmt(calcActual.p2Ch)} color="#2d78c8" detail={form.requiere_factura?`Saldo ${fmt(calcActual.prCh)} + IVA 19% ${fmt(calcActual.ivaChina)}`:"Saldo al recibir la mercancía"}/>
                      </>
                  }
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:9,padding:"10px 14px",marginTop:8}}>
                    <div>
                      <div style={{fontSize:12,color:"#64748b"}}>Costo real por unidad <span style={{fontSize:10,color:"#94a3b8"}}>(neto, post-F29)</span></div>
                      {form.con_iva&&calcActual.cRUnd!==calcActual.cRUndNeto&&<div style={{fontSize:10,color:"#94a3b8"}}>Caja desembolsada/und: {fmt(calcActual.cRUnd)} (incluye IVA recuperable)</div>}
                    </div>
                    <span style={{fontSize:19,fontWeight:800,color:"#2d78c8"}}>{fmt(form.con_iva?calcActual.cRUndNeto:calcActual.cRUnd)}</span>
                  </div>
                </BLOCK>

                {/* TABLA 2: según tipo */}
                {form.tipo==="cliente"&&(
                  <BLOCK title="📄 Tabla 2 — Cotización al Cliente" accent="#1aa358">
                    <ROW label="Precio por unidad (China + margen)" value={fmt(calcActual.pCUnd)} accent="#1aa358" big/>
                    <ROW label="Total importación" value={fmt(calcActual.tCl)}/>
                    {!form.pago_100&&<ROW label={`Depósito ${form.pct_deposito}%`} value={fmt(calcActual.dCl)} sub/>}
                    {!form.pago_100&&<ROW label={`Comisión préstamo ${form.pct_com_prestamo||6.5}%`} value={fmt(calcActual.comCl)} accent="#b8922e"/>}
                    {(Number(form.cda_cl)||Number(form.cda))>0&&<ROW label={form.cda_descripcion||"Certificado especial"} value={fmt(calcActual.cdaCl)} accent="#c47830"/>}
                    <ROW label={`Servicio ZAGA ${form.pct_servicio}%`} value={fmt(calcActual.serv)} accent="#1aa358" sub/>
                    {form.con_iva&&<ROW label="IVA 19% (cobrado al cliente)" value={fmt(calcActual.ivaCliente)} accent="#1aa358" sub/>}
                    <div style={{height:6}}/>
                    {form.pago_100
                      ? <PAYBOX label="💰 PAGO ÚNICO Cliente" color="#1aa358" amount={form.con_iva?`${fmt(calcActual.p1ClIva)} c/IVA`:fmt(calcActual.p1Cl)} detail={`Total ${fmt(calcActual.tCl)} + Servicio ZAGA ${fmt(calcActual.serv)}${(Number(form.cda_cl)||Number(form.cda))>0?` + ${form.cda_descripcion||"Certificado"} ${fmt(calcActual.cdaCl)}`:""}`}/>
                      : <>
                          <PAYBOX label="1er PAGO Cliente" color="#1aa358" amount={form.con_iva?`${fmt(calcActual.p1ClIva)} c/IVA`:fmt(calcActual.p1Cl)} detail={`Depósito ${fmt(calcActual.dCl)} + Comisión ${fmt(calcActual.comCl)}${(Number(form.cda_cl)||Number(form.cda))>0?` + ${form.cda_descripcion||"Certificado"} ${fmt(calcActual.cdaCl)}`:""}`}/>
                          <PAYBOX label="2do PAGO Cliente" color="#1aa358" amount={form.con_iva?`${fmt(calcActual.p2ClIva)} c/IVA`:fmt(calcActual.p2Cl)} detail={`Saldo ${fmt(calcActual.prCl)} + Servicio ${fmt(calcActual.serv)}`}/>
                        </>
                    }
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
                    {!form.pago_100&&!calcActual.isAereo&&<ROW label="Diferencia comisión (6.5% − real app)" value={fmt(calcActual.difCom)} accent="#aaa" sub/>}
                    {calcActual.isAereo&&calcActual.aer&&calcActual.aer.difArancel!==0&&(
                      <ROW label="Diferencia arancel (sin Form F · sobre venta − sobre costo)" value={fmt(calcActual.aer.difArancel)} accent={calcActual.aer.difArancel>=0?"#c9a055":"#c0392b"} sub/>
                    )}
                    {!calcActual.isAereo&&calcActual.ganCda!==0&&<ROW label={`Diferencia ${form.cda_descripcion||"Certificado"} (cobrado − costo)`} value={fmt(calcActual.ganCda)} accent={calcActual.ganCda>=0?"#c9a055":"#c0392b"} sub/>}
                    <ROW label="GANANCIA IMPORTACIÓN (sin IVA)" value={fmt(calcActual.ganImp)} big topLine/>
                    {(form.requiere_factura||form.con_iva)&&(
                      <div style={{background:"#fff7ed",borderRadius:8,padding:"12px 14px",margin:"10px 0",border:"1px solid #fed7aa"}}>
                        <div style={{fontSize:10,color:"#92400e",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>🧾 Flujo IVA — F29</div>
                        {/* Débito */}
                        {form.con_iva&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"#64748b"}}>IVA cobrado al cliente (débito fiscal)</span><span style={{color:"#1aa358",fontWeight:600}}>+{fmt(calcActual.ivaCliente)}</span></div>}
                        {/* Crédito desglosado */}
                        {form.requiere_factura&&!calcActual.isAereo&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"#64748b"}}>· IVA pagado a China (crédito)</span><span style={{color:"#c0392b",fontWeight:600}}>−{fmt(calcActual.ivaChina)}</span></div>}
                        {calcActual.isAereo&&form.requiere_factura&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4,fontStyle:"italic"}}><span style={{color:"#94a3b8"}}>· China (importación) — sin IVA chileno</span><span style={{color:"#94a3b8"}}>$0</span></div>}
                        {calcActual.isAereo&&calcActual.aer&&(<>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"#64748b"}}>· IVA agente aduana (crédito)</span><span style={{color:"#c0392b",fontWeight:600}}>−{fmt(calcActual.aer.ivaAgente)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"#64748b"}}>· IVA aduana SII (crédito)</span><span style={{color:"#c0392b",fontWeight:600}}>−{fmt(calcActual.aer.ivaAduanaReal)}</span></div>
                        </>)}
                        {/* Saldo F29 */}
                        {form.con_iva&&(
                          <div style={{borderTop:"1px dashed #c9a05530",paddingTop:6,marginTop:6,display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600}}>
                            <span style={{color:"#0f172a"}}>Saldo F29 ({calcActual.saldoF29>=0?"a pagar SII":"a favor — recupera"})</span>
                            <span style={{color:calcActual.saldoF29>=0?"#c0392b":"#1aa358"}}>{calcActual.saldoF29>=0?"+":""}{fmt(calcActual.saldoF29)}</span>
                          </div>
                        )}
                        <div style={{borderTop:"1px solid #c9a05530",paddingTop:8,marginTop:6,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700}}>
                          <span style={{color:"#0f172a"}}>GANANCIA REAL {form.con_iva?"(IVA neutro F29)":"(IVA pagado no recuperable)"}</span>
                          <span style={{color:calcActual.ganImpConIva>=0?"#1aa358":"#c0392b",fontSize:16}}>{fmt(calcActual.ganImpConIva)}</span>
                        </div>
                        {form.con_iva&&(
                          <div style={{fontSize:10,color:"#64748b",marginTop:6,fontStyle:"italic"}}>
                            💡 IVA es <strong>neutro</strong> con factura: lo cobrás al cliente y lo recuperás vía F29. Ganancia real = ganancia operacional.
                          </div>
                        )}
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
                      <METRIC label="ROI sobre costo neto" value={fmtP(calcActual.roi)} color="#1aa358"/>
                      <METRIC label="Multiplicador" value={isNaN(calcActual.mult)||!calcActual.mult?"—":`${calcActual.mult.toFixed(2)}×`} color="#1aa358"/>
                    </div>
                    <div style={{background:"#040c18",borderRadius:10,padding:"16px 18px",border:"none"}}>
                      <div style={{borderTop:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,color:"#e2e8f0",fontWeight:600}}>GANANCIA TOTAL ESTIMADA</span><span style={{fontSize:26,fontWeight:800,color:"#c9a055"}}>{fmt(calcActual.ganImp)}</span></div>
                    </div>
                  </div>
                )}

                {/* ── PANEL VERIFICACIÓN AÉREO — desglose paso a paso ── */}
                {form.tipo==="cliente"&&calcActual.isAereo&&calcActual.aer&&(()=>{
                  const c=calcActual, aer=c.aer;
                  // Caja in (cobrado al cliente)
                  const ivaProducto = c.tCl * 0.19;
                  const ivaAduCl   = c.cdaCl * 0.19;
                  const ivaServ    = c.serv * 0.19;
                  const cajaIn = c.tCl + ivaProducto + c.cdaCl + ivaAduCl + c.serv + ivaServ;
                  // Caja out (pagado)
                  const aChina   = c.tChNeto + c.ivaChina;
                  const aAgencia = aer.aduFijo + aer.arancelReal + aer.ivaAgente;
                  const aSII     = aer.ivaAduanaReal;
                  const cajaOut  = aChina + aAgencia + aSII;
                  // Saldo F29
                  const debitoF29  = ivaProducto + ivaAduCl + ivaServ;
                  const creditoF29 = c.ivaChina + aer.ivaAgente + aer.ivaAduanaReal;
                  const saldoF29   = debitoF29 - creditoF29;
                  // Verificación
                  const cajaInmediata = cajaIn - cajaOut;
                  const ganCalculada  = cajaInmediata - saldoF29;
                  const matchOk = Math.abs(ganCalculada - c.ganImp) < 1;
                  return (
                    <div style={{background:"#fff",border:"2px solid #c47830",borderRadius:12,padding:18,marginBottom:16}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,paddingBottom:10,borderBottom:"1px solid #fed7aa"}}>
                        <div style={{fontSize:12,color:"#c47830",fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>🔍 Verificación matemática — Aéreo</div>
                        <div style={{fontSize:11,color:matchOk?"#15803d":"#c0392b",fontWeight:800,background:matchOk?"#f0fdf4":"#fef2f2",border:`1px solid ${matchOk?"#bbf7d0":"#fecaca"}`,borderRadius:20,padding:"3px 12px"}}>
                          {matchOk?"✓ Cuadra":"✗ No cuadra"}
                        </div>
                      </div>
                      {/* Datos base */}
                      <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                        <div style={{fontSize:10,color:"#64748b",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Datos base</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,fontSize:11}}>
                          <div><div style={{color:"#94a3b8",fontSize:9}}>Unidades</div><div style={{fontWeight:700,color:"#0f172a"}}>{fmtN(form.unidades||0)}</div></div>
                          <div><div style={{color:"#94a3b8",fontSize:9}}>Costo China/und</div><div style={{fontWeight:700,color:"#0f172a"}}>{fmt(Number(form.precio_china)||0)}</div></div>
                          <div><div style={{color:"#94a3b8",fontSize:9}}>Venta/und</div><div style={{fontWeight:700,color:"#0f172a"}}>{fmt(c.pCUnd)}</div></div>
                          <div><div style={{color:"#94a3b8",fontSize:9}}>Margen/und</div><div style={{fontWeight:700,color:"#1aa358"}}>{fmt(c.pCUnd-(Number(form.precio_china)||0))}</div></div>
                        </div>
                      </div>
                      {/* CAJA IN */}
                      <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                        <div style={{fontSize:10,color:"#15803d",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>💰 Caja IN — Cobrado al cliente</div>
                        <div style={{fontSize:11}}>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:"#475569"}}>Mercadería neta ({fmtN(form.unidades||0)} × {fmt(c.pCUnd)})</span><span style={{fontWeight:600}}>{fmt(c.tCl)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:"#475569"}}>+ IVA mercadería 19%</span><span style={{fontWeight:600}}>{fmt(ivaProducto)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:"#475569"}}>+ Gestión aduanera neta</span><span style={{fontWeight:600}}>{fmt(c.cdaCl)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:"#475569"}}>+ IVA aduana 19%</span><span style={{fontWeight:600}}>{fmt(ivaAduCl)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:"#475569"}}>+ Servicio ZAGA neto ({form.pct_servicio||6}%)</span><span style={{fontWeight:600}}>{fmt(c.serv)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:"#475569"}}>+ IVA servicio 19%</span><span style={{fontWeight:600}}>{fmt(ivaServ)}</span></div>
                          <div style={{borderTop:"1px solid #bbf7d0",marginTop:5,paddingTop:5,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,color:"#15803d"}}>Total caja in</span><span style={{fontWeight:800,color:"#15803d",fontSize:13}}>{fmt(cajaIn)}</span></div>
                        </div>
                      </div>
                      {/* CAJA OUT */}
                      <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                        <div style={{fontSize:10,color:"#dc2626",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>💸 Caja OUT — Pagado por ZAGA</div>
                        <div style={{fontSize:11}}>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:"#475569"}}>A China: producto {fmt(c.tChNeto)}{form.requiere_factura?` + IVA ${fmt(c.ivaChina)}`:""}</span><span style={{fontWeight:600}}>{fmt(aChina)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:"#475569"}}>A Agencia Aduana: {fmt(aer.aduFijo)}{aer.arancelReal>0?` + arancel ${fmt(aer.arancelReal)}`:""} + IVA {fmt(aer.ivaAgente)}</span><span style={{fontWeight:600}}>{fmt(aAgencia)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:"#475569"}}>Al SII: IVA aduana 19% × CIF real</span><span style={{fontWeight:600}}>{fmt(aSII)}</span></div>
                          <div style={{borderTop:"1px solid #fecaca",marginTop:5,paddingTop:5,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,color:"#dc2626"}}>Total caja out</span><span style={{fontWeight:800,color:"#dc2626",fontSize:13}}>{fmt(cajaOut)}</span></div>
                        </div>
                      </div>
                      {/* CAJA INMEDIATA */}
                      <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 12px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:700,color:"#854d0e"}}>= Caja inmediata (in − out)</span>
                        <span style={{fontSize:14,fontWeight:800,color:cajaInmediata>=0?"#15803d":"#dc2626"}}>{fmt(cajaInmediata)}</span>
                      </div>
                      {/* F29 */}
                      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                        <div style={{fontSize:10,color:"#1d4ed8",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>📋 F29 — mes siguiente</div>
                        <div style={{fontSize:11}}>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}><span style={{color:"#475569"}}>Débito IVA (cobrado al cliente)</span><span style={{fontWeight:600,color:"#dc2626"}}>+{fmt(debitoF29)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}><span style={{color:"#475569"}}>Crédito IVA China</span><span style={{fontWeight:600,color:"#15803d"}}>−{fmt(c.ivaChina)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}><span style={{color:"#475569"}}>Crédito IVA agente</span><span style={{fontWeight:600,color:"#15803d"}}>−{fmt(aer.ivaAgente)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}><span style={{color:"#475569"}}>Crédito IVA aduana</span><span style={{fontWeight:600,color:"#15803d"}}>−{fmt(aer.ivaAduanaReal)}</span></div>
                          <div style={{borderTop:"1px solid #bfdbfe",marginTop:5,paddingTop:5,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,color:"#1d4ed8"}}>Saldo F29 ({saldoF29>=0?"a pagar SII":"a favor — recupero"})</span><span style={{fontWeight:800,fontSize:13,color:saldoF29>=0?"#dc2626":"#15803d"}}>{saldoF29>=0?"+":""}{fmt(saldoF29)}</span></div>
                        </div>
                      </div>
                      {/* RESULTADO FINAL */}
                      <div style={{background:matchOk?"#040c18":"#fef2f2",borderRadius:10,padding:"14px 16px",marginTop:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <span style={{fontSize:11,color:matchOk?"#94a3b8":"#dc2626"}}>Caja inmediata − Saldo F29</span>
                          <span style={{fontSize:13,fontWeight:700,color:matchOk?"#c9a055":"#dc2626"}}>{fmt(cajaInmediata)} − ({fmt(saldoF29)}) = {fmt(ganCalculada)}</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${matchOk?"#f5c84444":"#fecaca"}`,paddingTop:10,marginTop:6}}>
                          <span style={{fontSize:13,color:matchOk?"#e2e8f0":"#0f172a",fontWeight:700}}>Ganancia verificada</span>
                          <span style={{fontSize:22,fontWeight:800,color:matchOk?"#c9a055":"#dc2626"}}>{fmt(ganCalculada)}</span>
                        </div>
                        <div style={{fontSize:10,color:matchOk?"#94a3b8":"#dc2626",marginTop:8,fontStyle:"italic",textAlign:"center"}}>
                          {matchOk
                            ? `✓ Coincide con "GANANCIA IMPORTACIÓN" de Tabla 3 (${fmt(c.ganImp)})`
                            : `⚠️ NO coincide con Tabla 3 (${fmt(c.ganImp)}) — diferencia: ${fmt(ganCalculada-c.ganImp)}`}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* BOTONES GUARDAR — fuera del grid, siempre visibles */}
            <div style={{marginTop:16}}>
              {esPaso1&&(
                <div style={{marginBottom:12}}>
                  <div style={{background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:10,padding:"12px 16px",marginBottom:10}}>
                    <div style={{fontSize:11,color:"#334155",fontWeight:700,marginBottom:4}}>📥 PASO 1 — {form.tipo==="propia"?"Registrar importación propia":"Registrar solicitud del cliente"}</div>
                    <div style={{fontSize:11,color:"#64748b",lineHeight:1.5}}>¿China aún no te ha respondido el precio? Guarda la solicitud ahora con el link y las variantes. Cuando China responda, editas y agregas el precio para calcular todo.</div>
                  </div>
                  <button onClick={handleSaveSolicitud} style={{width:"100%",background:"#ffffff",border:"2px solid #040c18",borderRadius:10,padding:12,fontSize:13,fontWeight:700,color:"#040c18",cursor:"pointer"}}>
                    📥 Guardar Solicitud (sin precio) - Genera resumen para China
                  </button>
                </div>
              )}
              {!esPaso1&&(
                <button onClick={handleSave} style={{width:"100%",background:"#040c18",border:"none",borderRadius:10,padding:14,fontSize:15,fontWeight:700,color:"#fff",cursor:"pointer"}}>
                  {editId?"💾 Actualizar cotización completa":"✅ Guardar cotización con precios"}
                </button>
              )}
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
              {[["Total",cotizaciones.length,"#0f172a"],["Clientes",cotizaciones.filter(c=>c.tipo!=="propia").length,"#1aa358"],["Propias",cotizaciones.filter(c=>c.tipo==="propia").length,"#3d7fc4"],["En tránsito",cotizaciones.filter(c=>["pagada","en_camino"].includes(c.estado)).length,"#c47830"],["Completadas",cotizaciones.filter(c=>c.estado==="completada").length,"#0d9870"]].map(([l,v,col])=>(
                <div key={l} style={{background:"#f1f5f9",borderRadius:10,padding:"12px 14px",border:"1px solid #e2e8f0",textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:col}}>{v}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{l}</div></div>
              ))}
            </div>
            {(()=>{
              // Ordenar clientes por cantidad de cotizaciones (descendente)
              const clientesConCount = clientesUnicos.map(cl => ({
                key: cl,
                label: cl,
                count: cotizaciones.filter(c=>c.cliente===cl).length,
              })).filter(c => c.count > 0).sort((a,b) => b.count - a.count);
              const TOP_N = 5;
              const topClientes = clientesConCount.slice(0, TOP_N);
              const otrosClientes = clientesConCount.slice(TOP_N);
              const otrosCotsTotal = otrosClientes.reduce((s,c)=>s+c.count, 0);
              const filtroEnOtros = otrosClientes.some(c => c.key === filterCliente);

              const chipStyle = (activo, esTop) => ({
                background: activo ? "#1aa35822" : (esTop ? "#fef9c3" : "#f8fafc"),
                color: activo ? "#1aa358" : (esTop ? "#854d0e" : "#666"),
                border: `1px solid ${activo ? "#22c55e55" : (esTop ? "#fde68a" : "#e2e8f0")}`,
                borderRadius: 20, padding: "5px 14px", fontSize: 12, cursor: "pointer",
                fontWeight: activo ? 700 : (esTop ? 600 : 400),
              });

              return (
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                  {/* Fila 1: Todos + Propias + Top clientes */}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>👤 Cliente</span>
                    <button key="todos" onClick={()=>setFilterCliente("todos")} style={chipStyle(filterCliente==="todos", false)}>
                      Todos <span style={{opacity:.6}}>({cotizaciones.length})</span>
                    </button>
                    <button key="__propias__" onClick={()=>setFilterCliente("__propias__")} style={chipStyle(filterCliente==="__propias__", false)}>
                      🏠 Propias <span style={{opacity:.6}}>({cotizaciones.filter(c=>c.tipo==="propia").length})</span>
                    </button>
                    {topClientes.map((c, idx) => (
                      <button key={c.key} onClick={()=>setFilterCliente(c.key)} style={chipStyle(filterCliente===c.key, idx<3)}>
                        {idx<3 && "⭐ "}{c.label} <span style={{opacity:.6}}>({c.count})</span>
                      </button>
                    ))}
                    {otrosClientes.length > 0 && (
                      <button onClick={()=>setMostrarOtrosClientes(!mostrarOtrosClientes)} style={{
                        background: filtroEnOtros ? "#1aa35822" : (mostrarOtrosClientes ? "#eef6ff" : "#f8fafc"),
                        color: filtroEnOtros ? "#1aa358" : (mostrarOtrosClientes ? "#2d78c8" : "#64748b"),
                        border: `1px solid ${filtroEnOtros ? "#22c55e55" : (mostrarOtrosClientes ? "#bfdbfe" : "#e2e8f0")}`,
                        borderRadius: 20, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600,
                      }}>
                        {mostrarOtrosClientes ? "▴" : "▾"} Otros {otrosClientes.length} clientes <span style={{opacity:.6}}>({otrosCotsTotal} cots)</span>
                      </button>
                    )}
                  </div>
                  {/* Fila 2: dropdown con "otros" (oculto por defecto) */}
                  {mostrarOtrosClientes && otrosClientes.length > 0 && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",paddingLeft:80,paddingTop:4,paddingBottom:4,borderLeft:"2px solid #e2e8f0",marginLeft:14}}>
                      {otrosClientes.map(c => (
                        <button key={c.key} onClick={()=>setFilterCliente(c.key)} style={chipStyle(filterCliente===c.key, false)}>
                          {c.label} <span style={{opacity:.6}}>({c.count})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
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
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🚢 Transporte</span>
              {[["todos","Todos",null],["maritimo","🚢 Marítimo","#2d78c8"],["aereo","✈️ Aéreo","#c47830"]].map(([k,l,col])=>{
                const cnt=k==="todos"?cotizaciones.length:k==="aereo"?cotizaciones.filter(c=>c.transporte==="aereo").length:cotizaciones.filter(c=>!c.transporte||c.transporte==="maritimo"||c.transporte==="ambos").length;
                return(
                  <button key={k} onClick={()=>setFilterTransporte(k)} style={{
                    background:filterTransporte===k?(col||"#c9a055")+"22":"#f8fafc",
                    color:filterTransporte===k?(col||"#c9a055"):"#666",
                    border:`1px solid ${filterTransporte===k?(col||"#c9a055")+"55":"#e2e8f0"}`,
                    borderRadius:20,padding:"5px 14px",fontSize:12,cursor:"pointer",
                    fontWeight:filterTransporte===k?700:400
                  }}>{l} <span style={{opacity:.6}}>({cnt})</span></button>
                );
              })}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>📋 Estado</span>
              {[["todos","Todos",null],...Object.entries(EST_LABEL).map(([k,l])=>[k,l,EST_COLOR[k]])].map(([k,l,col])=>{
                // Base filtrada por cliente + gestor + transporte + búsqueda (sin filtro de estado) para conteos precisos
                const baseParaConteo=cotizaciones.filter(c=>{
                  if(c.id===openId) return false; // no contar el abierto doble
                  const passCliente=filterCliente==="todos"||(filterCliente==="__propias__"?c.tipo==="propia":c.cliente===filterCliente);
                  const passGestor=filterGestor==="todos"||c.gestor===filterGestor||(filterGestor==="francisco"&&!c.gestor);
                  const passTransporte=filterTransporte==="todos"||c.transporte===filterTransporte||(filterTransporte==="maritimo"&&(!c.transporte||c.transporte==="ambos"));
                  const q=searchQuery.trim().toLowerCase();
                  const passSearch=!q||(c.nro&&c.nro.toString().toLowerCase().includes(q))||(c.cliente&&c.cliente.toLowerCase().includes(q))||(c.producto&&c.producto.toLowerCase().includes(q));
                  return passCliente&&passGestor&&passTransporte&&passSearch;
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
                  if(dias>90) alertas.push({nivel:"critico",ico:"🚨",titulo:`${c.nro} — ${c.producto}`,msg:`${dias} días en tránsito sin llegar a Chile (límite: 90d)`,id:c.id,accion:"gestionar",alertKey:`${c.id}_transito`});
                  else if(dias>75) alertas.push({nivel:"warning",ico:"⚠️",titulo:`${c.nro} — ${c.producto}`,msg:`${dias} días en tránsito — se acerca al límite de 90d`,id:c.id,accion:"gestionar",alertKey:`${c.id}_transito_warn`});
                }

                // 2. Fecha de llegada estimada vencida y no llegó
                if(c.fecha_llegada_est&&!c.fecha_llegada_real&&c.checklist?.pago_china){
                  const diasAtraso=Math.round((hoy-new Date(c.fecha_llegada_est))/(1000*60*60*24));
                  if(diasAtraso>0) alertas.push({nivel:"critico",ico:"📅",titulo:`${c.nro} — ${c.producto}`,msg:`Llegada estimada vencida hace ${diasAtraso} día${diasAtraso!==1?"s":""} (${c.fecha_llegada_est})`,id:c.id,accion:"gestionar",alertKey:`${c.id}_atraso`});
                }

                // 3. Cotización enviada al cliente sin respuesta > 7 días
                if(c.estado==="cotizada"&&c.fecha_solicitud){
                  const diasEspera=Math.round((hoy-new Date(c.fecha_solicitud))/(1000*60*60*24));
                  if(diasEspera>7) alertas.push({nivel:"warning",ico:"👤",titulo:`${c.nro} — ${c.producto}`,msg:`Sin respuesta del cliente hace ${diasEspera} días (enviada ${c.fecha_solicitud})`,id:c.id,accion:"gestionar",alertKey:`${c.id}_sin_respuesta`});
                }

                // 4. Mercadería en bodega con 2do pago cliente pendiente
                if(c.estado==="en_bodega"&&!c.checklist?.pago2_cliente&&c.tipo!=="propia"){
                  alertas.push({nivel:"warning",ico:"💰",titulo:`${c.nro} — ${c.cliente||c.producto}`,msg:`Mercadería en bodega con 2do pago cliente pendiente de cobrar (${fmt(c.calc?.p2Cl)})`,id:c.id,accion:"gestionar",alertKey:`${c.id}_pago2`});
                }

                // 5. (removida) alerta "pendiente crear producto en sistema fulfillment" — no se usaba

                // 6. Negociación con propuestas pendientes > 5 días
                const ESTADOS_TERMINALES=["completada","no_prospero"];
                const pendientes=(c.negociacion_rondas||[]).filter(r=>r.estado==="pendiente");
                if(pendientes.length>0&&c.estado==="cotizada"){
                  const ultima=pendientes[pendientes.length-1];
                  const diasNeg=Math.round((hoy-new Date(ultima.fecha))/(1000*60*60*24));
                  if(diasNeg>5) alertas.push({nivel:"info",ico:"🤝",titulo:`${c.nro} — ${c.producto}`,msg:`Propuesta de negociación enviada hace ${diasNeg} días sin respuesta de China`,id:c.id,accion:"gestionar",alertKey:`${c.id}_negociacion`});
                }

                // 7. Primer pago recibido pero sin dimensiones ingresadas
                const tienePrimerPago=c.checklist?.pago1_cliente||c.checklist?.pago_china;
                const sinDimensiones=!c.dim_largo||!c.dim_ancho||!c.dim_alto;
                const sinCajas=c.dim_tipo==="caja"&&!c.dim_und_caja;
                const activa=!["completada","no_prospero"].includes(c.estado);
                if(tienePrimerPago&&activa&&(sinDimensiones||sinCajas)){
                  const que=sinDimensiones?"dimensiones (L×A×H)":"unidades por caja";
                  alertas.push({nivel:"info",ico:"📐",titulo:`${c.nro} — ${c.cliente||c.producto}`,msg:`Pago recibido pero sin ${que} — proyección M³ incompleta`,id:c.id,accion:"dimensiones",alertKey:`${c.id}_dimensiones`});
                }

                // 8. Nota nueva del agente China sin leer
                if(c.nota_china_nueva&&Array.isArray(c.notas_china_historial)&&c.notas_china_historial.length>0){
                  const ultima=c.notas_china_historial[c.notas_china_historial.length-1];
                  const preview=ultima?.texto?.length>70?ultima.texto.slice(0,70)+"...":ultima?.texto||"";
                  alertas.push({nivel:"critico",ico:"🇨🇳",titulo:`${c.nro} — ${c.producto}`,msg:`El agente China dejó una nota: "${preview}"`,id:c.id,accion:"gestionar",alertKey:`${c.id}_china_nota`});
                }

                // 9. Cliente dejó notas sin leer por admin
                const notasCliArr=Array.isArray(c.notas_cliente_historial)?c.notas_cliente_historial:[];
                const noLeidasCli=notasCliArr.filter(n=>n.autor==="cliente"&&!n.leida_por_admin);
                if(noLeidasCli.length>0){
                  const ultCli=noLeidasCli[noLeidasCli.length-1];
                  const prevCli=ultCli?.texto?.length>70?ultCli.texto.slice(0,70)+"...":ultCli?.texto||"";
                  alertas.push({nivel:"info",ico:"💬",titulo:`${c.nro} — ${c.cliente||c.producto}`,msg:`Cliente dejó ${noLeidasCli.length} nota${noLeidasCli.length!==1?"s":""} sin leer: "${prevCli}"`,id:c.id,accion:"gestionar",alertKey:`${c.id}_cliente_nota`});
                }
              });

              if(alertas.length===0) return null;

              const alertasFiltradas=alertas.filter(a=>!alertasLeidas.has(a.alertKey));
              if(alertasFiltradas.length===0) return(
                <div style={{marginBottom:20,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:16}}>✅</span>
                  <span style={{fontSize:13,color:"#16a34a",fontWeight:600}}>Sin alertas activas — todas marcadas como leídas</span>
                  <button onClick={()=>{ setAlertasLeidas(new Set()); localStorage.removeItem("zaga_alertas_leidas"); }} style={{marginLeft:"auto",background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"4px 12px",fontSize:11,cursor:"pointer"}}>Restablecer</button>
                </div>
              );

              const criticas=alertasFiltradas.filter(a=>a.nivel==="critico");
              const warnings=alertasFiltradas.filter(a=>a.nivel==="warning");
              const infos=alertasFiltradas.filter(a=>a.nivel==="info");

              const marcarLeida=(key)=>{
                const nuevas=new Set(alertasLeidas);
                nuevas.add(key);
                setAlertasLeidas(nuevas);
                try{ localStorage.setItem("zaga_alertas_leidas",JSON.stringify([...nuevas])); }catch(e){}
              };

              return(
                <div style={{marginBottom:20,background:"#fff1f2",border:"1px solid #fecdd3",borderRadius:12,overflow:"hidden"}}>
                  <div style={{padding:"12px 18px",background:"#fef2f2",borderBottom:"1px solid #fecdd3",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:16}}>🔔</span>
                      <span style={{fontWeight:700,fontSize:13,color:"#c0392b"}}>Centro de Alertas</span>
                      <span style={{fontSize:12,color:"#64748b"}}>—</span>
                      <span style={{fontSize:12,color:"#64748b"}}>{alertasFiltradas.length} alerta{alertasFiltradas.length!==1?"s":""} activa{alertasFiltradas.length!==1?"s":""}</span>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {criticas.length>0&&<span style={{background:"#ef444422",color:"#c0392b",border:"1px solid #ef444444",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>🚨 {criticas.length} crítica{criticas.length!==1?"s":""}</span>}
                      {warnings.length>0&&<span style={{background:"#b8922e22",color:"#b8922e",border:"1px solid #f59e0b44",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>⚠️ {warnings.length} aviso{warnings.length!==1?"s":""}</span>}
                      {infos.length>0&&<span style={{background:"#2d78c822",color:"#2d78c8",border:"1px solid #3b82f644",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>ℹ️ {infos.length} info</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {alertasFiltradas.map((a,i)=>{
                      const cfg={
                        critico:{bg:"#1a0a0a",border:"#c0392b33",icon_bg:"#ef444422",color:"#c0392b"},
                        warning:{bg:"#12160a",border:"#b8922e33",icon_bg:"#b8922e22",color:"#b8922e"},
                        info:{bg:"#0a1020",border:"#2d78c833",icon_bg:"#2d78c822",color:"#2d78c8"},
                      }[a.nivel];
                      return(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px",background:cfg.bg,borderBottom:i<alertasFiltradas.length-1?`1px solid ${cfg.border}`:"none"}}>
                          <div style={{width:32,height:32,borderRadius:8,background:cfg.icon_bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{a.ico}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:700,color:cfg.color,marginBottom:2}}>{a.titulo}</div>
                            <div style={{fontSize:11,color:"#64748b"}}>{a.msg}</div>
                          </div>
                          <div style={{display:"flex",gap:6,flexShrink:0}}>
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
                                setTimeout(()=>{
                                  const el=document.getElementById(`card-${a.id}`);
                                  if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
                                },300);
                              } else {
                                setPreviewId(a.id);
                              }
                            }} style={{background:cfg.icon_bg,color:cfg.color,border:`1px solid ${cfg.border}`,borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
                              {a.accion==="dimensiones"?"📐 Completar →":a.accion==="gestionar"?"Gestionar →":"Ver →"}
                            </button>
                            <button onClick={()=>marcarLeida(a.alertKey)} title="Marcar como leída" style={{background:"#ffffff10",color:"#64748b",border:"1px solid #ffffff15",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
                              ✓ Leída
                            </button>
                          </div>
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
                const notasCliNoLeidas=Array.isArray(c.notas_cliente_historial)?c.notas_cliente_historial.filter(n=>n.autor==="cliente"&&!n.leida_por_admin).length:0;
                const TL_CLIENTE=["solicitud","cotizada","pagada","en_camino","en_bodega","completada"];
                const TL_PROPIA=["solicitud","cotizada","pagada","en_camino","en_bodega","completada"];
                const tlSteps=isPropia?TL_PROPIA:TL_CLIENTE;
                const tlIdx=c.estado==="no_prospero"?0:Math.max(0,tlSteps.indexOf(c.estado));
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
                          {getImagenes(c.imagen_url)[0]&&<img src={proxyImg(getImagenes(c.imagen_url)[0])} alt={c.producto} referrerPolicy="no-referrer" onError={e=>{e.target.style.display='none'}} style={{width:90,height:90,objectFit:"cover",borderRadius:10,border:"1px solid #e2e8f0",float:"right",marginLeft:12,marginBottom:6}}/>}
                          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                            {isPropia?<span style={{background:"#3d7fc422",color:"#3d7fc4",border:"1px solid #8b5cf644",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>🏠 PROPIA</span>:<span style={{fontWeight:700,fontSize:15}}>{c.cliente}</span>}
                            {!isPropia&&c.categoria_cliente==="premium"&&<span style={{background:"#c9a05522",color:"#c9a055",border:"1px solid #f5c84244",borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700}}>⭐ Premium</span>}
                            {!isPropia&&c.categoria_cliente==="recurrente"&&<span style={{background:"#22c55e18",color:"#1aa358",border:"1px solid #22c55e33",borderRadius:20,padding:"2px 9px",fontSize:10}}>🔄 Recurrente</span>}
                            {!isPropia&&(!c.categoria_cliente||c.categoria_cliente==="nuevo")&&<span style={{background:"#06b6d418",color:"#2a8aaa",border:"1px solid #06b6d433",borderRadius:20,padding:"2px 9px",fontSize:10}}>🆕 Nuevo</span>}
                            {c.transporte==="aereo"&&<span style={{background:"#c4783022",color:"#f97416",border:"1px solid #f9741633",borderRadius:20,padding:"2px 9px",fontSize:10}}>✈️ Aéreo</span>}
                            {c.transporte==="ambos"&&<span style={{background:"#3d7fc422",color:"#3d7fc4",border:"1px solid #8b5cf633",borderRadius:20,padding:"2px 9px",fontSize:10}}>🚢✈️ Ambos</span>}
                            {(!c.transporte||c.transporte==="maritimo")&&!isPropia&&<span style={{background:"#2d78c818",color:"#2d78c8",border:"1px solid #2d78c833",borderRadius:20,padding:"2px 9px",fontSize:10}}>🚢 Marítimo</span>}
                            {c.gestor==="luisa"&&<span style={{background:"#a8559022",color:"#a85590",border:"1px solid #ec489933",borderRadius:20,padding:"2px 9px",fontSize:10}}>👩‍💼 Luisa</span>}
                            <span style={{fontSize:11,color:"#64748b"}}>{c.nro}</span>
                            <span style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{sl}</span>
                            {diasLL!==null&&c.checklist?.pago_china&&!c.fecha_llegada_real&&<span style={{background:"#f9741618",color:"#c47830",border:"1px solid #f9741633",borderRadius:20,padding:"2px 10px",fontSize:11}}>{diasLL>0?`🚢 ${diasLL}d`:diasLL===0?"¡Llega hoy!":`⚠️ ${Math.abs(diasLL)}d tarde`}</span>}
                            {c.estado==="cotizada"&&(c.negociacion_rondas||[]).length>0&&<span style={{background:"#b8922e22",color:"#b8922e",border:"1px solid #f59e0b44",borderRadius:20,padding:"2px 10px",fontSize:11}}>🤝 {(c.negociacion_rondas||[]).filter(r=>r.estado==="pendiente").length} propuesta{(c.negociacion_rondas||[]).filter(r=>r.estado==="pendiente").length!==1?"s":""} pendiente{(c.negociacion_rondas||[]).filter(r=>r.estado==="pendiente").length!==1?"s":""}</span>}
                            {c.checklist?.pago1_cliente&&c.fecha_pago1_cliente&&<span style={{background:"#0d987018",color:"#0d9870",border:"1px solid #1aa35844",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>✅ {c.pago_100?"Pago único":"Pago 1"} · {fmtFechaCorta(c.fecha_pago1_cliente)}</span>}
                            {c.pago_100&&<span style={{background:"#c9a05522",color:"#c9a055",border:"1px solid #f5c84244",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>💰 PAGO 100%</span>}
                            {notasCliNoLeidas>0&&<span style={{background:"#c0392b22",color:"#c0392b",border:"1px solid #ef444444",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>💬 {notasCliNoLeidas}</span>}
                          </div>
                          <div style={{color:"#64748b",fontSize:13,marginBottom:2}}>{c.producto} · {fmtN(c.unidades)} und</div>
                          {(c.sku_china||c.sku_bodega)&&(
                            <div style={{fontSize:11,marginBottom:2}}>
                              {c.sku_china&&<span style={{color:"#b8922e"}}>🏷 SKU China: <b>{c.sku_china}</b></span>}
                              {c.sku_china&&c.sku_bodega&&<span style={{color:"#64748b"}}> · </span>}
                              {c.sku_bodega&&<span style={{color:"#3d7fc4"}}>📦 Bodega: <b>{c.sku_bodega}</b></span>}
                            </div>
                          )}
                          {c.material_china&&(
                            <div style={{fontSize:11,marginBottom:2,color:"#64748b"}}>🧪 Material: <b style={{color:"#475569"}}>{c.material_china}</b></div>
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
                              <div style={{height:"100%",background:`linear-gradient(to right,${EST_COLOR[tlSteps[0]]||"#6a9fd4"},${EST_COLOR[c.estado]||"#1aa358"})`,borderRadius:4,width:(c.estado==="no_prospero"||c.estado==="no_prospero"||c.estado==="no_prospero")?"0%":`${(tlProg.done/tlProg.total)*100}%`,transition:"width .4s"}}/>
                            </div>
                            <span style={{fontSize:11,color:(c.estado==="no_prospero"||c.estado==="no_prospero"||c.estado==="no_prospero")?"#c0392b":EST_COLOR[c.estado]||"#555",fontWeight:600,whiteSpace:"nowrap"}}>
                              {(c.estado==="no_prospero"||c.estado==="no_prospero"||c.estado==="no_prospero")?"🚫":`${tlProg.done}/${tlProg.total}`}
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
                        <div className="cot-card-meta" style={{display:"grid",gridTemplateColumns:isPropia?"repeat(4,1fr)":c.pago_100?"1fr":"repeat(2,1fr)",gap:8,background:"#f8fafc",borderRadius:9,padding:"10px 14px",marginTop:12}}>
                        {isPropia
                          ? [["Costo total China",fmt(c.calc.tCh||0),"#2d78c8"],["Costo real/und",fmt(c.calc.cRUnd||0),"#2d78c8"],["Precio venta/und",fmt(c.calc.pvUnd||0),"#3d7fc4"],["Margen bruto",fmtP(c.calc.mgBruto),"#475569"]]
                              .map(([l,v,col])=>(<div key={l} style={{textAlign:"center"}}><div style={{fontSize:10,color:"#444",marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:600,color:col}}>{v}</div></div>))
                          : c.pago_100
                          ? (() => {
                              // Cliente = precio acordado c/IVA si existe, sino calc.p1ClIva
                              const totClienteCIva = Number(c.precio_final_acordado_und) > 0 && Number(c.unidades) > 0
                                ? Number(c.precio_final_acordado_und) * Number(c.unidades)
                                : (c.calc.p1ClIva || c.calc.p1Cl || 0);
                              const totChina = c.calc.p1Ch || c.calc.tCh || 0;
                              return (
                                <div style={{background:"#fff",borderRadius:7,padding:"10px 12px",border:"1px solid #f5c84255"}}>
                                  <div style={{fontSize:9,color:"#c9a055",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,fontWeight:700}}>💰 Pago Único (c/IVA)</div>
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                                    <div style={{textAlign:"center",flex:1}}>
                                      <div style={{fontSize:9,color:"#64748b",marginBottom:2}}>Cliente paga</div>
                                      <div style={{fontSize:14,fontWeight:800,color:"#1aa358"}}>{fmt(totClienteCIva)}</div>
                                    </div>
                                    <div style={{width:1,height:30,background:"#e2e8f0"}}/>
                                    <div style={{textAlign:"center",flex:1}}>
                                      <div style={{fontSize:9,color:"#64748b",marginBottom:2}}>Pagado a China</div>
                                      <div style={{fontSize:14,fontWeight:800,color:"#2d78c8"}}>{fmt(totChina)}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
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

                      {/* ── MINI CHAT INLINE ── */}
                      {c.tipo!=="propia"&&(
                        <div style={{marginTop:10}}>
                          {/* Badges para abrir chat */}
                          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                            <button onClick={()=>setChatOpen(p=>({...p,[c.id]:p[c.id]==="cliente"?null:"cliente"}))} style={{
                              display:"flex",alignItems:"center",gap:7,
                              background:chatOpen[c.id]==="cliente"?"#2d78c8":notasCliNoLeidas>0?"#c0392b":"#e8f0fe",
                              color:chatOpen[c.id]==="cliente"||notasCliNoLeidas>0?"#fff":"#2d78c8",
                              border:"none",
                              borderRadius:10,padding:"9px 18px",fontSize:13,fontWeight:800,cursor:"pointer",
                              boxShadow:"0 1px 4px rgba(0,0,0,0.10)",
                              transition:"all .15s",fontFamily:"inherit",
                            }}>
                              💬 Cliente
                              {notasCliNoLeidas>0
                                ? <span style={{background:"rgba(255,255,255,0.25)",color:"#fff",borderRadius:8,padding:"1px 7px",fontSize:11,fontWeight:800}}>{notasCliNoLeidas} sin leer</span>
                                : Array.isArray(c.notas_cliente_historial)&&c.notas_cliente_historial.length>0&&<span style={{background:"rgba(255,255,255,0.30)",color:"#2d78c8",borderRadius:8,padding:"1px 7px",fontSize:10,fontWeight:700}}>{c.notas_cliente_historial.length}</span>
                              }
                            </button>
                            <button onClick={()=>setChatOpen(p=>({...p,[c.id]:p[c.id]==="china"?null:"china"}))} style={{
                              display:"flex",alignItems:"center",gap:7,
                              background:chatOpen[c.id]==="china"?"#b8922e":c.nota_china_nueva?"#c0392b":"#fef3e2",
                              color:chatOpen[c.id]==="china"||c.nota_china_nueva?"#fff":"#b8922e",
                              border:"none",
                              borderRadius:10,padding:"9px 18px",fontSize:13,fontWeight:800,cursor:"pointer",
                              boxShadow:"0 1px 4px rgba(0,0,0,0.10)",
                              transition:"all .15s",fontFamily:"inherit",
                            }}>
                              🇨🇳 China
                              {c.nota_china_nueva
                                ? <span style={{background:"rgba(255,255,255,0.25)",color:"#fff",borderRadius:8,padding:"1px 7px",fontSize:11,fontWeight:800}}>nueva</span>
                                : Array.isArray(c.notas_china_historial)&&c.notas_china_historial.length>0&&<span style={{background:"rgba(255,255,255,0.30)",color:"#b8922e",borderRadius:8,padding:"1px 7px",fontSize:10,fontWeight:700}}>{c.notas_china_historial.length}</span>
                              }
                            </button>
                          </div>

                          {/* Panel chat cliente */}
                          {chatOpen[c.id]==="cliente"&&(
                            <div style={{marginTop:8,background:"#f8fbff",border:"1px solid #bfdbfe",borderRadius:10,padding:"12px 14px"}}>
                              <div style={{fontSize:10,fontWeight:700,color:"#2d78c8",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>💬 Chat con {c.cliente||"cliente"}</div>
                              {(()=>{
                                var tsOf=function(s){if(!s)return 0;var d=new Date(s);if(!isNaN(d.getTime()))return d.getTime();var m=s.match(/(\d+)\s+(\w+)\s+(\d+)/);if(m){var mes={ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11}[m[2].toLowerCase()];if(mes!==undefined)return new Date(Number(m[3]),mes,Number(m[1])).getTime();}return 0;};
                                var notasEq=(c.notas_historial||[]).filter(function(n){return !n.oculta;}).map(function(n,i){return{_k:"ne"+i,texto:n.texto,fecha:n.fecha,autor:"admin",autorNombre:n.autor||"ZAGA",ts:tsOf(n.fecha)||i};});
                                var chatMs=(c.notas_cliente_historial||[]).map(function(n,i){return Object.assign({},n,{_k:"cm"+i,ts:tsOf(n.fecha)||(Date.now()+i)});});
                                var todos=[].concat(notasEq,chatMs).sort(function(a,b){return a.ts-b.ts;}).slice(-8);
                                if(todos.length===0) return <div style={{fontSize:11,color:"#94a3b8",textAlign:"center",padding:"10px 0",marginBottom:8}}>Sin mensajes aún.</div>;
                                return (
                                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10,maxHeight:240,overflowY:"auto"}}>
                                    {todos.map(function(nota){
                                      var esAdmin=nota.autor==="admin";
                                      var esNoLeida=nota.autor==="cliente"&&!nota.leida_por_admin;
                                      return(
                                        <div key={nota._k||nota.id} style={{display:"flex",justifyContent:esAdmin?"flex-start":"flex-end"}}>
                                          <div style={{maxWidth:"82%",background:esAdmin?"#e8f5e9":(esNoLeida?"#fef2f2":"#e8f0fe"),border:"1px solid "+(esAdmin?"#a5d6a7":(esNoLeida?"#fecdd3":"#c7d7fb")),borderLeft:esAdmin?"3px solid #16a34a":"none",borderRight:esAdmin?"none":"3px solid #2d78c8",borderRadius:esAdmin?"0 8px 8px 8px":"8px 0 8px 8px",padding:"8px 11px"}}>
                                            <div style={{fontSize:12,color:"#334155",lineHeight:1.5,whiteSpace:"pre-wrap",marginBottom:3}}>{nota.texto}</div>
                                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                                              <span style={{fontSize:9,fontWeight:700,color:esAdmin?"#16a34a":"#2d78c8"}}>{esAdmin?(nota.autorNombre||"ZAGA →"):(c.cliente||"Cliente")}</span>
                                              <span style={{fontSize:9,color:"#94a3b8"}}>{nota.fecha?new Date(nota.fecha).toLocaleDateString("es-CL",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):""}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              <div style={{display:"flex",gap:6}}>
                                <textarea value={notaClienteInput[c.id]||""} rows={2} maxLength={2000} onChange={e=>setNotaClienteInput(p=>({...p,[c.id]:e.target.value}))} placeholder="Mensaje al cliente..." style={{flex:1,background:"#fff",border:"1px solid #bfdbfe",borderRadius:6,color:"#0f172a",padding:"7px 10px",fontSize:12,outline:"none",resize:"none",boxSizing:"border-box",lineHeight:1.4}}/>
                                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                  {notasCliNoLeidas>0&&(
                                    <button onClick={async()=>{
                                      const h=(c.notas_cliente_historial||[]).map(n=>n.autor==="cliente"?{...n,leida_por_admin:true}:n);
                                      await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,notas_cliente_historial:h}:x));
                                      showToast("✓ Marcados como leídos");
                                    }} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #e2e8f0",borderRadius:6,padding:"5px 10px",fontSize:10,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>✓ Leídos</button>
                                  )}
                                  <button disabled={!(notaClienteInput[c.id]||"").trim()} onClick={async()=>{
                                    const txt=(notaClienteInput[c.id]||"").trim(); if(!txt) return;
                                    const nuevaNota={id:Date.now().toString(),autor:"admin",autorNombre:usuario?.nombre||"ZAGA",texto:txt,fecha:new Date().toISOString(),leida_por_admin:true};
                                    const histPrev=Array.isArray(c.notas_cliente_historial)?c.notas_cliente_historial:[];
                                    // Al responder, admin marca implícitamente como leídas todas las notas previas del cliente
                                    const histLeida=histPrev.map(n=>n.autor==="cliente"?{...n,leida_por_admin:true}:n);
                                    await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,notas_cliente_historial:[...histLeida,nuevaNota]}:x));
                                    setNotaClienteInput(p=>({...p,[c.id]:""}));
                                    showToast("💬 Enviado al cliente");
                                  }} style={{background:(notaClienteInput[c.id]||"").trim()?"#2d78c8":"#e2e8f0",color:(notaClienteInput[c.id]||"").trim()?"#fff":"#94a3b8",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:(notaClienteInput[c.id]||"").trim()?"pointer":"default",fontWeight:700,whiteSpace:"nowrap",fontFamily:"inherit"}}>
                                    ↑ Enviar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Panel chat China */}
                          {chatOpen[c.id]==="china"&&(
                            <div style={{marginTop:8,background:"#fffbeb",border:"1px solid #c9a05540",borderRadius:10,padding:"12px 14px"}}>
                              <div style={{fontSize:10,fontWeight:700,color:"#b8922e",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>🇨🇳 Chat con proveedor</div>
                              {Array.isArray(c.notas_china_historial)&&c.notas_china_historial.length>0?(
                                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10,maxHeight:220,overflowY:"auto"}}>
                                  {c.notas_china_historial.slice(-6).map(function(nota,i,arr){
                                    const esAdmin=nota.autor==="admin";
                                    const esNueva=c.nota_china_nueva&&i===arr.length-1&&!esAdmin;
                                    return(
                                      <div key={nota.id||i} style={{display:"flex",justifyContent:esAdmin?"flex-start":"flex-end"}}>
                                        <div style={{maxWidth:"82%",background:esAdmin?"#fef9ec":(esNueva?"#fef6e4":"#fff8ed"),border:"1px solid "+(esNueva?"#c9a055":"#c9a05540"),borderLeft:esAdmin?"3px solid #c9a055":"none",borderRight:esAdmin?"none":"3px solid #b8922e",borderRadius:esAdmin?"0 8px 8px 8px":"8px 0 8px 8px",padding:"8px 11px"}}>
                                          <div style={{fontSize:12,color:"#334155",lineHeight:1.5,whiteSpace:"pre-wrap",marginBottom:3}}>{nota.texto}</div>
                                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                                            <span style={{fontSize:9,fontWeight:700,color:"#b8922e"}}>{esAdmin?"ZAGA →":"🇨🇳 Proveedor"}</span>
                                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                                              {esNueva&&<span style={{background:"#fdf6e3",color:"#b8922e",fontSize:8,fontWeight:700,borderRadius:3,padding:"1px 5px",border:"1px solid #c9a05540"}}>Nueva</span>}
                                              <span style={{fontSize:9,color:"#94a3b8"}}>{nota.fecha?new Date(nota.fecha).toLocaleDateString("es-CL",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):""}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ):(
                                <div style={{fontSize:11,color:"#94a3b8",textAlign:"center",padding:"10px 0",marginBottom:8}}>Sin mensajes aún.</div>
                              )}
                              <div style={{display:"flex",gap:6}}>
                                <textarea value={notaChinaInput[c.id]||""} rows={2} maxLength={2000} onChange={e=>setNotaChinaInput(p=>({...p,[c.id]:e.target.value}))} placeholder="Mensaje al proveedor..." style={{flex:1,background:"#fff",border:"1px solid #c9a05540",borderRadius:6,color:"#0f172a",padding:"7px 10px",fontSize:12,outline:"none",resize:"none",boxSizing:"border-box",lineHeight:1.4}}/>
                                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                  {c.nota_china_nueva&&(
                                    <button onClick={async()=>{
                                      await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,nota_china_nueva:false}:x));
                                      showToast("✓ Leída");
                                    }} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #e2e8f0",borderRadius:6,padding:"5px 10px",fontSize:10,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>✓ Leída</button>
                                  )}
                                  <button disabled={!(notaChinaInput[c.id]||"").trim()} onClick={async()=>{
                                    const txt=(notaChinaInput[c.id]||"").trim(); if(!txt) return;
                                    const nuevaNota={id:Date.now().toString(),autor:"admin",texto:txt,fecha:new Date().toISOString()};
                                    const hist=Array.isArray(c.notas_china_historial)?c.notas_china_historial:[];
                                    await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,notas_china_historial:[...hist,nuevaNota]}:x));
                                    setNotaChinaInput(p=>({...p,[c.id]:""}));
                                    showToast("🇨🇳 Enviado al proveedor");
                                  }} style={{background:(notaChinaInput[c.id]||"").trim()?"#b8922e":"#e2e8f0",color:(notaChinaInput[c.id]||"").trim()?"#fff":"#94a3b8",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:(notaChinaInput[c.id]||"").trim()?"pointer":"default",fontWeight:700,whiteSpace:"nowrap",fontFamily:"inherit"}}>
                                    ↑ Enviar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                        <button onClick={()=>setPreviewId(c.id)} style={{background:"#f8fafc",color:"#475569",border:"1px solid #e2e8f0",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>👁 Ver</button>
                        {c.estado==="solicitud"&&<button onClick={()=>setResumenChina(c)} style={{background:"#6a9fd422",color:"#334155",border:"1px solid #ddd6fe",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>📋 Resumen China</button>}
                        <button onClick={()=>setOpenId(isOpen?null:c.id)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>{isOpen?"▲ Cerrar":"▼ Gestionar"}</button>
                        {c.transporte==="aereo"&&!isPropia&&<button onClick={async()=>{
                          // Re-fetch fresco de Supabase para que el modal use datos actualizados
                          // (evita ver datos stale si Sunny acaba de editar y el realtime no llegó)
                          let cFresh = c;
                          let opFresh = c.operacion_id ? operaciones.find(o => o.id === c.operacion_id) : null;
                          try {
                            const { data: cotData } = await supabase.from("cotizaciones").select("id,datos").eq("id", c.id).single();
                            if (cotData) {
                              cFresh = {...cotData.datos, id: cotData.id};
                              // También actualizar state local
                              setCotizaciones(prev => prev.map(x => x.id === c.id ? cFresh : x));
                            }
                            if (c.operacion_id) {
                              const { data: opData } = await supabase.from("operaciones").select("id,datos").eq("id", c.operacion_id).single();
                              if (opData) {
                                opFresh = {...opData.datos, id: opData.id};
                                setOperaciones(prev => prev.map(o => o.id === c.operacion_id ? opFresh : o));
                              }
                            }
                          } catch(e) { console.warn("No se pudo refrescar cot/op antes de validar:", e); }
                          setValidarForm({
                            aer_honorarios: cFresh.aer_honorarios ?? 150000,
                            aer_edi: cFresh.aer_edi ?? 15000,
                            aer_despacho: cFresh.aer_despacho ?? 50000,
                            aer_aeropuerto: cFresh.aer_aeropuerto ?? 68000,
                            aer_aforo: cFresh.aer_aforo ?? 48000,
                            incluir_aforo: cFresh.incluir_aforo !== false,
                            transp_interno_cl: Number(cFresh.transp_interno_cl) || 0,
                            agencia: Number(cFresh.agencia) || 0,
                            margen_obj_pct: Number(cFresh.margen_obj_pct) || 25,
                            precio_acordado_und: Number(cFresh.precio_final_acordado_und) || 0,
                            tc_rmb_usd: Number(opFresh?.tc_rmb_usd ?? cFresh.tc_rmb_usd) || 7.03,
                            tc_usd_clp: Number(opFresh?.tc_usd_clp ?? opFresh?.pago?.tc_efectivo ?? cFresh.tc_usd_clp ?? cFresh?.pago?.tc_efectivo) || 950,
                          });
                          setVistaValidarId(cFresh.id);
                        }} style={{background:"#c4783022",color:"#c47830",border:"1px solid #c4783055",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",fontWeight:700}}>🛬 Validar</button>}
                        {!isPropia&&<button onClick={()=>setVistaId(c.id)} style={{background:"#2a8aaa22",color:"#2a8aaa",border:"1px solid #06b6d433",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>📄 Vista cliente</button>}
                        {c.transporte !== "aereo" && (
                          <button onClick={()=>handleEdit(c)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>✏️ Editar</button>
                        )}
                        <button onClick={()=>handleDelete(c.id)} style={{background:"#fff1f2",color:"#c0392b",border:"1px solid #ef444433",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>🗑</button>
                      </div>
                    </div>
                    {isOpen&&<CardErrorBoundary>{(()=>{
                      const CHKL_LABELS={enviado_china:"Enviado a China para cotizar",china_cotizo:"China respondió cotización",cot_enviada:"Cotización enviada al cliente",cliente_acepto:"Cliente aceptó",pago1_cliente:"1er pago recibido del cliente",factura1:"Factura 1er pago emitida",pago_china:"Pago a China realizado",en_produccion:"En proceso de producción",almacen_china:"Ingreso en almacén de China",ctrl_calidad:"Control de calidad en China OK",despachado:"Despachado desde China",llego_chile:"Llegó a Chile",retirado_bodega:"Retirado a mi bodega",pago2_cliente:"2do pago recibido del cliente",factura2:"Factura 2do pago emitida",en_venta:"Producto en venta / publicado",vendido_50:"50% vendido",vendido_100:"100% vendido"};
                      const CLIENTE_STEPS=[
                        {estado:"solicitud",  icon:"📝",label:"Solicitud / esperando China",  color:"#6a9fd4",checks:[]},
                        {estado:"cotizada",   icon:"💬",label:"Cotizada al cliente",          color:"#2d78c8",checks:[],special:"decision"},
                        {estado:"pagada",     icon:"💰",label:"Pagada / Importando",          color:"#c47830",checks:[]},
                        {estado:"en_camino",  icon:"✈️",label:"En camino",                    color:"#a85590",checks:[]},
                        {estado:"en_bodega",  icon:"🇨🇱",label:"En bodega (disponible)",      color:"#3d7fc4",checks:[]},
                        {estado:"completada", icon:"✓",label:"Completada",                    color:"#0d9870",checks:[]},
                      ];
                      const PROPIA_STEPS=[
                        {estado:"solicitud",  icon:"📝",label:"Solicitud / esperando China",  color:"#6a9fd4",checks:[]},
                        {estado:"cotizada",   icon:"💬",label:"Cotización revisada",          color:"#2d78c8",checks:[]},
                        {estado:"pagada",     icon:"💰",label:"Pagada / Importando",          color:"#c47830",checks:[]},
                        {estado:"en_camino",  icon:"✈️",label:"En camino",                    color:"#a85590",checks:[]},
                        {estado:"en_bodega",  icon:"🇨🇱",label:"En bodega (disponible)",      color:"#3d7fc4",checks:[]},
                        {estado:"completada", icon:"✓",label:"Completada",                    color:"#0d9870",checks:[]},
                      ];
                      const steps=isPropia?PROPIA_STEPS:CLIENTE_STEPS;
                      const curIdx=steps.findIndex(s=>s.estado===c.estado);
                      const isNoProcesada=c.estado==="no_prospero";
                      const isTerminal=isNoProcesada||c.estado==="no_prospero"||c.estado==="no_prospero";
                      return (
                        <div style={{borderTop:"1px solid #e2e8f0",padding:"20px 24px"}}>
                          {/* Botón guardar y sincronizar — fuerza upsert + recarga para todos los portales */}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14,padding:"10px 12px",background:"#040c1808",border:"1px solid #c9a05533",borderRadius:8,flexWrap:"wrap"}}>
                            <div style={{fontSize:11,color:"#475569",lineHeight:1.4,flex:1,minWidth:200}}>
                              <b style={{color:"#0f172a"}}>💡 Tip:</b> los cambios se guardan automáticos, pero si quieres forzar sync en todos los portales (Sunny + cliente), usa este botón.
                            </div>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              {c.estado !== "no_prospero" && (
                                <button onClick={()=>handleMarcarNoProspero(c.id)} style={{background:"#fff1f2",color:"#c0392b",border:"1px solid #fecaca",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
                                  ❌ Marcar no prosperó
                                </button>
                              )}
                              <button onClick={()=>handleGuardarSincronizar(c.id)} style={{background:"#1aa358",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",boxShadow:"0 1px 4px rgba(26,163,88,0.3)"}}>💾 Guardar y sincronizar</button>
                            </div>
                          </div>

                          {/* Aviso ajuste cantidad por empaque (solo si hay diferencia con und_caja) */}
                          {(() => {
                            const u = Number(c.unidades) || 0;
                            const undCaja = Number(c.dim_und_caja) || 0;
                            const esCaja = c.dim_tipo === "caja" || (!c.dim_tipo && undCaja > 0);
                            if (!esCaja || undCaja <= 0 || u <= 0) return null;
                            const nCajas = Math.ceil(u / undCaja);
                            const cantidadReal = nCajas * undCaja;
                            if (cantidadReal === u) return null; // ya está ajustada
                            const extras = cantidadReal - u;
                            return (
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14,padding:"12px 14px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:8,flexWrap:"wrap"}}>
                                <div style={{fontSize:12,color:"#92400e",lineHeight:1.5,flex:1,minWidth:240}}>
                                  📦 <b>Empaque no calza:</b> {u} und ÷ {undCaja} por caja = {nCajas} cajas (necesita {cantidadReal} und, sobran <b>{extras}</b>).<br/>
                                  <span style={{fontSize:11,color:"#a16207"}}>Recomendado: ajustar a {cantidadReal} und para completar la caja. El cliente verá un aviso.</span>
                                </div>
                                <button onClick={()=>handleAjustarCantidad(c.id, cantidadReal, u)} style={{background:"#c47830",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",boxShadow:"0 1px 4px rgba(196,120,48,0.3)"}}>📐 Ajustar a {cantidadReal} und</button>
                              </div>
                            );
                          })()}
                          {c.unidades_originales && Number(c.unidades_originales) !== Number(c.unidades) && (
                            <div style={{padding:"8px 12px",marginBottom:14,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,fontSize:11,color:"#1e40af",lineHeight:1.5}}>
                              ℹ️ <b>Cantidad ajustada al empaque:</b> {c.unidades_originales} und (original) → <b>{c.unidades} und</b> (ajustado el {c.fecha_ajuste_cantidad || "—"}). El cliente recibe aviso del incremento en la cotización.
                            </div>
                          )}
                          {/* Imágenes del producto — multi */}
                          <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",border:"1px solid #e2e8f0",marginBottom:16}}>
                            <div style={{fontSize:10,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🖼️ Imágenes del producto {getImagenes(c.imagen_url).length>0&&<span style={{background:"#e2e8f0",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700,color:"#475569",marginLeft:4}}>{getImagenes(c.imagen_url).length}</span>}</div>
                            {/* Miniaturas existentes */}
                            {getImagenes(c.imagen_url).length>0&&(
                              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
                                {getImagenes(c.imagen_url).map((url,idx)=>(
                                  <div key={idx} style={{position:"relative",width:72,height:72}}>
                                    <img src={proxyImg(url)} referrerPolicy="no-referrer" onError={e=>{e.target.parentNode.style.opacity='.3'}} style={{width:72,height:72,objectFit:"cover",borderRadius:8,border:"1px solid #e2e8f0",display:"block"}}/>
                                    <button onClick={async()=>{
                                      const imgs=getImagenes(c.imagen_url).filter((_,i)=>i!==idx);
                                      await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,imagen_url:imgs.join('|||')}:x));
                                    }} title="Eliminar imagen" style={{position:"absolute",top:-6,right:-6,width:18,height:18,background:"#c0392b",color:"#fff",border:"none",borderRadius:"50%",cursor:"pointer",fontSize:13,lineHeight:"18px",textAlign:"center",padding:0,fontWeight:900}}>×</button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Input agregar nueva */}
                            <div style={{display:"flex",gap:8,alignItems:"center"}}>
                              {newImgInput[c.id]&&<img src={proxyImg(newImgInput[c.id])} referrerPolicy="no-referrer" onError={e=>{e.target.style.display='none'}} style={{width:36,height:36,objectFit:"cover",borderRadius:6,border:"1px solid #e2e8f0",flexShrink:0}}/>}
                              <input
                                value={newImgInput[c.id]||""}
                                onChange={e=>setNewImgInput(p=>({...p,[c.id]:e.target.value}))}
                                onKeyDown={async e=>{
                                  if(e.key==='Enter'&&newImgInput[c.id]?.trim()){
                                    const imgs=[...getImagenes(c.imagen_url),newImgInput[c.id].trim()];
                                    await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,imagen_url:imgs.join('|||')}:x));
                                    setNewImgInput(p=>({...p,[c.id]:""}));
                                  }
                                }}
                                placeholder="Pegar URL de imagen y pulsar Agregar"
                                style={{flex:1,background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:7,color:"#0f172a",padding:"7px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}
                              />
                              <button onClick={async()=>{
                                if(!newImgInput[c.id]?.trim())return;
                                const imgs=[...getImagenes(c.imagen_url),newImgInput[c.id].trim()];
                                await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,imagen_url:imgs.join('|||')}:x));
                                setNewImgInput(p=>({...p,[c.id]:""}));
                              }} style={{background:"#2d78c8",color:"#fff",border:"none",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>➕ Agregar</button>
                            </div>
                            {getImagenes(c.imagen_url).length===0&&<div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>Sin imágenes — pegá la URL y pulsa Agregar</div>}
                          </div>
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
                              const alternativeSteps=["solicitud","cotizada","no_prospero"];
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
                                        let lbl=isFactura?(c.requiere_factura?CHKL_LABELS[key]+" ✱":CHKL_LABELS[key]+" (no req.)"):CHKL_LABELS[key];
                                        if(key==="pago1_cliente"&&c.checklist?.pago1_cliente&&c.fecha_pago1_cliente){
                                          lbl=`✅ Pago 1 recibido · ${fmtFechaCorta(c.fecha_pago1_cliente)}`;
                                        }
                                        return <CheckItem key={key} label={lbl} checked={c.checklist?.[key]||false} onChange={v=>handleCheck(c.id,key,v)} disabled={disabled}/>;
                                      })}
                                    </div>
                                  )}

                                  {/* ── PANEL RESPUESTA CHINA ── */}
                                  {isCurrent&&step.special==="respuesta"&&(
                                    <div style={{marginTop:12,marginBottom:4,background:"#fffbeb",borderRadius:12,padding:16,border:"1px solid #fde68a"}}>
                                      <div style={{fontSize:11,color:"#92400e",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>🇨🇳 ¿Qué respondió China?</div>
                                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                        <button onClick={()=>handleEstado(c.id, isPropia?"pagada":"cotizada")} style={{background:"#1aa35818",color:"#1aa358",border:"1px solid #1aa35844",borderRadius:9,padding:"12px 16px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                                          <span style={{fontSize:20}}>✅</span>
                                          <div><div>Todo OK — continuar</div><div style={{fontSize:10,color:"#1aa35888",fontWeight:400,marginTop:2}}>{isPropia?"Proceder con la importación propia":"El producto puede ingresar sin problema"}</div></div>
                                        </button>
                                        <button onClick={()=>{ setOpenId(null); handleEdit(c); }} style={{background:"#b8922e18",color:"#b8922e",border:"1px solid #b8922e44",borderRadius:9,padding:"12px 16px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                                          <span style={{fontSize:20}}>📋</span>
                                          <div><div>Requiere CDA — editar cotización</div><div style={{fontSize:10,color:"#b8922e88",fontWeight:400,marginTop:2}}>Agregar costo del certificado y recalcular</div></div>
                                        </button>
                                        <button onClick={()=>handleEstado(c.id,"no_prospero")} style={{background:"#8b1a2e18",color:"#c0392b",border:"1px solid #8b1a2e44",borderRadius:9,padding:"12px 16px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
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
                                        <button onClick={()=>handleEstado(c.id,"pagada")} style={{background:"#1aa35818",color:"#1aa358",border:"1px solid #1aa35844",borderRadius:9,padding:"12px 10px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"center",lineHeight:1.4}}>
                                          <div style={{fontSize:20,marginBottom:4}}>✅</div>
                                          <div>Aceptada</div>
                                          <div style={{fontSize:10,color:"#1aa35888",fontWeight:400,marginTop:2}}>Continúa el proceso</div>
                                        </button>
                                        <button onClick={()=>handleEstado(c.id,"solicitud")} style={{background:"#2d78c818",color:"#334155",border:"1px solid #2d78c844",borderRadius:9,padding:"12px 10px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"center",lineHeight:1.4}}>
                                          <div style={{fontSize:20,marginBottom:4}}>🔄</div>
                                          <div>Re-testeando</div>
                                          <div style={{fontSize:10,color:"#6a9fd488",fontWeight:400,marginTop:2}}>Cliente va a re-evaluar</div>
                                        </button>
                                        <button onClick={()=>handleEstado(c.id,"cotizada")} style={{background:"#c4783018",color:"#c47830",border:"1px solid #c4783044",borderRadius:9,padding:"12px 10px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"center",lineHeight:1.4}}>
                                          <div style={{fontSize:20,marginBottom:4}}>🤝</div>
                                          <div>Negociación</div>
                                          <div style={{fontSize:10,color:"#c4783088",fontWeight:400,marginTop:2}}>Mejora precio o cantidades</div>
                                        </button>
                                        <button onClick={()=>handleEstado(c.id,"no_prospero")} style={{background:"#c0392b18",color:"#c0392b",border:"1px solid #c0392b44",borderRadius:9,padding:"12px 10px",fontSize:12,cursor:"pointer",fontWeight:700,textAlign:"center",lineHeight:1.4}}>
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
                                        <button onClick={()=>handleEstado(c.id,"pagada")} style={{background:"#1aa35818",color:"#1aa358",border:"1px solid #1aa35844",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>✅ Decidió aceptar</button>
                                        <button onClick={()=>handleEstado(c.id,"cotizada")} style={{background:"#c4783018",color:"#c47830",border:"1px solid #c4783044",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>🤝 Quiere negociar</button>
                                        <button onClick={()=>handleEstado(c.id,"no_prospero")} style={{background:"#c0392b15",color:"#c0392b",border:"1px solid #c0392b33",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>❌ Decidió no traer</button>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── PANEL RECHAZADA POR CLIENTE ── */}
                                  {isCurrent&&step.special==="rechazada"&&(
                                    <div style={{marginTop:10,marginBottom:4,background:"#fff1f2",borderRadius:10,padding:14,border:"1px solid #fecdd3"}}>
                                      <div style={{fontSize:11,color:"#c0392b",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>❌ Cliente rechazó la cotización</div>
                                      <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>El cliente decidió no traer el producto. La cotización queda cerrada.</div>
                                      <button onClick={()=>handleEstado(c.id,"cotizada")} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"6px 14px",fontSize:11,cursor:"pointer"}}>↩ Reabrir cotización</button>
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
                                        <button onClick={()=>handleEstado(c.id,"pagada")} style={{background:"#22c55e18",color:"#1aa358",border:"1px solid #bbf7d0",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>✅ Aceptada — continuar</button>
                                        <button onClick={()=>handleEstado(c.id,"no_prospero")} style={{background:"#c0392b15",color:"#c0392b",border:"1px solid #ef444433",borderRadius:7,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700}}>❌ Rechazada — cerrar cotización</button>
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
                            {c.estado==="no_prospero"&&(
                              <div style={{position:"relative",paddingTop:8}}>
                                <div style={{position:"absolute",left:-44,top:8,width:32,height:32,borderRadius:"50%",background:"#8b1a2e18",border:"2px solid #8b1a2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🚫</div>
                                <div style={{background:"#fff1f2",borderRadius:10,padding:"12px 16px",border:"1px solid #fecdd3",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:13,fontWeight:700,color:"#c0392b"}}>Anulada — No puede ingresar a Chile</div>
                                    <div style={{fontSize:11,color:"#64748b",marginTop:3}}>El producto fue bloqueado por restricciones de importación.</div>
                                  </div>
                                  <button onClick={()=>handleEstado(c.id,"cotizada")} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"6px 14px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>↩ Reabrir</button>
                                </div>
                              </div>
                            )}
                            {c.estado==="no_prospero"&&(
                              <div style={{position:"relative",paddingTop:8}}>
                                <div style={{position:"absolute",left:-44,top:8,width:32,height:32,borderRadius:"50%",background:"#c0392b15",border:"2px solid #c0392b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>❌</div>
                                <div style={{background:"#fff1f2",borderRadius:10,padding:"12px 16px",border:"1px solid #fecdd3",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:13,fontWeight:700,color:"#c0392b"}}>Rechazada por el cliente</div>
                                    <div style={{fontSize:11,color:"#64748b",marginTop:3}}>El cliente decidió no traer el producto. Cotización cerrada.</div>
                                  </div>
                                  <button onClick={()=>handleEstado(c.id,"cotizada")} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"6px 14px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>↩ Reabrir</button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ── NOTAS PRIVADAS (chats Cliente/China están arriba en mini-chat) ── */}
                          <div style={{marginTop:20,borderTop:"1px solid #e2e8f0",paddingTop:16}}>
                            <div style={{fontSize:11,color:"#2a8aaa",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>🔒 Notas privadas — solo equipo ZAGA</div>
                            <div>
                                {(()=>{
                                  var hist = []; try{ if(Array.isArray(c.notas_historial)) hist=c.notas_historial; else if(typeof c.notas_historial==="string"&&c.notas_historial) hist=JSON.parse(c.notas_historial); }catch(e){ hist=[]; }
                                  if(hist.length===0 && c.notas_internas){ hist = [{texto:c.notas_internas, fecha: c.fecha_solicitud||"Anterior", autor:"Sistema"}] }
                                  return hist.length>0&&(
                                    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                                      {hist.map(function(n,i){
                                        var esOculta = n.oculta===true;
                                        var editKey = c.id+"_"+i;
                                        var editando = notaEditando[editKey];
                                        if(editando){
                                          return (
                                            <div key={i} style={{background:editando.oculta?"#080f1e":"#fffbeb",border:editando.oculta?"1px solid rgba(201,160,85,0.3)":"1px solid #f59e0b55",borderRadius:8,padding:"10px 12px"}}>
                                              <div style={{fontSize:10,color:editando.oculta?"#c9a055":"#b8922e",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>✏️ Editando nota — {n.autor||"Gestor"}</div>
                                              <textarea value={editando.texto} rows={3} onChange={e=>setNotaEditando(p=>({...p,[editKey]:{...p[editKey],texto:e.target.value}}))} style={{width:"100%",background:editando.oculta?"#0c1629":"#fff",border:`1px solid ${editando.oculta?"rgba(201,160,85,0.2)":"#e2e8f0"}`,borderRadius:6,color:editando.oculta?"#cbd5e1":"#0f172a",padding:"8px 10px",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
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
                                                <button onClick={()=>setNotaEditando(p=>{var np={...p};delete np[editKey];return np;})} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:6,padding:"6px 14px",fontSize:11,cursor:"pointer",fontWeight:600}}>Cancelar</button>
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
                                                <button onClick={()=>setNotaEditando(p=>({...p,[editKey]:{texto:n.texto,oculta:n.oculta===true}}))} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,padding:"1px 4px",color:"#64748b",opacity:0.7}} title="Editar nota">✏️</button>
                                              </div>
                                            </div>
                                            <div style={{fontSize:12,color:esOculta?"#94a3b8":"#0f172a",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{n.texto}</div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )
                                })()}
                                <div style={{background:"#f8fafc",border:"1px solid #06b6d433",borderRadius:8,padding:"10px 12px"}}>
                                  <div style={{fontSize:10,color:"#2a8aaa",marginBottom:6,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>+ Nueva nota</div>
                                  <textarea value={notaInput[c.id]||""} rows={2} onChange={e=>setNotaInput(p=>({...p,[c.id]:e.target.value}))} placeholder="Escribe una nota..." style={{width:"100%",background:"#fff",border:"1px solid #e2e8f0",borderRadius:6,color:"#0f172a",padding:"8px 10px",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
                                  <div onClick={()=>setNotaOculta(p=>({...p,[c.id]:!p[c.id]}))} style={{display:"flex",alignItems:"center",gap:7,marginTop:8,cursor:"pointer",userSelect:"none",width:"fit-content"}}>
                                    <div style={{width:16,height:16,borderRadius:4,flexShrink:0,background:notaOculta[c.id]?"#c9a055":"#fff",border:`2px solid ${notaOculta[c.id]?"#c9a055":"#cbd5e1"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:notaOculta[c.id]?"#040c18":"#fff",fontWeight:900,transition:"all .15s"}}>{notaOculta[c.id]?"✓":""}</div>
                                    <span style={{fontSize:11,color:notaOculta[c.id]?"#c9a055":"#64748b",fontWeight:notaOculta[c.id]?700:400,transition:"all .15s"}}>🔒 Nota oculta — solo administradores</span>
                                  </div>
                                  <button disabled={!(notaInput[c.id]||"").trim()} onClick={async()=>{
                                    var texto=(notaInput[c.id]||"").trim(); if(!texto) return;
                                    var histPrev=c.notas_historial||[];
                                    if(histPrev.length===0&&c.notas_internas) histPrev=[{texto:c.notas_internas,fecha:c.fecha_solicitud||"Anterior",autor:"Sistema"}];
                                    var nuevaNota={texto,fecha:new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"}),autor:usuario?.nombre||"Gestor",oculta:notaOculta[c.id]||false};
                                    await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,notas_historial:[...histPrev,nuevaNota],notas_internas:""}:x));
                                    setNotaInput(p=>({...p,[c.id]:""})); setNotaOculta(p=>({...p,[c.id]:false}));
                                  }} style={{marginTop:8,background:(notaInput[c.id]||"").trim()?"#040c18":"#e2e8f0",color:(notaInput[c.id]||"").trim()?"#c9a055":"#94a3b8",border:"none",borderRadius:6,padding:"7px 16px",fontSize:11,cursor:(notaInput[c.id]||"").trim()?"pointer":"default",fontWeight:700,transition:"all .2s",fontFamily:"inherit"}}>
                                    💾 Guardar nota
                                  </button>
                                </div>
                                {c.requiere_factura && c.transporte!=="aereo" && (
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
                                      <div style={{borderTop:"1px solid #bbf7d0",marginTop:6,paddingTop:10}}>
                                        <div style={{fontSize:10,color:"#1aa358",marginBottom:6,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Factura 2do Pago</div>
                                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                            <div style={{flex:"1 1 180px"}}>
                                              <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>Nº de factura 2do pago</div>
                                              <input value={c.nro_factura_pago2||""} onChange={async e=>{ const val=e.target.value; await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,nro_factura_pago2:val,fecha_factura_pago2:(val&&!x.fecha_factura_pago2)?new Date().toISOString().split("T")[0]:x.fecha_factura_pago2}:x)); }} placeholder="Ej: 001235" style={{width:"100%",background:"#f8fafc",border:"1px solid #1aa35833",borderRadius:7,color:"#0f172a",padding:"8px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                                            </div>
                                            <div style={{flex:"1 1 140px"}}>
                                              <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>Fecha</div>
                                              <input type="date" value={c.fecha_factura_pago2||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,fecha_factura_pago2:e.target.value}:x)); }} style={{width:"100%",background:"#f8fafc",border:"1px solid #1aa35833",borderRadius:7,color:"#0f172a",padding:"8px 10px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                                            </div>
                                          </div>
                                          <div>
                                            <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>Link de la factura 2do pago (Drive u otro)</div>
                                            <div style={{display:"flex",gap:6}}>
                                              <input value={c.link_factura_pago2||""} onChange={async e=>{ await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,link_factura_pago2:e.target.value}:x)); }} placeholder="https://drive.google.com/..." style={{flex:1,background:"#f8fafc",border:"1px solid #1aa35833",borderRadius:7,color:"#0f172a",padding:"8px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                                              {c.link_factura_pago2&&<a href={c.link_factura_pago2} target="_blank" rel="noreferrer" style={{background:"#1aa35820",color:"#1aa358",border:"1px solid #1aa35844",borderRadius:7,padding:"8px 12px",fontSize:12,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>🔗 Abrir</a>}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                            {/* ─── BLOQUE LEGACY CLIENTE — ELIMINADO (mini-chat arriba) ─── */}
                            {false&&gestTab[c.id]==="cliente"&&c.tipo!=="propia"&&(
                              <div>
                                {(()=>{
                                  var tsOf=function(s){if(!s)return 0;var d=new Date(s);if(!isNaN(d.getTime()))return d.getTime();var m=s.match(/(\d+)\s+(\w+)\s+(\d+)/);if(m){var mes={ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11}[m[2].toLowerCase()];if(mes!==undefined)return new Date(Number(m[3]),mes,Number(m[1])).getTime();}return 0;};
                                  var notasEq=(c.notas_historial||[]).filter(function(n){return !n.oculta;}).map(function(n,i){return{_k:"ne"+i,texto:n.texto,fecha:n.fecha,autor:"admin",autorNombre:n.autor||"ZAGA",ts:tsOf(n.fecha)||i};});
                                  var chatMs=(c.notas_cliente_historial||[]).map(function(n,i){return Object.assign({},n,{_k:"cm"+i,ts:tsOf(n.fecha)||(Date.now()+i)});});
                                  var todos=[].concat(notasEq,chatMs).sort(function(a,b){return a.ts-b.ts;});
                                  if(todos.length===0) return <div style={{textAlign:"center",padding:"18px 12px",fontSize:12,color:"#94a3b8",background:"#f8fafc",borderRadius:8,border:"1px dashed #bfdbfe",marginBottom:12}}>Sin mensajes aún con este cliente.</div>;
                                  return (
                                    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                                      {todos.map(function(nota){
                                        var esAdmin=nota.autor==="admin";
                                        var esNoLeida=nota.autor==="cliente"&&!nota.leida_por_admin;
                                        return(
                                          <div key={nota._k||nota.id} style={{display:"flex",justifyContent:esAdmin?"flex-start":"flex-end"}}>
                                            <div style={{maxWidth:"80%",background:esAdmin?"#f0fdf4":(esNoLeida?"#fef2f2":"#eff6ff"),border:"1px solid "+(esAdmin?"#bbf7d0":(esNoLeida?"#fecdd3":"#bfdbfe")),borderLeft:esAdmin?"4px solid #16a34a":(esNoLeida?"4px solid #c0392b":"4px solid #2d78c8"),borderRadius:esAdmin?"0 10px 10px 10px":"10px 0 10px 10px",padding:"10px 14px"}}>
                                              <div style={{fontSize:13,color:"#334155",lineHeight:1.6,whiteSpace:"pre-wrap",marginBottom:6}}>{nota.texto}</div>
                                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                                <span style={{fontSize:10,fontWeight:700,color:esAdmin?"#16a34a":"#2d78c8"}}>{esAdmin?(nota.autorNombre||"ZAGA →"):(c.cliente||"Cliente")}</span>
                                                <span style={{fontSize:10,color:"#94a3b8"}}>{nota.fecha?new Date(nota.fecha).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):""}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                                <div style={{background:"#eff6ff",borderRadius:10,padding:"12px 14px",border:"1px solid #bfdbfe"}}>
                                  <textarea value={notaClienteInput[c.id]||""} rows={2} maxLength={2000} onChange={e=>setNotaClienteInput(p=>({...p,[c.id]:e.target.value}))} placeholder="Escribe un mensaje al cliente..." style={{width:"100%",background:"#fff",border:"1px solid #bfdbfe",borderRadius:6,color:"#0f172a",padding:"8px 10px",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,gap:8,flexWrap:"wrap"}}>
                                    <span style={{fontSize:10,color:"#94a3b8"}}>{(notaClienteInput[c.id]||"").length}/2000</span>
                                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                      {notasCliNoLeidas>0&&(
                                        <button onClick={async()=>{
                                          const h=(c.notas_cliente_historial||[]).map(n=>n.autor==="cliente"?{...n,leida_por_admin:true}:n);
                                          await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,notas_cliente_historial:h}:x));
                                          showToast("✓ Notas del cliente marcadas como leídas");
                                        }} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #e2e8f0",borderRadius:6,padding:"7px 14px",fontSize:11,cursor:"pointer",fontWeight:600}}>
                                          ✓ Marcar todas leídas
                                        </button>
                                      )}
                                      <button disabled={!(notaClienteInput[c.id]||"").trim()} onClick={async()=>{
                                        const txt=(notaClienteInput[c.id]||"").trim(); if(!txt) return;
                                        if(txt.length>2000){showToast("Máximo 2000 caracteres","err");return;}
                                        const nuevaNota={id:Date.now().toString(),autor:"admin",autorNombre:usuario?.nombre||"ZAGA",texto:txt,fecha:new Date().toISOString(),leida_por_admin:true};
                                        const histPrev=Array.isArray(c.notas_cliente_historial)?c.notas_cliente_historial:[];
                                        // Al responder, admin marca implícitamente como leídas todas las notas previas del cliente
                                        const histLeida=histPrev.map(n=>n.autor==="cliente"?{...n,leida_por_admin:true}:n);
                                        await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,notas_cliente_historial:[...histLeida,nuevaNota]}:x));
                                        setNotaClienteInput(p=>({...p,[c.id]:""}));
                                        showToast("💬 Mensaje enviado al cliente");
                                      }} style={{background:(notaClienteInput[c.id]||"").trim()?"#2d78c8":"#e2e8f0",color:(notaClienteInput[c.id]||"").trim()?"#fff":"#94a3b8",border:"none",borderRadius:6,padding:"7px 16px",fontSize:11,cursor:(notaClienteInput[c.id]||"").trim()?"pointer":"default",fontWeight:700,fontFamily:"inherit"}}>
                                        💬 Enviar al cliente
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ─── BLOQUE LEGACY CHINA — ELIMINADO (mini-chat arriba) ─── */}
                            {false&&gestTab[c.id]==="china"&&(
                              <div>
                                {Array.isArray(c.notas_china_historial)&&c.notas_china_historial.length>0?(
                                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                                    {c.notas_china_historial.map(function(nota,i){
                                      const esAdmin=nota.autor==="admin";
                                      const esNueva=c.nota_china_nueva&&i===c.notas_china_historial.length-1&&!esAdmin;
                                      return(
                                        <div key={nota.id||i} style={{display:"flex",justifyContent:esAdmin?"flex-start":"flex-end"}}>
                                          <div style={{maxWidth:"82%",background:esAdmin?"#fef9ec":(esNueva?"#fef6e4":"#fff8ed"),border:"1px solid "+(esNueva?"#c9a055":"#c9a05540"),borderLeft:esAdmin?"4px solid #c9a055":"none",borderRight:esAdmin?"none":"4px solid #b8922e",borderRadius:esAdmin?"0 10px 10px 10px":"10px 0 10px 10px",padding:"10px 14px"}}>
                                            <div style={{fontSize:13,color:"#334155",lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:6}}>{nota.texto}</div>
                                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                              <span style={{fontSize:10,fontWeight:700,color:"#b8922e"}}>{esAdmin?"ZAGA →":"🇨🇳 Proveedor"}</span>
                                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                                {esNueva&&<span style={{background:"#fdf6e3",color:"#b8922e",fontSize:9,fontWeight:700,borderRadius:4,padding:"1px 6px",border:"1px solid #c9a05540"}}>Nueva</span>}
                                                <span style={{fontSize:10,color:"#94a3b8"}}>{nota.fecha?new Date(nota.fecha).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):""}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ):(
                                  <div style={{textAlign:"center",padding:"18px 12px",fontSize:12,color:"#94a3b8",background:"#fffbeb",borderRadius:8,border:"1px dashed #c9a05540",marginBottom:12}}>Sin mensajes aún con el proveedor.</div>
                                )}
                                {c.nota_china_nueva&&(
                                  <button onClick={async()=>{
                                    await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,nota_china_nueva:false}:x));
                                    showToast("✓ Nota de China marcada como leída");
                                  }} style={{background:"#040c18",color:"#c9a055",border:"none",borderRadius:7,padding:"7px 16px",fontSize:11,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",marginBottom:10}}>
                                    ✓ Marcar como leída
                                  </button>
                                )}
                                <div style={{background:"#fffbeb",borderRadius:10,padding:"12px 14px",border:"1px solid #c9a05540"}}>
                                  <textarea value={notaChinaInput[c.id]||""} rows={2} maxLength={2000} onChange={e=>setNotaChinaInput(p=>({...p,[c.id]:e.target.value}))} placeholder="Mensaje para el proveedor chino..." style={{width:"100%",background:"#fff",border:"1px solid #c9a05540",borderRadius:6,color:"#0f172a",padding:"8px 10px",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                                    <span style={{fontSize:10,color:"#94a3b8"}}>{(notaChinaInput[c.id]||"").length}/2000</span>
                                    <button disabled={!(notaChinaInput[c.id]||"").trim()} onClick={async()=>{
                                      const txt=(notaChinaInput[c.id]||"").trim(); if(!txt) return;
                                      const nuevaNota={id:Date.now().toString(),autor:"admin",texto:txt,fecha:new Date().toISOString()};
                                      const hist=Array.isArray(c.notas_china_historial)?c.notas_china_historial:[];
                                      await persist(cotizacionesRef.current.map(x=>x.id===c.id?{...x,notas_china_historial:[...hist,nuevaNota]}:x));
                                      setNotaChinaInput(p=>({...p,[c.id]:""}));
                                      showToast("🇨🇳 Mensaje enviado al proveedor");
                                    }} style={{background:(notaChinaInput[c.id]||"").trim()?"#b8922e":"#e2e8f0",color:(notaChinaInput[c.id]||"").trim()?"#fff":"#94a3b8",border:"none",borderRadius:6,padding:"7px 16px",fontSize:11,cursor:(notaChinaInput[c.id]||"").trim()?"pointer":"default",fontWeight:700,fontFamily:"inherit"}}>
                                      🇨🇳 Enviar al proveedor
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>

                          {/* ── SKU + DIMENSIONES (post-pago, bodega) ── */}
                          {(c.checklist?.pago_china||c.sku_china)&&(
                            <div style={{marginTop:18,borderTop:"1px solid #e2e8f0",paddingTop:18}}>
                              <div style={{fontSize:10,color:"#c47830",marginBottom:12,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>📦 Post-pago — Bodega</div>
                              <div className="ff-grid" style={{display:"grid",gridTemplateColumns:"1fr",gap:16}}>
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
                              </div>
                            </div>
                          )}

                          {/* ── PANEL COSTO REAL ZAGA ── */}
                          {!isPropia && c.transporte === "aereo" && (() => {
                            const opVinc = c.operacion_id ? operaciones.find(o => o.id === c.operacion_id) : null;
                            const cotsOpVinc = opVinc ? cotizaciones.filter(x => (opVinc.cotizaciones||[]).includes(x.id)) : [];
                            const cz = calcCostoRealZaga(c, opVinc, cotsOpVinc);
                            if (cz.totalChinaRMB === 0 && cz.totalChileCLP === 0) return null;
                            return (
                              <div style={{marginTop:16,padding:16,background:"linear-gradient(135deg,#0f1e30 0%,#040c18 100%)",borderRadius:12,color:"#fff",border:"1px solid #c9a05544"}}>
                                <div style={{fontSize:11,color:"#c9a055",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:6}}>
                                  <span>💼 Costo real ZAGA (paso a paso)</span>
                                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                    <span style={{fontSize:10,background:"#facc1522",color:"#facc15",padding:"2px 8px",borderRadius:10,fontWeight:600,fontFamily:"inherit"}} title="Tipo de cambio en uso (editable en 🛬 Validar)">💱 RMB {cz.TC_RMB_USD} · USD {cz.tc}</span>
                                    {!cz.tieneDataRmb && <span title="Cot legacy CLP sin desglose Sunny" style={{fontSize:10,background:"#fbbf2422",color:"#fbbf24",padding:"2px 8px",borderRadius:10,fontWeight:700}}>⚠️ Legacy CLP</span>}
                                    {opVinc && <span style={{fontSize:10,background:"#c9a05522",color:"#c9a055",padding:"2px 8px",borderRadius:10}}>en {opVinc.nro}</span>}
                                  </div>
                                </div>
                                {/* Lado China */}
                                <div style={{background:"#040c18",borderRadius:8,padding:"10px 12px",marginBottom:8,border:"1px solid #1a2740"}}>
                                  <div style={{fontSize:10,color:"#94a3b8",marginBottom:6,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🇨🇳 China (RMB → CLP via TC {cz.TC_RMB_USD})</div>
                                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",rowGap:3,columnGap:12,fontSize:12,color:"#cbd5e1"}}>
                                    <span>Mercancía ({Number(c.unidades)||0} und × ¥{c.precio_china_rmb||0})</span><span style={{color:"#fff",fontWeight:600,textAlign:"right"}}>¥{fmtN(cz.valorMercanciaRMB)}</span>
                                    <span>+ Comisión Sunny ({cz.comisionPct}%)</span><span style={{color:"#fff",fontWeight:600,textAlign:"right"}}>¥{fmtN(cz.comisionRMB)}</span>
                                    <span>+ Flete ({fmtN(cz.pesoTotal,1)} kg × ¥{fmtN(cz.tarifaRmbKg,2)}/kg)</span><span style={{color:"#fff",fontWeight:600,textAlign:"right"}}>¥{fmtN(cz.fleteRMB)}</span>
                                    <span>+ Otros gastos {cz.detalleChina.seguroAplicaMin && <em style={{color:"#c47830"}}>(seguro mín)</em>}</span><span style={{color:"#fff",fontWeight:600,textAlign:"right"}}>¥{fmtN(cz.otrosGastosRMB)}</span>
                                    <span style={{borderTop:"1px solid #1a2740",paddingTop:4,marginTop:2,color:"#c9a055",fontWeight:700}}>= Total China</span><span style={{borderTop:"1px solid #1a2740",paddingTop:4,marginTop:2,color:"#c9a055",fontWeight:800,textAlign:"right"}}>¥{fmtN(cz.totalChinaRMB)} = {fmt(cz.totalChinaCLP)}</span>
                                  </div>
                                </div>
                                {/* Lado Chile */}
                                <div style={{background:"#040c18",borderRadius:8,padding:"10px 12px",marginBottom:8,border:"1px solid #1a2740"}}>
                                  <div style={{fontSize:10,color:"#94a3b8",marginBottom:6,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🇨🇱 Chile (CLP)</div>
                                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",rowGap:3,columnGap:12,fontSize:12,color:"#cbd5e1"}}>
                                    <span>Aduana fija + arancel real</span><span style={{color:"#fff",fontWeight:600,textAlign:"right"}}>{fmt(cz.cdaReal)}</span>
                                    {cz.ivaAgenteAer > 0 && <><span>(info) IVA agente recuperable</span><span style={{color:"#94a3b8",textAlign:"right"}}>{fmt(cz.ivaAgenteAer)}</span></>}
                                    {cz.ivaAduanaAer > 0 && <><span>(info) IVA aduana recuperable</span><span style={{color:"#94a3b8",textAlign:"right"}}>{fmt(cz.ivaAduanaAer)}</span></>}
                                    <span style={{borderTop:"1px solid #1a2740",paddingTop:4,marginTop:2,color:"#c9a055",fontWeight:700}}>= Total Chile</span><span style={{borderTop:"1px solid #1a2740",paddingTop:4,marginTop:2,color:"#c9a055",fontWeight:800,textAlign:"right"}}>{fmt(cz.totalChileCLP)}</span>
                                  </div>
                                </div>
                                {/* Total + Ganancia */}
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                                  <div style={{background:"#1a2740",borderRadius:8,padding:"10px 12px",border:"1px solid #c9a05533"}}>
                                    <div style={{fontSize:10,color:"#94a3b8",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Costo total ZAGA</div>
                                    <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{fmt(cz.costoZAGAReal)}</div>
                                    <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>= China {fmt(cz.totalChinaCLP)} + Chile {fmt(cz.totalChileCLP)}</div>
                                  </div>
                                  <div style={{background:cz.ganRealNeto >= 0 ? "#0d987022" : "#c0392b22",borderRadius:8,padding:"10px 12px",border:`1px solid ${cz.ganRealNeto >= 0 ? "#10b98166" : "#c0392b66"}`}}>
                                    <div style={{fontSize:10,color:cz.ganRealNeto >= 0 ? "#10b981" : "#fca5a5",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Ganancia real (neto)</div>
                                    <div style={{fontSize:20,fontWeight:800,color:cz.ganRealNeto >= 0 ? "#22c55e" : "#fca5a5"}}>{fmt(cz.ganRealNeto)}</div>
                                    <div style={{fontSize:10,color:"#cbd5e1",marginTop:2}}>Margen {fmtP(cz.margenRealPct)} · cliente paga {fmt(cz.precioClienteIva)} c/IVA</div>
                                  </div>
                                </div>
                                <div style={{fontSize:10,color:"#64748b",marginTop:8,fontStyle:"italic",textAlign:"center"}}>
                                  TC USD→CLP: {cz.tc} · Precio cliente neto: {fmt(cz.precioClienteNeto)} {cz.ivaPerdido > 0 && <span style={{color:"#fca5a5"}}>· ⚠️ IVA perdido sin factura: {fmt(cz.ivaPerdido)}</span>}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()||null}</CardErrorBoundary>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ OPERACIONES CONSOLIDADAS AÉREAS ══ */}
        {tab2==="operaciones"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* Header + crear nueva */}
            <div style={{background:"#fff",borderRadius:12,padding:"18px 22px",border:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:"#040c18"}}>✈️ Operaciones Consolidadas Aéreas</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Agrupa varias cotizaciones en un solo envío con costos compartidos (China + flete + aduana)</div>
              </div>
              <button onClick={()=>{
                const nuevoNro="OP-"+String(operaciones.length+1).padStart(3,"0");
                setOpForm({
                  nro:nuevoNro, cliente:"", estado:"borrador", cotizaciones:[],
                  costos_china:{
                    productos_rmb:0, comision_pct:5,
                    // Modelo RMB nativo (Sunny piensa en RMB):
                    flete_rmb_kg:65,                      // antes flete_usd_kg:9.55
                    form_f_rmb_por_producto:150,          // antes form_f_usd_por_producto:25
                    logistica_rmb:400,                    // Yiwu→Shanghai (era 350, actualizado por Sunny)
                    docs_operacion_rmb:150,               // Documentación + operación (nuevo, antes en otros_usd)
                    despacho_exportacion_rmb:200,         // Despacho aduanero exportación China (nuevo)
                    compra_docs_rmb:350,                  // 买单 compra de documentos (nuevo)
                    seguro_pct:0.2,
                    peso_kg:0, cbm:0,
                    // Legacy USD — mantener para retrocompatibilidad con ops existentes:
                    flete_usd_kg:0, form_f_usd_por_producto:0, otros_usd:0,
                  },
                  costos_chile:{ aduana_neta:331000, iva_agente:62890, aforo_incluido:true },
                  pago:{ tc_efectivo:980, comisiones_wu:65000, metodo_pago:"WU" },
                  distribucion:"cbm",
                  margen_objetivo:25,
                  // Distribución del ahorro consolidado: "auto" | "cliente_100" | "split_50_50"
                  // Auto: 100% cliente único, 50/50 multi-cliente. Manual override en cualquier caso.
                  distribucion_ahorro:"auto",
                  // Propagar estado op → estado de todas las cotizaciones vinculadas al guardar
                  propagar_estados:true,
                  notas:""
                });
                setOpEditId(null);
              }} style={{background:"#040c18",color:"#c9a055",border:"none",borderRadius:8,padding:"10px 22px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                + Nueva operación
              </button>
            </div>

            {/* Formulario crear/editar */}
            {opForm&&(
              <div style={{background:"#fff",borderRadius:12,padding:"20px 24px",border:"1px solid #c9a05544"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:15,fontWeight:800,color:"#040c18"}}>{opEditId?"Editar":"Nueva"} operación · <span style={{color:"#c9a055"}}>{opForm.nro}</span></div>
                  <button onClick={()=>{setOpForm(null);setOpEditId(null);}} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:7,padding:"5px 12px",fontSize:12,cursor:"pointer"}}>Cancelar</button>
                </div>

                {/* Datos base */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <div>
                    <label style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Estado</label>
                    <select value={opForm.estado} onChange={e=>setOpForm(p=>({...p,estado:e.target.value}))} style={{width:"100%",padding:"8px 10px",fontSize:13,border:"1px solid #e2e8f0",borderRadius:7,marginTop:3,outline:"none"}}>
                      <option value="borrador">📝 Borrador</option>
                      <option value="cotizada">💬 Cotizada</option>
                      <option value="pagada">💰 Pagada</option>
                      <option value="en_camino">✈️ En camino (enviado)</option>
                      <option value="en_bodega">🇨🇱 En bodega</option>
                      <option value="completada">✓ Completada (recibido)</option>
                      <option value="no_prospero">❌ No prosperó</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Margen objetivo %</label>
                    <input type="number" value={opForm.margen_objetivo} onChange={e=>setOpForm(p=>({...p,margen_objetivo:Number(e.target.value)||25}))} style={{width:"100%",padding:"8px 10px",fontSize:13,border:"1px solid #e2e8f0",borderRadius:7,marginTop:3,outline:"none"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>💎 Distribución ahorro</label>
                    <select value={opForm.distribucion_ahorro||"auto"} onChange={e=>setOpForm(p=>({...p,distribucion_ahorro:e.target.value}))} style={{width:"100%",padding:"8px 10px",fontSize:13,border:"1px solid #e2e8f0",borderRadius:7,marginTop:3,outline:"none",background:"#fff"}}>
                      <option value="auto">🔀 Auto (100% si cliente único / 50-50 multi)</option>
                      <option value="cliente_100">👤 100% al cliente (incluso si multi-cliente)</option>
                      <option value="split_50_50">⚖️ 50/50 cliente / ZAGA</option>
                    </select>
                  </div>
                </div>

                {/* Toggle propagar estados */}
                <div style={{marginBottom:14,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:7,padding:"10px 14px"}}>
                  <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                    <input type="checkbox" checked={opForm.propagar_estados!==false} onChange={e=>setOpForm(p=>({...p,propagar_estados:e.target.checked}))} style={{margin:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>🔄 Sincronizar estado a cotizaciones al guardar</div>
                      <div style={{fontSize:10,color:"#64748b",marginTop:2}}>
                        Estado <b>{opForm.estado}</b> propaga a cotizaciones como <b>{OP_COT_STATE_MAP[opForm.estado]||"— (sin mapeo)"}</b>. Las cots en estado <b>no_prospero</b> NO se sobrescriben.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Selección de cotizaciones — MULTI-CLIENTE agrupadas por cliente */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Cotizaciones aéreas — selecciona de uno o varios clientes</div>
                  <div style={{background:"#f8fafc",borderRadius:8,padding:10,maxHeight:260,overflowY:"auto",border:"1px solid #e2e8f0"}}>
                    {(()=>{
                      const cotsDispo=cotizaciones.filter(c=>c.tipo!=="propia"&&c.transporte==="aereo"&&(!c.operacion_id||opForm.cotizaciones.includes(c.id)));
                      const porCliente={};
                      cotsDispo.forEach(c=>{const k=c.cliente||"Sin cliente";if(!porCliente[k])porCliente[k]=[];porCliente[k].push(c);});
                      const clientes=Object.keys(porCliente).sort();
                      if(clientes.length===0)return <div style={{textAlign:"center",padding:14,fontSize:12,color:"#94a3b8"}}>No hay cotizaciones aéreas disponibles.</div>;
                      return clientes.map(cl=>(
                        <div key={cl} style={{marginBottom:10}}>
                          <div style={{fontSize:11,fontWeight:800,color:"#040c18",background:"#e2e8f0",padding:"4px 10px",borderRadius:6,marginBottom:4,display:"inline-block"}}>👤 {cl} ({porCliente[cl].length})</div>
                          {porCliente[cl].map(c=>{
                            const selected=opForm.cotizaciones.includes(c.id);
                            return (
                              <div key={c.id} onClick={()=>setOpForm(p=>({...p,cotizaciones:selected?p.cotizaciones.filter(x=>x!==c.id):[...p.cotizaciones,c.id]}))} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:selected?"#eef6ff":"transparent",borderRadius:6,cursor:"pointer",marginBottom:3,border:`1px solid ${selected?"#3d7fc4":"transparent"}`}}>
                                <div style={{width:16,height:16,borderRadius:4,background:selected?"#3d7fc4":"#fff",border:`2px solid ${selected?"#3d7fc4":"#cbd5e1"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:900}}>{selected?"✓":""}</div>
                                <div style={{flex:1}}>
                                  <span style={{fontSize:11,fontWeight:700,color:"#0f172a"}}>{c.nro}</span> · <span style={{fontSize:12,color:"#334155"}}>{c.producto}</span>
                                  <span style={{fontSize:10,color:"#64748b",marginLeft:8}}>· {fmtN(c.unidades||0)} und</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                  {(()=>{
                    const selCots=cotizaciones.filter(c=>opForm.cotizaciones.includes(c.id));
                    const clientesSel=[...new Set(selCots.map(c=>c.cliente).filter(Boolean))];
                    const totalU=selCots.reduce((s,c)=>s+Number(c.unidades||0),0);
                    return (
                      <div style={{fontSize:11,color:"#64748b",marginTop:6,display:"flex",gap:14,flexWrap:"wrap"}}>
                        <span>Seleccionadas: <strong>{opForm.cotizaciones.length}</strong></span>
                        <span>Clientes: <strong>{clientesSel.length>0?clientesSel.join(" + "):"—"}</strong></span>
                        <span>Unidades totales: <strong>{fmtN(totalU)}</strong></span>
                      </div>
                    );
                  })()}
                </div>

                {/* Costos consolidados — todo en RMB nativo (Sunny piensa en RMB) */}
                <div style={{borderTop:"1px solid #e2e8f0",paddingTop:14,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#2d78c8",marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>🇨🇳 Costos China (RMB nativo)</div>
                  <div style={{fontSize:10,color:"#94a3b8",marginBottom:10,fontStyle:"italic"}}>TC RMB↔USD = 7,2 · TC USD↔CLP = ver Pago abajo</div>
                  <div style={{fontSize:10,color:"#64748b",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Variables (escalan con tamaño)</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
                    <div><label style={{fontSize:10,color:"#64748b"}}><b>Productos total RMB</b></label><input type="number" value={opForm.costos_china.productos_rmb||0} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,productos_rmb:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #2d78c8",borderRadius:6,marginTop:2,outline:"none",background:"#eff6ff"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Comisión agente %</label><input type="number" step="0.1" value={opForm.costos_china.comision_pct} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,comision_pct:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Flete RMB/kg (def 65)</label><input type="number" step="0.1" value={opForm.costos_china.flete_rmb_kg??65} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,flete_rmb_kg:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Form F RMB/producto (def 150)</label><input type="number" value={opForm.costos_china.form_f_rmb_por_producto??150} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,form_f_rmb_por_producto:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Peso total (kg)</label><input type="number" step="0.1" value={opForm.costos_china.peso_kg} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,peso_kg:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>CBM total (m³)</label><input type="number" step="0.001" value={opForm.costos_china.cbm} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,cbm:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Seguro %</label><input type="number" step="0.01" value={opForm.costos_china.seguro_pct} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,seguro_pct:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                  </div>
                  <div style={{fontSize:10,color:"#64748b",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Fijos por embarque (1.100 RMB típico)</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Logística Yiwu→Shanghai RMB (def 400)</label><input type="number" value={opForm.costos_china.logistica_rmb??400} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,logistica_rmb:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Docs + operación RMB (def 150)</label><input type="number" value={opForm.costos_china.docs_operacion_rmb??150} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,docs_operacion_rmb:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Despacho exportación RMB (def 200)</label><input type="number" value={opForm.costos_china.despacho_exportacion_rmb??200} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,despacho_exportacion_rmb:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Compra docs (买单) RMB (def 350)</label><input type="number" value={opForm.costos_china.compra_docs_rmb??350} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,compra_docs_rmb:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                  </div>
                  {/* Legacy USD — solo visible si tienen valor histórico */}
                  {(Number(opForm.costos_china.flete_usd_kg)>0 || Number(opForm.costos_china.form_f_usd_por_producto)>0 || Number(opForm.costos_china.otros_usd)>0) && (
                    <details style={{marginTop:10,fontSize:11}}>
                      <summary style={{cursor:"pointer",color:"#94a3b8",fontStyle:"italic"}}>⚠️ Campos legacy USD (heredados de ops anteriores) — click para ver</summary>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:6}}>
                        <div><label style={{fontSize:9,color:"#94a3b8"}}>Flete USD/kg (legacy)</label><input type="number" step="0.01" value={opForm.costos_china.flete_usd_kg||0} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,flete_usd_kg:Number(e.target.value)||0}}))} style={{width:"100%",padding:"5px 8px",fontSize:11,border:"1px solid #e2e8f0",borderRadius:5,outline:"none",background:"#f8fafc"}}/></div>
                        <div><label style={{fontSize:9,color:"#94a3b8"}}>Form F USD (legacy)</label><input type="number" value={opForm.costos_china.form_f_usd_por_producto||0} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,form_f_usd_por_producto:Number(e.target.value)||0}}))} style={{width:"100%",padding:"5px 8px",fontSize:11,border:"1px solid #e2e8f0",borderRadius:5,outline:"none",background:"#f8fafc"}}/></div>
                        <div><label style={{fontSize:9,color:"#94a3b8"}}>Otros USD (legacy)</label><input type="number" value={opForm.costos_china.otros_usd||0} onChange={e=>setOpForm(p=>({...p,costos_china:{...p.costos_china,otros_usd:Number(e.target.value)||0}}))} style={{width:"100%",padding:"5px 8px",fontSize:11,border:"1px solid #e2e8f0",borderRadius:5,outline:"none",background:"#f8fafc"}}/></div>
                      </div>
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:5,fontStyle:"italic"}}>El sistema usa RMB nativo si está &gt;0; sino fallback a USD legacy × TC.</div>
                    </details>
                  )}
                </div>

                <div style={{borderTop:"1px solid #e2e8f0",paddingTop:14,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#c47830",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>🇨🇱 Costos Chile + Pago</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Aduana neta CLP</label><input type="number" value={opForm.costos_chile.aduana_neta} onChange={e=>setOpForm(p=>({...p,costos_chile:{...p.costos_chile,aduana_neta:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>IVA agente CLP</label><input type="number" value={opForm.costos_chile.iva_agente} onChange={e=>setOpForm(p=>({...p,costos_chile:{...p.costos_chile,iva_agente:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>TC efectivo (CLP/USD)</label><input type="number" value={opForm.pago.tc_efectivo} onChange={e=>setOpForm(p=>({...p,pago:{...p.pago,tc_efectivo:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                    <div><label style={{fontSize:10,color:"#64748b"}}>Comisiones WU CLP</label><input type="number" value={opForm.pago.comisiones_wu} onChange={e=>setOpForm(p=>({...p,pago:{...p.pago,comisiones_wu:Number(e.target.value)||0}}))} style={{width:"100%",padding:"7px 9px",fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,marginTop:2,outline:"none"}}/></div>
                  </div>
                </div>

                {/* Resumen calculado */}
                {opForm.cotizaciones.length>0&&(()=>{
                  const cots=cotizaciones.filter(c=>opForm.cotizaciones.includes(c.id));
                  const cc=opForm.costos_china, ch=opForm.costos_chile, pg=opForm.pago;
                  const tc=Number(pg.tc_efectivo)||950, tcRmb=tc/(Number(opForm.tc_rmb_usd)||7.03);
                  // Productos en RMB (ingresado manualmente por el agente)
                  const productosRMB=Number(cc.productos_rmb)||0;
                  const productosCLP=productosRMB*tcRmb;
                  const comisionRMB=productosRMB*(cc.comision_pct/100);
                  const comisionCLP=comisionRMB*tcRmb;
                  const fleteCLP=(Number(cc.flete_usd_kg)||0)*(Number(cc.peso_kg)||0)*tc;
                  const logisticaCLP=(Number(cc.logistica_rmb)||0)*tcRmb;
                  const otrosCLP=(Number(cc.otros_usd)||0)*tc;
                  const formFCLP=(Number(cc.form_f_usd_por_producto)||0)*cots.length*tc;
                  const seguroRMB=productosRMB*(cc.seguro_pct/100);
                  const seguroCLP=seguroRMB*tcRmb;
                  const aduanaCLP=(Number(ch.aduana_neta)||0)+(Number(ch.iva_agente)||0);
                  const wuCLP=Number(pg.comisiones_wu)||0;
                  const costoTotal=productosCLP+comisionCLP+fleteCLP+logisticaCLP+otrosCLP+formFCLP+seguroCLP+aduanaCLP+wuCLP;
                  const totalUnidades=cots.reduce((s,c)=>s+(Number(c.unidades)||0),0);
                  const totalCBM=Number(cc.cbm)||0;
                  const margen=Number(opForm.margen_objetivo)/100;
                  const ventaNetaObj=costoTotal/(1-margen);
                  const ventaCIvaObj=ventaNetaObj*1.19;
                  const gananciaObj=ventaNetaObj-costoTotal;
                  return (
                    <div style={{background:"#040c18",borderRadius:10,padding:"16px 18px",marginBottom:14}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#c9a055",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>📊 Resumen calculado</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,fontSize:12,color:"#e2e8f0"}}>
                        <div>
                          <div style={{color:"#94a3b8",fontSize:10,marginBottom:3}}>Costo total ZAGA</div>
                          <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>{fmt(costoTotal)}</div>
                        </div>
                        <div>
                          <div style={{color:"#94a3b8",fontSize:10,marginBottom:3}}>Venta NETA objetivo (margen {opForm.margen_objetivo}%)</div>
                          <div style={{fontSize:18,fontWeight:800,color:"#22c55e"}}>{fmt(ventaNetaObj)}</div>
                        </div>
                        <div>
                          <div style={{color:"#94a3b8",fontSize:10,marginBottom:3}}>Venta c/IVA objetivo</div>
                          <div style={{fontSize:18,fontWeight:800,color:"#22c55e"}}>{fmt(ventaCIvaObj)}</div>
                        </div>
                        <div>
                          <div style={{color:"#94a3b8",fontSize:10,marginBottom:3}}>Ganancia objetivo</div>
                          <div style={{fontSize:16,fontWeight:700,color:"#c9a055"}}>{fmt(gananciaObj)}</div>
                        </div>
                        <div>
                          <div style={{color:"#94a3b8",fontSize:10,marginBottom:3}}>Total unidades</div>
                          <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{fmtN(totalUnidades)}</div>
                        </div>
                        <div>
                          <div style={{color:"#94a3b8",fontSize:10,marginBottom:3}}>CBM total</div>
                          <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{totalCBM.toFixed(3)} m³</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Botones acción */}
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>{setOpForm(null);setOpEditId(null);}} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"9px 18px",fontSize:13,cursor:"pointer"}}>Cancelar</button>
                  <button onClick={async()=>{
                    if(opForm.cotizaciones.length===0){showToast("Selecciona al menos 1 cotización","err");return;}
                    try{
                      // Calcular clientes y cliente principal desde las cotizaciones seleccionadas
                      const selCots=cotizaciones.filter(c=>opForm.cotizaciones.includes(c.id));
                      const clientesArr=[...new Set(selCots.map(c=>c.cliente).filter(Boolean))];
                      const clientePrincipal=clientesArr.length===1?clientesArr[0]:(clientesArr.length>1?clientesArr.join(" + "):"");
                      const payload={...opForm,cliente:clientePrincipal,clientes:clientesArr};
                      if(opEditId){
                        // Detectar cots removidas/agregadas vs versión previa para sincronizar operacion_id
                        const opPrev = operaciones.find(o => o.id === opEditId);
                        const cotIdsPrev = new Set(opPrev?.cotizaciones || []);
                        const cotIdsNuevo = new Set(opForm.cotizaciones || []);
                        const removidas = [...cotIdsPrev].filter(id => !cotIdsNuevo.has(id));
                        const agregadas = [...cotIdsNuevo].filter(id => !cotIdsPrev.has(id));
                        await supabase.from("operaciones").update({datos:payload,updated_at:new Date().toISOString()}).eq("id",opEditId);
                        setOperaciones(prev=>prev.map(o=>o.id===opEditId?{...payload,id:opEditId}:o));
                        // Limpiar operacion_id de las removidas
                        for (const cotId of removidas) {
                          const cot = cotizaciones.find(c => c.id === cotId);
                          if (cot) {
                            const {operacion_id, ...rest} = cot;
                            await supabase.from("cotizaciones").update({datos: rest}).eq("id", cotId);
                          }
                        }
                        // Setear operacion_id en las agregadas
                        for (const cotId of agregadas) {
                          const cot = cotizaciones.find(c => c.id === cotId);
                          if (cot) {
                            await supabase.from("cotizaciones").update({datos: {...cot, operacion_id: opEditId}}).eq("id", cotId);
                          }
                        }
                        if (removidas.length > 0 || agregadas.length > 0) {
                          setCotizaciones(prev => prev.map(c => {
                            if (removidas.includes(c.id)) { const {operacion_id, ...rest} = c; return rest; }
                            if (agregadas.includes(c.id)) return {...c, operacion_id: opEditId};
                            return c;
                          }));
                        }
                      } else {
                        const {data,error}=await supabase.from("operaciones").insert({datos:payload}).select("id").single();
                        if(error)throw error;
                        setOperaciones(prev=>[{...payload,id:data.id},...prev]);
                        // Marcar cotizaciones con operacion_id
                        await Promise.all(opForm.cotizaciones.map(async cotId=>{
                          const cot=cotizaciones.find(c=>c.id===cotId);
                          if(cot){
                            await supabase.from("cotizaciones").update({datos:{...cot,operacion_id:data.id}}).eq("id",cotId);
                          }
                        }));
                        setCotizaciones(prev=>prev.map(c=>opForm.cotizaciones.includes(c.id)?{...c,operacion_id:data.id}:c));
                      }
                      // ── PROPAGAR ESTADO OP → COTS (si propagar_estados !== false, default true) ──
                      const nuevoEstadoCot = OP_COT_STATE_MAP[payload.estado];
                      if (payload.propagar_estados !== false && nuevoEstadoCot) {
                        const cotsAfectadas = cotizaciones.filter(c => opForm.cotizaciones.includes(c.id));
                        let actualizadas = 0;
                        for (const cot of cotsAfectadas) {
                          if (COT_ESTADOS_TERMINALES.includes(cot.estado)) continue;
                          if (cot.estado === nuevoEstadoCot) continue;
                          const {id, ...rest} = cot;
                          const newDatos = {...rest, estado: nuevoEstadoCot};
                          // Auto-marcar pago1_cliente al pasar a pagada
                          if (nuevoEstadoCot === "pagada" && !(rest.checklist||{}).pago1_cliente) {
                            newDatos.checklist = {...(rest.checklist||{}), pago1_cliente:true};
                            if (!rest.fecha_pago1_cliente) newDatos.fecha_pago1_cliente = new Date().toISOString().split("T")[0];
                          }
                          await supabase.from("cotizaciones").update({datos: newDatos}).eq("id", id);
                          actualizadas++;
                        }
                        if (actualizadas > 0) {
                          setCotizaciones(prev => prev.map(c => {
                            if (!opForm.cotizaciones.includes(c.id) || COT_ESTADOS_TERMINALES.includes(c.estado)) return c;
                            const upd = {...c, estado: nuevoEstadoCot};
                            if (nuevoEstadoCot === "pagada" && !(c.checklist||{}).pago1_cliente) {
                              upd.checklist = {...(c.checklist||{}), pago1_cliente:true};
                              if (!c.fecha_pago1_cliente) upd.fecha_pago1_cliente = new Date().toISOString().split("T")[0];
                            }
                            return upd;
                          }));
                          showToast(`✓ ${actualizadas} cotización(es) sincronizadas a "${nuevoEstadoCot}"`);
                        }
                      }
                      showToast(`✓ Operación ${opEditId?"actualizada":"creada"}`);
                      setOpForm(null);setOpEditId(null);
                    }catch(e){
                      showToast("Error al guardar operación: "+e.message,"err");
                    }
                  }} style={{background:"#040c18",color:"#c9a055",border:"none",borderRadius:7,padding:"9px 22px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    💾 Guardar operación
                  </button>
                </div>
              </div>
            )}

            {/* Lista de operaciones */}
            {!opForm&&operaciones.length===0&&(
              <div style={{textAlign:"center",padding:60,color:"#94a3b8",background:"#fff",borderRadius:12,border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:40,marginBottom:10}}>✈️</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4,color:"#475569"}}>Sin operaciones consolidadas aún</div>
                <div style={{fontSize:12}}>Crea la primera para agrupar cotizaciones aéreas con costos compartidos.</div>
              </div>
            )}

            {!opForm&&operaciones.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {operaciones.map(op=>{
                  const cots=cotizaciones.filter(c=>op.cotizaciones?.includes(c.id));
                  const totalUnd=cots.reduce((s,c)=>s+Number(c.unidades||0),0);
                  const clientesOp=op.clientes&&op.clientes.length>0?op.clientes:[...new Set(cots.map(c=>c.cliente).filter(Boolean))];
                  const clienteUnico = clientesOp.length === 1;
                  const expanded = opOpenId === op.id;
                  // Calcular consolidado de cada cot solo si está expandido (perf)
                  // Sin filtro de estado: se ve para todas las cots de la op, incluso pagada/en_camino/completada
                  // (excluimos solo terminales negativas que no deberían estar en una op activa)
                  const consolidados = expanded ? cots
                    .filter(c => !["no_prospero"].includes(c.estado))
                    .map(c => ({ cot:c, calc: calcConsolidado(c, op, cots) }))
                    .filter(x => x.calc) : [];
                  const ahorroTotalOp = consolidados.reduce((s,x) => s + ((x.calc?.standalone?.totClIva || 0) - (x.calc?.consolidado?.totClIva || 0)), 0);
                  return (
                    <div key={op.id} className="op-card" style={{background:"#fff",borderRadius:10,border:"1px solid #e2e8f0",padding:"14px 18px"}}>
                      <div className="op-card-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="op-title-row" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            <span style={{fontSize:14,fontWeight:800,color:"#c9a055"}}>{op.nro}</span>
                            {clientesOp.map(cl=>(
                              <span key={cl} style={{fontSize:12,fontWeight:700,color:"#040c18",background:"#eef6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"2px 9px"}}>👤 {cl}</span>
                            ))}
                            {/* Dropdown de estado con cambio + propagación automática */}
                            <select value={op.estado||"borrador"} onClick={e=>e.stopPropagation()} onChange={async(e)=>{
                              const nuevoEst = e.target.value;
                              if (nuevoEst === op.estado) return;
                              const nuevoEstadoCot = OP_COT_STATE_MAP[nuevoEst];
                              const cotsAfectables = cots.filter(c => !COT_ESTADOS_TERMINALES.includes(c.estado) && c.estado !== nuevoEstadoCot);
                              const msg = `Cambiar OP ${op.nro} a estado "${nuevoEst}"?` + (nuevoEstadoCot && cotsAfectables.length>0 ? `\n\nEsto también sincronizará ${cotsAfectables.length} cotización(es) a "${nuevoEstadoCot}".` : "");
                              if (!confirm(msg)) return;
                              try {
                                const newOp = {...op, estado: nuevoEst};
                                delete newOp.id;
                                await supabase.from("operaciones").update({datos:newOp,updated_at:new Date().toISOString()}).eq("id",op.id);
                                if (nuevoEstadoCot && cotsAfectables.length > 0) {
                                  for (const c of cotsAfectables) {
                                    const {id, ...rest} = c;
                                    const newDatos = {...rest, estado:nuevoEstadoCot};
                                    if (nuevoEstadoCot === "pagada" && !(rest.checklist||{}).pago1_cliente) {
                                      newDatos.checklist = {...(rest.checklist||{}), pago1_cliente:true};
                                      if (!rest.fecha_pago1_cliente) newDatos.fecha_pago1_cliente = new Date().toISOString().split("T")[0];
                                    }
                                    await supabase.from("cotizaciones").update({datos:newDatos}).eq("id",id);
                                  }
                                  setCotizaciones(prev=>prev.map(c=>{
                                    if(!cotsAfectables.find(x=>x.id===c.id)) return c;
                                    const upd={...c,estado:nuevoEstadoCot};
                                    if(nuevoEstadoCot==="pagada"&&!(c.checklist||{}).pago1_cliente){
                                      upd.checklist={...(c.checklist||{}),pago1_cliente:true};
                                      if(!c.fecha_pago1_cliente) upd.fecha_pago1_cliente=new Date().toISOString().split("T")[0];
                                    }
                                    return upd;
                                  }));
                                }
                                setOperaciones(prev=>prev.map(o=>o.id===op.id?{...newOp,id:op.id}:o));
                                showToast(`✓ OP ${op.nro} → "${nuevoEst}"` + (cotsAfectables.length>0?` (${cotsAfectables.length} cots sincronizadas)`:""));
                              } catch(err) { showToast("Error: "+err.message,"err"); }
                            }} style={{fontSize:10,fontWeight:700,background:"#f1f5f9",color:"#64748b",padding:"3px 8px",borderRadius:10,textTransform:"uppercase",border:"1px solid #cbd5e1",cursor:"pointer",fontFamily:"inherit"}}>
                              <option value="borrador">📝 Borrador</option>
                              <option value="cotizada">💬 Cotizada</option>
                              <option value="pagada">💰 Pagada</option>
                              <option value="en_camino">✈️ En camino (enviado)</option>
                              <option value="en_bodega">🇨🇱 En bodega</option>
                              <option value="completada">✓ Completada (recibido)</option>
                              <option value="no_prospero">❌ No prosperó</option>
                            </select>
                            {op.recotizacion_pendiente_sunny&&!op.recotizacion_completada_sunny&&(
                              <span style={{fontSize:10,fontWeight:700,background:"#fff7ed",color:"#c47830",border:"1px solid #fed7aa",padding:"2px 8px",borderRadius:10}}>📢 Esperando Sunny</span>
                            )}
                            {op.recotizacion_completada_sunny&&!op.consolidado_aplicado_cliente&&(
                              <span style={{fontSize:10,fontWeight:700,background:"#eff6ff",color:"#2d78c8",border:"1px solid #bfdbfe",padding:"2px 8px",borderRadius:10}}>🔔 Sunny respondió — aplicar a clientes</span>
                            )}
                            {op.consolidado_aplicado_cliente&&(
                              <span style={{fontSize:10,fontWeight:700,background:"#f0fdf4",color:"#1aa358",border:"1px solid #bbf7d0",padding:"2px 8px",borderRadius:10}}>✅ Consolidado activo</span>
                            )}
                          </div>
                          <div style={{fontSize:11,color:"#64748b",marginTop:4}}>
                            {op.cotizaciones?.length||0} cotizaciones · {fmtN(totalUnd)} unidades · Margen {op.margen_objetivo}% · {clienteUnico?"Cliente único":"Multi-cliente"}
                          </div>
                        </div>
                        <div className="op-card-actions" style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <button onClick={()=>setOpOpenId(expanded?null:op.id)} style={{background:expanded?"#c9a05522":"#f8fafc",color:expanded?"#c9a055":"#64748b",border:`1px solid ${expanded?"#c9a05566":"#e2e8f0"}`,borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer",fontWeight:600}}>💎 {expanded?"Ocultar":"Ver"} consolidado</button>
                          <button onClick={()=>{setOpForm(op);setOpEditId(op.id);}} style={{background:"#eef6ff",color:"#2d78c8",border:"1px solid #bfdbfe",borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Editar</button>
                          <button onClick={async()=>{
                            if(!confirm(`¿Eliminar operación ${op.nro}?`))return;
                            try{
                              await supabase.from("operaciones").delete().eq("id",op.id);
                              await Promise.all((op.cotizaciones||[]).map(async cotId=>{
                                const cot=cotizaciones.find(c=>c.id===cotId);
                                if(cot){
                                  const {operacion_id,...rest}=cot;
                                  await supabase.from("cotizaciones").update({datos:rest}).eq("id",cotId);
                                }
                              }));
                              setOperaciones(prev=>prev.filter(o=>o.id!==op.id));
                              setCotizaciones(prev=>prev.map(c=>(op.cotizaciones||[]).includes(c.id)?(()=>{const{operacion_id,...rest}=c;return rest;})():c));
                              showToast("✓ Operación eliminada");
                            }catch(e){showToast("Error: "+e.message,"err");}
                          }} style={{background:"#fef2f2",color:"#c0392b",border:"1px solid #fecaca",borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer",fontWeight:600}}>🗑️ Eliminar</button>
                        </div>
                      </div>
                      {/* Bloque consolidado expandible */}
                      {expanded&&(
                        <div className="op-cons-block" style={{marginTop:14,padding:14,background:"#fafafa",borderRadius:9,border:"1px solid #e2e8f0"}}>
                          {consolidados.length===0?(
                            <div style={{fontSize:12,color:"#94a3b8",fontStyle:"italic"}}>No hay cotizaciones activas en esta operación (todas están rechazadas/anuladas/no procesadas).</div>
                          ):(
                            <>
                              {/* ── PANEL COMPARATIVO RMB CON SUNNY (réplica Excel Sunny) ── */}
                              {(() => {
                                const cotsActivas = cots.filter(c => !["no_prospero"].includes(c.estado));
                                if (cotsActivas.length === 0) return null;
                                const TC_RMB_USD = Number(op.tc_rmb_usd) || 7.03;
                                const tc = Number(op.tc_usd_clp ?? op.pago?.tc_efectivo) || 950;
                                const comPct = Number(op.comision_sunny_pct ?? op.costos_china?.comision_pct) || 0;
                                const segPct_raw = Number(op.seguro_pct ?? op.costos_china?.seguro_pct) || 0;
                                const segPct = segPct_raw > 1 ? segPct_raw/100 : segPct_raw;
                                const segMin = Number(op.seguro_min_rmb) || 0;
                                const certOri = Number(op.cost_cert_origen_rmb) || 0;
                                const docOpV = Number(op.cost_doc_operacion_rmb) || 0;
                                const despV = Number(op.cost_despacho_aduanero_rmb) || 0;
                                const compraDV = Number(op.cost_compra_docs_rmb) || 0;
                                const transpV = Number(op.cost_transporte_interno_cn_rmb) || 0;
                                const fleteRmbKg = Number(op.flete_rmb_kg_consolidado ?? op.costos_china?.flete_rmb_kg) || 0;
                                const cc = op.costos_china || {};
                                const otrosUSDLeg = Number(cc.otros_usd) || 0;
                                const formFUSDLeg = (Number(cc.form_f_usd_por_producto)||0) * cotsActivas.length;
                                const logisticaLeg = Number(cc.logistica_rmb) || 0;

                                // Por cot: peso real, cbm, peso volumétrico, peso cobrable, mercancía
                                const detallesCot = cotsActivas.map(c => {
                                  const u = Number(c.unidades) || 0;
                                  const undCaja = Number(c.dim_und_caja) || 0;
                                  const esCaja = c.dim_tipo === "caja";
                                  const nCajas = esCaja && undCaja > 0 ? Math.ceil(u/undCaja) : 0;
                                  const pesoReal = esCaja && undCaja > 0 ? (Number(c.peso_kg)||0)*nCajas : (Number(c.peso_kg)||0)*u;
                                  const cbm = esCaja && undCaja > 0 ? (Number(c.dim_m3)||0)*nCajas : (Number(c.dim_m3)||0)*u;
                                  const pesoVol = cbm * 167; // 1 m³ = 167 kg vol (estándar aéreo)
                                  const pesoCobr = Math.max(pesoReal, pesoVol);
                                  const mercanciaRMB = (Number(c.precio_china_rmb)||0) * u;
                                  const fleteRMB = pesoCobr * fleteRmbKg;
                                  return { c, u, pesoReal, pesoVol, pesoCobr, cbm, mercanciaRMB, fleteRMB };
                                });
                                const mercOp = detallesCot.reduce((s,d) => s + d.mercanciaRMB, 0);
                                const comisionOp = mercOp * comPct / 100;
                                const pesoCobrTotal = detallesCot.reduce((s,d) => s + d.pesoCobr, 0);
                                const fleteOp = detallesCot.reduce((s,d) => s + d.fleteRMB, 0);
                                const certOpRMB = certOri * cotsActivas.length;
                                const seguroOp = Math.max(segMin, mercOp * segPct);
                                // Logística legacy es duplicada del transporte_interno_cn nuevo: solo sumar
                                // si NO hay transporte_interno_cn (compatibilidad OP-001 vieja).
                                const logisticaEfectiva = transpV > 0 ? 0 : logisticaLeg;
                                const otrosOpRMB = docOpV + despV + compraDV + transpV + logisticaEfectiva + seguroOp;
                                const totalRMB = mercOp + comisionOp + fleteOp + certOpRMB + otrosOpRMB;
                                const totalUSDExtra = otrosUSDLeg + formFUSDLeg;
                                const totalUSD = totalRMB / TC_RMB_USD + totalUSDExtra;
                                const totalCLP = totalUSD * tc;
                                const totalUnd = detallesCot.reduce((s,d) => s + d.u, 0);
                                const costoUndCLP = totalUnd > 0 ? totalCLP / totalUnd : 0;
                                const costoUndRMB = totalUnd > 0 ? totalRMB / totalUnd : 0;

                                const rowRMB = (lbl, val, hint) => (
                                  <tr style={{borderBottom:"1px solid #fde68a"}}>
                                    <td style={{padding:"6px 10px",fontSize:11,color:"#78350f"}}>{lbl}{hint && <div style={{fontSize:9,color:"#a16207",fontStyle:"italic"}}>{hint}</div>}</td>
                                    <td style={{padding:"6px 10px",fontSize:12,textAlign:"right",fontWeight:600,color:"#0f172a"}}>¥{fmtN(val,2)}</td>
                                  </tr>
                                );

                                return (
                                  <div style={{marginTop:14,padding:14,background:"#fefce8",border:"1px solid #fde047",borderRadius:10}}>
                                    <div style={{fontSize:11,color:"#854d0e",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                                      <span>💴 Comparativo RMB — OP {op.nro} (formato Excel Sunny)</span>
                                      <span style={{fontSize:10,background:"#fff",color:"#854d0e",padding:"2px 8px",borderRadius:10,fontWeight:600,letterSpacing:0.5,border:"1px solid #fde047"}}>💱 RMB {TC_RMB_USD} · USD {tc}</span>
                                    </div>
                                    <div style={{fontSize:10,color:"#a16207",marginBottom:10,fontStyle:"italic"}}>
                                      Usa esta tabla para comparar con el Excel que envía Sunny. Si los totales coinciden, los costos están bien capturados.
                                    </div>
                                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                                      {/* Columna izquierda: desglose */}
                                      <div>
                                        <table style={{width:"100%",borderCollapse:"collapse",background:"#fff",borderRadius:8,overflow:"hidden",border:"1px solid #fde047"}}>
                                          <tbody>
                                            {rowRMB("📦 Mercancía total", mercOp, `${cotsActivas.length} cots · ${fmtN(totalUnd)} und`)}
                                            {rowRMB(`💼 Comisión Sunny (${comPct}%)`, comisionOp, "Sobre mercancía total")}
                                            {rowRMB("✈️ Flete aéreo", fleteOp, `${fmtN(pesoCobrTotal,1)} kg cobrable × ¥${fmtN(fleteRmbKg,2)}/kg`)}
                                            {rowRMB(`📜 Cert. origen (×${cotsActivas.length})`, certOpRMB, `¥${certOri}/cot`)}
                                            {docOpV>0   && rowRMB("📄 Doc. operación CN", docOpV, "Fijo OP")}
                                            {despV>0    && rowRMB("🛃 Despacho aduanero CN", despV, "Fijo OP")}
                                            {compraDV>0 && rowRMB("📑 Compra docs", compraDV, "Fijo OP")}
                                            {transpV>0  && rowRMB("🚚 Transporte interno CN", transpV, "Fijo OP")}
                                            {logisticaLeg>0 && transpV===0 && rowRMB("🛣️ Logística Yiwu→SH (legacy)", logisticaLeg, "Solo OP legacy sin transporte_interno_cn nuevo")}
                                            {rowRMB(`🛡️ Seguro (${(segPct*100).toFixed(2)}% sobre merc., mín ¥${segMin})`, seguroOp, mercOp*segPct < segMin ? "Aplica mínimo" : "Aplica %")}
                                          </tbody>
                                        </table>
                                        {totalUSDExtra > 0 && (
                                          <div style={{marginTop:8,padding:"8px 11px",background:"#fff",borderRadius:7,border:"1px solid #fde047",fontSize:11,color:"#78350f"}}>
                                            <b>+ Extras USD (legacy):</b><br/>
                                            {otrosUSDLeg > 0 && <>· Otros USD: <b style={{color:"#0f172a"}}>${fmtN(otrosUSDLeg,2)}</b><br/></>}
                                            {formFUSDLeg > 0 && <>· Form F: <b style={{color:"#0f172a"}}>${fmtN(formFUSDLeg,2)}</b> ({cotsActivas.length} cots × ${cc.form_f_usd_por_producto}/cot)<br/></>}
                                            <span style={{fontStyle:"italic",fontSize:10,color:"#a16207"}}>Estos NO se convierten a RMB (Sunny los cobra en USD)</span>
                                          </div>
                                        )}
                                      </div>
                                      {/* Columna derecha: totales en 3 monedas */}
                                      <div>
                                        <div style={{background:"#fff",borderRadius:8,border:"1px solid #fde047",padding:"12px 14px"}}>
                                          <div style={{fontSize:10,color:"#a16207",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Total OP en 3 monedas</div>
                                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8,paddingBottom:8,borderBottom:"1px dashed #fde047"}}>
                                            <span style={{fontSize:12,color:"#78350f"}}>RMB</span>
                                            <span style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>¥{fmtN(totalRMB,2)}</span>
                                          </div>
                                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8,paddingBottom:8,borderBottom:"1px dashed #fde047"}}>
                                            <span style={{fontSize:12,color:"#78350f"}}>USD <span style={{fontSize:9,color:"#a16207"}}>(÷ TC {TC_RMB_USD})</span></span>
                                            <span style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>${fmtN(totalUSD,2)}</span>
                                          </div>
                                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                                            <span style={{fontSize:12,color:"#78350f"}}>CLP <span style={{fontSize:9,color:"#a16207"}}>(× TC {tc})</span></span>
                                            <span style={{fontSize:20,fontWeight:800,color:"#c47830"}}>{fmt(totalCLP)}</span>
                                          </div>
                                        </div>
                                        <div style={{marginTop:8,background:"#fff",borderRadius:8,border:"1px solid #fde047",padding:"10px 14px"}}>
                                          <div style={{fontSize:10,color:"#a16207",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Costo por unidad (promedio OP)</div>
                                          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
                                            <span style={{color:"#78350f"}}>RMB / und</span>
                                            <span style={{fontWeight:700,color:"#0f172a"}}>¥{fmtN(costoUndRMB,2)}</span>
                                          </div>
                                          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                                            <span style={{color:"#78350f"}}>CLP / und</span>
                                            <span style={{fontWeight:700,color:"#c47830"}}>{fmt(costoUndCLP)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {/* Tabla por cot con costo unitario */}
                                    <div style={{marginTop:12,background:"#fff",borderRadius:8,border:"1px solid #fde047",overflow:"hidden"}}>
                                      <div style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:"#854d0e",textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid #fde047"}}>Costo por cot (mercancía + flete + share extras)</div>
                                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                                        <thead>
                                          <tr style={{background:"#fef3c7",color:"#78350f"}}>
                                            <th style={{padding:"5px 8px",textAlign:"left"}}>Cot</th>
                                            <th style={{padding:"5px 8px",textAlign:"right"}}>Und</th>
                                            <th style={{padding:"5px 8px",textAlign:"right"}}>Peso real</th>
                                            <th style={{padding:"5px 8px",textAlign:"right"}}>Peso cobr.</th>
                                            <th style={{padding:"5px 8px",textAlign:"right"}}>Mercancía ¥</th>
                                            <th style={{padding:"5px 8px",textAlign:"right"}}>Flete ¥</th>
                                            <th style={{padding:"5px 8px",textAlign:"right"}}>Total ¥</th>
                                            <th style={{padding:"5px 8px",textAlign:"right"}}>¥/und</th>
                                            <th style={{padding:"5px 8px",textAlign:"right"}}>CLP/und</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detallesCot.map((d) => {
                                            // share por valor (consistente con calcCostoRealZaga)
                                            const shareVal = mercOp > 0 ? d.mercanciaRMB / mercOp : 1/detallesCot.length;
                                            const extrasShare = (otrosOpRMB + certOri) * shareVal + (certOri ? 0 : 0); // cert origen es per cot (no per share)
                                            // Mejor: cert origen ES per cot, no por share
                                            const certCotRMB = certOri;
                                            const otrosShareCotRMB = otrosOpRMB * shareVal;
                                            const comisionCotRMB = d.mercanciaRMB * comPct / 100;
                                            const otrosUSDShareCot = totalUSDExtra * shareVal;
                                            const totalCotRMB = d.mercanciaRMB + comisionCotRMB + d.fleteRMB + certCotRMB + otrosShareCotRMB;
                                            const totalCotUSD = totalCotRMB / TC_RMB_USD + otrosUSDShareCot;
                                            const totalCotCLP = totalCotUSD * tc;
                                            const undRMB = d.u > 0 ? totalCotRMB / d.u : 0;
                                            const undCLP = d.u > 0 ? totalCotCLP / d.u : 0;
                                            return (
                                              <tr key={d.c.id} style={{borderTop:"1px solid #fef3c7"}}>
                                                <td style={{padding:"5px 8px",fontWeight:700,color:"#0f172a"}}>{d.c.nro}</td>
                                                <td style={{padding:"5px 8px",textAlign:"right",color:"#475569"}}>{fmtN(d.u)}</td>
                                                <td style={{padding:"5px 8px",textAlign:"right",color:"#475569"}}>{fmtN(d.pesoReal,1)}kg</td>
                                                <td style={{padding:"5px 8px",textAlign:"right",color:"#475569"}}>{fmtN(d.pesoCobr,1)}kg</td>
                                                <td style={{padding:"5px 8px",textAlign:"right",color:"#475569"}}>¥{fmtN(d.mercanciaRMB,0)}</td>
                                                <td style={{padding:"5px 8px",textAlign:"right",color:"#475569"}}>¥{fmtN(d.fleteRMB,0)}</td>
                                                <td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:"#0f172a"}}>¥{fmtN(totalCotRMB,0)}</td>
                                                <td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:"#854d0e"}}>¥{fmtN(undRMB,2)}</td>
                                                <td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:"#c47830"}}>{fmt(undCLP)}</td>
                                              </tr>
                                            );
                                          })}
                                          <tr style={{borderTop:"2px solid #fde047",background:"#fef3c7"}}>
                                            <td style={{padding:"7px 8px",fontWeight:800,color:"#854d0e"}}>TOTAL</td>
                                            <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#854d0e"}}>{fmtN(totalUnd)}</td>
                                            <td colSpan={2} style={{padding:"7px 8px",textAlign:"right",fontSize:10,color:"#a16207",fontStyle:"italic"}}>(promedio OP →)</td>
                                            <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#0f172a"}}>¥{fmtN(mercOp,0)}</td>
                                            <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#0f172a"}}>¥{fmtN(fleteOp,0)}</td>
                                            <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#0f172a"}}>¥{fmtN(totalRMB,0)}</td>
                                            <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#854d0e"}}>¥{fmtN(costoUndRMB,2)}</td>
                                            <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#c47830"}}>{fmt(costoUndCLP)}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* ── PANEL COSTO REAL ZAGA — POR COT con aduana + IVA + margen editable ── */}
                              {(() => {
                                const rows = consolidados.map(({cot}) => ({ cot, cz: calcCostoRealZaga(cot, op, cots) }));
                                if (rows.length === 0) return null;
                                const TC_RMB_USD = rows[0]?.cz?.TC_RMB_USD || 7.03;
                                const tc = rows[0]?.cz?.tc || 950;
                                // Por cot: costo China, aduana share, IVA aduana share, costo c/IVA, % util editable, precio cliente, ganancia
                                const detalles = rows.map(({cot, cz}) => {
                                  const und = Number(cot.unidades) || 0;
                                  const chinaCLP = cz.totalChinaCLP || 0;
                                  const chileCLP = cz.totalChileCLP || 0; // aduana neta + arancel (proporcional)
                                  const ivaAgenteCLP = cz.ivaAgenteAer || 0; // IVA agente Leslie (recuperable F29)
                                  const ivaAduanaCLP = cz.ivaAduanaAer || 0; // IVA aduana (recuperable F29)
                                  const costoNeto = chinaCLP + chileCLP; // operacional (ambos IVA son recuperables, NO costo)
                                  const costoConIvaAduana = costoNeto + ivaAduanaCLP + ivaAgenteCLP; // total que sale de caja al despacho
                                  const costoUnd = und > 0 ? costoNeto / und : 0;
                                  const costoUndCIva = und > 0 ? costoConIvaAduana / und : 0;
                                  // Si hay precio acordado guardado Y la OP está cerrada/aplicada,
                                  // el precio manda y el margen se calcula como resultado real.
                                  // Si NO, el margen es el input editable y el precio se deriva.
                                  const opCerrada = ["pagada","en_camino","en_bodega","completada"].includes(op.estado);
                                  const precioAcordadoIvaUnd = Number(cot.precio_final_acordado_und) || 0;
                                  let margenPct, precioNetoUnd, precioIvaUnd, totalIvaCliente, totalNetoCliente, ganancia;
                                  if (precioAcordadoIvaUnd > 0 && (opCerrada || op.consolidado_aplicado_cliente)) {
                                    precioIvaUnd = precioAcordadoIvaUnd;
                                    precioNetoUnd = precioIvaUnd / 1.19;
                                    totalIvaCliente = precioIvaUnd * und;
                                    totalNetoCliente = precioNetoUnd * und;
                                    ganancia = totalNetoCliente - costoNeto;
                                    margenPct = totalNetoCliente > 0 ? (ganancia / totalNetoCliente) * 100 : 0;
                                  } else {
                                    margenPct = Number(margenesPorCot[cot.id] ?? cot.margen_objetivo_pct ?? 30);
                                    precioNetoUnd = costoUnd / (1 - margenPct/100);
                                    precioIvaUnd = precioNetoUnd * 1.19;
                                    totalIvaCliente = precioIvaUnd * und;
                                    totalNetoCliente = precioNetoUnd * und;
                                    ganancia = totalNetoCliente - costoNeto;
                                  }
                                  return { cot, und, chinaCLP, chileCLP, ivaAgenteCLP, ivaAduanaCLP, costoNeto, costoConIvaAduana, costoUnd, costoUndCIva, margenPct, precioNetoUnd, precioIvaUnd, totalIvaCliente, totalNetoCliente, ganancia };
                                });
                                const totChinaCLP   = detalles.reduce((s,d)=>s+d.chinaCLP,0);
                                const totChileCLP   = detalles.reduce((s,d)=>s+d.chileCLP,0);
                                const totIvaAgente  = detalles.reduce((s,d)=>s+d.ivaAgenteCLP,0);
                                const totIvaAduana  = detalles.reduce((s,d)=>s+d.ivaAduanaCLP,0);
                                const totCostoNeto  = detalles.reduce((s,d)=>s+d.costoNeto,0);
                                const totCostoCIva  = detalles.reduce((s,d)=>s+d.costoConIvaAduana,0);
                                const totVentaIva   = detalles.reduce((s,d)=>s+d.totalIvaCliente,0);
                                const totVentaNeto  = detalles.reduce((s,d)=>s+d.totalNetoCliente,0);
                                const totGanancia   = detalles.reduce((s,d)=>s+d.ganancia,0);
                                const margenOp      = totVentaNeto > 0 ? (totGanancia/totVentaNeto)*100 : 0;
                                const totUnd        = detalles.reduce((s,d)=>s+d.und,0);
                                return (
                                  <>
                                  {(() => {
                                    const opCerrada = ["pagada","en_camino","en_bodega","completada"].includes(op.estado);
                                    return null;
                                  })()}
                                  {/* TABLA 1: SIN IVA — costos, propuesta cliente, ganancia */}
                                  <div style={{marginTop:14,padding:14,background:"linear-gradient(135deg,#0f1e30 0%,#040c18 100%)",borderRadius:10,color:"#fff",border:"1px solid #c9a05544"}}>
                                    <div style={{fontSize:11,color:"#c9a055",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                                      <span>💼 Costo y propuesta cliente — OP {op.nro} (sin IVA){["pagada","en_camino","en_bodega","completada"].includes(op.estado) && <span style={{marginLeft:8,fontSize:10,background:"#1aa35833",color:"#bbf7d0",padding:"2px 8px",borderRadius:10}}>🔒 OP cerrada · precios congelados</span>}</span>
                                      <span style={{fontSize:10,background:"#facc1522",color:"#facc15",padding:"2px 8px",borderRadius:10,fontWeight:600}}>💱 RMB {TC_RMB_USD} · USD {tc}</span>
                                    </div>
                                    <div style={{fontSize:10,color:"#94a3b8",marginBottom:10,fontStyle:"italic"}}>
                                      Todo sin IVA · costo = lo que ZAGA absorbe · Edita "% util" por cot · precio cliente = costo/und ÷ (1 − util/100) · Ganancia = venta − costo
                                    </div>
                                    <div style={{overflowX:"auto"}}>
                                      <table style={{width:"100%",fontSize:11,borderCollapse:"collapse",minWidth:880}}>
                                        <thead>
                                          <tr style={{background:"#040c18",color:"#94a3b8"}}>
                                            <th style={{padding:"6px 6px",textAlign:"left",fontWeight:700}}>Cot</th>
                                            <th style={{padding:"6px 6px",textAlign:"right",fontWeight:700}}>Und</th>
                                            <th style={{padding:"6px 6px",textAlign:"right",fontWeight:700}}>China</th>
                                            <th style={{padding:"6px 6px",textAlign:"right",fontWeight:700}}>Aduana</th>
                                            <th style={{padding:"6px 6px",textAlign:"right",fontWeight:700,color:"#c9a055"}}>Costo/und</th>
                                            <th style={{padding:"6px 4px",textAlign:"center",fontWeight:700,color:"#06b6d4"}}>% util</th>
                                            <th style={{padding:"6px 6px",textAlign:"right",fontWeight:700}}>Precio/und</th>
                                            <th style={{padding:"6px 6px",textAlign:"right",fontWeight:700}}>Venta total</th>
                                            <th style={{padding:"6px 6px",textAlign:"right",fontWeight:700,color:"#10b981"}}>Ganancia</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detalles.map((d) => (
                                            <tr key={d.cot.id} style={{borderTop:"1px solid #1a2740"}}>
                                              <td style={{padding:"5px 6px",color:"#fff",fontWeight:700}}>{d.cot.nro}<div style={{fontSize:9,color:"#94a3b8",fontWeight:400}}>{(d.cot.cliente||"-").slice(0,12)}</div></td>
                                              <td style={{padding:"5px 6px",textAlign:"right",color:"#cbd5e1"}}>{fmtN(d.und)}</td>
                                              <td style={{padding:"5px 6px",textAlign:"right",color:"#cbd5e1"}}>{fmt(d.chinaCLP)}</td>
                                              <td style={{padding:"5px 6px",textAlign:"right",color:"#cbd5e1"}}>{fmt(d.chileCLP)}</td>
                                              <td style={{padding:"5px 6px",textAlign:"right",color:"#c9a055",fontWeight:700}}>{fmt(d.costoUnd)}</td>
                                              <td style={{padding:"5px 4px",textAlign:"center"}}>
                                                {["pagada","en_camino","en_bodega","completada"].includes(op.estado) ? (
                                                  <span style={{display:"inline-block",width:46,padding:"3px 5px",border:"1px solid #475569",borderRadius:5,fontSize:11,textAlign:"right",background:"#1e293b",color:"#94a3b8",opacity:0.85}}>{d.margenPct.toFixed(1)}</span>
                                                ) : (
                                                  <input type="number" step="1" min="0" max="100" value={d.margenPct}
                                                    onChange={e=>setMargenesPorCot(prev=>({...prev,[d.cot.id]:Number(e.target.value)||0}))}
                                                    style={{width:46,padding:"3px 5px",border:"1px solid #06b6d4",borderRadius:5,fontSize:11,textAlign:"right",background:"#06b6d422",color:"#fff",fontFamily:"inherit"}}/>
                                                )}
                                              </td>
                                              <td style={{padding:"5px 6px",textAlign:"right",color:"#fff",fontWeight:700}}>{fmt(d.precioNetoUnd)}</td>
                                              <td style={{padding:"5px 6px",textAlign:"right",color:"#fff",fontWeight:800}}>{fmt(d.totalNetoCliente)}</td>
                                              <td style={{padding:"5px 6px",textAlign:"right",color:d.ganancia>=0?"#22c55e":"#fca5a5",fontWeight:700}}>{fmt(d.ganancia)}</td>
                                            </tr>
                                          ))}
                                          <tr style={{borderTop:"2px solid #c9a055",background:"#1a2740"}}>
                                            <td style={{padding:"7px 6px",fontSize:11,fontWeight:800,color:"#c9a055"}}>TOTAL</td>
                                            <td style={{padding:"7px 6px",textAlign:"right",fontWeight:800,color:"#fff"}}>{fmtN(totUnd)}</td>
                                            <td style={{padding:"7px 6px",textAlign:"right",fontWeight:800,color:"#fff"}}>{fmt(totChinaCLP)}</td>
                                            <td style={{padding:"7px 6px",textAlign:"right",fontWeight:800,color:"#fff"}}>{fmt(totChileCLP)}</td>
                                            <td style={{padding:"7px 6px",textAlign:"right",fontSize:10,color:"#94a3b8",fontStyle:"italic"}}>(prom.)</td>
                                            <td style={{padding:"7px 4px",textAlign:"center",fontWeight:800,color:"#06b6d4"}}>{margenOp.toFixed(0)}%</td>
                                            <td style={{padding:"7px 6px",textAlign:"right",fontSize:10,color:"#94a3b8",fontStyle:"italic"}}>—</td>
                                            <td style={{padding:"7px 6px",textAlign:"right",fontWeight:800,color:"#fff",fontSize:12}}>{fmt(totVentaNeto)}</td>
                                            <td style={{padding:"7px 6px",textAlign:"right",fontWeight:800,color:totGanancia>=0?"#22c55e":"#fca5a5",fontSize:12}}>{fmt(totGanancia)}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                    {!["pagada","en_camino","en_bodega","completada"].includes(op.estado) && (
                                      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                                        {[10,15,20,25,28,30,35].map(p => (
                                          <button key={p} onClick={()=>{
                                            const next={};
                                            detalles.forEach(d => { next[d.cot.id]=p; });
                                            setMargenesPorCot(prev=>({...prev,...next}));
                                          }} style={{background:"#06b6d422",color:"#06b6d4",border:"1px solid #06b6d455",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                                            Aplicar {p}% a todas
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* TABLA 2: CON IVA — valores finales para factura/cobro */}
                                  <div style={{marginTop:12,padding:14,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10}}>
                                    <div style={{fontSize:11,color:"#15803d",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>
                                      🧾 Resumen con IVA por cotización — para factura
                                    </div>
                                    <div style={{overflowX:"auto"}}>
                                      <table style={{width:"100%",fontSize:11,borderCollapse:"collapse",minWidth:780,background:"#fff",borderRadius:7,overflow:"hidden"}}>
                                        <thead>
                                          <tr style={{background:"#dcfce7",color:"#14532d"}}>
                                            <th style={{padding:"7px 8px",textAlign:"left",fontWeight:700}}>Cot</th>
                                            <th style={{padding:"7px 8px",textAlign:"right",fontWeight:700}}>Und</th>
                                            <th title="Costo neto/und + IVA aduana proporcional. NO es costo × 1,19. El IVA aduana solo grava el CIF (mercancía + flete + seguro), NO la aduana chilena ni los servicios del agente. Es flujo de caja al despacho, recuperable por F29." style={{padding:"7px 8px",textAlign:"right",fontWeight:700,cursor:"help",textDecoration:"underline dotted #14532d99"}}>Costo /und c/IVA ℹ️</th>
                                            <th title="Costo neto total + IVA aduana total prorrateado (recuperable F29). Es lo que sale de caja al momento del despacho para liberar esta cot." style={{padding:"7px 8px",textAlign:"right",fontWeight:700,cursor:"help",textDecoration:"underline dotted #14532d99"}}>Costo total c/IVA ℹ️</th>
                                            <th title="Precio neto por unidad × 1,19 (IVA al cliente)." style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:"#15803d",cursor:"help",textDecoration:"underline dotted #15803d99"}}>Precio /und c/IVA ℹ️</th>
                                            <th title="Lo que el cliente paga total en la factura (precio /und c/IVA × unidades)." style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:"#15803d",cursor:"help",textDecoration:"underline dotted #15803d99"}}>Venta total c/IVA ℹ️</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detalles.map((d) => (
                                            <tr key={d.cot.id} style={{borderTop:"1px solid #d1fae5"}}>
                                              <td style={{padding:"6px 8px",color:"#0f172a",fontWeight:700}}>{d.cot.nro}<div style={{fontSize:9,color:"#64748b",fontWeight:400}}>{(d.cot.cliente||"-").slice(0,14)}</div></td>
                                              <td style={{padding:"6px 8px",textAlign:"right",color:"#475569"}}>{fmtN(d.und)}</td>
                                              <td style={{padding:"6px 8px",textAlign:"right",color:"#475569",fontWeight:600}}>{fmt(d.costoUndCIva)}</td>
                                              <td style={{padding:"6px 8px",textAlign:"right",color:"#0f172a",fontWeight:700}}>{fmt(d.costoConIvaAduana)}</td>
                                              <td style={{padding:"6px 8px",textAlign:"right",color:"#15803d",fontWeight:700}}>{fmt(d.precioIvaUnd)}</td>
                                              <td style={{padding:"6px 8px",textAlign:"right",color:"#15803d",fontWeight:800}}>{fmt(d.totalIvaCliente)}</td>
                                            </tr>
                                          ))}
                                          <tr style={{borderTop:"2px solid #16a34a",background:"#dcfce7"}}>
                                            <td style={{padding:"8px",fontSize:11,fontWeight:800,color:"#14532d"}}>TOTAL OP</td>
                                            <td style={{padding:"8px",textAlign:"right",fontWeight:800,color:"#14532d"}}>{fmtN(totUnd)}</td>
                                            <td style={{padding:"8px",textAlign:"right",fontSize:10,color:"#475569",fontStyle:"italic"}}>(prom. {fmt(totUnd>0?totCostoCIva/totUnd:0)})</td>
                                            <td style={{padding:"8px",textAlign:"right",fontSize:13,fontWeight:800,color:"#0f172a"}}>{fmt(totCostoCIva)}</td>
                                            <td style={{padding:"8px",textAlign:"right",fontSize:10,color:"#475569",fontStyle:"italic"}}>(prom. {fmt(totUnd>0?totVentaIva/totUnd:0)})</td>
                                            <td style={{padding:"8px",textAlign:"right",fontSize:13,fontWeight:800,color:"#15803d"}}>{fmt(totVentaIva)}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                    <div style={{marginTop:8,fontSize:10,color:"#15803d",fontStyle:"italic",lineHeight:1.6}}>
                                      💡 <b>Costo c/IVA ≠ Costo × 1,19.</b> Es <b>Costo neto + IVA aduana proporcional</b> (sale de caja al despacho, recuperable F29). El IVA aduana solo grava el CIF (mercancía + flete + seguro), no la aduana chilena ni servicios del agente.<br/>
                                      <b>Precio c/IVA</b> = precio neto × 1,19 (lo que el cliente paga en la factura). Pasa el mouse sobre los títulos ℹ️ para ver fórmulas.
                                    </div>
                                  </div>

                                  {/* ── RESUMEN FINAL GRANDE ── */}
                                  <div style={{marginTop:14,padding:18,background:"#fff",border:"2px solid #c9a055",borderRadius:12}}>
                                    <div style={{fontSize:12,color:"#854d0e",fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:14,textAlign:"center"}}>
                                      📊 Resumen final OP {op.nro}
                                    </div>
                                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
                                      <div style={{padding:"14px 16px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10}}>
                                        <div style={{fontSize:10,color:"#92400e",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>🇨🇳 Costo China</div>
                                        <div style={{fontSize:22,fontWeight:800,color:"#c47830"}}>{fmt(totChinaCLP)}</div>
                                      </div>
                                      <div style={{padding:"14px 16px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10}}>
                                        <div style={{fontSize:10,color:"#1e40af",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>🇨🇱 Costo Chile</div>
                                        <div style={{fontSize:22,fontWeight:800,color:"#2563eb"}}>{fmt(totChileCLP)}</div>
                                        <div style={{fontSize:9,color:"#475569",marginTop:2}}>Aduana neta + arancel</div>
                                      </div>
                                      <div style={{padding:"14px 16px",background:"#fefce8",border:"1px solid #fde047",borderRadius:10}}>
                                        <div style={{fontSize:10,color:"#854d0e",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>🧾 IVA aduana + agente (recuperable)</div>
                                        <div style={{fontSize:22,fontWeight:800,color:"#a16207"}}>{fmt(totIvaAduana + totIvaAgente)}</div>
                                        <div style={{fontSize:9,color:"#475569",marginTop:2}}>Sale de caja, se recupera por F29</div>
                                      </div>
                                      <div style={{padding:"14px 16px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10}}>
                                        <div style={{fontSize:10,color:"#15803d",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>💵 Venta total c/IVA</div>
                                        <div style={{fontSize:22,fontWeight:800,color:"#15803d"}}>{fmt(totVentaIva)}</div>
                                      </div>
                                      <div style={{padding:"14px 16px",background:"#dcfce7",border:"2px solid #16a34a",borderRadius:10}}>
                                        <div style={{fontSize:10,color:"#14532d",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>🏆 Ganancia neta</div>
                                        <div style={{fontSize:24,fontWeight:900,color:"#14532d"}}>{fmt(totGanancia)}</div>
                                        <div style={{fontSize:11,color:"#14532d",marginTop:2,fontWeight:700}}>Margen {fmtP(margenOp)}</div>
                                      </div>
                                    </div>
                                    <div style={{marginTop:12,padding:"10px 14px",background:"#f8fafc",borderRadius:8,fontSize:11,color:"#475569",lineHeight:1.6}}>
                                      <b>💡 Costo total ZAGA (a desembolsar al despacho):</b> {fmt(totCostoCIva)} CLP <span style={{color:"#94a3b8"}}>(China {fmt(totChinaCLP)} + Chile {fmt(totChileCLP)} + IVA aduana+agente {fmt(totIvaAduana + totIvaAgente)})</span>
                                      <br/><b>Costo NETO real ZAGA:</b> {fmt(totCostoNeto)} CLP (sin IVAs, ambos recuperables F29 — se compensan con el IVA débito al cliente).
                                    </div>
                                  </div>

                                  {/* BLOQUE PAGOS REALES — admin lleva ingresos por cliente + egresos */}
                                  <PagosRealesOp op={op} cots={cots} supabase={supabase} setOperaciones={setOperaciones} totVentaIva={totVentaIva} totCostoNeto={totCostoNeto} fmt={fmt} />
                                  </>
                                );
                              })()}
                              <div className="op-bottom-actions" style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                                <button onClick={async()=>{
                                  if(!confirm(`📢 Marcar OP ${op.nro} para que Sunny recotize?\n\nSunny verá la operación en su portal y deberá actualizar la tarifa de flete consolidada (USD/kg o USD/CBM según modo).`))return;
                                  try{
                                    const newOp = {...op, recotizacion_pendiente_sunny:true, recotizacion_completada_sunny:false, fecha_solicitud_recotizacion: new Date().toISOString()};
                                    delete newOp.id;
                                    await supabase.from("operaciones").update({datos:newOp,updated_at:new Date().toISOString()}).eq("id",op.id);
                                    // Marcar cada cot también
                                    await Promise.all(cots.map(async c=>{
                                      const newCot={...c, recotizacion_pendiente_sunny:true};
                                      delete newCot.id;
                                      delete newCot._id;
                                      delete newCot._updated;
                                      await supabase.from("cotizaciones").update({datos:newCot}).eq("id",c.id);
                                    }));
                                    setOperaciones(prev=>prev.map(o=>o.id===op.id?{...newOp,id:op.id}:o));
                                    setCotizaciones(prev=>prev.map(c=>cots.find(x=>x.id===c.id)?{...c,recotizacion_pendiente_sunny:true}:c));
                                    showToast("📢 Sunny notificada");
                                  }catch(e){showToast("Error: "+e.message,"err");}
                                }} disabled={op.recotizacion_pendiente_sunny&&!op.recotizacion_completada_sunny} style={{background:op.recotizacion_pendiente_sunny&&!op.recotizacion_completada_sunny?"#fff7ed":"#c47830",color:op.recotizacion_pendiente_sunny&&!op.recotizacion_completada_sunny?"#c47830":"#fff",border:"1px solid #c47830",borderRadius:7,padding:"8px 14px",fontSize:12,cursor:op.recotizacion_pendiente_sunny&&!op.recotizacion_completada_sunny?"default":"pointer",fontWeight:700}}>
                                  📢 {op.recotizacion_pendiente_sunny&&!op.recotizacion_completada_sunny?"Esperando Sunny...":"Notificar Sunny para recotizar"}
                                </button>
                                <button onClick={async()=>{
                                  // Si la OP YA está aplicada al cliente Y todas las cots tienen precio guardado,
                                  // RE-APLICAR significa: mantener precios + recalcular margen real solamente.
                                  // Si NO está aplicada o faltan precios: generar precios desde margen del panel.
                                  const cotsActivasApl = cots.filter(c => !["no_prospero"].includes(c.estado));
                                  const yaAplicado = op.consolidado_aplicado_cliente === true;
                                  const todasTienenPrecio = cotsActivasApl.every(c => Number(c.precio_final_acordado_und) > 0);
                                  const modoRecalcMargen = yaAplicado && todasTienenPrecio;
                                  const preciosPorCot = {};
                                  for (const c of cotsActivasApl) {
                                    const cz = calcCostoRealZaga(c, op, cots);
                                    const costoNeto = (cz.totalChinaCLP || 0) + (cz.totalChileCLP || 0);
                                    const und = Number(c.unidades) || 0;
                                    if (und <= 0 || costoNeto <= 0) continue;
                                    if (modoRecalcMargen) {
                                      // Modo respetar precio: precio existente manda → margen es el resultado
                                      const precioIvaUnd = Number(c.precio_final_acordado_und) || 0;
                                      const precioNetoUnd = precioIvaUnd / 1.19;
                                      const margenReal = precioNetoUnd > 0 ? ((precioNetoUnd - costoNeto/und) / precioNetoUnd) * 100 : 0;
                                      preciosPorCot[c.id] = { precio: precioIvaUnd, margen: Math.round(margenReal * 10) / 10 };
                                    } else {
                                      // Modo generar precio: margen del panel → precio
                                      const margenPanel = margenesPorCot[c.id] ?? c.margen_objetivo_pct ?? 30;
                                      const precioNetoUnd = (costoNeto / und) / (1 - margenPanel/100);
                                      const precioIvaUnd = precioNetoUnd * 1.19;
                                      preciosPorCot[c.id] = { precio: Math.round(precioIvaUnd), margen: margenPanel };
                                    }
                                  }
                                  const previewLines = Object.entries(preciosPorCot).map(([id,v]) => {
                                    const c = cotsActivasApl.find(x => x.id===id);
                                    return `  ${c?.nro || id}: $${v.precio.toLocaleString("es-CL")}/und c/IVA (margen ${v.margen}%)`;
                                  }).join("\n");
                                  const titulo = modoRecalcMargen
                                    ? `🔄 RE-APLICAR consolidado — OP ${op.nro}\n\nSe MANTIENEN los precios al cliente (ya enviados).\nSe RECALCULA el margen real con los costos actualizados:`
                                    : `✅ Aplicar consolidado al cliente — OP ${op.nro}\n\nSe guardarán estos precios CON IVA y el cliente los verá en su portal:`;
                                  if(!confirm(`${titulo}\n\n${previewLines}`))return;
                                  try{
                                    const newOp = {...op, consolidado_aplicado_cliente:true, fecha_aplicacion_cliente: new Date().toISOString()};
                                    delete newOp.id;
                                    await supabase.from("operaciones").update({datos:newOp,updated_at:new Date().toISOString()}).eq("id",op.id);
                                    // Cots a promover a "cotizada": solo las que están en "solicitud" o vacío.
                                    // No retroceder cots ya pagadas/en_camino/en_bodega/completada ni tocar no_prospero.
                                    const promovibles = new Set(["", "solicitud"]);
                                    await Promise.all(cots.map(async c=>{
                                      const newCot={...c, consolidado_aplicado_cliente:true};
                                      const pv = preciosPorCot[c.id];
                                      if (pv) {
                                        newCot.precio_final_acordado_und = pv.precio;
                                        newCot.margen_objetivo_pct = pv.margen;
                                      }
                                      if (promovibles.has(c.estado || "")) {
                                        newCot.estado = "cotizada";
                                        newCot.checklist = {...(c.checklist||{}), cotizada: true};
                                      }
                                      delete newCot.id; delete newCot._id; delete newCot._updated;
                                      // Actualiza columna top-level `estado` además de `datos` para que el portal Sunny lo lea
                                      const updates = {datos:newCot};
                                      if (promovibles.has(c.estado || "")) updates.estado = "cotizada";
                                      await supabase.from("cotizaciones").update(updates).eq("id",c.id);
                                    }));
                                    setOperaciones(prev=>prev.map(o=>o.id===op.id?{...newOp,id:op.id}:o));
                                    setCotizaciones(prev=>prev.map(c=>{
                                      const pv = preciosPorCot[c.id];
                                      if (cots.find(x=>x.id===c.id)) {
                                        const patch = { ...c, consolidado_aplicado_cliente:true, ...(pv ? { precio_final_acordado_und: pv.precio, margen_objetivo_pct: pv.margen } : {}) };
                                        if (promovibles.has(c.estado || "")) {
                                          patch.estado = "cotizada";
                                          patch.checklist = {...(c.checklist||{}), cotizada: true};
                                        }
                                        return patch;
                                      }
                                      return c;
                                    }));
                                    showToast("✅ Consolidado aplicado — precios guardados");
                                  }catch(e){showToast("Error: "+e.message,"err");}
                                }} disabled={(op.recotizacion_pendiente_sunny && !op.recotizacion_completada_sunny) || ["pagada","en_camino","en_bodega","completada"].includes(op.estado)} style={{background:["pagada","en_camino","en_bodega","completada"].includes(op.estado)?"#e2e8f0":((op.recotizacion_pendiente_sunny && !op.recotizacion_completada_sunny)?"#e2e8f0":(op.consolidado_aplicado_cliente?"#0d9870":"#1aa358")),color:(["pagada","en_camino","en_bodega","completada"].includes(op.estado) || (op.recotizacion_pendiente_sunny && !op.recotizacion_completada_sunny))?"#94a3b8":"#fff",border:`1px solid ${["pagada","en_camino","en_bodega","completada"].includes(op.estado)?"#cbd5e1":((op.recotizacion_pendiente_sunny && !op.recotizacion_completada_sunny)?"#cbd5e1":(op.consolidado_aplicado_cliente?"#0d9870":"#1aa358"))}`,borderRadius:7,padding:"8px 14px",fontSize:12,cursor:((op.recotizacion_pendiente_sunny && !op.recotizacion_completada_sunny) || ["pagada","en_camino","en_bodega","completada"].includes(op.estado))?"not-allowed":"pointer",fontWeight:700}} title={["pagada","en_camino","en_bodega","completada"].includes(op.estado)?"OP cerrada (pagada/en camino/en bodega/completada) — los precios al cliente quedan congelados":""}>
                                  {["pagada","en_camino","en_bodega","completada"].includes(op.estado)?"🔒 OP cerrada · precios congelados":((op.recotizacion_pendiente_sunny && !op.recotizacion_completada_sunny)?"⏳ Esperando respuesta Sunny...":(op.consolidado_aplicado_cliente?"🔄 Re-aplicar consolidado al cliente":"✅ Aplicar consolidado al cliente"))}
                                </button>
                                {/* Botón sincronizar estados */}
                                {(()=>{
                                  const nuevoEstadoCot = OP_COT_STATE_MAP[op.estado];
                                  const cotsAfectables = cots.filter(c => !COT_ESTADOS_TERMINALES.includes(c.estado) && c.estado !== nuevoEstadoCot);
                                  const puedeSincronizar = nuevoEstadoCot && cotsAfectables.length > 0;
                                  if (!nuevoEstadoCot) return null;
                                  return (
                                    <button onClick={async()=>{
                                      if(!confirm(`🔄 Sincronizar estado de ${cotsAfectables.length} cotización(es) a "${nuevoEstadoCot}"?\n\nOperación: ${op.nro} (${op.estado})\nLas cots en estados terminales (rechazada/anulada/no procesada) se omiten.`))return;
                                      try{
                                        let actualizadas = 0;
                                        for (const cot of cotsAfectables) {
                                          const {id, ...rest} = cot;
                                          const newDatos = {...rest, estado: nuevoEstadoCot};
                                          if (nuevoEstadoCot === "pagada" && !(rest.checklist||{}).pago1_cliente) {
                                            newDatos.checklist = {...(rest.checklist||{}), pago1_cliente:true};
                                            if (!rest.fecha_pago1_cliente) newDatos.fecha_pago1_cliente = new Date().toISOString().split("T")[0];
                                          }
                                          await supabase.from("cotizaciones").update({datos: newDatos}).eq("id", id);
                                          actualizadas++;
                                        }
                                        setCotizaciones(prev=>prev.map(c=>{
                                          if(!cotsAfectables.find(x=>x.id===c.id)) return c;
                                          const upd={...c,estado:nuevoEstadoCot};
                                          if(nuevoEstadoCot==="pagada"&&!(c.checklist||{}).pago1_cliente){
                                            upd.checklist={...(c.checklist||{}),pago1_cliente:true};
                                            if(!c.fecha_pago1_cliente) upd.fecha_pago1_cliente=new Date().toISOString().split("T")[0];
                                          }
                                          return upd;
                                        }));
                                        showToast(`✓ ${actualizadas} cotización(es) sincronizadas a "${nuevoEstadoCot}"`);
                                      }catch(e){showToast("Error: "+e.message,"err");}
                                    }} disabled={!puedeSincronizar} style={{background:puedeSincronizar?"#eef6ff":"#f1f5f9",color:puedeSincronizar?"#2d78c8":"#94a3b8",border:`1px solid ${puedeSincronizar?"#bfdbfe":"#e2e8f0"}`,borderRadius:7,padding:"8px 14px",fontSize:12,cursor:puedeSincronizar?"pointer":"not-allowed",fontWeight:700}}>
                                      🔄 {puedeSincronizar?`Sincronizar ${cotsAfectables.length} cots a "${nuevoEstadoCot}"`:"Estados ya sincronizados"}
                                    </button>
                                  );
                                })()}
                              </div>

                              {/* Vista cliente formal por cada cliente de la OP */}
                              <div style={{marginTop:14,padding:"12px 14px",background:"#eef6ff",border:"1px solid #bfdbfe",borderRadius:8}}>
                                <div style={{fontSize:11,color:"#2d78c8",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>
                                  📄 Vista cliente formal — enviar cotización consolidada
                                </div>
                                <div style={{fontSize:10,color:"#475569",marginBottom:8,fontStyle:"italic"}}>
                                  {clienteUnico ? "Un único cliente en esta operación." : `${clientesOp.length} clientes — elige cuál ver / imprimir / enviar.`}
                                </div>
                                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                  {clientesOp.map(cl => {
                                    const clT = (cl||"").trim();
                                    const cotsCl = cots.filter(c => (c.cliente||"").trim() === clT && !["no_prospero"].includes(c.estado));
                                    if (cotsCl.length === 0) return null;
                                    return (
                                      <button key={cl} onClick={()=>{
                                        setVistaOpId(op.id);
                                        setVistaOpCliente(clT);
                                        setPrintModal("op_cliente");
                                      }} style={{background:"#fff",color:"#2d78c8",border:"1px solid #2d78c8",borderRadius:7,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                                        👁 {clT} <span style={{opacity:.6,fontWeight:400}}>({cotsCl.length} cots)</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                !["completada","no_prospero"].includes(c.estado)&&
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
                c.gestor==="luisa"&&c.tipo!=="propia"&&c.checklist?.pago1_cliente&&c.fecha_pago1_cliente&&!["no_prospero"].includes(c.estado)
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

              const esAereo=c=>c.transporte==="aereo";
              const calcComisionMes=(lista)=>{
                // % se determina por TOTAL de cierres del mes (global, no por modalidad)
                const pct=lista.length>=6?0.25:0.20;
                const aereo=lista.filter(esAereo);
                const maritimo=lista.filter(c=>!esAereo(c));
                const baseAereo=aereo.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
                const baseMar=maritimo.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
                return {
                  pct,
                  aereo:{pct,base:baseAereo,comision:baseAereo*pct,nro:aereo.length,lista:aereo},
                  maritimo:{pct,base:baseMar,comision:baseMar*pct,nro:maritimo.length,lista:maritimo},
                  comisionTotal:(baseAereo+baseMar)*pct,
                  baseTotal:baseAereo+baseMar,
                  nroTotal:lista.length,
                };
              };

              // Pendiente de pago = mes anterior (primeros 5 días del mes actual)
              const pendienteMes=porMes[mesAnt]||[];
              const pendienteCalc=pendienteMes.length>0?calcComisionMes(pendienteMes):null;
              const diasMes=hoy.getDate();

              const SubLinea=({sub,modo,color,icon})=>{
                if(sub.nro===0) return null;
                return(
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"8px 10px",background:color+"08",borderRadius:8,border:`1px solid ${color}22`,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:13}}>{icon}</span>
                      <span style={{fontSize:12,fontWeight:700,color}}>{modo}</span>
                      <span style={{background:"#f1f5f9",color:"#475569",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:"1px solid #e2e8f0"}}>{sub.nro} cierres</span>
                    </div>
                    <div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}>
                      <span style={{color:"#64748b"}}>Base: <b style={{color:"#0f172a"}}>{fmt(sub.base)}</b></span>
                      <span style={{color:"#64748b"}}>Comisión: <b style={{color:"#a85590"}}>{fmt(sub.comision)}</b></span>
                    </div>
                  </div>
                );
              };

              return (
                <div style={{background:"#040c18",borderRadius:14,padding:20,border:"1px solid #f9a8d4",marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                    <span style={{fontSize:20}}>👩‍💼</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#a85590"}}>Comisiones Luisa</div>
                      <div style={{fontSize:11,color:"#64748b"}}>20% por 1–5 cierres · 25% por 6+ cierres (sobre el TOTAL del mes, marítimo + aéreo) · Base: ganancia importación</div>
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
                          {pendienteCalc.nroTotal} cierres en {monthLabel(mesAnt)} ({pendienteCalc.maritimo.nro}🚢 + {pendienteCalc.aereo.nro}✈️) · Base: {fmt(pendienteCalc.baseTotal)} → <b style={{color:"#a85590"}}>{fmt(pendienteCalc.comisionTotal)}</b>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabla por mes */}
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {mesesConCierres.map(m=>{
                      const lista=porMes[m];
                      const {pct,aereo,maritimo,comisionTotal,baseTotal,nroTotal}=calcComisionMes(lista);
                      const ganEmpresa=baseTotal-comisionTotal;
                      const esMesAnt=m===mesAnt;
                      return(
                        <div key={m} style={{background:"#ffffff",borderRadius:10,padding:"12px 16px",border:`1px solid ${esMesAnt?"#e9d5ff":"#e2e8f0"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                              <span style={{fontWeight:700,fontSize:13,color:esMesAnt?"#a85590":"#aaa",textTransform:"capitalize"}}>{monthLabel(m)}</span>
                              <span style={{background:nroTotal>=6?"#b8922e22":"#2d78c822",color:nroTotal>=6?"#b8922e":"#2d78c8",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:`1px solid ${nroTotal>=6?"#b8922e44":"#2d78c844"}`}}>{nroTotal} cierres → {fmtP(pct*100)}</span>
                              {esMesAnt&&<span style={{background:"#c0392b18",color:"#c0392b",fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",border:"1px solid #ef444433"}}>⚠ Pagar antes del 5</span>}
                            </div>
                            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Base total</div>
                                <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmt(baseTotal)}</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:9,color:"#a85590",textTransform:"uppercase",letterSpacing:1}}>Comisión total</div>
                                <div style={{fontSize:15,fontWeight:800,color:"#a85590"}}>{fmt(comisionTotal)}</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:9,color:"#1aa358",textTransform:"uppercase",letterSpacing:1}}>Empresa neto</div>
                                <div style={{fontSize:15,fontWeight:800,color:"#1aa358"}}>{fmt(ganEmpresa)}</div>
                              </div>
                            </div>
                          </div>

                          {/* Resumen por modalidad */}
                          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                            <SubLinea sub={maritimo} modo="Marítimo" color="#2a8aaa" icon="🚢"/>
                            <SubLinea sub={aereo} modo="Aéreo" color="#c47830" icon="✈️"/>
                          </div>

                          {/* Detalle por cotización agrupado por modalidad */}
                          {[["🚢 Marítimas",maritimo],["✈️ Aéreas",aereo]].map(([titulo,sub])=>sub.nro>0&&(
                            <div key={titulo} style={{marginTop:6}}>
                              <div style={{fontSize:10,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{titulo} ({sub.nro})</div>
                              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                {sub.lista.map(c=>{
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
                          ))}
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
          const aereas=todas.filter(c=>c.transporte==="aereo");
          const maritimas=todas.filter(c=>c.transporte!=="aereo");
          const baseAer=aereas.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
          const baseMar=maritimas.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
          const totalGan=baseAer+baseMar;
          const com20=totalGan*0.20, com25=totalGan*0.25;
          const emp20=totalGan-com20, emp25=totalGan-com25;
          const SubCard=({titulo,icon,color,lista,base})=>(
            <div style={{background:color+"08",border:`1px solid ${color}33`,borderRadius:12,padding:"14px 18px"}}>
              <div style={{fontSize:11,fontWeight:700,color,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>{icon} {titulo} · {lista.length} cots</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,color:"#64748b"}}>Base ganancia imp.</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmt(base)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,color:"#2d78c8"}}>Comisión 20%</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#2d78c8"}}>{fmt(base*0.20)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${color}33`,paddingTop:6}}>
                  <span style={{fontSize:11,color:"#b8922e"}}>Comisión 25%</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#b8922e"}}>{fmt(base*0.25)}</span>
                </div>
              </div>
            </div>
          );
          return(
            <div style={{position:"fixed",inset:0,background:"#000c",zIndex:1600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
              <div style={{background:"#ffffff",borderRadius:16,border:"1px solid #e9d5ff",width:"100%",maxWidth:820,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
                {/* Header */}
                <div style={{padding:"18px 24px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:"#a85590"}}>🧮 Simulación total — Comisiones Luisa</div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Todas las cotizaciones asignadas a Luisa con ganancia calculada · Marítimo vs Aéreo</div>
                  </div>
                  <button onClick={()=>setSimModal(false)} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"7px 13px",cursor:"pointer",fontSize:13}}>✕</button>
                </div>

                {/* Resumen separado por modalidad */}
                <div style={{padding:"16px 24px",borderBottom:"1px solid #e2e8f0"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                    <SubCard titulo="Marítimas" icon="🚢" color="#2a8aaa" lista={maritimas} base={baseMar}/>
                    <SubCard titulo="Aéreas" icon="✈️" color="#c47830" lista={aereas} base={baseAer}/>
                  </div>

                  {/* Total combinado */}
                  <div style={{background:"#a8559008",border:"1px solid #a8559033",borderRadius:12,padding:"14px 18px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#a85590",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Total combinado · {todas.length} cotizaciones</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      {[[20,com20,emp20,"#2d78c8"],[25,com25,emp25,"#b8922e"]].map(([pct,com,emp,col])=>(
                        <div key={pct} style={{display:"flex",flexDirection:"column",gap:4}}>
                          <div style={{display:"flex",justifyContent:"space-between"}}>
                            <span style={{fontSize:11,color:col,fontWeight:700}}>Escenario {pct}%</span>
                            <span style={{fontSize:13,fontWeight:800,color:col}}>{fmt(com)}</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between"}}>
                            <span style={{fontSize:10,color:"#1aa358"}}>Empresa neto</span>
                            <span style={{fontSize:11,fontWeight:700,color:"#1aa358"}}>{fmt(emp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{borderTop:"1px solid #a8559033",marginTop:8,paddingTop:6,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,color:"#64748b"}}>Base total ganancia imp.</span>
                      <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{fmt(totalGan)}</span>
                    </div>
                  </div>
                </div>

                {/* Tabla detalle */}
                <div style={{flex:1,overflow:"auto",padding:"12px 24px"}}>
                  {todas.length===0?(
                    <div style={{textAlign:"center",padding:40,color:"#444"}}>No hay cotizaciones de Luisa con ganancia calculada aún.</div>
                  ):(
                    [["🚢 Marítimas",maritimas,"#2a8aaa",baseMar],["✈️ Aéreas",aereas,"#c47830",baseAer]].map(([titulo,lista,color,base])=>lista.length>0&&(
                      <div key={titulo} style={{marginBottom:16}}>
                        <div style={{fontSize:12,fontWeight:700,color,marginBottom:6,padding:"4px 8px",background:color+"11",borderRadius:6,borderLeft:`3px solid ${color}`}}>{titulo} — {lista.length} cots — Base {fmt(base)}</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr 1fr",gap:8,padding:"6px 8px",marginBottom:6}}>
                          {["NRO","Cliente · Producto","Estado","Gan. imp.","Com. 20% / 25%"].map(h=>(
                            <div key={h} style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>{h}</div>
                          ))}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {lista.map(c=>{
                            const g=c.calc?.ganImp||0;
                            const sc2=EST_COLOR[c.estado]||"#888";
                            return(
                              <div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr 1fr",gap:8,padding:"8px 10px",background:"#f8fafc",borderRadius:8,alignItems:"center",border:"1px solid #e2e8f0"}}>
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
                        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr 1fr",gap:8,padding:"10px 10px",marginTop:8,borderTop:`1px dashed ${color}55`}}>
                          <div style={{gridColumn:"1/4",fontSize:11,fontWeight:700,color}}>SUBTOTAL {titulo} ({lista.length})</div>
                          <div style={{fontSize:13,fontWeight:800,color:"#0f172a",textAlign:"right"}}>{fmt(base)}</div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:11,fontWeight:800,color:"#2d78c8"}}>{fmt(base*0.20)}</div>
                            <div style={{fontSize:11,fontWeight:800,color:"#b8922e"}}>{fmt(base*0.25)}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══ CLIENTES ══ */}
        {tab2==="clientes"&&(()=>{
          const clientes=[...new Set(cotizaciones.filter(c=>c.tipo!=="propia"&&c.cliente).map(c=>c.cliente))]
            .sort((a,b)=>{
              const ganA=cotizaciones.filter(c=>c.cliente===a&&c.tipo!=="propia"&&!["no_prospero"].includes(c.estado)).reduce((s,c)=>s+(c.calc?.ganImp||0),0);
              const ganB=cotizaciones.filter(c=>c.cliente===b&&c.tipo!=="propia"&&!["no_prospero"].includes(c.estado)).reduce((s,c)=>s+(c.calc?.ganImp||0),0);
              return ganB-ganA;
            });
          const todasCliente=clienteSeleccionado?cotizaciones.filter(c=>c.cliente===clienteSeleccionado&&c.tipo!=="propia"):[];

          // Estados agrupados para filtro
          const RECHAZADAS=["no_prospero"];
          const impsCliente=todasCliente.filter(c=>{
            if(filtroCliente==="todas") return true;
            if(filtroCliente==="activas") return !RECHAZADAS.includes(c.estado)&&c.estado!=="completada";
            if(filtroCliente==="completadas") return c.estado==="completada";
            if(filtroCliente==="rechazadas") return RECHAZADAS.includes(c.estado);
            return true;
          });

          // KPIs sobre TODAS (sin filtro)
          // - totPagado / tot1er / tot2do: usan valores CON IVA (lo que el cliente realmente paga / factura)
          // - totGanancia: usa ganImpAjustado (considera precio_final_acordado_und si fue editado)
          const totUnidades=todasCliente.filter(c=>!RECHAZADAS.includes(c.estado)).reduce((s,c)=>s+(Number(c.unidades)||0),0);
          const totPagado=todasCliente.filter(c=>!RECHAZADAS.includes(c.estado)).reduce((s,c)=>s+(c.calc?.totClIvaFinal||c.calc?.totClIva||(c.calc?.totCl||0)*1.19),0);
          const tot1er=todasCliente.filter(c=>!RECHAZADAS.includes(c.estado)).reduce((s,c)=>s+(c.calc?.p1ClIva||(c.calc?.p1Cl||0)*1.19),0);
          const tot2do=todasCliente.filter(c=>!RECHAZADAS.includes(c.estado)).reduce((s,c)=>s+(c.calc?.p2ClIva||(c.calc?.p2Cl||0)*1.19),0);
          const totGanancia=todasCliente.filter(c=>!RECHAZADAS.includes(c.estado)).reduce((s,c)=>s+(c.calc?.ganImpAjustado||c.calc?.ganImp||0),0);
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
                    const rech=imps.filter(c=>["no_prospero"].includes(c.estado)).length;
                    const conv=imps.length>0?Math.round((imps.filter(c=>PROCESADAS.includes(c.estado)).length/imps.length)*100):0;
                    const ganTotal=imps.filter(c=>!["no_prospero"].includes(c.estado)).reduce((s,c)=>s+(c.calc?.ganImp||0),0);
                    const sel=clienteSeleccionado===cl;
                    const tienePrimerPago=imps.some(c=>c.checklist?.pago1_cliente);
                    const tieneAcceso=imps.some(c=>c.app_email);
                    return(
                      <div key={cl} onClick={()=>{setClienteSeleccionado(sel?null:cl);setFiltroCliente("todas");}} style={{background:sel?"#f0fdf4":"#f8fafc",border:`1px solid ${sel?"#22c55e55":"#e2e8f0"}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all .15s"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <div style={{flex:1,minWidth:0}}><span style={{fontWeight:700,fontSize:13,color:sel?"#1aa358":"#0f172a"}}>👤 {cl}</span>{getClientCode(cl)&&<span style={{fontSize:9,fontFamily:"monospace",color:sel?"#1aa358":"#94a3b8",marginLeft:6}}>{getClientCode(cl)}</span>}</div>
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
                        {ganTotal>0&&(
                          <div style={{marginTop:6,fontSize:11,fontWeight:700,color:"#c9a055"}}>
                            💰 {fmt(ganTotal)} ganancia
                          </div>
                        )}
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
                        <div style={{display:"flex",alignItems:"baseline",gap:8}}><div style={{fontWeight:800,fontSize:18,color:"#0f172a"}}>👤 {clienteSeleccionado}</div>{getClientCode(clienteSeleccionado)&&<span style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:"#c9a055",background:"#040c1810",border:"1px solid #c9a05540",borderRadius:6,padding:"2px 8px"}}>{getClientCode(clienteSeleccionado)}</span>}</div>
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
                    <div style={{marginBottom:16}}>
                      {totGanancia>0&&(
                        <div style={{background:"#040c18",borderRadius:10,padding:"14px 18px",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",border:"1px solid #c9a05530"}}>
                          <div>
                            <div style={{fontSize:10,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>💰 Ganancia total ZAGA</div>
                            <div style={{fontSize:22,fontWeight:800,color:"#c9a055"}}>{fmt(totGanancia)}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:10,color:"#94a3b8",marginBottom:3}}>sobre {fmt(totPagado)} facturado</div>
                            <div style={{fontSize:13,fontWeight:700,color:"#c9a05599"}}>{totPagado>0?Math.round((totGanancia/totPagado)*100):0}% margen</div>
                          </div>
                        </div>
                      )}
                      <div className="dash-fin3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                        {[["Total facturado",fmt(totPagado),"#0f172a"],["1er pago",fmt(tot1er),"#16a34a"],["2do pago",fmt(tot2do),"#334155"]].map(([l,v,col])=>(
                          <div key={l} style={{background:"#f0fdf4",borderRadius:10,padding:"12px 14px",border:"1px solid #bbf7d0",textAlign:"center"}}>
                            <div style={{fontSize:10,color:"#64748b",marginBottom:3,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                            <div style={{fontSize:15,fontWeight:800,color:col}}>{v}</div>
                          </div>
                        ))}
                      </div>
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
                            <button onClick={()=>{navigator.clipboard.writeText(`Email: ${appEmail}\nContraseña: ${appPass}\nhttps://zaga-imp.vercel.app/`);showToast("Credenciales copiadas ✓");}}
                              style={{background:"#040c18",color:"#c9a055",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700,alignSelf:"flex-start"}}>
                              📤 Copiar todo para enviar al cliente
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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
          const enProceso=todas.filter(c=>["solicitud","cotizada","pagada","en_camino"].includes(c.estado));
          const cerradas=todas.filter(c=>c.checklist?.pago1_cliente&&c.fecha_pago1_cliente&&!["no_prospero"].includes(c.estado));
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
            // Desglose por modalidad (pct global del mes se aplica a las dos)
            const aereoLista=lista.filter(c=>c.transporte==="aereo");
            const marLista=lista.filter(c=>c.transporte!=="aereo");
            const baseAer=aereoLista.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
            const baseMar=marLista.reduce((s,c)=>s+(c.calc?.ganImp||0),0);
            return {
              n,pct,base,com:base*pct,emp:base*(1-pct),
              aereo:{lista:aereoLista,n:aereoLista.length,base:baseAer,com:baseAer*pct},
              maritimo:{lista:marLista,n:marLista.length,base:baseMar,com:baseMar*pct},
            };
          };

          // Mes en curso: cotizaciones con 1er pago en mes actual
          const mesActualList=porMes[mesActual]||[];
          const mesActualCalc=calcMes(mesActualList);

          // Proyección mes actual: + cotizaciones aceptadas sin pago aún
          const proyPendientes=todas.filter(c=>["pagada"].includes(c.estado)&&!c.checklist?.pago1_cliente);
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
                  {/* Desglose por modalidad */}
                  {(mesActualCalc.maritimo.n+mesActualCalc.aereo.n)>0&&(
                    <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      {[
                        ["🚢 Marítimo","#2a8aaa",mesActualCalc.maritimo],
                        ["✈️ Aéreo","#c47830",mesActualCalc.aereo],
                      ].map(([lbl,col,sub])=>(
                        <div key={lbl} style={{background:sub.n>0?col+"08":"#f1f5f9",border:`1px solid ${sub.n>0?col+"33":"#e2e8f0"}`,borderRadius:7,padding:"6px 9px"}}>
                          <div style={{fontSize:10,fontWeight:700,color:sub.n>0?col:"#94a3b8",marginBottom:2}}>{lbl} · {sub.n}</div>
                          <div style={{fontSize:10,color:"#64748b"}}>Base <b style={{color:"#0f172a"}}>{fmt(sub.base)}</b></div>
                          <div style={{fontSize:10,color:"#64748b"}}>Com. <b style={{color:"#a85590"}}>{fmt(sub.com)}</b></div>
                        </div>
                      ))}
                    </div>
                  )}
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
                      <span style={{fontSize:22,fontWeight:800,color:"#64748b"}}>{fmt(proyComision)}</span>
                    </div>
                  </div>
                  {proyPendientes.length>0&&(
                    <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
                      {proyPendientes.map(c=>(
                        <div key={c.id} style={{display:"flex",justifyContent:"space-between",fontSize:10,padding:"3px 8px",background:"#f8fafc",borderRadius:6}}>
                          <span style={{color:"#94a3b8"}}>{c.nro} · {c.cliente} (hipotético)</span>
                          <span style={{color:"#94a3b8",fontWeight:500}}>+{fmt((c.calc?.ganImp||0)*proyPct)}</span>
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
                      const {n,pct,base,com,emp,aereo,maritimo}=calcMes(porMes[m]);
                      const esPendiente=m===mesAnt&&hoy.getDate()<=5;
                      return(
                        <div key={m} style={{background:esPendiente?"#08121e":"#f8fafc",borderRadius:10,padding:"12px 16px",border:`1px solid ${esPendiente?"#c0392b33":"#1a2d45"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
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

                          {/* Desglose por modalidad */}
                          <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}} className="luisa-grid">
                            {[
                              ["🚢 Marítimo","#2a8aaa",maritimo],
                              ["✈️ Aéreo","#c47830",aereo],
                            ].map(([lbl,col,sub])=>(
                              <div key={lbl} style={{background:sub.n>0?col+"08":"#f1f5f9",border:`1px solid ${sub.n>0?col+"33":"#e2e8f0"}`,borderRadius:8,padding:"8px 10px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                  <span style={{fontSize:11,fontWeight:700,color:sub.n>0?col:"#94a3b8"}}>{lbl}</span>
                                  <span style={{fontSize:10,color:"#64748b"}}>{sub.n} cierres</span>
                                </div>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b"}}>
                                  <span>Base: <b style={{color:"#0f172a"}}>{fmt(sub.base)}</b></span>
                                  <span>Comisión: <b style={{color:"#a85590"}}>{fmt(sub.com)}</b></span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Mini detalle agrupado por modalidad */}
                          {[["🚢 Marítimas",maritimo,"#2a8aaa"],["✈️ Aéreas",aereo,"#c47830"]].map(([titulo,sub,col])=>sub.n>0&&(
                            <div key={titulo} style={{marginTop:8}}>
                              <div style={{fontSize:9,color:col,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{titulo}</div>
                              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                {sub.lista.map(c=>(
                                  <div key={c.id} style={{background:"#f1f5f9",borderRadius:6,padding:"3px 10px",fontSize:10,color:"#777"}}>
                                    {c.nro} · {c.cliente} · <span style={{color:"#a85590",fontWeight:600}}>{fmt((c.calc?.ganImp||0)*pct)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
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
