import { startKakaoLogin } from '../utils/kakaoAuth';

// 노란색 카카오 로그인 CTA — 클릭 시 즉시 카카오 OAuth + returnTo 로 복귀
// children 으로 텍스트를 받음 (예: "카카오 로그인하고 맞춤 운세 받기")
function KakaoLoginCTA({ returnTo, children, className = '', style }) {
  return (
    <button
      type="button"
      className={`kakao-cta-btn ${className}`.trim()}
      style={style}
      onClick={() => startKakaoLogin(returnTo)}
    >
      <svg className="kakao-cta-btn-logo" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="#000" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.32.65.64.44l4.94-3.26c.38.04.76.06 1.16.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/>
      </svg>
      {children}
    </button>
  );
}

export default KakaoLoginCTA;
