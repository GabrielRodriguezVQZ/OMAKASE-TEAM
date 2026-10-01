import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceCommand {
  command: string;
  action: () => void;
  validate?: () => boolean;
  invalidMessage?: string;
}

interface UseVoiceCommandsReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  lastCommand: string | null;
  error: string | null;
}

const RESTART_DELAY_MS = 300;
const WATCHDOG_INTERVAL_MS = 1000;
const MAX_CONSECUTIVE_RESTARTS = 10;
const STABLE_SESSION_MS = 5000;

const FILLER_WORDS =
  /\b(por favor|porfavor|hola|hey|okay|vale|bien|ahora|listo|escuchando|omakase)\b/g;

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(FILLER_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const matchCommand = (
  transcript: string,
  commands: VoiceCommand[]
): VoiceCommand | undefined => {
  const spoken = normalize(transcript);
  if (!spoken) return undefined;

  const candidates = commands
    .map((cmd) => ({ cmd, phrase: normalize(cmd.command) }))
    .filter((entry) => entry.phrase);

  const exact = candidates.find((entry) => entry.phrase === spoken);
  if (exact) return exact.cmd;

  const contained = candidates
    .filter((entry) => {
      const words = entry.phrase.split(' ');
      if (words.length === 1) {
        return new RegExp(`\\b${entry.phrase}\\b`).test(spoken);
      }
      return spoken.includes(entry.phrase);
    })
    .sort((a, b) => b.phrase.length - a.phrase.length);

  return contained[0]?.cmd;
};

export const useVoiceCommands = (commands: VoiceCommand[]): UseVoiceCommandsReturn => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  const recognitionRef = useRef<any>(null);
  const runningRef = useRef(false);
  const wantListeningRef = useRef(false);
  const startedAtRef = useRef(0);
  const restartAttemptsRef = useRef(0);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeStart = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || runningRef.current) return;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    try {
      recognition.start();
      runningRef.current = true;
      startedAtRef.current = Date.now();
    } catch (e) {
      console.error('No se pudo iniciar el reconocimiento:', e);
      runningRef.current = false;
    }
  }, []);

  const scheduleRestart = useCallback(() => {
    if (!wantListeningRef.current) return;

    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);

    restartTimeoutRef.current = setTimeout(() => {
      restartTimeoutRef.current = null;
      if (!wantListeningRef.current) return;

      if (restartAttemptsRef.current >= MAX_CONSECUTIVE_RESTARTS) {
        wantListeningRef.current = false;
        setIsListening(false);
        setError('El reconocimiento se detuvo repetidamente. Vuelve a activarlo.');
        return;
      }

      restartAttemptsRef.current += 1;
      safeStart();
    }, RESTART_DELAY_MS);
  }, [safeStart]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      runningRef.current = true;
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      runningRef.current = false;
      setIsListening(false);
      if (!wantListeningRef.current) return;

      if (Date.now() - startedAtRef.current > STABLE_SESSION_MS) {
        restartAttemptsRef.current = 0;
      }

      scheduleRestart();
    };

    recognition.onerror = (event: any) => {
      const code = event?.error;

      if (code === 'aborted') {
        runningRef.current = false;
        return;
      }

      if (code === 'no-speech') {
        setError('No se detectó voz. Sigo escuchando, inténtalo de nuevo.');
        return;
      }

      if (code === 'network') {
        setError('Problema de red con el servicio de voz. Reintentando...');
        return;
      }

      wantListeningRef.current = false;
      runningRef.current = false;
      setIsListening(false);

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Permiso de micrófono denegado. Habilítalo en el candado del navegador.');
      } else if (code === 'audio-capture') {
        setError('No se detectó micrófono. Verifica que esté conectado.');
      } else {
        setError(`Error de reconocimiento: ${code}`);
      }
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result.isFinal) continue;

        const transcript = result[0]?.transcript;
        if (!transcript) continue;

        const matchedCommand = matchCommand(transcript, commandsRef.current);
        setLastCommand(matchedCommand?.command ?? transcript.trim());

        if (!matchedCommand) continue;

        if (matchedCommand.validate && !matchedCommand.validate()) {
          setError(matchedCommand.invalidMessage || 'Ese comando no aplica en esta fase');
          continue;
        }

        matchedCommand.action();
      }
    };

    watchdogRef.current = setInterval(() => {
      if (!wantListeningRef.current) return;
      if (runningRef.current || restartTimeoutRef.current) return;
      safeStart();
    }, WATCHDOG_INTERVAL_MS);

    return () => {
      wantListeningRef.current = false;

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }

      try {
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.abort();
      } catch (e) {
        // Ignorar error al detener
      }

      runningRef.current = false;
      recognitionRef.current = null;
    };
  }, [safeStart, scheduleRestart]);

  const startListening = useCallback(() => {
    wantListeningRef.current = true;
    restartAttemptsRef.current = 0;
    setError(null);
    safeStart();
  }, [safeStart]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    setIsListening(false);

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.error('Error al detener:', e);
      }
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    lastCommand,
    error,
  };
};

export const useSpeechSynthesis = () => {
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return { speak };
};
