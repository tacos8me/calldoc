'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ClipboardCheck,
  ChevronDown,
  Loader2,
  Star,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScorecardCriterion {
  id: string;
  label: string;
  weight: number;
  maxScore: number;
}

export interface ScorecardCategory {
  name: string;
  criteria: ScorecardCriterion[];
}

export interface ScorecardTemplateDef {
  id: string;
  name: string;
  categories: ScorecardCategory[];
}

export interface ScorecardPanelProps {
  /** Recording ID this scorecard is for */
  recordingId: string;
  /** Callback when score is submitted */
  onSubmit?: (data: {
    templateId: string;
    scores: Record<string, number>;
    comments: string;
    overallScore: number;
  }) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Mock templates
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: ScorecardTemplateDef[] = [
  {
    id: 'tpl_001',
    name: 'Standard QA',
    categories: [
      {
        name: 'Opening',
        criteria: [
          { id: 'c1', label: 'Greeting & Introduction', weight: 10, maxScore: 10 },
          { id: 'c2', label: 'Caller Verification', weight: 10, maxScore: 10 },
        ],
      },
      {
        name: 'Issue Handling',
        criteria: [
          { id: 'c3', label: 'Problem Identification', weight: 15, maxScore: 10 },
          { id: 'c4', label: 'Knowledge & Accuracy', weight: 20, maxScore: 10 },
          { id: 'c5', label: 'Efficiency', weight: 15, maxScore: 10 },
        ],
      },
      {
        name: 'Communication',
        criteria: [
          { id: 'c6', label: 'Tone & Empathy', weight: 15, maxScore: 10 },
          { id: 'c7', label: 'Clarity', weight: 10, maxScore: 10 },
        ],
      },
      {
        name: 'Closing',
        criteria: [
          { id: 'c8', label: 'Resolution Confirmation', weight: 5, maxScore: 10 },
        ],
      },
    ],
  },
  {
    id: 'tpl_002',
    name: 'Sales QA',
    categories: [
      {
        name: 'Rapport Building',
        criteria: [
          { id: 's1', label: 'Professional Greeting', weight: 10, maxScore: 10 },
          { id: 's2', label: 'Active Listening', weight: 15, maxScore: 10 },
        ],
      },
      {
        name: 'Sales Technique',
        criteria: [
          { id: 's3', label: 'Needs Discovery', weight: 20, maxScore: 10 },
          { id: 's4', label: 'Product Knowledge', weight: 20, maxScore: 10 },
          { id: 's5', label: 'Objection Handling', weight: 15, maxScore: 10 },
        ],
      },
      {
        name: 'Close',
        criteria: [
          { id: 's6', label: 'Call to Action', weight: 15, maxScore: 10 },
          { id: 's7', label: 'Follow-up Plan', weight: 5, maxScore: 10 },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// ScorecardPanel
// ---------------------------------------------------------------------------

export function ScorecardPanel({
  recordingId,
  onSubmit,
  className,
}: ScorecardPanelProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(MOCK_TEMPLATES[0].id);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const template = MOCK_TEMPLATES.find((t) => t.id === selectedTemplateId) || MOCK_TEMPLATES[0];

  // Calculate totals
  const { overallScore, maxPossible } = useMemo(() => {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const cat of template.categories) {
      for (const crit of cat.criteria) {
        const score = scores[crit.id];
        if (score !== undefined) {
          weightedSum += (score / crit.maxScore) * crit.weight;
        }
        totalWeight += crit.weight;
      }
    }

    return {
      overallScore: totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0,
      maxPossible: 100,
    };
  }, [scores, template]);

  const handleScoreChange = useCallback((criterionId: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    onSubmit?.({
      templateId: selectedTemplateId,
      scores,
      comments,
      overallScore,
    });
    setSubmitting(false);
    setSubmitted(true);
  }, [selectedTemplateId, scores, comments, overallScore, onSubmit]);

  const handleReset = useCallback(() => {
    setScores({});
    setComments('');
    setSubmitted(false);
  }, []);

  // Score color
  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-[var(--accent-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Quality Scorecard
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-2xl font-bold tabular-nums', getScoreColor(overallScore))}>
            {overallScore}
          </span>
          <span className="text-sm text-[var(--text-tertiary)]">/ {maxPossible}</span>
        </div>
      </div>

      {/* Template selector */}
      <div className="border-b border-[var(--border-default)] px-4 py-3">
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          Template
        </label>
        <div className="relative">
          <select
            value={selectedTemplateId}
            onChange={(e) => {
              setSelectedTemplateId(e.target.value);
              setScores({});
              setSubmitted(false);
            }}
            className="w-full appearance-none rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 pr-8 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            {MOCK_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
        </div>
      </div>

      {/* Criteria */}
      <div className="flex-1 overflow-y-auto">
        {template.categories.map((cat) => (
          <div key={cat.name} className="border-b border-[var(--border-default)]">
            <div className="bg-[var(--bg-elevated)] px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                {cat.name}
              </span>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              {cat.criteria.map((crit) => {
                const score = scores[crit.id];
                return (
                  <div key={crit.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm text-[var(--text-primary)]">{crit.label}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Weight: {crit.weight}%
                      </p>
                    </div>

                    {/* Score input */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: crit.maxScore }, (_, i) => i + 1).map((val) => (
                        <button
                          key={val}
                          onClick={() => handleScoreChange(crit.id, val)}
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-all',
                            score !== undefined && val <= score
                              ? val <= 3
                                ? 'bg-red-500/20 text-red-400'
                                : val <= 6
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-green-500/20 text-green-400'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)]'
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Comments & Submit */}
      <div className="border-t border-[var(--border-default)] p-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Comments
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder="Additional notes about this evaluation..."
            className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <div className="flex gap-2">
          {submitted ? (
            <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500/10 py-2.5 text-sm font-medium text-green-400">
              <Star className="h-4 w-4" />
              Score Submitted ({overallScore}/100)
            </div>
          ) : (
            <>
              <button
                onClick={handleReset}
                className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)]"
              >
                Reset
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || Object.keys(scores).length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Score'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScorecardPanel;
