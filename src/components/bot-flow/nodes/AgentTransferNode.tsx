/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Input } from "@/src/elements/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { HeadphonesIcon } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function AgentTransferNode({ data, id }: any) {
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
    if (!data.teamId?.trim()) errors.push("Team or agent assignment is required");
  }

  const priorities = [
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];

  const assignmentModes = [
    { value: "round_robin", label: "Round Robin" },
    { value: "least_busy", label: "Least Busy" },
    { value: "specific_agent", label: "Specific Agent" },
  ];

  return (
    <BaseNode
      id={id}
      title="Agent Transfer"
      icon={<HeadphonesIcon size={18} />}
      iconBgColor="bg-teal-100"
      iconColor="text-teal-600"
      borderColor="border-teal-200"
      handleColor="bg-teal-500!"
      errors={errors}
      showOutHandle={false}
    >
      <NodeField
        label="Assign to Team / Agent"
        required
        error={(touched || data.forceValidation) && !data.teamId?.trim() ? "Team or agent is required" : ""}
      >
        <Input
          value={data.teamId || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("teamId", e.target.value)}
          placeholder="Team ID or agent username"
          className="h-9 text-sm bg-(--input-color)"
        />
      </NodeField>

      <NodeField label="Assignment Mode">
        <Select
          value={data.assignmentMode || "round_robin"}
          onValueChange={(v) => updateNodeData("assignmentMode", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            {assignmentModes.map((m) => (
              <SelectItem key={m.value} value={m.value} className="dark:hover:bg-(--card-color)">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </NodeField>

      <NodeField label="Priority">
        <Select
          value={data.priority || "normal"}
          onValueChange={(v) => updateNodeData("priority", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            {priorities.map((p) => (
              <SelectItem key={p.value} value={p.value} className="dark:hover:bg-(--card-color)">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </NodeField>

      <NodeField
        label="Handoff Note"
        description="Internal note visible to the agent receiving this chat"
      >
        <Textarea
          value={data.note || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("note", e.target.value)}
          placeholder="e.g. Customer needs help with billing — VIP account"
          className="min-h-16 resize-none text-sm dark:bg-(--page-body-bg)"
        />
      </NodeField>

      <NodeField
        label="Queue Message"
        description="Optional message sent to the contact while waiting"
      >
        <Textarea
          value={data.queueMessage || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("queueMessage", e.target.value)}
          placeholder="Connecting you to an agent, please wait..."
          className="min-h-12 resize-none text-sm dark:bg-(--page-body-bg)"
        />
      </NodeField>

      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="flex items-center gap-2 text-[10px] text-teal-600 font-medium">
          <HeadphonesIcon size={11} />
          <span>Flow pauses — human agent takes over</span>
        </div>
      </div>
    </BaseNode>
  );
}