import PDFDocument from "pdfkit";
import { Response } from "express";

export const streamPrescriptionPdf = (res: Response, data: {
  prescId: string;
  studentName: string; studentId: string; email: string; contact: string; problem: string;
  doctorName: string; diagnosis: string;
  medications: {name:string; dose?:string; frequency?:string; duration?:string; notes?:string}[];
  advice?: string;
}) => {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=prescription-${data.prescId}.pdf`);
  doc.pipe(res);

  doc.fontSize(18).text("Medical Management System", { align: "center" });
  doc.moveDown().fontSize(14).text(`Prescription #${data.prescId}`);
  doc.moveDown().fontSize(12)
    .text(`Patient: ${data.studentName} (${data.studentId})`)
    .text(`Email: ${data.email} | Contact: ${data.contact}`)
    .text(`Problem: ${data.problem}`)
    .moveDown()
    .text(`Doctor: ${data.doctorName}`)
    .text(`Diagnosis: ${data.diagnosis}`)
    .moveDown().text("Medications:");
  data.medications.forEach((m, i) => {
    doc.text(`${i+1}. ${m.name} — ${[m.dose, m.frequency, m.duration].filter(Boolean).join(" • ")} ${m.notes?`(${m.notes})`:""}`);
  });
  if (data.advice) doc.moveDown().text(`Advice: ${data.advice}`);
  doc.end();
};
