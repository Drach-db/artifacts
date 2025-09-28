    (function(){
      const root = document.getElementById('aq');
      const progress = root.querySelector('#aqProgress');
      const CFG = { totalSteps: 5, mobileBP: 768 }; // central UI config
      const total = CFG.totalSteps; // Function, Requirements, Solution, Calculator, Get Offer
      let current = 0; // start on step 0
      root.dataset.slide = '0';
      let selectedRole = null;

      const nowISO = () => new Date().toISOString();
      const slide2ToggleLog = { kpis: [], problems: [] };

      window.dataLayer = window.dataLayer || [];
      const SLIDE_NAMES = ['function','requirements','solution','calculator','offer'];
      const STEPPER_LABELS = ['Function','Requirements','Solution','Calculator','Get Offer'];
      const slidesSeen = { s1: false, s2: false, s3: false, s4: false, s5: false };
      const isMobileDevice = () => window.matchMedia('(max-width: ' + CFG.mobileBP + 'px)').matches;
      const isDesktop = () => !isMobileDevice();

      const el = (tag, className = '', html = '') => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (html) node.innerHTML = html;
        return node;
      };

      const INCLUDED_SUMMARY = [
        {
          icon: 'shield-dollar-check',
          title: 'Integrity',
          card: 'KPI‑linked delivery with refunds if minimums aren’t met.',
          modal: 'KPI‑linked delivery. Refunds if minimums aren’t met.'
        },
        {
          icon: 'monitor-eye',
          title: 'Control via platform',
          card: 'Live screens, activity logs, approvals, and reports in one place.',
          modal: 'Live screens, activity logs, approvals and reports in one place.'
        },
        {
          icon: 'docs-stack',
          title: 'All-inclusive',
          card: 'Flat rate covers hiring, training, QA, backups, and facilities.',
          modal: 'Flat rate covers hiring, training, QA, backups and facilities.'
        }
      ];

      function dl(event, payload = {}){
        if (!event) return;
        const fallbackIdx = Math.min(Math.max(current + 1, 1), SLIDE_NAMES.length);
        const slide_idx = payload.slide_idx != null ? payload.slide_idx : fallbackIdx;
        const slide_name = payload.slide_name || SLIDE_NAMES[slide_idx - 1] || SLIDE_NAMES[fallbackIdx - 1] || '';
        const basePayload = {
          event,
          component: 'quiz',
          quiz_id: 'quiz',
          device: isMobileDevice() ? 'mobile' : 'desktop',
          slide_idx,
          slide_name,
          slides_seen: { ...slidesSeen },
          ts: nowISO()
        };
        window.dataLayer.push({ ...basePayload, ...payload });
      }

      // Simple inline icon library (minimal SVGs)
      const useIcon = (id, viewBox = '0 0 24 24', cls = 'icon') => `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;

      const ICON = {
        'shield-dollar-check': 'i-shield-dollar-check',
        'calendar-30': 'i-calendar-30',
        'monitor-eye': 'i-monitor-eye',
        'stamp-approved': 'i-stamp-approved',
        'calendar-clock': 'i-calendar-clock',
        'users-lifebuoy': 'i-users-lifebuoy',
        'globe-247': 'i-globe-247',
        'user-badge': 'i-user-badge',
        'calendar-dots': 'i-calendar-dots',
        'book-flash': 'i-book-flash',
        'brain-chip': 'i-brain-chip',
        'clipboard-check': 'i-clipboard-check',
        'docs-stack': 'i-docs-stack',
        'link-puzzle': 'i-link-puzzle',
        'plug': 'i-plug',
        'shield-soc2': 'i-shield-soc2'
      };
      const iconSvg = (name) => useIcon(ICON[String(name || '').toLowerCase()] || 'i-generic');

      function buildDetailsElement(hover){
        const detailsArr = (hover && Array.isArray(hover.details)) ? hover.details : [];
        const detailsHtml = detailsArr.length ? `<ul class="ul-compact">${detailsArr.map(d => `<li>${d}</li>`).join('')}</ul>` : '';
        const shortHtml = (hover && hover.short) ? `<div class="mb-6">${hover.short}</div>` : '';
        if (!shortHtml && !detailsHtml) return null;
        return el('div','tile tile--details soltile__details', `${shortHtml}${detailsHtml}`);
      }

      function renderIncludedSummary(){
        const holder = root.querySelector('.included__cards');
        if (!holder) return;
        holder.innerHTML = '';
        const badge = el('span','tile__badge tile__badge--salad included__badge','INCLUDED');
        holder.appendChild(badge);
        INCLUDED_SUMMARY.forEach(item => {
          const block = el('div','included__summary-item',
            `<span class="included__summary-icon" aria-hidden="true">${iconSvg(item.icon)}</span>` +
            `<div><strong>${item.title}.</strong> ${item.card}</div>`
          );
          holder.appendChild(block);
        });
      }

      function renderStepper(){
        const list = root.querySelector('.stepper__list');
        if (!list) return;
        list.innerHTML = '';
        STEPPER_LABELS.forEach((label, idx) => {
          const btn = document.createElement('button');
          btn.className = 'step';
          btn.textContent = `${idx + 1} ${label}`;
          btn.dataset.state = idx === 0 ? 'now' : 'todo';
          if (idx === 0) {
            btn.setAttribute('aria-current', 'step');
          } else {
            btn.disabled = true;
          }
          list.appendChild(btn);
        });
      }

      function renderOptionGroup({ containerSelector, items, selectedSet, defaultIds = [], optionClass }){
        const container = root.querySelector(containerSelector);
        if (!container) return;
        container.innerHTML = '';
        const defaults = new Set(defaultIds);
        items.forEach(({ value, label }) => {
          const node = createOption(label, value, selectedSet.has(value), defaults.has(value));
          if (optionClass) node.classList.add(optionClass);
          container.appendChild(node);
        });
      }

      function logDefaults(group, ids, roleKey){
        const bucket = defaultsLogged[group];
        if (!bucket) return;
        const labelGetter = group === 'kpi' ? kpiLabel : problemLabel;
        const context = roleKey || 'global';
        ids.forEach(id => {
          if (!id) return;
          const key = `${context}::${id}`;
          if (bucket.has(key)) return;
          bucket.add(key);
          dl('quiz_req_toggle', {
            group,
            id,
            label: labelGetter(id),
            state: 'default',
            was_default: true,
            slide_idx: 2,
            slide_name: SLIDE_NAMES[1]
          });
        });
      }

      // Locale dictionary (single source of truth for UI strings)
      const UI = {
        steps: [
          'Select a function to outsource',
          'What will success look like?',
          'Here is how we’ll own your results.',
          'Your plan & price',
          'Input email to get offer'
        ],
        subtitles: {
          step1: 'Pick one role to tailor KPIs, solutions, and pricing.',
          step2: 'Select up to 3 KPIs and 4 problems',
          step3Desktop: 'Hover a card to preview what’s included.',
          step3Mobile: 'Tap a card to open the details.',
          step4Desktop: 'Hover a card to see what’s included.',
          step4Mobile: 'Tap a card to see what’s included.',
          step5: 'Leave your email; we’ll send a tailored offer.'
        },
        tabs: { kpis: 'KPIs', problems: 'Problems' },
        panels: {
          kpis: 'Key Performance Indicators',
          problems: 'Common Problems (select for tailored solutions)'
        },
        toasts: {
          kpiLimit: 'You can select up to 3 KPIs.',
          problemsLocked: 'These two are always included.',
          problemsLimit: 'Max 4 problems.'
        },
        ctas: {
          back: 'Back',
          next: 'Next',
          read_case: 'Read full case',
          see_details: 'SEE DETAILS',
          enter_platform: 'ENTER PLATFORM',
          email_plan: 'Email me this plan'
        },
        disclaimer: 'Estimates; final price in SOW.'
      };

      // Updated artifact data model with achievements and triggers
      const ach = (id, cfg = {}) => {
        const { hover = {}, triggers = {}, included = true, default_visible = false, ...rest } = cfg;
        return [
          id,
          {
            included,
            default_visible,
            hover: { details: [], ...hover },
            triggers: { by_problems: [], by_kpis: [], ...triggers },
            ...rest
          }
        ];
      };
      const achHover = (short, ...details) => ({ short, details });
      const achTriggers = (by_problems = [], by_kpis = []) => ({ by_problems, by_kpis });
      const achCollect = (entries) => {
        const obj = {};
        entries.forEach(([key, value]) => {
          if (key) obj[key] = value;
        });
        return obj;
      };

      const DATA = {
        calculator: {
          currencies: { USD: 11, AUD: 16, NZD: 17, CAD: 14 },
          min_team: 5,
          max_team: 150,
          quick_steps: [5, 10],
          team_step: 1,
          inhouse_min: 15,
          inhouse_max: 40,
          inhouse_step: 5,
          defaults: { team: 5, hours_per_day: 8, days_per_week: 5, currency: 'USD', inhouse_rate: 25 },
          formulas: {
            hours_week: 'hours_per_day * days_per_week',
            monthly: 'team_size * rate * hours_week * 4.33',
            annual: 'monthly * 12',
            inhouse_monthly: 'team_size * inhouse_rate * hours_week * 4.33',
            savings_abs: 'inhouse_monthly - monthly',
            savings_pct: 'savings_abs / inhouse_monthly'
          }
        },
        problems: [
          { id: 'expensive_local_hiring', label: 'Expensive local hiring' },
          { id: 'virtual_agents_hiring_risks', label: 'Virtual agents’ hiring risks' },
          { id: 'seasonality', label: 'Seasonality' },
          { id: 'volume_spikes', label: 'Volume spikes' },
          { id: 'inconsistent_qa', label: 'Inconsistent QA' },
          { id: 'tool_fragmentation', label: 'Tool fragmentation' },
          { id: 'process_gaps', label: 'Process gaps' },
          { id: 'long_ramp_time', label: 'Long ramp time' },
          { id: 'attrition', label: 'Attrition' },
          { id: 'coverage_247', label: '24/7 coverage' },
          { id: 'security', label: 'Security/compliance needs' },
          { id: 'data_hygiene', label: 'Data hygiene issues' },
          { id: 'backlog', label: 'Backlog' }
        ],
        kpi_keys: [
          'csat','fcr','aht','sla','qa_score','adherence','resolution_rate',
          'meetings_per_rep_week','sqls','connect_rate','reply_rate','show_rate','pipeline_value','lead_response_time',
          'frt','concurrency','abandonment_rate','escalation_rate',
          'tfr','backlog_age','kb_contrib',
          'orders_per_hour','tat','on_time_percent','error_rate','rework_rate',
          'records_per_hour','accuracy',
          'data_hygiene_percent','duplicate_rate','enrichment_throughput','sla_updates','pipeline_hygiene',
          'annotations_per_hour','qa_pass_rate','iaa','rework_percent'
        ],
        roles: {
          customer_support: {
            group: 'front_office',
            display: 'Customer Support (voice/chat/email)',
            kpis: [
              { key: 'csat', label: 'CSAT' },
              { key: 'fcr', label: 'FCR' },
              { key: 'aht', label: 'AHT' },
              { key: 'sla', label: 'SLA attainment' },
              { key: 'qa_score', label: 'QA score' },
              { key: 'adherence', label: 'Adherence' },
              { key: 'resolution_rate', label: 'Resolution rate' }
            ]
          },
          sdr: {
            group: 'front_office',
            display: 'Sales Development (SDR)',
            kpis: [
              { key: 'meetings_per_rep_week', label: 'Meetings booked/rep/week' },
              { key: 'sqls', label: 'SQLs' },
              { key: 'connect_rate', label: 'Connect rate' },
              { key: 'reply_rate', label: 'Reply rate' },
              { key: 'show_rate', label: 'Show rate' },
              { key: 'pipeline_value', label: 'Pipeline value' },
              { key: 'lead_response_time', label: 'Lead response time' }
            ]
          },
          live_chat: {
            group: 'front_office',
            display: 'Live‑Chat Operator',
            kpis: [
              { key: 'frt', label: 'First response time (FRT)' },
              { key: 'concurrency', label: 'Concurrency' },
              { key: 'csat', label: 'CSAT' },
              { key: 'resolution_rate', label: 'Resolution rate' },
              { key: 'abandonment_rate', label: 'Abandonment' },
              { key: 'escalation_rate', label: 'Escalation rate' }
            ]
          },
          tech_support_l1: {
            group: 'front_office',
            display: 'Technical Support (L1)',
            kpis: [
              { key: 'tfr', label: 'Time‑to‑first‑response' },
              { key: 'fcr', label: 'FCR vs Escalations' },
              { key: 'backlog_age', label: 'Backlog age' },
              { key: 'csat', label: 'CSAT' },
              { key: 'qa_score', label: 'QA score' },
              { key: 'kb_contrib', label: 'Knowledge base contribution' }
            ]
          },
          order_processing: {
            group: 'back_office',
            display: 'Order Processing',
            kpis: [
              { key: 'orders_per_hour', label: 'Orders/hour' },
              { key: 'tat', label: 'Turnaround time' },
              { key: 'on_time_percent', label: 'On‑time %' },
              { key: 'error_rate', label: 'Error rate/accuracy' },
              { key: 'rework_rate', label: 'Rework rate' }
            ]
          },
          data_entry: {
            group: 'back_office',
            display: 'Data Entry',
            kpis: [
              { key: 'records_per_hour', label: 'Records/hour' },
              { key: 'accuracy', label: 'Accuracy' },
              { key: 'tat', label: 'Turnaround time' },
              { key: 'error_rate', label: 'Error rate' },
              { key: 'rework_rate', label: 'Rework rate' }
            ]
          },
          crm_management: {
            group: 'back_office',
            display: 'CRM Management',
            kpis: [
              { key: 'data_hygiene_percent', label: 'Data hygiene %' },
              { key: 'duplicate_rate', label: 'Duplicate rate' },
              { key: 'enrichment_throughput', label: 'Enrichment throughput' },
              { key: 'sla_updates', label: 'SLA for updates' },
              { key: 'pipeline_hygiene', label: 'Pipeline hygiene' }
            ]
          },
          data_labeling: {
            group: 'back_office',
            display: 'Data Labeling / Annotation',
            kpis: [
              { key: 'annotations_per_hour', label: 'Annotations/hour' },
              { key: 'qa_pass_rate', label: 'QA pass rate' },
              { key: 'iaa', label: 'Inter‑annotator agreement (IAA)' },
              { key: 'tat', label: 'Turnaround time' },
              { key: 'rework_percent', label: 'Rework %' }
            ]
          }
        },
        achievements_config: {
          render_order: [
            'kpi_ownership','pilot_30_day',
            'team_lead_dedicated','glassbox_monitoring','hire_approval',
            'advanced_scheduler','backup_staff_10','coverage_247',
            'qa_rubric_gates','daily_microlearning','prelearning_3day','genai_screening',
            'sops_playbooks','work_in_your_stack','light_integrations','soc2_facilities'
          ],
          always_visible: ['kpi_ownership','pilot_30_day'],
          pilot_30_day_enabled: true,
          hide_match_tags_in_ui: true,
          use_sorting: false,
          show_more_button: false
        },
        achievements: achCollect([
          ach('kpi_ownership', {
            display: 'KPI Ownership (refund/±$1/hr)', icon: 'shield-dollar-check', category: 'ownership', default_visible: true,
            hover: achHover('We tie pay to your KPIs. Miss the minimum → refund.', '30-day KPI thresholds in SOW; incentives ±$1/hr', 'Clear acceptance criteria and reporting cadence')
          }),
          ach('pilot_30_day', {
            display: '30-day Pilot (5 agents)', icon: 'calendar-30', category: 'ownership', default_visible: true,
            hover: achHover('Start fast, prove value, then scale.', 'Risk-controlled month-to-month start', 'Simple 30-day exit policy')
          }),
          ach('glassbox_monitoring', {
            display: 'Glass-box Live Monitoring', icon: 'monitor-eye', category: 'platform',
            hover: achHover('See activity & screens live — like they sit next to you.', 'Live screens, activity feed, screenshots', 'Bills, docs and reports in one place'),
            triggers: achTriggers(['process_gaps'], ['adherence','sla'])
          }),
          ach('hire_approval', {
            display: 'Hire Approval Module', icon: 'stamp-approved', category: 'platform',
            hover: achHover('You approve every hire before day 1.', 'Final say on candidates', 'Auditable approval trail'),
            triggers: achTriggers(['process_gaps','attrition'], ['qa_score'])
          }),
          ach('advanced_scheduler', {
            display: 'Advanced Shift Scheduler', icon: 'calendar-clock', category: 'operations',
            hover: achHover('Right people, right hours — even at peaks.', 'Multi-shift templates, holidays & surge rosters', 'Fast re-rostering for no-shows'),
            triggers: achTriggers(['seasonality','volume_spikes','coverage_247','backlog'], ['sla','frt','aht','on_time_percent','lead_response_time','tat','orders_per_hour','records_per_hour'])
          }),
          ach('backup_staff_10', {
            display: '10% Backup Staff (min 1)', icon: 'users-lifebuoy', category: 'operations',
            hover: achHover('Bench ready when demand spikes or someone is out.', 'Hot-swap coverage without new paperwork', 'Stabilizes SLAs during spikes'),
            triggers: achTriggers(['seasonality','volume_spikes','attrition','coverage_247'], ['sla','on_time_percent','lead_response_time'])
          }),
          ach('coverage_247', {
            display: '24/7 Coverage Ready', icon: 'globe-247', category: 'operations',
            hover: achHover('Follow-the-sun without the headache.', 'Prebuilt rosters and backup bench', 'Timezone handoffs playbook'),
            triggers: achTriggers(['coverage_247','seasonality'], ['sla','frt','tfr','lead_response_time','on_time_percent'])
          }),
          ach('team_lead_dedicated', {
            display: 'Dedicated Team Lead', icon: 'user-badge', category: 'people',
            hover: achHover('One throat to choke. One brain to scale.', 'Daily stand-ups, coaching, escalations', 'KPI ownership at the team level'),
            triggers: achTriggers(['inconsistent_qa','attrition','process_gaps'], ['qa_score','csat','resolution_rate','show_rate','pipeline_hygiene'])
          }),
          ach('daily_microlearning', {
            display: 'Daily Micro-learning', icon: 'calendar-dots', category: 'learning',
            hover: achHover('100 workdays = 100 micro lessons.', 'Feedback-fed micro-lessons', 'Continuous calibration to your SOPs'),
            triggers: achTriggers(['inconsistent_qa','attrition'], ['qa_score','fcr','accuracy','qa_pass_rate','iaa'])
          }),
          ach('prelearning_3day', {
            display: '3-day Niche Pre-learning', icon: 'book-flash', category: 'learning',
            hover: achHover('Arrive trained for your niche on Day 1.', 'Role+vertical boot-up', 'Tools and SOPs preview'),
            triggers: achTriggers(['long_ramp_time'], ['aht','error_rate','escalation_rate','tfr'])
          }),
          ach('genai_screening', {
            display: 'Gen-AI Skills Screening', icon: 'brain-chip', category: 'learning',
            hover: achHover('Language, logic & tech screened by AI.', 'Pre-hire scoring tuned to your role', 'Reduces time-to-ramp'),
            triggers: achTriggers(['long_ramp_time','attrition'], ['meetings_per_rep_week','sqls','connect_rate','reply_rate','show_rate'])
          }),
          ach('qa_rubric_gates', {
            display: 'QA Rubric & Gates', icon: 'clipboard-check', category: 'quality',
            hover: achHover('Predictable quality → better KPIs.', 'Role-specific rubrics', 'Double-checks on high-risk steps'),
            triggers: achTriggers(['inconsistent_qa','process_gaps','data_hygiene'], ['qa_score','accuracy','qa_pass_rate','iaa','error_rate','rework_rate','rework_percent'])
          }),
          ach('sops_playbooks', {
            display: 'SOPs & Playbooks', icon: 'docs-stack', category: 'process',
            hover: achHover('Documented, repeatable, improvable.', 'Signed-off SOPs and versioning', 'Fewer escalations and rework'),
            triggers: achTriggers(['process_gaps','backlog','data_hygiene'], ['orders_per_hour','records_per_hour','tat','rework_rate','pipeline_hygiene','backlog_age'])
          }),
          ach('work_in_your_stack', {
            display: 'Work in Your Stack', icon: 'link-puzzle', category: 'integrity',
            hover: achHover('We work inside your CRM/apps/analytics.', 'No forced migrations', 'Data stays in your systems'),
            triggers: achTriggers(['tool_fragmentation'], ['pipeline_value','pipeline_hygiene','data_hygiene_percent','duplicate_rate','sla_updates'])
          }),
          ach('light_integrations', {
            display: 'Light Integrations', icon: 'plug', category: 'integrations',
            hover: achHover('Connect the dots without heavy IT.', 'Quick connectors, exports, webhooks', 'Sane automation where it counts'),
            triggers: achTriggers(['tool_fragmentation','process_gaps','data_hygiene'], ['lead_response_time','tat','enrichment_throughput','pipeline_value'])
          }),
          ach('soc2_facilities', {
            display: 'SOC-2 Facilities', icon: 'shield-soc2', category: 'compliance',
            hover: achHover('Enterprise-grade security by default.', 'Biometric access', 'Power/internet redundancy'),
            triggers: achTriggers(['security'], [])
          })
        ]),
      };

      const KPI_LABELS = (() => {
        const map = {};
        Object.values(DATA.roles || {}).forEach(role => {
          (role.kpis || []).forEach(k => { if (k && k.key) map[k.key] = k.label || k.key; });
        });
        return map;
      })();

      const PROBLEM_LABELS = (() => {
        const map = {};
        (DATA.problems || []).forEach(problem => {
          if (problem && problem.id) map[problem.id] = problem.label || problem.id;
        });
        return map;
      })();

      const roleLabel = (key) => (DATA.roles && DATA.roles[key] && DATA.roles[key].display) ? DATA.roles[key].display : key;
      const kpiLabel = (key) => KPI_LABELS[key] || key;
      const problemLabel = (id) => PROBLEM_LABELS[id] || id;

      // selections on slide 2
      const DEFAULT_PROBLEMS = ['expensive_local_hiring','virtual_agents_hiring_risks'];
      const ROLE_KPI_DEFAULTS = {
        customer_support: ['csat','fcr'],
        sdr: ['meetings_per_rep_week','sqls'],
        live_chat: ['frt','csat'],
        tech_support_l1: ['tfr','fcr'],
        order_processing: ['on_time_percent','error_rate'],
        data_entry: ['accuracy','records_per_hour'],
        crm_management: ['data_hygiene_percent','duplicate_rate'],
        data_labeling: ['qa_pass_rate','iaa']
      };
      const ROLE_PROBLEM_DEFAULTS = {
        customer_support: ['inconsistent_qa'],
        sdr: ['long_ramp_time'],
        live_chat: ['coverage_247'],
        tech_support_l1: ['backlog'],
        order_processing: ['process_gaps'],
        data_entry: ['data_hygiene'],
        crm_management: ['tool_fragmentation'],
        data_labeling: ['inconsistent_qa']
      };
      const kpiSelected = new Set(); // store KPI keys
      const problemSelected = new Set(DEFAULT_PROBLEMS); // store problem ids (preselect defaults)

      const telemetry = {
        slide1: { role_sequence: [], mobile_tabs: { back_office_visited: false } },
        slide2: { kpi_toggles: slide2ToggleLog.kpis, problems_toggles: slide2ToggleLog.problems },
        slide3: { opened_sequence: [] },
        slide4: {
          team_size_seq: [],
          inhouse_rate_seq: [],
          coverage_hours_seq: [],
          coverage_days_seq: [],
          currency_seq: [],
          included_cta_tapped: false
        },
        slide5: { enter_platform_clicked: false }
      };

      const defaultsLogged = {
        kpi: new Set(),
        problem: new Set()
      };

      // Высота/верстка решена через CSS Grid и токены —
      // JS-пересчёты не требуются.

      function updateProgress(){
        const pct = ((current + 1) / total) * 100;
        progress.style.width = pct + '%';
      }

      // Simplified header update using arrays
      const TITLES = (UI && Array.isArray(UI.steps)) ? UI.steps : [];
      const SUBS = [
        UI?.subtitles?.step1 || '',
        UI?.subtitles?.step2 || '',
        '',
        '',
        UI?.subtitles?.step5 || ''
      ];
      function updateHeader(){
      const title = root.querySelector('.aq__title');
      const sub = root.querySelector('.aq__sub');
      const t = TITLES[current] || '';
      let s = SUBS[current] || '';
      if (current === 2) {
        s = isDesktop()
          ? (UI?.subtitles?.step3Desktop || 'Hover a card to see details.')
          : (UI?.subtitles?.step3Mobile || 'Tap a card to see details.');
      } else if (current === 3) {
        s = isDesktop()
          ? (UI?.subtitles?.step4Desktop || 'Hover a card to see what’s included.')
          : (UI?.subtitles?.step4Mobile || 'Tap a card to see what’s included.');
      }
      if (title) title.textContent = t;
      if (sub) sub.textContent = s;
      // stepper states
        root.querySelectorAll('.stepper .step').forEach((el, idx) => {
          el.setAttribute('data-state', (idx < current) ? 'done' : (idx === current ? 'now' : 'todo'));
          if (idx === current) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
        });
      }

      function setSlide(index){
        current = Math.max(0, Math.min(index, total - 1));
        root.dataset.slide = String(current);
        const track = root.querySelector('#aqTrack');
        const visibleSlide = Math.min(current, 4);
        track.style.transform = `translateX(-${visibleSlide * 100}%)`;
        updateHeader();
        updateProgress();
        updateButtons();
        if (current !== 2 && typeof solutionsIntroCleanup === 'function') {
          solutionsIntroCleanup();
        }
        if (current >= 3) {
          ensureCalcInit();
        }
        if (current >= 4) ensureOfferInit();

        const idx = current + 1;
        const slideKey = 's' + idx;
        if (Object.prototype.hasOwnProperty.call(slidesSeen, slideKey)) {
          slidesSeen[slideKey] = true;
        }
        dl('quiz_slide_view', {
          slide_idx: idx,
          slide_name: SLIDE_NAMES[current],
          slides_seen: { ...slidesSeen }
        });
      }

      let noticeTimer = null;
      let solutionsIntroShown = false;
      let solutionsIntroActive = false;
      let solutionsIntroTimer = null;
      let solutionsIntroCleanup = null;
      function showNotice(text){
        const holder = root.querySelector('.aq__status');
        holder.innerHTML = '';
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = text;
        holder.appendChild(el);
        // small async to allow transition
        requestAnimationFrame(() => { el.setAttribute('data-show','true'); });
        if (noticeTimer) clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => {
          el.removeAttribute('data-show');
          setTimeout(() => { holder.innerHTML = ''; }, 300);
        }, 2200);
      }

      function applyRoleKpiDefaults(roleKey){
        kpiSelected.clear();
        (ROLE_KPI_DEFAULTS[roleKey] || []).forEach(key => kpiSelected.add(key));
      }

      function applyRoleProblemDefaults(roleKey){
        problemSelected.clear();
        DEFAULT_PROBLEMS.forEach(id => problemSelected.add(id));
        (ROLE_PROBLEM_DEFAULTS[roleKey] || []).forEach(id => problemSelected.add(id));
      }

      function createOption(label, value, isSelected=false, isDefault=false){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option';
        btn.setAttribute('data-selected', String(!!isSelected));
        if (isDefault) btn.setAttribute('data-default','true');
        btn.innerHTML = `<span class="option__label"></span><span class="option__check" aria-hidden="true"></span>`;
        btn.querySelector('.option__label').textContent = label;
        btn.dataset.value = value;
        return btn;
      }

      function renderRequirements(){
        if (!selectedRole || !DATA.roles[selectedRole]) return;
        const role = DATA.roles[selectedRole];
        const roleKey = selectedRole || 'global';

        const kpiItems = [...(role.kpis || [])]
          .map(({ key, label }) => ({ value: key, label: label || key }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
        const defaultKpis = ROLE_KPI_DEFAULTS[roleKey] || [];
        renderOptionGroup({
          containerSelector: '#kpiList',
          items: kpiItems,
          selectedSet: kpiSelected,
          defaultIds: defaultKpis,
          optionClass: 'gtm-i--select__kpi'
        });
        logDefaults('kpi', defaultKpis, roleKey);

        const problemItems = [...(DATA.problems || [])]
          .map(({ id, label }) => ({ value: id, label: label || id }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
        const defaultProblemIds = Array.from(new Set([...DEFAULT_PROBLEMS, ...(ROLE_PROBLEM_DEFAULTS[roleKey] || [])]));
        renderOptionGroup({
          containerSelector: '#problemList',
          items: problemItems,
          selectedSet: problemSelected,
          defaultIds: defaultProblemIds,
          optionClass: 'gtm-i--select__problem'
        });
        logDefaults('problem', defaultProblemIds, roleKey);

        updateRequirementCounts();
      }

      function renderSolutionsAndCases(){
        if (!selectedRole || !DATA.roles[selectedRole]) return;
        const solList = root.querySelector('#solutionsList');
        if (!solList) return;
        solList.innerHTML = '';

        // Collect achievements by triggers + always visible
        const cfg = DATA.achievements_config || { render_order: [], always_visible: [] };
        const achievements = DATA.achievements || {};
        const orderIndex = new Map((cfg.render_order || []).map((id, i) => [id, i]));

        const selectedProblemIds = Array.from(problemSelected);
        const selectedKpiKeys = Array.from(kpiSelected);

        const includeSet = new Set(cfg.always_visible || []);
        Object.entries(achievements).forEach(([id, item]) => {
          const tr = item.triggers || { by_problems: [], by_kpis: [] };
          const byP = tr.by_problems || [];
          const byK = tr.by_kpis || [];
          const matchP = byP.length > 0 && byP.some(p => selectedProblemIds.includes(p));
          const matchK = byK.length > 0 && byK.some(k => selectedKpiKeys.includes(k));
          if (matchP || matchK) includeSet.add(id);
        });

        const sortedSolutions = Array.from(includeSet)
          .map(id => ({ id, item: achievements[id] }))
          .filter(entry => entry.item)
          .sort((a, b) => {
            const la = a.item?.display || '';
            const lb = b.item?.display || '';
            const byName = la.localeCompare(lb, undefined, { sensitivity: 'base' });
            if (byName !== 0) return byName;
            const ia = orderIndex.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
            const ib = orderIndex.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
            return ia - ib;
          });

        // Render solution tiles (head + details below)
        const alwaysVisible = new Set(cfg.always_visible || []);
        sortedSolutions.forEach(({ id, item }) => {
          const wrap = el('div','soltile');
          if (id) wrap.setAttribute('data-solution', id);
          const head = el('div','tile tile--head soltile__head', `<span class="solcard__icon" aria-hidden="true">${iconSvg(item.icon)}</span><h4 class="solcard__title">${item.display}</h4>`);
          head.classList.add('gtm-i--tile__solution');
          const needsBadge = (item && Object.prototype.hasOwnProperty.call(item, 'included'))
            ? item.included !== false
            : true;
          if (needsBadge) {
            const badge = el('span','tile__badge tile__badge--salad','INCLUDED');
            head.appendChild(badge);
          }
          wrap.appendChild(head);
          const det = buildDetailsElement(item.hover);
          if (det) {
            det.classList.add('gtm-i--tile__solution_details');
            wrap.appendChild(det);
          }
          solList.appendChild(wrap);
        });

        // Cases removed

        triggerSolutionsIntro();
      }

      function triggerSolutionsIntro(){
        if (solutionsIntroShown) return;
        const slide = root.querySelector('.aq__slide--solutions');
        if (!slide) return;
        const firstTile = slide.querySelector('.soltile');
        if (!firstTile) return;
        if (!isDesktop()) return;
        solutionsIntroShown = true;

        solutionsIntroActive = true;
        firstTile.classList.add('is-open','soltile--intro');

        const clearIntro = () => {
          if (solutionsIntroTimer) {
            clearTimeout(solutionsIntroTimer);
            solutionsIntroTimer = null;
          }
          firstTile.classList.remove('soltile--intro');
          solutionsIntroActive = false;
          if (!firstTile.matches(':hover') && !firstTile.contains(document.activeElement)) {
            firstTile.classList.remove('is-open');
          }
          solutionsIntroCleanup = null;
        };

        solutionsIntroCleanup = clearIntro;
        solutionsIntroTimer = window.setTimeout(clearIntro, 4500);
      }

      function updateButtons(){
        const back = root.querySelector('#btnBack');
        const next = root.querySelector('#btnNext');
        back.disabled = current === 0;
        const isLastSlide = current >= total - 1;
        next.disabled = isLastSlide;
      }

      function clearSelections(){
        document.querySelectorAll('.card[data-selected]')
          .forEach(el => el.setAttribute('data-selected','false'));
      }

      // Role selection (single) — delegated
      root.addEventListener('click', (e) => {
        const roleCard = e.target.closest('.card');
        if (roleCard && root.contains(roleCard)) {
          const nextRole = roleCard.getAttribute('data-role');
          if (!nextRole) return;
          dl('quiz_role_select', {
            role_id: nextRole,
            role_label: roleLabel(nextRole)
          });
          const changed = selectedRole !== nextRole;
          clearSelections();
          roleCard.setAttribute('data-selected', 'true');
          selectedRole = nextRole;
          if (changed) {
            applyRoleKpiDefaults(selectedRole);
            applyRoleProblemDefaults(selectedRole);
            if (current >= 1) renderRequirements();
          }
          updateButtons();
        }
      });

      // Generic tabs binder
      function bindTabs(buttons, getTargetSelector){
        buttons.forEach(btn => btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-tab') || btn.getAttribute('data-req-tab');
          buttons.forEach(b => b.setAttribute('aria-selected', String(b === btn)));
          root.querySelectorAll(getTargetSelector()).forEach(el => {
            const key = el.getAttribute('data-tab') || el.getAttribute('data-panel');
            el.setAttribute('data-active', String(key === val));
          });
        }));
      }

      // Tabs (≤768) — slide 1 (roles)
      bindTabs(
        root.querySelectorAll('.aq__slide--roles .tabs__btn[data-tab]'),
        () => '.roles__col'
      );
      root.querySelectorAll('.aq__slide--roles .tabs__btn[data-tab="back"]').forEach(btn => {
        btn.addEventListener('click', () => {
          telemetry.slide1.mobile_tabs.back_office_visited = true;
          if (!isDesktop()) {
            dl('quiz_tab_click', {
              tab_scope: 'slide1',
              tab_id: 'back_office',
              clicked: true
            });
          }
        }, { capture: true });
      });
      // Tabs (≤768) — slide 2 (requirements)
      bindTabs(
        root.querySelectorAll('.aq__slide--requirements .tabs__btn[data-req-tab]'),
        () => '.aq__slide--requirements .panel'
      );
      const tabsState = {
        problemsVisited: false
      };
      root.querySelectorAll('.aq__slide--requirements .tabs__btn[data-req-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-req-tab');
          if (val === 'problems') {
            tabsState.problemsVisited = true;
            if (!isDesktop()) {
              dl('quiz_tab_click', {
                tab_scope: 'slide2',
                tab_id: 'problems',
                clicked: true
              });
            }
          }
        });
      });

      // Mobile: toggle inline details like a bottom sheet on slide 3
      root.addEventListener('click', (e) => {
        if (!window.matchMedia('(max-width: ' + CFG.mobileBP + 'px)').matches) return;
        const head = e.target.closest('.soltile__head');
        if (head) {
          const tile = head.closest('.soltile');
          if (!tile) return;
          const parentSolutionsSlide = tile.closest('.aq__slide--solutions');
          if (parentSolutionsSlide) {
            const isAlreadyOpen = tile.classList.contains('is-open');
            parentSolutionsSlide.querySelectorAll('.soltile.is-open').forEach(other => {
              if (other !== tile) other.classList.remove('is-open');
            });
            tile.classList.toggle('is-open', !isAlreadyOpen);
            return;
          }

          // Fallback for tiles rendered outside solutions slide
          const titleElement = tile.querySelector('.solcard__title');
          const title = titleElement ? titleElement.textContent : 'Solution details';
          const detailsElement = tile.querySelector('.soltile__details');
          const content = detailsElement ? detailsElement.innerHTML : 'No details available.';
          openSolutionModal(title, content);
          return;
        }
      });

      // Case links removed

      // Apply localized labels to tabs/panels/buttons
      const kpisTitle = root.querySelector('.aq__slide--requirements [data-panel="kpis"] .panel__title');
      const probsTitle = root.querySelector('.aq__slide--requirements [data-panel="problems"] .panel__title');
      if (kpisTitle) {
        const label = kpisTitle.querySelector('[data-label="kpis"]');
        if (label) label.textContent = UI.panels.kpis;
      }
      if (probsTitle) {
        const label = probsTitle.querySelector('[data-label="problems"]');
        if (label) label.textContent = UI.panels.problems;
      }
      const btnBack = root.querySelector('#btnBack');
      const btnNext = root.querySelector('#btnNext');
      if (btnBack) btnBack.textContent = UI.ctas.back;
      if (btnNext) btnNext.textContent = UI.ctas.next;

      // Footer buttons (navigation)
      root.querySelector('#btnBack').addEventListener('click', () => {
        if (current > 0) setSlide(current - 1);
      });
      root.querySelector('#btnNext').addEventListener('click', () => {
        const prev = current;
        if (prev === 0) {
          if (!selectedRole) {
            showNotice('Please select a function first.');
            return;
          }
          renderRequirements();
          dl('quiz_slide1_summary', {
            role: selectedRole ? { id: selectedRole, label: roleLabel(selectedRole) } : null,
            role_sequence: telemetry.slide1.role_sequence.map(({ id, label }) => ({ id, label })),
            mobile_back_office_clicked: telemetry.slide1.mobile_tabs.back_office_visited === true
          });
        } else if (prev === 1) {
          const isMobile = !isDesktop();
          if (isMobile && !tabsState.problemsVisited) {
            tabsState.problemsVisited = true;
            const problemsTabBtn = root.querySelector('.aq__slide--requirements .tabs__btn[data-req-tab="problems"]');
            const isProblemsActive = problemsTabBtn && problemsTabBtn.getAttribute('aria-selected') === 'true';
            if (problemsTabBtn && !isProblemsActive) {
              problemsTabBtn.click();
            }
          }
          renderSolutionsAndCases();
          const kpiFinal = Array.from(kpiSelected);
          const defaultKpis = Array.from(new Set(ROLE_KPI_DEFAULTS[selectedRole] || []));
          const kpiStates = kpiFinal.map(id => ({
            id,
            label: kpiLabel(id),
            state: defaultKpis.includes(id) ? 'default' : 'selected'
          }));
          const removedKpis = defaultKpis
            .filter(id => !kpiFinal.includes(id))
            .map(id => ({ id, label: kpiLabel(id), state: 'removed' }));

          const defaultProblems = Array.from(new Set([...DEFAULT_PROBLEMS, ...(ROLE_PROBLEM_DEFAULTS[selectedRole] || [])]));
          const problemFinal = Array.from(problemSelected);
          const problemStates = problemFinal.map(id => ({
            id,
            label: problemLabel(id),
            state: defaultProblems.includes(id) ? 'default' : 'selected'
          }));
          const removedProblems = defaultProblems
            .filter(id => !problemFinal.includes(id))
            .map(id => ({ id, label: problemLabel(id), state: 'removed' }));

          dl('quiz_req_summary', {
            kpis: [...kpiStates, ...removedKpis],
            problems: [...problemStates, ...removedProblems],
            mobile_problems_tab_clicked: tabsState.problemsVisited === true
          });
        }
        if (prev === 3) {
          pushCalcSummary('next');
        }
        if (prev < CFG.totalSteps - 1) setSlide(prev + 1);
      });

      // Slide 4: Calculator logic
      let calcInitialized = false;
      let calcStateSnapshot = null;
      let calcRates = {};
      let calcDefaults = null;
      let calcDefaultsLogged = false;

      function pushCalcSummary(trigger = 'summary') {
        if (!calcStateSnapshot) return;
        const state = calcStateSnapshot;
        const changed = state.changedFields instanceof Set
          ? state.changedFields
          : new Set(Array.isArray(state.changedFields) ? state.changedFields : []);
        if (!(state.changedFields instanceof Set)) {
          state.changedFields = changed;
        }
        const defaults = calcDefaults || {};
        const currency = state.currency || 'USD';
        const rate = (calcRates && Object.prototype.hasOwnProperty.call(calcRates, currency))
          ? calcRates[currency]
          : (DATA?.calculator?.currencies?.[currency] ?? null);
        state.hourlyRate = rate;
        const historySource = {
          team_size: telemetry?.slide4?.team_size_seq || [],
          hours_per_day: telemetry?.slide4?.coverage_hours_seq || [],
          days_per_week: telemetry?.slide4?.coverage_days_seq || [],
          inhouse_rate: telemetry?.slide4?.inhouse_rate_seq || [],
          currency: (telemetry?.slide4?.currency_seq || []).map(code => String(code || '').toUpperCase())
        };
        const ensureHistory = (field, fallbackValue) => {
          const source = historySource[field];
          if (Array.isArray(source) && source.length) return [...source];
          return fallbackValue !== undefined ? [fallbackValue] : [];
        };
        const currencyHistory = ensureHistory('currency', currency);
        if (!currencyHistory.includes(currency)) currencyHistory.push(currency);
        historySource.currency = currencyHistory;
        const hourlyRateHistory = currencyHistory.map(code => (
          (calcRates && Object.prototype.hasOwnProperty.call(calcRates, code))
            ? calcRates[code]
            : (DATA?.calculator?.currencies?.[code] ?? null)
        ));
        const sanitizedHourlyHistory = hourlyRateHistory.filter(v => v != null && !Number.isNaN(v));
        const historyPayload = {
          team_size: ensureHistory('team_size', state.team),
          hours_per_day: ensureHistory('hours_per_day', state.hoursPerDay),
          days_per_week: ensureHistory('days_per_week', state.daysPerWeek),
          inhouse_rate: ensureHistory('inhouse_rate', state.inhouseRate),
          currency: currencyHistory,
          hourly_rate: sanitizedHourlyHistory.length ? sanitizedHourlyHistory : [rate]
        };
        const fieldState = (field, value) => {
          if (defaults.hasOwnProperty(field)) {
            return defaults[field] === value ? 'default' : 'changed';
          }
          return changed.has(field) ? 'changed' : 'default';
        };
        const fields = [
          { field: 'team_size', value: state.team, history: historyPayload.team_size },
          { field: 'hours_per_day', value: state.hoursPerDay, history: historyPayload.hours_per_day },
          { field: 'days_per_week', value: state.daysPerWeek, history: historyPayload.days_per_week },
          { field: 'inhouse_rate', value: state.inhouseRate, history: historyPayload.inhouse_rate },
          { field: 'currency', value: currency, history: historyPayload.currency },
          { field: 'hourly_rate', value: rate, history: historyPayload.hourly_rate }
        ].map(entry => ({
          field: entry.field,
          value: entry.value,
          state: fieldState(entry.field, entry.value),
          history: entry.history
        }));
        dl('quiz_calc_summary', {
          team_size: state.team,
          hours_per_day: state.hoursPerDay,
          days_per_week: state.daysPerWeek,
          inhouse_rate: state.inhouseRate,
          currency,
          hourly_rate: rate,
          trigger,
          fields,
          history: historyPayload
        });
      }

      function ensureCalcInit(){ if (!calcInitialized) { initCalculator(); calcInitialized = true; } }

      function initCalculator(){
        const cfg = DATA.calculator || {};
        const rates = (cfg.currencies) || { USD: 11, AUD: 16, NZD: 17, CAD: 14 };
        calcRates = rates;
        const defaults = (cfg.defaults) || { team: 5, hours_per_day: 8, days_per_week: 5, currency: 'USD' };
        const minTeam = Number(cfg.min_team || 5);
        const maxTeam = Number(cfg.max_team || 150);
        const teamStep = Number(cfg.team_step || 1);
        const inhouseMin = Number(cfg.inhouse_min ?? 15);
        const inhouseMax = Number(cfg.inhouse_max ?? 40);
        const inhouseStepRaw = Number(cfg.inhouse_step ?? 5);
        const inhouseStep = Number.isFinite(inhouseStepRaw) && inhouseStepRaw > 0 ? inhouseStepRaw : 5;
        const clampTeam = (value) => {
          const num = Math.floor(Number(value) || 0);
          return Math.max(minTeam, Math.min(maxTeam, num));
        };
        const normalizeInhouse = (value) => {
          const num = Number(value);
          if (!Number.isFinite(num)) return inhouseMin;
          const clamped = Math.min(inhouseMax, Math.max(inhouseMin, num));
          const steps = inhouseStep > 0 ? Math.round((clamped - inhouseMin) / inhouseStep) : 0;
          return Math.min(inhouseMax, Math.max(inhouseMin, inhouseMin + steps * inhouseStep));
        };
        const state = {
          team: clampTeam(defaults.team || minTeam),
          hoursPerDay: defaults.hours_per_day || 8,
          daysPerWeek: defaults.days_per_week || 5,
          currency: String(defaults.currency || 'USD').toUpperCase(),
          inhouseRate: normalizeInhouse(defaults.inhouse_rate ?? 25),
          hourlyRate: null,
          changedFields: new Set()
        };
        state.hourlyRate = rates[state.currency] ?? rates.USD;
        calcDefaults = {
          team_size: state.team,
          hours_per_day: state.hoursPerDay,
          days_per_week: state.daysPerWeek,
          inhouse_rate: state.inhouseRate,
          currency: state.currency,
          hourly_rate: state.hourlyRate
        };
        calcDefaultsLogged = false;
        calcStateSnapshot = state;

        const getCurrencyLabel = (cur) => {
          const code = String(cur || defaults.currency || 'USD').toUpperCase();
          const rate = rates[code] ?? rates.USD;
          return `${rate} ${code}`;
        };

        // DOM refs
        const elTeam = root.querySelector('#teamSize');
        const btnMinus = root.querySelector('#teamMinus');
        const btnPlus = root.querySelector('#teamPlus');
        const presets = Array.from(root.querySelectorAll('.preset[data-team]'));
        const teamSlider = root.querySelector('#teamSlider');
        const teamSliderWrap = root.querySelector('#teamSliderWrap');
        const teamValueDisplay = root.querySelector('#teamValueDisplay');
        const teamMinDisplay = root.querySelector('#teamSliderMin');
        const teamMaxDisplay = root.querySelector('#teamSliderMax');
        const selHours = root.querySelector('#hoursPerDay');
        const selDays = root.querySelector('#daysPerWeek');
        const inhouse = root.querySelector('#inhouseRate');
        const inMinus = root.querySelector('#inhouseMinus');
        const inPlus = root.querySelector('#inhousePlus');
        const inhouseSlider = root.querySelector('#inhouseSlider');
        const inhouseSliderWrap = root.querySelector('#inhouseSliderWrap');
        const inhouseSliderScale = root.querySelector('#inhouseSliderScale');
        const inhouseValueDisplay = root.querySelector('#inhouseValueDisplay');
        const currencyBtns = Array.from(root.querySelectorAll('#currencySwitch .segmented__btn'));
        const outMonthly = root.querySelector('#outMonthly');
        const outAnnual = root.querySelector('#outAnnual');
        const outInhouseWrap = root.querySelector('#outInhouseWrap');
        const outInhouseMonthly = root.querySelector('#outInhouseMonthly');
        const outSavingsWrap = root.querySelector('#outSavingsWrap');
        const outSavings = root.querySelector('#outSavings');
        const outputsCurrencyLabel = root.querySelector('#outputsCurrencyLabel');
        const outputsCurrencyFlag = root.querySelector('#outputsCurrencyFlag');
        const outputsCurrencyChip = root.querySelector('#outputsCurrencyChip');
        const outputsCurrencyMenu = root.querySelector('#outputsCurrencyMenu');
        const outputsCurrencySwitcher = root.querySelector('#outputsCurrencySwitcher');
        const outputsCurrencyMenuItems = outputsCurrencyMenu ? Array.from(outputsCurrencyMenu.querySelectorAll('.currency-menu__item')) : [];
        const inputCurrencyChip = root.querySelector('#inputCurrencyChip');
        const inputCurrencyMenu = root.querySelector('#inputCurrencyMenu');
        const inputCurrencyFlag = root.querySelector('#inputCurrencyFlag');
        const inputCurrencyLabel = root.querySelector('#inputCurrencyLabel');
        const inputCurrencySwitcher = root.querySelector('#inputCurrencySwitcher');
        const inputCurrencyMenuItems = inputCurrencyMenu ? Array.from(inputCurrencyMenu.querySelectorAll('.currency-menu__item')) : [];

        // Populate selects (generic range filler)
        function fillSelectRange(sel, from, to, def, makeLabel){
          sel.innerHTML = '';
          for (let v = from; v <= to; v++){
            const opt = document.createElement('option');
            opt.value = String(v);
            opt.textContent = makeLabel ? makeLabel(v) : String(v);
            if (v === def) opt.selected = true;
            sel.appendChild(opt);
          }
        }
        const shortLabelHours = (v) => `${v} h/day`;
        const longLabelHours = (v) => `${v} hours/day`;
        const shortLabelDays = (v) => `${v} d/wk`;
        const longLabelDays = (v) => `${v} days/week`;
        const useShort = () => window.matchMedia('(max-width: 480px)').matches;
        function fillCoverageLabels(){
          fillSelectRange(selHours, 4, 24, state.hoursPerDay, useShort() ? shortLabelHours : longLabelHours);
          fillSelectRange(selDays, 1, 7, state.daysPerWeek, useShort() ? shortLabelDays : longLabelDays);
        }
        fillCoverageLabels();
        // Re-evaluate labels on viewport changes (mobile rotations etc.)
        const mq480 = window.matchMedia('(max-width: 480px)');
        if (mq480 && mq480.addEventListener) mq480.addEventListener('change', fillCoverageLabels);
        else if (mq480 && mq480.addListener) mq480.addListener(fillCoverageLabels);
        elTeam.min = String(minTeam);
        elTeam.max = String(maxTeam);
        elTeam.step = String(teamStep);
        elTeam.value = String(state.team);
        if (teamSlider) {
          teamSlider.min = String(minTeam);
          teamSlider.max = String(maxTeam);
          teamSlider.step = String(teamStep);
          teamSlider.value = String(state.team);
        }
        if (teamMinDisplay) teamMinDisplay.textContent = String(minTeam);
        if (teamMaxDisplay) teamMaxDisplay.textContent = String(maxTeam);
        if (inhouse) {
          inhouse.min = String(inhouseMin);
          inhouse.max = String(inhouseMax);
          inhouse.step = String(inhouseStep);
          inhouse.value = String(state.inhouseRate);
        }
        if (inhouseSlider) {
          inhouseSlider.min = String(inhouseMin);
          inhouseSlider.max = String(inhouseMax);
          inhouseSlider.step = String(inhouseStep);
          inhouseSlider.value = String(state.inhouseRate);
        }
        const totalSteps = inhouseStep > 0 ? Math.round((inhouseMax - inhouseMin) / inhouseStep) : 0;
        if (inhouseSliderScale) {
          inhouseSliderScale.innerHTML = '';
          for (let i = 0; i <= totalSteps; i++) {
            const tickValue = normalizeInhouse(inhouseMin + i * inhouseStep);
            const tick = document.createElement('span');
            const ratio = totalSteps > 0 ? (i / totalSteps) : 0;
            tick.dataset.ratio = String(ratio);
            tick.textContent = String(tickValue);
            inhouseSliderScale.appendChild(tick);
          }
        }
        function layoutInhouseTicks(){
          if (!inhouseSlider || !inhouseSliderScale) return;
          const ticks = Array.from(inhouseSliderScale.children);
          if (!ticks.length) return;
          const thumbHalf = 9;
          const sliderWidth = inhouseSlider.offsetWidth;
          if (!sliderWidth) return;
          const leftOffset = thumbHalf;
          const rightOffset = thumbHalf;
          const usable = Math.max(0, sliderWidth - leftOffset - rightOffset);
          ticks.forEach((tick, index) => {
            const ratio = Number(tick.dataset.ratio || 0);
            const clamped = Math.min(1, Math.max(0, ratio));
            const x = leftOffset + (usable * clamped);
            tick.style.left = `${x}px`;
            if (index === 0) {
              tick.setAttribute('data-edge', 'start');
              tick.style.transform = 'translateX(0)';
            } else if (index === ticks.length - 1) {
              tick.setAttribute('data-edge', 'end');
              tick.style.transform = 'translateX(-100%)';
            } else {
              tick.removeAttribute('data-edge');
              tick.style.transform = 'translateX(-50%)';
            }
          });
        }
        layoutInhouseTicks();
        let resizeObserver;
        if ('ResizeObserver' in window && inhouseSlider) {
          resizeObserver = new ResizeObserver(() => layoutInhouseTicks());
          resizeObserver.observe(inhouseSlider);
        } else {
          window.addEventListener('resize', layoutInhouseTicks);
        }
        updateCurrencyButtons();

        // Helpers
        const money = (x, cur) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(x);
        function flagSvg(cur){
          const code = String(cur || '').toUpperCase();
          switch (code) {
            case 'USD':
            case 'AUD':
            case 'NZD':
            case 'CAD':
              return useIcon(`flag-${code}`, '0 0 28 20', 'currency-flag');
            default:
              return '';
          }
        }
        function updateCurrencyButtons(){
          if (!currencyBtns.length) return;
          currencyBtns.forEach(btn => {
            const cur = btn.getAttribute('data-cur') || '';
            if (!cur) return;
            btn.textContent = getCurrencyLabel(cur);
            btn.setAttribute('aria-pressed', String(cur === state.currency));
          });
        }
        function compute(){
          const hoursWeek = state.hoursPerDay * state.daysPerWeek;
          const rate = rates[state.currency] || rates.USD;
          const monthly = state.team * rate * hoursWeek * 4.33;
          const annual = monthly * 12;
          const res = { hoursWeek, rate, monthly, annual };
          state.hourlyRate = rate;
          if (state.inhouseRate && Number(state.inhouseRate) > 0){
            const inhouseMonthly = state.team * Number(state.inhouseRate) * hoursWeek * 4.33;
            const savingsAbs = inhouseMonthly - monthly;
            const savingsPct = savingsAbs > 0 ? (savingsAbs / inhouseMonthly) : 0;
            Object.assign(res, { inhouseMonthly, savingsAbs, savingsPct });
          }
          return res;
        }
        const updateSliderVisual = ({ slider, display, value, min, max, track }) => {
          if (slider) slider.value = String(value);
          if (display) display.textContent = String(value);
          const range = Math.max(1, max - min);
          const percent = ((value - min) / range) * 100;
          const target = track || slider;
          if (target && target.style) {
            const clamped = Math.min(100, Math.max(0, percent));
            target.style.setProperty('--slider-progress', `${clamped}%`);
          }
        };

        const bindStepper = ({ minus, plus, input, presets = [], step = 1, getValue, setValue, presetAttr = 'data-value' }) => {
          const apply = (next, source = 'stepper') => setValue(next, source);
          if (minus) minus.addEventListener('click', () => apply(getValue() - step));
          if (plus) plus.addEventListener('click', () => apply(getValue() + step));
          if (input) {
            const handle = () => apply(Number(input.value));
            input.addEventListener('input', handle);
            input.addEventListener('change', handle);
          }
          presets.forEach(btn => {
            btn.addEventListener('click', () => {
              const raw = btn.getAttribute(presetAttr);
              if (raw == null) return;
              const value = Number(raw);
              if (!Number.isFinite(value)) return;
              apply(value);
            });
          });
        };
        const noopCurrencySwitcher = { setValue: () => {}, close: () => {} };
        let outputsSwitcher = noopCurrencySwitcher;
        let inputSwitcher = noopCurrencySwitcher;

        function setCurrency(nextCur, controlSource = 'segmented'){
          const candidate = (nextCur || 'USD').toUpperCase();
          const available = Object.prototype.hasOwnProperty.call(rates, candidate) ? candidate : 'USD';
          if (available === state.currency) {
            outputsSwitcher.close();
            inputSwitcher.close();
            return;
          }
          state.currency = available;
          render();
          emitCalcChange('currency', state.currency, controlSource);
          emitCalcChange('hourly_rate', state.hourlyRate, 'derived_currency');
          outputsSwitcher.close();
          inputSwitcher.close();
        }

        function attachCurrencySwitcher(config, onSelect){
          const {
            container,
            chip,
            label,
            flag,
            menu,
            items
          } = config;
          const select = typeof onSelect === 'function' ? onSelect : () => {};
          if (!chip || !menu) {
            return noopCurrencySwitcher;
          }
          const scope = container || chip.parentElement || menu.parentElement;
          const menuItems = Array.isArray(items) ? items : [];
          let isOpen = false;

          const handleDocumentClick = (evt) => {
            if (!scope || scope.contains(evt.target)) return;
            close();
          };

          const handleDocumentKeydown = (evt) => {
            if (evt.key !== 'Escape') return;
            close();
            chip.focus();
          };

          const setMenuState = (open) => {
            if (isOpen === open) return;
            isOpen = open;
            chip.setAttribute('aria-expanded', String(open));
            menu.setAttribute('data-open', open ? 'true' : 'false');
            if (open) {
              document.addEventListener('click', handleDocumentClick);
              document.addEventListener('keydown', handleDocumentKeydown);
            } else {
              document.removeEventListener('click', handleDocumentClick);
              document.removeEventListener('keydown', handleDocumentKeydown);
            }
          };

          const close = () => setMenuState(false);

          const setValue = (code) => {
            const display = getCurrencyLabel(code);
            if (label) label.textContent = display;
            chip.setAttribute('aria-label', display);
            if (flag) flag.innerHTML = flagSvg(code);
            menuItems.forEach(item => {
              const cur = item.getAttribute('data-cur') || '';
              const active = cur === code;
              item.classList.toggle('is-active', active);
              item.setAttribute('aria-checked', String(active));
              const flagHolder = item.querySelector('.currency-menu__flag');
              if (flagHolder) flagHolder.innerHTML = flagSvg(cur);
              const labelEl = item.querySelector('.currency-menu__label');
              if (labelEl) labelEl.textContent = getCurrencyLabel(cur);
            });
          };

          chip.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            setMenuState(!isOpen);
          });

          chip.addEventListener('keydown', (evt) => {
            if ((evt.key === 'ArrowDown' || evt.key === 'Enter' || evt.key === ' ') && !isOpen) {
              evt.preventDefault();
              setMenuState(true);
              if (menuItems[0]) menuItems[0].focus();
            } else if (evt.key === 'Escape' && isOpen) {
              evt.preventDefault();
              close();
            }
          });

          menu.addEventListener('click', (evt) => evt.stopPropagation());
          menu.addEventListener('keydown', (evt) => {
            if (evt.key === 'Escape') {
              evt.preventDefault();
              close();
              chip.focus();
            }
          });

          if (container) {
            container.addEventListener('focusout', (evt) => {
              if (!isOpen) return;
              const next = evt.relatedTarget;
              if (!next || !container.contains(next)) close();
            });
          }

          menuItems.forEach(item => {
            item.addEventListener('click', (evt) => {
              evt.preventDefault();
              evt.stopPropagation();
              select(item.getAttribute('data-cur') || '');
            });
          });

          return { setValue, close };
        }

        outputsSwitcher = attachCurrencySwitcher(
          {
            container: outputsCurrencySwitcher,
            chip: outputsCurrencyChip,
            label: outputsCurrencyLabel,
            flag: outputsCurrencyFlag,
            menu: outputsCurrencyMenu,
            items: outputsCurrencyMenuItems
          },
          (code) => setCurrency(code, 'menu')
        );

        inputSwitcher = attachCurrencySwitcher(
          {
            container: inputCurrencySwitcher,
            chip: inputCurrencyChip,
            label: inputCurrencyLabel,
            flag: inputCurrencyFlag,
            menu: inputCurrencyMenu,
            items: inputCurrencyMenuItems
          },
          (code) => setCurrency(code, 'menu')
        );

        function render(){
          updateCurrencyButtons();
          outputsSwitcher.setValue(state.currency);
          inputSwitcher.setValue(state.currency);
          if (inhouse) inhouse.value = String(state.inhouseRate);
          updateSliderVisual({
            slider: inhouseSlider,
            display: inhouseValueDisplay,
            value: state.inhouseRate,
            min: inhouseMin,
            max: inhouseMax,
            track: inhouseSliderWrap
          });
          const r = compute();
          outMonthly.textContent = money(r.monthly, state.currency);
          outAnnual.textContent = money(r.annual, state.currency);
          const ih = 'inhouseMonthly' in r;
          outInhouseWrap.hidden = !ih;
          outSavingsWrap.hidden = !ih;
          if (ih){
            outInhouseMonthly.textContent = money(r.inhouseMonthly, state.currency);
            const pct = Math.round((r.savingsPct || 0) * 100);
            const absSave = Math.abs(r.savingsAbs || 0);
            outSavings.innerHTML = `${money(absSave, state.currency)} <span class="pct--savings">(${pct}%)</span>`;
            const deltaPctVsOffer = r.monthly > 0 ? ((r.inhouseMonthly - r.monthly) / r.monthly) : 0;
            const arrow = deltaPctVsOffer > 0.005 ? '↑' : (deltaPctVsOffer < -0.005 ? '↓' : '');
            const deltaPctText = Math.abs(deltaPctVsOffer * 100).toFixed(1) + '%';
            const deltaNode = root.querySelector('#outInhouseDelta');
            if (deltaNode) {
              deltaNode.textContent = arrow ? `${arrow} ${deltaPctText}` : `${deltaPctText}`;
              deltaNode.classList.remove('cheaper','neutral');
              if (deltaPctVsOffer < -0.005) deltaNode.classList.add('cheaper');
              else if (Math.abs(deltaPctVsOffer) <= 0.005) deltaNode.classList.add('neutral');
            }
          }
        }
        // Events
        const calcChangeLast = {
          team_size: undefined,
          hours_per_day: undefined,
          days_per_week: undefined,
          inhouse_rate: undefined,
          currency: undefined,
          hourly_rate: undefined
        };
        const normalizeCalcValue = (field, value) => {
          if (field === 'currency') return String(value || '').toUpperCase();
          const num = Number(value);
          return Number.isFinite(num) ? num : value;
        };
        const emitCalcChange = (field, value, control, stateOverride) => {
          const normalized = normalizeCalcValue(field, value);
          const defaultsMap = calcDefaults || {};
          const hasDefault = Object.prototype.hasOwnProperty.call(defaultsMap, field);
          const isDefault = hasDefault ? defaultsMap[field] === normalized : false;
          const eventState = stateOverride || (isDefault ? 'default' : 'changed');
          if (eventState !== 'default' && calcChangeLast[field] === normalized) return;
          calcChangeLast[field] = normalized;
          if (state.changedFields instanceof Set) {
            if (eventState === 'default') {
              state.changedFields.delete(field);
              if (field === 'currency' || field === 'hourly_rate') {
                state.changedFields.delete('currency');
                state.changedFields.delete('hourly_rate');
              }
            } else {
              state.changedFields.add(field);
              if (field === 'currency') state.changedFields.add('hourly_rate');
            }
          }
          dl('quiz_calc_change', {
            field,
            value: normalized,
            control,
            state: eventState,
            was_default: hasDefault
          });
        };

        updateSliderVisual({
          slider: teamSlider,
          display: teamValueDisplay,
          value: state.team,
          min: minTeam,
          max: maxTeam,
          track: teamSliderWrap
        });
        render();

        if (!calcDefaultsLogged) {
          calcDefaultsLogged = true;
          emitCalcChange('team_size', state.team, 'init', 'default');
          emitCalcChange('hours_per_day', state.hoursPerDay, 'init', 'default');
          emitCalcChange('days_per_week', state.daysPerWeek, 'init', 'default');
          emitCalcChange('inhouse_rate', state.inhouseRate, 'init', 'default');
          emitCalcChange('currency', state.currency, 'init', 'default');
          emitCalcChange('hourly_rate', state.hourlyRate, 'init', 'default');
        }

        function setTeam(v, controlSource){
          const next = clampTeam(v);
          if (next === state.team) {
            elTeam.value = String(state.team);
            updateSliderVisual({
              slider: teamSlider,
              display: teamValueDisplay,
              value: state.team,
              min: minTeam,
              max: maxTeam,
              track: teamSliderWrap
            });
            return;
          }
          state.team = next;
          elTeam.value = String(state.team);
          updateSliderVisual({
            slider: teamSlider,
            display: teamValueDisplay,
            value: state.team,
            min: minTeam,
            max: maxTeam,
            track: teamSliderWrap
          });
          render();
          const control = controlSource || (isMobileDevice() ? 'stepper' : 'slider');
          emitCalcChange('team_size', state.team, control);
        }
        bindStepper({
          minus: btnMinus,
          plus: btnPlus,
          input: elTeam,
          presets,
          step: teamStep,
          getValue: () => state.team,
          setValue: setTeam,
          presetAttr: 'data-team'
        });
        if (teamSlider) teamSlider.addEventListener('input', () => setTeam(Number(teamSlider.value), 'slider'));

        selHours.addEventListener('change', () => {
          const next = Number(selHours.value);
          if (!Number.isFinite(next) || next === state.hoursPerDay) return;
          state.hoursPerDay = next;
          render();
          emitCalcChange('hours_per_day', state.hoursPerDay, 'select');
        });
        selDays.addEventListener('change', () => {
          const next = Number(selDays.value);
          if (!Number.isFinite(next) || next === state.daysPerWeek) return;
          state.daysPerWeek = next;
          render();
          emitCalcChange('days_per_week', state.daysPerWeek, 'select');
        });

        function setInhouse(nextValue, controlSource){
          const next = normalizeInhouse(nextValue);
          if (next === state.inhouseRate) {
            if (inhouse) inhouse.value = String(state.inhouseRate);
            updateSliderVisual({
              slider: inhouseSlider,
              display: inhouseValueDisplay,
              value: state.inhouseRate,
              min: inhouseMin,
              max: inhouseMax,
              track: inhouseSliderWrap
            });
            return;
          }
          state.inhouseRate = next;
          if (inhouse) inhouse.value = String(state.inhouseRate);
          render();
          const control = controlSource || (isMobileDevice() ? 'stepper' : 'slider');
          emitCalcChange('inhouse_rate', state.inhouseRate, control);
        }

        bindStepper({
          minus: inMinus,
          plus: inPlus,
          input: inhouse,
          step: inhouseStep,
          getValue: () => state.inhouseRate,
          setValue: setInhouse
        });
        if (inhouseSlider) inhouseSlider.addEventListener('input', () => setInhouse(Number(inhouseSlider.value), 'slider'));

        if (currencyBtns.length) {
          currencyBtns.forEach(btn => btn.addEventListener('click', () => setCurrency(btn.getAttribute('data-cur') || 'USD', 'segmented')));
        }
      }

      // Slide 5: Offer logic
      let offerInitialized = false;
      let offerSuccessWrapped = false;
      function ensureOfferInit(){ if (!offerInitialized) { initOffer(); offerInitialized = true; } }
      function initOffer(){
        const email = root.querySelector('#offerEmail');
        const name = root.querySelector('#offerName');
        const company = root.querySelector('#offerCompany');
        const btnSend = root.querySelector('#btnSendOffer');
        const btnEnter = root.querySelector('#btnEnterPlatform');
        const hiddenForm = document.getElementById('tildaHiddenForm');
        const hiddenEmail = hiddenForm ? hiddenForm.querySelector('input[name="Email"]') : null;
        const hiddenName = hiddenForm ? hiddenForm.querySelector('input[name="Name"]') : null;
        const hiddenCompany = hiddenForm ? hiddenForm.querySelector('input[name="Company"]') : null;
        const hiddenSubmit = hiddenForm ? hiddenForm.querySelector('.t-submit') : null;

        const maskText = (value) => (value || '').toString().trim().slice(0, 64);
        const maskEmail = (value) => {
          const raw = (value || '').toString().trim();
          return raw ? { email: raw } : null;
        };
        const emitFormInput = (field, payload) => {
          if (!field || !payload) return;
          dl('quiz_form_input', { field, ...payload });
        };

        if (name) {
          name.addEventListener('blur', () => {
            const masked = maskText(name.value);
            if (masked) emitFormInput('name', { value_masked: masked });
          });
        }

        if (company) {
          company.addEventListener('blur', () => {
            const masked = maskText(company.value);
            if (masked) emitFormInput('company', { value_masked: masked });
          });
        }

        if (email) {
          email.addEventListener('blur', () => {
            const masked = maskEmail(email.value);
            if (masked) emitFormInput('email', masked);
          });
        }

        if (btnSend && email) {
          btnSend.addEventListener('click', () => {
            dl('quiz_cta_click', { cta: 'send_offer' });
            const v = (email.value || '').trim();
            const ok = /.+@.+\..+/.test(v);
            if (!ok) { showNotice('Please enter a valid email.'); email.focus(); return; }
            if (!hiddenForm || !hiddenEmail) {
              showNotice('Form handler is not configured. Please try again later.');
              return;
            }
            hiddenEmail.value = v;
            if (hiddenName) hiddenName.value = (name && name.value) ? name.value.trim() : '';
            if (hiddenCompany) hiddenCompany.value = (company && company.value) ? company.value.trim() : '';
            if (hiddenSubmit) hiddenSubmit.click(); else hiddenForm.submit();
            if (email) email.value = '';
            if (name) name.value = '';
            if (company) company.value = '';
            openOfferSuccessModal(btnSend);
          });
        }

        if (btnEnter) {
          btnEnter.addEventListener('click', () => {
            dl('quiz_cta_click', { cta: 'enter_platform' });
            window.open('https://marke.tel/demo/', '_blank', 'noopener');
          });
        }

        if (!offerSuccessWrapped && typeof openOfferSuccessModal === 'function') {
          const originalOpenOfferSuccessModal = openOfferSuccessModal;
          openOfferSuccessModal = function(trigger){
            dl('quiz_offer_submitted');
            return originalOpenOfferSuccessModal.call(this, trigger);
          };
          offerSuccessWrapped = true;
        }
      }

      // Generic selectable list binder
      function bindSelectable(listSelector, selectedSet, opts){
        const { limit = null, lockedSet = new Set(), limitMsg, lockedMsg, onToggle } = opts || {};
        const listEl = root.querySelector(listSelector);
        if (!listEl) return;
        const lockSet = lockedSet instanceof Set ? lockedSet : new Set(lockedSet || []);
        listEl.addEventListener('click', (e) => {
          const btn = e.target.closest('.option'); if (!btn) return;
          const val = btn.dataset.value;
          const selected = btn.getAttribute('data-selected') === 'true';
          const isLocked = lockSet.has(val);
          if (isLocked) { if (lockedMsg) showNotice(lockedMsg); return; }
          if (!selected && limit !== null) {
            const current = selectedSet.size;
          if (current >= limit) { if (limitMsg) showNotice(limitMsg); return; }
        }
        const labelNode = btn.querySelector('.option__label');
        const labelText = labelNode ? labelNode.textContent.trim() : val;
        if (selected) {
          selectedSet.delete(val);
          btn.setAttribute('data-selected', 'false');
          if (typeof onToggle === 'function') onToggle({ id: val, label: labelText, action: 'unselect' });
        } else {
          selectedSet.add(val);
          btn.setAttribute('data-selected', 'true');
          if (typeof onToggle === 'function') onToggle({ id: val, label: labelText, action: 'select' });
        }
        updateRequirementCounts();
      });
      }

      // Bind lists
      const MAX_KPIS = 3;
      const PROBLEM_EXTRA_MAX = 4;

      const recordSlide2Toggle = (store, group) => (entry) => {
        if (!entry || !entry.id) return;
        store.push({
          id: entry.id,
          label: entry.label || entry.id,
          action: entry.action,
          t: nowISO()
        });
        const normalizedState = entry.action === 'select' ? 'selected' : 'removed';
        let wasDefault = false;
        if (group === 'kpi') {
          wasDefault = (ROLE_KPI_DEFAULTS[selectedRole] || []).includes(entry.id);
        } else if (group === 'problem') {
          const defaults = [...DEFAULT_PROBLEMS, ...(ROLE_PROBLEM_DEFAULTS[selectedRole] || [])];
          wasDefault = defaults.includes(entry.id);
        }
        dl('quiz_req_toggle', {
          group,
          id: entry.id,
          label: entry.label || entry.id,
          state: normalizedState,
          was_default: wasDefault
        });
      };
      const recordKpiToggle = recordSlide2Toggle(slide2ToggleLog.kpis, 'kpi');
      const recordProblemToggle = recordSlide2Toggle(slide2ToggleLog.problems, 'problem');

      bindSelectable('#kpiList', kpiSelected, {
        limit: MAX_KPIS,
        limitMsg: UI.toasts.kpiLimit,
        onToggle: recordKpiToggle
      });
      bindSelectable('#problemList', problemSelected, {
        limit: PROBLEM_EXTRA_MAX,
        limitMsg: UI.toasts.problemsLimit,
        onToggle: recordProblemToggle
      });

      function updateRequirementCounts(){
        const pairs = [
          ['kpis', `${kpiSelected.size}/${MAX_KPIS}`],
          ['problems', `${problemSelected.size}/${PROBLEM_EXTRA_MAX}`]
        ];
        pairs.forEach(([key, value]) => {
          const counter = root.querySelector(`[data-counter="${key}"]`);
          if (counter) counter.textContent = value;
        });
        const ensureTabStructure = (key, labelText, countText) => {
          const btn = root.querySelector(`.aq__slide--requirements .tabs__btn[data-req-tab="${key}"]`);
          if (!btn) return;
          btn.innerHTML = `<span class="tabs__label">${labelText}</span><span class="tabs__count">${countText}</span>`;
        };
        pairs.forEach(([key, value]) => ensureTabStructure(key, UI?.tabs?.[key] || key, value));
      }

      // Initialize
      renderStepper();
      updateHeader();
      updateProgress();
      updateButtons();
      renderIncludedSummary();
      updateRequirementCounts();
      setSlide(0);

      (function attachGtmClasses(){
        const add = (selector, ...cls) => {
          root.querySelectorAll(selector).forEach(el => {
            cls.filter(Boolean).forEach(c => el.classList.add(c));
          });
        };

        const section = root.closest('.t396, .t-section, .record') || root.parentElement;
        if (section) section.classList.add('screen_quiz');
        root.classList.add('screen_quiz');

        add('#btnBack', 'gtm-i--tab__prev_step');
        add('#btnNext', 'gtm-i--tab__next_step');

        const stepClasses = ['gtm-i--tab__function','gtm-i--tab__requirements','gtm-i--tab__solution','gtm-i--tab__calculator','gtm-i--tab__get_offer'];
        root.querySelectorAll('.stepper .step').forEach((el, idx) => {
          const cls = stepClasses[idx];
          if (cls) el.classList.add(cls);
        });

        add('.aq__slide--roles .tabs__btn[data-tab="front"]', 'gtm-i--tab__front_office');
        add('.aq__slide--roles .tabs__btn[data-tab="back"]', 'gtm-i--tab__back_office');
        root.querySelectorAll('.aq__slide--roles .card[data-role]').forEach(card => {
          const roleId = card.getAttribute('data-role') || '';
          card.classList.add('gtm-i--select__role');
          if (roleId) card.classList.add(`gtm-i--role__${roleId}`);
        });

        add('.tabs__btn[data-req-tab="kpis"]', 'gtm-i--tab__kpis');
        add('.tabs__btn[data-req-tab="problems"]', 'gtm-i--tab__problems');
        add('#kpiList .option', 'gtm-i--select__kpi');
        add('#problemList .option', 'gtm-i--select__problem');

        add('.aq__slide--solutions .soltile .soltile__head', 'gtm-i--tile__solution');
        add('.aq__slide--solutions .soltile .soltile__details', 'gtm-i--tile__solution_details');

        add('#fieldTeam .stepperbox', 'gtm-i--stepper__team_size');
        add('#teamSlider', 'gtm-i--slider__team_size');
        add('#hoursPerDay', 'gtm-i--select__hours_per_day');
        add('#daysPerWeek', 'gtm-i--select__days_per_week');
        add('#inhouseStepper', 'gtm-i--stepper__inhouse_rate');
        add('#inhouseSlider', 'gtm-i--slider__inhouse_rate');
        root.querySelectorAll('#currencySwitch .segmented__btn').forEach(btn => {
          const cur = (btn.getAttribute('data-cur') || '').toUpperCase();
          btn.classList.add('gtm-i--tab__currency');
          if (cur) btn.classList.add(`gtm-i--currency__${cur}`);
        });
        add('#inputCurrencyChip', 'gtm-i--tab__currency_chip');
        add('#outputsCurrencyChip', 'gtm-i--tab__currency_chip');
        add('#includedCta', 'gtm-i--cta__included_details');

        add('#offerEmail', 'gtm-i--input__email');
        add('#offerName', 'gtm-i--input__name');
        add('#offerCompany', 'gtm-i--input__company');
        add('#btnSendOffer', 'gtm-i--cta__send_offer');
        add('#btnEnterPlatform', 'gtm-i--cta__enter_platform');
      })();

      // Included modal (mobile): build content once and bind events
      const includedModal = document.getElementById('includedModal');
      const includedContent = document.getElementById('includedContent');
      const includedCtaBtn = document.getElementById('includedCta');
      const solutionModal = document.getElementById('solutionModal');
      const solutionModalTitle = document.getElementById('solutionModalTitle');
      const solutionModalContent = document.getElementById('solutionModalContent');
      const offerSuccessModal = document.getElementById('offerSuccessModal');
      const offerSuccessClose = document.getElementById('offerSuccessClose');
      const modalFocusReturn = new WeakMap();

      const setModal = (modal, open, focusBackEl) => {
        if (!modal) return;
        modal.setAttribute('data-open', open ? 'true' : 'false');
        modal.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (open) {
          if (focusBackEl) modalFocusReturn.set(modal, focusBackEl);
          return;
        }
        const focusTarget = focusBackEl || modalFocusReturn.get(modal);
        if (focusTarget && typeof focusTarget.focus === 'function') {
          requestAnimationFrame(() => focusTarget.focus());
        }
        modalFocusReturn.delete(modal);
      };

      function buildIncludedContent(){
        if (!includedContent) return;
        includedContent.innerHTML = INCLUDED_SUMMARY.map(item => (
          `<div class="modal__section">
             <span class="modal__icon" aria-hidden="true">${iconSvg(item.icon)}</span>
             <div>
               <h5>${item.title}</h5>
               <p>${item.modal}</p>
             </div>
           </div>`
        )).join('');
      }

      function openIncluded(){ setModal(includedModal, true); }
      function closeIncluded(){ setModal(includedModal, false); }

      if (includedCtaBtn){
        includedCtaBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          buildIncludedContent();
          dl('quiz_included_details_open');
          openIncluded();
        });
      }

      let currentSolutionData = null;

      function openSolutionModal(title, content) {
        if (!solutionModal) return;
        currentSolutionData = { title, content };
        if (solutionModalTitle) solutionModalTitle.textContent = title;
        if (solutionModalContent) solutionModalContent.innerHTML = content;
        setModal(solutionModal, true);
      }

      function closeSolutionModal() {
        if (!solutionModal) return;
        setModal(solutionModal, false);
        currentSolutionData = null;
      }

      let lastOfferSuccessTrigger = null;

      function openOfferSuccessModal(trigger){
        if (!offerSuccessModal) return;
        lastOfferSuccessTrigger = trigger || document.activeElement;
        setModal(offerSuccessModal, true, lastOfferSuccessTrigger);
        requestAnimationFrame(() => {
          if (offerSuccessClose) offerSuccessClose.focus();
        });
      }

      function closeOfferSuccessModal(){
        if (!offerSuccessModal) return;
        setModal(offerSuccessModal, false, lastOfferSuccessTrigger);
        lastOfferSuccessTrigger = null;
      }

      const modalClosers = new Map();
      if (includedModal) modalClosers.set(includedModal, closeIncluded);
      if (solutionModal) modalClosers.set(solutionModal, closeSolutionModal);
      if (offerSuccessModal) modalClosers.set(offerSuccessModal, closeOfferSuccessModal);

      document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
          const target = event.target;
          const shouldClose = target === modal || (target && typeof target.closest === 'function' && target.closest('[data-close]'));
          if (!shouldClose) return;
          (modalClosers.get(modal) || (() => setModal(modal, false)))();
        });
      });

      window.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const openModal = document.querySelector('.modal[data-open="true"]');
        if (!openModal) return;
        (modalClosers.get(openModal) || (() => setModal(openModal, false)))();
      });

      /* === TELEMETRY + TILDA DATA GLUE (append near end of IIFE) === */
      (function(){

        /* ---------- Slide 1: role sequence + mobile tab ---------- */
        root.addEventListener('click', (event) => {
          const card = event.target.closest('.aq__slide--roles .card[data-role]');
          if (!card) return;
          const roleId = card.getAttribute('data-role');
          if (!roleId) return;
          telemetry.slide1.role_sequence.push({ id: roleId, label: roleLabel(roleId), t: nowISO() });
        }, { capture: true });

        root.querySelectorAll('.aq__slide--roles .tabs__btn[data-tab="back"]').forEach(btn => {
          btn.addEventListener('click', () => { telemetry.slide1.mobile_tabs.back_office_visited = true; });
        });

        /* ---------- Slide 3: opened solution cards ---------- */
        const logSolutionOpen = (tile, how) => {
          if (!tile) return;
          const id = tile.getAttribute('data-solution') || '';
          const title = tile.querySelector('.solcard__title')?.textContent?.trim() || id || 'Solution';
          const nowMs = Date.now();
          const timestamp = new Date(nowMs).toISOString();
          const last = telemetry.slide3.opened_sequence[telemetry.slide3.opened_sequence.length - 1];
          if (last && last.id === id && last.how === how) {
            const prev = Date.parse(last.t || '');
            if (Number.isFinite(prev) && (nowMs - prev) < 1000) return;
          }
          telemetry.slide3.opened_sequence.push({ id, title, how, t: timestamp });
          dl('quiz_solution_open', { solution_id: id, title, how });
        };

        let lastSolutionTrigger = null;
        root.addEventListener('pointerover', (event) => {
          if (!isDesktop()) return;
          if (!event.target.closest('.soltile')) return;
          lastSolutionTrigger = 'hover';
        }, { capture: true });
        root.addEventListener('focusin', (event) => {
          if (!event.target.closest('.soltile')) return;
          lastSolutionTrigger = 'hover';
        }, { capture: true });
        root.addEventListener('pointerdown', (event) => {
          if (isDesktop()) return;
          if (!event.target.closest('.soltile__head')) return;
          lastSolutionTrigger = 'tap';
        }, { capture: true });

        if (typeof lockTile === 'function') {
          const originalLockTile = lockTile;
          lockTile = function(tile){
            originalLockTile(tile);
            const how = lastSolutionTrigger || (isDesktop() ? 'hover' : 'tap');
            if (tile) logSolutionOpen(tile, how);
            lastSolutionTrigger = null;
          };
        }

        root.addEventListener('click', (event) => {
          if (!window.matchMedia('(max-width: ' + CFG.mobileBP + 'px)').matches) return;
          const head = event.target.closest('.soltile__head');
          if (!head) return;
          const tile = head.closest('.soltile');
          if (!tile) return;
          if (tile.classList.contains('is-open')) return;
          logSolutionOpen(tile, 'tap');
        }, { capture: true });

        /* ---------- Slide 4: calculator sequences ---------- */
        const pushIfChanged = (arr, value) => {
          if (value === undefined || value === null) return;
          if (typeof value === 'number' && !Number.isFinite(value)) return;
          if (arr[arr.length - 1] === value) return;
          arr.push(value);
        };

        const originalInitCalculator = initCalculator;
        initCalculator = function(){
          originalInitCalculator();

          const defaults = (DATA?.calculator?.defaults) || {};
          const teamInput = root.querySelector('#teamSize');
          const teamSliderControl = root.querySelector('#teamSlider');
          const teamMinus = root.querySelector('#teamMinus');
          const teamPlus = root.querySelector('#teamPlus');
          const teamPresets = root.querySelectorAll('.preset[data-team]');
          const inhouseInput = root.querySelector('#inhouseRate');
          const inhouseSlider = root.querySelector('#inhouseSlider');
          const inhouseMinus = root.querySelector('#inhouseMinus');
          const inhousePlus = root.querySelector('#inhousePlus');

          const coverageHoursSelect = root.querySelector('#hoursPerDay');
          const coverageDaysSelect = root.querySelector('#daysPerWeek');

          const deriveCurrency = () => {
            const raw = root.querySelector('#outputsCurrencyLabel')?.textContent?.trim();
            if (raw) {
              const parts = raw.split(/\s+/);
              const maybeCode = parts[parts.length - 1];
              if (maybeCode) return maybeCode.toUpperCase();
            }
            return String(defaults.currency || 'USD').toUpperCase();
          };

          const readTeamSize = () => {
            const sources = [
              teamInput && teamInput.value,
              teamSliderControl && teamSliderControl.value,
              defaults.team,
              DATA?.calculator?.defaults?.team
            ];
            for (const raw of sources) {
              const value = Number(raw);
              if (Number.isFinite(value)) return value;
            }
            return null;
          };

          const initialTeam = readTeamSize();
          if (initialTeam !== null) pushIfChanged(telemetry.slide4.team_size_seq, initialTeam);

          if (inhouseInput) pushIfChanged(telemetry.slide4.inhouse_rate_seq, Number(inhouseInput.value || defaults.inhouse_rate || 0));
          if (coverageHoursSelect) pushIfChanged(telemetry.slide4.coverage_hours_seq, Number(coverageHoursSelect.value || defaults.hours_per_day || 0));
          if (coverageDaysSelect) pushIfChanged(telemetry.slide4.coverage_days_seq, Number(coverageDaysSelect.value || defaults.days_per_week || 0));
          pushIfChanged(telemetry.slide4.currency_seq, deriveCurrency());

          const logTeamSize = () => {
            const value = readTeamSize();
            if (value !== null) pushIfChanged(telemetry.slide4.team_size_seq, value);
          };

          const logInhouse = () => { if (inhouseInput) pushIfChanged(telemetry.slide4.inhouse_rate_seq, Number(inhouseInput.value)); };

          if (teamInput) ['input','change'].forEach(evt => teamInput.addEventListener(evt, logTeamSize));
          if (teamSliderControl) teamSliderControl.addEventListener('input', logTeamSize);
          [teamMinus, teamPlus].forEach(btn => btn && btn.addEventListener('click', logTeamSize));
          teamPresets.forEach(btn => btn.addEventListener('click', logTeamSize));

          if (inhouseInput) ['input','change'].forEach(evt => inhouseInput.addEventListener(evt, logInhouse));
          if (inhouseSlider) inhouseSlider.addEventListener('input', logInhouse);
          [inhouseMinus, inhousePlus].forEach(btn => btn && btn.addEventListener('click', logInhouse));

          if (coverageHoursSelect) coverageHoursSelect.addEventListener('change', () => pushIfChanged(telemetry.slide4.coverage_hours_seq, Number(coverageHoursSelect.value)));
          if (coverageDaysSelect) coverageDaysSelect.addEventListener('change', () => pushIfChanged(telemetry.slide4.coverage_days_seq, Number(coverageDaysSelect.value)));

          const currencyButtons = root.querySelectorAll('#currencySwitch .segmented__btn, #outputsCurrencyMenu .currency-menu__item, #inputCurrencyMenu .currency-menu__item');
          currencyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
              const code = (btn.getAttribute('data-cur') || '').toUpperCase();
              if (code) pushIfChanged(telemetry.slide4.currency_seq, code);
            });
          });

          const includedBtn = document.getElementById('includedCta');
          if (includedBtn) includedBtn.addEventListener('click', () => { telemetry.slide4.included_cta_tapped = true; }, { capture: true });
        };

        /* ---------- Slide 5: offer actions + data glue ---------- */
        const originalInitOffer = initOffer;
        initOffer = function(){
          originalInitOffer();

          const hiddenForm = document.getElementById('tildaHiddenForm');
          const ensureHiddenField = (name, id) => {
            if (!hiddenForm) return null;
            let field = hiddenForm.querySelector(`input[name="${name}"]`);
            if (!field) {
              field = document.createElement('input');
              field.type = 'hidden';
              field.name = name;
              if (id) field.id = id;
              hiddenForm.appendChild(field);
            }
            if (id && !field.id) field.id = id;
            return field;
          };

          const fieldHuman = ensureHiddenField('Данные', 'offerData');
          const fieldJson = ensureHiddenField('DataJSON', 'offerDataJSON');

          const btnEnter = document.getElementById('btnEnterPlatform');
          if (btnEnter) btnEnter.addEventListener('click', () => { telemetry.slide5.enter_platform_clicked = true; }, { capture: true });

          const btnSend = document.getElementById('btnSendOffer');
          if (btnSend) {
            btnSend.addEventListener('click', () => {
              const payload = buildRawPayload();
              if (fieldHuman) fieldHuman.value = buildHumanSummary(payload);
              if (fieldJson) fieldJson.value = JSON.stringify(payload);
            }, { capture: true });
          }
        };

        const buildRawPayload = () => {
          const slide1 = {
            last_role: selectedRole ? { id: selectedRole, label: roleLabel(selectedRole) } : null,
            role_sequence: telemetry.slide1.role_sequence,
            mobile_tabs: telemetry.slide1.mobile_tabs
          };
          const kpiSelectedArr = Array.from(kpiSelected);
          const problemSelectedArr = Array.from(problemSelected);
          const slide2 = {
            kpi_selected: kpiSelectedArr,
            kpi_selected_labels: kpiSelectedArr.map(kpiLabel),
            problems_selected: problemSelectedArr,
            problems_selected_labels: problemSelectedArr.map(problemLabel),
            kpi_toggles: telemetry.slide2.kpi_toggles,
            problems_toggles: telemetry.slide2.problems_toggles
          };
          const slide3 = { opened_sequence: telemetry.slide3.opened_sequence };
          const slide4 = {
            team_size_seq: telemetry.slide4.team_size_seq,
            inhouse_rate_seq: telemetry.slide4.inhouse_rate_seq,
            coverage_hours_seq: telemetry.slide4.coverage_hours_seq,
            coverage_days_seq: telemetry.slide4.coverage_days_seq,
            currency_seq: telemetry.slide4.currency_seq,
            included_cta_tapped: telemetry.slide4.included_cta_tapped
          };
          const slide5 = { enter_platform_clicked: telemetry.slide5.enter_platform_clicked };
          return { slide1, slide2, slide3, slide4, slide5, captured_at: nowISO() };
        };

        const buildHumanSummary = (payload) => {
          const formatSlideTwoEvents = ({ defaultIds, toggles, currentValues, labelGetter }) => {
            const toLabel = (id, fallback) => fallback || labelGetter(id) || id;
            const normalize = (action) => {
              if (action === 'select') return 'selected';
              if (action === 'unselect') return 'removed';
              return action || 'event';
            };
            const events = [];
            defaultIds.forEach((id) => {
              const label = toLabel(id);
              events.push(`${JSON.stringify(label)}(default)`);
            });
            toggles.forEach(({ id, label, action }) => {
              if (!id) return;
              const entryLabel = toLabel(id, label);
              events.push(`${JSON.stringify(entryLabel)}(${normalize(action)})`);
            });
            currentValues.forEach((id) => {
              const label = toLabel(id);
              events.push(`${JSON.stringify(label)}(selected)`);
            });
            return events;
          };

          const slide1 = `slide1.role_sequence_labels=[${payload.slide1.role_sequence.map(item => JSON.stringify(item.label)).join(',')}]; ` +
            `slide1.back_office_mobile_visited=${payload.slide1.mobile_tabs.back_office_visited ? 'true' : 'false'}`;

          const defaultKpiIds = ROLE_KPI_DEFAULTS[selectedRole]
            ? [...ROLE_KPI_DEFAULTS[selectedRole]]
            : [];
          const defaultProblemIds = [...DEFAULT_PROBLEMS, ...((ROLE_PROBLEM_DEFAULTS[selectedRole] || []))];

          const kpiEvents = formatSlideTwoEvents({
            defaultIds: defaultKpiIds,
            toggles: payload.slide2.kpi_toggles,
            currentValues: Array.from(kpiSelected),
            labelGetter: kpiLabel
          });

          const problemEvents = formatSlideTwoEvents({
            defaultIds: defaultProblemIds,
            toggles: payload.slide2.problems_toggles,
            currentValues: Array.from(problemSelected),
            labelGetter: problemLabel
          });

          const slide2 = `slide2.kpi_selected_labels=[${kpiEvents.join(',')}]; ` +
            `slide2.problems_selected_labels=[${problemEvents.join(',')}]`;

          const slide3 = `slide3.opened_titles=[${payload.slide3.opened_sequence.map(item => JSON.stringify(item.title)).join(',')}]`;

          const slide4 = `slide4.team_size_seq=[${payload.slide4.team_size_seq.join(',')}]; ` +
            `slide4.inhouse_rate_seq=[${payload.slide4.inhouse_rate_seq.join(',')}]; ` +
            `slide4.coverage_hours_seq=[${payload.slide4.coverage_hours_seq.join(',')}]; ` +
            `slide4.coverage_days_seq=[${payload.slide4.coverage_days_seq.join(',')}]; ` +
            `slide4.currency_seq=[${payload.slide4.currency_seq.map(JSON.stringify).join(',')}]; ` +
            `slide4.included_cta_tapped=${payload.slide4.included_cta_tapped ? 'true' : 'false'}`;

          const slide5 = `slide5.enter_platform_clicked=${payload.slide5.enter_platform_clicked ? 'true' : 'false'}`;

          return [slide1, slide2, slide3, slide4, slide5].join(' | ');
        };
      })();


    })();