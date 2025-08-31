// server/src/controllers/prescription.controller.ts
import { Request, Response } from "express";
import Prescription from "../models/Prescription";
import Appointment from "../models/Appointment";
import Doctor from "../models/Doctor";
import PDFDocument from "pdfkit";

// Narrow type for handlers that rely on req.user
type Authed = Request & { user?: { id: string; role: "admin"|"doctor"|"student" } };

/**
 * Create a prescription for an appointment, then mark the appointment as 'completed'.
 * - Validates payload
 * - Ensures only admin/doctor can issue
 * - If caller is a doctor, ensures the appointment belongs to them
 * - Uses an atomic update to mark the appointment completed so we don't re-validate legacy fields
 */
export const createPrescription = async (req: Authed, res: Response) => {
  const { appointmentId, medicines, advice } = req.body || {};

  // 1) Basic payload validation
  if (!appointmentId || !Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ message: "appointmentId and medicines[] are required" });
  }

  // 2) Load the appointment (+ doctor->user for display)
  const appt = await Appointment.findById(appointmentId)
    .populate({ path: "doctor", populate: { path: "user", select: "name email" } });
  if (!appt) return res.status(404).json({ message: "Appointment not found" });

  // 3) Role guard
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "doctor")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // 4) If doctor, enforce ownership (appt.doctor may be ObjectId or populated doc)
  if (req.user.role === "doctor") {
    const mine = await Doctor.findOne({ user: req.user.id });
    const apptDoctorId = (appt as any).doctor?._id ?? (appt as any).doctor;
    if (!mine || String(apptDoctorId) !== String(mine._id)) {
      return res.status(403).json({ message: "Not your appointment" });
    }
  }

  // 5) Normalize medicines (trim, filter blanks, default timing)
  const items = (medicines as any[])
    .map((m) => ({
      name: String(m?.name || "").trim(),
      dose: String(m?.dose || "").trim(), // e.g. "0/0/1"
      timing: m?.timing === "before" ? "before" : "after",
    }))
    .filter((m) => m.name && m.dose);

  if (items.length === 0) {
    return res.status(400).json({ message: "At least one valid medicine is required" });
  }

  // 6) Gather safe fields for display
  const a = appt.toObject() as any;
  const doctorName = a?.doctor?.user?.name || "Doctor";

  // 7) Create prescription
  const presc = await Prescription.create({
    appointment: appt._id,
    issuedBy: req.user!.id,
    patientName: a.studentName,
    patientEmail: a.email,
    doctorName,
    items,
    advice,
  });

  // 8) Mark appointment completed WITHOUT re-validating entire doc (avoids legacy studentId cast issues)
  await Appointment.updateOne(
    { _id: appt._id },
    { $set: { status: "completed" } },
    { runValidators: false }
  );

  res.status(201).json({ prescription: presc });
};

/**
 * Generate and stream a PDF for a given prescription.
 * - Sets Content-Disposition to attachment for download
 * - Styled header, rounded table with dividers, full-width advice
 */
export const getPrescriptionPdf = async (req: Authed, res: Response) => {
  const { id } = req.params;
  const presc = await Prescription.findById(id);
  if (!presc) return res.status(404).json({ message: "Prescription not found" });

  // Only admin/doctor can download (adjust if you want patients to download too)
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "doctor")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // --- PDF headers ---
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="prescription_${presc.patientName.replace(/\s+/g, "_")}.pdf"`
  );

  // --- THEME: tweak these to style the PDF ---
  const THEME = {
    margin: 56,
    colors: {
      text: "#0f172a",    // slate-900
      sub: "#475569",     // slate-600
      border: "#e5e7eb",  // gray-200
      band: "#FFFFFF",    // slate-50
      band2: "#FFFFFF",   // indigo-50
      primary: "#2563eb", // blue-600
      headerband: "#F5FAFC",
      gray: "#808080",
    },

    font: {
      body: 12,
      h1: 18,
      h2: 14,
      small: 11,
    },
    table: { rowH: 24, cols: [0.55, 0.2, 0.25] as const }, // name/dose/timing
    clinic: {
      name: "BRACU Medical Center",
      subtitle: "Prescription",
      // For logo, put a PNG path accessible to the server and uncomment:
      logoPath: "/Users/fahimahmed/bracu-medical/client/src/assets/bracu_logo.png",
      
    },
  };

  // --- Start PDF ---
  const doc = new PDFDocument({ size: "A4", margin: THEME.margin });
  doc.pipe(res);

  // Header band
  doc.rect(0, 0, doc.page.width, 82).fill(THEME.colors.headerband);
  doc.fillColor(THEME.colors.primary).fontSize(THEME.font.h1)
    .text(THEME.clinic.name, THEME.margin, 22);
  doc.fillColor(THEME.colors.sub).fontSize(THEME.font.small)
    .text(THEME.clinic.subtitle, THEME.margin, 44);

  // Optional logo
  try {
    if (THEME.clinic.logoPath) {
      doc.image(THEME.clinic.logoPath, doc.page.width - THEME.margin - 64, 12, { width: 64 });
    }
  } catch { /* ignore missing/invalid logo */ }

  doc.moveTo(THEME.margin, 82).lineTo(doc.page.width - THEME.margin, 82)
    .strokeColor(THEME.colors.border).stroke();

  // Meta
  doc.moveDown();
  doc.fillColor(THEME.colors.text).fontSize(THEME.font.h2).text("Appointment Information", THEME.margin, 100);
  doc.moveDown(0.25);
  doc.fontSize(THEME.font.body).fillColor(THEME.colors.sub);
  doc.text(`Doctor: ${presc.doctorName}`);
  doc.text(`Patient: ${presc.patientName}`);
  doc.text(`Patient Email: ${presc.patientEmail}`)
  doc.text(`Date of Appointment: ${new Date(presc.createdAt as any).toLocaleString()}`);

  // Table header

  doc.moveDown(3);
  doc.fontSize(THEME.font.h2).fillColor(THEME.colors.text)
      .text("Prescribed Medicines");

  const startX = THEME.margin;
  const width = doc.page.width - THEME.margin * 2;

  // keep track of table bounds for the rounded container
  let y = doc.y + 8;
  const tableTop = y;

  drawRow(doc, THEME, startX, y, width, ["Medicine", "Dose (M/N/N)", "Timing"], true);
  y += THEME.table.rowH;

  // Rows
  doc.fontSize(THEME.font.small).fillColor(THEME.colors.text);
  (presc.items as any[]).forEach((it, i) => {
    const label = it.timing === "before" ? "Before meal" : "After meal";
    const alt = i % 2 === 0;
    drawRow(doc, THEME, startX, y, width, [String(it.name), String(it.dose), label], false, alt);
    y += THEME.table.rowH;

    // simple page break guard
    if (y > doc.page.height - THEME.margin - 120) {
      // draw container up to current y before page break
      drawTableContainer(doc, THEME, startX, tableTop, width, y);
      drawFooter(doc, THEME);
      doc.addPage({ margins: { top: THEME.margin, bottom: THEME.margin, left: THEME.margin, right: THEME.margin } });
      // restart a new table on next page
      y = THEME.margin;
    }
  });

  const tableBottom = y;

  // draw rounded outer border + vertical dividers
  drawTableContainer(doc, THEME, startX, tableTop, width, tableBottom);

  // Advice (FULL WIDTH, LEFT-ALIGNED)
  if (presc.advice) {
    doc.moveDown(3);
    doc.fontSize(THEME.font.h2).fillColor(THEME.colors.text)
      .text("Advice / Suggestion", startX, undefined, { width, align: "left" });
    doc.moveDown(1);
    doc.fontSize(THEME.font.small).fillColor(THEME.colors.gray)
      .text(String(presc.advice), startX, undefined, { width, align: "left" });
  }

  // Footer
  doc.moveDown(1.5);
  drawFooter(doc, THEME);

  doc.end();
};

/* ------------------------ local helpers (styling) ------------------------- */

function drawRow(
  doc: PDFDocument,
  THEME: any,
  x: number,
  y: number,
  width: number,
  cols: [string, string, string],
  header = false,
  alt = false
) {
  const rowH = THEME.table.rowH;

  // backgrounds
  if (header) {
    doc.rect(x, y, width, rowH).fillColor(THEME.colors.band2).fill();
  } else if (alt) {
    doc.rect(x, y, width, rowH).fillColor(THEME.colors.band).fill();
  }

  // text
  const [w1, w2, w3] = THEME.table.cols.map((f: number) => Math.round(width * f));
  const padX = 10, padY = 7;
  doc.fillColor(THEME.colors.text).fontSize(THEME.font.body);
  doc.text(cols[0], x + padX, y + padY, { width: w1 - padX * 2 });
  doc.text(cols[1], x + w1 + padX, y + padY, { width: w2 - padX * 2 });
  doc.text(cols[2], x + w1 + w2 + padX, y + padY, { width: w3 - padX * 2 });

  // header bottom border a bit stronger
  if (header) {
    doc.save()
      .strokeColor(THEME.colors.border)
      .lineWidth(0.75)
      .moveTo(x, y + rowH).lineTo(x + width, y + rowH).stroke()
      .restore();
  } else {
    // subtle row separator
    doc.save()
      .strokeColor(THEME.colors.border)
      .lineWidth(0.0)
      .moveTo(x, y + rowH).lineTo(x + width, y + rowH).stroke()
      .restore();
  }
}

/** Draws the rounded table container + vertical column dividers */
function drawTableContainer(
  doc: PDFDocument,
  THEME: any,
  x: number,
  top: number,
  width: number,
  bottom: number
) {
  const height = bottom - top;
  const radius = 5;

  // rounded outer border
  doc.save()
    .lineWidth(1)
    .strokeColor(THEME.colors.border)
    .roundedRect(x - 4, top - 4, width + 8, height + 8, radius)
    .stroke()
    .restore();

  // vertical column dividers (inside the rounded rect)
  const [w1, w2] = THEME.table.cols.slice(0, 2).map((f: number) => Math.round(width * f));
  const c1x = x + w1;
  const c2x = x + w1 + w2;

  doc.save()
    .strokeColor(THEME.colors.border)
    .lineWidth(0.0)
    .moveTo(c1x, top).lineTo(c1x, bottom).stroke()
    .moveTo(c2x, top).lineTo(c2x, bottom).stroke()
    .restore();
}

function drawFooter(doc: PDFDocument, THEME: any) {
  const y = doc.page.height - THEME.margin - 20;
  doc.strokeColor(THEME.colors.border).moveTo(THEME.margin, y).lineTo(doc.page.width - THEME.margin, y).stroke();
  doc.fontSize(10).fillColor(THEME.colors.sub)
    .text(
      "Prescription Generated from BRAC University Medical Center using Zappoint.",
      THEME.margin, y + 6,
      { width: doc.page.width - THEME.margin * 2, align: "center" }
    );
}
