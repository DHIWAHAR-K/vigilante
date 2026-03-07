import { Variants } from 'framer-motion';

export const breatheVariants: Variants = {
  idle: {
    boxShadow: [
      '0 0 0px rgba(245, 166, 35, 0)',
      '0 0 20px rgba(245, 166, 35, 0.12)',
      '0 0 0px rgba(245, 166, 35, 0)',
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  focused: {
    boxShadow: '0 0 0 1px rgba(245, 166, 35, 0.15)',
    transition: { duration: 0.15, ease: 'easeOut' }
  }
};

export const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
  },
};

export const sourceCardVariants: Variants = {
  hidden: { opacity: 0, x: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  },
};

export const sendReadyVariants: Variants = {
  idle: { scale: 1 },
  ready: {
    scale: [1, 1.08, 1],
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  pressed: {
    scale: 0.92,
    transition: { duration: 0.1 }
  },
};

export const homeFadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: 0.2, ease: 'easeOut' } 
  }
};

export const queryBarSlideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } 
  }
};
