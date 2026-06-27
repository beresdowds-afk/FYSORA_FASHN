
-- Tighten org_consultations: customer PII readable only by strict org_admin / super_admin
DROP POLICY IF EXISTS "Org admins can manage consultations" ON public.org_consultations;

CREATE POLICY "Strict admins read consultations"
  ON public.org_consultations FOR SELECT
  USING (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Strict admins update consultations"
  ON public.org_consultations FOR UPDATE
  USING (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Strict admins delete consultations"
  ON public.org_consultations FOR DELETE
  USING (public.is_strict_org_admin(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));

-- org_websites: allow active org members (any role) to read their own website config
CREATE POLICY "Org members can read their website"
  ON public.org_websites FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id) OR public.has_role(auth.uid(), 'super_admin'));
