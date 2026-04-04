import React, { useState } from 'react';
import { MessageSquare, CheckCircle, Circle, ChevronDown, ChevronRight, User, CornerDownRight } from 'lucide-react';

export interface Comment {
  id: string;
  author: string;
  authorRole: string;
  timestamp: string;
  content: string;
  status: 'open' | 'resolved';
  replies?: Comment[];
}

interface CommentThreadProps {
  comment: Comment;
  onResolve?: (commentId: string) => void;
  onReply?: (commentId: string, content: string) => void;
  isNested?: boolean;
}

export function CommentThread({ comment, onResolve, onReply, isNested = false }: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = () => {
    if (replyText.trim() && onReply) {
      onReply(comment.id, replyText);
      setReplyText('');
      setIsReplying(false);
    }
  };

  const getRoleColor = (role: string) => {
    if (role.includes('Clinical')) return 'text-blue-700 bg-blue-50';
    if (role.includes('Regulatory')) return 'text-purple-700 bg-purple-50';
    if (role.includes('Writer')) return 'text-slate-700 bg-slate-100';
    if (role.includes('QA') || role.includes('Compliance')) return 'text-green-700 bg-green-50';
    if (role.includes('Biostatistician')) return 'text-amber-700 bg-amber-50';
    return 'text-slate-700 bg-slate-100';
  };

  return (
    <div className={`${isNested ? 'ml-8 mt-3' : ''}`}>
      <div className={`${comment.status === 'resolved' ? 'opacity-60' : ''}`}>
        {/* Comment Header */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-900">{comment.author}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(comment.authorRole)}`}>
                {comment.authorRole}
              </span>
              <span className="text-xs text-slate-500">{comment.timestamp}</span>
              {comment.status === 'resolved' && (
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Resolved
                </span>
              )}
            </div>
            <div className="mt-1.5 text-sm text-slate-800 leading-relaxed">
              {comment.content}
            </div>
          </div>
        </div>

        {/* Comment Actions */}
        {comment.status === 'open' && !isNested && (
          <div className="ml-11 flex items-center gap-3 text-xs">
            <button 
              className="text-blue-700 hover:text-blue-800 font-medium"
              onClick={() => setIsReplying(!isReplying)}
            >
              Reply
            </button>
            {onResolve && (
              <button 
                className="text-green-700 hover:text-green-800 font-medium"
                onClick={() => onResolve(comment.id)}
              >
                Mark Resolved
              </button>
            )}
          </div>
        )}

        {/* Reply Input */}
        {isReplying && (
          <div className="ml-11 mt-3 space-y-2">
            <textarea
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Write a reply..."
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                onClick={handleReply}
              >
                Post Reply
              </button>
              <button
                className="px-3 py-1.5 text-xs border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                onClick={() => {
                  setIsReplying(false);
                  setReplyText('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-11 mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex items-start gap-3">
                <CornerDownRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900">{reply.author}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(reply.authorRole)}`}>
                      {reply.authorRole}
                    </span>
                    <span className="text-xs text-slate-500">{reply.timestamp}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-800 leading-relaxed">
                    {reply.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
