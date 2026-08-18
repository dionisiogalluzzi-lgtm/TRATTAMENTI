import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="auth-page"><Suspense fallback={<div className="auth-card">Caricamento…</div>}><LoginForm /></Suspense></main>;
}
