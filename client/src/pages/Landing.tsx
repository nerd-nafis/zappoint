import { useEffect, useState } from "react";
import { Appointments, Doctors } from "../api/endpoints";

export default function Landing(){
  const [doctors, setDoctors] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(()=>{ (async()=>{ try{ const r = await Doctors.list(); setDoctors(r.data?.doctors || r.data || []); } catch {} })(); }, []);

  const submit = async (e:any) => {
    e.preventDefault(); setMsg(""); setErr("");
    const form = new FormData(e.currentTarget);
    const payload = {
      studentName: String(form.get("name")||"").trim(),
      email: String(form.get("email")||"").trim(),
      contact: String(form.get("contact")||"").trim() || undefined,
      problem: String(form.get("problem")||"").trim() || undefined,
      doctor: String(form.get("doctor")||""),
      scheduledAt: new Date(String(form.get("when")||"")).toISOString(),
      status: "pending" as const,
    };
    if (!payload.studentName || !payload.email || !payload.doctor || !payload.scheduledAt) { setErr("Please fill name, email, doctor and time."); return; }
    try{ await Appointments.create(payload); setMsg("Appointment request sent. We will email you a confirmation."); (e.target as HTMLFormElement).reset(); }
    catch(e:any){ setErr(e?.response?.data?.message || "Failed to book"); }
  };

  return (
    <div style={{maxWidth:640, margin:"2rem auto", padding:16}}>
      <h1>BRACU Medical Center</h1>
      <p style={{color:"#475569"}}>Book an appointment as a guest. You will receive updates by email.</p>
      {msg && <div style={{marginBottom:8, padding:10, background:"#ecfeff", border:"1px solid #a5f3fc", borderRadius:10}}>{msg}</div>}
      {err && <div style={{marginBottom:8, padding:10, background:"#fee2e2", border:"1px solid #fecaca", borderRadius:10, color:"#991b1b"}}>{err}</div>}
      <form onSubmit={submit} style={{display:"grid", gap:10}}>
        <input name="name" placeholder="Your name" style={input} />
        <input name="email" placeholder="Email" style={input} />
        <input name="contact" placeholder="Contact (optional)" style={input} />
        <input name="problem" placeholder="Describe your problem (optional)" style={input} />
        <select name="doctor" style={input} defaultValue=""><option value="">Choose a doctor…</option>{doctors.map((d:any)=> <option key={d._id || d.id} value={d._id || d.id}>{d.name || d.user?.name} ({d.specialization || "General"})</option>)}</select>
        <input type="datetime-local" name="when" style={input} />
        <button type="submit" style={{...btnPrimary, width:160}}>Book</button>
      </form>
    </div>
  );
}
