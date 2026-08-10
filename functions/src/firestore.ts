import {Firestore, Timestamp, Query, DocumentData} from "firebase-admin/firestore";
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

// ============================================
// Semana 3 - Interfaces para directorio
// ============================================

export interface FiltrosDirectorio {
  page: number;
  pageSize: number;
  especialidad: string;
  zona: string;
}

export interface ResultadoDirectorio {
  resultados: DocMedico[];
  cantidad: number;
  haySiguiente: boolean;
}

/**
 * Persiste un lote con merge:true para no duplicar.
 * @param {Firestore} db Firestore admin.
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

// ============================================
// Semana 3 - Consulta del directorio
// ============================================

/**
 * Consulta la colección medicos con filtros y paginación.
 * @param {Firestore} db Firestore admin.
 * @param {FiltrosDirectorio} filtros Filtros recibidos por la API.
 * @return {Promise<ResultadoDirectorio>} Página de resultados.
 */
export async function consultarDirectorio(
  db: Firestore,
  filtros: FiltrosDirectorio,
): Promise<ResultadoDirectorio> {
  const coleccion = db.collection(COLECCION);
  let consulta: Query<DocumentData> = coleccion;

  if (filtros.especialidad !== "") {
    consulta = consulta.where("especialidad", "==", filtros.especialidad);
  }

  if (filtros.zona !== "") {
    consulta = consulta.where("zona", "==", filtros.zona);
  }

  const desplazamiento = (filtros.page - 1) * filtros.pageSize;
  const cantidadSolicitada = desplazamiento + filtros.pageSize + 1;

  consulta = consulta.limit(cantidadSolicitada);

  const snapshot = await consulta.get();
  const documentos: DocMedico[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    const medico: DocMedico = {
      nombre: typeof data.nombre === "string" ? data.nombre : "",
      especialidad: typeof data.especialidad === "string" ? data.especialidad : "",
      direccion: typeof data.direccion === "string" ? data.direccion : "",
      telefono: typeof data.telefono === "string" ? data.telefono : "",
      sitio_web: typeof data.sitio_web === "string" ? data.sitio_web : "",
      zona: typeof data.zona === "string" ? data.zona : "",
      place_id: typeof data.place_id === "string" ? data.place_id : doc.id,
      fecha_recoleccion: data.fecha_recoleccion instanceof Timestamp ? data.fecha_recoleccion : Timestamp.now(),
      keyword_usado: typeof data.keyword_usado === "string" ? data.keyword_usado : "",
    };

    documentos.push(medico);
  });

  const inicio = desplazamiento;
  const fin = desplazamiento + filtros.pageSize;
  const resultadosPagina = documentos.slice(inicio, fin);
  const haySiguiente = documentos.length > fin;

  return {
    resultados: resultadosPagina,
    cantidad: resultadosPagina.length,
    haySiguiente,
  };
}
