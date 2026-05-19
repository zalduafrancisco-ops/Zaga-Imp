# -*- coding: utf-8 -*-
"""Propuesta formal para Cristóbal — Programa ZAGA Partner."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable
)

# Fuentes
FONT_REG = "MSYaHei"
FONT_BOLD = "MSYaHeiBold"
try:
    pdfmetrics.registerFont(TTFont(FONT_REG, "C:/Windows/Fonts/msyh.ttc", subfontIndex=0))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, "C:/Windows/Fonts/msyhbd.ttc", subfontIndex=0))
except Exception:
    pdfmetrics.registerFont(TTFont(FONT_REG, "C:/Windows/Fonts/simsun.ttc"))
    FONT_BOLD = FONT_REG

# Colores ZAGA
NAVY = colors.HexColor("#040c18")
GOLD = colors.HexColor("#c9a055")
LIGHT_BG = colors.HexColor("#f1f5f9")
BORDER = colors.HexColor("#e2e8f0")
RED = colors.HexColor("#c0392b")
GREEN = colors.HexColor("#15803d")
GRAY = colors.HexColor("#64748b")
GOLD_LIGHT = colors.HexColor("#fef3c7")

# Estilos
styles = getSampleStyleSheet()
S_TITLE = ParagraphStyle("t", fontName=FONT_BOLD, fontSize=22, textColor=NAVY, alignment=TA_LEFT, spaceAfter=2)
S_SUB = ParagraphStyle("s", fontName=FONT_REG, fontSize=12, textColor=GOLD, alignment=TA_LEFT, spaceAfter=14)
S_H1 = ParagraphStyle("h1", fontName=FONT_BOLD, fontSize=16, textColor=NAVY, spaceBefore=16, spaceAfter=10)
S_H2 = ParagraphStyle("h2", fontName=FONT_BOLD, fontSize=12, textColor=GOLD, spaceBefore=12, spaceAfter=8)
S_BODY = ParagraphStyle("b", fontName=FONT_REG, fontSize=10, leading=15, textColor=colors.HexColor("#0f172a"), spaceAfter=8, alignment=TA_JUSTIFY)
S_BODY_C = ParagraphStyle("bc", parent=S_BODY, alignment=TA_CENTER)
S_SMALL = ParagraphStyle("sm", fontName=FONT_REG, fontSize=9, textColor=GRAY, spaceAfter=6)
S_QUOTE = ParagraphStyle("q", fontName=FONT_REG, fontSize=11, leading=17, textColor=NAVY,
                          leftIndent=15, rightIndent=15, spaceBefore=8, spaceAfter=8,
                          borderColor=GOLD, borderWidth=0, borderPadding=8,
                          backColor=GOLD_LIGHT, alignment=TA_LEFT)

def style_tabla(header_bg=NAVY, header_fg=GOLD):
    return TableStyle([
        ("BACKGROUND", (0,0), (-1,0), header_bg),
        ("TEXTCOLOR", (0,0), (-1,0), header_fg),
        ("FONTNAME", (0,0), (-1,0), FONT_BOLD),
        ("FONTSIZE", (0,0), (-1,0), 9),
        ("FONTNAME", (0,1), (-1,-1), FONT_REG),
        ("FONTSIZE", (0,1), (-1,-1), 9),
        ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("INNERGRID", (0,0), (-1,-1), 0.4, BORDER),
        ("BOX", (0,0), (-1,-1), 0.6, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ])

# Documento
OUT = r"C:\Users\zaldu\OneDrive\Documentos\2. ZAGA\02. Importaciones\Propuesta_Cristobal_ZAGA_Partner_2026-05-12.pdf"
doc = SimpleDocTemplate(OUT, pagesize=A4,
                        rightMargin=2*cm, leftMargin=2*cm,
                        topMargin=2*cm, bottomMargin=2*cm,
                        title="Propuesta ZAGA Partner — Cristóbal")

story = []

# ── PORTADA ──
story.append(Paragraph("ZAGA Logística", S_TITLE))
story.append(Paragraph("Propuesta Comercial — Programa ZAGA Partner", S_SUB))
story.append(HRFlowable(width="100%", thickness=2, color=GOLD, spaceBefore=4, spaceAfter=12))
story.append(Paragraph("<b>Para:</b> Cristóbal Chicharro — Importador Dropi", S_SMALL))
story.append(Paragraph("<b>De:</b> Francisco Zaldúa — ZAGA Logística", S_SMALL))
story.append(Paragraph("<b>Fecha:</b> 12 de mayo de 2026", S_SMALL))
story.append(Paragraph("<b>Cotizaciones:</b> COT-096, COT-097, COT-098, COT-099", S_SMALL))
story.append(Spacer(1, 0.5*cm))

# ── RESUMEN EJECUTIVO ──
story.append(Paragraph("Resumen ejecutivo", S_H1))
story.append(Paragraph(
    "Cristóbal, después de analizar a fondo tus 4 cotizaciones aéreas y las referencias "
    "de costos que compartiste (FedEx, FOB China, factura comercial), te quiero proponer "
    "algo distinto a una venta tradicional: <b>quiero hacerte miembro inaugural del Programa "
    "ZAGA Partner</b>, diseñado específicamente para importadores de tu volumen.",
    S_BODY
))
story.append(Paragraph(
    "Mi visión: sos el referente Dropi en Chile. Si te demuestro que ZAGA resuelve los "
    "problemas que tenías importando solo y te ofrezco condiciones premium, podemos crecer "
    "juntos durante muchos años.",
    S_BODY
))

# ── EL VALOR DE ZAGA VS HACERLO SOLO ──
story.append(Paragraph("¿Por qué con ZAGA y no solo con FedEx?", S_H1))
story.append(Paragraph(
    "Analicé tu factura FedEx (USD 1.558 CIF, $587.576 total con FedEx) y la comparé "
    "con cómo lo haríamos juntos en una operación consolidada de tus 4 modelos:",
    S_BODY
))
tabla_valor = [
    ["Aspecto", "Hacerlo solo con FedEx", "Con ZAGA"],
    ["Form F (TLC Chile-China)", "❌ Pagás 6% arancel", "✅ 0% arancel (ahorro $534.600)"],
    ["Costo agente por unidad (8.000 und)", "$135 – $217 / und", "$49 / und ✅"],
    ["Consolidación de despacho", "❌ 4 despachos separados", "✅ 1 despacho consolidado"],
    ["Asesoría profesional", "❌ Solo automatizado", "✅ Línea directa Francisco"],
    ["Manejo de problemas operativos", "Limitado", "Resolución activa"],
    ["Riesgo de errores aduana", "Alto", "Mínimo"],
]
t = Table(tabla_valor, colWidths=[5*cm, 5.5*cm, 5.5*cm])
t.setStyle(style_tabla())
story.append(t)
story.append(Spacer(1, 0.3*cm))

# Ahorro real consolidación
story.append(Paragraph("Ahorro inmediato por consolidación aduanera", S_H2))
story.append(Paragraph(
    "Con tus 4 cotizaciones en un solo despacho, el costo del agente aduanero "
    "<b>($331.000)</b> se prorratea entre las 4. Si fueran 4 despachos separados, "
    "pagarías $1.324.000. <b>Te ahorrás aproximadamente $1.181.670 CLP solo por "
    "consolidar conmigo.</b>",
    S_BODY
))

# ── PROGRAMA ZAGA PARTNER ──
story.append(PageBreak())
story.append(Paragraph("Programa ZAGA Partner — Cristóbal Inaugural", S_H1))
story.append(Paragraph(
    "Como cliente inaugural, te ofrezco un paquete de beneficios pensado para que "
    "esta sea la primera de muchas operaciones juntos:",
    S_BODY
))

tabla_beneficios = [
    ["Beneficio", "Detalle"],
    ["1. Descuento Inaugural", "−10% sobre precios cotizados originalmente"],
    ["2. Consolidación aduanera", "1 solo despacho para los 4 modelos (ahorro $1.18M)"],
    ["3. Form F garantizado", "Arancel 0% (ahorro 6% sobre CIF)"],
    ["4. Aduana profesional", "Despacho formal con agente Leslie Terán"],
    ["5. Línea directa Francisco", "WhatsApp / llamada para cualquier consulta"],
    ["6. Soporte prioritario", "Resolución de problemas <24 horas"],
    ["7. Fulfillment preferente", "$1.000 + IVA / orden (vs $1.200 estándar)"],
    ["8. Garantía de mejora", "Si China me baja precios, te transfiero el ahorro"],
    ["9. Programa de referidos", "$100.000 CLP por cada importador que cierre conmigo"],
    ["10. Caso ZAGA Partner", "Reconocimiento como cliente fundador del programa"],
]
t = Table(tabla_beneficios, colWidths=[5*cm, 11*cm])
t.setStyle(style_tabla())
story.append(t)
story.append(Spacer(1, 0.4*cm))

# ── PROPUESTA DE PRECIOS ──
story.append(Paragraph("Propuesta de precios (con descuento Partner Inaugural −10%)", S_H1))
story.append(Paragraph(
    "Precios provisionales, válidos por 15 días desde emisión. <b>Si mi proveedora "
    "china me ajusta los costos en los próximos días (estoy en negociación activa), "
    "actualizo esta propuesta a la baja</b>, manteniendo el compromiso del Programa Partner.",
    S_BODY
))

tabla_precios = [
    ["Cotización", "Producto", "Tu expectativa", "Propuesta Partner", "Diferencia"],
    ["COT-096", "Pulsera cadena dijes", "$1.300", "$1.575", "+21%"],
    ["COT-097", "Pulsera trébol 4 hojas", "$1.000", "$1.170", "+17%"],
    ["COT-098", "Pulsera cuentas redondas", "$635", "$760", "+20%"],
    ["COT-099", "Collar alas ángel (personalizado)", "$2.200", "$2.430", "+10%"],
]
t = Table(tabla_precios, colWidths=[2.3*cm, 5.5*cm, 2.8*cm, 3*cm, 2.4*cm])
t.setStyle(style_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph(
    "<i>Todos los precios son brutos c/IVA puestos en Chile. Incluyen: producto + flete + "
    "agente de aduana + Form F + IVA aduana + servicio ZAGA + IVA del servicio.</i>",
    S_SMALL
))
story.append(Spacer(1, 0.3*cm))

# ── COMPROMISO ──
story.append(Paragraph("Mi compromiso con vos", S_H2))
story.append(Paragraph(
    "Sé que el gap respecto a tu expectativa sigue siendo del 10-21%. Te explico mi "
    "razonamiento honesto:",
    S_BODY
))

compromiso_items = [
    "El 90% de ese gap NO está en mi servicio (ZAGA es más eficiente que FedEx con consolidación), sino en el precio CIP que me cotiza mi proveedora china.",
    "Le envié un análisis detallado pidiéndole desglose y ajuste. Espero respuesta esta semana.",
    "Si me ajusta los precios, te traslado el ahorro completo en una propuesta actualizada.",
    "Como Partner Inaugural, te garantizo que siempre vas a tener el mejor precio posible que ZAGA pueda ofrecer.",
]
for item in compromiso_items:
    story.append(Paragraph(f"• {item}", S_BODY))

# ── CONTRAPRESTACIÓN ──
story.append(PageBreak())
story.append(Paragraph("¿Qué te pido a cambio del Programa Partner?", S_H1))
story.append(Paragraph(
    "Como cliente inaugural, te ofrezco condiciones especiales. A cambio, te pido "
    "una colaboración sencilla para construir juntos el programa:",
    S_BODY
))

contraprestacion = [
    ["Lo que ofrecés", "Detalle"],
    ["Testimonio en video", "1-2 min al recibir la mercadería contando la experiencia"],
    ["Permiso de caso de éxito", "Usar tu caso en marketing ZAGA (logo, comentario, fotos)"],
    ["Recomendaciones", "Si alguien de tu comunidad Dropi pregunta, mencionar ZAGA"],
    ["Reunión mensual 30 min", "Para coordinar próximos pedidos y mejoras"],
    ["Feedback continuo", "Sugerencias para mejorar el servicio"],
]
t = Table(contraprestacion, colWidths=[5*cm, 11*cm])
t.setStyle(style_tabla())
story.append(t)
story.append(Spacer(1, 0.4*cm))

# ── PRÓXIMOS PASOS ──
story.append(Paragraph("Próximos pasos sugeridos", S_H1))
pasos = [
    ["1. Reunión por video (esta semana)",
     "20-30 min para conocernos mejor, repasar la propuesta y responder dudas."],
    ["2. Respuesta de proveedora china",
     "Esperando esta semana. Te actualizo precios si baja."],
    ["3. Confirmación de modelos",
     "Confirmar que los 4 modelos van consolidados en un solo envío."],
    ["4. Pago anticipado 100%",
     "Una vez aceptada la propuesta, pago 100% para iniciar producción."],
    ["5. Producción + envío",
     "Plazo estimado 30 días desde confirmación."],
    ["6. Despacho aduanero ZAGA",
     "Yo me encargo de todo: agente, Form F, IVA aduana, retiro y entrega."],
]
for p in pasos:
    inner = Table([[Paragraph(f"<b>{p[0]}</b>", S_BODY), Paragraph(p[1], S_BODY)]],
                  colWidths=[6*cm, 10*cm])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), LIGHT_BG),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
    ]))
    story.append(inner)
    story.append(Spacer(1, 0.15*cm))

# ── CIERRE ──
story.append(Spacer(1, 0.4*cm))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceBefore=8, spaceAfter=12))
story.append(Paragraph(
    "Cristóbal, te tengo respeto y reconocimiento por tu trayectoria. Mi propuesta es "
    "totalmente transparente: no estoy compitiendo con tu FedEx en precio puro, estoy "
    "ofreciendo un servicio profesional consolidado que resuelve los problemas operativos "
    "que tenías importando solo, y que te ahorra tiempo, riesgo y dolores de cabeza.",
    S_BODY
))
story.append(Paragraph(
    "Te invito a la reunión por video para que podamos hablar tranquilos. "
    "Estoy convencido de que esta puede ser la primera de muchas operaciones juntos.",
    S_BODY
))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("<b>Francisco Zaldúa</b>", S_BODY))
story.append(Paragraph("Fundador — ZAGA Logística", S_SMALL))
story.append(Paragraph("Zaldúa y Gajardo SpA  ·  RUT 77.874.968-8", S_SMALL))
story.append(Paragraph("Cerrillos, Santiago, Chile", S_SMALL))
story.append(Paragraph("contacto.zagastore@gmail.com  ·  zaga-imp.vercel.app", S_SMALL))

def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT_REG, 8)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(A4[0]/2, 1*cm,
        f"ZAGA Logística  ·  Propuesta ZAGA Partner — Cristóbal  ·  Página {doc.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
print(f"PDF generado: {OUT}")
print(f"Tamaño: {os.path.getsize(OUT):,} bytes")
