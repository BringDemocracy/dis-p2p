export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  AI = 'AI'
}

export interface Message {
  id: string;
  senderId: string; // 'me' | 'peer' | 'system' | 'ai'
  content: string;
  timestamp: number;
  type: MessageType;
  senderName?: string;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  PENDING = 'PENDING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface PeerConnectionState {
  status: ConnectionStatus;
  connectionId: string | null;
  error: string | null;
}