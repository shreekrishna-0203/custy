import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

interface SpeechGrammar {
  src: string;
  weight: number;
}

interface SpeechGrammarList {
  length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface Language {
  code: string;
  name: string;
  label: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechGrammarList: new () => SpeechGrammarList;
    webkitSpeechGrammarList: new () => SpeechGrammarList;
  }
}

interface SubtitleProps {
  isVisible: boolean;
  onToggle: () => void;
  participants: Map<string, { name: string; peerId: string }>;
  onTranscript: (transcript: TranscriptEntry) => void;
  remoteTranscripts: TranscriptEntry[];
  localPeerId: string;
  selectedLanguage: Language;
}

interface TranscriptEntry {
  text: string;
  participantId: string;
  timestamp: Date;
}

export default function MeetingSubtitles({
  isVisible,
  onToggle,
  participants,
  onTranscript,
  remoteTranscripts,
  localPeerId,
  selectedLanguage
}: SubtitleProps) {  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [localTranscripts, setLocalTranscripts] = useState<TranscriptEntry[]>([]);

  // Combine local and remote transcripts, sorted by timestamp
  const allTranscripts = [...localTranscripts, ...remoteTranscripts].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  // Keep listening for transcripts even when hidden
  useEffect(() => {
    if (!recognitionRef.current) {
      initializeRecognition();
    }
  }, []);

  const initializeRecognition = () => {
    if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
      console.log('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = selectedLanguage.code;

    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };

    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        handleTranscript(finalTranscript, false);
      }
      if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };
  };
  const handleTranscript = (text: string, isInterim: boolean = false) => {
    const newTranscript: TranscriptEntry = {
      text,
      participantId: localPeerId,
      timestamp: new Date()
    };

    if (!isInterim) {
      setTranscript('');
      setLocalTranscripts(prev => [...prev, newTranscript]);
      onTranscript(newTranscript);
    } else {
      setTranscript(text);
    }
  };

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      initializeRecognition();
    }

    try {
      if (isListening) {
        recognitionRef.current?.stop();
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
        recognitionRef.current?.start();
      }
    } catch (error) {
      console.error('Error toggling recognition:', error);
      initializeRecognition();
      try {
        recognitionRef.current?.start();
      } catch (retryError) {
        console.error('Error on retry:', retryError);
      }
    }
  };
  useEffect(() => {
    if (isVisible) {
      initializeRecognition();
    }
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isVisible, initializeRecognition, isListening]);

  // Add effect to reinitialize when language changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      initializeRecognition();
      if (isListening) {
        recognitionRef.current.start();
      }
    }
  }, [selectedLanguage.code]);

  // Don't return null when not visible, just hide the UI
  if (!isVisible) {
    return <div className="hidden" aria-hidden="true" />;
  }

  return (
    <div className="fixed bottom-24 left-0 right-0 z-10">
      <div className="max-w-3xl mx-auto bg-gray-900 text-white p-4 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span className="font-semibold">Live Subtitles</span>
            <button
              onClick={toggleListening}
              className={`px-2 py-1 rounded text-sm ${
                isListening ? 'bg-red-600' : 'bg-blue-600'
              }`}
            >
              {isListening ? 'Stop' : 'Start'} Recognition
            </button>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-800 rounded transition-colors"
          >
            <span className="sr-only">Close</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {transcript && (
            <div className="text-gray-400 italic">
              <span className="text-blue-400 font-medium mr-1">You:</span>
              {transcript}
            </div>
          )}
          
          {allTranscripts.map((entry, index) => {
            const participant = Array.from(participants.values()).find(
              p => p.peerId === entry.participantId
            );
            const name = participant?.name || 'Unknown';
            
            return (
              <div key={index} className="pb-1 last:pb-0">
                <span className="text-blue-400 font-medium mr-1">{name}:</span>
                {entry.text}
              </div>
            );
          })}

          {!transcript && allTranscripts.length === 0 && (
            <div className="text-center text-gray-400">
              {isListening ? 'Listening...' : 'Subtitles will appear here.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
