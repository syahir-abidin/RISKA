"use client";
import { signOut } from "next-auth/react";
export function SignOut() {
  return <button type="button" className="btn btn-sm" onClick={() => signOut({ callbackUrl: "/login" })}>Keluar</button>;
}
