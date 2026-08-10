import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Tag } from "lucide-react";

export interface PreviewItem {
  id: string;
  name: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  description?: string | null;
  category?: string | null;
  collection?: string | null;
  tags?: string[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: PreviewItem[];
  currency: string;
  orgName?: string;
}

const CataloguePreviewDialog = ({ open, onOpenChange, items, currency, orgName }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-heading">Customer preview</DialogTitle>
      </DialogHeader>
      <p className="text-xs text-muted-foreground -mt-2">
        This is exactly how {items.length} draft item{items.length === 1 ? "" : "s"} will appear on
        {orgName ? ` ${orgName}'s` : " your"} public catalogue once published.
      </p>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Nothing selected to preview.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl bg-card border border-border overflow-hidden group hover:border-primary/30 hover:shadow-gold transition-all duration-300">
              <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={32} className="text-muted-foreground" /></div>
                )}
                {item.collection && (
                  <Badge className="absolute top-2 left-2 text-[10px]">{item.collection}</Badge>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-heading font-semibold text-sm truncate">{item.name || "Untitled item"}</h4>
                {item.price != null && (
                  <p className="text-primary font-bold text-sm mt-1">
                    {item.currency || currency} {Number(item.price).toLocaleString()}
                  </p>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {item.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Tag size={8} /> {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default CataloguePreviewDialog;
