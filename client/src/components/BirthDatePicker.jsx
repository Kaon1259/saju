import { useState, useEffect, useRef } from 'react';
import './BirthDatePicker.css';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year, month, isLunar) {
  if (isLunar) return 30; // 음력은 최대 30일
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function BirthDatePicker({ value, onChange, calendarType = 'SOLAR', maxDate }) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parseInt(parts[0]));
        setMonth(parseInt(parts[1]));
        setDay(parseInt(parts[2]));
      }
    } else {
      setYear('');
      setMonth('');
      setDay('');
    }
  }, [value]);

  const handleChange = (newYear, newMonth, newDay) => {
    if (newYear && newMonth && newDay) {
      const y = String(newYear).padStart(4, '0');
      const m = String(newMonth).padStart(2, '0');
      const d = String(newDay).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  };

  const isLunar = calendarType === 'LUNAR';
  const daysCount = getDaysInMonth(year, month, isLunar);
  const DAYS = Array.from({ length: daysCount }, (_, i) => i + 1);

  // 일수가 줄어들면 day 보정
  useEffect(() => {
    if (day > daysCount) {
      setDay(daysCount);
      if (year && month) handleChange(year, month, daysCount);
    }
  }, [daysCount]);

  return (
    <div className="bdp-container">
      <div className="bdp-selects">
        <div className="bdp-select-wrap">
          <select
            className="bdp-select"
            value={year}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setYear(v);
              handleChange(v, month, day);
            }}
          >
            <option value="">년</option>
            {YEARS.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>
        <div className="bdp-select-wrap">
          <select
            className="bdp-select"
            value={month}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setMonth(v);
              handleChange(year, v, day);
            }}
          >
            <option value="">월</option>
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        </div>
        <div className="bdp-select-wrap">
          <select
            className="bdp-select"
            value={day}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setDay(v);
              handleChange(year, month, v);
            }}
          >
            <option value="">일</option>
            {DAYS.map(d => (
              <option key={d} value={d}>{d}일</option>
            ))}
          </select>
        </div>
      </div>
      {isLunar && <span className="bdp-lunar-hint">음력 날짜를 입력하세요</span>}
    </div>
  );
}

export default BirthDatePicker;
