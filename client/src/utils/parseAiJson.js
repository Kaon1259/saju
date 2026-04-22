/**
 * 스트리밍 중인 부분 JSON에서 "이미 닫힌" string 필드만 추출.
 * Progressive 카드 노출용 — 매 chunk마다 호출해서 완성된 필드부터 표시.
 *
 * 매칭 규칙: "key": "...완료된 문자열..." (escape 처리, 닫는 따옴표 + (콤마 또는 } 또는 다음 키 패턴) 확인)
 *
 * @param {string} partialText  현재까지 누적된 스트림 텍스트
 * @param {string[]} fields     추출 시도할 키 목록 (예: ['summary','overall','marriageTiming'])
 * @returns {Record<string,string>} 완성된 필드만 (key→value 맵)
 */
export function extractStreamingFields(partialText, fields) {
  if (!partialText || !Array.isArray(fields)) return {};
  // 마크다운 코드블록 제거 (스트리밍 도중에도 ``` 가 시작될 수 있음)
  let text = partialText;
  const cb = text.indexOf('```');
  if (cb >= 0) {
    const after = text.indexOf('\n', cb);
    if (after > 0) text = text.substring(after + 1);
  }
  const result = {};
  for (const key of fields) {
    // "key": "value" — value는 escape 처리된 string. 'g' 플래그 없이 첫 매치만.
    // 닫는 따옴표 뒤에 콤마/공백/} 가 와야 "완성된" 것으로 판단 (스트림 중간 끊김 방지)
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*(?:,|\\}|\\n|$)`, 's');
    const m = text.match(re);
    if (m && m[1] !== undefined) {
      try {
        // JSON escape 디코딩 (\n, \", \\, \uXXXX 등)
        result[key] = JSON.parse('"' + m[1] + '"');
      } catch {
        result[key] = m[1];
      }
    }
  }
  return result;
}

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
