import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Appointments, Doctors } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import "./dashboard.css";

type Appt = {
  _id: string;
  studentName: string;
  email: string;
  contact: string;
  problem: string;
  status: "pending" | "completed" | "cancelled";
  scheduledAt: string;
  doctor?: { _id: string; specialization?: string; user?: { name: string; email: string } };
};

export default function DashboardLayout() {
  const { user } = useAuth();
  const loc = useLocation();
  const isOverview = loc.pathname === "/";

  return (
    <div className="dash">
      <aside className="dash__aside">
        <div className="brand">Zappoint</div>
        <nav className="nav">
          <Link to="/">Overview</Link>
          <Link to="/appointments">Appointments</Link>
          {user?.role === "admin" && <Link to="/doctors">Doctors</Link>}
          <Link to="/prescriptions/new">Prescription</Link>
        </nav>
        <div className="aside__spacer" />
        <div className="aside__settings">Settings</div>
      </aside>

      <main className="dash__main">
        {isOverview ? <Overview /> : <Outlet />}
      </main>
    </div>
  );
}

export function Overview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [docCount, setDocCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [aRes, dRes] = await Promise.allSettled([
          Appointments.list(),
          user?.role === "admin" ? Doctors.list() : Promise.resolve(null) as any,
        ]);
        if (!alive) return;
        if (aRes.status === "fulfilled") setAppts(aRes.value.data.appointments || []);
        if (dRes && dRes.status === "fulfilled")
          setDocCount((dRes.value.data.doctors || []).length);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.role]);

  const todayStart = useMemo(() => new Date(new Date().setHours(0,0,0,0)), []);
  const todayEnd   = useMemo(() => new Date(new Date().setHours(23,59,59,999)), []);
  const upcomingToday = useMemo(
    () =>
      appts
        .filter(a => {
          const t = new Date(a.scheduledAt);
          return t >= todayStart && t <= todayEnd;
        })
        .sort((a,b)=> +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
        .slice(0, 5),
    [appts, todayStart, todayEnd]
  );

  const stats = useMemo(() => {
    const totalApptsToday = upcomingToday.length;
    const pendingToday = upcomingToday.filter(a => a.status === "pending").length;
    return { totalApptsToday, pendingToday };
  }, [upcomingToday]);

  return (
    <>
      <header className="topbar">
        <div className="whoami">
          <div className="whoami__name">{user?.name}</div>
        </div>
      </header>

      <section className="heroRow">
        <div className="card hero">
          <div className="greeting__container">
            <div className="hero__greeting">Good {greet()},</div>
            <div className="hero__name">Dr. {user?.role === "doctor" ? user?.name : "Admin"}</div>
          </div>
          <div className="hero__meta">
            <span>{new Intl.DateTimeFormat(undefined,{weekday:"long", month:"short", day:"2-digit"}).format(new Date())}</span>
            <span>•</span>
            <span>{new Intl.DateTimeFormat(undefined,{hour:"2-digit", minute:"2-digit"}).format(new Date())}</span>
          </div>
        </div>

        <div className="card upcoming">
          <div className="card__title">
            Upcoming Appointments — Today
            <Link to="/appointments" className="viewAll">View all</Link>
          </div>
          <div className="upcoming__list">
            {loading ? (
              <div className="skeleton">Loading…</div>
            ) : upcomingToday.length === 0 ? (
              <div className="empty">No appointments today.</div>
            ) : (
              upcomingToday.map((a) => <AppointmentItem key={a._id} appt={a} />)
            )}
          </div>
        </div>
      </section>

      <section className="statsRow">
        <div className="stat card">
          <div className="stat__label">Doctors</div>
          <div className="stat__value">{docCount ?? "—"}</div>
        </div>
        <div className="stat card">
          <div className="stat__label">Today’s Appointments</div>
          <div className="stat__value">{stats.totalApptsToday}</div>
        </div>
        <div className="stat card">
          <div className="stat__label">Pending Today</div>
          <div className="stat__value">{stats.pendingToday}</div>
        </div>
        <Link to="/prescriptions/new" className="quick card">+ New Prescription</Link>
      </section>
    </>
  );
}

function AppointmentItem({ appt }: { appt: Appt }) {
  const t = new Date(appt.scheduledAt);
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(t);
  const statusClass =
    appt.status === "completed" ? "pill pill--done" :
    appt.status === "cancelled" ? "pill pill--cancelled" :
    "pill pill--pending";
  const doctorName = appt.doctor?.user?.name ? ` → ${appt.doctor.user.name}` : "";
  return (
    <div className="upcoming__item">
      <div className="upcoming__who">
        <div className="avatar">{appt.studentName?.[0] ?? "P"}</div>
        <div className="who__meta">
          <div className="who__name">{appt.studentName}{doctorName}</div>
          <div className="who__sub">{appt.email}</div>
        </div>
      </div>
      <div className="upcoming__right">
        <div className="when">
          <div className="when__time">{time}</div>
        </div>
        <div className={statusClass}>{labelFor(appt.status)}</div>
      </div>
    </div>
  );
}

function labelFor(s: Appt["status"]) {
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  return "Check‑in";
}
function greet() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
