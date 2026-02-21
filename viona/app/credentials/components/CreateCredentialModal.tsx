import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CredentialType } from "@prisma/client";
import { createCredential } from "../credentials-actions";

const CREDENTIAL_TYPES = [
    { value: "OPENAI", label: "OpenAI" },
    { value: "ANTHROPIC", label: "Anthropic" },
    { value: "GEMINI", label: "Google Gemini" }
] as const;

interface CreateCredentialModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onCreated: () => void;
}

export function CreateCredentialModal({ open, onOpenChange, orgId, onCreated }: CreateCredentialModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState("");
    const [value, setValue] = useState("");
    const [type, setType] = useState<CredentialType | "">("");

    const handleCreate = async () => {
        if (!name.trim()) return toast.error("Please enter a name");
        if (!type) return toast.error("Please select a provider type");
        if (!value.trim()) return toast.error("Please enter the API key");
        if (!orgId) return toast.error("No organization selected");

        setIsSubmitting(true);

        try {
            await createCredential({
                name,
                type: type as CredentialType,
                value,
                orgId
            });

            toast.success("Credential created securely");
            onCreated();

            // Reset form
            setName("");
            setValue("");
            setType("");
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create credential. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add API Credential</DialogTitle>
                    <DialogDescription>
                        Securely store API keys for use across your workflows. Keys are encrypted at rest.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Production OpenAI Key"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="provider">Provider Type</Label>
                        <Select
                            value={type}
                            onValueChange={(val: CredentialType) => setType(val)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a provider..." />
                            </SelectTrigger>
                            <SelectContent>
                                {CREDENTIAL_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="key">API Key</Label>
                        <Input
                            id="key"
                            type="password"
                            placeholder="sk-..."
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            "Save Credential"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
