import { Request, Response } from "express";
import Doctor from "../models/Doctor";
import User from "../models/User";

export const createDoctor = async (req: Request, res: Response) => {
  const { name, email, password, specialization, phone, room } = req.body;
  const user = await User.create({ name, email, password, role: "doctor" });
  const doctor = await Doctor.create({ user: user._id, specialization, phone, room });
  res.status(201).json({ doctor });
};

export const listDoctors = async (_req: Request, res: Response) => {
  const doctors = await Doctor.find().populate("user", "name email role");
  res.json({ doctors });
};

export const updateDoctor = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { specialization, phone, room, isActive, name, email } = req.body;
  const doctor = await Doctor.findByIdAndUpdate(id, { specialization, phone, room, isActive }, { new: true });
  if (doctor && (name || email)) await User.findByIdAndUpdate(doctor.user, { name, email });
  res.json({ doctor });
};

export const deleteDoctor = async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await Doctor.findById(id).populate("user");
  if(!doc) return res.status(404).json({ message: "Not found" });
  await (doc.user as any).deleteOne();
  await doc.deleteOne();
  res.json({ ok: true });
};
