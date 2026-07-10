import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const MYANMAR_LOCALE = 'my-MM';

type UseMyanmarSpeechToTextOptions = {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
};

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function mapSpeechError(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission denied. Allow microphone access in your browser.';
    case 'no-speech':
      return 'No speech detected. Try speaking again.';
    case 'audio-capture':
      return 'No microphone found. Check your audio input device.';
    case 'network':
      return 'Speech recognition needs an internet connection.';
    case 'aborted':
      return '';
    default:
      return 'Voice input failed. Try again.';
  }
}

export function useMyanmarSpeechToText({
  onTranscript,
  onError,
}: UseMyanmarSpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onTranscript, onError]);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      return;
    }

    setIsSupported(true);
    const recognition = new Ctor();
    recognition.lang = MYANMAR_LOCALE;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = event => {
      let interim = '';
      let final = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      const text = (final || interim).trim();
      if (text) {
        onTranscriptRef.current(text, Boolean(final));
      }
    };

    recognition.onerror = event => {
      const message = mapSpeechError(event.error);
      if (message) {
        onErrorRef.current?.(message);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      onErrorRef.current?.(
        Platform.OS === 'web'
          ? 'Voice input is not supported in this browser. Try Chrome or Edge.'
          : 'Voice input is available on web only.',
      );
      return;
    }

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      onErrorRef.current?.('Voice input is already active.');
    }
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
      return;
    }
    start();
  }, [isListening, start, stop]);

  return {
    isListening,
    isSupported,
    start,
    stop,
    toggle,
  };
}
