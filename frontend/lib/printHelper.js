import Cookies from 'js-cookie';

// 설정값 캐시
let printConfig = null;

const loadConfig = async () => {
  if (printConfig) return printConfig;
  try {
    const token = Cookies.get('token');
    const r = await fetch('http://localhost:4000/api/settings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    printConfig = data;
    return data;
  } catch { return {}; }
};

// 메인 프린트 함수
export const printPDF = async (url) => {
  const token = Cookies.get('token');
  if (!token) { alert('로그인이 필요합니다.'); window.location.href = '/login'; return; }

  const config = await loadConfig();
  const printerType = config.print_default_printer || 'pdf';

  try {
    const res = await fetch(`http://localhost:4000/api${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) { alert('로그인이 만료됐습니다.'); window.location.href = '/login'; return; }
    if (!res.ok) { alert('PDF 생성 실패. 다시 시도해 주세요.'); return; }

    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);

    if (printerType === 'browser_print') {
      // 브라우저 인쇄 창 열기
      const win = window.open(objUrl, '_blank');
      if (win) {
        win.onload = () => { win.print(); };
      }
    } else if (printerType === 'pos_direct') {
      // POS 직접 인쇄 — 새 탭에서 자동 인쇄
      const win = window.open(objUrl, '_blank');
      if (win) {
        win.onload = () => {
          win.print();
          setTimeout(() => win.close(), 2000);
        };
      }
    } else {
      // 기본: PDF 새 탭에서 열기
      window.open(objUrl, '_blank');
    }
  } catch (err) {
    console.error('PDF 오류:', err);
    alert('서버 연결 오류: 백엔드(4000번 포트)가 실행 중인지 확인하세요.');
  }
};

// 설정 캐시 초기화 (설정 변경 후 호출)
export const clearPrintCache = () => { printConfig = null; };
