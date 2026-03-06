<script lang="ts">
    import { onMount } from "svelte";
    import { cubicOut } from "svelte/easing";
    import ConstellationCanvas from "$lib/components/ConstellationCanvas.svelte";
    import { signInWithGoogle } from "$lib/auth.svelte";

    function startSetup() {
        signInWithGoogle(window.location.origin + "/setup");
    }

    let emailInput = $state("");
    let submitted = $state(false);
    let navScrolled = $state(false);

    // Scroll-driven story state
    const PANELS = ["hero", "shift", "allergen", "stella"] as const;
    const PANEL_COUNT = PANELS.length;
    let currentPanel = $state(0);
    let activeSection = $derived(PANELS[currentPanel]);

    let wrapperEl: HTMLElement;
    let trackEl: HTMLElement;

    // ── Gesture-silence debounce ──
    // A "gesture" is a continuous stream of wheel events (trackpad swipe / mouse
    // wheel tick). Only the FIRST event advances a panel. ALL subsequent events
    // within the gesture are silently eaten. After 400ms of wheel silence, the
    // gesture resets and the next event can advance again.
    let gestureActive = false;
    let gestureTimer: ReturnType<typeof setTimeout> | null = null;

    // Custom slide-up transition for right-side visuals
    function slideUp(
        node: HTMLElement,
        { duration = 400, delay = 0 }: { duration?: number; delay?: number },
    ) {
        return {
            duration,
            delay,
            easing: cubicOut,
            css: (t: number) =>
                `opacity: ${t}; transform: translateY(${(1 - t) * 28}px);`,
        };
    }

    /** Move to a specific panel index */
    function goToPanel(index: number) {
        const target = Math.max(0, Math.min(PANEL_COUNT - 1, index));
        currentPanel = target;

        if (trackEl) {
            const offset = -target * window.innerHeight;
            trackEl.style.setProperty("--track-offset", `${offset}px`);
        }

        if (wrapperEl) {
            const sectionTop =
                wrapperEl.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
                top: sectionTop + target * window.innerHeight,
                behavior: "instant",
            });
        }
    }

    function handleWheel(e: WheelEvent) {
        if (!wrapperEl) return;

        const rect = wrapperEl.getBoundingClientRect();
        const inSection =
            rect.top <= 5 && rect.bottom >= window.innerHeight - 5;
        if (!inSection) return;

        // Reset gesture timer on every wheel event
        if (gestureTimer) clearTimeout(gestureTimer);
        gestureTimer = setTimeout(() => {
            gestureActive = false;
        }, 200);

        // If gesture already active, just eat the event (no panel change)
        if (gestureActive) {
            e.preventDefault();
            return;
        }

        // This is the FIRST event of a new gesture — determine direction
        const dir = e.deltaY > 0 ? 1 : -1;
        const next = currentPanel + dir;

        // At boundary → let page scroll normally (don't mark gesture active)
        if (next < 0 || next >= PANEL_COUNT) return;

        // Advance one panel and lock the gesture
        e.preventDefault();
        gestureActive = true;
        goToPanel(next);
    }

    onMount(() => {
        const handleScroll = () => {
            navScrolled = window.scrollY > 20;
            // Don't fight with goToPanel during a gesture
            if (!wrapperEl || gestureActive) return;

            const rect = wrapperEl.getBoundingClientRect();
            const scrollableHeight =
                wrapperEl.offsetHeight - window.innerHeight;
            const scrolled = Math.max(0, -rect.top);
            const progress = Math.min(1, scrolled / scrollableHeight);
            const panel = Math.min(
                PANEL_COUNT - 1,
                Math.round(progress * (PANEL_COUNT - 1)),
            );

            if (panel !== currentPanel) currentPanel = panel;

            if (trackEl) {
                const offset = -panel * window.innerHeight;
                trackEl.style.setProperty("--track-offset", `${offset}px`);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("wheel", handleWheel, { passive: false });
        handleScroll();

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("wheel", handleWheel);
        };
    });

    function handleWaitlist(e: Event) {
        e.preventDefault();
        if (emailInput.trim()) submitted = true;
    }
</script>

<svelte:head>
    <title>Sinara — presence, by design</title>
    <meta
        name="description"
        content="Sinara handles the operational weight so your team can focus on what only humans can do — making guests feel seen, welcome, and cared for."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link
        href="https://fonts.googleapis.com/css2?family=Gloock:ital@0;1&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<!-- NOISE OVERLAY (Tactile Premium Feel) -->
<div class="noise-overlay"></div>

<!-- FIXED CONSTELLATION BACKGROUND -->
<div class="constellation-bg">
    <div class="hero-glow"></div>
    <ConstellationCanvas />
    <div class="constellation-gradient"></div>
</div>

<!-- NAVBAR -->
<nav class="navbar" class:scrolled={navScrolled}>
    <div class="nav-inner">
        <a href="/" class="logo">
            <svg
                class="logo-icon"
                width="26"
                height="26"
                viewBox="0 0 32 32"
                fill="none"
            >
                <circle cx="8" cy="8" r="2.5" fill="rgba(26,39,68,0.35)" />
                <circle cx="24" cy="6" r="2.5" fill="rgba(26,39,68,0.35)" />
                <circle cx="26" cy="22" r="2.5" fill="rgba(26,39,68,0.35)" />
                <circle cx="6" cy="26" r="2.5" fill="rgba(26,39,68,0.35)" />
                <circle cx="16" cy="16" r="3.5" fill="#B8956A" />
                <line
                    x1="8"
                    y1="8"
                    x2="16"
                    y2="16"
                    stroke="rgba(26,39,68,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="24"
                    y1="6"
                    x2="16"
                    y2="16"
                    stroke="rgba(26,39,68,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="26"
                    y1="22"
                    x2="16"
                    y2="16"
                    stroke="rgba(26,39,68,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="6"
                    y1="26"
                    x2="16"
                    y2="16"
                    stroke="rgba(26,39,68,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="8"
                    y1="8"
                    x2="24"
                    y2="6"
                    stroke="rgba(26,39,68,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="6"
                    y1="26"
                    x2="26"
                    y2="22"
                    stroke="rgba(26,39,68,0.08)"
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
            <button onclick={startSetup} class="btn-secondary nav-start">Get started free</button>
            <a href="#contact" class="btn-primary">Book a Demo</a>
        </div>
    </div>
</nav>

<!-- ═══════════════════════════════════════════════════════════
     SCROLLYTELLING SECTION
     Tall outer wrapper (4×100vh) with sticky inner shell.
     Left track slides up as user scrolls — one panel per 100vh.
     Right column is sticky and swaps visuals by panel index.
     ═══════════════════════════════════════════════════════════ -->
<section class="story-wrapper" bind:this={wrapperEl} id="hero">
    <!-- Sticky shell clips to 100vh -->
    <div class="story-shell">
        <div class="story-grid">
            <!-- ─── LEFT TRACK (slides up as you scroll) ─── -->
            <div class="story-track" bind:this={trackEl}>
                <!-- Slide 0 · HERO -->
                <div class="story-slide" id="features">
                    <p class="hero-eyebrow">
                        sinar · nara &nbsp;·&nbsp; ray of light · human being
                    </p>
                    <h1 class="hero-headline">
                        People in<br />the light.
                    </h1>
                    <p class="hero-sub-headline">
                        Operations in the background.
                    </p>
                    <p class="hero-sub">
                        A guest doesn't remember the system behind the desk.
                        They remember the person who looked them in the eye.
                        Sinara handles everything else — so your team can be
                        fully present.
                    </p>
                    <div class="hero-ctas">
                        <button onclick={startSetup} class="btn-primary">Get started free</button>
                        <a href="#contact" class="btn-secondary">Book a Demo</a>
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
                    <!-- Scroll cue -->
                    <div class="scroll-cue">
                        <span class="cue-label">scroll</span>
                        <div class="cue-arrow">↓</div>
                    </div>
                </div>

                <!-- Slide 1 · SHIFT INTELLIGENCE -->
                <div class="story-slide">
                    <div class="section-label">How it works · 01</div>
                    <h2 class="section-heading left">Shift Intelligence.</h2>
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
                    <div class="slide-progress">
                        {#each PANELS as _, i}
                            <div
                                class="progress-dot"
                                class:active={i === currentPanel}
                            ></div>
                        {/each}
                    </div>
                </div>

                <!-- Slide 2 · ALLERGEN VISION -->
                <div class="story-slide">
                    <div class="section-label">How it works · 02</div>
                    <h2 class="section-heading left">Allergen Vision.</h2>
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
                    <div class="slide-progress">
                        {#each PANELS as _, i}
                            <div
                                class="progress-dot"
                                class:active={i === currentPanel}
                            ></div>
                        {/each}
                    </div>
                </div>

                <!-- Slide 3 · STELLA -->
                <div class="story-slide" id="stella">
                    <div class="section-label">Stella · AI</div>
                    <h2 class="section-heading left">
                        The star your team<br />navigates by.
                    </h2>
                    <p class="stella-desc">
                        Stella is Sinara's AI companion — built to feel, above
                        all else, human. She speaks in plain language, offers
                        choices rather than blank fields, and always leads
                        somewhere useful.
                    </p>
                    <ul class="stella-list">
                        <li>
                            Natural language scheduling — no training required
                        </li>
                        <li>Real-time allergen alerts to your team</li>
                        <li>Guest notes and preferences, always at hand</li>
                        <li>Available in multiple languages</li>
                    </ul>
                    <div class="slide-progress">
                        {#each PANELS as _, i}
                            <div
                                class="progress-dot"
                                class:active={i === currentPanel}
                            ></div>
                        {/each}
                    </div>
                </div>
            </div>
            <!-- end story-track -->

            <!-- ─── RIGHT COLUMN (Sticky Visuals) ─── -->
            <div class="story-visuals">
                {#key currentPanel}
                    <div
                        class="visual-panel"
                        class:stella-visual={currentPanel === 3}
                        in:slideUp={{ duration: 380, delay: 60 }}
                    >
                        {#if currentPanel === 0}
                            <!-- Hero App Mockup -->
                            <div class="app-mockup">
                                <div class="mockup-bar">
                                    <div class="mockup-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                    <div class="mockup-url">
                                        sinara · shift scheduler
                                    </div>
                                </div>
                                <div class="mockup-body">
                                    <div class="shift-header">
                                        <div class="shift-title">
                                            Period 10 · Week 3
                                        </div>
                                        <div class="shift-badge">
                                            Auto-generated ✓
                                        </div>
                                    </div>
                                    <div class="shift-grid">
                                        <div class="staff-col">
                                            {#each [{ name: "Yui", role: "Server", color: "#F5EDE3" }, { name: "Kenji", role: "Cook", color: "#EEF2FF" }, { name: "Mia", role: "Service", color: "#FDF4FF" }, { name: "Ryo", role: "Kitchen", color: "#F0FDF4" }] as s}
                                                <div class="staff-row">
                                                    <div
                                                        class="staff-avatar"
                                                        style="background: {s.color}"
                                                    >
                                                        {s.name[0]}
                                                    </div>
                                                    <div class="staff-info">
                                                        <span class="staff-name"
                                                            >{s.name}</span
                                                        >
                                                        <span class="staff-role"
                                                            >{s.role}</span
                                                        >
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
                                                            class:morning={cell ===
                                                                "M"}
                                                            class:evening={cell ===
                                                                "E"}
                                                            class:off={cell ===
                                                                "■"}
                                                        >
                                                            {cell === "■"
                                                                ? ""
                                                                : cell}
                                                        </div>
                                                    {/each}
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                    <div class="outcome-bar">
                                        <div class="outcome-card good">
                                            <span class="oc-dot"></span>All
                                            roles covered this week
                                        </div>
                                        <div class="outcome-card warn">
                                            <span class="oc-dot warn"
                                            ></span>Kenji: rest day added Fri
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="story-card">
                                <div class="story-icon">★</div>
                                <div class="story-body">
                                    <span class="story-label">stella</span>
                                    Table 4 guest has a shellfish allergy — Mia has
                                    been notified.
                                </div>
                            </div>
                        {:else if currentPanel === 1}
                            <div class="mini-app-card">
                                <div class="msc-header">
                                    October · Period 10
                                </div>
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
                        {:else if currentPanel === 2}
                            <div class="mini-app-card">
                                <div class="allergen-header">
                                    Menu scan complete
                                </div>
                                <div class="allergen-items">
                                    {#each ["Shellfish", "Gluten", "Dairy", "Sesame", "Tree nuts"] as a, i}
                                        <div
                                            class="allergen-item"
                                            style="animation-delay: {i * 0.1}s"
                                        >
                                            <span class="allergen-check">✓</span
                                            >{a}
                                        </div>
                                    {/each}
                                </div>
                                <div class="allergen-footer">
                                    43 ingredients detected · Always current
                                </div>
                            </div>
                        {:else if currentPanel === 3}
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
                                            Good morning. Period 10 is ready —
                                            shall I publish and notify the team?
                                        </div>
                                        <div class="msg msg-out">
                                            Yes, go ahead.
                                        </div>
                                        <div class="msg msg-in">
                                            Done. All 12 staff notified. Room
                                            302 has a late check-out request.
                                        </div>
                                        <div class="msg msg-out">
                                            Add 1 hour. Adjust Kenji's morning
                                            shift.
                                        </div>
                                        <div class="msg msg-in">
                                            Updated. Kenji notified. Anything
                                            else?
                                        </div>
                                        <div class="msg msg-out">
                                            That's it. Thank you.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/key}
            </div>
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
                <circle cx="20" cy="40" r="4" fill="rgba(26,39,68,0.15)" />
                <circle cx="90" cy="15" r="4" fill="rgba(26,39,68,0.15)" />
                <circle cx="160" cy="55" r="4" fill="rgba(26,39,68,0.15)" />
                <circle cx="100" cy="50" r="5" fill="#B8956A" />
                <line
                    x1="20"
                    y1="40"
                    x2="90"
                    y2="15"
                    stroke="rgba(26,39,68,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="90"
                    y1="15"
                    x2="160"
                    y2="55"
                    stroke="rgba(26,39,68,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="90"
                    y1="15"
                    x2="100"
                    y2="50"
                    stroke="rgba(26,39,68,0.08)"
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
                <button type="submit" class="btn-accent">Book a Demo</button>
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
        <a href="/" class="logo footer-logo">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <circle cx="8" cy="8" r="2" fill="rgba(245,241,236,0.15)" />
                <circle cx="24" cy="6" r="2" fill="rgba(245,241,236,0.15)" />
                <circle cx="26" cy="22" r="2" fill="rgba(245,241,236,0.15)" />
                <circle cx="6" cy="26" r="2" fill="rgba(245,241,236,0.15)" />
                <circle cx="16" cy="16" r="3" fill="#B8956A" />
                <line
                    x1="8"
                    y1="8"
                    x2="16"
                    y2="16"
                    stroke="rgba(245,241,236,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="24"
                    y1="6"
                    x2="16"
                    y2="16"
                    stroke="rgba(245,241,236,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="26"
                    y1="22"
                    x2="16"
                    y2="16"
                    stroke="rgba(245,241,236,0.08)"
                    stroke-width="1"
                />
                <line
                    x1="6"
                    y1="26"
                    x2="16"
                    y2="16"
                    stroke="rgba(245,241,236,0.08)"
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
        background: #f5f1ec;
        color: #1a2744;
        font-family: "Instrument Sans", system-ui, sans-serif;
        font-size: 16px;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
    }

    /* ── BACKGROUND TEXTURES ── */
    .noise-overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        pointer-events: none;
        opacity: 0.08;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    /* ── FIXED CONSTELLATION BACKGROUND ── */
    .constellation-bg {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        background: #f5f1ec;
        background-image: radial-gradient(
            circle at 85% 90%,
            rgba(184, 149, 106, 0.12) 0%,
            transparent 60%
        );
    }
    .constellation-gradient {
        position: absolute;
        inset: 0;
        z-index: 1;
        background: linear-gradient(
            105deg,
            #f5f1ec 28%,
            rgba(245, 241, 236, 0.88) 45%,
            rgba(245, 241, 236, 0.3) 62%,
            transparent 75%
        );
    }
    .hero-glow {
        position: absolute;
        top: -20%;
        left: -10%;
        width: 120vw;
        height: 120vh;
        background: radial-gradient(
            circle at 30% 20%,
            rgba(184, 149, 106, 0.18) 0%,
            transparent 70%
        );
        pointer-events: none;
    }

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
        background: rgba(245, 241, 236, 0.95);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid #c8c0b4;
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
        font-family: "Gloock", serif;
        font-size: 1.45rem;
        color: #1a2744;
        letter-spacing: -0.02em;
    }
    .nav-links {
        display: flex;
        gap: 2rem;
        flex: 1;
        justify-content: center;
    }
    .nav-links a {
        color: #1a2744;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: color 0.2s;
    }
    .nav-links a:hover {
        color: #b8956a;
    }
    .nav-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .nav-login {
        color: #1a2744;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: color 0.2s;
    }
    .nav-login:hover {
        color: #b8956a;
    }

    /* ── BUTTONS ── */
    .btn-primary {
        background: #1a2744;
        color: #ffffff;
        font-family: "Instrument Sans", sans-serif;
        font-weight: 600;
        font-size: 14px;
        padding: 10px 20px;
        border-radius: 6px;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
    }
    .btn-primary:hover {
        background: #243561;
    }
    .btn-accent {
        background: #b8956a;
        color: #ffffff;
        font-family: "Instrument Sans", sans-serif;
        font-weight: 600;
        font-size: 14px;
        padding: 10px 20px;
        border-radius: 6px;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
    }
    .btn-accent:hover {
        background: #a07d55;
    }
    .btn-secondary {
        background: transparent;
        color: #1a2744;
        border: 1px solid #c8c0b4;
        font-family: "Instrument Sans", sans-serif;
        font-weight: 500;
        font-size: 14px;
        padding: 10px 20px;
        border-radius: 6px;
        text-decoration: none;
        cursor: pointer;
        transition:
            background 0.2s,
            border-color 0.2s;
    }
    .btn-secondary:hover {
        background: rgba(200, 192, 180, 0.15);
        border-color: #b8956a;
    }

    /* ═══════════════════════════════════════════
       SCROLLYTELLING — STICKY SCROLL DRIVER
       ═══════════════════════════════════════════ */

    /* Outer wrapper: tall enough to scroll through N panels */
    .story-wrapper {
        position: relative;
        z-index: 10;
        /* 4 panels × 100vh — the extra height gives us scroll travel */
        height: calc(4 * 100vh);
    }

    /* Sticky shell: stays pinned at top, clips the sliding track */
    .story-shell {
        position: sticky;
        top: 0;
        height: 100vh;
        overflow: hidden;
        padding: 0 2rem;
        display: flex;
        align-items: stretch;
    }

    /* Two-column grid inside the shell */
    .story-grid {
        max-width: 1100px;
        width: 100%;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr 1.1fr;
        gap: 4rem;
        align-items: start;
    }

    /* Left track: 4 slides stacked, controlled by JS translateY */
    .story-track {
        display: flex;
        flex-direction: column;
        /* Height = 4 slides, each 100vh */
        height: calc(4 * 100vh);
        /* JS will set --track-offset via style attribute */
        transform: translateY(var(--track-offset, 0px));
        transition: transform 0.55s cubic-bezier(0.77, 0, 0.175, 1);
        will-change: transform;
    }

    /* Each slide fills exactly 100vh */
    .story-slide {
        height: 100vh;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-top: 68px; /* navbar clearance */
        padding-bottom: 2rem;
    }

    /* Right visuals: sticky within the already-sticky shell, always 100vh */
    .story-visuals {
        position: sticky;
        top: 0;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding-top: 68px;
    }

    .visual-panel {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .visual-panel.stella-visual {
        align-items: center;
        justify-content: center;
    }

    /* Scroll-cue on hero panel */
    .scroll-cue {
        margin-top: 2.5rem;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0.45;
        animation: cue-pulse 2.4s ease-in-out infinite;
    }
    .cue-label {
        font-family: "IBM Plex Mono", monospace;
        font-size: 11px;
        letter-spacing: 0.12em;
        color: #1a2744;
        text-transform: uppercase;
    }
    .cue-arrow {
        font-size: 14px;
        color: #b8956a;
        animation: cue-bounce 1.2s ease-in-out infinite;
    }
    @keyframes cue-pulse {
        0%,
        100% {
            opacity: 0.35;
        }
        50% {
            opacity: 0.7;
        }
    }
    @keyframes cue-bounce {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(4px);
        }
    }

    /* Panel progress dots */
    .slide-progress {
        display: flex;
        gap: 6px;
        margin-top: 2rem;
    }
    .progress-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #c8c0b4;
        transition:
            background 0.3s,
            transform 0.3s;
    }
    .progress-dot.active {
        background: #b8956a;
        transform: scale(1.4);
    }

    /* ── HERO TEXT ── */
    .hero-eyebrow {
        font-family: "Instrument Sans", sans-serif;
        font-size: 11px;
        letter-spacing: 0.1em;
        color: #b8956a;
        margin: 0 0 1.25rem;
        text-transform: uppercase;
        font-weight: 600;
    }
    .hero-headline {
        font-family: "Gloock", serif;
        font-size: clamp(52px, 5vw, 72px);
        line-height: 1.05;
        letter-spacing: -0.02em;
        color: #1a2744;
        margin: 0 0 0.25rem;
        font-weight: 400;
    }
    .hero-sub-headline {
        font-family: "Gloock", serif;
        font-size: clamp(28px, 2.2vw, 38px);
        font-style: italic;
        color: #b8956a;
        margin: 0 0 1.5rem;
        letter-spacing: -0.01em;
        font-weight: 400;
    }
    .hero-sub {
        font-family: "Instrument Sans", sans-serif;
        color: #1a2744;
        font-size: 16px;
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
        font-size: 12px;
        color: #b8956a;
        font-weight: 500;
        flex-wrap: wrap;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .trust-sep {
        color: #c8c0b4;
    }

    /* ── SECTION TYPOGRAPHY ── */
    .section-label {
        font-family: "Instrument Sans", sans-serif;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #b8956a;
        margin-bottom: 0.75rem;
        font-weight: 600;
    }
    .section-heading {
        font-family: "Gloock", serif;
        font-size: clamp(36px, 3.5vw, 50px);
        line-height: 1.15;
        letter-spacing: -0.02em;
        color: #1a2744;
        margin: 0 0 2.5rem;
        font-weight: 400;
    }
    .section-heading.left {
        text-align: left;
        margin-bottom: 1.25rem;
    }
    .feature-desc {
        font-family: "Instrument Sans", sans-serif;
        font-size: 16px;
        color: #1a2744;
        line-height: 1.75;
        margin: 0 0 1.25rem;
    }
    .feature-outcome {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 14px;
        color: #1a2744;
        line-height: 1.6;
        margin: 0;
        border-left: 3px solid #b8956a;
        padding-left: 1rem;
    }
    .outcome-gold {
        color: #b8956a;
        font-weight: 600;
    }

    /* ── APP MOCKUP (Hero Visual) ── */
    .app-mockup {
        background: #ffffff;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    }
    .mockup-bar {
        background: #f8f9fa;
        border-bottom: 1px solid #e8e8e8;
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
        background: #d1d1d1;
    }
    .mockup-url {
        font-family: "IBM Plex Mono", monospace;
        font-size: 12px;
        color: #6b7280;
        flex: 1;
    }
    .mockup-body {
        padding: 24px;
    }

    .shift-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
    }
    .shift-title {
        font-family: "Instrument Sans", sans-serif;
        font-size: 16px;
        color: #1a2744;
        font-weight: 600;
    }
    .shift-badge {
        font-family: "Instrument Sans", sans-serif;
        font-weight: 600;
        font-size: 12px;
        color: #ffffff;
        background: #b8956a;
        padding: 4px 8px;
        border-radius: 4px;
    }
    .shift-grid {
        display: flex;
        gap: 8px;
    }
    .staff-col {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 120px;
    }
    .staff-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        background: #ffffff;
        border-radius: 6px;
        border: 1px solid #e8e8e8;
    }
    .staff-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-family: "Instrument Sans", sans-serif;
        font-weight: 600;
        color: #1a2744;
        flex-shrink: 0;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
    }
    .staff-info {
        display: flex;
        flex-direction: column;
    }
    .staff-name {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 13px;
        color: #1a2744;
        font-weight: 500;
    }
    .staff-role {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 11px;
        color: #6b7280;
    }
    .days-col {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
    }
    .shift-row {
        display: flex;
        gap: 4px;
    }
    .shift-cell {
        flex: 1;
        height: 50px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "IBM Plex Mono", monospace;
        font-size: 13px;
        background: #f9fafb;
        border-left: 3px solid #e8e8e8;
        color: #9ca3af;
    }
    .shift-cell.morning {
        background: #eef2ff;
        color: #4f6ac8;
        border-color: #4f6ac8;
        font-weight: 500;
    }
    .shift-cell.evening {
        background: #f0fdf4;
        color: #16a34a;
        border-color: #16a34a;
        font-weight: 500;
    }
    .shift-cell.off {
        background: #f9fafb;
    }

    .outcome-bar {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        flex-wrap: wrap;
    }
    .outcome-card {
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 13px;
        color: #1a2744;
        background: #f8f9fa;
        border: 1px solid #e8e8e8;
        padding: 6px 12px;
        border-radius: 4px;
    }
    .oc-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #16a34a;
        flex-shrink: 0;
    }
    .oc-dot.warn {
        background: #d97706;
    }

    /* Stella Notification Card */
    .story-card {
        position: absolute;
        bottom: -20px;
        left: -24px;
        background: #2d2648;
        border-radius: 8px;
        padding: 16px 20px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        max-width: 280px;
        box-shadow: 0 12px 32px rgba(26, 39, 68, 0.15);
        animation: slideUp 0.5s ease 0.4s both;
    }
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .story-icon {
        color: #d2a362;
        font-size: 16px;
        margin-top: 2px;
    }
    .story-body {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 13px;
        color: #ffffff;
        line-height: 1.5;
    }
    .story-label {
        display: block;
        font-family: "Instrument Sans", sans-serif;
        font-size: 11px;
        color: #d2a362;
        font-weight: 600;
        margin-bottom: 4px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
    }

    /* ── MINI-APP CARDS (Feature Visuals) ── */
    .mini-app-card {
        background: #ffffff;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        width: 100%;
        max-width: 400px;
    }
    .msc-header,
    .allergen-header {
        font-family: "Instrument Sans", sans-serif;
        font-size: 16px;
        color: #1a2744;
        font-weight: 600;
        margin-bottom: 16px;
    }
    .msc-row {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
        align-items: center;
    }
    .msc-name {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 13px;
        color: #1a2744;
        width: 44px;
        flex-shrink: 0;
    }
    .msc-cell {
        width: 32px;
        height: 28px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "IBM Plex Mono", monospace;
        font-size: 12px;
        background: #f9fafb;
        border-left: 3px solid #e8e8e8;
        color: #9ca3af;
    }
    .msc-cell.m {
        background: #eef2ff;
        color: #4f6ac8;
        border-color: #4f6ac8;
        font-weight: 500;
    }
    .msc-cell.e {
        background: #f0fdf4;
        color: #16a34a;
        border-color: #16a34a;
        font-weight: 500;
    }
    .msc-badge {
        margin-top: 16px;
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 13px;
        color: #16a34a;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
    }
    .allergen-items {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .allergen-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 14px;
        color: #1a2744;
        background: #ffffff;
        border: 1px solid #e8e8e8;
        border-radius: 6px;
        padding: 8px 12px;
        animation: fadeIn 0.3s ease both;
    }
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateX(-4px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    .allergen-check {
        color: #16a34a;
        font-size: 14px;
        font-weight: 600;
    }
    .allergen-footer {
        margin-top: 16px;
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 12px;
        color: #6b7280;
    }

    /* ── STELLA ── */
    .stella-desc {
        font-family: "Instrument Sans", sans-serif;
        color: #1a2744;
        font-size: 16px;
        line-height: 1.78;
        margin: 0 0 1.75rem;
    }
    .stella-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .stella-list li {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 14px;
        color: #1a2744;
        padding: 8px 0 8px 16px;
        position: relative;
        border-bottom: 1px solid #c8c0b4;
    }
    .stella-list li::before {
        content: "★";
        position: absolute;
        left: 0;
        color: #b8956a;
        font-size: 10px;
        top: 12px;
    }
    .phone-frame {
        width: 260px;
        background: #2d2648;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 36px;
        padding: 16px;
        box-shadow: 0 24px 60px rgba(26, 39, 68, 0.2);
    }
    .phone-notch {
        width: 60px;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        margin: 0 auto 14px;
    }
    .phone-screen {
        background: #ffffff;
        border-radius: 20px;
        padding: 16px;
        min-height: 400px;
    }
    .phone-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 20px;
        font-family: "Instrument Sans", sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #2d2648;
    }
    .stella-star {
        color: #d2a362;
    }
    .online-dot {
        width: 8px;
        height: 8px;
        background: #16a34a;
        border-radius: 50%;
        margin-left: auto;
    }
    .phone-chat {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .msg {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 13px;
        line-height: 1.5;
        padding: 10px 14px;
        border-radius: 8px;
        max-width: 92%;
    }
    .msg-in {
        background: #f8f9fa;
        border: 1px solid #e8e8e8;
        color: #1a2744;
        align-self: flex-start;
        border-bottom-left-radius: 2px;
    }
    .msg-out {
        background: #2d2648;
        color: #ffffff;
        align-self: flex-end;
        border-bottom-right-radius: 2px;
    }

    /* ── INDUSTRIES ── */
    .industries {
        position: relative;
        z-index: 20;
        padding: 100px 2rem;
        background: #f5f1ec;
        border-top: 1px solid #c8c0b4;
    }
    .section-inner {
        max-width: 1100px;
        margin: 0 auto;
    }
    .industry-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
    }
    .industry-card {
        background: #ffffff;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 24px;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
    }
    .industry-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 12px rgba(26, 39, 68, 0.05);
    }
    .ind-icon {
        font-size: 24px;
        margin-bottom: 12px;
    }
    .ind-name {
        font-family: "Instrument Sans", sans-serif;
        font-size: 16px;
        font-weight: 600;
        color: #1a2744;
        margin-bottom: 8px;
    }
    .ind-desc {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 13px;
        color: #6b7280;
        line-height: 1.6;
    }

    /* ── PHILOSOPHY ── */
    .philosophy-section {
        position: relative;
        z-index: 20;
        padding: 100px 2rem;
        background: #f5f1ec;
        border-top: 1px solid #c8c0b4;
        text-align: center;
    }
    .constellation-line {
        display: flex;
        justify-content: center;
        margin-bottom: 2rem;
    }
    .philosophy-quote {
        font-family: "Gloock", serif;
        font-size: clamp(24px, 2.5vw, 32px);
        font-style: italic;
        color: #1a2744;
        line-height: 1.65;
        max-width: 720px;
        margin: 0 auto 1.25rem;
        border: 0;
        padding: 0;
    }
    .philosophy-attr {
        font-family: "Instrument Sans", sans-serif;
        font-size: 14px;
        color: #b8956a;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0;
        font-weight: 600;
    }

    /* ── WAITLIST ── */
    .waitlist-section {
        position: relative;
        z-index: 20;
        padding: 120px 2rem;
        background: #1a2744;
        text-align: center;
    }
    .waitlist-inner {
        max-width: 560px;
        margin: 0 auto;
    }
    .waitlist-heading {
        font-family: "Gloock", serif;
        font-size: clamp(40px, 5vw, 56px);
        line-height: 1.15;
        letter-spacing: -0.02em;
        color: #ffffff;
        margin: 0 0 1rem;
    }
    .waitlist-heading em {
        font-style: italic;
        color: #b8956a;
    }
    .waitlist-sub {
        font-family: "Instrument Sans", sans-serif;
        font-size: 16px;
        color: #a8b8d8;
        margin: 0 0 2.5rem;
        line-height: 1.7;
    }
    .waitlist-form {
        display: flex;
        gap: 12px;
        max-width: 460px;
        margin: 0 auto 1rem;
    }
    .waitlist-input {
        flex: 1;
        background: #ffffff;
        border: 1px solid #e8e8e8;
        border-radius: 6px;
        padding: 12px 16px;
        color: #1a2744;
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 14px;
        outline: none;
        transition: box-shadow 0.2s;
    }
    .waitlist-input:focus {
        box-shadow: 0 0 0 2px rgba(184, 149, 106, 0.3);
        border-color: #b8956a;
    }
    .waitlist-input::placeholder {
        color: #b0b0b0;
    }
    .waitlist-fine {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 12px;
        color: #a8b8d8;
        margin: 0;
    }
    .submitted-msg {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 14px;
        color: #ffffff;
        margin-bottom: 1rem;
    }
    .check-gold {
        color: #b8956a;
        font-size: 18px;
    }

    /* ── FOOTER ── */
    .footer {
        position: relative;
        z-index: 20;
        padding: 32px 2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: #1a2744;
    }
    .footer-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 24px;
    }
    .footer-logo {
        opacity: 0.8;
        transition: opacity 0.2s;
    }
    .footer-logo:hover {
        opacity: 1;
    }
    .footer-mid {
        flex: 1;
        text-align: center;
    }
    .footer-tag {
        font-family: "Instrument Sans", sans-serif;
        font-size: 12px;
        color: #a8b8d8;
        font-style: italic;
        letter-spacing: 0.05em;
    }
    .footer-links {
        display: flex;
        gap: 24px;
    }
    .footer-links a {
        color: #a8b8d8;
        text-decoration: none;
        font-family: "Instrument Sans", sans-serif;
        font-size: 13px;
        transition: color 0.2s;
    }
    .footer-links a:hover {
        color: #f5f1ec;
    }
    .navbar .logo-text {
        color: #1a2744;
    }
</style>
