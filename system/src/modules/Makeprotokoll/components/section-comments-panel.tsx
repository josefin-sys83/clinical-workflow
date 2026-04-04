import React, { useState } from 'react';
import { X, MessageSquare, Filter, Plus, CheckCircle, Circle } from 'lucide-react';
import { CommentThread, Comment } from './comment-thread';

interface SectionCommentsPanelProps {
  sectionNumber: string;
  sectionTitle: string;
  comments: Comment[];
  onClose: () => void;
  onResolveComment?: (commentId: string) => void;
  onReplyToComment?: (commentId: string, content: string) => void;
  onAddComment?: (content: string) => void;
}

export function SectionCommentsPanel({ 
  sectionNumber, 
  sectionTitle, 
  comments, 
  onClose,
  onResolveComment,
  onReplyToComment,
  onAddComment
}: SectionCommentsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const filteredComments = comments.filter(comment => {
    if (filter === 'all') return true;
    return comment.status === filter;
  });

  const openCount = comments.filter(c => c.status === 'open').length;
  const resolvedCount = comments.filter(c => c.status === 'resolved').length;

  const handleAddComment = () => {
    if (newCommentText.trim() && onAddComment) {
      onAddComment(newCommentText);
      setNewCommentText('');
      setIsAddingComment(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l border-slate-300 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-slate-700" />
              <h2 className="text-base font-semibold text-slate-900">
                Comments & Discussion
              </h2>
            </div>
            <p className="text-sm text-slate-700">
              {sectionNumber} {sectionTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Comment Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Circle className="w-3 h-3 text-amber-600 fill-amber-600" />
            <span className="text-slate-700">{openCount} Open</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-slate-700">{resolvedCount} Resolved</span>
          </div>
          <div className="text-slate-400">•</div>
          <span className="text-slate-700">{comments.length} Total</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <div className="flex gap-1">
            <button
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'all' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => setFilter('all')}
            >
              All ({comments.length})
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'open' 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => setFilter('open')}
            >
              Open ({openCount})
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'resolved' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => setFilter('resolved')}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filteredComments.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">
              {filter === 'all' && 'No comments yet'}
              {filter === 'open' && 'No open comments'}
              {filter === 'resolved' && 'No resolved comments'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredComments.map((comment) => (
              <div key={comment.id} className="pb-6 border-b border-slate-200 last:border-0">
                <CommentThread 
                  comment={comment} 
                  onResolve={onResolveComment}
                  onReply={onReplyToComment}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Comment Section */}
      <div className="border-t border-slate-200 bg-slate-50 p-4">
        {isAddingComment ? (
          <div className="space-y-3">
            <textarea
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add a comment or question about this section..."
              rows={4}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={handleAddComment}
              >
                Post Comment
              </button>
              <button
                className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => {
                  setIsAddingComment(false);
                  setNewCommentText('');
                }}
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-slate-600">
              All comments are logged for audit compliance. Include specific line references where possible.
            </p>
          </div>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            onClick={() => setIsAddingComment(true)}
          >
            <Plus className="w-4 h-4" />
            Add Comment
          </button>
        )}
      </div>

      {/* Audit Footer */}
      <div className="px-4 py-2 bg-slate-100 border-t border-slate-200">
        <p className="text-xs text-slate-600 text-center">
          All comments are audit-logged with timestamp and user attribution
        </p>
      </div>
    </div>
  );
}