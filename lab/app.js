// ==========================================
// TALLER AVANZADO: MEGA-EXTRACCIÓN Y PERFILADO
// ==========================================

// --- 1. FUNCIONES DE EXTRACCIÓN SÍNCRONAS Y ASÍNCRONAS ---

function obtenerWebGLInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'No disponible';
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Oculto';
    } catch (e) { return 'Error WebGL'; }
}

function obtenerCanvasFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200; canvas.height = 50;
        ctx.textBaseline = "top"; ctx.font = "14px 'Arial'";
        ctx.fillStyle = "#f60"; ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069"; ctx.fillText("Tracker!", 2, 15);
        return canvas.toDataURL().slice(-30);
    } catch (e) { return 'Error Canvas'; }
}

function obtenerAudioFingerprint() {
    try {
        const audioCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);
        const compressor = audioCtx.createDynamicsCompressor();
        oscillator.connect(compressor);
        compressor.connect(audioCtx.destination);
        oscillator.start(0);
        return `AudioContext_Canales:${audioCtx.destination.channelCount}`;
    } catch (e) { return 'Audio no soportado'; }
}

async function obtenerBateria() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            return {
                cargando: battery.charging,
                nivel: `${Math.round(battery.level * 100)}%`,
                tiempoParaCarga: battery.chargingTime,
                tiempoParaDescarga: battery.dischargingTime
            };
        } catch (e) { return 'Error Batería'; }
    }
    return 'No soportado';
}

async function obtenerPermisos() {
    const permisosAConsultar = ['geolocation', 'notifications', 'camera', 'microphone'];
    const resultados = {};
    for (const permiso of permisosAConsultar) {
        try {
            const status = await navigator.permissions.query({ name: permiso });
            resultados[permiso] = status.state; 
        } catch (e) { resultados[permiso] = 'No soportado/Denegado'; }
    }
    return resultados;
}

async function obtenerDispositivosMultimedia() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return 'No soportado';
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const conteo = { camaras: 0, microfonos: 0, altavoces: 0 };
        devices.forEach(d => {
            if (d.kind === 'videoinput') conteo.camaras++;
            if (d.kind === 'audioinput') conteo.microfonos++;
            if (d.kind === 'audiooutput') conteo.altavoces++;
        });
        return conteo;
    } catch (e) {
        return 'Requiere permisos explícitos previos';
    }
}

const obtenerGeolocalizacion = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve('No soportado');
    const timeout = setTimeout(() => resolve('Tiempo de espera agotado / Ignorado'), 5000);
    navigator.geolocation.getCurrentPosition(
        pos => {
            clearTimeout(timeout);
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, precision: pos.coords.accuracy });
        },
        err => {
            clearTimeout(timeout);
            resolve(`Denegado o Error: ${err.message}`);
        },
        { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
    );
});

// --- 2. ORQUESTADOR DE RECOPILACIÓN GLOBAL ---

async function extraerTodosLosDatos() {
    console.log("Iniciando extracción masiva de datos...");
    
    const datosBateria = await obtenerBateria();
    const datosPermisos = await obtenerPermisos();
    const datosMultimedia = await obtenerDispositivosMultimedia();
    const geolocalizacion = await obtenerGeolocalizacion();

    return {
        navegador: navigator.userAgent,
        idiomas: navigator.languages ? navigator.languages.join(', ') : navigator.language,
        plataforma: navigator.platform,
        zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
        modoOscuro: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'Sí' : 'No',
        doNotTrack: navigator.doNotTrack === "1" ? 'Activado' : 'Desactivado',
        nucleosCPU: navigator.hardwareConcurrency || 'N/A',
        memoriaRAM: navigator.deviceMemory ? `>= ${navigator.deviceMemory} GB` : 'N/A',
        resolucion: `${screen.width} × ${screen.height} (Profundidad: ${screen.colorDepth}-bit)`,
        pantallaTactil: navigator.maxTouchPoints > 0 ? `Sí (${navigator.maxTouchPoints} puntos)` : 'No',
        tarjetaGrafica: obtenerWebGLInfo(),
        bateria: datosBateria,
        dispositivos: datosMultimedia,
        tipoConexion: navigator.connection ? navigator.connection.effectiveType : 'N/A',
        velocidadBajada: navigator.connection && navigator.connection.downlink ? `${navigator.connection.downlink} Mbps` : 'N/A',
        latenciaRed: navigator.connection && navigator.connection.rtt ? `${navigator.connection.rtt} ms` : 'N/A',
        ahorroDatos: navigator.connection && navigator.connection.saveData ? 'Activado' : 'Desactivado',
        permisos: datosPermisos,
        ubicacionGPS: geolocalizacion,
        huellaCanvas: obtenerCanvasFingerprint(),
        huellaAudio: obtenerAudioFingerprint()
    };
}
// --- 4. EJECUCIÓN PRINCIPAL CON PROTECCIÓN DEL DOM ---

document.addEventListener("DOMContentLoaded", async () => {
    
    // --- 1. Crear contenedor para el INFORME NARRATIVO ---
    let containerInforme = document.getElementById('resultado-texto');
    if (!containerInforme) {
        containerInforme = document.createElement('pre');
        containerInforme.id = 'resultado-texto';
        document.body.appendChild(containerInforme);
    }
    containerInforme.style.backgroundColor = "#1e1e1e";
    containerInforme.style.color = "#00ff66";
    containerInforme.style.padding = "20px";
    containerInforme.style.borderRadius = "8px";
    containerInforme.style.fontFamily = "monospace";
    containerInforme.style.whiteSpace = "pre-wrap";
    containerInforme.style.margin = "20px";
    containerInforme.innerText = "⏳ Analizando huella digital y GPS...";

    // --- 2. Crear contenedor para el JSON (DATOS CRUDOS) ---
    let containerJSON = document.getElementById('datos-json');
    if (!containerJSON) {
        const tituloJSON = document.createElement('h3');
        tituloJSON.innerText = "Datos Expuestos por el Navegador (JSON):";
        tituloJSON.style.margin = "20px 20px 5px 20px";
        tituloJSON.style.fontFamily = "sans-serif";
        document.body.appendChild(tituloJSON);

        containerJSON = document.createElement('pre');
        containerJSON.id = 'datos-json';
        document.body.appendChild(containerJSON);
    }
    containerJSON.style.backgroundColor = "#2b2b2b";
    containerJSON.style.color = "#ffcc00"; // Color amarillo para el JSON
    containerJSON.style.padding = "20px";
    containerJSON.style.borderRadius = "8px";
    containerJSON.style.fontFamily = "monospace";
    containerJSON.style.whiteSpace = "pre-wrap";
    containerJSON.style.margin = "0 20px 20px 20px";
    containerJSON.style.overflowX = "auto";
    containerJSON.innerText = "Cargando objeto navigator...";

    // ----------------------------------------------------
    // PROCESAMIENTO DE DATOS
    // ----------------------------------------------------
    
    // 1. Extraer todo el objeto de datos
    const datos = await extraerTodosLosDatos();

    // 2. Analizar e inferir
    const prediccion = generarPerfilPredictivo(datos);

    // 3. Generar texto literario/predictivo
    const informeTexto = redactarInformeSherlock(prediccion, datos);
    
    // 4. MOSTRAR EN PANTALLA:

    // A) Imprimir el informe narrativo
    containerInforme.innerText = informeTexto;

    // B) IMPRIMIR EL JSON (Esta es la magia: JSON.stringify)
    // El 'null, 4' le dice que formatee el texto con 4 espacios de indentación para que se lea perfecto
    containerJSON.innerText = JSON.stringify(datos, null, 4);
});

// --- 3. MOTOR DE PREDICCIÓN Y REDACCIÓN NARRATIVA ---

function generarPerfilPredictivo(datos) {
    let prediccion = { perfil: "", ubicacion: "", dispositivo: "", economia: "", comportamiento: "" };

    const cpu = parseInt(datos.nucleosCPU) || 4;
    const gpu = (datos.tarjetaGrafica || "").toLowerCase();
    const ram = parseInt((datos.memoriaRAM || "").replace(/\D/g, '')) || 8;
    
    if (datos.pantallaTactil.includes("Sí") && (datos.plataforma.includes("arm") || datos.plataforma.includes("Android") || datos.plataforma.includes("iPhone"))) {
        prediccion.dispositivo = "Smartphone o Tablet";
    } else {
        prediccion.dispositivo = datos.bateria !== "No soportado" ? "Ordenador Portátil" : "Ordenador de Sobremesa (Desktop)";
    }

    if (gpu.includes('rtx') || gpu.includes('radeon rx') || gpu.includes('apple') || ram >= 16 || cpu >= 8) {
        prediccion.economia = "Media-Alta";
        prediccion.perfil = "Usuario avanzado (Gamer, Desarrollador, Creador de contenido o Profesional Tech).";
    } else if (cpu <= 4 && ram <= 4) {
        prediccion.economia = "Media-Baja o estándar";
        prediccion.perfil = "Usuario ofimático / Navegación casual (Hardware modesto o antiguo).";
    } else {
        prediccion.economia = "Media";
        prediccion.perfil = "Usuario general de internet.";
    }

    if (typeof datos.ubicacionGPS === 'object' && datos.ubicacionGPS.lat) {
        prediccion.ubicacion = `Coordenadas exactas (Lat: ${datos.ubicacionGPS.lat}, Lon: ${datos.ubicacionGPS.lon}).`;
    } else {
        prediccion.ubicacion = `Basado en la zona horaria (${datos.zonaHoraria}). Presuntamente en entorno hispanohablante/europeo/latino.`;
    }

    let contextoRed = "Conexión estable.";
    if (datos.tipoConexion === '4g' || datos.tipoConexion === '5g') {
        contextoRed = "Conectado vía datos móviles. Posiblemente en movimiento.";
    } else if (datos.tipoConexion === 'wifi' || parseInt(datos.velocidadBajada) > 5) {
        contextoRed = `Conexión de banda ancha estable (~${datos.velocidadBajada}).`;
    }

    let contextoBateria = "";
    if (datos.bateria && typeof datos.bateria === 'object') {
        if (datos.bateria.cargando && datos.bateria.nivel === '100%') {
            contextoBateria = "Equipo conectado a la corriente.";
        } else if (datos.bateria.cargando) {
            contextoBateria = `Cargando el dispositivo (${datos.bateria.nivel}).`;
        } else {
            contextoBateria = `Funcionando con batería al ${datos.bateria.nivel}.`;
        }
    }

    prediccion.comportamiento = `${contextoRed} ${contextoBateria}`;
    return prediccion;
}

function redactarInformeSherlock(prediccion, datosBrutos) {
    return `
🕵️‍♂️ INFORME DE INTELIGENCIA DE FUENTES ABIERTAS (OSINT / FINGERPRINTING)

📍 UBICACIÓN Y ENTORNO:
El objetivo parece encontrarse en: ${prediccion.ubicacion}
Su red reporta una latencia de ${datosBrutos.latenciaRed}, indicando: ${prediccion.comportamiento.split('.')[0]}.

💻 HARDWARE Y PODER ADQUISITIVO:
Se ha detectado un ${prediccion.dispositivo}. Cuenta con un procesador de ${datosBrutos.nucleosCPU} núcleos lógicos, ${datosBrutos.memoriaRAM} de RAM y una tarjeta gráfica de la familia "${datosBrutos.tarjetaGrafica.split(' ')[0] || 'Genérica'}". 
Esto sugiere un nivel adquisitivo de categoría ${prediccion.economia.toUpperCase()}, encajando perfectamente en el perfil de: ${prediccion.perfil}

🎭 PERFIL PSICOLÓGICO Y HÁBITOS:
En este momento, la persona: ${prediccion.comportamiento.substring(prediccion.comportamiento.indexOf('.') + 2)}
El modo oscuro está ${datosBrutos.modoOscuro === 'Sí' ? 'ACTIVADO' : 'DESACTIVADO'}.
Idiomas configurados: ${datosBrutos.idiomas}.

🔐 CONCIENCIA DE PRIVACIDAD:
"Do Not Track": ${datosBrutos.doNotTrack}. 
Geolocalización: ${datosBrutos.permisos.geolocation?.toUpperCase() || 'DESCONOCIDO'}.
`;
}

// --- 4. EJECUCIÓN PRINCIPAL CON PROTECCIÓN DEL DOM ---

// Asegurarnos de que el HTML ha cargado antes de intentar escribir en él
document.addEventListener("DOMContentLoaded", async () => {
    
    // Crear indicador de carga para que el usuario sepa que está funcionando
    let container = document.getElementById('resultado-texto');
    if (!container) {
        // Si no existe el contenedor en el HTML, lo creamos automáticamente
        container = document.createElement('pre');
        container.id = 'resultado-texto';
        document.body.appendChild(container);
    }
    
    container.style.backgroundColor = "#1e1e1e";
    container.style.color = "#00ff66";
    container.style.padding = "20px";
    container.style.borderRadius = "8px";
    container.style.fontFamily = "monospace";
    container.style.whiteSpace = "pre-wrap";
    container.style.margin = "20px";
    container.innerText = "⏳ Analizando huella digital... Por favor, permite el acceso al GPS si el navegador lo solicita...";

    // 1. Extraer todo
    const datos = await extraerTodosLosDatos();
    console.dir(datos);

    // 2. Analizar e inferir
    const prediccion = generarPerfilPredictivo(datos);

    // 3. Generar texto literario/predictivo
    const informeTexto = redactarInformeSherlock(prediccion, datos);
    
    // 4. Mostrar en pantalla reemplazando el mensaje de carga
    container.innerText = informeTexto;
});