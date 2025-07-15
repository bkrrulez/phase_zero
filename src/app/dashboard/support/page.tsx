'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../contexts/LanguageContext";

export default function SupportPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">{t('support')}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('contactSupportTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{t('contactSupportDesc')}</p>
            <div>
                <p className="font-semibold text-foreground">Bikramjit Chowdhury</p>
                <a href="mailto:bikramjit.chowdhury@tuwien.ac.at" className="text-primary hover:underline">
                    bikramjit.chowdhury@tuwien.ac.at
                </a>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
