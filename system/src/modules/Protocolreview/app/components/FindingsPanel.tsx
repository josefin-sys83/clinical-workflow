import { useState } from 'react';
import { AlertTriangle, XCircle, MessageSquare, Sparkles, X, ChevronRight } from 'lucide-react';
import type { RegulatoryFinding, ReviewerComment, AIFinding } from '../types/review';

interface FindingsPanelProps {
  findings: RegulatoryFinding[];
  comments: ReviewerComment[];
  aiFindings: AIFinding[];
  onFindingClick: (sectionId: string) => void;
  onDismissAIFinding: (findingId: string) => void;
  onAcceptRisk: (findingId: string) => void;
}

export function FindingsPanel({
  findings,
  comments,
  aiFindings,
  onFindingClick,
  onDismissAIFinding,
  onAcceptRisk,
}: FindingsPanelProps) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

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

  const handleReplySubmit = (commentId: string) => {
    console.log('Submitting reply to comment:', commentId, 'Content:', replyText);
    // In a real application, this would submit the reply to the backend
    setReplyingTo(null);
    setReplyText('');
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return diffHours === 0 ? 'Just now' : `${diffHours}h ago`;
    }
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
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
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="mb-2">
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                      finding.acceptedRisk
                        ? 'bg-neutral-200 text-neutral-700'
                        : finding.severity === 'blocker'
                        ? 'bg-red-100 text-red-800'
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
                        ? 'text-red-700'
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
                        <button
                          onClick={() => handleReplySubmit(comment.id)}
                          className="text-sm text-neutral-700 hover:text-neutral-900 font-medium"
                        >
                          Submit Reply
                        </button>
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
            onClick={() => alert('Add comment functionality - in a real application, this would open a comment form')}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-neutral-300 bg-white text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Add New Comment
          </button>
        </div>
      </div>
    </div>
  );
}