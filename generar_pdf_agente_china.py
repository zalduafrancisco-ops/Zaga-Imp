# -*- coding: utf-8 -*-
"""PDF resumen para agente chino (Darlan u otro) — análisis 4 cotizaciones Cristóbal."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable
)

FONT_REG = "MSYaHei"
FONT_BOLD = "MSYaHeiBold"
try:
    pdfmetrics.registerFont(TTFont(FONT_REG, "C:/Windows/Fonts/msyh.ttc", subfontIndex=0))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, "C:/Windows/Fonts/msyhbd.ttc", subfontIndex=0))
except Exception:
    pdfmetrics.registerFont(TTFont(FONT_REG, "C:/Windows/Fonts/simsun.ttc"))
    FONT_BOLD = FONT_REG

NAVY = colors.HexColor("#040c18")
GOLD = colors.HexColor("#c9a055")
LIGHT_BG = colors.HexColor("#f8fafc")
BORDER = colors.HexColor("#e2e8f0")
GRAY = colors.HexColor("#64748b")
DARK = colors.HexColor("#0f172a")
GOLD_LIGHT = colors.HexColor("#fef3c7")
RED_LIGHT = colors.HexColor("#fee2e2")
GREEN_LIGHT = colors.HexColor("#dcfce7")

S_TITLE = ParagraphStyle("t", fontName=FONT_BOLD, fontSize=18, textColor=NAVY,
                        alignment=TA_LEFT, spaceAfter=2, leading=22)
S_SUB = ParagraphStyle("s", fontName=FONT_REG, fontSize=10, textColor=GOLD,
                       alignment=TA_LEFT, spaceAfter=10, leading=13)
S_H1 = ParagraphStyle("h1", fontName=FONT_BOLD, fontSize=13, textColor=NAVY,
                      spaceBefore=10, spaceAfter=6, leading=16)
S_H2 = ParagraphStyle("h2", fontName=FONT_BOLD, fontSize=10, textColor=GOLD,
                      spaceBefore=8, spaceAfter=4, leading=13)
S_BODY = ParagraphStyle("b", fontName=FONT_REG, fontSize=9, leading=12.5, textColor=DARK,
                        spaceAfter=5, alignment=TA_JUSTIFY)
S_SMALL = ParagraphStyle("sm", fontName=FONT_REG, fontSize=8, textColor=GRAY,
                          leading=11, spaceAfter=3)
S_HIGHLIGHT = ParagraphStyle("hl", fontName=FONT_REG, fontSize=9.5, leading=13.5,
                              textColor=NAVY, leftIndent=10, rightIndent=10,
                              spaceBefore=6, spaceAfter=6, borderPadding=8,
                              backColor=GOLD_LIGHT, alignment=TA_LEFT)
S_ALERT = ParagraphStyle("al", fontName=FONT_REG, fontSize=9.5, leading=13.5,
                          textColor=DARK, leftIndent=10, rightIndent=10,
                          spaceBefore=6, spaceAfter=6, borderPadding=8,
                          backColor=RED_LIGHT, alignment=TA_LEFT)

S_TH = ParagraphStyle("th", fontName=FONT_BOLD, fontSize=8, textColor=GOLD,
                      leading=10, alignment=TA_LEFT)
S_TD = ParagraphStyle("td", fontName=FONT_REG, fontSize=8, textColor=DARK,
                      leading=10.5, alignment=TA_LEFT)
S_TD_R = ParagraphStyle("td_r", fontName=FONT_REG, fontSize=8, textColor=DARK,
                        leading=10.5, alignment=TA_RIGHT)
S_TD_B = ParagraphStyle("td_b", fontName=FONT_BOLD, fontSize=8.5, textColor=DARK,
                        leading=10.5, alignment=TA_LEFT)
S_TD_BR = ParagraphStyle("td_br", fontName=FONT_BOLD, fontSize=8.5, textColor=DARK,
                          leading=10.5, alignment=TA_RIGHT)

def th(text): return Paragraph(text, S_TH)
def td(text, bold=False, right=False):
    if bold and right: return Paragraph(text, S_TD_BR)
    if bold: return Paragraph(text, S_TD_B)
    if right: return Paragraph(text, S_TD_R)
    return Paragraph(text, S_TD)

def estilo_tabla():
    return TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("INNERGRID", (0,0), (-1,-1), 0.3, BORDER),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ])

OUT = r"C:\Users\zaldu\OneDrive\Documentos\2. ZAGA\02. Importaciones\Resumen_Agente_China_4_Cotizaciones_2026-05-12.pdf"
doc = SimpleDocTemplate(OUT, pagesize=A4,
                        rightMargin=1.8*cm, leftMargin=1.8*cm,
                        topMargin=1.6*cm, bottomMargin=1.6*cm,
                        title="Resumen Cotizaciones — Análisis para Agente China")
story = []

# ═══════════════════════════════════════════
# PORTADA E INTRODUCCIÓN
# ═══════════════════════════════════════════
story.append(Paragraph("ZAGA Logística", S_TITLE))
story.append(Paragraph("Análisis de cotizaciones — Solicitud de propuesta para agente de carga China", S_SUB))
story.append(HRFlowable(width="100%", thickness=1.5, color=GOLD, spaceBefore=2, spaceAfter=8))

ident = [
    [td("<b>De:</b>"), td("Francisco Zaldúa · ZAGA Logística (Chile)"),
     td("<b>Fecha:</b>"), td("12 de mayo de 2026")],
    [td("<b>Para:</b>"), td("Agente de carga China (revisión inicial)"),
     td("<b>Ref:</b>"), td("4 cotizaciones aéreas")],
]
t = Table(ident, colWidths=[1.5*cm, 7.5*cm, 2*cm, 6.5*cm])
t.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 3),
    ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
]))
story.append(t)
story.append(Spacer(1, 0.25*cm))

# Contexto del cliente
story.append(Paragraph("Contexto del cliente", S_H1))
story.append(Paragraph(
    "Mi cliente es un importador referente del e-commerce chileno con experiencia previa "
    "importando directo desde China (vía FedEx). Conoce muy bien los precios FOB del mercado "
    "y nos compartió documentación real para que armemos una propuesta competitiva.",
    S_BODY
))
story.append(Paragraph(
    "<b>Volumen estimado del cliente:</b> 10 a 15 importaciones por <b>mes</b>. Es un volumen "
    "altísimo y representa una oportunidad estratégica de alianza de largo plazo para el "
    "agente de carga que nos acompañe.",
    S_HIGHLIGHT
))

# ═══════════════════════════════════════════
# ANÁLISIS POR COTIZACIÓN
# ═══════════════════════════════════════════
story.append(Paragraph("Análisis por cotización", S_H1))
story.append(Paragraph(
    "A continuación, las 4 cotizaciones piloto. Cada tabla muestra: el costo FOB que el "
    "cliente ya conoce de China, el precio que necesita pagar puesto en Chile (con IVA), "
    "el costo CIP actual de mi proveedora china, y el precio final que yo le estoy cotizando "
    "al cliente con mi servicio profesional del 7%.",
    S_BODY
))

def tabla_cot(label, fob, cif_target, cip_actual, mi_precio, gap_pct):
    data = [
        [th("Concepto"), th("$ CLP / und"), th("USD aprox / und")],
        [td("Costo FOB que el cliente conoce en China", bold=True),
         td(fob, right=True), td(f"USD {float(fob.replace('$','').replace('.','').replace(',',''))/950:.2f}", right=True)],
        [td("Precio objetivo del cliente puesto en Chile c/IVA", bold=True),
         td(cif_target, right=True), td(f"USD {float(cif_target.replace('$','').replace('.','').replace(',',''))/950:.2f}", right=True)],
        [td("Costo CIP Santiago actual de mi proveedora china", bold=True),
         td(cip_actual, right=True), td(f"USD {float(cip_actual.replace('$','').replace('.','').replace(',',''))/950:.2f}", right=True)],
        [td("Mi precio actual al cliente c/IVA (cost plus 7%)", bold=True),
         td(mi_precio, right=True), td(f"USD {float(mi_precio.replace('$','').replace('.','').replace(',',''))/950:.2f}", right=True)],
        [td(f"<b>Gap vs expectativa cliente</b>", bold=True),
         td(f"<b>{gap_pct}</b>", bold=True, right=True), td("", right=True)],
    ]
    t = Table(data, colWidths=[9*cm, 4.25*cm, 4.25*cm], repeatRows=1)
    t.setStyle(estilo_tabla())
    return t

story.append(Paragraph("COT-096 — Pulsera de cadena con dijes (2.000 und)", S_H2))
story.append(KeepTogether([tabla_cot("096", "$732", "$1.300", "$1.250", "$1.643", "+$343 (+26%)")]))
story.append(Spacer(1, 0.15*cm))

story.append(Paragraph("COT-097 — Pulsera de trébol 4 hojas (2.000 und)", S_H2))
story.append(KeepTogether([tabla_cot("097", "$412", "$1.000", "$790", "$1.058", "+$58 (+6%) ✓ casi cerrado")]))
story.append(Spacer(1, 0.15*cm))

story.append(Paragraph("COT-098 — Pulsera cuentas redondas (2.000 und)", S_H2))
story.append(KeepTogether([tabla_cot("098", "$320", "$635", "$525", "$720", "+$85 (+13%)")]))
story.append(Spacer(1, 0.15*cm))

story.append(Paragraph("COT-099 — Collar alas ángel personalizado (2.000 und)", S_H2))
story.append(KeepTogether([tabla_cot("099", "$1.100", "$2.200", "$1.890", "$2.459", "+$259 (+12%)")]))

# ═══════════════════════════════════════════
# PÁGINA: DÓNDE ESTÁ EL PROBLEMA
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Dónde está el problema: comparación FOB cliente vs CIP actual", S_H1))
story.append(Paragraph(
    "El gap principal NO está en mi servicio (7% sobre costo) ni en los costos aduaneros "
    "que asumo. <b>El gap está en el costo del producto puesto CIP Santiago</b>, donde "
    "vemos diferencias muy grandes vs lo que el cliente paga directo a proveedores chinos:",
    S_BODY
))

problema = [
    [th("Cotización"), th("FOB cliente"), th("CIP actual"), th("Diferencia"), th("% sobre FOB")],
    [td("COT-096", bold=True), td("$732", right=True), td("$1.250", right=True),
     td("+$518/und", right=True), td("+71%", right=True)],
    [td("COT-097", bold=True), td("$412", right=True), td("$790", right=True),
     td("+$378/und", right=True), td("+92%", right=True)],
    [td("COT-098", bold=True), td("$320", right=True), td("$525", right=True),
     td("+$205/und", right=True), td("+64%", right=True)],
    [td("COT-099", bold=True), td("$1.100", right=True), td("$1.890", right=True),
     td("+$790/und", right=True), td("+72%", right=True)],
]
t = Table(problema, colWidths=[3*cm, 3.5*cm, 3.5*cm, 3.5*cm, 4*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Validación con tarifas reales de flete:</b> Para 8.000 unidades consolidadas (las 4 "
    "cotizaciones), el peso cobrable aéreo total es ~187 kg. A tarifa típica de mercado "
    "(USD 4-6/kg Yiwu → SCL), el flete real debería ser USD 750-1.100. Lo que aparece como "
    "'flete CIP' supera los USD 3.000-4.000.",
    S_ALERT
))

# ═══════════════════════════════════════════
# COSTOS ADUANEROS Y DE ZAGA
# ═══════════════════════════════════════════
story.append(Paragraph("Mis costos aduaneros en Chile (para tu referencia)", S_H1))
story.append(Paragraph(
    "Para que veas exactamente qué asumo yo del lado chileno (independiente del precio CIP), "
    "estos son mis costos fijos de internación profesional con agente de aduana certificado:",
    S_BODY
))

costos_aduana = [
    [th("Concepto"), th("Monto CLP"), th("USD aprox")],
    [td("Honorarios agente de aduana", bold=True), td("$150.000", right=True), td("USD 158", right=True)],
    [td("Transmisión EDI", bold=True), td("$15.000", right=True), td("USD 16", right=True)],
    [td("Gastos de despacho", bold=True), td("$50.000", right=True), td("USD 53", right=True)],
    [td("Gastos aeropuerto", bold=True), td("$68.000", right=True), td("USD 72", right=True)],
    [td("Aforo (condicional)", bold=True), td("$48.000", right=True), td("USD 51", right=True)],
    [td("<b>Subtotal aduana neto</b>", bold=True), td("<b>$331.000</b>", bold=True, right=True),
     td("<b>USD 348</b>", bold=True, right=True)],
    [td("IVA 19% sobre honorarios agente", bold=True), td("$62.890", right=True), td("USD 66", right=True)],
    [td("<b>Total con IVA agente</b>", bold=True), td("<b>$393.890</b>", bold=True, right=True),
     td("<b>USD 414</b>", bold=True, right=True)],
]
t = Table(costos_aduana, colWidths=[9*cm, 4.25*cm, 4.25*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Estos costos son fijos por despacho aduanero</b> — al consolidar las 4 cotizaciones "
    "en un solo envío, se reparten entre las 4 (≈$82.750 por cotización neto + IVA agente "
    "proporcional). Esto ya me da una ventaja vs FedEx que cobra por separado.",
    S_BODY
))

# IVA importación importante
story.append(Paragraph("IVA Importación 19% (lo que YO asumo de caja)", S_H2))
story.append(Paragraph(
    "Además del costo aduanero, <b>tengo que pagar el IVA de importación 19% sobre el valor "
    "CIF declarado en Aduana</b>. Este IVA es recuperable vía F29 al mes siguiente, pero "
    "es <b>caja inmediata que yo desembolso</b> el día del despacho.",
    S_BODY
))

iva_importacion = [
    [th("Concepto"), th("Cálculo"), th("Monto CLP")],
    [td("IVA Importación COT-096", bold=True), td("19% × CIF $2.500.000"), td("$475.000", right=True)],
    [td("IVA Importación COT-097", bold=True), td("19% × CIF $1.580.000"), td("$300.200", right=True)],
    [td("IVA Importación COT-098", bold=True), td("19% × CIF $1.050.000"), td("$199.500", right=True)],
    [td("IVA Importación COT-099", bold=True), td("19% × CIF $3.780.000"), td("$718.200", right=True)],
    [td("<b>Total IVA Importación operación</b>", bold=True), td("<b>19% × $8.910.000</b>", bold=True),
     td("<b>$1.692.900</b>", bold=True, right=True)],
]
t = Table(iva_importacion, colWidths=[6.5*cm, 6*cm, 5*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Punto clave:</b> No solo cobro 7% de margen por mi servicio. También adelanto al fisco "
    "chileno casi $1.700.000 CLP de IVA importación que recupero recién al mes siguiente. Esto "
    "requiere flujo de caja propio que asume ZAGA, no el cliente.",
    S_ALERT
))

# ═══════════════════════════════════════════
# REFERENCIA: COSTOS DEL CLIENTE CON FEDEX
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Información que nos compartió el cliente (factura FedEx real)", S_H1))
story.append(Paragraph(
    "El cliente nos envió una factura real de una de sus importaciones anteriores con FedEx, "
    "para que veamos exactamente cómo se compone su costo total. Esta es la referencia que él "
    "usa cuando habla de 'precio puesto en Chile':",
    S_BODY
))

# Operación FedEx ejemplo
story.append(Paragraph("Ejemplo de operación FedEx del cliente (anillos, 4.000 und)", S_H2))
fedex = [
    [th("Concepto"), th("Monto CLP"), th("USD aprox"), th("Nota")],
    [td("Productos FOB (Commercial Invoice)", bold=True), td("$1.026.000", right=True), td("USD 1.080", right=True), td("4.000 anillos × USD 0,27")],
    [td("Shipping cost (flete aéreo)", bold=True), td("$454.100", right=True), td("USD 478", right=True), td("Yiwu → SCL")],
    [td("<b>CIF declarado en Aduana</b>", bold=True), td("<b>$1.480.100</b>", bold=True, right=True),
     td("<b>USD 1.558</b>", bold=True, right=True), td("(24,8 kg bruto)")],
    [td("Derechos de Aduana 6%", bold=True), td("$88.136", right=True), td("USD 93", right=True), td("Sin Form F")],
    [td("IVA Importación 19%", bold=True), td("$295.829", right=True), td("USD 311", right=True), td("Sobre CIF + arancel")],
    [td("Servicio FedEx (entrada informal)", bold=True), td("$171.102", right=True), td("USD 180", right=True), td("Por operación")],
    [td("IVA 19% sobre servicio FedEx", bold=True), td("$32.509", right=True), td("USD 34", right=True), td("Recuperable F29")],
    [td("<b>TOTAL pagado por el cliente</b>", bold=True), td("<b>$2.067.676</b>", bold=True, right=True),
     td("<b>USD 2.176</b>", bold=True, right=True), td("Bruto antes de F29")],
]
t = Table(fedex, colWidths=[5.5*cm, 3*cm, 3*cm, 6*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Costo unitario del cliente con FedEx:</b> $517 CLP/und (USD 0,54) bruto. Después de "
    "recuperar IVA en F29: ~$435 CLP/und (USD 0,46).",
    S_HIGHLIGHT
))

story.append(Paragraph(
    "<b>Observaciones importantes para tu propuesta:</b>",
    S_BODY
))
obs = [
    "El cliente <b>NUNCA tuvo Form F</b> con FedEx — siempre pagó 6% de derechos. Si vos garantizás Form F, ya tenemos un ahorro estructural del 6% sobre CIF en cada operación.",
    "Su flete aéreo FedEx es relativamente competitivo (USD 0,12/und para anillos pequeños), pero el agente FedEx solo gestiona 'entrada informal' (para CIF < USD 3.000). Para sus operaciones grandes (USD 9.000+) no le sirve.",
    "El cliente entiende perfectamente que necesita un agente profesional para sus volúmenes grandes — pero quiere que el costo total sea competitivo vs su modelo actual.",
    "Si llegamos a precios CIP razonables, podemos consolidar 4-6 modelos por envío y conseguir economías de escala que él solo no puede.",
]
for o in obs:
    story.append(Paragraph(f"• {o}", S_BODY))

# ═══════════════════════════════════════════
# OBJETIVO Y SOLICITUD
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Objetivo de precios CIP Santiago (para tu cotización)", S_H1))
story.append(Paragraph(
    "Para que yo pueda cerrar la operación con precios cercanos a la expectativa del cliente, "
    "manteniendo mi margen del 7% por servicio profesional y absorbiendo el IVA importación 19% "
    "que adelanto al fisco, necesitaría que tus precios CIP Santiago se acerquen a:",
    S_BODY
))

objetivo = [
    [th("Cotización"), th("CIP objetivo CLP/und"), th("CIP objetivo USD/und"), th("CIP actual Ling")],
    [td("COT-096 — Pulsera cadena", bold=True), td("~$990", right=True), td("USD 1,04", right=True), td("$1.250", right=True)],
    [td("COT-097 — Pulsera trébol", bold=True), td("~$700", right=True), td("USD 0,74", right=True), td("$790", right=True)],
    [td("COT-098 — Pulsera cuentas", bold=True), td("~$440", right=True), td("USD 0,46", right=True), td("$525", right=True)],
    [td("COT-099 — Collar alas ángel", bold=True), td("~$1.700", right=True), td("USD 1,79", right=True), td("$1.890", right=True)],
]
t = Table(objetivo, colWidths=[5.5*cm, 4*cm, 4*cm, 4*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>No necesito que llegues exacto a estos números</b>, pero cuanto más cerca, mayor la "
    "probabilidad de cerrar las 4 cotizaciones y abrir la alianza para las 10-15 operaciones "
    "mensuales del cliente.",
    S_HIGHLIGHT
))

# ═══════════════════════════════════════════
# QUÉ NECESITO DE TU PROPUESTA
# ═══════════════════════════════════════════
story.append(Paragraph("Qué necesito de tu propuesta", S_H1))
necesidades = [
    ["1. Cotización CIP Santiago", "Por cada uno de los 4 productos (links Alibaba enviados aparte)"],
    ["2. Desglose transparente", "Producto FOB + transporte interno China + flete aéreo + seguro + tu comisión"],
    ["3. Form F garantizado", "Certificado de origen TLC Chile-China incluido (CRÍTICO)"],
    ["4. Plazos de pago", "Confirmar las condiciones de pago que mencionaste (30-60 días)"],
    ["5. Tiempo producción + envío", "Estimado desde confirmación hasta llegada SCL"],
    ["6. Referencias", "2-3 importadores chilenos que trabajen contigo actualmente"],
    ["7. Capacidad operativa", "Confirmar que podés manejar 10-15 operaciones mensuales si ganamos la alianza"],
]
data = [[th("Ítem"), th("Detalle")]] + [[td(n[0], bold=True), td(n[1])] for n in necesidades]
t = Table(data, colWidths=[5.5*cm, 12*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.3*cm))

# Beneficios para el agente
story.append(Paragraph("Qué ofrezco yo a cambio (beneficios para vos como agente)", S_H1))
beneficios = [
    ["Volumen recurrente", "10-15 operaciones mensuales del cliente principal + otros clientes"],
    ["Operaciones grandes", "CIF promedio USD 5.000–15.000 por operación"],
    ["Alianza exclusiva potencial", "Si trabajamos bien, podés ser mi agente principal para aéreo China-Chile"],
    ["Pagos garantizados", "ZAGA paga antes de despacho (no riesgo de incobrable)"],
    ["Comunicación profesional", "Línea directa conmigo, sin intermediarios"],
    ["Crecimiento conjunto", "Mi cliente es referente — tracciona más volumen al crecer juntos"],
]
data = [[th("Beneficio"), th("Detalle")]] + [[td(b[0], bold=True), td(b[1])] for b in beneficios]
t = Table(data, colWidths=[5.5*cm, 12*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.3*cm))

# Cierre
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceBefore=4, spaceAfter=8))
story.append(Paragraph(
    "Si podés llegar a precios competitivos, esta operación de 4 cotizaciones es solo el "
    "comienzo. Mi cliente hace <b>10-15 importaciones por mes</b> y es referente del mercado "
    "chileno e-commerce — si trabajamos bien con él, atraemos a muchos más importadores "
    "que siguen su ejemplo.",
    S_BODY
))
story.append(Paragraph(
    "Quedo atento a tu propuesta detallada esta semana.",
    S_BODY
))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph("<b>Francisco Zaldúa</b>", S_BODY))
story.append(Paragraph("Fundador — ZAGA Logística · Zaldúa y Gajardo SpA · RUT 77.874.968-8", S_SMALL))
story.append(Paragraph("Cerrillos, Santiago, Chile · contacto.zagastore@gmail.com · zaga-imp.vercel.app", S_SMALL))

def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT_REG, 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(A4[0]/2, 0.8*cm,
        f"ZAGA Logística  ·  Análisis cotizaciones para agente China  ·  Página {doc.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
print(f"PDF generado: {OUT}")
print(f"Tamaño: {os.path.getsize(OUT):,} bytes")
