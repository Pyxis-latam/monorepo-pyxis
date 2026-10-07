import type { ClienteSupabase } from "./obra";

export type ReporteFeed = {
  id: string;
  cantidad: number;
  comentario: string | null;
  creado_en: string;
  anulado: boolean;
  fotoUrl: string | null;
  partida: { codigo: string; descripcion: string; unidad: string | null };
  autor: string;
};

export async function cargarFeed(
  supabase: ClienteSupabase,
  filtro: { obraId?: string; autorId?: string },
  limite = 50,
): Promise<ReporteFeed[]> {
  let consulta = supabase
    .from("reportes")
    .select(
      "id, cantidad, comentario, foto_path, creado_en, anulado, partida:partidas(codigo, descripcion, unidad), autor:perfiles!reportes_autor_fkey(nombre)",
    )
    .order("creado_en", { ascending: false })
    .limit(limite);
  if (filtro.obraId) consulta = consulta.eq("obra_id", filtro.obraId);
  if (filtro.autorId) consulta = consulta.eq("autor", filtro.autorId);
  const { data, error } = await consulta;
  if (error) throw error;

  const rutas = (data ?? []).map((r) => r.foto_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (rutas.length > 0) {
    const { data: firmadas } = await supabase.storage.from("fotos").createSignedUrls(rutas, 3600);
    (firmadas ?? []).forEach((f) => {
      if (f.path && f.signedUrl) urls.set(f.path, f.signedUrl);
    });
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    cantidad: Number(r.cantidad),
    comentario: r.comentario,
    creado_en: r.creado_en,
    anulado: r.anulado,
    fotoUrl: r.foto_path ? (urls.get(r.foto_path) ?? null) : null,
    partida: r.partida!,
    // Terreno no puede leer perfiles ajenos; en "Mis reportes" el autor es uno mismo.
    autor: r.autor?.nombre ?? "",
  }));
}
