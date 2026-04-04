/**
 * 공유 유틸리티
 */
export async function shareResult({ title, text }) {
  const shareData = { title, text };

  // Web Share API 지원 시
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }

  // 폴백: 클립보드 복사
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return false;
  }
}
