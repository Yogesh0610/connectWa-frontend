/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Input } from "@/src/elements/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { MessageSquareDot } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

export function UserInputNode({ data, id }: any) {
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
    if (!data.questionText?.trim()) errors.push("Question text is required");
    if (!data.variableName?.trim()) errors.push("Variable name is required");
  }

  const inputTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "date", label: "Date" },
    { value: "yes_no", label: "Yes / No" },
    { value: "file", label: "File / Document" },
  ];

  return (
    <BaseNode
      id={id}
      title="Ask User / Capture Input"
      icon={<MessageSquareDot size={18} />}
      iconBgColor="bg-violet-100"
      iconColor="text-violet-600"
      borderColor="border-violet-200"
      handleColor="bg-violet-500!"
      errors={errors}
    >
      <NodeField
        label="Question / Prompt"
        required
        error={(touched || data.forceValidation) && !data.questionText?.trim() ? "Question text is required" : ""}
      >
        <Textarea
          placeholder="e.g. What is your email address?"
          value={data.questionText || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("questionText", e.target.value)}
          className="min-h-16 resize-none text-sm dark:bg-(--page-body-bg)"
        />
        <div className="mt-1 text-right text-[10px] text-gray-400">{data.questionText?.length || 0}/1024</div>
      </NodeField>

      <NodeField
        label="Save reply to variable"
        required
        description='Variable name without braces — e.g. "user_email"'
        error={(touched || data.forceValidation) && !data.variableName?.trim() ? "Variable name is required" : ""}
      >
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 shrink-0">{"{{"}</span>
          <Input
            value={data.variableName || ""}
            onFocus={() => setTouched(true)}
            onChange={(e) =>
              updateNodeData("variableName", e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())
            }
            placeholder="user_email"
            className="h-8 text-xs bg-(--input-color)"
          />
          <span className="text-xs text-gray-400 shrink-0">{"}}"}</span>
        </div>
      </NodeField>

      <NodeField label="Expected Input Type">
        <Select
          value={data.inputType || "text"}
          onValueChange={(v) => updateNodeData("inputType", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            {inputTypes.map((t) => (
              <SelectItem key={t.value} value={t.value} className="dark:hover:bg-(--card-color)">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </NodeField>

      <NodeField
        label="Validation Error Message"
        description="Shown to user if their input fails validation"
      >
        <Input
          value={data.validationError || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateNodeData("validationError", e.target.value)}
          placeholder="Please enter a valid value."
          className="h-9 text-sm bg-(--input-color)"
        />
      </NodeField>

      <NodeField label="Timeout (seconds)">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={data.timeoutSeconds ?? ""}
            onFocus={() => setTouched(true)}
            onChange={(e) =>
              updateNodeData("timeoutSeconds", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="No timeout"
            className="h-8 text-xs bg-(--input-color)"
            min={5}
            step={5}
          />
          <span className="text-xs text-gray-500 font-medium shrink-0">sec</span>
        </div>
        <div className="mt-1 text-[10px] text-gray-400">Leave blank to wait indefinitely</div>
      </NodeField>
    </BaseNode>
  );
}