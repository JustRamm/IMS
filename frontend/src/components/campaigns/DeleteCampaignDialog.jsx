import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useMe } from "@/lib/queries";
import { promoteNextWaitlistOrFreeAsset } from "@/lib/realtime";
import { errMessage, fmtDate } from "@/lib/helpers";

export default function DeleteCampaignDialog({
  campaign,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  onSuccess,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [freeAsset, setFreeAsset] = useState(true);
  const { data: me } = useMe();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!campaign?.id) return;

      // 1. Delete campaign from database
      const { error } = await supabase.from("campaigns").delete().eq("id", campaign.id);
      if (error) throw { body: { detail: error.message } };

      // 2. Free associated assets if requested
      const allCampaignAssets = [
        { id: campaign.asset_id, code: campaign.asset_code },
        ...(Array.isArray(campaign.extra_assets) ? campaign.extra_assets : []),
      ].filter((a) => a?.id);

      if (freeAsset) {
        for (const a of allCampaignAssets) {
          try {
            await promoteNextWaitlistOrFreeAsset(a.id, a.code);
          } catch (e) {
            console.warn("Could not auto-promote/free asset:", e);
          }
        }
      }

      // 3. Log audit event
      const allCodes = allCampaignAssets.map((a) => a.code).filter(Boolean).join(", ") || campaign.asset_code;
      try {
        await supabase.from("audit_logs").insert({
          id: crypto.randomUUID(),
          entity_type: "campaign",
          entity_id: campaign.id,
          action: "campaign_deleted_by_admin",
          actor_name: me?.name || "Admin",
          comment: `Admin deleted campaign for brand "${campaign.brand}" on assets ${allCodes} (Dates: ${campaign.start_date || "N/A"} to ${campaign.end_date || "N/A"})`,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Could not insert audit log:", e);
      }

      return { id: campaign.id, asset_code: allCodes, brand: campaign.brand };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.removeQueries({ queryKey: ["campaign", campaign?.id] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });

      toast.success(`Campaign for "${res.brand}" deleted successfully`);
      setOpen(false);
      onSuccess?.(res);
    },
    onError: (err) => {
      toast.error(errMessage(err, "Failed to delete campaign"));
    },
  });

  if (!campaign) return null;

  const allCampaignAssets = [
    { id: campaign.asset_id, code: campaign.asset_code },
    ...(Array.isArray(campaign.extra_assets) ? campaign.extra_assets : []),
  ].filter((a) => a?.id);
  const allAssetCodes = allCampaignAssets.map((a) => a.code).filter(Boolean).join(", ") || campaign.asset_code;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg text-red-600 dark:text-red-400">
            <AlertTriangle className="size-5 shrink-0" />
            Delete Campaign
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete this campaign? This action cannot be reversed.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-red-200/50 bg-red-50/40 dark:bg-red-950/20 p-3.5 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Brand:</span>
            <span className="font-semibold text-foreground">{campaign.brand}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{allCampaignAssets.length > 1 ? "Assets:" : "Asset:"}</span>
            <span className="font-mono font-medium text-foreground">{allAssetCodes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Window:</span>
            <span className="text-foreground">
              {campaign.start_date ? `${fmtDate(campaign.start_date)} → ${fmtDate(campaign.end_date)}` : "Not scheduled"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sales Rep:</span>
            <span className="text-foreground">{campaign.salesperson_name || "Unassigned"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Stage:</span>
            <span className="capitalize font-medium text-foreground">{campaign.stage}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <Checkbox
            id="free-asset-checkbox"
            checked={freeAsset}
            onCheckedChange={(chk) => setFreeAsset(Boolean(chk))}
          />
          <Label htmlFor="free-asset-checkbox" className="text-xs cursor-pointer">
            Free associated asset(s) ({allAssetCodes}) and promote waitlist
          </Label>
        </div>

        <DialogFooter className="pt-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid="confirm-delete-campaign-button"
            className="gap-1.5"
          >
            <Trash2 className="size-4" />
            {deleteMutation.isPending ? "Deleting…" : "Delete Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
