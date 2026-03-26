import CredentialsProvider from "next-auth/providers/credentials";
import { type NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { requireDb } from "@/lib/db";
import { adminUsers } from "@/db/schema";
import { auditLog } from "@/lib/audit";

function requireSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET must be set and at least 32 characters long."
    );
  }
  return secret;
}

export const authOptions: NextAuthOptions = {
  secret: requireSecret(),
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt", maxAge: 4 * 60 * 60 /* 4 hours */ },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) return null;

        const db = requireDb();
        const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
        const admin = rows[0];
        if (!admin) {
          auditLog({ event: "login_failed", detail: { reason: "unknown_email" } });
          return null;
        }

        const passwordOk = await bcrypt.compare(password, admin.password_hash);
        if (!passwordOk) {
          auditLog({ event: "login_failed", actor: email, detail: { reason: "bad_password" } });
          return null;
        }

        auditLog({ event: "login_success", actor: email });
        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as { id?: string }).id = (user as { id?: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      const id = (token as { id?: string }).id;
      if (session.user && id) {
        (session.user as { id?: string }).id = id;
      }
      return session;
    },
  },
};

export function getAdminServerSession() {
  return getServerSession(authOptions);
}

// NextAuth's internal typing for `basePath` varies across versions.
// We set it explicitly so client signOut/signIn endpoints align with our
// admin-scoped auth route (`/api/admin/login/...`).
(authOptions as unknown as { basePath?: string }).basePath = "/api/admin/login";


