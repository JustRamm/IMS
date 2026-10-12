import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CalendarDays, Cog, ExternalLink, ListOrdered, Megaphone, Pencil, Plus, Shapes, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import EmptyState from "@/components/shared/EmptyState";
import { AdminSkeleton } from "@/components/skeletons";
import { StageBadge } from "@/components/shared/StatusBadges";
import PriorityBadge from "@/components/shared/PriorityBadge";
import CampaignFormDialog from "@/components/campaigns/CampaignFormDialog";
import DeleteCampaignDialog from "@/components/campaigns/DeleteCampaignDialog";
import DeleteQueueDialog from "@/components/queue/DeleteQueueDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAssetTypes, useCampaigns, useHolidays, useMe, useRoles, useSettings, useUsers, useAdminQueueEntries } from "@/lib/queries";
import { errMessage, fmtDate } from "@/lib/helpers";

function UsersPanel() {
  const { data: users, isError } = useUsers();
  const { data: roles } = useRoles();
  const [form, setForm] = useState({ email: "", name: "", role: "sales" });
  const [editing, setEditing] = useState(null); // { id, name, role, email }

  const ROLE_LABELS = {
    admin: "Admin",
    sales: "Sales",
    ops: "Operations",
    finance: "Finance",
    finance_manager: "Finance Manager",
  };

  const create = useMutation({
    mutationFn: async (body) => {
      // Insert into the authorized_users allowlist so the invitee can self-sign-up.
      // The Supabase trigger on auth.users will then sync their profile automatically.
      const { error } = await supabase.from("authorized_users").insert({
        id: crypto.randomUUID(),
        email: body.email.trim().toLowerCase(),
        name: body.name.trim(),
        role: body.role,
      });
      if (error) throw { body: { detail: error.message } };
      const ROLE_LABELS = { admin: "Admin", sales: "Sales", ops: "Operations", finance: "Finance", finance_manager: "Finance Manager" };
      return { name: body.name, role_label: ROLE_LABELS[body.role] ?? body.role };
    },
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`${u.name} invited as ${u.role_label} — they can now sign up with their email`);
      setForm({ email: "", name: "", role: "sales" });
    },
    onError: (err) => toast.error(errMessage(err, "Could not invite the user")),
  });

  const toggle = useMutation({
    mutationFn: async (id) => {
      const { data: p } = await supabase.from("profiles").select("active").eq("id", id).single();
      const { error } = await supabase.from("profiles").update({ active: !p?.active }).eq("id", id);
      if (error) throw { body: { detail: error.message } };
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
    },
    onError: (err) => toast.error(errMessage(err, "Could not update the user")),
  });

  // ── Edit name + role ──────────────────────────────────────
  const editUser = useMutation({
    mutationFn: async ({ id, name, role, email }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim(), role })
        .eq("id", id);
      if (error) throw { body: { detail: error.message } };
      // Keep authorized_users in sync
      await supabase
        .from("authorized_users")
        .update({ name: name.trim(), role })
        .eq("email", email);
      return { name, role };
    },
    onSuccess: ({ name, role }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`${name} updated to ${ROLE_LABELS[role] ?? role}`);
      setEditing(null);
    },
    onError: (err) => toast.error(errMessage(err, "Could not update the user")),
  });

  const roleLabel = (v) => ROLE_LABELS[v] ?? v;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Users className="size-4 text-primary" />
            Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isError && <EmptyState title="Users unavailable" testId="users-error-state" />}
          {users?.length === 0 && <EmptyState title="No users yet" testId="users-empty-state" />}
          <ul className="space-y-2" data-testid="user-list">
            {(users ?? []).map((u) => (
              <li
                key={u.id}
                className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5"
                data-testid={`user-row-${u.email}`}
              >
                {editing?.id === u.id ? (
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      editUser.mutate({ id: u.id, email: u.email, name: editing.name, role: editing.role });
                    }}
                    data-testid={`edit-user-form-${u.email}`}
                  >
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      required
                      placeholder="Full name"
                      data-testid="edit-user-name-input"
                    />
                    <p className="mono-label text-muted-foreground">{u.email}</p>
                    <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v })}>
                      <SelectTrigger size="sm" data-testid="edit-user-role-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(roles ?? []).map((r) => (
                          <SelectItem key={r.value} value={r.value} data-testid={`edit-role-option-${r.value}`}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button type="submit" size="xs" disabled={editUser.isPending} data-testid="save-user-button">
                        Save
                      </Button>
                      <Button type="button" variant="outline" size="xs" onClick={() => setEditing(null)} data-testid="cancel-edit-user-button">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-heading text-sm font-medium">{u.name}</p>
                      <p className="mono-label truncate text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="mono-label border-primary/40 text-primary">
                        {u.role_label || roleLabel(u.role)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          u.active
                            ? "mono-label border-emerald-800 text-emerald-300"
                            : "mono-label border-border/70 text-muted-foreground"
                        }
                      >
                        {u.active ? "active" : "disabled"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setEditing({ id: u.id, name: u.name, role: u.role, email: u.email })}
                        data-testid={`edit-user-${u.email}`}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => toggle.mutate(u.id)}
                        data-testid={`toggle-user-${u.email}`}
                      >
                        {u.active ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <UserPlus className="size-4 text-primary" />
            Invite a user
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(form);
            }}
            data-testid="invite-user-form"
          >
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Full name</Label>
              <Input
                id="u-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="invite-name-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                data-testid="invite-email-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger data-testid="invite-role-select">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(roles ?? []).map((r) => (
                    <SelectItem key={r.value} value={r.value} data-testid={`invite-role-option-${r.value}`}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The user will set their own password when they sign up with this email.
            </p>
            <Button type="submit" className="w-full" disabled={create.isPending} data-testid="submit-invite-button">
              {create.isPending ? "Sending invite…" : "Send invite"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPanel() {
  const { data: settings } = useSettings();
  const [form, setForm] = useState(null);
  const active = form ?? settings ?? { gtp_interval_days: 28, queue_active_business_days: 5, gtp_reminder_days: 5 };

  const save = useMutation({
    mutationFn: async (body) => {
      const { error } = await supabase.from("settings").upsert({ id: "global", ...body });
      if (error) throw { body: { detail: error.message } };
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Workflow settings saved");
    },
    onError: (err) => toast.error(errMessage(err, "Could not save settings")),
  });

  const set = (k) => (e) => setForm({ ...active, [k]: e.target.value });

  return (
    <Card className="max-w-md border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <Cog className="size-4 text-primary" />
          Workflow configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              gtp_interval_days: Number(active.gtp_interval_days),
              queue_active_business_days: Number(active.queue_active_business_days),
              gtp_reminder_days: Number(active.gtp_reminder_days),
            });
          }}
          data-testid="settings-form"
        >
          <div className="space-y-1.5">
            <Label htmlFor="gtp-interval">GTP interval (days)</Label>
            <Input
              id="gtp-interval"
              type="number"
              min={1}
              value={active.gtp_interval_days}
              onChange={set("gtp_interval_days")}
              data-testid="gtp-interval-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="queue-days">Active slot hold (business days)</Label>
            <Input
              id="queue-days"
              type="number"
              min={1}
              value={active.queue_active_business_days}
              onChange={set("queue_active_business_days")}
              data-testid="queue-days-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reminder-days">GTP reminder lead time (days)</Label>
            <Input
              id="reminder-days"
              type="number"
              min={0}
              value={active.gtp_reminder_days}
              onChange={set("gtp_reminder_days")}
              data-testid="reminder-days-input"
            />
          </div>
          <Button type="submit" disabled={save.isPending} data-testid="save-settings-button">
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function HolidaysPanel() {
  const { data: holidays } = useHolidays();
  const [form, setForm] = useState({ date: "", name: "" });

  const add = useMutation({
    mutationFn: async (body) => {
      const { data, error } = await supabase.from("holidays").insert({ id: crypto.randomUUID(), ...body }).select().single();
      if (error) throw { body: { detail: error.message } };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Holiday added — business-day math updated");
      setForm({ date: "", name: "" });
    },
    onError: (err) => toast.error(errMessage(err, "Could not add the holiday")),
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("holidays").delete().eq("id", id);
      if (error) throw { body: { detail: error.message } };
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Holiday removed");
    },
    onError: (err) => toast.error(errMessage(err, "Could not remove the holiday")),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <CalendarDays className="size-4 text-primary" />
            Holiday calendar (IST)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {holidays?.length === 0 ? (
            <EmptyState
              title="No holidays configured"
              hint="Weekends are always skipped. Add public holidays so the 5-business-day queue clock is accurate."
              testId="holidays-empty-state"
            />
          ) : (
            <ul className="space-y-2" data-testid="holiday-list">
              {(holidays ?? []).map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2"
                  data-testid={`holiday-row-${h.date}`}
                >
                  <div>
                    <p className="text-sm">{h.name}</p>
                    <p className="mono-label text-muted-foreground">{fmtDate(h.date)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${h.name}`}
                    onClick={() => remove.mutate(h.id)}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid={`remove-holiday-${h.date}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base">Add a holiday</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate(form);
            }}
            data-testid="add-holiday-form"
          >
            <div className="space-y-1.5">
              <Label htmlFor="h-date">Date</Label>
              <Input
                id="h-date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                data-testid="holiday-date-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="h-name">Name</Label>
              <Input
                id="h-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="holiday-name-input"
              />
            </div>
            <Button type="submit" className="w-full" disabled={add.isPending} data-testid="submit-holiday-button">
              {add.isPending ? "Adding…" : "Add holiday"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetTypesPanel() {
  const { data: types } = useAssetTypes();
  const [form, setForm] = useState({
    name: "",
    location_type: "Metro",
    default_width_ft: 6,
    default_height_ft: 3,
  });
  const [editing, setEditing] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["asset-types"] });
    queryClient.invalidateQueries({ queryKey: ["assets"] });
  };

  const create = useMutation({
    mutationFn: async (body) => {
      const { data, error } = await supabase.from("asset_types").insert({ id: crypto.randomUUID(), ...body }).select().single();
      if (error) throw { body: { detail: error.message } };
      return data;
    },
    onSuccess: (t) => {
      invalidate();
      toast.success(`Asset type "${t.name}" added`);
      setForm({ name: "", location_type: "Metro", default_width_ft: 6, default_height_ft: 3 });
    },
    onError: (err) => toast.error(errMessage(err, "Could not add the asset type")),
  });

  const update = useMutation({
    mutationFn: async ({ id, body }) => {
      const { error } = await supabase.from("asset_types").update(body).eq("id", id);
      if (error) throw { body: { detail: error.message } };
      return { ok: true };
    },
    onSuccess: () => {
      invalidate();
      toast.success("Asset type updated");
      setEditing(null);
    },
    onError: (err) => toast.error(errMessage(err, "Could not update the asset type")),
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      // Prevent deleting types in use
      const { data: t } = await supabase.from("asset_types").select("name").eq("id", id).single();
      const { count } = await supabase.from("assets").select("*", { count: "exact", head: true }).eq("asset_type", t?.name);
      if (count) throw { body: { detail: `This type is used by ${count} asset(s). Reassign them first.` } };
      const { error } = await supabase.from("asset_types").delete().eq("id", id);
      if (error) throw { body: { detail: error.message } };
      return { ok: true };
    },
    onSuccess: () => {
      invalidate();
      toast.success("Asset type deleted");
    },
    onError: (err) => toast.error(errMessage(err, "Could not delete the asset type")),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Shapes className="size-4 text-primary" />
            Asset types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {types?.length === 0 ? (
            <EmptyState title="No asset types" hint="Add the display types your inventory uses." testId="asset-types-empty-state" />
          ) : (
            <ul className="space-y-2" data-testid="asset-type-list">
              {(types ?? []).map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5"
                  data-testid={`asset-type-row-${t.name.replace(/\s+/g, "-")}`}
                >
                  {editing?.id === t.id ? (
                    <form
                      className="space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        update.mutate({
                          id: t.id,
                          body: {
                            name: editing.name,
                            location_type: editing.location_type,
                            default_width_ft: Number(editing.default_width_ft),
                            default_height_ft: Number(editing.default_height_ft),
                          },
                        });
                      }}
                      data-testid="edit-asset-type-form"
                    >
                      <Input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        required
                        data-testid="edit-asset-type-name-input"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={editing.location_type}
                          onValueChange={(v) => setEditing({ ...editing, location_type: v })}
                        >
                          <SelectTrigger size="sm" data-testid="edit-asset-type-location-select">
                            <SelectValue>{(v) => v}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {["Metro", "Mall"].map((l) => (
                              <SelectItem key={l} value={l}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.5"
                          value={editing.default_width_ft}
                          onChange={(e) => setEditing({ ...editing, default_width_ft: e.target.value })}
                          data-testid="edit-asset-type-width-input"
                        />
                        <Input
                          type="number"
                          step="0.5"
                          value={editing.default_height_ft}
                          onChange={(e) => setEditing({ ...editing, default_height_ft: e.target.value })}
                          data-testid="edit-asset-type-height-input"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="xs" disabled={update.isPending} data-testid="save-asset-type-button">
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => setEditing(null)}
                          data-testid="cancel-asset-type-button"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-heading text-sm font-medium">{t.name}</p>
                        <p className="mono-label text-muted-foreground">
                          {t.location_type} · {t.default_width_ft}×{t.default_height_ft} ft · {t.asset_count} asset
                          {t.asset_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setEditing({ ...t })}
                          data-testid={`edit-asset-type-${t.name.replace(/\s+/g, "-")}`}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Delete ${t.name}`}
                          onClick={() => remove.mutate(t.id)}
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`delete-asset-type-${t.name.replace(/\s+/g, "-")}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground">
            A type in use cannot be deleted — reassign those assets first. Renaming a type updates every
            asset that uses it.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base">Add an asset type</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({
                ...form,
                default_width_ft: Number(form.default_width_ft),
                default_height_ft: Number(form.default_height_ft),
              });
            }}
            data-testid="add-asset-type-form"
          >
            <div className="space-y-1.5">
              <Label htmlFor="at-name">Type name</Label>
              <Input
                id="at-name"
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Metro Pillar"
                data-testid="asset-type-name-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location type</Label>
              <Select value={form.location_type} onValueChange={(v) => setForm((f) => ({ ...f, location_type: v }))}>
                <SelectTrigger data-testid="asset-type-location-select">
                  <SelectValue>{(v) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {["Metro", "Mall"].map((l) => (
                    <SelectItem key={l} value={l} data-testid={`asset-type-location-option-${l.toLowerCase()}`}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="at-w">Default width (ft)</Label>
                <Input
                  id="at-w"
                  type="number"
                  step="0.5"
                  value={form.default_width_ft}
                  onChange={(e) => setForm((f) => ({ ...f, default_width_ft: e.target.value }))}
                  data-testid="asset-type-width-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="at-h">Default height (ft)</Label>
                <Input
                  id="at-h"
                  type="number"
                  step="0.5"
                  value={form.default_height_ft}
                  onChange={(e) => setForm((f) => ({ ...f, default_height_ft: e.target.value }))}
                  data-testid="asset-type-height-input"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={create.isPending} data-testid="submit-asset-type-button">
              {create.isPending ? "Adding…" : "Add asset type"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignsPanel() {
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data: rawCampaigns = [], isLoading } = useCampaigns(stageFilter);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [deletingCampaign, setDeletingCampaign] = useState(null);

  const campaigns = (rawCampaigns ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.brand?.toLowerCase().includes(q) ||
      c.asset_code?.toLowerCase().includes(q) ||
      c.salesperson_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <Megaphone className="size-4 text-primary" />
              Campaign Management
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edit campaign windows, sales representatives, brands, and associated media assets, or directly add and delete campaigns.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingCampaign(null);
              setFormOpen(true);
            }}
            className="gap-1.5 shrink-0"
            data-testid="admin-add-campaign-button"
          >
            <Plus className="size-4" />
            Add Campaign
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <Input
              placeholder="Search by brand, asset code, or salesperson..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-xs text-xs"
              data-testid="admin-campaign-search"
            />
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-44 text-xs" data-testid="admin-campaign-stage-filter">
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="invoicing">Invoicing</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading campaigns...</p>
          ) : campaigns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">No campaigns found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "No campaigns match your search query." : "Click 'Add Campaign' to create a new campaign directly."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border/70">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 font-semibold text-muted-foreground border-b border-border/70">
                  <tr>
                    <th className="py-2.5 px-3">Brand & Asset</th>
                    <th className="py-2.5 px-3">Campaign Window</th>
                    <th className="py-2.5 px-3">Sales Person</th>
                    <th className="py-2.5 px-3">Stage / Priority</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{c.brand}</span>
                          <Link
                            to={`/campaigns/${c.id}`}
                            className="text-muted-foreground hover:text-primary"
                            title="View campaign record"
                          >
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                        <div className="mono-label text-[11px] text-muted-foreground">
                          {c.asset_code}
                          {Array.isArray(c.extra_assets) && c.extra_assets.length > 0 && (
                            <span className="ml-1 text-[10px] text-primary/80 font-medium">
                              (+{c.extra_assets.length} more)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-foreground">
                          {c.start_date ? `${fmtDate(c.start_date)} → ${fmtDate(c.end_date)}` : "Not set"}
                        </div>
                        <div className="mono-label text-[11px] text-muted-foreground">
                          {c.duration_days} days
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-foreground">
                          {c.salesperson_name || <span className="text-muted-foreground italic">Unassigned</span>}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StageBadge stage={c.stage} />
                          <PriorityBadge priority={c.priority} />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setEditingCampaign(c);
                              setFormOpen(true);
                            }}
                            className="gap-1"
                            data-testid={`admin-edit-campaign-${c.id}`}
                          >
                            <Pencil className="size-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setDeletingCampaign(c)}
                            className="gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                            data-testid={`admin-delete-campaign-${c.id}`}
                          >
                            <Trash2 className="size-3" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CampaignFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        campaign={editingCampaign}
      />

      <DeleteCampaignDialog
        open={Boolean(deletingCampaign)}
        onOpenChange={(op) => !op && setDeletingCampaign(null)}
        campaign={deletingCampaign}
      />
    </div>
  );
}

function QueuePanel() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deletingEntry, setDeletingEntry] = useState(null);

  const { data: queueEntries = [], isLoading } = useAdminQueueEntries(filter);

  const filteredEntries = queueEntries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.brand && e.brand.toLowerCase().includes(q)) ||
      (e.asset_code && e.asset_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ListOrdered className="size-4 text-primary" />
              Interest Queue Management
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect all queue entries and safely delete or clean up active and waitlisted entries.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <Input
              placeholder="Filter by brand or asset code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs text-xs h-8"
              data-testid="admin-queue-search"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44 text-xs h-8" data-testid="admin-queue-status-select">
                <SelectValue placeholder="All entries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open (Active & Waitlist)</SelectItem>
                <SelectItem value="active">Active slot only</SelectItem>
                <SelectItem value="pending">Waitlist only</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="forfeited">Forfeited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading queue entries…</p>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">No queue entries found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "No entries match your search query." : "There are no interest queue records matching this filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border/70">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 font-semibold text-muted-foreground border-b border-border/70">
                  <tr>
                    <th className="py-2.5 px-3">Brand & Asset</th>
                    <th className="py-2.5 px-3">State / Slot</th>
                    <th className="py-2.5 px-3">Duration & Expiry</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{entry.brand}</span>
                        </div>
                        <div className="mono-label text-[11px] text-muted-foreground flex items-center gap-1">
                          <Link
                            to={`/assets/${entry.asset_id}`}
                            className="hover:text-primary transition-colors inline-flex items-center gap-1"
                          >
                            {entry.asset_code}
                            <ExternalLink className="size-2.5" />
                          </Link>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {entry.state === "active" && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                            Active Slot
                          </Badge>
                        )}
                        {entry.state === "pending" && (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                            Waitlist #{entry.position}
                          </Badge>
                        )}
                        {entry.state === "confirmed" && (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]">
                            Confirmed
                          </Badge>
                        )}
                        {entry.state === "cancelled" && (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Cancelled
                          </Badge>
                        )}
                        {entry.state === "forfeited" && (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Forfeited
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-foreground">
                          {entry.proposed_duration_days ? `${entry.proposed_duration_days} days` : "—"}
                        </div>
                        <div className="mono-label text-[11px] text-muted-foreground">
                          {entry.expires_on ? `Expires: ${fmtDate(entry.expires_on)}` : "No expiry"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {fmtDate(entry.created_at)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setDeletingEntry(entry)}
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                          data-testid={`admin-delete-queue-${entry.id}`}
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteQueueDialog
        open={Boolean(deletingEntry)}
        onOpenChange={(op) => !op && setDeletingEntry(null)}
        entry={deletingEntry}
      />
    </div>
  );
}

export default function Admin() {
  const { data: me, isLoading } = useMe();

  if (isLoading) {
    return (
      <AppShell title="Administration" subtitle="Loading administrative workspace…">
        <AdminSkeleton />
      </AppShell>
    );
  }

  if (me && me.role !== "admin") {
    return (
      <AppShell title="Admin" subtitle="Restricted area">
        <EmptyState
          title="Admin access required"
          hint="Ask your administrator for access to user management and workflow configuration."
          testId="admin-forbidden-state"
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Administration" subtitle="Users, workflow configuration and the holiday calendar">
      <Tabs defaultValue="users">
        <TabsList variant="line" data-testid="admin-tabs">
          <TabsTrigger value="users" data-testid="tab-users">
            Users
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="queue" data-testid="tab-queue">
            Queue
          </TabsTrigger>
          <TabsTrigger value="asset-types" data-testid="tab-asset-types">
            Asset Types
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            Workflow
          </TabsTrigger>
          <TabsTrigger value="holidays" data-testid="tab-holidays">
            Holidays
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="pt-4">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="campaigns" className="pt-4">
          <CampaignsPanel />
        </TabsContent>
        <TabsContent value="queue" className="pt-4">
          <QueuePanel />
        </TabsContent>
        <TabsContent value="asset-types" className="pt-4">
          <AssetTypesPanel />
        </TabsContent>
        <TabsContent value="settings" className="pt-4">
          <SettingsPanel />
        </TabsContent>
        <TabsContent value="holidays" className="pt-4">
          <HolidaysPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
