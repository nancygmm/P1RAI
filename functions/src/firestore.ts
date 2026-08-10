import {Firestore, Timestamp} from "firebase-admin/firestore";
import {PlaceEnriquecido} from "./places";

// ============================================
// Semana 2 - Capa de persistencia (Firestore)
// ============================================
// Colección `medicos` (nombre acordado con el equipo).
// place_id se usa como doc ID para dedup natural.

export const COLECCION = "medicos";

export interface DocMedico {
  nombre: string;
  especialidad: string;
  direccion: string;
  telefono: string;
  sitio_web: string;
  zona: string;
  place_id: string;
  fecha_recoleccion: Timestamp;
  keyword_usado: string;
}

export interface ConteoEscritura {
  insertados: number;
  actualizados: number;
}

/**
 * Persiste un lote con merge:true para no duplicar.
 * @param {admin.firestore.Firestore} db Firestore admin.
 * @param {PlaceEnriquecido[]} resultados Registros normalizados.
 * @param {string} especialidad Nombre canónico (ver keywords.ts).
 * @param {string} zona Zona guardada tal cual.
 * @param {string} keywordUsado Query textual, guardada como auditoría.
 * @return {Promise<ConteoEscritura>} Conteos insertados/actualizados.
 */
export async function guardarLote(
  db: Firestore,
  resultados: PlaceEnriquecido[],
  especialidad: string,
  zona: string,
  keywordUsado: string,
): Promise<ConteoEscritura> {
  const coleccion = db.collection(COLECCION);
  const ahora = Timestamp.now();

  let insertados = 0;
  let actualizados = 0;

  const batch = db.batch();
  for (const p of resultados) {
    if (!p.place_id) continue;
    const ref = coleccion.doc(p.place_id);
    const snap = await ref.get();
    if (snap.exists) actualizados++;
    else insertados++;

    const doc: DocMedico = {
      nombre: p.nombre,
      especialidad,
      direccion: p.direccion,
      telefono: p.telefono,
      sitio_web: p.sitio_web,
      zona,
      place_id: p.place_id,
      fecha_recoleccion: ahora,
      keyword_usado: keywordUsado,
    };
    batch.set(ref, doc, {merge: true});
  }
  await batch.commit();
  return {insertados, actualizados};
}
