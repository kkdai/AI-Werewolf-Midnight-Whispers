import React, { useState, useEffect, useRef } from 'react';
import { Player, Role, GamePhase, ChatMessage, GameState } from './types';
import * as GeminiService from './services/geminiService';
import ChatMessageComponent from './components/ChatMessage';
import PlayerList from './components/PlayerList';

// Initial Mock Data - Expanded to 10 Players
const INITIAL_PLAYERS: Player[] = [
  { id: 'user', name: '主角 (你)', role: Role.VILLAGER, isAlive: true, isUser: true, bio: '一名剛回到村莊的旅行者，觀察力敏銳，試圖查明真相。' },
  { id: 'p2', name: '老村長', role: Role.VILLAGER, isAlive: true, isUser: false, bio: '村裡最年長的人，深受敬重，但最近有些糊塗，容易被誤導。' },
  { id: 'p3', name: '鐵匠阿豪', role: Role.VILLAGER, isAlive: true, isUser: false, bio: '脾氣暴躁，但心地善良，手勁很大，痛恨邪惡。' },
  { id: 'p4', name: '麵包師瑪麗', role: Role.SEER, isAlive: true, isUser: false, bio: '直覺準確，經常在夜裡看到奇怪的景象，性格敏感多疑。' },
  { id: 'p5', name: '神祕少女', role: Role.WEREWOLF, isAlive: true, isUser: false, bio: '最近才搬來，總是戴著兜帽，行蹤神祕，說話輕聲細語。' },
  { id: 'p6', name: '獵人傑克', role: Role.VILLAGER, isAlive: true, isUser: false, bio: '沉默寡言，眼神銳利，總是背著一把舊獵槍，不信任外人。' },
  { id: 'p7', name: '酒鬼老皮', role: Role.VILLAGER, isAlive: true, isUser: false, bio: '整天醉醺醺的，瘋瘋癲癲，但偶爾會說出驚人的真相。' },
  { id: 'p8', name: '貴婦安娜', role: Role.VILLAGER, isAlive: true, isUser: false, bio: '從城裡來的富有的寡婦，對村裡的髒亂很不滿，說話尖酸刻薄。' },
  { id: 'p9', name: '小湯米', role: Role.VILLAGER, isAlive: true, isUser: false, bio: '喜歡到處亂跑的小男孩，知道很多大人不想讓人知道的祕密。' },
  { id: 'p10', name: '藥劑師梅林', role: Role.VILLAGER, isAlive: true, isUser: false, bio: '精通草藥，性格孤僻，住在村子邊緣，被大家敬畏。' },
];

// Shuffle helper
const shuffleRoles = (players: Player[]): Player[] => {
  // 10 Players: 3 Werewolves, 1 Seer, 6 Villagers
  const roles = [
      Role.WEREWOLF, Role.WEREWOLF, Role.WEREWOLF, 
      Role.SEER, 
      Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER
  ];
  
  // Fisher-Yates shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  return players.map((p, idx) => ({ ...p, role: roles[idx] }));
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.SETUP,
    dayCount: 1,
    players: [],
    messages: [],
    currentImage: null,
    winner: null,
    isLoading: false,
    loadingMessage: ''
  });

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.messages]);

  const addMessage = (msg: ChatMessage) => {
    setGameState(prev => ({
      ...prev,
      messages: [...prev.messages, msg]
    }));
  };

  const setLoading = (loading: boolean, msg: string = '') => {
    setGameState(prev => ({ ...prev, isLoading: loading, loadingMessage: msg }));
  };

  // --- Game Logic Actions ---

  const startGame = async () => {
    const randomizedPlayers = shuffleRoles(INITIAL_PLAYERS);
    setGameState(prev => ({ ...prev, players: randomizedPlayers, phase: GamePhase.DAY_INTRO }));
    
    setLoading(true, '正在生成開場故事與場景...');
    
    try {
      // 1. Generate Intro Text
      const introText = await GeminiService.generateIntro(randomizedPlayers);
      addMessage({
        id: 'intro',
        senderId: 'GM',
        senderName: 'GM',
        content: introText,
        timestamp: Date.now(),
        type: 'NARRATION'
      });

      // 2. Generate Image
      const imageBase64 = await GeminiService.generateGameImage("Early morning in the village square, fog, mystery", 1, 'Day');
      setGameState(prev => ({
        ...prev,
        currentImage: imageBase64,
        phase: GamePhase.DAY_DISCUSSION,
        isLoading: false
      }));

    } catch (error) {
      console.error(error);
      setLoading(false);
      alert("初始化遊戲失敗，請檢查 API Key 或稍後再試。");
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || gameState.isLoading) return;
    
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: 'user',
      senderName: '主角 (你)',
      content: inputText,
      timestamp: Date.now(),
      type: 'DIALOGUE'
    };
    
    addMessage(userMsg);
    setInputText('');
    setLoading(true, 'NPC 正在思考回應...');

    try {
      // 1. Get NPC Text Responses
      const responses = await GeminiService.generateNPCResponse(gameState.players, [...gameState.messages, userMsg], inputText);
      
      // Add responses one by one for effect
      responses.forEach(res => addMessage(res));

      // 2. Generate Updated Scene Image (Nano Banana)
      setLoading(true, '正在根據最新對話繪製場景...');
      
      const contextSummary = `
        Interaction Snapshot:
        Player asked: "${inputText}"
        NPCs responded: ${responses.map(r => `${r.senderName} said "${r.content}"`).join('; ')}
        Atmosphere: Intense face-to-face conversation, suspicion, dramatic expressions.
      `;
      
      const newImage = await GeminiService.generateGameImage(contextSummary, gameState.dayCount, 'Day');
      if (newImage) {
        setGameState(prev => ({ ...prev, currentImage: newImage }));
      }
      
    } catch (error) {
      console.error("NPC response or Image generation error", error);
    } finally {
      setLoading(false);
    }
  };

  const startVoting = async () => {
    setGameState(prev => ({ ...prev, phase: GamePhase.DAY_VOTING }));
  };

  const handleVote = async (targetId: string) => {
    setLoading(true, '全村正在進行投票...');
    
    try {
      // 1. Get AI Votes
      const aiVotes = await GeminiService.calculateAIVotes(gameState.players, gameState.messages);
      
      // 2. Add User Vote
      const allVotes = [
        ...aiVotes,
        { voterId: 'user', targetId: targetId, reason: '玩家決定' }
      ];

      // 3. Tally Votes
      const voteCounts: Record<string, number> = {};
      allVotes.forEach(v => {
        voteCounts[v.targetId] = (voteCounts[v.targetId] || 0) + 1;
      });

      // Announce votes in chat
      const voteSummary = allVotes.map(v => {
        const voter = gameState.players.find(p => p.id === v.voterId)?.name;
        const target = gameState.players.find(p => p.id === v.targetId)?.name;
        return `${voter} 投給了 ${target} (${v.reason})`;
      }).join('\n');

      addMessage({
        id: crypto.randomUUID(),
        senderId: 'GM',
        senderName: 'GM',
        content: `投票結果:\n${voteSummary}`,
        timestamp: Date.now(),
        type: 'SYSTEM'
      });

      // 4. Determine eliminated player (Simple majority)
      let eliminatedId: string | null = null;
      let maxVotes = 0;
      Object.entries(voteCounts).forEach(([id, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          eliminatedId = id;
        } else if (count === maxVotes) {
          eliminatedId = null; // Tie (simplification: no one dies on tie)
        }
      });

      if (eliminatedId) {
        const eliminatedPlayer = gameState.players.find(p => p.id === eliminatedId);
        addMessage({
          id: crypto.randomUUID(),
          senderId: 'GM',
          senderName: 'GM',
          content: `${eliminatedPlayer?.name} 被票決處死！`,
          timestamp: Date.now(),
          type: 'NARRATION'
        });

        // Kill player
        setGameState(prev => ({
          ...prev,
          players: prev.players.map(p => p.id === eliminatedId ? { ...p, isAlive: false } : p)
        }));
      } else {
        addMessage({
          id: crypto.randomUUID(),
          senderId: 'GM',
          senderName: 'GM',
          content: `平票，無人被處決。`,
          timestamp: Date.now(),
          type: 'NARRATION'
        });
      }
      
      // If Game Not Over, Go to Night
      setTimeout(() => startNightPhaseSafe(), 2000);

    } catch (error) {
      console.error("Voting failed", error);
      setLoading(false);
    }
  };

  // Helper to handle the "Ref" issue for async state access
  const latestPlayersRef = useRef(gameState.players);
  useEffect(() => { latestPlayersRef.current = gameState.players; }, [gameState.players]);

  const startNightPhaseSafe = async () => {
     setLoading(true, '夜幕降臨...');
     const currentPlayers = latestPlayersRef.current;

     // Check immediate Game Over before night (if last wolf died)
     const liveWolvesBeforeNight = currentPlayers.filter(p => p.isAlive && p.role === Role.WEREWOLF).length;
     const liveVillagersBeforeNight = currentPlayers.filter(p => p.isAlive && p.role !== Role.WEREWOLF).length;

     if (liveWolvesBeforeNight === 0) {
        setGameState(prev => ({ ...prev, winner: 'VILLAGERS', phase: GamePhase.GAME_OVER, isLoading: false }));
        return;
     }
     if (liveWolvesBeforeNight >= liveVillagersBeforeNight) {
        setGameState(prev => ({ ...prev, winner: 'WEREWOLVES', phase: GamePhase.GAME_OVER, isLoading: false }));
        return;
     }
     
     // 1. Generate Night Image
     const nightImage = await GeminiService.generateGameImage("Village at night, full moon, dark shadows, cinematic", gameState.dayCount, 'Night');
     
     // 2. Check Role
     const userPlayer = currentPlayers.find(p => p.isUser);
     const isUserWolf = userPlayer?.role === Role.WEREWOLF && userPlayer.isAlive;
     const isUserSeer = userPlayer?.role === Role.SEER && userPlayer.isAlive;

     setGameState(prev => ({
         ...prev,
         currentImage: nightImage,
         phase: (isUserWolf || isUserSeer) ? GamePhase.NIGHT_ACTION : prev.phase,
         isLoading: !(isUserWolf || isUserSeer) // If wolf or seer, stop loading to allow interaction.
     }));

     if (!isUserWolf && !isUserSeer) {
         await resolveNight(null, currentPlayers);
     }
  };

  const handleWerewolfKill = async (targetId: string) => {
      // User selected a target
      await resolveNight(targetId, gameState.players);
  };

  const handleSeerCheck = (targetId: string) => {
      const target = gameState.players.find(p => p.id === targetId);
      if (!target) return;
      
      const isWolf = target.role === Role.WEREWOLF;
      
      addMessage({
          id: crypto.randomUUID(),
          senderId: 'GM',
          senderName: 'GM',
          content: `水晶球顯現了真相... ${target.name} 的真實身份是：${isWolf ? '【狼人】' : '【好人】'}。`,
          timestamp: Date.now(),
          type: 'SYSTEM'
      });
      
      // After checking, proceed to resolve the night actions
      resolveNight(null, gameState.players);
  };

  const resolveNight = async (manualTargetId: string | null, currentPlayers: Player[]) => {
    // If it was user action, show loading again
    setLoading(true, '正在結算夜晚行動...');
    
    setGameState(prev => ({ ...prev, phase: GamePhase.NIGHT_RESULT }));

    // 2. Determine Target
    let wolfTarget = manualTargetId;
    if (!wolfTarget) {
        wolfTarget = await GeminiService.getWerewolfKillTarget(currentPlayers);
    }
    
    let victimName: string | null = null;
    let nextPlayers = [...currentPlayers];

    if (wolfTarget) {
      // Apply death
      nextPlayers = nextPlayers.map(p => p.id === wolfTarget ? { ...p, isAlive: false } : p);
      const victim = nextPlayers.find(p => p.id === wolfTarget);
      victimName = victim ? victim.name : null;
    }

    // 3. Narration
    const nightNarration = await GeminiService.generateNightResult(victimName, false);
    addMessage({
       id: crypto.randomUUID(),
       senderId: 'GM',
       senderName: 'GM',
       content: `天亮了... ${nightNarration}`,
       timestamp: Date.now(),
       type: 'NARRATION'
    });

    // 4. Generate Day Image
    const dayImage = await GeminiService.generateGameImage("Morning after tragedy, village meeting", gameState.dayCount + 1, 'Day');
    
    setGameState(prev => {
        // Check win conditions
        const liveWolves = nextPlayers.filter(p => p.isAlive && p.role === Role.WEREWOLF).length;
        const liveVillagers = nextPlayers.filter(p => p.isAlive && p.role !== Role.WEREWOLF).length;
        
        let winner: 'VILLAGERS' | 'WEREWOLVES' | null = null;
        let nextPhase = GamePhase.DAY_DISCUSSION;

        if (liveWolves === 0) winner = 'VILLAGERS';
        else if (liveWolves >= liveVillagers) winner = 'WEREWOLVES';

        if (winner) nextPhase = GamePhase.GAME_OVER;

        return {
            ...prev,
            players: nextPlayers,
            currentImage: dayImage || prev.currentImage,
            dayCount: prev.dayCount + 1,
            phase: nextPhase,
            winner: winner,
            isLoading: false
        };
    });
  };

  // --- Rendering ---

  if (gameState.phase === GamePhase.SETUP) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 shadow-2xl text-center border border-slate-700">
          <h1 className="text-4xl font-serif text-indigo-400 mb-2">AI 狼人殺</h1>
          <h2 className="text-xl text-slate-400 mb-8">Midnight Whispers</h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            你來到了一個被詛咒的村莊。Google Gemini 將擔任上帝 (GM)，生成獨一無二的劇情與影像。找出隱藏在人群中的狼人，活下去。
          </p>
          <button
            onClick={startGame}
            disabled={gameState.isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {gameState.isLoading ? '正在初始化...' : '開始遊戲'}
          </button>
        </div>
      </div>
    );
  }

  if (gameState.phase === GamePhase.GAME_OVER) {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 shadow-2xl text-center border border-slate-700">
            <h1 className="text-4xl font-serif mb-4 text-white">遊戲結束</h1>
            <div className={`text-2xl font-bold mb-8 ${gameState.winner === 'VILLAGERS' ? 'text-green-400' : 'text-red-500'}`}>
              {gameState.winner === 'VILLAGERS' ? '村民獲勝！' : '狼人獲勝！'}
            </div>
            
            <div className="text-left bg-slate-900/50 p-4 rounded-lg mb-6">
                <h3 className="text-slate-400 text-xs uppercase mb-2">角色揭露</h3>
                {gameState.players.map(p => (
                    <div key={p.id} className="flex justify-between text-sm py-1 border-b border-slate-700/50 last:border-0">
                        <span className="text-slate-200">{p.name}</span>
                        <span className={`${p.role === Role.WEREWOLF ? 'text-red-400' : 'text-indigo-300'}`}>{p.role}</span>
                    </div>
                ))}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg text-white"
            >
              再玩一次
            </button>
          </div>
        </div>
      );
  }

  const userPlayer = gameState.players.find(p => p.isUser);
  const isUserAlive = userPlayer?.isAlive;

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-950 overflow-hidden">
      {/* Sidebar (Desktop) / Topbar (Mobile) - Player Status */}
      <div className="md:w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-slate-800">
           <h1 className="text-lg font-serif font-bold text-indigo-400">Day {gameState.dayCount}</h1>
           <span className="text-xs text-slate-500">{gameState.phase}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
           <PlayerList players={gameState.players} userRole={userPlayer?.role} />
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Visual Scene Header */}
        <div className="h-48 md:h-64 w-full bg-black relative flex-shrink-0 overflow-hidden border-b border-indigo-900/30">
            {gameState.currentImage ? (
                <img 
                    src={gameState.currentImage} 
                    alt="Scene" 
                    className="w-full h-full object-cover opacity-80 animate-fade-in"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                    Generating Scene...
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
            
            {/* Loading Overlay */}
            {gameState.isLoading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-indigo-200 text-sm font-medium animate-pulse">{gameState.loadingMessage}</p>
                </div>
            )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 space-y-4">
            {gameState.messages.map((msg) => (
                <ChatMessageComponent 
                    key={msg.id} 
                    message={msg} 
                    isCurrentUser={msg.senderId === 'user'} 
                />
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Action Panel (Sticky Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-4 z-10">
            
            {gameState.phase === GamePhase.DAY_DISCUSSION && isUserAlive && (
                <div className="max-w-4xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="說點什麼來為自己辯護，或指控他人..."
                        className="flex-1 bg-slate-800 border border-slate-600 text-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
                        autoFocus
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || gameState.isLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        發送
                    </button>
                    <button
                        onClick={startVoting}
                        disabled={gameState.isLoading}
                        className="bg-red-900/50 hover:bg-red-800/50 text-red-200 border border-red-800/50 px-4 py-3 rounded-xl font-medium transition-colors"
                    >
                        發起投票
                    </button>
                </div>
            )}

            {gameState.phase === GamePhase.DAY_VOTING && isUserAlive && (
                <div className="max-w-4xl mx-auto text-center">
                    <h3 className="text-red-400 font-bold mb-3 animate-pulse">請選擇要投票處決的玩家</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                        {gameState.players.filter(p => p.isAlive && !p.isUser).map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleVote(p.id)}
                                className="bg-slate-700 hover:bg-red-600 text-slate-200 hover:text-white px-4 py-2 rounded-lg border border-slate-600 transition-all"
                            >
                                {p.name}
                            </button>
                        ))}
                         <button
                                onClick={() => handleVote('skip')}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-4 py-2 rounded-lg border border-slate-700"
                            >
                                棄票
                        </button>
                    </div>
                </div>
            )}

            {gameState.phase === GamePhase.NIGHT_ACTION && isUserAlive && (
                 <div className="max-w-4xl mx-auto text-center">
                    {userPlayer?.role === Role.WEREWOLF ? (
                      <>
                        <h3 className="text-red-500 font-bold mb-3 animate-pulse text-xl font-serif">月圓之夜... 選擇你的獵物</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {gameState.players.filter(p => p.isAlive && !p.isUser && p.role !== Role.WEREWOLF).map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleWerewolfKill(p.id)}
                                    className="bg-red-950/80 hover:bg-red-700 text-red-200 hover:text-white px-6 py-3 rounded-lg border border-red-800 transition-all shadow-lg shadow-red-900/20"
                                >
                                    襲擊 {p.name}
                                </button>
                            ))}
                        </div>
                      </>
                    ) : userPlayer?.role === Role.SEER ? (
                      <>
                        <h3 className="text-indigo-400 font-bold mb-3 animate-pulse text-xl font-serif">水晶球感應中... 選擇一人查驗身份</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {gameState.players.filter(p => p.isAlive && !p.isUser).map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSeerCheck(p.id)}
                                    className="bg-indigo-900/80 hover:bg-indigo-700 text-indigo-100 hover:text-white px-6 py-3 rounded-lg border border-indigo-800 transition-all shadow-lg shadow-indigo-900/20"
                                >
                                    查驗 {p.name}
                                </button>
                            ))}
                        </div>
                      </>
                    ) : null}
                 </div>
            )}

            {!isUserAlive && (
                 <div className="text-center text-red-500 font-serif italic">
                    你已經死亡。靜靜地觀看結局吧...
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;