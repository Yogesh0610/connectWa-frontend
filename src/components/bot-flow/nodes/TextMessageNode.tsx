"use client";

import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { Type } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

interface NodeData {
  message?: string;
  forceValidation?: boolean;
}

export function TextMessageNode({ data, id }: { data: NodeData; id: string }) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);

  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (!data.message?.trim()) errors.push("Message content is required");
  }

  const updateMessage = (value: string) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, message: value } } : node
      )
    );
  };

  return (
    <BaseNode
      id={id}
      title="Text Message"
      icon={<Type size={18} />}
      iconBgColor="bg-emerald-100"
      iconColor="text-emerald-600"
      borderColor="border-emerald-200"
      handleColor="bg-emerald-500!"
      errors={errors}
    >
      <NodeField
        label="Message"
        required
        error={(touched || data.forceValidation) && !data.message?.trim() ? "Required" : ""}
      >
        <Textarea
          placeholder={`Type your message…\nUse {{variable}} for dynamic values`}
          value={data.message || ""}
          onFocus={() => setTouched(true)}
          onChange={(e) => updateMessage(e.target.value)}
          className={`min-h-[96px] resize-y text-sm bg-(--input-color) dark:bg-(--page-body-bg) ${
            (touched || data.forceValidation) && !data.message?.trim()
              ? "border-red-300"
              : ""
          }`}
        />
      </NodeField>

      <div className="border-t border-gray-100 dark:border-(--card-border-color) pt-2">
        <p className="text-[10px] text-gray-400">
          Use{" "}
          <code className="bg-gray-100 dark:bg-(--dark-sidebar) px-1 rounded">
            {"{{variable}}"}
          </code>{" "}
          for dynamic values
        </p>
      </div>
    </BaseNode>
  );
}
