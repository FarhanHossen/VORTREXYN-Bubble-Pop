import React from 'react';
import { motion } from 'framer-motion';

export function PhoneMockup({ src, alt, delay = 0 }: { src: string, alt: string, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="relative mx-auto w-[280px] h-[580px] rounded-[3rem] border-[8px] border-muted shadow-2xl overflow-hidden bg-background ring-4 ring-black/50"
    >
      <div className="absolute top-0 inset-x-0 h-6 bg-black rounded-b-3xl w-40 mx-auto z-20"></div>
      <img src={src} alt={alt} className="w-full h-full object-cover relative z-10" />
    </motion.div>
  );
}
