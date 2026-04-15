import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Rocket, Globe, Zap, ArrowRight, CheckCircle2, Layout, MousePointer2, BarChart3, Github, Settings, LayoutDashboard, TrendingUp, Search, ExternalLink, LogOut, LogIn, User as UserIcon } from 'lucide-react';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

type Tab = 'dashboard' | 'builder' | 'traffic' | 'billboard' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('builder');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billboardFunnels, setBillboardFunnels] = useState<any[]>([]);
  const [myFunnels, setMyFunnels] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<{ plan: string, messages_used: number } | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    fetchBillboard();
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserStats(session.user.id);
        fetchMyFunnels(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserStats(session.user.id);
        fetchMyFunnels(session.user.id);
      } else {
        setUserStats(null);
        setMyFunnels([]);
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      alert('Payment successful! Your funnel is now live on the billboard.');
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent, type: 'login' | 'signup') => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const { error } = type === 'login' 
        ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        : await supabase.auth.signUp({ email: authEmail, password: authPassword });
      
      if (error) throw error;
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchBillboard = async () => {
    try {
      const res = await fetch('/api/billboard');
      const data = await res.json();
      setBillboardFunnels(data.funnels);
    } catch (err) {
      console.error('Failed to fetch billboard', err);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      const res = await fetch(`/api/user-stats?userId=${userId}`);
      const data = await res.json();
      setUserStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchMyFunnels = async (userId: string) => {
    try {
      const res = await fetch(`/api/my-funnels?userId=${userId}`);
      const data = await res.json();
      setMyFunnels(data.funnels);
    } catch (err) {
      console.error('Failed to fetch my funnels', err);
    }
  };

  const handleCheckout = async () => {
    if (!generatedHtml) return;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          html: generatedHtml, 
          prompt,
          userId: user.id 
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCryptoCheckout = async () => {
    if (!generatedHtml) return;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/checkout/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          html: generatedHtml, 
          prompt,
          userId: user.id
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Crypto checkout failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Crypto checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedHtml(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userId: user?.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate funnel');
      }
      
      const data = await response.json();
      setGeneratedHtml(data.html);
      if (user) fetchUserStats(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        activeTab === id 
          ? 'bg-primary text-white font-semibold' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-secondary text-white flex flex-col border-r border-white/10 p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">Funnel<span className="text-primary">Forge</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="builder" icon={Layout} label="Funnel Builder" />
          <NavItem id="traffic" icon={TrendingUp} label="Traffic Engine" />
          <NavItem id="billboard" icon={Globe} label="Global Billboard" />
          <NavItem id="settings" icon={Settings} label="Settings" />
        </nav>

        <div className="mt-auto space-y-4">
          {user ? (
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.email}</p>
                  <p className="text-[10px] text-text-muted uppercase font-bold">
                    {userStats?.plan === 'pro' ? 'Pro Member' : `Free Plan (${userStats?.messages_used || 0}/3)`}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-text-muted hover:text-white transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}

          <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center">
            <p className="text-xs text-success font-bold uppercase tracking-wider mb-1">Engine Status</p>
            <p className="text-sm font-bold text-white">ACTIVE</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="px-10 py-8 flex justify-between items-end shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-text-main">
              {activeTab === 'builder' && 'Funnel Builder'}
              {activeTab === 'traffic' && 'SEO Traffic Machine'}
              {activeTab === 'billboard' && 'Global Billboard'}
              {activeTab === 'dashboard' && 'Performance Overview'}
              {activeTab === 'settings' && 'Account Settings'}
            </h1>
            <p className="text-text-muted mt-1">
              {activeTab === 'builder' && 'Create high-converting landing pages with AI'}
              {activeTab === 'traffic' && 'Programmatic SEO & Viral Loop Control Center'}
              {activeTab === 'billboard' && 'Live community funnels driving traffic'}
              {activeTab === 'dashboard' && 'Monitor your funnel performance and revenue'}
              {activeTab === 'settings' && 'Manage your domain and API configurations'}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-border-light rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
              Documentation
            </button>
            <button 
              onClick={() => setActiveTab('builder')}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm"
            >
              New Campaign
            </button>
          </div>
        </header>

        <div className="px-10 pb-10 space-y-8">
          {activeTab === 'builder' && (
            <div className="space-y-8">
              {/* Stats Grid Mockup */}
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'Active Funnels', value: '12', trend: '↑ 2 new this week' },
                  { label: 'Total Leads', value: '1,284', trend: '↑ 24% vs last month' },
                  { label: 'Conversion Rate', value: '4.8%', trend: '↑ 0.5% improvement' },
                  { label: 'Revenue', value: '$2,450', trend: '↑ $420 viral boost' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-border-light shadow-sm">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-2 block">{stat.label}</span>
                    <div className="text-2xl font-bold text-text-main">{stat.value}</div>
                    <div className="text-[10px] mt-2 text-success font-semibold">{stat.trend}</div>
                  </div>
                ))}
              </div>

              {/* Builder UI */}
              <div className="bg-white rounded-2xl border border-border-light shadow-sm p-8">
                <div className="max-w-3xl mx-auto text-center mb-10">
                  <h2 className="text-2xl font-bold mb-3">Forging Your Next Funnel</h2>
                  <p className="text-text-muted">Describe your product or service, and our AI will craft a complete, conversion-optimized landing page.</p>
                </div>

                <form onSubmit={handleGenerate} className="max-w-2xl mx-auto relative group mb-12">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-400 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000" />
                  <div className="relative flex flex-col md:flex-row gap-2 p-2 bg-app-bg border border-border-light rounded-2xl shadow-inner">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., A high-converting OnlyFans landing page with subscription button..."
                      className="flex-1 bg-transparent px-4 py-3 outline-none text-text-main placeholder:text-text-muted"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="bg-primary hover:bg-orange-600 disabled:bg-orange-300 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Forging...
                        </>
                      ) : (
                        <>
                          Build Funnel
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <AnimatePresence>
                  {(generatedHtml || isGenerating) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-12"
                    >
                      <div className="bg-secondary rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                          </div>
                          <div className="flex-1 flex justify-center">
                            <div className="bg-black/40 px-3 py-1 rounded text-[9px] font-mono text-gray-500 flex items-center gap-2">
                              <Globe className="w-3 h-3" />
                              preview.funnelforge.ai/temp-funnel
                            </div>
                          </div>
                        </div>
                        <div className="relative aspect-video bg-white">
                          {isGenerating ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary">
                              <div className="w-12 h-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                              <p className="text-primary font-bold animate-pulse text-sm">Analyzing conversion patterns...</p>
                            </div>
                          ) : (
                            <iframe
                              srcDoc={generatedHtml || ''}
                              className="w-full h-full border-none"
                              title="Funnel Preview"
                            />
                          )}
                        </div>
                      </div>
                      {!isGenerating && generatedHtml && (
                        <div className="mt-6 flex flex-wrap justify-center gap-4">
                          <button 
                            onClick={handleCheckout}
                            disabled={isCheckingOut}
                            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-primary/20 disabled:bg-orange-300"
                          >
                            {isCheckingOut ? 'Redirecting...' : 'Deploy with Card ($10)'}
                          </button>
                          <button 
                            onClick={handleCryptoCheckout}
                            disabled={isCheckingOut}
                            className="bg-secondary text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg disabled:bg-gray-800"
                          >
                            {isCheckingOut ? 'Redirecting...' : 'Deploy with Crypto ($10)'}
                          </button>
                          <button className="bg-white border border-border-light text-text-main px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all">
                            Edit with AI
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {activeTab === 'traffic' && (
            <div className="space-y-8">
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'SEO Pages Live', value: '42', trend: '↑ 12% vs last week' },
                  { label: 'Google Indexed', value: '28', trend: '↑ 8% crawl rate' },
                  { label: 'Monthly Traffic', value: '1,482', trend: '↑ 400% viral boost' },
                  { label: 'Monthly MRR', value: '$4,210', trend: '↑ 24% revenue gain' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-border-light shadow-sm">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-2 block">{stat.label}</span>
                    <div className="text-2xl font-bold text-text-main">{stat.value}</div>
                    <div className="text-[10px] mt-2 text-success font-semibold">{stat.trend}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border-light bg-gray-50/50 flex justify-between items-center">
                  <h2 className="text-sm font-bold">Active Programmatic SEO Pages</h2>
                  <div className="text-[10px] text-text-muted">Last updated 14m ago</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider text-text-muted font-bold">
                        <th className="px-6 py-3 border-b border-border-light">Keyword / Slug</th>
                        <th className="px-6 py-3 border-b border-border-light">Status</th>
                        <th className="px-6 py-3 border-b border-border-light text-right">Clicks (30d)</th>
                        <th className="px-6 py-3 border-b border-border-light text-right">Conversion</th>
                        <th className="px-6 py-3 border-b border-border-light text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {[
                        { slug: 'onlyfans-funnel-builder', status: 'Live', clicks: '842', conv: '4.2%', rev: '$1,240' },
                        { slug: 'ai-landing-page-generator', status: 'Indexed', clicks: '310', conv: '3.1%', rev: '$850' },
                        { slug: 'link-in-bio-ai-tool', status: 'Live', clicks: '215', conv: '2.8%', rev: '$420' },
                        { slug: 'lead-capture-squeeze-page', status: 'Live', clicks: '94', conv: '11.4%', rev: '$1,100' },
                        { slug: 'dropshipping-product-page', status: 'Crawled', clicks: '21', conv: '1.2%', rev: '$0' },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 border-b border-border-light font-bold text-text-main">
                            <a href={`/seo/${row.slug}`} target="_blank" className="hover:text-primary flex items-center gap-2">
                              {row.slug}
                              <ExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                          </td>
                          <td className="px-6 py-4 border-b border-border-light">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              row.status === 'Live' ? 'bg-success/10 text-success' : 'bg-blue-500/10 text-blue-600'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-b border-border-light text-right font-mono">{row.clicks}</td>
                          <td className="px-6 py-4 border-b border-border-light text-right font-mono">{row.conv}</td>
                          <td className="px-6 py-4 border-b border-border-light text-right font-bold text-text-main">{row.rev}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-4">
                {[
                  { week: 'Week 1 (Current)', amount: '$50', opacity: '100' },
                  { week: 'Week 2', amount: '$200', opacity: '80' },
                  { week: 'Week 4', amount: '$1,000', opacity: '60' },
                  { week: 'Week 8 (Target)', amount: '$5,000', opacity: '40' },
                ].map((proj, i) => (
                  <div 
                    key={i} 
                    className="flex-1 h-16 bg-white border border-border-light border-l-4 border-l-primary rounded-lg flex flex-col justify-center px-4 shadow-sm"
                    style={{ opacity: `${proj.opacity}%` }}
                  >
                    <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{proj.week}</div>
                    <div className="text-lg font-bold text-text-main">{proj.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'billboard' && (
            <div className="space-y-8">
              <div className="bg-primary p-12 rounded-3xl relative overflow-hidden shadow-xl shadow-primary/20">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
                </div>
                <div className="relative z-10 text-center max-w-2xl mx-auto">
                  <h2 className="text-4xl md:text-5xl font-black text-black mb-6 uppercase tracking-tighter italic leading-none">
                    The Global Funnel Billboard
                  </h2>
                  <p className="text-black/80 text-lg font-bold mb-0">
                    Every paid funnel appears here for 24 hours. Get instant traffic from the FunnelForge community.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {billboardFunnels.length > 0 ? (
                  billboardFunnels.map((funnel, i) => (
                    <div key={funnel.id} className="aspect-video bg-white rounded-2xl border border-border-light overflow-hidden group relative shadow-sm hover:shadow-md transition-all">
                      <iframe 
                        srcDoc={funnel.html} 
                        className="w-full h-full border-none pointer-events-none scale-[0.25] origin-top-left" 
                        style={{ width: '400%', height: '400%' }}
                      />
                      <div className="absolute inset-0 bg-secondary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                         <a 
                          href={`/f/${funnel.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white text-secondary px-6 py-2 rounded-full text-xs font-bold shadow-xl hover:scale-105 transition-transform"
                         >
                           View Live Funnel
                         </a>
                      </div>
                    </div>
                  ))
                ) : (
                  [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="aspect-video bg-white/50 border-2 border-dashed border-border-light rounded-2xl flex items-center justify-center text-text-muted/40 font-bold italic text-sm">
                      AD SPACE #{i}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
             <div className="space-y-8">
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: 'My Funnels', value: myFunnels.length.toString(), trend: 'Live deployments' },
                    { label: 'AI Usage', value: `${userStats?.messages_used || 0}/3`, trend: userStats?.plan === 'pro' ? 'Unlimited' : 'Daily limit' },
                    { label: 'Account Plan', value: userStats?.plan?.toUpperCase() || 'FREE', trend: 'Status' },
                    { label: 'Total Revenue', value: '$0.00', trend: 'Lifetime' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-border-light shadow-sm">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-2 block">{stat.label}</span>
                      <div className="text-2xl font-bold text-text-main">{stat.value}</div>
                      <div className="text-[10px] mt-2 text-success font-semibold">{stat.trend}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-border-light bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-sm font-bold">My Deployed Funnels</h2>
                    <button 
                      onClick={() => setActiveTab('builder')}
                      className="text-[10px] text-primary font-bold uppercase hover:underline"
                    >
                      + Create New
                    </button>
                  </div>
                  {myFunnels.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider text-text-muted font-bold">
                            <th className="px-6 py-3 border-b border-border-light">Funnel ID</th>
                            <th className="px-6 py-3 border-b border-border-light">Prompt Snippet</th>
                            <th className="px-6 py-3 border-b border-border-light">Created</th>
                            <th className="px-6 py-3 border-b border-border-light text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {myFunnels.map((funnel) => (
                            <tr key={funnel.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 border-b border-border-light font-mono text-xs text-text-muted">
                                {funnel.id.substring(0, 8)}...
                              </td>
                              <td className="px-6 py-4 border-b border-border-light font-bold text-text-main truncate max-w-[200px]">
                                {funnel.prompt}
                              </td>
                              <td className="px-6 py-4 border-b border-border-light text-text-muted">
                                {new Date(funnel.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 border-b border-border-light text-right">
                                <a 
                                  href={`/f/${funnel.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-bold text-xs flex items-center justify-end gap-1"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <Layout className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-text-muted text-sm">You haven't deployed any funnels yet.</p>
                      <button 
                        onClick={() => setActiveTab('builder')}
                        className="mt-4 text-primary font-bold text-sm hover:underline"
                      >
                        Start building now →
                      </button>
                    </div>
                  )}
                </div>
             </div>
          )}

          {activeTab === 'settings' && (
             <div className="max-w-2xl bg-white rounded-2xl border border-border-light shadow-sm p-8">
                <h2 className="text-xl font-bold mb-6">Account Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Custom Domain</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="funnels.yourdomain.com" className="flex-1 bg-app-bg border border-border-light rounded-lg px-4 py-2 text-sm outline-none focus:border-primary transition-colors" />
                      <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold">Connect</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Stripe Integration</label>
                    <div className="p-4 bg-success/5 border border-success/20 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <span className="text-sm font-semibold">Stripe Connected</span>
                      </div>
                      <button className="text-xs font-bold text-text-muted hover:text-text-main transition-colors underline">Manage</button>
                    </div>
                  </div>
                </div>
             </div>
          )}
        </div>

        <footer className="mt-auto px-10 py-8 border-t border-border-light bg-white/50 backdrop-blur-sm">
          <div className="flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-widest">
            <div>© 2024 FunnelForge AI • Built with ⚡ in AI Studio</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </footer>
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-secondary/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-primary fill-current" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-main">Welcome to FunnelForge</h2>
                  <p className="text-text-muted text-sm mt-1">Sign in to start forging high-converting funnels.</p>
                </div>

                <form className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-app-bg border border-border-light rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Password</label>
                    <input 
                      type="password" 
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-app-bg border border-border-light rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={(e) => handleAuth(e, 'login')}
                      disabled={isAuthLoading}
                      className="bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {isAuthLoading ? 'Loading...' : 'Sign In'}
                    </button>
                    <button 
                      onClick={(e) => handleAuth(e, 'signup')}
                      disabled={isAuthLoading}
                      className="bg-secondary text-white py-3 rounded-xl font-bold text-sm hover:bg-black transition-colors disabled:opacity-50"
                    >
                      Sign Up
                    </button>
                  </div>
                </form>
              </div>
              <div className="p-4 bg-gray-50 border-t border-border-light text-center">
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                  Secure Auth powered by Supabase
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
