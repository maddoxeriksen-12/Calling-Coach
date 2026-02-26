import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, Trophy, AlertTriangle, TrendingUp, Loader2, MessageSquare } from 'lucide-react';

const DIMENSION_LABELS = {
  term_understanding: 'Term Knowledge',
  description_breadth: 'Description Breadth',
  conciseness: 'Conciseness',
  objection_handling: 'Objection Handling',
  usp_framing: 'USP Framing',
  confidence: 'Confidence',
};

function ScoreBadge({ score }) {
  let color = 'text-red-400 bg-red-400/10';
  if (score >= 80) color = 'text-green-400 bg-green-400/10';
  else if (score >= 60) color = 'text-amber-400 bg-amber-400/10';
  else if (score >= 40) color = 'text-orange-400 bg-orange-400/10';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${color}`}>
      {Math.round(score)}
    </span>
  );
}

export default function Scorecard() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await api.getSession(sessionId);
        setSession(data);
        if (data.status === 'completed' && data.scores) {
          setLoading(false);
        } else {
          setTimeout(poll, 3000);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    poll();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-slate-400">Analyzing your performance...</p>
        <p className="text-sm text-slate-500">This takes 10-15 seconds</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">{error || 'Session not found'}</p>
      </div>
    );
  }

  const scores = session.scores;
  const feedback = scores?.detailed_feedback || {};

  const radarData = Object.entries(DIMENSION_LABELS).map(([key, label]) => ({
    dimension: label,
    score: scores?.[key] || 0,
    fullMark: 100,
  }));

  return (
    <div className="max-w-5xl mx-auto p-8">
      <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Session Scorecard</h1>
          <p className="text-slate-400">
            {session.product_name} — {session.personality_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white">{Math.round(scores?.overall || 0)}</div>
          <div className="text-sm text-slate-400">Overall Score</div>
        </div>
      </div>

      {/* Radar chart + dimension scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Performance Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} />
              <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Dimension Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
              const val = scores?.[key] || 0;
              let barColor = 'bg-red-500';
              if (val >= 80) barColor = 'bg-green-500';
              else if (val >= 60) barColor = 'bg-amber-500';
              else if (val >= 40) barColor = 'bg-orange-500';
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{label}</span>
                    <ScoreBadge score={val} />
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {feedback.strengths?.length > 0 && (
          <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
            <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Strengths
            </h3>
            <ul className="space-y-2">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">+</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {feedback.improvements?.length > 0 && (
          <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
            <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Areas to Improve
            </h3>
            <ul className="space-y-2">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">{i + 1}.</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {feedback.rambling_instances > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            You rambled <strong>{feedback.rambling_instances}</strong> time{feedback.rambling_instances > 1 ? 's' : ''} during this session. Work on delivering tighter, more focused answers.
          </p>
        </div>
      )}

      {/* Per-answer breakdown */}
      {feedback.per_answer_feedback?.length > 0 && (
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Answer-by-Answer Breakdown
          </h3>
          <div className="space-y-4">
            {feedback.per_answer_feedback.map((item, i) => (
              <div key={i} className="border border-slate-600 rounded-lg p-4 bg-[#0f172a]">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-indigo-300 font-medium">Q: {item.question}</p>
                  <ScoreBadge score={item.score} />
                </div>
                <p className="text-sm text-slate-400 mb-2">
                  <span className="text-slate-500">Your answer:</span> {item.answer_summary}
                </p>
                <p className="text-sm text-slate-300">{item.feedback}</p>
                {item.improvement && (
                  <p className="text-sm text-cyan-400 mt-2">
                    <span className="font-medium">Better approach:</span> {item.improvement}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time answer scores from during the call */}
      {session.answer_scores?.length > 0 && !feedback.per_answer_feedback?.length && (
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700 mt-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Live Scores (During Call)
          </h3>
          <div className="space-y-3">
            {session.answer_scores.map((a, i) => (
              <div key={i} className="border border-slate-600 rounded-lg p-4 bg-[#0f172a]">
                <p className="text-sm text-indigo-300 mb-1">Q: {a.question}</p>
                <p className="text-sm text-slate-400 mb-2">{a.answer_summary}</p>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>Terms: <ScoreBadge score={a.term_accuracy} /></span>
                  <span>Conciseness: <ScoreBadge score={a.conciseness} /></span>
                  <span>Framing: <ScoreBadge score={a.framing_quality} /></span>
                </div>
                {a.feedback && <p className="text-sm text-slate-300 mt-2">{a.feedback}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
