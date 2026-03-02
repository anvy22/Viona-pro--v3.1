"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOrgStore } from "@/hooks/useOrgStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import DesktopSidebar from "@/components/DesktopSidebar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { ModeToggle } from "@/components/ThemeModeToggle";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { SearchBar } from "@/components/SearchBar";
import { OrganizationSelector } from "@/app/organization/components/OrganizationSelector";
import { PricingCard } from "./components/PricingCard";
import { UsageOverview } from "./components/UsageOverview";
import { CurrentPlanBanner } from "./components/CurrentPlanBanner";
import {
  getSubscriptionDetails,
  getPlans,
  createCheckoutSession,
  createBillingPortalSession,
} from "./billing-actions";
import { toast } from "sonner";
import type { PlanId } from "@/lib/stripe";

function BillingPageContent() {
  const { selectedOrgId, orgs, setSelectedOrgId } = useOrgStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle success/cancel from Stripe checkout
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    if (success === "true") {
      toast.success("Subscription activated successfully!");
      router.replace("/billing");
    }
    if (canceled === "true") {
      toast.info("Checkout was canceled.");
      router.replace("/billing");
    }
  }, [searchParams, router]);

  const loadData = useCallback(async () => {
    if (!selectedOrgId) return;
    setIsLoading(true);
    try {
      const [subDetails, planList] = await Promise.all([
        getSubscriptionDetails(selectedOrgId),
        getPlans(),
      ]);
      setSubscription(subDetails);
      setPlans(planList);
    } catch (error) {
      console.error("Failed to load billing data:", error);
      toast.error("Failed to load billing data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!selectedOrgId) return;

    if (planId === "enterprise") {
      window.location.href =
        "mailto:sales@viona.dev?subject=Enterprise%20Plan%20Inquiry";
      return;
    }

    if (planId === "free") {
      handleManageBilling();
      return;
    }

    setCheckoutLoading(planId);
    try {
      const result = await createCheckoutSession(selectedOrgId, planId);
      if (result.url) {
        window.location.href = result.url;
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!selectedOrgId) return;
    setPortalLoading(true);
    try {
      const result = await createBillingPortalSession(selectedOrgId);
      if (result.url) {
        window.location.href = result.url;
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const pageContent = (
    <main className="flex-1 overflow-y-auto p-6 space-y-8">
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <Card className="h-24 bg-muted/40 rounded-2xl" />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="h-[400px] bg-muted/40 rounded-2xl" />
            ))}
          </div>
          <Card className="h-40 bg-muted/40 rounded-2xl" />
        </div>
      ) : subscription ? (
        <div className="space-y-8 max-w-6xl mx-auto">
          <CurrentPlanBanner
            planName={subscription.planName}
            status={subscription.status}
            price={subscription.price}
            currentPeriodEnd={subscription.currentPeriodEnd}
            cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
            onManageBilling={handleManageBilling}
            loading={portalLoading}
            hasStripeCustomer={!!subscription.stripeCustomerId}
          />

          <div>
            <h2 className="text-xl font-semibold mb-4">Plans & Pricing</h2>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  name={plan.name}
                  price={plan.price}
                  features={plan.features}
                  isCurrentPlan={subscription.plan === plan.id}
                  isPopular={plan.id === "pro"}
                  onSelect={() => handleSelectPlan(plan.id)}
                  loading={checkoutLoading === plan.id}
                  currentPlan={subscription.plan}
                />
              ))}
            </div>
          </div>

          <UsageOverview usage={subscription.usage} />
        </div>
      ) : (
        <Card className="p-8 text-center rounded-2xl max-w-md mx-auto">
          <p className="text-muted-foreground">
            Unable to load billing information. Please try again.
          </p>
          <Button onClick={loadData} className="mt-4">
            Retry
          </Button>
        </Card>
      )}
    </main>
  );

  if (orgs.length === 0) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <DesktopSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between px-6 py-4 h-[50px] w-full gap-4">
            <BreadcrumbHeader />
            <div className="flex items-center gap-4">
              <ModeToggle />
              <SignedIn><UserButton /></SignedIn>
            </div>
          </header>
          <Separator />
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center max-w-md shadow-sm border">
              <h2 className="text-xl font-semibold">No Organization Found</h2>
              <p className="text-muted-foreground mt-2 mb-6">
                Create or join an organization to manage billing.
              </p>
              <Button onClick={() => router.push("/organization")}>
                Go to Organizations
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedOrgId) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <DesktopSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between px-6 py-4 h-[50px] w-full gap-4">
            <BreadcrumbHeader />
            <div className="flex items-center gap-4">
              <ModeToggle />
              <SignedIn><UserButton /></SignedIn>
            </div>
          </header>
          <Separator />
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center max-w-sm shadow-sm border space-y-4">
              <h2 className="text-xl font-semibold">Select Organization</h2>
              <p className="text-sm text-muted-foreground">
                Select an organization to view billing.
              </p>
              <OrganizationSelector
                organizations={orgs}
                selectedOrgId={selectedOrgId}
                onOrganizationSelect={(id) => setSelectedOrgId(id)}
              />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DesktopSidebar />
      <div className="flex flex-col flex-1 min-h-0">
        <header className="flex items-center justify-between px-6 py-4 h-[50px] w-full gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <BreadcrumbHeader />
          <div className="flex-1 max-w-xs">
            <OrganizationSelector
              organizations={orgs}
              selectedOrgId={selectedOrgId}
              onOrganizationSelect={(id) => setSelectedOrgId(id)}
            />
          </div>
          <SearchBar />
          <NotificationDropdown />
          <div className="flex items-center gap-4">
            <ModeToggle />
            <SignedIn><UserButton /></SignedIn>
          </div>
        </header>
        <Separator />
        {pageContent}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen overflow-hidden bg-background animate-pulse">
          <div className="w-[240px] bg-muted/20 border-r" />
          <div className="flex-1 p-6 space-y-6">
            <Card className="h-24 bg-muted/40 rounded-2xl" />
            <div className="grid gap-4 grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="h-[400px] bg-muted/40 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
