"use client";

import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useReactFlow } from "@xyflow/react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ButtonParam {
  id: string;
  title: string;
}

interface ListItem {
  id: string;
  title: string;
  description?: string;
}

interface ListParams {
  header?: string;
  footer?: string;
  buttonTitle?: string;
  sectionTitle?: string;
  items: ListItem[];
}

type MessageType = "Simple text" | "Media" | "Interactive";
type InteractiveType = "button" | "list";

interface NodeData {
  message?: string;
  messageType?: MessageType;
  mediaUrl?: string;
  interactiveType?: InteractiveType;
  buttons?: ButtonParam[];
  listParams?: ListParams;
  forceValidation?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SendMessageNode({ data, id }: { data: NodeData; id: string }) {
  const { setNodes } = useReactFlow();
  const [touched, setTouched] = useState(false);

  const messageType: MessageType = data.messageType || "Simple text";
  const interactiveType: InteractiveType = data.interactiveType || "button";
  const buttons: ButtonParam[] = data.buttons || [{ id: "btn_1", title: "" }];
  const listParams: ListParams = data.listParams || {
    items: [{ id: "item_1", title: "" }],
  };

  // ── Data updater ──────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateNodeData = (field: string, value: any) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (messageType === "Simple text" && !data.message?.trim())
      errors.push("Message content is required");

    if (messageType === "Media" && !data.mediaUrl?.trim())
      errors.push("Media URL is required");

    if (messageType === "Interactive") {
      if (!data.message?.trim()) errors.push("Body text is required");
      if (interactiveType === "button") {
        if (buttons.length === 0) errors.push("At least one button is required");
        buttons.forEach((btn, i) => {
          if (!btn.title.trim()) errors.push(`Button ${i + 1} title is required`);
          else if (btn.title.length > 20) errors.push(`Button ${i + 1} title exceeds 20 characters`);
        });
      }
      if (interactiveType === "list") {
        if (listParams.items.length === 0) errors.push("At least one list item is required");
        listParams.items.forEach((item, i) => {
          if (!item.title.trim()) errors.push(`Item ${i + 1} title is required`);
        });
      }
    }
  }

  // ── Button helpers ────────────────────────────────────────────────────────

  const addButton = () => {
    updateNodeData("buttons", [
      ...buttons,
      { id: `btn_${buttons.length + 1}`, title: "" },
    ]);
  };

  const updateButton = (index: number, value: string) => {
    updateNodeData(
      "buttons",
      buttons.map((btn, i) => (i === index ? { ...btn, title: value } : btn))
    );
  };

  const removeButton = (index: number) => {
    updateNodeData("buttons", buttons.filter((_, i) => i !== index));
  };

  // ── List helpers ──────────────────────────────────────────────────────────

  const updateListParam = (field: keyof Omit<ListParams, "items">, value: string) => {
    updateNodeData("listParams", { ...listParams, [field]: value });
  };

  const addListItem = () => {
    updateNodeData("listParams", {
      ...listParams,
      items: [...listParams.items, { id: `item_${listParams.items.length + 1}`, title: "" }],
    });
  };

  const updateListItem = (index: number, field: keyof ListItem, value: string) => {
    updateNodeData("listParams", {
      ...listParams,
      items: listParams.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    });
  };

  const removeListItem = (index: number) => {
    updateNodeData("listParams", {
      ...listParams,
      items: listParams.items.filter((_, i) => i !== index),
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <BaseNode
      id={id}
      title="Send Message"
      icon={<MessageSquare size={18} />}
      iconBgColor="bg-emerald-50"
      iconColor="text-emerald-600"
      borderColor="border-emerald-200"
      handleColor="bg-emerald-500!"
      errors={errors}
    >
      {/* ── Message Type ── */}
      <NodeField label="Message Type" required>
        <Select
          value={messageType}
          onValueChange={(value) => {
            setTouched(true);
            updateNodeData("messageType", value);
          }}
        >
          <SelectTrigger className="h-9 text-sm dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            <SelectItem value="Simple text" className="dark:hover:bg-(--card-color)">Simple Text</SelectItem>
            <SelectItem value="Media" className="dark:hover:bg-(--card-color)">Media</SelectItem>
            <SelectItem value="Interactive" className="dark:hover:bg-(--card-color)">Interactive</SelectItem>
          </SelectContent>
        </Select>
      </NodeField>

      {/* ── Simple Text ── */}
      {messageType === "Simple text" && (
        <NodeField
          label="Message"
          required
          error={(touched || data.forceValidation) && !data.message?.trim() ? "Required" : ""}
        >
          <Textarea
            placeholder={`Type your message…\nUse {{variable}} for dynamic values`}
            value={data.message || ""}
            onFocus={() => setTouched(true)}
            onChange={(e) => updateNodeData("message", e.target.value)}
            className={`min-h-[80px] resize-y text-sm bg-(--input-color) ${
              (touched || data.forceValidation) && !data.message?.trim() ? "border-red-300" : ""
            }`}
          />
        </NodeField>
      )}

      {/* ── Media ── */}
      {messageType === "Media" && (
        <>
          <NodeField
            label="Media URL"
            required
            description="Image (.jpg/.png), video (.mp4), audio (.mp3), or document (.pdf)"
            error={(touched || data.forceValidation) && !data.mediaUrl?.trim() ? "Required" : ""}
          >
            <Input
              placeholder="https://example.com/file.jpg"
              value={data.mediaUrl || ""}
              onFocus={() => setTouched(true)}
              onChange={(e) => updateNodeData("mediaUrl", e.target.value)}
              className={`h-9 text-sm bg-(--input-color) ${
                (touched || data.forceValidation) && !data.mediaUrl?.trim() ? "border-red-300" : ""
              }`}
            />
          </NodeField>
          <NodeField label="Caption" description="Optional — not supported for audio">
            <Textarea
              placeholder="Add a caption…"
              value={data.message || ""}
              onFocus={() => setTouched(true)}
              onChange={(e) => updateNodeData("message", e.target.value)}
              className="min-h-[60px] resize-y text-sm bg-(--input-color)"
            />
          </NodeField>
        </>
      )}

      {/* ── Interactive ── */}
      {messageType === "Interactive" && (
        <>
          <NodeField label="Interactive Type" required>
            <Select
              value={interactiveType}
              onValueChange={(value) => {
                setTouched(true);
                updateNodeData("interactiveType", value);
              }}
            >
              <SelectTrigger className="h-9 text-sm dark:bg-(--page-body-bg)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--page-body-bg)">
                <SelectItem value="button" className="dark:hover:bg-(--card-color)">Reply Buttons</SelectItem>
                <SelectItem value="list" className="dark:hover:bg-(--card-color)">List Menu</SelectItem>
              </SelectContent>
            </Select>
          </NodeField>

          <NodeField
            label="Body Text"
            required
            error={(touched || data.forceValidation) && !data.message?.trim() ? "Required" : ""}
          >
            <Textarea
              placeholder="Message body…"
              value={data.message || ""}
              onFocus={() => setTouched(true)}
              onChange={(e) => updateNodeData("message", e.target.value)}
              className={`min-h-[60px] resize-y text-sm bg-(--input-color) ${
                (touched || data.forceValidation) && !data.message?.trim() ? "border-red-300" : ""
              }`}
            />
          </NodeField>

          {/* Reply Buttons */}
          {interactiveType === "button" && (
            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-(--card-border-color)">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Buttons{" "}
                  <span className="font-normal normal-case text-gray-400">(max 3)</span>
                </p>
                {buttons.length < 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addButton}
                    className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus size={10} className="mr-1" /> Add
                  </Button>
                )}
              </div>
              {buttons.map((btn, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <div className="flex-1">
                    <NodeField
                      label={`Button ${i + 1}`}
                      required
                      error={
                        (touched || data.forceValidation) && !btn.title.trim()
                          ? "Required"
                          : btn.title.length > 20
                          ? "Max 20 characters"
                          : ""
                      }
                    >
                      <Input
                        value={btn.title}
                        onFocus={() => setTouched(true)}
                        onChange={(e) => updateButton(i, e.target.value)}
                        placeholder="Button label"
                        maxLength={25}
                        className={`h-8 text-xs bg-(--input-color) ${
                          (touched || data.forceValidation) &&
                          (!btn.title.trim() || btn.title.length > 20)
                            ? "border-red-300"
                            : ""
                        }`}
                      />
                    </NodeField>
                  </div>
                  {buttons.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeButton(i)}
                      className="mt-5 h-8 w-7 shrink-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* List Menu */}
          {interactiveType === "list" && (
            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-(--card-border-color)">
              <div className="grid grid-cols-2 gap-2">
                <NodeField label="Header">
                  <Input
                    value={listParams.header || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateListParam("header", e.target.value)}
                    placeholder="e.g. Our Products"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>
                <NodeField label="Footer">
                  <Input
                    value={listParams.footer || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateListParam("footer", e.target.value)}
                    placeholder="e.g. Tap to select"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>
                <NodeField label="Button Label">
                  <Input
                    value={listParams.buttonTitle || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateListParam("buttonTitle", e.target.value)}
                    placeholder="Select"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>
                <NodeField label="Section Title">
                  <Input
                    value={listParams.sectionTitle || ""}
                    onFocus={() => setTouched(true)}
                    onChange={(e) => updateListParam("sectionTitle", e.target.value)}
                    placeholder="Options"
                    className="h-8 text-xs bg-(--input-color)"
                  />
                </NodeField>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Items
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addListItem}
                    className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus size={10} className="mr-1" /> Add
                  </Button>
                </div>
                {listParams.items.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-gray-100 dark:border-(--card-border-color) bg-gray-50/50 dark:bg-(--dark-sidebar) p-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-500">
                        Item {i + 1}
                      </span>
                      {listParams.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeListItem(i)}
                          className="h-5 w-5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={10} />
                        </Button>
                      )}
                    </div>
                    <NodeField
                      label="Title"
                      required
                      error={
                        (touched || data.forceValidation) && !item.title.trim()
                          ? "Required"
                          : ""
                      }
                    >
                      <Input
                        value={item.title}
                        onFocus={() => setTouched(true)}
                        onChange={(e) => updateListItem(i, "title", e.target.value)}
                        placeholder="Item title"
                        className={`h-7 text-xs bg-(--input-color) ${
                          (touched || data.forceValidation) && !item.title.trim()
                            ? "border-red-300"
                            : ""
                        }`}
                      />
                    </NodeField>
                    <NodeField label="Description">
                      <Input
                        value={item.description || ""}
                        onFocus={() => setTouched(true)}
                        onChange={(e) => updateListItem(i, "description", e.target.value)}
                        placeholder="Optional description"
                        className="h-7 text-xs bg-(--input-color)"
                      />
                    </NodeField>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="pt-1 border-t border-gray-100 dark:border-(--card-border-color)">
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
