import { useEffect, useMemo, useState } from "react";
import { Appointments as API, Doctors } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

// ---- Types (robust for populated vs id) ----
type UserRef = string | { _id: string; name?: string; email?: string };
type DoctorRef = string | { _id: string; user?: UserRef };

type Appointment = {
  _id?: string;
  studentName: string;
  email: string;
  contact?: string;
  problem?: string;
  status: "pending" | "completed" | "cancelled";
  scheduledAt: string; // ISO
  doctor?: DoctorRef | null;
  studentId?: string | null;
};

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; appt: Appointment };

// ---- Helpers ----
function getDoctorId(doc: DoctorRef | null | undefined): string {
  if (!doc) return "";
  return typeof doc === "string" ? doc : (doc._id || "");
}
function getDoctorName(doc: DoctorRef | null | undefined): string {
  if (!doc || typeof doc === "string") return "—";
  const u = doc.user;
  if (!u || typeof u === "string") return "—";
  return u.name || "—";
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      // Always try to load doctors; if forbidden for doctor role, fall back to []
      const [a, d] = await Promise.all([
        API.list(),
        Doctors.list().catch(() => ({ data: { doctors: [] } })),
      ]);
      const arr = a.data?.appointments || a.data || [];
      const docs = d.data?.doctors || d.data || [];
      setAppts(Array.isArray(arr) ? arr : []);
      setDoctors(Array.isArray(docs) ? docs : []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [user?.role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return appts;
    return appts.filter(a =>
      (a.studentName || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q) ||
      (a.problem || "").toLowerCase().includes(q)
    );
  }, [appts, query]);

  const upsert = async (payload: Partial<Appointment>, existing?: Appointment) => {
    setErr("");
    try {
      if (existing?._id) await API.update(existing._id, payload);
      else await API.create(payload);
      await load();
      setMode({ kind: "idle" });
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this appointment?")) return;
    setBusyId(id);
    setErr("");
    try {
      await API.remove(id);
      setAppts(prev => prev.filter(a => a._id !== id));
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Appointments</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient, email, problem"
            style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 10, minWidth: 260 }}
          />
        </div>
        <button style={btnPrimary} onClick={() => setMode({ kind: "create" })}>+ New Appointment</button>
      </header>

      {err && <div style={alertError}>{err}</div>}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 16, color: "#6b7280" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 16, color: "#6b7280" }}>No appointments.</div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Patient</th>
                <th style={th}>Email</th>
                <th style={th}>Doctor</th>
                <th style={th}>When</th>
                <th style={th}>Status</th>
                <th style={{ ...th, width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a._id}>
                  <td style={td}>{a.studentName}</td>
                  <td style={td}>{a.email}</td>
                  <td style={td}>{getDoctorName(a.doctor)}</td>
                  <td style={td}>{new Date(a.scheduledAt).toLocaleString()}</td>
                  <td style={td}>{a.status}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={btnGhost} onClick={() => setMode({ kind: "edit", appt: a })}>Edit</button>
                      <button
                        style={btnDanger}
                        disabled={busyId === a._id}
                        onClick={() => a._id && remove(a._id)}
                      >
                        {busyId === a._id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {mode.kind !== "idle" && (
        <Modal onClose={() => setMode({ kind: "idle" })}>
          <AppointmentForm
            doctors={doctors}
            appt={mode.kind === "edit" ? mode.appt : undefined}
            onCancel={() => setMode({ kind: "idle" })}
            onSubmit={(data) => upsert(data, mode.kind === "edit" ? mode.appt : undefined)}
          />
        </Modal>
      )}
    </div>
  );
}

function AppointmentForm({
  appt,
  doctors,
  onCancel,
  onSubmit,
}: {
  appt?: Appointment;
  doctors: any[];
  onCancel: () => void;
  onSubmit: (data: Partial<Appointment>) => void;
}) {
  const { user } = useAuth();

  const [studentName, setStudentName] = useState(appt?.studentName || "");
  const [email, setEmail] = useState(appt?.email || "");
  const [contact, setContact] = useState(appt?.contact || "");
  const [problem, setProblem] = useState(appt?.problem || "");
  const [status, setStatus] = useState<Appointment["status"]>(appt?.status || "pending");
  const [scheduledAt, setScheduledAt] = useState(
    appt?.scheduledAt ? appt.scheduledAt.slice(0, 16) : new Date().toISOString().slice(0, 16)
  );

  // doctor as string id
  const [doctor, setDoctor] = useState(
    appt ? getDoctorId(appt.doctor) : ""
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!studentName.trim()) return setErr("Patient name required");
    if (!email.trim()) return setErr("Email required");
    if (!doctor) return setErr("Doctor required");
    if (!scheduledAt) return setErr("Date/time required");

    const payload: Partial<Appointment> = {
      studentName,
      email,
      contact: contact || undefined,
      problem: problem || undefined,
      status,
      scheduledAt: new Date(scheduledAt).toISOString(),
      doctor, // backend expects doctor id
    };

    // Optional: if you ever have a 'student' role logged in, attach their id
   
    // keep existing studentId if editing an appointment that already has it
    if (appt && (appt as any).studentId) {
      (payload as any).studentId = (appt as any).studentId;
    }

    try {
      setSaving(true);
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const isDoctorUser = user?.role === "doctor";
  const hasDoctorOptions = Array.isArray(doctors) && doctors.length > 0;
  const currentOptionNeeded = !hasDoctorOptions && !!doctor;

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, minWidth: 420 }}>
      <h3 style={{ margin: 0 }}>{appt?._id ? "Edit appointment" : "New appointment"}</h3>
      {err && <div style={alertError}>{err}</div>}

      <label style={label}>Patient name<input style={input} value={studentName} onChange={e => setStudentName(e.target.value)} /></label>
      <label style={label}>Email<input style={input} value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label style={label}>Contact<input style={input} value={contact} onChange={e => setContact(e.target.value)} /></label>
      <label style={label}>Problem<input style={input} value={problem} onChange={e => setProblem(e.target.value)} /></label>

      <label style={label}>
        Doctor
        <select
          style={input}
          value={doctor}
          onChange={e => setDoctor(e.target.value)}
          disabled={isDoctorUser && !hasDoctorOptions} // if doctor user and no list, lock current
        >
          <option value="">Select a doctor…</option>
          {/* If we don't have a list (e.g., doctor role blocked by API), keep the current one selectable */}
          {currentOptionNeeded && (
            <option value={doctor}>
              {(appt && getDoctorName(appt.doctor)) || "Assigned doctor"}
            </option>
          )}
          {doctors.map((d: any) => (
            <option key={d._id || d.id} value={d._id || d.id}>
              {d.user?.name || d.name} ({d.specialization || "General"})
            </option>
          ))}
        </select>
      </label>

      <label style={label}>
        Scheduled at
        <input type="datetime-local" style={input} value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
      </label>

      <label style={label}>
        Status
        <select style={input} value={status} onChange={e => setStatus(e.target.value as any)}>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={btnGhost}>Cancel</button>
        <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

// ---- Shared mini UI styles ----
const table: React.CSSProperties = { width: "100%", borderCollapse: "separate", borderSpacing: 0 };
const th: React.CSSProperties = { textAlign: "left", fontWeight: 700, fontSize: 13, color: "#6b7280", padding: "12px 12px", borderBottom: "1px solid #e5e7eb" };
const td: React.CSSProperties = { padding: "12px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 14 };
const label: React.CSSProperties = { display: "grid", gap: 6, fontSize: 14, color: "#111111" };
const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", outline: "none", background: '#eeeeee', fontSize: 12, color: '#1E1E1E'  };
const btnPrimary: React.CSSProperties = { padding: "10px 12px", border: "1px solid #1d4ed8", background: "#2563eb", color: "#fff", borderRadius: 10, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "8px 12px", border: "1px solid #ef4444", background: "#ef4444", color: "#fff", borderRadius: 10, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "8px 12px", border: "1px solid #e5e7eb", background: "#fff", color: "#0f172a", borderRadius: 10, cursor: "pointer" };
const alertError: React.CSSProperties = { padding: "10px 12px", background: "#fee2e2", color: "#991b1b", border: '1px solid #fecaca', borderRadius: 10 } as any;

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.35)", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, padding: 16, minWidth: 420, border: "1px solid #e5e7eb", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
