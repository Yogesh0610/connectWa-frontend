/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown, ChevronUp, Plus, Webhook, X } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function ApiWebhookNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);
  const [headersOpen, setHeadersOpen] = useState(false);

  const headers: { key: string; value: string }[] = data.headers || [];
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

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
    if (!data.url?.trim()) errors.push("Request URL is required");
  }

  const addHeader = () => {
    if (!touched) setTouched(true);
    updateNodeData("headers", [...headers, { key: "", value: "" }]);
  };

  const removeHeader = (i: number) => {
    updateNodeData(
      "headers",
      headers.filter((_, idx) => idx !== i)
    );
  };

  const updateHeader = (i: number, field: "key" | "value", val: string) => {
    if (!touched) setTouched(true);
    const next = headers.map((h, idx) => (idx === i ? { ...h, [field]: val } : h));
    updateNodeData("headers", next);
  };

  return (
    <BaseNode
      id={id}
      title="API / Webhook Call"
      icon={<Webhook size={18} />}
      iconBgColor="bg-rose-100"
      iconColor="text-rose-600"
      borderColor="border-rose-200"
      handleColor="bg-rose-500!"
      errors={errors}
    >
      {/* Method + URL */}
      <div className="flex gap-2">
        <div className="w-24 shrink-0">
          <Label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-400">Method</Label>
          <Select
            value={data.method || "POST"}
            onValueChange={(v) => updateNodeData("method", v)}
            onOpenChange={() => setTouched(true)}
          >
            <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-(--page-body-bg)">
              {methods.map((m) => (
                <SelectItem key={m} value={m} className="dark:hover:bg-(--card-color)">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-0">
          <NodeField
            label="URL"
            required
            error={(touched || data.forceValidation) && !data.url?.trim() ? "URL is required" : ""}
          >
            <Input
              value={data.url || ""}
              onFocus={() => setTouched(true)}
              onChange={(e) => updateNodeData("url", e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="h-9 text-sm bg-(--input-color)"
            />
          </NodeField>
        </div>
      </div>

      {/* Headers collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setHeadersOpen((o) => !o)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          {headersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Headers ({headers.length})
        </button>

        {headersOpen && (
          <div className="mt-2 space-y-2">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={h.key}
                  onFocus={() => setTouched(true)}
                  onChange={(e) => updateHeader(i, "key", e.target.value)}
                  placeholder="Key"
                  className="h-7 text-xs bg-(--input-color) flex-1"
                />
                <Input
                  value={h.value}
                  onFocus={() => setTouched(true)}
                  onChange={(e) => updateHeader(i, "value", e.target.value)}
                  placeholder="Value"
                  className="h-7 text-xs bg-(--input-color) flex-1"
                />
                <Button
                  onClick={() => removeHeader(i)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-red-500 shrink-0"
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
            <Button
              onClick={addHeader}
              variant="outline"
              className="w-full h-7 border-dashed border-gray-300 text-blue-600 text-xs"
            >
              <Plus className="mr-1 h-3 w-3" /> Add Header
            </Button>
          </div>
        )}
      </div>

      {/* Body — hide for GET */}
      {(data.method || "POST") !== "GET" && (
        <NodeField label="Request Body (JSON)">
          <Textarea
            value={data.body || ""}
            onFocus={() => setTouched(true)}
            onChange={(e) => updateNodeData("body", e.target.value)}
            placeholder={'{\n  "key": "{{variable}}"\n}'}
            className="min-h-20 resize-none text-xs font-mono dark:bg-(--page-body-bg) bg-(--input-color)"
          />
        </NodeField>
      )}

      {/* Response mapping */}
      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color) space-y-3">
        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Response Mapping</Label>

        <NodeField
          label="JSON Path to extract"
          description='e.g. "data.user.id" or "results[0].name"'
        >
          <Input
            value={data.responseJsonPath || ""}
            onFocus={() => setTouched(true)}
            onChange={(e) => updateNodeData("responseJsonPath", e.target.value)}
            placeholder="data.order.id"
            className="h-8 text-xs bg-(--input-color)"
          />
        </NodeField>

        <NodeField label="Save extracted value to variable">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 shrink-0">{"{{"}</span>
            <Input
              value={data.responseVariable || ""}
              onFocus={() => setTouched(true)}
              onChange={(e) =>
                updateNodeData("responseVariable", e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())
              }
              placeholder="api_result"
              className="h-8 text-xs bg-(--input-color)"
            />
            <span className="text-xs text-gray-400 shrink-0">{"}}"}</span>
          </div>
        </NodeField>
      </div>
    </BaseNode>
  );
}