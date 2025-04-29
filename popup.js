let read = false;
let defaultVoiceSet = false; // Flag para evitar seleccionar múltiples veces

function handleMessageError(error) {
    if (error) {
        // Mejor mostrar el error al usuario o loguearlo de forma más útil
        console.error(`Error sending message: ${error.message || error}`);
        // Podrías querer actualizar la UI aquí para indicar el error
        // document.getElementById('status').textContent = 'Error';
        // read = false; // Resetear estado
    }
}

document.getElementById('status').addEventListener('click', () => {
    const voiceSelect = document.getElementById('voice-select');
    const voiceURI = voiceSelect.value;

    // Asegurarse de que se haya seleccionado una voz
    if (!voiceURI) {
        console.warn("No voice selected.");
        // Podrías alertar al usuario o simplemente no hacer nada
        return;
    }

    const action = read ? 'stop' : 'start';
    const newText = read ? 'start' : 'stop';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Verificar si hay una pestaña activa y si la URL es válida (opcional pero bueno)
        if (tabs.length > 0 && tabs[0].id) {
            const messagePayload = action === 'start' ? { action: 'start', voiceURI } : { action: 'stop' };
            chrome.tabs.sendMessage(tabs[0].id, messagePayload, (response) => {
                // Manejar la respuesta o el error de chrome.runtime.lastError
                if (chrome.runtime.lastError) {
                    handleMessageError(chrome.runtime.lastError);
                } else if (response) {
                    // console.log("Respuesta del content script:", response.result); // Para depuración
                    // Actualizar UI solo si el mensaje fue exitoso
                    document.getElementById('status').textContent = newText;
                    read = !read;
                    // La función displaySubtitles no parece estar definida aquí,
                    // y manipular estilos de la página desde el popup es complejo y a menudo no funciona bien.
                    // Se recomienda eliminarla o mover esa lógica a content.js si es necesaria.
                    // displaySubtitles(!read); // Comentado/Eliminado
                } else {
                    // Caso donde no hay respuesta pero tampoco error (puede pasar si el content script no está inyectado)
                    console.warn("No response received from content script. Is it running on the active tab?");
                    handleMessageError("No response from content script.");
                }
            });
        } else {
            console.error("Could not find active tab.");
            handleMessageError("No active tab found.");
        }
    });
});

// window.addEventListener('load', () => {
//  No es necesario si el script está al final del body o se usa defer
// });

// Choice language and voice
function fillVoiceList() {
  const select = document.getElementById('voice-select');
  if (!select) return; // Salir si el select no existe

    // Limpiar opciones existentes (importante si onvoiceschanged se dispara varias veces)
    select.innerHTML = '';
    defaultVoiceSet = false; // Resetear flag

  const voices = speechSynthesis.getVoices();
    // console.log("Available voices:", voices.length); // Para depuración

    if (voices.length === 0) {
        // Añadir una opción indicando que se están cargando o no hay voces
        const option = document.createElement('option');
        option.textContent = "Cargando voces...";
        option.disabled = true;
        select.appendChild(option);
        return; // Salir y esperar a que onvoiceschanged vuelva a llamar
    }

  voices.forEach((voice) => {
    const option = document.createElement('option');
    option.textContent = `${voice.name} (${voice.lang})`;
    option.value = voice.voiceURI;

        // Intentar preseleccionar la primera voz en Español encontrada
        if (!defaultVoiceSet && voice.lang.startsWith('es')) {
            option.selected = true;
            defaultVoiceSet = true; // Marcar que ya hemos seleccionado una por defecto
            // console.log("Default Spanish voice selected:", voice.name); // Para depuración
        }

    select.appendChild(option);
  });

    // Si después de recorrer todas las voces no se encontró una en español,
    // seleccionar la primera de la lista como fallback (si hay alguna)
    if (!defaultVoiceSet && select.options.length > 0) {
        select.options[0].selected = true;
        // console.log("No Spanish voice found, selecting first available:", select.options[0].text); // Para depuración
    }
}

// Esperar a que las voces estén cargadas
// 'onvoiceschanged' puede dispararse varias veces, por eso limpiamos el select
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = fillVoiceList;
}

// Llamar una vez al inicio en caso de que las voces ya estén cacheadas
fillVoiceList();

// Display the subtitles (COMENTADO/ELIMINADO)
// Esta función intenta manipular directamente el DOM de la página web desde el popup,
// lo cual no es posible ni recomendable. La ocultación/muestra de subtítulos
// debería hacerse en content.js si es necesario.
/*
function displaySubtitles(run) {
    // Esto no funcionará como se espera desde el popup.
    // const captionsWindow = document.querySelector('.ytp-caption-window'); // Busca en el DOM del popup, no de la página
    // if (captionsWindow) {
    // 	if (run)
    // 		captionsWindow.style.opacity = '0 !important';
    // 	else
    // 		captionsWindow.style.opacity = '1';
    // }

    // Si quieres ocultar los subtítulos visualmente mientras se leen,
    // deberías enviar un mensaje a content.js para que lo haga.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleVisibility', show: !run });
            // Necesitarías añadir un listener en content.js para 'toggleVisibility'
        }
    });
}
*/