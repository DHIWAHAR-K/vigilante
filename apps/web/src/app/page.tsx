'use client';

import { QueryInput } from '@/components/query/QueryInput';
import { motion } from 'framer-motion';
import { homeFadeIn, queryBarSlideUp } from '@/lib/motion-config';
import { HomeIntro } from '@/components/layout/HomeIntro';

export default function Home() {
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={homeFadeIn}
      className="flex flex-col items-center min-h-full w-full relative bg-bg-base"
    >
      <div className="flex-1 w-full max-w-[760px] flex flex-col justify-center items-center px-6 h-full pb-[15vh]">
        
        {/* Ambient stage field - subtle radial glow */}
        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent opacity-30" />
        </div>
        
        <HomeIntro />
        
        {/* Grounded Composer Section */}
        <div className="w-full flex flex-col gap-6 relative z-10">
          <motion.div 
            variants={queryBarSlideUp} 
            className="w-full relative z-10"
          >
            <QueryInput />
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}
