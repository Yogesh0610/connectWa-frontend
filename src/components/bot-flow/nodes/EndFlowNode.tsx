/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Input } from "@/src/elements/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { CircleStop } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function EndFlowNode({ data, id }: any) {
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

  const endActions = [
    { value: "close_session", label: "Close session" },
    { value: "hand_off_agent", label: "Hand off to live agent" },
    { value: "unsubscribe", label: "Unsubscribe contact" },
    { value: "tag_only", label: "Tag and stay subscribed" },
  ];

  return (
    <BaseNode
      id={id}
      title="End Flow"
      icon={<CircleStop size={18} />}
      iconBgColor="bg-red-100"
      iconColor="text-red-600"
      borderColor="border-red-200"
      handleColor="bg-red-500!"
      showOutHandle={false}
    >
      <NodeField
        label="Goodbye Message"
        description="Optional message sent to the user before ending"
      >
        <Textarea
          placeholder="Thank you! Have a great day. 👋"
          value={data.goodbyeMessage || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("goodbyeMessage", e.target.value)}
          className="min-h-16 resize-none text-sm dark:bg-(--page-body-bg)"
        />
        <div className="mt-1 text-right text-[10px] text-gray-400">
          {data.goodbyeMessage?.length || 0}/1024
        </div>
      </NodeField>

      <NodeField label="End Action">
        <Select
          value={data.endAction || "close_session"}
          onValueChange={(v) => updateNodeData("endAction", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            {endActions.map((a) => (
              <SelectItem key={a.value} value={a.value} className="dark:hover:bg-(--card-color)">
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </NodeField>

      <NodeField
        label="Apply Tags"
        description="Comma-separated tags to apply to the contact"
      >
        <Input
          value={data.tags || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("tags", e.target.value)}
          placeholder="completed, onboarded, vip"
          className="h-9 text-sm bg-(--input-color)"
        />
      </NodeField>

      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="flex items-center gap-2 text-[10px] text-red-500 font-medium">
          <CircleStop size={12} />
          <span>Flow execution stops here</span>
        </div>
      </div>
    </BaseNode>
  );
}