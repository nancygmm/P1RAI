import {onRequest} from "firebase-functions/v2/https";
import {Request, Response} from "express";
import * as logger from "firebase-functions/logger";

// ============================================
// IP Whitelist Middleware
// ============================================
// Lista de IPs autorizadas para invocar las funciones en producción.
// Agregar aquí las IPs públicas de cada integrante del equipo.
const IPS_AUTORIZADAS: string[] = [
  "2800:98:111d:661:58b4:e:df52:27ac",
  "186.151.92.245",
];

/**
 * Detecta si estamos corriendo en el emulador local.
 * Firebase setea FUNCTIONS_EMULATOR=true al usar el emulador.
 * @return {boolean} True si es emulador, false en producción.
 */
function esEmulador(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true";
}

/**
 * Extrae y normaliza la IP del request.
 * En producción, la IP real viene en x-forwarded-for (Cloud Run la inyecta).
 * En el emulador local, esa información no está disponible por diseño.
 * Normalizamos IPv4-mapped IPv6 (::ffff:127.0.0.1 -> 127.0.0.1).
 * @param {Request} req Request de Express.
 * @return {string} IP normalizada o string vacío si no se pudo extraer.
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
 * Middleware que valida si la IP del request está autorizada.
 * En el emulador local, hace bypass del check por limitación técnica
 * (el emulador de Functions v2 no propaga headers de red del cliente).
 * En producción, valida contra IPS_AUTORIZADAS.
 * @param {Request} req Request de Express.
 * @return {boolean} True si la IP está autorizada, false en caso contrario.
 */
function verificarIP(req: Request): boolean {
  if (esEmulador()) {
    logger.info("Emulador detectado: bypass de IP whitelist");
    return true;
  }

  const ip = obtenerIP(req);
  logger.info(`Request desde IP: ${ip}`);
  return IPS_AUTORIZADAS.includes(ip);
}

// ============================================
// Cloud Function: hello
// ============================================
export const hello = onRequest((req: Request, res: Response) => {
  if (!verificarIP(req)) {
    logger.warn(`Acceso denegado desde IP: ${obtenerIP(req)}`);
    res.status(403).json({
      error: "Forbidden",
      mensaje: "IP no autorizada para acceder a este recurso",
    });
    return;
  }

  logger.info("Hello world ejecutado correctamente");
  res.status(200).json({
    mensaje: "Hello from Firebase Functions v2!",
    proyecto: "P1 RAI - Directorio de Médicos",
    fecha: new Date().toISOString(),
  });
});
