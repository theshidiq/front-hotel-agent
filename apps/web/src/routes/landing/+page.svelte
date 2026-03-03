<script lang="ts">
    import { onMount } from "svelte";

    let emailInput = $state("");
    let submitted = $state(false);
    let navScrolled = $state(false);

    onMount(() => {
        const handleScroll = () => {
            navScrolled = window.scrollY > 20;
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    });

    function handleWaitlist(e: Event) {
        e.preventDefault();
        if (emailInput.trim()) submitted = true;
    }
</script>

<svelte:head>
    <title>Sinara — Presence, by Design</title>
    <meta
        name="description"
        content="Sinara handles the operational weight so your team can focus on what only humans can do — making guests feel seen, welcome, and cared for."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<!-- NAVBAR -->
<nav class="navbar" class:scrolled={navScrolled}>
    <div class="nav-inner">
        <a href="/landing" class="logo">
            <svg
                class="logo-icon"
                width="26"
                height="26"
                viewBox="0 0 32 32"
                fill="none"
            >
                <circle cx="8" cy="8" r="2.5" fill="rgba(30,42,74,0.35)" />
                <circle cx="24" cy="6" r="2.5" fill="rgba(30,42,74,0.35)" />
                <circle cx="26" cy="22" r="2.5" fill="rgba(30,42,74,0.35)" />
                <circle cx="6" cy="26" r="2.5" fill="rgba(30,42,74,0.35)" />
                <circle cx="16" cy="16" r="3.5" fill="#C4963A" />
                <line
                    x1="8"
                    y1="8"
                    x2="16"
                    y2="16"
                    stroke="rgba(30,42,74,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="24"
                    y1="6"
                    x2="16"
                    y2="16"
                    stroke="rgba(30,42,74,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="26"
                    y1="22"
                    x2="16"
                    y2="16"
                    stroke="rgba(30,42,74,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="6"
                    y1="26"
                    x2="16"
                    y2="16"
                    stroke="rgba(30,42,74,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="8"
                    y1="8"
                    x2="24"
                    y2="6"
                    stroke="rgba(30,42,74,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="6"
                    y1="26"
                    x2="26"
                    y2="22"
                    stroke="rgba(30,42,74,0.08)"
                    stroke-width="1"
                />
            </svg>
            <span class="logo-text">sinara</span>
        </a>

        <div class="nav-links">
            <a href="#features">Features</a>
            <a href="#stella">Stella</a>
            <a href="#industries">Industries</a>
            <a href="#pricing">Pricing</a>
        </div>

        <div class="nav-actions">
            <a href="/login" class="nav-login">Log in</a>
            <a href="#contact" class="btn-navy">Book a Demo</a>
        </div>
    </div>
</nav>

<!-- HERO -->
<section class="hero">
    <div class="hero-glow"></div>
    <div class="hero-inner">
        <div class="hero-left">
            <p class="hero-eyebrow">
                sinar · nara &nbsp;·&nbsp; ray of light · human being
            </p>

            <h1 class="hero-headline">
                People in<br />the light.
            </h1>
            <p class="hero-sub-headline">Operations in the background.</p>

            <p class="hero-sub">
                A guest doesn't remember the system behind the desk. They
                remember the person who looked them in the eye. Sinara handles
                everything else — so your team can be fully present.
            </p>

            <div class="hero-ctas">
                <a href="#contact" class="btn-navy">Book a Demo</a>
                <a href="#features" class="btn-ghost-dark">See how it works</a>
            </div>

            <div class="hero-trust">
                <span class="trust-item">🏨 Hotel</span>
                <span class="trust-sep">·</span>
                <span class="trust-item">🍽 Restaurant</span>
                <span class="trust-sep">·</span>
                <span class="trust-item">🏮 Izakaya</span>
                <span class="trust-sep">·</span>
                <span class="trust-item">🏥 Clinic</span>
            </div>
        </div>

        <div class="hero-right">
            <!-- App mockup: the schedule that builds itself -->
            <div class="app-mockup">
                <div class="mockup-bar">
                    <div class="mockup-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <div class="mockup-url">
                        sinara · shift scheduler — October 2025
                    </div>
                </div>
                <div class="mockup-body">
                    <div class="shift-header">
                        <div class="shift-title">Period 10 · Week 3</div>
                        <div class="shift-badge">Auto-generated ✓</div>
                    </div>
                    <div class="shift-grid">
                        <div class="staff-col">
                            {#each [{ name: "Yui", role: "Server", color: "#FFF4E5" }, { name: "Kenji", role: "Cook", color: "#E5F0FF" }, { name: "Mia", role: "Service", color: "#F0E5FF" }, { name: "Ryo", role: "Kitchen", color: "#E5FFF0" }] as s}
                                <div class="staff-row">
                                    <div
                                        class="staff-avatar"
                                        style="background: {s.color}"
                                    >
                                        {s.name[0]}
                                    </div>
                                    <div class="staff-info">
                                        <span class="staff-name">{s.name}</span>
                                        <span class="staff-role">{s.role}</span>
                                    </div>
                                </div>
                            {/each}
                        </div>
                        <div class="days-col">
                            {#each [["M", "E", "M", "■", "E", "M", "■"], ["E", "M", "■", "M", "E", "■", "M"], ["■", "E", "M", "E", "■", "M", "E"], ["M", "■", "E", "M", "M", "E", "■"]] as row}
                                <div class="shift-row">
                                    {#each row as cell}
                                        <div
                                            class="shift-cell"
                                            class:morning={cell === "M"}
                                            class:evening={cell === "E"}
                                            class:off={cell === "■"}
                                        >
                                            {cell === "■" ? "" : cell}
                                        </div>
                                    {/each}
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Outcome cards — what the GM sees -->
                    <div class="outcome-bar">
                        <div class="outcome-card good">
                            <span class="oc-dot"></span>
                            All roles covered this week
                        </div>
                        <div class="outcome-card warn">
                            <span class="oc-dot warn"></span>
                            Kenji: rest day added Fri
                        </div>
                    </div>
                </div>
            </div>

            <!-- Human story card: the guest with the allergy -->
            <div class="story-card">
                <div class="story-icon">★</div>
                <div class="story-body">
                    <span class="story-label">stella</span>
                    Table 4 guest has a shellfish allergy — Mia has been notified.
                </div>
            </div>
        </div>
    </div>
</section>

<!-- PROBLEM STATEMENT — speaks to the GM -->
<section class="problem-section">
    <div class="section-inner problem-inner">
        <div class="problem-quote">
            "When your team is busy managing the schedule,<br />
            they are not managing the guest."
        </div>
        <p class="problem-sub">
            Every shift rebuilt in a spreadsheet. Every allergen question
            hesitated over. Every manager who arrived depleted because they were
            up until midnight fixing a rota. Sinara removes this weight —
            quietly, without announcement.
        </p>
    </div>
</section>

<!-- FEATURES -->
<section class="features" id="features">
    <div class="section-inner">
        <div class="section-label">How it works</div>
        <h2 class="section-heading">Two things, done with precision.</h2>

        <div class="feature-rows">
            <!-- Feature 1: Shift Intelligence -->
            <div class="feature-row">
                <div class="feature-content">
                    <div class="feature-num">01</div>
                    <h3 class="feature-title">Shift Intelligence</h3>
                    <p class="feature-desc">
                        Your schedule builds itself. Sinara reads your operation
                        — who is available, what roles need filling, what
                        regulations apply — and generates a schedule that works
                        for your staff and your business. Conflicts flagged
                        before they happen. Coverage gaps closed before they
                        open.
                    </p>
                    <p class="feature-outcome">
                        <span class="outcome-gold">Result:</span> Your manager arrives
                        ready to lead — not exhausted from last night's rota.
                    </p>
                </div>
                <div class="feature-visual">
                    <div class="mini-schedule-card">
                        <div class="msc-header">October · Period 10</div>
                        {#each [{ name: "Yui", shifts: ["M", "E", "■", "M", "E"] }, { name: "Kenji", shifts: ["■", "M", "E", "E", "M"] }, { name: "Mia", shifts: ["E", "■", "M", "M", "■"] }] as s}
                            <div class="msc-row">
                                <span class="msc-name">{s.name}</span>
                                {#each s.shifts as sh}
                                    <div
                                        class="msc-cell"
                                        class:m={sh === "M"}
                                        class:e={sh === "E"}
                                        class:off={sh === "■"}
                                    >
                                        {sh === "■" ? "" : sh}
                                    </div>
                                {/each}
                            </div>
                        {/each}
                        <div class="msc-badge">All roles covered ✓</div>
                    </div>
                </div>
            </div>

            <!-- Feature 2: Allergen Vision -->
            <div class="feature-row reversed">
                <div class="feature-content">
                    <div class="feature-num">02</div>
                    <h3 class="feature-title">Allergen Vision</h3>
                    <p class="feature-desc">
                        Computer vision and OCR read your menus — photographs,
                        PDFs, handwritten notes — and extract every ingredient
                        automatically. Allergen categories mapped with accuracy
                        that would take a human team hours to replicate.
                    </p>
                    <p class="feature-outcome">
                        <span class="outcome-gold">Result:</span> Your server answers
                        the allergy question with confidence. The guest feels safe.
                        The moment is not lost.
                    </p>
                </div>
                <div class="feature-visual">
                    <div class="allergen-card">
                        <div class="allergen-header">Menu scan complete</div>
                        <div class="allergen-items">
                            {#each ["Shellfish", "Gluten", "Dairy", "Sesame", "Tree nuts"] as a, i}
                                <div
                                    class="allergen-item"
                                    style="animation-delay: {i * 0.1}s"
                                >
                                    <span class="allergen-check">✓</span>
                                    {a}
                                </div>
                            {/each}
                        </div>
                        <div class="allergen-footer">
                            43 ingredients detected · Always current
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- STELLA -->
<section class="stella-section" id="stella">
    <div class="section-inner stella-inner">
        <div class="stella-phone">
            <div class="phone-frame">
                <div class="phone-notch"></div>
                <div class="phone-screen">
                    <div class="phone-header">
                        <span class="stella-star">★</span>
                        <span>stella</span>
                        <span class="online-dot"></span>
                    </div>
                    <div class="phone-chat">
                        <div class="msg msg-in">
                            Good morning. Period 10 is ready — shall I publish
                            and notify the team?
                        </div>
                        <div class="msg msg-out">Yes, go ahead.</div>
                        <div class="msg msg-in">
                            Done. All 12 staff notified. Room 302 has a late
                            check-out request.
                        </div>
                        <div class="msg msg-out">
                            Add 1 hour. Adjust Kenji's morning shift.
                        </div>
                        <div class="msg msg-in">
                            Updated. Kenji notified. Anything else?
                        </div>
                        <div class="msg msg-out">That's it. Thank you.</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="stella-content">
            <div class="section-label">Stella · AI</div>
            <h2 class="section-heading left">
                The star your team<br />navigates by.
            </h2>
            <p class="stella-desc">
                Stella is Sinara's AI companion — built to feel, above all else,
                human. She speaks in plain language, offers choices rather than
                blank fields, and always leads somewhere useful. For a senior
                staff member and for a manager encountering AI for the first
                time, the experience is the same: someone is there, and they are
                helpful.
            </p>
            <ul class="stella-list">
                <li>Natural language scheduling — no training required</li>
                <li>Real-time allergen alerts to your team</li>
                <li>Guest notes and preferences, always at hand</li>
                <li>Available in multiple languages</li>
            </ul>
        </div>
    </div>
</section>

<!-- INDUSTRIES -->
<section class="industries" id="industries">
    <div class="section-inner">
        <div class="section-label">Who we serve</div>
        <h2 class="section-heading">
            Built for every place<br />where presence is the product.
        </h2>

        <div class="industry-grid">
            {#each [{ icon: "🏨", name: "Hotel", desc: "Front desk, housekeeping, and restaurant — scheduling and allergen management across every department." }, { icon: "🍽", name: "Restaurant", desc: "Kitchen flow, service scheduling, and allergen compliance. Staff confident. Guests safe." }, { icon: "🏮", name: "Izakaya", desc: "Late-night operations, complex multi-role shifts, and rapid staff changes — all handled." }, { icon: "🏥", name: "Clinic", desc: "Patient-facing staff scheduling with compliance requirements built in from the start." }] as ind}
                <div class="industry-card">
                    <div class="ind-icon">{ind.icon}</div>
                    <div class="ind-name">{ind.name}</div>
                    <div class="ind-desc">{ind.desc}</div>
                </div>
            {/each}
        </div>
    </div>
</section>

<!-- PHILOSOPHY PULL QUOTE -->
<section class="philosophy-section">
    <div class="section-inner">
        <div class="constellation-line">
            <svg width="200" height="80" viewBox="0 0 200 80" fill="none">
                <circle cx="20" cy="40" r="4" fill="rgba(30,42,74,0.15)" />
                <circle cx="90" cy="15" r="4" fill="rgba(30,42,74,0.15)" />
                <circle cx="160" cy="55" r="4" fill="rgba(30,42,74,0.15)" />
                <circle cx="100" cy="50" r="5" fill="#C4963A" />
                <line
                    x1="20"
                    y1="40"
                    x2="90"
                    y2="15"
                    stroke="rgba(30,42,74,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="90"
                    y1="15"
                    x2="160"
                    y2="55"
                    stroke="rgba(30,42,74,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="90"
                    y1="15"
                    x2="100"
                    y2="50"
                    stroke="rgba(30,42,74,0.08)"
                    stroke-width="1"
                />
            </svg>
        </div>
        <blockquote class="philosophy-quote">
            "A constellation is not visible because of a single star. It is
            visible because every star is in the right position. Sinara puts
            every person in the right place — so it can be forgotten, and what
            remains is warmth, care, and the feeling of being seen."
        </blockquote>
        <p class="philosophy-attr">— Sinara Manifesto</p>
    </div>
</section>

<!-- CTA / WAITLIST -->
<section class="waitlist-section" id="contact">
    <div class="section-inner waitlist-inner">
        <h2 class="waitlist-heading">
            Ready to see it<br />
            <em>in your operation?</em>
        </h2>
        <p class="waitlist-sub">
            We'll walk you through Sinara with your own team and workflows in
            mind. No setup required.
        </p>

        {#if submitted}
            <div class="submitted-msg">
                <span class="check-gold">✓</span>
                Thank you. We'll be in touch within one business day.
            </div>
        {:else}
            <form class="waitlist-form" onsubmit={handleWaitlist}>
                <input
                    type="email"
                    class="waitlist-input"
                    placeholder="your@email.com"
                    bind:value={emailInput}
                    required
                />
                <button type="submit" class="btn-navy">Book a Demo</button>
            </form>
        {/if}

        <p class="waitlist-fine">
            No commitment · 30-day free trial available · Full setup support
            included
        </p>
    </div>
</section>

<!-- FOOTER -->
<footer class="footer">
    <div class="footer-inner">
        <a href="/landing" class="logo footer-logo">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <circle cx="8" cy="8" r="2" fill="rgba(30,42,74,0.15)" />
                <circle cx="24" cy="6" r="2" fill="rgba(30,42,74,0.15)" />
                <circle cx="26" cy="22" r="2" fill="rgba(30,42,74,0.15)" />
                <circle cx="6" cy="26" r="2" fill="rgba(30,42,74,0.15)" />
                <circle cx="16" cy="16" r="3" fill="#C4963A" />
                <line
                    x1="8"
                    y1="8"
                    x2="16"
                    y2="16"
                    stroke="rgba(30,42,74,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="24"
                    y1="6"
                    x2="16"
                    y2="16"
                    stroke="rgba(30,42,74,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="26"
                    y1="22"
                    x2="16"
                    y2="16"
                    stroke="rgba(30,42,74,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="6"
                    y1="26"
                    x2="16"
                    y2="16"
                    stroke="rgba(30,42,74,0.08)"
                    stroke-width="1"
                />
            </svg>
            <span class="logo-text">sinara</span>
        </a>
        <div class="footer-mid">
            <span class="footer-tag"
                >sinar · nara &nbsp;·&nbsp; presence, by design</span
            >
        </div>
        <div class="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#contact">Contact</a>
        </div>
    </div>
</footer>

<style>
    :global(body) {
        margin: 0;
        background: #faf9f5; /* Canvas cream white */
        color: #2d3a5d; /* Darker navy body text */
        font-family: "Instrument Sans", system-ui, sans-serif;
        font-size: 16px;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
    }

    /* ── TOKENS ── */
    /* bg-canvas:   #FCFCFB  (off-white, paper-like) */
    /* bg-surface:  #FFFFFF  (pure white cards) */
    /* text-head:   #1E2A4A  (deep brand navy) */
    /* text-body:   #4A5568  (slate gray-blue) */
    /* gold:        #C4963A */

    /* ── NAVBAR ── */
    .navbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        padding: 0 2rem;
        height: 68px;
        display: flex;
        align-items: center;
        transition:
            background 0.3s,
            border-bottom 0.3s;
    }
    .navbar.scrolled {
        background: rgba(252, 252, 251, 0.95);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(30, 42, 74, 0.06);
    }
    .nav-inner {
        max-width: 1100px;
        width: 100%;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 2rem;
    }
    .logo {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        flex-shrink: 0;
    }
    .logo-text {
        font-family: "Instrument Serif", serif;
        font-size: 1.45rem;
        color: #1e2a4a;
        letter-spacing: -0.02em;
    }
    .nav-links {
        display: flex;
        gap: 2rem;
        flex: 1;
        justify-content: center;
    }
    .nav-links a {
        color: #4a5568;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition: color 0.2s;
    }
    .nav-links a:hover {
        color: #1e2a4a;
    }
    .nav-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .nav-login {
        color: #4a5568;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition: color 0.2s;
    }
    .nav-login:hover {
        color: #1e2a4a;
    }

    /* ── BUTTONS ── */
    .btn-navy {
        background: #1e2a4a;
        color: #faf9f5;
        font-weight: 500;
        font-size: 0.9rem;
        padding: 0.65rem 1.4rem;
        border-radius: 6px;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition:
            transform 0.15s,
            box-shadow 0.2s;
        display: inline-block;
        font-family: inherit;
        box-shadow: 0 4px 12px rgba(30, 42, 74, 0.15);
    }
    .btn-navy:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(30, 42, 74, 0.2);
    }
    .btn-ghost-dark {
        color: #4a5568;
        border: 1px solid rgba(30, 42, 74, 0.15);
        padding: 0.65rem 1.4rem;
        border-radius: 6px;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition:
            border-color 0.2s,
            color 0.2s;
    }
    .btn-ghost-dark:hover {
        border-color: rgba(30, 42, 74, 0.4);
        color: #1e2a4a;
    }

    /* ── HERO ── */
    .hero {
        min-height: 100vh;
        display: flex;
        align-items: center;
        padding: 110px 2rem 70px;
        position: relative;
        overflow: hidden;
        background: #faf9f5;
    }
    .hero-glow {
        position: absolute;
        top: -10%;
        right: -5%;
        width: 700px;
        height: 700px;
        background: radial-gradient(
            circle,
            rgba(196, 150, 58, 0.06) 0%,
            transparent 60%
        );
        pointer-events: none;
    }
    .hero-inner {
        max-width: 1100px;
        margin: 0 auto;
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1.05fr;
        gap: 4rem;
        align-items: center;
    }

    .hero-eyebrow {
        font-size: 0.78rem;
        letter-spacing: 0.06em;
        color: #c4963a;
        margin: 0 0 1.25rem;
        text-transform: lowercase;
        font-style: italic;
    }
    .hero-headline {
        font-family: "Instrument Serif", serif;
        font-size: clamp(2.8rem, 5.5vw, 4.2rem);
        line-height: 1.05;
        letter-spacing: -0.02em;
        color: #1e2a4a;
        margin: 0 0 0.25rem;
    }
    .hero-sub-headline {
        font-family: "Instrument Serif", serif;
        font-size: clamp(1.3rem, 2.5vw, 1.7rem);
        font-style: italic;
        color: #4a5568;
        margin: 0 0 1.5rem;
        letter-spacing: -0.01em;
    }
    .hero-sub {
        color: #4a5568;
        font-size: 1.05rem;
        line-height: 1.75;
        max-width: 440px;
        margin: 0 0 2.25rem;
    }
    .hero-ctas {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 2rem;
    }
    .hero-trust {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: #718096;
        flex-wrap: wrap;
    }
    .trust-sep {
        color: rgba(30, 42, 74, 0.2);
    }

    /* ── HERO APP MOCKUP (Light Mode) ── */
    .hero-right {
        position: relative;
    }
    .app-mockup {
        background: #ffffff;
        border: 1px solid rgba(30, 42, 74, 0.08);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(30, 42, 74, 0.08);
    }
    .mockup-bar {
        background: #f8f9fa;
        border-bottom: 1px solid rgba(30, 42, 74, 0.06);
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .mockup-dots {
        display: flex;
        gap: 5px;
    }
    .mockup-dots span {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(30, 42, 74, 0.15);
    }
    .mockup-url {
        font-size: 0.7rem;
        color: #718096;
        flex: 1;
    }
    .mockup-body {
        padding: 16px;
    }
    .shift-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
    }
    .shift-title {
        font-size: 0.82rem;
        color: #1e2a4a;
        font-weight: 600;
    }
    .shift-badge {
        font-size: 0.68rem;
        color: #047857;
        background: #d1fae5;
        border: 1px solid #a7f3d0;
        padding: 2px 8px;
        border-radius: 100px;
    }
    .shift-grid {
        display: flex;
        gap: 8px;
    }
    .staff-col {
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 120px;
    }
    .staff-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid rgba(30, 42, 74, 0.03);
    }
    .staff-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.68rem;
        font-weight: 600;
        color: #1e2a4a;
        flex-shrink: 0;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
    }
    .staff-info {
        display: flex;
        flex-direction: column;
    }
    .staff-name {
        font-size: 0.72rem;
        color: #1e2a4a;
        font-weight: 600;
    }
    .staff-role {
        font-size: 0.62rem;
        color: #718096;
    }
    .days-col {
        display: flex;
        flex-direction: column;
        gap: 5px;
        flex: 1;
    }
    .shift-row {
        display: flex;
        gap: 3px;
    }
    .shift-cell {
        flex: 1;
        height: 36px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.62rem;
        font-weight: 600;
        background: #f8f9fa;
        border: 1px solid rgba(30, 42, 74, 0.03);
        color: #a0aec0;
    }
    .shift-cell.morning {
        background: #ebf8ff;
        color: #3182ce;
        border-color: #bee3f8;
    }
    .shift-cell.evening {
        background: #fff5f5;
        color: #e53e3e;
        border-color: #fed7d7;
    }
    .shift-cell.off {
        background: #f8f9fa;
    }

    .outcome-bar {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
    }
    .outcome-card {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        color: #4a5568;
        font-weight: 500;
        background: #f8f9fa;
        border: 1px solid rgba(30, 42, 74, 0.06);
        padding: 5px 10px;
        border-radius: 6px;
    }
    .oc-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
        flex-shrink: 0;
    }
    .oc-dot.warn {
        background: #f59e0b;
    }

    /* Stella notification card (Light Theme) */
    .story-card {
        position: absolute;
        bottom: -16px;
        left: -20px;
        background: #ffffff;
        border: 1px solid rgba(196, 150, 58, 0.3);
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        max-width: 260px;
        box-shadow: 0 12px 32px rgba(30, 42, 74, 0.08);
        animation: slideUp 0.5s ease 0.4s both;
    }
    .story-icon {
        color: #c4963a;
        font-size: 1rem;
        margin-top: 1px;
    }
    .story-body {
        font-size: 0.78rem;
        color: #4a5568;
        line-height: 1.5;
        font-weight: 500;
    }
    .story-label {
        display: block;
        font-size: 0.65rem;
        color: #c4963a;
        font-weight: 700;
        margin-bottom: 3px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    /* ── PROBLEM STATEMENT ── */
    .problem-section {
        padding: 80px 2rem;
        background: #ffffff;
        border-top: 1px solid rgba(30, 42, 74, 0.05);
        border-bottom: 1px solid rgba(30, 42, 74, 0.05);
    }
    .problem-inner {
        max-width: 800px;
        text-align: center;
    }
    .problem-quote {
        font-family: "Instrument Serif", serif;
        font-size: clamp(1.3rem, 3vw, 2rem);
        font-style: italic;
        color: #1e2a4a;
        line-height: 1.5;
        margin: 0 0 1.5rem;
    }
    .problem-sub {
        font-size: 1rem;
        color: #4a5568;
        line-height: 1.8;
        margin: 0;
    }

    /* ── FEATURES ── */
    .features {
        padding: 100px 2rem;
        background: #faf9f5;
    }
    .section-label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #c4963a;
        margin-bottom: 0.75rem;
        font-weight: 600;
    }
    .section-heading {
        font-family: "Instrument Serif", serif;
        font-size: clamp(1.9rem, 4vw, 2.9rem);
        line-height: 1.15;
        letter-spacing: -0.02em;
        color: #1e2a4a;
        margin: 0 0 3.5rem;
    }
    .section-heading.left {
        text-align: left;
        margin-bottom: 1.25rem;
    }

    .feature-rows {
        display: flex;
        flex-direction: column;
        gap: 5rem;
    }
    .feature-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
        align-items: center;
    }
    .feature-row.reversed {
        direction: rtl;
    }
    .feature-row.reversed > * {
        direction: ltr;
    }

    .feature-num {
        font-family: "Instrument Serif", serif;
        font-size: 1rem;
        color: #c4963a;
        margin-bottom: 0.5rem;
        letter-spacing: 0.08em;
    }
    .feature-title {
        font-family: "Instrument Serif", serif;
        font-size: 1.8rem;
        color: #1e2a4a;
        margin: 0 0 1rem;
        letter-spacing: -0.01em;
    }
    .feature-desc {
        font-size: 1rem;
        color: #4a5568;
        line-height: 1.75;
        margin: 0 0 1.25rem;
    }
    .feature-outcome {
        font-size: 0.9rem;
        color: #4a5568;
        font-weight: 500;
        line-height: 1.6;
        margin: 0;
        border-left: 2px solid rgba(196, 150, 58, 0.4);
        padding-left: 1rem;
    }
    .outcome-gold {
        color: #8b6a28;
        font-weight: 700;
    }

    /* Feature Cards (Light) */
    .mini-schedule-card,
    .allergen-card {
        background: #ffffff;
        border: 1px solid rgba(30, 42, 74, 0.06);
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 8px 30px rgba(30, 42, 74, 0.04);
    }
    .msc-header,
    .allergen-header {
        font-size: 0.75rem;
        color: #718096;
        font-weight: 600;
        margin-bottom: 1rem;
    }
    .msc-name {
        color: #4a5568;
        font-weight: 500;
    }
    .msc-cell {
        background: #f8f9fa;
        border: 1px solid rgba(30, 42, 74, 0.03);
        color: #a0aec0;
    }
    .msc-cell.m {
        background: #ebf8ff;
        color: #3182ce;
        border-color: #bee3f8;
    }
    .msc-cell.e {
        background: #fff5f5;
        color: #e53e3e;
        border-color: #fed7d7;
    }
    .msc-badge {
        color: #047857;
        font-weight: 500;
    }

    .allergen-item {
        color: #4a5568;
        font-weight: 500;
        background: #f8f9fa;
        border: 1px solid rgba(30, 42, 74, 0.03);
    }
    .allergen-check {
        color: #10b981;
    }
    .allergen-footer {
        color: #a0aec0;
        font-weight: 500;
    }

    /* ── STELLA ── */
    .stella-section {
        padding: 100px 2rem;
        background: #ffffff;
        border-top: 1px solid rgba(30, 42, 74, 0.05);
    }
    .phone-frame {
        background: #f8f9fa;
        border: 1px solid rgba(30, 42, 74, 0.1);
        box-shadow: 0 24px 60px rgba(30, 42, 74, 0.08);
    }
    .phone-notch {
        background: rgba(30, 42, 74, 0.08);
    }
    .phone-screen {
        background: #ffffff;
        border: 1px solid rgba(30, 42, 74, 0.05);
    }
    .phone-header {
        color: #1e2a4a;
    }
    .msg-in {
        background: #f1f3f5;
        color: #4a5568;
        font-weight: 500;
    }
    .msg-out {
        background: #1e2a4a;
        color: #ffffff;
        font-weight: 500;
    }
    .stella-desc {
        color: #4a5568;
    }
    .stella-list li {
        color: #4a5568;
        font-weight: 500;
        border-bottom-color: rgba(30, 42, 74, 0.05);
    }

    /* ── INDUSTRIES ── */
    .industries {
        padding: 100px 2rem;
        background: #faf9f5;
        border-top: 1px solid rgba(30, 42, 74, 0.05);
    }
    .industry-card {
        background: #ffffff;
        border: 1px solid rgba(30, 42, 74, 0.06);
        border-top: 3px solid rgba(196, 150, 58, 0.35);
        box-shadow: 0 8px 24px rgba(30, 42, 74, 0.03);
    }
    .ind-name {
        color: #1e2a4a;
    }
    .ind-desc {
        color: #4a5568;
        font-weight: 400;
    }

    /* ── PHILOSOPHY ── */
    .philosophy-section {
        background: #ffffff;
        border-top: 1px solid rgba(30, 42, 74, 0.05);
    }
    .philosophy-quote {
        color: #1e2a4a;
    }
    .philosophy-attr {
        color: #718096;
        font-weight: 500;
    }

    /* ── WAITLIST ── */
    .waitlist-section {
        background: #1e2a4a; /* Keep footer/CTA area dark for contrast */
    }
    .waitlist-heading {
        color: #faf9f5;
    }
    .waitlist-sub {
        color: rgba(252, 252, 251, 0.7);
    }
    .waitlist-fine {
        color: rgba(252, 252, 251, 0.4);
    }

    .waitlist-form .btn-navy {
        background: #c4963a;
        color: #1e2a4a; /* Invert button inside the dark section */
        box-shadow: none;
    }
    .waitlist-form .btn-navy:hover {
        background: #d8aa49;
    }

    /* ── FOOTER ── */
    .footer {
        background: #162038;
        border-top-color: rgba(252, 252, 251, 0.05);
    }
    .footer-logo svg line,
    .footer-logo svg circle {
        stroke: rgba(252, 252, 251, 0.2) !important;
        fill: rgba(252, 252, 251, 0.2) !important;
    }
    .footer-logo svg circle:last-of-type {
        fill: #c4963a !important;
    }
    .logo-text {
        color: #faf9f5;
    }
    .navbar .logo-text {
        color: #1e2a4a;
    } /* Navbar logo must be dark */

    .footer-tag {
        color: rgba(252, 252, 251, 0.4);
    }
    .footer-links a {
        color: rgba(252, 252, 251, 0.5);
    }
    .footer-links a:hover {
        color: #faf9f5;
    }
</style>
