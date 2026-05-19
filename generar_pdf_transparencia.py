# -*- coding: utf-8 -*-
"""Documento de transparencia ZAGA Partner — postura Media.
Para usar si Cristóbal (u otro cliente) pide ver costos y márgenes detallados.
"""
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
BLUE_LIGHT = colors.HexColor("#dbeafe")
RED_LIGHT = colors.HexColor("#fee2e2")

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
S_BLUE = ParagraphStyle("bl", fontName=FONT_REG, fontSize=9.5, leading=13.5,
                          textColor=NAVY, leftIndent=10, rightIndent=10,
                          spaceBefore=6, spaceAfter=6, borderPadding=8,
                          backColor=BLUE_LIGHT, alignment=TA_LEFT)
S_RED = ParagraphStyle("rd", fontName=FONT_REG, fontSize=9.5, leading=13.5,
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

OUT = r"C:\Users\zaldu\OneDrive\Documentos\2. ZAGA\02. Importaciones\Politica_Transparencia_ZAGA_Partner.pdf"
doc = SimpleDocTemplate(OUT, pagesize=A4,
                        rightMargin=1.8*cm, leftMargin=1.8*cm,
                        topMargin=1.6*cm, bottomMargin=1.6*cm,
                        title="Política de Transparencia — ZAGA Partner")
story = []

# ═══════════════════════════════════════════
# PORTADA
# ═══════════════════════════════════════════
story.append(Paragraph("ZAGA Logística", S_TITLE))
story.append(Paragraph("Política de Transparencia — Programa ZAGA Partner", S_SUB))
story.append(HRFlowable(width="100%", thickness=1.5, color=GOLD, spaceBefore=2, spaceAfter=8))

story.append(Paragraph(
    "<b>Documento interno y confidencial</b>",
    S_SMALL
))
story.append(Paragraph(
    "Este documento describe la política de transparencia de ZAGA Logística aplicable a "
    "clientes del Programa ZAGA Partner. Se entrega únicamente cuando un cliente solicita "
    "información detallada sobre la composición del costo y el margen, y siempre bajo acuerdo "
    "de confidencialidad mutua.",
    S_BODY
))
story.append(Spacer(1, 0.3*cm))

# ═══════════════════════════════════════════
# PRINCIPIO GENERAL
# ═══════════════════════════════════════════
story.append(Paragraph("Principio general", S_H1))
story.append(Paragraph(
    "ZAGA opera con un modelo de <b>servicio integral con margen profesional ajustado</b>. "
    "El cliente recibe un precio único todo incluido por unidad, sin sorpresas ni costos "
    "adicionales durante el proceso.",
    S_BODY
))
story.append(Paragraph(
    "Sin embargo, cuando un cliente del Programa Partner solicita información detallada sobre "
    "cómo se compone su precio, ZAGA aplica una <b>política de transparencia escalonada</b>: "
    "comparte información hasta el nivel que permita generar confianza, sin comprometer "
    "relaciones comerciales con sus proveedores ni la sostenibilidad del modelo.",
    S_HIGHLIGHT
))

# ═══════════════════════════════════════════
# NIVELES DE TRANSPARENCIA
# ═══════════════════════════════════════════
story.append(Paragraph("Niveles de información que ZAGA puede compartir", S_H1))

niveles = [
    [th("Nivel"), th("Tipo de información"), th("¿Se comparte?")],
    [td("1", bold=True), td("Margen efectivo de ZAGA sobre la operación", bold=True),
     td("Sí, si el cliente lo solicita y firma confidencialidad", bold=True)],
    [td("2", bold=True), td("Costos del agente de aduana (facturas formales)", bold=True),
     td("Sí, son documentos públicos formales", bold=True)],
    [td("3", bold=True), td("Estructura general de costos sin desglose proveedor", bold=True),
     td("Sí, se entrega referencia conceptual", bold=True)],
    [td("4", bold=True), td("Cotización o factura del proveedor en China", bold=True),
     td("NO se comparte (información comercial reservada)", bold=True)],
    [td("5", bold=True), td("Contactos directos de proveedores en China", bold=True),
     td("NO se comparte (parte del valor agregado ZAGA)", bold=True)],
]
t = Table(niveles, colWidths=[1.5*cm, 8*cm, 8*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Razón de no compartir niveles 4 y 5:</b> los acuerdos comerciales con proveedores en "
    "China son información reservada entre ZAGA y cada proveedor. Compartirlos rompería esos "
    "acuerdos y eliminaría parte del valor agregado del servicio (negociación, validación "
    "y gestión profesional con la cadena productiva).",
    S_RED
))

# ═══════════════════════════════════════════
# MARGEN ZAGA - REFERENCIA
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Referencia de margen ZAGA", S_H1))
story.append(Paragraph(
    "Cuando un cliente del Programa Partner solicita conocer el margen efectivo, ZAGA lo "
    "comparte con honestidad como parte del compromiso de confianza:",
    S_BODY
))

story.append(Paragraph("Margen estándar mercado vs ZAGA Partner", S_H2))
comparativo = [
    [th("Tipo de operador logístico"), th("Margen típico mercado")],
    [td("Agencias de carga (freight forwarders)", bold=True), td("15% – 30%", right=True)],
    [td("Trading companies (compran y revenden)", bold=True), td("25% – 40%", right=True)],
    [td("Operadores 3PL integrales", bold=True), td("15% – 25%", right=True)],
    [td("Importadores para terceros", bold=True), td("15% – 30%", right=True)],
    [td("<b>ZAGA Partner (cliente inaugural)</b>", bold=True),
     td("<b>14% sobre venta neta</b>", bold=True, right=True)],
]
t = Table(comparativo, colWidths=[11*cm, 6.5*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Posición ZAGA:</b> el 14% sobre venta neta está en el piso del rango de mercado para "
    "operadores logísticos integrales. Es el margen mínimo que permite mantener el estándar "
    "profesional del servicio, asumir los costos operativos asociados (tiempo de gestión, "
    "soporte 24/7, riesgo cambiario, garantías) y reinvertir en mejoras continuas.",
    S_BODY
))

story.append(Paragraph(
    "Este 14% es el <b>margen preferente inaugural</b> que ZAGA ofrece a los primeros clientes "
    "del Programa Partner. Para clientes estándar fuera del programa, el margen es de 18% a 22%.",
    S_HIGHLIGHT
))

# ═══════════════════════════════════════════
# QUÉ CUBRE EL MARGEN
# ═══════════════════════════════════════════
story.append(Paragraph("¿Qué cubre el margen del 14%?", S_H1))
story.append(Paragraph(
    "El margen no es ganancia neta — es la diferencia bruta sobre la operación. De ese 14% "
    "ZAGA debe cubrir todos los costos operativos asociados a hacer funcionar el servicio:",
    S_BODY
))

cubre = [
    [th("Componente"), th("Detalle")],
    [td("Gestión profesional", bold=True),
     td("Tiempo de Francisco, Luisa y equipo dedicado a la operación (negociación con proveedores, coordinación, seguimiento, control de calidad).")],
    [td("Soporte continuo", bold=True),
     td("Línea directa con el cliente, resolución de incidencias <24 hs, asesoría tributaria y operativa.")],
    [td("Adelanto operativo", bold=True),
     td("ZAGA gestiona pagos a proveedores y cubre la coordinación financiera de la operación.")],
    [td("Riesgo operativo", bold=True),
     td("Respaldo ante problemas de calidad, retrasos del proveedor o incidencias aduaneras. ZAGA absorbe la primera línea de respuesta.")],
    [td("Infraestructura", bold=True),
     td("Sistemas de gestión (cotizador, seguimiento, documentación), licencias y herramientas tecnológicas.")],
    [td("Servicios externos", bold=True),
     td("Asesoría contable, asesoría legal y otros gastos administrativos.")],
    [td("Reinversión y crecimiento", bold=True),
     td("Margen para mejorar el servicio, ampliar capacidades y mantener la competitividad.")],
]
t = Table(cubre, colWidths=[4*cm, 13.5*cm], repeatRows=1)
t.setStyle(estilo_tabla())
story.append(t)

# ═══════════════════════════════════════════
# GARANTÍAS Y COMPROMISOS
# ═══════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph("Garantías y compromisos asociados a la transparencia", S_H1))
story.append(Paragraph(
    "Cuando ZAGA comparte el detalle de margen con un cliente Partner, ambas partes asumen "
    "los siguientes compromisos:",
    S_BODY
))

story.append(Paragraph("Compromisos de ZAGA hacia el cliente Partner", S_H2))
zaga_compromisos = [
    "Mantener el margen preferente acordado (14% sobre venta neta) durante todas las operaciones del Programa Partner.",
    "Trasladar al cliente cualquier ahorro que ZAGA consiga en negociaciones futuras con proveedores.",
    "Garantizar el estándar profesional del servicio sin importar el volumen de la operación.",
    "Compartir información detallada de cada operación (facturas, costos, documentación) bajo solicitud.",
    "Mantener línea directa de comunicación y soporte prioritario.",
]
for c in zaga_compromisos:
    story.append(Paragraph(f"• {c}", S_BODY))

story.append(Spacer(1, 0.15*cm))
story.append(Paragraph("Compromisos del cliente Partner hacia ZAGA", S_H2))
cliente_compromisos = [
    "Tratar la información de margen como <b>confidencial</b> — no compartirla con terceros sin autorización expresa de ZAGA.",
    "No utilizar la información compartida para intentar contactar directamente a los proveedores de ZAGA.",
    "Comunicar de manera oportuna cualquier cambio en sus necesidades o volúmenes esperados.",
    "Respetar los plazos de pago anticipado acordados para cada operación.",
    "Mantener una comunicación constructiva y profesional ante cualquier inconveniente.",
]
for c in cliente_compromisos:
    story.append(Paragraph(f"• {c}", S_BODY))

# ═══════════════════════════════════════════
# CIERRE
# ═══════════════════════════════════════════
story.append(Spacer(1, 0.25*cm))
story.append(Paragraph("Cierre", S_H1))
story.append(Paragraph(
    "Esta política de transparencia escalonada permite construir una relación de confianza "
    "real entre ZAGA y sus clientes Partner, respetando los límites comerciales necesarios "
    "para que el modelo de servicio sea sostenible a largo plazo.",
    S_BODY
))
story.append(Paragraph(
    "La transparencia genuina no consiste en mostrar absolutamente todo, sino en ser "
    "claro sobre <b>qué se puede compartir, qué no se comparte, y por qué</b>. Bajo este "
    "principio, ZAGA aspira a ser el socio logístico de confianza en la ruta China-Chile "
    "para sus clientes Partner.",
    S_HIGHLIGHT
))

story.append(Spacer(1, 0.3*cm))
story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceBefore=4, spaceAfter=8))
story.append(Paragraph("<b>Francisco Zaldúa</b>", S_BODY))
story.append(Paragraph("Fundador — ZAGA Logística · Zaldúa y Gajardo SpA · RUT 77.874.968-8", S_SMALL))
story.append(Paragraph("Cerrillos, Santiago, Chile · ventas@zagaimp.com · zaga-imp.vercel.app", S_SMALL))

def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT_REG, 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(A4[0]/2, 0.8*cm,
        f"ZAGA Logística  ·  Política de Transparencia — ZAGA Partner  ·  Página {doc.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
print(f"PDF generado: {OUT}")
print(f"Tamaño: {os.path.getsize(OUT):,} bytes")
