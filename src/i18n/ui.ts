import type { Locale } from './locales';
import { defaultLocale } from './locales';

export const ui = {
  en: {
    'nav.symptomChecker': 'Symptom Checker',
    'nav.labResults': 'Check Your Lab Results',
    'nav.mentalHealth': 'Mental Health Tests',
    'nav.calculators': 'Calculators',
    'footer.legal.privacy': 'Privacy Policy',
    'footer.legal.terms': 'Terms of Service',
    'footer.legal.medicalDisclaimer': 'Medical Disclaimer',
    'footer.legal.cookiePolicy': 'Cookie Policy',
    'disclaimer.content': 'The information on this page is for educational purposes only and is not medical advice. Always consult a qualified healthcare professional for diagnosis and treatment.',
    'disclaimer.aiResult': 'This interpretation is AI-generated and educational. It is not a medical diagnosis. Always confirm with a qualified healthcare professional.',
    'language.switcher.label': 'Language',
    'cookie.banner.text': 'We use cookieless analytics (Cloudflare) always. With your consent we also load Google Analytics for aggregate insights.',
    'cookie.banner.accept': 'Accept analytics',
    'cookie.banner.reject': 'Reject',
    'breadcrumbs.home': 'Home',
    'breadcrumbs.medicalTests': 'Medical Tests',
    'lastReviewed': 'Last reviewed',
    'relatedContent.heading': 'Related tests',
  },
  pl: {
    'nav.symptomChecker': 'Sprawdź objawy',
    'nav.labResults': 'Sprawdź wyniki badań',
    'nav.mentalHealth': 'Testy zdrowia psychicznego',
    'nav.calculators': 'Kalkulatory',
    'footer.legal.privacy': 'Polityka prywatności',
    'footer.legal.terms': 'Warunki korzystania',
    'footer.legal.medicalDisclaimer': 'Zastrzeżenie medyczne',
    'footer.legal.cookiePolicy': 'Polityka cookies',
    'disclaimer.content': 'Informacje na tej stronie służą wyłącznie celom edukacyjnym i nie stanowią porady medycznej. W sprawie diagnozy i leczenia zawsze konsultuj się z wykwalifikowanym lekarzem.',
    'disclaimer.aiResult': 'Ta interpretacja została wygenerowana przez AI i ma charakter edukacyjny. Nie jest diagnozą medyczną. Zawsze potwierdź ją u wykwalifikowanego lekarza.',
    'language.switcher.label': 'Język',
    'cookie.banner.text': 'Zawsze używamy analityki bez ciasteczek (Cloudflare). Za Twoją zgodą ładujemy też Google Analytics dla zbiorczych statystyk.',
    'cookie.banner.accept': 'Akceptuj analitykę',
    'cookie.banner.reject': 'Odrzuć',
    'breadcrumbs.home': 'Strona główna',
    'breadcrumbs.medicalTests': 'Badania',
    'lastReviewed': 'Ostatnia weryfikacja',
    'relatedContent.heading': 'Powiązane badania',
  },
  es: {
    'nav.symptomChecker': 'Verificador de síntomas',
    'nav.labResults': 'Consulta tus análisis',
    'nav.mentalHealth': 'Tests de salud mental',
    'nav.calculators': 'Calculadoras',
    'footer.legal.privacy': 'Política de privacidad',
    'footer.legal.terms': 'Términos del servicio',
    'footer.legal.medicalDisclaimer': 'Aviso médico',
    'footer.legal.cookiePolicy': 'Política de cookies',
    'disclaimer.content': 'La información de esta página tiene fines educativos y no constituye consejo médico. Consulta siempre a un profesional sanitario cualificado para el diagnóstico y tratamiento.',
    'disclaimer.aiResult': 'Esta interpretación fue generada por IA y tiene fines educativos. No es un diagnóstico médico. Confírmala siempre con un profesional sanitario cualificado.',
    'language.switcher.label': 'Idioma',
    'cookie.banner.text': 'Siempre usamos analítica sin cookies (Cloudflare). Con tu consentimiento también cargamos Google Analytics para métricas agregadas.',
    'cookie.banner.accept': 'Aceptar analítica',
    'cookie.banner.reject': 'Rechazar',
    'breadcrumbs.home': 'Inicio',
    'breadcrumbs.medicalTests': 'Pruebas',
    'lastReviewed': 'Última revisión',
    'relatedContent.heading': 'Pruebas relacionadas',
  },
} as const;

export type UIKey = keyof typeof ui.en;

export function t(locale: Locale, key: UIKey): string {
  const val = (ui[locale] as Record<string, string>)[key];
  if (val !== undefined) return val;
  return ui[defaultLocale][key];
}
