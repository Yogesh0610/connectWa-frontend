/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Textarea } from "@/src/elements/ui/textarea";
import { useCreateAttachmentMutation } from "@/src/redux/api/mediaApi";
import { useReactFlow } from "@xyflow/react";
import { FileText, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { BaseNode } from "./BaseNode";
import { NodeField } from "./NodeField";

type MediaType = "image" | "video" | "document" | "audio";

interface NodeData {
  mediaType?: MediaType;
  mediaUrl?: string;
  caption?: string;
  forceValidation?: boolean;
}

const ACCEPT: Record<MediaType, string> = {
  image:    "image/jpeg,image/png,image/gif,image/webp",
  video:    "video/mp4,video/webm,video/avi",
  document: "application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip",
  audio:    "audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/m4a",
};

export function MediaMessageNode({ data, id }: { data: NodeData; id: string }) {
  const { setNodes } = useReactFlow();
  const [createAttachment] = useCreateAttachmentMutation();
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaType: MediaType = data.mediaType || "image";

  const errors: string[] = [];
  if (touched || data.forceValidation) {
    if (!data.mediaUrl?.trim()) errors.push("Media URL is required");
  }

  const updateNodeData = (field: string, value: string) => {
    if (!touched) setTouched(true);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploading(true);
    if (!touched) setTouched(true);

    try {
      const formData = new FormData();
      formData.append("attachments", file);

      const result = await createAttachment(formData).unwrap();
      const serverUrl = result?.data?.[0]?.url || result?.[0]?.url;

      if (serverUrl) {
        updateNodeData("mediaUrl", serverUrl);
        toast.success("Media uploaded successfully");
      } else {
        toast.error("Upload succeeded but no URL returned");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload media — paste a URL manually");
    } finally {
      setUploading(false);
    }
  };

  return (
    <BaseNode
      id={id}
      title="Media Message"
      icon={<ImageIcon size={18} />}
      iconBgColor="bg-orange-100"
      iconColor="text-orange-600"
      borderColor="border-orange-200"
      handleColor="bg-orange-500!"
      errors={errors}
      // showOutHandle defaults to true — media messages CAN be chained
    >
      {/* ── Media Type ── */}
      <NodeField label="Media Type">
        <Select
          value={mediaType}
          onValueChange={(val) => updateNodeData("mediaType", val)}
          onOpenChange={() => setTouched(true)}
        >
          <SelectTrigger className="h-9 text-sm bg-(--input-color) dark:bg-(--page-body-bg)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--page-body-bg)">
            <SelectItem className="dark:hover:bg-(--table-hover)" value="image">Image</SelectItem>
            <SelectItem className="dark:hover:bg-(--table-hover)" value="video">Video</SelectItem>
            <SelectItem className="dark:hover:bg-(--table-hover)" value="document">Document</SelectItem>
            <SelectItem className="dark:hover:bg-(--table-hover)" value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-gray-400 mt-1">
          Supported: jpeg, png, mp4, pdf, zip, json, mp3
        </p>
      </NodeField>

      {/* ── Media URL + Upload ── */}
      <NodeField
        label="Media URL"
        required
        error={(touched || data.forceValidation) && !data.mediaUrl?.trim() ? "Required" : ""}
      >
        <div className="flex gap-1.5">
          <Input
            value={data.mediaUrl || ""}
            onFocus={() => setTouched(true)}
            onChange={(e) => updateNodeData("mediaUrl", e.target.value)}
            placeholder="https://example.com/file.jpg"
            disabled={uploading}
            className={`h-9 text-sm bg-(--input-color) flex-1 ${
              (touched || data.forceValidation) && !data.mediaUrl?.trim()
                ? "border-red-300"
                : ""
            }`}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Upload file"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 shrink-0 border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
          </Button>
        </div>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT[mediaType]}
          className="hidden"
          onChange={handleFileChange}
        />
        {uploading && (
          <p className="text-[10px] text-orange-500 mt-1">Uploading…</p>
        )}
      </NodeField>

      {/* ── Caption (not for audio) ── */}
      {mediaType !== "audio" && (
        <NodeField label="Caption" description="Optional">
          <Textarea
            value={data.caption || ""}
            onFocus={() => setTouched(true)}
            onChange={(e) => updateNodeData("caption", e.target.value)}
            placeholder="Add a caption… Use {{variable}} for dynamic values"
            maxLength={1024}
            className="min-h-[60px] resize-y text-sm bg-(--input-color) dark:bg-(--page-body-bg)"
          />
          <div className="text-right text-[10px] text-gray-400 mt-0.5">
            {data.caption?.length || 0}/1024
          </div>
        </NodeField>
      )}

      {/* ── Preview ── */}
      {data.mediaUrl && (
        <div className="pt-2 border-t border-gray-100 dark:border-(--card-border-color) space-y-1.5">
          <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Preview
          </Label>
          <div className="rounded-lg overflow-hidden border border-gray-100 dark:border-(--card-border-color) bg-white dark:bg-(--dark-sidebar) shadow-sm">
            <div className="flex flex-col">
              <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {mediaType === "image" && (
                  <img
                    src={data.mediaUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/600x400?text=Invalid+URL";
                    }}
                  />
                )}
                {mediaType === "video" && (
                  <>
                    <img
                      src={data.mediaUrl}
                      alt="Video thumbnail"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/600x400?text=Video";
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="h-12 w-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[14px] border-l-white border-b-8 border-b-transparent ml-1" />
                      </div>
                    </div>
                  </>
                )}
                {mediaType === "audio" && (
                  <div className="flex flex-col items-center gap-2 p-4 text-blue-500">
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-full">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <span className="text-[10px] text-gray-500 truncate max-w-[180px]">
                      {data.mediaUrl.split("/").pop()}
                    </span>
                  </div>
                )}
                {mediaType === "document" && (
                  <div className="flex flex-col items-center gap-2 p-4 text-orange-500">
                    <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-full">
                      <FileText size={32} strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] text-gray-500 truncate max-w-[180px]">
                      {data.mediaUrl.split("/").pop()}
                    </span>
                  </div>
                )}
              </div>

              {data.caption && mediaType !== "audio" && (
                <div className="p-2 border-t border-gray-50 dark:border-(--card-border-color)">
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {data.caption}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50/80 dark:bg-black/20 p-1.5 flex justify-end">
              <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">
                WhatsApp Preview
              </span>
            </div>
          </div>
        </div>
      )}
    </BaseNode>
  );
}
