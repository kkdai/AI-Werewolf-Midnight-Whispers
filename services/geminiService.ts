import { GoogleGenAI, Type } from "@google/genai";
import { Player, Role, VoteResult, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for Models
const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

// Helper to format players for prompts
const formatPlayerList = (players: Player[]) => {
  return players.map(p => 
    `- ${p.name} (ID: ${p.id}): ${p.isAlive ? 'Alive' : 'Dead'}. ${p.isUser ? '(USER)' : ''} Bio: ${p.bio}`
  ).join('\n');
};

const formatChatHistory = (messages: ChatMessage[]) => {
  return messages.slice(-15).map(m => `${m.senderName}: ${m.content}`).join('\n');
};

/**
 * Generates the initial game setup narration and assigns roles context implicitly for the AI.
 */
export const generateIntro = async (players: Player[]): Promise<string> => {
  const prompt = `
    你現在是一場狼人殺遊戲的主持人 (Game Master)。
    
    玩家列表與角色分配 (這是秘密，絕對不能在公開敘述中直接透露誰是狼人):
    ${players.map(p => `- ${p.name}: ${p.role} (${p.bio})`).join('\n')}
    
    今天是遊戲的第一天。請生成一段開場白，描述這個偏遠村莊的早晨氛圍，並告訴大家村裡發生了一起命案（但不知道兇手是誰）。
    氣氛應該是懸疑、緊張的。請用繁體中文回答，不超過 150 字。
  `;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });

  return response.text || "遊戲開始...";
};

/**
 * Generates an image using Nano Banana (gemini-2.5-flash-image).
 */
export const generateGameImage = async (context: string, day: number, phase: 'Day' | 'Night'): Promise<string | null> => {
  const prompt = `
    An oil painting style illustration for a werewolf game.
    Setting: A medieval village. 
    Time: ${phase}. Day ${day}.
    Context: ${context}
    Atmosphere: Mysterious, tense, dark fantasy. 
    No text in the image.
  `;

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};

/**
 * Generates NPC dialogue responses based on user input.
 */
export const generateNPCResponse = async (
  players: Player[],
  chatHistory: ChatMessage[],
  userMessage: string
): Promise<ChatMessage[]> => {
  const aliveNPCs = players.filter(p => !p.isUser && p.isAlive);
  if (aliveNPCs.length === 0) return [];

  const prompt = `
    你負責扮演狼人殺遊戲中的 NPC。
    
    目前存活的玩家列表 (包含 ID 用於回傳):
    ${players.map(p => `- ID: "${p.id}" | 名字: "${p.name}" | 角色: "${p.role}" (保密) | 特徵與個性: "${p.bio}"`).join('\n')}
    
    對話紀錄:
    ${formatChatHistory(chatHistory)}
    玩家 (ID: user) 說: "${userMessage}"
    
    任務:
    請從存活的 NPC (非 User) 中選擇 1 到 2 位對玩家的話做出反應。
    
    規則:
    1. 必須使用上述列表中精確的 ID 填入 senderId。
    2. 回應內容必須生動且符合該角色的"特徵與個性"。
       - 例如老村長說話應緩慢、語重心長；鐵匠應直率粗魯。
    3. 角色扮演:
       - 狼人 NPC 應該試圖隱藏身分，表現得像無辜村民。
       - 村民 NPC 應該根據性格懷疑他人。
       - 預言家 NPC 應該隱晦地提示或謹慎行事。
    
    請以 JSON 陣列格式回傳回應，格式如下:
    [
      { "senderId": "player_id", "content": "回應內容" }
    ]
    請只回傳 JSON，不要 markdown 格式。回應請用繁體中文。
  `;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            senderId: { type: Type.STRING },
            content: { type: Type.STRING },
          },
          required: ["senderId", "content"]
        }
      }
    }
  });

  try {
    const rawText = response.text || "[]";
    const responses = JSON.parse(rawText);
    
    return responses.map((r: any) => {
      const npc = players.find(p => p.id === r.senderId);
      return {
        id: crypto.randomUUID(),
        senderId: r.senderId,
        senderName: npc ? npc.name : "Unknown",
        content: r.content,
        timestamp: Date.now(),
        type: 'DIALOGUE'
      };
    });
  } catch (e) {
    console.error("Failed to parse NPC response", e);
    return [];
  }
};

/**
 * Calculates votes from AI NPCs.
 */
export const calculateAIVotes = async (
  players: Player[],
  chatHistory: ChatMessage[]
): Promise<VoteResult[]> => {
  const alivePlayers = players.filter(p => p.isAlive);
  const aliveNPCs = alivePlayers.filter(p => !p.isUser);

  // If no NPCs alive, return empty
  if (aliveNPCs.length === 0) return [];

  const prompt = `
    現在是投票環節。請根據對話紀錄和每個 NPC 的角色邏輯進行投票。
    目標是淘汰狼人。
    
    存活玩家:
    ${alivePlayers.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}
    
    秘密角色資訊:
    ${players.map(p => `- ${p.name}: ${p.role}`).join('\n')}
    
    最近對話:
    ${formatChatHistory(chatHistory)}
    
    規則:
    1. 狼人會嘗試投票給無辜村民，或者如果自己被懷疑，會跟票自保。
    2. 村民會投票給他們認為最可疑的人。
    3. 每個存活的 NPC (非 User) 都要投一票。
    
    請回傳 JSON 陣列:
    [
      { "voterId": "npc_id", "targetId": "target_player_id", "reason": "簡短理由" }
    ]
  `;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            voterId: { type: Type.STRING },
            targetId: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["voterId", "targetId", "reason"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse votes", e);
    return [];
  }
};

/**
 * Generates night result narration.
 */
export const generateNightResult = async (
  eliminatedPlayerName: string | null,
  isDayVote: boolean
): Promise<string> => {
  const context = isDayVote 
    ? `${eliminatedPlayerName} 在白天被村民投票處決了。`
    : `${eliminatedPlayerName} 在夜晚被狼人襲擊身亡。`;

  const prompt = `
    你是狼人殺主持人。
    ${context}
    如果沒有人死亡 (eliminatedPlayerName 為 null)，則描述平安無事。
    請用一段簡短、充滿氛圍的繁體中文描述發生了什麼事。不要超過 100 字。
  `;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
  });

  return response.text || "今晚...";
};

/**
 * AI Logic to determine who the werewolf kills at night (if werewolf is AI).
 */
export const getWerewolfKillTarget = async (players: Player[]): Promise<string | null> => {
    const werewolf = players.find(p => p.role === Role.WEREWOLF && p.isAlive);
    if (!werewolf) return null; // Werewolf dead

    const targets = players.filter(p => p.isAlive && p.role !== Role.WEREWOLF);
    if (targets.length === 0) return null;

    // Simple AI: Randomly pick a non-wolf target. 
    // In a more complex version, we could ask Gemini who the wolf wants to kill based on threat level.
    const randomTarget = targets[Math.floor(Math.random() * targets.length)];
    return randomTarget.id;
}