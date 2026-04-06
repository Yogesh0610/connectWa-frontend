/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { useReactFlow } from "@xyflow/react";
import { Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function CallToActionNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);

  // Ensure nodeType is set for proper rendering
  useEffect(() => {
    if (data.nodeType !== "call_to_action") {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, nodeType: "call_to_action" } }
            : node
        )
      );
    }
  }, [id, data.nodeType, setNodes]);

  const updateNodeData = (field: string, value: any) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    );
  };

  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (!data.valueText?.trim()) errors.push("Value text is required");
    if (!data.buttonLink?.trim()) errors.push("Valid button link is required");
  }

  return (
    <BaseNode
      id={id}
      title="Call To Action"
      icon={<Zap size={18} />}
      iconBgColor="bg-emerald-100"
      iconColor="text-emerald-600"
      borderColor="border-emerald-200"
      handleColor="bg-emerald-500!"
      errors={errors}
    >
      <NodeField label="Header (Optional)">
        <Input
          value={data.header || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("header", e.target.value)}
          placeholder="Enter header text (optional)"
          className="h-9 text-sm bg-(--input-color)"
          maxLength={60}
        />
        <div className="mt-1 text-right text-[10px] text-gray-400">
          {data.header?.length || 0}/60
        </div>
      </NodeField>

      <NodeField
        label="Value Text"
        required
        error={(touched || data.forceValidation) && !data.valueText?.trim() ? "Value text is required" : ""}
      >
        <Input
          value={data.valueText || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("valueText", e.target.value)}
          placeholder="Enter value text"
          className="h-9 text-sm bg-(--input-color)"
          maxLength={1000}
        />
        <div className="mt-1 text-right text-[10px] text-gray-400">
          {data.valueText?.length || 0}/1000
        </div>
      </NodeField>

      <NodeField
        label="Button Text"
        required
        error={(touched || data.forceValidation) && !data.buttonText?.trim() ? "Button text is required" : ""}
      >
        <Input
          value={data.buttonText || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("buttonText", e.target.value)}
          placeholder="Click Here"
          className="h-9 text-sm bg-(--input-color)"
          maxLength={20}
        />
        <div className="mt-1 text-right text-[10px] text-gray-400">
          {data.buttonText?.length || 0}/20
        </div>
      </NodeField>

      <NodeField
        label="Button Link"
        required
        error={(touched || data.forceValidation) && !data.buttonLink?.trim() ? "Button link is required" : ""}
      >
        <Input
          value={data.buttonLink || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("buttonLink", e.target.value)}
          placeholder="Enter URL (https://example.com)"
          className="h-9 text-sm bg-(--input-color)"
        />
      </NodeField>

      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
          Preview:
        </Label>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-center border border-gray-100 dark:bg-(--dark-sidebar) dark:border-(--card-border-color)">
          <div className="text-xs text-gray-600 mb-2 truncate dark:text-gray-400">
            {data.valueText || "Your value text will appear here"}
          </div>
          <Button
            size="sm"
            className="w-full bg-yellow-500 hover:bg-yellow-600 h-8 text-xs font-bold text-white shadow-sm"
          >
            {data.buttonText || "Click Here"}
          </Button>
        </div>
      </div>
    </BaseNode>
  );
}