
import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType, ConnectionStatus } from './types';
import { MessageList } from './components/MessageList';
import { ConnectionModal } from './components/ConnectionModal';
import { encodeSDP, decodeSDP, rtcConfig } from './utils/webrtc';

export default function App() {
  // -- State --
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      senderId: 'system',
      content: 'Welcome to Nexus P2P. Encrypted, serverless communication.',
      timestamp: Date.now(),
      type: MessageType.SYSTEM
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // WebRTC State
  const [localOffer, setLocalOffer] = useState('');
  const [isHost, setIsHost] = useState(true);
  
  // Refs for persistence without re-renders
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);

  // -- WebRTC Logic --

  const cleanup = () => {
    dataChannel.current?.close();
    peerConnection.current?.close();
    dataChannel.current = null;
    peerConnection.current = null;
    setStatus(ConnectionStatus.DISCONNECTED);
    setLocalOffer('');
  };

  const setupPeerConnection = () => {
    cleanup();
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      // In a real manual copy-paste scenario, we wait for all candidates (null) to generate a single "blob"
      if (event.candidate === null) {
        setLocalOffer(encodeSDP(JSON.stringify(pc.localDescription)));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection State:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        setStatus(ConnectionStatus.CONNECTED);
        setIsModalOpen(false);
        addSystemMessage('Secure Peer Connection Established. Channel Open.');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus(ConnectionStatus.DISCONNECTED);
        addSystemMessage('Connection lost.');
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  const generateOffer = async () => {
    const pc = setupPeerConnection();
    // Host creates data channel
    const dc = pc.createDataChannel("chat");
    setupDataChannel(dc);
    dataChannel.current = dc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  };

  const generateAnswer = async (remoteOfferCode: string) => {
    const pc = setupPeerConnection();
    
    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
      dataChannel.current = event.channel;
    };

    const remoteDesc = decodeSDP(remoteOfferCode);
    if (!remoteDesc) return alert("Invalid code");

    await pc.setRemoteDescription(remoteDesc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
  };

  const completeConnection = async (remoteAnswerCode: string) => {
    if (!peerConnection.current) return;
    const remoteDesc = decodeSDP(remoteAnswerCode);
    if (!remoteDesc) return alert("Invalid code");
    
    try {
      await peerConnection.current.setRemoteDescription(remoteDesc);
    } catch (e) {
      console.error(e);
      alert("Failed to establish connection. Ensure codes are correct.");
    }
  };

  const setupDataChannel = (dc: RTCDataChannel) => {
    dc.onopen = () => {
        setStatus(ConnectionStatus.CONNECTED);
    };
    dc.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setMessages(prev => [...prev, { ...data, senderId: 'peer' }]);
    };
  };

  // -- UI Handlers --

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36),
      senderId: 'system',
      content: text,
      timestamp: Date.now(),
      type: MessageType.SYSTEM
    }]);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Math.random().toString(36),
      senderId: 'me',
      content: inputText,
      timestamp: Date.now(),
      type: MessageType.TEXT
    };

    // Update local UI
    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Send over P2P if connected
    if (dataChannel.current && dataChannel.current.readyState === 'open') {
      dataChannel.current.send(JSON.stringify(newMessage));
    }
  };

  const onProcessRemoteCode = (code: string) => {
    if (isHost) {
      completeConnection(code);
    } else {
      generateAnswer(code);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#313338]">
      {/* Sidebar (Discord-style) */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-2 flex-shrink-0">
        {/* Home / P2P Icon */}
        <div className="w-12 h-12 bg-[#5865F2] rounded-2xl flex items-center justify-center text-white hover:rounded-xl transition-all cursor-pointer shadow-lg mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        
        <div className="w-8 h-[2px] bg-[#35363c] rounded-lg mx-auto"></div>

        {/* Connection Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className={`w-12 h-12 rounded-3xl flex items-center justify-center transition-all hover:rounded-xl group relative ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 text-white' : 'bg-[#313338] text-green-500 hover:bg-green-500 hover:text-white'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <div className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
             {status === ConnectionStatus.CONNECTED ? 'Connection Details' : 'Start Connection'}
          </div>
        </button>
      </div>

      {/* Main Channel Area */}
      <div className="flex-1 flex flex-col bg-[#313338] relative min-w-0">
        {/* Header */}
        <div className="h-12 shadow-sm border-b border-[#26272d] flex items-center px-4 justify-between bg-[#313338] flex-shrink-0">
            <div className="flex items-center overflow-hidden">
                <div className="text-gray-400 mr-2 text-xl">#</div>
                <span className="font-bold text-white truncate">secure-p2p-chat</span>
                {status === ConnectionStatus.CONNECTED ? (
                     <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold bg-green-600/20 text-green-400 border border-green-600/30 flex-shrink-0">
                       ENCRYPTED
                     </span>
                ) : (
                    <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-600/20 text-gray-400 border border-gray-600/30 flex-shrink-0">
                       OFFLINE
                     </span>
                )}
            </div>
            
            <div className="flex items-center space-x-4">
                <div className="text-gray-400 hover:text-gray-200 cursor-pointer" onClick={() => setIsModalOpen(true)} title="Connection Settings">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                 <div className="text-gray-400 hover:text-gray-200 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
        </div>

        {/* Messages */}
        <MessageList messages={messages} />

        {/* Input Area */}
        <div className="p-4 pt-0 flex-shrink-0">
          <div className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center shadow-inner">
            <button className="text-gray-400 hover:text-gray-200 mr-4 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <form className="flex-1" onSubmit={handleSendMessage}>
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={status === ConnectionStatus.CONNECTED 
                    ? "Message #secure-p2p-chat" 
                    : "You are offline. Click the + button to connect to a peer."}
                className="w-full bg-transparent text-gray-200 outline-none placeholder-gray-500"
              />
            </form>
            <div className="flex items-center space-x-3 ml-2 flex-shrink-0">
                <button className="text-gray-400 hover:text-gray-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Manager Modal */}
      <ConnectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        status={status}
        localOffer={localOffer}
        onGenerateOffer={generateOffer}
        onProcessRemote={onProcessRemoteCode}
        isHost={isHost}
        setIsHost={setIsHost}
      />
    </div>
  );
}
