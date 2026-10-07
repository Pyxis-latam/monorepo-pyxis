import Link from "next/link";
import { exigirRol } from "@/lib/auth/sesion";

export default async function TerrenoLayout({ children }: { children: React.ReactNode }) {
  await exigirRol("terreno", "admin");
  return (
    <div className="mx-auto min-h-screen max-w-lg pb-20">
      <main className="p-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-obra-line bg-white py-3 text-sm">
        <Link href="/terreno">Partidas</Link>
        <Link href="/terreno/reportes">Mis reportes</Link>
        <form action="/salir" method="post"><button>Salir</button></form>
      </nav>
    </div>
  );
}
