import { Router } from "express";
// NOTE: use the correct path you already use elsewhere: "../middlewares/auth" or "../middleware/auth"
import { requireAuth } from "../middlewares/auth";
import {
  createAppointment,
  listAppointments,
  updateAppointment,
  deleteAppointment,
} from "../controllers/appointment.controller";

const r = Router();

/**
 * Public create (guest-friendly)
 * - Anyone can create an appointment.
 * - Controller already validates required fields.
 */
r.post("/", createAppointment);

/**
 * List requires auth:
 * - Admin sees all
 * - Doctor sees only their own (enforced inside controller if you added that)
 */
r.get("/", requireAuth, listAppointments);

/**
 * Update:
 * - Accept BOTH PUT and PATCH so the client can send either.
 */
r.put("/:id", requireAuth, updateAppointment);
r.patch("/:id", requireAuth, updateAppointment);

/**
 * Delete:
 * - Auth required; controller can enforce doctor-ownership or admin-only as you prefer.
 */
r.delete("/:id", requireAuth, deleteAppointment);

export default r;
