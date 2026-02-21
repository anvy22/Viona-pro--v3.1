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
import { getCredentialsForOrg, deleteCredential } from "./credentials-actions";
import { CredentialListItem } from "./types";

import { CredentialCard } from "./components/CredentialCard";
import { CreateCredentialModal } from "./components/CreateCredentialModal";
import { EmptyState } from "./components/EmptyState";

export default function CredentialsPage() {
    const [credentials, setCredentials] = useState<CredentialListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [credentialToEdit, setCredentialToEdit] = useState<CredentialListItem | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const { selectedOrgId, orgs, setSelectedOrgId } = useOrgStore();
    const role = useCurrentOrgRole();
    const isRoleLoaded = role !== undefined;

    const isAdmin = role === "admin";

    const canManage = isRoleLoaded && isAdmin;

    const selectOrganization = useCallback(
        (orgId: string | null) => setSelectedOrgId(orgId),
        [setSelectedOrgId]
    );

    const fetchCredentials = useCallback(
        async (refresh = false) => {
            if (!selectedOrgId) return;

            refresh ? setIsRefreshing(true) : setIsLoading(true);

            try {
                const data = await getCredentialsForOrg(selectedOrgId);
                setCredentials(data);

                if (refresh) toast.success("Credentials refreshed");
            } catch (error) {
                console.error("Failed to load credentials:", error);
                toast.error("Failed to load credentials");
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [selectedOrgId]
    );

    useEffect(() => {
        if (selectedOrgId) {
            fetchCredentials();
        }
    }, [fetchCredentials, selectedOrgId]);

    const handleDelete = async (id: string) => {
        if (!selectedOrgId) return;
        try {
            await deleteCredential(id, selectedOrgId);
            toast.success("Credential deleted successfully");
            fetchCredentials();
        } catch (error) {
            console.error("Failed to delete credential", error);
            toast.error("Failed to delete credential");
        }
    };

    // Filter credentials based on search query
    const filteredCredentials = credentials.filter(c => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            c.name.toLowerCase().includes(query) ||
            c.type.toLowerCase().includes(query)
        );
    });

    /* --------- EMPTY ORG STATES --------- */

    if (orgs.length === 0) {
        return (
            <div className="flex h-screen overflow-hidden bg-background">
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
                        <Card className="p-8 text-center max-w-md shadow-sm border">
                            <h2 className="text-xl font-semibold">No Organization Found</h2>
                            <p className="text-muted-foreground mt-2">
                                Create or join an organization to manage credentials.
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
            <div className="flex h-screen overflow-hidden bg-background">
                <DesktopSidebar />
                <div className="flex flex-col flex-1">
                    <header className="flex items-center justify-between px-6 py-4 h-16 border-b">
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
                        <Card className="p-8 text-center max-w-md shadow-sm border">
                            <h2 className="text-xl font-semibold">Select Organization</h2>
                            <p className="text-muted-foreground mt-2">
                                Choose an organization to view your secure credentials.
                            </p>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    /* --------- MAIN VIEW --------- */

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <DesktopSidebar />
            <div className="flex flex-col flex-1 min-h-0 relative">
                <header className="flex items-center justify-between px-6 py-4 h-[50px] w-full gap-4 relative z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center gap-2 flex-wrap justify-between">
                        <h1 className="text-2xl font-bold tracking-tight">API Credentials</h1>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search keys..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => fetchCredentials(true)}
                                disabled={isRefreshing}
                                title="Refresh"
                                className="w-10 px-0"
                            >
                                <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                            </Button>

                            {canManage && (
                                <Button onClick={() => {
                                    setCredentialToEdit(null);
                                    setIsCreateOpen(true);
                                }}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Credential
                                </Button>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <p className="text-muted-foreground text-sm animate-pulse">Loading secure credentials...</p>
                        </div>
                    ) : filteredCredentials.length === 0 ? (
                        searchQuery ? (
                            <div className="text-center py-12 bg-card border rounded-lg shadow-sm">
                                <p className="text-muted-foreground">No credentials found matching "{searchQuery}"</p>
                                <Button
                                    variant="link"
                                    onClick={() => setSearchQuery("")}
                                    className="mt-2"
                                >
                                    Clear search
                                </Button>
                            </div>
                        ) : (
                            <EmptyState onCreate={canManage ? () => {
                                setCredentialToEdit(null);
                                setIsCreateOpen(true);
                            } : undefined} />
                        )
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredCredentials.map(c => (
                                <CredentialCard
                                    key={c.id}
                                    credential={c}
                                    onDelete={() => handleDelete(c.id)}
                                    onEdit={() => {
                                        setCredentialToEdit(c);
                                        setIsCreateOpen(true);
                                    }}
                                    canManage={canManage}
                                />
                            ))}
                        </div>
                    )}
                </main>

                {canManage && (
                    <CreateCredentialModal
                        open={isCreateOpen}
                        onOpenChange={(open) => {
                            setIsCreateOpen(open);
                            if (!open) setCredentialToEdit(null);
                        }}
                        orgId={selectedOrgId}
                        onCreated={fetchCredentials}
                        credentialToEdit={credentialToEdit}
                    />
                )}
            </div>
        </div>
    );
}
