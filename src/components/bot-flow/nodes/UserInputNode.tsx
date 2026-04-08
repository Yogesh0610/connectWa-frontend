/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Input } from "@/src/elements/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown, ChevronUp, MessageSquareDot, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

interface Choice { id: string; label: string; value?: string; description?: string }
interface Condition {
  id: string;
  operator: "equals" | "contains" | "starts_with" | "ends_with" | "regex" | "default";
  value?: string;
  nextNodeId: string;
}

export function UserInputNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [showConditions, setShowConditions] = useState(false);

  const updateNodeData = (field: string, value: any) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };

  const currentType = data.inputType || "text";
  const isChoiceType   = currentType === "buttons" || currentType === "list";
  const isMediaType    = ["image", "video", "audio", "document", "sticker"].includes(currentType);
  const isLocationtype = currentType === "location";
  const isOtpType      = currentType === "otp";
  const isNfmType      = currentType === "nfm_reply";

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (!data.questionText?.trim()) errors.push("Question text is required");
    if (!data.variableName?.trim()) errors.push("Variable name is required");
    if (isChoiceType) {
      const choices: Choice[] = data.choices || [];
      if (choices.length < 2) errors.push("Add at least 2 options");
      if (currentType === "buttons" && choices.length > 3)
        errors.push("WhatsApp supports max 3 quick-reply buttons");
      if (currentType === "list" && choices.length > 10)
        errors.push("WhatsApp supports max 10 list items");
      choices.forEach((c, i) => {
        if (!c.label?.trim()) errors.push(`Option ${i + 1} label is required`);
      });
    }
    if (isOtpType) {
      const len = data.otpLength ?? 6;
      if (len < 4 || len > 8) errors.push("OTP length must be 4–8 digits");
    }
    if (isNfmType && !data.nfmFlowId?.trim()) errors.push("Meta Flow ID is required");
  }

  // ── Choice helpers ───────────────────────────────────────────────────────────
  const addChoice = () => {
    const choices: Choice[] = [...(data.choices || [])];
    choices.push({ id: crypto.randomUUID(), label: "", value: "" });
    updateNodeData("choices", choices);
  };
  const updateChoice = (idx: number, field: keyof Choice, value: string) => {
    const choices: Choice[] = [...(data.choices || [])];
    choices[idx] = { ...choices[idx], [field]: value };
    updateNodeData("choices", choices);
  };
  const removeChoice = (idx: number) => {
    const choices: Choice[] = [...(data.choices || [])];
    choices.splice(idx, 1);
    updateNodeData("choices", choices);
  };

  // ── Condition helpers ────────────────────────────────────────────────────────
  const conditions: Condition[] = data.conditions || [];
  const addCondition = () => {
    updateNodeData("conditions", [
      ...conditions,
      { id: crypto.randomUUID(), operator: "equals", value: "", nextNodeId: "" },
    ]);
  };
  const updateCondition = (idx: number, field: keyof Condition, value: string) => {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], [field]: value };
    updateNodeData("conditions", updated);
  };
  const removeCondition = (idx: number) => {
    const updated = [...conditions];
    updated.splice(idx, 1);
    updateNodeData("conditions", updated);
  };

  // ── Input type catalogue ─────────────────────────────────────────────────────
  const inputTypes = [
    { group: "Basic",    value: "text",       label: "Text (free text)" },
    { group: "Basic",    value: "number",     label: "Number" },
    { group: "Basic",    value: "email",      label: "Email" },
    { group: "Basic",    value: "phone",      label: "Phone" },
    { group: "Basic",    value: "date",       label: "Date" },
    { group: "Basic",    value: "time",       label: "Time" },
    { group: "Basic",    value: "yes_no",     label: "Yes / No" },
    { group: "WhatsApp", value: "buttons",    label: "Quick-reply Buttons (max 3)" },
    { group: "WhatsApp", value: "list",       label: "List Picker (max 10 items)" },
    { group: "WhatsApp", value: "location",   label: "Location (lat/lng)" },
    { group: "WhatsApp", value: "otp",        label: "OTP / Verification Code" },
    { group: "WhatsApp", value: "nfm_reply",  label: "Meta Native Flow (NFM)" },
    { group: "Media",    value: "image",      label: "Image" },
    { group: "Media",    value: "video",      label: "Video" },
    { group: "Media",    value: "audio",      label: "Audio / Voice" },
    { group: "Media",    value: "document",   label: "Document / File" },
    { group: "Media",    value: "sticker",    label: "Sticker" },
  ];

  const SectionToggle = ({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-md bg-gray-50 dark:bg-(--dark-sidebar) px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-(--card-color) transition-colors"
    >
      {label}
      {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
    </button>
  );

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
      {/* ── Question / Prompt ─────────────────────────────────────────────── */}
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
        <div className="mt-1 text-right text-[10px] text-gray-400">
          {data.questionText?.length || 0}/4096
        </div>
      </NodeField>

      {/* ── Save reply to variable ────────────────────────────────────────── */}
      <NodeField
        label="Save reply to variable"
        required
        description='Used in downstream nodes as {{variable_name}}'
        error={(touched || data.forceValidation) && !data.variableName?.trim() ? "Variable name is required" : ""}
      >
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 shrink-0">{"{{"}</span>
          <Input
            value={data.variableName || ""}
            onFocus={() => setTouched(true)}
            onChange={(e) => updateNodeData("variableName", e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())}
            placeholder="user_email"
            className="h-8 text-xs bg-(--input-color)"
          />
          <span className="text-xs text-gray-400 shrink-0">{"}}"}</span>
        </div>
      </NodeField>

      {/* ── Input type ───────────────────────────────────────────────────── */}
      <NodeField label="Expected Input Type">
        <Select
          value={currentType}
          onValueChange={(v) => {
            updateNodeData("inputType", v);
            updateNodeData("choices", []);
            updateNodeData("otpLength", 6);
            updateNodeData("locationSubvars", false);
            updateNodeData("mediaMaxSizeMb", null);
            updateNodeData("nfmFlowId", "");
            updateNodeData("nfmFlowToken", "");
            updateNodeData("nfmScreenId", "");
          }}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            {["Basic", "WhatsApp", "Media"].map((group) => (
              <div key={group}>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{group}</div>
                {inputTypes.filter((t) => t.group === group).map((t) => (
                  <SelectItem key={t.value} value={t.value} className="dark:hover:bg-(--card-color)">
                    {t.label}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </NodeField>

      {/* ── Quick-reply Buttons / List Picker ────────────────────────────── */}
      {isChoiceType && (
        <>
          {currentType === "list" && (
            <NodeField label="List Button Label" description="Text shown on the button that opens the list (max 20 chars)">
              <Input
                value={data.listButtonLabel || ""}
                onChange={(e) => updateNodeData("listButtonLabel", e.target.value)}
                placeholder="Choose an option"
                className="h-8 text-xs bg-(--input-color)"
                maxLength={20}
              />
            </NodeField>
          )}

          <NodeField
            label={currentType === "buttons" ? "Button Options" : "List Items"}
            description={
              currentType === "buttons"
                ? "Max 3 quick-reply buttons (Meta limit: 20 chars each)"
                : "Max 10 list items (title: 24 chars, description: 72 chars)"
            }
            error={(touched || data.forceValidation) && (data.choices || []).length < 2 ? "Add at least 2 options" : ""}
          >
            <div className="flex flex-col gap-2">
              {(data.choices || []).map((choice: Choice, idx: number) => (
                <div key={choice.id} className="flex items-start gap-1">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <Input
                      value={choice.label}
                      onChange={(e) => updateChoice(idx, "label", e.target.value)}
                      placeholder={`Option ${idx + 1} label`}
                      className="h-8 text-xs bg-(--input-color)"
                      maxLength={currentType === "buttons" ? 20 : 24}
                    />
                    {currentType === "list" && (
                      <Input
                        value={choice.description || ""}
                        onChange={(e) => updateChoice(idx, "description", e.target.value)}
                        placeholder="Description (optional, max 72 chars)"
                        className="h-7 text-[11px] bg-(--input-color) text-gray-500"
                        maxLength={72}
                      />
                    )}
                  </div>
                  <Input
                    value={choice.value || ""}
                    onChange={(e) => updateChoice(idx, "value", e.target.value)}
                    placeholder="value"
                    className="h-8 text-xs bg-(--input-color) w-24 shrink-0"
                  />
                  <button onClick={() => removeChoice(idx)} className="mt-1 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {(data.choices || []).length < (currentType === "buttons" ? 3 : 10) && (
                <button
                  onClick={addChoice}
                  className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 transition-colors w-fit"
                >
                  <Plus size={13} /> Add option
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!data.allowOther}
                onChange={(e) => updateNodeData("allowOther", e.target.checked)}
                className="accent-violet-500"
              />
              <span className="text-xs text-gray-500">
                Allow free-text fallback (saved to{" "}
                <code className="text-[10px]">{"{{"}{data.variableName || "reply"}{"}}"}</code>)
              </span>
            </label>
          </NodeField>
        </>
      )}

      {/* ── Location ─────────────────────────────────────────────────────── */}
      {isLocationtype && (
        <NodeField label="Location Sub-variables" description="Captured location is split into these variables.">
          <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-400">
            {[
              ["Latitude",  `${data.variableName || "location"}_lat`],
              ["Longitude", `${data.variableName || "location"}_lng`],
              ["Address",   `${data.variableName || "location"}_address`],
              ["Name",      `${data.variableName || "location"}_name`],
            ].map(([label, varName]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span>{label}</span>
                <code className="text-[10px] bg-(--input-color) rounded px-1 py-0.5 truncate">{"{{"}{varName}{"}}"}</code>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!data.requireNamedLocation}
              onChange={(e) => updateNodeData("requireNamedLocation", e.target.checked)}
              className="accent-violet-500"
            />
            <span className="text-xs text-gray-500">Require a named place (not just coordinates)</span>
          </label>
        </NodeField>
      )}

      {/* ── OTP ──────────────────────────────────────────────────────────── */}
      {isOtpType && (
        <>
          <NodeField label="OTP Length (digits)">
            <div className="flex items-center gap-2">
              <Input
                type="number" value={data.otpLength ?? 6} min={4} max={8}
                onChange={(e) => updateNodeData("otpLength", parseInt(e.target.value) || 6)}
                className="h-8 w-20 text-xs bg-(--input-color)"
              />
              <span className="text-xs text-gray-400">digits (4–8)</span>
            </div>
          </NodeField>
          <NodeField label="OTP Expiry (seconds)" description="Code is invalid after this window">
            <div className="flex items-center gap-2">
              <Input
                type="number" value={data.otpExpiry ?? 300} step={60} min={60}
                onChange={(e) => updateNodeData("otpExpiry", parseInt(e.target.value) || 300)}
                className="h-8 w-24 text-xs bg-(--input-color)"
              />
              <span className="text-xs text-gray-400">sec</span>
            </div>
          </NodeField>
          <NodeField label="Resend Prompt (optional)">
            <Input
              value={data.otpResendText || ""}
              placeholder='e.g. "Resend code"'
              onChange={(e) => updateNodeData("otpResendText", e.target.value)}
              className="h-8 text-xs bg-(--input-color)"
            />
          </NodeField>
        </>
      )}

      {/* ── Meta Native Flow (NFM Reply) ──────────────────────────────────── */}
      {isNfmType && (
        <>
          <NodeField
            label="Meta Flow ID"
            required
            description="The ID of the WhatsApp Flow created in Meta Business Manager"
            error={(touched || data.forceValidation) && !data.nfmFlowId?.trim() ? "Flow ID is required" : ""}
          >
            <Input
              value={data.nfmFlowId || ""}
              onChange={(e) => updateNodeData("nfmFlowId", e.target.value.trim())}
              placeholder="e.g. 1234567890"
              className="h-8 text-xs bg-(--input-color)"
            />
          </NodeField>
          <NodeField label="Flow Token" description="Token generated when sending the flow (use 'unused' for draft)">
            <Input
              value={data.nfmFlowToken || ""}
              onChange={(e) => updateNodeData("nfmFlowToken", e.target.value.trim())}
              placeholder="unused"
              className="h-8 text-xs bg-(--input-color)"
            />
          </NodeField>
          <NodeField label="Opening Screen ID" description="The screen ID shown first when the flow opens">
            <Input
              value={data.nfmScreenId || ""}
              onChange={(e) => updateNodeData("nfmScreenId", e.target.value.trim())}
              placeholder="e.g. SCREEN_1"
              className="h-8 text-xs bg-(--input-color)"
            />
          </NodeField>
          <NodeField label="Flow Mode">
            <Select value={data.nfmMode || "published"} onValueChange={(v) => updateNodeData("nfmMode", v)}>
              <SelectTrigger className="h-8 text-xs bg-(--input-color) dark:bg-(--page-body-bg)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--page-body-bg)">
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft (testing only)</SelectItem>
              </SelectContent>
            </Select>
          </NodeField>
          <NodeField label="Prefill Data (JSON, optional)" description="Key-value pairs sent to the flow's opening screen">
            <Textarea
              value={data.nfmFlowData || ""}
              onChange={(e) => updateNodeData("nfmFlowData", e.target.value)}
              placeholder={'{\n  "name": "{{user_name}}"\n}'}
              className="min-h-16 resize-none text-xs font-mono dark:bg-(--page-body-bg)"
            />
          </NodeField>
        </>
      )}

      {/* ── Media ────────────────────────────────────────────────────────── */}
      {isMediaType && (
        <>
          <NodeField label="Max File Size (MB)" description="Leave blank to use WhatsApp's default limit">
            <div className="flex items-center gap-2">
              <Input
                type="number" value={data.mediaMaxSizeMb ?? ""} placeholder="Default" min={1}
                onChange={(e) => updateNodeData("mediaMaxSizeMb", e.target.value ? parseInt(e.target.value) : null)}
                className="h-8 w-24 text-xs bg-(--input-color)"
              />
              <span className="text-xs text-gray-400">MB</span>
            </div>
          </NodeField>
          {(currentType === "image" || currentType === "video") && (
            <NodeField label="Save Media URL to variable">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 shrink-0">{"{{"}</span>
                <Input
                  value={data.mediaUrlVariable || ""}
                  onChange={(e) => updateNodeData("mediaUrlVariable", e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())}
                  placeholder={`${data.variableName || "media"}_url`}
                  className="h-8 text-xs bg-(--input-color)"
                />
                <span className="text-xs text-gray-400 shrink-0">{"}}"}</span>
              </div>
            </NodeField>
          )}
          <NodeField label="Allowed MIME Types (optional)">
            <Input
              value={data.allowedMimeTypes || ""}
              placeholder="e.g. image/jpeg, image/png"
              onChange={(e) => updateNodeData("allowedMimeTypes", e.target.value)}
              className="h-8 text-xs bg-(--input-color)"
            />
            <div className="mt-1 text-[10px] text-gray-400">Comma-separated. Leave blank to accept all.</div>
          </NodeField>
        </>
      )}

      {/* ══ VALIDATION ══════════════════════════════════════════════════════ */}
      <SectionToggle label="Validation & Retry" open={showValidation} onToggle={() => setShowValidation((v) => !v)} />
      {showValidation && (
        <div className="space-y-3 rounded-md border border-dashed border-gray-200 dark:border-(--card-border-color) p-3">
          {/* Required */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!data.required}
              onChange={(e) => updateNodeData("required", e.target.checked)}
              className="accent-violet-500"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">Required — don&apos;t skip if user sends empty</span>
          </label>

          {/* Min / Max length */}
          {["text", "email", "phone", "number"].includes(currentType) && (
            <div className="grid grid-cols-2 gap-2">
              <NodeField label="Min length / value">
                <Input
                  type="number" value={data.minLength ?? ""}
                  placeholder="None"
                  onChange={(e) => updateNodeData("minLength", e.target.value ? parseInt(e.target.value) : null)}
                  className="h-8 text-xs bg-(--input-color)"
                />
              </NodeField>
              <NodeField label="Max length / value">
                <Input
                  type="number" value={data.maxLength ?? ""}
                  placeholder="None"
                  onChange={(e) => updateNodeData("maxLength", e.target.value ? parseInt(e.target.value) : null)}
                  className="h-8 text-xs bg-(--input-color)"
                />
              </NodeField>
            </div>
          )}

          {/* Regex */}
          {["text", "email", "phone", "number"].includes(currentType) && (
            <NodeField label="Regex pattern (optional)" description="Input must match this pattern">
              <Input
                value={data.validationRegex || ""}
                placeholder="e.g. ^[0-9]{10}$"
                onChange={(e) => updateNodeData("validationRegex", e.target.value)}
                className="h-8 text-xs font-mono bg-(--input-color)"
              />
            </NodeField>
          )}

          {/* Error message */}
          <NodeField label="Validation error message" description="Sent to user when input is invalid">
            <Input
              value={data.validationError || ""}
              onFocus={() => setTouched(true)}
              onChange={(e) => updateNodeData("validationError", e.target.value)}
              placeholder="Please enter a valid value."
              className="h-8 text-xs bg-(--input-color)"
            />
          </NodeField>

          {/* Retry count */}
          <NodeField label="Max retries" description="Re-ask this many times before going to fallback">
            <div className="flex items-center gap-2">
              <Input
                type="number" value={data.retryCount ?? 3} min={1} max={10}
                onChange={(e) => updateNodeData("retryCount", parseInt(e.target.value) || 3)}
                className="h-8 w-20 text-xs bg-(--input-color)"
              />
              <span className="text-xs text-gray-400">times</span>
            </div>
          </NodeField>

          {/* Fallback node after retries exhausted */}
          <NodeField label="Fallback node ID" description="Go here after retries exhausted (leave blank to end flow)">
            <Input
              value={data.retryFallbackNodeId || ""}
              placeholder="node_id (optional)"
              onChange={(e) => updateNodeData("retryFallbackNodeId", e.target.value.trim())}
              className="h-8 text-xs font-mono bg-(--input-color)"
            />
          </NodeField>
        </div>
      )}

      {/* ══ TIMEOUT ═════════════════════════════════════════════════════════ */}
      <SectionToggle label="Timeout" open={showTimeout} onToggle={() => setShowTimeout((v) => !v)} />
      {showTimeout && (
        <div className="space-y-3 rounded-md border border-dashed border-gray-200 dark:border-(--card-border-color) p-3">
          <NodeField label="Timeout (seconds)" description="How long to wait for user reply">
            <div className="flex items-center gap-2">
              <Input
                type="number" value={data.timeoutSeconds ?? ""} placeholder="No timeout" min={5} step={5}
                onFocus={() => setTouched(true)}
                onChange={(e) => updateNodeData("timeoutSeconds", e.target.value ? parseInt(e.target.value) : null)}
                className="h-8 w-24 text-xs bg-(--input-color)"
              />
              <span className="text-xs text-gray-500 font-medium shrink-0">sec</span>
            </div>
          </NodeField>
          <NodeField label="Timeout message (optional)" description="Sent to user when they don't reply in time">
            <Input
              value={data.timeoutMessage || ""}
              placeholder='e.g. "Are you still there?"'
              onChange={(e) => updateNodeData("timeoutMessage", e.target.value)}
              className="h-8 text-xs bg-(--input-color)"
            />
          </NodeField>
          <NodeField label="Timeout fallback node ID" description="Go here if no reply received">
            <Input
              value={data.timeoutFallbackNodeId || ""}
              placeholder="node_id (optional)"
              onChange={(e) => updateNodeData("timeoutFallbackNodeId", e.target.value.trim())}
              className="h-8 text-xs font-mono bg-(--input-color)"
            />
          </NodeField>
        </div>
      )}

      {/* ══ CONDITIONS ══════════════════════════════════════════════════════ */}
      <SectionToggle label="Conditional Branching" open={showConditions} onToggle={() => setShowConditions((v) => !v)} />
      {showConditions && (
        <div className="space-y-2 rounded-md border border-dashed border-gray-200 dark:border-(--card-border-color) p-3">
          <div className="text-[10px] text-gray-400 mb-1">
            Route to different nodes based on what the user replies. Evaluated top-to-bottom; first match wins.
          </div>

          {conditions.map((cond, idx) => (
            <div key={cond.id} className="flex flex-col gap-1 rounded-md bg-gray-50 dark:bg-(--dark-sidebar) p-2">
              <div className="flex items-center gap-1">
                <Select
                  value={cond.operator}
                  onValueChange={(v) => updateCondition(idx, "operator", v)}
                >
                  <SelectTrigger className="h-7 text-xs bg-white dark:bg-(--card-color) flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-(--page-body-bg)">
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="starts_with">Starts with</SelectItem>
                    <SelectItem value="ends_with">Ends with</SelectItem>
                    <SelectItem value="regex">Regex match</SelectItem>
                    <SelectItem value="default">Default (catch-all)</SelectItem>
                  </SelectContent>
                </Select>
                <button onClick={() => removeCondition(idx)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>

              {cond.operator !== "default" && (
                <Input
                  value={cond.value || ""}
                  placeholder={cond.operator === "regex" ? "^yes|si$" : "match value..."}
                  onChange={(e) => updateCondition(idx, "value", e.target.value)}
                  className="h-7 text-xs font-mono bg-white dark:bg-(--card-color)"
                />
              )}

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 shrink-0">→ Node ID:</span>
                <Input
                  value={cond.nextNodeId || ""}
                  placeholder="target_node_id"
                  onChange={(e) => updateCondition(idx, "nextNodeId", e.target.value.trim())}
                  className="h-7 text-xs font-mono bg-white dark:bg-(--card-color)"
                />
              </div>
            </div>
          ))}

          <button
            onClick={addCondition}
            className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 transition-colors w-fit"
          >
            <Plus size={13} /> Add condition
          </button>

          {conditions.length === 0 && (
            <div className="text-[10px] text-gray-400 italic">
              No conditions — flow continues to the default next node.
            </div>
          )}
        </div>
      )}
    </BaseNode>
  );
}
