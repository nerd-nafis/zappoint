import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

const sign = (u: any) => jwt.sign(
  { id: u._id, role: u.role, name: u.name, email: u.email },
  process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES || "7d" }
);

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const user = await User.create({ name, email, password, role });
  res.status(201).json({ user: { id: user._id, name, email, role } });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if(!user || !(await (user as any).comparePassword(password))) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role }});
};

export const me = async (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
};
