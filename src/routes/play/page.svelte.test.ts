import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/play/+page.svelte', () => {
  test('시작 보드에 1글자 탄약(먀/뮤)들이 렌더된다', async () => {
    render(Page);
    // 시드는 onMount(클라이언트)에서 채워지므로 비동기로 대기
    const headings = await screen.findAllByRole('heading', { level: 1 });
    expect(headings.length).toBeGreaterThan(0);
    for (const h of headings) {
      expect(['먀', '뮤']).toContain(h.textContent?.trim());
    }
  });

  test('소리 토글 버튼이 있다', () => {
    render(Page);
    expect(screen.getByRole('button', { name: /소리/ })).toBeInTheDocument();
  });
});
