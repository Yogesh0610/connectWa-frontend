/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Input } from "@/src/elements/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { useReactFlow } from "@xyflow/react";
import { BellOff } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function DisableAutoReplyNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);

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
    if (!data.duration || data.duration <= 0) errors.push("Duration must be greater than 0");
  }

  const durationUnits = [
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
  ];

  const durationMs =
    (data.duration || 0) *
    (data.durationUnit === "days" ? 86400000 : data.durationUnit === "hours" ? 3600000 : 60000);

  return (
    <BaseNode
      id={id}
      title="Disable Auto-Reply"
      icon={<BellOff size={18} />}
      iconBgColor="bg-slate-100"
      iconColor="text-slate-600"
      borderColor="border-slate-200"
      handleColor="bg-slate-500!"
      errors={errors}
    >
      <NodeField
        label="Disable Duration"
        required
        description="Auto-reply will be re-enabled after this duration"
        error={(touched || data.forceValidation) && (!data.duration || data.duration <= 0) ? "Duration must be greater than 0" : ""}
      >
        <div className="flex gap-2">
          <Input
            type="number"
            value={data.duration || ""}
            onFocus={() => setTouched(true)}
            onChange={(e) => updateNodeData("duration", parseInt(e.target.value) || 0)}
            placeholder="30"
            className="h-9 text-sm bg-(--input-color) flex-1"
            min={1}
          />
          <Select
            value={data.durationUnit || "minutes"}
            onValueChange={(v) => updateNodeData("durationUnit", v)}
            onOpenChange={() => setTouched(true)}
          >
            <SelectTrigger className="h-9 text-sm w-28 shrink-0 bg-(--input-color) dark:bg-(--page-body-bg)">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-(--page-body-bg)">
              {durationUnits.map((u) => (
                <SelectItem key={u.value} value={u.value} className="dark:hover:bg-(--card-color)">
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {data.duration > 0 && (
          <div className="mt-1 text-[10px] text-gray-400">
            ≈ {(durationMs / 60000).toFixed(0)} minutes total
          </div>
        )}
      </NodeField>

      <NodeField
        label="Scope"
        description="Which auto-reply rules to disable"
      >
        <Select
          value={data.scope || "all"}
          onValueChange={(v) => updateNodeData("scope", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            <SelectItem value="all" className="dark:hover:bg-(--card-color)">All auto-replies</SelectItem>
            <SelectItem value="flow_only" className="dark:hover:bg-(--card-color)">Flow triggers only</SelectItem>
            <SelectItem value="keyword_only" className="dark:hover:bg-(--card-color)">Keyword replies only</SelectItem>
          </SelectContent>
        </Select>
      </NodeField>

      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
          <BellOff size={11} />
          <span>
            Auto-reply paused for{" "}
            <span className="font-bold">
              {data.duration || "?"} {data.durationUnit || "minutes"}
            </span>{" "}
            for this contact
          </span>
        </div>
      </div>
    </BaseNode>
  );
}