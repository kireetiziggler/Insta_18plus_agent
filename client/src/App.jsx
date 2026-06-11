import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:5000/api';
const POSTS_URL_BASE = 'http://localhost:5000';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState({
    geminiApiKey: '',
    instagramBusinessId: '',
    facebookPageToken: '',
    isSimulationMode: true,
    pageHandle: '@unspoken.desires.co',
    elevenLabsApiKey: '',
    elevenLabsVoiceId: 'alternate',
    postingSchedule: { post1: '09:00', post2: '14:00', post3: '19:00', post4: '22:00', post5: '00:00', reel1: '17:00' }
  });
  const [trends, setTrends] = useState([]);
  const [logs, setLogs] = useState([]);

  // Modals & Details State
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCategory, setCreateCategory] = useState('Desire & Physical Intimacy');
  const [createTopic, setCreateTopic] = useState('');
  const [createType, setCreateType] = useState('carousel');

  // Editing post details state
  const [editSlides, setEditSlides] = useState(['', '', '', '', '']);
  const [editTitleText, setEditTitleText] = useState('');
  const [editAudioScript, setEditAudioScript] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editTheme, setEditTheme] = useState('rain');

  // Loading/Operation states
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Poll intervals
  const pollIntervalRef = useRef(null);

  const fetchAllData = async () => {
    try {
      const [resPosts, resSettings, resTrends, resLogs] = await Promise.all([
        fetch(`${API_BASE}/posts`).then(r => r.json()),
        fetch(`${API_BASE}/settings`).then(r => r.json()),
        fetch(`${API_BASE}/trends`).then(r => r.json()),
        fetch(`${API_BASE}/logs`).then(r => r.json())
      ]);
      setPosts(Array.isArray(resPosts) ? resPosts : []);
      setSettings(resSettings);
      setTrends(Array.isArray(resTrends) ? resTrends : []);
      setLogs(Array.isArray(resLogs) ? resLogs : []);
    } catch (error) {
      console.error('API connection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Live update log and posts feed every 6 seconds to show background agent activities
    pollIntervalRef.current = setInterval(() => {
      fetch(`${API_BASE}/posts`).then(r => r.json()).then(data => setPosts(Array.isArray(data) ? data : []));
      fetch(`${API_BASE}/logs`).then(r => r.json()).then(data => setLogs(Array.isArray(data) ? data : []));
      fetch(`${API_BASE}/trends`).then(r => r.json()).then(data => setTrends(Array.isArray(data) ? data : []));
    }, 6000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      setSettings(data);
      alert('Settings updated & schedules reloaded successfully!');
    } catch (e) {
      alert(`Failed to save settings: ${e.message}`);
    }
  };

  const handleResearchTrends = async () => {
    setIsResearching(true);
    try {
      await fetch(`${API_BASE}/trends/research`, { method: 'POST' });
      await fetchAllData();
      alert('Trend Research Agent executed successfully. Loaded fresh topics.');
    } catch (e) {
      alert(`Research agent error: ${e.message}`);
    } finally {
      setIsResearching(false);
    }
  };

  const handleGenerateDraft = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setIsCreateOpen(false);
    try {
      const response = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: createCategory, topic: createTopic, type: createType })
      });
      if (!response.ok) throw new Error('Generation failed');
      const newPost = await response.json();
      setPosts(prev => [newPost, ...prev]);
      setCreateTopic('');
      // Open the newly generated post modal immediately
      handleSelectPost(newPost);
    } catch (error) {
      alert(`Content generation error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPost = (post) => {
    setSelectedPost(post);
    setActiveSlideIdx(0);
    setEditSlides(post.slides ? [...post.slides] : ['', '', '', '', '']);
    setEditTitleText(post.titleText || '');
    setEditAudioScript(post.audioScript || '');
    setEditCaption(post.caption);
    setEditTheme(post.backgroundTheme);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const isReel = selectedPost.type === 'reel';
      const body = {
        caption: editCaption,
        backgroundTheme: editTheme
      };
      if (isReel) {
        body.titleText = editTitleText;
        body.audioScript = editAudioScript;
      } else {
        body.slides = editSlides;
      }

      const response = await fetch(`${API_BASE}/posts/${selectedPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const updated = await response.json();
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedPost(updated);
      alert(isReel ? 'Changes saved successfully! Reel video re-compiled.' : 'Changes saved successfully! Slide PNG graphics re-rendered.');
    } catch (e) {
      alert(`Failed to update post: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishPost = async () => {
    if (!confirm('Are you sure you want to publish this post immediately to Instagram feed?')) return;
    setIsPublishing(true);
    try {
      const response = await fetch(`${API_BASE}/posts/${selectedPost.id}/publish`, {
        method: 'POST'
      });
      const resJson = await response.json();
      if (resJson.success) {
        setPosts(prev => prev.map(p => p.id === resJson.post.id ? resJson.post : p));
        setSelectedPost(resJson.post);
        alert('Post published successfully to Instagram!');
      } else {
        throw new Error(resJson.error || 'Publishing failed');
      }
    } catch (e) {
      alert(`Instagram Publish failed: ${e.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post draft? This will remove all generated files.')) return;
    try {
      await fetch(`${API_BASE}/posts/${selectedPost.id}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
      setSelectedPost(null);
    } catch (e) {
      alert('Failed to delete post');
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Clear all logs?')) return;
    try {
      await fetch(`${API_BASE}/logs/clear`, { method: 'POST' });
      setLogs([]);
    } catch (e) {
      alert('Failed to clear logs');
    }
  };

  // Analytics Helpers
  const calculateTotalMetrics = () => {
    let totalReach = 0, totalSaves = 0, totalShares = 0, totalLikes = 0, totalComments = 0;
    const published = posts.filter(p => p.status === 'published');
    published.forEach(p => {
      if (p.analytics) {
        totalReach += p.analytics.reach || 0;
        totalSaves += p.analytics.saves || 0;
        totalShares += p.analytics.shares || 0;
        totalLikes += p.analytics.likes || 0;
        totalComments += p.analytics.comments || 0;
      }
    });

    const engRate = totalReach > 0 
      ? (((totalLikes + totalComments + totalSaves + totalShares) / totalReach) * 100).toFixed(1) 
      : 0;

    return { totalReach, totalSaves, totalShares, totalLikes, totalComments, engRate };
  };

  const metrics = calculateTotalMetrics();

  // Calendar Date helper (Generates grid for past 3 days and next 4 days)
  const getCalendarDays = () => {
    const days = [];
    const schedule = settings.postingSchedule || {};
    const slots = [
      { key: 'post1', name: 'Slot 1', time: schedule.post1 || '09:00', cat: 'Desire & Physical Intimacy', type: 'carousel' },
      { key: 'post2', name: 'Slot 2', time: schedule.post2 || '14:00', cat: 'Secret Thoughts & Overthinking', type: 'carousel' },
      { key: 'post3', name: 'Slot 3', time: schedule.post3 || '19:00', cat: 'Situationships & Forbidden Love', type: 'carousel' },
      { key: 'post4', name: 'Slot 4', time: schedule.post4 || '22:00', cat: 'Romantic Tension & Chemistry', type: 'carousel' },
      { key: 'post5', name: 'Slot 5', time: schedule.post5 || '00:00', cat: 'Intimate Heartbreak & Healing', type: 'carousel' },
      { key: 'reel1', name: 'Reel Slot', time: schedule.reel1 || '17:00', cat: 'Daily Reel', type: 'reel' }
    ];

    for (let i = -3; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayDate = d.getDate();

      // Find posts scheduled for this day (preferring most recent runs)
      const daySlots = slots.map(slot => {
        const matchingPost = [...posts]
          .reverse()
          .find(p => {
            const postDate = p.scheduledFor.split('T')[0];
            if (slot.type === 'reel') {
              return postDate === dateStr && p.type === 'reel';
            } else {
              return postDate === dateStr && p.category === slot.cat && p.type !== 'reel';
            }
          });

        return { ...slot, post: matchingPost || null };
      });

      days.push({
        dateStr,
        dayName,
        dayDate,
        slots: daySlots
      });
    }
    return days;
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="app-container">
      {/* Glow Blurs */}
      <div className="blur-circle blur-1"></div>
      <div className="blur-circle blur-2"></div>

      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-logo"></div>
            <span className="brand-name">Unspoken Desires</span>
          </div>

          <ul className="menu-list">
            <li className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <span className="menu-icon">📊</span> Overview
            </li>
            <li className={`menu-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
              <span className="menu-icon">📅</span> Content Calendar
            </li>
            <li className={`menu-item ${activeTab === 'trends' ? 'active' : ''}`} onClick={() => setActiveTab('trends')}>
              <span className="menu-icon">🔥</span> Trend Feed
            </li>
            <li className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <span className="menu-icon">⚙️</span> Settings
            </li>
            <li className={`menu-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
              <span className="menu-icon">📜</span> System Logs
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className={`status-pill ${settings.isSimulationMode ? 'sim' : ''}`}>
            ● {settings.isSimulationMode ? 'Simulation Sandbox' : 'Instagram Live Direct'}
          </div>
          <div>Handle: {settings.pageHandle || '@unspoken.desires.co'}</div>
          <div>v1.0.0 Stable</div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* TAB OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <header className="content-header">
              <div className="page-title">
                <h1>Overview</h1>
                <p>Real-time analytics and automatic publisher control panel</p>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button className="btn-secondary" onClick={handleResearchTrends} disabled={isResearching}>
                  {isResearching ? 'Researching...' : '🔥 Research Trends'}
                </button>
                <button className="btn-primary" onClick={() => setIsCreateOpen(true)} disabled={isGenerating}>
                  {isGenerating ? 'Compiling Slide Pack...' : '➕ Create Manual Post'}
                </button>
              </div>
            </header>

            {/* Metrics cards */}
            <div className="metrics-grid">
              <div className="glass-card metric-card">
                <span className="metric-label">Total Reach</span>
                <div className="metric-val-row">
                  <span className="metric-value">{metrics.totalReach.toLocaleString()}</span>
                  <span className="metric-growth">+12.4%</span>
                </div>
              </div>
              <div className="glass-card metric-card">
                <span className="metric-label">Shares / DMs</span>
                <div className="metric-val-row">
                  <span className="metric-value">{metrics.totalShares.toLocaleString()}</span>
                  <span className="metric-growth">+18.2%</span>
                </div>
              </div>
              <div className="glass-card metric-card">
                <span className="metric-label">Saves for Later</span>
                <div className="metric-val-row">
                  <span className="metric-value">{metrics.totalSaves.toLocaleString()}</span>
                  <span className="metric-growth">+24.7%</span>
                </div>
              </div>
              <div className="glass-card metric-card">
                <span className="metric-label">Likes / Comments</span>
                <div className="metric-val-row">
                  <span className="metric-value">{(metrics.totalLikes + metrics.totalComments).toLocaleString()}</span>
                  <span className="metric-growth">+8.9%</span>
                </div>
              </div>
              <div className="glass-card metric-card">
                <span className="metric-label">Engagement Rate</span>
                <div className="metric-val-row">
                  <span className="metric-value">{metrics.engRate}%</span>
                  <span className="metric-growth">+4.3%</span>
                </div>
              </div>
            </div>

            <div className="overview-main-grid">
              {/* SVG Graphic mock representing post reach progress */}
              <div className="glass-card">
                <h3 style={{ fontFamily: 'Outfit', marginBottom: '20px' }}>Engagement Trend (Last 7 Posts)</h3>
                <div className="chart-container">
                  <div className="chart-svg-wrap">
                    <div className="chart-axes"></div>
                    <div className="chart-grid-line" style={{ top: '25%' }}></div>
                    <div className="chart-grid-line" style={{ top: '50%' }}></div>
                    <div className="chart-grid-line" style={{ top: '75%' }}></div>
                    
                    {/* SVG Chart paths */}
                    <svg style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      
                      {posts.filter(p => p.status === 'published').length >= 2 ? (
                        <>
                          <path
                            d={`M 50,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[6]?.analytics?.reach || 300) / 5)} 
                                L 150,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[5]?.analytics?.reach || 420) / 5)} 
                                L 250,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[4]?.analytics?.reach || 680) / 5)} 
                                L 350,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[3]?.analytics?.reach || 510) / 5)} 
                                L 450,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[2]?.analytics?.reach || 840) / 5)} 
                                L 550,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[1]?.analytics?.reach || 1020) / 5)} 
                                L 650,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[0]?.analytics?.reach || 920) / 5)}`}
                            fill="none"
                            stroke="url(#chart-grad)"
                            strokeWidth="4"
                          />
                          <path
                            d={`M 50,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[6]?.analytics?.reach || 300) / 5)} 
                                L 150,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[5]?.analytics?.reach || 420) / 5)} 
                                L 250,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[4]?.analytics?.reach || 680) / 5)} 
                                L 350,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[3]?.analytics?.reach || 510) / 5)} 
                                L 450,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[2]?.analytics?.reach || 840) / 5)} 
                                L 550,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[1]?.analytics?.reach || 1020) / 5)} 
                                L 650,${240 - Math.min(220, (posts.filter(p => p.status === 'published')[0]?.analytics?.reach || 920) / 5)}
                                L 650,240 L 50,240 Z`}
                            fill="url(#chart-grad)"
                          />
                          {/* Data points dots */}
                          <circle cx="50" cy={240 - Math.min(220, (posts.filter(p => p.status === 'published')[6]?.analytics?.reach || 300) / 5)} r="5" fill="#a855f7" />
                          <circle cx="150" cy={240 - Math.min(220, (posts.filter(p => p.status === 'published')[5]?.analytics?.reach || 420) / 5)} r="5" fill="#a855f7" />
                          <circle cx="250" cy={240 - Math.min(220, (posts.filter(p => p.status === 'published')[4]?.analytics?.reach || 680) / 5)} r="5" fill="#a855f7" />
                          <circle cx="350" cy={240 - Math.min(220, (posts.filter(p => p.status === 'published')[3]?.analytics?.reach || 510) / 5)} r="5" fill="#a855f7" />
                          <circle cx="450" cy={240 - Math.min(220, (posts.filter(p => p.status === 'published')[2]?.analytics?.reach || 840) / 5)} r="5" fill="#a855f7" />
                          <circle cx="550" cy={240 - Math.min(220, (posts.filter(p => p.status === 'published')[1]?.analytics?.reach || 1020) / 5)} r="5" fill="#a855f7" />
                          <circle cx="650" cy={240 - Math.min(220, (posts.filter(p => p.status === 'published')[0]?.analytics?.reach || 920) / 5)} r="5" fill="#a855f7" />
                        </>
                      ) : (
                        <text x="50%" y="50%" fill="rgba(255,255,255,0.3)" textAnchor="middle" fontSize="14">Need at least 2 published posts to draw line graph.</text>
                      )}
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '45px', paddingRight: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <span>Post 7</span>
                    <span>Post 6</span>
                    <span>Post 5</span>
                    <span>Post 4</span>
                    <span>Post 3</span>
                    <span>Post 2</span>
                    <span>Recent Post</span>
                  </div>
                </div>
              </div>

              {/* Recent Logs panel */}
              <div className="glass-card recent-logs-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontFamily: 'Outfit' }}>Agent Run Activities</h3>
                  <span style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--primary)' }} onClick={() => setActiveTab('logs')}>View All</span>
                </div>
                <div className="logs-list">
                  {logs.slice(0, 10).map((log, index) => (
                    <div key={index} className={`log-item ${log.type}`}>
                      <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span>[{log.type}] {log.message}</span>
                    </div>
                  ))}
                  {logs.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No logs yet. Server scheduler is booting.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CALENDAR */}
        {activeTab === 'calendar' && (
          <div>
            <header className="content-header">
              <div className="page-title">
                <h1>Content Calendar</h1>
                <p>Schedule view of daily post categories and automatic publishing times</p>
              </div>
              <button className="btn-primary" onClick={() => setIsCreateOpen(true)} disabled={isGenerating}>
                ➕ Create Manual Post
              </button>
            </header>

            <div className="calendar-grid">
              {calendarDays.map((day, index) => (
                <div key={index} className="calendar-day-row">
                  <div className="day-label-box">
                    <span className="day-name">{day.dayName}</span>
                    <span className="day-date">{day.dayDate}</span>
                  </div>
                  <div className="slots-container">
                    {day.slots.map((slot, sIdx) => {
                      const hasPost = slot.post !== null;
                      return (
                        <div 
                          key={sIdx} 
                          className={`slot-card ${hasPost ? 'filled' : ''}`}
                          onClick={() => hasPost && handleSelectPost(slot.post)}
                        >
                          <div className="slot-header">
                            <span className="slot-time">{slot.time}</span>
                            <span>{slot.name}</span>
                          </div>
                          <div className="slot-body">
                            {hasPost ? (slot.post.slides?.[0] || slot.post.titleText || 'Post slides generated') : `Slot for ${slot.cat}`}
                          </div>
                          {hasPost ? (
                            <div className="slot-status-indicator">
                              <div className={`status-dot ${slot.post.status}`}></div>
                              <span style={{color: `var(--text-muted)`}}>{slot.post.status}</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Empty Draft</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB TREND FEED */}
        {activeTab === 'trends' && (
          <div>
            <header className="content-header">
              <div className="page-title">
                <h1>Trend Feed</h1>
                <p>Trending Reddit community topics scraped and evaluated for viral triggers</p>
              </div>
              <button className="btn-primary" onClick={handleResearchTrends} disabled={isResearching}>
                {isResearching ? 'Scraping & Rating...' : '🔄 Run Trend Research Agent'}
              </button>
            </header>

            <div className="trends-grid">
              {trends.map((t, idx) => (
                <div key={idx} className="glass-card trend-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="trend-source">{t.source}</span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                        {t.category.split(' ')[0]} {/* short category */}
                      </span>
                    </div>
                    <h3 className="trend-title" style={{ marginBottom: '10px' }}>{t.title}</h3>
                    {t.contentSnippet && <p className="trend-snippet">{t.contentSnippet}</p>}
                  </div>
                  <div>
                    <div className="trend-metrics" style={{ marginBottom: '15px' }}>
                      <span className="trend-pill virality">Viral: {t.scores.virality}%</span>
                      <span className="trend-pill">Relate: {t.scores.relatability}%</span>
                      <span className="trend-pill">Emotion: {t.scores.emotionalImpact}%</span>
                      <span className="trend-pill">Save: {t.scores.savePotential}%</span>
                    </div>
                    <button 
                      className="btn-secondary" 
                      style={{ width: '100%', fontSize: '13px', padding: '8px' }}
                      onClick={() => {
                        setCreateCategory(t.category);
                        setCreateTopic(t.suggestedTopic);
                        setIsCreateOpen(true);
                      }}
                    >
                      ✏️ Generate Post from Topic
                    </button>
                  </div>
                </div>
              ))}
              {trends.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <h3>No trend feeds scraped yet.</h3>
                  <p style={{ marginTop: '10px' }}>Trigger the research agent above to scrape relationship, intimacy, and heartbreak subreddits.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB SETTINGS */}
        {activeTab === 'settings' && (
          <div>
            <header className="content-header">
              <div className="page-title">
                <h1>Settings</h1>
                <p>Configure Instagram API keys, Gemini copywriting keys, handles, and schedulers</p>
              </div>
            </header>

            <div className="glass-card" style={{ maxWidth: '850px' }}>
              <form onSubmit={handleSaveSettings}>
                
                <div className="toggle-group">
                  <div className="toggle-info">
                    <span className="toggle-title">Simulation / Sandbox Mode</span>
                    <span className="toggle-desc">When active, the system acts normally but mocks posts and analytics instead of making real API requests.</span>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={settings.isSimulationMode}
                      onChange={(e) => setSettings({ ...settings, isSimulationMode: e.target.checked })}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="settings-grid">
                  <div>
                    <h3 style={{ fontFamily: 'Outfit', marginBottom: '15px', color: 'var(--primary)' }}>Creative AI API</h3>
                    <div className="form-group">
                      <label>Gemini API Key</label>
                      <input 
                        type="password" 
                        value={settings.geminiApiKey} 
                        placeholder="AI key for copywriting & virality scoring..." 
                        onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginTop: '15px' }}>
                      <label>ElevenLabs API Key (Optional)</label>
                      <input 
                        type="password" 
                        value={settings.elevenLabsApiKey || ''} 
                        placeholder="Voiceover synthesis key (Rachel voice)..." 
                        onChange={(e) => setSettings({ ...settings, elevenLabsApiKey: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>ElevenLabs Voice ID</label>
                      <input 
                        type="text" 
                        value={settings.elevenLabsVoiceId || 'alternate'} 
                        placeholder="ElevenLabs Voice ID (e.g., 'alternate' or custom ID)..." 
                        onChange={(e) => setSettings({ ...settings, elevenLabsVoiceId: e.target.value })}
                      />
                      <small style={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', marginTop: '4px', fontSize: '11px' }}>
                        Type <strong>alternate</strong> to alternate Sarah/Adam daily, or enter a custom Voice ID from the ElevenLabs Voice Library (e.g., add <strong>Devi</strong>: <code>MF4J4IDTRo0AxOO4dpFR</code> or <strong>Priya</strong>: <code>amiAXapsDOAiHJqbsAZj</code> to your account's Voice Lab and enter their ID here for a realistic Indian accent).
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Instagram Page Handle</label>
                      <input 
                        type="text" 
                        value={settings.pageHandle} 
                        placeholder="@your.handle"
                        onChange={(e) => setSettings({ ...settings, pageHandle: e.target.value })}
                        required
                      />
                    </div>
                  </div>
 
                   <div>
                     <h3 style={{ fontFamily: 'Outfit', marginBottom: '15px', color: 'var(--accent)' }}>Instagram Graph Integration</h3>
                     <div className="form-group">
                       <label>Instagram Business Account ID</label>
                       <input 
                         type="text" 
                         value={settings.instagramBusinessId} 
                         placeholder="Get from FB App Settings..." 
                         onChange={(e) => setSettings({ ...settings, instagramBusinessId: e.target.value })}
                       />
                     </div>
                     <div className="form-group">
                       <label>Facebook Page Access Token</label>
                       <textarea 
                         rows="3"
                         value={settings.facebookPageToken} 
                         placeholder="Permanent long-lived access token..." 
                         onChange={(e) => setSettings({ ...settings, facebookPageToken: e.target.value })}
                       />
                     </div>
                   </div>
                 </div>
 
                 <h3 style={{ fontFamily: 'Outfit', margin: '20px 0 15px 0', color: 'var(--success)' }}>Daily Publishing Times (HH:MM)</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '25px' }}>
                   <div className="form-group">
                     <label>Post 1 (Desire & Intimacy)</label>
                     <input 
                       type="text" 
                       value={settings.postingSchedule.post1} 
                       onChange={(e) => setSettings({
                         ...settings,
                         postingSchedule: { ...settings.postingSchedule, post1: e.target.value }
                       })}
                     />
                   </div>
                   <div className="form-group">
                     <label>Post 2 (Secret Thoughts)</label>
                     <input 
                       type="text" 
                       value={settings.postingSchedule.post2} 
                       onChange={(e) => setSettings({
                         ...settings,
                         postingSchedule: { ...settings.postingSchedule, post2: e.target.value }
                       })}
                     />
                   </div>
                   <div className="form-group">
                     <label>Post 3 (Situationships)</label>
                     <input 
                       type="text" 
                       value={settings.postingSchedule.post3} 
                       onChange={(e) => setSettings({
                         ...settings,
                         postingSchedule: { ...settings.postingSchedule, post3: e.target.value }
                       })}
                     />
                   </div>
                   <div className="form-group">
                     <label>Post 4 (Romantic Tension)</label>
                     <input 
                       type="text" 
                       value={settings.postingSchedule.post4} 
                       onChange={(e) => setSettings({
                         ...settings,
                         postingSchedule: { ...settings.postingSchedule, post4: e.target.value }
                       })}
                     />
                   </div>
                   <div className="form-group">
                     <label>Post 5 (Heartbreak & Healing)</label>
                     <input 
                       type="text" 
                       value={settings.postingSchedule.post5} 
                       onChange={(e) => setSettings({
                         ...settings,
                         postingSchedule: { ...settings.postingSchedule, post5: e.target.value }
                       })}
                     />
                   </div>
                   <div className="form-group">
                     <label>Reel 1 (Daily Reel)</label>
                     <input 
                       type="text" 
                       value={settings.postingSchedule.reel1 || '17:00'} 
                       onChange={(e) => setSettings({
                         ...settings,
                         postingSchedule: { ...settings.postingSchedule, reel1: e.target.value }
                       })}
                     />
                   </div>
                 </div>
 
                 <button type="submit" className="btn-primary">💾 Save Settings & Reload schedules</button>
               </form>
             </div>
           </div>
         )}
 
         {/* TAB LOGS */}
         {activeTab === 'logs' && (
           <div>
             <header className="content-header">
               <div className="page-title">
                 <h1>System Execution Logs</h1>
                 <p>Real-time terminal view of system schedules, scraping runs, AI generation, and server actions</p>
               </div>
               <button className="btn-secondary" onClick={handleClearLogs}>
                 🗑️ Clear Logs
               </button>
             </header>
 
             <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
               <div style={{ background: '#0a0a0f', borderBottom: '1px solid var(--border)', padding: '10px 20px', display: 'flex', gap: '8px' }}>
                 <span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }}></span>
                 <span style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%' }}></span>
                 <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%' }}></span>
               </div>
               <div style={{
                 maxHeight: '650px',
                 overflowY: 'auto',
                 padding: '24px',
                 background: '#040406',
                 fontFamily: 'Courier New, Courier, monospace',
                 fontSize: '13px',
                 lineHeight: '1.6'
               }}>
                 {logs.map((log, index) => (
                   <div key={index} style={{ marginBottom: '8px', color: log.type === 'ERROR' ? '#f87171' : log.type === 'RESEARCH' ? '#c084fc' : log.type === 'PUBLISHER' ? '#34d399' : '#e5e7eb' }}>
                     <span style={{ color: 'rgba(255,255,255,0.25)', marginRight: '15px' }}>{new Date(log.timestamp).toLocaleString()}</span>
                     <strong>[{log.type}]</strong> {log.message}
                   </div>
                 ))}
                 {logs.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Log stack empty. Awaiting scheduler runs.</div>}
               </div>
             </div>
           </div>
         )}
       </main>
 
       {/* CREATE POST MODAL */}
       {isCreateOpen && (
         <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
           <div className="modal-wrapper" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
             <div className="modal-header">
               <h2>Generate New Creative Assets</h2>
               <button className="modal-close" onClick={() => setIsCreateOpen(false)}>×</button>
             </div>
             <form onSubmit={handleGenerateDraft}>
               <div style={{ padding: '30px' }}>
                 <div className="form-group">
                   <label>Content Format Type</label>
                   <select 
                     value={createType} 
                     onChange={e => setCreateType(e.target.value)}
                     style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', marginBottom: '15px' }}
                   >
                     <option value="carousel">Instagram Single-Slide Post (1 Slide)</option>
                     <option value="reel">Instagram Video Reel (9:16 Video + Voiceover)</option>
                   </select>
                 </div>
                 <div className="form-group">
                   <label>Select Category Slot</label>
                   <select 
                     value={createCategory} 
                     onChange={e => setCreateCategory(e.target.value)}
                   >
                     <option value="Desire & Physical Intimacy">Desire & Physical Intimacy (Slot 1)</option>
                     <option value="Secret Thoughts & Overthinking">Secret Thoughts & Overthinking (Slot 2)</option>
                     <option value="Situationships & Forbidden Love">Situationships & Forbidden Love (Slot 3)</option>
                     <option value="Romantic Tension & Chemistry">Romantic Tension & Chemistry (Slot 4)</option>
                     <option value="Intimate Heartbreak & Healing">Intimate Heartbreak & Healing (Slot 5)</option>
                   </select>
                 </div>
                 <div className="form-group">
                   <label>Focus Topic / Prompt Angle (Optional)</label>
                   <textarea 
                     rows="4"
                     value={createTopic} 
                     placeholder="Enter a custom theme or Reddit topic to guide the AI copywriting (e.g. 'loneliness of coding at night', 'rejection after 4 interview rounds'). Leave blank to let the trend agent auto-select."
                     onChange={e => setCreateTopic(e.target.value)}
                   />
                 </div>
               </div>
               <div className="modal-footer">
                 <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                 <button type="submit" className="btn-primary">✨ Generate & Compile {createType === 'reel' ? 'Reel Video' : 'Slides'}</button>
               </div>
             </form>
           </div>
         </div>
       )}
 
       {/* POST DETAILS / EDITOR MODAL */}
       {selectedPost && (
         <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
           <div className="modal-wrapper" onClick={e => e.stopPropagation()}>
             
             <div className="modal-header">
               <div className="modal-title-row">
                 <span className={`badge ${selectedPost.status}`}>{selectedPost.status}</span>
                 <h2>Edit {selectedPost.type === 'reel' ? 'Reel' : 'Carousel'} Details</h2>
                 <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                   Category: {selectedPost.category}
                 </span>
               </div>
               <button className="modal-close" onClick={() => setSelectedPost(null)}>×</button>
             </div>
 
             <div className="modal-body">
               {selectedPost.type === 'reel' ? (
                 <>
                   {/* Left Column: Reel video player preview */}
                   <div className="carousel-preview-pane">
                     <h4 style={{ fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '10px' }}>Reel Video Preview (9:16)</h4>
                     <div className="slide-image-frame reel-video-frame" style={{ aspectRatio: '9/16', maxHeight: '420px', width: 'auto', display: 'flex', justifyContent: 'center', background: '#000', margin: '0 auto', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                       {selectedPost.renderedVideo ? (
                         <video 
                           key={selectedPost.id}
                           controls 
                           style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                           src={`${POSTS_URL_BASE}${selectedPost.renderedVideo}?t=${Date.now()}`}
                           poster={selectedPost.renderedImages && selectedPost.renderedImages[0] ? `${POSTS_URL_BASE}${selectedPost.renderedImages[0]}` : undefined}
                         />
                       ) : (
                         <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px', textAlign: 'center', alignSelf: 'center' }}>
                           Reel video not compiled yet. Save modifications to render.
                         </div>
                       )}
                     </div>
                     <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                       Stitched with emotional Rachel voiceover (CRF 17)
                     </div>
                   </div>
 
                   {/* Right Column: Reel Text / Voiceover Fields */}
                   <div className="post-details-pane">
                     <div className="form-group">
                       <label>Reel Display Text (Hook Quote)</label>
                       <input 
                         type="text" 
                         value={editTitleText} 
                         onChange={(e) => setEditTitleText(e.target.value)} 
                         placeholder="Display text copy (wrap *words* in asterisks to apply gradient highlights)..." 
                         style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '14px', fontFamily: 'Outfit', textTransform: 'uppercase', marginBottom: '15px' }}
                       />
                     </div>
                     <div className="form-row-2">
                       <div className="form-group">
                         <label>Voiceover Narration Script</label>
                         <textarea 
                           rows="5"
                           value={editAudioScript}
                           onChange={(e) => setEditAudioScript(e.target.value)}
                           placeholder="Enter voiceover script narration text..."
                         />
                       </div>
                       <div className="form-group">
                         <label>Reel Background Theme</label>
                         <select value={editTheme} onChange={(e) => setEditTheme(e.target.value)}>
                            <option value="midnight_desire">Midnight Desire</option>
                            <option value="rainy_bed">Rainy Bed</option>
                            <option value="shadowy_lounge">Shadowy Lounge</option>
                            <option value="candlelight_secrets">Candlelight Secrets</option>
                            <option value="intimate_touch">Intimate Touch</option>
                            <option value="overthinking_night">Overthinking Night</option>
                            <option value="secret_thoughts">Secret Thoughts</option>
                            <option value="sensual_vibes">Sensual Vibes</option>
                         </select>
                       </div>
                     </div>
 
                     <div className="form-group">
                       <label>Instagram Reel Caption</label>
                       <textarea 
                         rows="6"
                         value={editCaption}
                         onChange={(e) => setEditCaption(e.target.value)}
                         placeholder="Insta post description copy..."
                       />
                     </div>
 
                     {/* Display analytics if post is published */}
                     {selectedPost.status === 'published' && selectedPost.analytics && (
                       <div className="glass-card" style={{ background: 'rgba(0,0,0,0.15)', padding: '16px' }}>
                         <h4 style={{ fontFamily: 'Outfit', fontSize: '13px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Instagram Insights</h4>
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', textAlign: 'center' }}>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Likes</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.likes || 0}</div>
                           </div>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Comments</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.comments || 0}</div>
                           </div>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saves</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.saves || 0}</div>
                           </div>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shares</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.shares || 0}</div>
                           </div>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reach</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.reach || 0}</div>
                           </div>
                         </div>
                       </div>
                     )}
 
                     <div className="form-actions-row">
                       <button className="btn-primary" onClick={handleSaveChanges} disabled={isSaving}>
                         {isSaving ? 'Re-compiling Reel...' : '💾 Save Changes & Re-Compile'}
                       </button>
                       
                       {selectedPost.status !== 'published' && (
                         <button className="btn-secondary" style={{ background: 'var(--success-glow)', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)' }} onClick={handlePublishPost} disabled={isPublishing}>
                           {isPublishing ? 'Publishing...' : '🚀 Publish Now'}
                         </button>
                       )}
                     </div>
                   </div>
                 </>
               ) : (
                 <>
                   {/* Left Column: Slide Image carousel preview */}
                   <div className="carousel-preview-pane">
                     <h4 style={{ fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontSize: '12px' }}>Slide Graphic Output</h4>
                     <div className="slide-image-frame">
                       {selectedPost.renderedImages && selectedPost.renderedImages.length > 0 ? (
                         <img 
                           src={`${POSTS_URL_BASE}${selectedPost.renderedImages[activeSlideIdx]}?t=${Date.now()}`} // t parameter bypasses image caching on redraws
                           alt={`Slide ${activeSlideIdx + 1}`} 
                         />
                       ) : (
                         <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                           PNG slide graphics not compiled yet. Save modifications to render.
                         </div>
                       )}
                     </div>
                     {selectedPost.slides && selectedPost.slides.length > 1 && (
                        <div className="carousel-nav-row">
                          <button 
                            className="arrow-btn"
                            onClick={() => setActiveSlideIdx(prev => Math.max(0, prev - 1))}
                            disabled={activeSlideIdx === 0}
                          >
                            ◀ Prev
                          </button>
                          <span className="slide-indicator">Slide {activeSlideIdx + 1} of {selectedPost.slides.length}</span>
                          <button 
                            className="arrow-btn"
                            onClick={() => setActiveSlideIdx(prev => Math.min(selectedPost.slides.length - 1, prev + 1))}
                            disabled={activeSlideIdx === selectedPost.slides.length - 1}
                          >
                            Next ▶
                          </button>
                        </div>
                      )}
                   </div>
 
                   {/* Right Column: Slide Text / Caption Fields */}
                   <div className="post-details-pane">
                     <div className="form-row-2">
                       <div className="form-group">
                         <label>{selectedPost.slides && selectedPost.slides.length > 1 ? `Active Slide ${activeSlideIdx + 1} Text` : 'Slide Text'}</label>
                         <textarea 
                           rows="4"
                           value={editSlides[activeSlideIdx]}
                           onChange={(e) => {
                             const copy = [...editSlides];
                             copy[activeSlideIdx] = e.target.value;
                             setEditSlides(copy);
                           }}
                           placeholder="Slide text copy (wrap *words* in asterisks to apply gradient highlights)..."
                         />
                       </div>
                       <div className="form-group">
                         <label>Slide Background Theme</label>
                         <select value={editTheme} onChange={(e) => setEditTheme(e.target.value)}>
                            <option value="midnight_desire">Midnight Desire</option>
                            <option value="rainy_bed">Rainy Bed</option>
                            <option value="shadowy_lounge">Shadowy Lounge</option>
                            <option value="candlelight_secrets">Candlelight Secrets</option>
                            <option value="intimate_touch">Intimate Touch</option>
                            <option value="overthinking_night">Overthinking Night</option>
                            <option value="secret_thoughts">Secret Thoughts</option>
                            <option value="sensual_vibes">Sensual Vibes</option>
                         </select>
                       </div>
                     </div>
 
                     <div className="form-group">
                       <label>Instagram Caption & Hashtags</label>
                       <textarea 
                         rows="8"
                         value={editCaption}
                         onChange={(e) => setEditCaption(e.target.value)}
                         placeholder="Insta post description copy..."
                       />
                     </div>
 
                     {/* Display analytics if post is published */}
                     {selectedPost.status === 'published' && selectedPost.analytics && (
                       <div className="glass-card" style={{ background: 'rgba(0,0,0,0.15)', padding: '16px' }}>
                         <h4 style={{ fontFamily: 'Outfit', fontSize: '13px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Instagram Insights</h4>
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', textAlign: 'center' }}>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Likes</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.likes || 0}</div>
                           </div>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Comments</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.comments || 0}</div>
                           </div>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saves</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.saves || 0}</div>
                           </div>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shares</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.shares || 0}</div>
                           </div>
                           <div>
                             <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reach</div>
                             <div style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>{selectedPost.analytics.reach || 0}</div>
                           </div>
                         </div>
                       </div>
                     )}
 
                     <div className="form-actions-row">
                       <button className="btn-primary" onClick={handleSaveChanges} disabled={isSaving}>
                         {isSaving ? 'Regenerating Slides...' : '💾 Save Changes & Re-Render'}
                       </button>
                       
                       {selectedPost.status !== 'published' && (
                         <button className="btn-secondary" style={{ background: 'var(--success-glow)', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)' }} onClick={handlePublishPost} disabled={isPublishing}>
                           {isPublishing ? 'Publishing...' : '🚀 Publish Now'}
                         </button>
                       )}
                     </div>
                   </div>
                 </>
               )}
             </div>
 
             <div className="modal-footer">
               <span className="danger-zone" onClick={handleDeletePost}>🗑️ Delete Draft</span>
               <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Scheduled: {new Date(selectedPost.scheduledFor).toLocaleString()}</span>
             </div>
 
           </div>
         </div>
      )}

      {/* Screen Loader if Booting */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-main)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px'
        }}>
          <div className="brand-logo" style={{ width: '48px', height: '48px', transform: 'scale(1.2)' }}></div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: '800' }}>Initializing Unspoken Desires OS...</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Connecting to local SQLite/JSON databases and scheduling background tasks</p>
        </div>
      )}

      {/* Overlay spinner for full page background actions */}
      {(isGenerating || isPublishing) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'nudge 1s infinite linear' // custom spin rotation
          }}></div>
          <h3 style={{ fontFamily: 'Outfit', fontWeight: '700' }}>
            {isGenerating ? 'Gemini Writing Copy & Compiling Graphics...' : (selectedPost?.type === 'reel' ? 'Uploading Reel & Publishing to Graph API (status polling active)...' : 'Uploading Slides & Linking Carousel container via Graph API...')}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>This may take 5-15 seconds (longer for Reel video processing). Please hold on.</p>
        </div>
      )}
    </div>
  );
}

export default App;
