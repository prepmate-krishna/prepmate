// pages/auth.js
import dynamic from "next/dynamic";

const AuthClient = dynamic(() => import("../components/AuthClient"), { ssr: false });

export default function AuthPage() {
  return <AuthClient />;
}
