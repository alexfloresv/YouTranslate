// Polyfill para compatibilidad Chrome/Firefox
if (typeof browser === "undefined") {
  var browser = chrome;
}

let synth = window.speechSynthesis;
let lastSubtitleText = '';
let run = false;
let utterance = new SpeechSynthesisUtterance();
let checkInterval;
let nextSubtitleText = null;
let isSpeaking = false;

// Mapeo de dominios a selectores de subtítulos
const SUBTITLE_SELECTORS = [
    { match: /youtube\.com/, selector: '.ytp-caption-segment' },
    { match: /mylearn\.oracle\.com/, selector: '.vjs-text-track-cue > div' },
    { match: /my\.ine\.com/, selector: '.jw-text-track-cue' } // <--- Agregado para INE
    // Agrega aquí más sitios y selectores
];

function getSubtitleSelector() {
    const url = window.location.href;
    for (const entry of SUBTITLE_SELECTORS) {
        if (entry.match.test(url)) return entry.selector;
    }
    // Fallback: intenta con YouTube
    return '.ytp-caption-segment';
}

utterance.rate = 1.5;

function speakNow(text) {
    isSpeaking = true;
    utterance.text = text;
    synth.speak(utterance);
}

utterance.onend = () => {
    isSpeaking = false;
    if (nextSubtitleText) {
        lastSubtitleText = nextSubtitleText;
        speakNow(nextSubtitleText);
        nextSubtitleText = null;
    }
};

function checkAndSpeakSubtitles() {
    if (!run) return;
    const selector = getSubtitleSelector();
    const subtitleElements = document.querySelectorAll(selector);
    let currentText = '';

    if (subtitleElements.length > 0) {
        currentText = Array.from(subtitleElements)
            .map(el => el.textContent)
            .join(' ')
            .trim();
    }

    // Solo lee si el texto cambió respecto al último leído o hablado
    if (currentText && currentText !== lastSubtitleText && (!isSpeaking || currentText !== utterance.text)) {
        if (!isSpeaking) {
            lastSubtitleText = currentText;
            speakNow(currentText);
        } else {
            nextSubtitleText = currentText;
        }
    } else if (!currentText && lastSubtitleText !== '') {
        lastSubtitleText = '';
        if (synth.speaking) synth.cancel();
        isSpeaking = false;
        nextSubtitleText = null;
    }
}

function startReading() {
    if (run) return;
    run = true;
    lastSubtitleText = '';
    nextSubtitleText = null;
    isSpeaking = false;
    checkInterval = setInterval(checkAndSpeakSubtitles, 100);
}

function stopReading() {
    if (!run) return;
    run = false;
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
    if (synth.speaking) synth.cancel();
    lastSubtitleText = '';
    nextSubtitleText = null;
    isSpeaking = false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start') {
        const voices = synth.getVoices();
        const selectedVoice = voices.find((voice) => voice.voiceURI === request.voiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
        } else if (voices.length > 0) {
            utterance.voice = voices[0];
            utterance.lang = voices[0].lang;
        }
        // Cambia la velocidad si viene en el mensaje
        if (request.rate) utterance.rate = request.rate;
        startReading();
        sendResponse({ result: 'Started reading' });
    } else if (request.action === 'stop') {
        stopReading();
        sendResponse({ result: 'Stopped reading' });
    }
    return true;
});

window.speechSynthesis.getVoices();