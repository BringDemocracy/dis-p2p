// We use a configuration that relies on Google's public STUN servers to punch through NATs.
export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const generateConnectionId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Helper to compress SDP for easier copy-pasting (simple base64)
export const encodeSDP = (sdp: string | undefined): string => {
  if (!sdp) return "";
  return btoa(JSON.stringify(sdp));
};

export const decodeSDP = (encoded: string): any => {
  try {
    return JSON.parse(atob(encoded));
  } catch (e) {
    console.error("Invalid SDP code", e);
    return null;
  }
};