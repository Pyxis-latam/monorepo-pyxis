import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { exigirRol } from "@/lib/auth/sesion";
import { NOMBRE_APP } from "@/lib/marca";

export default async function TerrenoLayout({ children }: { children: React.ReactNode }) {
  await exigirRol("terreno", "admin");
  return (
    <div className="mx-auto min-h-screen max-w-lg pb-20">
      <header className="flex items-center gap-3 bg-obra-accent px-4 py-2 text-white">
        <Logo alto={36} />
        <span className="font-bold">{NOMBRE_APP}</span>
      </header>
      <main className="p-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-obra-line bg-white py-3 text-sm">
        <Link href="/terreno">Partidas</Link>
        <Link href="/terreno/reportes">Mis reportes</Link>
        <form action="/salir" method="post"><button>Salir</button></form>
      </nav>
    </div>
  );
}
