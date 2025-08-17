import { Request, Response } from "express";
import Appointment from "../models/Appointment";

export const createAppointment = async (req: Request, res: Response) => {
  const appt = await Appointment.create(req.body);
  res.status(201).json({ appointment: appt });
};

export const listAppointments = async (req: Request, res: Response) => {
  const { doctor, status } = req.query;
  const q: any = {};
  if (doctor) q.doctor = doctor;
  if (status) q.status = status;
  const appts = await Appointment.find(q).populate({ path: "doctor", populate: { path: "user" }});
  res.json({ appointments: appts });
};

export const updateAppointment = async (req: Request, res: Response) => {
  const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ appointment: appt });
};

export const deleteAppointment = async (_req: Request, res: Response) => {
  await Appointment.findByIdAndDelete((_req as any).params.id);
  res.json({ ok: true });
};
