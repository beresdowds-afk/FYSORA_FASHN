import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Heart, Star, Trash2, Send, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

interface WishlistItem {
  id: string;
  catalogue_item_id: string;
  created_at: string;
  item_name?: string;
  item_image?: string | null;
  item_price?: number | null;
  item_currency?: string | null;
  org_name?: string;
}

interface Review {
  id: string;
  org_id: string;
  catalogue_item_id: string | null;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_published: boolean;
  created_at: string;
  org_name?: string;
}

const WishlistReviewsPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"wishlist" | "reviews">("wishlist");
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // New review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewOrgId, setReviewOrgId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userOrgs, setUserOrgs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: wishData }, { data: reviewData }, { data: memberOrgs }] = await Promise.all([
      supabase.from("customer_wishlists").select("*, org_catalogue_items(name, image_url, price, currency, organizations(name))").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("customer_reviews").select("*, organizations(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("org_members").select("org_id, organizations(id, name)").eq("user_id", user.id),
    ]);

    setWishlist(
      (wishData || []).map((w: any) => ({
        id: w.id,
        catalogue_item_id: w.catalogue_item_id,
        created_at: w.created_at,
        item_name: w.org_catalogue_items?.name || "Unknown",
        item_image: w.org_catalogue_items?.image_url,
        item_price: w.org_catalogue_items?.price,
        item_currency: w.org_catalogue_items?.currency,
        org_name: w.org_catalogue_items?.organizations?.name || "—",
      }))
    );

    setReviews(
      (reviewData || []).map((r: any) => ({
        ...r,
        org_name: r.organizations?.name || "—",
      }))
    );

    setUserOrgs(
      (memberOrgs || []).map((m: any) => ({
        id: m.organizations?.id || m.org_id,
        name: m.organizations?.name || "Unknown",
      }))
    );

    setLoading(false);
  };

  const removeWishlistItem = async (id: string) => {
    await supabase.from("customer_wishlists").delete().eq("id", id);
    setWishlist((prev) => prev.filter((w) => w.id !== id));
    toast({ title: "Removed from wishlist" });
  };

  const submitReview = async () => {
    if (!user || !reviewOrgId) return;
    setSubmitting(true);
    const { error } = await supabase.from("customer_reviews").insert({
      user_id: user.id,
      org_id: reviewOrgId,
      rating: reviewRating,
      title: reviewTitle || null,
      body: reviewBody || null,
    } as any);

    if (!error) {
      toast({ title: "Review submitted!" });
      setShowReviewForm(false);
      setReviewTitle("");
      setReviewBody("");
      setReviewRating(5);
      fetchData();
    } else {
      toast({ title: "Failed to submit review", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "wishlist" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("wishlist")}
          className="gap-1"
        >
          <Heart size={14} /> Wishlist ({wishlist.length})
        </Button>
        <Button
          variant={activeTab === "reviews" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("reviews")}
          className="gap-1"
        >
          <Star size={14} /> My Reviews ({reviews.length})
        </Button>
      </div>

      {activeTab === "wishlist" && (
        <div className="space-y-3">
          {wishlist.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-10 text-center">
              <Heart size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
              <p className="text-xs text-muted-foreground mt-1">Browse organisation catalogues to add items.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {wishlist.map((item) => (
                <div key={item.id} className="rounded-xl bg-card border border-border p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {item.item_image ? (
                      <img src={item.item_image} alt={item.item_name} className="w-full h-full object-cover" />
                    ) : (
                      <Heart size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">{item.org_name}</p>
                    {item.item_price && (
                      <p className="text-sm font-semibold text-primary mt-0.5">
                        {item.item_price.toLocaleString()} {item.item_currency || "NGN"}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeWishlistItem(item.id)} className="text-destructive h-8 w-8 p-0">
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="hero" size="sm" onClick={() => setShowReviewForm(!showReviewForm)} className="gap-1">
              <MessageSquare size={14} /> Write Review
            </Button>
          </div>

          {showReviewForm && (
            <div className="rounded-xl bg-card border border-primary/20 p-5 space-y-4">
              <h4 className="font-heading font-semibold text-sm">New Review</h4>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Organization</label>
                <select
                  value={reviewOrgId}
                  onChange={(e) => setReviewOrgId(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select organization...</option>
                  {userOrgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setReviewRating(n)}>
                      <Star
                        size={24}
                        className={n <= reviewRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Input
                placeholder="Review title (optional)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="text-sm"
              />

              <Textarea
                placeholder="Share your experience..."
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                rows={3}
                className="text-sm"
              />

              <div className="flex gap-2">
                <Button variant="hero" size="sm" onClick={submitReview} disabled={submitting || !reviewOrgId} className="gap-1">
                  <Send size={12} /> Submit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowReviewForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {reviews.length === 0 && !showReviewForm ? (
            <div className="rounded-xl bg-card border border-border p-10 text-center">
              <Star size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">You haven't written any reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl bg-card border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{review.org_name}</Badge>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={12} className={n <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"} />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                  {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default WishlistReviewsPanel;
