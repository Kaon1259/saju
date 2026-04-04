import { useState, useEffect, useRef } from 'react';
import { getPsychTests, analyzePsychTest } from '../api/fortune';
import SpeechButton from '../components/SpeechButton';

import './PsychTest.css';

// ═══════════════════════════════════════════════════
// 테스트 목록 (서버 미응답시 폴백)
// ═══════════════════════════════════════════════════
const FALLBACK_TESTS = [
  {
    id: 'love',
    icon: '\uD83D\uDC95',
    title: '연애 유형 테스트',
    description: '나의 연애 스타일과 이상형을 알아보세요',
    questionCount: 8,
    color: '#E91E63',
    questions: [
      { text: '첫 데이트 장소로 어디가 좋을까요?', options: ['A. 분위기 좋은 레스토랑', 'B. 자연 속 산책', 'C. 놀이공원이나 테마파크', 'D. 조용한 카페'] },
      { text: '연인에게 가장 중요한 것은?', options: ['A. 유머감각', 'B. 진실된 마음', 'C. 함께하는 시간', 'D. 서로의 공간 존중'] },
      { text: '갈등이 생겼을 때 나는?', options: ['A. 바로 대화로 해결', 'B. 시간을 갖고 정리', 'C. 상대방 의견을 먼저 듣기', 'D. 편지나 메시지로 전달'] },
      { text: '이상적인 주말 데이트는?', options: ['A. 새로운 맛집 탐방', 'B. 집에서 영화 마라톤', 'C. 여행이나 드라이브', 'D. 각자 시간 후 저녁에 만남'] },
      { text: '연인의 깜짝 선물 반응은?', options: ['A. 감동해서 눈물 글썽', 'B. 기뻐하며 바로 사용', 'C. 나도 선물을 준비해야지!', 'D. 고맙지만 부담스럽기도'] },
      { text: '사랑을 표현하는 방식은?', options: ['A. 말로 자주 표현', 'B. 행동으로 보여주기', 'C. 선물이나 이벤트', 'D. 함께 시간 보내기'] },
      { text: '연인과 의견이 다를 때?', options: ['A. 내 의견을 논리적으로 설명', 'B. 상대방에게 맞추기', 'C. 절충안 찾기', 'D. 각자의 의견 존중'] },
      { text: '이별 후 나의 모습은?', options: ['A. 슬프지만 빠르게 회복', 'B. 오랫동안 그리워하기', 'C. 자기계발에 몰두', 'D. 친구들과 시간 보내기'] },
    ],
  },
  {
    id: 'hidden',
    icon: '\uD83C\uDFAD',
    title: '숨겨진 나 발견',
    description: '평소 모르던 나의 숨겨진 성격을 찾아보세요',
    questionCount: 8,
    color: '#9B59B6',
    questions: [
      { text: '혼자만의 시간에 주로 하는 일은?', options: ['A. 음악 듣기 또는 명상', 'B. 책이나 영상 감상', 'C. 운동이나 산책', 'D. SNS나 온라인 활동'] },
      { text: '스트레스를 받으면?', options: ['A. 잠을 많이 자기', 'B. 맛있는 것 먹기', 'C. 친구에게 전화', 'D. 혼자 조용히 정리'] },
      { text: '친구들 사이에서 나의 역할은?', options: ['A. 분위기 메이커', 'B. 조용한 조언자', 'C. 계획을 세우는 사람', 'D. 모두를 연결하는 사람'] },
      { text: '꿈에서 자주 보는 장면은?', options: ['A. 하늘을 나는 꿈', 'B. 모험하는 꿈', 'C. 일상적인 꿈', 'D. 잘 기억이 안 남'] },
      { text: '새로운 환경에 놓이면?', options: ['A. 적극적으로 적응', 'B. 관찰부터 시작', 'C. 불안하지만 도전', 'D. 익숙해질 때까지 기다림'] },
      { text: '가장 두려운 것은?', options: ['A. 실패하는 것', 'B. 외로워지는 것', 'C. 자유를 잃는 것', 'D. 인정받지 못하는 것'] },
      { text: '10년 후 나의 모습은?', options: ['A. 성공한 전문가', 'B. 행복한 가정', 'C. 자유로운 여행자', 'D. 사회에 기여하는 사람'] },
      { text: '가장 끌리는 색상은?', options: ['A. 빨강 또는 주황', 'B. 파랑 또는 보라', 'C. 초록 또는 하늘', 'D. 노랑 또는 분홍'] },
    ],
  },
  {
    id: 'luck',
    icon: '\uD83C\uDF40',
    title: '행운 체질 분석',
    description: '당신의 행운 지수와 운이 트이는 방법을 알아보세요',
    questionCount: 8,
    color: '#2ECC71',
    questions: [
      { text: '복권에 당첨된다면 가장 먼저?', options: ['A. 가족에게 나누기', 'B. 투자하기', 'C. 세계여행', 'D. 저축하기'] },
      { text: '길을 가다 돈을 주웠다면?', options: ['A. 경찰에 신고', 'B. 주변을 둘러보기', 'C. 행운이라며 기뻐하기', 'D. 기부하기'] },
      { text: '중요한 시험이나 면접 전날?', options: ['A. 철저히 준비', 'B. 평소처럼 행동', 'C. 행운의 아이템 챙기기', 'D. 일찍 자기'] },
      { text: '좋은 일이 연속으로 생기면?', options: ['A. 감사하며 즐기기', 'B. 곧 안 좋은 일이 올까 걱정', 'C. 주변에 행운 나누기', 'D. 당연하다고 생각'] },
      { text: '직감이 맞았던 경험은?', options: ['A. 매우 자주', 'B. 가끔', 'C. 거의 없음', 'D. 직감을 잘 안 따름'] },
      { text: '아침에 눈을 떴을 때 기분은?', options: ['A. 대체로 좋다', 'B. 날에 따라 다르다', 'C. 보통이다', 'D. 좀 힘들다'] },
      { text: '새로운 도전을 할 때?', options: ['A. 잘 될 거라 확신', 'B. 반반이라 생각', 'C. 걱정이 앞서지만 시도', 'D. 충분히 준비 후 시작'] },
      { text: '나의 좌우명에 가장 가까운 것은?', options: ['A. 하면 된다', 'B. 기회는 준비된 자에게', 'C. 즐기면서 살자', 'D. 꾸준히 노력하자'] },
    ],
  },
];

function PsychTest() {
  // ─── 상태 ───
  const [step, setStep] = useState('select'); // select | quiz | loading | result
  const [tests, setTests] = useState(FALLBACK_TESTS);
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [slideDir, setSlideDir] = useState('in');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);


  // 서버에서 테스트 목록 가져오기
  useEffect(() => {
    getPsychTests()
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          setTests(data);
        }
      })
      .catch(() => { /* 폴백 사용 */ });
  }, []);

  const startTest = (test) => {
    setSelectedTest(test);
    setCurrentQ(0);
    setAnswers([]);
    setStep('quiz');
  };

  const handleAnswer = (answerIdx) => {
    const letter = ['A', 'B', 'C', 'D'][answerIdx] || 'A';
    const newAnswers = [...answers, letter];
    setAnswers(newAnswers);

    const questions = selectedTest.questions || [];
    if (currentQ < questions.length - 1) {
      setSlideDir('out');
      setTimeout(() => {
        setCurrentQ(prev => prev + 1);
        setSlideDir('in');
      }, 300);
    } else {
      // 마지막 문제
      handleSubmit(newAnswers);
    }
  };

  const handleSubmit = async (finalAnswers) => {
    setStep('loading');
    setLoading(true);

    try {
      const answersStr = finalAnswers.join(',');
      const data = await analyzePsychTest(selectedTest.id, answersStr);
      setResult(data);
      setStep('result');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e) {
      console.error('심리테스트 분석 실패:', e);
      // 폴백 결과
      setResult({
        type: selectedTest.id === 'love' ? '로맨틱 이상주의자' : selectedTest.id === 'hidden' ? '조용한 모험가' : '긍정 행운아',
        emoji: selectedTest.id === 'love' ? '\uD83D\uDC96' : selectedTest.id === 'hidden' ? '\uD83C\uDF1F' : '\uD83C\uDF40',
        description: '당신은 깊은 내면의 감성과 따뜻한 마음을 가진 사람입니다. 주변 사람들에게 편안한 에너지를 주며, 진심 어린 관계를 소중히 여깁니다.',
        strengths: ['뛰어난 공감 능력', '따뜻한 배려심', '창의적인 사고', '강한 직관력'],
        weaknesses: ['때때로 우유부단', '감정에 민감', '완벽주의 성향'],
        advice: '자신의 감정을 솔직하게 표현하는 연습을 해보세요. 당신의 진심은 주변 사람들에게 큰 힘이 됩니다.',
        compatibility: '감성적이고 진지한 사람과 잘 맞습니다. 서로의 감정을 존중하는 관계가 이상적입니다.',
        score: 85,
      });
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  const goToOtherTest = () => {
    setStep('select');
    setSelectedTest(null);
    setCurrentQ(0);
    setAnswers([]);
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    if (!result) return;
    const text = `${selectedTest?.icon || ''} 심리테스트 결과\n\n` +
      `테스트: ${selectedTest?.title}\n` +
      `유형: ${result.emoji || ''} ${result.type}\n\n` +
      `${result.description}\n\n` +
      `연애 앱에서 나도 테스트해보세요!`;
    if (navigator.share) {
      navigator.share({ title: '심리테스트 결과', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert('결과가 복사되었습니다!');
    }
  };

  const questions = selectedTest?.questions || [];
  const totalQ = questions.length || selectedTest?.questionCount || 8;

  // ═══ 렌더링 ═══
  return (
    <div className="pt-page">
      {/* 배경 */}
      <div className="pt-bg">
        {Array.from({ length: 25 }).map((_, i) => (
          <span key={i} className="pt-bubble" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${4 + Math.random() * 4}s`,
            '--bubble-size': `${4 + Math.random() * 12}px`,
            '--bubble-color': ['#E91E63', '#9B59B6', '#2ECC71', '#3498DB', '#F4D03F'][Math.floor(Math.random() * 5)],
          }} />
        ))}
      </div>

      {/* ═══ 히어로 ═══ */}
      {step === 'select' && (
        <div className="pt-hero fade-in">
          <div className="pt-hero-glow" />
          <div className="pt-hero-icon">{'\uD83E\uDDE0'}</div>
          <h1 className="pt-title">심리테스트</h1>
          <p className="pt-subtitle">재미있는 테스트로 나를 더 알아보세요</p>
          <div className="pt-hero-divider" />
        </div>
      )}

      {/* ═══ STEP 1: 테스트 선택 ═══ */}
      {step === 'select' && (
        <div className="pt-select fade-in">
          <div className="pt-test-grid">
            {tests.map(test => (
              <button
                key={test.id}
                className="pt-test-card glass-card"
                style={{ '--test-color': test.color }}
                onClick={() => startTest(test)}
              >
                <div className="pt-test-card-glow" />
                <span className="pt-test-icon">{test.icon}</span>
                <h3 className="pt-test-title">{test.title}</h3>
                <p className="pt-test-desc">{test.description}</p>
                <div className="pt-test-meta">
                  <span className="pt-test-count">{test.questionCount || test.questions?.length || 8}문항</span>
                  <span className="pt-test-arrow">{'\u2192'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP 2: 문제 풀기 ═══ */}
      {step === 'quiz' && selectedTest && (
        <div className="pt-quiz fade-in">
          {/* 상단 진행 바 */}
          <div className="pt-quiz-header">
            <button className="pt-back-btn" onClick={goToOtherTest}>{'\u2190'} 돌아가기</button>
            <span className="pt-quiz-count">{currentQ + 1} / {totalQ}</span>
          </div>
          <div className="pt-progress-bar">
            <div
              className="pt-progress-fill"
              style={{ width: `${((currentQ + 1) / totalQ) * 100}%`, background: selectedTest.color }}
            />
          </div>

          {/* 문제 */}
          {questions[currentQ] && (
            <div className={`pt-question-area ${slideDir === 'in' ? 'pt-slide-in' : 'pt-slide-out'}`}>
              <div className="pt-question-number" style={{ color: selectedTest.color }}>
                Q{currentQ + 1}
              </div>
              <h2 className="pt-question-text">{questions[currentQ].text}</h2>
              <div className="pt-answers">
                {questions[currentQ].options.map((opt, idx) => (
                  <button
                    key={idx}
                    className="pt-answer-btn glass-card"
                    style={{ '--answer-color': selectedTest.color }}
                    onClick={() => handleAnswer(idx)}
                  >
                    <span className="pt-answer-letter" style={{ background: selectedTest.color }}>
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <span className="pt-answer-text">{opt.replace(/^[A-D]\.\s*/, '')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ STEP 3: 로딩 ═══ */}
      {step === 'loading' && (
        <div className="pt-loading fade-in">
          <div className="pt-loading-container">
            <div className="pt-loading-brain">{'\uD83E\uDDE0'}</div>
            <div className="pt-loading-rings">
              <div className="pt-loading-ring pt-loading-ring--1" style={{ borderColor: selectedTest?.color || '#9B59B6' }} />
              <div className="pt-loading-ring pt-loading-ring--2" style={{ borderColor: selectedTest?.color || '#9B59B6' }} />
            </div>
          </div>
          <p className="pt-loading-text">AI가 분석하고 있어요<span className="pt-dots" /></p>
          <p className="pt-loading-sub">당신의 답변을 AI가 깊이 분석하고 있어요</p>
        </div>
      )}

      {/* ═══ STEP 4: 결과 ═══ */}
      {step === 'result' && result && (
        <div className="pt-result fade-in" ref={resultRef}>
          {/* 유형 배지 */}
          <div className="pt-result-type glass-card" style={{ '--result-color': selectedTest?.color || '#9B59B6' }}>
            <div className="pt-result-aura" />
            <span className="pt-result-emoji">{result.emoji}</span>
            <div className="pt-result-badge" style={{ background: `${selectedTest?.color || '#9B59B6'}22`, color: selectedTest?.color || '#9B59B6' }}>
              {selectedTest?.title}
            </div>
            <h2 className="pt-result-name">{result.type}</h2>
            <p className="pt-result-desc">{result.description}</p>
          </div>

          {/* 강점 */}
          {result.strengths && result.strengths.length > 0 && (
            <div className="pt-traits-card glass-card">
              <h3 className="pt-traits-title pt-traits--strength">{'\uD83C\uDF1F'} 강점</h3>
              <div className="pt-traits-list">
                {result.strengths.map((s, i) => (
                  <span key={i} className="pt-trait-badge pt-trait--green">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* 약점 */}
          {result.weaknesses && result.weaknesses.length > 0 && (
            <div className="pt-traits-card glass-card">
              <h3 className="pt-traits-title pt-traits--weakness">{'\u26A0\uFE0F'} 주의할 점</h3>
              <div className="pt-traits-list">
                {result.weaknesses.map((w, i) => (
                  <span key={i} className="pt-trait-badge pt-trait--yellow">{w}</span>
                ))}
              </div>
            </div>
          )}

          {/* 조언 */}
          {result.advice && (
            <div className="pt-advice-card glass-card">
              <h3 className="pt-advice-title">{'\uD83D\uDCA1'} 조언</h3>
              <p className="pt-advice-text">{result.advice}</p>
            </div>
          )}

          {/* 궁합 */}
          {result.compatibility && (
            <div className="pt-compat-card glass-card">
              <h3 className="pt-compat-title">{'\uD83D\uDC9E'} 궁합 정보</h3>
              <p className="pt-compat-text">{result.compatibility}</p>
            </div>
          )}

          {/* 점수 */}
          {result.score !== undefined && (
            <div className="pt-score-card glass-card" style={{ '--result-color': selectedTest?.color || '#9B59B6' }}>
              <div className="pt-score-circle">
                <svg viewBox="0 0 100 100" width="90" height="90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={selectedTest?.color || '#9B59B6'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(result.score / 100) * 264} 264`}
                    transform="rotate(-90 50 50)"
                    className="pt-score-ring"
                  />
                </svg>
                <span className="pt-score-num">{result.score}</span>
              </div>
              <span className="pt-score-label">점수</span>
            </div>
          )}

          {/* 읽어주기 */}
          <div className="pt-speech-area">
            <SpeechButton
              label="결과 읽어주기"
              text={[
                `심리테스트 결과입니다.`,
                `당신의 유형은 ${result.type}입니다.`,
                result.description,
                result.advice ? `조언. ${result.advice}` : '',
                result.compatibility ? `궁합. ${result.compatibility}` : '',
              ].filter(Boolean).join(' ')}
              summaryText={[
                `유형: ${result.type}.`,
                result.description,
              ].filter(Boolean).join(' ')}
            />
          </div>

          {/* 액션 */}
          <div className="pt-actions">
            <button className="pt-action-btn pt-share-btn" style={{ background: `linear-gradient(135deg, ${selectedTest?.color || '#9B59B6'}, ${selectedTest?.color || '#9B59B6'}cc)` }} onClick={handleShare}>
              <span>{'\uD83D\uDCE4'}</span> 공유하기
            </button>
            <button className="pt-action-btn pt-other-btn" onClick={goToOtherTest}>
              <span>{'\uD83C\uDFAF'}</span> 다른 테스트
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PsychTest;
