import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff, Settings, Monitor, Users, Copy, Check, Globe } from 'lucide-react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { supabase } from '../lib/supabaseClient';
import MeetingSubtitles from '../components/MeetingSubtitles';
import VideoSubtitles from '../components/VideoSubtitles';
import type { User } from '@supabase/supabase-js';
import { CohereClient } from 'cohere-ai';

interface TranscriptEntry {
  text: string;
  participantId: string;
  timestamp: Date;
}

interface TranscriptMessage {
  type: 'transcript';
  transcript: TranscriptEntry;
}

interface Language {
  code: string;
  name: string;
  label: string;
}

interface SpeechRecognitionError {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionError) => void) | null;
  start: () => void;
  stop: () => void;
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

const LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English', label: 'English (US)' },
  { code: 'en-GB', name: 'English', label: 'English (UK)' },
  { code: 'en-IN', name: 'English', label: 'English (India)' },
  { code: 'hi-IN', name: 'Hindi', label: 'Hindi' },
  { code: 'kn-IN', name: 'Kannada', label: 'Kannada' }
];

export default function MeetingRoom() {
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const peerRef = useRef<Peer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<DataConnection | null>(null);
  
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteTranscripts, setRemoteTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentLocalTranscript, setCurrentLocalTranscript] = useState<string | null>(null);
  const [currentRemoteTranscript, setCurrentRemoteTranscript] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [localTranscripts, setLocalTranscripts] = useState<TranscriptEntry[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const checkAuthAndInitialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
      
      initializePeer();
    };

    checkAuthAndInitialize();

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializePeer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      streamRef.current = stream;
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
        setPeerId(id);
        console.log('My peer ID is: ' + id);
      });

      peer.on('connection', (conn) => {
        console.log('Data channel connection received');
        dataChannelRef.current = conn;
        setupDataChannel(conn);
      });

      peer.on('call', (call) => {
        call.answer(stream);
        
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsConnected(true);
        });
      });

    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Unable to access camera/microphone. Please check permissions.');
    }
  };

  const setupDataChannel = (conn: DataConnection) => {
    console.log('Setting up data channel for connection:', conn.peer);
    conn.on('open', () => {
      console.log('Data channel opened with peer:', conn.peer);
    });
    conn.on('data', (data: unknown) => {
      console.log('Data received from peer ', conn.peer, ':', data);
      try {
        const message = data as TranscriptMessage;
        if (message.type === 'transcript') {
          console.log('Received remote transcript from ', conn.peer, ':', message.transcript);
          const receivedTranscript = {
            ...message.transcript,
            timestamp: new Date(message.transcript.timestamp)
          };
          setCurrentRemoteTranscript(receivedTranscript.text);
          if (transcriptTimeoutRef.current) {
            clearTimeout(transcriptTimeoutRef.current);
          }
          transcriptTimeoutRef.current = setTimeout(() => {
            setCurrentRemoteTranscript(null);
          }, 3000);

          setRemoteTranscripts(prev => {
            const newTranscripts = [...prev, receivedTranscript];
            return newTranscripts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          });
        }
      } catch (err) {
        console.error('Error processing received data:', err);
      }
    });
    conn.on('close', () => {
      console.log('Data channel closed with peer:', conn.peer);
    });
    conn.on('error', (err) => {
      console.error('Data channel error with peer ', conn.peer, ':', err);
    });
  };

  const callPeer = () => {
    if (!remotePeerId || !peerRef.current || !streamRef.current) return;

    const call = peerRef.current.call(remotePeerId, streamRef.current);
    const conn = peerRef.current.connect(remotePeerId);
    dataChannelRef.current = conn;
    setupDataChannel(conn);
    
    call.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setIsConnected(true);
    });
  };

  const sendTranscript = (transcript: TranscriptEntry) => {
    console.log('Attempting to send transcript:', transcript);
    setCurrentLocalTranscript(transcript.text);
    setLocalTranscripts((prev: TranscriptEntry[]) => {
      const newTranscripts = [...prev, transcript];
      console.log('Updated localTranscripts:', newTranscripts);
      return newTranscripts.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
    }
    transcriptTimeoutRef.current = setTimeout(() => {
      setCurrentLocalTranscript(null);
    }, 3000);

    if (dataChannelRef.current && dataChannelRef.current.open) {
      console.log('Sending transcript via data channel');
      dataChannelRef.current.send({
        type: 'transcript',
        transcript
      });
    } else {
      console.warn('Data channel not open. Cannot send transcript.');
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleSubtitles = () => {
    setShowSubtitles(!showSubtitles);
  };

  const copyPeerId = async () => {
    if (peerId) {
      await navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    navigate('/');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSummarizeMeeting = async () => {
    setSummarizing(true);
    setSummary('');
    try {
      const allText = [...localTranscripts, ...remoteTranscripts]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(t => t.text)
        .join(' ');

      // Check if there's text to summarize
      if (!allText.trim()) {
        setSummary('No subtitles recorded to summarize.');
        return;
      }

      const cohere = new CohereClient({
        token: 'RdxSzghcA9fz67OTyfJnVmphTmINKClqZDBbI1wC',
      });

      const response = await cohere.summarize({
        text: allText,
        length: 'medium',
        format: 'paragraph',
        model: 'summarize-xlarge',
        additionalCommand: `Summarize the meeting discussion in ${selectedLanguage.name}, focusing on the main topics discussed and any decisions reached.`,
        temperature: 0.2
      });

      setSummary(response.summary || 'Could not generate a summary.');
    } catch (error) {
      console.error('Error summarizing meeting:', error);
       if (error instanceof Error) {
        setSummary(`Error summarizing meeting: ${error.message}. Please check your API key and network connection.`);
      } else {
        setSummary('Error summarizing meeting. Please try again.');
      }
    } finally {
      setSummarizing(false);
    }
  };

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    setShowLanguageMenu(false);
    // Reinitialize speech recognition with new language
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      initializeRecognition();
    }
  };

  const initializeRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const recognition = new (window as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage.code;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setTranscript(transcript);

      if (event.results[event.results.length - 1].isFinal) {
        const newTranscript: TranscriptEntry = {
          text: transcript,
          participantId: peerId,
          timestamp: new Date()
        };
        sendTranscript(newTranscript);
        setTranscript('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white overflow-hidden">
      
      <header className="backdrop-blur-xl bg-black/30 border-b border-white/10 px-6 py-4 relative z-10 flex-shrink-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Video className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                MeetNow
              </span>
            </Link>
  
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-300">
                  {isConnected ? '2 participants' : '1 participant'}
                </span>
              </div>
  
              {user && (
                <div className="text-sm text-gray-300 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                  {user.email}
                </div>
              )}
            </div>
          </div>
  
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <Settings className="h-5 w-5 text-gray-400" />
            </button>
  
            {user ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-300 text-sm font-medium"
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl transition-all duration-300 text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>
  
      <main className="flex-1 relative overflow-auto p-6 max-h-[calc(100vh-64px)]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl pointer-events-none"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
  
        <div className="max-w-7xl mx-auto relative z-10 min-h-full flex flex-col">
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Your Meeting ID</h3>
                  <button
                    onClick={copyPeerId}
                    className="flex items-center space-x-2 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors text-sm"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl font-mono text-sm text-center border border-white/5">
                  {peerId || (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-600 rounded w-32 mx-auto"></div>
                    </div>
                  )}
                </div>
              </div>
  
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Join Meeting</h3>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="Enter meeting ID"
                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all"
                    value={remotePeerId}
                    onChange={(e) => setRemotePeerId(e.target.value)}
                  />
                  <button
                    onClick={callPeer}
                    disabled={!remotePeerId}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl transition-all duration-300 font-medium shadow-lg disabled:cursor-not-allowed"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
  
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 flex-grow">
            <div className="relative group">
              <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-medium">
                You {!isVideoEnabled && '(Camera Off)'}
              </div>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-white/10 shadow-2xl">
                <video
                  ref={myVideoRef}
                  className="w-full aspect-video bg-gray-800 rounded-3xl object-cover"
                  muted
                  autoPlay
                  playsInline
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <VideoOff className="h-10 w-10 text-gray-400" />
                      </div>
                      <p className="text-gray-400">Camera is off</p>
                    </div>
                  </div>
                )}
                <VideoSubtitles text={currentLocalTranscript} participantName="You" />
              </div>
            </div>
  
            <div className="relative group">
              <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-medium">
                {isConnected ? 'Remote Participant' : 'Waiting to connect...'}
              </div>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-white/10 shadow-2xl">
                <video
                  ref={remoteVideoRef}
                  className="w-full aspect-video bg-gray-800 rounded-3xl object-cover"
                  autoPlay
                  playsInline
                />
                {!isConnected && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mb-6 mx-auto">
                        <Users className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No one else here yet</h3>
                      <p className="text-gray-400 text-sm">Share your meeting ID or join someone else's meeting</p>
                    </div>
                  </div>
                )}
                <VideoSubtitles text={currentRemoteTranscript} participantName="Remote" />
              </div>
            </div>
          </div>
  
          <MeetingSubtitles
            isVisible={showSubtitles}
            onToggle={toggleSubtitles}
            participants={new Map(user ? [[user.email ?? '', { name: user.email ?? '', peerId: peerId }]] : [])}
            onTranscript={sendTranscript}
            remoteTranscripts={remoteTranscripts}
            localPeerId={peerId}
            selectedLanguage={selectedLanguage}
          />
          {transcript && (
            <div className="fixed bottom-24 left-0 right-0 z-10 max-w-3xl mx-auto bg-gray-900/80 text-white p-4 rounded-lg shadow-lg">
              <span className="text-blue-400 font-medium mr-1">You:</span>
              {transcript}
            </div>
          )}
  
          <div className="flex flex-col items-center mt-6">
            <button
              onClick={handleSummarizeMeeting}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white rounded-xl font-semibold shadow-lg disabled:opacity-50"
              disabled={summarizing || (localTranscripts.length + remoteTranscripts.length === 0)}
            >
              {summarizing ? 'Summarizing...' : 'Summarize Meeting'}
            </button>
            {summary && (
              <div className="mt-4 p-4 bg-white/10 rounded-xl max-w-2xl text-white">
                <h3 className="font-bold mb-2">Meeting Summary:</h3>
                <p>{summary}</p>
              </div>
            )}
          </div>
  
          <div className="flex justify-center mt-auto">
            <div className="flex items-center space-x-4 bg-black/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl">
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className={`p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 transform hover:scale-110 flex items-center space-x-2 ${
                    isListening ? 'bg-blue-500/20 border-blue-500/50' : ''
                  }`}
                >
                  <Globe className="h-6 w-6" />
                  <span className="text-sm">{selectedLanguage.label}</span>
                  {isListening && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
                </button>
                
                {showLanguageMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-gray-900 border border-white/20 rounded-xl shadow-xl overflow-hidden">
                    {LANGUAGES.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => handleLanguageChange(language)}
                        className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${
                          selectedLanguage.code === language.code ? 'bg-blue-500/20' : ''
                        }`}
                      >
                        {language.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={toggleAudio}
                className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                  isAudioEnabled
                    ? 'bg-white/10 hover:bg-white/20 border border-white/20'
                    : 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400'
                }`}
              >
                {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
              </button>
  
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                  isVideoEnabled
                    ? 'bg-white/10 hover:bg-white/20 border border-white/20'
                    : 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400'
                }`}
              >
                {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </button>
  
              <button className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 transform hover:scale-110">
                <Monitor className="h-6 w-6" />
              </button>
  
              <button
                onClick={toggleSubtitles}
                className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                  showSubtitles ? 'bg-blue-500 hover:bg-blue-600 text-white border border-blue-400' : 'bg-white/10 hover:bg-white/20 border border-white/20'
                }`}
              >
                <MessageSquare className="h-6 w-6" />
              </button>
  
              <button
                onClick={endCall}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 rounded-2xl font-semibold transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <PhoneOff className="h-5 w-5" />
                <span>End</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}