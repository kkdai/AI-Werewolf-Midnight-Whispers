import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';

interface Props {
  message: ChatMessageType;
  isCurrentUser: boolean;
}

const ChatMessage: React.FC<Props> = ({ message, isCurrentUser }) => {
  if (message.type === 'NARRATION') {
    return (
      <div className="flex justify-center my-4 animate-fade-in">
        <div className="bg-slate-800 border border-slate-600 text-slate-200 px-6 py-3 rounded-lg shadow-lg max-w-2xl text-center font-serif italic leading-relaxed">
          <span className="text-purple-400 font-bold block mb-1">✦ 遊戲旁白 ✦</span>
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-2 text-xs text-slate-500 uppercase tracking-widest">
        — {message.content} —
      </div>
    );
  }

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} my-2`}>
      <div
        className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-md ${
          isCurrentUser
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-slate-700 text-slate-100 rounded-bl-none'
        }`}
      >
        <div className="text-xs font-bold mb-1 opacity-70 flex items-center gap-2">
          {!isCurrentUser && (
             <div className="w-5 h-5 rounded-full bg-slate-500 flex items-center justify-center text-[10px]">
                {message.senderName[0]}
             </div>
          )}
          {message.senderName}
        </div>
        <div className="leading-snug whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
};

export default ChatMessage;