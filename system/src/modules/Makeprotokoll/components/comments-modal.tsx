import React, { useState } from 'react';
import { X, MessageSquare, User, Clock, CheckCircle2, Send, AlertCircle } from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  authorRole: string;
  timestamp: string;
  content: string;
  type: 'general' | 'issue' | 'approval-request' | 'resolved';
  subsection?: string;
  status: 'open' | 'resolved';
  resolvedBy?: string;
  resolvedDate?: string;
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionNumber: string;
  sectionTitle: string;
  comments: Comment[];
  onAddComment?: (content: string, type: string) => void;
}

export function CommentsModal({ 
  isOpen, 
  onClose, 
  sectionNumber, 
  sectionTitle, 
  comments,
  onAddComment 
}: CommentsModalProps) {
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'general' | 'issue' | 'approval-request'>('general');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment, commentType);
      setNewComment('');
      setCommentType('general');
    }
  };

  const openComments = comments.filter(c => c.status === 'open');
  const resolvedComments = comments.filter(c => c.status === 'resolved');

  const getCommentTypeStyle = (type: string) => {
    switch (type) {
      case 'issue':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'approval-request':
        return 'bg-purple-50 border-l-4 border-purple-500';
      case 'resolved':
        return 'bg-green-50 border-l-4 border-green-500';
      default:
        return 'bg-slate-50 border-l-4 border-slate-300';
    }
  };

  const getCommentTypeLabel = (type: string) => {
    switch (type) {
      case 'issue':
        return 'Issue Raised';
      case 'approval-request':
        return 'Approval Request';
      case 'resolved':
        return 'Resolved';
      default:
        return 'Comment';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Comments
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              Section {sectionNumber}: {sectionTitle}
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                {openComments.length} open
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {resolvedComments.length} resolved
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {openComments.length === 0 && resolvedComments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No comments yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Be the first to add a comment or question
              </p>
            </div>
          ) : (
            <>
              {/* Open Comments */}
              {openComments.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    OPEN COMMENTS ({openComments.length})
                  </div>
                  <div className="space-y-3">
                    {openComments.map((comment) => (
                      <div 
                        key={comment.id}
                        className={`p-4 rounded ${getCommentTypeStyle(comment.type)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">
                                  {comment.author}
                                </span>
                                <span className="px-2 py-0.5 bg-white/50 text-slate-700 text-xs rounded">
                                  {comment.authorRole}
                                </span>
                                <span className="px-2 py-0.5 bg-white/50 text-slate-700 text-xs rounded">
                                  {getCommentTypeLabel(comment.type)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{comment.timestamp}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {comment.subsection && (
                          <div className="text-xs text-slate-600 mb-2 ml-11">
                            <span className="font-medium">Regarding:</span> {comment.subsection}
                          </div>
                        )}
                        
                        <p className="text-sm text-slate-700 leading-relaxed ml-11">
                          {comment.content}
                        </p>

                        <div className="mt-3 ml-11 flex items-center gap-2">
                          <button className="px-3 py-1 text-xs border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors">
                            Mark as Resolved
                          </button>
                          <button className="px-3 py-1 text-xs border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors">
                            Reply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved Comments */}
              {resolvedComments.length > 0 && (
                <div className="mt-6">
                  <div className="text-xs font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    RESOLVED COMMENTS ({resolvedComments.length})
                  </div>
                  <div className="space-y-3">
                    {resolvedComments.map((comment) => (
                      <div 
                        key={comment.id}
                        className="p-4 rounded bg-green-50 border-l-4 border-green-500 opacity-75"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">
                                  {comment.author}
                                </span>
                                <span className="px-2 py-0.5 bg-white/50 text-slate-700 text-xs rounded">
                                  {comment.authorRole}
                                </span>
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{comment.timestamp}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-700 leading-relaxed ml-11">
                          {comment.content}
                        </p>

                        {comment.resolvedBy && (
                          <div className="mt-2 ml-11 p-2 bg-white/50 rounded text-xs text-green-800">
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            Resolved by {comment.resolvedBy} on {comment.resolvedDate}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Comment Section */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="mb-3">
            <label className="text-xs font-medium text-slate-700 mb-2 block">
              Add Comment
            </label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setCommentType('general')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  commentType === 'general'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                General Comment
              </button>
              <button
                onClick={() => setCommentType('issue')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  commentType === 'issue'
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Raise Issue
              </button>
              <button
                onClick={() => setCommentType('approval-request')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  commentType === 'approval-request'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Request Approval
              </button>
            </div>
          </div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write your comment here... (visible to all reviewers and approvers)"
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Comments are logged to the audit trail with your name and timestamp
            </div>
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Post Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}