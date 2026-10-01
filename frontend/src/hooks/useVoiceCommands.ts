import { useState, useEffect, useCallback } from 'react';

interface VoiceCommand {
  command: string;
  action: () => void;
  validate?: () => boolean; // Validación opcional
  invalidMessage?: string; // Mensaje si la validación falla
}

interface UseVoiceCommandsReturn {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  lastCommand: string | null;
  error: string | null;
}

export const useVoiceCommands = (commands: VoiceCommand[]): UseVoiceCommandsReturn => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shouldKeepListening, setShouldKeepListening] = useState(false);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log('Comando reconocido:', transcript);
      
      // Buscar comando que coincida
      const matchedCommand = commands.find((cmd) => 
        transcript.includes(cmd.command.toLowerCase())
      );

      if (matchedCommand) {
        // Validar si el comando es válido para la fase actual
        if (matchedCommand.validate && !matchedCommand.validate()) {
          setLastCommand(matchedCommand.command);
          const msg = matchedCommand.invalidMessage || 'Ese comando no aplica en esta fase';
          setError(msg);
          setTimeout(() => setError(null), 3000);
          return;
        }

        setLastCommand(matchedCommand.command);
        matchedCommand.action();
      } else {
        setLastCommand(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Error de reconocimiento de voz:', event.error);
      setError(event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        setShouldKeepListening(false);
      }
    };

    recognition.onend = () => {
      console.log('Reconocimiento terminado');
      setIsListening(false);
      
      // Reiniciar automáticamente si se debe mantener escuchando
      if (shouldKeepListening) {
        try {
          recognition.start();
          setIsListening(true);
        } catch (e) {
          console.error('Error al reiniciar reconocimiento:', e);
          setShouldKeepListening(false);
        }
      }
    };

    // Guardar la instancia de recognition
    (window as any).speechRecognitionInstance = recognition;

    return () => {
      recognition.abort();
    };
  }, [commands, shouldKeepListening]);

  const startListening = useCallback(() => {
    const recognition = (window as any).speechRecognitionInstance;
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
        setShouldKeepListening(true);
        setError(null);
      } catch (e) {
        console.error('Error al iniciar reconocimiento:', e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    const recognition = (window as any).speechRecognitionInstance;
    if (recognition) {
      recognition.stop();
      setIsListening(false);
      setShouldKeepListening(false);
    }
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    lastCommand,
    error,
  };
};

// Hook para confirmación hablada
export const useSpeechSynthesis = () => {
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return { speak };
};
