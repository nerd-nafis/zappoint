import { useEffect, useMemo, useState } from "react";
import { Appointments, Prescriptions } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import "../pages/forms.css";


const iconBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  padding: 0,
  borderRadius: 10,
  cursor: "pointer",
  lineHeight: 0
};

type Appointment = {
  _id: string;
  studentName: string;
  email: string;
  contact?: string;
  problem?: string;
  status: "pending" | "completed" | "cancelled";
  scheduledAt: string;
  doctor?: { _id: string; user?: { name?: string } } | string;
};

type Med = {
  name: string;
  morning: boolean; // 1st digit
  noon: boolean;    // 2nd digit
  night: boolean;   // 3rd digit
  timing: "after" | "before"; // meal timing
};

export default function PrescriptionPage(){
  const { user } = useAuth();
  const [queue, setQueue] = useState<Appointment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [meds, setMeds] = useState<Med[]>([{ name: "", morning:false, noon:false, night:true, timing:"after" }]);
  const [advice, setAdvice] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const loadQueue = async () => {
    setErr("");
    try {
      const r = await Appointments.list();
      const all: Appointment[] = r.data?.appointments || r.data || [];
      // show only pending future/nearby ones first
      const q = all.filter(a => a.status === "pending").sort((a,b)=> +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
      setQueue(q);
      if (!selectedId && q.length) setSelectedId(q[0]._id);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load appointments queue");
    }
  };

  useEffect(()=>{ loadQueue(); }, []);

  const chosen = useMemo(()=> queue.find(a => a._id === selectedId), [queue, selectedId]);

  const addRow = () => setMeds(m => [...m, { name:"", morning:false, noon:false, night:false, timing:"after" }]);
  const delRow = (i:number) => setMeds(m => m.length===1 ? [{ name:"", morning:false, noon:false, night:false, timing:"after" }] : m.filter((_,idx)=> idx!==i));

  const updateRow = (i:number, patch: Partial<Med>) => {
    setMeds(m => m.map((row,idx)=> idx===i ? { ...row, ...patch } : row));
  };

  const doseStr = (m: Med) => `${m.morning?1:0}/${m.noon?1:0}/${m.night?1:0}`;

  const submit = async () => {
    setErr(""); setMsg("");
    if (!selectedId) return setErr("Select an appointment first.");
    const cleaned = meds
      .map(m => ({ ...m, name: m.name.trim() }))
      .filter(m => m.name && (m.morning || m.noon || m.night));
    if (cleaned.length === 0) return setErr("Add at least one medicine with a dose.");
    setSaving(true);
    try {
      // 1) create prescription (server will also mark appointment completed)
      const res = await Prescriptions.create({
        appointmentId: selectedId,
        medicines: cleaned.map(m => ({ name: m.name, dose: doseStr(m), timing: m.timing })), // e.g., "0/0/1"
        advice: advice || undefined,
      });
      const id = res.data?.prescription?._id || res.data?.id || res.data?._id;

      // 2) download PDF
      if (id) {
        const pdf = await Prescriptions.pdf(id);
        const blob = new Blob([pdf.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const patient = chosen?.studentName?.replace(/\\s+/g, "_") || "patient";
        a.download = `prescription_${patient}_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      }

      setMsg("Prescription saved and appointment completed.");
      setMeds([{ name:"", morning:false, noon:false, night:true, timing:"after" }]);
      setAdvice("");
      await loadQueue(); // refresh queue, completed one will drop
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display:"grid", gap:16 }}>
      <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <h2 style={{ margin:0 }}>Prescription</h2>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style = {input}
            
          >
            {queue.length === 0 && <option value="">No pending appointments</option>}
            {queue.map(a => (
              <option key={a._id} value={a._id}>
                {a.studentName} — {new Date(a.scheduledAt).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <div style={{ color:"#64748b", fontSize:13 }}>
          {user?.role === "doctor" ? "Doctor" : "Admin"}
        </div>
      </header>

      {chosen && (
        <div className="card" style={{ padding:16, display:"grid", gap:12 }}>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <div><b>Patient:</b> {chosen.studentName}</div>
            <div><b>Email:</b> {chosen.email}</div>
            {chosen.problem && <div><b>Problem:</b> {chosen.problem}</div>}
          </div>
        </div>
      )}

      {err && <div style={alertError}>{err}</div>}
      {msg && <div style={alertOk}>{msg}</div>}

      <div className="card" style={{ padding:0 }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Medicine</th>
              <th style={th} title="Morning/Noon/Night">Dose (M/N/N)</th>
              <th style={th}>Timing</th>
              <th style={{...th, width:80}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {meds.map((m, i) => (
              <tr key={i}>
                <td style={td}>
                  <input style={input} placeholder="e.g., Paracetamol 500mg"
                         value={m.name} onChange={e=>updateRow(i,{name:e.target.value})}/>
                </td>
                <td style={td}>
                  <label style={doseLbl}><input type="checkbox" checked={m.morning} onChange={e=>updateRow(i,{morning:e.target.checked})}/> Morning</label>
                  <label style={doseLbl}><input type="checkbox" checked={m.noon}    onChange={e=>updateRow(i,{noon:e.target.checked})}/> Noon</label>
                  <label style={doseLbl}><input type="checkbox" checked={m.night}   onChange={e=>updateRow(i,{night:e.target.checked})}/> Night</label>
                </td>
                <td style={td}>
                  <select style={input} value={m.timing} onChange={e=>updateRow(i,{ timing:e.target.value as any })}>
                    <option value="after">After meal</option>
                    <option value="before">Before meal</option>
                  </select>
                </td>
                <td style={td}>
                <div style={{ display: "flex", gap: 8 }}>
  <button
    style={{ ...btnGhost, ...iconBtn }}
    onClick={addRow}
    aria-label="Add row"
    title="Add row"
  >
    <FiPlus size={16} />
  </button>

  <button
    style={{ ...btnDanger, ...iconBtn }}
    onClick={() => delRow(i)}
    aria-label="Delete row"
    title="Delete row"
  >
    <FiTrash2 size={16} />
  </button>
</div>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label style={label}>
        Suggestion / Advice
        <textarea style={input} rows={3} value={advice} onChange={e=>setAdvice(e.target.value)} placeholder="Diet, rest, tests, etc."/>
      </label>

      <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
        <button style={btnPrimary} disabled={saving || !selectedId} onClick={submit}>
          {saving ? "Saving & Generating…" : "Complete & Download PDF"}
        </button>
      </div>
    </div>
  );
}

const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", outline: "none", background: '#eeeeee', fontSize: 12, color: '#1E1E1E'  };

const table: React.CSSProperties = { width:"100%", borderCollapse:"separate", borderSpacing:0 };
const th: React.CSSProperties = { textAlign:"left", fontWeight:700, fontSize:13, color:"#6b7280", padding:"12px 12px", borderBottom:"1px solid #e5e7eb" };
const td: React.CSSProperties = { padding:"12px 12px", borderBottom:"1px solid #f1f5f9", fontSize:14, verticalAlign:"top" };
const doseLbl: React.CSSProperties = { display:"inline-flex", alignItems:"center", gap:6, marginRight:12, fontSize:13, color:"#334155", background: "#FFFFF" };
const label: React.CSSProperties = { display:"grid", gap:6, fontSize:12, color:"#334155" };

const btnPrimary: React.CSSProperties = { padding:"10px 12px", border:"1px solid #1d4ed8", background:"#2563eb", color:"#fff", borderRadius:10, cursor:"pointer" };
const btnDanger: React.CSSProperties = { padding:"8px 12px", border:"1px solid #ef4444", background:"#ef4444", color:"#fff", borderRadius:10, cursor:"pointer" };
const btnGhost: React.CSSProperties = { padding:"8px 12px", border:"1px solid #e5e7eb", background:"#fff", color:"#0f172a", borderRadius:10, cursor:"pointer" };
const alertError: React.CSSProperties = { padding:"10px 12px", background:"#fee2e2", color:"#991b1b", border:"1px solid #fecaca", borderRadius:10 };
const alertOk: React.CSSProperties   = { padding:"10px 12px", background:"#ecfeff", color:"#075985", border:"1px solid #a5f3fc", borderRadius:10 };
