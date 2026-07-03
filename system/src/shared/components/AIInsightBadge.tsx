interface AIInsightBadgeProps {
  title: string;
  description: string;
  className?: string;
}

export function AIInsightBadge({ title, description, className = '' }: AIInsightBadgeProps) {
  return (
    <div className={`p-3 bg-purple-50 border-l-4 border-purple-400 rounded ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-purple-600 text-white rounded flex items-center justify-center text-xs font-bold flex-shrink-0">
          AI
        </div>
        <div>
          <div className="text-sm font-medium text-purple-900 mb-1">{title}</div>
          <p className="text-xs text-purple-700">{description}</p>
        </div>
      </div>
    </div>
  );
}
