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

  const user = tg?.initDataUnsafe?.user || {
    id: 99999999,
    first_name: 'Пользователь',
    username: 'ai_user',
    is_premium: true
  };

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
