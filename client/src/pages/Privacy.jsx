import { useNavigate } from 'react-router-dom';
import './Legal.css';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="legal-page">
      <header className="legal-header">
        <button className="legal-back" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
        <h1 className="legal-title">개인정보 처리방침</h1>
      </header>

      <div className="legal-card glass-card">
        <p className="legal-meta">시행일: 2026년 4월 28일</p>

        <p className="legal-lead">
          1:1연애(이하 "서비스")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수하기 위해 노력하고 있습니다.
          본 방침은 서비스가 어떠한 개인정보를 수집·이용·보관·파기하는지, 이용자의 권리는 무엇인지를 안내합니다.
        </p>

        <h2>1. 수집하는 개인정보 항목 및 방법</h2>
        <ul>
          <li><strong>카카오 로그인 시</strong>: 카카오 회원번호(고유 식별자), 닉네임</li>
          <li><strong>프로필 입력 시</strong>: 이름(닉네임 가능), 생년월일, 출생 시간(선택), 양력/음력 구분, 성별, 혈액형(선택), MBTI(선택), 연인/파트너 정보(선택)</li>
          <li><strong>서비스 이용 과정에서 자동 생성</strong>: 운세·궁합·타로 등 분석 요청 기록, 하트 사용 내역, 디바이스 정보(OS·브라우저), 접속 IP</li>
        </ul>

        <h2>2. 개인정보의 수집·이용 목적</h2>
        <ul>
          <li>회원 식별 및 로그인 인증</li>
          <li>사주·궁합·타로 등 운세 분석 결과 제공</li>
          <li>분석 이력 저장 및 재조회</li>
          <li>하트 포인트 차감·충전·결제 처리</li>
          <li>서비스 개선을 위한 통계 분석</li>
          <li>부정 이용 방지 및 시스템 안정성 확보</li>
        </ul>

        <h2>3. 개인정보의 보유 및 이용 기간</h2>
        <p>
          이용자의 개인정보는 회원 탈퇴 시 즉시 파기됩니다. 다만, 관련 법령에 따라 일정 기간 보관이 필요한 경우 아래 기준에 따라 보관합니다.
        </p>
        <ul>
          <li>전자상거래법: 계약·청약철회 등 5년 / 대금결제·재화 공급 5년 / 소비자 불만·분쟁 처리 3년</li>
          <li>통신비밀보호법: 접속 로그 3개월</li>
        </ul>

        <h2>4. 개인정보 제3자 제공</h2>
        <p>
          서비스는 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 아래의 경우 예외적으로 제공합니다.
        </p>
        <ul>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령에 의해 요구되거나 수사기관의 적법한 요청이 있는 경우</li>
        </ul>

        <h2>5. 개인정보 처리 위탁</h2>
        <p>서비스는 원활한 운영을 위해 아래와 같이 개인정보 처리 업무를 외부에 위탁하고 있습니다.</p>
        <ul>
          <li><strong>Anthropic, PBC</strong>(Claude AI): 입력된 사주·운세 컨텍스트를 AI 분석에 활용. 개인 식별 정보(이름·이메일 등)는 전송하지 않으며, 생년월일·성별 등 운세 분석에 필요한 항목만 전송됩니다.</li>
          <li><strong>Kakao Corp.</strong>: 카카오 간편 로그인 인증</li>
          <li><strong>Railway / 클라우드 인프라</strong>: 서버 호스팅 및 데이터 저장</li>
        </ul>

        <h2>6. 이용자의 권리 및 행사 방법</h2>
        <p>
          이용자는 언제든지 본인의 개인정보를 조회·수정·삭제·처리정지를 요청할 수 있습니다.
          앱 내 마이메뉴 &rsaquo; 프로필 편집에서 직접 수정하거나, 회원 탈퇴를 통해 모든 정보를 즉시 삭제할 수 있습니다.
        </p>

        <h2>7. 개인정보 보호 책임자</h2>
        <ul>
          <li>책임자: 1:1연애 운영팀</li>
          <li>이메일: kaon1259@naver.com</li>
        </ul>

        <h2>8. 정책 변경</h2>
        <p>본 방침이 변경되는 경우 시행일 7일 전 앱 내 공지를 통해 안내합니다.</p>
      </div>
    </div>
  );
}
