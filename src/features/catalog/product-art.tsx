import { useState } from 'react';
import { cn } from '@/shared/utils/cn';

export function ProductArt({ image, available }: { image: string; available: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
      {failed ? null : (
        <img
          src={image}
          alt=""
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', !available && 'grayscale')}
        />
      )}
      {!available ? <div className="absolute inset-0 bg-[#28212C]/35" /> : null}
    </div>
  );
}
