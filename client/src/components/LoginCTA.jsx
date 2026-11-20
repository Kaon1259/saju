import { useNavigate } from 'react-router-dom';

// 로그인/가입 유도 버튼 — 클릭 시 전화번호 가입·로그인 화면(/register)으로 이동하고,
// 완료 후 returnTo 로 복귀한다. (카카오 로그인 제거 후 KakaoLoginCTA 대체)
function LoginCTA({ returnTo = '/', children, className = '', style }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={`kakao-cta-btn login-cta-btn ${className}`.trim()}
      style={style}
      onClick={() => navigate('/register', { state: { from: returnTo } })}
    >
      {children}
    </button>
  );
}

export default LoginCTA;
