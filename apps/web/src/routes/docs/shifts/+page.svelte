<script lang="ts">
    import { lang } from "$lib/stores/lang";

    const T = {
        en: {
            badge: "Feature Guide",
            section: "Shift Management",
            h1: "Shift Management",
            intro1:
                "Build and manage staff shift schedules with a visual grid, automated AI optimization, and fine-grained constraint rules — all from one screen.",
            intro2:
                "The system supports manual cell editing, drag-to-fill, copy/paste, and a one-click optimizer powered by OR-Tools CP-SAT that respects your daily limits, monthly quotas, staff groups, and priority preferences.",

            // Section 1 — Schedule Grid
            grid_h2: "The Schedule Grid",
            grid_p:
                "The main schedule is a transposed table: each column is a staff member and each row is a date in the selected period. Cells show the shift symbol assigned to that staff member on that date.",
            grid_staff_order_title: "Staff column order",
            grid_staff_order_desc:
                "Columns are sorted by employment status: 社員 (full-time) → 派遣 (temporary) → パート (part-time). Within each group, staff are ordered by their hire/start date.",
            grid_weekends_title: "Weekend highlighting",
            grid_weekends_desc:
                "Saturday and Sunday date headers are visually distinguished from weekdays.",
            grid_click_title: "Click a cell",
            grid_click_desc:
                "Click any cell to open a symbol picker dropdown. Choose a shift symbol to assign it. The cell updates instantly (optimistic update) and saves in the background.",
            grid_drag_title: "Drag to fill",
            grid_drag_desc:
                "Click and hold, then drag across multiple cells to select them. Release to apply the last chosen symbol to all selected cells at once.",
            grid_copypaste_title: "Copy / Paste",
            grid_copypaste_desc:
                "Press Ctrl+C to copy the current selection. Move to another cell and press Ctrl+V to paste the same symbol(s). Useful for repeating a pattern across weeks.",
            grid_arrow_title: "Arrow key navigation",
            grid_arrow_desc:
                "Use the arrow keys to move the active cell left, right, up, or down without touching the mouse.",
            grid_empty_title: "Empty states",
            grid_empty_desc:
                'If no staff exist for the department, the grid shows a prompt to add staff in settings. If no schedule data exists yet for the period, a prompt appears to run the auto-optimizer or add cells manually.',

            // Section 2 — Shift Symbols
            symbols_h2: "Shift Symbols & Legend",
            symbols_p:
                "Each cell displays one symbol representing the type of shift assigned. A legend below the grid shows all enabled symbols.",
            symbols_col_sym: "Symbol",
            symbols_col_label: "Label",
            symbols_col_meaning: "Meaning",
            symbols_col_scope: "Staff scope",
            sym_work_label: "出勤 (Work)",
            sym_work_meaning: "Standard work day (unmarked)",
            sym_work_scope: "All",
            sym_work_marked_label: "出勤 ○",
            sym_work_marked_meaning: "Standard work day (explicitly marked)",
            sym_work_marked_scope: "All",
            sym_off_label: "休み ×",
            sym_off_meaning: "Day off",
            sym_off_scope: "All",
            sym_early_label: "早番 △",
            sym_early_meaning: "Early shift",
            sym_early_scope: "社員, 派遣",
            sym_late_label: "遅番 ◇",
            sym_late_meaning: "Late shift",
            sym_late_scope: "社員 only",
            sym_mgmt_label: "管理 ★",
            sym_mgmt_meaning: "Management / designated holiday",
            sym_mgmt_scope: "社員 only",
            sym_special_label: "特別 ●",
            sym_special_meaning: "Special assignment",
            sym_special_scope: "社員 only",
            sym_priority_label: "優先 ◎",
            sym_priority_meaning: "Priority shift",
            sym_priority_scope: "社員 only",
            sym_backup_label: "予備 ▣",
            sym_backup_meaning: "Standby / reserve",
            sym_backup_scope: "社員 only",
            sym_unavail_label: "バックアップ ⊘",
            sym_unavail_meaning: "Unavailable (blocked date)",
            sym_unavail_scope: "パート only",
            symbols_note:
                "Default symbols can be relabelled and recoloured in Settings → Symbol Config. Custom symbols can also be added. Changes are reflected in the legend below the grid immediately.",

            // Section 3 — Toolbar & Controls
            toolbar_h2: "Toolbar & Controls",
            toolbar_p:
                "The toolbar appears above the schedule grid and contains the following controls:",
            toolbar_period_title: "Period picker",
            toolbar_period_desc:
                "A dropdown listing all available shift periods (e.g. 3月, 4月). The system auto-selects the period that contains today's date. Falls back to the most recent past period if today sits between periods.",
            toolbar_dept_title: "Department selector",
            toolbar_dept_desc:
                "If the organisation has multiple departments, a button group appears in the header to switch the active department. The schedule and staff list update immediately.",
            toolbar_optimize_title: "Auto Optimize (自動最適化)",
            toolbar_optimize_desc:
                "Triggers the OR-Tools CP-SAT solver to build an optimal schedule for the selected period. The button is disabled when: the optimizer service is offline, no period is selected, or optimization is already running. A progress overlay shows six stages while the solver runs.",
            toolbar_optimize_stages_title: "Optimization stages",
            toolbar_optimize_stages: [
                ["1", "初期化", "Loading staff and period data"],
                ["2", "制約チェック", "Validating and configuring constraints"],
                ["3", "モデル構築", "Building the CP-SAT model"],
                ["4", "OR-Tools最適化", "Searching for the optimal solution"],
                ["5", "解の抽出", "Assembling the schedule data"],
                ["6", "保存", "Saving the schedule"],
            ],
            toolbar_partial_title: "Partial result dialog",
            toolbar_partial_desc:
                "If the solver times out before finding an optimal solution, a dialog appears showing the best feasible schedule found so far along with any constraint violations. You can choose to Accept (apply this partial schedule) or Discard and retry with a longer timeout in Solver Config.",
            toolbar_violations_title: "Violations panel",
            toolbar_violations_desc:
                "After optimization completes, any soft-constraint violations are listed: the violation type, count, and penalty weight. A violation means a constraint was not fully satisfied but was penalised rather than rejected.",
            toolbar_cancel_title: "Cancel optimization",
            toolbar_cancel_desc:
                "While the optimizer is running, an Abort button appears. Click it to cancel the current solve. Any partially computed result is discarded.",
            toolbar_clear_title: "Clear schedule",
            toolbar_clear_desc:
                "The red Clear button (delete_sweep icon) erases ALL shift data for the selected period. A confirmation modal appears before deletion. This action cannot be undone.",
            toolbar_print_title: "Print",
            toolbar_print_desc:
                "Opens the browser print dialog with the current schedule formatted for printing.",
            toolbar_settings_title: "Settings",
            toolbar_settings_desc:
                "The tune icon in the top-right links to /shifts/settings where all shift configuration is managed.",
            toolbar_health_title: "Optimizer health indicator",
            toolbar_health_desc:
                "A green indicator shows the OR-Tools optimizer service is online. Red / Offline means the service is unreachable — optimization is disabled until it recovers. The status is polled every 30 seconds.",

            // Section 4 — Keyboard Shortcuts
            kb_h2: "Keyboard Shortcuts",
            kb_p:
                "When a cell is focused, the following keyboard shortcuts apply:",
            kb_col_key: "Key",
            kb_col_action: "Action",
            kb_shortcuts: [
                ["1", "Assign 早番 (△) early shift"],
                ["2", "Assign 出勤 (○) work"],
                ["3", "Assign 遅番 (◇) late shift"],
                ["4 or X", "Assign 休み (×) day off"],
                ["S", "Assign 管理 (★) management"],
                ["Space / Delete", "Clear the cell"],
                ["Escape", "Deselect all cells"],
                ["Ctrl + C", "Copy current selection"],
                ["Ctrl + V", "Paste into current selection"],
                ["Arrow keys", "Move active cell in any direction"],
            ],

            // Section 5 — Settings Overview
            settings_h2: "Settings",
            settings_p:
                'Click the tune icon (⚙) in the top-right of the shifts page to open the settings panel at /shifts/settings. The panel has 11 tabs on the left. Tabs marked with a blue 部署 badge are department-scoped — changes apply only to the currently selected department. Unmarked tabs are global and shared across all departments.',
            settings_dept_badge: "Department-scoped tabs",
            settings_global_badge: "Global tabs",
            settings_dept_tabs:
                "Groups, Backup Coverage, Shift Capabilities, Unavailability, Daily & Monthly Limits, Priority Rules, Calendar Rules, Early Shift",
            settings_global_tabs: "Periods, Solver Config, Symbol Config",

            // Section 6 — Groups
            groups_h2: "Settings: Groups (グループ)",
            groups_p:
                "Staff groups are named collections of staff members. The optimizer uses groups to enforce coverage rules — for example, ensuring at least one member of a group is always assigned to a work shift.",
            groups_create_title: "Create a group",
            groups_create_desc:
                "Click Add Group. Fill in Name (required), Description (optional), and Color (optional hex color for visual identification). Then select members from the staff list.",
            groups_edit_title: "Edit a group",
            groups_edit_desc:
                "Click the edit icon on a group card to modify its name, description, color, or member list.",
            groups_delete_title: "Delete a group",
            groups_delete_desc:
                "Click the delete icon and confirm. Deleting a group removes it from optimizer constraints.",

            // Section 7 — Backup Coverage
            backup_h2: "Settings: Backup Coverage (バックアップ)",
            backup_p:
                "A backup assignment links a staff member as a backup for a specific group. When the group's primary members are unavailable, the optimizer can assign the backup staff instead.",
            backup_fields_title: "Fields",
            backup_fields: [
                ["Staff", "The backup staff member"],
                ["Group", "The group this staff covers"],
                ["Priority order", "If multiple backups cover the same group, lower numbers have higher priority"],
                ["Active", "Toggle to enable or disable this backup assignment"],
            ],
            backup_crud: "Use the Add Backup button to create, and the edit/delete icons to update or remove assignments.",

            // Section 8 — Shift Capabilities
            caps_h2: "Settings: Shift Capabilities (シフト能力)",
            caps_p:
                "Controls which staff members are eligible to be assigned to early shifts (早番) or late shifts (遅番). If a staff member is not eligible, the optimizer will never assign them that shift type.",
            caps_toggles_title: "Toggles per staff member",
            caps_toggle1: "Can work early shift (早番可) — enables early shift assignment",
            caps_toggle2: "Can work late shift (遅番可) — enables late shift assignment",
            caps_bulk_title: "Bulk update",
            caps_bulk_desc:
                "Select multiple staff with the checkboxes and use the bulk action toolbar to enable or disable a capability for all selected staff at once.",

            // Section 9 — Unavailability
            unavail_h2: "Settings: Unavailability (休暇設定)",
            unavail_p:
                "Mark specific dates when a staff member cannot work. The optimizer treats these as hard blocks — it will not assign any shift to that staff member on those dates.",
            unavail_add_title: "Add unavailability",
            unavail_add_desc:
                "Select a staff member, pick a date or date range, and optionally enter a reason (e.g. vacation, 病気, 出張). Click Save.",
            unavail_bulk_title: "Bulk add",
            unavail_bulk_desc:
                "To block multiple dates at once for the same staff member, use the Bulk Add option — select the staff member, then pick multiple dates from the calendar. All selected dates are saved in one action.",
            unavail_delete_title: "Delete an entry",
            unavail_delete_desc:
                "Click the delete icon next to any entry in the list. The block is removed immediately.",

            // Section 10 — Limits
            limits_h2: "Settings: Limits (制限設定)",
            limits_p:
                "Configure how many staff must work, be off, or take early shifts each day, and how many shifts each staff member should work each month.",
            limits_daily_h3: "Daily Limits",
            limits_daily_p:
                "These limits apply to each calendar date in the schedule.",
            limits_daily_fields: [
                ["Min off per day", "Minimum number of staff on a day off per day"],
                ["Max off per day", "Maximum number of staff on a day off per day"],
                ["Min early per day", "Minimum number of early-shift assignments per day"],
                ["Max early per day", "Maximum number of early-shift assignments per day"],
                ["Min working staff per day", "Minimum total staff who must be working (not off) per day"],
                ["Hard constraint", "If enabled, the optimizer will reject any solution that violates this limit rather than just penalising it"],
            ],
            limits_monthly_h3: "Monthly Limits",
            limits_monthly_p:
                "Monthly limits define how many shifts a staff member should work within a period. Multiple records can exist with different scopes.",
            limits_monthly_scopes_title: "Scope options",
            limits_monthly_scopes: [
                ["All", "Default global limit that applies to every staff member"],
                ["Staff status", "Applies only to staff of a specific employment type (社員, 派遣, or パート)"],
                ["Individual", "Applies to a specific named staff member"],
            ],
            limits_monthly_fields: [
                ["Min count", "Minimum number of working shifts per period"],
                ["Max count", "Maximum number of working shifts per period"],
                ["Hard constraint", "Enforce strictly (no violations allowed) vs soft (penalised)"],
                ["Exclude calendar rules", "If enabled, dates marked as must_work in Calendar Rules are not counted toward the monthly total"],
            ],
            limits_monthly_crud: "Use Add to create a new limit record. Multiple records can coexist — e.g. a global default plus an individual override for one staff member.",

            // Section 11 — Priority Rules
            priority_h2: "Settings: Priority Rules (優先ルール)",
            priority_p:
                "Priority rules instruct the optimizer to prefer or avoid certain shift types for specific staff on specific days of the week. They can be hard (must comply) or soft (penalised if violated).",
            priority_rule_types_title: "Rule types",
            priority_rule_types: [
                ["preferred_shift", "Try to assign this shift type on the specified days"],
                ["avoid_shift", "Try NOT to assign this shift type on the specified days"],
                ["required_off", "Staff MUST have a day off on the specified days (hard by default)"],
                ["avoid_shift_with_exceptions", "Avoid this shift, but allow the listed exception shifts"],
            ],
            priority_shift_types_title: "Shift types",
            priority_shift_types: "early, late, off, any",
            priority_fields: [
                ["Name", "A label for this rule (required)"],
                ["Staff", "Which staff members this rule applies to"],
                ["Rule type", "See rule types above"],
                ["Shift type", "Which shift to prefer/avoid"],
                ["Days of week", "Days this rule applies (Sun=0 through Sat=6), multi-select"],
                ["Effective from / until", "Optional date range for the rule to be active"],
                ["Hard constraint", "Enforce strictly vs penalise"],
                ["Penalty weight", "How heavily to penalise violations (soft constraints only)"],
            ],

            // Section 12 — Calendar Rules
            calendar_h2: "Settings: Calendar Rules (カレンダー)",
            calendar_p:
                "Calendar rules force all staff to either work or have a day off on a specific date. They take effect globally across all staff in the department.",
            calendar_types_title: "Rule types",
            calendar_must_work: "must_work — all staff must be assigned a work shift on this date (shown in green)",
            calendar_must_off: "must_day_off — all staff must be assigned a day off on this date (shown in red)",
            calendar_fields: [
                ["Date", "The specific date this rule applies to (YYYY-MM-DD)"],
                ["Rule type", "must_work or must_day_off"],
                ["Reason", "Optional description (e.g. 元旦, Store closure, Special event)"],
            ],
            calendar_note:
                "When you run optimization, must_day_off dates are pre-filled with × before the solver runs. must_work dates can be excluded from monthly limit counts using the Exclude calendar rules option in Monthly Limits.",

            // Section 13 — Early Shift
            early_h2: "Settings: Early Shift (早番設定)",
            early_p:
                "Fine-grained control over which staff can be assigned early shifts (△). This complements the Shift Capabilities tab — while capabilities set a blanket eligibility, Early Shift preferences can override eligibility for specific dates.",
            early_bulk_title: "Bulk assign",
            early_bulk_desc:
                "Use the Allow Early Shift / Disallow Early Shift bulk buttons to set early shift eligibility for multiple staff at once.",
            early_individual_title: "Individual preference",
            early_individual_desc:
                "Toggle the early shift flag per staff member. Optionally restrict the preference to a specific date (leave blank to apply it to all dates).",

            // Section 14 — Periods
            periods_h2: "Settings: Periods (期間設定)",
            periods_p:
                "A period defines the date range of one scheduling cycle. Periods are listed in the period picker on the main shifts page.",
            periods_config_title: "Period configuration",
            periods_config_desc:
                "Set the start day and end day of month that define the recurring period cycle (e.g. start day 16, end day 15 means the 16th of one month to the 15th of the next).",
            periods_config_fields: [
                ["Start day", "Day of month (1–31) when each period begins"],
                ["End day", "Day of month (1–31) when each period ends"],
            ],
            periods_regen_title: "Regenerate periods",
            periods_regen_desc:
                "Click Regenerate Periods to auto-create all future periods based on the current start/end day configuration. Existing periods are not modified.",
            periods_manual_title: "Create a period manually",
            periods_manual_desc:
                "Fill in Label (e.g. 3月), Start date, and End date. Click Save to add the period.",
            periods_delete_title: "Delete a period",
            periods_delete_desc:
                "Click the delete icon next to a period. A confirmation dialog appears. Deleting a period also removes all associated schedule data.",

            // Section 15 — Solver Config
            solver_h2: "Settings: Solver Config (ソルバー設定)",
            solver_p:
                "Configure how the OR-Tools CP-SAT optimizer behaves. Changes here affect the next time you click Auto Optimize.",
            solver_penalty_h3: "Penalty Weights",
            solver_penalty_p:
                "Each weight controls how heavily a soft-constraint violation is penalised. Higher values make the optimizer work harder to avoid that violation.",
            solver_penalty_fields: [
                ["staffGroup", "Penalty for failing to satisfy a staff group coverage rule"],
                ["fiveDayRest", "Penalty for scheduling more than 5 consecutive working days without a rest day"],
                ["monthlyLimit", "Penalty for exceeding or falling below the monthly shift count limit"],
                ["dailyLimitMax", "Penalty for exceeding the daily maximum staff count limit"],
                ["dailyLimitMin", "Penalty for falling below the daily minimum staff count limit"],
                ["adjacentConflict", "Penalty for assigning conflicting adjacent shift types (e.g. late shift followed immediately by early shift)"],
            ],
            solver_hard_h3: "Hard Constraints",
            solver_hard_p:
                "Toggle each constraint to be strictly enforced (hard) rather than penalised (soft). A hard constraint must be satisfied — if it cannot be, the optimizer will report no feasible solution.",
            solver_hard_fields: [
                ["Daily Limits", "Enforce daily min/max staff counts strictly"],
                ["Five-day rest", "Enforce maximum 5 consecutive working days strictly"],
                ["Staff groups", "Enforce group coverage rules strictly"],
                ["Monthly limits", "Enforce monthly shift count limits strictly"],
            ],
            solver_settings_h3: "Solver Settings",
            solver_settings_fields: [
                ["Timeout (seconds)", "Maximum time the solver runs before stopping. Default is 30 seconds. Increase for larger schedules or complex constraints"],
                ["Number of workers", "Number of parallel solver threads. More workers can find solutions faster on multi-core machines"],
                ["Disable staff status restrictions", "If enabled, employment-type-based shift restrictions (e.g. パート cannot do late shifts) are ignored"],
                ["Post-period constraints", "After a defined number of consecutive closure days, restrict certain shift assignments in the days following. Configurable: enabled toggle, number of days, hard/soft, minimum closure length to trigger"],
                ["Disable adjacent conflict", "If enabled, the adjacentConflict penalty is not applied"],
            ],

            // Section 16 — Symbol Config
            symconfig_h2: "Settings: Symbol Config (シンボル設定)",
            symconfig_p:
                "Customise the shift symbols used in the schedule grid. Changes are reflected in the legend below the grid and in the cell dropdown picker.",
            symconfig_defaults_title: "Default symbols",
            symconfig_defaults_desc:
                "The 9 built-in symbols (○, ×, △, ◇, ★, ●, ◎, ▣, ⊘) cannot be deleted but can be relabelled and recoloured, and can be enabled or disabled.",
            symconfig_custom_title: "Add a custom symbol",
            symconfig_custom_desc:
                "Click Add Symbol. Enter a symbol character (single character, emoji, or short string), a Japanese label, and pick a color. Click Save.",
            symconfig_fields: [
                ["Symbol", "The character displayed in the cell"],
                ["Label", "Japanese text shown in the legend and picker (max 20 characters)"],
                ["Color", "Hex color used to render the symbol in the grid"],
                ["Enabled", "Toggles whether this symbol appears in the picker and legend"],
            ],
            symconfig_delete_title: "Delete a custom symbol",
            symconfig_delete_desc:
                "Custom symbols can be deleted with the delete icon. Default symbols cannot be deleted.",

            // Developer divider
            dev_note:
                "The sections below are for developers building integrations or LLM wrappers.",

            // Section 17 — API Endpoints
            api_h2: "API Endpoints",
            api_p:
                "The NestJS backend (apps/api, port 3002) exposes all shift operations as REST endpoints under /shifts. All endpoints require JWT authentication.",
            api_schedule: "Schedule",
            api_optimization: "Optimization",
            api_staff: "Staff",
            api_periods: "Periods",
            api_settings: "Settings",
            api_note_throttle:
                "POST /shifts/optimize is rate-limited to 5 requests per 60 seconds to prevent abuse of the solver.",

            // Section 18 — LLM Tooling
            llm_h2: "LLM Function Tooling",
            llm_p:
                "Recommended tool definitions for LLM function calling against the shift management system:",
            llm_warning:
                "Schedule data uses Japanese shift symbols (×, △, ◇, ★, ●, ◎, ▣, ⊘). LLM integrations must handle these characters correctly when reading or writing cell values.",

            // Nav labels
            nav_overview: "Overview",
            nav_grid: "Schedule Grid",
            nav_symbols: "Shift Symbols",
            nav_toolbar: "Toolbar & Controls",
            nav_kb: "Keyboard Shortcuts",
            nav_settings: "Settings",
            nav_groups: "Groups",
            nav_backup: "Backup Coverage",
            nav_caps: "Shift Capabilities",
            nav_unavail: "Unavailability",
            nav_limits: "Daily & Monthly Limits",
            nav_priority: "Priority Rules",
            nav_calendar: "Calendar Rules",
            nav_early: "Early Shift",
            nav_periods: "Periods",
            nav_solver: "Solver Config",
            nav_symconfig: "Symbol Config",
            nav_api: "API Endpoints",
            nav_llm: "LLM Tooling",
            nav_everyone: "For everyone",
            nav_dev: "Developer",
        },
        ja: {
            badge: "ガイド",
            section: "シフト管理",
            h1: "シフト管理",
            intro1:
                "ビジュアルグリッド・AI自動最適化・詳細な制約ルールで、スタッフのシフトスケジュールを効率よく作成・管理します。",
            intro2:
                "セルの手動編集、ドラッグ入力、コピー＆ペースト、そしてOR-Tools CP-SATによる一括最適化に対応。日次・月次の上限、スタッフグループ、優先ルールをすべて考慮します。",

            // Section 1
            grid_h2: "スケジュールグリッド",
            grid_p:
                "メインのスケジュール表は転置テーブル形式です。列がスタッフ、行が日付、セルにはそのスタッフの各日のシフトシンボルが表示されます。",
            grid_staff_order_title: "スタッフ列の順序",
            grid_staff_order_desc:
                "列は雇用形態の順に並びます：社員 → 派遣 → パート。各グループ内では入社日・開始日の順に並びます。",
            grid_weekends_title: "週末のハイライト",
            grid_weekends_desc:
                "土曜日・日曜日の日付ヘッダーは、平日と異なる色で表示されます。",
            grid_click_title: "セルをクリック",
            grid_click_desc:
                "セルをクリックするとシンボル選択ドロップダウンが開きます。シンボルを選ぶと即座に反映（楽観的更新）され、バックグラウンドで保存されます。",
            grid_drag_title: "ドラッグで一括入力",
            grid_drag_desc:
                "セルをクリックしたままドラッグして複数セルを選択し、離すと最後に選んだシンボルが一括で適用されます。",
            grid_copypaste_title: "コピー・ペースト",
            grid_copypaste_desc:
                "Ctrl+C で選択範囲をコピーし、別のセルに移動して Ctrl+V でペーストします。同じパターンを週ごとに繰り返す際に便利です。",
            grid_arrow_title: "矢印キーで移動",
            grid_arrow_desc:
                "矢印キーでマウスを使わずにアクティブセルを上下左右に移動できます。",
            grid_empty_title: "空の状態",
            grid_empty_desc:
                "部署にスタッフがいない場合は設定への誘導が表示されます。スケジュールデータが未入力の場合は、自動最適化の実行または手動入力への誘導が表示されます。",

            // Section 2
            symbols_h2: "シフトシンボルと凡例",
            symbols_p:
                "各セルにはシフトの種類を表すシンボルが表示されます。グリッド下部の凡例には有効なシンボルの一覧が表示されます。",
            symbols_col_sym: "シンボル",
            symbols_col_label: "ラベル",
            symbols_col_meaning: "意味",
            symbols_col_scope: "対象スタッフ",
            sym_work_label: "出勤",
            sym_work_meaning: "通常出勤（未記入）",
            sym_work_scope: "全員",
            sym_work_marked_label: "出勤 ○",
            sym_work_marked_meaning: "通常出勤（明示的に記入）",
            sym_work_marked_scope: "全員",
            sym_off_label: "休み ×",
            sym_off_meaning: "休日",
            sym_off_scope: "全員",
            sym_early_label: "早番 △",
            sym_early_meaning: "早番シフト",
            sym_early_scope: "社員・派遣",
            sym_late_label: "遅番 ◇",
            sym_late_meaning: "遅番シフト",
            sym_late_scope: "社員のみ",
            sym_mgmt_label: "管理 ★",
            sym_mgmt_meaning: "管理業務・指定休",
            sym_mgmt_scope: "社員のみ",
            sym_special_label: "特別 ●",
            sym_special_meaning: "特別対応",
            sym_special_scope: "社員のみ",
            sym_priority_label: "優先 ◎",
            sym_priority_meaning: "優先出勤",
            sym_priority_scope: "社員のみ",
            sym_backup_label: "予備 ▣",
            sym_backup_meaning: "予備・控え",
            sym_backup_scope: "社員のみ",
            sym_unavail_label: "バックアップ ⊘",
            sym_unavail_meaning: "出勤不可",
            sym_unavail_scope: "パートのみ",
            symbols_note:
                "デフォルトシンボルは設定→シンボル設定でラベルと色を変更できます。カスタムシンボルの追加も可能です。変更は凡例にすぐ反映されます。",

            // Section 3
            toolbar_h2: "ツールバーと操作",
            toolbar_p:
                "スケジュールグリッド上部のツールバーに以下の操作ボタンが並んでいます：",
            toolbar_period_title: "期間ピッカー",
            toolbar_period_desc:
                "利用可能なシフト期間（例：3月、4月）のドロップダウンです。本日の日付が含まれる期間が自動で選択されます。本日が期間の間にある場合は直近の過去期間が選ばれます。",
            toolbar_dept_title: "部署セレクター",
            toolbar_dept_desc:
                "複数部署がある場合、ヘッダーにボタングループが表示されます。切り替えるとスケジュールとスタッフ一覧が即座に更新されます。",
            toolbar_optimize_title: "自動最適化",
            toolbar_optimize_desc:
                "OR-Tools CP-SATソルバーを起動して選択期間のスケジュールを自動生成します。オプティマイザーがオフライン、期間未選択、または最適化実行中の場合はボタンが無効になります。実行中は6段階の進捗オーバーレイが表示されます。",
            toolbar_optimize_stages_title: "最適化ステージ",
            toolbar_optimize_stages: [
                ["1", "初期化", "スタッフ・日程データ読み込み中"],
                ["2", "制約チェック", "制約条件を検証・構成中"],
                ["3", "モデル構築", "CP-SATモデルを構築中"],
                ["4", "OR-Tools最適化", "最適解を探索中"],
                ["5", "解の抽出", "スケジュールデータを構成中"],
                ["6", "保存", "スケジュールを保存中"],
            ],
            toolbar_partial_title: "部分解ダイアログ",
            toolbar_partial_desc:
                "制限時間内に最適解が見つからなかった場合、現時点での最良のスケジュール（部分解）と制約違反の一覧がダイアログに表示されます。この部分解を適用するか、タイムアウトを延長して再試行するかを選択できます。",
            toolbar_violations_title: "制約違反パネル",
            toolbar_violations_desc:
                "最適化後、ソフト制約の違反内容（種類・件数・ペナルティ重み）が一覧表示されます。違反がある場合でも、解は適用可能です。",
            toolbar_cancel_title: "最適化のキャンセル",
            toolbar_cancel_desc:
                "最適化実行中は「中断」ボタンが表示されます。クリックすると計算を中止し、部分結果は破棄されます。",
            toolbar_clear_title: "スケジュールクリア",
            toolbar_clear_desc:
                "赤いクリアボタン（delete_sweepアイコン）を押すと、選択期間のシフトデータがすべて削除されます。削除前に確認モーダルが表示されます。この操作は元に戻せません。",
            toolbar_print_title: "印刷",
            toolbar_print_desc:
                "ブラウザの印刷ダイアログが開き、現在のスケジュールが印刷フォーマットで表示されます。",
            toolbar_settings_title: "設定",
            toolbar_settings_desc:
                "右上のtuneアイコンが /shifts/settings にリンクしています。すべてのシフト設定はここで管理します。",
            toolbar_health_title: "オプティマイザー稼働状況",
            toolbar_health_desc:
                "緑のインジケーターはOR-Toolsサービスがオンラインであることを示します。赤（オフライン）の場合、サービスに接続できず最適化ボタンが無効になります。30秒ごとにポーリングで確認されます。",

            // Section 4
            kb_h2: "キーボードショートカット",
            kb_p:
                "セルがフォーカスされているとき、以下のキーボードショートカットが使えます：",
            kb_col_key: "キー",
            kb_col_action: "操作",
            kb_shortcuts: [
                ["1", "早番（△）を割り当て"],
                ["2", "出勤（○）を割り当て"],
                ["3", "遅番（◇）を割り当て"],
                ["4 または X", "休み（×）を割り当て"],
                ["S", "管理（★）を割り当て"],
                ["Space / Delete", "セルをクリア"],
                ["Escape", "選択を解除"],
                ["Ctrl + C", "選択範囲をコピー"],
                ["Ctrl + V", "貼り付け"],
                ["矢印キー", "アクティブセルを移動"],
            ],

            // Section 5
            settings_h2: "設定",
            settings_p:
                "シフトページ右上のtuneアイコン（⚙）をクリックすると /shifts/settings が開きます。左側に11個のタブが並んでいます。青い「部署」バッジが付いたタブは部署スコープ（選択中の部署のみに適用）、バッジなしのタブはグローバル（全部署共通）です。",
            settings_dept_badge: "部署スコープのタブ",
            settings_global_badge: "グローバルタブ",
            settings_dept_tabs:
                "グループ・バックアップ・シフト能力・休暇設定・制限設定・優先ルール・カレンダー・早番設定",
            settings_global_tabs: "期間設定・ソルバー設定・シンボル設定",

            // Section 6
            groups_h2: "設定：グループ（グループ）",
            groups_p:
                "スタッフグループは、オプティマイザーがカバレッジルールを適用するために使うスタッフの集合です。例えば「あるグループから必ず1人以上出勤する」といったルールに使用します。",
            groups_create_title: "グループを作成",
            groups_create_desc:
                "「グループを追加」をクリックし、グループ名（必須）・説明（任意）・カラー（任意）を入力し、スタッフリストからメンバーを選択して保存します。",
            groups_edit_title: "グループを編集",
            groups_edit_desc:
                "グループカードの編集アイコンをクリックして、名前・説明・色・メンバーを変更します。",
            groups_delete_title: "グループを削除",
            groups_delete_desc:
                "削除アイコンをクリックして確認します。グループを削除するとオプティマイザーの制約からも除外されます。",

            // Section 7
            backup_h2: "設定：バックアップカバレッジ",
            backup_p:
                "バックアップ割り当ては、特定のグループのカバーとして特定のスタッフを指定します。グループのメインスタッフが不在の場合、オプティマイザーがバックアップスタッフを代わりに割り当てることができます。",
            backup_fields_title: "項目",
            backup_fields: [
                ["スタッフ", "バックアップを担当するスタッフ"],
                ["グループ", "カバーするグループ"],
                ["優先順位", "同じグループに複数のバックアップがいる場合、数値が小さいほど優先度が高い"],
                ["有効", "このバックアップ割り当てを有効・無効にするトグル"],
            ],
            backup_crud: "「バックアップを追加」ボタンで新規作成し、編集・削除アイコンで変更・削除します。",

            // Section 8
            caps_h2: "設定：シフト能力",
            caps_p:
                "各スタッフが早番（早番）や遅番（遅番）に対応できるかどうかを設定します。対応不可に設定されたスタッフは、オプティマイザーがそのシフトタイプを割り当てません。",
            caps_toggles_title: "スタッフごとのトグル",
            caps_toggle1: "早番可 — 早番シフトの割り当てを許可",
            caps_toggle2: "遅番可 — 遅番シフトの割り当てを許可",
            caps_bulk_title: "一括更新",
            caps_bulk_desc:
                "チェックボックスで複数のスタッフを選択し、一括操作ツールバーから能力の有効・無効をまとめて変更できます。",

            // Section 9
            unavail_h2: "設定：休暇設定",
            unavail_p:
                "スタッフが出勤できない日を指定します。オプティマイザーはこの日にそのスタッフのシフトを割り当てません（ハード制約）。",
            unavail_add_title: "不在日を追加",
            unavail_add_desc:
                "スタッフを選択し、日付または日付範囲を選び、理由（例：休暇、病気、出張）を任意で入力して保存します。",
            unavail_bulk_title: "一括追加",
            unavail_bulk_desc:
                "同じスタッフの複数の日を一度にブロックするには、一括追加を使用します。スタッフを選択してカレンダーから複数の日付を選ぶと、一度の操作で保存されます。",
            unavail_delete_title: "エントリを削除",
            unavail_delete_desc:
                "一覧の削除アイコンをクリックするとブロックがすぐに解除されます。",

            // Section 10
            limits_h2: "設定：制限設定",
            limits_p:
                "1日あたりの出勤・休み・早番の人数と、1か月あたりの各スタッフのシフト数を設定します。",
            limits_daily_h3: "日次制限",
            limits_daily_p:
                "スケジュール内の各日付に適用される制限です。",
            limits_daily_fields: [
                ["最小休み人数", "1日の休みスタッフの最小人数"],
                ["最大休み人数", "1日の休みスタッフの最大人数"],
                ["最小早番人数", "1日の早番スタッフの最小人数"],
                ["最大早番人数", "1日の早番スタッフの最大人数"],
                ["最小出勤人数", "1日あたりの最低出勤人数（休み以外）"],
                ["ハード制約", "有効にすると、この制限を違反する解は採用されません（ペナルティではなく却下）"],
            ],
            limits_monthly_h3: "月次制限",
            limits_monthly_p:
                "月次制限は、各スタッフが1期間に何シフト働くかを定義します。スコープの異なる複数のレコードを作成できます。",
            limits_monthly_scopes_title: "スコープの種類",
            limits_monthly_scopes: [
                ["全員", "全スタッフに適用されるデフォルトの制限"],
                ["雇用形態", "特定の雇用形態（社員・派遣・パート）のみに適用"],
                ["個人", "特定のスタッフ1名に適用"],
            ],
            limits_monthly_fields: [
                ["最小シフト数", "1期間の最低出勤シフト数"],
                ["最大シフト数", "1期間の最高出勤シフト数"],
                ["ハード制約", "厳密に守る（違反なし）か、ソフト（ペナルティ付き）かを選択"],
                ["カレンダールールを除外", "有効にすると、カレンダールールの「出勤必須」日は月次カウントに含まれません"],
            ],
            limits_monthly_crud: "「追加」で新しいレコードを作成できます。複数のレコードを共存させることができます（例：全体のデフォルト＋個人の上書き）。",

            // Section 11
            priority_h2: "設定：優先ルール",
            priority_p:
                "優先ルールは、特定のスタッフが特定の曜日に特定のシフトタイプを優先または回避するようオプティマイザーに指示します。ハード（必須）またはソフト（ペナルティ付き）として設定できます。",
            priority_rule_types_title: "ルールタイプ",
            priority_rule_types: [
                ["preferred_shift", "指定した曜日にこのシフトタイプを優先して割り当てる"],
                ["avoid_shift", "指定した曜日にこのシフトタイプをなるべく割り当てない"],
                ["required_off", "指定した曜日は必ず休みにする（デフォルトでハード制約）"],
                ["avoid_shift_with_exceptions", "このシフトは回避するが、例外として許可するシフトを指定できる"],
            ],
            priority_shift_types_title: "シフトタイプ",
            priority_shift_types: "early（早番）、late（遅番）、off（休み）、any（すべて）",
            priority_fields: [
                ["名前", "このルールのラベル（必須）"],
                ["スタッフ", "このルールを適用するスタッフ"],
                ["ルールタイプ", "上記ルールタイプを参照"],
                ["シフトタイプ", "優先・回避するシフト"],
                ["適用曜日", "ルールが適用される曜日（日=0〜土=6、複数選択可）"],
                ["有効期間（開始〜終了）", "ルールを有効にする日付範囲（任意）"],
                ["ハード制約", "厳密に守るかペナルティで処理するかを選択"],
                ["ペナルティ重み", "違反時のペナルティの重さ（ソフト制約のみ）"],
            ],

            // Section 12
            calendar_h2: "設定：カレンダー",
            calendar_p:
                "カレンダールールは特定の日に全スタッフを出勤または休みにします。部署の全スタッフに一括適用されます。",
            calendar_types_title: "ルールタイプ",
            calendar_must_work: "must_work — 全スタッフが出勤必須（緑で表示）",
            calendar_must_off: "must_day_off — 全スタッフが休み必須（赤で表示）",
            calendar_fields: [
                ["日付", "ルールを適用する日付（YYYY-MM-DD）"],
                ["ルールタイプ", "must_work または must_day_off"],
                ["理由", "任意の説明（例：元旦、臨時休業、特別イベント）"],
            ],
            calendar_note:
                "最適化実行時、must_day_offの日付はソルバーが動く前に × で事前入力されます。must_workの日付は月次制限の「カレンダールールを除外」オプションでカウントから除外できます。",

            // Section 13
            early_h2: "設定：早番設定",
            early_p:
                "早番シフト（△）を担当できるスタッフを細かく設定します。シフト能力タブと連携しており、特定の日付だけ早番の可否を上書きすることもできます。",
            early_bulk_title: "一括設定",
            early_bulk_desc:
                "「早番を許可」「早番を禁止」の一括ボタンで、複数スタッフの早番対応を一度に設定できます。",
            early_individual_title: "個別設定",
            early_individual_desc:
                "スタッフごとに早番フラグをトグルします。特定の日付のみに限定する場合は日付ピッカーで指定（空白の場合は全日付に適用）。",

            // Section 14
            periods_h2: "設定：期間設定",
            periods_p:
                "期間はスケジュールの1サイクルの日付範囲を定義します。メインのシフトページの期間ピッカーに表示されます。",
            periods_config_title: "期間設定",
            periods_config_desc:
                "毎月の期間開始日と終了日を設定します（例：開始日16・終了日15の場合、各月の16日〜翌月15日が1期間）。",
            periods_config_fields: [
                ["開始日", "期間が始まる月の日（1〜31）"],
                ["終了日", "期間が終わる月の日（1〜31）"],
            ],
            periods_regen_title: "期間を再生成",
            periods_regen_desc:
                "「期間を再生成」ボタンで、現在の設定に基づいて将来の期間を自動生成します。既存の期間は変更されません。",
            periods_manual_title: "手動で期間を作成",
            periods_manual_desc:
                "ラベル（例：3月）・開始日・終了日を入力して保存すると、1期間が追加されます。",
            periods_delete_title: "期間を削除",
            periods_delete_desc:
                "期間の削除アイコンをクリックすると確認ダイアログが表示されます。期間を削除すると関連するスケジュールデータも削除されます。",

            // Section 15
            solver_h2: "設定：ソルバー設定",
            solver_p:
                "OR-Tools CP-SATオプティマイザーの動作を調整します。設定変更は次回の自動最適化に反映されます。",
            solver_penalty_h3: "ペナルティ重み",
            solver_penalty_p:
                "各重みは、ソフト制約が違反された場合のペナルティの大きさを制御します。値が大きいほど、オプティマイザーはその違反を避けようとします。",
            solver_penalty_fields: [
                ["staffGroup", "スタッフグループのカバレッジルール違反のペナルティ"],
                ["fiveDayRest", "5連勤を超える場合のペナルティ"],
                ["monthlyLimit", "月次シフト数の上限・下限違反のペナルティ"],
                ["dailyLimitMax", "日次最大人数の超過ペナルティ"],
                ["dailyLimitMin", "日次最小人数の未達ペナルティ"],
                ["adjacentConflict", "連続する矛盾するシフトタイプ（例：遅番の翌日に早番）のペナルティ"],
            ],
            solver_hard_h3: "ハード制約",
            solver_hard_p:
                "各制約をハード（必須）に切り替えると、違反する解は採用されません。ハード制約を満たせない場合、オプティマイザーは解なしと報告します。",
            solver_hard_fields: [
                ["日次制限", "日次スタッフ数の上限・下限を厳密に適用"],
                ["5連勤制限", "最大5連続出勤を厳密に適用"],
                ["スタッフグループ", "グループカバレッジルールを厳密に適用"],
                ["月次制限", "月次シフト数の制限を厳密に適用"],
            ],
            solver_settings_h3: "ソルバー設定",
            solver_settings_fields: [
                ["タイムアウト（秒）", "ソルバーが停止するまでの最大時間。デフォルトは30秒。大規模スケジュールや複雑な制約には増加を推奨"],
                ["ワーカー数", "並列ソルバースレッド数。多いほど多コアマシンで高速化できます"],
                ["雇用形態別シフト制限を無効化", "有効にすると、雇用形態ごとのシフト制限（例：パートは遅番不可）が無視されます"],
                ["ポスト期間制約", "連続した閉店日が終わった後の数日間、特定のシフト割り当てを制限します。有効フラグ・日数・ハード/ソフト・最小閉店日数を設定可能"],
                ["隣接競合を無効化", "有効にすると adjacentConflict ペナルティが適用されません"],
            ],

            // Section 16
            symconfig_h2: "設定：シンボル設定",
            symconfig_p:
                "スケジュールグリッドで使用するシフトシンボルをカスタマイズします。変更はグリッド下の凡例とセルの選択ドロップダウンに即座に反映されます。",
            symconfig_defaults_title: "デフォルトシンボル",
            symconfig_defaults_desc:
                "9つの組み込みシンボル（○・×・△・◇・★・●・◎・▣・⊘）は削除できませんが、ラベルと色の変更、および有効・無効の切り替えが可能です。",
            symconfig_custom_title: "カスタムシンボルを追加",
            symconfig_custom_desc:
                "「シンボルを追加」をクリックし、シンボル文字・日本語ラベル・カラーを入力して保存します。",
            symconfig_fields: [
                ["シンボル", "セルに表示される文字"],
                ["ラベル", "凡例と選択ドロップダウンに表示される日本語テキスト（最大20文字）"],
                ["カラー", "グリッドでシンボルを表示するときの16進カラーコード"],
                ["有効", "選択ドロップダウンと凡例に表示するかどうか"],
            ],
            symconfig_delete_title: "カスタムシンボルを削除",
            symconfig_delete_desc:
                "カスタムシンボルは削除アイコンで削除できます。デフォルトシンボルは削除できません。",

            // Developer
            dev_note:
                "以下は連携システムやLLMラッパーを開発するエンジニア向けです。",

            // Section 17
            api_h2: "APIエンドポイント",
            api_p:
                "NestJSバックエンド（apps/api、ポート3002）は /shifts 以下にすべてのシフト操作をRESTエンドポイントとして公開しています。すべてのエンドポイントにJWT認証が必要です。",
            api_schedule: "スケジュール",
            api_optimization: "最適化",
            api_staff: "スタッフ",
            api_periods: "期間",
            api_settings: "設定",
            api_note_throttle:
                "POST /shifts/optimize はソルバーの乱用防止のため、60秒あたり5リクエストのレート制限があります。",

            // Section 18
            llm_h2: "LLMファンクションツール",
            llm_p:
                "シフト管理システムに対してLLM関数呼び出しを実装するための推奨ツール定義です：",
            llm_warning:
                "スケジュールデータは日本語のシフトシンボル（×・△・◇・★・●・◎・▣・⊘）を使用しています。LLM連携ではこれらの文字を正しく扱う必要があります。",

            // Nav
            nav_overview: "概要",
            nav_grid: "スケジュールグリッド",
            nav_symbols: "シフトシンボル",
            nav_toolbar: "ツールバーと操作",
            nav_kb: "キーボードショートカット",
            nav_settings: "設定",
            nav_groups: "グループ",
            nav_backup: "バックアップ",
            nav_caps: "シフト能力",
            nav_unavail: "休暇設定",
            nav_limits: "制限設定",
            nav_priority: "優先ルール",
            nav_calendar: "カレンダー",
            nav_early: "早番設定",
            nav_periods: "期間設定",
            nav_solver: "ソルバー設定",
            nav_symconfig: "シンボル設定",
            nav_api: "APIエンドポイント",
            nav_llm: "LLMツール",
            nav_everyone: "全ユーザー向け",
            nav_dev: "開発者向け",
        },
    };

    $: t = T[$lang];

    const scheduleEndpoints = [
        ["GET", "/shifts/schedule/:periodId", "Get schedule for period (optional ?department_id)"],
        ["PATCH", "/shifts/schedule/:periodId/cells", "Bulk update cells { updates: [{staffId, date, symbol}] }"],
        ["DELETE", "/shifts/schedule/:periodId/cells", "Clear all schedule data for period"],
    ];
    const optimizeEndpoints = [
        ["POST", "/shifts/optimize", "Run OR-Tools optimization { periodId, departmentId?, timeout?, preservePrefilled? }"],
        ["GET", "/shifts/optimize/health", "Check optimizer service health"],
    ];
    const staffEndpoints = [
        ["GET", "/shifts/staff", "List staff (optional ?department_id)"],
        ["POST", "/shifts/staff", "Create staff member"],
        ["PATCH", "/shifts/staff/:id", "Update staff member"],
        ["DELETE", "/shifts/staff/:id", "Soft-delete staff member"],
        ["PUT", "/shifts/staff/reorder", "Reorder staff { staffIds: string[] }"],
    ];
    const periodEndpoints = [
        ["GET", "/shifts/periods", "List all periods"],
        ["POST", "/shifts/periods", "Create period { label, start_date, end_date }"],
        ["DELETE", "/shifts/periods/:id", "Delete period and its schedule data"],
    ];
    const settingsEndpoints = [
        ["GET/PATCH", "/shifts/settings/daily-limits", "Daily limit config"],
        ["GET/PATCH/POST/DELETE", "/shifts/settings/monthly-limits", "Monthly limit records"],
        ["GET/PATCH", "/shifts/settings/solver-config", "Solver configuration"],
        ["GET/PUT", "/shifts/settings/shift-symbols", "Symbol configuration"],
        ["GET/POST/DELETE", "/shifts/settings/calendar-rules", "Calendar rules"],
        ["GET/POST/PATCH/DELETE", "/shifts/settings/staff-groups", "Staff groups + members"],
        ["GET/POST/PATCH/DELETE", "/shifts/settings/priority-rules", "Priority rules"],
        ["GET/POST/PUT/PATCH/DELETE", "/shifts/settings/early-shift-preferences", "Early shift preferences"],
        ["GET/PATCH/POST", "/shifts/settings/period-configuration", "Period config + regenerate"],
        ["GET/POST/PATCH/DELETE", "/shifts/settings/backup-assignments", "Backup assignments"],
        ["GET/POST/DELETE", "/shifts/settings/staff-unavailability", "Staff unavailability"],
    ];

    const llmTools = [
        {
            name: "get_shift_schedule",
            endpoint: "GET /shifts/schedule/:periodId",
            desc: "Retrieve the full schedule grid for a period. Returns schedule_data keyed by staffId → date → symbol.",
        },
        {
            name: "update_shift_cells",
            endpoint: "PATCH /shifts/schedule/:periodId/cells",
            desc: "Assign or clear shift symbols for one or more staff/date combinations in a single request.",
        },
        {
            name: "run_optimization",
            endpoint: "POST /shifts/optimize",
            desc: "Trigger the OR-Tools solver to auto-generate a schedule. Pass periodId and optional timeout (seconds). Rate-limited to 5 req/60s.",
        },
        {
            name: "get_staff_list",
            endpoint: "GET /shifts/staff",
            desc: "List all staff members with their IDs, names, employment status, and department.",
        },
        {
            name: "check_optimizer_health",
            endpoint: "GET /shifts/optimize/health",
            desc: "Returns { healthy: boolean } indicating whether the OR-Tools service is reachable.",
        },
    ];
</script>

<div class="min-h-screen bg-[#F5F6FA] text-slate-800 font-sans flex flex-col antialiased">
    <main class="flex-1 flex flex-col min-h-screen w-full overflow-hidden relative">
        <!-- Top Header -->
        <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between">
            <a href="/" class="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm">
                <span class="material-symbols-outlined text-base">arrow_back</span>
                Back to Dashboard
            </a>
            <span class="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest rounded-full border border-indigo-200">
                {t.badge}
            </span>
        </header>

        <!-- 3-Column Layout -->
        <div class="flex flex-1 w-full relative">
            <!-- Left Sidebar -->
            <aside class="hidden lg:flex lg:flex-col w-64 border-r border-slate-200 bg-white overflow-y-auto pt-8 pb-10 px-4 h-[calc(100vh-57px)] sticky top-[57px]">
                <div class="mb-6">
                    <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 px-3">{t.nav_everyone}</p>
                    <ul class="space-y-0.5">
                        <li><a href="#overview" class="block px-3 py-2 text-sm font-semibold bg-indigo-50 text-indigo-700 rounded-lg">{t.nav_overview}</a></li>
                        <li><a href="#schedule-grid" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_grid}</a></li>
                        <li><a href="#shift-symbols" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_symbols}</a></li>
                        <li><a href="#toolbar" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_toolbar}</a></li>
                        <li><a href="#keyboard" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_kb}</a></li>
                    </ul>
                </div>
                <div class="mb-6">
                    <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 px-3">{t.nav_settings}</p>
                    <ul class="space-y-0.5">
                        <li><a href="#settings-groups" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_groups}</a></li>
                        <li><a href="#settings-backup" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_backup}</a></li>
                        <li><a href="#settings-caps" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_caps}</a></li>
                        <li><a href="#settings-unavail" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_unavail}</a></li>
                        <li><a href="#settings-limits" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_limits}</a></li>
                        <li><a href="#settings-priority" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_priority}</a></li>
                        <li><a href="#settings-calendar" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_calendar}</a></li>
                        <li><a href="#settings-early" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_early}</a></li>
                        <li><a href="#settings-periods" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_periods}</a></li>
                        <li><a href="#settings-solver" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_solver}</a></li>
                        <li><a href="#settings-symbols" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_symconfig}</a></li>
                    </ul>
                </div>
                <div>
                    <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 px-3">{t.nav_dev}</p>
                    <ul class="space-y-0.5">
                        <li><a href="#api-endpoints" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_api}</a></li>
                        <li><a href="#llm-tooling" class="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">{t.nav_llm}</a></li>
                    </ul>
                </div>
            </aside>

            <!-- Main Content -->
            <div class="flex-1 overflow-y-auto h-[calc(100vh-57px)] bg-white">
                <article class="max-w-[720px] mx-auto px-8 xl:px-12 py-16 pb-32">

                    <!-- Overview Header -->
                    <div id="overview" class="mb-14 pb-10 border-b border-slate-100">
                        <div class="flex items-center gap-2 mb-5">
                            <span class="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">Feature Guide</span>
                            <span class="text-slate-300 text-sm">/</span>
                            <span class="text-sm text-slate-400 font-medium">{t.section}</span>
                        </div>
                        <h1 class="text-[2.75rem] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-5">{t.h1}</h1>
                        <p class="text-lg text-slate-500 leading-[1.75] mb-4">{t.intro1}</p>
                        <p class="text-base text-slate-500 leading-[1.75]">{t.intro2}</p>
                    </div>

                    <!-- Section 1: Schedule Grid -->
                    <section class="mb-16" id="schedule-grid">
                        <div class="flex items-center gap-3 mb-5">
                            <span class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full">1</span>
                            <h2 class="text-xl font-bold text-slate-900">{t.grid_h2}</h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-6">{t.grid_p}</p>
                        <ul class="space-y-4">
                            {#each [
                                [t.grid_staff_order_title, t.grid_staff_order_desc],
                                [t.grid_weekends_title, t.grid_weekends_desc],
                                [t.grid_click_title, t.grid_click_desc],
                                [t.grid_drag_title, t.grid_drag_desc],
                                [t.grid_copypaste_title, t.grid_copypaste_desc],
                                [t.grid_arrow_title, t.grid_arrow_desc],
                                [t.grid_empty_title, t.grid_empty_desc],
                            ] as [title, desc]}
                                <li class="flex gap-3">
                                    <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2"></span>
                                    <div>
                                        <span class="font-semibold text-slate-800">{title}:</span>
                                        <span class="text-sm text-slate-600 leading-relaxed ml-1">{desc}</span>
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    </section>

                    <!-- Section 2: Shift Symbols -->
                    <section class="mb-16" id="shift-symbols">
                        <div class="flex items-center gap-3 mb-5">
                            <span class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full">2</span>
                            <h2 class="text-xl font-bold text-slate-900">{t.symbols_h2}</h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-6">{t.symbols_p}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-6">
                            <div class="flex items-center gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                <span class="w-14 shrink-0">{t.symbols_col_sym}</span>
                                <span class="flex-1">{t.symbols_col_label}</span>
                                <span class="flex-1">{t.symbols_col_meaning}</span>
                                <span class="w-28 shrink-0 text-right">{t.symbols_col_scope}</span>
                            </div>
                            {#each [
                                ["", "#4b5563", t.sym_work_label, t.sym_work_meaning, t.sym_work_scope],
                                ["○", "#374151", t.sym_work_marked_label, t.sym_work_marked_meaning, t.sym_work_marked_scope],
                                ["×", "#dc2626", t.sym_off_label, t.sym_off_meaning, t.sym_off_scope],
                                ["△", "#2563eb", t.sym_early_label, t.sym_early_meaning, t.sym_early_scope],
                                ["◇", "#9333ea", t.sym_late_label, t.sym_late_meaning, t.sym_late_scope],
                                ["★", "#ca8a04", t.sym_mgmt_label, t.sym_mgmt_meaning, t.sym_mgmt_scope],
                                ["●", "#16a34a", t.sym_special_label, t.sym_special_meaning, t.sym_special_scope],
                                ["◎", "#ea580c", t.sym_priority_label, t.sym_priority_meaning, t.sym_priority_scope],
                                ["▣", "#6b7280", t.sym_backup_label, t.sym_backup_meaning, t.sym_backup_scope],
                                ["⊘", "#9ca3af", t.sym_unavail_label, t.sym_unavail_meaning, t.sym_unavail_scope],
                            ] as [sym, color, label, meaning, scope]}
                                <div class="flex items-center gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="w-14 shrink-0 text-xl font-bold" style="color: {color};">{sym || "—"}</span>
                                    <span class="flex-1 text-sm font-medium text-slate-700">{label}</span>
                                    <span class="flex-1 text-sm text-slate-500">{meaning}</span>
                                    <span class="w-28 shrink-0 text-right text-xs text-slate-400">{scope}</span>
                                </div>
                            {/each}
                        </div>
                        <p class="text-sm text-slate-500 leading-relaxed">{t.symbols_note}</p>
                    </section>

                    <!-- Section 3: Toolbar -->
                    <section class="mb-16" id="toolbar">
                        <div class="flex items-center gap-3 mb-5">
                            <span class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full">3</span>
                            <h2 class="text-xl font-bold text-slate-900">{t.toolbar_h2}</h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-6">{t.toolbar_p}</p>
                        <ul class="space-y-5">
                            {#each [
                                [t.toolbar_period_title, t.toolbar_period_desc],
                                [t.toolbar_dept_title, t.toolbar_dept_desc],
                                [t.toolbar_optimize_title, t.toolbar_optimize_desc],
                                [t.toolbar_partial_title, t.toolbar_partial_desc],
                                [t.toolbar_violations_title, t.toolbar_violations_desc],
                                [t.toolbar_cancel_title, t.toolbar_cancel_desc],
                                [t.toolbar_clear_title, t.toolbar_clear_desc],
                                [t.toolbar_print_title, t.toolbar_print_desc],
                                [t.toolbar_settings_title, t.toolbar_settings_desc],
                                [t.toolbar_health_title, t.toolbar_health_desc],
                            ] as [title, desc]}
                                <li class="flex gap-3">
                                    <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2"></span>
                                    <div>
                                        <span class="font-semibold text-slate-800">{title}:</span>
                                        <span class="text-sm text-slate-600 leading-relaxed ml-1">{desc}</span>
                                    </div>
                                </li>
                            {/each}
                        </ul>

                        <!-- Optimization Stages -->
                        <div class="mt-8">
                            <p class="text-sm font-semibold text-slate-700 mb-3">{t.toolbar_optimize_stages_title}</p>
                            <ol class="space-y-2">
                                {#each t.toolbar_optimize_stages as [num, label, detail]}
                                    <li class="flex gap-3 items-start">
                                        <span class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold mt-0.5">{num}</span>
                                        <div>
                                            <span class="font-semibold text-slate-800 text-sm">{label}:</span>
                                            <span class="text-sm text-slate-500 ml-1">{detail}</span>
                                        </div>
                                    </li>
                                {/each}
                            </ol>
                        </div>
                    </section>

                    <!-- Section 4: Keyboard Shortcuts -->
                    <section class="mb-16" id="keyboard">
                        <div class="flex items-center gap-3 mb-5">
                            <span class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full">4</span>
                            <h2 class="text-xl font-bold text-slate-900">{t.kb_h2}</h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-6">{t.kb_p}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200">
                            <div class="flex items-center gap-6 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                <span class="w-36 shrink-0">{t.kb_col_key}</span>
                                <span class="flex-1">{t.kb_col_action}</span>
                            </div>
                            {#each t.kb_shortcuts as [key, action]}
                                <div class="flex items-center gap-6 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="w-36 shrink-0">
                                        <kbd class="px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-700 rounded border border-slate-200">{key}</kbd>
                                    </span>
                                    <span class="text-sm text-slate-600">{action}</span>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- Section 5: Settings Overview -->
                    <section class="mb-10" id="settings-overview">
                        <div class="flex items-center gap-3 mb-5">
                            <span class="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-full">5</span>
                            <h2 class="text-xl font-bold text-slate-900">{t.settings_h2}</h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-4">{t.settings_p}</p>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                                <p class="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">{t.settings_dept_badge}</p>
                                <p class="text-sm text-slate-600">{t.settings_dept_tabs}</p>
                            </div>
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.settings_global_badge}</p>
                                <p class="text-sm text-slate-600">{t.settings_global_tabs}</p>
                            </div>
                        </div>
                    </section>

                    <!-- Section 6: Groups -->
                    <section class="mb-12" id="settings-groups">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">group</span>
                            {t.groups_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-4">{t.groups_p}</p>
                        <ul class="space-y-3">
                            {#each [[t.groups_create_title, t.groups_create_desc],[t.groups_edit_title, t.groups_edit_desc],[t.groups_delete_title, t.groups_delete_desc]] as [title, desc]}
                                <li class="flex gap-3">
                                    <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                                    <div><span class="font-semibold text-slate-800 text-sm">{title}:</span> <span class="text-sm text-slate-600">{desc}</span></div>
                                </li>
                            {/each}
                        </ul>
                    </section>

                    <!-- Section 7: Backup -->
                    <section class="mb-12" id="settings-backup">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">backup</span>
                            {t.backup_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-4">{t.backup_p}</p>
                        <p class="text-sm font-semibold text-slate-700 mb-2">{t.backup_fields_title}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-4">
                            {#each t.backup_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="shrink-0 w-36 text-sm font-medium text-slate-700">{field}</span>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>
                        <p class="text-sm text-slate-500">{t.backup_crud}</p>
                    </section>

                    <!-- Section 8: Capabilities -->
                    <section class="mb-12" id="settings-caps">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">accessibility</span>
                            {t.caps_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-4">{t.caps_p}</p>
                        <p class="text-sm font-semibold text-slate-700 mb-2">{t.caps_toggles_title}</p>
                        <ul class="space-y-2 mb-4">
                            {#each [t.caps_toggle1, t.caps_toggle2] as item}
                                <li class="flex gap-3">
                                    <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                                    <span class="text-sm text-slate-600">{item}</span>
                                </li>
                            {/each}
                        </ul>
                        <p class="text-sm font-semibold text-slate-700 mb-1">{t.caps_bulk_title}</p>
                        <p class="text-sm text-slate-500">{t.caps_bulk_desc}</p>
                    </section>

                    <!-- Section 9: Unavailability -->
                    <section class="mb-12" id="settings-unavail">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">event_busy</span>
                            {t.unavail_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-4">{t.unavail_p}</p>
                        <ul class="space-y-3">
                            {#each [[t.unavail_add_title, t.unavail_add_desc],[t.unavail_bulk_title, t.unavail_bulk_desc],[t.unavail_delete_title, t.unavail_delete_desc]] as [title, desc]}
                                <li class="flex gap-3">
                                    <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                                    <div><span class="font-semibold text-slate-800 text-sm">{title}:</span> <span class="text-sm text-slate-600">{desc}</span></div>
                                </li>
                            {/each}
                        </ul>
                    </section>

                    <!-- Section 10: Limits -->
                    <section class="mb-12" id="settings-limits">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">tune</span>
                            {t.limits_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-6">{t.limits_p}</p>

                        <p class="text-sm font-bold text-slate-800 mb-2">{t.limits_daily_h3}</p>
                        <p class="text-sm text-slate-500 mb-3">{t.limits_daily_p}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-8">
                            {#each t.limits_daily_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="shrink-0 w-44 text-sm font-medium text-slate-700">{field}</span>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>

                        <p class="text-sm font-bold text-slate-800 mb-2">{t.limits_monthly_h3}</p>
                        <p class="text-sm text-slate-500 mb-3">{t.limits_monthly_p}</p>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.limits_monthly_scopes_title}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-4">
                            {#each t.limits_monthly_scopes as [scope, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <code class="shrink-0 w-28 text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded h-fit">{scope}</code>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-4">
                            {#each t.limits_monthly_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="shrink-0 w-44 text-sm font-medium text-slate-700">{field}</span>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>
                        <p class="text-sm text-slate-500">{t.limits_monthly_crud}</p>
                    </section>

                    <!-- Section 11: Priority Rules -->
                    <section class="mb-12" id="settings-priority">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">priority_high</span>
                            {t.priority_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-4">{t.priority_p}</p>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.priority_rule_types_title}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-6">
                            {#each t.priority_rule_types as [type, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <code class="shrink-0 w-52 text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded h-fit">{type}</code>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.priority_shift_types_title}</p>
                        <p class="text-sm text-slate-600 mb-4">{t.priority_shift_types}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200">
                            {#each t.priority_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="shrink-0 w-44 text-sm font-medium text-slate-700">{field}</span>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- Section 12: Calendar Rules -->
                    <section class="mb-12" id="settings-calendar">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">event_note</span>
                            {t.calendar_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-4">{t.calendar_p}</p>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.calendar_types_title}</p>
                        <ul class="space-y-2 mb-4">
                            <li class="flex gap-3">
                                <span class="shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1.5"></span>
                                <span class="text-sm text-slate-600">{t.calendar_must_work}</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="shrink-0 w-2 h-2 rounded-full bg-red-400 mt-1.5"></span>
                                <span class="text-sm text-slate-600">{t.calendar_must_off}</span>
                            </li>
                        </ul>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-4">
                            {#each t.calendar_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="shrink-0 w-28 text-sm font-medium text-slate-700">{field}</span>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>
                        <div class="p-4 bg-sky-50 border border-sky-200 rounded-xl flex gap-3">
                            <span class="text-sky-500 text-lg shrink-0">ℹ️</span>
                            <p class="text-sm text-sky-800 leading-relaxed">{t.calendar_note}</p>
                        </div>
                    </section>

                    <!-- Section 13: Early Shift -->
                    <section class="mb-12" id="settings-early">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">wb_sunny</span>
                            {t.early_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-4">{t.early_p}</p>
                        <ul class="space-y-3">
                            {#each [[t.early_bulk_title, t.early_bulk_desc],[t.early_individual_title, t.early_individual_desc]] as [title, desc]}
                                <li class="flex gap-3">
                                    <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                                    <div><span class="font-semibold text-slate-800 text-sm">{title}:</span> <span class="text-sm text-slate-600">{desc}</span></div>
                                </li>
                            {/each}
                        </ul>
                    </section>

                    <!-- Section 14: Periods -->
                    <section class="mb-12" id="settings-periods">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">date_range</span>
                            {t.periods_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-4">{t.periods_p}</p>
                        <p class="text-sm font-semibold text-slate-700 mb-2">{t.periods_config_title}</p>
                        <p class="text-sm text-slate-500 mb-3">{t.periods_config_desc}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-6">
                            {#each t.periods_config_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="shrink-0 w-28 text-sm font-medium text-slate-700">{field}</span>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>
                        <ul class="space-y-3">
                            {#each [[t.periods_regen_title, t.periods_regen_desc],[t.periods_manual_title, t.periods_manual_desc],[t.periods_delete_title, t.periods_delete_desc]] as [title, desc]}
                                <li class="flex gap-3">
                                    <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                                    <div><span class="font-semibold text-slate-800 text-sm">{title}:</span> <span class="text-sm text-slate-600">{desc}</span></div>
                                </li>
                            {/each}
                        </ul>
                    </section>

                    <!-- Section 15: Solver Config -->
                    <section class="mb-12" id="settings-solver">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">psychology</span>
                            {t.solver_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-6">{t.solver_p}</p>

                        <p class="text-sm font-bold text-slate-800 mb-2">{t.solver_penalty_h3}</p>
                        <p class="text-sm text-slate-500 mb-3">{t.solver_penalty_p}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-8">
                            {#each t.solver_penalty_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <code class="shrink-0 w-36 text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded h-fit">{field}</code>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>

                        <p class="text-sm font-bold text-slate-800 mb-2">{t.solver_hard_h3}</p>
                        <p class="text-sm text-slate-500 mb-3">{t.solver_hard_p}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200 mb-8">
                            {#each t.solver_hard_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="shrink-0 w-36 text-sm font-medium text-slate-700">{field}</span>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>

                        <p class="text-sm font-bold text-slate-800 mb-3">{t.solver_settings_h3}</p>
                        <div class="overflow-hidden rounded-xl border border-slate-200">
                            {#each t.solver_settings_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="shrink-0 w-52 text-sm font-medium text-slate-700">{field}</span>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- Section 16: Symbol Config -->
                    <section class="mb-16" id="settings-symbols">
                        <h3 class="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-500 text-base">tag</span>
                            {t.symconfig_h2}
                        </h3>
                        <p class="text-slate-500 text-sm leading-relaxed mb-4">{t.symconfig_p}</p>
                        <ul class="space-y-3 mb-4">
                            {#each [[t.symconfig_defaults_title, t.symconfig_defaults_desc],[t.symconfig_custom_title, t.symconfig_custom_desc],[t.symconfig_delete_title, t.symconfig_delete_desc]] as [title, desc]}
                                <li class="flex gap-3">
                                    <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5"></span>
                                    <div><span class="font-semibold text-slate-800 text-sm">{title}:</span> <span class="text-sm text-slate-600">{desc}</span></div>
                                </li>
                            {/each}
                        </ul>
                        <div class="overflow-hidden rounded-xl border border-slate-200">
                            {#each t.symconfig_fields as [field, desc]}
                                <div class="flex gap-4 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <span class="shrink-0 w-24 text-sm font-medium text-slate-700">{field}</span>
                                    <span class="text-sm text-slate-500">{desc}</span>
                                </div>
                            {/each}
                        </div>
                    </section>

                    <!-- Developer Divider -->
                    <div class="relative my-12">
                        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
                        <div class="relative flex justify-center">
                            <span class="bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.dev_note}</span>
                        </div>
                    </div>

                    <!-- Section 17: API Endpoints -->
                    <section class="mb-16" id="api-endpoints">
                        <div class="flex items-center gap-3 mb-5">
                            <span class="flex items-center justify-center w-7 h-7 bg-slate-600 text-white text-xs font-bold rounded-full">7</span>
                            <h2 class="text-xl font-bold text-slate-900">{t.api_h2}</h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-8">{t.api_p}</p>

                        {#each [
                            [t.api_schedule, scheduleEndpoints],
                            [t.api_optimization, optimizeEndpoints],
                            [t.api_staff, staffEndpoints],
                            [t.api_periods, periodEndpoints],
                            [t.api_settings, settingsEndpoints],
                        ] as [label, endpoints]}
                            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">{label}</h3>
                            <div class="overflow-hidden rounded-xl border border-slate-200 mb-8">
                                {#each endpoints as [method, path, desc]}
                                    <div class="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                        <span class="shrink-0 w-20 text-center text-[10px] font-bold tracking-wide rounded px-1.5 py-0.5 {
                                            method === 'GET' ? 'bg-sky-50 text-sky-700' :
                                            method === 'POST' ? 'bg-green-50 text-green-700' :
                                            method === 'PATCH' ? 'bg-amber-50 text-amber-700' :
                                            method === 'PUT' ? 'bg-orange-50 text-orange-700' :
                                            method === 'DELETE' ? 'bg-red-50 text-red-700' :
                                            'bg-slate-100 text-slate-600'
                                        }">{method}</span>
                                        <code class="text-sm font-mono text-slate-700 font-medium">{path}</code>
                                        <span class="text-sm text-slate-400 ml-auto text-right">{desc}</span>
                                    </div>
                                {/each}
                            </div>
                        {/each}

                        <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                            <span class="text-amber-500 text-lg shrink-0">⚠️</span>
                            <p class="text-sm text-amber-800 leading-relaxed">{t.api_note_throttle}</p>
                        </div>
                    </section>

                    <!-- Section 18: LLM Tooling -->
                    <section class="mb-16" id="llm-tooling">
                        <div class="flex items-center gap-3 mb-5">
                            <span class="flex items-center justify-center w-7 h-7 bg-slate-600 text-white text-xs font-bold rounded-full">8</span>
                            <h2 class="text-xl font-bold text-slate-900">{t.llm_h2}</h2>
                        </div>
                        <p class="text-slate-500 leading-relaxed mb-8">{t.llm_p}</p>

                        <div class="space-y-4 mb-8">
                            {#each llmTools as tool}
                                <div class="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all">
                                    <code class="text-sm font-bold text-indigo-600">{tool.name}</code>
                                    <p class="text-xs text-slate-400 mt-1 mb-2 font-mono">{tool.endpoint}</p>
                                    <p class="text-sm text-slate-500 leading-relaxed">{tool.desc}</p>
                                </div>
                            {/each}
                        </div>

                        <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                            <span class="text-amber-500 text-lg shrink-0">⚠️</span>
                            <p class="text-sm text-amber-800 leading-relaxed">
                                <strong class="font-semibold">LLM Context Note:</strong> {t.llm_warning}
                            </p>
                        </div>
                    </section>

                    <footer class="pt-8 border-t border-slate-100 text-sm text-slate-400 flex items-center justify-between">
                        <span>Hotel Front Agent Docs</span>
                        <span>&copy; 2026</span>
                    </footer>
                </article>
            </div>

            <!-- Right ToC -->
            <aside class="hidden xl:flex xl:flex-col w-60 bg-white border-l border-slate-200 overflow-y-auto pt-12 px-6 h-[calc(100vh-57px)] sticky top-[57px]">
                <p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-5">On this page</p>
                <nav class="flex flex-col gap-1 text-[13px]">
                    <a href="#overview" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_overview}</a>
                    <a href="#schedule-grid" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_grid}</a>
                    <a href="#shift-symbols" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_symbols}</a>
                    <a href="#toolbar" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_toolbar}</a>
                    <a href="#keyboard" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_kb}</a>
                    <p class="text-[10px] font-bold tracking-widest text-slate-300 uppercase mt-3 mb-1 px-3">{t.nav_settings}</p>
                    <a href="#settings-groups" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_groups}</a>
                    <a href="#settings-backup" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_backup}</a>
                    <a href="#settings-caps" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_caps}</a>
                    <a href="#settings-unavail" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_unavail}</a>
                    <a href="#settings-limits" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_limits}</a>
                    <a href="#settings-priority" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_priority}</a>
                    <a href="#settings-calendar" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_calendar}</a>
                    <a href="#settings-early" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_early}</a>
                    <a href="#settings-periods" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_periods}</a>
                    <a href="#settings-solver" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_solver}</a>
                    <a href="#settings-symbols" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_symconfig}</a>
                    <p class="text-[10px] font-bold tracking-widest text-slate-300 uppercase mt-3 mb-1 px-3">{t.nav_dev}</p>
                    <a href="#api-endpoints" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_api}</a>
                    <a href="#llm-tooling" class="px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">{t.nav_llm}</a>
                </nav>
            </aside>
        </div>
    </main>
</div>
