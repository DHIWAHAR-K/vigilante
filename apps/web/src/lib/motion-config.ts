import { Variants } from 'framer-motion';

export const TRANSITIONS = {
  fast: { duration: 0.12, ease: 'easeOut' },
  standard: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  smooth: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
  spring: { type: 'spring', stiffness: 300, damping: 24 },
  springBounce: { type: 'spring', stiffness: 400, damping: 30 },
} as const;

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

// New precision notch variant for subtle accent animations
export const precisionNotchVariants: Variants = {
  idle: { opacity: 0 },
  active: { 
    opacity: 1,
    transition: { duration: 0.15, ease: 'easeOut' }
  }
};

// Page transitions
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: TRANSITIONS.standard 
  },
  exit: { 
    opacity: 0, 
    transition: { duration: 0.15 } 
  }
};

// Slide in from bottom (for sheets, drawers)
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: TRANSITIONS.smooth 
  },
  exit: { 
    opacity: 0, 
    y: 16, 
    transition: { duration: 0.15 } 
  }
};

// Slide in from side (for panels)
export const slideInVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: TRANSITIONS.smooth 
  },
};

// Fade in with scale (for modals, overlays)
export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: TRANSITIONS.spring 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96,
    transition: { duration: 0.12 } 
  }
};

// Staggered children container
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// List item for staggered animations
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: TRANSITIONS.standard 
  },
};

// Pulse glow for active states
export const pulseGlowVariants: Variants = {
  idle: {
    boxShadow: '0 0 0px rgba(245, 166, 35, 0)',
  },
  active: {
    boxShadow: [
      '0 0 0px rgba(245, 166, 35, 0)',
      '0 0 12px rgba(245, 166, 35, 0.2)',
      '0 0 0px rgba(245, 166, 35, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Streaming cursor
export const streamingCursor: Variants = {
  animate: {
    opacity: [0, 1, 0],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Source tray slide
export const sourceTrayVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { 
    opacity: 1, 
    height: 'auto',
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    height: 0,
    transition: { duration: 0.2 }
  }
};

// Conversation state transition
export const conversationStateVariants: Variants = {
  empty: { 
    opacity: 0,
    scale: 0.98,
    transition: TRANSITIONS.standard 
  },
  draft: { 
    opacity: 1, 
    scale: 1,
    transition: TRANSITIONS.smooth 
  },
  active: { 
    opacity: 1, 
    scale: 1,
    transition: TRANSITIONS.smooth 
  },
};
