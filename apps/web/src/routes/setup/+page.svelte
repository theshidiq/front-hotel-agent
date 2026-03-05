<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { supabase } from "$lib/supabase";
    import { authState } from "$lib/auth.svelte";

    // ─── Already-onboarded guard ──────────────────────────────────────────────
    onMount(async () => {
        const userId = authState.user?.id;
        if (userId) {
            const { data: membership } = await supabase
                .from("organization_members")
                .select("id")
                .eq("auth_user_id", userId)
                .limit(1)
                .maybeSingle();
            if (membership) goto("/dashboard");
        }
    });

    // ─── Step state ───────────────────────────────────────────────────────────
    let currentStep = $state(1);
    const TOTAL_STEPS = 4;

    // ─── Form data ────────────────────────────────────────────────────────────
    let name = $state("");
    let slug = $state("");
    let slugLocked = $state(false);
    let businessType = $state("hotel");
    let countryCode = $state("JP");

    let addressLine1 = $state("");
    let addressLine2 = $state("");
    let city = $state("");
    let stateProvince = $state("");
    let postalCode = $state("");
    let localPhone = $state("");
    let ownerEmail = $state(authState.user?.email ?? "");
    let brandColor = $state("#B8956A");
    let plan = $state<"free" | "pro" | "business">("free");

    // ─── Country dropdown UI ───────────────────────────────────────────────────
    let countryOpen = $state(false);
    let countrySearch = $state("");

    let hoursOpen = $state("09:00");
    let hoursClose = $state("22:00");
    let shiftDuration = $state(8);
    let minStaff = $state(2);
    let maxConsecutiveDays = $state(6);
    let periodStartDay = $state(21);
    let periodEndDay = $state(20);

    // ─── UI state ─────────────────────────────────────────────────────────────
    let submitting = $state(false);
    let submitError = $state<string | null>(null);
    let fieldErrors = $state<Record<string, string>>({});

    // ─── Constants ────────────────────────────────────────────────────────────
    const BUSINESS_TYPES = [
        {
            value: "hotel",
            label: "Hotel",
            icon: "hotel",
            industry: "accommodation",
        },
        {
            value: "ryokan",
            label: "Ryokan",
            icon: "spa",
            industry: "accommodation",
        },
        {
            value: "restaurant",
            label: "Restaurant",
            icon: "restaurant",
            industry: "food_beverage",
        },
        {
            value: "izakaya",
            label: "Izakaya",
            icon: "local_bar",
            industry: "food_beverage",
        },
        {
            value: "cafe",
            label: "Café",
            icon: "coffee",
            industry: "food_beverage",
        },
        {
            value: "clinic",
            label: "Clinic",
            icon: "local_hospital",
            industry: "healthcare",
        },
        {
            value: "spa",
            label: "Spa",
            icon: "self_improvement",
            industry: "wellness",
        },
        {
            value: "event_venue",
            label: "Event Venue",
            icon: "celebration",
            industry: "events",
        },
        { value: "other", label: "Other", icon: "business", industry: "other" },
    ] as const;

    const COUNTRIES = [
        { code: "JP", name: "Japan", flag: "🇯🇵", dialCode: "+81" },
        { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1" },
        { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
        { code: "SG", name: "Singapore", flag: "🇸🇬", dialCode: "+65" },
        { code: "TH", name: "Thailand", flag: "🇹🇭", dialCode: "+66" },
        { code: "KR", name: "South Korea", flag: "🇰🇷", dialCode: "+82" },
        { code: "CN", name: "China", flag: "🇨🇳", dialCode: "+86" },
        { code: "HK", name: "Hong Kong", flag: "🇭🇰", dialCode: "+852" },
        { code: "TW", name: "Taiwan", flag: "🇹🇼", dialCode: "+886" },
        { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62" },
        { code: "MY", name: "Malaysia", flag: "🇲🇾", dialCode: "+60" },
        { code: "PH", name: "Philippines", flag: "🇵🇭", dialCode: "+63" },
        { code: "VN", name: "Vietnam", flag: "🇻🇳", dialCode: "+84" },
        { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
        { code: "AE", name: "UAE", flag: "🇦🇪", dialCode: "+971" },
        { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dialCode: "+966" },
        { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61" },
        { code: "NZ", name: "New Zealand", flag: "🇳🇿", dialCode: "+64" },
        { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33" },
        { code: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49" },
        { code: "IT", name: "Italy", flag: "🇮🇹", dialCode: "+39" },
        { code: "ES", name: "Spain", flag: "🇪🇸", dialCode: "+34" },
        { code: "PT", name: "Portugal", flag: "🇵🇹", dialCode: "+351" },
        { code: "NL", name: "Netherlands", flag: "🇳🇱", dialCode: "+31" },
        { code: "CH", name: "Switzerland", flag: "🇨🇭", dialCode: "+41" },
        { code: "AT", name: "Austria", flag: "🇦🇹", dialCode: "+43" },
        { code: "BE", name: "Belgium", flag: "🇧🇪", dialCode: "+32" },
        { code: "SE", name: "Sweden", flag: "🇸🇪", dialCode: "+46" },
        { code: "NO", name: "Norway", flag: "🇳🇴", dialCode: "+47" },
        { code: "DK", name: "Denmark", flag: "🇩🇰", dialCode: "+45" },
        { code: "FI", name: "Finland", flag: "🇫🇮", dialCode: "+358" },
        { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1" },
        { code: "MX", name: "Mexico", flag: "🇲🇽", dialCode: "+52" },
        { code: "BR", name: "Brazil", flag: "🇧🇷", dialCode: "+55" },
        { code: "ZA", name: "South Africa", flag: "🇿🇦", dialCode: "+27" },
        { code: "EG", name: "Egypt", flag: "🇪🇬", dialCode: "+20" },
        { code: "QA", name: "Qatar", flag: "🇶🇦", dialCode: "+974" },
        { code: "TR", name: "Turkey", flag: "🇹🇷", dialCode: "+90" },
        { code: "GR", name: "Greece", flag: "🇬🇷", dialCode: "+30" },
        { code: "PL", name: "Poland", flag: "🇵🇱", dialCode: "+48" },
    ];

    const STEPS = [
        { n: 1, label: "Business identity" },
        { n: 2, label: "Contact & branding" },
        { n: 3, label: "Workspace settings" },
        { n: 4, label: "Launch" },
    ];

    const PLANS = [
        {
            value: "free" as const,
            tier: "Free",
            name: "Starter",
            price: "¥0",
            priceNote: "Forever free · No credit card",
            badge: null as string | null,
            features: [
                "1 division",
                "Up to 20 staff",
                "Intelligent auto-scheduler",
                "Basic shift rules",
            ],
            locked: [
                "OCR allergen scanning",
                "Multiple divisions",
                "Analytics & reports",
            ],
        },
        {
            value: "pro" as const,
            tier: "Pro",
            name: "Professional",
            price: "¥4,980",
            priceNote: "≈ $33 USD · Billed monthly",
            badge: "Most Popular" as string | null,
            features: [
                "Up to 3 divisions",
                "Up to 80 staff",
                "Intelligent auto-scheduler",
                "Advanced shift rules",
                "OCR allergen scanning",
                "Menu management",
                "Basic analytics",
            ],
            locked: ["Unlimited divisions", "Priority support"],
        },
        {
            value: "business" as const,
            tier: "Business",
            name: "Business",
            price: "¥12,800",
            priceNote: "≈ $85 USD · Billed monthly",
            badge: null as string | null,
            features: [
                "Unlimited divisions & staff",
                "Intelligent auto-scheduler",
                "Custom shift rules",
                "OCR allergen scanning",
                "Full menu management",
                "Advanced analytics & exports",
                "Priority support",
                "Early feature access",
            ],
            locked: [],
        },
    ];

    // ─── Derived ──────────────────────────────────────────────────────────────
    const selectedBizType = $derived(
        BUSINESS_TYPES.find((b) => b.value === businessType)!,
    );
    const industry = $derived(selectedBizType?.industry ?? "other");
    const progressPct = $derived(((currentStep - 1) / TOTAL_STEPS) * 100);
    const selectedCountry = $derived(
        COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0],
    );

    // ─── Slug auto-gen ────────────────────────────────────────────────────────
    function toSlug(s: string) {
        return s
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 40);
    }

    function handleNameInput() {
        if (!slugLocked) slug = toSlug(name);
    }

    // ─── Validation ───────────────────────────────────────────────────────────
    function validateStep(step: number): boolean {
        const errs: Record<string, string> = {};
        if (step === 1) {
            if (!name.trim()) errs.name = "Organization name is required";
            if (!slug.trim()) errs.slug = "Slug is required";
            else if (!/^[a-z0-9-]+$/.test(slug))
                errs.slug = "Lowercase letters, numbers, hyphens only";
        }
        if (step === 2) {
            if (ownerEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail))
                errs.ownerEmail = "Enter a valid email address";
        }
        if (step === 3) {
            // No required fields in step 3 (plan is always set)
        }
        fieldErrors = errs;
        return Object.keys(errs).length === 0;
    }

    function nextStep() {
        if (!validateStep(currentStep)) return;
        currentStep = Math.min(TOTAL_STEPS, currentStep + 1);
    }

    function prevStep() {
        currentStep = Math.max(1, currentStep - 1);
        fieldErrors = {};
        submitError = null;
    }

    // ─── Submit ───────────────────────────────────────────────────────────────
    async function handleSubmit() {
        if (!validateStep(3)) return;
        submitting = true;
        submitError = null;
        try {
            const authUserId = authState.user?.id ?? null;
            const resolvedEmail = ownerEmail || authState.user?.email || null;

            const addressStr = [
                addressLine1,
                addressLine2,
                city,
                stateProvince,
                postalCode,
            ]
                .filter(Boolean)
                .join(", ");
            const phoneStr = localPhone
                ? `${selectedCountry.dialCode}${localPhone}`
                : null;

            const { data: org, error: orgErr } = await supabase
                .from("organizations")
                .insert({
                    name: name.trim(),
                    slug: slug.trim(),
                    display_name: name.trim(),
                    business_type: businessType,
                    industry,
                    country: countryCode,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    address: addressStr || null,
                    phone: phoneStr,
                    owner_email: resolvedEmail,
                    brand_color: brandColor,
                    plan,
                })
                .select("id")
                .single();
            if (orgErr || !org)
                throw new Error(
                    orgErr?.message ?? "Failed to create organization",
                );

            const { data: restaurant, error: restErr } = await supabase
                .from("restaurants")
                .insert({
                    name: name.trim(),
                    slug: slug.trim(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    settings: {
                        business_hours: { open: "09:00", close: "22:00" },
                        shift_duration: 8,
                        min_staff_per_shift: 2,
                        max_consecutive_days: 6,
                    },
                    contact_info: {
                        address: addressStr || null,
                        phone: phoneStr,
                        email: resolvedEmail,
                    },
                })
                .select("id")
                .single();
            if (restErr || !restaurant)
                throw new Error(
                    restErr?.message ?? "Failed to create restaurant",
                );

            await supabase
                .from("organizations")
                .update({ restaurant_id: restaurant.id })
                .eq("id", org.id);

            await supabase.from("period_configuration").insert({
                restaurant_id: restaurant.id,
                start_day: periodStartDay,
                end_day: periodEndDay,
                period_length_days: 30,
            });

            await supabase.from("organization_members").insert({
                organization_id: org.id,
                auth_user_id: authUserId,
                role: "owner",
                email: resolvedEmail,
                is_active: true,
            });

            await supabase
                .from("organizations")
                .update({ onboarded_at: new Date().toISOString() })
                .eq("id", org.id);

            currentStep = TOTAL_STEPS;
        } catch (err: unknown) {
            submitError =
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again.";
        } finally {
            submitting = false;
        }
    }

    function goToDashboard() {
        goto("/dashboard");
    }
</script>

<svelte:head>
    <title>Set up your workspace — Sinara</title>
</svelte:head>

<svelte:window
    onclick={() => {
        countryOpen = false;
    }}
/>

<div class="setup-root">
    <!-- ── Left: Brand Panel ── -->
    <aside class="setup-sidebar">
        <div class="setup-sidebar-dot-grid"></div>
        <div class="setup-sidebar-inner">
            <!-- Logo -->
            <div class="setup-logo">
                <div class="setup-logo-icon">S</div>
                <span class="setup-logo-text">Sinara</span>
            </div>

            <!-- Headline -->
            <div class="setup-sidebar-body">
                <p class="setup-sidebar-label">Getting started</p>
                <h1 class="setup-sidebar-title">
                    Set up your<br /><span class="setup-sidebar-accent"
                        >workspace</span
                    >
                </h1>
                <p class="setup-sidebar-desc">
                    A few details to personalize Sinara for your business —
                    takes less than 2 minutes.
                </p>

                <!-- Step list -->
                <div class="setup-step-list">
                    {#each STEPS as s}
                        <div class="setup-step-item">
                            <div
                                class="setup-step-circle
								{currentStep > s.n
                                    ? 'setup-step-done'
                                    : currentStep === s.n
                                      ? 'setup-step-active'
                                      : 'setup-step-future'}"
                            >
                                {#if currentStep > s.n}
                                    <span
                                        class="material-symbols-rounded"
                                        style="font-size:14px;">check</span
                                    >
                                {:else}
                                    {s.n}
                                {/if}
                            </div>
                            <span
                                class="setup-step-label {currentStep === s.n
                                    ? 'setup-step-label-active'
                                    : ''}">{s.label}</span
                            >
                        </div>
                    {/each}
                </div>
            </div>

            <p class="setup-sidebar-footer">Sinara · presence, by design</p>
        </div>
    </aside>

    <!-- ── Right: Form Panel ── -->
    <div class="setup-form-panel">
        <!-- Progress bar -->
        <div class="setup-progress-track">
            <div
                class="setup-progress-fill"
                style="width:{currentStep === TOTAL_STEPS ? 100 : progressPct}%"
            ></div>
        </div>

        <!-- Mobile header -->
        <div class="setup-mobile-header">
            <div
                class="setup-logo-icon"
                style="width:32px;height:32px;font-size:14px;"
            >
                S
            </div>
            <span
                style="font-weight:600;color:#1A2744;font-family:'Instrument Sans',sans-serif;"
                >Sinara</span
            >
            <span class="setup-mobile-step"
                >Step {Math.min(currentStep, TOTAL_STEPS - 1)} of {TOTAL_STEPS -
                    1}</span
            >
        </div>

        <!-- Main area: scroll + side nav -->
        <div class="setup-main-area">
            <div class="setup-scroll">
                <div class="setup-form-content">
                    <!-- step content unchanged -->
                    {#if currentStep === 1}
                        <div class="setup-step-header">
                            <p class="setup-step-tag">Step 1 of 3</p>
                            <h2 class="setup-step-title">Business identity</h2>
                            <p class="setup-step-desc">
                                Tell us about your organization.
                            </p>
                        </div>

                        <div class="setup-fields">
                            <!-- Name -->
                            <div class="setup-field">
                                <label for="org-name" class="setup-label"
                                    >Organization name <span
                                        class="setup-required">*</span
                                    ></label
                                >
                                <input
                                    id="org-name"
                                    type="text"
                                    bind:value={name}
                                    oninput={handleNameInput}
                                    placeholder="e.g. Sinara Grand Hotel"
                                    class="setup-input {fieldErrors.name
                                        ? 'setup-input-error'
                                        : ''}"
                                />
                                {#if fieldErrors.name}<p
                                        class="setup-field-error"
                                    >
                                        {fieldErrors.name}
                                    </p>{/if}
                            </div>

                            <!-- Slug -->
                            <div class="setup-field">
                                <label for="org-slug" class="setup-label"
                                    >Workspace URL <span class="setup-required"
                                        >*</span
                                    ></label
                                >
                                <div
                                    class="setup-slug-wrap {fieldErrors.slug
                                        ? 'setup-slug-error'
                                        : ''}"
                                >
                                    <span class="setup-slug-prefix"
                                        >sinara.app/</span
                                    >
                                    <input
                                        id="org-slug"
                                        type="text"
                                        bind:value={slug}
                                        oninput={() => (slugLocked = true)}
                                        placeholder="my-workspace"
                                        class="setup-slug-input"
                                    />
                                </div>
                                {#if fieldErrors.slug}
                                    <p class="setup-field-error">
                                        {fieldErrors.slug}
                                    </p>
                                {:else}
                                    <p class="setup-field-hint">
                                        Lowercase letters, numbers, hyphens
                                    </p>
                                {/if}
                            </div>

                            <!-- Business type -->
                            <div class="setup-field">
                                <p class="setup-label">
                                    Business type <span class="setup-required"
                                        >*</span
                                    >
                                </p>
                                <div class="setup-biz-grid">
                                    {#each BUSINESS_TYPES as biz}
                                        <button
                                            type="button"
                                            onclick={() => {
                                                businessType = biz.value;
                                            }}
                                            class="setup-biz-card {businessType ===
                                            biz.value
                                                ? 'setup-biz-card-active'
                                                : ''}"
                                        >
                                            <span
                                                class="material-symbols-rounded setup-biz-icon"
                                                >{biz.icon}</span
                                            >
                                            {biz.label}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        </div>

                        <!-- ── STEP 2 ── -->
                    {:else if currentStep === 2}
                        <div class="setup-step-header">
                            <p class="setup-step-tag">Step 2 of 3</p>
                            <h2 class="setup-step-title">
                                Contact &amp; branding
                            </h2>
                            <p class="setup-step-desc">
                                Optional details — you can update these from
                                Settings anytime.
                            </p>
                        </div>

                        <div class="setup-fields">
                            <!-- Address line 1 -->
                            <div class="setup-field">
                                <label for="addr1" class="setup-label"
                                    >Address line 1</label
                                >
                                <input
                                    id="addr1"
                                    type="text"
                                    bind:value={addressLine1}
                                    placeholder="123 Grand Avenue"
                                    class="setup-input"
                                />
                            </div>

                            <!-- Address line 2 -->
                            <div class="setup-field">
                                <label for="addr2" class="setup-label"
                                    >Address line 2 <span
                                        style="font-weight:400;opacity:.6;"
                                        >(optional)</span
                                    ></label
                                >
                                <input
                                    id="addr2"
                                    type="text"
                                    bind:value={addressLine2}
                                    placeholder="Floor 12, Suite A"
                                    class="setup-input"
                                />
                            </div>

                            <!-- City + State -->
                            <div class="setup-row">
                                <div class="setup-field" style="flex:1;">
                                    <label for="city" class="setup-label"
                                        >City</label
                                    >
                                    <input
                                        id="city"
                                        type="text"
                                        bind:value={city}
                                        placeholder="Tokyo"
                                        class="setup-input"
                                    />
                                </div>
                                <div class="setup-field" style="flex:1;">
                                    <label for="state" class="setup-label"
                                        >State / Prefecture</label
                                    >
                                    <input
                                        id="state"
                                        type="text"
                                        bind:value={stateProvince}
                                        placeholder="Tokyo"
                                        class="setup-input"
                                    />
                                </div>
                            </div>

                            <!-- Postal code -->
                            <div class="setup-field">
                                <label for="postal" class="setup-label"
                                    >Postal code</label
                                >
                                <input
                                    id="postal"
                                    type="text"
                                    bind:value={postalCode}
                                    placeholder="100-0001"
                                    class="setup-input"
                                    style="max-width:220px;"
                                />
                            </div>

                            <!-- Country + Phone -->
                            <div class="setup-field">
                                <p class="setup-label">Phone</p>
                                <div class="setup-phone-row">
                                    <!-- Searchable country dial-code picker -->
                                    <div class="setup-country-wrap">
                                        <button
                                            type="button"
                                            class="setup-country-btn"
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                countryOpen = !countryOpen;
                                                countrySearch = "";
                                            }}
                                        >
                                            <span
                                                >{COUNTRIES.find(
                                                    (c) =>
                                                        c.code === countryCode,
                                                )?.flag ?? "🌍"}</span
                                            >
                                            <span class="setup-country-dial"
                                                >{COUNTRIES.find(
                                                    (c) =>
                                                        c.code === countryCode,
                                                )?.dialCode ?? ""}</span
                                            >
                                            <span
                                                class="material-symbols-rounded"
                                                style="font-size:16px;color:#9ca3af;"
                                                >expand_more</span
                                            >
                                        </button>
                                        {#if countryOpen}
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div
                                                class="setup-country-dropdown"
                                                onclick={(e) =>
                                                    e.stopPropagation()}
                                                onkeydown={() => {}}
                                            >
                                                <input
                                                    type="text"
                                                    bind:value={countrySearch}
                                                    placeholder="Search country..."
                                                    class="setup-country-search"
                                                />
                                                <div class="setup-country-list">
                                                    {#each COUNTRIES.filter((c) => !countrySearch || c.name
                                                                .toLowerCase()
                                                                .includes(countrySearch.toLowerCase()) || c.dialCode.includes(countrySearch)) as c}
                                                        <button
                                                            type="button"
                                                            class="setup-country-option {countryCode ===
                                                            c.code
                                                                ? 'setup-country-option-active'
                                                                : ''}"
                                                            onclick={() => {
                                                                countryCode =
                                                                    c.code;
                                                                countryOpen = false;
                                                                countrySearch =
                                                                    "";
                                                            }}
                                                        >
                                                            <span>{c.flag}</span
                                                            >
                                                            <span
                                                                class="setup-country-name"
                                                                >{c.name}</span
                                                            >
                                                            <span
                                                                class="setup-country-code"
                                                                >{c.dialCode}</span
                                                            >
                                                        </button>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                    <input
                                        id="phone"
                                        type="tel"
                                        bind:value={localPhone}
                                        placeholder="3-0000-0000"
                                        class="setup-input setup-phone-input"
                                    />
                                </div>
                            </div>

                            <!-- Owner email -->
                            <div class="setup-field">
                                <label for="owner-email" class="setup-label"
                                    >Owner email</label
                                >
                                <input
                                    id="owner-email"
                                    type="email"
                                    bind:value={ownerEmail}
                                    placeholder="you@example.com"
                                    class="setup-input {fieldErrors.ownerEmail
                                        ? 'setup-input-error'
                                        : ''}"
                                />
                                {#if fieldErrors.ownerEmail}<p
                                        class="setup-field-error"
                                    >
                                        {fieldErrors.ownerEmail}
                                    </p>{/if}
                            </div>
                        </div>

                        <!-- ── STEP 3 ── -->
                    {:else if currentStep === 3}
                        <div class="setup-step-header">
                            <p class="setup-step-tag">Step 3 of 3</p>
                            <h2 class="setup-step-title">Workspace settings</h2>
                            <p class="setup-step-desc">
                                Choose your plan and pick your timezone.
                            </p>
                        </div>

                        <div class="setup-fields">
                            <!-- Plan picker -->
                            <div class="setup-field">
                                <p class="setup-label">Plan</p>
                                <div class="setup-plan-grid">
                                    {#each PLANS as p}
                                        <button
                                            type="button"
                                            class="setup-plan-card {plan ===
                                            p.value
                                                ? 'setup-plan-active'
                                                : ''} {p.value === 'pro'
                                                ? 'setup-plan-recommended'
                                                : ''}"
                                            onclick={() => (plan = p.value)}
                                        >
                                            {#if p.badge}
                                                <span class="setup-plan-badge"
                                                    >{p.badge}</span
                                                >
                                            {/if}
                                            <div class="setup-plan-tier">
                                                {p.value === "free"
                                                    ? "Free"
                                                    : p.value === "pro"
                                                      ? "Pro"
                                                      : "Business"}
                                            </div>
                                            <div class="setup-plan-name">
                                                {p.name}
                                            </div>
                                            <div class="setup-plan-price">
                                                {p.price}<span
                                                    class="setup-plan-per"
                                                >
                                                    / mo</span
                                                >
                                            </div>
                                            <div class="setup-plan-note">
                                                {p.priceNote}
                                            </div>
                                            <hr class="setup-plan-divider" />
                                            <ul class="setup-plan-features">
                                                {#each p.features as f}
                                                    <li>{f}</li>
                                                {/each}
                                                {#each p.locked as f}
                                                    <li class="muted">{f}</li>
                                                {/each}
                                            </ul>
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <!-- Summary card -->
                            <div class="setup-summary">
                                <p
                                    class="setup-step-tag"
                                    style="margin-bottom:12px;"
                                >
                                    Summary
                                </p>
                                <div class="setup-summary-rows">
                                    <div class="setup-summary-row">
                                        <span>Organization</span><strong
                                            >{name}</strong
                                        >
                                    </div>
                                    <div class="setup-summary-row">
                                        <span>Type</span><span
                                            >{selectedBizType?.label}</span
                                        >
                                    </div>
                                    <div class="setup-summary-row">
                                        <span>Plan</span><span
                                            style="color:#b8956a;font-weight:600;"
                                            >{PLANS.find(
                                                (p) => p.value === plan,
                                            )?.name}</span
                                        >
                                    </div>
                                    <div class="setup-summary-row">
                                        <span>URL slug</span><code>/{slug}</code
                                        >
                                    </div>
                                </div>
                            </div>

                            {#if submitError}
                                <div class="setup-error-banner">
                                    <span
                                        class="material-symbols-rounded"
                                        style="color:#DC2626;font-size:18px;flex-shrink:0;"
                                        >error</span
                                    >
                                    <p>{submitError}</p>
                                </div>
                            {/if}
                        </div>

                        <!-- ── STEP 4: Done ── -->
                    {:else}
                        <div class="setup-done">
                            <div class="setup-done-icon">
                                <span
                                    class="material-symbols-rounded"
                                    style="font-size:40px;color:#B8956A;"
                                    >celebration</span
                                >
                            </div>
                            <h2 class="setup-done-title">
                                Your workspace is ready!
                            </h2>
                            <p class="setup-done-desc">
                                <strong>{name}</strong> has been set up. Invite staff
                                and start managing schedules.
                            </p>
                            <div class="setup-done-checklist">
                                {#each ["Organization created", "Workspace configured", "Schedule periods set up", "Owner account linked"] as item}
                                    <div class="setup-done-check-item">
                                        <div class="setup-done-check-circle">
                                            <span
                                                class="material-symbols-rounded"
                                                style="font-size:14px;color:#B8956A;"
                                                >check</span
                                            >
                                        </div>
                                        <span>{item}</span>
                                    </div>
                                {/each}
                            </div>
                            <button
                                class="setup-btn-primary"
                                onclick={goToDashboard}
                            >
                                Go to dashboard
                                <span
                                    class="material-symbols-rounded"
                                    style="font-size:16px;">arrow_forward</span
                                >
                            </button>
                        </div>
                    {/if}
                </div>
                <!-- /setup-form-content -->
            </div>
            <!-- /setup-scroll -->

            <!-- ── Side nav column ── -->
            {#if currentStep < TOTAL_STEPS}
                <div class="setup-side-nav">
                    <div class="setup-side-nav-inner">
                        <div class="setup-side-step-count">
                            {Math.min(currentStep, 3)}/3
                        </div>
                        <p class="setup-side-step-count-label">Steps</p>

                        <div class="setup-side-btn-group">
                            {#if currentStep < 3}
                                <button
                                    class="setup-btn-primary setup-btn-continue-tall setup-btn-block"
                                    onclick={nextStep}
                                >
                                    <span>Continue</span>
                                    <span
                                        class="material-symbols-rounded"
                                        style="color:#b8956a;font-size:24px;"
                                        >arrow_forward</span
                                    >
                                </button>
                            {:else}
                                <button
                                    class="setup-btn-gold setup-btn-continue-tall setup-btn-block"
                                    onclick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {#if submitting}
                                        <span
                                            class="material-symbols-rounded setup-spin"
                                            style="font-size:24px;"
                                            >progress_activity</span
                                        >
                                        <span>Setting up…</span>
                                    {:else}
                                        <span
                                            class="material-symbols-rounded"
                                            style="font-size:24px;"
                                            >rocket_launch</span
                                        >
                                        <span>Launch</span>
                                    {/if}
                                </button>
                            {/if}

                            {#if currentStep > 1}
                                <button
                                    class="setup-btn-back setup-btn-block"
                                    onclick={prevStep}
                                >
                                    Back
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        </div>
        <!-- /setup-main-area -->
    </div>
</div>

<style>
    /* ── Root layout ─────────────────────────────────────────── */
    .setup-root {
        display: flex;
        min-height: 100vh;
        background: #f7f7f6;
        font-family: "IBM Plex Sans", system-ui, sans-serif;
    }

    /* ── Sidebar ─────────────────────────────────────────────── */
    .setup-sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: 400px;
        height: 100vh;
        background: #1a2744;
        display: none;
        flex-direction: column;
        overflow-y: auto;
        z-index: 20;
    }
    @media (min-width: 1024px) {
        .setup-sidebar {
            display: flex;
        }
    }
    .setup-sidebar-dot-grid {
        position: absolute;
        inset: 0;
        background-image: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.08) 1px,
            transparent 1px
        );
        background-size: 24px 24px;
        pointer-events: none;
    }
    .setup-sidebar-dot-grid {
        display: none;
    }
    .setup-sidebar-inner {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 80px 48px;
    }
    .setup-sidebar-body {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    /* Logo */
    .setup-logo {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 64px;
    }
    .setup-logo-icon {
        width: 40px;
        height: 40px;
        background: #b8956a;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #1a2744;
        font-weight: 700;
        font-size: 22px;
        font-family: "Instrument Sans", sans-serif;
        flex-shrink: 0;
    }
    .setup-logo-text {
        color: white;
        font-weight: 600;
        font-size: 17px;
        font-family: "Instrument Sans", sans-serif;
    }

    /* Sidebar text */
    .setup-sidebar-label {
        color: #a8b8d8;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 16px;
    }
    .setup-sidebar-title {
        color: white;
        font-size: 26px;
        font-weight: 700;
        line-height: 1.35;
        margin-bottom: 12px;
        font-family: "Instrument Sans", sans-serif;
    }
    .setup-sidebar-accent {
        color: #b8956a;
    }
    .setup-sidebar-desc {
        color: #a8b8d8;
        font-size: 13px;
        line-height: 1.6;
        margin-bottom: 40px;
    }
    .setup-sidebar-footer {
        color: #a8b8d8;
        font-size: 11px;
        margin-top: auto;
        padding-top: 32px;
    }

    /* Step list */
    .setup-step-list {
        display: flex;
        flex-direction: column;
        gap: 32px;
        margin-top: 48px;
    }
    .setup-step-item {
        display: flex;
        align-items: center;
        gap: 20px;
    }
    .setup-step-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        flex-shrink: 0;
    }
    .setup-step-done {
        border-color: #b8956a;
        background: #b8956a;
        color: #1a2744;
    }
    .setup-step-active {
        border-color: #b8956a;
        background: transparent;
        color: #b8956a;
    }
    .setup-step-future {
        border-color: rgba(100, 116, 139, 0.5);
        color: rgba(100, 116, 139, 0.8);
        background: transparent;
        opacity: 0.4;
    }
    .setup-step-label {
        font-size: 18px;
        font-weight: 500;
        color: rgba(203, 213, 225, 0.8);
    }
    .setup-step-label-active {
        color: white;
        font-weight: 600;
    }

    /* ── Form panel ──────────────────────────────────────────── */
    .setup-form-panel {
        flex: 1;
        margin-left: 400px;
        margin-right: 240px;
        background: white;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }
    @media (max-width: 1023px) {
        .setup-form-panel {
            margin-left: 0;
            margin-right: 0;
        }
    }

    /* Progress bar */
    .setup-progress-track {
        position: sticky;
        top: 0;
        z-index: 10;
        height: 4px;
        background: #f1f5f9;
    }
    .setup-progress-fill {
        height: 100%;
        background: rgba(184, 149, 106, 0.6);
        transition: width 0.5s ease;
    }

    /* Mobile header */
    .setup-mobile-header {
        display: none;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        border-bottom: 1px solid #f3f4f6;
    }
    @media (max-width: 1023px) {
        .setup-mobile-header {
            display: flex;
        }
    }
    .setup-mobile-step {
        margin-left: auto;
        font-size: 12px;
        color: #9ca3af;
    }

    /* Scrollable area */
    .setup-main-area {
        flex: 1;
        display: flex;
        min-height: 0;
    }
    .setup-scroll {
        flex: 1;
        overflow-y: auto;
    }
    .setup-form-content {
        max-width: 56rem;
        margin: 0 auto;
        padding: 80px 64px;
    }

    /* Right side-nav (fixed) */
    .setup-side-nav {
        position: fixed;
        right: 0;
        top: 0;
        width: 240px;
        height: 100vh;
        background: white;
        border-left: 1px solid #f1f5f9;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 20;
    }
    .setup-side-nav-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        width: 100%;
        padding: 0 32px;
    }
    .setup-side-step-count {
        font-size: 18px;
        font-weight: 700;
        color: #1a2744;
        font-family: "Instrument Sans", sans-serif;
        line-height: 1;
        text-align: center;
    }
    .setup-side-step-count-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #94a3b8;
        text-align: center;
        margin-top: 4px;
    }
    .setup-btn-block {
        width: 100%;
        justify-content: center;
    }
    .setup-side-btn-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        margin-top: 32px;
    }
    .setup-btn-continue-tall {
        height: 56px;
        gap: 8px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
    }
    @media (max-width: 1023px) {
        .setup-side-nav {
            display: none;
        }
    }

    /* Step header */
    .setup-step-header {
        margin-bottom: 48px;
    }
    .setup-step-tag {
        font-size: 11px;
        font-weight: 600;
        color: #b8956a;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 8px;
    }
    .setup-step-title {
        font-size: 32px;
        font-weight: 700;
        color: #1a2744;
        font-family: "Instrument Sans", sans-serif;
        margin: 8px 0 12px;
    }
    .setup-step-desc {
        font-size: 18px;
        font-weight: 300;
        color: #64748b;
        margin-top: 0;
        line-height: 1.6;
    }

    /* Fields */
    .setup-fields {
        display: flex;
        flex-direction: column;
        gap: 32px;
    }
    .setup-field {
        display: flex;
        flex-direction: column;
    }
    .setup-row {
        display: flex;
        gap: 20px;
    }
    .setup-label {
        font-size: 11px;
        font-weight: 700;
        color: #1a2744;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        margin-bottom: 10px;
    }
    .setup-required {
        color: #dc2626;
    }
    .setup-field-hint {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 4px;
    }
    .setup-field-error {
        font-size: 12px;
        color: #dc2626;
        margin-top: 4px;
    }

    /* Inputs */
    .setup-input {
        width: 100%;
        height: 64px;
        padding: 0 18px;
        border: 1.5px solid #e5e7eb;
        border-radius: 12px;
        background: #fff;
        font-size: 15px;
        color: #1a2744;
        box-sizing: border-box;
        outline: none;
        font-family: inherit;
        transition:
            border-color 0.15s,
            box-shadow 0.15s;
        -webkit-appearance: none;
        appearance: none;
    }
    .setup-input:focus {
        border-color: #b8956a;
        box-shadow: 0 0 0 3px rgba(184, 149, 106, 0.15);
    }
    .setup-input-error {
        border-color: #dc2626;
        background: #fef2f2;
    }

    /* Slug row */
    .setup-slug-wrap {
        display: flex;
        border: 1.5px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
        transition:
            border-color 0.15s,
            box-shadow 0.15s;
    }
    .setup-slug-wrap:focus-within {
        border-color: #b8956a;
        box-shadow: 0 0 0 3px rgba(184, 149, 106, 0.15);
    }
    .setup-slug-error {
        border-color: #dc2626;
    }
    .setup-slug-prefix {
        padding: 0 18px;
        height: 64px;
        display: flex;
        align-items: center;
        font-size: 15px;
        color: #9ca3af;
        background: #f9fafb;
        border-right: 1.5px solid #e5e7eb;
        white-space: nowrap;
        flex-shrink: 0;
        user-select: none;
    }
    .setup-slug-input {
        flex: 1;
        padding: 0 18px;
        height: 62px;
        border: none;
        outline: none;
        font-size: 15px;
        font-family: inherit;
        color: #1a2744;
        background: transparent;
    }

    /* Business type grid */
    .setup-biz-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }
    .setup-biz-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 28px 16px;
        border-radius: 12px;
        border: 1.5px solid #e8e8e8;
        background: #fff;
        color: #6b7280;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
    }
    .setup-biz-card:hover {
        border-color: rgba(184, 149, 106, 0.4);
        background: #fdfaf7;
    }
    .setup-biz-card-active {
        border-color: #b8956a !important;
        background: #f5ede3 !important;
        color: #b8956a !important;
    }
    .setup-biz-icon {
        font-size: 28px;
        color: inherit;
    }

    /* Plan picker */
    .setup-plan-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        align-items: start;
    }
    .setup-plan-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0;
        padding: 22px 20px 24px;
        border-radius: 16px;
        border: 1.5px solid #e5e1da;
        background: #fff;
        text-align: left;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
        color: #1a2744;
    }
    .setup-plan-card:hover {
        border-color: rgba(184, 149, 106, 0.5);
        box-shadow: 0 2px 12px rgba(184, 149, 106, 0.08);
    }
    .setup-plan-recommended {
        border-color: #b8956a;
        box-shadow: 0 4px 20px rgba(184, 149, 106, 0.15);
    }
    .setup-plan-active {
        border-color: #b8956a !important;
        background: #fdfaf7 !important;
        box-shadow:
            0 0 0 3px rgba(184, 149, 106, 0.2),
            0 4px 20px rgba(184, 149, 106, 0.12) !important;
    }
    .setup-plan-badge {
        position: absolute;
        top: -11px;
        left: 50%;
        transform: translateX(-50%);
        background: #b8956a;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 3px 12px;
        border-radius: 99px;
        white-space: nowrap;
    }
    .setup-plan-tier {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #b8956a;
        margin-bottom: 4px;
    }
    .setup-plan-name {
        font-size: 16px;
        font-weight: 700;
        color: #1a2744;
        font-family: "Instrument Sans", sans-serif;
        margin-bottom: 10px;
    }
    .setup-plan-price {
        font-size: 22px;
        font-weight: 700;
        color: #1a2744;
        font-family: "IBM Plex Mono", monospace;
        line-height: 1;
    }
    .setup-plan-per {
        font-size: 12px;
        font-weight: 400;
        color: #9ca3af;
        font-family: "Instrument Sans", sans-serif;
    }
    .setup-plan-note {
        font-size: 11px;
        color: #b8956a;
        margin-top: 3px;
        margin-bottom: 14px;
        min-height: 16px;
    }
    .setup-plan-divider {
        border: none;
        border-top: 1px solid #f0ede8;
        width: 100%;
        margin-bottom: 14px;
    }
    .setup-plan-features {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 7px;
        width: 100%;
        padding: 0;
        margin: 0;
    }
    .setup-plan-features li {
        font-size: 12px;
        color: #374151;
        display: flex;
        gap: 7px;
        align-items: flex-start;
        line-height: 1.4;
    }
    .setup-plan-features li::before {
        content: "✓";
        color: #b8956a;
        font-weight: 700;
        font-size: 11px;
        flex-shrink: 0;
        margin-top: 1px;
    }
    .setup-plan-features li.muted {
        color: #9ca3af;
    }
    .setup-plan-features li.muted::before {
        content: "—";
        color: #d1cac0;
    }

    /* Phone + Country picker row */
    .setup-phone-row {
        display: flex;
        gap: 0;
        align-items: stretch;
        border: 1.5px solid #e5e7eb;
        border-radius: 12px;
        overflow: visible;
        transition:
            border-color 0.15s,
            box-shadow 0.15s;
    }
    .setup-phone-row:focus-within {
        border-color: #b8956a;
        box-shadow: 0 0 0 3px rgba(184, 149, 106, 0.15);
    }
    .setup-country-wrap {
        position: relative;
        flex-shrink: 0;
    }
    .setup-country-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 14px;
        height: 64px;
        background: #f9fafb;
        border: none;
        border-right: 1.5px solid #e5e7eb;
        border-radius: 10px 0 0 10px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        color: #1a2744;
        white-space: nowrap;
        transition: background 0.12s;
    }
    .setup-country-btn:hover {
        background: #f3f4f6;
    }
    .setup-country-dial {
        font-weight: 600;
        font-size: 14px;
        color: #1a2744;
    }
    .setup-phone-input {
        flex: 1;
        border: none !important;
        border-radius: 0 10px 10px 0 !important;
        box-shadow: none !important;
        height: 64px;
    }
    .setup-country-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        z-index: 50;
        width: 280px;
        background: #fff;
        border: 1.5px solid #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(26, 39, 68, 0.12);
        overflow: hidden;
    }
    .setup-country-search {
        width: 100%;
        padding: 12px 16px;
        border: none;
        border-bottom: 1px solid #f0ede8;
        font-size: 13px;
        font-family: inherit;
        color: #1a2744;
        outline: none;
        background: #fafafa;
    }
    .setup-country-list {
        max-height: 220px;
        overflow-y: auto;
    }
    .setup-country-option {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 16px;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        color: #374151;
        transition: background 0.1s;
    }
    .setup-country-option:hover {
        background: #f9fafb;
    }
    .setup-country-option-active {
        background: #fdfaf7;
        color: #b8956a;
        font-weight: 600;
    }
    .setup-country-name {
        flex: 1;
    }
    .setup-country-code {
        font-size: 12px;
        color: #9ca3af;
        font-weight: 500;
    }

    /* Summary card */
    .setup-summary {
        background: #f8f9fa;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 20px;
    }
    .setup-summary-rows {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .setup-summary-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #6b7280;
    }
    .setup-summary-row strong,
    .setup-summary-row code {
        color: #1a2744;
    }
    .setup-summary-row code {
        font-size: 12px;
        font-family: "IBM Plex Mono", monospace;
    }

    /* Error banner */
    .setup-error-banner {
        display: flex;
        gap: 10px;
        padding: 14px 16px;
        border-radius: 8px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        font-size: 13px;
        color: #dc2626;
    }

    /* Done screen */
    .setup-done {
        text-align: center;
        padding: 48px 0;
    }
    .setup-done-icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #f5ede3;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
    }
    .setup-done-title {
        font-size: 24px;
        font-weight: 700;
        color: #1a2744;
        margin-bottom: 8px;
        font-family: "Instrument Sans", sans-serif;
    }
    .setup-done-desc {
        font-size: 14px;
        color: #6b7280;
        max-width: 300px;
        margin: 0 auto 32px;
        line-height: 1.6;
    }
    .setup-done-checklist {
        background: #f8f9fa;
        border: 1px solid #e8e8e8;
        border-radius: 12px;
        padding: 20px;
        max-width: 320px;
        margin: 0 auto 32px;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .setup-done-check-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: #1a2744;
    }
    .setup-done-check-circle {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #f5ede3;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    /* Navigation */
    /* Navigation buttons */
    .setup-btn-back {
        padding: 10px 18px;
        border-radius: 6px;
        background: #f9fafb;
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
        border: 1px solid #e8e8e8;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: inherit;
        transition: background 0.15s;
    }
    .setup-btn-back:hover {
        background: #f3f4f6;
        color: #1a2744;
    }
    .setup-btn-primary {
        padding: 10px 24px;
        border-radius: 6px;
        background: #1a2744;
        color: white;
        font-size: 14px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: "Instrument Sans", sans-serif;
        transition: background 0.15s;
    }
    .setup-btn-primary:hover {
        background: #243561;
    }
    .setup-btn-gold {
        padding: 10px 24px;
        border-radius: 6px;
        background: #b8956a;
        color: white;
        font-size: 14px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: "Instrument Sans", sans-serif;
        transition: background 0.15s;
    }
    .setup-btn-gold:hover {
        background: #a07d55;
    }
    .setup-btn-gold:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
    .setup-spin {
        animation: spin 1s linear infinite;
    }
</style>
