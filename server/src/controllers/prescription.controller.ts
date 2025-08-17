import { Request, Response } from "express";
import Prescription from "../models/Prescription";
import { streamPrescriptionPdf } from "../services/pdf.service";

export const createPrescription = async (req: Request, res: Response) => {
  const exists = await Prescription.findOne({ appointment: req.body.appointment });
  if (exists) return res.status(400).json({ message: "Prescription already exists for this appointment" });
  const presc = await Prescription.create(req.body);
  res.status(201).json({ prescription: presc });
};

export const listPrescriptions = async (_req: Request, res: Response) => {
  const items = await Prescription.find()
    .populate({ path: "appointment", populate: { path: "doctor", populate: { path: "user" }}})
    .populate({ path: "doctor", populate: { path: "user" }});
  res.json({ prescriptions: items });
};

export const updatePrescription = async (req: Request, res: Response) => {
  const presc = await Prescription.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ prescription: presc });
};

export const deletePrescription = async (req: Request, res: Response) => {
  await Prescription.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};

export const downloadPdf = async (req: Request, res: Response) => {
  const p = await Prescription.findById(req.params.id)
    .populate({ path: "doctor", populate: { path: "user" }})
    .populate("appointment");
  if(!p) return res.status(404).json({ message: "Not found" });

  const appt = p.appointment as any;
  const doctor = p.doctor as any;
  streamPrescriptionPdf(res, {
    prescId: p.id,
    studentName: appt.studentName, studentId: appt.studentId,
    email: appt.email, contact: appt.contact, problem: appt.problem,
    doctorName: doctor.user.name,
    diagnosis: p.diagnosis,
    medications: p.medications as any,
    advice: p.advice
  });
};
