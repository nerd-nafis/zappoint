import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";


const userSchema = new Schema({
  name: { type: String, required: true },
  email:{ type: String, required: true, unique: true, lowercase: true, index: true },
  password:{ type: String, required: true, select: false },
  role:{ type: String, enum: ["admin","doctor"], required: true },
},{ timestamps:true });

userSchema.pre("save", async function(next){
  if(!this.isModified("password")) return next();
  this.set("password", await bcrypt.hash(this.get("password"), 10), { strict:false });
  next();
});
(userSchema as any).methods.comparePassword = async function (plain: string) {
  const hash = this.get("password");
  return bcrypt.compare(plain, hash);
};
export default model("User", userSchema);
