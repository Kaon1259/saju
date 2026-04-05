/**
 * AI 스트리밍 응답에서 JSON을 안전하게 추출
 * - 마크다운 코드블록(```) 제거
 * - 잘린 JSON 복구 시도
 */
export default function parseAiJson(fullText) {
  if (!fullText) return null;
  let text = fullText.trim();

  // 1. 마크다운 코드블록 제거
  if (text.includes('```')) {
    const first = text.indexOf('```');
    const last = text.lastIndexOf('```');
    if (first !== last) {
      const afterFirst = text.indexOf('\n', first);
      if (afterFirst > 0 && afterFirst < last) {
        text = text.substring(afterFirst + 1, last).trim();
      }
    } else {
      // 닫는 ``` 없음 (잘린 경우)
      const afterFirst = text.indexOf('\n', first);
      if (afterFirst > 0) text = text.substring(afterFirst + 1).trim();
    }
  }

  // 2. JSON 객체 추출
  const bs = text.indexOf('{');
  const be = text.lastIndexOf('}');
  if (bs < 0) return null;

  let json = be > bs ? text.substring(bs, be + 1) : text.substring(bs);

  // 3. 파싱 시도
  try {
    return JSON.parse(json);
  } catch (e) {
    // 4. 잘린 JSON 복구 시도 - 열린 괄호 닫기
    try {
      let fixed = json;
      // 마지막 미완성 키-값 제거
      fixed = fixed.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
      fixed = fixed.replace(/,\s*\{[^}]*$/, '');
      fixed = fixed.replace(/,\s*\[[^\]]*$/, '');
      // 괄호 균형 맞추기
      const open = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
      const brace = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
      for (let i = 0; i < open; i++) fixed += ']';
      for (let i = 0; i < brace; i++) fixed += '}';
      return JSON.parse(fixed);
    } catch {
      console.warn('AI JSON 파싱 최종 실패:', e.message);
      return null;
    }
  }
}
