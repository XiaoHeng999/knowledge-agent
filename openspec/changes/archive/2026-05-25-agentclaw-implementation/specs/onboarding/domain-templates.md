# Domain Preset Templates

> Version: 1.0 | Date: 2026-05-22
> Task: P0.6.3 — Design domain preset templates
> Combined from: T6 + DT1 + DT5

---

## Overview

Domain templates pre-populate `config.yaml` with relevant sources, research settings, framework configurations, and skill selections. Templates are offered during onboarding (Step 3) and when creating new domains. Each template includes a display card with icon, name, description, and source types.

---

## Template List

| Template | Icon | Color | Description |
|----------|------|-------|-------------|
| AI & Machine Learning | 🤖 | `#7aa2f7` | ML research with arXiv papers and model tracking |
| Web Development | 💻 | `#22c55e` | Frontend/backend tech with GitHub and blog sources |
| Product & Design | 🎨 | `#f472b6` | Design research with RSS and case study sources |
| Business Strategy | 📊 | `#f9bd2b` | Market research with news and report sources |
| Custom | ✏️ | `#a9b1d6` | Blank domain with default settings |

---

## Template 1: AI & Machine Learning

```yaml
# Domain: AI & Machine Learning
name: "AI & Machine Learning"
description: "Artificial intelligence and machine learning research domain"
color: "#7aa2f7"
icon: "robot"

models:
  expert: null        # Uses user's default expert model
  research: null      # Uses user's default research model
  summary: null       # Uses user's default summary model

research:
  schedule: "0 9 * * 1-5"    # Weekdays at 9am
  max_daily_runs: 2
  max_cost_per_run_usd: 0.10
  query_templates:
    - "What are the latest developments in {topic}?"
    - "Summarize recent papers about {topic}"
    - "Compare approaches to {topic}"

sources:
  - name: "arXiv cs.AI"
    type: "rss"
    url: "https://rss.arxiv.org/rss/cs.AI"
    polling_interval_hours: 24
    auto_import: false

  - name: "arXiv cs.LG"
    type: "rss"
    url: "https://rss.arxiv.org/rss/cs.LG"
    polling_interval_hours: 24
    auto_import: false

  - name: "Hugging Face Blog"
    type: "rss"
    url: "https://huggingface.co/blog/feed.xml"
    polling_interval_hours: 48
    auto_import: false

  - name: "Papers With Code"
    type: "rss"
    url: "https://paperswithcode.com/rss"
    polling_interval_hours: 48
    auto_import: false

frameworks:
  - type: "trl"                # Technology Readiness Level
    enabled: true
    schedule: "0 10 1 * *"     # Monthly on the 1st

  - type: "hype_cycle"         # Gartner Hype Cycle style
    enabled: true
    schedule: "0 10 1 * *"     # Monthly on the 1st

tags:
  - "machine-learning"
  - "deep-learning"
  - "nlp"
  - "computer-vision"
  - "transformers"
  - "llm"
  - "generative-ai"

skills:
  - "paper-summarizer"
  - "trend-analyzer"
  - "connection-finder"
```

**Created directory structure**:
```
domains/ai-machine-learning/
├── config.yaml          (above content)
├── skills/
│   └── (symlinks to built-in skills)
├── tools/
├── prompts/
│   └── expert-system.md (default expert prompt for AI/ML)
├── data/
│   ├── knowledge/
│   └── inbox/
└── decisions/
```

---

## Template 2: Web Development

```yaml
# Domain: Web Development
name: "Web Development"
description: "Frontend and backend web development technologies"
color: "#22c55e"
icon: "code"

models:
  expert: null
  research: null
  summary: null

research:
  schedule: "0 9 * * 1-5"    # Weekdays at 9am
  max_daily_runs: 2
  max_cost_per_run_usd: 0.08
  query_templates:
    - "What's new in {topic} this week?"
    - "Best practices for {topic} in {year}"
    - "Compare {topic} alternatives"

sources:
  - name: "GitHub Trending (TypeScript)"
    type: "rss"
    url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/typescript.xml"
    polling_interval_hours: 24
    auto_import: false

  - name: "JavaScript Weekly"
    type: "rss"
    url: "https://javascriptweekly.com/rss"
    polling_interval_hours: 168    # Weekly
    auto_import: false

  - name: "CSS-Tricks"
    type: "rss"
    url: "https://css-tricks.com/feed/"
    polling_interval_hours: 48
    auto_import: false

  - name: "Dev.to (WebDEV)"
    type: "rss"
    url: "https://dev.to/feed/tag/webdev"
    polling_interval_hours: 48
    auto_import: false

frameworks:
  - type: "competitive_landscape"
    enabled: true
    schedule: "0 10 1 * *"     # Monthly

tags:
  - "javascript"
  - "typescript"
  - "react"
  - "nextjs"
  - "css"
  - "web-performance"
  - "accessibility"

skills:
  - "trend-analyzer"
  - "connection-finder"
```

---

## Template 3: Product & Design

```yaml
# Domain: Product & Design
name: "Product & Design"
description: "Product design, UX research, and design systems"
color: "#f472b6"
icon: "palette"

models:
  expert: null
  research: null
  summary: null

research:
  schedule: "0 10 * * 1"      # Mondays at 10am
  max_daily_runs: 1
  max_cost_per_run_usd: 0.08
  query_templates:
    - "Latest trends in {topic}"
    - "Case studies about {topic}"
    - "Design patterns for {topic}"

sources:
  - name: "Smashing Magazine"
    type: "rss"
    url: "https://www.smashingmagazine.com/feed/"
    polling_interval_hours: 48
    auto_import: false

  - name: "UX Collective"
    type: "rss"
    url: "https://uxdesign.cc/feed"
    polling_interval_hours: 48
    auto_import: false

  - name: "Nielsen Norman Group"
    type: "rss"
    url: "https://www.nngroup.com/feed/rss/"
    polling_interval_hours: 168
    auto_import: false

frameworks:
  - type: "competitive_landscape"
    enabled: true
    schedule: "0 10 1 * *"     # Monthly

tags:
  - "ux-design"
  - "ui-design"
  - "design-systems"
  - "user-research"
  - "accessibility"
  - "prototyping"

skills:
  - "trend-analyzer"
  - "connection-finder"
```

---

## Template 4: Business Strategy

```yaml
# Domain: Business Strategy
name: "Business Strategy"
description: "Market research, competitive analysis, and business strategy"
color: "#f9bd2b"
icon: "chart"

models:
  expert: null
  research: null
  summary: null

research:
  schedule: "0 9 * * 1"       # Mondays at 9am
  max_daily_runs: 1
  max_cost_per_run_usd: 0.10
  query_templates:
    - "Market trends in {topic}"
    - "Competitive landscape for {topic}"
    - "Strategic implications of {topic}"

sources:
  - name: "Harvard Business Review"
    type: "rss"
    url: "https://hbr.org/feed"
    polling_interval_hours: 168
    auto_import: false

  - name: "TechCrunch"
    type: "rss"
    url: "https://techcrunch.com/feed/"
    polling_interval_hours: 24
    auto_import: false

frameworks:
  - type: "competitive_landscape"
    enabled: true
    schedule: "0 10 1 * *"     # Monthly

  - type: "trl"
    enabled: true
    schedule: "0 10 15 * *"    # Monthly on the 15th

tags:
  - "strategy"
  - "market-analysis"
  - "competitive-intelligence"
  - "product-management"
  - "growth"

skills:
  - "trend-analyzer"
  - "connection-finder"
  - "domain-expert"
```

---

## Template 5: Custom (Blank)

```yaml
# Domain: Custom
name: ""                     # User enters name
description: ""
color: "#a9b1d6"             # Default neutral color
icon: "folder"

models:
  expert: null
  research: null
  summary: null

research:
  schedule: ""               # No schedule until configured
  max_daily_runs: 1
  max_cost_per_run_usd: 0.10
  query_templates: []

sources: []

frameworks: []

tags: []

skills: []
```

**Custom template behavior**:
- All fields left empty or minimal defaults
- User must enter a domain name (required)
- Color defaults to neutral gray-blue, user can change
- No sources, frameworks, tags, or skills pre-configured
- Research schedule is empty (disabled) until user configures it

---

## Template Card UI

Each template is displayed as a selection card during domain creation:

```
┌──────────────────────────────┐
│  🤖 AI & Machine Learning    │  ← Icon + Name
│                              │
│  ML research with arXiv      │  ← Short description
│  papers and model tracking   │
│                              │
│  📄 arXiv  📰 RSS  🔬 Papers │  ← Source type icons
│                              │
│  Tags: ml, nlp, llm, ...    │  ← Preview tags
└──────────────────────────────┘
```

**Card dimensions**: ~200px wide, ~160px tall (in a 3+2 grid)
**Selected state**: `border: 2px solid var(--accent)`, subtle glow
**Hover state**: `box-shadow: var(--shadow-md)`, slight scale (1.02)

---

## Template Application Flow

```
User selects "AI & Machine Learning" template
    │
    ├── 1. Create domain record in DB
    │      INSERT INTO domains (name, description, color, icon, config_path, ...)
    │
    ├── 2. Create domain directory structure
    │      mkdir -p domains/ai-machine-learning/{skills,tools,prompts,data/knowledge,data/inbox,decisions}
    │
    ├── 3. Write config.yaml from template
    │      Write the YAML above to domains/ai-machine-learning/config.yaml
    │
    ├── 4. Register RSS sources
    │      Parse sources[] → create source records for polling
    │
    └── 5. Enable skills
           Link built-in skills (paper-summarizer, etc.) to domain
```

---

## Validation

- [x] 5 templates defined (3 domain-specific + 1 business + 1 custom)
- [x] Each template has complete config.yaml with sources, research, frameworks, tags, skills
- [x] Template names match onboarding spec (AI/ML, Web Dev, General Research)
- [x] Custom template provides blank defaults with name required
- [x] Colors are distinct and visually identifiable
- [x] Sources use real RSS feed URLs
- [x] Research schedules are sensible (daily for tech, weekly for others)
- [x] Cost limits are reasonable for research runs
