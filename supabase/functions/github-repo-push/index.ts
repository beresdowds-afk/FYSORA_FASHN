import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      // Check if repo exists
      const checkRes = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}`, { headers });

      if (checkRes.status === 200) {
        return new Response(JSON.stringify({ success: true, repo_url: `https://github.com/${GITHUB_ORG}/${sanitizedRepo}`, message: "Repository already exists" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create repo under org
      const createRes = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: sanitizedRepo,
          description: description || `FSA native website for ${org_name}`,
          private: false,
          auto_init: true,
        }),
      });

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
      // Push website files to repo using the Git Trees API
      const files = website_content || [];
      if (files.length === 0) {
        // Push a default README + index.html
        const defaultFiles = [
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

        // Get default branch ref
        const refRes = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}/git/ref/heads/main`, { headers });
        if (!refRes.ok) {
          throw new Error(`Failed to get ref: ${refRes.status}`);
        }
        const refData = await refRes.json();
        const latestCommitSha = refData.object.sha;

        // Create blobs
        const blobShas = [];
        for (const file of defaultFiles) {
          const blobRes = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}/git/blobs`, {
            method: "POST",
            headers,
            body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
          });
          const blob = await blobRes.json();
          blobShas.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
        }

        // Create tree
        const treeRes = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}/git/trees`, {
          method: "POST",
          headers,
          body: JSON.stringify({ base_tree: latestCommitSha, tree: blobShas }),
        });
        const tree = await treeRes.json();

        // Create commit
        const commitRes = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}/git/commits`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: `Initial website deployment for ${org_name}`,
            tree: tree.sha,
            parents: [latestCommitSha],
          }),
        });
        const commit = await commitRes.json();

        // Update ref
        await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${sanitizedRepo}/git/refs/heads/main`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ sha: commit.sha }),
        });

        return new Response(JSON.stringify({ success: true, commit_sha: commit.sha, message: "Files pushed successfully" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "list-repos") {
      const listRes = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos?per_page=100&sort=updated`, { headers });
      if (!listRes.ok) throw new Error(`GitHub list repos failed [${listRes.status}]`);
      const repos = await listRes.json();
      return new Response(JSON.stringify({ success: true, repos: repos.map((r: any) => ({ name: r.name, url: r.html_url, updated: r.updated_at })) }), {
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
