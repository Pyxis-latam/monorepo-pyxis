import { readFile } from "node:fs/promises";
import path from "node:path";
// Alias: es la imagen de react-pdf (va dentro del PDF), no un <img> de HTML que necesite `alt`.
import { Document, Image as ImagenPdf, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { aplanar } from "@pyxis/riolimari-core/avance/arbol";
import { ETIQUETA_ESTADO } from "@pyxis/riolimari-core/avance/tipos";
import { formatoCantidad, formatoCLP, formatoFecha, formatoPorcentaje } from "@pyxis/riolimari-core/formato";
import { COLOR_PRIMARIO, EMPRESA, LOGO } from "@/lib/marca";
import type { DatosInforme } from "./excel";

const MARGEN = 28;

const s = StyleSheet.create({
  pagina: { paddingTop: 0, paddingBottom: MARGEN, paddingHorizontal: MARGEN, fontSize: 8, fontFamily: "Helvetica" },
  // Banda de la marca a todo el ancho, repetida en cada página: el logo es blanco y va sobre el primario.
  banda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: -MARGEN,
    marginBottom: 14,
    paddingHorizontal: MARGEN,
    paddingVertical: 10,
    backgroundColor: COLOR_PRIMARIO,
  },
  logo: { height: 36, width: (36 * LOGO.ancho) / LOGO.alto },
  empresa: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#ffffff" },
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

function InformePdf({ obra, raices, resumen, hoy, logo }: DatosInforme & { logo: Buffer }) {
  return (
    <Document title={`${obra.nombre} — avance`} author={EMPRESA}>
      <Page size="A4" orientation="landscape" style={s.pagina}>
        <View style={s.banda} fixed>
          <ImagenPdf src={{ data: logo, format: "png" }} style={s.logo} />
          <Text style={s.empresa}>{EMPRESA}</Text>
        </View>
        <Text style={s.titulo}>{obra.nombre}</Text>
        <Text style={s.sub}>Informe de avance al {formatoFecha(hoy)}</Text>
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

// Se lee de /public en tiempo de ejecución (next.config.ts lo incluye en la función de esta ruta).
const rutaLogo = () => path.join(process.cwd(), "public", LOGO.ruta);

export async function renderizarInformePdf(datos: DatosInforme): Promise<Buffer> {
  const logo = await readFile(rutaLogo());
  return renderToBuffer(<InformePdf {...datos} logo={logo} />);
}
