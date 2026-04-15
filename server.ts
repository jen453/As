import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia" as any, 
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // ========== PROGRAMMATIC SEO PAGES ==========
  const seoKeywords = [
    { slug: 'onlyfans-funnel-builder', title: 'OnlyFans Funnel Builder – AI Landing Pages That Convert', prompt: 'High-converting OnlyFans landing page with subscription button, teaser content, and urgency timer' },
    { slug: 'ai-landing-page-generator', title: 'AI Landing Page Generator – Create High-Converting Funnels in Seconds', prompt: 'Modern, conversion-optimized landing page for a digital product, with testimonials and money-back guarantee' },
    { slug: 'link-in-bio-ai-tool', title: 'Link-in-Bio AI Tool – Smart Bio Pages for Creators', prompt: 'Link-in-bio sales page that showcases products, social links, and drives affiliate traffic' },
    { slug: 'lead-capture-squeeze-page', title: 'Lead Capture Squeeze Page – AI Generated That Converts at 40%', prompt: 'Lead capture squeeze page offering a free ebook in exchange for email, with social proof and scarcity timer' },
    { slug: 'dropshipping-product-page', title: 'Dropshipping Product Page – AI Copy That Sells', prompt: 'Dropshipping product landing page with urgency timer, reviews, and buy button' },
    { slug: 'telegram-funnel-builder', title: 'Telegram Funnel Builder – Grow Your Channel with AI', prompt: 'Telegram funnel page that collects phone numbers and redirects to a private channel with exclusive content' },
  ];

  // Cache (store in memory)
  const seoCache = new Map<string, { html: string; timestamp: number }>();
  // billboardFunnels is now used only for temporary storage before payment confirmation
  const tempFunnels = new Map<string, { id: string; html: string; prompt: string; timestamp: number }>();

  app.get('/api/my-funnels', async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ funnels: data });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch funnels' });
    }
  });

  app.get('/api/user-stats', async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { data, error } = await supabase
        .from('users')
        .select('plan, messages_used')
        .eq('id', userId)
        .single();

      if (error) throw error;
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
    try {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      res.json({ funnels: data });
    } catch (err) {
      console.error('Billboard fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch billboard' });
    }
  });

  app.get('/f/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from('funnels')
        .select('html')
        .eq('id', id)
        .single();

      if (error || !data) return res.status(404).send('Funnel not found');
      res.send(data.html);
    } catch (err) {
      res.status(500).send('Error loading funnel');
    }
  });

  app.get('/seo/:slug', async (req, res) => {
    const { slug } = req.params;
    const keyword = seoKeywords.find(k => k.slug === slug);
    if (!keyword) return res.status(404).send('Page not found');

    // Serve cached version if fresh (1 hour)
    const cached = seoCache.get(slug);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return res.send(cached.html);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Using a fast model for SEO pages
        contents: [
          {
            role: 'user',
            parts: [{ text: `You are an expert conversion copywriter. Generate a complete HTML landing page (responsive, modern, mobile-friendly) optimized for conversions. Include a prominent call-to-action and a backlink: "⚡ Built with FunnelForge → Create your own high-converting funnel". Prompt: ${keyword.prompt}` }]
          }
        ],
        config: {
          systemInstruction: "Generate only the HTML code. No markdown formatting, no backticks. Just the raw HTML."
        }
      });

      let html = response.text || '';
      // Clean up if model still returns markdown
      if (html.includes('```html')) {
        html = html.match(/```html([\s\S]*?)```/)?.[1] || html;
      } else if (html.includes('```')) {
        html = html.replace(/```/g, '');
      }

      const frontendDomain = process.env.FRONTEND_DOMAIN || req.get('host');

      // Inject SEO meta tags + fixed CTA that links to main app
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${keyword.title}</title>
  <meta name="description" content="Create a high-converting ${keyword.slug.replace(/-/g, ' ')} with AI. Get a live, shareable funnel in 30 seconds. Start for free.">
  <meta name="keywords" content="${keyword.slug.replace(/-/g, ', ')}, AI funnel builder, landing page generator">
  <link rel="canonical" href="https://${frontendDomain}/seo/${slug}">
  <style>
    .ff-cta { position: fixed; bottom: 20px; right: 20px; background: #f97316; color: white; padding: 12px 24px; border-radius: 40px; text-decoration: none; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; font-family: sans-serif; transition: all 0.2s; }
    .ff-cta:hover { background: #ea580c; transform: scale(1.05); }
  </style>
</head>
<body>
  ${html}
  <a href="/" class="ff-cta">✨ Build Your Own Funnel →</a>
</body>
</html>`;
      seoCache.set(slug, { html: fullHtml, timestamp: Date.now() });
      res.send(fullHtml);
    } catch (err) {
      console.error(err);
      res.status(500).send('Generation failed');
    }
  });

  // Auto-generate sitemap.xml for Google
  app.get('/sitemap.xml', (req, res) => {
    const frontendDomain = process.env.FRONTEND_DOMAIN || req.get('host');
    const baseUrl = `https://${frontendDomain}`;
    const urls = seoKeywords.map(k => `<url><loc>${baseUrl}/seo/${k.slug}</loc><priority>0.8</priority></url>`).join('');
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}</loc><priority>1.0</priority></url>
  ${urls}
</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  });

  // Optional: pre-generate all SEO pages (call once via cron or manually)
  app.post('/api/seo/prefetch', async (req, res) => {
    const frontendDomain = process.env.FRONTEND_DOMAIN || req.get('host');
    const baseUrl = `http://localhost:${PORT}`;
    for (const kw of seoKeywords) {
      try {
        await fetch(`${baseUrl}/seo/${kw.slug}`);
      } catch (e) {
        console.error(`Failed to prefetch ${kw.slug}`, e);
      }
    }
    res.json({ success: true });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/generate", express.json(), async (req, res) => {
    const { prompt, userId } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    try {
      // Check usage limits if userId is provided
      if (userId) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('plan, messages_used')
          .eq('id', userId)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('User fetch error:', userError);
        }

        // If user doesn't exist in our custom table yet, create them
        if (!userData) {
          await supabase.from('users').insert({ id: userId, plan: 'free', messages_used: 0 });
        } else if (userData.plan === 'free' && userData.messages_used >= 3) {
          return res.status(403).json({ error: "Daily limit reached. Upgrade to Pro for unlimited generations." });
        }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [
          {
            role: 'user',
            parts: [{ text: `Generate a high-converting, modern, responsive HTML landing page for: ${prompt}. Include a prominent call-to-action.` }]
          }
        ],
        config: {
          systemInstruction: "Generate only the HTML code. No markdown formatting, no backticks. Just the raw HTML."
        }
      });

      let html = response.text || '';
      if (html.includes('```html')) {
        html = html.match(/```html([\s\S]*?)```/)?.[1] || html;
      } else if (html.includes('```')) {
        html = html.replace(/```/g, '');
      }

      // Increment usage if userId is provided and user is free
      if (userId) {
        await supabase.rpc('increment_messages', { user_id: userId });
      }

      const frontendDomain = process.env.FRONTEND_DOMAIN || req.get('host');

      // Viral Script
      const viralScript = `
<script>
(function() {
  if (window.__ff_promo) return;
  window.__ff_promo = true;
  const div = document.createElement('div');
  div.innerHTML = '⚡ <a href="https://${frontendDomain}" style="color:#f97316; text-decoration:none; font-weight:bold;">Built with FunnelForge</a> – Create your high-converting funnel';
  div.style.position = 'fixed';
  div.style.bottom = '10px';
  div.style.right = '10px';
  div.style.background = '#0a0a0f';
  div.style.color = '#fff';
  div.style.padding = '8px 16px';
  div.style.borderRadius = '40px';
  div.style.fontSize = '12px';
  div.style.zIndex = '9999';
  div.style.fontFamily = 'sans-serif';
  div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  document.body.appendChild(div);
})();
</script>`;

      // Append before </body>
      if (html.includes('</body>')) {
        html = html.replace('</body>', viralScript + '</body>');
      } else {
        html += viralScript;
      }

      res.json({ html });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Generation failed" });
    }
  });

  app.post("/api/checkout", express.json(), async (req, res) => {
    const { html, prompt, userId } = req.body;
    if (!html) return res.status(400).json({ error: "HTML is required" });

    try {
      const frontendDomain = process.env.FRONTEND_DOMAIN || req.get('host');
      const tempId = Math.random().toString(36).substring(7);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "FunnelForge - Live Deployment",
                description: `Deployment for: ${prompt || "AI Funnel"}`,
              },
              unit_amount: 1000, // $10.00
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `https://${frontendDomain}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${frontendDomain}/?canceled=true`,
        metadata: {
          temp_id: tempId,
          user_id: userId || "",
        },
      });

      // Store HTML in memory temporarily for the webhook to pick up
      if (tempId) {
        tempFunnels.set(tempId, { id: tempId, html, prompt: prompt || "AI Funnel", timestamp: Date.now() });
      }

      res.json({ url: session.url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Checkout failed" });
    }
  });

  app.post("/api/checkout/crypto", express.json(), async (req, res) => {
    const { html, prompt, userId } = req.body;
    if (!html) return res.status(400).json({ error: "HTML is required" });

    try {
      const frontendDomain = process.env.FRONTEND_DOMAIN || req.get('host');
      const tempId = Math.random().toString(36).substring(7);
      const orderId = userId ? `${userId}:${tempId}` : tempId;
      
      const response = await fetch("https://api.nowpayments.io/v1/invoice", {
        method: "POST",
        headers: {
          "x-api-key": process.env.NOWPAYMENTS_API_KEY || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: 10,
          price_currency: "usd",
          order_id: orderId,
          order_description: `FunnelForge Deployment: ${prompt || "AI Funnel"}`,
          ipn_callback_url: `https://${frontendDomain}/api/webhook/nowpayments`,
          success_url: `https://${frontendDomain}/?success=true`,
          cancel_url: `https://${frontendDomain}/?canceled=true`,
        }),
      });

      const data = await response.json();
      
      if (data.invoice_url) {
        tempFunnels.set(orderId, { id: orderId, html, prompt: prompt || "AI Funnel", timestamp: Date.now() });
        res.json({ url: data.invoice_url });
      } else {
        console.error("NOWPayments Error:", data);
        throw new Error(data.message || "Crypto checkout failed");
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Crypto checkout failed" });
    }
  });

  app.post("/api/webhook/nowpayments", express.json(), async (req, res) => {
    const { order_id, payment_status, price_amount, price_currency, payment_id } = req.body;
    
    if (payment_status === "finished" || payment_status === "confirmed") {
      const orderId = order_id;
      if (orderId) {
        const funnel = tempFunnels.get(orderId);
        if (funnel) {
          // Extract userId if present
          let userId = null;
          if (orderId.includes(':')) {
            userId = orderId.split(':')[0];
          }

          // Save to Supabase
          const { data: newFunnel, error: funnelError } = await supabase
            .from('funnels')
            .insert({
              user_id: userId,
              html: funnel.html,
              prompt: funnel.prompt,
              is_public: true
            })
            .select()
            .single();

          if (!funnelError) {
            tempFunnels.delete(orderId);
            console.log(`Funnel ${newFunnel.id} deployed via Crypto!`);

            if (userId) {
              await supabase.from('payments').insert({
                user_id: userId,
                provider: 'nowpayments',
                amount: price_amount || 10,
                currency: price_currency || 'usd',
                status: 'confirmed',
                payment_id: payment_id
              });

              await supabase.from('users').update({ plan: 'pro' }).eq('id', userId);
            }
          }
        }
      }
    }
    res.json({ received: true });
  });

  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const tempId = session.metadata?.temp_id;
      const userId = session.metadata?.user_id;
      
      if (tempId) {
        const funnel = tempFunnels.get(tempId);
        if (funnel) {
          // Save to Supabase
          const { data: newFunnel, error: funnelError } = await supabase
            .from('funnels')
            .insert({
              user_id: userId || null,
              html: funnel.html,
              prompt: funnel.prompt,
              is_public: true
            })
            .select()
            .single();

          if (!funnelError) {
            tempFunnels.delete(tempId);
            console.log(`Funnel ${newFunnel.id} deployed to billboard!`);

            // Record in Supabase if userId exists
            if (userId) {
              await supabase.from('payments').insert({
                user_id: userId,
                provider: 'stripe',
                amount: session.amount_total ? session.amount_total / 100 : 10,
                currency: session.currency || 'usd',
                status: 'confirmed',
                payment_id: session.id
              });

              // Upgrade user plan
              await supabase.from('users').update({ plan: 'pro' }).eq('id', userId);
            }
          }
        }
      }
    }

    res.json({ received: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
