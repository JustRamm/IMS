import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Building2, Trash2 } from "lucide-react";
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
import { errMessage } from "@/lib/helpers";

/**
 * DeleteBrandDialog
 * Allows administrators to permanently delete a Brand from the client directory.
 * Safely unlinks associated campaigns and interest queue records so database
 * foreign key integrity and audit trails remain preserved.
 */
export default function DeleteBrandDialog({
  brand,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  onSuccess,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [unlinkRecords, setUnlinkRecords] = useState(true);
  const [counts, setCounts] = useState({ campaigns: 0, queue: 0, loading: false });
  const { data: me } = useMe();

  // Fetch count of associated records when dialog opens
  useEffect(() => {
    if (!open || !brand?.id) return;
    let isMounted = true;
    setCounts((c) => ({ ...c, loading: true }));

    Promise.all([
      supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("brand_id", brand.id),
      supabase.from("queue_entries").select("*", { count: "exact", head: true }).eq("brand_id", brand.id),
    ]).then(([cRes, qRes]) => {
      if (isMounted) {
        setCounts({
          campaigns: cRes.count || 0,
          queue: qRes.count || 0,
          loading: false,
        });
      }
    }).catch(() => {
      if (isMounted) setCounts((c) => ({ ...c, loading: false }));
    });

    return () => {
      isMounted = false;
    };
  }, [open, brand?.id]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!brand?.id) return;

      // 1. Unlink associated campaigns and queue entries if requested to prevent foreign key constraint violations
      if (unlinkRecords) {
        if (counts.campaigns > 0) {
          const { error: cErr } = await supabase
            .from("campaigns")
            .update({ brand_id: null })
            .eq("brand_id", brand.id);
          if (cErr) console.warn("Could not unlink campaigns:", cErr);
        }

        if (counts.queue > 0) {
          const { error: qErr } = await supabase
            .from("queue_entries")
            .update({ brand_id: null })
            .eq("brand_id", brand.id);
          if (qErr) console.warn("Could not unlink queue entries:", qErr);
        }
      }

      // 2. Delete brand record
      const { error: delErr } = await supabase
        .from("brands")
        .delete()
        .eq("id", brand.id);

      if (delErr) throw { body: { detail: delErr.message } };

      // 3. Write immutable audit log
      try {
        await supabase.from("audit_logs").insert({
          id: crypto.randomUUID(),
          entity_type: "brand",
          entity_id: brand.id,
          action: "brand_deleted_by_admin",
          actor_name: me?.name || "Admin",
          comment: `Admin permanently deleted brand "${brand.name}" (${brand.industry || "No industry specified"}). Associated records unlinked: ${counts.campaigns} campaigns, ${counts.queue} queue entries.`,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Audit logging failed:", e);
      }

      return { id: brand.id, name: brand.name };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.removeQueries({ queryKey: ["brand", brand?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });

      toast.success(`Brand "${res.name}" deleted successfully`);
      setOpen(false);
      onSuccess?.(res);
    },
    onError: (err) => {
      toast.error(errMessage(err, "Failed to delete brand"));
    },
  });

  if (!brand) return null;

  const totalAssociated = counts.campaigns + counts.queue;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md" data-testid="delete-brand-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg text-red-600 dark:text-red-400">
            <AlertTriangle className="size-5 shrink-0" />
            Delete Brand
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete this brand from the client directory? This action cannot be reversed.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-red-200/50 bg-red-50/40 dark:bg-red-950/20 p-3.5 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Brand Name:</span>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="size-3.5 text-red-500" />
              {brand.name}
            </span>
          </div>
          {brand.industry && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Industry:</span>
              <span className="text-foreground">{brand.industry}</span>
            </div>
          )}
          {brand.contact_person && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact Person:</span>
              <span className="text-foreground">{brand.contact_person}</span>
            </div>
          )}
          {brand.contact_email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground font-mono text-[11px]">{brand.contact_email}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-border/40">
            <span className="text-muted-foreground">Campaigns:</span>
            <span className="font-medium text-foreground">{counts.campaigns}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interest Queue Entries:</span>
            <span className="font-medium text-foreground">{counts.queue}</span>
          </div>
        </div>

        {totalAssociated > 0 && (
          <div className="flex items-start space-x-2.5 pt-1">
            <Checkbox
              id="unlink-brand-records-checkbox"
              checked={unlinkRecords}
              onCheckedChange={(chk) => setUnlinkRecords(Boolean(chk))}
              className="mt-0.5"
            />
            <Label htmlFor="unlink-brand-records-checkbox" className="text-xs text-muted-foreground leading-normal cursor-pointer">
              Unlink from <span className="font-medium text-foreground">{counts.campaigns} campaigns</span> and <span className="font-medium text-foreground">{counts.queue} queue entries</span> so their records & historical performance remain safe.
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
            data-testid="confirm-delete-brand-button"
          >
            <Trash2 className="size-3.5" />
            {deleteMutation.isPending ? "Deleting…" : "Delete Brand"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
