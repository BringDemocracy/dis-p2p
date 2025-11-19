
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

  // Determine avatar color based on senderId string
  const getAvatarColor = (id: string) => {
    if (id === 'me') return 'bg-[#5865F2]'; // Discord Blue
    if (id === 'peer') return 'bg-[#23a559]'; // Green
    if (id === 'system') return 'bg-gray-600';
    // Generate consistent random-ish color for usernames
    const colors = ['bg-red-500', 'bg-yellow-600', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-teal-500'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {messages.map((msg) => {
        const isSystem = msg.type === MessageType.SYSTEM;
        
        if (isSystem) {
          return (
            <div key={msg.id} className="flex items-center justify-center my-4 opacity-60 hover:opacity-100 transition-opacity">
              <div className="h-px bg-gray-600 flex-1 mr-4"></div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center px-2">{msg.content}</span>
              <div className="h-px bg-gray-600 flex-1 ml-4"></div>
            </div>
          );
        }

        const avatarColor = getAvatarColor(msg.senderId);
        const displayName = msg.senderName || (msg.senderId === 'me' ? 'Me' : (msg.senderId === 'peer' ? 'Peer' : msg.senderId));

        return (
          <div key={msg.id} className="flex group hover:bg-[#2e3035] -mx-4 px-4 py-1">
            <div className={`w-10 h-10 rounded-full flex-shrink-0 mr-4 ${avatarColor} flex items-center justify-center text-white font-bold overflow-hidden cursor-pointer`}>
               {/* Fallback to first letter if no image */}
               {displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline">
                <span className={`font-medium mr-2 ${msg.senderId === 'me' ? 'text-white' : 'text-gray-200'}`}>
                  {displayName}
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
