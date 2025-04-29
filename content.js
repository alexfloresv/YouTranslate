let synth = window.speechSynthesis;
let lastSubtitleText = ''; // Renombrado para claridad
let run = false;
let utterance = new SpeechSynthesisUtterance();
let checkInterval; // Para controlar el intervalo

// Selector para los segmentos de subtítulos (ajustable si es necesario para otros sitios)
const SUBTITLE_SELECTOR = '.ytp-caption-segment';

function speak(text) {
    // Si hay algo hablando, cancelarlo para decir la nueva frase inmediatamente.
    if (synth.speaking) {
        synth.cancel();
    }

    return new Promise((resolve, reject) => {
        if (text && text.trim() !== '') {
            utterance.text = text.trim(); // Usar trim para evitar espacios vacíos
            // console.log("Hablando:", utterance.text); // Para depuración
            synth.speak(utterance);
            utterance.onend = resolve;
            utterance.onerror = (event) => {
                console.error('SpeechSynthesisUtterance.onerror', event);
                reject(event); // Rechazar la promesa en caso de error
            };
        } else {
            resolve(); // Resolver inmediatamente si no hay texto
        }
    });
}

async function checkAndSpeakSubtitles() {
    const subtitleElements = document.querySelectorAll(SUBTITLE_SELECTOR);
    let currentText = '';

    if (subtitleElements.length > 0) {
        // Concatenar el texto de todos los segmentos visibles actualmente
        currentText = Array.from(subtitleElements)
                             .map(el => el.textContent)
                             .join(' ') // Unir segmentos con espacio
                             .trim(); // Limpiar espacios al inicio/final
    }

    // Si el texto ha cambiado respecto al último leído (y no está vacío), decirlo
    if (currentText && currentText !== lastSubtitleText) {
        // console.log("Nuevo subtítulo detectado:", currentText); // Para depuración
        lastSubtitleText = currentText;
        try {
            // No necesitamos esperar a que termine de hablar para seguir revisando.
            speak(currentText);
        } catch (error) {
            console.error("Error al intentar hablar:", error);
        }
    }
    // Si no hay subtítulos visibles ahora, pero había antes, resetear
    else if (!currentText && lastSubtitleText !== '') {
        lastSubtitleText = '';
        // Opcional: podrías querer cancelar la voz aquí si los subtítulos desaparecen
        // if (synth.speaking) {
        //  synth.cancel();
        // }
    }
}

function startReading() {
    if (run) return; // Evitar iniciar múltiples veces
    run = true;
    lastSubtitleText = ''; // Resetear al iniciar
    // console.log("Iniciando lectura..."); // Para depuración
    // Revisar subtítulos a intervalos regulares (ajusta 250ms si es necesario)
    checkInterval = setInterval(checkAndSpeakSubtitles, 250);
}

function stopReading() {
    if (!run) return; // Evitar detener si no está corriendo
    run = false;
    // console.log("Deteniendo lectura..."); // Para depuración
    if (checkInterval) {
        clearInterval(checkInterval); // Detener la revisión periódica
        checkInterval = null;
    }
    if (synth.speaking) {
        synth.cancel(); // Detener cualquier locución en curso
    }
    lastSubtitleText = ''; // Limpiar el último texto
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start') {
        // Asegurarse de que las voces estén listas (puede tardar un momento)
        const checkVoices = () => {
            const voices = synth.getVoices();
            if (voices.length === 0) {
                // console.log("Voces aún no cargadas, reintentando..."); // Para depuración
                setTimeout(checkVoices, 100); // Reintentar pronto
                return;
            }

            // Encontrar la voz seleccionada en el popup
            const selectedVoice = voices.find((voice) => voice.voiceURI === request.voiceURI);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                utterance.lang = selectedVoice.lang; // Usar el idioma de la voz seleccionada
                // console.log("Voz configurada:", selectedVoice.name, selectedVoice.lang); // Para depuración
            } else {
                console.warn("Voz solicitada no encontrada:", request.voiceURI);
                // Opcional: usar la primera voz disponible como fallback
                if (voices.length > 0) {
                    utterance.voice = voices[0];
                    utterance.lang = voices[0].lang;
                    console.log("Usando la primera voz disponible como fallback:", voices[0].name);
                }
            }
            // utterance.rate = 1.2; // Opcional: Ajustar velocidad
            // utterance.pitch = 1; // Opcional: Ajustar tono

            // Ya no interactuamos con los controles de YouTube aquí
            // toggleMute(); // ELIMINADO
            // toggleSubtitles(utterance.lang); // ELIMINADO

            startReading(); // Iniciar el bucle de lectura
            sendResponse({ result: 'Started reading' });
        };
        checkVoices(); // Iniciar la comprobación de voces

    } else if (request.action === 'stop') {
        stopReading(); // Detener el bucle de lectura y cancelar voz
        sendResponse({ result: 'Stopped reading' });
    }
    // Indicar que la respuesta puede ser asíncrona (importante si usamos setTimeout)
    return true;
});

// Inicializar la API para asegurar que 'onvoiceschanged' se dispare eventualmente
window.speechSynthesis.getVoices();