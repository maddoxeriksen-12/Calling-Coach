import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Upload, FileText, Trash2, ChevronRight, UserCircle, Loader2 } from 'lucide-react';

const PERSONALITY_ICONS = {
  skeptical_buyer: '🤨',
  analytical_decision_maker: '📊',
  busy_executive: '⏱️',
  friendly_non_committal: '😊',
  technical_expert: '🔧',
  price_focused_negotiator: '💰',
};

export default function SessionSetup() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [personalities, setPersonalities] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPersonality, setSelectedPersonality] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    api.getProducts().then(setProducts).catch(console.error);
    api.getPersonalities().then(setPersonalities).catch(console.error);
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    setError('');
    try {
      const result = await api.uploadProduct(uploadName.trim(), uploadFile);
      const refreshed = await api.getProducts();
      setProducts(refreshed);
      setSelectedProduct(result.id);
      setUploadName('');
      setUploadFile(null);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    await api.deleteProduct(id);
    setProducts(products.filter((p) => p.id !== id));
    if (selectedProduct === id) setSelectedProduct(null);
  };

  const handleStart = async () => {
    if (!selectedProduct || !selectedPersonality) return;
    setCreating(true);
    setError('');
    try {
      const session = await api.createSession(selectedProduct, selectedPersonality);
      navigate(`/call/${session.session_id}`, { state: { vapiConfig: session.vapi_config, personality: session.personality } });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-white mb-2">New Practice Session</h1>
      <p className="text-slate-400 mb-8">Upload your product info, choose a prospect personality, and start your call.</p>

      {/* Progress steps */}
      <div className="flex items-center gap-3 mb-10">
        {[
          { num: 1, label: 'Select Product' },
          { num: 2, label: 'Choose Personality' },
          { num: 3, label: 'Start Call' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-3">
            <button
              onClick={() => s.num < step ? setStep(s.num) : null}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step >= s.num
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {s.num}
            </button>
            <span className={`text-sm ${step >= s.num ? 'text-white' : 'text-slate-500'}`}>{s.label}</span>
            {s.num < 3 && <ChevronRight className="w-4 h-4 text-slate-600" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Step 1: Product selection */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Upload form */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              Upload Product Document
            </h3>
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Product name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className="px-4 py-2.5 bg-[#0f172a] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 file:cursor-pointer"
                />
              </div>
              <button
                type="submit"
                disabled={!uploadFile || !uploadName.trim() || uploading}
                className="self-start px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting USPs...
                  </>
                ) : (
                  'Upload & Extract'
                )}
              </button>
            </form>
          </div>

          {/* Existing products */}
          {products.length > 0 && (
            <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Or Select Existing Product</h3>
              <div className="grid gap-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedProduct(p.id); setStep(2); }}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedProduct === p.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-600 hover:border-slate-500 bg-[#0f172a]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="font-medium text-white">{p.name}</div>
                        <div className="text-xs text-slate-400">
                          {p.usps_count} USPs · {p.terms_count} terms
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Personality selection */}
      {step === 2 && (
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-indigo-400" />
            Choose Prospect Personality
          </h3>
          <p className="text-sm text-slate-400 mb-6">Each personality tests different aspects of your pitch.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(personalities).map(([key, p]) => (
              <div
                key={key}
                onClick={() => { setSelectedPersonality(key); setStep(3); }}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedPersonality === key
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-600 hover:border-slate-500 bg-[#0f172a]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{PERSONALITY_ICONS[key] || '👤'}</span>
                  <span className="font-semibold text-white">{p.label}</span>
                </div>
                <p className="text-sm text-slate-400">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Confirm and start */}
      {step === 3 && (
        <div className="bg-[#1e293b] rounded-xl p-8 border border-slate-700 text-center">
          <div className="text-4xl mb-4">{PERSONALITY_ICONS[selectedPersonality] || '👤'}</div>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Practice</h3>
          <p className="text-slate-400 mb-2">
            Product: <span className="text-white font-medium">{products.find((p) => p.id === selectedProduct)?.name}</span>
          </p>
          <p className="text-slate-400 mb-8">
            Personality: <span className="text-white font-medium">{personalities[selectedPersonality]?.label}</span>
          </p>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8 text-left max-w-md mx-auto">
            <p className="text-amber-400 text-sm font-medium mb-1">Before you start:</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>- Make sure your microphone is enabled</li>
              <li>- The AI will ask you questions about your product</li>
              <li>- Be concise — rambling will be penalized</li>
              <li>- Say "goodbye" when you want to end the session</li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            disabled={creating}
            className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-lg flex items-center gap-2 mx-auto"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up...
              </>
            ) : (
              'Start Call'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
