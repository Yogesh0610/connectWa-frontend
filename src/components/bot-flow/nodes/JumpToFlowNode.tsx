/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { useReactFlow } from "@xyflow/react";
import { GitBranch, Plus, X } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function JumpToFlowNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);

  const passVars: { from: string; to: string }[] = data.passVariables || [];

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
    if (!data.targetFlowId?.trim()) errors.push("Target flow is required");
  }

  const addPassVar = () => {
    if (!touched) setTouched(true);
    updateNodeData("passVariables", [...passVars, { from: "", to: "" }]);
  };

  const removePassVar = (i: number) => {
    updateNodeData(
      "passVariables",
      passVars.filter((_, idx) => idx !== i)
    );
  };

  const updatePassVar = (i: number, field: "from" | "to", val: string) => {
    if (!touched) setTouched(true);
    const next = passVars.map((v, idx) => (idx === i ? { ...v, [field]: val } : v));
    updateNodeData("passVariables", next);
  };

  return (
    <BaseNode
      id={id}
      title="Jump to Flow"
      icon={<GitBranch size={18} />}
      iconBgColor="bg-indigo-100"
      iconColor="text-indigo-600"
      borderColor="border-indigo-200"
      handleColor="bg-indigo-500!"
      errors={errors}
      showOutHandle={false}
    >
      <NodeField
        label="Target Flow ID"
        required
        description="ID or name of the flow to jump to"
        error={(touched || data.forceValidation) && !data.targetFlowId?.trim() ? "Target flow is required" : ""}
      >
        <Input
          value={data.targetFlowId || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("targetFlowId", e.target.value)}
          placeholder="Flow ID or name"
          className="h-9 text-sm bg-(--input-color)"
        />
      </NodeField>

      <NodeField label="Jump Mode">
        <Select
          value={data.jumpMode || "replace"}
          onValueChange={(v) => updateNodeData("jumpMode", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            <SelectItem value="replace" className="dark:hover:bg-(--card-color)">
              Replace (end this flow)
            </SelectItem>
            <SelectItem value="nested" className="dark:hover:bg-(--card-color)">
              Nested (return here after)
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="mt-1 text-[10px] text-gray-400">
          {(data.jumpMode || "replace") === "replace"
            ? "This flow ends permanently when jumping"
            : "Execution returns here once the target flow finishes"}
        </div>
      </NodeField>

      {/* Pass variables */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-400">Pass Variables</Label>
          <Button
            onClick={addPassVar}
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-indigo-600 hover:bg-indigo-50 dark:hover:bg-(--table-hover) px-2"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        {passVars.length === 0 && (
          <div className="py-2 border border-dashed dark:border-(--card-border-color) border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50 dark:bg-(--dark-sidebar)">
            <span className="text-[10px] text-gray-400">No variables forwarded to target flow</span>
          </div>
        )}

        {passVars.map((v, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <div className="flex items-center gap-0.5 flex-1 min-w-0">
              <span className="text-[10px] text-gray-400 shrink-0">{"{{"}</span>
              <Input
                value={v.from}
                onFocus={() => setTouched(true)}
                onChange={(e) => updatePassVar(i, "from", e.target.value)}
                placeholder="local_var"
                className="h-7 text-xs bg-(--input-color)"
              />
              <span className="text-[10px] text-gray-400 shrink-0">{"}}"}</span>
            </div>
            <span className="text-[10px] text-gray-400 shrink-0">→</span>
            <div className="flex items-center gap-0.5 flex-1 min-w-0">
              <span className="text-[10px] text-gray-400 shrink-0">{"{{"}</span>
              <Input
                value={v.to}
                onFocus={() => setTouched(true)}
                onChange={(e) => updatePassVar(i, "to", e.target.value)}
                placeholder="target_var"
                className="h-7 text-xs bg-(--input-color)"
              />
              <span className="text-[10px] text-gray-400 shrink-0">{"}}"}</span>
            </div>
            <Button
              onClick={() => removePassVar(i)}
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