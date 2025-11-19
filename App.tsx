import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageType, ConnectionStatus, ChatMode, AuthResponse } from './types';
import { MessageList } from './components/MessageList';
import { ConnectionModal } from './components/ConnectionModal';
import { LoginModal } from './components/LoginModal';
import { encodeSDP, decodeSDP, rtcConfig } from './utils/webrtc';
import { io, Socket } from 'socket.io-client';

// Initialize socket outside component to avoid re-creation
let socket: Socket | null = null;

export default function App() {
  // -- App State --
  const [chatMode, setChatMode] = useState<ChatMode>(ChatMode.P2P);
  const [username, setUsername] = useState<string | null>(null);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  
  // -- Messages State --
  const [p2pMessages, setP2pMessages] = useState<Message[]>([
    {
      id: 'welcome-p2p',
      senderId: 'system',
      content: 'Welcome to P2P Mode. Messages are end-to-end encrypted and not saved.',
      timestamp: Date.now(),
      type: MessageType.SYSTEM
    }
  ]);

  const [serverMessages, setServerMessages] = useState<Message[]>([
    {
      id: 'welcome-server',
      senderId: 'system',
      content: 'Please login to access the server.',
      timestamp: Date.now(),
      type: MessageType.SYSTEM
    }
  ]);

  const [inputText, setInputText] = useState('');
  
  // -- P2P Specific State --
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [localOffer, setLocalOffer] = useState('');
  const [isHost, setIsHost] = useState(true);
  
  // -- Server Specific State --
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [serverConnected, setServerConnected] = useState(false);

  // Refs for WebRTC
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // -- Logic: Mode Switching --

  const handleModeSwitch = (mode: ChatMode) => {
    if (mode === ChatMode.SERVER && !username) {
      setIsLoginModalOpen(true);
    } else {
      setChatMode(mode);
    }
  };

  const handleLogin = (user: string, pass: string) => {
    setLoginError(null);
    
    // Initialize socket if not already done
    if (!socket) {
        // Connect to the backend running on port 3001 (via proxy in dev or direct)
        socket = io(); 
    }

    socket.connect();

    socket.emit('login', { username: user, password: pass }, (response: AuthResponse) => {
      if (response.success) {
        setUsername(user);
        setFriendCode(response.friendCode || null);
        
        if (response.history) {
            setServerMessages(response.history);
        }

        setIsLoginModalOpen(false);
        setChatMode(ChatMode.SERVER);
        setServerConnected(true);

        // Setup listeners
        socket?.on('new_message', (msg: Message) => {
            setServerMessages(prev => [...prev, msg]);
        });

        socket?.on('system_message', (data: {content: string}) => {
            const msg: Message = {
                id: Math.random().toString(),
                senderId: 'system',
                content: data.content,
                timestamp: Date.now(),
                type: MessageType.SYSTEM
            };
            setServerMessages(prev => [...prev, msg]);
        });

      } else {
        setLoginError(response.error || 'Login failed');
        socket?.disconnect();
      }
    });
  };

  // -- Logic: WebRTC (P2P) --

  const cleanupP2P = () => {
    dataChannel.current?.close();
    peerConnection.current?.close();
    dataChannel.current = null;
    peerConnection.current = null;
    setStatus(ConnectionStatus.DISCONNECTED);
    setLocalOffer('');
  };

  const setupPeerConnection = () => {
    cleanupP2P();
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate === null) {
        setLocalOffer(encodeSDP(pc.localDescription));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus(ConnectionStatus.CONNECTED);
        setIsConnectionModalOpen(false);
        addSystemMessage('Secure Peer Connection Established. Channel Open.', ChatMode.P2P);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus(ConnectionStatus.DISCONNECTED);
        addSystemMessage('Connection lost.', ChatMode.P2P);
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  const generateOffer = async () => {
    const pc = setupPeerConnection();
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

    try {
      await pc.setRemoteDescription(remoteDesc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
    } catch (e) {
      console.error("Error setting remote description:", e);
      alert("Failed to accept invite. Code might be invalid.");
    }
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
      setP2pMessages(prev => [...prev, { ...data, senderId: 'peer' }]);
    };
  };

  // -- Logic: Messaging --

  const addSystemMessage = (text: string, mode: ChatMode) => {
    const msg = {
      id: Math.random().toString(36),
      senderId: 'system',
      content: text,
      timestamp: Date.now(),
      type: MessageType.SYSTEM
    };
    
    if (mode === ChatMode.P2P) setP2pMessages(prev => [...prev, msg]);
    else setServerMessages(prev => [...prev, msg]);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    if (chatMode === ChatMode.P2P) {
      // Handle P2P Send
      const newMessage: Message = {
        id: Math.random().toString(36),
        senderId: 'me',
        content: inputText,
        timestamp: Date.now(),
        type: MessageType.TEXT
      };

      setP2pMessages(prev => [...prev, newMessage]);
      
      if (dataChannel.current && dataChannel.current.readyState === 'open') {
        dataChannel.current.send(JSON.stringify(newMessage));
      } else {
        if (status !== ConnectionStatus.CONNECTED) {
            addSystemMessage("Message not sent: No peer connected.", ChatMode.P2P);
        }
      }
    } else {
      // Handle Server Send via Socket
      if (!socket || !serverConnected) {
        addSystemMessage("Error: Not connected to server", ChatMode.SERVER);
        return;
      }

      const newMessage: Message = {
        id: Math.random().toString(36),
        senderId: username || 'Anonymous',
        senderName: username || 'Anonymous',
        content: inputText,
        timestamp: Date.now(),
        type: MessageType.TEXT
      };
      
      // Optimistic update? No, let's wait for server echo for real-time feel usually, 
      // but for responsiveness we can append local. 
      // However, with socket.io broadcast, we usually get it back. 
      // To avoid duplicate, server will broadcast to everyone including sender, 
      // or we append local and filter incoming. 
      // Simple way: Append local, don't process own ID from socket.
      // BUT simpler for chat: Emit, server broadcasts to ALL, including me.
      socket.emit('server_message', newMessage);
    }

    setInputText('');
  };

  const onProcessRemoteCode = (code: string) => {
    if (isHost) {
      completeConnection(code);
    } else {
      generateAnswer(code);
    }
  };

  // -- Render Helpers --

  const currentMessages = chatMode === ChatMode.P2P ? p2pMessages : serverMessages;

  return (
    <div className="flex h-screen overflow-hidden bg-[#313338]">
      {/* Sidebar */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-4 flex-shrink-0">
        
        {/* Server Mode Button */}
        <div className="group relative">
           <button 
            onClick={() => handleModeSwitch(ChatMode.SERVER)}
            className={`w-12 h-12 rounded-3xl flex items-center justify-center transition-all hover:rounded-xl group-hover:bg-[#5865F2] group-hover:text-white ${chatMode === ChatMode.SERVER ? 'bg-[#5865F2] text-white rounded-xl' : 'bg-[#313338] text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>
           <div className="absolute left-16 top-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
             Global Server Chat
          </div>
          {chatMode === ChatMode.SERVER && <div className="absolute -left-1 top-3 w-1 h-6 bg-white rounded-r-full"></div>}
        </div>

        <div className="w-8 h-[2px] bg-[#35363c] rounded-lg mx-auto"></div>

        {/* P2P Mode Button */}
        <div className="group relative">
          <button 
            onClick={() => handleModeSwitch(ChatMode.P2P)}
            className={`w-12 h-12 rounded-3xl flex items-center justify-center transition-all hover:rounded-xl group-hover:bg-green-600 group-hover:text-white ${chatMode === ChatMode.P2P ? 'bg-green-600 text-white rounded-xl' : 'bg-[#313338] text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
          <div className="absolute left-16 top-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
             P2P (Encrypted)
          </div>
           {chatMode === ChatMode.P2P && <div className="absolute -left-1 top-3 w-1 h-6 bg-white rounded-r-full"></div>}
        </div>

      </div>

      {/* Main Channel Area */}
      <div className="flex-1 flex flex-col bg-[#313338] relative min-w-0">
        {/* Header */}
        <div className="h-12 shadow-sm border-b border-[#26272d] flex items-center px-4 justify-between bg-[#313338] flex-shrink-0">
            <div className="flex items-center overflow-hidden">
                <div className="text-gray-400 mr-2 text-xl">#</div>
                <span className="font-bold text-white truncate">
                  {chatMode === ChatMode.P2P ? 'secure-p2p-direct' : 'public-server-chat'}
                </span>
                
                {chatMode === ChatMode.P2P ? (
                    status === ConnectionStatus.CONNECTED ? (
                        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold bg-green-600/20 text-green-400 border border-green-600/30 flex-shrink-0">
                          ENCRYPTED
                        </span>
                    ) : (
                        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-600/20 text-gray-400 border border-gray-600/30 flex-shrink-0">
                          OFFLINE
                        </span>
                    )
                ) : (
                  <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 flex-shrink-0">
                    LIVE SERVER
                  </span>
                )}
            </div>
            
            <div className="flex items-center space-x-4">
                {chatMode === ChatMode.P2P && (
                  <div className="text-gray-400 hover:text-gray-200 cursor-pointer" onClick={() => setIsConnectionModalOpen(true)} title="Connection Settings">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                  </div>
                )}
                {chatMode === ChatMode.SERVER && username && (
                  <div className="flex items-center gap-3">
                    {friendCode && (
                        <div className="hidden md:flex items-center text-xs text-gray-400 bg-[#1e1f22] px-2 py-1 rounded border border-gray-700">
                            <span className="uppercase tracking-wide mr-1 text-[10px] font-bold">Friend Code:</span>
                            <span className="font-mono text-[#5865F2] select-all">{friendCode}</span>
                        </div>
                    )}
                    <div className="flex items-center text-xs text-gray-400 bg-[#1e1f22] px-2 py-1 rounded">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {username}
                    </div>
                  </div>
                )}
            </div>
        </div>

        {/* Messages */}
        <MessageList messages={currentMessages} />

        {/* Input Area */}
        <div className="p-4 pt-0 flex-shrink-0">
          <div className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center shadow-inner">
            <button 
              onClick={() => chatMode === ChatMode.P2P && setIsConnectionModalOpen(true)}
              className="text-gray-400 hover:text-gray-200 mr-4 flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <form className="flex-1" onSubmit={handleSendMessage}>
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  chatMode === ChatMode.P2P 
                    ? (status === ConnectionStatus.CONNECTED ? "Message @Peer" : "Waiting for connection...") 
                    : `Message #${username || 'server'}`
                }
                disabled={(chatMode === ChatMode.P2P && status !== ConnectionStatus.CONNECTED)}
                className="w-full bg-transparent text-gray-200 outline-none placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConnectionModal 
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        status={status}
        localOffer={localOffer}
        onGenerateOffer={generateOffer}
        onProcessRemote={onProcessRemoteCode}
        isHost={isHost}
        setIsHost={setIsHost}
      />
      
      <LoginModal 
        isOpen={isLoginModalOpen}
        onLogin={handleLogin}
        onCancel={() => setChatMode(ChatMode.P2P)}
        error={loginError}
      />
    </div>
  );
}