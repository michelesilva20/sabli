import { useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduce = useReducedMotion();
  return (
    <div key={location.pathname} className={reduce ? undefined : 'sabli-page-in'}>
      {children}
    </div>
  );
}
