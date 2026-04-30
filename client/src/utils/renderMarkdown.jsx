// 약관/개인정보 같은 정적 마크다운을 React 엘리먼트로 변환.
// 외부 라이브러리 없이 H1/H2/UL/P/STRONG 만 처리. XSS 방지를 위해 문자열은 모두 텍스트 노드로 삽입.

import React from 'react';

const escapeHtml = (s) => s; // React text node 자체가 escape 됨 — 헬퍼는 문서화 목적

// **bold** 처리. 다른 인라인은 무시.
const renderInline = (text) => {
  const parts = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0; let m; let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={`b${i++}`}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
};

export function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return [];
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let listBuf = null;
  let paraBuf = null;
  let key = 0;

  const flushList = () => {
    if (listBuf) {
      out.push(<ul key={`l${key++}`}>{listBuf.map((li, i) => <li key={i}>{renderInline(li)}</li>)}</ul>);
      listBuf = null;
    }
  };
  const flushPara = () => {
    if (paraBuf) {
      out.push(<p key={`p${key++}`}>{renderInline(paraBuf.trim())}</p>);
      paraBuf = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) {
      flushList(); flushPara();
      out.push(<h1 key={`h1${key++}`}>{renderInline(line.slice(2))}</h1>);
    } else if (line.startsWith('## ')) {
      flushList(); flushPara();
      out.push(<h2 key={`h2${key++}`}>{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith('- ')) {
      flushPara();
      if (!listBuf) listBuf = [];
      listBuf.push(line.slice(2));
    } else if (line === '') {
      flushList(); flushPara();
    } else {
      flushList();
      paraBuf = paraBuf ? paraBuf + ' ' + line : line;
    }
  }
  flushList(); flushPara();
  return out;
}
