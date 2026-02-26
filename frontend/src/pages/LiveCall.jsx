import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getVapi, stopCall, setMuted } from '../services/vapi';
import { api } from '../services/api';
import { Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';

export default function LiveCall() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { vapiConfig, personality } = location.state || {};

  const [callStatus, setCallStatus] = useState('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [messages, setMessages] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!vapiConfig) {
      navigate('/new-session');
      return;
    }

    const vapi = getVapi();

    vapi.on('call-start', () => {
      setCallStatus('active');
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    });

    vapi.on('call-end', () => {
      setCallStatus('ended');
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => navigate(`/scorecard/${sessionId}`), 2000);
    });

    vapi.on('speech-start', () => setAiSpeaking(true));
    vapi.on('speech-end', () => setAiSpeaking(false));
    vapi.on('volume-level', (level) => setVolumeLevel(level));

    vapi.on('message', (msg) => {
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        setMessages((prev) => [...prev, { role: msg.role, text: msg.transcript }]);
      }
    });

    vapi.on('error', (err) => {
      console.error('Vapi error:', err);
      setCallStatus('error');
    });

    vapi.start(vapiConfig).then((call) => {
      if (call?.id) {
        api.updateCallId(parseInt(sessionId), call.id).catch(console.error);
      }
    }).catch((err) => {
      console.error('Failed to start call:', err);
      setCallStatus('error');
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { vapi.stop(); } catch {}
      vapi.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleMute = () => {
    setMuted(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleEndCall = () => {
    stopCall();
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-[#1e293b] border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Practice Call — {personality?.label || 'Prospect'}
          </h2>
          <p className="text-sm text-slate-400">{personality?.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 font-mono">{formatTime(duration)}</span>
          <div className={`w-3 h-3 rounded-full ${
            callStatus === 'active' ? 'bg-green-400 animate-pulse' :
            callStatus === 'connecting' ? 'bg-amber-400 animate-pulse' :
            callStatus === 'error' ? 'bg-red-400' : 'bg-slate-500'
          }`} />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* Voice visualization */}
        <div className="relative mb-8">
          <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
            aiSpeaking
              ? 'bg-indigo-500/20 ring-4 ring-indigo-500/40'
              : 'bg-slate-800 ring-2 ring-slate-600'
          }`}>
            <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
              aiSpeaking
                ? 'bg-indigo-500/30 ring-4 ring-indigo-500/50'
                : 'bg-slate-700'
            }`}>
              <Volume2 className={`w-12 h-12 transition-colors ${
                aiSpeaking ? 'text-indigo-400' : 'text-slate-500'
              }`} />
            </div>
          </div>
          {aiSpeaking && (
            <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/10" />
          )}
        </div>

        <p className="text-lg text-slate-300 mb-2">
          {callStatus === 'connecting' && 'Connecting to prospect...'}
          {callStatus === 'active' && (aiSpeaking ? 'Prospect is speaking...' : 'Your turn — pitch!')}
          {callStatus === 'ended' && 'Call ended. Loading scorecard...'}
          {callStatus === 'error' && 'Connection error. Please try again.'}
        </p>

        {/* Volume bar */}
        {callStatus === 'active' && (
          <div className="w-48 h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-75"
              style={{ width: `${Math.min(volumeLevel * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Transcript panel */}
      <div className="bg-[#1e293b] border-t border-slate-700 max-h-48 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 text-center">Live transcript will appear here...</p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.role === 'assistant' ? 'text-indigo-300' : 'text-slate-300'}`}>
                <span className="font-semibold">{msg.role === 'assistant' ? 'Prospect' : 'You'}:</span>{' '}
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-[#0f172a] border-t border-slate-700 px-6 py-5 flex items-center justify-center gap-6">
        <button
          onClick={toggleMute}
          disabled={callStatus !== 'active'}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40'
              : 'bg-slate-700 text-white hover:bg-slate-600'
          } disabled:opacity-40`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={handleEndCall}
          disabled={callStatus === 'ended'}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}
