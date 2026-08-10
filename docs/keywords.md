# Estrategia de keywords — Semana 2

Proyecto: Directorio de Médicos Especialistas — Ciudad de Guatemala.
Fuente de datos: Google Places API (legacy) — Text Search + Place Details.

## Convención de query

`recolectar` construye la query textual así:

```
{keyword} zona {zona} Guatemala
```

Ejemplos: `cardiólogo zona 10 Guatemala`, `clínica pediátrica zona 1 Guatemala`.

Parámetros adicionales enviados a Places API:

- `language: "es"`
- `region: "gt"`
- Cortamos a **20 resultados** por invocación (spec del proyecto).

## Doble forma léxica por especialidad

Google Maps clasifica los establecimientos con nomenclatura inconsistente:
algunos aparecen listados por el nombre del médico (p. ej. "Dr. Juan Pérez -
cardiólogo"), otros por el nombre de la clínica (p. ej. "Clínica Cardiológica
Guatemala"). Para no perder cobertura buscamos **dos patrones por
especialidad**:

- **Practicante** (sustantivo profesional): `cardiólogo`, `pediatra`, `dentista`.
- **Adjetiva / clínica**: `clínica cardiológica`, `clínica pediátrica`,
  `clínica dental`.

Un mismo lugar puede caer en ambas búsquedas. El dedup por `place_id`
(ver sección "Deduplicación") garantiza una sola entrada por lugar.

## Normalización canónica

En Firestore el campo `especialidad` guarda **siempre el nombre canónico**,
no el keyword usado. Por ejemplo, tanto `cardiólogo zona 10 Guatemala` como
`clínica cardiológica zona 10 Guatemala` producen documentos con
`especialidad: "Cardiología"`. Esto permite que la API paginada de Semana 3
filtre por especialidad sin tener que mapear variantes léxicas en cada query.

El `keyword_usado` (query textual completa) se guarda aparte como auditoría.

## Matriz de recolección

Producto cartesiano: **20 especialidades × 6 zonas × 2 patrones = 240 combos**.
Cada combo = 1 invocación de `POST /recolectar`.

### Especialidades y patrones

| Canónica (Firestore) | Patrón practicante | Patrón adjetivo |
| --- | --- | --- |
| Cardiología | cardiólogo | clínica cardiológica |
| Pediatría | pediatra | clínica pediátrica |
| Ginecología | ginecólogo | clínica ginecológica |
| Dermatología | dermatólogo | clínica dermatológica |
| Traumatología | traumatólogo | clínica traumatológica |
| Oftalmología | oftalmólogo | clínica oftalmológica |
| Otorrinolaringología | otorrinolaringólogo | clínica otorrinolaringológica |
| Neurología | neurólogo | clínica neurológica |
| Psiquiatría | psiquiatra | clínica psiquiátrica |
| Endocrinología | endocrinólogo | clínica endocrinológica |
| Odontología | dentista | clínica dental |
| Urología | urólogo | clínica urológica |
| Gastroenterología | gastroenterólogo | clínica gastroenterológica |
| Neumología | neumólogo | clínica neumológica |
| Nefrología | nefrólogo | clínica nefrológica |
| Hematología | hematólogo | clínica hematológica |
| Oncología | oncólogo | clínica oncológica |
| Reumatología | reumatólogo | clínica reumatológica |
| Alergología | alergólogo | clínica de alergias |
| Medicina Interna | internista | clínica de medicina interna |

### Zonas

Ciudad de Guatemala: **1, 9, 10, 14, 15, 16**. Concentran la mayoría de
servicios médicos privados y hospitales generales.

## Deduplicación

- ID estable: `place_id` de Google.
- Colección Firestore: **`medicos`**.
- Doc ID = `place_id` con `set(..., {merge: true})`.
- Consecuencias:
  - Re-recolectar la misma combinación **actualiza**, no duplica.
  - Un mismo lugar recolectado por `cardiólogo zona 10` y por
    `clínica cardiológica zona 10` queda en **una sola entrada**, con
    el `keyword_usado` de la última recolección que lo tocó y con
    `especialidad: "Cardiología"` (canónica).

## Costo estimado

Places API legacy:
- Text Search: ~$0.032 por request.
- Place Details con `formatted_phone_number` + `international_phone_number`
  + `website`: ~$0.017 por request.

Por combo (1 Text Search + hasta 20 Details): **~$0.37**.

| Escenario | Combos | Requests aprox. | Costo aprox. |
|---|---|---|---|
| Matriz completa | 240 | ~5040 | **~$88** |
| Solo patrón practicante | 120 | ~2520 | ~$44 |
| Smoke test (`MAX=3`) | 3 | ~63 | **~$1.1** |

Con cuota diaria de 500 requests/día:
- Smoke test entra sin problema.
- Matriz completa: dividir en ~11 días o subir la cuota.

## Honestidad de datos (postura ética)

- **No se infieren campos.** Si Places no devuelve `website`, `sitio_web`
  queda `""`. Igual para teléfono.
- **Sitio web puede apuntar a redes sociales o a la clínica.** Places no
  distingue; guardamos lo que la API devuelve tal cual.
- **`especialidad` es etiqueta del equipo, no dato de Places.** Places no
  garantiza que el establecimiento realmente ejerza esa especialidad; el
  campo refleja bajo qué categoría del catálogo canónico apareció.
- **`fecha_recoleccion`** en cada documento (Timestamp Firestore) para
  auditar cuándo se capturó el snapshot.
- **El directorio es referencia, no validación médica.** La API no
  verifica credenciales profesionales.
