import { useState, useEffect, useMemo } from 'react';
import api from '../api/api';
import CalendarHeatmap from './CalendarHeatmap';

interface Entry {
    id: number;
    entry_date: string;
    content: string;
    tags: string[];
    mood: number | null;
}

interface Stats {
    totalEntries: number;
    totalWords: number;
    avgWordsPerEntry: number;
    moodDistribution: Record<number, number>;
}

interface Streak {
    current: number;
    longest: number;
}

interface InsightsPanelProps {
    onDateClick: (date: string) => void;
}

const moods = [
    { value: 1, emoji: '😢', label: 'Terrible' },
    { value: 2, emoji: '😔', label: 'Bad' },
    { value: 3, emoji: '😐', label: 'Okay' },
    { value: 4, emoji: '😊', label: 'Good' },
    { value: 5, emoji: '🤩', label: 'Amazing' }
];

type TimeFilter = '7d' | '30d' | '6m' | '1y' | 'all';

const timeFilters: { value: TimeFilter; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '6m', label: '6 Months' },
    { value: '1y', label: '1 Year' },
    { value: 'all', label: 'All Time' }
];

const InsightsPanel = ({ onDateClick }: InsightsPanelProps) => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [streak, setStreak] = useState<Streak | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [moodFilter, setMoodFilter] = useState<TimeFilter>('30d');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, streakRes, entriesRes] = await Promise.all([
                api.get('/stats'),
                api.get('/streak'),
                api.get('/entries/all')
            ]);
            setStats(statsRes.data);
            setStreak(streakRes.data);
            setEntries(entriesRes.data);
        } catch (error) {
            console.error('Error fetching insights:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter entries by time period and calculate mood distribution
    const filteredMoodData = useMemo(() => {
        const now = new Date();
        let cutoffDate: Date;

        switch (moodFilter) {
            case '7d':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '6m':
                cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                cutoffDate = new Date(0); // All time
        }

        const filtered = entries.filter(entry => {
            const entryDate = new Date(entry.entry_date);
            return entryDate >= cutoffDate;
        });

        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        filtered.forEach(entry => {
            if (entry.mood && entry.mood >= 1 && entry.mood <= 5) {
                distribution[entry.mood]++;
            }
        });

        const total = Object.values(distribution).reduce((a, b) => a + b, 0);
        return { distribution, total };
    }, [entries, moodFilter]);

    const getMoodPercentage = (count: number) => {
        return filteredMoodData.total > 0 ? Math.round((count / filteredMoodData.total) * 100) : 0;
    };

    if (loading) {
        return (
            <div className="insights-loading">
                <div className="loading-spinner"></div>
                <p>Loading insights...</p>
            </div>
        );
    }

    return (
        <div className="insights-panel animate-fade-in">
            <h2 className="insights-title gradient-text animate-slide-in">✨ Your Insights</h2>

            {/* Stats Cards */}
            <div className="stats-grid stagger-children">
                <div className="stat-card glass-card animate-hover-lift">
                    <div className="stat-icon">📔</div>
                    <div className="stat-value">{stats?.totalEntries || 0}</div>
                    <div className="stat-label">Total Entries</div>
                </div>

                <div className="stat-card glass-card animate-hover-lift">
                    <div className="stat-icon">✍️</div>
                    <div className="stat-value">{stats?.totalWords?.toLocaleString() || 0}</div>
                    <div className="stat-label">Words Written</div>
                </div>

                <div className="stat-card glass-card animate-hover-lift">
                    <div className="stat-icon">📊</div>
                    <div className="stat-value">{stats?.avgWordsPerEntry || 0}</div>
                    <div className="stat-label">Avg. Words/Entry</div>
                </div>

                <div className="stat-card streak-card glass-card animate-hover-lift">
                    <div className="stat-icon">🔥</div>
                    <div className="stat-value">{streak?.current || 0}</div>
                    <div className="stat-label">Current Streak</div>
                    <div className="stat-subtext">Best: {streak?.longest || 0} days</div>
                </div>
            </div>

            {/* Calendar Heatmap */}
            <div className="insights-section glass-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <CalendarHeatmap onDateClick={onDateClick} />
            </div>

            {/* Mood Distribution */}
            <div className="insights-section glass-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="section-header-row">
                    <h3>😊 Mood Distribution</h3>
                    <div className="time-filter-tabs">
                        {timeFilters.map(filter => (
                            <button
                                key={filter.value}
                                className={`time-filter-btn ${moodFilter === filter.value ? 'active' : ''}`}
                                onClick={() => setMoodFilter(filter.value)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mood-chart">
                    {moods.map(mood => {
                        const count = filteredMoodData.distribution[mood.value] || 0;
                        const percentage = getMoodPercentage(count);

                        return (
                            <div key={mood.value} className="mood-bar-container">
                                <div className="mood-bar-label">
                                    <span className="mood-emoji">{mood.emoji}</span>
                                    <span className="mood-count">{count}</span>
                                </div>
                                <div className="mood-bar-track">
                                    <div
                                        className="mood-bar-fill"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="mood-percentage">{percentage}%</span>
                            </div>
                        );
                    })}
                    {filteredMoodData.total === 0 && (
                        <div className="mood-empty">
                            No mood data for this period
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .insights-panel {
                    padding-bottom: 40px;
                }
                .insights-title {
                    font-size: 2rem;
                    font-weight: 800;
                    margin-bottom: 32px;
                    display: inline-block;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 32px;
                }
                
                .stat-card {
                    padding: 24px;
                    border-radius: var(--radius-lg);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    transition: all 0.2s;
                }
                
                .stat-icon {
                    font-size: 2.5rem;
                    margin-bottom: 12px;
                }
                
                .stat-value {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    line-height: 1.2;
                }
                
                .stat-label {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    margin-top: 4px;
                }
                .stat-subtext {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-top: 4px;
                }
                
                .streak-card {
                    background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 107, 107, 0.02));
                    border: 1px solid rgba(255, 107, 107, 0.2);
                }
                
                .insights-section {
                    margin-bottom: 32px;
                    padding: 24px;
                    border-radius: var(--radius-lg);
                }
                
                .section-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                
                .time-filter-tabs {
                    display: flex;
                    background: rgba(0,0,0,0.2);
                    padding: 4px;
                    border-radius: var(--radius-md);
                }
                
                .time-filter-btn {
                    background: none;
                    border: none;
                    padding: 6px 12px;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .time-filter-btn.active {
                    background: var(--bg-card);
                    color: var(--text-primary);
                    box-shadow: var(--shadow-sm);
                }
                
                .mood-chart {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .mood-bar-container {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .mood-bar-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 60px;
                }
                .mood-emoji {
                    font-size: 1.2rem;
                }
                .mood-count {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .mood-bar-track {
                    flex: 1;
                    height: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .mood-bar-fill {
                    height: 100%;
                    background: var(--accent-primary);
                    border-radius: 4px;
                    transition: width 0.5s ease-out;
                }
                .mood-percentage {
                    width: 40px;
                    text-align: right;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .mood-empty {
                    text-align: center;
                    color: var(--text-muted);
                    padding: 20px;
                    font-style: italic;
                }
            `}</style>
        </div>
    );
};

export default InsightsPanel;
