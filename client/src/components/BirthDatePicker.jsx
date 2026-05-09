import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ZODIAC_ANIMALS } from './ZodiacGrid';
import './BirthDatePicker.css';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => 1920 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year, month, isLunar) {
  if (isLunar) return 30;
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

const CONSTELLATIONS = [
  { name: '염소자리', emoji: '♑', start: [1, 1], end: [1, 19] },
  { name: '물병자리', emoji: '♒', start: [1, 20], end: [2, 18] },
  { name: '물고기자리', emoji: '♓', start: [2, 19], end: [3, 20] },
  { name: '양자리', emoji: '♈', start: [3, 21], end: [4, 19] },
  { name: '황소자리', emoji: '♉', start: [4, 20], end: [5, 20] },
  { name: '쌍둥이자리', emoji: '♊', start: [5, 21], end: [6, 21] },
  { name: '게자리', emoji: '♋', start: [6, 22], end: [7, 22] },
  { name: '사자자리', emoji: '♌', start: [7, 23], end: [8, 22] },
  { name: '처녀자리', emoji: '♍', start: [8, 23], end: [9, 22] },
  { name: '천칭자리', emoji: '♎', start: [9, 23], end: [10, 22] },
  { name: '전갈자리', emoji: '♏', start: [10, 23], end: [11, 21] },
  { name: '사수자리', emoji: '♐', start: [11, 22], end: [12, 21] },
  { name: '염소자리2', emoji: '♑', start: [12, 22], end: [12, 31] },
];

function getConstellation(month, day) {
  if (!month || !day) return null;
  const v = month * 100 + day;
  const found = CONSTELLATIONS.find(c => v >= c.start[0] * 100 + c.start[1] && v <= c.end[0] * 100 + c.end[1]);
  if (!found) return null;
  return { ...found, name: found.name.replace('2', '') };
}

function getZodiac(year) {
  if (!year) return null;
  return ZODIAC_ANIMALS[((year - 4) % 12 + 12) % 12] || null;
}

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PAD_COUNT = Math.floor(VISIBLE_COUNT / 2);

function WheelColumn({ items, value, onChange, format, ariaLabel }) {
  const ref = useRef(null);
  const scrollTimer = useRef(null);
  const isUserScrolling = useRef(false);

  const selectedIndex = useMemo(() => {
    const idx = items.indexOf(value);
    return idx >= 0 ? idx : 0;
  }, [items, value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isUserScrolling.current) return;
    el.scrollTop = selectedIndex * ITEM_HEIGHT;
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    const el = ref.current;
    if (!el) return;
    scrollTimer.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      const targetTop = clamped * ITEM_HEIGHT;
      if (Math.abs(el.scrollTop - targetTop) > 1) {
        el.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
      const next = items[clamped];
      if (next !== value) onChange(next);
      isUserScrolling.current = false;
    }, 120);
  }, [items, value, onChange]);

  return (
    <div className="bdp-wheel" role="listbox" aria-label={ariaLabel}>
      <div className="bdp-wheel-scroll" ref={ref} onScroll={handleScroll}>
        <div style={{ height: PAD_COUNT * ITEM_HEIGHT }} />
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIndex);
          let className = 'bdp-wheel-item';
          if (dist === 0) className += ' bdp-wheel-item--selected';
          else if (dist === 1) className += ' bdp-wheel-item--near';
          else if (dist === 2) className += ' bdp-wheel-item--far';
          else className += ' bdp-wheel-item--hidden';
          return (
            <div
              key={item}
              className={className}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => {
                const el = ref.current;
                if (el) {
                  isUserScrolling.current = true;
                  el.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' });
                  onChange(item);
                  setTimeout(() => { isUserScrolling.current = false; }, 200);
                }
              }}
            >
              {format ? format(item) : item}
            </div>
          );
        })}
        <div style={{ height: PAD_COUNT * ITEM_HEIGHT }} />
      </div>
    </div>
  );
}

function BirthDateSheet({ open, onClose, year, month, day, calendarType, onConfirm, showCalendarToggle }) {
  const [tempYear, setTempYear] = useState(year || 1995);
  const [tempMonth, setTempMonth] = useState(month || 6);
  const [tempDay, setTempDay] = useState(day || 15);
  const [tempCal, setTempCal] = useState(calendarType || 'SOLAR');

  useEffect(() => {
    if (open) {
      setTempYear(year || 1995);
      setTempMonth(month || 6);
      setTempDay(day || 15);
      setTempCal(calendarType || 'SOLAR');
    }
  }, [open, year, month, day, calendarType]);

  const isLunar = tempCal === 'LUNAR' || tempCal === 'LEAP_LUNAR';
  const daysCount = getDaysInMonth(tempYear, tempMonth, isLunar);
  const DAYS = useMemo(() => Array.from({ length: daysCount }, (_, i) => i + 1), [daysCount]);

  useEffect(() => {
    if (tempDay > daysCount) setTempDay(daysCount);
  }, [daysCount, tempDay]);

  const tempZodiac = getZodiac(tempYear);
  const tempConstel = !isLunar ? getConstellation(tempMonth, tempDay) : null;

  // body 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const sheetUI = (
    <div className="bdp-sheet-overlay" onClick={onClose}>
      <div className="bdp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bdp-sheet-handle" />
        <div className="bdp-sheet-header">
          <h3 className="bdp-sheet-title">💕 운명의 날짜를 알려주세요</h3>
          <button className="bdp-sheet-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        {showCalendarToggle && (
          <div className="bdp-cal-toggle">
            <button
              type="button"
              className={`bdp-cal-btn ${tempCal === 'SOLAR' ? 'bdp-cal-btn--active' : ''}`}
              onClick={() => setTempCal('SOLAR')}
            >
              ☀️ 양력
            </button>
            <button
              type="button"
              className={`bdp-cal-btn ${tempCal === 'LUNAR' ? 'bdp-cal-btn--active' : ''}`}
              onClick={() => setTempCal('LUNAR')}
            >
              🌙 음력
            </button>
            <button
              type="button"
              className={`bdp-cal-btn ${tempCal === 'LEAP_LUNAR' ? 'bdp-cal-btn--active' : ''}`}
              onClick={() => setTempCal('LEAP_LUNAR')}
            >
              🌙✨ 윤달
            </button>
          </div>
        )}

        <div className="bdp-wheels">
          <div className="bdp-select-line" aria-hidden="true">
            <span className="bdp-select-line-heart bdp-heart-left">❤</span>
            <span className="bdp-select-line-heart bdp-heart-right">❤</span>
          </div>
          <WheelColumn items={YEARS} value={tempYear} onChange={setTempYear} format={(y) => `${y}년`} ariaLabel="연도" />
          <WheelColumn items={MONTHS} value={tempMonth} onChange={setTempMonth} format={(m) => `${m}월`} ariaLabel="월" />
          <WheelColumn items={DAYS} value={tempDay} onChange={setTempDay} format={(d) => `${d}일`} ariaLabel="일" />
        </div>

        <div className="bdp-preview-badges">
          {tempZodiac && (
            <div className="bdp-badge">
              <span className="bdp-badge-emoji">{tempZodiac.emoji}</span>
              <span>{tempZodiac.name}띠</span>
            </div>
          )}
          {tempConstel && (
            <div className="bdp-badge">
              <span className="bdp-badge-emoji">{tempConstel.emoji}</span>
              <span>{tempConstel.name}</span>
            </div>
          )}
        </div>

        <button
          className="bdp-confirm"
          onClick={() => onConfirm({ year: tempYear, month: tempMonth, day: tempDay, calendarType: tempCal })}
        >
          확인하기 <span className="bdp-confirm-heart">💖</span>
        </button>
      </div>
    </div>
  );

  return createPortal(sheetUI, document.body);
}

function BirthDatePicker({ value, onChange, calendarType = 'SOLAR', onCalendarTypeChange }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const parsed = useMemo(() => {
    if (!value) return { year: null, month: null, day: null };
    const parts = value.split('-');
    if (parts.length !== 3) return { year: null, month: null, day: null };
    return {
      year: parseInt(parts[0]) || null,
      month: parseInt(parts[1]) || null,
      day: parseInt(parts[2]) || null,
    };
  }, [value]);

  const isLunar = calendarType === 'LUNAR' || calendarType === 'LEAP_LUNAR';
  const calLabel =
    calendarType === 'LUNAR' ? '음력' :
    calendarType === 'LEAP_LUNAR' ? '음력 윤달' : '양력';

  const zodiac = getZodiac(parsed.year);
  const constel = !isLunar ? getConstellation(parsed.month, parsed.day) : null;

  const handleConfirm = ({ year, month, day, calendarType: newCal }) => {
    const y = String(year).padStart(4, '0');
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    if (onCalendarTypeChange && newCal !== calendarType) {
      onCalendarTypeChange(newCal);
    }
    setSheetOpen(false);
  };

  const showCalendarToggle = !!onCalendarTypeChange;

  return (
    <div className="bdp-container">
      <button
        type="button"
        className={`bdp-summary ${!value ? 'bdp-summary--empty' : ''}`}
        onClick={() => setSheetOpen(true)}
      >
        <div className="bdp-summary-main">
          {value ? (
            <span className="bdp-summary-date">
              <span className="bdp-summary-num">{parsed.year}</span>
              <span className="bdp-summary-dot">.</span>
              <span className="bdp-summary-num">{String(parsed.month).padStart(2, '0')}</span>
              <span className="bdp-summary-dot">.</span>
              <span className="bdp-summary-num">{String(parsed.day).padStart(2, '0')}</span>
            </span>
          ) : (
            <span className="bdp-summary-placeholder">생년월일을 선택해주세요</span>
          )}
          <span className="bdp-summary-arrow">▾</span>
        </div>
        {value && (
          <div className="bdp-summary-meta">
            <span className="bdp-summary-cal">{calLabel}</span>
            {zodiac && (
              <>
                <span className="bdp-summary-divider">·</span>
                <span>{zodiac.emoji} {zodiac.name}띠</span>
              </>
            )}
            {constel && (
              <>
                <span className="bdp-summary-divider">·</span>
                <span>{constel.emoji} {constel.name}</span>
              </>
            )}
          </div>
        )}
      </button>

      <BirthDateSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        year={parsed.year}
        month={parsed.month}
        day={parsed.day}
        calendarType={calendarType}
        onConfirm={handleConfirm}
        showCalendarToggle={showCalendarToggle}
      />
    </div>
  );
}

export default BirthDatePicker;
