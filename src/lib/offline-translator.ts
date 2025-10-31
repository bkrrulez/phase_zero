
'use server';

import { promises as fs } from 'fs';
import path from 'path';

let translations: Record<string, string> | null = null;

async function getTranslations(): Promise<Record<string, string>> {
  if (translations) {
    return translations;
  }
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'translations.json');
    const jsonData = await fs.readFile(filePath, 'utf-8');
    translations = JSON.parse(jsonData);
    return translations as Record<string, string>;
  } catch (error) {
    console.error("Failed to load translations.json:", error);
    return {};
  }
}

export async function translateTextOffline(text: string): Promise<string> {
    if (typeof text !== 'string' || !text) {
        return text;
    }

    const dictionary = await getTranslations();
    let translatedText = text;

    // Sort keys by length, longest first, to avoid partial replacements
    const sortedKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
        // Create a case-insensitive regular expression for the key, without word boundaries
        // This allows it to match phrases within a larger string
        try {
            const regex = new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
            translatedText = translatedText.replace(regex, (match) => {
                const translation = dictionary[key];
                // Attempt to preserve original case if possible, otherwise use default translation
                 if (match === match.toUpperCase()) {
                    return translation.toUpperCase();
                }
                if (match === match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()) {
                    return translation.charAt(0).toUpperCase() + translation.slice(1);
                }
                return translation;
            });
        } catch (e) {
            console.error(`Invalid regex for key: ${key}`, e);
        }
    }

    return translatedText;
}
