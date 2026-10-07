import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { exigirRol } from "@/lib/auth/sesion";
import { NOMBRE_APP } from "@/lib/marca";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const perfil = await exigirRol("admin");
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-6 bg-obra-accent px-6 py-2 text-white">
        <span className="flex items-center gap-3">
          <Logo alto={40} />
          <span className="font-bold">{NOMBRE_APP}</span>
        </span>
        <Link href="/admin" className="hover:underline">Obras</Link>
        <Link href="/admin/usuarios" className="hover:underline">Usuarios</Link>
        <span className="ml-auto text-sm">{perfil.nombre}</span>
        <form action="/salir" method="post"><button className="text-sm underline">Salir</button></form>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
