
CREATE TEMP TABLE _restored(name text, plaintext text, prefix text);

DO $$
DECLARE
  v_org uuid := '037ade55-eedb-46da-a8fb-3267e0434a8c';
  v_owner uuid;
  rec record;
  raw text; prefix text; plaintext text; kid uuid; hsecret text;
BEGIN
  SELECT user_id INTO v_owner FROM public.org_members
    WHERE org_id = v_org AND role IN ('org_admin','manager') LIMIT 1;

  FOR rec IN
    SELECT DISTINCT ON (slug) integration_name, slug, environment, webhook_url
    FROM public.integration_credential_events
    WHERE slug IN ('gabulk_fashion_studio','gabulkfashionstudio_org_ng')
    ORDER BY slug, created_at DESC
  LOOP
    IF EXISTS (SELECT 1 FROM public.org_integration_api_keys
               WHERE org_id = v_org AND name = rec.integration_name AND revoked_at IS NULL) THEN
      CONTINUE;
    END IF;

    raw := encode(gen_random_bytes(32), 'hex');
    prefix := 'fsa_' || COALESCE(rec.environment,'live') || '_' || substr(raw,1,8);
    plaintext := prefix || '_' || substr(raw,9);

    INSERT INTO public.org_integration_api_keys
      (org_id, name, key_prefix, key_hash, scopes, environment, created_by)
    VALUES (v_org, rec.integration_name, prefix,
            encode(digest(plaintext,'sha256'),'hex'),
            ARRAY['catalogue:read','catalogue:write','orders:read','orders:write','website:write'],
            COALESCE(rec.environment,'live'), v_owner)
    RETURNING id INTO kid;

    INSERT INTO _restored VALUES (rec.integration_name, plaintext, prefix);

    IF rec.webhook_url IS NOT NULL THEN
      hsecret := 'whsec_' || encode(gen_random_bytes(24),'hex');
      INSERT INTO public.org_outbound_webhooks
        (org_id, url, description, events, secret, is_active, created_by, linked_api_key_id)
      VALUES (v_org, rec.webhook_url, 'Restored: ' || rec.integration_name,
              ARRAY['order.created','order.updated','catalogue.updated','website.published','ping'],
              hsecret, true, v_owner, kid);
    END IF;

    INSERT INTO public.integration_credential_events
      (integration_name, slug, environment, action, api_key_prefix, webhook_url, request_metadata)
    VALUES (rec.integration_name, rec.slug, COALESCE(rec.environment,'live'), 'rotated',
            prefix, rec.webhook_url,
            jsonb_build_object('reason','legacy key restoration','org_id', v_org));
  END LOOP;
END $$;

INSERT INTO public.org_website_secrets (org_id, api_key, api_secret)
SELECT org_id, api_key, NULL
FROM public.org_websites
WHERE api_key IS NOT NULL
ON CONFLICT (org_id) DO UPDATE SET api_key = COALESCE(public.org_website_secrets.api_key, EXCLUDED.api_key);

ALTER TABLE public.org_websites DROP COLUMN IF EXISTS api_key;

SELECT * FROM _restored;
