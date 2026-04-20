import type { Metadata } from "next";
import { LoginForm } from "./_login-form";

export const metadata: Metadata = {
  title: "Connexion — Gouv-API",
};

export default function LoginPage() {
  return <LoginForm />;
}
