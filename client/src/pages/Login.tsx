import { useState } from "react";
import { Auth } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login(){
  const [email,setEmail]=useState("admin@example.com");
  const [password,setPassword]=useState("admin123");
  const [err,setErr]=useState("");
  const nav=useNavigate(); const { setUser }=useAuth();

  const submit=async(e:any)=>{ e.preventDefault(); setErr("");
    try{
      const r=await Auth.login(email,password);
      localStorage.setItem("token", r.data.token);
      setUser(r.data.user);
      nav("/");
    }catch(e:any){ setErr(e?.response?.data?.message || "Login failed"); }
  };

  return <form onSubmit={submit} style={{display:"grid",gap:8,maxWidth:320,margin:"4rem auto"}}>
    <h2>Login</h2>
    {err && <div style={{color:"red"}}>{err}</div>}
    <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/>
    <button type="submit">Sign in</button>
  </form>;
}
