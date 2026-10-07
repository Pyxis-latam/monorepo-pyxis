"use client";

import Link from "next/link";
import { useState } from "react";
import { formatoCantidad, formatoPorcentaje } from "@pyxis/ovalle-core/formato";
import { buscarPartidas, type ItemPartida } from "@pyxis/ovalle-core/terreno/lista";

function Tarjeta({ obraId, item }: { obraId: string; item: ItemPartida }) {
  return (
    <Link href={`/terreno/obras/${obraId}/partidas/${item.id}`} className="block rounded-lg border border-obra-line bg-white p-3 active:bg-obra-bg">
      <span className="block font-medium">{item.codigo} {item.descripcion}</span>
      <span className="mt-2 flex items-center gap-2 text-sm text-gray-600">
        <span className="h-2 flex-1 rounded bg-obra-line">
          <span className="block h-2 rounded bg-obra-accent" style={{ width: `${Math.min(item.porcentaje, 1) * 100}%` }} />
        </span>
        {formatoPorcentaje(item.porcentaje)} · {formatoCantidad(item.ejecutado)}/{formatoCantidad(item.cantidad)} {item.unidad}
      </span>
    </Link>
  );
}

export function ListaPartidas({ obraId, enCurso, todas }: { obraId: string; enCurso: ItemPartida[]; todas: ItemPartida[] }) {
  const [texto, setTexto] = useState("");
  const buscando = texto.trim() !== "";
  const resultado = buscarPartidas(todas, texto);
  const capitulos = [...new Set(resultado.map((i) => i.capitulo))];

  return (
    <div className="space-y-5">
      <input
        type="search"
        placeholder="Buscar partida…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="w-full rounded-lg border border-obra-line bg-white px-3 py-3 text-base"
      />
      {!buscando && enCurso.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">En curso hoy</h2>
          {enCurso.map((i) => <Tarjeta key={i.id} obraId={obraId} item={i} />)}
        </section>
      )}
      {capitulos.map((c) => (
        <section key={c ?? "sin"} className="space-y-2">
          {!buscando && <h2 className="font-semibold">{c ?? "Partidas"}</h2>}
          {resultado.filter((i) => i.capitulo === c).map((i) => <Tarjeta key={i.id} obraId={obraId} item={i} />)}
        </section>
      ))}
      {resultado.length === 0 && <p>No hay partidas que coincidan.</p>}
    </div>
  );
}
