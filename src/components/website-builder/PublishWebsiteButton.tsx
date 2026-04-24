import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOrgSync } from "@/hooks/useOrgSync";
import { Rocket, Loader2, CheckCircle2 } from "lucide-react";

interface PublishWebsiteButtonProps {
  org: { id: string; name: string; slug: string };
  disabled?: boolean;
}

/**
 * Generates the full website HTML/CSS/JS from the org's current data
 * and pushes it to GitHub via the github-repo-push edge function.
 */
const PublishWebsiteButton = ({ org, disabled }: PublishWebsiteButtonProps) => {
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [lastPublished, setLastPublished] = useState<string | null>(null);
  const { broadcastSync } = useOrgSync(org.id);

  const handlePublish = async () => {
    setPublishing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in first", variant: "destructive" });
        return;
      }

      // Fetch org details, website settings, catalogue, and officers in parallel
      const [orgResult, wsResult, catResult] = await Promise.all([
        supabase.from("organizations").select("name, slug, description, email, phone, address, logo_url").eq("id", org.id).single(),
        supabase.from("org_websites").select("*").eq("org_id", org.id).single(),
        supabase.from("org_catalogue_items").select("id, name, description, price, currency, image_url, category, tags").eq("org_id", org.id).order("sort_order"),
      ]);

      const orgData = orgResult.data as any || {};
      const ws = wsResult.data as any || {};
      const catalogue = (catResult.data || []) as any[];

      const orgName = orgData.name || org.name;
      const slug = orgData.slug || org.slug;
      const description = orgData.description || "Premium bespoke fashion powered by FYSORA FASHN (Fashion Stitches Africa).";
      const email = orgData.email || "";
      const phone = orgData.phone || "";
      const address = orgData.address || "";
      const logoUrl = orgData.logo_url || "";
      const brandColor = ws.brand_color || "#C9A84C";
      const accentColor = ws.accent_color || "#1A1A2E";
      const tagline = ws.tagline || "";
      const heroDesc = ws.hero_description || description;
      const heroImg = ws.hero_image_url || "";
      const fontHeading = ws.font_heading || "Playfair Display";
      const fontBody = ws.font_body || "DM Sans";
      const palette = (ws.color_palette || {}) as Record<string, string>;
      const visionStatement = ws.vision_statement || "";
      const missionStatement = ws.mission_statement || "";
      const instagram = ws.instagram_url || "";
      const facebook = ws.facebook_url || "";
      const whatsapp = ws.whatsapp_number || phone;
      const twitter = ws.twitter_url || "";
      const tiktok = ws.tiktok_url || "";
      const youtube = ws.youtube_url || "";
      const linkedin = ws.linkedin_url || "";

      const bgColor = palette.background || "#0A0A0F";
      const textColor = palette.text_color || "#F5F0E8";
      const surfaceColor = palette.surface || "#16161F";

      const platformUrl = "https://fashionstitchesafrica.lovable.app";

      // Build catalogue HTML
      let catalogueHtml = "";
      if (catalogue.length > 0) {
        catalogueHtml = catalogue.map(item => `
        <div class="catalogue-item">
          ${item.image_url ? `<img src="${item.image_url}" alt="${(item.name || "").replace(/"/g, "&quot;")}" loading="lazy">` : '<div class="item-placeholder">🧵</div>'}
          <div class="catalogue-item-info">
            ${item.category ? `<span class="item-category">${item.category}</span>` : ""}
            <h3>${item.name || "Untitled"}</h3>
            ${item.description ? `<p>${item.description}</p>` : ""}
            ${item.price ? `<div class="catalogue-item-price">${item.currency || "₦"}${Number(item.price).toLocaleString()}</div>` : ""}
          </div>
        </div>`).join("\n");
      } else {
        catalogueHtml = `
        <div class="catalogue-empty">
          <div class="empty-icon">🧵</div>
          <h3>Coming Soon</h3>
          <p>Our catalogue is being curated. Check back soon or place a custom order.</p>
          <a href="${platformUrl}" class="btn btn-primary" target="_blank">Order Custom Design</a>
        </div>`;
      }

      // Social links for footer
      const socialLinks = [
        instagram && `<a href="${instagram}" target="_blank" title="Instagram">📸</a>`,
        facebook && `<a href="${facebook}" target="_blank" title="Facebook">👤</a>`,
        twitter && `<a href="${twitter}" target="_blank" title="Twitter/X">🐦</a>`,
        tiktok && `<a href="${tiktok}" target="_blank" title="TikTok">🎵</a>`,
        youtube && `<a href="${youtube}" target="_blank" title="YouTube">▶️</a>`,
        linkedin && `<a href="${linkedin}" target="_blank" title="LinkedIn">💼</a>`,
      ].filter(Boolean).join("\n            ");

      // About section with vision/mission
      let aboutExtra = "";
      if (visionStatement) aboutExtra += `<div class="vm-block"><h4>Our Vision</h4><p>${visionStatement}</p></div>`;
      if (missionStatement) aboutExtra += `<div class="vm-block"><h4>Our Mission</h4><p>${missionStatement}</p></div>`;

      const whatsappLink = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}` : "";

      const fontUrl = `https://fonts.googleapis.com/css2?family=${fontHeading.replace(/ /g, "+")}:wght@400;600;700;900&family=${fontBody.replace(/ /g, "+")}:wght@300;400;500;600&display=swap`;

      // ── Generate files ─────────────────────────────────────────
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${orgName} | FYSORA FASHN (Fashion Stitches Africa)</title>
  <meta name="description" content="${(description || "").replace(/"/g, "&quot;").substring(0, 160)}">
  ${logoUrl ? `<link rel="icon" type="image/png" href="${logoUrl}">` : ""}
  <link rel="stylesheet" href="styles.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="${fontUrl}" rel="stylesheet">
</head>
<body>
  <nav class="navbar" id="navbar">
    <div class="nav-container">
      <a href="#" class="nav-logo">
        ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" class="logo-img">` : ""}
        <span class="logo-text">${orgName.split(" ")[0]}</span>
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links" id="navLinks">
        <li><a href="#home">Home</a></li>
        <li><a href="#catalogue">Catalogue</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#services">Services</a></li>
        <li><a href="#contact">Contact</a></li>
        <li><a href="${platformUrl}" class="nav-cta" target="_blank">Order on FSA</a></li>
      </ul>
    </div>
  </nav>

  <section class="hero" id="home">
    <div class="hero-overlay"></div>
    ${heroImg ? `<div class="hero-bg" style="background-image:url('${heroImg}')"></div>` : ""}
    <div class="hero-content">
      <div class="hero-badge">✦ ${address ? address.split(",").pop()?.trim().toUpperCase() || "AFRICA" : "AFRICA"}</div>
      <h1 class="hero-title">${orgName}</h1>
      ${tagline ? `<p class="hero-tagline">${tagline}</p>` : ""}
      <p class="hero-subtitle">${heroDesc}</p>
      <div class="hero-actions">
        <a href="${platformUrl}" class="btn btn-primary" target="_blank">Place an Order</a>
        <a href="#catalogue" class="btn btn-outline">View Catalogue</a>
      </div>
    </div>
  </section>

  <section class="section catalogue" id="catalogue">
    <div class="container">
      <div class="section-header">
        <span class="section-tag">Our Collection</span>
        <h2 class="section-title">Featured Designs</h2>
        <p class="section-desc">Explore our latest creations — each piece crafted with precision and passion.</p>
      </div>
      <div class="catalogue-grid" id="catalogueGrid">
        ${catalogueHtml}
      </div>
    </div>
  </section>

  <section class="section about" id="about">
    <div class="container">
      <div class="about-grid">
        <div class="about-content">
          <span class="section-tag">About Us</span>
          <h2 class="section-title">${orgName}</h2>
          <p>${description}</p>
          ${aboutExtra}
          <div class="about-features">
            <div class="feature"><div class="feature-icon">✂️</div><div><h4>Bespoke Tailoring</h4><p>Custom-fitted garments made to your exact measurements</p></div></div>
            <div class="feature"><div class="feature-icon">🎨</div><div><h4>Original Designs</h4><p>Unique patterns and styles exclusive to our studio</p></div></div>
            <div class="feature"><div class="feature-icon">🏆</div><div><h4>Premium Quality</h4><p>Only the finest fabrics and materials for lasting elegance</p></div></div>
          </div>
        </div>
        <div class="about-visual">
          <div class="about-card">
            ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" class="about-img">` : `<div class="about-placeholder">${orgName.charAt(0)}</div>`}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section services" id="services">
    <div class="container">
      <div class="section-header">
        <span class="section-tag">What We Offer</span>
        <h2 class="section-title">Our Services</h2>
      </div>
      <div class="services-grid">
        <div class="service-card"><div class="service-icon">👗</div><h3>Custom Clothing</h3><p>From traditional attire to modern fashion, we craft garments tailored to your unique style.</p></div>
        <div class="service-card"><div class="service-icon">📐</div><h3>Professional Measurements</h3><p>Precise measurements taken by experts — in person or via AI-powered video tools.</p></div>
        <div class="service-card"><div class="service-icon">🚚</div><h3>Delivery</h3><p>We deliver with tracked shipping so your outfits arrive safely and on time.</p></div>
        <div class="service-card"><div class="service-icon">🔄</div><h3>Alterations & Repairs</h3><p>Expert alterations to ensure the perfect fit, plus repair services.</p></div>
      </div>
    </div>
  </section>

  <section class="section cta-section">
    <div class="container">
      <div class="cta-card">
        <h2>Ready to Look Your Best?</h2>
        <p>Place your order through FYSORA FASHN (Fashion Stitches Africa) and experience bespoke fashion like never before.</p>
        <div class="cta-actions">
          <a href="${platformUrl}" class="btn btn-primary" target="_blank">Get Started</a>
          <a href="#contact" class="btn btn-outline">Contact Us</a>
        </div>
      </div>
    </div>
  </section>

  <section class="section contact" id="contact">
    <div class="container">
      <div class="section-header">
        <span class="section-tag">Get In Touch</span>
        <h2 class="section-title">Contact Us</h2>
      </div>
      <div class="contact-grid">
        <div class="contact-info">
          ${address ? `<div class="contact-item"><div class="contact-icon">📍</div><div><h4>Visit Us</h4><p>${address}</p></div></div>` : ""}
          ${email ? `<div class="contact-item"><div class="contact-icon">📧</div><div><h4>Email</h4><p><a href="mailto:${email}">${email}</a></p></div></div>` : ""}
          ${phone ? `<div class="contact-item"><div class="contact-icon">📞</div><div><h4>Phone</h4><p><a href="tel:${phone}">${phone}</a></p></div></div>` : ""}
          ${whatsappLink ? `<div class="contact-item"><div class="contact-icon">💬</div><div><h4>WhatsApp</h4><p><a href="${whatsappLink}" target="_blank">Chat with us</a></p></div></div>` : ""}
        </div>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" class="footer-logo">` : ""}
          <p>${description ? description.substring(0, 120) : orgName + " — Powered by FYSORA FASHN (Fashion Stitches Africa)."}</p>
          ${socialLinks ? `<div class="social-links">${socialLinks}</div>` : ""}
        </div>
        <div class="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#catalogue">Catalogue</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>Platform</h4>
          <ul>
            <li><a href="${platformUrl}" target="_blank">FYSORA FASHN (Fashion Stitches Africa)</a></li>
            <li><a href="${platformUrl}/browse" target="_blank">Browse Tailors</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
        <p class="powered-by">Powered by <a href="${platformUrl}" target="_blank">FYSORA FASHN (Fashion Stitches Africa)</a> ✦</p>
      </div>
    </div>
  </footer>

  <div class="comm-bar">
    ${phone ? `<a href="tel:${phone}" class="comm-btn" title="Call">📞</a>` : ""}
    ${email ? `<a href="mailto:${email}" class="comm-btn" title="Email">📧</a>` : ""}
    ${whatsappLink ? `<a href="${whatsappLink}" class="comm-btn" title="WhatsApp" target="_blank">💬</a>` : ""}
  </div>

  <script src="app.js"></script>
</body>
</html>`;

      const stylesCss = generateStyles(brandColor, accentColor, bgColor, textColor, surfaceColor, fontHeading, fontBody);

      const appJs = `const navbar=document.getElementById('navbar');window.addEventListener('scroll',()=>{navbar.classList.toggle('scrolled',window.scrollY>50)});const navToggle=document.getElementById('navToggle'),navLinks=document.getElementById('navLinks');navToggle.addEventListener('click',()=>{navLinks.classList.toggle('open')});navLinks.querySelectorAll('a').forEach(l=>{l.addEventListener('click',()=>{navLinks.classList.remove('open')})});document.querySelectorAll('a[href^="#"]').forEach(a=>{a.addEventListener('click',function(e){e.preventDefault();const t=document.querySelector(this.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'})})});const observer=new IntersectionObserver(e=>{e.forEach(e=>{if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';observer.unobserve(e.target)}})},{threshold:0.1,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('.section').forEach(s=>{s.style.opacity='0';s.style.transform='translateY(30px)';s.style.transition='opacity 0.6s ease, transform 0.6s ease';observer.observe(s)});if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').then(r=>{console.log('SW registered:',r.scope);const bc=new BroadcastChannel('fsa_sync');bc.onmessage=e=>{if(e.data&&e.data.type==='FSA_UPDATE'){console.log('FSA update received:',e.data);if(e.data.action==='reload')location.reload()}};bc.postMessage({type:'FSA_UPDATE',action:'website_loaded',orgId:'${org.id}',timestamp:Date.now()})}).catch(e=>console.warn('SW registration failed:',e))}console.log('${slug} website loaded — powered by FYSORA FASHN (Fashion Stitches Africa)');`;

      // Service Worker for bidirectional sync between website and apps
      const swJs = `const CACHE_NAME='fsa-${slug}-v${Date.now()}';const ASSETS=['/','/index.html','/styles.css','/app.js'];self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).then(r=>{if(r.ok&&e.request.method==='GET'){const rc=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,rc))}return r}).catch(()=>caches.match(e.request)))});self.addEventListener('message',e=>{if(e.data&&e.data.type==='FSA_UPDATE'){self.clients.matchAll().then(clients=>{clients.forEach(c=>c.postMessage(e.data))})}});const bc=new BroadcastChannel('fsa_sync');bc.onmessage=e=>{if(e.data&&e.data.type==='FSA_UPDATE'){self.clients.matchAll().then(clients=>{clients.forEach(c=>c.postMessage(e.data))})}};`;

      const readmeMd = `# ${orgName}\n\n${description || "Fashion studio powered by FYSORA FASHN (Fashion Stitches Africa)."}\n\n## Contact\n${address ? `- **Address**: ${address}\n` : ""}${email ? `- **Email**: ${email}\n` : ""}${phone ? `- **Phone**: ${phone}\n` : ""}\n## Powered By\n\nThis website is natively generated and managed by [FYSORA FASHN (Fashion Stitches Africa)](${platformUrl}).\n`;

      // Push to GitHub
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/github-repo-push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "push-files",
            org_name: orgName,
            repo_name: slug,
            website_content: [
              { path: "index.html", content: indexHtml },
              { path: "styles.css", content: stylesCss },
              { path: "app.js", content: appJs },
              { path: "sw.js", content: swJs },
              { path: "README.md", content: readmeMd },
            ],
          }),
        }
      );

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Push failed");
      }

      setLastPublished(new Date().toLocaleTimeString());
      broadcastSync("website_published");
      toast({
        title: "Website published! 🎉",
        description: "Your changes have been pushed to GitHub and synced to all connected apps.",
      });
    } catch (err: any) {
      console.error("Publish error:", err);
      toast({
        title: "Publish failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="hero"
        size="sm"
        onClick={handlePublish}
        disabled={disabled || publishing}
        className="gap-1.5"
      >
        {publishing ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Publishing…
          </>
        ) : (
          <>
            <Rocket size={14} />
            Publish to Web
          </>
        )}
      </Button>
      {lastPublished && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <CheckCircle2 size={12} className="text-green-500" />
          Published at {lastPublished}
        </span>
      )}
    </div>
  );
};

// ── CSS Generator ────────────────────────────────────────────────────────────
function generateStyles(
  brandColor: string, accentColor: string, bgColor: string,
  textColor: string, surfaceColor: string, fontHeading: string, fontBody: string
): string {
  // Derive lighter/darker variants
  return `:root {
  --primary: ${brandColor};
  --accent: ${accentColor};
  --bg: ${bgColor};
  --bg-card: ${lightenHex(bgColor, 8)};
  --bg-surface: ${surfaceColor};
  --text: ${textColor};
  --text-muted: ${mixHex(textColor, bgColor, 0.4)};
  --border: ${lightenHex(bgColor, 15)};
  --radius: 16px;
  --font-heading: '${fontHeading}', Georgia, serif;
  --font-body: '${fontBody}', system-ui, sans-serif;
  --shadow: 0 20px 60px rgba(0,0,0,0.4);
  --shadow-sm: 0 4px 20px rgba(0,0,0,0.3);
  --gold-glow: 0 0 40px ${brandColor}26;
}

*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.7;overflow-x:hidden}.container{max-width:1200px;margin:0 auto;padding:0 24px}

.navbar{position:fixed;top:0;left:0;right:0;z-index:1000;padding:16px 0;transition:all .4s;background:transparent}.navbar.scrolled{background:${bgColor}f2;backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:12px 0}.nav-container{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between}.nav-logo{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--text)}.logo-img{width:44px;height:44px;border-radius:12px;object-fit:contain}.logo-text{font-family:var(--font-heading);font-size:1.4rem;font-weight:700;letter-spacing:3px;color:var(--primary)}.nav-toggle{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px}.nav-toggle span{width:24px;height:2px;background:var(--text);transition:.3s}.nav-links{display:flex;align-items:center;gap:32px;list-style:none}.nav-links a{color:var(--text-muted);text-decoration:none;font-size:.9rem;font-weight:500;transition:color .3s;letter-spacing:.5px}.nav-links a:hover{color:var(--primary)}.nav-cta{background:var(--primary)!important;color:var(--accent)!important;padding:10px 24px;border-radius:100px;font-weight:600!important;transition:all .3s!important}.nav-cta:hover{transform:translateY(-2px);box-shadow:var(--gold-glow)}

.hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:120px 24px 80px;background:radial-gradient(ellipse at 50% 30%,${brandColor}14,transparent 60%),var(--bg)}.hero-overlay{position:absolute;inset:0;pointer-events:none}.hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.15}.hero-content{position:relative;z-index:2;max-width:700px}.hero-badge{display:inline-block;padding:8px 20px;background:${brandColor}1a;border:1px solid ${brandColor}33;border-radius:100px;font-size:.75rem;letter-spacing:3px;color:var(--primary);margin-bottom:32px}.hero-title{font-family:var(--font-heading);font-size:clamp(2.5rem,7vw,5rem);font-weight:900;line-height:1.1;margin-bottom:16px;letter-spacing:2px}.hero-tagline{font-family:var(--font-heading);font-size:1.2rem;color:var(--primary);margin-bottom:16px;font-style:italic}.hero-subtitle{font-size:1.05rem;color:var(--text-muted);max-width:560px;margin:0 auto 40px;line-height:1.8}.hero-actions{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}

.btn{display:inline-flex;align-items:center;padding:14px 36px;border-radius:100px;font-size:.95rem;font-weight:600;text-decoration:none;transition:all .3s;cursor:pointer;border:none;letter-spacing:.5px}.btn-primary{background:var(--primary);color:var(--accent);box-shadow:0 4px 20px ${brandColor}4d}.btn-primary:hover{transform:translateY(-3px);box-shadow:0 8px 30px ${brandColor}66}.btn-outline{background:transparent;color:var(--text);border:1.5px solid var(--border)}.btn-outline:hover{border-color:var(--primary);color:var(--primary);transform:translateY(-3px)}

.section{padding:100px 0}.section-header{text-align:center;max-width:600px;margin:0 auto 60px}.section-tag{display:inline-block;font-size:.75rem;letter-spacing:3px;text-transform:uppercase;color:var(--primary);margin-bottom:16px}.section-title{font-family:var(--font-heading);font-size:clamp(2rem,4vw,2.8rem);font-weight:700;margin-bottom:16px}.section-desc{color:var(--text-muted);font-size:1rem}

.catalogue-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}.catalogue-empty{grid-column:1/-1;text-align:center;padding:80px 40px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border)}.empty-icon{font-size:3rem;margin-bottom:16px}.catalogue-empty h3{font-family:var(--font-heading);font-size:1.5rem;margin-bottom:12px}.catalogue-empty p{color:var(--text-muted);max-width:400px;margin:0 auto 24px}.catalogue-item{background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);overflow:hidden;transition:all .4s}.catalogue-item:hover{transform:translateY(-8px);box-shadow:var(--shadow);border-color:${brandColor}4d}.catalogue-item img{width:100%;height:280px;object-fit:cover}.item-placeholder{height:200px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--bg-surface)}.catalogue-item-info{padding:20px}.item-category{font-size:.7rem;text-transform:uppercase;letter-spacing:2px;color:var(--primary);margin-bottom:8px;display:inline-block}.catalogue-item-info h3{font-family:var(--font-heading);font-size:1.1rem;margin-bottom:8px}.catalogue-item-info p{color:var(--text-muted);font-size:.85rem;margin-bottom:12px}.catalogue-item-price{font-size:1.1rem;font-weight:700;color:var(--primary)}

.about{background:var(--bg-surface)}.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}.about-content p{color:var(--text-muted);margin-bottom:16px;font-size:.95rem}.about-features{margin-top:32px;display:flex;flex-direction:column;gap:20px}.feature{display:flex;gap:16px;align-items:flex-start}.feature-icon{font-size:1.5rem;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:${brandColor}1a;border-radius:12px;flex-shrink:0}.feature h4{font-size:.95rem;margin-bottom:4px}.feature p{color:var(--text-muted);font-size:.85rem;margin:0}.about-visual{display:flex;justify-content:center}.about-card{width:100%;max-width:400px;aspect-ratio:1;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;box-shadow:var(--gold-glow)}.about-img{width:60%;object-fit:contain;filter:drop-shadow(0 0 30px ${brandColor}33)}.about-placeholder{font-family:var(--font-heading);font-size:6rem;color:var(--primary);opacity:.3}.vm-block{margin-top:20px;padding:16px;background:${brandColor}0d;border-left:3px solid var(--primary);border-radius:0 8px 8px 0}.vm-block h4{font-size:.85rem;color:var(--primary);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px}.vm-block p{font-size:.9rem;color:var(--text-muted);margin:0}

.services-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px}.service-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:36px 28px;transition:all .4s}.service-card:hover{transform:translateY(-6px);border-color:${brandColor}4d;box-shadow:var(--gold-glow)}.service-icon{font-size:2rem;margin-bottom:20px}.service-card h3{font-family:var(--font-heading);font-size:1.15rem;margin-bottom:12px}.service-card p{color:var(--text-muted);font-size:.9rem}

.cta-section{background:var(--bg-surface)}.cta-card{text-align:center;padding:80px 40px;background:radial-gradient(ellipse at center,${brandColor}14,transparent 70%);border:1px solid var(--border);border-radius:var(--radius)}.cta-card h2{font-family:var(--font-heading);font-size:2rem;margin-bottom:16px}.cta-card p{color:var(--text-muted);max-width:500px;margin:0 auto 32px}.cta-actions{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}

.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px}.contact-info{display:flex;flex-direction:column;gap:28px}.contact-item{display:flex;gap:16px;align-items:flex-start}.contact-icon{font-size:1.3rem;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;flex-shrink:0}.contact-item h4{font-size:.95rem;margin-bottom:4px}.contact-item p{color:var(--text-muted);font-size:.9rem;margin:0}.contact-item a{color:var(--primary);text-decoration:none}.contact-item a:hover{text-decoration:underline}

.footer{background:var(--bg-card);border-top:1px solid var(--border);padding:60px 0 32px}.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;margin-bottom:48px}.footer-logo{width:48px;height:48px;border-radius:12px;margin-bottom:16px}.footer-brand p{color:var(--text-muted);font-size:.9rem;max-width:300px}.social-links{display:flex;gap:12px;margin-top:16px}.social-links a{font-size:1.2rem;text-decoration:none;transition:transform .3s}.social-links a:hover{transform:scale(1.2)}.footer-links h4{font-size:.85rem;letter-spacing:2px;text-transform:uppercase;color:var(--primary);margin-bottom:20px}.footer-links ul{list-style:none;display:flex;flex-direction:column;gap:12px}.footer-links a{color:var(--text-muted);text-decoration:none;font-size:.9rem;transition:color .3s}.footer-links a:hover{color:var(--primary)}.footer-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:24px;border-top:1px solid var(--border);font-size:.8rem;color:var(--text-muted)}.powered-by a{color:var(--primary);text-decoration:none}

.comm-bar{position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:12px;z-index:999}.comm-btn{width:52px;height:52px;border-radius:50%;background:var(--bg-card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1.3rem;text-decoration:none;transition:all .3s;box-shadow:var(--shadow-sm)}.comm-btn:hover{background:var(--primary);transform:scale(1.1);border-color:var(--primary)}

@media(max-width:768px){.nav-toggle{display:flex}.nav-links{position:fixed;top:0;right:-100%;width:280px;height:100vh;background:var(--bg-card);flex-direction:column;padding:80px 32px 32px;gap:24px;transition:right .4s;border-left:1px solid var(--border)}.nav-links.open{right:0}.about-grid,.contact-grid,.footer-grid{grid-template-columns:1fr}.footer-bottom{flex-direction:column;gap:8px;text-align:center}}`;
}

// Helper: lighten a hex color
function lightenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Helper: mix two hex colors
function mixHex(hex1: string, hex2: string, ratio: number): string {
  const n1 = parseInt(hex1.replace("#", ""), 16);
  const n2 = parseInt(hex2.replace("#", ""), 16);
  const r = Math.round(((n1 >> 16) & 0xff) * (1 - ratio) + ((n2 >> 16) & 0xff) * ratio);
  const g = Math.round(((n1 >> 8) & 0xff) * (1 - ratio) + ((n2 >> 8) & 0xff) * ratio);
  const b = Math.round((n1 & 0xff) * (1 - ratio) + (n2 & 0xff) * ratio);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default PublishWebsiteButton;
