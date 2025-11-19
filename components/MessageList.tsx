
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
          <div key={msg.id} className="flex group hover:bg-[#2e3035] -mx-4 px-4 py-1">
            <div className="w-10 h-10 rounded-full flex-shrink-0 mr-4 bg-gray-600 overflow-hidden cursor-pointer">
                <img 
                    src={`https://picsum.photos/seed/${msg.senderId}/200/200`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline">
                <span className={`font-medium mr-2 ${msg.senderId === 'me' ? 'text-white' : 'text-green-400'}`}>
                  {msg.senderName || (msg.senderId === 'me' ? 'Me' : 'Peer')}
                </span>
                <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
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
