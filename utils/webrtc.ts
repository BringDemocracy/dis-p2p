
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
export const encodeSDP = (data: any): string => {
  if (!data) return "";
  try {
    // data is usually an RTCSessionDescription object
    return btoa(JSON.stringify(data));
  } catch (e) {
    console.error("Error encoding SDP", e);
    return "";
  }
};

export const decodeSDP = (encoded: string): any => {
  try {
    // Returns the RTCSessionDescription object
    return JSON.parse(atob(encoded));
  } catch (e) {
    console.error("Invalid SDP code", e);
    return null;
  }
};
