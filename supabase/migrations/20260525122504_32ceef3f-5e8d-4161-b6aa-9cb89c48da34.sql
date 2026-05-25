
-- 1. garment-images bucket: path-scoped write policies (first folder = org_id)
CREATE POLICY "Org members upload garment images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'garment-images'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_org_member(auth.uid(), ((string_to_array(name, '/'))[1])::uuid)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

CREATE POLICY "Org admins update garment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'garment-images'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_org_admin(auth.uid(), ((string_to_array(name, '/'))[1])::uuid)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

CREATE POLICY "Org admins delete garment images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'garment-images'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_org_admin(auth.uid(), ((string_to_array(name, '/'))[1])::uuid)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- 2. Realtime broadcast/presence channel authorization.
-- Supabase Realtime checks RLS on realtime.messages to authorize topic subscriptions.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users may broadcast/read on channels they belong to.
CREATE POLICY "Authenticated realtime channel access"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  -- Org-scoped channels: <prefix>-<uuid>
  (
    (
      realtime.topic() LIKE 'org-sync-%'
      OR realtime.topic() LIKE 'ai-jobs-%'
      OR realtime.topic() LIKE 'org_company_officers:%'
    )
    AND public.is_org_member(
      auth.uid(),
      NULLIF(regexp_replace(realtime.topic(), '^[^:-]*[-:]', ''), '')::uuid
    )
  )
  -- Per-user notification/inbox streams: any signed-in user can subscribe
  -- (server-side filtering already scopes content; topics aren't org-scoped)
  OR realtime.topic() IN ('notifications-realtime', 'inbox-realtime')
  -- WebRTC/chat room IDs are unguessable session ids
  OR realtime.topic() LIKE 'room:%'
  OR realtime.topic() LIKE 'chat:%'
  -- Platform / admin-only streams
  OR (
    realtime.topic() IN (
      'admin-dva-transactions',
      'dva-transactions',
      'webhook_event_log_stream',
      'sentinel_agent_incidents_feed',
      'platform-updates-worker',
      'platform-tour-tracks-sync',
      'tour-sync-state'
    )
    AND (
      public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_assistant'::public.app_role)
    )
  )
);

CREATE POLICY "Authenticated realtime channel write"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (
  (
    (
      realtime.topic() LIKE 'org-sync-%'
      OR realtime.topic() LIKE 'ai-jobs-%'
      OR realtime.topic() LIKE 'org_company_officers:%'
    )
    AND public.is_org_member(
      auth.uid(),
      NULLIF(regexp_replace(realtime.topic(), '^[^:-]*[-:]', ''), '')::uuid
    )
  )
  OR realtime.topic() IN ('notifications-realtime', 'inbox-realtime')
  OR realtime.topic() LIKE 'room:%'
  OR realtime.topic() LIKE 'chat:%'
  OR (
    realtime.topic() IN (
      'admin-dva-transactions',
      'dva-transactions',
      'webhook_event_log_stream',
      'sentinel_agent_incidents_feed',
      'platform-updates-worker',
      'platform-tour-tracks-sync',
      'tour-sync-state'
    )
    AND (
      public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_assistant'::public.app_role)
    )
  )
);
