import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import data from './data.json'

// Maps each programming language to a hex color used across the dashboard
const LANGUAGE_COLORS = {
  Python: '#06b6d4',
  TypeScript: '#f59e0b',
  Rust: '#22c55e',
  Go: '#14b8a6',
  JavaScript: '#f97316',
  'C++': '#ef4444',
  Java: '#a855f7',
  Unknown: '#64748b',
}

// Tailwind class strings for the HOT, NEW, and RISING status badges
const STATUS_STYLES = {
  HOT: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  NEW: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  RISING: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
}

// Language options shown as filter pills
const FILTER_LANGUAGES = ['All', 'Python', 'TypeScript', 'Rust', 'Go', 'JavaScript', 'C++', 'Java']

// Converts raw numbers into compact display strings (e.g. 42000 -> "42K")
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1) + 'K'
    return formatted.replace('.0K', 'K')
  }
  return String(num)
}
// ===== B-START: Paste the App function =====

function App() {

  // Reactive state: search text and active language filter
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  // Track the selected sort field
  const [sortBy, setSortBy] = useState('stars')

  // Toggle between dark and light themes
  const [darkMode, setDarkMode] = useState(true)

  // Define color tokens for both themes
  const theme = darkMode
    ? { bg: '#0a0e17', card: '#0d1117', border: '#1e293b', input: '#1a1f2e', text: 'white', muted: '#94a3b8' }
    : { bg: '#767F53', card: '#ffffff', border: '#e2e8f0', input: '#f8fafc', text: '#0f172a', muted: '#64748b' }

  // Scraper run status: 'idle' | 'running' | 'finished'
  const [runStatus, setRunStatus] = useState('idle')
  const [runTimestamp, setRunTimestamp] = useState(null)

  // Simulate a scraper run with a 3-second delay
  function handleRun() {
    setRunStatus('running')
    setRunTimestamp(null)
    setTimeout(() => {
      setRunStatus('finished')
      setRunTimestamp(new Date().toLocaleTimeString())
    }, 3000)
  }

  // Filter the full dataset by language pill and search text
  const filteredData = useMemo(() => {
    let result = data
    if (activeFilter !== 'All') {
      result = result.filter(repo => repo.language === activeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(repo =>
        repo.name.toLowerCase().includes(q) ||
        repo.description.toLowerCase().includes(q) ||
        repo.language.toLowerCase().includes(q)
      )
    }

    // Sort by the selected field before returning
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return b[sortBy] - a[sortBy]
    })
    return result
  }, [search, activeFilter, sortBy])

  const totalRepos = filteredData.length

  // Find the most common language in the filtered results
  const topLanguage = useMemo(() => {
    const counts = {}
    filteredData.forEach(r => {
      if (r.language) counts[r.language] = (counts[r.language] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted.length > 0 ? sorted[0] : ['N/A', 0]
  }, [filteredData])

  // Calculate the average star count across filtered repos
  const avgStars = useMemo(() => {
    if (filteredData.length === 0) return '0'
    const avg = filteredData.reduce((sum, r) => sum + r.stars, 0) / filteredData.length
    return formatNumber(Math.round(avg))
  }, [filteredData])

  // Sum all forks across filtered repos
  const totalForks = useMemo(() => {
    return formatNumber(filteredData.reduce((sum, r) => sum + r.forks, 0))
  }, [filteredData])

  const topLangPercent = totalRepos > 0 ? Math.round((topLanguage[1] / totalRepos) * 100) : 0

  // Count repos per language for the bar chart (top 6)
  const languageChartData = useMemo(() => {
    const counts = {}
    filteredData.forEach(r => {
      if (r.language) counts[r.language] = (counts[r.language] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }, [filteredData])

  // Add percentage values for the pie chart
  const pieData = useMemo(() => {
    const total = filteredData.length
    return languageChartData.map(item => ({
      ...item,
      percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }))
  }, [filteredData, languageChartData])

    return (
    <div
      className="min-h-screen font-mono p-4 md:p-6 transition-colors duration-300"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >

      {/* Header */}
      <header
        className="flex flex-wrap items-center justify-between gap-4 mb-6 rounded-lg px-6 py-4 border"
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
          <h1 className="text-lg md:text-xl font-bold tracking-wider text-cyan-400">
            GITHUB TRENDING DASHBOARD
          </h1>
        </div>

        {/* Run Scraper button */}
        <button
          onClick={handleRun}
          disabled={runStatus === 'running'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider border transition-all duration-200"
          style={{
            backgroundColor: runStatus === 'running' ? '#064e3b' : runStatus === 'finished' ? '#022c22' : theme.card,
            borderColor: runStatus === 'idle' ? theme.border : '#10b981',
            color: runStatus === 'idle' ? theme.muted : '#34d399',
            cursor: runStatus === 'running' ? 'not-allowed' : 'pointer',
          }}
        >
          {/* Status dot: pulsing green when running, solid green when finished, gray when idle */}
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              runStatus === 'running'
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : runStatus === 'finished'
                  ? 'bg-emerald-400'
                  : 'bg-gray-500'
            }`}
          />
          {runStatus === 'running' && 'RUNNING...'}
          {runStatus === 'finished' && `FINISHED ${runTimestamp}`}
          {runStatus === 'idle' && 'RUN SCRAPER'}
        </button>

        {/* Theme toggle button */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="text-xl px-2 py-1 rounded-lg hover:bg-gray-700/30 transition-colors"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <div className="flex-1 max-w-md mx-4">
          <input
            type="text"
            placeholder="Search repos, languages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            style={{ backgroundColor: theme.input, borderColor: theme.border, color: theme.text, border: '1px solid' }}
          />
        </div>
        <div className="text-right text-xs">
          <div style={{ color: theme.muted }} className="tracking-wider">UPDATED: 2 MIN AGO</div>
          <div className="text-emerald-400 font-bold tracking-wider">
            LIVE &bull; {data.length} REPOS SCRAPED
          </div>
        </div>
      </header>

      {/* Filter Pills + Sort Dropdown */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => setActiveFilter(lang)}
            className={`px-5 py-2 rounded-lg text-sm font-medium tracking-wide transition-all duration-200 ${
              activeFilter === lang
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'text-gray-400 border hover:border-gray-500'
            }`}
            style={activeFilter !== lang ? { backgroundColor: theme.card, borderColor: theme.border } : {}}
          >
            {lang}
          </button>
        ))}
        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-lg px-4 py-2 text-sm font-medium tracking-wide focus:outline-none focus:border-cyan-500 transition-colors border"
          style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.muted }}
        >
          <option value="stars">Sort by Stars</option>
          <option value="forks">Sort by Forks</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard theme={theme} label="TOTAL REPOS" value={totalRepos} sub1={`+${Math.min(totalRepos, 12)} today`} sub2="&#8593; 8% vs yesterday" />
        <MetricCard theme={theme} label="TOP LANGUAGE" value={topLanguage[0]} sub1={`${topLangPercent}% of repos`} sub2="Trending &#8593;" />
        <MetricCard theme={theme} label="AVG STARS" value={avgStars} sub1="&#8593; 18% vs yesterday" sub2="All-time high" />
        <MetricCard theme={theme} label="TOTAL FORKS" value={totalForks} sub1={`+340 this week`} sub2="Contributors" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Bar Chart */}
        <div
          className="rounded-lg p-6 border"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold tracking-wider">TOP LANGUAGES</h2>
            <span className="text-xs tracking-wider" style={{ color: theme.muted }}>LAST 7 DAYS</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={languageChartData} layout="vertical" margin={{ left: 0, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: theme.muted, fontSize: 12, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  color: theme.text,
                  fontFamily: 'monospace',
                }}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                barSize={20}
                label={{ position: 'right', fill: '#06b6d4', fontSize: 13, fontFamily: 'monospace' }}
              >
                {languageChartData.map((entry) => (
                  <Cell key={entry.name} fill={LANGUAGE_COLORS[entry.name] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div
          className="rounded-lg p-6 border"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <h2 className="text-sm font-bold tracking-wider mb-4">LANGUAGE BREAKDOWN</h2>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={2} dataKey="value" stroke="none">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={LANGUAGE_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.card,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    color: theme.text,
                    fontFamily: 'monospace',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-3xl font-bold">{totalRepos}</div>
              <div className="text-[10px] tracking-widest" style={{ color: theme.muted }}>REPOS</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs" style={{ color: theme.muted }}>
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: LANGUAGE_COLORS[item.name] || '#64748b' }} />
                {item.name} {item.percent}%
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Repo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredData.map(repo => (
          <RepoCard key={repo.name} repo={repo} theme={theme} />
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12" style={{ color: theme.muted }}>
          No repositories found matching your search.
        </div>
      )}
    </div>
  )
}

// Renders a single metric card with themed colors
function MetricCard({ label, value, sub1, sub2, theme }) {
  return (
    <div
      className="rounded-lg p-5 hover:border-cyan-500/30 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.05)] border"
      style={{ backgroundColor: theme.card, borderColor: theme.border }}
    >
      <div className="text-[10px] tracking-widest mb-2" style={{ color: theme.muted }}>{label}</div>
      <div className="text-3xl font-bold text-cyan-400 mb-3">{value}</div>
      <div className="flex justify-between text-xs" style={{ color: theme.muted }}>
        <span className="text-emerald-400" dangerouslySetInnerHTML={{ __html: sub1 }} />
        <span dangerouslySetInnerHTML={{ __html: sub2 }} />
      </div>
    </div>
  )
}

// Renders a single repo card with themed colors
function RepoCard({ repo, theme }) {
  const langColor = LANGUAGE_COLORS[repo.language] || '#64748b'
  return (
    <div
      className="rounded-lg overflow-hidden hover:border-cyan-500/30 transition-colors border"
      style={{ backgroundColor: theme.card, borderColor: theme.border }}
    >
      <div className="h-1" style={{ backgroundColor: langColor }} />
      <div className="p-4">
        {repo.status && (
          <div className="flex justify-end mb-2">
            <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${STATUS_STYLES[repo.status] || ''}`}>
              {repo.status}
            </span>
          </div>
        )}
        <h3 className="font-bold mb-2 text-sm" style={{ color: theme.text }}>{repo.name}</h3>
        <p className="text-xs mb-4 line-clamp-2 leading-relaxed" style={{ color: theme.muted }}>
          {repo.description || 'No description available'}
        </p>
        <div className="text-xl font-bold text-cyan-400 mb-1">
          &#9734; {repo.stars_formatted}
        </div>
        <div className="text-xs mb-3" style={{ color: theme.muted }}>
          &#8595; {formatNumber(repo.forks)} forks &bull; &#9889; {formatNumber(repo.issues)} issues
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span
            className="px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider"
            style={{
              backgroundColor: langColor + '20',
              color: langColor,
              border: `1px solid ${langColor}40`,
            }}
          >
            {repo.language || 'Unknown'}
          </span>
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
          >
            VIEW &#8594;
          </a>
        </div>
        <div className="text-[10px]" style={{ color: theme.muted }}>
          Updated {repo.last_updated}
          {repo.license && ` \u2022 ${repo.license}`}
        </div>
      </div>
    </div>
  )
}

export default App