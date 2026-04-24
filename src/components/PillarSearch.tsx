import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    PagefindUI?: new (opts: object) => unknown;
  }
}

interface Props {
  lang: 'en' | 'pl';
  placeholder: string;
}

export default function PillarSearch({ lang, placeholder }: Props) {
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    // Dynamically load Pagefind UI — avoids cost on non-pillar pages.
    const script = document.createElement('script');
    script.src = '/pagefind/pagefind-ui.js';
    script.onload = () => {
      new window.PagefindUI!({
        element: '#pillar-search',
        showImages: false,
        resetStyles: false,
        translations: lang === 'pl' ? {
          placeholder,
          zero_results: 'Brak wyników dla [SEARCH_TERM]',
        } : { placeholder },
      });
    };
    document.head.appendChild(script);
  }, [lang, placeholder]);
  return null;
}
