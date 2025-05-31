import { browser } from '$app/environment';

export function isTargetDevice(): boolean {
  if (!browser) return false;
  
  const userAgent = navigator.userAgent;
  return (
    userAgent.includes('SM-S908') || // Galaxy S22 Ultra
    userAgent.includes('iPhone15,3') // iPhone 14 Pro Max
  );
}

export function shouldSetCookie(): boolean {
  if (!browser) return false;
  
  const now = new Date();
  const targetDate = new Date('2025-05-19T19:00:00+09:00');
  
  return now < targetDate && isTargetDevice();
}

export function setCookie() {
  if (browser) {
    const oneYear = 365 * 24 * 60 * 60;
    document.cookie = `love=hy; path=/; max-age=${oneYear}`;
  }
}

export function hasLoveCookie(): boolean {
  if (!browser) return false;
  
  return document.cookie.split(';').some(cookie => 
    cookie.trim().startsWith('love=hy')
  );
} 