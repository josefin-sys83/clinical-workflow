import { useState } from 'react';
import { Bot, X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI assistant. I can help you prioritize tasks, understand project risks, and answer questions about your clinical investigations. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const response = generateAIResponse(inputValue);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 500);
  };

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('priority') || lowerInput.includes('prioritize')) {
      return 'Based on your current workload, I recommend focusing on:\n\n1. **CARDIO-STENT-2024 Protocol Section 7.3** - This is blocking 2 team members and due in 2 days\n2. **NEURO-IMPLANT-EU Safety Assessment** - Review required before regulatory submission\n3. **ORTHO-JOINT-US Final Report** - Your approval will allow the project to move forward\n\nShould I help you schedule time for these tasks?';
    }

    if (lowerInput.includes('blocker') || lowerInput.includes('blocked') || lowerInput.includes('risk')) {
      return 'I\'ve identified 3 blocking issues across your projects:\n\n• **CARDIO-STENT-2024** has 2 blockers:\n  - Protocol Section 7.3 incomplete (assigned to you)\n  - Statistical analysis plan pending review\n\n• **NEURO-IMPLANT-EU** has 1 blocker:\n  - Safety assessment requires your regulatory review\n\nI recommend addressing Protocol Section 7.3 first as it has the highest project impact.';
    }

    if (lowerInput.includes('cardio') || lowerInput.includes('stent')) {
      return 'For **CARDIO-STENT-2024**:\n\n**Status:** At Risk\n**Your roles:** Project Manager, Clinical Lead\n**Critical path:** Protocol completion is 2 days overdue\n**Blockers:** 2 open issues\n\n**Recommended actions:**\n1. Complete Protocol Section 7.3 today (blocks 2 team members)\n2. Review statistical analysis plan draft\n3. Schedule protocol review meeting with stakeholders\n\nThis project needs immediate attention to get back on track.';
    }

    if (lowerInput.includes('neuro') || lowerInput.includes('implant')) {
      return 'For **NEURO-IMPLANT-EU**:\n\n**Status:** Awaiting Input\n**Your role:** Regulatory Affairs\n**Phase:** Review\n**Next milestone:** Regulatory submission in 14 days\n\n**What you need to do:**\nReview the Safety Assessment document - this is the only item blocking regulatory submission. The document is ready for your review and should take approximately 2-3 hours.\n\nWould you like me to block time on your calendar for this review?';
    }

    if (lowerInput.includes('ortho') || lowerInput.includes('knee')) {
      return 'For **ORTHO-JOINT-US**:\n\n**Status:** On Track\n**Your roles:** Clinical Lead, Quality Assurance\n**Phase:** Report finalization\n\n**Pending actions:**\n• Approve Final Clinical Report (as Clinical Lead)\n• Quality review of submission package (as QA)\n\nThis project is progressing well. Your approval will allow the team to proceed with regulatory submission.';
    }

    if (lowerInput.includes('signature') || lowerInput.includes('sign')) {
      return 'You have **2 documents awaiting your signature:**\n\n1. **Statistical Analysis Plan** for CARDIO-STENT-2024\n   - Due in 3 days\n   - Required before data collection\n\n2. **Protocol Amendment #2** for NEURO-IMPLANT-EU\n   - Due tomorrow\n   - Regulatory submission dependency\n\nBoth signatures are high priority. I recommend reviewing the Protocol Amendment first due to its earlier deadline.';
    }

    if (lowerInput.includes('help') || lowerInput.includes('what can you')) {
      return 'I can assist you with:\n\n• **Prioritization** - Help you decide what to work on first\n• **Risk analysis** - Identify blockers and at-risk projects\n• **Project insights** - Detailed information about any project\n• **Deadline tracking** - Remind you of upcoming due dates\n• **Role guidance** - Explain your responsibilities in each project\n• **Document status** - Check approval and review statuses\n\nJust ask me anything about your projects or tasks!';
    }

    // Default response
    return 'I understand you\'re asking about: "' + input + '"\n\nI can help you with:\n• Prioritizing your tasks\n• Understanding project risks and blockers\n• Getting detailed information about specific projects\n• Managing deadlines and signatures\n\nTry asking: "What should I prioritize?" or "Tell me about CARDIO-STENT-2024"';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
        aria-label="Open AI Assistant"
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Card 
      className={`fixed right-6 z-50 shadow-2xl transition-all ${
        isMinimized 
          ? 'bottom-6 w-80' 
          : 'bottom-6 w-96 h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">AI Assistant</div>
            <div className="text-xs text-blue-100">Always here to help</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" style={{ height: 'calc(600px - 140px)' }}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className="text-sm whitespace-pre-line">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
