/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown, ChevronUp, Database, Eye, EyeOff, Plus, X } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function MySqlQueryNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);
  const [connOpen, setConnOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const resultMappings: { column: string; variable: string }[] = data.resultMappings || [];

  const updateNodeData = (field: string, value: any) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };

  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (!data.dbHost?.trim()) errors.push("Database host is required");
    if (!data.dbName?.trim()) errors.push("Database name is required");
    if (!data.dbUser?.trim()) errors.push("Database user is required");
    if (!data.query?.trim()) errors.push("SQL query is required");
  }

  const addMapping = () => {
    if (!touched) setTouched(true);
    updateNodeData("resultMappings", [...resultMappings, { column: "", variable: "" }]);
  };

  const removeMapping = (i: number) => {
    updateNodeData("resultMappings", resultMappings.filter((_, idx) => idx !== i));
  };

  const updateMapping = (i: number, field: "column" | "variable", val: string) => {
    if (!touched) setTouched(true);
    updateNodeData(
      "resultMappings",
      resultMappings.map((m, idx) =>
        idx === i
          ? { ...m, [field]: field === "variable" ? val.replace(/[^a-z0-9_]/gi, "_").toLowerCase() : val }
          : m
      )
    );
  };

  const queryType = data.queryType || "select";
  const isConnConfigured = !!(data.dbHost?.trim() && data.dbName?.trim() && data.dbUser?.trim());

  const queryTypes = [
    { value: "select", label: "SELECT" },
    { value: "insert", label: "INSERT" },
    { value: "update", label: "UPDATE" },
    { value: "delete", label: "DELETE" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <BaseNode
      id={id}
      title="MySQL Query"
      icon={<Database size={18} />}
      iconBgColor="bg-orange-100"
      iconColor="text-orange-600"
      borderColor="border-orange-200"
      handleColor="bg-orange-500!"
      errors={errors}
    >
      {/* ── Database Connection collapsible ── */}
      <div className="rounded-lg border border-orange-100 dark:border-(--card-border-color) overflow-hidden">
        <button
          type="button"
          onClick={() => setConnOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-(--dark-sidebar) hover:bg-orange-100 dark:hover:bg-(--table-hover) transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database size={12} className="text-orange-500" />
            <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
              Database Connection
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                isConnConfigured
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {isConnConfigured ? "✓ Set" : "Required"}
            </span>
          </div>
          {connOpen ? <ChevronUp size={13} className="text-orange-500" /> : <ChevronDown size={13} className="text-orange-500" />}
        </button>

        {connOpen && (
          <div className="p-3 space-y-3 bg-white dark:bg-(--card-color) border-t border-orange-100 dark:border-(--card-border-color)">
            {/* Host + Port */}
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <NodeField
                  label="Host"
                  required
                  error={(touched || data.forceValidation) && !data.dbHost?.trim() ? "Required" : ""}
                >
                  <Input
                    value={data.dbHost || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateNodeData("dbHost", e.target.value)}
                    placeholder="localhost or 192.168.1.1"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>
              </div>
              <div className="w-[72px] shrink-0">
                <NodeField label="Port">
                  <Input
                    type="number"
                    value={data.dbPort || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateNodeData("dbPort", e.target.value)}
                    placeholder="3306"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>
              </div>
            </div>

            {/* Database name */}
            <NodeField
              label="Database Name"
              required
              error={(touched || data.forceValidation) && !data.dbName?.trim() ? "Required" : ""}
            >
              <Input
                value={data.dbName || ""}
                onFocus={() => setTouched(true)}
                onChange={(e) => updateNodeData("dbName", e.target.value)}
                placeholder="my_database"
                className="h-8 text-xs bg-(--input-color)"
              />
            </NodeField>

            {/* User + Password side by side */}
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <NodeField
                  label="Username"
                  required
                  error={(touched || data.forceValidation) && !data.dbUser?.trim() ? "Required" : ""}
                >
                  <Input
                    value={data.dbUser || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateNodeData("dbUser", e.target.value)}
                    placeholder="root"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>
              </div>
              <div className="flex-1 min-w-0">
                <NodeField label="Password">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={data.dbPassword || ""}
                      onFocus={() => setTouched(true)}
                      onChange={(e) => updateNodeData("dbPassword", e.target.value)}
                      placeholder="••••••••"
                      className="h-8 text-xs bg-(--input-color) pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </NodeField>
              </div>
            </div>

            {/* SSL toggle */}
            <div className="flex items-center justify-between rounded-md border border-gray-100 dark:border-(--card-border-color) px-3 py-2 bg-gray-50/50 dark:bg-(--dark-sidebar)">
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Use SSL/TLS</p>
                <p className="text-[10px] text-gray-400">Encrypt the database connection</p>
              </div>
              <button
                type="button"
                onClick={() => updateNodeData("dbSsl", !data.dbSsl)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  data.dbSsl ? "bg-orange-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    data.dbSsl ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Connection string preview */}
            {isConnConfigured && (
              <div className="rounded-md bg-gray-50 dark:bg-(--dark-sidebar) border border-gray-100 dark:border-(--card-border-color) px-3 py-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Connection Preview</p>
                <code className="text-[10px] text-gray-600 dark:text-gray-300 break-all">
                  {`mysql://${data.dbUser}:***@${data.dbHost}:${data.dbPort || 3306}/${data.dbName}`}
                </code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Query ── */}
      <NodeField label="Query Type">
        <Select
          value={queryType}
          onValueChange={(v) => updateNodeData("queryType", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            {queryTypes.map((qt) => (
              <SelectItem key={qt.value} value={qt.value} className="dark:hover:bg-(--card-color)">
                {qt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </NodeField>

      <NodeField
        label="SQL Query"
        required
        description="Use {{variable}} for dynamic values — auto-escaped against injection"
        error={(touched || data.forceValidation) && !data.query?.trim() ? "SQL query is required" : ""}
      >
        <Textarea
          value={data.query || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("query", e.target.value)}
          placeholder={
            queryType === "select"
              ? "SELECT * FROM orders WHERE phone = '{{contact_phone}}' LIMIT 1"
              : queryType === "insert"
              ? "INSERT INTO leads (name, phone) VALUES ('{{contact_name}}', '{{contact_phone}}')"
              : queryType === "update"
              ? "UPDATE contacts SET status = 'active' WHERE id = {{contact_id}}"
              : "DELETE FROM sessions WHERE contact_id = {{contact_id}}"
          }
          className="min-h-24 resize-none text-xs font-mono dark:bg-(--page-body-bg) bg-(--input-color)"
        />
      </NodeField>

      {/* Result mappings — SELECT only */}
      {queryType === "select" && (
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-400">Map Result Columns</Label>
            <Button
              onClick={addMapping}
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-orange-600 hover:bg-orange-50 dark:hover:bg-(--table-hover) px-2"
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-gray-400 uppercase px-1">
            <span>DB Column</span>
            <span>Save to {"{{var}}"}</span>
          </div>

          {resultMappings.length === 0 && (
            <div className="py-2.5 border border-dashed dark:border-(--card-border-color) border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50 dark:bg-(--dark-sidebar)">
              <span className="text-[10px] text-gray-400">No column mappings configured</span>
            </div>
          )}

          {resultMappings.map((m, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <Input
                value={m.column}
                onFocus={() => setTouched(true)}
                onChange={(e) => updateMapping(i, "column", e.target.value)}
                placeholder="order_id"
                className="h-7 text-xs bg-(--input-color) flex-1"
              />
              <div className="flex items-center gap-0.5 flex-1">
                <span className="text-[10px] text-gray-400 shrink-0">{"{{"}</span>
                <Input
                  value={m.variable}
                  onFocus={() => setTouched(true)}
                  onChange={(e) => updateMapping(i, "variable", e.target.value)}
                  placeholder="db_order_id"
                  className="h-7 text-xs bg-(--input-color)"
                />
                <span className="text-[10px] text-gray-400 shrink-0">{"}}"}</span>
              </div>
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

          <p className="text-[10px] text-gray-400 italic">Maps values from the first row returned</p>
        </div>
      )}

      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="flex items-center gap-2 text-[10px] text-orange-500 font-medium">
          <Database size={11} />
          <span>Credentials are stored encrypted per node</span>
        </div>
      </div>
    </BaseNode>
  );
}