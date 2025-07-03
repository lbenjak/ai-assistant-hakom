export type AccessibilityIntent = {
  intentType: string;
  action?: string;
  value?: string;
  confidence: number;
};

const quickQuestionMappings: Record<string, AccessibilityIntent> = {
  "koje opcije pristupačnosti nudiš?": {
    intentType: "GENERAL_QUERY",
    confidence: 1.0
  },
  "tamna tema": {
    intentType: "THEME",
    action: "SET",
    value: "dark",
    confidence: 1.0
  },
  "svijetla tema": {
    intentType: "THEME",
    action: "SET",
    value: "light",
    confidence: 1.0
  },
  "povećaj font": {
    intentType: "FONT_SIZE",
    action: "INCREASE",
    confidence: 1.0
  },
  "smanji font": {
    intentType: "FONT_SIZE",
    action: "DECREASE",
    confidence: 1.0
  },
  "resetiraj veličinu fonta": {
    intentType: "FONT_SIZE",
    action: "RESET",
    confidence: 1.0
  },
  "font prilagođen disleksiji": {
    intentType: "FONT_TYPE",
    action: "SET",
    value: "dyslexic",
    confidence: 1.0
  },
  "resetiraj tip fonta": {
    intentType: "FONT_TYPE",
    action: "RESET",
    confidence: 1.0
  }
};

export function handleQuickQuestion(text: string): AccessibilityIntent | undefined {
  const normalizedText = text.toLowerCase().trim();
  return quickQuestionMappings[normalizedText];
}

export async function analyzeAccessibilityIntent(text: string): Promise<AccessibilityIntent | null> {
  try {
    const response = await fetch('/api/accessibility-assistant/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      throw new Error('Failed to analyze accessibility intent');
    }
    return await response.json();
  } catch (error) {
    console.error('Error analyzing accessibility intent:', error);
    return null;
  }
} 