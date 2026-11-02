import { ExpressAuth, getSession, type ExpressAuthConfig } from "@auth/express";
import Google from "@auth/express/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextFunction, Request, Response } from "express";
import { getPrismaClient } from "./prisma.js";

function allowedGoogleEmails(): Set<string> {
  return new Set(
    (process.env.AUTH_ALLOWED_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isVerifiedGoogleProfile(profile: unknown): boolean {
  return (
    typeof profile === "object" &&
    profile !== null &&
    Reflect.get(profile, "email_verified") === true
  );
}

export const authConfig: ExpressAuthConfig = {
  adapter: PrismaAdapter(getPrismaClient()),
  providers: [Google],
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") {
        console.error("Inicio de sesión rechazado: proveedor distinto de Google.");
        return false;
      }
      const email = (profile?.email || user.email || "").trim().toLowerCase();
      if (!email) {
        console.error("Inicio de sesión rechazado: Google no entregó un correo.");
        return false;
      }
      if (!isVerifiedGoogleProfile(profile)) {
        console.error("Inicio de sesión rechazado: Google no confirmó el correo.");
        return false;
      }

      const allowed = allowedGoogleEmails();
      if (process.env.VERCEL && allowed.size === 0) {
        console.error("AUTH_ALLOWED_EMAILS es obligatorio en producción.");
        return false;
      }
      if (allowed.size > 0 && !allowed.has(email)) {
        console.error(
          "Inicio de sesión rechazado: el correo de Google no está en AUTH_ALLOWED_EMAILS.",
        );
        return false;
      }
      return true;
    },
  },
};

export const authHandler = ExpressAuth(authConfig);

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

export function isLocalAuthBypass(req: Request): boolean {
  return (
    !process.env.VERCEL &&
    process.env.AUTH_LOCAL_BYPASS === "true" &&
    isLoopbackHost(req.hostname)
  );
}

export async function getAuthenticatedSession(req: Request) {
  if (isLocalAuthBypass(req)) {
    return {
      user: {
        id: "local-development",
        name: "Billetera local",
        email: "local@tu-billetera.test",
        image: null,
      },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }
  return getSession(req, authConfig);
}

export async function requireAuthenticatedUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await getAuthenticatedSession(req);
  if (!session?.user) {
    res.status(401).json({ error: "Debes iniciar sesión con Google." });
    return;
  }
  res.locals.session = session;
  next();
}

export function getAuthConfigurationStatus() {
  const allowedEmailCount = allowedGoogleEmails().size;
  return {
    provider: "google",
    allowedEmailCount,
    configured: Boolean(
      process.env.AUTH_SECRET &&
      process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET &&
      (!process.env.VERCEL || allowedEmailCount > 0)
    ),
  };
}
