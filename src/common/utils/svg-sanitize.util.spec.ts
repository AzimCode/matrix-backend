import { sanitizeSvg } from './svg-sanitize.util';

describe('sanitizeSvg', () => {
  it('strips <script> tags entirely', () => {
    const result = sanitizeSvg('<svg><script>alert(document.cookie)</script><circle r="5"/></svg>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  it('strips inline event handler attributes', () => {
    const result = sanitizeSvg('<svg><circle r="5" onload="alert(1)"/></svg>');
    expect(result).not.toContain('onload');
  });

  it('strips foreignObject (a common SVG XSS vector)', () => {
    const result = sanitizeSvg('<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml">hi</body></foreignObject></svg>');
    expect(result.toLowerCase()).not.toContain('foreignobject');
  });

  it('strips href/xlink:href (blocks javascript: URIs on <use>)', () => {
    const result = sanitizeSvg('<svg><use href="javascript:alert(1)"/></svg>');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('href=');
  });

  it('preserves the camelCase viewBox attribute instead of lowercasing it', () => {
    const result = sanitizeSvg('<svg viewBox="0 0 100 100"><circle r="5"/></svg>');
    expect(result).toContain('viewBox="0 0 100 100"');
    expect(result).not.toContain('viewbox=');
  });

  it('preserves camelCase gradient element and attribute names', () => {
    const result = sanitizeSvg(
      '<svg><defs><linearGradient id="g" gradientTransform="rotate(45)"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect fill="url(#g)"/></svg>',
    );
    expect(result).toContain('<linearGradient');
    expect(result).toContain('</linearGradient>');
    expect(result).toContain('gradientTransform="rotate(45)"');
  });

  it('keeps ordinary safe attributes and shape content intact', () => {
    const result = sanitizeSvg('<svg width="24" height="24"><path d="M0 0 L10 10" fill="#00ff41"/></svg>');
    expect(result).toContain('width="24"');
    expect(result).toContain('d="M0 0 L10 10"');
    expect(result).toContain('fill="#00ff41"');
  });
});
