import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow connections from anywhere (needed for Codespaces)
    methods: ["GET", "POST"]
  }
});

// --- In-Memory Storage (Reset on restart) ---
const users = new Map(); // username -> { password, friendCode, socketId, isOnline }
const friendCodes = new Map(); // friendCode -> username
const messages = []; // Global history for the 'server' room

const generateFriendCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('login', ({ username, password }, callback) => {
    const existingUser = users.get(username);

    if (existingUser) {
      // Check password
      if (existingUser.password === password) {
        existingUser.socketId = socket.id;
        existingUser.isOnline = true;
        users.set(username, existingUser);
        
        // Join global room
        socket.join('global-server-chat');
        
        callback({ 
          success: true, 
          friendCode: existingUser.friendCode,
          history: messages 
        });
        
        // Notify others
        io.to('global-server-chat').emit('system_message', {
          content: `${username} has joined the server.`
        });
      } else {
        callback({ success: false, error: "Invalid password" });
      }
    } else {
      // Create new user
      const friendCode = generateFriendCode();
      const newUser = {
        username,
        password, // In real app, hash this!
        friendCode,
        socketId: socket.id,
        isOnline: true
      };
      
      users.set(username, newUser);
      friendCodes.set(friendCode, username);
      
      socket.join('global-server-chat');
      
      callback({ 
        success: true, 
        friendCode,
        history: messages
      });

      io.to('global-server-chat').emit('system_message', {
        content: `Welcome new user ${username} to the server!`
      });
    }
  });

  socket.on('server_message', (msgData) => {
    // Store message
    const message = {
      ...msgData,
      timestamp: Date.now()
    };
    
    // Keep only last 100 messages
    if (messages.length > 100) messages.shift();
    messages.push(message);

    // Broadcast to everyone in the room
    io.to('global-server-chat').emit('new_message', message);
  });

  socket.on('disconnect', () => {
    // Find user by socketId to mark offline
    for (const [username, user] of users.entries()) {
      if (user.socketId === socket.id) {
        user.isOnline = false;
        users.set(username, user);
        break;
      }
    }
    console.log('Client disconnected');
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});