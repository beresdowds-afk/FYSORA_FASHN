ALTER TABLE public.org_catalogue_items ADD COLUMN IF NOT EXISTS collection text;
CREATE INDEX IF NOT EXISTS idx_org_catalogue_items_collection ON public.org_catalogue_items (org_id, collection);
CREATE INDEX IF NOT EXISTS idx_org_catalogue_items_category ON public.org_catalogue_items (org_id, category);
CREATE INDEX IF NOT EXISTS idx_org_catalogue_items_tags ON public.org_catalogue_items USING gin (tags);

CREATE TABLE IF NOT EXISTS public.catalogue_item_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  item_id uuid,
  item_name text,
  action text NOT NULL,
  actor_id uuid,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalogue_item_audit TO authenticated;
GRANT ALL ON public.catalogue_item_audit TO service_role;
ALTER TABLE public.catalogue_item_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view catalogue audit" ON public.catalogue_item_audit;
CREATE POLICY "Org members can view catalogue audit"
ON public.catalogue_item_audit FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_catalogue_audit_org ON public.catalogue_item_audit (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalogue_audit_item ON public.catalogue_item_audit (item_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.can_manage_catalogue(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'super_admin')
      OR public.is_org_admin(_user_id, _org_id)
      OR EXISTS (
        SELECT 1 FROM public.org_members m
        WHERE m.user_id = _user_id AND m.org_id = _org_id AND m.is_active
          AND m.role IN ('manager','designer','org_admin')
      );
$$;

CREATE OR REPLACE FUNCTION public.can_publish_catalogue(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'super_admin')
      OR public.is_org_admin(_user_id, _org_id)
      OR EXISTS (
        SELECT 1 FROM public.org_members m
        WHERE m.user_id = _user_id AND m.org_id = _org_id AND m.is_active
          AND m.role IN ('manager','org_admin')
      );
$$;

DROP POLICY IF EXISTS "Org admins can manage catalogue items" ON public.org_catalogue_items;
CREATE POLICY "Catalogue managers can insert items"
ON public.org_catalogue_items FOR INSERT TO authenticated
WITH CHECK (public.can_manage_catalogue(auth.uid(), org_id));
CREATE POLICY "Catalogue managers can update items"
ON public.org_catalogue_items FOR UPDATE TO authenticated
USING (public.can_manage_catalogue(auth.uid(), org_id))
WITH CHECK (public.can_manage_catalogue(auth.uid(), org_id));
CREATE POLICY "Catalogue managers can delete items"
ON public.org_catalogue_items FOR DELETE TO authenticated
USING (public.can_manage_catalogue(auth.uid(), org_id));
CREATE POLICY "Org members can view own catalogue items"
ON public.org_catalogue_items FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.enforce_catalogue_publish_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_available IS DISTINCT FROM OLD.is_available THEN
    IF auth.uid() IS NOT NULL AND NOT public.can_publish_catalogue(auth.uid(), NEW.org_id) THEN
      RAISE EXCEPTION 'Your role cannot publish or unpublish catalogue items';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.is_available AND auth.uid() IS NOT NULL
     AND NOT public.can_publish_catalogue(auth.uid(), NEW.org_id) THEN
    NEW.is_available := false;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_catalogue_publish_role ON public.org_catalogue_items;
CREATE TRIGGER trg_catalogue_publish_role BEFORE INSERT OR UPDATE ON public.org_catalogue_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_catalogue_publish_role();

CREATE OR REPLACE FUNCTION public.log_catalogue_item_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _action text; _changes jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'uploaded';
    _changes := jsonb_build_object('name', NEW.name, 'image_url', NEW.image_url, 'price', NEW.price);
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'deleted';
    INSERT INTO public.catalogue_item_audit (org_id, item_id, item_name, action, actor_id, changes)
    VALUES (OLD.org_id, OLD.id, OLD.name, _action, auth.uid(), jsonb_build_object('name', OLD.name));
    RETURN OLD;
  ELSE
    IF NEW.is_available IS DISTINCT FROM OLD.is_available THEN
      _action := CASE WHEN NEW.is_available THEN 'published' ELSE 'unpublished' END;
    ELSE
      _action := 'edited';
    END IF;
    IF NEW.name IS DISTINCT FROM OLD.name THEN _changes := _changes || jsonb_build_object('name', jsonb_build_array(OLD.name, NEW.name)); END IF;
    IF NEW.price IS DISTINCT FROM OLD.price THEN _changes := _changes || jsonb_build_object('price', jsonb_build_array(OLD.price, NEW.price)); END IF;
    IF NEW.category IS DISTINCT FROM OLD.category THEN _changes := _changes || jsonb_build_object('category', jsonb_build_array(OLD.category, NEW.category)); END IF;
    IF NEW.collection IS DISTINCT FROM OLD.collection THEN _changes := _changes || jsonb_build_object('collection', jsonb_build_array(OLD.collection, NEW.collection)); END IF;
    IF NEW.tags IS DISTINCT FROM OLD.tags THEN _changes := _changes || jsonb_build_object('tags', jsonb_build_array(to_jsonb(OLD.tags), to_jsonb(NEW.tags))); END IF;
    IF NEW.image_url IS DISTINCT FROM OLD.image_url THEN _changes := _changes || jsonb_build_object('image_url', jsonb_build_array(OLD.image_url, NEW.image_url)); END IF;
    IF _action = 'edited' AND _changes = '{}'::jsonb THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO public.catalogue_item_audit (org_id, item_id, item_name, action, actor_id, changes)
  VALUES (NEW.org_id, NEW.id, NEW.name, _action, auth.uid(), _changes);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_catalogue_item_audit ON public.org_catalogue_items;
CREATE TRIGGER trg_catalogue_item_audit AFTER INSERT OR UPDATE OR DELETE ON public.org_catalogue_items
FOR EACH ROW EXECUTE FUNCTION public.log_catalogue_item_audit();