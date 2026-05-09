import './GenderPicker.css';

/**
 * 단순 캡슐형 성별 선택 (segmented control)
 * value: 'M' | 'F'
 * onChange: (value) => void
 * disabled: boolean
 */
function GenderPicker({ value, onChange, disabled = false }) {
  return (
    <div className={`gp-segmented ${disabled ? 'gp-disabled' : ''}`} role="radiogroup">
      <button
        type="button"
        className={`gp-seg gp-seg-male ${value === 'M' ? 'gp-seg--active' : ''}`}
        onClick={() => !disabled && onChange('M')}
        disabled={disabled}
        role="radio"
        aria-checked={value === 'M'}
        aria-label="남자"
      >
        <span className="gp-seg-symbol">♂</span>
      </button>
      <button
        type="button"
        className={`gp-seg gp-seg-female ${value === 'F' ? 'gp-seg--active' : ''}`}
        onClick={() => !disabled && onChange('F')}
        disabled={disabled}
        role="radio"
        aria-checked={value === 'F'}
        aria-label="여자"
      >
        <span className="gp-seg-symbol">♀</span>
      </button>
    </div>
  );
}

export default GenderPicker;
