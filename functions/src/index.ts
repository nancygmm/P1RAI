import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {Request, Response} from "express";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {isAxiosError} from "axios";

import {buscarYEnriquecer, construirQuery, LIMITE_RESULTADOS} from "./places";
import {guardarLote, consultarDirectorio, FiltrosDirectorio} from "./firestore";

admin.initializeApp();
const db = admin.firestore();
const PLACES_API_KEY = defineSecret("PLACES_API_KEY");

/**
 * Parsea ALLOWED_IPS (CSV) en un array de IPs limpias.
 * @return {string[]} Lista de IPs autorizadas.
 */
function ipsAutorizadas(): string[] {
  const raw = process.env.ALLOWED_IPS ?? "";

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * @return {boolean} True si estamos en el emulador local.
 */
function esEmulador(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true";
}

/**
 * Extrae y normaliza la IP del request.
 * @param {Request} req Request de Express.
 * @return {string} IP normalizada o string vacío.
 */
function obtenerIP(req: Request): string {
  let ip = "";

  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    ip = forwarded.split(",")[0].trim();
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    ip = forwarded[0].trim();
  }

  if (!ip) {
    ip = req.ip || req.socket?.remoteAddress || "";
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  return ip;
}

/**
 * Valida si la IP del request está autorizada. Bypass en emulador.
 * @param {Request} req Request de Express.
 * @return {boolean} True si autorizada.
 */
function verificarIP(req: Request): boolean {
  if (esEmulador()) {
    logger.info("Emulador detectado: bypass de IP whitelist");
    return true;
  }

  const ip = obtenerIP(req);
  const permitidas = ipsAutorizadas();

  logger.info(`Request desde IP: ${ip}`);

  return permitidas.includes(ip);
}

/**
 * Si la IP no está autorizada, responde 403 y devuelve true.
 * @param {Request} req Request de Express.
 * @param {Response} res Response de Express.
 * @return {boolean} True si se bloqueó.
 */
function bloquearSiIPNoAutorizada(req: Request, res: Response): boolean {
  if (verificarIP(req)) return false;

  logger.warn(`Acceso denegado desde IP: ${obtenerIP(req)}`);

  res.status(403).json({
    error: "Forbidden",
    mensaje: "IP no autorizada para acceder a este recurso",
  });

  return true;
}

// ============================================
// Cloud Function: helloWorld (Semana 1)
// ============================================

export const helloWorld = onRequest((req: Request, res: Response) => {
  if (bloquearSiIPNoAutorizada(req, res)) return;

  logger.info("helloWorld ejecutado correctamente");

  res.status(200).json({
    mensaje: "Hello from Firebase Functions v2!",
    proyecto: "P1 RAI - Directorio de Médicos",
    fecha: new Date().toISOString(),
  });
});

// ============================================
// Cloud Function: recolectar (Semana 2)
// ============================================

export const recolectar = onRequest(
  {secrets: [PLACES_API_KEY]},
  async (req: Request, res: Response) => {
    if (bloquearSiIPNoAutorizada(req, res)) return;

    if (req.method !== "POST") {
      res.status(405).json({
        error: "Method Not Allowed",
        metodo: req.method,
      });

      return;
    }

    const body = (req.body ?? {}) as {
      keyword?: unknown;
      zona?: unknown;
      especialidad?: unknown;
    };

    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    const zona = typeof body.zona === "string" ? body.zona.trim() : "";

    const especialidad =
      typeof body.especialidad === "string" && body.especialidad.trim() ?
        body.especialidad.trim() :
        keyword;

    if (!keyword || !zona) {
      res.status(400).json({
        error: "Bad Request",
        mensaje: "Se requieren los campos 'keyword' y 'zona' en el body",
      });

      return;
    }

    const apiKey = PLACES_API_KEY.value() || process.env.PLACES_API_KEY || "";

    if (!apiKey) {
      logger.error("PLACES_API_KEY no configurado");

      res.status(500).json({
        error: "Server Misconfigured",
        mensaje: "API key de Google Places no configurada",
      });

      return;
    }

    const query = construirQuery(keyword, zona);

    logger.info(`Places Text Search: "${query}"`);

    try {
      const resultados = (await buscarYEnriquecer(query, apiKey)).slice(
        0,
        LIMITE_RESULTADOS,
      );

      if (resultados.length === 0) {
        res.status(200).json({
          keyword_usado: query,
          total: 0,
          insertados: 0,
          actualizados: 0,
          resultados: [],
        });

        return;
      }

      const {insertados, actualizados} = await guardarLote(
        db,
        resultados,
        especialidad,
        zona,
        query,
      );

      res.status(200).json({
        keyword_usado: query,
        total: resultados.length,
        insertados,
        actualizados,
        resultados,
      });
    } catch (err) {
      const esAxios = isAxiosError(err);

      const status =
        esAxios && err.response?.status ?
          err.response.status :
          500;

      const detalle =
        esAxios ?
          err.response?.data ?? err.message :
          String(err);

      logger.error("Error en recolección", detalle);

      const httpStatus =
        status >= 400 && status < 600 ?
          status :
          500;

      res.status(httpStatus).json({
        error: "Upstream Error",
        mensaje: "Falló la recolección",
        detalle,
      });
    }
  },
);

// ============================================
// Cloud Function: directorio (Semana 3)
// ============================================

export const directorio = onRequest(
  async (req: Request, res: Response) => {
    if (bloquearSiIPNoAutorizada(req, res)) return;

    if (req.method !== "GET") {
      res.status(405).json({
        error: "Method Not Allowed",
        mensaje: "El directorio solamente acepta solicitudes GET",
        metodo: req.method,
      });

      return;
    }

    let page = 1;
    let pageSize = 10;
    let especialidad = "";
    let zona = "";

    if (typeof req.query.page === "string") {
      const valorPage = Number(req.query.page);

      if (Number.isInteger(valorPage) && valorPage > 0) {
        page = valorPage;
      }
    }

    if (typeof req.query.pageSize === "string") {
      const valorPageSize = Number(req.query.pageSize);

      if (Number.isInteger(valorPageSize) && valorPageSize > 0) {
        pageSize = valorPageSize;
      }
    }

    if (pageSize > 50) {
      pageSize = 50;
    }

    if (typeof req.query.especialidad === "string") {
      especialidad = req.query.especialidad.trim();
    }

    if (typeof req.query.zona === "string") {
      zona = req.query.zona.trim();
    }

    const filtros: FiltrosDirectorio = {
      page,
      pageSize,
      especialidad,
      zona,
    };

    logger.info("Consulta GET /directorio", filtros);

    try {
      const resultado = await consultarDirectorio(db, filtros);

      const resultados = resultado.resultados.map((medico) => {
        return {
          nombre: medico.nombre,
          especialidad: medico.especialidad,
          direccion: medico.direccion,
          telefono: medico.telefono,
          sitio_web: medico.sitio_web,
          zona: medico.zona,
          place_id: medico.place_id,
          fecha_recoleccion: medico.fecha_recoleccion.toDate().toISOString(),
          keyword_usado: medico.keyword_usado,
        };
      });

      res.status(200).json({
        page,
        pageSize,
        cantidad: resultado.cantidad,
        haySiguiente: resultado.haySiguiente,

        filtros: {
          especialidad,
          zona,
        },

        resultados,
      });
    } catch (err) {
      logger.error("Error consultando directorio", err);

      res.status(500).json({
        error: "Internal Server Error",
        mensaje: "No fue posible consultar el directorio",
        detalle: String(err),
      });
    }
  },
);
