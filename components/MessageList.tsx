import React, { useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {messages.map((msg) => {
        const isSystem = msg.type === MessageType.SYSTEM;
        const isAI = msg.type === MessageType.AI;
        
        if (isSystem) {
          return (
            <div key={msg.id} className="flex items-center justify-center my-4 opacity-60 hover:opacity-100 transition-opacity">
              <div className="h-px bg-gray-600 flex-1 mr-4"></div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{msg.content}</span>
              <div className="h-px bg-gray-600 flex-1 ml-4"></div>
            </div>
          );
        }

        return (
          <div key={msg.id} className={`flex group ${isAI ? 'bg-blue-500/10 -mx-4 px-4 py-2 border-l-2 border-blue-400' : 'hover:bg-[#2e3035] -mx-4 px-4 py-1'}`}>
            <div className="w-10 h-10 rounded-full flex-shrink-0 mr-4 bg-gray-600 overflow-hidden cursor-pointer">
                {isAI ? (
                     <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                         </svg>
                     </div>
                ) : (
                    <img 
                        src={`https://picsum.photos/seed/${msg.senderId}/200/200`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                    />
                )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline">
                <span className={`font-medium mr-2 ${
                    msg.type === MessageType.AI ? 'text-blue-400' : 
                    msg.senderId === 'me' ? 'text-white' : 'text-green-400'
                }`}>
                  {msg.senderName || (msg.senderId === 'me' ? 'Me' : 'Peer')}
                  {isAI && <span className="ml-1 text-[10px] bg-blue-500 text-white px-1 rounded">BOT</span>}
                </span>
                <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
              </div>
              <div className={`text-gray-300 whitespace-pre-wrap break-words leading-relaxed ${isAI ? 'text-sm mt-1' : ''}`}>
                {msg.content}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};