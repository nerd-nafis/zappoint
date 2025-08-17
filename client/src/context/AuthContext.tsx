import { createContext, useContext, useEffect, useState } from "react";
import { Auth } from "../api/endpoints";

type User = { id:string; name:string; email:string; role:"admin"|"doctor" } | null;
const Ctx = createContext<{user:User; setUser:(u:User)=>void}>({ user:null, setUser:()=>{} });
export const useAuth = ()=> useContext(Ctx);

export default function AuthProvider({children}:{children:any}) {
  const [user, setUser] = useState<User>(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) Auth.me().then(r => setUser(r.data.user)).catch(()=>localStorage.removeItem("token"));
  }, []);
  return <Ctx.Provider value={{user,setUser}}>{children}</Ctx.Provider>;
}
