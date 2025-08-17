// src/pages/Doctors.tsx
import { useEffect, useMemo, useState } from "react";
import { Doctors } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// ---- Toggle this to match your backend schema ----

type ApiShape = "flat" | "nested"; // nested means { user: { name, email }, ... }
const API_SHAPE: ApiShape = "flat";



// ---- Types (adjust as needed) ----
type DoctorUser = { _id?: string; name: string; email: string };
export type Doctor = {
  _id?: string;
  user?: DoctorUser;
  name?: string;
  email?: string;
  specialization?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; doctor: Doctor };

export default function DoctorsPage() {
  const nav = useNavigate();
  const { user } = useAuth();

  // client-side gate (server should also enforce)
  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") nav("/", { replace: true });
  }, [user, nav]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [docs, setDocs] = useState<Doctor[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const r = await Doctors.list();
      console.log("/doctors response:", r.status, r.data);
      const arr = Array.isArray(r.data) ? r.data : (r.data?.doctors ?? r.data?.data ?? []);
      if (!Array.isArray(arr)) {
        setErr("Unexpected response format from /doctors.");
      } else {
        setDocs(arr);
      }
    } catch (e: any) {
      console.error(e);
      const code = e?.response?.status;
      const m =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to load doctors";
      if (code === 401) {
        setErr("Unauthorized. Please login again.");
        // optional auto-redirect:
        // nav("/login", { replace: true });
      } else {
        setErr(m);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      const name = d.user?.name || d.name || "";
      const email = d.user?.email || d.email || "";
      const spec = d.specialization || "";
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        spec.toLowerCase().includes(q)
      );
    });
  }, [docs, query]);

  const upsert = async (payload: Partial<Doctor>, existing?: Doctor) => {
    setErr("");
    try {
      if (existing?._id) {
        await Doctors.update(existing._id, payload);
      } else {
        await Doctors.create(payload);
      }
      await load();
      setMode({ kind: "idle" });
    } catch (e: any) {
      console.error(e);
      const code = e?.response?.status;
      const m =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Save failed";
      if (code === 401) setErr("Unauthorized. Please login again.");
      else setErr(m);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this doctor? This cannot be undone.")) return;
    setBusyId(id);
    setErr("");
    try {
      await Doctors.remove(id);
      setDocs((prev) => prev.filter((d) => d._id !== id));
    } catch (e: any) {
      console.error(e);
      const code = e?.response?.status;
      const m =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Delete failed";
      if (code === 401) setErr("Unauthorized. Please login again.");
      else setErr(m);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Doctors</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, specialization"
            style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 10, minWidth: 260 }}
          />
        </div>
        <button onClick={() => setMode({ kind: "create" })} style={btnPrimary}>+ Add Doctor</button>
      </header>

      {err && <div style={alertError}>{err}</div>}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 16, color: "#6b7280" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 16, color: "#6b7280" }}>No doctors found.</div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Specialization</th>
                <th style={th}>Phone</th>
                <th style={{ ...th, width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const name = d.user?.name || d.name || "—";
                const email = d.user?.email || d.email || "—";
                return (
                  <tr key={d._id || name + email}>
                    <td style={td}>{name}</td>
                    <td style={td}>{email}</td>
                    <td style={td}>{d.specialization || "—"}</td>
                    <td style={td}>{d.phone || "—"}</td>
                    <td style={{ ...td }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={btnGhost} onClick={() => setMode({ kind: "edit", doctor: d })}>Edit</button>
                        <button
                          style={btnDanger}
                          disabled={busyId === d._id}
                          onClick={() => d._id && remove(d._id)}
                        >
                          {busyId === d._id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {mode.kind !== "idle" && (
        <Modal onClose={() => setMode({ kind: "idle" })}>
          <DoctorForm
            key={mode.kind === "edit" ? mode.doctor._id : "create"}
            doctor={mode.kind === "edit" ? mode.doctor : undefined}
            onCancel={() => setMode({ kind: "idle" })}
            onSubmit={(data) => upsert(data, mode.kind === "edit" ? mode.doctor : undefined)}
          />
        </Modal>
      )}
    </div>
  );
}

function DoctorForm({
    doctor,
    onCancel,
    onSubmit,
  }: {
    doctor?: Doctor;
    onCancel: () => void;
    onSubmit: (data: Partial<Doctor>) => void;
  }) {
    const [name, setName] = useState(doctor?.user?.name || doctor?.name || "");
    const [email, setEmail] = useState(doctor?.user?.email || doctor?.email || "");
    const [password, setPassword] = useState(""); // new
    const [specialization, setSpecialization] = useState(doctor?.specialization || "");
    const [phone, setPhone] = useState(doctor?.phone || "");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
  
    const isEdit = Boolean(doctor?._id);
  
    const buildPayload = (): Partial<Doctor> => {
      if (API_SHAPE === "nested") {
        const userPayload: any = { name, email };
        if (!isEdit && password.trim()) userPayload.password = password;        // require on create
        if (isEdit && password.trim()) userPayload.password = password;         // optional on edit
        return {
          user: userPayload,
          specialization: specialization || undefined,
          phone: phone || undefined,
        };
      }
      // flat shape
      const payload: any = {
        name,
        email,
        specialization: specialization || undefined,
        phone: phone || undefined,
      };
      if (!isEdit && password.trim()) payload.password = password;
      if (isEdit && password.trim()) payload.password = password;
      return payload;
    };
  
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErr("");
      if (!name.trim()) return setErr("Name is required");
      if (!email.trim()) return setErr("Email is required");
      if (!isEdit && !password.trim()) return setErr("Password is required for new doctors");
  
      try {
        setSaving(true);
        await onSubmit(buildPayload());
      } finally {
        setSaving(false);
      }
    };
  
    return (
      <form onSubmit={submit} style={{ display: "grid", gap: 12, minWidth: 360 }}>
        <h3 style={{ margin: 0 }}>{isEdit ? "Edit doctor" : "Add doctor"}</h3>
        {err && <div style={alertError}>{err}</div>}
  
        <label style={label}>Name<input style={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label style={label}>Email<input style={input} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
  
        {!isEdit && (
          <label style={label}>
            Password
            <input
              type="password"
              style={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set initial password"
            />
          </label>
        )}
        {isEdit && (
          <label style={label}>
            New Password (optional)
            <input
              type="password"
              style={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
            />
          </label>
        )}
  
        <label style={label}>Specialization<input style={input} value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Cardiology, Neurology…" /></label>
        <label style={label}>Phone<input style={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(+880) 1XXXXXXXXX" /></label>
  
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCancel} style={btnGhost}>Cancel</button>
          <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    );
  }

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ---- Styles ----
const table: React.CSSProperties = { width: "100%", borderCollapse: "separate", borderSpacing: 0 };
const th: React.CSSProperties = { textAlign: "left", fontWeight: 700, fontSize: 13, color: "#6b7280", padding: "12px 12px", borderBottom: "1px solid #e5e7eb" };
const td: React.CSSProperties = { padding: "12px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 14 };
const label: React.CSSProperties = { display: "grid", gap: 6, fontSize: 12, color: "#334155" };
const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", outline: "none" };
const btnPrimary: React.CSSProperties = { padding: "10px 12px", border: "1px solid #1d4ed8", background: "#2563eb", color: "#fff", borderRadius: 10, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "8px 12px", border: "1px solid #ef4444", background: "#ef4444", color: "#fff", borderRadius: 10, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "8px 12px", border: "1px solid #e5e7eb", background: "#fff", color: "#0f172a", borderRadius: 10, cursor: "pointer" };
const alertError: React.CSSProperties = { padding: "10px 12px", background: "#fee2e2", color: "#991b1b", border: '1px solid #fecaca', borderRadius: 10 } as any;
const backdrop: React.CSSProperties = { position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.35)", zIndex: 50 };
const sheet: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 16, minWidth: 360, border: "1px solid #e5e7eb", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" };
