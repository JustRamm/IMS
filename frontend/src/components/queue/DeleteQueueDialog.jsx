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
import { errMessage, fmtDate } from "@/lib/helpers";

/**
 * DeleteQueueDialog
 * Allows administrators to permanently delete/remove an Interest Queue entry.
 * Safely handles:
 * - Auto-promoting the next waitlist entry if an active entry is removed
 * - Resequencing remaining pending waitlist positions
 * - Freeing the asset if no waitlist remains
 * - Creating immutable audit log trails
 */
export default function DeleteQueueDialog({
  entry,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  onSuccess,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [promoteNext, setPromoteNext] = useState(true);
  const { data: me } = useMe();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!entry?.id) return;

      const wasActive = entry.state === "active";
      const assetId = entry.asset_id;
      const assetCode = entry.asset_code;
      const brandName = entry.brand;

      // 1. Delete queue entry from database
      const { error: delErr } = await supabase
        .from("queue_entries")
        .delete()
        .eq("id", entry.id);

      if (delErr) throw { body: { detail: delErr.message } };

      // 2. Handle asset state and waitlist resequencing
      if (wasActive && promoteNext && assetId) {
        // Find next pending entry to auto-promote
        const { data: next } = await supabase
          .from("queue_entries")
          .select("*")
          .eq("asset_id", assetId)
          .eq("state", "pending")
          .order("position")
          .limit(1)
          .maybeSingle();

        if (next) {
          // Calculate 5-business-day expiry
          let d = new Date();
          let counted = 0;
          while (counted < 5) {
            d.setDate(d.getDate() + 1);
            const dow = d.getDay();
            if (dow !== 0 && dow !== 6) counted++;
          }
          const expiryIso = d.toISOString().split("T")[0];

          await supabase
            .from("queue_entries")
            .update({
              state: "active",
              position: 0,
              expires_on: expiryIso,
            })
            .eq("id", next.id);

          // Resequence remaining
          const { data: remaining } = await supabase
            .from("queue_entries")
            .select("id")
            .eq("asset_id", assetId)
            .eq("state", "pending")
            .neq("id", next.id)
            .order("position");

          for (let i = 0; i < (remaining || []).length; i++) {
            await supabase
              .from("queue_entries")
              .update({ position: i + 1 })
              .eq("id", remaining[i].id);
          }
        } else {
          // No waitlist — check if there is an active/onboarding campaign on this asset
          const { data: activeCamps } = await supabase
            .from("campaigns")
            .select("id")
            .eq("asset_id", assetId)
            .in("stage", ["onboarding", "invoicing", "live", "closing"]);

          if (!activeCamps || activeCamps.length === 0) {
            await supabase
              .from("assets")
              .update({
                status: "available",
                current_brand: null,
                proof_photo_url: null,
                proof_photo_ids: [],
                photo_url: null,
                photo_ids: [],
                start_date: null,
                end_date: null,
              })
              .eq("id", assetId);
          }
        }
      } else if (entry.state === "pending" && assetId) {
        // Compact positions for remaining pending entries on this asset
        const { data: remaining } = await supabase
          .from("queue_entries")
          .select("id")
          .eq("asset_id", assetId)
          .eq("state", "pending")
          .order("position");

        for (let i = 0; i < (remaining || []).length; i++) {
          await supabase
            .from("queue_entries")
            .update({ position: i + 1 })
            .eq("id", remaining[i].id);
        }
      }

      // 3. Log audit event
      try {
        await supabase.from("audit_logs").insert({
          id: crypto.randomUUID(),
          entity_type: "queue_entry",
          entity_id: entry.id,
          action: "queue_entry_deleted_by_admin",
          actor_name: me?.name || "Admin",
          comment: `Admin permanently deleted queue entry for brand '${brandName}' on asset ${assetCode} (${entry.state === "active" ? "Active slot" : `Waitlist #${entry.position}`}).`,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Audit logging failed:", e);
      }

      return { id: entry.id, brand: brandName, asset_code: assetCode };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin_queue_entries"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });

      toast.success(`Queue entry for "${res.brand}" deleted successfully`);
      setOpen(false);
      onSuccess?.(res);
    },
    onError: (err) => {
      toast.error(errMessage(err, "Failed to delete queue entry"));
    },
  });

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg text-red-600 dark:text-red-400">
            <AlertTriangle className="size-5 shrink-0" />
            Delete Queue Entry
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete this reservation from the Interest Queue? This action cannot be reversed.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-red-200/50 bg-red-50/40 dark:bg-red-950/20 p-3.5 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Brand:</span>
            <span className="font-semibold text-foreground">{entry.brand}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Asset:</span>
            <span className="font-mono font-medium text-foreground">{entry.asset_code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Queue Position / State:</span>
            <span className="font-medium text-foreground">
              {entry.state === "active"
                ? "Active Reservation Slot"
                : `Waitlist Position #${entry.position ?? 1}`}
            </span>
          </div>
          {entry.expires_on && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">SLA Expiry:</span>
              <span className="text-foreground">{fmtDate(entry.expires_on)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Proposed Duration:</span>
            <span className="text-foreground">{entry.proposed_duration_days} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sales Rep:</span>
            <span className="text-foreground">{entry.salesperson_name || "Unassigned"}</span>
          </div>
        </div>

        {entry.state === "active" && (
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="promote-next-checkbox"
              checked={promoteNext}
              onCheckedChange={(chk) => setPromoteNext(Boolean(chk))}
            />
            <Label htmlFor="promote-next-checkbox" className="text-xs cursor-pointer">
              Auto-promote next waitlist brand (or mark asset available if none)
            </Label>
          </div>
        )}

        <DialogFooter className="pt-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="gap-1.5"
            data-testid="confirm-delete-queue-button"
          >
            <Trash2 className="size-3.5" />
            {deleteMutation.isPending ? "Deleting…" : "Delete Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
