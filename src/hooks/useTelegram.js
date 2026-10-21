import { useEffect, useMemo } from 'react';

export function useTelegram() {
  const tg = useMemo(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return window.Telegram.WebApp;
    }
    return null;
  }, []);

  useEffect(() => {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.('#ffffff');
        tg.setBackgroundColor?.('#ffffff');
        // Enable closing confirmation to prevent accidental swipes
        if (tg.enableClosingConfirmation) {
          tg.enableClosingConfirmation();
        }
      } catch (err) {
        console.warn('Telegram WebApp init warning:', err);
      }
    }
  }, [tg]);

  const haptic = {
    impact: (style = 'medium') => {
      try {
        tg?.HapticFeedback?.impactOccurred(style);
      } catch (e) {}
    },
    notification: (type = 'success') => {
      try {
        tg?.HapticFeedback?.notificationOccurred(type);
      } catch (e) {}
    },
    selection: () => {
      try {
        tg?.HapticFeedback?.selectionChanged();
      } catch (e) {}
    }
  };

  const user = tg?.initDataUnsafe?.user || { first_name: 'Гость' };

  const isTelegram = Boolean(tg && tg.initData);

  return {
    tg,
    user,
    isTelegram,
    haptic,
    colorScheme: tg?.colorScheme || 'dark',
    close: () => tg?.close(),
  };
}
