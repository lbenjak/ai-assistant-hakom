import { dyslexicFont, inter } from "../fonts";

export type AccessibilityIntent = {
  intentType: string;
  action?: string;
  value?: string;
  confidence: number;
};

export function handleAccessibilityAction(intent: AccessibilityIntent) {
  switch (intent.intentType) {
    case 'FONT_SIZE': {
      const size = intent.action === 'INCREASE' ? '1.2rem' : 
                  intent.action === 'DECREASE' ? '0.8rem' : '1rem';
      document.documentElement.style.fontSize = size;
      return `Veličina fonta je ${intent.action === 'RESET' ? 'vraćena na početnu vrijednost' : 'prilagođena'}.`;
    }
    case 'FONT_TYPE': {
      if (intent.action === 'SET' && intent.value === 'dyslexic') {
        document.body.classList.remove(inter.className);
        document.body.classList.add(dyslexicFont.className);
        return 'Font je prilagođen za lakše čitanje osobama s disleksijom.';
      }
      document.body.classList.remove(dyslexicFont.className);
      document.body.classList.add(inter.className);
      return 'Font je vraćen na standardni tip.';
    }
    case 'THEME': {
      if (intent.action === 'SET') {
        if (intent.value === 'dark') {
          document.body.classList.add('dark-theme');
          return 'Tamna tema je aktivirana.';
        }
        document.body.classList.remove('dark-theme');
        return 'Svijetla tema je aktivirana.';
      }
      document.body.classList.remove('dark-theme');
      return 'Tema je vraćena na početnu vrijednost.';
    }
    case 'GENERAL_QUERY':
      return `$$$$`; // This will trigger the help message display
    default:
      return null;
  }
} 