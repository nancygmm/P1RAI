let paginaActual = 1;

let existePaginaSiguiente = false;


// ============================================
// Elementos HTML
// ============================================

const inputEspecialidad =
    document.getElementById(
        "especialidad",
    );


const inputZona =
    document.getElementById(
        "zona",
    );


const selectPageSize =
    document.getElementById(
        "pageSize",
    );


const btnBuscar =
    document.getElementById(
        "btnBuscar",
    );


const btnLimpiar =
    document.getElementById(
        "btnLimpiar",
    );


const btnAnterior =
    document.getElementById(
        "btnAnterior",
    );


const btnSiguiente =
    document.getElementById(
        "btnSiguiente",
    );


const tablaResultados =
    document.getElementById(
        "tablaResultados",
    );


const mensajeEstado =
    document.getElementById(
        "mensajeEstado",
    );


const textoPagina =
    document.getElementById(
        "textoPagina",
    );


// ============================================
// Construir URL
// ============================================

function construirURL() {

    const especialidad =
        inputEspecialidad
            .value
            .trim();


    const zona =
        inputZona
            .value
            .trim();


    const pageSize =
        selectPageSize
            .value;


    const parametros =
        new URLSearchParams();


    parametros.set(
        "page",
        String(paginaActual),
    );


    parametros.set(
        "pageSize",
        pageSize,
    );


    if (
        especialidad !== ""
    ) {

        parametros.set(
            "especialidad",
            especialidad,
        );

    }


    if (
        zona !== ""
    ) {

        parametros.set(
            "zona",
            zona,
        );

    }


    const url =
        "/directorio?" +
        parametros.toString();


    return url;

}


// ============================================
// Limpiar tabla
// ============================================

function limpiarTabla() {

    tablaResultados.innerHTML =
        "";

}


// ============================================
// Crear celda
// ============================================

function crearCelda(
    texto,
) {

    const td =
        document.createElement(
            "td",
        );


    td.textContent =
        texto || "No disponible";


    return td;

}


// ============================================
// Mostrar médicos
// ============================================

function mostrarResultados(
    resultados,
) {

    limpiarTabla();


    if (
        resultados.length === 0
    ) {

        const fila =
            document.createElement(
                "tr",
            );


        const celda =
            document.createElement(
                "td",
            );


        celda.colSpan =
            6;


        celda.textContent =
            "No se encontraron resultados.";


        fila.appendChild(
            celda,
        );


        tablaResultados.appendChild(
            fila,
        );


        return;

    }


    for (
        let i = 0;
        i < resultados.length;
        i++
    ) {

        const medico =
            resultados[i];


        const fila =
            document.createElement(
                "tr",
            );


        // ============================================
        // Nombre
        // ============================================

        fila.appendChild(
            crearCelda(
                medico.nombre,
            ),
        );


        // ============================================
        // Especialidad
        // ============================================

        fila.appendChild(
            crearCelda(
                medico.especialidad,
            ),
        );


        // ============================================
        // Zona
        // ============================================

        fila.appendChild(
            crearCelda(
                medico.zona,
            ),
        );


        // ============================================
        // Dirección
        // ============================================

        fila.appendChild(
            crearCelda(
                medico.direccion,
            ),
        );


        // ============================================
        // Teléfono
        // ============================================

        fila.appendChild(
            crearCelda(
                medico.telefono,
            ),
        );


        // ============================================
        // Sitio web
        // ============================================

        const celdaWeb =
            document.createElement(
                "td",
            );


        if (
            medico.sitio_web
        ) {

            const enlace =
                document.createElement(
                    "a",
                );


            enlace.href =
                medico.sitio_web;


            enlace.target =
                "_blank";


            enlace.rel =
                "noopener noreferrer";


            enlace.textContent =
                "Abrir sitio";


            celdaWeb.appendChild(
                enlace,
            );

        } else {

            celdaWeb.textContent =
                "No disponible";

        }


        fila.appendChild(
            celdaWeb,
        );


        tablaResultados.appendChild(
            fila,
        );

    }

}


// ============================================
// Actualizar botones
// ============================================

function actualizarPaginacion() {

    textoPagina.textContent =
        "Página " +
        String(
            paginaActual,
        );


    if (
        paginaActual > 1
    ) {

        btnAnterior.disabled =
            false;

    } else {

        btnAnterior.disabled =
            true;

    }


    if (
        existePaginaSiguiente === true
    ) {

        btnSiguiente.disabled =
            false;

    } else {

        btnSiguiente.disabled =
            true;

    }

}


// ============================================
// Consultar API
// ============================================

async function buscarMedicos() {

    mensajeEstado.textContent =
        "Consultando directorio...";


    btnBuscar.disabled =
        true;


    try {

        const url =
            construirURL();


        const respuesta =
            await fetch(
                url,
                {
                    method:
                        "GET",
                },
            );


        const data =
            await respuesta.json();


        if (
            respuesta.ok === false
        ) {

            let mensaje =
                "Ocurrió un error.";


            if (
                data &&
                data.mensaje
            ) {

                mensaje =
                    data.mensaje;

            }


            throw new Error(
                mensaje,
            );

        }


        // ============================================
        // Guardar estado paginación
        // ============================================

        existePaginaSiguiente =
            data.haySiguiente === true;


        // ============================================
        // Mostrar resultados
        // ============================================

        mostrarResultados(
            Array.isArray(
                data.resultados,
            ) ?
                data.resultados :
                [],
        );


        // ============================================
        // Estado
        // ============================================

        mensajeEstado.textContent =
            "Resultados encontrados en esta página: " +
            String(
                data.cantidad,
            );


        actualizarPaginacion();

    } catch (error) {

        console.error(
            error,
        );


        limpiarTabla();


        mensajeEstado.textContent =
            "Error al consultar el directorio: " +
            error.message;


        existePaginaSiguiente =
            false;


        actualizarPaginacion();

    } finally {

        btnBuscar.disabled =
            false;

    }

}


// ============================================
// Buscar
// ============================================

btnBuscar.addEventListener(
    "click",
    function () {

        paginaActual =
            1;


        buscarMedicos();

    },
);


// ============================================
// Anterior
// ============================================

btnAnterior.addEventListener(
    "click",
    function () {

        if (
            paginaActual > 1
        ) {

            paginaActual =
                paginaActual - 1;


            buscarMedicos();

        }

    },
);


// ============================================
// Siguiente
// ============================================

btnSiguiente.addEventListener(
    "click",
    function () {

        if (
            existePaginaSiguiente === true
        ) {

            paginaActual =
                paginaActual + 1;


            buscarMedicos();

        }

    },
);


// ============================================
// Limpiar
// ============================================

btnLimpiar.addEventListener(
    "click",
    function () {

        inputEspecialidad.value =
            "";


        inputZona.value =
            "";


        selectPageSize.value =
            "10";


        paginaActual =
            1;


        existePaginaSiguiente =
            false;


        limpiarTabla();


        mensajeEstado.textContent =
            "Filtros limpiados. Presiona Buscar para consultar.";


        actualizarPaginacion();

    },
);


// ============================================
// Buscar presionando Enter
// ============================================

inputEspecialidad.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            paginaActual =
                1;


            buscarMedicos();

        }

    },
);


inputZona.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            paginaActual =
                1;


            buscarMedicos();

        }

    },
);


// ============================================
// Estado inicial
// ============================================

actualizarPaginacion();