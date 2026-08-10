// ============================================
// Semana 2 - Matriz de keywords
// ============================================
// Ver docs/keywords.md para la justificación de esta lista.
// La matriz cruza 20 especialidades × 6 zonas × 2 patrones léxicos
// = 240 combinaciones. Cada combinación es una invocación de
// /recolectar (1 Text Search + hasta 20 Place Details).

// Nombre canónico que se guarda en Firestore como `especialidad`,
// independiente del patrón léxico con que se haya buscado. Esto
// evita que un mismo lugar aparezca con "Cardiología" o
// "Cardiólogo" según qué keyword lo devolvió primero.
export interface Especialidad {
  canonica: string;
  practicante: string; // ej. "cardiólogo"
  adjetiva: string; // ej. "clínica cardiológica"
}

export const ESPECIALIDADES: Especialidad[] = [
  {canonica: "Cardiología", practicante: "cardiólogo",
    adjetiva: "clínica cardiológica"},
  {canonica: "Pediatría", practicante: "pediatra",
    adjetiva: "clínica pediátrica"},
  {canonica: "Ginecología", practicante: "ginecólogo",
    adjetiva: "clínica ginecológica"},
  {canonica: "Dermatología", practicante: "dermatólogo",
    adjetiva: "clínica dermatológica"},
  {canonica: "Traumatología", practicante: "traumatólogo",
    adjetiva: "clínica traumatológica"},
  {canonica: "Oftalmología", practicante: "oftalmólogo",
    adjetiva: "clínica oftalmológica"},
  {canonica: "Otorrinolaringología",
    practicante: "otorrinolaringólogo",
    adjetiva: "clínica otorrinolaringológica"},
  {canonica: "Neurología", practicante: "neurólogo",
    adjetiva: "clínica neurológica"},
  {canonica: "Psiquiatría", practicante: "psiquiatra",
    adjetiva: "clínica psiquiátrica"},
  {canonica: "Endocrinología", practicante: "endocrinólogo",
    adjetiva: "clínica endocrinológica"},
  {canonica: "Odontología", practicante: "dentista",
    adjetiva: "clínica dental"},
  {canonica: "Urología", practicante: "urólogo",
    adjetiva: "clínica urológica"},
  {canonica: "Gastroenterología", practicante: "gastroenterólogo",
    adjetiva: "clínica gastroenterológica"},
  {canonica: "Neumología", practicante: "neumólogo",
    adjetiva: "clínica neumológica"},
  {canonica: "Nefrología", practicante: "nefrólogo",
    adjetiva: "clínica nefrológica"},
  {canonica: "Hematología", practicante: "hematólogo",
    adjetiva: "clínica hematológica"},
  {canonica: "Oncología", practicante: "oncólogo",
    adjetiva: "clínica oncológica"},
  {canonica: "Reumatología", practicante: "reumatólogo",
    adjetiva: "clínica reumatológica"},
  {canonica: "Alergología", practicante: "alergólogo",
    adjetiva: "clínica de alergias"},
  {canonica: "Medicina Interna", practicante: "internista",
    adjetiva: "clínica de medicina interna"},
];

export const ZONAS: string[] = ["1", "9", "10", "14", "15", "16"];

export interface Combo {
  keyword: string;
  zona: string;
  especialidadCanonica: string;
}

/**
 * Genera la matriz completa de combinaciones a recolectar.
 * @return {Combo[]} 240 combos (20 esp × 6 zonas × 2 patrones).
 */
export function generarMatriz(): Combo[] {
  const combos: Combo[] = [];
  for (const esp of ESPECIALIDADES) {
    for (const zona of ZONAS) {
      combos.push({
        keyword: esp.practicante,
        zona,
        especialidadCanonica: esp.canonica,
      });
      combos.push({
        keyword: esp.adjetiva,
        zona,
        especialidadCanonica: esp.canonica,
      });
    }
  }
  return combos;
}
