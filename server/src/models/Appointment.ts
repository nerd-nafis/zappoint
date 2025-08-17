import { Schema, model, Types } from "mongoose";
const appointmentSchema = new Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  contact: { type: String, required: true },
  problem: { type: String, required: true },
  doctor: { type: Types.ObjectId, ref: "Doctor", required: true },
  status: { type: String, enum: ["pending","completed","cancelled"], default: "pending" },
  scheduledAt: { type: Date, required: true }
},{ timestamps:true });
export default model("Appointment", appointmentSchema);
