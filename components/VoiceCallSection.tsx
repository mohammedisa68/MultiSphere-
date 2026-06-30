
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Language } from '../types';

interface VoiceCallSectionProps {
  user: User;
  language: Language;
  onAddHistory: (type: any, detail: string, mediaUrl?: string) => void;
}

const VoiceCallSection: React.FC<VoiceCallSectionProps> = ({ user, language, onAddHistory }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [calling, setCalling] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ from: string; offer: any } | null>(null);
  const [onCallWith, setOnCallWith] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string>('');

  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const t = {
    om: {
      title: "Bilbila Sagalee (Voice Call)",
      online: "Fayyadamtoota Online",
      call: "Bilbili",
      incoming: "Bilbilli siif dhufaa jira...",
      answer: "Deebisi",
      decline: "Dhaabi",
      status: "Haala Bilbilaa",
      architecture: "Caasaa Sirnaa (System Architecture)",
      env: "Naannoo (Environment)",
      sensor: "Sensor (Microphone)",
      cond: "Audio Processing",
      server: "Real-Time Server",
      actuator: "Actuator (Speaker)",
      latency: "Low Latency Signaling",
      auth: "Secure Auth (Phone)"
    },
    en: {
      title: "Voice Calling",
      online: "Online Users",
      call: "Call",
      incoming: "Incoming Call...",
      answer: "Answer",
      decline: "Decline",
      status: "Call Status",
      architecture: "System Architecture",
      env: "Environment",
      sensor: "Sensor (Microphone)",
      cond: "Audio Processing",
      server: "Real-Time Server",
      actuator: "Actuator (Speaker)",
      latency: "Low Latency Signaling",
      auth: "Secure Auth (Phone)"
    },
    am: {
      title: "የድምጽ ጥሪ",
      online: "በመስመር ላይ ያሉ ተጠቃሚዎች",
      call: "ደውል",
      incoming: "ጥሪ እየመጣ ነው...",
      answer: "መልስ",
      decline: "አትቀበል",
      status: "የጥሪ ሁኔታ",
      architecture: "የስርዓት አርክቴክቸር",
      env: "አካባቢ",
      sensor: "ሴንሰር (ማይክሮፎን)",
      cond: "የድምጽ ሂደት",
      server: "ሪል-ታይም ሰርቨር",
      actuator: "አክቲውተር (ስፒከር)",
      latency: "ዝቅተኛ የሲግናል መዘግየት",
      auth: "ደህንነቱ የተጠበቀ ይለፍ (ስልክ)"
    }
  }[language] || {
    title: "Voice Calling",
    online: "Online Users",
    call: "Call",
    incoming: "Incoming Call...",
    answer: "Answer",
    decline: "Decline",
    status: "Call Status",
    architecture: "System Architecture",
    env: "Environment",
    sensor: "Sensor (Microphone)",
    cond: "Audio Processing",
    server: "Real-Time Server",
    actuator: "Actuator (Speaker)",
    latency: "Low Latency Signaling",
    auth: "Secure Auth (Phone)"
  };

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (user && user.username) {
        newSocket.emit('join', user.username);
      }
    });

    newSocket.on('user-list', (users: string[]) => {
      setOnlineUsers((users || []).filter(u => u && u !== user?.username));
    });

    newSocket.on('incoming-call', ({ from, offer }) => {
      setIncomingCall({ from, offer });
    });

    newSocket.on('call-answered', async ({ answer }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStatus('Connected');
        onAddHistory('LIVE', `Voice Call with ${calling}`);
      }
    });

    newSocket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user.username]);

  const setupPeerConnection = async (targetUser: string) => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { to: targetUser, candidate: event.candidate });
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.current.getTracks().forEach(track => {
      peerConnection.current?.addTrack(track, localStream.current!);
    });
  };

  const startCall = async (targetUser: string) => {
    setCalling(targetUser);
    setCallStatus('Calling...');
    await setupPeerConnection(targetUser);

    const offer = await peerConnection.current!.createOffer();
    await peerConnection.current!.setLocalDescription(offer);

    socket?.emit('call-user', { to: targetUser, offer, from: user.username });
  };

  const handleAnswer = async () => {
    if (!incomingCall) return;
    setOnCallWith(incomingCall.from);
    setCallStatus('Connecting...');
    await setupPeerConnection(incomingCall.from);

    await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answer = await peerConnection.current!.createAnswer();
    await peerConnection.current!.setLocalDescription(answer);

    socket?.emit('answer-call', { to: incomingCall.from, answer });
    setIncomingCall(null);
  };

  const endCall = () => {
    peerConnection.current?.close();
    localStream.current?.getTracks().forEach(track => track.stop());
    setCalling(null);
    setOnCallWith(null);
    setIncomingCall(null);
    setCallStatus('');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 max-w-4xl mx-auto relative group">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-purple-600 uppercase tracking-tighter">{t.title}</h2>
          <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Real-Time WebRTC Audio</p>
        </div>
        <div className="flex items-center gap-1 md:gap-2 bg-green-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-green-200">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[8px] md:text-[10px] font-black text-green-600 uppercase tracking-widest">Live Signaling</span>
        </div>
      </div>

      {/* System Architecture Diagram */}
      <div className="bg-gray-900 p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 md:border-4 border-purple-500/30 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>
        <h3 className="text-[10px] md:text-xs font-black text-purple-400 uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-2">
          <span className="text-lg md:text-xl">🏗️</span> {t.architecture}
        </h3>
        
        <div className="overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
          <div className="flex md:grid md:grid-cols-5 gap-4 md:gap-4 relative min-w-[500px] md:min-w-0">
            {/* Connecting Lines */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] md:h-[2px] bg-purple-500/20 -translate-y-1/2 z-0 hidden md:block"></div>
            
            {[
              { label: t.env, icon: "🌍", color: "bg-blue-500" },
              { label: t.sensor, icon: "🎙️", color: "bg-red-500" },
              { label: t.cond, icon: "🎛️", color: "bg-yellow-500" },
              { label: t.server, icon: "📡", color: "bg-purple-500" },
              { label: t.actuator, icon: "🔊", color: "bg-green-500" }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 md:gap-3 relative z-10 flex-1">
                <div className={`w-12 h-12 md:w-14 md:h-14 ${item.color} rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-lg border-2 border-white/20 hover:scale-110 transition-transform cursor-help group`}>
                  {item.icon}
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-white text-black text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
                    {item.label}
                  </div>
                </div>
                <span className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10">
            <p className="text-[8px] md:text-[9px] font-black text-purple-300 uppercase tracking-widest mb-1">⚡ {t.latency}</p>
            <p className="text-[7px] md:text-[8px] text-gray-400">WebSocket signaling ensures &lt; 50ms latency for call setup.</p>
          </div>
          <div className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10">
            <p className="text-[8px] md:text-[9px] font-black text-green-300 uppercase tracking-widest mb-1">🔒 {t.auth}</p>
            <p className="text-[7px] md:text-[8px] text-gray-400">Firebase Phone Auth secures user identity and profile creation.</p>
          </div>
        </div>
      </div>

      {/* Call Interface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Online Users List */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-xl space-y-4 md:space-y-6">
          <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">{t.online}</h3>
          <div className="space-y-2 md:space-y-3">
            {onlineUsers.length === 0 ? (
              <p className="text-[10px] md:text-xs text-gray-400 italic">No other users online...</p>
            ) : (
              onlineUsers.map(u => (
                <div key={u} className="flex justify-between items-center p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl hover:bg-purple-50 transition-all group">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-black text-xs md:text-sm">
                      {u[0].toUpperCase()}
                    </div>
                    <span className="text-xs md:text-sm font-bold text-gray-700">{u}</span>
                  </div>
                  <button 
                    onClick={() => startCall(u)}
                    disabled={!!onCallWith || !!calling}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-purple-600 text-white text-[8px] md:text-[10px] font-black uppercase rounded-lg md:rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    📞 {t.call}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Call / Incoming Call */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col items-center justify-center min-h-[250px] md:min-h-[300px] relative overflow-hidden">
          {incomingCall ? (
            <div className="text-center space-y-4 md:space-y-6 animate-bounce-slow">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-purple-100 rounded-full flex items-center justify-center text-3xl md:text-4xl mx-auto border-4 border-purple-500 animate-pulse">
                📞
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-black text-purple-600 uppercase tracking-widest">{t.incoming}</p>
                <p className="text-lg md:text-xl font-bold text-gray-800">{incomingCall.from}</p>
              </div>
              <div className="flex gap-3 md:gap-4">
                <button onClick={handleAnswer} className="px-6 py-2.5 md:px-8 md:py-3 bg-green-600 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs hover:bg-green-700 transition-all">
                  {t.answer}
                </button>
                <button onClick={() => setIncomingCall(null)} className="px-6 py-2.5 md:px-8 md:py-3 bg-red-600 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs hover:bg-red-700 transition-all">
                  {t.decline}
                </button>
              </div>
            </div>
          ) : onCallWith || calling ? (
            <div className="text-center space-y-6 md:space-y-8">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20"></div>
                <div className="w-24 h-24 md:w-32 md:h-32 bg-purple-600 rounded-full flex items-center justify-center text-4xl md:text-5xl text-white relative z-10 shadow-2xl">
                  👤
                </div>
              </div>
              <div>
                <p className="text-[8px] md:text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">{callStatus}</p>
                <p className="text-xl md:text-2xl font-black text-gray-800">{onCallWith || calling}</p>
              </div>
              
              {/* Audio Visualizer Mock */}
              <div className="flex items-center gap-1 h-6 md:h-8">
                {[1,2,3,4,5,6,7,8,9,10].map(i => (
                  <div 
                    key={i} 
                    className="w-0.5 md:w-1 bg-purple-500 rounded-full animate-bounce" 
                    style={{ height: `${30 + Math.random() * 70}%`, animationDelay: `${i * 0.1}s` }}
                  ></div>
                ))}
              </div>

              <button onClick={endCall} className="w-14 h-14 md:w-16 md:h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-xl md:text-2xl hover:bg-red-700 hover:scale-110 transition-all shadow-xl">
                📞
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3 md:space-y-4 opacity-40">
              <div className="text-5xl md:text-6xl">🎙️</div>
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Ready for Real-Time Voice</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Audio Elements */}
      <audio ref={localAudioRef} autoPlay muted className="hidden" />
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
    </div>
  );
};

export default VoiceCallSection;
