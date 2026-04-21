import { useEffect, useState } from 'react';

const STORAGE_KEY = 'symptomatik:consent';

const COPY: Record<string, { text: string; accept: string; reject: string }> = {
  en: {
    text: 'We use cookieless analytics (Cloudflare) always. With your consent we also load Google Analytics for aggregate insights.',
    accept: 'Accept analytics',
    reject: 'Reject',
  },
  pl: {
    text: 'Zawsze używamy analityki bez ciasteczek (Cloudflare). Za Twoją zgodą ładujemy też Google Analytics dla zbiorczych statystyk.',
    accept: 'Akceptuj analitykę',
    reject: 'Odrzuć',
  },
  es: {
    text: 'Siempre usamos analítica sin cookies (Cloudflare). Con tu consentimiento también cargamos Google Analytics para métricas agregadas.',
    accept: 'Aceptar analítica',
    reject: 'Rechazar',
  },
};

function loadGA4(id: string): void {
  if (!id) return;
  if (document.getElementById('ga4-script')) return;
  const s = document.createElement('script');
  s.id = 'ga4-script';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  const s2 = document.createElement('script');
  s2.id = 'ga4-init';
  s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
  document.head.appendChild(s2);
}

interface Props {
  locale?: string;
  ga4Id?: string;
}

export default function CookieConsent({ locale = 'en', ga4Id = '' }: Props) {
  const [consent, setConsent] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      setConsent(v);
      if (v === 'yes' && ga4Id) loadGA4(ga4Id);
    } catch {
      /* localStorage blocked — behave as no-consent */
    } finally {
      setReady(true);
    }
  }, [ga4Id]);

  if (!ready) return null;
  if (consent === 'yes' || consent === 'no') return null;

  const copy = COPY[locale] ?? COPY['en']!;

  const accept = (): void => {
    try { window.localStorage.setItem(STORAGE_KEY, 'yes'); } catch { /* ignore */ }
    setConsent('yes');
    if (ga4Id) loadGA4(ga4Id);
  };
  const reject = (): void => {
    try { window.localStorage.setItem(STORAGE_KEY, 'no'); } catch { /* ignore */ }
    setConsent('no');
  };

  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 shadow-lg p-4 text-sm">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-3 justify-between">
        <p className="m-0 text-neutral-700">{copy.text}</p>
        <div className="flex gap-2">
          <button type="button" onClick={reject} className="px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-100">{copy.reject}</button>
          <button type="button" onClick={accept} className="px-3 py-1 rounded bg-neutral-900 text-white hover:bg-neutral-800">{copy.accept}</button>
        </div>
      </div>
    </div>
  );
}
