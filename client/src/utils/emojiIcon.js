// 이모지 → MenuIcon 키 매핑.
// StreamingCard/StreamText 등 공용 컴포넌트가 icon prop으로 이모지 문자열을 받으면
// 자동으로 외곽선 SVG(MenuIcon)로 변환한다. 매핑이 없으면 null → 원본(이모지/노드) 폴백.

const MAP = {
  // 별/반짝임
  '🌟': 'star', '⭐': 'star', '🌠': 'star', '✩': 'star', '🏆': 'star', '🥇': 'star', '👑': 'star',
  '✨': 'sparkle', '💫': 'sparkleHeart', '🌈': 'sparkle', '🎊': 'sparkle', '🎉': 'sparkle', '🌀': 'spark',
  // 하트/사랑
  '💕': 'love', '💖': 'love', '💗': 'love', '💞': 'love', '❤': 'love', '🩷': 'love', '💝': 'love',
  '♥': 'love', '💓': 'love', '💟': 'love', '💛': 'love', '🧡': 'love', '💜': 'love',
  '💘': 'heartArrow', '💑': 'couple', '👩‍❤️‍👨': 'couple', '💏': 'kiss', '💋': 'kiss', '💔': 'heartBroken', '💌': 'letter',
  // 돈/일/건강/학업
  '💰': 'money', '💵': 'money', '🤑': 'money', '💸': 'money', '🪙': 'money',
  '💪': 'health', '🩺': 'health', '🏥': 'health',
  '💼': 'work', '🏢': 'work',
  '📚': 'academic', '🎓': 'academic', '📖': 'book', '📕': 'book', '📗': 'book', '📘': 'book',
  // 운세/점
  '🔮': 'crystalBall', '☯': 'traditional', '🃏': 'tarot', '🎴': 'tarot',
  '📜': 'tojeong', '📃': 'tojeong', '📄': 'tojeong', '🎋': 'tojeong',
  // 안내/경고/팁
  '🤝': 'handshake', '💡': 'lightbulb', '⚠': 'alert', '🚨': 'alert', '❗': 'alert', '‼': 'alert',
  '⛔': 'ban', '🛑': 'ban', '🚫': 'ban', '⚡': 'spark', '🎯': 'target',
  '✅': 'check', '✔': 'check', '☑': 'check',
  // 시간/날짜
  '📅': 'calendar', '📆': 'calendar', '🗓': 'calendar',
  '⏰': 'clock', '⏳': 'clock', '⌛': 'clock', '🕐': 'clock', '🕑': 'clock', '🕒': 'clock', '🕓': 'clock', '🕰': 'clock',
  // 액션
  '📤': 'share', '📨': 'share', '🔗': 'share', '📣': 'share', '📢': 'share',
  '🔄': 'refresh', '🔁': 'refresh', '↻': 'refresh',
  '🔒': 'lock', '🔐': 'lock', '🔓': 'lock',
  '🔍': 'search', '🔎': 'search', '📊': 'chart', '📈': 'chart', '📉': 'chart',
  '⚙': 'settings', '🔔': 'bell', '📷': 'camera', '📸': 'camera',
  // 행운/아이템
  '🍀': 'clover', '☘': 'clover', '🎨': 'palette', '🔢': 'hash', '🧭': 'compass', '🗺': 'compass',
  '🍽': 'food', '🥗': 'food', '🍱': 'food', '👕': 'shirt', '👗': 'shirt', '🧥': 'shirt',
  '🎁': 'gift', '🎀': 'gift', '💎': 'gem', '💍': 'ring', '💒': 'wedding',
  // 사람/연락
  '👥': 'people', '👨‍👩‍👧': 'people', '👨‍👩‍👧‍👦': 'people', '🧑‍🤝‍🧑': 'people',
  '👤': 'user', '🙋': 'user', '🙋‍♀️': 'user', '🙋‍♂️': 'user', '🧑': 'user', '📝': 'book', '✏': 'user',
  '📱': 'phone', '☎': 'phone', '📞': 'phone',
  // 동물/유전/뇌/얼굴
  '🐾': 'paw', '🐯': 'paw', '🐶': 'paw', '🐱': 'paw', '🐕': 'paw', '🐈': 'paw',
  '🧬': 'dna', '🧠': 'mbti', '👁': 'face', '😊': 'face', '🙂': 'face', '😀': 'face',
  '🌊': 'biorhythm', '🏛': 'traditional',
  // 자연/계절/시간대
  '🌙': 'moon', '🌛': 'moon', '🌜': 'moon', '🌚': 'moon', '🌝': 'moon', '🌆': 'moon', '🌇': 'moon', '🌃': 'moon',
  '☀': 'sun', '🌤': 'sun', '⛅': 'sun', '🌅': 'sun', '🌄': 'sun', '🌞': 'sun',
  '🌸': 'sparkle', '🌺': 'sparkle', '🌷': 'sparkle', '🌼': 'sparkle', '🌻': 'sparkle',
  '🍂': 'sparkle', '🍁': 'sparkle', '❄': 'sparkle', '⛄': 'sparkle',
  '💭': 'chat', '🗨': 'chat', '💬': 'chat', '🏠': 'home', '🏡': 'home',
};

/**
 * 이모지 문자열 → MenuIcon 키. 매핑 없으면 null(원본 폴백).
 * 1) 원본 그대로 조회 (ZWJ 커플/가족 시퀀스 포함) →
 * 2) 변이선택자(U+FE00–FE0F)·스킨톤(U+1F3FB–1F3FF) 제거 후 조회 (ZWJ 유지) →
 * 3) 첫 코드포인트만 조회 (이모지 뒤 텍스트가 붙은 경우)
 */
export function emojiToIconKey(str) {
  if (typeof str !== 'string' || !str) return null;
  const raw = str.trim();
  if (!raw) return null;
  if (MAP[raw]) return MAP[raw];
  let stripped = '';
  for (const ch of raw) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xFE00 && cp <= 0xFE0F) continue;   // 변이 선택자
    if (cp >= 0x1F3FB && cp <= 0x1F3FF) continue; // 스킨톤
    stripped += ch;
  }
  if (MAP[stripped]) return MAP[stripped];
  const first = Array.from(stripped)[0];
  return (first && MAP[first]) || null;
}

export default emojiToIconKey;
