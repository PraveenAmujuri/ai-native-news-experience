import React, { useState, useEffect, useMemo } from 'react';
import { 
  Newspaper, 
  TrendingUp, 
  Rocket, 
  GraduationCap, 
  Search, 
  Play, 
  Clock, 
  Globe, 
  ChevronRight, 
  MessageSquare,
  BarChart3,
  Zap,
  ArrowRight,
  Loader2,
  X,
  Languages,
  LogIn,
  LogOut,
  User as UserIcon,
  Video,
  History,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from './lib/utils';
import { geminiService } from './services/gemini';
import { UserProfile as Persona, NewsArticle, Briefing, StoryArc, VideoSummary } from './types';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

// --- Error Boundary ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-zinc-50">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-200 text-center">
            <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
            <h2 className="text-2xl font-serif font-bold mb-2">Something went wrong</h2>
            <p className="text-zinc-500 text-sm mb-6">We encountered an unexpected error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-black text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-black text-white shadow-lg shadow-black/10" 
        : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
    )}
  >
    <Icon size={20} className={cn(active ? "text-white" : "group-hover:scale-110 transition-transform")} />
    <span className="font-medium text-sm tracking-tight">{label}</span>
  </button>
);

const NewsCard = ({ 
  article, 
  onTranslate, 
  onBriefing,
  onArc,
  onVideo
}: { 
  article: NewsArticle, 
  onTranslate: (text: string) => void,
  onBriefing: (topic: string) => void,
  onArc: (topic: string) => void,
  onVideo: (article: NewsArticle) => void
}) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="group bg-white border border-zinc-200 rounded-2xl p-6 hover:border-black transition-all duration-300 hover:shadow-xl hover:shadow-black/5"
  >
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 px-2 py-1 border border-zinc-100 rounded">
        {article.category}
      </span>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onTranslate(article.summary)}
          className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 hover:text-black"
          title="Translate to Vernacular"
        >
          <Languages size={16} />
        </button>
        <button 
          onClick={() => onBriefing(article.title)}
          className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 hover:text-black"
          title="Deep Briefing"
        >
          <Zap size={16} />
        </button>
        <button 
          onClick={() => onArc(article.title)}
          className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 hover:text-black"
          title="Story Arc Tracker"
        >
          <History size={16} />
        </button>
        <button 
          onClick={() => onVideo(article)}
          className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 hover:text-black"
          title="Generate Video Summary"
        >
          <Video size={16} />
        </button>
      </div>
    </div>
    <h3 className="text-xl font-serif font-medium leading-tight mb-3 group-hover:text-black transition-colors">
      {article.title}
    </h3>
    <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3 mb-4">
      {article.summary}
    </p>
    <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
      <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-mono">
        <Clock size={12} />
        {article.timestamp}
      </div>
      <a 
        href={article.sourceUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-black text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all"
      >
        READ FULL <ChevronRight size={14} />
      </a>
    </div>
  </motion.div>
);

// --- Briefing Modal ---

const BriefingModal = ({ 
  briefing, 
  onClose 
}: { 
  briefing: Briefing; 
  onClose: () => void;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 md:p-12">
          <div className="flex items-center gap-3 text-orange-600 mb-6">
            <Zap size={24} fill="currentColor" />
            <span className="font-mono text-xs uppercase tracking-widest font-bold">Intelligence Briefing</span>
          </div>

          <h2 className="text-4xl font-serif leading-tight mb-8 text-gray-900">{briefing.title}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
              <section>
                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4">Synthesis</h3>
                <div className="prose prose-gray max-w-none">
                  <ReactMarkdown>{briefing.synthesis}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4">Key Takeaways</h3>
                <ul className="space-y-4">
                  {briefing.keyTakeaways.map((point, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-orange-600 text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{point}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="space-y-10">
              <section>
                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-6">Timeline</h3>
                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                  {briefing.timeline.map((event, i) => (
                    <div key={i} className="pl-8 relative">
                      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-orange-500 bg-white z-10" />
                      <div className="text-xs font-bold text-orange-600 mb-1">{event.date}</div>
                      <p className="text-sm text-gray-600 font-medium">{event.event}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="p-6 bg-gray-50 rounded-2xl">
                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4">Market Sentiment</h3>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    briefing.sentiment === 'bullish' ? "bg-green-100 text-green-600" : 
                    briefing.sentiment === 'bearish' ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-600"
                  )}>
                    <TrendingUp size={24} className={briefing.sentiment === 'bearish' ? "rotate-180" : ""} />
                  </div>
                  <div>
                    <div className="text-sm font-bold capitalize">{briefing.sentiment}</div>
                    <div className="text-xs text-gray-500">AI Analysis Confidence: High</div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const StoryArcModal = ({ 
  arc, 
  onClose 
}: { 
  arc: StoryArc, 
  onClose: () => void 
}) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
  >
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col"
    >
      <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History size={16} className="text-indigo-500" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400">Story Arc Tracker</span>
          </div>
          <h2 className="text-3xl font-serif font-bold">{arc.title}</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
        <section>
          <h4 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-8">Interactive Timeline</h4>
          <div className="space-y-12 relative before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-[2px] before:bg-zinc-100">
            {arc.milestones.map((m, i) => (
              <div key={i} className="relative pl-12">
                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border-4 border-black flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </div>
                <div className="bg-zinc-50 rounded-2xl p-6 hover:bg-zinc-100 transition-colors">
                  <span className="text-[10px] font-mono text-zinc-400 block mb-2">{m.date}</span>
                  <h5 className="text-lg font-bold mb-2">{m.event}</h5>
                  <p className="text-sm text-zinc-600 leading-relaxed">{m.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section>
            <h4 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-6">Key Players</h4>
            <div className="grid grid-cols-1 gap-4">
              {arc.players.map((p, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border border-zinc-100 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h6 className="font-bold text-sm">{p.name}</h6>
                    <p className="text-xs text-zinc-500">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-6">What to Watch Next</h4>
            <div className="space-y-4">
              {arc.predictions.map((p, i) => (
                <div key={i} className="p-4 bg-indigo-50 text-indigo-900 rounded-2xl text-sm font-medium flex gap-3">
                  <Zap size={16} className="shrink-0 mt-0.5" />
                  {p}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

// --- Main App ---

function ETApp() {
  const [user, setUser] = useState<User | null>(null);
  const [persona, setPersona] = useState<Persona>('investor');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'feed' | 'studio' | 'arcs' | 'live'>('feed');
  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);
  const [selectedArc, setSelectedArc] = useState<StoryArc | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoSummary | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [translation, setTranslation] = useState<{ text: string, lang: string } | null>(null);
  const [pulseUpdates, setPulseUpdates] = useState<{ id: string, text: string, type: string }[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [trendingArcs, setTrendingArcs] = useState<string[]>(["AI Chip Wars", "Global Supply Chain Shifts", "Reliance Green Energy Pivot", "India's Semiconductor Mission"]);
  const [liveNews, setLiveNews] = useState<NewsArticle[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);

  // Auth & Profile Sync
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      }
    };
    checkKey();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setPersona(userDoc.data().persona as Persona);
        } else {
          // Default profile for new users
          await setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email,
            persona: 'investor',
            role: 'user',
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL
          }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.uid}`));
        }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchNews();
    
    // Realtime Pulse Listener - Only subscribe if user is present or allow public read
    const q = query(collection(db, 'live_pulse'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribePulse = onSnapshot(q, (snapshot) => {
      const updates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setPulseUpdates(updates);
    }, (error) => {
      // Only log if it's not a permission error during initial load (common if auth is slow)
      // Since we allowed public read, this should not happen unless there's a configuration issue
      handleFirestoreError(error, OperationType.LIST, 'live_pulse');
    });

    return () => unsubscribePulse();
  }, [persona]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await geminiService.getPersonalizedNews(persona);
      setNews(data);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveNews = async () => {
    setLiveLoading(true);
    try {
      const data = await geminiService.getPersonalizedNews('investor'); // Use a general profile for live
      setLiveNews(data);
    } catch (error) {
      console.error("Error fetching live news:", error);
    } finally {
      setLiveLoading(false);
    }
  };

  const handleRefreshPulse = async () => {
    setActionLoading("Capturing Market Signals...");
    try {
      const updates = await geminiService.generatePulseUpdates();
      for (const update of updates) {
        const id = Math.random().toString(36).substring(7);
        await setDoc(doc(db, 'live_pulse', id), {
          ...update,
          timestamp: new Date().toISOString()
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, `live_pulse/${id}`));
      }
    } catch (error) {
      console.error("Error refreshing pulse:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handlePersonaChange = async (newPersona: Persona) => {
    setPersona(newPersona);
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { persona: newPersona }, { merge: true })
        .catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));
    }
  };

  const handleBriefing = async (topic: string) => {
    setActionLoading("Synthesizing Intelligence...");
    try {
      const data = await geminiService.getDeepBriefing(topic);
      setSelectedBriefing(data);
    } catch (error) {
      console.error("Error fetching briefing:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStoryArc = async (topic: string) => {
    setActionLoading("Mapping Story Arc...");
    try {
      const data = await geminiService.getStoryArc(topic);
      setSelectedArc(data);
    } catch (error) {
      console.error("Error fetching story arc:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVideoSummary = async (article: NewsArticle) => {
    if (!hasApiKey) {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } else {
        alert("Please select a paid API key in the AI Studio settings to use video features. Learn more at ai.google.dev/gemini-api/docs/billing");
        return;
      }
    }

    setActionLoading("Generating Video Broadcast...");
    try {
      const data = await geminiService.generateVideoSummary(article);
      setSelectedVideo(data);
    } catch (error: any) {
      console.error("Error generating video:", error);
      
      const errorMsg = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
      
      // Handle permission denied or entity not found errors
      if (
        errorMsg.includes("PERMISSION_DENIED") || 
        errorMsg.includes("403") || 
        errorMsg.includes("Requested entity was not found")
      ) {
        setHasApiKey(false);
        alert("API Key permission issue detected. Please ensure you have selected a paid API key from a Google Cloud project with billing enabled. \n\nDocumentation: ai.google.dev/gemini-api/docs/billing");
        if (window.aistudio?.openSelectKey) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true);
        }
      } else {
        alert(`Video generation failed: ${errorMsg}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleTranslate = async (text: string) => {
    setActionLoading("Adapting Context...");
    try {
      const translated = await geminiService.translateNews(text, "Hindi (with local business context)");
      setTranslation({ text: translated, lang: "Hindi" });
    } catch (error) {
      console.error("Error translating:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const mockChartData = useMemo(() => [
    { name: 'Mon', value: 4000 },
    { name: 'Tue', value: 3000 },
    { name: 'Wed', value: 2000 },
    { name: 'Thu', value: 2780 },
    { name: 'Fri', value: 1890 },
    { name: 'Sat', value: 2390 },
    { name: 'Sun', value: 3490 },
  ], []);

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black font-sans selection:bg-black selection:text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-zinc-200 p-8 hidden lg:flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
            <Newspaper size={24} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight">ET Pulse</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400 mb-4 px-4">Persona</div>
          <SidebarItem 
            icon={TrendingUp} 
            label="Investor" 
            active={persona === 'investor'} 
            onClick={() => handlePersonaChange('investor')} 
          />
          <SidebarItem 
            icon={Rocket} 
            label="Founder" 
            active={persona === 'founder'} 
            onClick={() => handlePersonaChange('founder')} 
          />
          <SidebarItem 
            icon={GraduationCap} 
            label="Student" 
            active={persona === 'student'} 
            onClick={() => handlePersonaChange('student')} 
          />
          
          <div className="pt-8 text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400 mb-4 px-4">Experience</div>
          <SidebarItem icon={TrendingUp} label="Feed" active={currentView === 'feed'} onClick={() => setCurrentView('feed')} />
          <SidebarItem icon={Zap} label="Navigator" active={currentView === 'live'} onClick={() => {
            setCurrentView('live');
            fetchLiveNews();
          }} />
          <SidebarItem icon={BarChart3} label="Story Arcs" active={currentView === 'arcs'} onClick={() => setCurrentView('arcs')} />
          <SidebarItem icon={Play} label="Video Studio" active={currentView === 'studio'} onClick={() => setCurrentView('studio')} />
        </nav>

        <div className="mt-auto pt-8 border-t border-zinc-100">
          {user ? (
            <div className="flex items-center justify-between gap-4 bg-zinc-50 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ""} alt="" className="w-8 h-8 rounded-full border border-zinc-200" referrerPolicy="no-referrer" />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">{user.displayName}</p>
                  <p className="text-[10px] text-zinc-400 truncate capitalize">{persona}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="text-zinc-400 hover:text-rose-500 transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
            >
              <LogIn size={18} /> SIGN IN
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-8 lg:p-12 max-w-7xl mx-auto">
        {!hasApiKey && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-amber-900">API Key Required for Video</h4>
                <p className="text-sm text-amber-700">To generate AI video summaries, you must select a paid API key.</p>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold underline hover:text-amber-900 mt-1 inline-block"
                >
                  View Billing Documentation
                </a>
              </div>
            </div>
            <button 
              onClick={async () => {
                if (window.aistudio?.openSelectKey) {
                  await window.aistudio.openSelectKey();
                  setHasApiKey(true);
                }
              }}
              className="bg-amber-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-amber-700 transition-colors whitespace-nowrap"
            >
              Select API Key
            </button>
          </motion.div>
        )}
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8">
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-zinc-400"
            >
              <span className="text-[10px] uppercase tracking-[0.3em] font-black">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl font-serif font-medium tracking-tight leading-[0.9]"
            >
              Your <br /> <span className="italic text-orange-600">Personalized</span> <br /> Newsroom.
            </motion.h2>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search intelligence..." 
                className="bg-white border border-zinc-200 rounded-full py-3 pl-12 pr-6 w-72 focus:outline-none focus:border-black transition-all shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              {['Global', 'India', 'Tech', 'Finance'].map(tag => (
                <button key={tag} className="px-4 py-1.5 rounded-full border border-zinc-200 text-[11px] font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-all">
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Realtime Pulse Ticker */}
        <div className="mb-12 overflow-hidden bg-white border border-zinc-100 rounded-2xl p-4 flex items-center gap-6">
          <div className="flex items-center gap-2 shrink-0 px-4 border-r border-zinc-100">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Live Pulse</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-6">
            <motion.div 
              animate={{ x: [0, -1000] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="flex gap-12 whitespace-nowrap items-center"
            >
              {pulseUpdates.length > 0 ? pulseUpdates.map((update, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn(
                    "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                    update.type === 'market' ? "bg-emerald-100 text-emerald-700" :
                    update.type === 'breaking' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {update.type}
                  </span>
                  <span className="text-sm font-medium text-zinc-600">{update.text}</span>
                </div>
              )) : (
                <div className="text-sm text-zinc-400 italic">Waiting for market signals...</div>
              )}
              {/* Duplicate for seamless loop */}
              {pulseUpdates.map((update, i) => (
                <div key={`dup-${i}`} className="flex items-center gap-3">
                  <span className={cn(
                    "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                    update.type === 'market' ? "bg-emerald-100 text-emerald-700" :
                    update.type === 'breaking' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {update.type}
                  </span>
                  <span className="text-sm font-medium text-zinc-600">{update.text}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Content Views */}
        <AnimatePresence mode="wait">
          {currentView === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Featured Section */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                <div className="lg:col-span-2 bg-black rounded-[2.5rem] p-12 text-white relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockChartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke="#FFFFFF" fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-400">Live Briefing</span>
                      </div>
                      <h3 className="text-4xl font-serif font-medium leading-tight mb-6 max-w-md">
                        The 2026 Union Budget: A Deep Dive into Digital Infrastructure.
                      </h3>
                      <p className="text-zinc-400 text-sm max-w-sm leading-relaxed mb-8">
                        Synthesizing 14 reports from ET, Reuters, and Bloomberg into one actionable intelligence document.
                      </p>
                    </div>
                    <button 
                      onClick={() => handleBriefing("2026 Union Budget Digital Infrastructure")}
                      className="bg-white text-black px-8 py-4 rounded-full font-bold text-sm flex items-center gap-2 w-fit hover:scale-105 transition-transform active:scale-95"
                    >
                      EXPLORE BRIEFING <ArrowRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 flex flex-col">
                  <h4 className="text-xs uppercase tracking-widest font-black text-zinc-400 mb-8">Quick Insights</h4>
                  <div className="space-y-8 flex-1">
                    {[
                      { label: 'Market Sentiment', value: 'Bullish', sub: 'Tech sector leading' },
                      { label: 'Top Mover', value: 'Zomato', sub: '+4.2% on Q3 results' },
                      { label: 'Policy Watch', value: 'GST 3.0', sub: 'Draft released today' }
                    ].map((item, i) => (
                      <div key={i} className="group cursor-pointer">
                        <p className="text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">{item.label}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-serif font-bold group-hover:translate-x-1 transition-transform">{item.value}</span>
                          <ChevronRight size={16} className="text-zinc-300 group-hover:text-black transition-colors" />
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">{item.sub}</p>
                      </div>
                    ))}
                  </div>
                  <button className="mt-8 text-xs font-bold flex items-center gap-2 text-zinc-400 hover:text-black transition-colors">
                    VIEW ALL DATA <ArrowRight size={14} />
                  </button>
                </div>
              </section>

              {/* News Feed */}
              <section>
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                    <h3 className="text-3xl font-serif font-bold">My ET Feed</h3>
                    <div className="h-[1px] w-24 bg-zinc-200" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Tailored for {persona}</span>
                  </div>
                  <button 
                    onClick={fetchNews}
                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-black"
                    disabled={loading}
                  >
                    <Loader2 size={20} className={cn(loading && "animate-spin")} />
                  </button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="bg-white border border-zinc-100 rounded-2xl p-6 h-64 animate-pulse">
                        <div className="w-12 h-4 bg-zinc-100 rounded mb-4" />
                        <div className="w-full h-6 bg-zinc-100 rounded mb-2" />
                        <div className="w-3/4 h-6 bg-zinc-100 rounded mb-6" />
                        <div className="w-full h-4 bg-zinc-100 rounded mb-2" />
                        <div className="w-full h-4 bg-zinc-100 rounded mb-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                      {news.map((article) => (
                        <NewsCard 
                          key={article.id} 
                          article={article} 
                          onTranslate={handleTranslate}
                          onBriefing={handleBriefing}
                          onArc={handleStoryArc}
                          onVideo={handleVideoSummary}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {currentView === 'studio' && (
            <motion.div
              key="studio"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-3xl font-serif font-bold">Video Studio</h3>
                <div className="h-[1px] w-24 bg-zinc-200" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Broadcast-Quality AI Production</span>
              </div>

              {selectedVideo ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 bg-black rounded-[2.5rem] overflow-hidden shadow-2xl aspect-video relative">
                    <video 
                      src={selectedVideo.videoUrl} 
                      controls 
                      autoPlay 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-8">
                    <div className="p-8 bg-white border border-zinc-100 rounded-3xl h-full overflow-y-auto max-h-[500px] custom-scrollbar">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare size={16} className="text-orange-600" />
                        <h4 className="text-xs uppercase tracking-widest font-black text-zinc-400">Narration Script</h4>
                      </div>
                      <div className="prose prose-sm prose-zinc">
                        <ReactMarkdown>{selectedVideo.script || "No script available."}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border-2 border-dashed border-zinc-200 rounded-[2.5rem] p-24 text-center">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Video size={40} className="text-zinc-300" />
                  </div>
                  <h4 className="text-xl font-serif font-bold mb-2">No Video Generated</h4>
                  <p className="text-zinc-400 text-sm max-w-sm mx-auto mb-8">
                    Select any news article from your feed and click the video icon to generate a broadcast-quality summary.
                  </p>
                  <button 
                    onClick={() => setCurrentView('feed')}
                    className="bg-black text-white px-8 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                  >
                    GO TO FEED
                  </button>
                </div>
              )}

              <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white border border-zinc-100 rounded-3xl">
                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4">
                    <Zap size={20} />
                  </div>
                  <h5 className="font-bold mb-2">AI Narration</h5>
                  <p className="text-xs text-zinc-500 leading-relaxed">Authoritative news-anchor style voice synthesis tailored to the story's tone.</p>
                </div>
                <div className="p-8 bg-white border border-zinc-100 rounded-3xl">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <BarChart3 size={20} />
                  </div>
                  <h5 className="font-bold mb-2">Data Visuals</h5>
                  <p className="text-xs text-zinc-500 leading-relaxed">Dynamic charts and infographics generated in real-time from article data.</p>
                </div>
                <div className="p-8 bg-white border border-zinc-100 rounded-3xl">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                    <Globe size={20} />
                  </div>
                  <h5 className="font-bold mb-2">Contextual Overlays</h5>
                  <p className="text-xs text-zinc-500 leading-relaxed">Relevant b-roll and stock footage overlays to provide visual context.</p>
                </div>
              </section>
            </motion.div>
          )}

          {currentView === 'arcs' && (
            <motion.div
              key="arcs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-3xl font-serif font-bold">Story Arc Tracker</h3>
                <div className="h-[1px] w-24 bg-zinc-200" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Visual Narrative Mapping</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {trendingArcs.map((topic, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleStoryArc(topic)}
                    className="bg-white border border-zinc-200 rounded-[2rem] p-8 cursor-pointer group hover:border-black transition-all"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Trending Arc</span>
                      </div>
                      <History size={20} className="text-zinc-200 group-hover:text-black transition-colors" />
                    </div>
                    <h4 className="text-2xl font-serif font-bold mb-4">{topic}</h4>
                    <p className="text-zinc-500 text-sm mb-6 line-clamp-2">
                      Mapping the evolution of {topic} with real-time milestones and impact analysis.
                    </p>
                    <div className="flex items-center gap-2 text-black text-xs font-bold">
                      EXPLORE ARC <ArrowRight size={14} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {currentView === 'live' && (
            <motion.div
              key="live"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-3xl font-serif font-bold">Live Intelligence</h3>
                  <div className="h-[1px] w-24 bg-zinc-200" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Real-time Market Signals</span>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleRefreshPulse}
                    className="flex items-center gap-2 bg-rose-500 text-white px-6 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform shadow-lg shadow-rose-500/20"
                  >
                    <Zap size={14} /> REFRESH PULSE
                  </button>
                  <button 
                    onClick={fetchLiveNews}
                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-black"
                    disabled={liveLoading}
                  >
                    <Loader2 size={20} className={cn(liveLoading && "animate-spin")} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {liveLoading ? (
                  [1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white border border-zinc-100 rounded-2xl p-6 h-64 animate-pulse" />
                  ))
                ) : (
                  liveNews.map((article) => (
                    <NewsCard 
                      key={article.id} 
                      article={article} 
                      onTranslate={handleTranslate}
                      onBriefing={handleBriefing}
                      onArc={handleStoryArc}
                      onVideo={handleVideoSummary}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {selectedBriefing && (
          <BriefingModal 
            briefing={selectedBriefing} 
            onClose={() => setSelectedBriefing(null)} 
          />
        )}

        {selectedArc && (
          <StoryArcModal 
            arc={selectedArc} 
            onClose={() => setSelectedArc(null)} 
          />
        )}

        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          >
            <div className="w-full max-w-5xl aspect-video relative bg-black rounded-3xl overflow-hidden shadow-2xl">
              <video 
                src={selectedVideo.videoUrl} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
              />
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X size={24} />
              </button>
              <div className="absolute bottom-6 left-6 right-6 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white font-serif italic text-lg">{selectedVideo.prompt}</p>
              </div>
            </div>
          </motion.div>
        )}

        {actionLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white"
          >
            <div className="relative w-24 h-24 mb-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t-2 border-white rounded-full"
              />
              <Zap size={40} className="absolute inset-0 m-auto text-amber-400 animate-pulse" />
            </div>
            <h3 className="text-2xl font-serif italic mb-2">{actionLoading}</h3>
            <p className="text-zinc-400 text-sm font-mono tracking-widest uppercase">Analyzing 24+ sources</p>
          </motion.div>
        )}

        {translation && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 right-8 z-50 w-96 bg-white border border-zinc-200 rounded-3xl shadow-2xl p-8 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Languages size={16} className="text-zinc-400" />
                <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400">{translation.lang} Adaptation</span>
              </div>
              <button onClick={() => setTranslation(null)} className="p-1 hover:bg-zinc-100 rounded-full">
                <X size={16} />
              </button>
            </div>
            <div className="prose prose-sm prose-zinc">
              <p className="text-sm leading-relaxed text-zinc-700">{translation.text}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-50 flex justify-between items-center">
              <span className="text-[10px] font-mono text-zinc-300">AI-Powered Vernacular Engine</span>
              <button className="text-[10px] font-bold uppercase tracking-wider hover:underline">Copy Text</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Mobile Sidebar */}
      <button className="lg:hidden fixed bottom-8 left-8 z-40 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center">
        <Newspaper size={24} />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ETApp />
    </ErrorBoundary>
  );
}
