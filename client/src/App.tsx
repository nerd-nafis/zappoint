import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider, { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import DashboardLayout, { Overview } from "./pages/Dashboard";
import DoctorsPage from "./pages/Doctors";
import AppointmentsPage from "./pages/Appointments";
import PrescriptionPage from "./pages/Prescription";

function Private({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* layout route */}
          <Route
            path="/"
            element={
              <Private>
                <DashboardLayout />
              </Private>
            }
          >
            {/* renders inside dash__main via <Outlet/> */}
            <Route index element={<Overview />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="prescriptions/new" element={<PrescriptionPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
