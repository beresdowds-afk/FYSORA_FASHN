import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_EMBED_ORIGINS = [
  "https://eastforte.org.ng",
  "https://www.eastforte.org.ng",
  "http://eastforte.org.ng",
  "http://www.eastforte.org.ng",
  "https://fs-africa.org.ng",
  "https://www.fs-africa.org.ng",
  "https://gabulkfashionstudio.org.ng",
  "https://www.gabulkfashionstudio.org.ng",
  "http://gabulkfashionstudio.org.ng",
  "http://www.gabulkfashionstudio.org.ng",
  "https://fashionstitchesafrica.lovable.app",
];

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_EMBED_ORIGINS.some(o => origin.startsWith(o));
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const widgetKey = url.searchParams.get("key");
  const format = url.searchParams.get("format") || "js";

  if (!widgetKey) {
    return new Response(JSON.stringify({ error: "Widget key required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: config, error } = await supabase
    .from("embed_configurations")
    .select("*, organizations(name, slug, logo_url, currency)")
    .eq("widget_key", widgetKey)
    .eq("is_enabled", true)
    .single();

  if (error || !config) {
    return new Response(JSON.stringify({ error: "Invalid or disabled widget" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check domain allowlist
  const referer = req.headers.get("origin") || req.headers.get("referer") || "";
  if (config.allowed_domains.length > 0) {
    const allowed = config.allowed_domains.some((d: string) => referer.includes(d));
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Domain not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Use fs-africa.org.ng as primary, fallback to lovable.app
  const appUrl = "https://fs-africa.org.ng";
  const fallbackAppUrl = "https://fashionstitchesafrica.lovable.app";
  const orgSlug = config.organizations?.slug || "";
  const features = config.enabled_features || [];
  const theme = config.theme_config || {};

  // Return config JSON
  if (format === "config") {
    return new Response(JSON.stringify({
      orgId: config.org_id,
      orgName: config.organizations?.name,
      orgSlug: config.organizations?.slug,
      features: config.enabled_features,
      theme: config.theme_config,
      branding: config.branding_text,
      appUrl,
      fallbackAppUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Return iframe embed HTML page
  if (format === "iframe") {
    const iframePage = url.searchParams.get("page") || "";
    const targetUrl = `${appUrl}/site/${orgSlug}${iframePage ? "?tab=" + iframePage : ""}`;
    const iframeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.organizations?.name || "FYSORA FASHN (Fashion Stitches Africa)"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0F0F1A; }
    .fsa-embed-container { width: 100%; height: 100vh; position: relative; }
    .fsa-embed-container iframe {
      width: 100%; height: 100%; border: none;
      background: #0F0F1A;
    }
    .fsa-embed-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 20px; background: #1A1A2E; border-bottom: 1px solid rgba(201,168,76,0.2);
    }
    .fsa-embed-header .brand {
      display: flex; align-items: center; gap: 8px;
      color: #C9A84C; font-weight: 600; font-size: 14px; text-decoration: none;
    }
    .fsa-embed-header .powered {
      font-size: 11px; color: #A0A0B0;
    }
    .fsa-embed-header .powered a { color: #C9A84C; text-decoration: none; }
    .fsa-embed-nav {
      display: flex; gap: 4px; padding: 8px 20px;
      background: #1A1A2E; border-bottom: 1px solid rgba(201,168,76,0.15);
      overflow-x: auto;
    }
    .fsa-embed-nav button {
      padding: 6px 16px; border-radius: 6px; border: 1px solid rgba(201,168,76,0.2);
      background: transparent; color: #A0A0B0; cursor: pointer;
      font-size: 12px; font-weight: 500; white-space: nowrap; transition: all 0.2s;
    }
    .fsa-embed-nav button:hover, .fsa-embed-nav button.active {
      background: rgba(201,168,76,0.15); color: #C9A84C; border-color: #C9A84C;
    }
  </style>
</head>
<body>
  <div class="fsa-embed-header">
    <a href="${appUrl}/site/${orgSlug}" target="_blank" class="brand">
      ✦ ${config.organizations?.name || "Fashion Services"}
    </a>
    <span class="powered">Powered by <a href="${appUrl}" target="_blank">FYSORA FASHN (Fashion Stitches Africa)</a></span>
  </div>
  <div class="fsa-embed-nav" id="featureNav"></div>
  <div class="fsa-embed-container">
    <iframe id="fsaFrame" src="${targetUrl}" allow="camera; microphone; geolocation" loading="lazy"></iframe>
  </div>
  <script>
    var features = ${JSON.stringify(features)};
    var LABELS = {
      measurements: "📐 AI Measurements",
      tryon: "👗 Virtual Try-On",
      appointments: "📅 Book Appointment",
      catalogue: "🛍️ Catalogue"
    };
    var nav = document.getElementById("featureNav");
    var frame = document.getElementById("fsaFrame");
    var baseUrl = "${appUrl}/site/${orgSlug}";
    features.forEach(function(f, i) {
      var btn = document.createElement("button");
      btn.textContent = LABELS[f] || f;
      if (i === 0) btn.className = "active";
      btn.addEventListener("click", function() {
        nav.querySelectorAll("button").forEach(function(b) { b.className = ""; });
        btn.className = "active";
        var tab = f === "measurements" ? "book" : f === "appointments" ? "book" : f;
        frame.src = baseUrl + "?tab=" + tab;
      });
      nav.appendChild(btn);
    });
  </script>
</body>
</html>`;
    return new Response(iframeHTML, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html",
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors 'self' https://eastforte.org.ng https://*.eastforte.org.ng https://fs-africa.org.ng https://*.fs-africa.org.ng",
      },
    });
  }

  // Return embeddable JavaScript widget
  const widgetJS = `
(function() {
  'use strict';
  if (window.__FSA_WIDGET_LOADED) return;
  window.__FSA_WIDGET_LOADED = true;

  var CONFIG = {
    appUrl: "${appUrl}",
    fallbackAppUrl: "${fallbackAppUrl}",
    orgSlug: "${orgSlug}",
    orgId: "${config.org_id}",
    orgName: "${config.organizations?.name || ""}",
    features: ${JSON.stringify(features)},
    theme: ${JSON.stringify(theme)},
    branding: "${config.branding_text || "Powered by FYSORA FASHN (Fashion Stitches Africa)"}"
  };

  // Inject styles
  var style = document.createElement('style');
  style.textContent = \`
    #fsa-widget-btn {
      position: fixed;
      \${CONFIG.theme.position === 'bottom-left' ? 'left: 20px' : 'right: 20px'};
      bottom: 20px;
      width: 60px; height: 60px;
      border-radius: 50%;
      background: \${CONFIG.theme.primaryColor || '#C9A84C'};
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #fsa-widget-btn:hover { transform: scale(1.1); }
    #fsa-widget-btn svg { width: 28px; height: 28px; }
    #fsa-widget-panel {
      position: fixed;
      \${CONFIG.theme.position === 'bottom-left' ? 'left: 20px' : 'right: 20px'};
      bottom: 90px;
      width: 380px; max-height: 560px;
      background: #fff;
      border-radius: \${CONFIG.theme.borderRadius || '12px'};
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 999999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #fsa-widget-panel.open { display: flex; }
    .fsa-header {
      background: \${CONFIG.theme.primaryColor || '#C9A84C'};
      color: #fff;
      padding: 16px; font-size: 16px; font-weight: 600;
    }
    .fsa-header small { opacity: 0.8; font-size: 12px; display: block; margin-top: 2px; }
    .fsa-body { padding: 16px; flex: 1; overflow-y: auto; }
    .fsa-feature-btn {
      display: flex; align-items: center; gap: 12px;
      width: 100%; padding: 14px 16px;
      border: 1px solid #e5e7eb; border-radius: 10px;
      background: #fff; cursor: pointer;
      text-align: left; margin-bottom: 10px;
      transition: all 0.15s;
    }
    .fsa-feature-btn:hover { background: #f9fafb; border-color: \${CONFIG.theme.primaryColor || '#C9A84C'}; }
    .fsa-feature-btn .icon { width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: \${CONFIG.theme.primaryColor || '#C9A84C'}15; }
    .fsa-feature-btn .icon svg { width: 20px; height: 20px; color: \${CONFIG.theme.primaryColor || '#C9A84C'}; }
    .fsa-feature-btn .text h4 { margin: 0; font-size: 14px; font-weight: 600; color: #111; }
    .fsa-feature-btn .text p { margin: 2px 0 0; font-size: 12px; color: #6b7280; }
    .fsa-footer { padding: 10px 16px; text-align: center; font-size: 11px; color: #9ca3af;
      border-top: 1px solid #f3f4f6; }
    .fsa-footer a { color: \${CONFIG.theme.primaryColor || '#C9A84C'}; text-decoration: none; }
    /* Full-page embed mode */
    #fsa-fullpage-embed {
      position: relative; width: 100%; min-height: 600px;
      border-radius: 12px; overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    #fsa-fullpage-embed iframe { width: 100%; height: 100%; min-height: 600px; border: none; }
  \`;
  document.head.appendChild(style);

  // Check for inline embed container
  var inlineContainer = document.getElementById('fsa-embed');
  if (inlineContainer) {
    var embedDiv = document.createElement('div');
    embedDiv.id = 'fsa-fullpage-embed';
    var embedPage = inlineContainer.getAttribute('data-page') || '';
    var tabParam = embedPage ? '?tab=' + embedPage : '';
    var iframe = document.createElement('iframe');
    iframe.src = CONFIG.appUrl + '/site/' + CONFIG.orgSlug + tabParam;
    iframe.allow = 'camera; microphone; geolocation';
    iframe.loading = 'lazy';
    iframe.style.minHeight = (inlineContainer.getAttribute('data-height') || '700') + 'px';
    embedDiv.appendChild(iframe);
    inlineContainer.appendChild(embedDiv);
    // Also adjust container height
    var resizeObserver = new ResizeObserver(function() {
      iframe.style.height = inlineContainer.offsetHeight + 'px';
    });
    resizeObserver.observe(inlineContainer);
    return; // Skip floating widget if inline embed exists
  }

  // Feature definitions
  var FEATURES = {
    measurements: {
      icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
      title: 'AI Body Measurements',
      desc: 'Get precise measurements using AI technology',
      action: function() { window.open(CONFIG.appUrl + '/site/' + CONFIG.orgSlug + '?tab=book', '_blank'); }
    },
    tryon: {
      icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>',
      title: 'Virtual Try-On',
      desc: 'See how outfits look on you with AI',
      action: function() { window.open(CONFIG.appUrl + '/site/' + CONFIG.orgSlug + '?tab=catalogue', '_blank'); }
    },
    appointments: {
      icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
      title: 'Book Appointment',
      desc: 'Schedule a fitting or consultation',
      action: function() { window.open(CONFIG.appUrl + '/site/' + CONFIG.orgSlug + '?tab=book', '_blank'); }
    },
    catalogue: {
      icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>',
      title: 'View Catalogue',
      desc: 'Browse our fashion collection',
      action: function() { window.open(CONFIG.appUrl + '/site/' + CONFIG.orgSlug + '?tab=catalogue', '_blank'); }
    }
  };

  // Create widget button
  var btn = document.createElement('button');
  btn.id = 'fsa-widget-btn';
  btn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>';
  btn.title = 'FYSORA FASHN (Fashion Stitches Africa)';
  document.body.appendChild(btn);

  // Create panel
  var panel = document.createElement('div');
  panel.id = 'fsa-widget-panel';
  var html = '<div class="fsa-header">' + CONFIG.orgName + '<small>FYSORA FASHN (Fashion Stitches Africa) Services</small></div>';
  html += '<div class="fsa-body">';
  CONFIG.features.forEach(function(f) {
    var feat = FEATURES[f];
    if (!feat) return;
    html += '<button class="fsa-feature-btn" data-feature="' + f + '">' +
      '<div class="icon">' + feat.icon + '</div>' +
      '<div class="text"><h4>' + feat.title + '</h4><p>' + feat.desc + '</p></div></button>';
  });
  html += '</div>';
  html += '<div class="fsa-footer"><a href="' + CONFIG.appUrl + '" target="_blank">' + CONFIG.branding + '</a></div>';
  panel.innerHTML = html;
  document.body.appendChild(panel);

  // Toggle
  btn.addEventListener('click', function() {
    panel.classList.toggle('open');
  });

  // Feature clicks
  panel.querySelectorAll('.fsa-feature-btn').forEach(function(b) {
    b.addEventListener('click', function() {
      var f = this.getAttribute('data-feature');
      if (FEATURES[f]) FEATURES[f].action();
    });
  });

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });
})();
`;

  return new Response(widgetJS, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=300",
    },
  });
});
