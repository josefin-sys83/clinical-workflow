import { X, MessageSquare, Send, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { SectionComment, User } from '../types';

interface CommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
  sectionNumber: string;
  comments: SectionComment[];
  currentUser: User;
  onAddComment: (text: string, commentType: 'general' | 'issue' | 'approval-request', regarding?: string) => void;
  onResolveComment: (commentId: string) => void;
  onReplyToComment?: (commentId: string, text: string) => void;
}

export function CommentsPanel({ 
  isOpen, 
  onClose, 
  sectionTitle,
  sectionNumber,
  comments, 
  currentUser,
  onAddComment,
  onResolveComment,
  onReplyToComment
}: CommentsPanelProps) {
  const [commentText, setCommentText] = useState('');
  const [selectedCommentType, setSelectedCommentType] = useState<'general' | 'issue' | 'approval-request'>('general');

  if (!isOpen) return null;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).replace(',', '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(commentText, selectedCommentType);
      setCommentText('');
      setSelectedCommentType('general');
    }
  };

  const unresolvedComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);

  const getCommentTypeLabel = (type?: string) => {
    switch (type) {
      case 'issue':
        return 'Warning Raised';
      case 'approval-request':
        return 'Approval Request';
      default:
        return 'Comment';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#2563EB]" />
              <div>
                <h3 className="text-[#111827]" style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                  Comments
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[#6B7280] mt-1" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
            Section {sectionNumber}: {sectionTitle}
          </p>
          {/* Status indicators */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>
              <span className="text-[#6B7280]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                {unresolvedComments.length} open
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
              <span className="text-[#6B7280]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                {resolvedComments.length} resolved
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Open Comments */}
          {unresolvedComments.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>
                <h4 className="text-[#111827]" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'system-ui, sans-serif' }}>
                  OPEN COMMENTS ({unresolvedComments.length})
                </h4>
              </div>
              <div className="space-y-3">
                {unresolvedComments.map((comment) => (
                  <div key={comment.id} className="relative bg-white border border-[#E5E7EB] rounded-lg">
                    {/* Left border indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#EF4444] rounded-l-lg"></div>
                    
                    <div className="pl-4 pr-4 py-3">
                      {/* Header: Avatar, Name, Role, Type */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-5 h-5 text-[#6B7280]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                                {comment.author.name}
                              </span>
                              {comment.author.role && (
                                <>
                                  <span className="text-[#6B7280]">•</span>
                                  <span className="text-[#6B7280]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                                    {comment.author.role}
                                  </span>
                                </>
                              )}
                              <span className="text-[#6B7280]">•</span>
                              <span className="text-[#6B7280]" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                                {getCommentTypeLabel(comment.commentType)}
                              </span>
                            </div>
                            <div className="text-[#9CA3AF]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                              <UserIcon className="w-3 h-3 inline mr-1" />
                              {formatTimestamp(comment.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Regarding */}
                      {comment.regarding && (
                        <div className="mb-2 ml-12">
                          <span className="text-[#111827]" style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                            Regarding:
                          </span>
                          <span className="text-[#6B7280] ml-1" style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                            {comment.regarding}
                          </span>
                        </div>
                      )}

                      {/* Comment text */}
                      <p className="text-[#374151] mb-3 ml-12" style={{ fontSize: '13px', lineHeight: '1.6', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                        {comment.text}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-12">
                        <button
                          onClick={() => onResolveComment(comment.id)}
                          className="px-3 py-1.5 bg-[#10B981] text-white rounded hover:bg-[#059669] transition-colors"
                          style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        >
                          Mark as Resolved
                        </button>
                        <button
                          onClick={() => {/* Handle reply */}}
                          className="px-3 py-1.5 bg-white border border-[#D1D5DB] text-[#374151] rounded hover:bg-[#F9FAFB] transition-colors"
                          style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Comments State */}
          {comments.length === 0 && (
            <div className="text-center py-12 text-[#9CA3AF]" style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif' }}>
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No comments yet</p>
            </div>
          )}
        </div>

        {/* Add Comment Form */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <div className="text-[#111827] mb-2" style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                Add Comment
              </div>
              {/* Comment Type Buttons */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setSelectedCommentType('general')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    selectedCommentType === 'general'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white border border-[#D1D5DB] text-[#374151] hover:bg-[#F3F4F6]'
                  }`}
                  style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                >
                  General Comment
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCommentType('issue')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    selectedCommentType === 'issue'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white border border-[#D1D5DB] text-[#374151] hover:bg-[#F3F4F6]'
                  }`}
                  style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                >
                  Raise Warning
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCommentType('approval-request')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    selectedCommentType === 'approval-request'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white border border-[#D1D5DB] text-[#374151] hover:bg-[#F3F4F6]'
                  }`}
                  style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
                >
                  Request Approval
                </button>
              </div>

              {/* Text Area */}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write your comment here... (visible to all reviewers and approvers)"
                rows={4}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <p className="text-[#6B7280]" style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontWeight: 400 }}>
                Comments are logged to the audit trail with your name and timestamp
              </p>
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}
              >
                <Send className="w-4 h-4" />
                Post Comment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}