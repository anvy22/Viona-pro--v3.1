"use client";

import React from "react";
import { MacbookScroll } from "@/components/ui/macbook-scroll";

const MacbookScrollSection: React.FC = () => {
  return (
    <section className="relative w-full bg-[#09090b] overflow-hidden -mt-20 md:-mt-32 pb-20">
      {/* Background ambient glow to anchor the macbook */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      
      <MacbookScroll
        title={
          <div className="text-center font-bold tracking-tight text-white mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 text-4xl md:text-5xl lg:text-6xl">
              Experience the power.
            </span>
          </div>
        }
        src="/image.png"
        showGradient={false}
      />
    </section>
  );
};

export default MacbookScrollSection;
