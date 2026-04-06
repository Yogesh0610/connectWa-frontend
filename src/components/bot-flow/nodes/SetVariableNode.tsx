/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { useReactFlow } from "@xyflow/react";
import { Plus, Variable, X } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";

export function SetVariableNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);

  const variables: { key: string; value: string }[] = data.variables || [];

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
    if (!variables.length) errors.push("At least one variable is required");
    variables.forEach((v, i) => {
      if (!v.key?.trim()) errors.push(`Variable ${i + 1}: name is required`);
    });
  }

  const addVariable = () => {
    if (!touched) setTouched(true);
    updateNodeData("variables", [...variables, { key: "", value: "" }]);
  };

  const removeVariable = (i: number) => {
    updateNodeData(
      "variables",
      variables.filter((_, idx) => idx !== i)
    );
  };

  const updateVariable = (i: number, field: "key" | "value", val: string) => {
    if (!touched) setTouched(true);
    const next = variables.map((v, idx) => (idx === i ? { ...v, [field]: val } : v));
    updateNodeData("variables", next);
  };

  return (
    <BaseNode
      id={id}
      title="Set Variable"
      icon={<Variable size={18} />}
      iconBgColor="bg-cyan-100"
      iconColor="text-cyan-700"
      borderColor="border-cyan-200"
      handleColor="bg-cyan-500!"
      errors={errors}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-400">Variables</Label>
          <Button
            onClick={addVariable}
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-cyan-600 hover:bg-cyan-50 dark:hover:bg-(--table-hover) px-2"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        {variables.length === 0 && (
          <div className="py-3 border border-dashed dark:border-(--card-border-color) border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50 dark:bg-(--dark-sidebar)">
            <span className="text-[11px] text-gray-400">No variables added yet.</span>
          </div>
        )}

        {variables.map((v, i) => (
          <div
            key={i}
            className="relative rounded-lg border border-gray-100 dark:border-(--card-border-color) dark:bg-(--dark-sidebar) bg-gray-50/50 p-3"
          >
            <Button
              onClick={() => removeVariable(i)}
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-5 w-5 text-gray-400 hover:text-red-500"
            >
              <X size={12} />
            </Button>

            <div className="space-y-2 pr-4">
              <div>
                <Label className="mb-1 block text-[10px] font-medium text-gray-500">Variable Name *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 shrink-0">{"{{"}</span>
                  <Input
                    value={v.key}
                    onFocus={() => setTouched(true)}
                    onChange={(e) =>
                      updateVariable(i, "key", e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())
                    }
                    placeholder="variable_name"
                    className="h-7 text-xs bg-(--input-color)"
                  />
                  <span className="text-xs text-gray-400 shrink-0">{"}}"}</span>
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-[10px] font-medium text-gray-500">Value</Label>
                <Input
                  value={v.value}
                  onFocus={() => setTouched(true)}
                  onChange={(e) => updateVariable(i, "value", e.target.value)}
                  placeholder='e.g. "active" or {{user_name}}'
                  className="h-7 text-xs bg-(--input-color)"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </BaseNode>
  );
}