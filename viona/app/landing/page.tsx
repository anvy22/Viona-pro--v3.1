"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Head from "next/head";

import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import WorkflowShowcase from "./components/WorkflowShowcase";
import PricingSection from "./components/PricingSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";
import Header from "./components/Header";

export default function LandingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  // Redirect signed-in users to home
  useEffect(() => {
    if (isSignedIn) {
      router.push("/");
    }
  }, [isSignedIn, router]);

  const handleGetStarted = () => {
    router.push("/sign-up");
  };

  const handleLogin = () => {
    router.push("/sign-in");
  };

  return (
    <>
      <Head>
        <title>Viona Pro - AI-Powered Business Analytics Platform</title>
        <meta
          name="description"
          content="Transform your business with AI-powered insights, real-time analytics, and streamlined operations. Start your free trial today."
        />
        <meta
          name="keywords"
          content="business analytics, AI insights, real-time dashboard, business automation"
        />
        <meta
          property="og:title"
          content="Viona Pro - AI-Powered Business Analytics Platform"
        />
        <meta
          property="og:description"
          content="Transform your business with AI-powered insights, real-time analytics, and streamlined operations."
        />
        <meta property="og:type" content="website" />
      </Head>

      <div className="min-h-screen bg-background relative selection:bg-primary/20 overflow-hidden">
        {/* Global Ambient Background & Dot Grid */}
        <div 
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `
              radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.08) 0%, transparent 50vw),
              radial-gradient(circle at 100% 100%, rgba(250, 204, 21, 0.06) 0%, transparent 50vw),
              radial-gradient(circle at 50% 50%, rgba(134, 239, 172, 0.03) 0%, transparent 50vw)
            `
          }}
        />
        <div 
          className="fixed inset-0 opacity-[0.15] pointer-events-none z-0"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: 'center center',
            maskImage: 'radial-gradient(ellipse at center, black 60%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 60%, transparent 100%)',
          }}
        />

        <Header onLogin={handleLogin} onGetStarted={handleGetStarted} />

        <main className="relative z-10 w-full">
          <HeroSection onGetStarted={handleGetStarted} />
          <FeaturesSection />
          <WorkflowShowcase />
         
          <PricingSection onGetStarted={handleGetStarted} />
          <CTASection onGetStarted={handleGetStarted} />

          <SignedOut>
            <div className="text-center my-8">
              <div className="space-x-4">
                <SignInButton>
                  <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="bg-secondary text-black px-4 py-2 rounded-md hover:bg-secondary/80 transition">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
              <p className="mt-2 text-muted-foreground">
                Sign in or sign up using the buttons above.
              </p>
            </div>
          </SignedOut>
        </main>

        <Footer />
      </div>
    </>
  );
}
