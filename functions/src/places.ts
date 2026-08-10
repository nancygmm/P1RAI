import axios from "axios";
import * as logger from "firebase-functions/logger";

// ============================================
// Semana 2 - Cliente Places API (legacy)
// ============================================
// Text Search legacy no devuelve teléfono ni website: hay que
// hacer un Place Details por cada resultado para conseguirlos.
// Costo por invocación ≈ 1 Text Search (~$0.032) + N Place
// Details (~$0.017 c/u).

const PLACES_TEXTSEARCH_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";
const PLACES_DETAILS_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/details/json";

// Solo los campos que necesitamos para cumplir el schema del PDF.
// Menos campos = menos costo por Details request.
const DETAILS_FIELDS = [
  "formatted_phone_number",
  "international_phone_number",
  "website",
].join(",");

export const LIMITE_RESULTADOS = 20;

interface TextSearchItem {
  place_id: string;
  name?: string;
  formatted_address?: string;
}

interface TextSearchResponse {
  status: string;
  results?: TextSearchItem[];
  error_message?: string;
}

interface DetailsResult {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
}

interface DetailsResponse {
  status: string;
  result?: DetailsResult;
  error_message?: string;
}

export interface PlaceEnriquecido {
  place_id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  sitio_web: string;
}

/**
 * Construye la query textual: "{keyword} zona {zona} Guatemala".
 * @param {string} keyword Término base (ej. "cardiólogo").
 * @param {string} zona Número de zona en Ciudad de Guatemala.
 * @return {string} Query lista para Places Text Search.
 */
export function construirQuery(keyword: string, zona: string): string {
  const zonaLimpia = zona.trim();
  const kw = keyword.trim();
  if (!zonaLimpia) return `${kw} Guatemala`;
  return `${kw} zona ${zonaLimpia} Guatemala`;
}

/**
 * Llama a Places Text Search (legacy). Corta a LIMITE_RESULTADOS.
 * @param {string} query Query textual.
 * @param {string} apiKey API key de Google Places.
 * @return {Promise<TextSearchItem[]>} Resultados crudos.
 */
async function llamarTextSearch(
  query: string,
  apiKey: string,
): Promise<TextSearchItem[]> {
  const resp = await axios.get<TextSearchResponse>(
    PLACES_TEXTSEARCH_ENDPOINT,
    {
      params: {
        query,
        language: "es",
        region: "gt",
        key: apiKey,
      },
      timeout: 15000,
    },
  );

  const status = resp.data.status;
  if (status !== "OK" && status !== "ZERO_RESULTS") {
    throw new Error(
      `Places TextSearch status=${status}: ${resp.data.error_message ?? ""}`,
    );
  }
  return (resp.data.results ?? []).slice(0, LIMITE_RESULTADOS);
}

/**
 * Llama a Place Details (legacy) para un place_id.
 * @param {string} placeId Identificador estable de Google.
 * @param {string} apiKey API key de Google Places.
 * @return {Promise<DetailsResult>} Detalles (posiblemente vacíos).
 */
async function obtenerDetalles(
  placeId: string,
  apiKey: string,
): Promise<DetailsResult> {
  const resp = await axios.get<DetailsResponse>(PLACES_DETAILS_ENDPOINT, {
    params: {
      place_id: placeId,
      fields: DETAILS_FIELDS,
      language: "es",
      key: apiKey,
    },
    timeout: 15000,
  });

  const status = resp.data.status;
  if (status !== "OK") {
    logger.warn(
      `Place Details status=${status} para ${placeId}: ` +
        (resp.data.error_message ?? ""),
    );
    return {};
  }
  return resp.data.result ?? {};
}

/**
 * Combina Text Search + Details en registros normalizados.
 * @param {string} query Query construida.
 * @param {string} apiKey API key.
 * @return {Promise<PlaceEnriquecido[]>} Lista lista para persistir.
 */
export async function buscarYEnriquecer(
  query: string,
  apiKey: string,
): Promise<PlaceEnriquecido[]> {
  const base = await llamarTextSearch(query, apiKey);
  const enriquecidos = await Promise.all(
    base.map(async (item) => {
      const det = await obtenerDetalles(item.place_id, apiKey);
      return {
        place_id: item.place_id,
        nombre: item.name ?? "",
        direccion: item.formatted_address ?? "",
        telefono:
          det.international_phone_number ??
          det.formatted_phone_number ??
          "",
        sitio_web: det.website ?? "",
      };
    }),
  );
  return enriquecidos;
}
