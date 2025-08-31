import { Router } from "express";
import { requireAuth } from "../middlewares/auth"; // your folder is "middlewares"
import { createPrescription, getPrescriptionPdf } from "../controllers/prescription.controller";

const r = Router();
r.post("/", requireAuth, createPrescription);
r.get("/:id/pdf", requireAuth, getPrescriptionPdf);
export default r;