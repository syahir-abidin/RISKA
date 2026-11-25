import NextAuth from "next-auth";
import { authOptions } from "./auth";

// Pengganti rute catch-all "[...nextauth]": dua segmen dinamis (/api/auth/x dan /api/auth/x/y)
// diteruskan ke NextAuth sebagai params.nextauth. Nama folder tanpa "..." agar bisa diunggah lewat web GitHub.
const handler = NextAuth(authOptions);
type P = { params: { a: string; b?: string } };
export function authRoute(req: Request, { params }: P) {
  const nextauth = [params.a, params.b].filter(Boolean) as string[];
  return handler(req, { params: { nextauth } });
}
