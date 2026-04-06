/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/src/elements/ui/badge";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { useGetTemplatesQuery } from "@/src/redux/api/templateApi";
import { useAppSelector } from "@/src/redux/hooks";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown, ChevronUp, FileText, Image, LayoutTemplate, Loader2, RefreshCw, Search, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
}

interface WaTemplate {
  id: string;
  name: string;
  language: string;
  status: string; // DB stores lowercase: "approved" | "pending" | "rejected"
  category: string;
  components: TemplateComponent[];
}

interface VariableMapping {
  component: "header" | "body" | "footer" | "button";
  index: number;
  value: string;
}

interface NodeData {
  wabaId?: string;
  templateId?: string;
  templateName?: string;
  language?: string;
  variableMappings?: VariableMapping[];
  headerMediaUrl?: string;
  forceValidation?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractVars(text: string): number[] {
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
  return [...new Set(matches.map((m) => parseInt(m[1])))].sort((a, b) => a - b);
}

function buildRequiredMappings(template: WaTemplate): VariableMapping[] {
  const mappings: VariableMapping[] = [];
  template.components.forEach((comp) => {
    // Bug fix: extract variables from button URLs (CALL_TO_ACTION dynamic URLs)
    if (comp.type === "BUTTONS" && comp.buttons) {
      comp.buttons.forEach((btn) => {
        if (btn.url) {
          extractVars(btn.url).forEach((idx) => {
            if (!mappings.some((m) => m.component === "button" && m.index === idx)) {
              mappings.push({ component: "button", index: idx, value: "" });
            }
          });
        }
      });
      return;
    }
    if (!comp.text) return;
    // Bug fix: FOOTER correctly maps to "footer", not "button"
    const section: VariableMapping["component"] =
      comp.type === "HEADER" ? "header" :
      comp.type === "BODY" ? "body" :
      comp.type === "FOOTER" ? "footer" : "button";
    extractVars(comp.text).forEach((idx) => {
      mappings.push({ component: section, index: idx, value: "" });
    });
  });
  return mappings;
}

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  rejected: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "bg-purple-100 text-purple-700",
  marketing: "bg-purple-100 text-purple-700",
  UTILITY: "bg-blue-100 text-blue-700",
  utility: "bg-blue-100 text-blue-700",
  AUTHENTICATION: "bg-orange-100 text-orange-700",
  authentication: "bg-orange-100 text-orange-700",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SendWaTemplateNode({ data, id }: { data: NodeData; id: string }) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // ── Get wabaId from Redux store ──────────────────────────────────────────
  // wabaId comes from node data (passed by FlowCanvas) OR fallback to selectedWorkspace
  const { selectedWorkspace } = useAppSelector((state) => state.workspace);
  const wabaId: string = data.wabaId || selectedWorkspace?.waba_id || "";

  // ── Fetch APPROVED templates via RTK Query ────────────────────────────────
  const {
    data: templatesResponse,
    isLoading: loading,
    isError,
    refetch,
  } = useGetTemplatesQuery(
    { waba_id: wabaId, status: "APPROVED" },
    { skip: !wabaId }
  );

  // Map backend Template type → WaTemplate shape used internally
  // DB stores template as flat fields (message_body, header, buttons) — build components array
  const templates: WaTemplate[] = (templatesResponse?.data || []).map((t: any) => {
    let components: TemplateComponent[] = [];

    if (t.components?.length) {
      // Already in WhatsApp components format
      components = t.components;
    } else {
      // Build from flat DB fields
      if (t.header) {
        components.push({
          type: "HEADER",
          format: t.header.format || "TEXT",
          text: t.header.text || "",
        });
      }
      if (t.message_body) {
        components.push({ type: "BODY", text: t.message_body });
      }
      if (t.footer_text) {
        components.push({ type: "FOOTER", text: t.footer_text });
      }
      if (t.buttons?.length) {
        components.push({ type: "BUTTONS", buttons: t.buttons });
      }
    }

    return {
      id: t._id,
      name: t.template_name || t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      components,
    };
  });

  const fetchError = isError ? "Failed to load templates" : "";

  const selectedTemplate: WaTemplate | null =
    templates.find((t) => t.id === data.templateId) ?? null;

  const variableMappings: VariableMapping[] = data.variableMappings || [];

  // ── Data updater ──────────────────────────────────────────────────────────

  const updateNodeData = (field: string, value: any) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Select a template ─────────────────────────────────────────────────────

  const selectTemplate = (tpl: WaTemplate) => {
    const required = buildRequiredMappings(tpl);
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                templateId: tpl.id,
                templateName: tpl.name,
                language: tpl.language,
                variableMappings: required,
                headerMediaUrl: "",
              },
            }
          : node
      )
    );
    setPickerOpen(false);
    setSearch("");
    setPreviewOpen(true);
  };

  // ── Update a single variable mapping ─────────────────────────────────────

  const updateMapping = (component: VariableMapping["component"], index: number, value: string) => {
    if (!touched) setTouched(true);
    const next = variableMappings.map((m) =>
      m.component === component && m.index === index ? { ...m, value } : m
    );
    updateNodeData("variableMappings", next);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const needsMediaUrl =
    selectedTemplate?.components.find((c) => c.type === "HEADER")?.format &&
    selectedTemplate.components.find((c) => c.type === "HEADER")?.format !== "TEXT";

  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (!data.templateId) errors.push("A template must be selected");
    if (needsMediaUrl && !data.headerMediaUrl?.trim())
      errors.push("Header media URL is required");
    variableMappings.forEach((m) => {
      if (!m.value?.trim())
        errors.push(`{{${m.index}}} in ${m.component} is required`);
    });
  }

  // ── Filtered template list ────────────────────────────────────────────────

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.language.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Preview interpolation ─────────────────────────────────────────────────

  const interpolate = (text: string, section: VariableMapping["component"]) => {
    return text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
      const m = variableMappings.find(
        (vm) => vm.component === section && vm.index === parseInt(n)
      );
      return m?.value ? `[${m.value}]` : `{{${n}}}`;
    });
  };

  const headerComp = selectedTemplate?.components.find((c) => c.type === "HEADER");
  const bodyComp = selectedTemplate?.components.find((c) => c.type === "BODY");
  const footerComp = selectedTemplate?.components.find((c) => c.type === "FOOTER");
  const buttonsComp = selectedTemplate?.components.find((c) => c.type === "BUTTONS");

  const headerMappings = variableMappings.filter((m) => m.component === "header");
  const bodyMappings = variableMappings.filter((m) => m.component === "body");
  const footerMappings = variableMappings.filter((m) => m.component === "footer");
  const buttonMappings = variableMappings.filter((m) => m.component === "button");

  // ── No wabaId guard ───────────────────────────────────────────────────────

  if (!wabaId) {
    return (
      <BaseNode
        id={id}
        title="Send WA Template"
        icon={<LayoutTemplate size={18} />}
        iconBgColor="bg-green-100"
        iconColor="text-green-600"
        borderColor="border-green-200"
        handleColor="bg-green-500!"
        errors={["No WABA connection found"]}
      >
        <div className="py-4 text-center text-xs text-red-500">
          No WhatsApp Business Account connected. Please configure a WABA connection first.
        </div>
      </BaseNode>
    );
  }

  return (
    <BaseNode
      id={id}
      title="Send WA Template"
      icon={<LayoutTemplate size={18} />}
      iconBgColor="bg-green-100"
      iconColor="text-green-600"
      borderColor="border-green-200"
      handleColor="bg-green-500!"
      errors={errors}
    >
      {/* ── Template Selector ── */}
      <NodeField
        label="Select Template"
        required
        error={(touched || data.forceValidation) && !data.templateId ? "Required" : ""}
      >
        <div className="relative" ref={pickerRef}>
          {/* Trigger button */}
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className={`w-full flex items-center justify-between h-9 px-3 rounded-md border text-sm transition-colors bg-(--input-color) dark:bg-(--page-body-bg) ${
              pickerOpen
                ? "border-green-400 ring-1 ring-green-300"
                : "border-gray-200 dark:border-(--card-border-color) hover:border-gray-300"
            }`}
          >
            {selectedTemplate ? (
              <div className="flex items-center gap-2 min-w-0">
                <LayoutTemplate size={13} className="text-green-600 shrink-0" />
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                  {selectedTemplate.name}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">{selectedTemplate.language}</span>
                <Badge className={`text-[9px] h-4 px-1.5 shrink-0 ${STATUS_COLORS[selectedTemplate.status]}`}>
                  {selectedTemplate.status}
                </Badge>
              </div>
            ) : (
              <span className="text-gray-400">Choose a template...</span>
            )}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {loading ? (
                <Loader2 size={13} className="text-gray-400 animate-spin" />
              ) : (
                <ChevronDown size={13} className="text-gray-400" />
              )}
            </div>
          </button>

          {/* Dropdown picker */}
          {pickerOpen && (
            <div className="absolute z-50 top-10 left-0 right-0 rounded-lg border border-gray-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) shadow-lg overflow-hidden">
              {/* Search + refresh */}
              <div className="flex items-center gap-1 p-2 border-b border-gray-100 dark:border-(--card-border-color)">
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates..."
                    className="h-7 pl-6 text-xs bg-(--input-color)"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={() => refetch()}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-gray-400 hover:text-green-600"
                  title="Refresh"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </Button>
              </div>

              {/* Template list */}
              <div className="max-h-52 overflow-y-auto">
                {loading && templates.length === 0 ? (
                  <div className="py-6 flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-xs">Loading templates…</span>
                  </div>
                ) : fetchError ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-red-500 mb-2">{fetchError}</p>
                    <Button onClick={() => refetch()} variant="outline" size="sm" className="h-6 text-xs">
                      Retry
                    </Button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    {search ? "No templates match your search" : "No approved templates found"}
                  </div>
                ) : (
                  filtered.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => selectTemplate(tpl)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-green-50 dark:hover:bg-(--table-hover) transition-colors border-b border-gray-50 dark:border-(--card-border-color) last:border-0 ${
                        data.templateId === tpl.id ? "bg-green-50 dark:bg-(--table-hover)" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {tpl.name}
                        </span>
                        <Badge className={`text-[9px] h-4 px-1.5 shrink-0 ${STATUS_COLORS[tpl.status] ?? ""}`}>
                          {tpl.status}
                        </Badge>
                        {tpl.category && (
                          <Badge className={`text-[9px] h-4 px-1.5 shrink-0 ${CATEGORY_COLORS[tpl.category] ?? "bg-gray-100 text-gray-600"}`}>
                            {tpl.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{tpl.language}</span>
                        <span>·</span>
                        <span>{tpl.components.map((c) => c.type).join(", ")}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </NodeField>

      {/* ── Template Preview (collapsible) ── */}
      {selectedTemplate && (
        <div className="rounded-lg border border-green-100 dark:border-(--card-border-color) overflow-hidden">
          <button
            type="button"
            onClick={() => setPreviewOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-(--dark-sidebar) hover:bg-green-100 dark:hover:bg-(--table-hover) transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-green-600" />
              <span className="text-[11px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
                Template Preview
              </span>
            </div>
            {previewOpen ? (
              <ChevronUp size={13} className="text-green-500" />
            ) : (
              <ChevronDown size={13} className="text-green-500" />
            )}
          </button>

          {previewOpen && (
            <div className="p-3 bg-white dark:bg-(--card-color) border-t border-green-100 dark:border-(--card-border-color)">
              <div className="bg-[#dcf8c6] dark:bg-[#1f4734] rounded-xl rounded-tl-none p-3 space-y-1.5 shadow-sm max-w-[90%]">
                {headerComp && (
                  <div className="font-semibold text-[11px] text-gray-800 dark:text-gray-200">
                    {headerComp.format === "IMAGE" && (
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Image size={14} /> <span>Image</span>
                        {data.headerMediaUrl && (
                          <span className="text-[10px] text-green-600 truncate max-w-[120px]">{data.headerMediaUrl}</span>
                        )}
                      </div>
                    )}
                    {headerComp.format === "VIDEO" && (
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Video size={14} /> <span>Video</span>
                        {data.headerMediaUrl && (
                          <span className="text-[10px] text-green-600 truncate max-w-[120px]">{data.headerMediaUrl}</span>
                        )}
                      </div>
                    )}
                    {headerComp.format === "DOCUMENT" && (
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <FileText size={14} /> <span>Document</span>
                        {data.headerMediaUrl && (
                          <span className="text-[10px] text-green-600 truncate max-w-[120px]">{data.headerMediaUrl}</span>
                        )}
                      </div>
                    )}
                    {(headerComp.format === "TEXT" || !headerComp.format) && headerComp.text && (
                      <span>{interpolate(headerComp.text, "header")}</span>
                    )}
                  </div>
                )}
                {bodyComp?.text && (
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {interpolate(bodyComp.text, "body")}
                  </p>
                )}
                {footerComp?.text && (
                  <p className="text-[10px] text-gray-400 italic">{footerComp.text}</p>
                )}
                {buttonsComp?.buttons && (
                  <div className="mt-2 pt-2 border-t border-[#b2dfac] dark:border-[#2d5a42] space-y-1">
                    {buttonsComp.buttons.map((btn, i) => (
                      <div key={i} className="text-center text-[11px] text-[#00a884] dark:text-[#00d094] font-semibold py-1 rounded-md bg-white/50 dark:bg-black/20">
                        {btn.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-400">
                  Category: <span className="font-semibold">{selectedTemplate.category}</span>
                </span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-[10px] text-gray-400">
                  Lang: <span className="font-semibold">{selectedTemplate.language}</span>
                </span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className={`text-[10px] font-semibold ${selectedTemplate.status.toLowerCase() === "approved" ? "text-emerald-600" : "text-amber-600"}`}>
                  {selectedTemplate.status}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Header Media URL (Bug fix: required for IMAGE/VIDEO/DOCUMENT headers) ── */}
      {selectedTemplate && needsMediaUrl && (
        <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
          <NodeField
            label={`Header ${headerComp?.format === "IMAGE" ? "Image" : headerComp?.format === "VIDEO" ? "Video" : "Document"} URL`}
            required
            error={(touched || data.forceValidation) && !data.headerMediaUrl?.trim() ? "Required" : ""}
          >
            <Input
              value={data.headerMediaUrl || ""}
              onFocus={() => setTouched(true)}
              onChange={(e) => updateNodeData("headerMediaUrl", e.target.value)}
              placeholder="https://example.com/media-file"
              className="h-8 text-xs bg-(--input-color)"
            />
          </NodeField>
        </div>
      )}

      {/* ── Variable Mappings ── */}
      {selectedTemplate && variableMappings.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-400">
            Fill Template Variables
          </Label>
          <p className="text-[10px] text-gray-400 italic -mt-1">
            Use{" "}
            <code className="bg-gray-100 dark:bg-(--dark-sidebar) px-1 rounded text-[10px]">
              {"{{variable_name}}"}
            </code>{" "}
            or enter a static value
          </p>

          {headerMappings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Header</p>
              {headerMappings.map((m) => (
                <NodeField key={`h-${m.index}`} label={`{{${m.index}}}`} required
                  error={(touched || data.forceValidation) && !m.value?.trim() ? "Required" : ""}
                >
                  <Input value={m.value} onFocus={() => setTouched(true)}
                    onChange={(e) => updateMapping("header", m.index, e.target.value)}
                    placeholder={`Value for {{${m.index}}} in header`}
                    className="h-8 text-xs bg-(--input-color)" />
                </NodeField>
              ))}
            </div>
          )}

          {bodyMappings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Body</p>
              {bodyMappings.map((m) => (
                <NodeField key={`b-${m.index}`} label={`{{${m.index}}}`} required
                  error={(touched || data.forceValidation) && !m.value?.trim() ? "Required" : ""}
                >
                  <Input value={m.value} onFocus={() => setTouched(true)}
                    onChange={(e) => updateMapping("body", m.index, e.target.value)}
                    placeholder={`e.g. {{contact_name}}`}
                    className="h-8 text-xs bg-(--input-color)" />
                </NodeField>
              ))}
            </div>
          )}

          {footerMappings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Footer</p>
              {footerMappings.map((m) => (
                <NodeField key={`f-${m.index}`} label={`{{${m.index}}}`} required
                  error={(touched || data.forceValidation) && !m.value?.trim() ? "Required" : ""}
                >
                  <Input value={m.value} onFocus={() => setTouched(true)}
                    onChange={(e) => updateMapping("footer", m.index, e.target.value)}
                    placeholder={`Value for {{${m.index}}} in footer`}
                    className="h-8 text-xs bg-(--input-color)" />
                </NodeField>
              ))}
            </div>
          )}

          {buttonMappings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Buttons</p>
              {buttonMappings.map((m) => (
                <NodeField key={`btn-${m.index}`} label={`{{${m.index}}}`} required
                  error={(touched || data.forceValidation) && !m.value?.trim() ? "Required" : ""}
                >
                  <Input value={m.value} onFocus={() => setTouched(true)}
                    onChange={(e) => updateMapping("button", m.index, e.target.value)}
                    placeholder={`Value for button URL {{${m.index}}}`}
                    className="h-8 text-xs bg-(--input-color)" />
                </NodeField>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTemplate && variableMappings.length === 0 && (
        <div className="py-2 rounded-lg bg-emerald-50 dark:bg-(--dark-sidebar) border border-emerald-100 dark:border-(--card-border-color) flex items-center justify-center">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            ✓ No variable substitutions needed
          </span>
        </div>
      )}

      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="flex items-center gap-2 text-[10px] text-green-600 font-medium">
          <LayoutTemplate size={11} />
          <span>Only Meta-approved templates can be delivered</span>
        </div>
      </div>
    </BaseNode>
  );
}