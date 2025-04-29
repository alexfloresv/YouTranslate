let synth = window.speechSynthesis;
let lastSubtitleText = '';
let run = false;
let utterance = new SpeechSynthesisUtterance();
let checkInterval;
let nextSubtitleText = null;
let isSpeaking = false;

const SUBTITLE_SELECTOR = '.ytp-caption-segment';
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
    const subtitleElements = document.querySelectorAll(SUBTITLE_SELECTOR);
    let currentText = '';

    if (subtitleElements.length > 0) {
        currentText = Array.from(subtitleElements)
            .map(el => el.textContent)
            .join(' ')
            .trim();
    }

    if (currentText && currentText !== lastSubtitleText) {
        if (!isSpeaking) {
            lastSubtitleText = currentText;
            speakNow(currentText);
        } else {
            nextSubtitleText = currentText; // Guardar para leer después
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
        startReading();
        sendResponse({ result: 'Started reading' });
    } else if (request.action === 'stop') {
        stopReading();
        sendResponse({ result: 'Stopped reading' });
    }
    return true;
});

window.speechSynthesis.getVoices();