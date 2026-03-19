import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_USER = "beresdowds-afk";
const GITHUB_ORG = "East-forte-fabrications-and-equipments";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GITHUB_PAT = Deno.env.get("GITHUB_PAT");
  if (!GITHUB_PAT) {
    return new Response(JSON.stringify({ error: "GITHUB_PAT not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, org_name, repo_name, website_content, description } = await req.json();
    const headers = {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const sanitizedRepo = (repo_name || org_name || "website")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (action === "create-repo") {
      // Check if repo exists under personal account
      const checkPersonal = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${sanitizedRepo}`, { headers });
      if (checkPersonal.status === 200) {
        return new Response(JSON.stringify({ success: true, repo_url: `https://github.com/${GITHUB_USER}/${sanitizedRepo}`, message: "Repository already exists under personal account" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if repo exists under org
      const checkOrg = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}`, { headers });
      if (checkOrg.status === 200) {
        return new Response(JSON.stringify({ success: true, repo_url: `https://github.com/${GITHUB_ORG}/${sanitizedRepo}`, message: "Repository already exists under organization" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try creating under org first
      let createRes = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: sanitizedRepo,
          description: description || `FSA native website for ${org_name}`,
          private: false,
          auto_init: true,
        }),
      });

      // If org fails, fall back to personal account
      if (!createRes.ok) {
        const orgErr = await createRes.text();
        console.log(`Org repo creation failed (${createRes.status}): ${orgErr}, falling back to personal account ${GITHUB_USER}`);
        createRes = await fetch(`https://api.github.com/user/repos`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: sanitizedRepo,
            description: description || `FSA native website for ${org_name}`,
            private: false,
            auto_init: true,
          }),
        });
      }

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(`GitHub create repo failed [${createRes.status}]: ${JSON.stringify(err)}`);
      }

      const repo = await createRes.json();
      return new Response(JSON.stringify({ success: true, repo_url: repo.html_url, repo_full_name: repo.full_name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "push-files") {
      // Determine which account owns the repo
      let repoOwner = GITHUB_USER;
      const checkOwner = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}`, { headers });
      if (checkOwner.status === 200) {
        repoOwner = GITHUB_ORG;
      }

      const files = website_content || [];
      const filesToPush = files.length > 0 ? files : [
        {
          path: "README.md",
          content: `# ${org_name} - Fashion Stitches Africa\n\nNatively generated website powered by Fashion Stitches Africa platform.\n\n## Deployment\nThis website is auto-deployed and managed by the FSA platform.\n`,
        },
        {
          path: "index.html",
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${org_name} | Fashion Stitches Africa</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <header>\n    <h1>${org_name}</h1>\n    <p>Powered by Fashion Stitches Africa</p>\n  </header>\n  <main>\n    <section id="catalogue"></section>\n    <section id="measurements"></section>\n    <section id="contact"></section>\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>\n`,
        },
        {
          path: "styles.css",
          content: `/* ${org_name} - FSA Generated Website */\n:root {\n  --primary: #C9A84C;\n  --bg: #1A1A2E;\n  --text: #F5F0E8;\n}\nbody { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; }\nheader { padding: 2rem; text-align: center; border-bottom: 2px solid var(--primary); }\nh1 { color: var(--primary); }\n`,
        },
        {
          path: "app.js",
          content: `// ${org_name} - FSA Platform Integration\nconsole.log("${org_name} website loaded - powered by Fashion Stitches Africa");\n`,
        },
      ];

      const refRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/ref/heads/main`, { headers });
      if (!refRes.ok) throw new Error(`Failed to get ref: ${refRes.status}`);
      const refData = await refRes.json();
      const latestCommitSha = refData.object.sha;

      const blobShas = [];
      for (const file of filesToPush) {
        const blobRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/blobs`, {
          method: "POST", headers,
          body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
        });
        if (!blobRes.ok) {
          const blobErr = await blobRes.text();
          throw new Error(`Blob creation failed for ${file.path} [${blobRes.status}]: ${blobErr}`);
        }
        const blob = await blobRes.json();
        blobShas.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      }

      const treeRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/trees`, {
        method: "POST", headers,
        body: JSON.stringify({ base_tree: latestCommitSha, tree: blobShas }),
      });
      if (!treeRes.ok) {
        const treeErr = await treeRes.text();
        throw new Error(`Tree creation failed [${treeRes.status}]: ${treeErr}`);
      }
      const tree = await treeRes.json();

      const commitRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/commits`, {
        method: "POST", headers,
        body: JSON.stringify({ message: `Website update for ${org_name}`, tree: tree.sha, parents: [latestCommitSha] }),
      });
      if (!commitRes.ok) {
        const commitErr = await commitRes.text();
        throw new Error(`Commit creation failed [${commitRes.status}]: ${commitErr}`);
      }
      const commit = await commitRes.json();

      const refUpdateRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/git/refs/heads/main`, {
        method: "PATCH", headers,
        body: JSON.stringify({ sha: commit.sha }),
      });
      if (!refUpdateRes.ok) {
        const refErr = await refUpdateRes.text();
        throw new Error(`Ref update failed [${refUpdateRes.status}]: ${refErr}`);
      }

      return new Response(JSON.stringify({ success: true, commit_sha: commit.sha, message: "Files pushed successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "transfer-repo") {
      const { new_owner } = await req.json().catch(() => ({}));
      const targetOwner = new_owner || GITHUB_ORG;
      const transferRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${sanitizedRepo}/transfer`, {
        method: "POST",
        headers,
        body: JSON.stringify({ new_owner: targetOwner }),
      });
      if (!transferRes.ok) {
        const err = await transferRes.text();
        throw new Error(`Transfer failed [${transferRes.status}]: ${err}`);
      }
      const result = await transferRes.json();
      return new Response(JSON.stringify({ success: true, new_url: result.html_url, message: `Repository transferred to ${targetOwner}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-repos") {
      // List from both personal and org
      const [personalRes, orgRes] = await Promise.all([
        fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`, { headers }),
        fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos?per_page=100&sort=updated`, { headers }),
      ]);
      const personalRepos = personalRes.ok ? await personalRes.json() : [];
      const orgRepos = orgRes.ok ? await orgRes.json() : [];
      const allRepos = [...personalRepos, ...orgRepos];
      return new Response(JSON.stringify({ success: true, repos: allRepos.map((r: any) => ({ name: r.name, url: r.html_url, updated: r.updated_at, owner: r.owner?.login })) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enable-pages") {
      let repoOwner = GITHUB_USER;
      const checkOwner = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}`, { headers });
      if (checkOwner.status === 200) repoOwner = GITHUB_ORG;

      // Enable GitHub Pages from main branch root
      const pagesRes = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/pages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ source: { branch: "main", path: "/" } }),
      });

      if (pagesRes.status === 409) {
        // Pages already enabled, get current config
        const existingPages = await fetch(`https://api.github.com/repos/${repoOwner}/${sanitizedRepo}/pages`, { headers });
        const pagesData = await existingPages.json();
        return new Response(JSON.stringify({ success: true, pages_url: pagesData.html_url, message: "GitHub Pages already enabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!pagesRes.ok) {
        const err = await pagesRes.text();
        throw new Error(`Enable Pages failed [${pagesRes.status}]: ${err}`);
      }

      const pagesData = await pagesRes.json();
      return new Response(JSON.stringify({ success: true, pages_url: pagesData.html_url, message: "GitHub Pages enabled successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GitHub repo error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
