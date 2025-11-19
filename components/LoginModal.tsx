import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (username: string, password: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLogin, onCancel, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      onLogin(username.trim(), password.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#313338] w-full max-w-md p-6 rounded-lg shadow-2xl border border-[#1e1f22]">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Secure Server Login</h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Enter your credentials to access the persistent server channel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-[#1e1f22] text-gray-200 text-sm p-3 rounded border-none focus:ring-2 focus:ring-[#5865F2] outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full bg-[#1e1f22] text-gray-200 text-sm p-3 rounded border-none focus:ring-2 focus:ring-[#5865F2] outline-none"
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs text-center font-medium bg-red-500/10 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-transparent hover:underline text-gray-400 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!username.trim() || !password.trim()}
              className="flex-1 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded font-semibold transition-colors"
            >
              Login / Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};