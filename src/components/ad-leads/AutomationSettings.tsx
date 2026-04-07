"use client";

import { Button } from "@/src/elements/ui/button";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { useGetSourcesQuery, useUpdateSourceAutomationMutation } from "@/src/redux/api/AdleadsApi";
import { AdLeadSource, UpdateAutomationPayload } from "@/src/types/Adleads";
import {
    ArrowLeft,
    Bot,
    CheckCircle2,
    Loader2,
    Megaphone,
    MessageCircle,
    Save,
    Tag,
    User,
    Zap,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useGetCampaignsQuery } from "@/src/redux/api/campaignApi";
import { useGetTemplatesQuery } from "@/src/redux/api/templateApi";
import { useGetChatbotsQuery } from "@/src/redux/api/chatbotApi"; // ✅ single import, no baseApi
import { useGetTagsQuery } from "@/src/redux/api/tagsApi";
import { useAppSelector } from "@/src/redux/hooks";

// 


interface AutomationRule {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    key: keyof UpdateAutomationPayload;
    type: "toggle" | "select" | "multiselect";
    selectKey?: keyof UpdateAutomationPayload;
}

const RULES: AutomationRule[] = [
    {
        id: "contact",
        label: "Save as Contact",
        description: "Automatically save every new lead as a contact in your contact list",
        icon: <User size={18} />,
        iconBg: "bg-primary/10 text-primary",
        key: "save_as_contact",
        type: "toggle",
    },
    {
        id: "whatsapp",
        label: "Send WhatsApp Message",
        description: "Auto-send a WhatsApp template message when a new lead is captured",
        icon: <MessageCircle size={18} />,
        iconBg: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
        key: "send_whatsapp_template_id",
        type: "select",
    },
    {
        id: "campaign",
        label: "Add to Campaign",
        description: "Automatically add the lead's contact to a specific campaign",
        icon: <Megaphone size={18} />,
        iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        key: "add_to_campaign_id",
        type: "select",
    },
    {
        id: "chatbot",
        label: "Trigger Chatbot Flow",
        description: "Automatically start a chatbot conversation flow for the new lead",
        icon: <Bot size={18} />,
        iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
        key: "trigger_chatbot_id",
        type: "select",
    },
    {
        id: "tags",
        label: "Assign Tags",
        description: "Automatically assign tags to the contact created from this lead",
        icon: <Tag size={18} />,
        iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        key: "assign_tag_ids",
        type: "multiselect",
    },
];

const AutomationSettings = () => {
    const router = useRouter();
    const params = useParams();
    const sourceId = params?.id as string;
    const { selectedWorkspace } = useAppSelector((state) => state.workspace);
    const isBaileys = selectedWorkspace?.waba_type === "baileys";
    const wabaId = selectedWorkspace?.waba_id || "";
    const { data: sourcesResult, isLoading: isSourcesLoading } = useGetSourcesQuery();
    const source: AdLeadSource | undefined = sourcesResult?.data?.find((s) => s._id === sourceId);

    const [updateAutomation, { isLoading: isSaving }] = useUpdateSourceAutomationMutation();

    // ✅ All hooks at top level, chatbotsData now properly destructured
    const skip = !wabaId;
    const { data: templatesData } = useGetTemplatesQuery({ waba_id: wabaId, status: "approved" }, { skip });
    const { data: campaignsData } = useGetCampaignsQuery({});
     const { data: chatbotsData, isLoading: loadingChatbots } = useGetChatbotsQuery({ waba_id: wabaId }, { skip });
    const { data: tagsData } = useGetTagsQuery({});

    const templates = templatesData?.data || [];
    const campaigns = campaignsData?.data || [];
    const chatbots = chatbotsData?.data || [];
    const tags = tagsData?.data || [];

    const [form, setForm] = useState<UpdateAutomationPayload>({
        save_as_contact: true,
        send_whatsapp_template_id: null,
        add_to_campaign_id: null,
        trigger_chatbot_id: null,
        assign_tag_ids: [],
    });

    useEffect(() => {
        if (source?.automation) {
            setForm({
                save_as_contact: source.automation.save_as_contact ?? true,
                send_whatsapp_template_id: source.automation.send_whatsapp_template_id ?? null,
                add_to_campaign_id: source.automation.add_to_campaign_id ?? null,
                trigger_chatbot_id: source.automation.trigger_chatbot_id ?? null,
                assign_tag_ids: source.automation.assign_tag_ids ?? [],
            });
        }
    }, [source]);

    const handleToggle = (key: keyof UpdateAutomationPayload) => {
        setForm((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelect = (key: keyof UpdateAutomationPayload, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value === "none" ? null : value }));
    };

    const handleTagToggle = (tagId: string) => {
        setForm((prev) => {
            const current = prev.assign_tag_ids || [];
            const exists = current.includes(tagId);
            return {
                ...prev,
                assign_tag_ids: exists ? current.filter((t) => t !== tagId) : [...current, tagId],
            };
        });
    };

    const handleSave = async () => {
        try {
            await updateAutomation({ id: sourceId, automation: form }).unwrap();
            toast.success("Automation rules saved successfully!");
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || "Failed to save automation rules");
        }
    };

    if (isSourcesLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="animate-spin text-primary" size={36} />
                <p className="text-gray-500 text-sm">Loading source...</p>
            </div>
        );
    }

    if (!source) {
        return (
            <div className="p-8 text-center py-20">
                <h3 className="text-lg font-semibold">Source not found</h3>
                <Button onClick={() => router.push("/ad-leads")} className="mt-4">
                    Back to Sources
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-lg border border-slate-200 bg-white dark:bg-(--card-color) dark:border-(--card-border-color) shadow-sm hover:bg-slate-50 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-amber-50 tracking-tight">
                            Automation Rules
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                            <span className="text-primary font-bold">{source.name}</span> · {source.source_type}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="flex-1 sm:flex-none h-11 px-6 rounded-lg font-semibold border-slate-200 dark:border-(--card-border-color)"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 sm:flex-none h-11 px-8 rounded-lg font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
                    >
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={16} className="mr-2" />}
                        Save Rules
                    </Button>
                </div>
            </div>

            {/* Info banner */}
            <div className="p-4 bg-primary/5 border border-primary/15 rounded-lg flex items-start gap-3 mb-8">
                <Zap size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-primary">Auto-run on every new lead</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        These rules will run automatically whenever a new lead is captured from{" "}
                        <span className="font-semibold">{source.name}</span>.
                    </p>
                </div>
            </div>

            {/* Rules */}
            <div className="space-y-5">
                {RULES.map((rule) => {
                    const isEnabled =
                        rule.type === "toggle"
                            ? !!form[rule.key]
                            : rule.type === "multiselect"
                                ? (form.assign_tag_ids?.length ?? 0) > 0
                                : !!form[rule.key];

                    return (
                        <section
                            key={rule.id}
                            className={`bg-white dark:bg-(--card-color) rounded-lg border shadow-sm transition-all duration-200 ${isEnabled
                                    ? "border-primary/20 dark:border-primary/20"
                                    : "border-slate-200/60 dark:border-(--card-border-color)"
                                }`}
                        >
                            {/* Rule header */}
                            <div className="flex items-start justify-between p-5 gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`p-2.5 rounded-lg shrink-0 ${rule.iconBg}`}>
                                        {rule.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                            {rule.label}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                            {rule.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Toggle */}
                                {rule.type === "toggle" && (
                                    <button
                                        onClick={() => handleToggle(rule.key)}
                                        disabled={rule.key === "save_as_contact"}
                                        className={`relative w-11 h-6 rounded-full transition-all shrink-0 mt-0.5 ${form[rule.key] ? "bg-primary" : "bg-slate-200 dark:bg-(--dark-body)"
                                            } ${rule.key === "save_as_contact"
                                                ? "opacity-60 cursor-not-allowed"
                                                : "cursor-pointer"
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[rule.key] ? "translate-x-5" : "translate-x-0.5"
                                                }`}
                                        />
                                    </button>
                                )}

                                {/* Select/multiselect toggle */}
                                {(rule.type === "select" || rule.type === "multiselect") && (
                                    <button
                                        onClick={() => {
                                            if (rule.type === "select") {
                                                handleSelect(rule.key, isEnabled ? "none" : "");
                                            } else {
                                                if (isEnabled) setForm((p) => ({ ...p, assign_tag_ids: [] }));
                                            }
                                        }}
                                        className={`relative w-11 h-6 rounded-full transition-all shrink-0 mt-0.5 cursor-pointer ${isEnabled ? "bg-primary" : "bg-slate-200 dark:bg-(--dark-body)"
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEnabled ? "translate-x-5" : "translate-x-0.5"
                                                }`}
                                        />
                                    </button>
                                )}
                            </div>

                            {/* WhatsApp template select */}
                            {rule.id === "whatsapp" && form.send_whatsapp_template_id !== null && (
                                <div className="px-5 pb-5 border-t border-slate-50 dark:border-slate-800/50 pt-4">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                                        Select Template
                                    </Label>
                                    <Select
                                        value={form.send_whatsapp_template_id || ""}
                                        onValueChange={(v) => handleSelect("send_whatsapp_template_id", v)}
                                    >
                                        <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                                            <SelectValue placeholder="Choose a WhatsApp template..." />
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                                            {templates.map((t) => (
                                                <SelectItem key={t._id} value={t._id} className="dark:hover:bg-(--table-hover)">
                                                    {t.template_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Campaign select */}
                            {rule.id === "campaign" && form.add_to_campaign_id !== null && (
                                <div className="px-5 pb-5 border-t border-slate-50 dark:border-slate-800/50 pt-4">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                                        Select Campaign
                                    </Label>
                                    <Select
                                        value={form.add_to_campaign_id || ""}
                                        onValueChange={(v) => handleSelect("add_to_campaign_id", v)}
                                    >
                                        <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                                            <SelectValue placeholder="Choose a campaign..." />
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                                            {campaigns.map((c: { _id: string; name: string }) => (
                                                <SelectItem key={c._id} value={c._id} className="dark:hover:bg-(--table-hover)">
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Chatbot select */}
                            {rule.id === "chatbot" && form.trigger_chatbot_id !== null && (
                                <div className="px-5 pb-5 border-t border-slate-50 dark:border-slate-800/50 pt-4">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                                        Select Chatbot
                                    </Label>
                                    <Select
                                        value={form.trigger_chatbot_id || ""}
                                        onValueChange={(v) => handleSelect("trigger_chatbot_id", v)}
                                    >
                                        <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                                            <SelectValue placeholder="Choose a chatbot flow..." />
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                                            {chatbots.map((b: { _id: string; name: string }) => (
                                                <SelectItem key={b._id} value={b._id} className="dark:hover:bg-(--table-hover)">
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Tags multiselect */}
                            {rule.id === "tags" && (
                                <div className="px-5 pb-5 border-t border-slate-50 dark:border-slate-800/50 pt-4">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">
                                        Select Tags
                                    </Label>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag: { _id: string; name: string; color?: string }) => {
                                            const selected = form.assign_tag_ids?.includes(tag._id);
                                            return (
                                                <button
                                                    key={tag._id}
                                                    onClick={() => handleTagToggle(tag._id)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selected
                                                            ? "bg-primary text-white border-primary"
                                                            : "bg-slate-50 dark:bg-(--dark-body) text-slate-600 dark:text-gray-400 border-slate-200 dark:border-(--card-border-color) hover:border-primary/40 hover:text-primary"
                                                        }`}
                                                >
                                                    {selected && <CheckCircle2 size={10} />}
                                                    {tag.name}
                                                </button>
                                            );
                                        })}
                                        {tags.length === 0 && (
                                            <p className="text-xs text-slate-400 italic">
                                                No tags found. Create tags first.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>

            {/* Bottom save */}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-(--card-border-color)">
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="h-11 px-6 rounded-lg font-semibold border-slate-200 dark:border-(--card-border-color)"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-11 px-8 rounded-lg font-bold bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={16} className="mr-2" />}
                    Save Rules
                </Button>
            </div>
        </div>
    );
};

export default AutomationSettings;