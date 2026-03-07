'use client';

import { QueryInput } from '@/components/query/QueryInput';
import { motion } from 'framer-motion';
import { homeFadeIn, queryBarSlideUp } from '@/lib/motion-config';

export default function Home() {
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={homeFadeIn}
      className="flex flex-col items-center min-h-full w-full relative bg-bg-base"
    >
      <div className="flex-1 w-full max-w-[760px] flex flex-col justify-center items-center px-6 h-full pb-[15vh]">
        
        {/* Grounded Composer Section */}
        <div className="w-full flex flex-col gap-6">
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
