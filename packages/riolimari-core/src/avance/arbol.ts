import { estadoHoja, porcentajeEsperado } from "./calculos";
import type { Estado, NodoAvance, PartidaPlan, ResumenObra } from "./tipos";

function estadoCapitulo(hijos: NodoAvance[]): Estado {
  if (hijos.length === 0) return "sin_fechas";
  if (hijos.some((h) => h.estado === "atrasada")) return "atrasada";
  if (hijos.every((h) => h.estado === "terminada")) return "terminada";
  if (hijos.every((h) => h.estado === "sin_fechas")) return "sin_fechas";
  return "al_dia";
}

export function construirArbol(partidas: PartidaPlan[], ejecutado: Map<string, number>, hoy: string): NodoAvance[] {
  const hijosDe = new Map<string | null, PartidaPlan[]>();
  for (const p of [...partidas].sort((a, b) => a.orden - b.orden)) {
    const lista = hijosDe.get(p.parent_id) ?? [];
    lista.push(p);
    hijosDe.set(p.parent_id, lista);
  }

  const nodo = (p: PartidaPlan, nivel: number): NodoAvance => {
    if (p.cantidad !== null) {
      const ej = ejecutado.get(p.id) ?? 0;
      const porcentaje = ej / p.cantidad;
      const precio = p.precio_unitario ?? 0;
      const esperado = porcentajeEsperado(p.fecha_inicio, p.fecha_fin, hoy);
      return {
        ...p,
        esHoja: true,
        nivel,
        ejecutado: ej,
        porcentaje,
        porcentajeEsperado: esperado,
        montoPresupuestado: p.cantidad * precio,
        montoEjecutado: Math.min(ej, p.cantidad) * precio,
        estado: estadoHoja(porcentaje, esperado),
        hijos: [],
      };
    }
    const hijos = (hijosDe.get(p.id) ?? []).map((h) => nodo(h, nivel + 1));
    const montoPresupuestado = hijos.reduce((s, h) => s + h.montoPresupuestado, 0);
    const montoEjecutado = hijos.reduce((s, h) => s + h.montoEjecutado, 0);
    return {
      ...p,
      esHoja: false,
      nivel,
      ejecutado: 0,
      porcentaje: montoPresupuestado > 0 ? montoEjecutado / montoPresupuestado : 0,
      porcentajeEsperado: null,
      montoPresupuestado,
      montoEjecutado,
      estado: estadoCapitulo(hijos),
      hijos,
    };
  };

  return (hijosDe.get(null) ?? []).map((p) => nodo(p, 0));
}

export function aplanar(raices: NodoAvance[]): NodoAvance[] {
  return raices.flatMap((n) => [n, ...aplanar(n.hijos)]);
}

export function resumenObra(raices: NodoAvance[]): ResumenObra {
  const hojas = aplanar(raices).filter((n) => n.esHoja);
  const montoPresupuestado = hojas.reduce((s, h) => s + h.montoPresupuestado, 0);
  const montoEjecutado = hojas.reduce((s, h) => s + h.montoEjecutado, 0);
  return {
    montoPresupuestado,
    montoEjecutado,
    porcentajeFisico: montoPresupuestado > 0 ? montoEjecutado / montoPresupuestado : 0,
    atrasadas: hojas.filter((h) => h.estado === "atrasada").length,
    hojas: hojas.length,
  };
}
