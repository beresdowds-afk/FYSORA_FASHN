import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ruler, Plus, Save, Trash2 } from "lucide-react";

interface MeasurementEntry {
  id: string;
  label: string;
  value: string;
  unit: string;
}

interface MeasurementPanelProps {
  onSave: (measurements: Record<string, string>) => void;
  initialMeasurements?: Record<string, string>;
}

const DEFAULT_LABELS = [
  "Chest", "Waist", "Hips", "Shoulder Width", "Sleeve Length",
  "Inseam", "Neck", "Back Length", "Arm Length", "Thigh",
];

const MeasurementPanel = ({ onSave, initialMeasurements }: MeasurementPanelProps) => {
  const [entries, setEntries] = useState<MeasurementEntry[]>(() => {
    if (initialMeasurements) {
      return Object.entries(initialMeasurements).map(([label, value], i) => ({
        id: `init-${i}`,
        label,
        value,
        unit: "in",
      }));
    }
    return DEFAULT_LABELS.slice(0, 6).map((label, i) => ({
      id: `default-${i}`,
      label,
      value: "",
      unit: "in",
    }));
  });

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, label: "", value: "", unit: "in" },
    ]);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof MeasurementEntry, val: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    );
  };

  const handleSave = () => {
    const measurements: Record<string, string> = {};
    entries.forEach((e) => {
      if (e.label && e.value) {
        measurements[e.label] = `${e.value} ${e.unit}`;
      }
    });
    onSave(measurements);
  };

  const filledCount = entries.filter((e) => e.value).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Ruler size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-sm">Measurements</h3>
          <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">
            {filledCount}/{entries.length}
          </span>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addEntry}>
          <Plus size={12} className="mr-1" /> Add
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <Label className="text-[10px] text-muted-foreground">{entry.label || "Label"}</Label>
                <Input
                  value={entry.label}
                  onChange={(e) => updateEntry(entry.id, "label", e.target.value)}
                  placeholder="e.g. Chest"
                  className="h-8 text-xs"
                  list="measurement-labels"
                />
              </div>
              <div className="w-20">
                <Label className="text-[10px] text-muted-foreground">Value</Label>
                <Input
                  value={entry.value}
                  onChange={(e) => updateEntry(entry.id, "value", e.target.value)}
                  placeholder="0"
                  className="h-8 text-xs"
                  type="number"
                  step="0.25"
                />
              </div>
              <select
                value={entry.unit}
                onChange={(e) => updateEntry(entry.id, "unit", e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="in">in</option>
                <option value="cm">cm</option>
              </select>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeEntry(entry.id)}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
        <datalist id="measurement-labels">
          {DEFAULT_LABELS.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button onClick={handleSave} className="w-full" size="sm">
          <Save size={14} className="mr-2" /> Save Measurements
        </Button>
      </div>
    </div>
  );
};

export default MeasurementPanel;
