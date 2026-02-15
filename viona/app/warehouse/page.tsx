"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCcw } from "lucide-react";
import DesktopSidebar from "@/components/DesktopSidebar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { ModeToggle } from "@/components/ThemeModeToggle";
import { Separator } from "@/components/ui/separator";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { SearchBar } from "@/components/SearchBar";
import { OrganizationSelector } from "@/app/organization/components/OrganizationSelector";
import { useOrgStore, useCurrentOrgRole } from "@/hooks/useOrgStore";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Warehouse } from "../api/warehouses/route";
import { WarehouseGrid } from "./components/WarehouseGrid";
import { AddWarehouseDialog } from "./components/AddWarehouseDialog";
import { WarehouseStats } from "./components/WarehouseStats";
import { EmptyState } from "./components/EmptyState";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ErrorAlert } from "./components/ErrorAlert";
import { createWarehouse, ensureDefaultWarehouse } from "./actions";

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedOrgId, orgs, setSelectedOrgId } = useOrgStore();
  const role = useCurrentOrgRole();
  const isRoleLoaded = role !== undefined;

  const isEmployee = role === "employee";
  const isManager = role === "manager";
  const isAdmin = role === "admin";

  const canViewWarehouses = isRoleLoaded;
  const canCreateWarehouse = isRoleLoaded && isAdmin;

  const selectOrganization = useCallback((orgId: string | null) => {
    setSelectedOrgId(orgId);
  }, [setSelectedOrgId]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchWarehouses = useCallback(async (showRefreshing = false) => {
    if (!selectedOrgId) {
      setWarehouses([]);
      return;
    }

    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Ensure default warehouse exists
      await ensureDefaultWarehouse(selectedOrgId);

      const res = await fetch(`/api/warehouses?orgId=${selectedOrgId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch warehouses: ${res.status} ${res.statusText}`);
      }
      const data: Warehouse[] = await res.json();
      setWarehouses(Array.isArray(data) ? data : []);

      if (showRefreshing) {
        toast.success("Warehouses refreshed successfully");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load warehouses.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleAddWarehouse = async (data: { name: string; address: string }) => {
    if (!selectedOrgId) {
      const errorMsg = "Please select an organization first.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      setError(null);
      await createWarehouse(selectedOrgId, data);
      toast.success("Warehouse created successfully");
      await fetchWarehouses();
      setIsDialogOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create warehouse.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  if (orgs.length === 0) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar />
        <div className="flex flex-col flex-1 min-h-0">
          <header className="flex items-center justify-between px-6 py-4 h-16 bg-background shrink-0">
            <BreadcrumbHeader />
            <div className="gap-4 flex items-center">
              <ModeToggle />
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="p-8 text-center max-w-md">
              <h2 className="text-xl font-semibold mb-2">No Organization Found</h2>
              <p className="text-muted-foreground mb-4">
                You need to create or join an organization to manage warehouses.
              </p>
              <Button onClick={() => window.location.href = '/organization'}>
                Create Organization
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedOrgId) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar />
        <div className="flex flex-col flex-1 min-h-0">
          <header className="flex items-center justify-between px-6 py-4 h-16 bg-background shrink-0">
            <BreadcrumbHeader />
            <div className="flex-1 max-w-xs mx-4">
              <OrganizationSelector
                organizations={orgs}
                selectedOrgId={selectedOrgId}
                onOrganizationSelect={selectOrganization}
                disabled={isLoading}
              />
            </div>
            <div className="gap-4 flex items-center">
              <ModeToggle />
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="p-8 text-center max-w-md">
              <h2 className="text-xl font-semibold mb-2">Select Organization</h2>
              <p className="text-muted-foreground">
                Please select an organization to view and manage warehouses.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar />
      <div className="flex flex-col flex-1 min-h-0">
        <header className="flex items-center justify-between px-6 py-4 h-[50px] w-full gap-4">
          <BreadcrumbHeader />
          <div className="flex-1 max-w-xs">
            <OrganizationSelector
              organizations={orgs}
              selectedOrgId={selectedOrgId}
              onOrganizationSelect={selectOrganization}
              disabled={false}
            />
          </div>
          <SearchBar />
          <NotificationDropdown />
          <div className="gap-4 flex items-center">
            <ModeToggle />
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </header>
        <Separator />

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-4 md:p-8 pt-6">
            {error && (
              <ErrorAlert
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {warehouses.length > 0 && <WarehouseStats warehouses={warehouses} />}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 gap-4">
              <div className="flex items-center gap-2">
                {canCreateWarehouse && (
                  <Button onClick={() => setIsDialogOpen(true)} disabled={isLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Warehouse
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => fetchWarehouses(true)}
                  disabled={isRefreshing}
                >
                  <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {isLoading ? (
              <LoadingSpinner message="Loading warehouses..." showCard={false} />
            ) : warehouses.length === 0 ? (
              <EmptyState
                onAddWarehouse={
                  canCreateWarehouse ? () => setIsDialogOpen(true) : undefined
                }
              />

            ) : (
              <WarehouseGrid
                warehouses={warehouses}
                onRefresh={fetchWarehouses}
                orgId={selectedOrgId}
              />
            )}

            {canCreateWarehouse && (
              <AddWarehouseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleAddWarehouse}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
