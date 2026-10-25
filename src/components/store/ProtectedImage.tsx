'use client';

import React, { useState, useEffect } from 'react';

// صورة بكسل شفافة فارغة كـ Data URL لضمان أنها لا تستهلك أي طلبات شبكة
const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// إدارة مركزية واحدة لحالة الدرع لتجنب تكرار طلبات الشبكة لكل صورة
let globalShieldActive: boolean = true;
let isShieldInitialized = false;
let ongoingFetchPromise: Promise<boolean> | null = null;
const listeners = new Set<(active: boolean) => void>();

function notifyShieldChange(newVal: boolean) {
  globalShieldActive = newVal;
  listeners.forEach((listener) => listener(newVal));
}

function fetchGlobalShieldSetting(): Promise<boolean> {
  if (ongoingFetchPromise) {
    return ongoingFetchPromise;
  }

  ongoingFetchPromise = fetch('/api/admin/settings', { cache: 'no-store' })
    .then((res) => res.json())
    .then((data) => {
      if (data && typeof data.imageProtectionShield === 'boolean') {
        globalShieldActive = data.imageProtectionShield;
        if (typeof window !== 'undefined') {
          localStorage.setItem('wasli_image_shield_active', String(data.imageProtectionShield));
        }
        notifyShieldChange(data.imageProtectionShield);
        return data.imageProtectionShield;
      }
      return globalShieldActive;
    })
    .catch(() => globalShieldActive)
    .finally(() => {
      isShieldInitialized = true;
      ongoingFetchPromise = null;
    });

  return ongoingFetchPromise;
}

if (typeof window !== 'undefined') {
  // القراءة الفورية السريعة من الذاكرة المحلية
  const cached = localStorage.getItem('wasli_image_shield_active');
  if (cached !== null) {
    globalShieldActive = cached === 'true';
  }

  // الاستماع لتغيير الإعداد من نافذة أخرى أو من أحداث التبديل
  window.addEventListener('storage', (e) => {
    if (e.key === 'wasli_image_shield_active' && e.newValue !== null) {
      notifyShieldChange(e.newValue === 'true');
    }
  });

  window.addEventListener('wasli_shield_change', (e: any) => {
    if (typeof e.detail?.active === 'boolean') {
      notifyShieldChange(e.detail.active);
    }
  });
}

interface ProtectedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  enableShield?: boolean;
}

export const ProtectedImage: React.FC<ProtectedImageProps> = ({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  enableShield = true,
  onClick,
  ...props
}) => {
  const [shieldActive, setShieldActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('wasli_image_shield_active');
      if (cached !== null) return cached === 'true';
    }
    return globalShieldActive;
  });

  useEffect(() => {
    // تسجيل المكون في المستمعين للتحديث اللحظي عند تبديل المدير للزر
    const handleUpdate = (active: boolean) => {
      setShieldActive(active);
    };
    listeners.add(handleUpdate);

    // فحص الإعداد من السيرفر مرة واحدة فقط للموقع
    if (!isShieldInitialized) {
      fetchGlobalShieldSetting();
    }

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const shouldProtect = enableShield && shieldActive;

  return (
    <div 
      className={`relative overflow-hidden ${shouldProtect ? 'select-none' : ''} ${containerClassName}`} 
      onClick={onClick}
      style={shouldProtect ? { WebkitTouchCallout: 'none', userSelect: 'none' } : undefined}
    >
      {/* 1. الصورة الأصلية للمنتج */}
      <img
        src={src}
        alt={alt}
        className={`${className} ${shouldProtect ? 'pointer-events-auto' : ''}`}
        draggable={!shouldProtect}
        onDragStart={shouldProtect ? (e) => e.preventDefault() : undefined}
        onContextMenu={shouldProtect ? (e) => e.preventDefault() : undefined}
        {...props}
      />

      {/* 2. درع الحماية الشفاف المتقدم: يلتقط أوامر الحفظ والضغط المطول وينزل صورة فارغة شفافة */}
      {shouldProtect && (
        <img
          src={TRANSPARENT_PIXEL}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover z-10 opacity-0 cursor-pointer pointer-events-auto select-none"
          title=""
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}
    </div>
  );
};
