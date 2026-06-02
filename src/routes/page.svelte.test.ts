import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	test('should render h1', () => {
		render(Page);
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
	});

	test('머지 게임(/play) 진입 링크가 있다', () => {
		render(Page);
		const link = screen.getByRole('link', { name: '머지 게임' });
		expect(link.getAttribute('href')).toMatch(/\/play$/);
	});
});
