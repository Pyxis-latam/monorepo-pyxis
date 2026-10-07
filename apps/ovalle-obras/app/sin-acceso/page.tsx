export default function SinAcceso() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">Tu cuenta no tiene acceso</h1>
      <p>Pide al administrador de la obra que active tu usuario.</p>
      <form action="/salir" method="post">
        <button className="underline">Salir</button>
      </form>
    </main>
  );
}
