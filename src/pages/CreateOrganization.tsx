import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Building2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const currencies = [
  { code: "NGN", label: "Nigerian Naira (₦)", country: "NG" },
  { code: "GHS", label: "Ghanaian Cedi (₵)", country: "GH" },
  { code: "KES", label: "Kenyan Shilling (KSh)", country: "KE" },
  { code: "ZAR", label: "South African Rand (R)", country: "ZA" },
  { code: "USD", label: "US Dollar ($)", country: "US" },
  { code: "GBP", label: "British Pound (£)", country: "GB" },
  { code: "EUR", label: "Euro (€)", country: "EU" },
];

const CreateOrganization = () => {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [submitting, setSubmitting] = useState(false);
  const { createOrg } = useOrganizations();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const selectedCurrency = currencies.find((c) => c.code === currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSubmitting(true);

    const { error } = await createOrg(name, slug, selectedCurrency?.country || "NG", currency);
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organization created!", description: `${name} is ready to go.` });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-card rounded-2xl border border-border p-8 shadow-brand">
          <div className="w-14 h-14 rounded-xl bg-gradient-brand flex items-center justify-center mb-6">
            <Building2 className="text-primary-foreground" size={28} />
          </div>

          <h1 className="font-heading font-bold text-2xl mb-1">Create Your Organization</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Set up your fashion business on Fashion Stitches Africa
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adaeze Couture"
                required
              />
              {slug && (
                <p className="text-xs text-muted-foreground">
                  Your URL: <span className="text-primary">{slug}.fashionstitches.africa</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Primary Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="hero" className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Organization"}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateOrganization;
