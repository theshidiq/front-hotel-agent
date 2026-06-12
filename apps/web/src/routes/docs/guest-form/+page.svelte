<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Guest Allergen Form",
            h1: "Guest Allergen Form",
            intro: "A simple mobile page that hotel guests open from a link to confirm their reservation and tell you about any allergies or special requests before they arrive.",

            what_h2: "What is this page for?",
            what_p: "This is the only page in the system designed for guests, not staff. The hotel sends the guest a secure link (for example in the reservation confirmation email). When the guest opens it on their phone, they see their reservation details, choose any foods they need to avoid, and add notes. What they submit appears automatically on the front desk and kitchen screens.",

            card1_title: "Secure, personal link",
            card1_desc: "Each link contains a one-time token tied to a single reservation. The guest does not need to log in or create an account.",
            card2_title: "Easy allergen selection",
            card2_desc: "Allergens are shown as large tappable buttons grouped by type. The guest taps the ones to avoid — no typing required.",
            card3_title: "Saves straight to the system",
            card3_desc: "When the guest taps Save, their allergens and notes attach to the reservation and become visible to your team instantly.",

            flow_h2: "What the guest sees, step by step",
            flow_p: "The page guides the guest through three simple parts on one screen:",
            s1_title: "1 — Reservation details (予約情報)",
            s1_desc: "At the top, the guest sees their booking so they know it is theirs: name with “様”, room (お部屋), check-in (チェックイン), check-out (チェックアウト), party size (人数), and, if set, the plan (プラン) and meal plan (お食事). Once they are checked in, dinner time (夕食時間) and breakfast time (朝食時間) also appear.",
            s2_title: "2 — Allergy information (アレルギー情報)",
            s2_desc: "Under the heading “お食事でお避けになりたい食材をお選びください” (Please choose foods you would like to avoid), allergens appear as buttons grouped by category — 穀類 (grains), 卵 (egg), 乳製品 (dairy), 肉類 (meat), 魚介類 (fish), 甲殻類 (shellfish), ナッツ類 (nuts), 豆類 (legumes), その他 (other). Tapping a button turns it red to mark it selected; tapping again removes it. A red summary box (選択中のアレルギー) lists everything currently selected.",
            s3_title: "3 — Notes and requests (optional)",
            s3_desc: "Two optional text boxes follow: その他の食事制限・ご要望 (other dietary needs / requests — e.g. vegetarian or religious reasons) and 特別なリクエスト (special requests — e.g. a celebration or a high chair for a child).",

            save_h2: "Saving the form",
            save_p: "At the bottom is one large button: アレルギー情報を保存 (Save Allergy Information). When tapped it shows 保存中... (Saving…), then turns green and reads 保存しました (Saved). The guest can change their selections and save again as many times as they like before they arrive — the latest save is always the one kept.",

            req_h2: "Nothing is required",
            req_p: "Every field is optional. A guest with no allergies can simply tap Save, or even ignore the form. There are no error messages to worry about. If they need help, the footer reminds them to contact the front desk: “ご不明な点がございましたら、フロントまでお気軽にお問い合わせください。”",

            staff_h2: "For staff: how the link is created",
            staff_p: "Staff do not fill in this page. The reservation carries the token, and the same allergen choices can also be entered by staff during check-in on the Front Desk screen. Whatever the guest submits here shows up there automatically — so guests can fill it in ahead of time and save your team work at the desk.",

            states_h2: "If something goes wrong",
            st1: "読み込み中... (Loading…) — the page is fetching the reservation; this clears in a moment.",
            st2: "エラー (Error) — the link is invalid or expired. Ask the front desk for a fresh link.",

            nav_what: "What is it for?",
            nav_flow: "Step by step",
            nav_save: "Saving the form",
            nav_req: "Nothing is required",
            nav_staff: "For staff",
            nav_states: "If something goes wrong",
            nav_guest: "For guests",
            nav_staff_sec: "For staff",
        },
        ja: {
            badge: "ガイド",
            section: "ゲストアレルギー入力",
            h1: "ゲストアレルギー入力フォーム",
            intro: "ホテルのゲストがリンクから開く、シンプルなスマートフォン向けページです。到着前にご予約内容を確認し、アレルギーやご要望を入力していただけます。",

            what_h2: "このページの目的",
            what_p: "これはスタッフ用ではなく、ゲスト専用の唯一のページです。ホテルはゲストに安全なリンク（例：予約確認メール）を送ります。ゲストがスマートフォンで開くと、ご予約内容が表示され、避けたい食材を選び、メモを追加できます。送信内容はフロントと厨房の画面に自動的に反映されます。",

            card1_title: "安全な個別リンク",
            card1_desc: "各リンクには1つの予約に紐づくワンタイムトークンが含まれます。ゲストはログインやアカウント作成は不要です。",
            card2_title: "かんたんなアレルゲン選択",
            card2_desc: "アレルゲンは種類別の大きなボタンで表示されます。避けたいものをタップするだけで、入力は不要です。",
            card3_title: "そのままシステムへ保存",
            card3_desc: "ゲストが保存をタップすると、アレルゲンとメモが予約に紐づき、すぐにチームに表示されます。",

            flow_h2: "ゲストの操作手順",
            flow_p: "ページは1画面で3つのシンプルな手順を案内します：",
            s1_title: "1 — 予約情報",
            s1_desc: "上部に、ご自身の予約であることが分かるよう、お名前（様付き）、お部屋、チェックイン、チェックアウト、人数、設定があればプラン・お食事が表示されます。チェックイン後は夕食時間・朝食時間も表示されます。",
            s2_title: "2 — アレルギー情報",
            s2_desc: "「お食事でお避けになりたい食材をお選びください」の見出しの下に、カテゴリ別のボタンが表示されます — 穀類・卵・乳製品・肉類・魚介類・甲殻類・ナッツ類・豆類・その他。ボタンをタップすると赤くなり選択済みになります。再度タップで解除。赤い「選択中のアレルギー」ボックスに選択中のものが一覧表示されます。",
            s3_title: "3 — メモ・ご要望（任意）",
            s3_desc: "任意のテキスト欄が2つ続きます：その他の食事制限・ご要望（例：ベジタリアン、宗教上の理由）と、特別なリクエスト（例：お祝い、お子様用の椅子）。",

            save_h2: "フォームの保存",
            save_p: "下部に大きなボタンが1つあります：アレルギー情報を保存。タップすると「保存中...」と表示され、その後緑色になり「保存しました」と表示されます。到着前であれば何度でも変更・再保存でき、常に最新の保存内容が保持されます。",

            req_h2: "必須項目はありません",
            req_p: "すべての項目は任意です。アレルギーのないゲストは保存をタップするだけ、あるいはフォームを無視しても構いません。エラーメッセージを気にする必要はありません。お困りの際は、フッターにフロントへの問い合わせ案内が表示されます：「ご不明な点がございましたら、フロントまでお気軽にお問い合わせください。」",

            staff_h2: "スタッフ向け：リンクの作成について",
            staff_p: "スタッフはこのページを入力しません。予約がトークンを保持しており、同じアレルゲン選択はフロント画面のチェックイン時にスタッフが入力することもできます。ゲストがここで送信した内容はそちらに自動表示されるため、ゲストに事前入力してもらうことでフロント業務を軽減できます。",

            states_h2: "うまくいかないとき",
            st1: "読み込み中... — 予約情報を取得中です。まもなく表示されます。",
            st2: "エラー — リンクが無効または期限切れです。フロントに新しいリンクを依頼してください。",

            nav_what: "目的",
            nav_flow: "操作手順",
            nav_save: "フォームの保存",
            nav_req: "必須項目なし",
            nav_staff: "スタッフ向け",
            nav_states: "うまくいかないとき",
            nav_guest: "ゲスト向け",
            nav_staff_sec: "スタッフ向け",
        },
    };

    $: t = T[$lang];
</script>

<div class="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-57px)] bg-white">
    <article class="w-full px-8 xl:px-20 py-16 pb-32">
        <!-- Page Header -->
        <div id="overview" class="mb-14 pb-10 border-b border-slate-100">
            <div class="flex items-center gap-2 mb-5">
                <span class="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">{t.badge}</span>
                <span class="text-slate-300">/</span>
                <span class="text-sm text-slate-400 font-medium">{t.section}</span>
            </div>
            <h1 class="text-[2.75rem] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-5">{t.h1}</h1>
            <p class="text-lg text-slate-500 leading-[1.75] max-w-3xl">{t.intro}</p>
        </div>

        <!-- What is this -->
        <section id="what-is-this" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.what_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.what_p}</p>
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div class="p-5 rounded-xl border border-emerald-100 bg-emerald-50">
                    <h3 class="font-semibold text-emerald-900 text-sm mb-2">{t.card1_title}</h3>
                    <p class="text-sm text-emerald-800 leading-relaxed">{t.card1_desc}</p>
                </div>
                <div class="p-5 rounded-xl border border-sky-100 bg-sky-50">
                    <h3 class="font-semibold text-sky-900 text-sm mb-2">{t.card2_title}</h3>
                    <p class="text-sm text-sky-800 leading-relaxed">{t.card2_desc}</p>
                </div>
                <div class="p-5 rounded-xl border border-violet-100 bg-violet-50">
                    <h3 class="font-semibold text-violet-900 text-sm mb-2">{t.card3_title}</h3>
                    <p class="text-sm text-violet-800 leading-relaxed">{t.card3_desc}</p>
                </div>
            </div>
        </section>

        <!-- Step by step -->
        <section id="step-by-step" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.flow_h2}</h2>
            <p class="text-slate-500 leading-relaxed mb-8 max-w-3xl">{t.flow_p}</p>
            <div class="space-y-4 max-w-3xl">
                {#each [{ title: t.s1_title, desc: t.s1_desc }, { title: t.s2_title, desc: t.s2_desc }, { title: t.s3_title, desc: t.s3_desc }] as step}
                    <div class="p-5 rounded-xl border border-slate-100 bg-slate-50">
                        <h3 class="font-semibold text-slate-800 mb-1.5">{step.title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Saving -->
        <section id="saving" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.save_h2}</h2>
            <p class="text-slate-500 leading-relaxed max-w-3xl">{t.save_p}</p>
        </section>

        <!-- Required -->
        <section id="required" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.req_h2}</h2>
            <div class="max-w-3xl p-5 rounded-xl border border-emerald-100 bg-emerald-50">
                <p class="text-sm text-emerald-800 leading-relaxed">{t.req_p}</p>
            </div>
        </section>

        <!-- For staff -->
        <section id="for-staff" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.staff_h2}</h2>
            <p class="text-slate-500 leading-relaxed max-w-3xl">{t.staff_p}</p>
        </section>

        <!-- States -->
        <section id="states" class="mb-16">
            <h2 class="text-xl font-bold text-slate-900 mb-4">{t.states_h2}</h2>
            <div class="space-y-3 max-w-3xl">
                {#each [t.st1, t.st2] as st}
                    <div class="flex gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
                        <span class="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-slate-300"></span>
                        <p class="text-sm text-slate-600 leading-relaxed">{st}</p>
                    </div>
                {/each}
            </div>
        </section>

        <footer class="pt-8 border-t border-slate-100 text-sm text-slate-400 flex items-center justify-between">
            <span>Hotel Front Agent Docs</span>
            <span>&copy; 2026</span>
        </footer>
    </article>
</div>

<!-- Right ToC -->
<aside class="hidden xl:flex xl:flex-col w-56 shrink-0 bg-white border-l border-slate-200 overflow-y-auto pt-12 px-6 h-[calc(100vh-57px)] sticky top-[57px]">
    <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">{$lang === "en" ? "On this page" : "このページ"}</p>
    <nav class="flex flex-col gap-0.5 text-[13px]">
        <p class="text-[10px] font-semibold text-slate-300 uppercase tracking-widest px-3 mt-2 mb-1">{t.nav_guest}</p>
        <a href="#what-is-this" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_what}</a>
        <a href="#step-by-step" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_flow}</a>
        <a href="#saving" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_save}</a>
        <a href="#required" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_req}</a>
        <a href="#states" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_states}</a>
        <p class="text-[10px] font-semibold text-slate-300 uppercase tracking-widest px-3 mt-4 mb-1">{t.nav_staff_sec}</p>
        <a href="#for-staff" class="px-3 py-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">{t.nav_staff}</a>
    </nav>
</aside>
