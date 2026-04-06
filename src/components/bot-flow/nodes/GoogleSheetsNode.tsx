/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Sheet, X } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function GoogleSheetsNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const columnMappings: { column: string; value: string }[] = data.columnMappings || [];

  const updateNodeData = (field: string, value: any) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };

  const authMode: string = data.authMode || "service_account";

  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (authMode === "service_account" && !data.serviceAccountEmail?.trim())
      errors.push("Service account email is required");
    if (authMode === "api_key" && !data.apiKey?.trim())
      errors.push("API key is required");
    if (!data.spreadsheetId?.trim()) errors.push("Spreadsheet ID is required");
    if (!data.sheetName?.trim()) errors.push("Sheet name is required");
    if (columnMappings.length === 0) errors.push("At least one column mapping is required");
  }

  const addMapping = () => {
    if (!touched) setTouched(true);
    updateNodeData("columnMappings", [...columnMappings, { column: "", value: "" }]);
  };

  const removeMapping = (i: number) => {
    updateNodeData("columnMappings", columnMappings.filter((_, idx) => idx !== i));
  };

  const updateMapping = (i: number, field: "column" | "value", val: string) => {
    if (!touched) setTouched(true);
    updateNodeData(
      "columnMappings",
      columnMappings.map((m, idx) => (idx === i ? { ...m, [field]: val } : m))
    );
  };

  const isConfigured =
    authMode === "service_account"
      ? !!(data.serviceAccountEmail?.trim() && data.privateKey?.trim())
      : !!(data.apiKey?.trim());

  const actions = [
    { value: "append_row", label: "Append Row" },
    { value: "update_row", label: "Update Row" },
    { value: "find_and_update", label: "Find & Update" },
    { value: "find_and_delete", label: "Find & Delete" },
    { value: "read_row", label: "Read Row" },
  ];

  return (
    <BaseNode
      id={id}
      title="Google Sheets"
      icon={<Sheet size={18} />}
      iconBgColor="bg-emerald-100"
      iconColor="text-emerald-700"
      borderColor="border-emerald-200"
      handleColor="bg-emerald-500!"
      errors={errors}
    >
      {/* ── Google Account Configuration collapsible ── */}
      <div className="rounded-lg border border-emerald-100 dark:border-(--card-border-color) overflow-hidden">
        <button
          type="button"
          onClick={() => setConfigOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-(--dark-sidebar) hover:bg-emerald-100 dark:hover:bg-(--table-hover) transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sheet size={12} className="text-emerald-600" />
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Google Account Config
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                isConfigured
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {isConfigured ? "✓ Set" : "Required"}
            </span>
          </div>
          {configOpen ? <ChevronUp size={13} className="text-emerald-600" /> : <ChevronDown size={13} className="text-emerald-600" />}
        </button>

        {configOpen && (
          <div className="p-3 space-y-3 bg-white dark:bg-(--card-color) border-t border-emerald-100 dark:border-(--card-border-color)">
            {/* Auth mode selector */}
            <NodeField label="Authentication Method">
              <Select
                value={authMode}
                onValueChange={(v) => updateNodeData("authMode", v)}
                onOpenChange={() => setTouched(true)}
              >
                <SelectTrigger className="h-8 text-xs bg-(--input-color) dark:bg-(--page-body-bg)">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-(--page-body-bg)">
                  <SelectItem value="service_account" className="dark:hover:bg-(--card-color)">
                    Service Account (recommended)
                  </SelectItem>
                  <SelectItem value="api_key" className="dark:hover:bg-(--card-color)">
                    API Key (read-only sheets)
                  </SelectItem>
                  <SelectItem value="oauth" className="dark:hover:bg-(--card-color)">
                    OAuth 2.0
                  </SelectItem>
                </SelectContent>
              </Select>
            </NodeField>

            {/* Service Account fields */}
            {authMode === "service_account" && (
              <>
                <NodeField
                  label="Service Account Email"
                  required
                  error={(touched || data.forceValidation) && !data.serviceAccountEmail?.trim() ? "Required" : ""}
                >
                  <Input
                    value={data.serviceAccountEmail || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateNodeData("serviceAccountEmail", e.target.value)}
                    placeholder="my-bot@project-id.iam.gserviceaccount.com"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>

                <NodeField
                  label="Private Key (JSON key file)"
                  description='Paste the "private_key" value from your downloaded JSON'
                >
                  <div className="relative">
                    <Textarea
                      value={data.privateKey || ""}
                      onFocus={() => setTouched(true)}
                      onChange={(e) => updateNodeData("privateKey", e.target.value)}
                      placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                      className={`min-h-20 resize-none text-[10px] font-mono bg-(--input-color) dark:bg-(--page-body-bg) ${
                        !showKey ? "text-transparent [text-shadow:0_0_8px_rgba(0,0,0,0.5)]" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((s) => !s)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 italic">
                    Share your spreadsheet with the service account email before use
                  </p>
                </NodeField>
              </>
            )}

            {/* API Key field */}
            {authMode === "api_key" && (
              <NodeField
                label="Google API Key"
                required
                error={(touched || data.forceValidation) && !data.apiKey?.trim() ? "Required" : ""}
              >
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={data.apiKey || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateNodeData("apiKey", e.target.value)}
                    placeholder="AIzaSy..."
                    className="h-8 text-xs bg-(--input-color) pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 italic">
                  API keys only work on publicly shared spreadsheets
                </p>
              </NodeField>
            )}

            {/* OAuth */}
            {authMode === "oauth" && (
              <div className="rounded-lg bg-amber-50 dark:bg-(--dark-sidebar) border border-amber-100 dark:border-(--card-border-color) p-3 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-semibold">OAuth 2.0 Setup Required</p>
                <p className="text-[10px] opacity-80">
                  Configure your Google OAuth client credentials in{" "}
                  <span className="font-semibold">Settings → Integrations → Google</span>{" "}
                  and authorise the connection before using this node.
                </p>
              </div>
            )}

            {/* Help link */}
            <p className="text-[10px] text-gray-400 italic">
              Need help?{" "}
              <a
                href="https://developers.google.com/sheets/api/guides/authorizing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 underline"
              >
                Google Sheets API auth guide →
              </a>
            </p>
          </div>
        )}
      </div>

      {/* ── Spreadsheet target ── */}
      <NodeField
        label="Spreadsheet ID"
        required
        description="From the URL: /spreadsheets/d/[ID]/edit"
        error={(touched || data.forceValidation) && !data.spreadsheetId?.trim() ? "Spreadsheet ID is required" : ""}
      >
        <Input
          value={data.spreadsheetId || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("spreadsheetId", e.target.value)}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          className="h-9 text-sm bg-(--input-color)"
        />
      </NodeField>

      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <NodeField
            label="Sheet / Tab Name"
            required
            error={(touched || data.forceValidation) && !data.sheetName?.trim() ? "Required" : ""}
          >
            <Input
              value={data.sheetName || ""}
              onFocus={() => setTouched(true)}
              onChange={(e) => updateNodeData("sheetName", e.target.value)}
              placeholder="Sheet1"
              className="h-9 text-sm bg-(--input-color)"
            />
          </NodeField>
        </div>
        <div className="w-36 shrink-0">
          <NodeField label="Action">
            <Select
              value={data.action || "append_row"}
              onValueChange={(v) => updateNodeData("action", v)}
              onOpenChange={() => setTouched(true)}
            >
              <SelectTrigger className="h-9 text-xs bg-(--input-color) dark:bg-(--page-body-bg)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--page-body-bg)">
                {actions.map((a) => (
                  <SelectItem key={a.value} value={a.value} className="dark:hover:bg-(--card-color)">
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </NodeField>
        </div>
      </div>

      {/* Column → Value mappings */}
      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-400">Column Mappings</Label>
          <Button
            onClick={addMapping}
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-emerald-600 hover:bg-emerald-50 dark:hover:bg-(--table-hover) px-2"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-gray-400 uppercase px-1">
          <span>Column Header</span>
          <span>Value / Variable</span>
        </div>

        {columnMappings.length === 0 && (
          <div className="py-3 border border-dashed dark:border-(--card-border-color) border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50 dark:bg-(--dark-sidebar)">
            <span className="text-[11px] text-gray-400">No columns mapped yet.</span>
          </div>
        )}

        {columnMappings.map((m, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <Input
              value={m.column}
              onFocus={() => setTouched(true)}
              onChange={(e) => updateMapping(i, "column", e.target.value)}
              placeholder="Name"
              className="h-7 text-xs bg-(--input-color) flex-1"
            />
            <Input
              value={m.value}
              onFocus={() => setTouched(true)}
              onChange={(e) => updateMapping(i, "value", e.target.value)}
              placeholder="{{contact_name}}"
              className="h-7 text-xs bg-(--input-color) flex-1"
            />
            <Button
              onClick={() => removeMapping(i)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-red-500 shrink-0"
            >
              <X size={12} />
            </Button>
          </div>
        ))}
      </div>
    </BaseNode>
  );
}