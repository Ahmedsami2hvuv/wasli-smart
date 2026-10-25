'use client';

import React, { useState, useEffect } from 'react';

// صورة بكسل شفافة فارغة كـ Data URL لضمان أنها لا تستهلك أي طلبات شبكة
const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

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
    return true; // مفعّل افتراضياً
  });

  useEffect(() => {
    let isMounted = true;
    // استعلام سريع للتزامن مع قرار المدير في المنصة
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data && typeof data.imageProtectionShield === 'boolean') {
          setShieldActive(data.imageProtectionShield);
          localStorage.setItem('wasli_image_shield_active', String(data.imageProtectionShield));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const shouldProtect = enableShield && shieldActive;

  return (
    <div 
      className={`relative overflow-hidden select-none ${containerClassName}`} 
      onClick={onClick}
    >
      {/* 1. الصورة الحقيقية للمنتج بالخلف */}
      <img
        src={src}
        alt={alt}
        className={`${className} pointer-events-auto`}
        draggable={false}
        {...props}
      />

      {/* 2. درع الحماية الشفاف المتقدم: يلتقط أوامر الحفظ والضغط المطول وينزل صورة فارغة */}
      {shouldProtect && (
        <img
          src={TRANSPARENT_PIXEL}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover z-10 opacity-0 cursor-pointer pointer-events-auto"
          title=""
          onContextMenu={(e) => {
            // ترك القائمة لتنزل الصورة الشفافة أو منعها
          }}
        />
      )}
    </div>
  );
};
