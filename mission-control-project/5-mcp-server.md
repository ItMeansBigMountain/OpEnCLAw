step 1 get an api key 
check .env file for ape key values 


Step 2: Install the Apify MCP Server
Tell your OpenClaw agent: "Install the Apify MCP server and configure it with my API token: [your-token]". Your agent will handle the rest. Find your API token at console.apify.com/account/integrations.


Step 3: Set Up Gmail (Optional - for email drafts)
If you want your agent to auto-draft emails in Gmail, you'll need to set up Himalaya (a CLI email client). Tell your agent: "Set up Himalaya for my Gmail account". You'll need to enable 2FA on your Google account and create an App Password. Your agent will walk you through it.v

Copy the skill file below and save it as lead-gen/SKILL.md in your agent's skills folder. Or just paste the prompt below and your agent will set everything up.

---
name: lead-gen
description: Scrape, enrich, score, and draft personalized outreach for business leads. Use when asked to "find leads", "generate leads", "scrape businesses", "prospect", "find clients", "outreach campaign", "cold email", "contact form outreach", or any lead generation task.
---

# Lead Gen Agent

End-to-end lead generation pipeline: scrape → crawl → score → draft → output.

## Quick Start

Collect from user:
1. Business type (e.g., "HVAC companies", "dentists")
2. Location (e.g., "Phoenix, AZ")
3. Count (default: 10)
4. Outreach angle (what are you selling?)

## Pipeline

### Step 1: Scrape (Apify)
Use compass/crawler-google-places actor.
Cost: ~$0.02/lead. Free tier = 250 leads/mo.

### Step 2: Crawl (web_fetch)
For each lead with a website:
- Fetch homepage + contact page
- Find: emails, contact forms, chatbots, booking systems
- Note what they're missing

### Step 3: Score & Personalize
Score 1-10 as "Opportunity Score":
- Website gaps = higher score
- High rating + low reviews = untapped potential
- Reference specific details from their site

### Step 4: Output
CSV with: Company Name, Rating, Email, Phone, Website, Opportunity Score, Outreach Draft
- No email? Put "No email on site"
- Email leads get longer drafts + Gmail draft saved
- Contact form leads get shorter paste-ready messages

Save to ~/Desktop/ and open in Numbers.

### Step 5: Gmail Drafts
For leads WITH emails, save draft via Himalaya:
himalaya template save -f "[Gmail]/Drafts"

## Compliance (US)
- Cold B2B email: Legal (CAN-SPAM). Include identity + unsubscribe.
- Contact forms: Completely fine.
- Cold texting: Requires written consent (TCPA). Don't mass-text.
- Phone numbers: Reference/manual calls only.
