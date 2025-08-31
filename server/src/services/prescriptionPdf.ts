import PDFDocument from "pdfkit";

export type PrescriptionView = {
  doctorName: string;
  patientName: string;
  patientEmail: string;
  createdAt: Date | string;
  items: { name: string; dose: string; timing: "before" | "after" }[];
  advice?: string;
  clinic?: { name?: string; subtitle?: string; logoPath?: string };
};

// All the styling you might want to tweak later:
const THEME = {
  margin: 56,
  font: { base: "Helvetica", size: { h1: 18, h2: 14, body: 12, small: 11 } },
  color: {
    text: "#0f172a",     // slate-900
    sub: "#475569",      // slate-600
    border: "#e5e7eb",   // gray-200
    primary: "#2563eb",  // blue-600
    soft: "#f8fafc",     // slate-50
  },
  table: { rowHeight: 24, col: [0.55, 0.20, 0.25] } // widths: name/dose/timing
};

export function drawPrescription(doc: PDFDocument, data: PrescriptionView) {
  const { margin } = THEME;
  doc.info.Title = "Prescription";
  doc.info.Author = data.clinic?.name || "Clinic";
  doc.font(THEME.font.base).fillColor(THEME.color.text);

  // Header bar
  doc.rect(0, 0, doc.page.width, 68).fill(THEME.color.soft).fillColor(THEME.color.text);
  doc.fontSize(THEME.font.size.h1).fillColor(THEME.color.primary)
    .text(data.clinic?.name || "Medical Center", margin, 24, { continued: false });
  if (data.clinic?.subtitle) {
    doc.fontSize(THEME.font.size.small).fillColor(THEME.color.sub)
      .text(data.clinic.subtitle, margin, 44);
  }
  // Optional logo (PNG/SVG). Safe if file missing.
  if (data.clinic?.logoPath) {
    try {
      doc.image(data.clinic.logoPath, doc.page.width - margin - 64, 12, { width: 64, height: 64, fit: [64,64] });
    } catch {}
  }
  doc.moveTo(margin, 68).lineTo(doc.page.width - margin, 68).strokeColor(THEME.color.border).stroke();

  // Patient/Doctor meta
  doc.moveDown();
  doc.fontSize(THEME.font.size.h2).fillColor(THEME.color.text).text("Prescription", margin, 84);
  doc.moveDown(0.5);
  doc.fontSize(THEME.font.size.body).fillColor(THEME.color.sub);
  const when = new Date(data.createdAt).toLocaleString();
  doc.text(`Doctor: ${data.doctorName}`);
  doc.text(`Patient: ${data.patientName} (${data.patientEmail})`);
  doc.text(`Date: ${when}`);

  // Medicines table
  doc.moveDown();
  const startX = margin, startY = doc.y + 8;
  const width = doc.page.width - margin * 2;

  // Header row
  drawRow(doc, startX, startY, width, true, ["Medicine", "Dose (M/N/N)", "Timing"]);
  // Body rows
  let y = startY + THEME.table.rowHeight;
  data.items.forEach((it, i) => {
    const alt = i % 2 === 0;
    drawRow(doc, startX, y, width, false, [
      it.name,
      it.dose,
      it.timing === "before" ? "Before meal" : "After meal",
    ], alt);
    y += THEME.table.rowHeight;
    // page break guard
    if (y > doc.page.height - margin - 120) {
      drawFooter(doc);
      doc.addPage({ margins: { top: margin, left: margin, right: margin, bottom: margin } });
      y = margin;
    }
  });

  // Advice / Suggestion
  if (data.advice) {
    doc.moveTo(startX, y + 8).lineTo(startX + width, y + 8).strokeColor(THEME.color.border).stroke();
    doc.moveDown();
    doc.fontSize(THEME.font.size.h2).fillColor(THEME.color.text).text("Advice / Suggestion");
    doc.moveDown(0.25);
    doc.fontSize(THEME.font.size.body).fillColor(THEME.color.text).text(data.advice, { align: "left" });
  }

  // Footer
  doc.moveDown(1.5);
  drawFooter(doc);
}

function drawRow(
  doc: PDFDocument,
  x: number,
  y: number,
  width: number,
  header: boolean,
  cols: [string, string, string],
  alt = false
) {
  const [c1w, c2w, c3w] = THEME.table.col.map(f => Math.round(width * f));
  // background
  if (header) {
    doc.rect(x, y, width, THEME.table.rowHeight).fillColor("#eef2ff").fill();
  } else if (alt) {
    doc.rect(x, y, width, THEME.table.rowHeight).fillColor("#f8fafc").fill();
  }
  // text
  doc.fillColor(THEME.color.text).fontSize(header ? THEME.font.size.body : THEME.font.size.body);
  const padX = 8, padY = 6;
  doc.text(cols[0], x + padX, y + padY, { width: c1w - padX * 2, continued: false });
  doc.text(cols[1], x + c1w + padX, y + padY, { width: c2w - padX * 2 });
  doc.text(cols[2], x + c1w + c2w + padX, y + padY, { width: c3w - padX * 2 });
  // borders
  doc.strokeColor(THEME.color.border).lineWidth(0.5)
     .moveTo(x, y).lineTo(x + width, y).stroke()
     .moveTo(x, y + THEME.table.rowHeight).lineTo(x + width, y + THEME.table.rowHeight).stroke();
}

function drawFooter(doc: PDFDocument) {
  const margin = THEME.margin;
  const y = doc.page.height - margin + 8;
  doc.strokeColor(THEME.color.border).moveTo(margin, y).lineTo(doc.page.width - margin, y).stroke();
  doc.fontSize(10).fillColor(THEME.color.sub)
    .text("This document is system-generated and does not require a signature.", margin, y + 6, {
      width: doc.page.width - margin * 2, align: "center",
    });
}
