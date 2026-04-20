import type { NextAuthConfig } from "next-auth";

// Configuration edge-compatible consommée par le middleware.
// Ne contient aucun provider qui dépendrait de Node (ex: Prisma, bcrypt).
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
  providers: [],
};
