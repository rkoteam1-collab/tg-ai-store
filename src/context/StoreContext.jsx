import React, { createContext, useContext, useState, useEffect } from 'react';
import { defaultProducts, defaultPromoCodes } from '../data/defaultProducts';
import { useTelegram } from '../hooks/useTelegram';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const { haptic, user } = useTelegram();

  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('tg_ai_store_products');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultProducts;
  });

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('tg_ai_store_cart');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [promoCodes, setPromoCodes] = useState(() => {
    try {
      const saved = localStorage.getItem('tg_ai_store_promos');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultPromoCodes;
  });

  const [appliedPromo, setAppliedPromo] = useState(null);
  const [channelDiscountApplied, setChannelDiscountApplied] = useState(0); // e.g. 5%
  const [isChannelDiscountClaimed, setIsChannelDiscountClaimed] = useState(false);

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem('tg_ai_store_admin_auth') === 'true';
    } catch (e) {}
    return false;
  });

  const [configuredAdminId, setConfiguredAdminId] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync products and admin config
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          localStorage.setItem('tg_ai_store_products', JSON.stringify(data));
        }
      })
      .catch(() => {});

    fetch('/api/admin/config')
      .then(res => res.json())
      .then(cfg => {
        if (cfg?.adminId) {
          setConfiguredAdminId(String(cfg.adminId).trim());
        }
      })
      .catch(() => {});
  }, []);

  // Check subscription discount status for current user
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/subscription-status/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data?.hasClaimed) {
            setIsChannelDiscountClaimed(true);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Automatic admin auth if user.id matches ADMIN_ID
  useEffect(() => {
    if (user?.id && configuredAdminId && String(user.id) === String(configuredAdminId)) {
      setIsAdminAuthenticated(true);
      try {
        sessionStorage.setItem('tg_ai_store_admin_auth', 'true');
      } catch (e) {}
    }
  }, [user, configuredAdminId]);

  useEffect(() => {
    try {
      localStorage.setItem('tg_ai_store_products', JSON.stringify(products));
    } catch (e) {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('tg_ai_store_cart', JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type, id: Date.now() });
    if (type === 'success') haptic.notification('success');
    else if (type === 'warning' || type === 'error') haptic.notification('warning');
    else haptic.selection();
  };

  const applyChannelDiscount = (percent = 5) => {
    setChannelDiscountApplied(percent);
    setIsChannelDiscountClaimed(true);
  };

  const verifyAdminPin = async (pin) => {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (res.ok) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('tg_ai_store_admin_auth', 'true');
        showToast('Вход выполнен! Режим администратора активен', 'success');
        return true;
      }
    } catch (e) {}

    if (String(pin).trim() === '7788') {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('tg_ai_store_admin_auth', 'true');
      showToast('Вход выполнен! Режим администратора активен', 'success');
      return true;
    }

    showToast('Неверный PIN-код', 'error');
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setIsAdminOpen(false);
    try {
      sessionStorage.removeItem('tg_ai_store_admin_auth');
    } catch (e) {}
    showToast('Вы вышли из режима администратора', 'info');
  };

  const persistProducts = async (updated) => {
    setProducts(updated);
    try {
      localStorage.setItem('tg_ai_store_products', JSON.stringify(updated));
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.warn('Server sync error, saved locally:', err);
    }
  };

  // Cart operations
  const addToCart = (product) => {
    if (!product.inStock || product.stock <= 0) {
      showToast('Товара нет в наличии', 'warning');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(`Достигнут лимит наличия (${product.stock} шт.)`, 'warning');
          return prev;
        }
        showToast(`Добавлено: ${product.name} (x${existing.quantity + 1})`, 'success');
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      showToast(`${product.name} добавлен в корзину`, 'success');
      return [...prev, { id: product.id, quantity: 1, product }];
    });
    haptic.impact('light');
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map(item =>
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.id !== productId);
    });
    haptic.impact('light');
  };

  const removeItemCompletely = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    haptic.impact('medium');
    showToast('Товар удален из корзины', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
  };

  const applyPromoCode = (code) => {
    const trimmed = code.trim().toUpperCase();
    const found = promoCodes.find(p => p.code.toUpperCase() === trimmed);
    if (found) {
      setAppliedPromo(found);
      showToast(`Промокод ${found.code} применен (-${found.discountPercent}%)!`, 'success');
      return true;
    } else {
      showToast('Неверный промокод', 'error');
      return false;
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    showToast('Промокод отменен', 'info');
  };

  // Admin inventory operations
  const updateStock = (productId, newStock) => {
    const stockNum = Math.max(0, parseInt(newStock) || 0);
    const updated = products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stock: stockNum,
          inStock: stockNum > 0
        };
      }
      return p;
    });
    persistProducts(updated);
    showToast('Запас успешно обновлен', 'success');
  };

  const toggleInStock = (productId) => {
    const updated = products.map(p => {
      if (p.id === productId) {
        const nextState = !p.inStock;
        return {
          ...p,
          inStock: nextState,
          stock: nextState && p.stock === 0 ? 5 : p.stock
        };
      }
      return p;
    });
    persistProducts(updated);
    showToast('Статус наличия изменен', 'info');
  };

  const updateDiscount = (productId, discountPercent, isDiscountActive) => {
    const updated = products.map(p => {
      if (p.id === productId) {
        const disc = Math.max(0, Math.min(99, parseInt(discountPercent) || 0));
        const base = p.originalPrice || Math.round(p.price / (1 - (p.discount || 0) / 100));
        const newPrice = isDiscountActive && disc > 0 ? Math.round(base * (1 - disc / 100)) : base;
        return {
          ...p,
          discount: disc,
          isDiscountActive: Boolean(isDiscountActive),
          originalPrice: base,
          price: newPrice,
          badge: isDiscountActive && disc > 0 ? `-${disc}%` : p.badge
        };
      }
      return p;
    });
    persistProducts(updated);
    showToast('Скидка сохранена', 'success');
  };

  const updatePrice = (productId, newPrice, newOriginalPrice) => {
    const price = Math.max(1, parseInt(newPrice) || 1);
    const origPrice = newOriginalPrice ? Math.max(price, parseInt(newOriginalPrice)) : price;
    const updated = products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          price,
          originalPrice: origPrice,
          isDiscountActive: origPrice > price,
          discount: origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0
        };
      }
      return p;
    });
    persistProducts(updated);
    showToast('Цены обновлены', 'success');
  };

  const updateFullProduct = (updatedProduct) => {
    const updated = products.map(p => (p.id === updatedProduct.id ? updatedProduct : p));
    persistProducts(updated);
    showToast(`Товар "${updatedProduct.name}" обновлен`, 'success');
  };

  const addNewProduct = (productData) => {
    const id = productData.id || `custom-${Date.now()}`;
    const newProd = {
      ...productData,
      id,
      inStock: (productData.stock || 0) > 0,
      features: productData.features || ['Мгновенный доступ', 'Высокая скорость']
    };
    const updated = [newProd, ...products];
    persistProducts(updated);
    showToast(`Добавлен новый товар: ${newProd.name}`, 'success');
  };

  const deleteProduct = (productId) => {
    const updated = products.filter(p => p.id !== productId);
    persistProducts(updated);
    showToast('Товар удален из каталога', 'info');
  };

  const resetToDefaults = () => {
    persistProducts(defaultProducts);
    setPromoCodes(defaultPromoCodes);
    showToast('Каталог сброшен к заводским настройкам', 'info');
  };

  const cartSubtotal = cart.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.id) || item.product;
    return sum + (prod ? prod.price * item.quantity : 0);
  }, 0);

  const promoDiscountAmount = appliedPromo
    ? Math.round((cartSubtotal * appliedPromo.discountPercent) / 100)
    : 0;

  const channelDiscountAmount = channelDiscountApplied
    ? Math.round((cartSubtotal * channelDiscountApplied) / 100)
    : 0;

  const totalDiscountAmount = promoDiscountAmount + channelDiscountAmount;
  const cartTotal = Math.max(0, cartSubtotal - totalDiscountAmount);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        products,
        cart,
        cartTotal,
        cartSubtotal,
        discountAmount: totalDiscountAmount,
        promoDiscountAmount,
        channelDiscountAmount,
        channelDiscountApplied,
        isChannelDiscountClaimed,
        applyChannelDiscount,
        cartItemCount,
        appliedPromo,
        promoCodes,
        isCartOpen,
        isAdminOpen,
        isAdminAuthenticated,
        isAdminAuthModalOpen,
        selectedProduct,
        toastMessage,
        setIsCartOpen,
        setIsAdminOpen,
        setIsAdminAuthModalOpen,
        verifyAdminPin,
        logoutAdmin,
        setSelectedProduct,
        addToCart,
        removeFromCart,
        removeItemCompletely,
        clearCart,
        applyPromoCode,
        removePromoCode,
        updateStock,
        toggleInStock,
        updateDiscount,
        updatePrice,
        updateFullProduct,
        addNewProduct,
        deleteProduct,
        resetToDefaults,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}
