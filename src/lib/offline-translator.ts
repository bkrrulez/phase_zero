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

    // Sort keys by length, longest first, to avoid partial replacements (e.g., "in" before "in Betrieb")
    const sortedKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        // Use a regular expression to replace whole words only to avoid partial matches within other words
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        translatedText = translatedText.replace(regex, dictionary[key]);
    }

    return translatedText;
}