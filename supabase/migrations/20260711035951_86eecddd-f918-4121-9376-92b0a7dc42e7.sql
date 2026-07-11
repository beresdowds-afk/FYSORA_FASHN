
-- Helper: allow org_admin, manager (assistant), designer, and super_admin to manage website-related records
CREATE OR REPLACE FUNCTION public.can_manage_org_website(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.org_members
      WHERE user_id = _user_id
        AND org_id = _org_id
        AND is_active = true
        AND role IN ('org_admin'::app_role, 'manager'::app_role, 'designer'::app_role)
    )
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_org_website(uuid, uuid) TO authenticated, anon, service_role;

-- org_websites
DROP POLICY IF EXISTS "Strict org admins can manage their website" ON public.org_websites;
CREATE POLICY "Website managers can manage their website"
  ON public.org_websites FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

-- org_website_secrets
DROP POLICY IF EXISTS "Strict org admins manage website secrets" ON public.org_website_secrets;
CREATE POLICY "Website managers manage website secrets"
  ON public.org_website_secrets FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

-- org_api_keys (needed for GitHub/token storage during website publishing)
DROP POLICY IF EXISTS "Strict org admins can manage own api keys" ON public.org_api_keys;
DROP POLICY IF EXISTS "Strict org admins can view org api keys" ON public.org_api_keys;
CREATE POLICY "Website managers can manage own api keys"
  ON public.org_api_keys FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));
CREATE POLICY "Website managers can view org api keys"
  ON public.org_api_keys FOR SELECT
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id));

-- website_builder_requests
DROP POLICY IF EXISTS "Org admins can insert website requests" ON public.website_builder_requests;
DROP POLICY IF EXISTS "Org admins can view their website requests" ON public.website_builder_requests;
DROP POLICY IF EXISTS "Org admins and super admins can update website requests" ON public.website_builder_requests;
CREATE POLICY "Website managers can insert website requests"
  ON public.website_builder_requests FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));
CREATE POLICY "Website managers can view website requests"
  ON public.website_builder_requests FOR SELECT
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id));
CREATE POLICY "Website managers can update website requests"
  ON public.website_builder_requests FOR UPDATE
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

-- website_builder_subscriptions
DROP POLICY IF EXISTS "Org admins can insert website subscription" ON public.website_builder_subscriptions;
DROP POLICY IF EXISTS "Org admins can update website subscription" ON public.website_builder_subscriptions;
CREATE POLICY "Website managers can insert website subscription"
  ON public.website_builder_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));
CREATE POLICY "Website managers can update website subscription"
  ON public.website_builder_subscriptions FOR UPDATE
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

-- org_website_template_events (insert)
DROP POLICY IF EXISTS "Org admins insert template events" ON public.org_website_template_events;
CREATE POLICY "Website managers insert template events"
  ON public.org_website_template_events FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid() AND public.can_manage_org_website(auth.uid(), org_id));

-- org_template_staging
DROP POLICY IF EXISTS "Org admins manage staging" ON public.org_template_staging;
CREATE POLICY "Website managers manage staging"
  ON public.org_template_staging FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

-- org_template_publish_history (insert)
DROP POLICY IF EXISTS "Org admins insert history" ON public.org_template_publish_history;
CREATE POLICY "Website managers insert history"
  ON public.org_template_publish_history FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

-- org_template_segment_rules
DROP POLICY IF EXISTS "Org admins manage segment rules" ON public.org_template_segment_rules;
CREATE POLICY "Website managers manage segment rules"
  ON public.org_template_segment_rules FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

-- embed_configurations
DROP POLICY IF EXISTS "Org admins can manage embed config" ON public.embed_configurations;
CREATE POLICY "Website managers can manage embed config"
  ON public.embed_configurations FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

-- org_media_assets (used by website media pickers)
DROP POLICY IF EXISTS "Org admins manage media" ON public.org_media_assets;
CREATE POLICY "Website managers manage media"
  ON public.org_media_assets FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

-- org_albums / org_collections / org_design_sets (surfaced in the website builder)
DROP POLICY IF EXISTS "Admins manage albums" ON public.org_albums;
CREATE POLICY "Website managers manage albums"
  ON public.org_albums FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins manage collections" ON public.org_collections;
CREATE POLICY "Website managers manage collections"
  ON public.org_collections FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));

DROP POLICY IF EXISTS "Admins manage sets" ON public.org_design_sets;
CREATE POLICY "Website managers manage sets"
  ON public.org_design_sets FOR ALL
  TO authenticated
  USING (public.can_manage_org_website(auth.uid(), org_id))
  WITH CHECK (public.can_manage_org_website(auth.uid(), org_id));
