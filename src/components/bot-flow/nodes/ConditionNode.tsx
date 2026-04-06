/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/src/elements/ui/badge";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { useReactFlow } from "@xyflow/react";
import { Filter, Plus, X } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

const FIELD_OPTIONS = [
  { value: "message", label: "Message Text" },
  { value: "contact_type", label: "Contact Type" },
  { value: "tag", label: "Tag" },
  { value: "phone", label: "Phone Number" },
  { value: "email", label: "Email" },
  { value: "name", label: "Name" },
];

const OPERATOR_OPTIONS = [
  { value: "contains_any", label: "Contains Any" },
  { value: "equals", label: "Equals" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "not_equals", label: "Not Equals" },
  { value: "not_contains", label: "Not Contains" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
];

export function ConditionNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);
  const [newValue, setNewValue] = useState("");

  const condition = data.condition || { field: "message", operator: "contains_any", value: [] };
  const values: string[] = Array.isArray(condition.value) ? condition.value : condition.value ? [condition.value] : [];

  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (!condition.field) errors.push("Match field is required");
    if (!condition.operator) errors.push("Operator is required");
    if (!["is_empty", "is_not_empty"].includes(condition.operator) && values.length === 0) {
      errors.push("At least one value is required");
    }
  }

  const updateCondition = (field: string, value: any) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, condition: { ...condition, [field]: value } } }
          : node
      )
    );
  };

  const addValue = () => {
    if (!newValue.trim()) return;
    if (!values.includes(newValue.trim())) {
      updateCondition("value", [...values, newValue.trim()]);
    }
    setNewValue("");
  };

  const removeValue = (v: string) => {
    updateCondition("value", values.filter((val) => val !== v));
  };

  const showValueInput = !["is_empty", "is_not_empty"].includes(condition.operator || "contains_any");

  return (
    <BaseNode
      id={id}
      title="Logic Condition"
      icon={<Filter size={18} />}
      iconBgColor="bg-blue-100"
      iconColor="text-blue-600"
      borderColor="border-blue-200"
      handleColor="bg-blue-500!"
      errors={errors}
      headerRight={
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] h-4 px-1.5">
          Condition
        </Badge>
      }
    >
      <NodeField
        label="Match Field"
        required
        error={(touched || data.forceValidation) && !condition.field ? "Field is required" : ""}
      >
        <Select
          value={condition.field || "message"}
          onValueChange={(v) => updateCondition("field", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            {FIELD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="dark:hover:bg-(--card-color)">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </NodeField>

      <NodeField
        label="Operator"
        required
        error={(touched || data.forceValidation) && !condition.operator ? "Operator is required" : ""}
      >
        <Select
          value={condition.operator || "contains_any"}
          onValueChange={(v) => updateCondition("operator", v)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue placeholder="Select operator" />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            {OPERATOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="dark:hover:bg-(--card-color)">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </NodeField>

      {showValueInput && (
        <NodeField
          label="Match Values"
          required
          description="Add values to match against"
          error={
            (touched || data.forceValidation) && values.length === 0
              ? "At least one value is required"
              : ""
          }
        >
          <div className="flex gap-2">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onFocus={() => setTouched(true)}
              onKeyDown={(e) => e.key === "Enter" && addValue()}
              placeholder="Add a value..."
              className="h-9 text-sm bg-(--input-color)"
            />
            <Button
              onClick={addValue}
              size="icon"
              className="h-9 w-9 bg-primary hover:bg-primary dark:text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {values.length > 0 ? (
              values.map((v, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="flex items-center gap-1 bg-blue-50 dark:bg-(--dark-sidebar) dark:border-(--card-border-color) text-blue-700 border-blue-100"
                >
                  {v}
                  <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeValue(v)} />
                </Badge>
              ))
            ) : (
              <div className="w-full py-3 border border-dashed dark:bg-(--dark-sidebar) dark:border-(--card-border-color) border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50">
                <span className="text-[11px] text-gray-400">No values added yet.</span>
              </div>
            )}
          </div>
        </NodeField>
      )}

      <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color)">
        <div className="text-[10px] text-blue-500 font-medium">
          IF <span className="font-bold">{condition.field || "message"}</span>{" "}
          <span className="font-bold">{(condition.operator || "contains_any").replace(/_/g, " ")}</span>{" "}
          {values.length > 0 && (
            <>
              <span className="font-bold">[{values.join(", ")}]</span>
            </>
          )}
        </div>
      </div>
    </BaseNode>
  );
}