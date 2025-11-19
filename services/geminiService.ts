import { GoogleGenAI } from "@google/genai";
import { Message, MessageType } from "../types";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeChat = async (
  messages: Message[], 
  prompt: string
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Error: Gemini API Key is missing. Please configure your environment.";

  // Convert chat history to a readable format for the model
  const conversationHistory = messages
    .filter(m => m.type !== MessageType.SYSTEM)
    .map(m => `${m.senderName || (m.senderId === 'me' ? 'User' : 'Peer')}: ${m.content}`)
    .join('\n');

  const fullPrompt = `
    You are a helpful AI assistant inside a private P2P encrypted chat application.
    
    Here is the recent conversation history:
    ---
    ${conversationHistory}
    ---
    
    User's Request: ${prompt}
    
    Please provide a concise and helpful response based on the context.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};