import { describe, expect, it } from 'vitest';
import { isLoggedOutFromDOM } from './auth-detector';

function doc(html: string): Document {
  const d = document.implementation.createHTMLDocument('');
  d.documentElement.innerHTML = html;
  return d;
}

describe('isLoggedOutFromDOM', () => {
  it('returns false for empty or logged-in docs', () => {
    expect(isLoggedOutFromDOM(doc('<head></head><body><div>hello</div></body>'))).toBe(false);
    expect(isLoggedOutFromDOM(doc('<head></head><body><div id="echo-app-root">courses</div></body>'))).toBe(false);
  });
  it('detects login markers', () => {
    expect(isLoggedOutFromDOM(doc('<head></head><body><input id="email"></body>'))).toBe(true);
    expect(isLoggedOutFromDOM(doc('<head></head><body><button id="submitBtn">Login</button></body>'))).toBe(true);
    expect(isLoggedOutFromDOM(doc('<head></head><body><input autocomplete="username"></body>'))).toBe(true);
    expect(
      isLoggedOutFromDOM(doc('<head></head><body><a href="https://login.echo360.net.au/login">Login</a></body>')),
    ).toBe(true);
    expect(
      isLoggedOutFromDOM(
        doc(
          '<head><meta http-equiv="refresh" content="0; url=https://login.echo360.net.au/login"></head><body></body>',
        ),
      ),
    ).toBe(true);
    expect(isLoggedOutFromDOM(doc('<head></head><body><div id="login-app"></div></body>'))).toBe(true);
    expect(isLoggedOutFromDOM(doc('<head></head><body class="login"></body>'))).toBe(true);
  });
});
