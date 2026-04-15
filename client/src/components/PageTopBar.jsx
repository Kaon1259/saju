import { useNavigate } from 'react-router-dom';
import './PageTopBar.css';

function PageTopBar({ onReset, color }) {
  const navigate = useNavigate();
  const style = color ? { '--ptb-color': color } : undefined;
  return (
    <div className="ptb-topbar" style={style}>
      <button className="ptb-topbtn ptb-topbtn--back" onClick={() => navigate(-1)} aria-label="뒤로">
        <span>‹</span> 뒤로
      </button>
      {onReset && (
        <button className="ptb-topbtn ptb-topbtn--reset" onClick={onReset} aria-label="다시하기">
          다시하기 <span>↻</span>
        </button>
      )}
    </div>
  );
}

export default PageTopBar;
