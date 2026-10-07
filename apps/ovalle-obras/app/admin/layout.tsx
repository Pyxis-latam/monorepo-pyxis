import Link from "next/link";
import { exigirRol } from "@/lib/auth/sesion";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const perfil = await exigirRol("admin");
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-6 border-b border-obra-line bg-white px-6 py-3">
        <span className="font-bold">Ovalle Obras</span>
        <Link href="/admin">Obras</Link>
        <Link href="/admin/usuarios">Usuarios</Link>
        <span className="ml-auto text-sm">{perfil.nombre}</span>
        <form action="/salir" method="post"><button className="text-sm underline">Salir</button></form>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
