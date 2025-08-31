import { Request, Response } from "express";
import Appointment from "../models/Appointment";

// CREATE — guest-friendly
export const createAppointment = async (req: Request, res: Response) => {
  // allow guest: require doctor + scheduledAt; if no studentId then require name+email
  const { studentId, studentName, email, doctor, scheduledAt } = req.body || {};
  if (!doctor) return res.status(400).json({ message: "doctor is required" });
  if (!scheduledAt) return res.status(400).json({ message: "scheduledAt is required" });
  if (!studentId && (!studentName || !email)) {
    return res.status(400).json({ message: "studentName and email are required for guest booking" });
  }

  const appt = await Appointment.create(req.body);
  const populated = await appt.populate({ path: "doctor", populate: { path: "user", select: "name email" } });
  res.status(201).json({ appointment: populated });
};

// LIST — (you can add auth/role filters in routes if needed)
export const listAppointments = async (req: Request, res: Response) => {
  const { doctor, status } = req.query;
  const q: any = {};
  if (doctor) q.doctor = doctor;
  if (status) q.status = status;
  const appts = await Appointment.find(q)
    .populate({ path: "doctor", populate: { path: "user", select: "name email" } })
    .sort({ scheduledAt: 1 });
  res.json({ appointments: appts });
};

// UPDATE — robust, with 404 + validation
export const updateAppointment = async (req: Request, res: Response) => {
  const allowed = ["studentName","email","contact","problem","status","scheduledAt","doctor","studentId"] as const;
  const set: any = {};
  for (const k of allowed) if (req.body[k] !== undefined) set[k] = req.body[k];

  const appt = await Appointment.findByIdAndUpdate(
    req.params.id,
    { $set: set },
    { new: true, runValidators: true }
  );
  if (!appt) return res.status(404).json({ message: "Appointment not found" });

  const populated = await appt.populate({ path: "doctor", populate: { path: "user", select: "name email" } });
  res.json({ appointment: populated });
};

// DELETE — robust 404
export const deleteAppointment = async (req: Request, res: Response) => {
  const appt = await Appointment.findByIdAndDelete(req.params.id);
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  res.json({ ok: true });
};
