import sanitizeHtml from 'sanitize-html';

// Deliberately excludes <script>, <foreignObject>, <style>, SMIL animation
// elements (<animate>, <set>, ...), and anything with an href/xlink:href —
// all have been used as SVG XSS vectors in the wild.
//
// sanitize-html (htmlparser2-based) preserves original tag-name casing, so
// SVG's camelCase element names (linearGradient, clipPath, ...) just work
// as long as the allowlist itself uses the correct case.
const SVG_ALLOWED_TAGS = [
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect',
  'text', 'tspan', 'textPath', 'defs', 'symbol', 'title', 'desc',
  'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern',
];

// Unlike tag names, htmlparser2 *does* lowercase attribute names before
// sanitize-html ever sees them — so the allowlist below must be lowercase to
// match, and camelCase SVG attributes (viewBox, gradientTransform, ...) come
// back lowercased in the output. ATTR_CASE_MAP restores them afterward; it
// only renames tokens already on this allowlist, so it can't reintroduce
// anything the sanitizer stripped.
const SVG_ALLOWED_ATTRS = [
  'id', 'class', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'width', 'height', 'viewbox', 'fill', 'fill-rule', 'fill-opacity', 'stroke',
  'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
  'stroke-opacity', 'transform', 'points', 'xmlns', 'xmlns:xlink', 'version',
  'opacity', 'offset', 'stop-color', 'stop-opacity', 'gradientunits',
  'gradienttransform', 'patternunits', 'patterntransform', 'preserveaspectratio',
  'textlength', 'lengthadjust', 'clip-path', 'clippathunits',
];

const ATTR_CASE_MAP: Record<string, string> = {
  viewbox: 'viewBox',
  gradientunits: 'gradientUnits',
  gradienttransform: 'gradientTransform',
  patternunits: 'patternUnits',
  patterntransform: 'patternTransform',
  preserveaspectratio: 'preserveAspectRatio',
  textlength: 'textLength',
  lengthadjust: 'lengthAdjust',
  clippathunits: 'clipPathUnits',
};

export function sanitizeSvg(rawSvg: string): string {
  const sanitized = sanitizeHtml(rawSvg, {
    allowedTags: SVG_ALLOWED_TAGS,
    allowedAttributes: { '*': SVG_ALLOWED_ATTRS },
    allowedSchemes: [],
    allowVulnerableTags: false,
    disallowedTagsMode: 'discard',
  });

  let restored = sanitized;
  for (const [lower, canonical] of Object.entries(ATTR_CASE_MAP)) {
    restored = restored.replace(new RegExp(`(\\s)${lower}(=")`, 'g'), `$1${canonical}$2`);
  }

  return restored;
}
