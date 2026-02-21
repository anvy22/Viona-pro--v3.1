"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, Plus } from "lucide-react";
import Link from "next/link";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CredentialType } from "@prisma/client";
import {
    getCredentialsByType,
    type CredentialOption,
} from "@/app/credentials/credentials-actions";

interface CredentialSelectorProps {
    orgId: string | null;
    credentialType: CredentialType;
    value: string | null;          // currently selected credentialId
    onChange: (id: string | null) => void;
}

const NONE_VALUE = "__none__";

export function CredentialSelector({
    orgId,
    credentialType,
    value,
    onChange,
}: CredentialSelectorProps) {
    const [options, setOptions] = useState<CredentialOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!orgId) return;
        setIsLoading(true);
        getCredentialsByType(orgId, credentialType)
            .then(setOptions)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [orgId, credentialType]);

    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                API Credential
            </Label>

            {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-9 px-3 border rounded-md bg-muted animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading keys…
                </div>
            ) : (
                <Select
                    value={value ?? NONE_VALUE}
                    onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an API key…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE_VALUE}>
                            <span className="text-muted-foreground">— Use environment variable —</span>
                        </SelectItem>
                        {options.length > 0 ? (
                            options.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))
                        ) : (
                            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                                No {credentialType} keys found.{" "}
                                <Link
                                    href="/credentials"
                                    target="_blank"
                                    className="underline text-primary"
                                >
                                    Add one <Plus className="inline w-3 h-3" />
                                </Link>
                            </div>
                        )}
                    </SelectContent>
                </Select>
            )}

            <p className="text-[0.75rem] text-muted-foreground leading-snug">
                {value
                    ? "This node will use the selected key stored in your credentials vault."
                    : "No key selected — the node will fall back to the server environment variable."}
            </p>
        </div>
    );
}
