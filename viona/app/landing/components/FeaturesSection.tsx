"use client";

import React from "react";
import { motion } from "motion/react";
import {
  Brain,
  Zap,
  Package,
  ShoppingCart,
  Warehouse,
  MessageCircle,
  HardDrive,
  ShieldCheckIcon,
} from "lucide-react";

interface Feature {
  icon: any;
  title: string;
  description: string;
}

const FeaturesSection: React.FC = () => {
  const features: Feature[] = [
    {
      icon: Package,
      title: "Inventory & Orders",
      description:
        "Manage real-time stock levels, track individual product quantities, and seamlessly process incoming orders.",
    },
    {
      icon: Warehouse,
      title: "Multi-Warehouse Management",
      description:
        "Gain complete visibility over product distribution and fulfillment across all your warehouse facilities.",
    },
    {
      icon: Zap,
      title: "Autonomous Workflows",
      description:
        "Visually build and deploy intelligent AI agents to automate repetitive operations entirely on autopilot.",
    },
    {
      icon: MessageCircle,
      title: "AI-Powered Chat Assistant",
      description:
        "Interact with your business data naturally. Query inventory, execute workflows, and get intelligent answers instantly.",
    },
    {
      icon: HardDrive,
      title: "Secure Cloud Storage",
      description:
        "Store, manage, and securely share critical business documents and assets within a unified environment.",
    },
    {
      icon: ShieldCheckIcon,
      title: "Enterprise Access Control",
      description:
        "Enforce strict role-based permissions (Admin, Manager, Employee) to ensure data security and compliance.",
    },
  ];

  return (
    <section id="features" className="py-24 relative w-full bg-black">
      


      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Clean Header */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6"
          >
            Everything you need to <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              scale exponentially
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-lg text-neutral-400 leading-relaxed"
          >
            Powerful features designed to streamline your operations,
            provide actionable insights, and accelerate your business growth without the noise.
          </motion.p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                viewport={{ once: true }}
                className="group relative"
              >
                {/* Glow behind card on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none"></div>
                
                <div className="relative h-full bg-neutral-950 border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors duration-300 overflow-hidden flex flex-col items-start min-h-[260px]">
                  
                  {/* Subtle inner top-light gradient for 3D effect */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Icon Container with subtle color tint */}
                  <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-300 ease-out group-hover:bg-white/10 group-hover:border-white/10">
                    <IconComponent className="h-5 w-5 text-neutral-300 group-hover:text-emerald-400 transition-colors duration-300" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-neutral-400 transition-all duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-neutral-400 text-sm leading-relaxed mt-auto">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;