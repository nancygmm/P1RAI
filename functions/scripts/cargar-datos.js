const admin = require("firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "p1ain-a2015";

admin.initializeApp({
    projectId: "p1ain-a2015",
});

const db = admin.firestore();

const medicos = [
    {
        nombre: "Clínica Cardiológica Central",
        especialidad: "Cardiología",
        direccion: "6a Avenida 8-40, Zona 10, Ciudad de Guatemala",
        telefono: "+502 2201 1001",
        sitio_web: "https://ejemplo.com/cardio-central",
        zona: "10",
        place_id: "TEST_CARDIO_001",
        keyword_usado: "cardiólogo zona 10 Guatemala",
    },
    {
        nombre: "Centro Cardiovascular del Valle",
        especialidad: "Cardiología",
        direccion: "12 Calle 3-25, Zona 10, Ciudad de Guatemala",
        telefono: "+502 2201 1002",
        sitio_web: "",
        zona: "10",
        place_id: "TEST_CARDIO_002",
        keyword_usado: "cardiólogo zona 10 Guatemala",
    },
    {
        nombre: "Cardiología Integral Guatemala",
        especialidad: "Cardiología",
        direccion: "4a Avenida 15-20, Zona 10, Ciudad de Guatemala",
        telefono: "+502 2201 1003",
        sitio_web: "https://ejemplo.com/cardiologia-integral",
        zona: "10",
        place_id: "TEST_CARDIO_003",
        keyword_usado: "cardiólogo zona 10 Guatemala",
    },
    {
        nombre: "Clínica Pediátrica Los Álamos",
        especialidad: "Pediatría",
        direccion: "7a Avenida 4-18, Zona 9, Ciudad de Guatemala",
        telefono: "+502 2202 2001",
        sitio_web: "https://ejemplo.com/pediatria-alamos",
        zona: "9",
        place_id: "TEST_PED_001",
        keyword_usado: "pediatra zona 9 Guatemala",
    },
    {
        nombre: "Centro Pediátrico Infantil",
        especialidad: "Pediatría",
        direccion: "5a Calle 10-22, Zona 9, Ciudad de Guatemala",
        telefono: "+502 2202 2002",
        sitio_web: "",
        zona: "9",
        place_id: "TEST_PED_002",
        keyword_usado: "pediatra zona 9 Guatemala",
    },
    {
        nombre: "Clínica Dermatológica Moderna",
        especialidad: "Dermatología",
        direccion: "3a Avenida 12-55, Zona 14, Ciudad de Guatemala",
        telefono: "+502 2203 3001",
        sitio_web: "https://ejemplo.com/dermatologia-moderna",
        zona: "14",
        place_id: "TEST_DERMA_001",
        keyword_usado: "dermatólogo zona 14 Guatemala",
    },
    {
        nombre: "Instituto de Dermatología Guatemala",
        especialidad: "Dermatología",
        direccion: "10 Calle 6-70, Zona 14, Ciudad de Guatemala",
        telefono: "+502 2203 3002",
        sitio_web: "",
        zona: "14",
        place_id: "TEST_DERMA_002",
        keyword_usado: "dermatólogo zona 14 Guatemala",
    },
    {
        nombre: "Centro Neurológico Metropolitano",
        especialidad: "Neurología",
        direccion: "2a Avenida 7-30, Zona 1, Ciudad de Guatemala",
        telefono: "+502 2204 4001",
        sitio_web: "https://ejemplo.com/neurologia-metropolitana",
        zona: "1",
        place_id: "TEST_NEURO_001",
        keyword_usado: "neurólogo zona 1 Guatemala",
    },
    {
        nombre: "Clínica de Neurología Avanzada",
        especialidad: "Neurología",
        direccion: "8a Calle 9-15, Zona 1, Ciudad de Guatemala",
        telefono: "+502 2204 4002",
        sitio_web: "",
        zona: "1",
        place_id: "TEST_NEURO_002",
        keyword_usado: "neurólogo zona 1 Guatemala",
    },
    {
        nombre: "Centro de Medicina Interna",
        especialidad: "Medicina Interna",
        direccion: "13 Calle 2-45, Zona 10, Ciudad de Guatemala",
        telefono: "+502 2205 5001",
        sitio_web: "https://ejemplo.com/medicina-interna",
        zona: "10",
        place_id: "TEST_INTERNA_001",
        keyword_usado: "medicina interna zona 10 Guatemala",
    },
];

async function cargarDatos() {
    console.log("========================================");
    console.log("CARGA DE DATOS DE PRUEBA");
    console.log("========================================");
    console.log("");

    console.log("Firestore Emulator: 127.0.0.1:8080");
    console.log("Proyecto: p1ain-a2015");
    console.log("");

    let insertados = 0;
    let actualizados = 0;

    for (let i = 0; i < medicos.length; i++) {
        const medico = medicos[i];

        const referencia = db.collection("medicos").doc(medico.place_id);
        const documentoActual = await referencia.get();

        if (documentoActual.exists) {
            actualizados = actualizados + 1;
            console.log("Actualizando: " + medico.nombre);
        } else {
            insertados = insertados + 1;
            console.log("Insertando: " + medico.nombre);
        }

        await referencia.set({
            nombre: medico.nombre,
            especialidad: medico.especialidad,
            direccion: medico.direccion,
            telefono: medico.telefono,
            sitio_web: medico.sitio_web,
            zona: medico.zona,
            place_id: medico.place_id,
            fecha_recoleccion: admin.firestore.Timestamp.now(),
            keyword_usado: medico.keyword_usado,
        }, {
            merge: true,
        });
    }

    console.log("");
    console.log("========================================");
    console.log("CARGA FINALIZADA");
    console.log("========================================");
    console.log("Insertados: " + String(insertados));
    console.log("Actualizados: " + String(actualizados));
    console.log("Total procesados: " + String(medicos.length));
}

cargarDatos()
    .then(() => {
        console.log("");
        console.log("Datos cargados correctamente.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("");
        console.error("Error al cargar datos:");
        console.error(error);
        process.exit(1);
    });