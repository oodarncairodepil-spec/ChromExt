// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare Deno global for TypeScript
declare const Deno: any;

// ---- Supabase client (server-side env is safe) ----
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
    }
  }
});

// Create anon client for public access
const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Simple HTML escaper for safety
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Detect popular crawlers that render OG previews (don't redirect these!)
function isPreviewCrawler(ua: string): boolean {
  const u = ua.toLowerCase();
  return /whatsapp|facebookexternalhit|twitterbot|linkedinbot|telegram|discordbot|slackbot|embedly|pinterest|vkshare|quora|google(bot)?|bingbot/.test(u);
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  // Skip auth check for preview function - this is a public endpoint
  // The function uses service role key internally for database access
  const url = new URL(req.url);
  const productId = url.searchParams.get("product_id");
  const variantId = url.searchParams.get("variant_id");
  const templateId = url.searchParams.get("template_id");

  // Debug endpoint to verify env
  if (url.searchParams.get("debug") === "env") {
    return new Response(JSON.stringify({
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") ? "Available" : "Missing",
      SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ? "Available" : "Missing",
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "Available" : "Missing"
    }, null, 2), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  if (!productId && !templateId) {
    const html = `<!doctype html><html><head>
      <meta property="og:title" content="Missing product_id or template_id" />
      <meta property="og:description" content="Please provide a valid product_id or template_id" />
      <title>Missing product_id or template_id</title>
    </head><body><h1>Missing product_id or template_id</h1></body></html>`;
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  }

  // Optional override for testing
  const mode = url.searchParams.get("mode"); // "image" | "page" | undefined

  // Fetch product + images (and variant if specified) OR template
  let title = "Content not found";
  let description = "Invalid ID";
  let imageUrl = "";

  try {
    if (templateId) {
      // Fetch template data
      const { data: templateData, error: templateError } = await supabaseAnon
        .from("quick_reply_templates")
        .select(`
          id,
          title,
          message,
          preview_content,
          image_url
        `)
        .eq("id", templateId)
        .single();
      
      if (!templateError && templateData) {
        title = templateData.title || "Template";
        // Use preview_content if available, otherwise fall back to message
        description = templateData.preview_content || templateData.message || title;
        imageUrl = templateData.image_url || "";
      }
    } else if (productId) {
      if (variantId) {
        // Fetch variant-specific data
        const { data: variantData, error: variantError } = await supabase
          .from("product_variants")
          .select(`
            id,
            full_product_name,
            price,
            stock,
            image_url,
            products!inner(
              name,
              description,
              product_images(image_url, is_primary)
            )
          `)
          .eq("id", variantId)
          .eq("product_id", productId)
          .single();
        
        if (!variantError && variantData) {
          title = variantData.full_product_name || variantData.products.name || "Product Variant";
          description = variantData.products.description || title;
          // Use variant image if available, otherwise fall back to product images
          imageUrl = variantData.image_url;
          if (!imageUrl) {
            const primary = variantData.products.product_images?.find((i: any) => i.is_primary) ?? variantData.products.product_images?.[0];
            if (primary?.image_url) imageUrl = primary.image_url;
          }
        }
      } else {
        // Fetch regular product data using anon client for public access
        const { data, error } = await supabaseAnon.from("products").select(`
          name, 
          description,
          product_images!inner(
            image_url,
            is_primary
          )
        `).eq("id", productId).single();
        
        if (!error && data) {
          title = data.name ?? "Product";
          description = data.description || title;
          
          // Get primary image from product_images table
          const primary = data.product_images?.find((img: any) => img.is_primary);
          if (primary?.image_url) {
            imageUrl = primary.image_url;
          } else if (data.product_images?.length > 0) {
            // Fallback to first image if no primary is set
            imageUrl = data.product_images[0].image_url;
          }
        }
      }
    }
  } catch (e) {
    console.error("DB lookup failed:", e);
  }

  // If no image, you could fall back to a placeholder PNG hosted in Storage
  // imageUrl ||= "https://.../placeholder.png";
  const ua = req.headers.get("user-agent") || "";
  const crawler = isPreviewCrawler(ua);

  // Canonical preview URL should be this function URL (not the image) - ensure HTTPS
  const canonicalOrigin = url.origin.replace('http:', 'https:');
  let canonical = "";
  if (templateId) {
    canonical = `${canonicalOrigin}${url.pathname}?template_id=${encodeURIComponent(templateId)}`;
  } else if (productId) {
    canonical = `${canonicalOrigin}${url.pathname}?product_id=${encodeURIComponent(productId)}${variantId ? `&variant_id=${encodeURIComponent(variantId)}` : ""}`;
  }

  // 1) CRAWLERS: Return OG HTML (no redirect)
  if (crawler && mode !== "image") {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : ""}
  ${imageUrl ? `<meta property="og:image:width" content="1200" />` : ""}
  ${imageUrl ? `<meta property="og:image:height" content="630" />` : ""}
  ${imageUrl ? `<meta property="og:image:type" content="image/jpeg" />` : ""}
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Product Preview" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : ""}
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHtml(title)}" />` : ""}
</body>
</html>`;
    const headers = new Headers();
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=300");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Access-Control-Allow-Origin", "*");
    
    return new Response(html, { headers });
  }

  // 2) HUMANS (or ?mode=image): redirect to the image (or your product page)
  if (mode === "page") {
    // If you have a storefront page, redirect there:
    const productPage = `https://yourstore.com/p/${productId}`; // <-- change to real product page
    return Response.redirect(productPage, 302);
  }

  // Default: redirect to image if available; else fall back to OG HTML
  if (imageUrl) {
    return Response.redirect(imageUrl, 302);
  }

  // Fallback if no image found
  const fallbackHtml = `<!doctype html><html><head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
  </head><body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p>No image available.</p>
  </body></html>`;
  const fallbackHeaders = new Headers();
  fallbackHeaders.set("Content-Type", "text/html; charset=utf-8");
  fallbackHeaders.set("Cache-Control", "no-cache");
  fallbackHeaders.set("Access-Control-Allow-Origin", "*");
  fallbackHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  fallbackHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  return new Response(fallbackHtml, { headers: fallbackHeaders });
});
