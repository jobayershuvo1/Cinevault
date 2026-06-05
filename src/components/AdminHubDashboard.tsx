import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, BookOpen, Download, Users, Film, 
  Clock, Eye, Star, ThumbsUp, Activity, ArrowUpRight, BarChart3, AlertCircle
} from 'lucide-react';

interface AdminHubDashboardProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalMovies: number;
    totalPublished: number;
    totalDrafts: number;
    pageViews: number;
    uniqueVisitors: number;
    activeOnline: number;
    totalDownloads: number;
    topDownloadedMovies: { movieId: string; movieTitle: string; clicks: number }[];
    dailyClicks: Record<string, number>;
    dailyViews: Record<string, number>;
    lastClickTimestamp: string | null;
  };
}

export default function AdminHubDashboard({ stats }: AdminHubDashboardProps) {
  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d');

  // Generate date points chronologically (last 7 or 30 days)
  const getDatePoints = () => {
    const points: { date: string; displayDate: string; views: number; downloads: number }[] = [];
    const daysToGenerate = chartRange === '7d' ? 7 : 30;
    
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const shortLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      points.push({
        date: isoDate,
        displayDate: shortLabel,
        views: stats.dailyViews?.[isoDate] || 0,
        downloads: stats.dailyClicks?.[isoDate] || 0
      });
    }
    return points;
  };

  const chartData = getDatePoints();

  // Helper scales for drawing beautiful, precise inline SVG diagrams
  const maxViews = Math.max(...chartData.map(d => d.views), 10);
  const maxDownloads = Math.max(...chartData.map(d => d.downloads), 10);

  // Layout parameters
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 20;

  // Render SVG views path spline
  const getViewPathPoints = () => {
    return chartData.map((d, index) => {
      const x = paddingX + (index * (svgWidth - paddingX * 2)) / (chartData.length - 1);
      const y = svgHeight - paddingY - (d.views * (svgHeight - paddingY * 2)) / maxViews;
      return { x, y };
    });
  };

  // Render SVG downloads path spline
  const getDownloadPathPoints = () => {
    return chartData.map((d, index) => {
      const x = paddingX + (index * (svgWidth - paddingX * 2)) / (chartData.length - 1);
      const y = svgHeight - paddingY - (d.downloads * (svgHeight - paddingY * 2)) / maxDownloads;
      return { x, y };
    });
  };

  const viewPoints = getViewPathPoints();
  const downloadPoints = getDownloadPathPoints();

  const viewPathD = viewPoints.length > 0 
    ? `M ${viewPoints[0].x} ${viewPoints[0].y} ` + viewPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') 
    : '';

  const viewAreaD = viewPoints.length > 0 
    ? `${viewPathD} L ${viewPoints[viewPoints.length - 1].x} ${svgHeight - paddingY} L ${viewPoints[0].x} ${svgHeight - paddingY} Z` 
    : '';

  const downloadPathD = downloadPoints.length > 0
    ? `M ${downloadPoints[0].x} ${downloadPoints[0].y} ` + downloadPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const downloadAreaD = downloadPoints.length > 0
    ? `${downloadPathD} L ${downloadPoints[downloadPoints.length - 1].x} ${svgHeight - paddingY} L ${downloadPoints[0].x} ${svgHeight - paddingY} Z`
    : '';

  // Calculate active user percentage ratio
  const activeUserRatio = stats.totalUsers > 0 
    ? Math.round((stats.activeUsers / stats.totalUsers) * 100) 
    : 100;

  return (
    <div id="admin-hub-dashboard-root" className="space-y-6 animate-fadeIn select-none">
      
      {/* 2ND PANEL: CORE CHARTS & GRAPH SYSTEM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAPH 1: VISUAL PAGE VIEWS & INTERACTIVE HITS */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-[#1B1B2A]/40 border border-[#000000]/10 dark:border-white/5 rounded-3xl shadow-lg space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                <Activity className="w-5 h-5 text-brand-accent" /> Platform Traffic Trends
              </h3>
              <p className="text-xs text-neutral-400 mt-1">Daily page hit metrics tracked across active user nodes.</p>
            </div>

            {/* Range Toggle */}
            <div className="flex bg-slate-100 dark:bg-[#121223] border border-neutral-200 dark:border-white/5 rounded-xl p-1 select-none">
              <button 
                onClick={() => setChartRange('7d')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${chartRange === '7d' ? 'bg-brand-accent text-white shadow-sm' : 'text-neutral-400'}`}
              >
                7 Days
              </button>
              <button 
                onClick={() => setChartRange('30d')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${chartRange === '30d' ? 'bg-brand-accent text-white shadow-sm' : 'text-neutral-400'}`}
              >
                30 Days
              </button>
            </div>
          </div>

          {/* SVG RENDERING AREA CHART */}
          <div className="relative pt-4 overflow-hidden">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 select-none overflow-visible">
              <defs>
                <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-secondary, #7C3AED)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--brand-secondary, #7C3AED)" stopOpacity="0.00" />
                </linearGradient>
                <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="#888888" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke="#888888" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="#888888" strokeOpacity="0.12" />

              {/* Area Line spline: Page Views */}
              {viewPoints.length > 0 && (
                <>
                  <path d={viewAreaD} fill="url(#viewGrad)" />
                  <path d={viewPathD} fill="none" stroke="var(--brand-accent, #7C3AED)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}

              {/* Area Line spline: Download Clicks */}
              {downloadPoints.length > 0 && (
                <>
                  <path d={downloadAreaD} fill="url(#downGrad)" />
                  <path d={downloadPathD} fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="5 2" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}

              {/* Label nodes on graph vertices */}
              {viewPoints.map((p, i) => {
                // Show labels compactly: only first, middle, last on 30d, all on 7d
                const labelMod = chartRange === '30d' ? 6 : 1;
                if (i % labelMod !== 0 && i !== chartData.length - 1) return null;

                return (
                  <g key={i}>
                    {/* views dot */}
                    <circle cx={p.x} cy={p.y} r="4.5" fill="var(--brand-accent, #7C3AED)" stroke="#ffffff" strokeWidth="1.5" />
                    <text x={p.x} y={svgHeight - 4} textAnchor="middle" fill="#888888" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                      {chartData[i].displayDate}
                    </text>
                    <text x={p.x} y={p.y - 8} textAnchor="middle" fill="var(--brand-accent, #7C3AED)" fontSize="9" fontWeight="900" fontFamily="monospace">
                      {chartData[i].views}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* LEGEND ROW FOOTER */}
          <div className="flex gap-4 pt-3.5 border-t border-black/5 dark:border-white/5 text-xs font-mono select-none">
            <span className="flex items-center gap-1.5 font-bold text-brand-accent">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-accent" /> Page Views
            </span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Catalog Download Clicks
            </span>
          </div>
        </div>

        {/* SIDE BAR CARD: RETREAT USER RATIO & STATS */}
        <div className="p-6 bg-white dark:bg-[#1B1B2A]/40 border border-[#000000]/10 dark:border-white/5 rounded-3xl shadow-lg space-y-5 text-left flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-md font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-3">
              <Users className="w-5 h-5 text-brand-accent" /> Subscriber Engagement
            </h3>

            <div className="space-y-4 select-none">
              {/* Circular gauge replica bar */}
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between text-xs">
                  <span className="text-neutral-400 font-bold">Active User Ratio</span>
                  <span className="text-brand-accent font-black">{activeUserRatio}%</span>
                </div>
                <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-[#121223]/25 border border-white/5">
                  <div style={{ width: `${activeUserRatio}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-brand-accent rounded-full transition-all duration-1000" />
                </div>
                <p className="text-[10px] text-neutral-500 mt-2">
                  Describes the volume of active profiles as a fraction of the entire user list. 
                </p>
              </div>

              <div className="p-4 bg-slate-100/30 dark:bg-[#121223]/35 border border-[#000000]/5 dark:border-white/5 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-bold">Total Accounts:</span>
                  <span className="font-mono text-neutral-200 font-black">{stats.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-bold">Suspended Accounts:</span>
                  <span className="font-mono text-rose-500 font-black">{stats.totalUsers - stats.activeUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-bold">Catalog Published:</span>
                  <span className="font-mono text-emerald-400 font-black">{stats.totalPublished} / {stats.totalMovies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 font-bold">Recent Downloads:</span>
                  <span className="font-mono text-neutral-50 font-black">{stats.totalDownloads} click count</span>
                </div>
              </div>
            </div>
          </div>

          {stats.lastClickTimestamp && (
            <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5 select-none pt-2 border-t border-black/5 dark:border-white/5">
              <Clock className="w-3.5 h-3.5 text-neutral-500" /> Last download event: <span className="text-emerald-400">{new Date(stats.lastClickTimestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

      </div>

      {/* GRAPH 3: TOP DOWNLOADED MOVIES TABLE LIST */}
      <div className="p-6 bg-white dark:bg-[#1B1B2A]/40 border border-[#000000]/10 dark:border-white/5 rounded-3xl shadow-lg space-y-4 text-left">
        <h3 className="text-md font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 border-b border-black/5 dark:border-white/5 pb-3">
          <Download className="w-5 h-5 text-brand-accent animate-bounce" /> Highest Click Volume Movies (Top Downloads)
        </h3>

        {(!stats.topDownloadedMovies || stats.topDownloadedMovies.length === 0) ? (
          <p className="text-xs text-neutral-500 py-6 text-center">No catalog assets have been downloaded yet. Data will populate dynamically.</p>
        ) : (
          <div className="overflow-x-auto select-none">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#000000]/10 dark:border-white/5 text-neutral-400 font-bold uppercase text-[9px] tracking-wider select-none">
                  <th className="py-2.5 w-12 text-center">Rank</th>
                  <th>Movie Title</th>
                  <th className="w-48">Clicks Weight Distribution</th>
                  <th className="w-24 text-right">Raw Clicks</th>
                </tr>
              </thead>
              <tbody>
                {stats.topDownloadedMovies.map((m, index) => {
                  const maxClicksVal = Math.max(...stats.topDownloadedMovies.map(o => o.clicks), 1);
                  const widthPercent = Math.min(100, Math.round((m.clicks / maxClicksVal) * 100));
                  
                  return (
                    <tr key={m.movieId} className="border-b border-[#000000]/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                      <td className="py-3 text-center">
                        <span className={`inline-flex w-5 h-5 items-center justify-center rounded-md font-black text-[10px] select-none ${
                          index === 0 
                            ? 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20' 
                            : index === 1 
                              ? 'bg-neutral-300/10 text-neutral-400 ring-1 ring-neutral-300/20'
                              : index === 2 
                                ? 'bg-[#92400e]/10 text-amber-600 ring-1 ring-[#92400e]/20'
                                : 'bg-slate-500/15 text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="font-extrabold text-neutral-800 dark:text-neutral-100">{m.movieTitle}</td>
                      <td>
                        <div className="w-full bg-[#121223]/25 border border-white/5 h-2 rounded-full overflow-hidden">
                          <div style={{ width: `${widthPercent}%` }} className="bg-gradient-to-r from-brand-accent to-[#10B981] h-full rounded-full" />
                        </div>
                      </td>
                      <td className="text-right font-mono font-black text-emerald-450">{m.clicks} clicks</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
