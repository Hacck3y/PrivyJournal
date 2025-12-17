import { useState, useEffect } from 'react';
import api from '../api/api';

interface DatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDate: (date: string) => void;
}

const DatePickerModal = ({ isOpen, onClose, onSelectDate }: DatePickerModalProps) => {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [entryDates, setEntryDates] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchEntryDates();
        }
    }, [isOpen]);

    const fetchEntryDates = async () => {
        try {
            const response = await api.get('/entries/all');
            const dates = new Set(response.data.map((e: { entry_date: string }) => e.entry_date));
            setEntryDates(dates as Set<string>);
        } catch (error) {
            console.error('Error fetching entry dates:', error);
        }
    };

    if (!isOpen) return null;

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    const formatDateString = (day: number) => {
        const month = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        return `${currentYear}-${month}-${dayStr}`;
    };

    const handleDateClick = (day: number) => {
        const dateStr = formatDateString(day);
        onSelectDate(dateStr);
        onClose();
    };

    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    };

    // Quick date shortcuts
    const goToDate = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() - days);
        const dateStr = date.toISOString().split('T')[0];
        onSelectDate(dateStr);
        onClose();
    };

    // Generate calendar days
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    // Check if a date is today
    const today = new Date();
    const isToday = (day: number) => {
        return day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content date-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📅 Jump to Date</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Quick shortcuts */}
                    <div className="quick-dates">
                        <button className="quick-date-btn" onClick={() => goToDate(0)}>
                            Today
                        </button>
                        <button className="quick-date-btn" onClick={() => goToDate(1)}>
                            Yesterday
                        </button>
                        <button className="quick-date-btn" onClick={() => goToDate(7)}>
                            Last Week
                        </button>
                        <button className="quick-date-btn" onClick={() => goToDate(30)}>
                            Last Month
                        </button>
                    </div>

                    <div className="date-divider">
                        <span>or pick from calendar</span>
                    </div>

                    {/* Calendar */}
                    <div className="custom-calendar">
                        {/* Month/Year Navigation */}
                        <div className="calendar-nav">
                            <button className="nav-arrow" onClick={goToPrevMonth}>←</button>
                            <div className="nav-center">
                                <select
                                    value={currentMonth}
                                    onChange={(e) => setCurrentMonth(Number(e.target.value))}
                                    className="month-select"
                                >
                                    {months.map((month, index) => (
                                        <option key={month} value={index}>{month}</option>
                                    ))}
                                </select>
                                <select
                                    value={currentYear}
                                    onChange={(e) => setCurrentYear(Number(e.target.value))}
                                    className="year-select"
                                >
                                    {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <button className="today-btn" onClick={goToToday}>
                                    Today
                                </button>
                            </div>
                            <button className="nav-arrow" onClick={goToNextMonth}>→</button>
                        </div>

                        {/* Days of Week Header */}
                        <div className="calendar-weekdays">
                            {daysOfWeek.map(day => (
                                <div key={day} className="weekday">{day}</div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="calendar-days">
                            {days.map((day, index) => {
                                if (day === null) {
                                    return <div key={`empty-${index}`} className="day empty" />;
                                }

                                const dateStr = formatDateString(day);
                                const hasEntry = entryDates.has(dateStr);
                                const isTodayDay = isToday(day);

                                return (
                                    <button
                                        key={day}
                                        className={`day ${hasEntry ? 'has-entry' : ''} ${isTodayDay ? 'today' : ''}`}
                                        onClick={() => handleDateClick(day)}
                                    >
                                        {day}
                                        {hasEntry && <span className="entry-dot" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="calendar-legend">
                            <span className="legend-item">
                                <span className="legend-dot has-entry"></span>
                                Has entry
                            </span>
                            <span className="legend-item">
                                <span className="legend-dot today-dot"></span>
                                Today
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatePickerModal;
