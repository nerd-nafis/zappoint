import { Schema, Types, model, models } from "mongoose";

const AppointmentSchema = new Schema(
  {
    // guest-friendly; present if booked by a logged-in student
    studentId: { type: Types.ObjectId, ref: "User", required: false, default: null },
    studentName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    contact: { type: String, trim: true },
    problem: { type: String, trim: true },

    // must reference Doctor collection (_id of Doctor doc)
    doctor: { type: Types.ObjectId, ref: "Doctor", required: true },

    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  },
  { timestamps: true }
);

// Guard against OverwriteModelError during hot-reload
export default models.Appointment || model("Appointment", AppointmentSchema);
