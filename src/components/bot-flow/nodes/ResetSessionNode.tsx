/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/src/elements/ui/badge";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { useReactFlow } from "@xyflow/react";
import { Plus, RefreshCcw, X } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function ResetSessionNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);
  const [newVar, setNewVar] = useState("");

  const keepVars: string[] = data.keepVariables || [];

  const updateNodeData = (field: string, value: any) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };

  const addKeepVar = () => {
    if (!newVar.trim()) return;
    const sanitized = newVar.trim().replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    if (!keepVars.includes(sanitized)) {
      updateNodeData("keepVariables", [...keepVars, sanitized]);
    }
    setNewVar("");
  };

  const removeKeepVar = (v: string) => {
    updateNodeData("keepVariables", keepVars.filter((k) => k !== v));
  };

  const resetScope = data.resetScope || "variables";

  return (
    <BaseNode
      id={id}
      title="Reset Session"
      icon={<RefreshCcw size={18} />}
      iconBgColor="bg-red-100"
      iconColor="text-red-500"
      borderColor="border-red-200"
      handleColor="bg-red-400!"
    >
      <NodeField
        label="Reset Scope"
        description="Choose what gets cleared when this node runs"
      >
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: "variables", label: "Variables only", desc: "Clears all stored {{variables}}" },
            { value: "session", label: "Full session", desc: "Clears variables + resets flow state" },
            { value: "custom", label: "Keep selected", desc: "Clear all except specified variables" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateNodeData("resetScope", opt.value)}
              className={`text-left rounded-lg border p-2.5 transition-all ${
                resetScope === opt.value
                  ? "border-red-300 bg-red-50 dark:bg-(--dark-sidebar) dark:border-(--card-border-color)"
                  : "border-gray-100 dark:border-(--card-border-color) hover:border-gray-200 dark:hover:bg-(--table-hover)"
              }`}
            >
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{opt.label}</div>
              <div className="text-[10px] text-gray-400">{opt.desc}</div>
            </button>
          ))}
        </div>
      </NodeField>

      {resetScope === "custom" && (
        <NodeField
          label="Keep These Variables"
          description="These variables will NOT be cleared"
        >
          <div className="flex gap-2">
            <Input
              value={newVar}
              onChange={(e) => setNewVar(e.target.value)}
              onFocus={() => setTouched(true)}
              onKeyDown={(e) => e.key === "Enter" && addKeepVar()}
              placeholder="variable_name"
              className="h-9 text-sm bg-(--input-color) flex-1"
            />
            <Button
              onClick={addKeepVar}
              size="icon"
              className="h-9 w-9 bg-primary hover:bg-primary dark:text-white shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {keepVars.length > 0 ? (
              keepVars.map((v, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="flex items-center gap-1 bg-red-50 dark:bg-(--dark-sidebar) dark:border-(--card-border-color) text-red-700 border-red-100"
                >
                  {`{{${v}}}`}
                  <X size={12} className="cursor-pointer hover:text-red-900" onClick={() => removeKeepVar(v)} />
                </Badge>
              ))
            ) : (
              <div className="w-full py-3 border border-dashed dark:bg-(--dark-sidebar) dark:border-(--card-border-color) border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50">
                <span className="text-[11px] text-gray-400">All variables will be cleared.</span>
              </div>
            )}
          </div>
        </NodeField>
      )}

      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="flex items-center gap-2 text-[10px] text-red-500 font-medium">
          <RefreshCcw size={11} />
          <span>
            {resetScope === "variables" && "All variables will be cleared for this contact"}
            {resetScope === "session" && "Full session reset — variables + flow state cleared"}
            {resetScope === "custom" && `Clears all except ${keepVars.length} protected variable(s)`}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}