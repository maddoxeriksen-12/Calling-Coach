import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PlusCircle, TrendingUp, TrendingDown, BarChart3, Clock, Loader2 } from 'lucide-react';

const DIMENSION_LABELS = {
  term_understanding: 'Term Knowledge',
  description_breadth: 'Breadth',
  conciseness: 'Conciseness',
  objection_handling: 'Objections',
  usp_framing: 'USP Framing',
  confidence: 'Confidence',
};

const PERSONALITY_LABELS = {
  skeptical_buyer: 'Skeptical Buyer',
  analytical_decision_maker: 'Analytical',
  busy_executive: 'Busy Executive',
  friendly_non_committal: 'Friendly',
  technical_expert: 'Technical Expert',
  price_focused_negotiator: 'Price Focused',
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getSessions()])
      .then(([d, s]) => { setDashboard(d); setSessions(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const hasData = dashboard && dashboard.total_sessions > 0;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Track your sales pitch performance over time.</p>
        </div>
        <Link
          to="/new-session"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Session
        </Link>
      </div>

      {!hasData ? (
        <div className="bg-[#1e293b] rounded-xl p-12 border border-slate-700 text-center">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No sessions yet</h3>
          <p className="text-slate-400 mb-6">Complete your first practice call to see your performance data.</p>
          <Link
            to="/new-session"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Start First Session
          </Link>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Sessions" value={dashboard.total_sessions} />
            <StatCard label="Average Score" value={Math.round(dashboard.average_scores?.overall || 0)} suffix="/100" />
            <StatCard
              label="Strongest"
              value={DIMENSION_LABELS[dashboard.strongest_dimension] || '—'}
              icon={<TrendingUp className="w-4 h-4 text-green-400" />}
            />
            <StatCard
              label="Weakest"
              value={DIMENSION_LABELS[dashboard.weakest_dimension] || '—'}
              icon={<TrendingDown className="w-4 h-4 text-amber-400" />}
            />
          </div>

          {/* Score trend chart */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700 mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Score Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dashboard.score_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  stroke="#475569"
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} stroke="#475569" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="overall" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Averages by dimension */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700 mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Average by Dimension</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                const val = dashboard.average_scores?.[key] || 0;
                let color = 'text-red-400';
                if (val >= 80) color = 'text-green-400';
                else if (val >= 60) color = 'text-amber-400';
                else if (val >= 40) color = 'text-orange-400';
                return (
                  <div key={key} className="bg-[#0f172a] rounded-lg p-4 border border-slate-700">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{Math.round(val)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By personality */}
          {Object.keys(dashboard.by_personality).length > 0 && (
            <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700 mb-8">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">By Personality Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(dashboard.by_personality).map(([key, data]) => (
                  <div key={key} className="bg-[#0f172a] rounded-lg p-4 border border-slate-700">
                    <p className="text-xs text-slate-500 mb-1">{PERSONALITY_LABELS[key] || key}</p>
                    <p className="text-2xl font-bold text-white">{Math.round(data.average_overall)}</p>
                    <p className="text-xs text-slate-500">{data.count} session{data.count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session history */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Session History
            </h3>
            <div className="space-y-2">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  to={s.status === 'completed' ? `/scorecard/${s.id}` : '#'}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-600 bg-[#0f172a] hover:border-slate-500 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{s.product_name}</p>
                    <p className="text-xs text-slate-400">
                      {PERSONALITY_LABELS[s.personality_type] || s.personality_type} · {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {s.overall_score != null ? (
                      <span className={`text-lg font-bold ${
                        s.overall_score >= 80 ? 'text-green-400' :
                        s.overall_score >= 60 ? 'text-amber-400' :
                        s.overall_score >= 40 ? 'text-orange-400' : 'text-red-400'
                      }`}>
                        {Math.round(s.overall_score)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded">{s.status}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, suffix, icon }) {
  return (
    <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">
        {value}{suffix && <span className="text-sm text-slate-400 font-normal">{suffix}</span>}
      </p>
    </div>
  );
}
