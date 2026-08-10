// ============================================
// Runner: itera la matriz de keywords contra /recolectar
// ============================================
// Uso local (emulador):
//   MAX=3 npm run recolectar
// Uso completo:
//   npm run recolectar
// Contra producción:
//   ENDPOINT=https://us-central1-p1raigabyfb.cloudfunctions.net/recolectar \
//     npm run recolectar
//
// Cada invocación golpea /recolectar, que a su vez consume Places API.
// Costo real por combo ≈ 1 Text Search + hasta 20 Details ≈ $0.37.
// Con MAX=3 el smoke test cuesta ~$1.

import {generarMatriz} from "../src/keywords";

const ENDPOINT =
  process.env.ENDPOINT ??
  "http://127.0.0.1:5001/p1raigabyfb/us-central1/recolectar";

const MAX_ENV = process.env.MAX ? Number(process.env.MAX) : undefined;
const DELAY_MS = process.env.DELAY_MS ?
  Number(process.env.DELAY_MS) :
  1500;

interface RecolectarResponse {
  keyword_usado?: string;
  total?: number;
  insertados?: number;
  actualizados?: number;
  error?: string;
  mensaje?: string;
}

/**
 * Duerme el proceso N milisegundos.
 * @param {number} ms Milisegundos a dormir.
 * @return {Promise<void>} Se resuelve cuando termina el timeout.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const todos = generarMatriz();
  const combos = MAX_ENV ? todos.slice(0, MAX_ENV) : todos;

  console.log(`Endpoint : ${ENDPOINT}`);
  console.log(`Combos   : ${combos.length} de ${todos.length}`);
  console.log(`Delay    : ${DELAY_MS} ms`);
  console.log("---");

  let ok = 0;
  let err = 0;
  let escritos = 0;

  for (let i = 0; i < combos.length; i++) {
    const c = combos[i];
    const etiqueta =
      `[${i + 1}/${combos.length}] ${c.keyword} zona ${c.zona}`;
    try {
      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          keyword: c.keyword,
          zona: c.zona,
          especialidad: c.especialidadCanonica,
        }),
      });
      const data = (await resp.json()) as RecolectarResponse;

      if (!resp.ok) {
        err++;
        console.log(
          `${etiqueta} ✗ HTTP ${resp.status}: ${data.error ?? "?"}`,
        );
      } else {
        ok++;
        escritos += data.total ?? 0;
        console.log(
          `${etiqueta} ✓ total=${data.total} ` +
            `nuevos=${data.insertados} upd=${data.actualizados}`,
        );
      }
    } catch (e) {
      err++;
      console.log(`${etiqueta} ✗ ${(e as Error).message}`);
    }
    if (i < combos.length - 1) await sleep(DELAY_MS);
  }

  console.log("---");
  console.log(
    `OK: ${ok}   ERR: ${err}   Total documentos escritos: ${escritos}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
