import { useState } from 'react';
import { AlertTriangle, XCircle, MessageSquare, Sparkles, X, ChevronRight, Send } from 'lucide-react';
import type { RegulatoryFinding, ReviewerComment, AIFinding } from '../types/review';

type CommentType = 'general' | 'issue' | 'approval-request';

interface FindingsPanelProps {
  findings: RegulatoryFinding[];
  comments: ReviewerComment[];
  aiFindings: AIFinding[];
  onFindingClick: (sectionId: string) => void;
  onDismissAIFinding: (findingId: string) => void;
  onAcceptRisk: (findingId: string) => void;
  /** Called when the user submits a new comment. Parent owns the API call. */
  onAddComment?: (content: string, type: CommentType) => Promise<void>;
  /** Called when the user submits a reply. Parent owns the API call. */
  onAddReply?: (commentId: string, replyText: string) => Promise<void>;
  /** The currently visible section id — used to label the comment modal. */
  activeSectionTitle?: string;
}

export function FindingsPanel({
  findings,
  comments,
  aiFindings,
  onFindingClick,
  onDismissAIFinding,
  onAcceptRisk,
  onAddComment,
  onAddReply,
  activeSectionTitle,
}: FindingsPanelProps) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // ── Add Comment modal state ───────────────────────────────────────────────
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('general');
  const [submitting, setSubmitting] = useState(false);

  const toggleComment = (commentId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
        setReplyingTo(null);
        setReplyText('');
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const handleReplySubmit = async (commentId: string) => {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    try {
      await onAddReply?.(commentId, replyText.trim());
    } finally {
      setReplySubmitting(false);
      setReplyingTo(null);
      setReplyText('');
    }
  };

  const handleOpenCommentModal = () => {
    setCommentText('');
    setCommentType('general');
    setCommentModalOpen(true);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !onAddComment) return;
    setSubmitting(true);
    try {
      await onAddComment(commentText.trim(), commentType);
      setCommentModalOpen(false);
      setCommentText('');
      setCommentType('general');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (date: Date | string) => {
    // Normalise — stored timestamps may arrive as ISO strings
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

    // Same calendar day → show time e.g. "14:32"
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    // Older → "2026-05-21 14:32"
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${yyyy}-${mm}-${dd} ${time}`;
  };

  return (
    <div className="w-[400px] border-l border-neutral-200 bg-neutral-50 h-full overflow-y-auto flex-shrink-0">
      <div className="divide-y divide-neutral-200">
        {/* Regulatory Findings */}
        <div className="p-4 bg-white">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">
            Regulatory Findings
          </h3>
          <div className="space-y-3">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className={`p-4 rounded-md border ${
                  finding.acceptedRisk
                    ? 'bg-neutral-50 border-neutral-300'
                    : finding.severity === 'blocker'
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="mb-2">
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                      finding.acceptedRisk
                        ? 'bg-neutral-200 text-neutral-700'
                        : finding.severity === 'blocker'
                        ? 'bg-rose-50 text-rose-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {finding.acceptedRisk ? 'Risk Accepted' : finding.severity === 'blocker' ? 'Blocker' : 'Warning'}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-neutral-900 mb-2">
                  {finding.location}
                </h4>

                <p className="text-sm text-neutral-900 mb-4 leading-relaxed">
                  {finding.description}
                </p>

                {finding.acceptedRisk && finding.acceptedBy && finding.acceptedAt && (
                  <div className="mb-4 p-2 bg-neutral-100 rounded text-xs text-neutral-600">
                    <div>Risk accepted by <span className="font-medium">{finding.acceptedBy}</span></div>
                    <div>{formatTimestamp(finding.acceptedAt)}</div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                  <span>Affected section</span>
                  <span className="font-medium">{finding.sectionId.replace('section-', '')}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-600 mb-3">
                  <span>Section owner</span>
                  <span className="font-medium">Dr. Marcus Rivera</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onFindingClick(finding.sectionId)}
                    className={`text-sm font-medium hover:underline ${
                      finding.acceptedRisk
                        ? 'text-neutral-700'
                        : finding.severity === 'blocker'
                        ? 'text-rose-700'
                        : 'text-yellow-800'
                    }`}
                  >
                    Navigate to Section {finding.sectionId.replace('section-', '')} &gt;
                  </button>

                  {!finding.acceptedRisk && (
                    <button
                      onClick={() => onAcceptRisk(finding.id)}
                      className="ml-auto text-sm font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-100"
                    >
                      Accept Risk
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviewer Comments */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">
            Reviewer Comments
          </h3>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white rounded-md border border-neutral-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleComment(comment.id)}
                  className="w-full p-3 text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-neutral-900">
                          {comment.author}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {comment.role}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mb-2">
                        {formatTimestamp(comment.timestamp)}
                      </p>
                      {!expandedComments.has(comment.id) && (
                        <p className="text-sm font-normal text-neutral-700 line-clamp-2">
                          {comment.content}
                        </p>
                      )}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-neutral-500">
                            {comment.replies.length}{' '}
                            {comment.replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-neutral-400 flex-shrink-0 transition-transform ${
                        expandedComments.has(comment.id) ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </button>

                {expandedComments.has(comment.id) && (
                  <div className="border-t border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-sm font-normal text-neutral-700 mb-3 whitespace-pre-wrap">{comment.content}</p>
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="space-y-2 ml-4 border-l-2 border-neutral-300 pl-3 mb-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="bg-white rounded p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-neutral-900">
                                {reply.author}
                              </span>
                              <span className="text-xs text-neutral-500">
                                {reply.role}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 mb-1">
                              {formatTimestamp(reply.timestamp)}
                            </p>
                            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {replyingTo === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full p-2 border border-neutral-300 rounded"
                          placeholder="Type your reply here..."
                        />
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleReplySubmit(comment.id)}
                            disabled={!replyText.trim() || replySubmitting}
                            className="text-sm text-neutral-700 hover:text-neutral-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {replySubmitting ? 'Saving…' : 'Submit Reply'}
                          </button>
                          <button
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                            className="text-sm text-neutral-500 hover:text-neutral-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(comment.id)}
                        className="text-sm text-neutral-700 hover:text-neutral-900 font-medium"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleOpenCommentModal}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-neutral-300 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Add New Comment
          </button>
        </div>
      </div>

      {/* ── Add Comment Modal ───────────────────────────────────────────────── */}
      {commentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-neutral-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <h2 className="text-base font-semibold text-neutral-900">Add Comment</h2>
                </div>
                {activeSectionTitle && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Section: <span className="font-medium text-neutral-700">{activeSectionTitle}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setCommentModalOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded transition-colors"
              >
                <X className="h-4 w-4 text-neutral-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Comment type selector */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">Comment Type</label>
                <select
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value as CommentType)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="general">General Comment</option>
                  <option value="issue">Issue</option>
                  <option value="approval-request">Approval Request</option>
                </select>
              </div>

              {/* Comment textarea */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-2">Comment</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write your comment here… (visible to all reviewers and approvers)"
                  rows={5}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-xs text-neutral-400 mt-1">
                  Comments are logged to the audit trail with your name and timestamp.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-neutral-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setCommentModalOpen(false)}
                className="px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Posting…' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
