"use client";
import { useState } from "react";
import {
  useGetMetaAdAccountsQuery, useGetMetaAccountPagesQuery,
  useGetMetaLeadFormsQuery, useCreateMetaLeadFormMutation,
} from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/elements/ui/dialog";
import CommonHeader from "@/src/shared/CommonHeader";
import { FileText, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

const MetaLeadFormsPage = () => {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedPage, setSelectedPage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", privacy_policy_url: "" });

  const { data: accountsRes } = useGetMetaAdAccountsQuery();
  const { data: pagesRes } = useGetMetaAccountPagesQuery({ ad_account_id: selectedAccount }, { skip: !selectedAccount });
  const { data: formsRes, isLoading } = useGetMetaLeadFormsQuery(
    { ad_account_id: selectedAccount, page_id: selectedPage },
    { skip: !selectedAccount || !selectedPage }
  );
  const [createForm, { isLoading: isCreating }] = useCreateMetaLeadFormMutation();

  const accounts = accountsRes?.data || [];
  const pages = pagesRes?.data || [];
  const forms = formsRes?.data || [];

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error("Form name required"); return; }
    try {
      await createForm({ ad_account_id: selectedAccount, page_id: selectedPage, ...formData }).unwrap();
      toast.success("Lead form created!");
      setCreateOpen(false);
      setFormData({ name: "", privacy_policy_url: "" });
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to create");
    }
  };

  return (
    <div className="sm:p-8 p-4">
      <CommonHeader
        title="Lead Forms"
        description="Manage Meta lead generation forms"
        isLoading={isLoading}
        backBtn
        rightContent={
          <Button className="h-11 px-4 gap-2 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            onClick={() => setCreateOpen(true)} disabled={!selectedPage}>
            <Plus size={13}/> New Form
          </Button>
        }
      >
        {// Filters inside header search bar area
        }
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedAccount} onValueChange={(v) => { setSelectedAccount(v); setSelectedPage(""); }}>
            <SelectTrigger className="h-11 w-52 bg-white dark:bg-(--card-color) rounded-lg text-sm border-slate-200 dark:border-(--card-border-color)">
              <SelectValue placeholder="Select account..." />
            </SelectTrigger>
            <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
              {accounts.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedAccount && (
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger className="h-11 w-52 bg-white dark:bg-(--card-color) rounded-lg text-sm border-slate-200 dark:border-(--card-border-color)">
                <SelectValue placeholder="Select page..." />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {pages.map(p => <SelectItem key={p.page_id} value={p.page_id}>{p.page_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </CommonHeader>

      {!selectedAccount || !selectedPage ? (
        <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm py-20 text-center">
          <FileText size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3"/>
          <p className="text-sm font-bold text-slate-400">Select an account and page to view lead forms</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary"/></div>
      ) : forms.length === 0 ? (
        <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm py-20 text-center">
          <FileText size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3"/>
          <p className="text-sm font-bold text-slate-400">No lead forms found</p>
          <Button className="mt-4 h-9 px-4 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus size={12}/> Create First Form
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => (
            <div key={form.id} className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"><FileText size={16} className="text-blue-600"/></div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${form.status==="ACTIVE" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"}`}>
                  {form.status}
                </span>
              </div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{form.name}</p>
              <div className="flex items-center gap-1.5 mt-2 text-slate-500">
                <Users size={11}/>
                <span className="text-[11px] font-medium">{form.leads_count?.toLocaleString()||0} leads</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{new Date(form.created_time).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="dark:bg-(--card-color) dark:border-(--card-border-color) max-w-md">
          <DialogHeader><DialogTitle className="font-black">Create Lead Form</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Form Name *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Contact Us Form" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Privacy Policy URL</Label>
              <Input value={formData.privacy_policy_url} onChange={e => setFormData(p => ({ ...p, privacy_policy_url: e.target.value }))}
                placeholder="https://yourdomain.com/privacy" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 dark:bg-(--dark-body) rounded-lg px-3 py-2">
              Default fields (Name, Email, Phone) will be added automatically.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreate} disabled={isCreating || !formData.name}>
                {isCreating ? <Loader2 size={14} className="animate-spin mr-2"/> : null} Create Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MetaLeadFormsPage;