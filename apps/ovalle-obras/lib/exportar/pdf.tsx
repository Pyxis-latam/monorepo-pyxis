import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { aplanar } from "@pyxis/ovalle-core/avance/arbol";
import { ETIQUETA_ESTADO } from "@pyxis/ovalle-core/avance/tipos";
import { formatoCantidad, formatoCLP, formatoFecha, formatoPorcentaje } from "@pyxis/ovalle-core/formato";
import type { DatosInforme } from "./excel";

const s = StyleSheet.create({
  pagina: { padding: 28, fontSize: 8, fontFamily: "Helvetica" },
  titulo: { fontSize: 16, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 9, marginBottom: 12, color: "#555" },
  kpis: { flexDirection: "row", gap: 12, marginBottom: 14 },
  kpi: { flex: 1, borderWidth: 1, borderColor: "#ddd", padding: 8 },
  kpiValor: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ddd", paddingVertical: 3 },
  encabezado: { fontFamily: "Helvetica-Bold", backgroundColor: "#f1f0ec" },
  capitulo: { fontFamily: "Helvetica-Bold" },
});

const COLS = [
  { t: "Código", w: 40 },
  { t: "Partida", w: 200 },
  { t: "Presup.", w: 70 },
  { t: "Ejecutado", w: 70 },
  { t: "Avance", w: 45 },
  { t: "$ Presupuesto", w: 75 },
  { t: "$ Ejecutado", w: 75 },
  { t: "Estado", w: 55 },
];

function InformePdf({ obra, raices, resumen, hoy }: DatosInforme) {
  return (
    <Document title={`${obra.nombre} — avance`}>
      <Page size="A4" orientation="landscape" style={s.pagina}>
        <Text style={s.titulo}>{obra.nombre}</Text>
        <Text style={s.sub}>Informe de avance al {formatoFecha(hoy)} · Constructora Ovalle</Text>
        <View style={s.kpis}>
          <View style={s.kpi}><Text>Avance físico</Text><Text style={s.kpiValor}>{formatoPorcentaje(resumen.porcentajeFisico)}</Text></View>
          <View style={s.kpi}><Text>Ejecutado</Text><Text style={s.kpiValor}>{formatoCLP(resumen.montoEjecutado)}</Text><Text>de {formatoCLP(resumen.montoPresupuestado)}</Text></View>
          <View style={s.kpi}><Text>Partidas atrasadas</Text><Text style={s.kpiValor}>{resumen.atrasadas} de {resumen.hojas}</Text></View>
        </View>
        <View style={[s.fila, s.encabezado]} fixed>
          {COLS.map((c) => <Text key={c.t} style={{ width: c.w }}>{c.t}</Text>)}
        </View>
        {aplanar(raices).map((n) => (
          <View key={n.id} style={n.esHoja ? s.fila : [s.fila, s.capitulo]} wrap={false}>
            <Text style={{ width: COLS[0].w }}>{n.codigo}</Text>
            <Text style={{ width: COLS[1].w, paddingLeft: n.nivel * 8 }}>{n.descripcion}</Text>
            <Text style={{ width: COLS[2].w }}>{n.esHoja ? `${formatoCantidad(n.cantidad!)} ${n.unidad}` : ""}</Text>
            <Text style={{ width: COLS[3].w }}>{n.esHoja ? `${formatoCantidad(n.ejecutado)} ${n.unidad}` : ""}</Text>
            <Text style={{ width: COLS[4].w }}>{formatoPorcentaje(n.porcentaje)}</Text>
            <Text style={{ width: COLS[5].w }}>{formatoCLP(n.montoPresupuestado)}</Text>
            <Text style={{ width: COLS[6].w }}>{formatoCLP(n.montoEjecutado)}</Text>
            <Text style={{ width: COLS[7].w }}>{ETIQUETA_ESTADO[n.estado]}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderizarInformePdf(datos: DatosInforme): Promise<Buffer> {
  return renderToBuffer(<InformePdf {...datos} />);
}
