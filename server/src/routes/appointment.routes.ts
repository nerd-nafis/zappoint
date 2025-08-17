import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { createAppointment, listAppointments, updateAppointment, deleteAppointment } from "../controllers/appointment.controller";
const r = Router();
r.get("/", requireAuth, listAppointments);
r.post("/", requireAuth, requireRole("admin"), createAppointment);
r.patch("/:id", requireAuth, updateAppointment);
r.delete("/:id", requireAuth, requireRole("admin"), deleteAppointment);
export default r;
