// src/api/endpoints.ts
import http, { API_PREFIX } from "./http";


// tiny helper to join prefix + path cleanly
const p = (path: string) => `${API_PREFIX}${path}`;


// Auth endpoints
export const Auth = {
  // If your backend has no "/api" prefix, set VITE_API_PREFIX="" (default)
  login: (email: string, password: string) =>
    http.post(p("/auth/login"), { email, password }),
  me: () => http.get(p("/auth/me")),
};

// Doctors endpoints (admin)
export const Doctors = {
  list:   () => http.get(p("/doctors")),
  create: (data: any) => http.post(p("/doctors"), data),
  update: (id: string, data: any) => http.put(p(`/doctors/${id}`), data),
  remove: (id: string) => http.delete(p(`/doctors/${id}`)),
};

// Appointments
export const Appointments = {
  list:   () => http.get(p("/appointments")),
  create: (data: any) => http.post(p("/appointments"), data),
  update: (id: string, data: any) => http.put(p(`/appointments/${id}`), data),
  remove: (id: string) => http.delete(p(`/appointments/${id}`)),
};


// NEW: Prescriptions
export const Prescriptions = {
  create: (data: any) => http.post(p("/prescriptions"), data),               // { appointmentId, medicines[], advice }
  pdf:    (id: string)   => http.get(p(`/prescriptions/${id}/pdf`), { responseType: "blob" }), // download
};
