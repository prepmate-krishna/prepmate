// pages/auth.js
import dynamic from "next/dynamic";
const AuthUI = dynamic(() => import("../components/AuthUI"), { ssr: false });

export default function AuthPage() {
  return <AuthUI />;
}
