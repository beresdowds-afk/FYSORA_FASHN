import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useRegionalOperations,
  FEATURE_TOGGLES,
  type RegionalOperation,
  type FeatureToggleKey,
} from "@/hooks/useRegionalOperations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Globe, Power, PowerOff, Search, MapPin,
  XCircle, ChevronDown, ChevronUp, Clock, Zap,
} from "lucide-react";

const RegionalManagementPanel = () => {
  const { toast } = useToast();
  const { regions, activeRegions, inactiveRegions, isLoading, updateRegion } = useRegionalOperations();
  const [search, setSearch] = useState("");
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = regions.filter(r =>
    !search ||
    r.region_name.toLowerCase().includes(search.toLowerCase()) ||
    r.region_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (region: RegionalOperation) => {
    const newActive = !region.is_active;
    const updates: Partial<RegionalOperation> = { is_active: newActive };
    if (newActive && !region.launched_at) {
      updates.launched_at = new Date().toISOString();
    }
    await updateRegion.mutateAsync({ id: region.id, updates });
    toast({
      title: `${region.flag_emoji} ${region.region_name} ${newActive ? "activated" : "deactivated"}`,
      description: newActive
        ? "Region is now live — enable features below."
        : "All operations paused for this region.",
    });
  };

  const handleToggleFeature = async (region: RegionalOperation, featureKey: FeatureToggleKey) => {
    const current = region[featureKey];
    await updateRegion.mutateAsync({
      id: region.id,
      updates: { [featureKey]: !current } as any,
    });
    const featureLabel = FEATURE_TOGGLES.find(f => f.key === featureKey)?.label || featureKey;
    toast({ title: `${region.flag_emoji} ${featureLabel} ${!current ? "enabled" : "disabled"} in ${region.region_name}` });
  };

  const handleUpdateNotes = async (region: RegionalOperation, notes: string) => {
    await updateRegion.mutateAsync({ id: region.id, updates: { notes } });
    toast({ title: "Notes updated" });
  };

  const enabledCount = (r: RegionalOperation) =>
    FEATURE_TOGGLES.filter(f => r[f.key]).length;

  const toggleExpand = (id: string) =>
    setExpandedRegion(prev => (prev === id ? null : id));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
          <Globe size={24} className="text-primary" /> Regional Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Activate or deactivate operations and features per region
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{regions.length}</p>
              <p className="text-xs text-muted-foreground">Total Regions</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Power size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeRegions.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <PowerOff size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inactiveRegions.length}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {FEATURE_TOGGLES.length}
              </p>
              <p className="text-xs text-muted-foreground">Feature Toggles</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search regions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="text-xs">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">Active ({activeRegions.length})</TabsTrigger>
          <TabsTrigger value="inactive" className="text-xs">Inactive ({inactiveRegions.length})</TabsTrigger>
        </TabsList>

        {["all", "active", "inactive"].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-3">
            {filtered
              .filter(r =>
                tab === "all" ? true : tab === "active" ? r.is_active : !r.is_active
              )
              .map(region => (
                <RegionCard
                  key={region.id}
                  region={region}
                  isExpanded={expandedRegion === region.id}
                  onToggleExpand={() => toggleExpand(region.id)}
                  onToggleActive={() => handleToggleActive(region)}
                  onToggleFeature={(key) => handleToggleFeature(region, key)}
                  onUpdateNotes={(notes) => handleUpdateNotes(region, notes)}
                  enabledCount={enabledCount(region)}
                />
              ))}
            {filtered.filter(r =>
              tab === "all" ? true : tab === "active" ? r.is_active : !r.is_active
            ).length === 0 && (
              <Card className="p-8 text-center">
                <MapPin size={32} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No regions found.</p>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </motion.div>
  );
};

/* ─── Region Card ──────────────────────────────────────── */

const RegionCard = ({
  region,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  onToggleFeature,
  onUpdateNotes,
  enabledCount,
}: {
  region: RegionalOperation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onToggleFeature: (key: FeatureToggleKey) => void;
  onUpdateNotes: (notes: string) => void;
  enabledCount: number;
}) => {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(region.notes || "");

  return (
    <Card className={`transition-all ${region.is_active ? "border-primary/30" : "border-border opacity-75"}`}>
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{region.flag_emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{region.region_name}</h3>
              <Badge variant="outline" className="text-[10px]">{region.region_code}</Badge>
              {region.is_active ? (
                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Active</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-muted-foreground">{region.currency}</span>
              <span className="text-xs text-muted-foreground">{region.timezone}</span>
              <span className="text-xs text-muted-foreground">
                {enabledCount}/{FEATURE_TOGGLES.length} features
              </span>
              {region.launched_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={10} /> Launched {new Date(region.launched_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={region.is_active}
            onCheckedChange={() => {
              onToggleActive();
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {/* Feature toggles grid */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Feature Toggles
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {FEATURE_TOGGLES.map(feat => {
                    const enabled = region[feat.key];
                    return (
                      <div
                        key={feat.key}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          enabled
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">{feat.icon}</span>
                          <span className="text-xs font-medium truncate">{feat.label}</span>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => onToggleFeature(feat.key)}
                          disabled={!region.is_active}
                          className="scale-75"
                        />
                      </div>
                    );
                  })}
                </div>
                {!region.is_active && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <XCircle size={12} /> Activate the region to enable feature toggles.
                  </p>
                )}
              </div>

              {/* Infrastructure */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Payment Gateways
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {region.available_gateways.length > 0 ? region.available_gateways.map(g => (
                      <Badge key={g} variant="secondary" className="text-xs capitalize">{g.replace(/_/g, " ")}</Badge>
                    )) : (
                      <span className="text-xs text-muted-foreground">None configured</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Carriers
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {region.available_carriers.length > 0 ? region.available_carriers.map(c => (
                      <Badge key={c} variant="secondary" className="text-xs capitalize">{c.replace(/_/g, " ")}</Badge>
                    )) : (
                      <span className="text-xs text-muted-foreground">None configured</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Messaging Providers
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {region.available_messaging_providers.length > 0 ? region.available_messaging_providers.map(m => (
                      <Badge key={m} variant="secondary" className="text-xs capitalize">{m}</Badge>
                    )) : (
                      <span className="text-xs text-muted-foreground">None configured</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Notes
                </h4>
                {editingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notesValue}
                      onChange={e => setNotesValue(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs h-7"
                        onClick={() => {
                          onUpdateNotes(notesValue);
                          setEditingNotes(false);
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => {
                          setNotesValue(region.notes || "");
                          setEditingNotes(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors p-2 rounded-lg bg-muted/30"
                    onClick={() => setEditingNotes(true)}
                  >
                    {region.notes || "Click to add notes..."}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default RegionalManagementPanel;
