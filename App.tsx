import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType, ConnectionStatus } from './types';
import { MessageList } from './components/MessageList';
import { ConnectionModal } from './components/ConnectionModal';
import { encodeSDP, decodeSDP, rtcConfig } from './utils/webrtc';
import { analyzeChat } from './services/geminiService';

export default function App() {
  // -- State --
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      senderId: 'system',
      content: 'Welcome to Nexus P2P. Start a secure handshake to chat.',
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
      // Normally you'd trickle these, but for manual copy-paste, we need one big string.
      if (event.candidate === null) {
        setLocalOffer(encodeSDP(JSON.stringify(pc.localDescription)));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection State:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        setStatus(ConnectionStatus.CONNECTED);
        setIsModalOpen(false);
        addSystemMessage('Secure Peer Connection Established. Data channel is open.');
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
    // Wait for ICE gathering to complete (handled in onicecandidate)
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
    // Wait for ICE gathering for the answer
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

    // Gemini Command Check
    if (inputText.startsWith('/ai ')) {
        const prompt = inputText.replace('/ai ', '');
        handleAiRequest(prompt);
        setInputText('');
        return;
    }

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
    } else if (status !== ConnectionStatus.CONNECTED) {
        // addSystemMessage("Not connected. Message only shown locally.");
    }
  };

  const handleAiRequest = async (prompt: string) => {
      // Show user query
      const userMsg: Message = {
          id: Math.random().toString(),
          senderId: 'me',
          content: `/ai ${prompt}`,
          timestamp: Date.now(),
          type: MessageType.TEXT
      };
      setMessages(prev => [...prev, userMsg]);

      // Show loading
      const loadingId = Math.random().toString();
      setMessages(prev => [...prev, {
          id: loadingId,
          senderId: 'ai',
          senderName: 'Gemini',
          content: 'Thinking...',
          timestamp: Date.now(),
          type: MessageType.AI
      }]);

      const response = await analyzeChat(messages, prompt);

      // Replace loading with response
      setMessages(prev => prev.map(m => 
          m.id === loadingId 
          ? { ...m, content: response } 
          : m
      ));
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
      {/* Sidebar */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-2">
        <div className="w-12 h-12 bg-[#5865F2] rounded-2xl flex items-center justify-center text-white hover:rounded-xl transition-all cursor-pointer shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        </div>
        
        <div className="w-8 h-[2px] bg-[#35363c] rounded-lg mx-auto"></div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className={`w-12 h-12 rounded-3xl flex items-center justify-center transition-all hover:rounded-xl group ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 text-white' : 'bg-[#313338] text-green-500 hover:bg-green-500 hover:text-white'}`}
          title="Connection Manager"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#313338] relative">
        {/* Header */}
        <div className="h-12 shadow-sm border-b border-[#26272d] flex items-center px-4 justify-between bg-[#313338]">
            <div className="flex items-center">
                <div className="text-gray-400 mr-2">#</div>
                <span className="font-bold text-white">secure-chat</span>
                {status === ConnectionStatus.CONNECTED && (
                     <span className="ml-3 px-2 py-0.5 rounded text-[10px] bg-green-600/20 text-green-400 border border-green-600/30">ENCRYPTED</span>
                )}
            </div>
            
            <div className="flex items-center space-x-4">
                <button 
                    onClick={() => handleAiRequest("Summarize our conversation so far.")}
                    className="text-gray-300 hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                    title="Ask Gemini to summarize chat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Ask AI
                </button>
                <div className="text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                 <div className="text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
        </div>

        {/* Messages */}
        <MessageList messages={messages} />

        {/* Input Area */}
        <div className="p-4 pt-0">
          <div className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center">
            <button className="text-gray-400 hover:text-gray-200 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <form className="flex-1" onSubmit={handleSendMessage}>
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={status === ConnectionStatus.CONNECTED ? "Message #secure-chat (start with /ai to ask bot)" : "Offline. Use /ai or connect to a peer."}
                className="w-full bg-transparent text-gray-200 outline-none placeholder-gray-500"
              />
            </form>
            <div className="flex items-center space-x-3 ml-2">
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