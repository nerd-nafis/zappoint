import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
const r = Router();
r.post("/register", register);   // restrict/remove in production
r.post("/login", login);
r.get("/me", requireAuth, me);
export default r;
