# Nexus P2P Secure Chat

A serverless, end-to-end encrypted instant messaging application that runs directly in your browser using WebRTC.

## Features

- **100% Serverless**: Messages go directly from your device to your peer's device. Nothing is stored on any server.
- **End-to-End Encrypted**: Powered by standard WebRTC encryption (DTLS/SRTP).
- **No Sign-up Required**: Just generate a code and share it.
- **Discord-like UI**: Familiar, dark-mode interface for ease of use.

## How to Use

This application uses a "Manual Signaling" approach to establish a connection without a central signaling server (Zero Trust).

1. **Host (Person A)**:
   - Click the "Start Connection" button (or the plug icon).
   - Select **Create Invite (Host)**.
   - Copy the generated code.
   - Send this code to Person B via another secure channel (Signal, encrypted email, etc.).

2. **Guest (Person B)**:
   - Open the app.
   - Click "Start Connection".
   - Select **Join Invite (Peer)**.
   - Paste the code from Person A into the first box.
   - Click **Generate Response**.
   - Copy the new code that appears.
   - Send this response code back to Person A.

3. **Host (Person A)**:
   - Paste the response code from Person B into the second box ("Paste their Response Code").
   - Click **Verify & Connect**.

4. **Connected!**: You can now chat in real-time.

## Privacy

- No message history is persisted after the tab is closed.
- No IP logging (connection is direct peer-to-peer).
- Uses Google's public STUN servers only for NAT traversal (finding your IP address to route the packets).

## Development

To run locally:

```bash
npm install
npm run dev
```
