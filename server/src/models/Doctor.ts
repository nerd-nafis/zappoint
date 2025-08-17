import { Schema, model, Types } from "mongoose";
const doctorSchema = new Schema({
  user: { type: Types.ObjectId, ref: "User", required: true, unique: true },
  specialization: { type: String, required: true },
  phone: String,
  room: String,
  isActive: { type: Boolean, default: true }
},{ timestamps:true });
export default model("Doctor", doctorSchema);
