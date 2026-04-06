/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/src/elements/ui/badge";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { Bot, Plus, X } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function AiTransferNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);

  const contextVars: string[] = data.contextVariables || [];
  const [newVar, setNewVar] = useState("");

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
    if (!data.assistantId?.trim()) errors.push("AI assistant selection is required");
  }

  const addContextVar = () => {
    if (!newVar.trim()) return;
    const sanitized = newVar.trim().replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    if (!contextVars.includes(sanitized)) {
      updateNodeData("contextVariables", [...contextVars, sanitized]);
    }
    setNewVar("");
  };

  const removeContextVar = (v: string) => {
    updateNodeData("contextVariables", contextVars.filter((k) => k !== v));
  };

  const aiModels = [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ];

  return (
    <BaseNode
      id={id}
      title="AI Transfer"
      icon={<Bot size={18} />}
      iconBgColor="bg-violet-100"
      iconColor="text-violet-600"
      borderColor="border-violet-200"
      handleColor="bg-violet-500!"
      errors={errors}
      showOutHandle={false}
      headerRight={
        <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-500 hover:to-purple-600 text-[9px] h-4 px-1.5 ml-1">
          PRO
        </Badge>
      }
    >
      <NodeField
        label="AI Assistant"
        required
        error={(touched || data.forceValidation) && !data.assistantId?.trim() ? "AI assistant is required" : ""}
      >
        <Input
          value={data.assistantId || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("assistantId", e.target.value)}
          placeholder="Assistant ID or name"
          className="h-9 text-sm bg-(--input-color)"
        />
      </NodeField>

      <NodeField label="AI Model">
        <Select
          value={data.model || "gpt-4o"}
          onValueChange={(v) => updateNodeData("model", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            {aiModels.map((m) => (
              <SelectItem key={m.value} value={m.value} className="dark:hover:bg-(--card-color)">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </NodeField>

      <NodeField
        label="System Prompt"
        description="Instructions for the AI assistant behaviour"
      >
        <Textarea
          value={data.systemPrompt || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("systemPrompt", e.target.value)}
          placeholder="You are a helpful assistant for Acme Corp. Answer only questions about our products..."
          className="min-h-20 resize-none text-xs dark:bg-(--page-body-bg) bg-(--input-color)"
        />
        <div className="mt-1 text-right text-[10px] text-gray-400">
          {data.systemPrompt?.length || 0} chars
        </div>
      </NodeField>

      {/* Context variables to forward */}
      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-400">
            Pass Variables to AI
          </Label>
          <Button
            onClick={addContextVar}
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-violet-600 hover:bg-violet-50 dark:hover:bg-(--table-hover) px-2"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            value={newVar}
            onChange={(e) => setNewVar(e.target.value)}
            onFocus={() => setTouched(true)}
            onKeyDown={(e) => e.key === "Enter" && addContextVar()}
            placeholder="variable_name"
            className="h-8 text-xs bg-(--input-color) flex-1"
          />
        </div>

        {contextVars.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {contextVars.map((v, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="flex items-center gap-1 bg-violet-50 dark:bg-(--dark-sidebar) dark:border-(--card-border-color) text-violet-700 border-violet-100"
              >
                {`{{${v}}}`}
                <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeContextVar(v)} />
              </Badge>
            ))}
          </div>
        ) : (
          <div className="py-2 border border-dashed dark:border-(--card-border-color) border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50 dark:bg-(--dark-sidebar)">
            <span className="text-[10px] text-gray-400">No variables forwarded</span>
          </div>
        )}
      </div>

      <NodeField label="Max AI Turns">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={data.maxTurns ?? 10}
            onFocus={() => setTouched(true)}
            onChange={(e) => updateNodeData("maxTurns", parseInt(e.target.value) || 10)}
            className="h-8 text-xs bg-(--input-color)"
            min={1}
            max={50}
          />
          <span className="text-xs text-gray-400 shrink-0">exchanges before fallback</span>
        </div>
      </NodeField>

      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="flex items-center gap-2 text-[10px] text-violet-600 font-medium">
          <Bot size={11} />
          <span>Flow hands off — AI assistant handles conversation</span>
        </div>
      </div>
    </BaseNode>
  );
}