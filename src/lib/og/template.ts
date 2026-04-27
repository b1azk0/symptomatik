import type { OGCardData } from './page-types';

const WIDTH = 1200;
const HEIGHT = 630;
const LINEN = '#F5F0EC';
const ILLO_BG = '#EFE6DD';

/**
 * Returns a satori-compatible element tree for one OG card.
 * Composition: Layout B v3 (asymmetric bleed, soft-fade illustration, accent band, arc motif).
 *
 * Title font-size auto-shrinks: 96px ≤30 chars, 76px ≤50 chars, 60px otherwise.
 * Lines clamp to 3 with ellipsis (handled by satori's lineClamp via maxLines).
 */
export function buildCardElement(data: OGCardData, illustrationDataUri: string) {
  const titleSize = data.title.length <= 30 ? 96
                   : data.title.length <= 50 ? 76
                   : 60;
  const accent = data.accent;

  // Hex+alpha helpers (satori needs explicit colors, not color-mix).
  const accentBg = `${accent}17`;       // 9% alpha
  const accentBorder = `${accent}4D`;   // 30% alpha

  return {
    type: 'div',
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        position: 'relative',
        background: LINEN,
        fontFamily: 'Geist',
      },
      children: [
        // Accent band — top gradient
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 38,
              background: `linear-gradient(90deg, ${accent}, ${accent}00)`,
            },
          },
        },
        // Illustration (right side, with soft-fade mask)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '42%',
              right: -36,
              backgroundColor: ILLO_BG,
              backgroundImage: `url(${illustrationDataUri})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              maskImage: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 100%)',
            } as any,
          },
        },
        // Text panel (left)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 108, // 9cqw of 1200
              bottom: 48,
              left: 48,
              width: 540,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            },
            children: [
              // Pill (top)
              {
                type: 'div',
                props: {
                  style: { display: 'flex' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: 14,
                          letterSpacing: 2,
                          textTransform: 'uppercase' as const,
                          fontWeight: 500,
                          padding: '6px 14px',
                          borderRadius: 999,
                          background: accentBg,
                          border: `1px solid ${accentBorder}`,
                          color: accent,
                        },
                        children: data.pillLabel,
                      },
                    },
                  ],
                },
              },
              // Title (middle)
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'Fraunces',
                    fontSize: titleSize,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: '#1a1a1a',
                    letterSpacing: -0.5,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical' as any,
                    WebkitLineClamp: 3,
                    overflow: 'hidden',
                  } as any,
                  children: data.title,
                },
              },
              // Brand row (bottom)
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  },
                  children: [
                    // Arc motif (inline SVG via dataUri)
                    {
                      type: 'img',
                      props: {
                        src: motifDataUri(accent),
                        width: 50,
                        height: 18,
                        style: { opacity: 0.5 },
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: 13,
                          letterSpacing: 2.5,
                          textTransform: 'uppercase' as const,
                          fontWeight: 500,
                          color: '#666',
                        },
                        children: 'symptomatik.com',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function motifDataUri(accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 22"><path d="M2 18 Q 12 2, 22 18" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/><path d="M22 18 Q 32 2, 42 18" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/><path d="M42 18 Q 52 2, 58 14" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
