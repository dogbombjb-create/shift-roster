'use client';
import React, { useState, useEffect } from 'react';
import { STAFF, generateMonthlyRoster, validateRoster, getDaysInMonth, getDayOfWeek, CLOSED_DAY, SHOP_CLOSED, PAID_LEAVE, OFF } from '../utils/rosterGenerator';

const getShiftColor = (shift) => {
    switch (shift) {
        case 'A': return '#ffadd2';
        case 'B': return '#ffbb96';
        case 'S': return '#b7eb8f';
        case CLOSED_DAY: return '#f5f5f5';
        case SHOP_CLOSED: return '#cccccc';
        case PAID_LEAVE: return '#e6f7ff';
        case OFF: return '#ffffff';
        default: return '#ffffff';
    }
};

const WEEKDAYS_JP = {
    'Sun': '日', 'Mon': '月', 'Tue': '火', 'Wed': '水', 'Thu': '木', 'Fri': '金', 'Sat': '土'
};

export default function MonthlyRoster() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedule, setSchedule] = useState({});

    useEffect(() => {
        const saved = localStorage.getItem('monthly_roster');
        if (saved) setSchedule(JSON.parse(saved));
    }, []);

    useEffect(() => {
        if (Object.keys(schedule).length > 0) {
            localStorage.setItem('monthly_roster', JSON.stringify(schedule));
        }
    }, [schedule]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const [holidays, setHolidays] = useState(new Set());
    const [closedDays, setClosedDays] = useState(new Set());

    useEffect(() => {
        const savedHolidays = localStorage.getItem('shift_holidays');
        if (savedHolidays) setHolidays(new Set(JSON.parse(savedHolidays)));
        const savedClosed = localStorage.getItem('shift_closed');
        if (savedClosed) setClosedDays(new Set(JSON.parse(savedClosed)));
    }, []);

    useEffect(() => {
        localStorage.setItem('shift_holidays', JSON.stringify([...holidays]));
    }, [holidays]);

    useEffect(() => {
        localStorage.setItem('shift_closed', JSON.stringify([...closedDays]));
    }, [closedDays]);

    const toggleDayStatus = (dateStr) => {
        const newHolidays = new Set(holidays);
        const newClosed = new Set(closedDays);
        if (newHolidays.has(dateStr)) {
            newHolidays.delete(dateStr);
            newClosed.add(dateStr);
        } else if (newClosed.has(dateStr)) {
            newClosed.delete(dateStr);
        } else {
            newHolidays.add(dateStr);
        }
        setHolidays(newHolidays);
        setClosedDays(newClosed);
    };

    const handleGenerate = () => {
        const newRoster = generateMonthlyRoster(year, month, schedule, holidays, closedDays);
        setSchedule(prev => ({ ...prev, ...newRoster }));
    };

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleChange = (dateStr, staffId, value) => {
        setSchedule(prev => {
            const newDaySchedule = { ...(prev[dateStr] || {}) };
            newDaySchedule[staffId] = value;
            if (['A', 'B'].includes(value)) {
                if (staffId === 'u') newDaySchedule['i'] = value === 'A' ? 'B' : 'A';
                else if (staffId === 'i') newDaySchedule['u'] = value === 'A' ? 'B' : 'A';
                else if (staffId === 'k') newDaySchedule['t'] = value === 'A' ? 'B' : 'A';
                else if (staffId === 't') newDaySchedule['k'] = value === 'A' ? 'B' : 'A';
            }
            return { ...prev, [dateStr]: newDaySchedule };
        });
    };

    const handleReset = () => {
        if (confirm('このデータをリセットしますか？')) {
            setSchedule({});
            localStorage.removeItem('monthly_roster');
        }
    };

    const getRowStats = (staffId) => {
        let aCount = 0, bCount = 0, sCount = 0, plCount = 0;
        daysArray.forEach(d => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const shift = schedule[dateStr]?.[staffId];
            if (shift === 'A') aCount++;
            if (shift === 'B') bCount++;
            if (shift === 'S') sCount++;
            if (shift === PAID_LEAVE) plCount++;
        });
        return { aCount, bCount, sCount, plCount, totalWork: aCount + bCount };
    };

    const getColTotal = (d) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        let count = 0;
        STAFF.forEach(s => {
            const shift = schedule[dateStr]?.[s.id];
            if (['A', 'B'].includes(shift)) count++;
        });
        return count;
    };

    const makeDateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    return (
        <div className="roster-container">
            <header className="roster-header">
                <div className="roster-month-nav">
                    <button className="roster-btn" onClick={handlePrevMonth}>&lt;</button>
                    <span>{year} / {month + 1}</span>
                    <button className="roster-btn" onClick={handleNextMonth}>&gt;</button>
                </div>
                <h1 className="roster-title">月間シフト表</h1>
                <div className="roster-controls">
                    <button className="roster-btn" onClick={handleGenerate}>自動割当</button>
                    <button className="roster-btn roster-btn-dark" onClick={handleReset}>リセット</button>
                    <button className="roster-btn roster-btn-print" onClick={() => window.print()}>🖨 印刷</button>
                </div>
            </header>

            <div className="roster-table-wrap">
                <table className="roster-table">
                    <thead>
                        <tr>
                            <th className="roster-name-cell roster-name-cell-header">名前</th>
                            {daysArray.map(d => {
                                const dayOfWeek = getDayOfWeek(year, month, d);
                                const dateStr = makeDateStr(d);
                                const validation = validateRoster(schedule, dateStr);
                                const isHoli = holidays.has(dateStr);
                                const isClosed = closedDays.has(dateStr);

                                let color = '#333';
                                let bg = '#f5f5f5';
                                let label = null;

                                if (isClosed) {
                                    bg = '#ccc';
                                    label = <div style={{ fontSize: '0.7em', fontWeight: 'bold' }}>休</div>;
                                } else if (isHoli) {
                                    color = 'red';
                                    bg = '#fff0f0';
                                    label = <div style={{ fontSize: '0.7em' }}>祝</div>;
                                } else {
                                    if (dayOfWeek === 'Sun') color = 'red';
                                    else if (dayOfWeek === 'Sat') color = 'blue';
                                }

                                return (
                                    <th
                                        key={d}
                                        style={{ color, backgroundColor: bg, cursor: 'pointer' }}
                                        onClick={() => toggleDayStatus(dateStr)}
                                        title="タップで切替: 通常→祝日→店休"
                                    >
                                        <div className="roster-date-header">{d}</div>
                                        <div className="roster-day-header">{WEEKDAYS_JP[dayOfWeek]}</div>
                                        {label}
                                        {!validation.valid && <div className="roster-warning" title={validation.message}></div>}
                                    </th>
                                );
                            })}
                            <th className="roster-stat-th">A</th>
                            <th className="roster-stat-th">B</th>
                            <th className="roster-stat-th">S</th>
                            <th className="roster-stat-th" style={{ backgroundColor: '#f0f0f0' }}>出</th>
                            <th className="roster-stat-th" style={{ color: 'red' }}>PL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {STAFF.map(staff => {
                            const stats = getRowStats(staff.id);
                            return (
                                <tr key={staff.id}>
                                    <td className="roster-name-cell">{staff.name}</td>
                                    {daysArray.map(d => {
                                        const dateStr = makeDateStr(d);
                                        const shift = schedule[dateStr]?.[staff.id] || OFF;
                                        return (
                                            <td key={dateStr} style={{ backgroundColor: getShiftColor(shift) }}>
                                                <select
                                                    className="roster-select"
                                                    style={{ backgroundColor: getShiftColor(shift) }}
                                                    value={shift}
                                                    onChange={(e) => handleChange(dateStr, staff.id, e.target.value)}
                                                >
                                                    <option value="A">A</option>
                                                    <option value="B">B</option>
                                                    <option value="S">S</option>
                                                    <option value={OFF}>-</option>
                                                    <option value={PAID_LEAVE}>PL</option>
                                                    <option value={CLOSED_DAY}>Cls</option>
                                                    <option value={SHOP_CLOSED}>休</option>
                                                </select>
                                            </td>
                                        );
                                    })}
                                    <td className="roster-stat-td">{stats.aCount}</td>
                                    <td className="roster-stat-td">{stats.bCount}</td>
                                    <td className="roster-stat-td">{stats.sCount}</td>
                                    <td className="roster-stat-td" style={{ backgroundColor: '#f0f0f0' }}>{stats.totalWork}</td>
                                    <td className="roster-stat-td" style={{ color: 'red' }}>{stats.plCount}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="roster-name-cell roster-footer-cell">合計</td>
                            {daysArray.map(d => (
                                <td key={d} className="roster-footer-cell">{getColTotal(d)}</td>
                            ))}
                            <td colSpan={5} className="roster-footer-cell"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
