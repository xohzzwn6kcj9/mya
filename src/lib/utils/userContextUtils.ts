import { browser } from '$app/environment';
import { TARGET_DATE, COOKIE_EXPIRY_YEARS } from '$lib/constants';

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
  const targetDate = new Date(TARGET_DATE);

  return now < targetDate && isTargetDevice();
}

export function setCookie() {
  if (browser) {
    const maxAge = COOKIE_EXPIRY_YEARS * 365 * 24 * 60 * 60;
    document.cookie = `love=hy; path=/; max-age=${maxAge}`;
  }
}

export function hasLoveCookie(): boolean {
  if (!browser) return false;
  
  return document.cookie.split(';').some(cookie => 
    cookie.trim().startsWith('love=hy')
  );
} 