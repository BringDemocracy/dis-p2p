import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from '../types';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConnectionStatus;
  localOffer: string;
  onGenerateOffer: () => void;
  onProcessRemote: (code: string) => void;
  isHost: boolean;
  setIsHost: (val: boolean) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  status,
  localOffer,
  onGenerateOffer,
  onProcessRemote,
  isHost,
  setIsHost
}) => {
  const [remoteCode, setRemoteCode] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (isOpen && isHost && !localOffer) {
        onGenerateOffer();
    }
  }, [isOpen, isHost, localOffer, onGenerateOffer]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (localOffer) {
      try {
        await navigator.clipboard.writeText(localOffer);
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      } catch (err) {
        setCopySuccess('Failed to copy');
      }
    }
  };

  const handleConnect = () => {
    if (remoteCode) {
      onProcessRemote(remoteCode);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#313338] w-full max-w-lg p-6 rounded-lg shadow-2xl border border-[#1e1f22]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {status === ConnectionStatus.CONNECTED ? 'Secure Connection Established' : 'Start Secure Connection'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status === ConnectionStatus.CONNECTED ? (
           <div className="text-center py-8">
             <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
               </svg>
             </div>
             <p className="text-green-400 font-medium">End-to-End Encrypted Channel Active</p>
             <button onClick={onClose} className="mt-6 bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-2 rounded transition-colors">
               Return to Chat
             </button>
           </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex bg-[#1e1f22] p-1 rounded mb-6">
              <button 
                onClick={() => setIsHost(true)}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${isHost ? 'bg-[#404249] text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Create Invite (Host)
              </button>
              <button 
                onClick={() => setIsHost(false)}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${!isHost ? 'bg-[#404249] text-white shadow' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Join Invite (Peer)
              </button>
            </div>

            <div className="space-y-6">
              {isHost ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                      1. Share this Invitation Code
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={localOffer}
                        placeholder="Generating secure keys..."
                        className="w-full bg-[#1e1f22] text-gray-200 text-sm p-3 rounded border-none focus:ring-2 focus:ring-[#5865F2] outline-none font-mono"
                      />
                      <button 
                        onClick={handleCopy}
                        className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 rounded transition-colors font-medium"
                      >
                        {copySuccess || 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Send this code to your friend via a secure channel.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                      2. Paste their Response Code
                    </label>
                    <textarea 
                       value={remoteCode}
                       onChange={(e) => setRemoteCode(e.target.value)}
                       placeholder="Paste the code they sent back here..."
                       className="w-full bg-[#1e1f22] text-gray-200 text-sm p-3 rounded border-none focus:ring-2 focus:ring-[#5865F2] outline-none font-mono h-24 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                      1. Paste Invitation Code
                    </label>
                     <textarea 
                       value={remoteCode}
                       onChange={(e) => setRemoteCode(e.target.value)}
                       placeholder="Paste the code from the Host here..."
                       className="w-full bg-[#1e1f22] text-gray-200 text-sm p-3 rounded border-none focus:ring-2 focus:ring-[#5865F2] outline-none font-mono h-24 resize-none"
                    />
                  </div>
                  
                  {localOffer && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                        2. Send this Response Code back
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={localOffer}
                          className="w-full bg-[#1e1f22] text-gray-200 text-sm p-3 rounded border-none focus:ring-2 focus:ring-[#5865F2] outline-none font-mono"
                        />
                        <button 
                          onClick={handleCopy}
                          className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 rounded transition-colors font-medium"
                        >
                          {copySuccess || 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleConnect}
                disabled={status === ConnectionStatus.PENDING && !remoteCode}
                className="w-full bg-[#23a559] hover:bg-[#1a8c48] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded font-semibold transition-colors"
              >
                {isHost 
                  ? (status === ConnectionStatus.PENDING ? 'Processing...' : 'Verify & Connect') 
                  : (localOffer ? 'Wait for Host...' : 'Generate Response')
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};