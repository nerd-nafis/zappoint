import { Schema, model, Types } from "mongoose";
const prescriptionSchema = new Schema({
  appointment: { type: Types.ObjectId, ref: "Appointment", required: true, unique: true },
  doctor: { type: Types.ObjectId, ref: "Doctor", required: true },
  diagnosis: { type: String, required: true },
  medications: [{ name: String, dose: String, frequency: String, duration: String, notes: String }],
  advice: String
},{ timestamps:true });
export default model("Prescription", prescriptionSchema);
