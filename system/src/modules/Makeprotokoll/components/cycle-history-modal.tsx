import React, { useState } from 'react';
import { X, History, ChevronDown, ChevronRight, CheckCircle, Lock, Unlock, Edit, FileText } from 'lucide-react';

interface CycleEvent {
  timestamp: string;
  action: string;
  user: string;
  userRole: string;
  details?: string;
}

export interface ReviewCycle {
  cycleNumber: number;
  startedAt: string;
  startedBy: string;
  startReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  lockedAt?: string;
  lockedBy?: string;
  unlockReason?: string;
  status: 'Active' | 'Superseded' | 'Completed';
  events: CycleEvent[];
  changesSummary?: string;
  findingsResolved?: number;
  commentsCount?: number;
}

interface CycleHistoryModalProps {
  sectionNumber: string;
  sectionTitle: string;
  cycles: ReviewCycle[];
  onClose: () => void;
}

export function CycleHistoryModal({ 
  sectionNumber, 
  sectionTitle, 
  cycles, 
  onClose 
}: CycleHistoryModalProps) {
  const [expandedCycles, setExpandedCycles] = useState<Set<number>>(new Set([cycles[0]?.cycleNumber]));

  const toggleCycle = (cycleNumber: number) => {
    const newExpanded = new Set(expandedCycles);
    if (newExpanded.has(cycleNumber)) {
      newExpanded.delete(cycleNumber);
    } else {
      newExpanded.add(cycleNumber);
    }
    setExpandedCycles(newExpanded);
  };

  const getCycleStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Superseded':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <History className="w-5 h-5 text-slate-700" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Review Cycle History
                </h2>
              </div>
              <p className="text-sm text-slate-600">
                {sectionNumber} {sectionTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Cycles List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {cycles.map((cycle, index) => {
              const isExpanded = expandedCycles.has(cycle.cycleNumber);
              const isLast = index === cycles.length - 1;

              return (
                <div key={cycle.cycleNumber} className="relative">
                  {/* Timeline connector */}
                  {!isLast && (
                    <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-slate-200" />
                  )}

                  {/* Cycle Card */}
                  <div className={`border-2 rounded-lg overflow-hidden ${
                    cycle.status === 'Active' 
                      ? 'border-blue-300 bg-blue-50' 
                      : cycle.status === 'Completed'
                      ? 'border-green-200 bg-white'
                      : 'border-slate-200 bg-slate-50 opacity-75'
                  }`}>
                    {/* Cycle Header */}
                    <div 
                      className="px-4 py-3 cursor-pointer hover:bg-slate-50/50"
                      onClick={() => toggleCycle(cycle.cycleNumber)}
                    >
                      <div className="flex items-start gap-3">
                        <button className="mt-1">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-1 bg-slate-900 text-white text-sm font-bold rounded">
                              Cycle {cycle.cycleNumber}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getCycleStatusBadge(cycle.status)}`}>
                              {cycle.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            <div>
                              <span className="text-slate-600">Started:</span>{' '}
                              <span className="text-slate-900 font-medium">{cycle.startedAt}</span>
                            </div>
                            <div>
                              <span className="text-slate-600">By:</span>{' '}
                              <span className="text-slate-900 font-medium">{cycle.startedBy}</span>
                            </div>
                            {cycle.approvedAt && (
                              <>
                                <div>
                                  <span className="text-slate-600">Approved:</span>{' '}
                                  <span className="text-slate-900 font-medium">{cycle.approvedAt}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600">By:</span>{' '}
                                  <span className="text-slate-900 font-medium">{cycle.approvedBy}</span>
                                </div>
                              </>
                            )}
                            {cycle.lockedAt && (
                              <>
                                <div>
                                  <span className="text-slate-600">Locked:</span>{' '}
                                  <span className="text-slate-900 font-medium">{cycle.lockedAt}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600">By:</span>{' '}
                                  <span className="text-slate-900 font-medium">{cycle.lockedBy}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {cycle.unlockReason && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                              <span className="font-medium text-amber-900">Unlock reason:</span>{' '}
                              <span className="text-amber-800">{cycle.unlockReason}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 text-xs text-slate-600">
                          {cycle.changesSummary && (
                            <div className="flex items-center gap-1">
                              <Edit className="w-3 h-3" />
                              <span>{cycle.changesSummary}</span>
                            </div>
                          )}
                          {cycle.findingsResolved !== undefined && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>{cycle.findingsResolved} findings resolved</span>
                            </div>
                          )}
                          {cycle.commentsCount !== undefined && (
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>{cycle.commentsCount} comments</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cycle Events (Expanded) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pl-12 border-t border-slate-200 bg-white">
                        <div className="mt-3 space-y-3">
                          {cycle.events.map((event, eventIndex) => (
                            <div key={eventIndex} className="flex gap-3">
                              <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-slate-900">{event.action}</span>
                                  <span className="text-xs text-slate-500">•</span>
                                  <span className="text-xs text-slate-600">{event.user}</span>
                                  <span className="text-xs text-slate-500">({event.userRole})</span>
                                  <span className="text-xs text-slate-500">•</span>
                                  <span className="text-xs text-slate-500">{event.timestamp}</span>
                                </div>
                                {event.details && (
                                  <p className="text-xs text-slate-600 mt-1">{event.details}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-600">
            Complete audit trail maintained for 21 CFR Part 11 and EU MDR compliance
          </p>
        </div>
      </div>
    </div>
  );
}