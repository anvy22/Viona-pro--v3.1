"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCcw, Search } from "lucide-react";

import DesktopSidebar from "@/components/DesktopSidebar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { ModeToggle } from "@/components/ThemeModeToggle";
import { Separator } from "@/components/ui/separator";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { SearchBar } from "@/components/SearchBar";
import { OrganizationSelector } from "@/app/organization/components/OrganizationSelector";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { useOrgStore, useCurrentOrgRole } from "@/hooks/useOrgStore";
import { getWorkflowsForOrg, deleteWorkflowById } from "./workflow-actions";
import { WorkflowListItem } from "./types";

import { WorkflowCard } from "./components/WorkflowCard";
import { CreateWorkflowModal } from "./components/CreateWorkflowModal";
import { EmptyState } from "./components/EmptyState";

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { selectedOrgId, orgs, setSelectedOrgId } = useOrgStore();
    const role = useCurrentOrgRole();
    const isRoleLoaded = role !== undefined;

    const isAdmin = role === "admin";

    const canView = isRoleLoaded;
    const canCreate = isRoleLoaded && isAdmin;

    const selectOrganization = useCallback(
        (orgId: string | null) => setSelectedOrgId(orgId),
        [setSelectedOrgId]
    );

    const fetchWorkflows = useCallback(
        async (refresh = false) => {
            if (!selectedOrgId) return;

            refresh ? setIsRefreshing(true) : setIsLoading(true);

            try {
                const data = await getWorkflowsForOrg(selectedOrgId);
                setWorkflows(data as unknown as WorkflowListItem[]);

                if (refresh) toast.success("Workflows refreshed");
            } catch (error) {
                console.error("Failed to load workflows:", error);
                toast.error("Failed to load workflows");
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [selectedOrgId]
    );

    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    // Filter workflows based on search query
    const filteredWorkflows = workflows.filter(w => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            w.name.toLowerCase().includes(query) ||
            (w.description?.toLowerCase() || "").includes(query)
        );
    });

    /* --------- EMPTY ORG STATES (same as warehouse) --------- */

    if (orgs.length === 0) {
        return (
            <div className="flex h-screen overflow-hidden">
                <DesktopSidebar />
                <div className="flex flex-col flex-1">
                    <header className="flex items-center justify-between px-6 py-4 h-16">
                        <BreadcrumbHeader />
                        <div className="flex items-center gap-4">
                            <ModeToggle />
                            <SignedIn><UserButton /></SignedIn>
                        </div>
                    </header>
                    <div className="flex-1 flex items-center justify-center">
                        <Card className="p-8 text-center max-w-md">
                            <h2 className="text-xl font-semibold">No Organization Found</h2>
                            <p className="text-muted-foreground mt-2">
                                Create or join an organization to manage workflows.
                            </p>
                            <Button className="mt-4" onClick={() => location.href = "/organization"}>
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
                <div className="flex flex-col flex-1">
                    <header className="flex items-center justify-between px-6 py-4 h-16">
                        <BreadcrumbHeader />
                        <OrganizationSelector
                            organizations={orgs}
                            selectedOrgId={selectedOrgId}
                            onOrganizationSelect={selectOrganization}
                        />
                        <div className="flex items-center gap-4">
                            <ModeToggle />
                            <SignedIn><UserButton /></SignedIn>
                        </div>
                    </header>
                    <div className="flex-1 flex items-center justify-center">
                        <Card className="p-8 text-center max-w-md">
                            <h2 className="text-xl font-semibold">Select Organization</h2>
                            <p className="text-muted-foreground">
                                Choose an organization to view workflows.
                            </p>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    /* --------- MAIN VIEW --------- */

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

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search workflows..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        {canCreate && (
                            <Button onClick={() => setIsCreateOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Workflow
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={() => fetchWorkflows(true)}
                            disabled={isRefreshing}
                        >
                            <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>

                    {isLoading ? (
                        <p className="text-muted-foreground">Loading workflows...</p>
                    ) : filteredWorkflows.length === 0 ? (
                        searchQuery ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No workflows found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            <EmptyState onCreate={canCreate ? () => setIsCreateOpen(true) : undefined} />
                        )
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredWorkflows.map(w => (
                                <WorkflowCard
                                    key={w.id}
                                    workflow={w}
                                    onUpdate={fetchWorkflows}
                                    onDelete={fetchWorkflows}
                                    canManage={isAdmin}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {canCreate && (
                    <CreateWorkflowModal
                        open={isCreateOpen}
                        onOpenChange={setIsCreateOpen}
                        orgId={selectedOrgId}
                        userId="user_demo"
                        onCreated={fetchWorkflows}
                    />
                )}
            </div>
        </div>
    );
}
