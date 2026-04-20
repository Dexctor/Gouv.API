import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

// Ne matche pas les assets statiques ni la route /api/auth (gérée par NextAuth)
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
