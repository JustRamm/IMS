import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar, User, Briefcase, Monitor, CheckCircle2, AlertCircle, Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useUsers, useBrands, useAssets, useMe } from "@/lib/queries";
import { promoteNextWaitlistOrFreeAsset } from "@/lib/realtime";
import { errMessage } from "@/lib/helpers";

const STAGES = [
  { value: "onboarding", label: "Onboarding" },
  { value: "invoicing", label: "Invoicing" },
  { value: "live", label: "Live" },
  { value: "closing", label: "Closing" },
  { value: "closed", label: "Closed" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function CampaignFormDialog({
  campaign = null,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  onSuccess,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const isEdit = Boolean(campaign);
  const { data: me } = useMe();
  const { data: users = [] } = useUsers();
  const { data: brands = [] } = useBrands();
  const { data: assets = [] } = useAssets();

  // Calculate default dates
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultEndStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    start_date: todayStr,
    end_date: defaultEndStr,
    duration_days: 30,
    salesperson_id: "",
    salesperson_name: "",
    brand_id: "",
    brand: "",
    custom_brand: "",
    asset_id: "",
    asset_code: "",
    stage: "onboarding",
    priority: "high",
  });

  const [isCustomBrand, setIsCustomBrand] = useState(false);

  // Sync form when opening or campaign changes
  useEffect(() => {
    if (!open) return;

    if (campaign) {
      setForm({
        start_date: campaign.start_date || todayStr,
        end_date: campaign.end_date || defaultEndStr,
        duration_days: campaign.duration_days || 30,
        salesperson_id: campaign.salesperson_id || "",
        salesperson_name: campaign.salesperson_name || "",
        brand_id: campaign.brand_id || "",
        brand: campaign.brand || "",
        custom_brand: "",
        asset_id: campaign.asset_id || "",
        asset_code: campaign.asset_code || "",
        stage: campaign.stage || "onboarding",
        priority: campaign.priority || "high",
      });
      // Check if brand exists in brands list
      const matchedBrand = brands.find((b) => b.id === campaign.brand_id || b.name?.toLowerCase() === campaign.brand?.toLowerCase());
      setIsCustomBrand(!matchedBrand && Boolean(campaign.brand));
    } else {
      setForm({
        start_date: todayStr,
        end_date: defaultEndStr,
        duration_days: 30,
        salesperson_id: me?.id || "",
        salesperson_name: me?.name || "",
        brand_id: "",
        brand: "",
        custom_brand: "",
        asset_id: "",
        asset_code: "",
        stage: "onboarding",
        priority: "high",
      });
      setIsCustomBrand(false);
    }
  }, [open, campaign, brands, me]);

  // Recalculate duration when dates change
  const handleStartDateChange = (val) => {
    setForm((f) => {
      let duration = f.duration_days;
      if (val && f.end_date) {
        const start = new Date(val);
        const end = new Date(f.end_date);
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) duration = diffDays;
      }
      return { ...f, start_date: val, duration_days: duration };
    });
  };

  const handleEndDateChange = (val) => {
    setForm((f) => {
      let duration = f.duration_days;
      if (f.start_date && val) {
        const start = new Date(f.start_date);
        const end = new Date(val);
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) duration = diffDays;
      }
      return { ...f, end_date: val, duration_days: duration };
    });
  };

  const handleDurationChange = (val) => {
    const days = parseInt(val, 10) || 0;
    setForm((f) => {
      let end = f.end_date;
      if (f.start_date && days > 0) {
        const start = new Date(f.start_date);
        end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      }
      return { ...f, duration_days: days, end_date: end };
    });
  };

  const handleSalespersonChange = (userId) => {
    if (userId === "unassigned" || !userId) {
      setForm((f) => ({ ...f, salesperson_id: "", salesperson_name: "" }));
      return;
    }
    const user = users.find((u) => u.id === userId);
    setForm((f) => ({
      ...f,
      salesperson_id: userId,
      salesperson_name: user?.name || user?.email?.split("@")[0] || "",
    }));
  };

  const handleBrandSelect = (brandId) => {
    if (brandId === "custom") {
      setIsCustomBrand(true);
      setForm((f) => ({ ...f, brand_id: "", brand: f.custom_brand || "" }));
      return;
    }
    setIsCustomBrand(false);
    const selected = brands.find((b) => b.id === brandId);
    setForm((f) => ({
      ...f,
      brand_id: brandId,
      brand: selected?.name || "",
      custom_brand: "",
    }));
  };

  const handleAssetSelect = (assetId) => {
    const selected = assets.find((a) => a.id === assetId);
    setForm((f) => ({
      ...f,
      asset_id: assetId,
      asset_code: selected?.asset_code || "",
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const brandName = isCustomBrand ? form.custom_brand.trim() : form.brand.trim();
      if (!brandName) throw new Error("Brand name is required");
      if (!form.asset_id) throw new Error("Associated asset is required");
      if (!form.start_date || !form.end_date) throw new Error("Campaign start and end dates are required");

      const finalDuration = Number(form.duration_days) || Math.max(1, Math.round((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24)));

      if (isEdit) {
        // --- EDIT CAMPAIGN ---
        const updates = {
          asset_id: form.asset_id,
          asset_code: form.asset_code,
          brand: brandName,
          brand_id: form.brand_id || null,
          salesperson_id: form.salesperson_id || null,
          salesperson_name: form.salesperson_name || null,
          start_date: form.start_date,
          end_date: form.end_date,
          duration_days: finalDuration,
          stage: form.stage,
          priority: form.priority,
        };

        const { error } = await supabase.from("campaigns").update(updates).eq("id", campaign.id);
        if (error) throw { body: { detail: error.message } };

        // If asset changed, update previous & new asset
        if (campaign.asset_id && campaign.asset_id !== form.asset_id) {
          await promoteNextWaitlistOrFreeAsset(campaign.asset_id, campaign.asset_code);
          if (["live", "onboarding"].includes(form.stage)) {
            await supabase
              .from("assets")
              .update({
                status: form.stage === "live" ? "live" : "onboarding",
                current_brand: brandName,
              })
              .eq("id", form.asset_id);
          }
        } else if (["live", "onboarding"].includes(form.stage)) {
          // If brand or stage updated on same asset
          await supabase
            .from("assets")
            .update({
              status: form.stage === "live" ? "live" : "onboarding",
              current_brand: brandName,
            })
            .eq("id", form.asset_id);
        }

        // Audit log
        await supabase.from("audit_logs").insert({
          id: crypto.randomUUID(),
          entity_type: "campaign",
          entity_id: campaign.id,
          action: "campaign_edited_by_admin",
          actor_name: me?.name || "Admin",
          comment: `Admin updated campaign for ${brandName} (${form.asset_code}): window ${form.start_date} to ${form.end_date}, salesperson: ${form.salesperson_name || "Unassigned"}`,
          created_at: new Date().toISOString(),
        });

        return { id: campaign.id, isEdit: true };
      } else {
        // --- ADD CAMPAIGN ---
        const newCampaignId = crypto.randomUUID();
        const defaultChecklist = [
          { key: "creative_brief", label: "Creative brief", mandatory: true, status: "pending" },
          { key: "site_inspection", label: "Site inspection", mandatory: true, status: "pending" },
          { key: "printing_dispatch", label: "Printing & dispatch", mandatory: true, status: "pending" },
          { key: "installation_photo", label: "Installation photo", mandatory: true, status: "pending" },
        ];

        const payload = {
          id: newCampaignId,
          asset_id: form.asset_id,
          asset_code: form.asset_code,
          brand: brandName,
          brand_id: form.brand_id || null,
          salesperson_id: form.salesperson_id || null,
          salesperson_name: form.salesperson_name || null,
          start_date: form.start_date,
          end_date: form.end_date,
          duration_days: finalDuration,
          proposed_duration_days: finalDuration,
          stage: form.stage,
          priority: form.priority,
          checklist: defaultChecklist,
          gtps: [],
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("campaigns").insert(payload);
        if (error) throw { body: { detail: error.message } };

        // Sync asset state
        if (["live", "onboarding"].includes(form.stage)) {
          await supabase
            .from("assets")
            .update({
              status: form.stage === "live" ? "live" : "onboarding",
              current_brand: brandName,
            })
            .eq("id", form.asset_id);
        }

        // Audit log
        await supabase.from("audit_logs").insert({
          id: crypto.randomUUID(),
          entity_type: "campaign",
          entity_id: newCampaignId,
          action: "campaign_created_by_admin",
          actor_name: me?.name || "Admin",
          comment: `Admin directly added campaign for ${brandName} on asset ${form.asset_code} (${form.start_date} to ${form.end_date})`,
          created_at: new Date().toISOString(),
        });

        return { id: newCampaignId, isEdit: false };
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      if (res.id) queryClient.invalidateQueries({ queryKey: ["campaign", res.id] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });

      toast.success(res.isEdit ? "Campaign updated successfully" : "Campaign created successfully");
      setOpen(false);
      onSuccess?.(res);
    },
    onError: (err) => {
      toast.error(errMessage(err, isEdit ? "Failed to update campaign" : "Failed to create campaign"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            {isEdit ? <Edit className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
            {isEdit ? "Edit Campaign" : "Add Direct Campaign"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update campaign window, sales representative, brand, and associated assets."
              : "Directly create and book a campaign with campaign window, salesperson, brand, and asset."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          data-testid="campaign-form"
        >
          {/* 1. CAMPAIGN WINDOW */}
          <div className="rounded-lg border border-border/70 bg-secondary/20 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
              <Calendar className="size-3.5 text-primary" />
              1. Campaign Window
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="camp-start-date" className="text-xs">Start Date *</Label>
                <Input
                  id="camp-start-date"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  data-testid="campaign-start-date-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="camp-end-date" className="text-xs">End Date *</Label>
                <Input
                  id="camp-end-date"
                  type="date"
                  required
                  value={form.end_date}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  data-testid="campaign-end-date-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="camp-duration" className="text-xs">Duration (days)</Label>
                <Input
                  id="camp-duration"
                  type="number"
                  min="1"
                  required
                  value={form.duration_days}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  data-testid="campaign-duration-input"
                />
              </div>
            </div>
          </div>

          {/* 2. SALES PERSON */}
          <div className="rounded-lg border border-border/70 bg-secondary/20 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
              <User className="size-3.5 text-primary" />
              2. Sales Person
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="camp-salesperson" className="text-xs">Assigned Sales Representative</Label>
              <Select
                value={form.salesperson_id || "unassigned"}
                onValueChange={handleSalespersonChange}
              >
                <SelectTrigger id="camp-salesperson" className="w-full" data-testid="campaign-salesperson-select">
                  <SelectValue placeholder="Select sales person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} data-testid={`salesperson-opt-${u.id}`}>
                      {u.name} ({u.role || "sales"}{u.email ? ` · ${u.email}` : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. ASSOCIATE BRAND */}
          <div className="rounded-lg border border-border/70 bg-secondary/20 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
              <Briefcase className="size-3.5 text-primary" />
              3. Associate Brand
            </div>

            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="camp-brand" className="text-xs">Select Registered Brand</Label>
                <Select
                  value={isCustomBrand ? "custom" : (form.brand_id || (form.brand ? "custom" : ""))}
                  onValueChange={handleBrandSelect}
                >
                  <SelectTrigger id="camp-brand" className="w-full" data-testid="campaign-brand-select">
                    <SelectValue placeholder="Choose a brand or enter custom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">+ Enter custom brand name...</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id} data-testid={`brand-opt-${b.id}`}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isCustomBrand && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="camp-custom-brand" className="text-xs">Custom Brand Name *</Label>
                  <Input
                    id="camp-custom-brand"
                    type="text"
                    required
                    placeholder="e.g. Nike, Apple, Local Retailer"
                    value={form.custom_brand || form.brand}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({ ...f, custom_brand: val, brand: val }));
                    }}
                    data-testid="campaign-custom-brand-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. ASSOCIATE ASSETS */}
          <div className="rounded-lg border border-border/70 bg-secondary/20 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
              <Monitor className="size-3.5 text-primary" />
              4. Associate Asset
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="camp-asset" className="text-xs">Select Asset / Display *</Label>
              <Select
                value={form.asset_id}
                onValueChange={handleAssetSelect}
              >
                <SelectTrigger id="camp-asset" className="w-full" data-testid="campaign-asset-select">
                  <SelectValue placeholder="Select media asset..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id} data-testid={`asset-opt-${a.id}`}>
                      {a.asset_code} — {a.location_name || "Location"} ({a.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* STAGE & PRIORITY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="camp-stage" className="text-xs">Lifecycle Stage</Label>
              <Select
                value={form.stage}
                onValueChange={(val) => setForm((f) => ({ ...f, stage: val }))}
              >
                <SelectTrigger id="camp-stage" className="w-full" data-testid="campaign-stage-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="camp-priority" className="text-xs">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(val) => setForm((f) => ({ ...f, priority: val }))}
              >
                <SelectTrigger id="camp-priority" className="w-full" data-testid="campaign-priority-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="submit-campaign-form-button"
            >
              {saveMutation.isPending
                ? (isEdit ? "Saving changes…" : "Creating campaign…")
                : (isEdit ? "Save Campaign Changes" : "Create Campaign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
