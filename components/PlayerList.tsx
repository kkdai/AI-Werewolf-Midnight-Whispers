import React from 'react';
import { Player, Role } from '../types';

interface Props {
  players: Player[];
  userRole?: Role;
}

const PlayerList: React.FC<Props> = ({ players, userRole }) => {
  return (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
      <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-3">存活玩家</h3>
      <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
        {players.map((player) => {
          const isTeammate = userRole === Role.WEREWOLF && player.role === Role.WEREWOLF && !player.isUser;
          
          return (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                player.isAlive
                  ? 'bg-slate-700/50 border border-slate-600'
                  : 'bg-red-900/20 border border-red-900/50 opacity-60 grayscale'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  player.isAlive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {player.name[0]}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center">
                   <span className={`text-sm font-medium truncate ${player.isAlive ? 'text-slate-200' : 'text-red-400 line-through'}`}>
                    {player.name}
                  </span>
                  {isTeammate && player.isAlive && (
                      <span className="ml-2 text-[10px] bg-red-900 text-red-200 px-1 rounded border border-red-700">同夥</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 truncate">
                  {player.isUser ? '(你)' : player.isAlive ? '存活' : '死亡'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerList;