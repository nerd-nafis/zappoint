import { Schema, model, models, Types } from "mongoose";

const PrescriptionSchema = new Schema(
  {
    appointment: { type: Types.ObjectId, ref: "Appointment", required: true, index: true },
    issuedBy:    { type: Types.ObjectId, ref: "User", required: true },
    patientName: { type: String, required: true },
    patientEmail:{ type: String, required: true },
    doctorName:  { type: String, required: true },
    items: [
      {
        name:   { type: String, required: true },
        dose:   { type: String, required: true }, // "0/0/1"
        timing: { type: String, enum: ["before","after"], default: "after" },
      }
    ],
    advice: { type: String },
  },
  { timestamps: true }
);

export default models.Prescription || model("Prescription", PrescriptionSchema);
