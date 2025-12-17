import { useState, useEffect } from 'react';
import api from '../api/api';

interface CalendarHeatmapProps {
    onDateClick: (date: string) => void;
}

const CalendarHeatmap = ({ onDateClick }: CalendarHeatmapProps) => {
    const [entriesMap, setEntriesMap] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEntryDates();
    }, []);

    const fetchEntryDates = async () => {
        try {
            const response = await api.get('/entries/all');
            const entries = response.data;

            // Create map of date -> word count
            const map: Record<string, number> = {};
            entries.forEach((entry: { entry_date: string; content: string }) => {
                const wordCount = entry.content.trim().split(/\s+/).length;
                map[entry.entry_date] = wordCount;
            });

            setEntriesMap(map);
        } catch (error) {
            console.error('Error fetching entries:', error);
        } finally {
            setLoading(false);
        }
    };

    // Generate last 365 days
    const generateDays = () => {
        const days = [];
        const today = new Date();

        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }

        return days;
    };

    const getIntensity = (wordCount: number) => {
        if (!wordCount) return 0;
        if (wordCount < 50) return 1;
        if (wordCount < 100) return 2;
        if (wordCount < 200) return 3;
        return 4;
    };

    const days = generateDays();
    const weeks: string[][] = [];

    // Group days into weeks
    let currentWeek: string[] = [];
    days.forEach((day, index) => {
        const dayOfWeek = new Date(day).getDay();

        // Start new week on Sunday
        if (dayOfWeek === 0 && currentWeek.length > 0) {
            weeks.push(currentWeek);
            currentWeek = [];
        }

        currentWeek.push(day);

        if (index === days.length - 1) {
            weeks.push(currentWeek);
        }
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get month labels for the header
    const getMonthLabels = () => {
        const labels: { month: string; week: number }[] = [];
        let currentMonth = -1;

        weeks.forEach((week, weekIndex) => {
            const firstDay = new Date(week[0]);
            if (firstDay.getMonth() !== currentMonth) {
                currentMonth = firstDay.getMonth();
                labels.push({ month: months[currentMonth], week: weekIndex });
            }
        });

        return labels;
    };

    if (loading) {
        return (
            <div className="calendar-loading">
                <div className="loading-spinner"></div>
                <p>Loading calendar...</p>
            </div>
        );
    }

    return (
        <div className="calendar-heatmap">
            <div className="calendar-header">
                <h3>📅 Writing Activity</h3>
                <div className="calendar-legend">
                    <span className="legend-label">Less</span>
                    <div className="legend-scale">
                        <div className="legend-cell intensity-0"></div>
                        <div className="legend-cell intensity-1"></div>
                        <div className="legend-cell intensity-2"></div>
                        <div className="legend-cell intensity-3"></div>
                        <div className="legend-cell intensity-4"></div>
                    </div>
                    <span className="legend-label">More</span>
                </div>
            </div>

            <div className="calendar-container">
                {/* Month labels */}
                <div className="calendar-months">
                    <div className="month-spacer"></div>
                    {getMonthLabels().map((label, i) => (
                        <div
                            key={i}
                            className="month-label"
                            style={{ gridColumn: label.week + 2 }}
                        >
                            {label.month}
                        </div>
                    ))}
                </div>

                <div className="calendar-grid-wrapper">
                    {/* Day labels */}
                    <div className="calendar-day-labels">
                        {weekDays.map((day, i) => (
                            <div key={i} className="day-label">
                                {i % 2 === 1 ? day[0] : ''}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="calendar-grid">
                        {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="calendar-week">
                                {week.map((day) => {
                                    const wordCount = entriesMap[day] || 0;
                                    const intensity = getIntensity(wordCount);

                                    return (
                                        <div
                                            key={day}
                                            className={`calendar-cell intensity-${intensity}`}
                                            onClick={() => onDateClick(day)}
                                            title={`${day}: ${wordCount} words`}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarHeatmap;
