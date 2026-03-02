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
        if (emailInput.trim()) {
            submitted = true;
        }
    }

    // Automation status cards - cycle through states for mockup feel
    const automationCards = [
        { icon: "✓", label: "Shift auto-generated", color: "#4ade80" },
        { icon: "⚠", label: "Allergen alert detected", color: "#fbbf24" },
        { icon: "✓", label: "Guest checked in · Rm 204", color: "#60a5fa" },
    ];
</script>

<svelte:head>
    <title>Sinara — Presence, by Design</title>
    <meta
        name="description"
        content="AI-powered hospitality operations platform. Shift scheduling, allergen detection, and guest intelligence for hotels, restaurants, izakaya, and clinics."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<!-- NAVBAR -->
<nav class="navbar" class:scrolled={navScrolled}>
    <div class="nav-inner">
        <a href="/landing" class="logo">
            <svg
                class="logo-icon"
                width="28"
                height="28"
                viewBox="0 0 32 32"
                fill="none"
            >
                <circle cx="8" cy="8" r="2.5" fill="rgba(255,255,255,0.4)" />
                <circle cx="24" cy="6" r="2.5" fill="rgba(255,255,255,0.4)" />
                <circle cx="26" cy="22" r="2.5" fill="rgba(255,255,255,0.4)" />
                <circle cx="6" cy="26" r="2.5" fill="rgba(255,255,255,0.4)" />
                <circle cx="16" cy="16" r="3.5" fill="#C4963A" />
                <line
                    x1="8"
                    y1="8"
                    x2="16"
                    y2="16"
                    stroke="rgba(255,255,255,0.2)"
                    stroke-width="1"
                />
                <line
                    x1="24"
                    y1="6"
                    x2="16"
                    y2="16"
                    stroke="rgba(255,255,255,0.2)"
                    stroke-width="1"
                />
                <line
                    x1="26"
                    y1="22"
                    x2="16"
                    y2="16"
                    stroke="rgba(255,255,255,0.2)"
                    stroke-width="1"
                />
                <line
                    x1="6"
                    y1="26"
                    x2="16"
                    y2="16"
                    stroke="rgba(255,255,255,0.2)"
                    stroke-width="1"
                />
                <line
                    x1="8"
                    y1="8"
                    x2="24"
                    y2="6"
                    stroke="rgba(255,255,255,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="6"
                    y1="26"
                    x2="26"
                    y2="22"
                    stroke="rgba(255,255,255,0.15)"
                    stroke-width="1"
                />
            </svg>
            <span class="logo-text">sinara</span>
        </a>

        <div class="nav-links">
            <a href="#features">Features</a>
            <a href="#industries">Industries</a>
            <a href="#stella">Stella</a>
            <a href="#pricing">Pricing</a>
        </div>

        <div class="nav-actions">
            <a href="/login" class="nav-login">Log in</a>
            <a href="#waitlist" class="btn-gold">Get Early Access</a>
        </div>
    </div>
</nav>

<!-- HERO -->
<section class="hero">
    <!-- Ambient glow -->
    <div class="hero-glow"></div>

    <div class="hero-inner">
        <div class="hero-left">
            <div class="hero-badge">
                <span class="badge-dot"></span>
                Presence, by design
            </div>

            <h1 class="hero-headline">
                Your operations.<br />
                <em>Automated.</em>
            </h1>

            <p class="hero-sub">
                Sinara brings AI-powered shift scheduling, allergen vision, and
                guest intelligence to every hospitality team — hotel,
                restaurant, clinic, and beyond.
            </p>

            <div class="hero-ctas">
                <a href="#waitlist" class="btn-gold">Get Started</a>
                <a href="#stella" class="btn-ghost">Watch Demo →</a>
            </div>

            <div class="hero-industries">
                <span>For</span>
                <span class="ind-pill">Hotel</span>
                <span class="ind-pill">Restaurant</span>
                <span class="ind-pill">Izakaya</span>
                <span class="ind-pill">Clinic</span>
            </div>
        </div>

        <div class="hero-right">
            <!-- App mockup -->
            <div class="app-mockup">
                <div class="mockup-bar">
                    <div class="mockup-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <div class="mockup-url">sinara.app · shift scheduler</div>
                </div>
                <div class="mockup-body">
                    <!-- Shift grid preview -->
                    <div class="shift-header">
                        <div class="shift-title">October 2025 · Period 10</div>
                        <div class="shift-tabs">
                            <span class="shift-tab active">Calendar</span>
                            <span class="shift-tab">Staff</span>
                            <span class="shift-tab">Analytics</span>
                        </div>
                    </div>
                    <div class="shift-grid">
                        <div class="grid-col staff-col">
                            {#each ["Yui · Server", "Kenji · Cook", "Mia · Service", "Ryo · Kitchen"] as name}
                                <div class="staff-row">
                                    <div class="staff-avatar">{name[0]}</div>
                                    <span>{name}</span>
                                </div>
                            {/each}
                        </div>
                        <div class="grid-col days-col">
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
                </div>
            </div>

            <!-- Floating automation cards -->
            {#each automationCards as card, i}
                <div
                    class="auto-card"
                    style="--delay: {i * 0.3}s; --top: {22 + i * 28}%;"
                >
                    <div class="auto-icon" style="color: {card.color};">
                        {card.icon}
                    </div>
                    <span>{card.label}</span>
                </div>
            {/each}

            <div class="see-in-motion">
                <span>See it in motion</span>
                <span class="arrow-gold">→</span>
            </div>
        </div>
    </div>
</section>

<!-- FEATURES BENTO GRID -->
<section class="features" id="features">
    <div class="section-inner">
        <div class="section-label">02 · Platform</div>
        <h2 class="section-heading">
            Everything you need to run<br />a world-class operation.
        </h2>

        <div class="bento-grid">
            <!-- Large: Shift Intelligence -->
            <div class="bento-card bento-large">
                <div class="bento-label">Shift Intelligence</div>
                <p class="bento-desc">
                    Every person, every role, every shift — placed with
                    precision. Staff feel empowered, not scheduled.
                </p>
                <div class="mini-schedule">
                    {#each [{ name: "Yui", shifts: ["M", "E", "■", "M", "E"] }, { name: "Kenji", shifts: ["■", "M", "E", "E", "M"] }, { name: "Mia", shifts: ["E", "■", "M", "M", "■"] }] as s}
                        <div class="mini-row">
                            <div class="mini-name">{s.name}</div>
                            {#each s.shifts as sh}
                                <div
                                    class="mini-cell"
                                    class:m={sh === "M"}
                                    class:e={sh === "E"}
                                    class:off={sh === "■"}
                                ></div>
                            {/each}
                        </div>
                    {/each}
                </div>
                <div class="bento-gold-bar"></div>
            </div>

            <!-- Small: Allergen Vision -->
            <div class="bento-card bento-small">
                <div class="bento-icon">👁</div>
                <div class="bento-label">Allergen Vision</div>
                <p class="bento-desc">
                    OCR + AI extracts every ingredient automatically.
                </p>
                <div class="allergen-badge">
                    <span class="badge-count">43</span>
                    <span class="badge-text">allergens detected</span>
                    <span class="badge-ok">✓</span>
                </div>
                <div class="bento-gold-bar"></div>
            </div>

            <!-- Small: Stella AI -->
            <div class="bento-card bento-small">
                <div class="bento-icon stella-icon">★</div>
                <div class="bento-label">Stella AI</div>
                <p class="bento-desc">Your AI companion that knows the team.</p>
                <div class="stella-chat">
                    <div class="chat-bubble">
                        <span class="chat-name">Stella</span>
                        Table 3 · shellfish allergy ⚠
                    </div>
                </div>
                <div class="bento-gold-bar"></div>
            </div>

            <!-- Large: Analytics -->
            <div class="bento-card bento-large">
                <div class="bento-label">Analytics & Reports</div>
                <p class="bento-desc">
                    Real-time visibility into operational performance across
                    your entire team.
                </p>
                <div class="mini-chart">
                    {#each [65, 80, 55, 90, 70, 85, 60] as h, i}
                        <div
                            class="chart-bar"
                            style="height: {h}%; animation-delay: {i * 0.08}s;"
                        ></div>
                    {/each}
                </div>
                <div class="bento-gold-bar"></div>
            </div>
        </div>
    </div>
</section>

<!-- STELLA SECTION -->
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
                            Good morning! Period 10 is ready. Shall I publish?
                        </div>
                        <div class="msg msg-out">Yes — notify the team.</div>
                        <div class="msg msg-in">
                            Done ✓ Room 302 has a late check-out request.
                        </div>
                        <div class="msg msg-out">
                            Add 1hr. Update Kenji's morning shift.
                        </div>
                        <div class="msg msg-in">Updated. Anything else?</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="stella-content">
            <div class="section-label">03 · AI</div>
            <h2 class="section-heading" style="text-align: left;">
                Meet Stella.<br />The AI that knows your team.
            </h2>
            <p class="stella-sub">
                An AI companion with a human voice — navigating operations so
                your staff can focus on presence.
            </p>
            <ul class="stella-features">
                <li>
                    <span class="gold-dot">●</span> Operator-facing insights and
                    scheduling control
                </li>
                <li>
                    <span class="gold-dot">●</span> Guest-facing personalised service
                </li>
                <li>
                    <span class="gold-dot">●</span> Natural language shift management
                </li>
                <li>
                    <span class="gold-dot">●</span> Real-time allergen alerts
                </li>
            </ul>
        </div>
    </div>
</section>

<!-- INDUSTRIES -->
<section class="industries" id="industries">
    <div class="section-inner">
        <div class="section-label">04 · Industries</div>
        <h2 class="section-heading">
            Built for every corner<br />of hospitality.
        </h2>

        <div class="industry-grid">
            {#each [{ icon: "🏨", name: "Hotel", desc: "Room & guest management with shift precision" }, { icon: "🍽", name: "Restaurant", desc: "Kitchen flow, allergen control, service ops" }, { icon: "🏮", name: "Izakaya", desc: "Shift scheduling for late-night operations" }, { icon: "🏥", name: "Clinic", desc: "Patient flow, staff scheduling, safety" }] as ind}
                <div class="industry-card">
                    <div class="industry-icon">{ind.icon}</div>
                    <div class="industry-name">{ind.name}</div>
                    <div class="industry-desc">{ind.desc}</div>
                </div>
            {/each}
        </div>
    </div>
</section>

<!-- WAITLIST CTA -->
<section class="waitlist-section" id="waitlist">
    <div class="section-inner waitlist-inner">
        <h2 class="waitlist-heading">
            Start your trial.<br /><em>No setup fees.</em>
        </h2>
        <p class="waitlist-sub">
            Join the waitlist. Be first when Sinara opens to new organisations.
        </p>

        {#if submitted}
            <div class="submitted-msg">
                <span class="check-gold">✓</span>
                You're on the list. We'll be in touch soon.
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
                <button type="submit" class="btn-gold">Join Waitlist</button>
            </form>
        {/if}

        <p class="waitlist-fine">
            30-day free trial · No credit card · Cancel anytime
        </p>
    </div>
</section>

<!-- FOOTER -->
<footer class="footer">
    <div class="footer-inner">
        <a href="/landing" class="logo footer-logo">
            <svg
                class="logo-icon"
                width="20"
                height="20"
                viewBox="0 0 32 32"
                fill="none"
            >
                <circle cx="8" cy="8" r="2" fill="rgba(255,255,255,0.3)" />
                <circle cx="24" cy="6" r="2" fill="rgba(255,255,255,0.3)" />
                <circle cx="26" cy="22" r="2" fill="rgba(255,255,255,0.3)" />
                <circle cx="6" cy="26" r="2" fill="rgba(255,255,255,0.3)" />
                <circle cx="16" cy="16" r="3" fill="#C4963A" />
                <line
                    x1="8"
                    y1="8"
                    x2="16"
                    y2="16"
                    stroke="rgba(255,255,255,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="24"
                    y1="6"
                    x2="16"
                    y2="16"
                    stroke="rgba(255,255,255,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="26"
                    y1="22"
                    x2="16"
                    y2="16"
                    stroke="rgba(255,255,255,0.15)"
                    stroke-width="1"
                />
                <line
                    x1="6"
                    y1="26"
                    x2="16"
                    y2="16"
                    stroke="rgba(255,255,255,0.15)"
                    stroke-width="1"
                />
            </svg>
            <span class="logo-text">sinara</span>
        </a>

        <div class="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
        </div>

        <div class="footer-copy">sinara © 2026 · presence, by design</div>
    </div>
</footer>

<style>
    :global(body) {
        margin: 0;
        background: #0f1624;
        color: #f0ebe0;
        font-family: "Instrument Sans", system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
    }

    /* ── NAVBAR ── */
    .navbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        padding: 0 2rem;
        height: 64px;
        display: flex;
        align-items: center;
        transition:
            background 0.3s,
            border-bottom 0.3s;
    }
    .navbar.scrolled {
        background: rgba(15, 22, 36, 0.92);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .nav-inner {
        max-width: 1200px;
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
        font-size: 1.4rem;
        color: #f0ebe0;
        letter-spacing: -0.02em;
    }
    .nav-links {
        display: flex;
        gap: 2rem;
        flex: 1;
        justify-content: center;
    }
    .nav-links a {
        color: rgba(240, 235, 224, 0.6);
        text-decoration: none;
        font-size: 0.875rem;
        transition: color 0.2s;
    }
    .nav-links a:hover {
        color: #f0ebe0;
    }
    .nav-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .nav-login {
        color: rgba(240, 235, 224, 0.6);
        text-decoration: none;
        font-size: 0.875rem;
        transition: color 0.2s;
    }
    .nav-login:hover {
        color: #f0ebe0;
    }

    /* ── BUTTONS ── */
    .btn-gold {
        background: #c4963a;
        color: #0f1624;
        font-weight: 600;
        font-size: 0.875rem;
        padding: 0.6rem 1.25rem;
        border-radius: 6px;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition:
            opacity 0.2s,
            transform 0.15s;
        display: inline-block;
    }
    .btn-gold:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
    .btn-ghost {
        color: rgba(240, 235, 224, 0.7);
        border: 1px solid rgba(240, 235, 224, 0.2);
        padding: 0.6rem 1.25rem;
        border-radius: 6px;
        text-decoration: none;
        font-size: 0.875rem;
        transition:
            border-color 0.2s,
            color 0.2s;
    }
    .btn-ghost:hover {
        border-color: rgba(196, 150, 58, 0.5);
        color: #f0ebe0;
    }

    /* ── HERO ── */
    .hero {
        min-height: 100vh;
        display: flex;
        align-items: center;
        padding: 100px 2rem 60px;
        position: relative;
        overflow: hidden;
        background: radial-gradient(
            ellipse 80% 60% at 60% 40%,
            rgba(30, 42, 74, 0.8) 0%,
            #0f1624 70%
        );
    }
    .hero-glow {
        position: absolute;
        top: 30%;
        right: 15%;
        width: 600px;
        height: 400px;
        background: radial-gradient(
            ellipse,
            rgba(196, 150, 58, 0.06) 0%,
            transparent 70%
        );
        pointer-events: none;
    }
    .hero-inner {
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1.1fr;
        gap: 4rem;
        align-items: center;
    }
    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(196, 150, 58, 0.1);
        border: 1px solid rgba(196, 150, 58, 0.25);
        color: #c4963a;
        font-size: 0.78rem;
        padding: 0.35rem 0.8rem;
        border-radius: 100px;
        margin-bottom: 1.5rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-weight: 500;
    }
    .badge-dot {
        width: 6px;
        height: 6px;
        background: #c4963a;
        border-radius: 50%;
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.4;
        }
    }
    .hero-headline {
        font-family: "Instrument Serif", serif;
        font-size: clamp(2.5rem, 5vw, 3.8rem);
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: #f0ebe0;
        margin: 0 0 1.25rem;
    }
    .hero-headline em {
        font-style: italic;
        color: #c4963a;
    }
    .hero-sub {
        color: rgba(240, 235, 224, 0.55);
        font-size: 1rem;
        line-height: 1.7;
        max-width: 440px;
        margin: 0 0 2rem;
    }
    .hero-ctas {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 2rem;
    }
    .hero-industries {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        font-size: 0.8rem;
        color: rgba(240, 235, 224, 0.4);
    }
    .ind-pill {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 0.2rem 0.65rem;
        border-radius: 100px;
        color: rgba(240, 235, 224, 0.5);
    }

    /* ── APP MOCKUP ── */
    .hero-right {
        position: relative;
    }
    .app-mockup {
        background: #141d2e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5);
    }
    .mockup-bar {
        background: #1a2438;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .mockup-dots {
        display: flex;
        gap: 5px;
    }
    .mockup-dots span {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
    }
    .mockup-url {
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.3);
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
        font-size: 0.8rem;
        color: rgba(240, 235, 224, 0.6);
        font-weight: 500;
    }
    .shift-tabs {
        display: flex;
        gap: 4px;
    }
    .shift-tab {
        font-size: 0.7rem;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        color: rgba(240, 235, 224, 0.4);
        cursor: pointer;
    }
    .shift-tab.active {
        background: rgba(196, 150, 58, 0.15);
        color: #c4963a;
    }
    .shift-grid {
        display: flex;
        gap: 8px;
    }
    .staff-col {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 110px;
    }
    .staff-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        font-size: 0.72rem;
        color: rgba(240, 235, 224, 0.6);
    }
    .staff-avatar {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: linear-gradient(135deg, #c4963a, #8b6a28);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        font-weight: 600;
        color: #0f1624;
    }
    .days-col {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
    }
    .shift-row {
        display: flex;
        gap: 3px;
    }
    .shift-cell {
        flex: 1;
        height: 34px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.62rem;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.3);
    }
    .shift-cell.morning {
        background: rgba(96, 165, 250, 0.15);
        color: #60a5fa;
    }
    .shift-cell.evening {
        background: rgba(196, 150, 58, 0.15);
        color: #c4963a;
    }
    .shift-cell.off {
        background: rgba(255, 255, 255, 0.03);
    }

    /* Automation cards */
    .auto-card {
        position: absolute;
        right: -20px;
        top: var(--top);
        background: rgba(20, 30, 50, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 8px 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.75rem;
        color: rgba(240, 235, 224, 0.75);
        backdrop-filter: blur(8px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        animation: floatIn 0.5s ease var(--delay) both;
        white-space: nowrap;
    }
    @keyframes floatIn {
        from {
            opacity: 0;
            transform: translateX(10px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    .auto-icon {
        font-weight: 700;
        font-size: 0.9rem;
    }
    .see-in-motion {
        margin-top: 1rem;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.78rem;
        color: rgba(240, 235, 224, 0.4);
        cursor: pointer;
        transition: color 0.2s;
    }
    .see-in-motion:hover {
        color: rgba(240, 235, 224, 0.7);
    }
    .arrow-gold {
        color: #c4963a;
    }

    /* ── FEATURES ── */
    .features {
        padding: 100px 2rem;
        background: #0a1120;
    }
    .section-inner {
        max-width: 1200px;
        margin: 0 auto;
    }
    .section-label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #c4963a;
        margin-bottom: 1rem;
        font-weight: 500;
    }
    .section-heading {
        font-family: "Instrument Serif", serif;
        font-size: clamp(1.8rem, 4vw, 2.8rem);
        line-height: 1.15;
        letter-spacing: -0.02em;
        color: #f0ebe0;
        margin: 0 0 3rem;
    }

    /* BENTO GRID */
    .bento-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        grid-template-rows: auto auto;
        gap: 1rem;
    }
    .bento-card {
        background: #141d2e;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 16px;
        padding: 1.5rem;
        position: relative;
        overflow: hidden;
        transition: border-color 0.2s;
    }
    .bento-card:hover {
        border-color: rgba(196, 150, 58, 0.2);
    }
    .bento-large {
        grid-column: span 1;
    }
    .bento-small {
        grid-column: span 1;
    }
    .bento-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: #f0ebe0;
        margin-bottom: 0.5rem;
    }
    .bento-desc {
        font-size: 0.82rem;
        color: rgba(240, 235, 224, 0.45);
        line-height: 1.6;
        margin: 0 0 1.25rem;
    }
    .bento-icon {
        font-size: 1.5rem;
        margin-bottom: 0.75rem;
    }
    .stella-icon {
        color: #c4963a;
    }
    .bento-gold-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #c4963a, transparent);
    }

    /* Mini schedule in bento */
    .mini-schedule {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    .mini-row {
        display: flex;
        gap: 4px;
        align-items: center;
    }
    .mini-name {
        font-size: 0.65rem;
        color: rgba(240, 235, 224, 0.4);
        width: 40px;
        flex-shrink: 0;
    }
    .mini-cell {
        width: 22px;
        height: 18px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.04);
    }
    .mini-cell.m {
        background: rgba(96, 165, 250, 0.2);
    }
    .mini-cell.e {
        background: rgba(196, 150, 58, 0.2);
    }
    .mini-cell.off {
        background: rgba(255, 255, 255, 0.03);
    }

    /* Allergen badge */
    .allergen-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(74, 222, 128, 0.08);
        border: 1px solid rgba(74, 222, 128, 0.15);
        border-radius: 8px;
        padding: 8px 12px;
    }
    .badge-count {
        font-size: 1.4rem;
        font-weight: 700;
        color: #4ade80;
        font-family: "Instrument Serif", serif;
    }
    .badge-text {
        font-size: 0.75rem;
        color: rgba(240, 235, 224, 0.5);
        flex: 1;
    }
    .badge-ok {
        color: #4ade80;
        font-weight: 700;
    }

    /* Stella chat bubble in bento */
    .stella-chat {
        margin-top: auto;
    }
    .chat-bubble {
        background: rgba(196, 150, 58, 0.08);
        border: 1px solid rgba(196, 150, 58, 0.15);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.75rem;
        color: rgba(240, 235, 224, 0.65);
        line-height: 1.5;
    }
    .chat-name {
        display: block;
        font-size: 0.65rem;
        color: #c4963a;
        font-weight: 600;
        margin-bottom: 2px;
    }

    /* Mini chart */
    .mini-chart {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        height: 60px;
        margin-top: 1rem;
    }
    .chart-bar {
        flex: 1;
        background: linear-gradient(
            to top,
            rgba(196, 150, 58, 0.6),
            rgba(196, 150, 58, 0.15)
        );
        border-radius: 3px 3px 0 0;
        animation: growUp 0.6s ease both;
    }
    @keyframes growUp {
        from {
            height: 0 !important;
        }
    }

    /* ── STELLA SECTION ── */
    .stella-section {
        padding: 100px 2rem;
        background: #0f1624;
    }
    .stella-inner {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5rem;
        align-items: center;
    }
    .stella-phone {
        display: flex;
        justify-content: center;
    }
    .phone-frame {
        width: 240px;
        background: #141d2e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 36px;
        padding: 16px;
        box-shadow: 0 32px 80px rgba(0, 0, 0, 0.4);
    }
    .phone-notch {
        width: 60px;
        height: 8px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        margin: 0 auto 12px;
    }
    .phone-screen {
        background: #0a1120;
        border-radius: 24px;
        padding: 14px;
        min-height: 320px;
    }
    .phone-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 14px;
        font-size: 0.8rem;
        font-weight: 600;
        color: #f0ebe0;
    }
    .stella-star {
        color: #c4963a;
    }
    .online-dot {
        width: 6px;
        height: 6px;
        background: #4ade80;
        border-radius: 50%;
        margin-left: auto;
    }
    .phone-chat {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .msg {
        font-size: 0.7rem;
        line-height: 1.5;
        padding: 7px 10px;
        border-radius: 10px;
        max-width: 90%;
    }
    .msg-in {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(240, 235, 224, 0.7);
        align-self: flex-start;
        border-bottom-left-radius: 3px;
    }
    .msg-out {
        background: rgba(196, 150, 58, 0.15);
        color: rgba(240, 235, 224, 0.85);
        align-self: flex-end;
        border-bottom-right-radius: 3px;
    }
    .stella-content {
    }
    .stella-sub {
        color: rgba(240, 235, 224, 0.5);
        font-size: 1rem;
        line-height: 1.7;
        margin: 0 0 2rem;
    }
    .stella-features {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .stella-features li {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
        color: rgba(240, 235, 224, 0.65);
        border-left: 1px solid rgba(196, 150, 58, 0.2);
        padding-left: 1rem;
    }
    .gold-dot {
        color: #c4963a;
        font-size: 0.5rem;
    }

    /* ── INDUSTRIES ── */
    .industries {
        padding: 100px 2rem;
        background: #0a1120;
    }
    .industry-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }
    .industry-card {
        background: #141d2e;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-left: 2px solid rgba(196, 150, 58, 0.3);
        border-radius: 12px;
        padding: 1.5rem 1.25rem;
        transition:
            border-color 0.2s,
            transform 0.2s;
    }
    .industry-card:hover {
        border-left-color: #c4963a;
        transform: translateY(-3px);
    }
    .industry-icon {
        font-size: 1.5rem;
        margin-bottom: 0.75rem;
    }
    .industry-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: #f0ebe0;
        margin-bottom: 0.4rem;
    }
    .industry-desc {
        font-size: 0.78rem;
        color: rgba(240, 235, 224, 0.4);
        line-height: 1.5;
    }

    /* ── WAITLIST ── */
    .waitlist-section {
        padding: 120px 2rem;
        background: #0f1624;
        text-align: center;
    }
    .waitlist-inner {
        max-width: 600px;
    }
    .waitlist-heading {
        font-family: "Instrument Serif", serif;
        font-size: clamp(2rem, 5vw, 3.2rem);
        line-height: 1.15;
        letter-spacing: -0.02em;
        color: #f0ebe0;
        margin: 0 0 1rem;
    }
    .waitlist-heading em {
        font-style: italic;
        color: #c4963a;
    }
    .waitlist-sub {
        color: rgba(240, 235, 224, 0.5);
        font-size: 1rem;
        margin: 0 0 2.5rem;
        line-height: 1.6;
    }
    .waitlist-form {
        display: flex;
        gap: 0.75rem;
        max-width: 480px;
        margin: 0 auto 1rem;
    }
    .waitlist-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        padding: 0.7rem 1rem;
        color: #f0ebe0;
        font-size: 0.9rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
    }
    .waitlist-input:focus {
        border-color: rgba(196, 150, 58, 0.4);
    }
    .waitlist-input::placeholder {
        color: rgba(240, 235, 224, 0.3);
    }
    .waitlist-fine {
        font-size: 0.78rem;
        color: rgba(240, 235, 224, 0.3);
        margin: 0;
    }
    .submitted-msg {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
        font-size: 1rem;
        color: rgba(240, 235, 224, 0.7);
        margin-bottom: 1rem;
    }
    .check-gold {
        color: #c4963a;
        font-size: 1.3rem;
    }

    /* ── FOOTER ── */
    .footer {
        padding: 2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        background: #0a1120;
    }
    .footer-inner {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 2rem;
    }
    .footer-logo {
        opacity: 0.6;
        transition: opacity 0.2s;
    }
    .footer-logo:hover {
        opacity: 1;
    }
    .footer-links {
        display: flex;
        gap: 1.5rem;
        flex: 1;
        justify-content: center;
    }
    .footer-links a {
        color: rgba(240, 235, 224, 0.35);
        text-decoration: none;
        font-size: 0.8rem;
        transition: color 0.2s;
    }
    .footer-links a:hover {
        color: rgba(240, 235, 224, 0.65);
    }
    .footer-copy {
        font-size: 0.75rem;
        color: rgba(240, 235, 224, 0.25);
    }
</style>
