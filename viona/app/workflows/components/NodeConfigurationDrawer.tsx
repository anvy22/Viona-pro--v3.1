import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { WorkflowNode } from "../types"; // Correct path
import { getNodeDefinition } from "../action"; // Correct path
import { Input } from "@/components/ui/input"; // Assuming you have these
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Props {
    node: WorkflowNode | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (node: WorkflowNode) => void;
    readOnly?: boolean;
}

export default function NodeConfigurationDrawer({
    node,
    isOpen,
    onClose,
    onUpdate,
    readOnly,
}: Props) {
    if (!node || !isOpen) return null;

    const definition = getNodeDefinition(node.type);
    if (!definition) return null;

    const Icon = definition.icon;

    const handleChange = (field: string, value: any) => {
        onUpdate({
            ...node,
            data: {
                ...node.data,
                [field]: value
            }
        });
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-background border-l shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">{definition.label}</h2>
                        <p className="text-xs text-muted-foreground">{node.id}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Body */}
            <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Configuration</h3>

                        {definition.settings?.map((setting) => (
                            <div key={setting.name} className="space-y-2">
                                <Label>{setting.label}</Label>

                                {setting.kind === "text" && (
                                    <Input
                                        disabled={readOnly}
                                        value={node.data[setting.name] || ""}
                                        onChange={(e) => handleChange(setting.name, e.target.value)}
                                        placeholder={setting.placeholder}
                                    />
                                )}

                                {setting.kind === "textarea" && (
                                    <Textarea
                                        disabled={readOnly}
                                        value={node.data[setting.name] || ""}
                                        onChange={(e) => handleChange(setting.name, e.target.value)}
                                        rows={setting.rows || 3}
                                    />
                                )}

                                {setting.kind === "select" && (
                                    <Select
                                        disabled={readOnly}
                                        value={node.data[setting.name]}
                                        onValueChange={(val) => handleChange(setting.name, val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {setting.options.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {setting.kind === "boolean" && (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={!!node.data[setting.name]} // Ensure boolean
                                            onCheckedChange={(checked) => handleChange(setting.name, checked)}
                                            disabled={readOnly}
                                        />
                                        <Label className="font-normal text-muted-foreground">
                                            {node.data[setting.name] ? "Enabled" : "Disabled"}
                                        </Label>
                                    </div>
                                )}
                            </div>
                        ))}

                        {(!definition.settings || definition.settings.length === 0) && (
                            <p className="text-sm text-muted-foreground italic">No configuration available for this node.</p>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/10">
                <Button className="w-full" onClick={onClose}>Done</Button>
            </div>
        </div>
    );
}
