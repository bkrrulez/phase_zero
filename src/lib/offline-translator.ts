
import translations from './translations.json';

// Create a lookup map for faster access
const translationMap = new Map<string, string>(Object.entries(translations));

// Sort keys by length in descending order to match longer phrases first
const sortedKeys = Array.from(translationMap.keys()).sort((a, b) => b.length - a.length);

export async function translateTextOffline(germanText: string): Promise<string> {
    if (!germanText || typeof germanText !== 'string') {
        return germanText;
    }

    let translatedText = germanText;

    // Use a regular expression to find all occurrences of the keys
    for (const key of sortedKeys) {
        // Create a regex that matches whole words/phrases only
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        if (regex.test(translatedText)) {
            translatedText = translatedText.replace(regex, translationMap.get(key) as string);
        }
    }

    return translatedText;
}
