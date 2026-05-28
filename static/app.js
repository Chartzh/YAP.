/**
 * YAP! — SPA State Machine (Akinator Edition)
 * States:
 *   STATE_LANDING  -> State 0: Landing page
 *   STATE_DASHBOARD -> State 1: Input dashboard (GitHub vs Manual)
 *   STATE_WIZARD    -> State 2: Dedicated Akinator Questionnaire Page
 *   STATE_LOADING  -> State 3: Monospaced arcade typewriter terminal logs
 *   STATE_RESULT   -> State 4: Standalone Output Tabs Page
 */

const STATE = {
  LANDING: 'landing',
  DASHBOARD: 'dashboard',
  WIZARD: 'wizard',
  LOADING: 'loading',
  RESULT: 'result'
};

const INPUT_MODE = {
  GITHUB: 'github',
  MANUAL: 'manual'
};

const appState = {
  currentState: STATE.LANDING,
  currentMode: INPUT_MODE.GITHUB,
  selectedVibe: 'corporate-alpha', // Default is Professional
  maxYapTriggered: false,
  developerTitle: '', // Store dev title here!

  // Manual wizard defaults (if any)
  wizard: {
    category: '',
    categoryLabel: '',
    experimentalDetail: ''
  },

  // Final generation assets
  output: {
    readme_md: '',
    linkedin_post: '',
    repo_name: '',
    currentActiveTab: 'readme' // readme or linkedin
  }
};

// DOM Query Selectors
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// Global state variables for the Akinator state machine
let wizardData = null;
let collectedPayload = {};
let currentStepId = 'S1';
let stepHistory = []; // Array of { stepId, payload } for undo functionality

// Global Transition Engine
function transitionTo(newState) {
  // Hide all state views
  $$('.state-view').forEach(el => el.style.display = 'none');
  
  const dashboardWrapper = $('dashboard-wrapper');
  if (dashboardWrapper) dashboardWrapper.style.display = 'none';

  const stateDashboard = $('state-dashboard');
  if (stateDashboard) stateDashboard.classList.remove('active');

  const stateLoading = $('state-loading');
  if (stateLoading) stateLoading.classList.remove('active');

  const stateResult = $('state-result');
  if (stateResult) stateResult.classList.remove('active');

  const stateWizard = $('state-wizard');
  if (stateWizard) stateWizard.classList.remove('active');

  appState.currentState = newState;

  if (newState === STATE.LANDING) {
    $('state-landing').style.display = 'block';
  } else if (newState === STATE.WIZARD) {
    $('state-wizard').style.display = 'block';
    $('state-wizard').classList.add('active');
  } else if (newState === STATE.RESULT) {
    $('state-result').style.display = 'block';
    $('state-result').classList.add('active');
  } else {
    // Show permanent dashboard shell
    if (dashboardWrapper) dashboardWrapper.style.display = 'block';
    
    // Show requested view
    if (newState === STATE.DASHBOARD) {
      if (stateDashboard) {
        stateDashboard.classList.add('active');
        stateDashboard.style.display = 'flex';
      }

      // Check onboarding localStorage
      const isComplete = localStorage.getItem('yap_onboarding_complete');
      if (isComplete !== 'true') {
        const tutorial = $('app-onboarding-tutorial');
        if (tutorial) {
          tutorial.style.display = 'flex';
        }
      }
    } else {
      const targetView = $(`state-${newState}`);
      if (targetView) {
        targetView.classList.add('active');
        targetView.style.display = 'block';
      }
    }
  }

  clearError();
  if (newState === STATE.LOADING) {
    setTimeout(() => {
      const loadingEl = $('state-loading');
      if (loadingEl) {
        loadingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// --- STATE 0: LANDING PAGE ---
function initLanding() {
  $('btn-landing-try').addEventListener('click', () => transitionTo(STATE.DASHBOARD));
  $('btn-landing-cta').addEventListener('click', () => transitionTo(STATE.DASHBOARD));
  $('btn-landing-cta-bottom').addEventListener('click', () => transitionTo(STATE.DASHBOARD));
}

// --- STATE 1: GENERATOR DASHBOARD ---
function initDashboard() {
  // Brand title click to return home
  $('btn-logo-dashboard').addEventListener('click', () => {
    transitionTo(STATE.LANDING);
  });

  // Toggles for GitHub vs Manual modes
  $('btn-tab-github').addEventListener('click', () => switchInputMode(INPUT_MODE.GITHUB));
  $('btn-tab-manual').addEventListener('click', () => switchInputMode(INPUT_MODE.MANUAL));

  // Onboarding Tutorial Close Button
  const closeTutorialBtn = $('btn-close-tutorial');
  if (closeTutorialBtn) {
    closeTutorialBtn.addEventListener('click', () => {
      const tutorial = $('app-onboarding-tutorial');
      if (tutorial) {
        tutorial.style.display = 'none';
      }
      localStorage.setItem('yap_onboarding_complete', 'true');
    });
  }

  // Vibe Selection Chips
  const vibeMapping = {
    'vibe-btn-professional': 'corporate-alpha',
    'vibe-btn-chaotic': 'tech-influencer',
    'vibe-btn-minimalist': 'humblebrag',
    'vibe-btn-hacker': 'tech-influencer'
  };

  $$('.vibe-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.vibe-chip').forEach(b => {
        b.className = 'bg-surface text-ink border-4 border-ink py-2 px-6 font-display-sm text-[18px] uppercase brutal-shadow brutal-shadow-hover brutal-shadow-active transition-all vibe-chip';
      });
      // Set clicked active style
      btn.className = 'bg-success text-ink border-4 border-ink py-2 px-6 font-display-sm text-[18px] uppercase brutal-shadow brutal-shadow-hover brutal-shadow-active transition-all vibe-chip active';
      appState.selectedVibe = vibeMapping[btn.id] || 'corporate-alpha';
    });
  });

  // Slider Volume indicator
  $('slider-yap-length').addEventListener('input', (e) => {
    $('slider-label').textContent = `Volume: ${e.target.value}%`;
    evaluateYapLength(e.target.value);
  });

  // Transform Submission action
  $('btn-transform-generate').addEventListener('click', handleTransformSubmission);

  // GitHub Preview Badge
  $('github-url-input').addEventListener('input', () => {
    const url = $('github-url-input').value.trim();
    const badge = $('github-file-badge');
    if (url) {
      badge.textContent = `🔗 ${url.split('/').pop() || 'Repo'}`;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  });
}

function evaluateYapLength(val) {
  // If yapping length is set to >= 90%, trigger MAXIMUM YAP! Dev status
  appState.maxYapTriggered = (val >= 90);
}

function switchInputMode(mode) {
  appState.currentMode = mode;

  // Header active button toggles
  const activeClass = 'flex-1 bg-electric-blue text-white py-4 px-4 font-headline-lg uppercase brutal-border brutal-shadow brutal-shadow-hover brutal-shadow-active transition-all text-center flex justify-center items-center gap-2';
  const inactiveClass = 'flex-1 bg-warm-grey text-ink py-4 px-4 font-headline-lg uppercase brutal-border translate-y-[4px] shadow-none hover:bg-surface-dim transition-colors text-center flex justify-center items-center gap-2';

  if (mode === INPUT_MODE.GITHUB) {
    $('btn-tab-github').className = activeClass;
    $('btn-tab-manual').className = inactiveClass;
    $('panel-github-inputs').style.display = 'flex';
    $('panel-manual-inputs').style.display = 'none';
  } else {
    $('btn-tab-github').className = inactiveClass;
    $('btn-tab-manual').className = activeClass;
    $('panel-github-inputs').style.display = 'none';
    $('panel-manual-inputs').style.display = 'flex';
  }
}

// --- STATE 2: DYNAMIC AKINATOR WIZARD PAGE ---
async function fetchWizardData() {
  try {
    const response = await fetch('/static/yap_wizard_v2.json');
    if (!response.ok) throw new Error("Failed to load wizard scheme.");
    wizardData = await response.json();
    console.log("Wizard schema fetched successfully.");
  } catch (error) {
    console.error("Error loading wizard schema:", error);
    showError("Could not fetch Akinator Wizard structure. Make sure yap_wizard_v2.json is in static/.");
  }
}

function initWizard() {
  $('btn-trigger-wizard').addEventListener('click', openWizard);
  $('btn-wizard-back').addEventListener('click', navigateWizardBack);
  $('btn-wizard-exit').addEventListener('click', () => {
    transitionTo(STATE.DASHBOARD);
  });
  $('btn-logo-wizard').addEventListener('click', () => {
    transitionTo(STATE.LANDING);
  });
}

function openWizard() {
  if (!wizardData) {
    showError("Wizard database is not loaded yet. Please wait.");
    return;
  }
  
  collectedPayload = {};
  currentStepId = 'S1';
  stepHistory = [];

  $('wizard-question-view').style.display = 'flex';
  $('wizard-terminal-view').style.display = 'none';
  $('wizard-terminal-view').classList.remove('flex');
  $('wizard-terminal-view').classList.add('hidden');

  renderStep('S1');
  transitionTo(STATE.WIZARD);
}

function navigateWizardBack() {
  if (stepHistory.length > 0) {
    const prev = stepHistory.pop();
    currentStepId = prev.stepId;
    collectedPayload = prev.payload;
    renderStep(currentStepId);
  }
}

function getOptionColors(index, label) {
  const labelLower = label.toLowerCase();
  
  // Specific color tokens from Stitch config
  const tokens = {
    'electric blue': { bg: '#0047FF', text: '#FFFFFF' },
    'slime green': { bg: '#00FF87', text: '#000000' },
    'neon coral': { bg: '#FF3D00', text: '#FFFFFF' },
    'acid yellow': { bg: '#EBFF00', text: '#000000' },
    'volt yellow': { bg: '#EBFF00', text: '#000000' },
    'warm grey': { bg: '#D4D0C4', text: '#000000' },
    'hot pink': { bg: '#FF0055', text: '#FFFFFF' }
  };
  
  // Check text content matches
  for (const tokenName in tokens) {
    if (labelLower.includes(tokenName)) {
      return tokens[tokenName];
    }
  }
  
  // Fallback to cycling sequence
  const cycle = [
    tokens['electric blue'],
    tokens['slime green'],
    tokens['neon coral'],
    tokens['acid yellow'],
    tokens['warm grey']
  ];
  return cycle[index % cycle.length];
}

function renderStep(stepId) {
  if (!wizardData || !wizardData.steps) return;

  const stepData = wizardData.steps[stepId];
  if (!stepData) {
    console.error(`Step index ${stepId} missing.`);
    return;
  }

  currentStepId = stepId;

  // Handle Terminal Node (END)
  if (stepData.type === 'terminal') {
    handleTerminalNode(stepData);
    return;
  }

  // Populate Question UI elements
  $('wizard-step-phase').textContent = stepData.phase || 'DIAGNOSTIC';
  $('wizard-step-question').textContent = stepData.question || '';

  // Options rendering
  const container = $('wizard-options-container');
  container.innerHTML = '';

  const options = stepData.options || [];
  options.forEach((option, idx) => {
    const btn = document.createElement('button');
    btn.className = 'wizard-option-btn-neo w-full text-left p-4 md:p-6 font-body-md text-base md:text-lg font-semibold flex justify-between items-center transition-all group';
    
    const colors = getOptionColors(idx, option.label);
    btn.style.backgroundColor = colors.bg;
    btn.style.color = colors.text;

    btn.innerHTML = `
      <span>${option.label}</span>
      <span class="material-symbols-outlined text-4xl opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-2">arrow_forward</span>
    `;

    btn.addEventListener('click', () => {
      // Save history snap
      stepHistory.push({
        stepId: currentStepId,
        payload: JSON.parse(JSON.stringify(collectedPayload))
      });

      // Merge collects attributes
      Object.assign(collectedPayload, option.collects || {});

      // Move next
      renderStep(option.next);
    });

    container.appendChild(btn);
  });

  // Undo button display state
  const undoBtn = $('btn-wizard-back');
  if (stepHistory.length > 0) {
    undoBtn.style.display = 'inline-flex';
  } else {
    undoBtn.style.display = 'none';
  }
}

function buildQuestionnairePayload(payload) {
  const category = payload.category || "Web Application";
  const problem = payload.problem || "No problem described";
  
  // Tech stack: compile all other values in collects
  const techStackKeys = [
    'frontend_framework', 'backend', 'database', 'orm', 'deployment',
    'language', 'framework', 'auth_strategy', 'auth_type', 'db_type',
    'model_deployment', 'vector_db', 'model_type', 'data_volume', 'infra_serving',
    'prediction_storage', 'performance_optimization', 'api_reactivity',
    'statement_layer', 'power_management', 'data_retention', 'ota_updates'
  ];
  
  const techParts = [];
  techStackKeys.forEach(k => {
    if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') {
      techParts.push(payload[k]);
    }
  });
  
  // Collect other unlisted keys
  const nonTechKeys = ['category', 'problem', 'experimental_detail', 'problem_context', 'core_mechanic', 'project_type'];
  for (const key in payload) {
    if (!nonTechKeys.includes(key) && !techStackKeys.includes(key) && payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      if (typeof payload[key] === 'boolean') {
        if (payload[key]) {
          techParts.push(key.replace(/_/g, ' '));
        }
      } else {
        techParts.push(payload[key]);
      }
    }
  }
  
  const tech_stack = techParts.join(', ') || 'Vanilla JS';
  const experimental_detail = payload.experimental_detail || payload.core_mechanic || payload.problem_context || "";

  return {
    category,
    problem,
    tech_stack,
    experimental_detail
  };
}

function handleTerminalNode(stepData) {
  // Update header dev badges
  const devTitle = stepData.developer_title || "THE CHOSEN ONE 🔮";
  appState.developerTitle = devTitle;
  if ($('header-dev-title')) $('header-dev-title').textContent = devTitle;
  if ($('dev-title-display-text')) $('dev-title-display-text').textContent = devTitle;

  // Toggle view elements inside wizard card
  $('wizard-question-view').style.display = 'none';
  $('btn-wizard-back').style.display = 'none';

  const terminalView = $('wizard-terminal-view');
  terminalView.style.display = 'flex';
  terminalView.classList.remove('hidden');
  terminalView.classList.add('flex');

  $('wizard-terminal-title').textContent = devTitle;
  $('wizard-terminal-message').textContent = stepData.message || '';

  // Naming controls binding
  const nameInput = $('wizard-project-name');
  nameInput.value = '';
  nameInput.readOnly = false;
  nameInput.classList.remove('bg-surface-dim');

  // Bind surrender button
  const surrenderBtn = $('btn-wizard-surrender-name');
  const newSurrenderBtn = surrenderBtn.cloneNode(true);
  surrenderBtn.parentNode.replaceChild(newSurrenderBtn, surrenderBtn);
  newSurrenderBtn.addEventListener('click', () => {
    nameInput.value = "AI_GENERATE_NAME";
    nameInput.classList.add('bg-surface-dim');
    nameInput.readOnly = true;
  });

  // Bind focus unlock
  nameInput.addEventListener('focus', () => {
    if (nameInput.readOnly && nameInput.value === "AI_GENERATE_NAME") {
      nameInput.value = "";
      nameInput.readOnly = false;
      nameInput.classList.remove('bg-surface-dim');
    }
  });

  // Bind submit button
  const submitBtn = $('btn-wizard-submit-generate');
  const newSubmitBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
  newSubmitBtn.addEventListener('click', () => {
    let projName = nameInput.value.trim();
    if (!projName) {
      projName = "AI_GENERATE_NAME";
    }
    triggerWizardGeneration(projName);
  });
}

async function triggerWizardGeneration(projName) {
  // Transition to dynamic log state
  transitionTo(STATE.LOADING);
  const animPromise = runConsoleLoadingSequence();

  // Aggregate collectedPayload data
  const questionnairePayload = buildQuestionnairePayload(collectedPayload);

  const payload = {
    code_content: "", // Built entirely via Akinator wizard
    project_purpose: "",
    questionnaire: questionnairePayload,
    vibe: appState.selectedVibe,
    repo_name: projName === "AI_GENERATE_NAME" ? "" : projName,
    project_name: projName
  };

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const genData = await response.json();
    if (!response.ok) {
      throw new Error(genData.error || "Generation compilation failed.");
    }

    // Complete loading animation
    await animPromise;
    $('console-progress-bar-fill').style.width = '100%';
    $('console-percent-text').textContent = '100%';
    await sleep(250);

    // Populate assets and display
    populateResults(genData.readme_md, genData.linkedin_post);
    transitionTo(STATE.RESULT);

  } catch (error) {
    transitionTo(STATE.DASHBOARD);
    showError(error.message);
  }
}

// --- STATE 3: LOADING ARCADE TERMINAL ---
const LOG_MESSAGES = [
  '[SCANNING LOCAL CODE ENVIRONMENT...]',
  '[FILTERING OUT NOISE AND LOGS...]',
  '[EXTRACTING LOGICAL PIPELINES...]',
  '[INJECTING EMOTION INTO PORTFOLIO DRAFTS...]',
  '[TUNING DEVELOPER ATTITUDE TO VIBE PROFILE...]',
  '[GENERATING HYPE CONTEXT WITH GEMINI API...]'
];

async function runConsoleLoadingSequence() {
  const container = $('console-logs-list');
  container.innerHTML = '';

  const bar = $('console-progress-bar-fill');
  const percentText = $('console-percent-text');

  bar.style.width = '0%';
  percentText.textContent = '0%';

  const logsCount = LOG_MESSAGES.length;

  for (let i = 0; i < logsCount; i++) {
    // Add row to terminal
    const row = document.createElement('li');
    row.className = 'console-log-row text-[#EBFF00] font-mono text-sm py-1 border-b border-[#EBFF00]/15';
    row.innerHTML = `${LOG_MESSAGES[i]}<span class="console-cursor"></span>`;
    container.appendChild(row);

    // Reflow
    row.offsetHeight;
    row.classList.add('visible');

    // Simulate work interval
    await sleep(500);

    // Mark line complete
    row.classList.add('done');
    const cursor = row.querySelector('.console-cursor');
    if (cursor) cursor.remove();

    // Increment progress bar to max 95%
    const currentPercent = Math.round(((i + 1) / logsCount) * 95);
    bar.style.width = `${currentPercent}%`;
    percentText.textContent = `${currentPercent}%`;

    await sleep(300);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- STATE 4: OUTPUT DISPLAY & COPY ACTIONS ---
function initResults() {
  // Brand logo click
  $('btn-logo-result').addEventListener('click', () => {
    transitionTo(STATE.LANDING);
  });

  // Folder tabs click
  $('btn-result-tab-readme').addEventListener('click', () => switchOutputTab('readme'));
  $('btn-result-tab-linkedin').addEventListener('click', () => switchOutputTab('linkedin'));

  // Copy click events
  $('btn-copy-result').addEventListener('click', handleCopyResultAction);

  // Reset button
  $('btn-reset-generator').addEventListener('click', handleResetGenerator);
}

function switchOutputTab(tabType) {
  appState.output.currentActiveTab = tabType;

  const activeTabClass = 'bg-secondary text-surface border-4 border-ink border-b-0 px-6 py-3 pb-4 rounded-t-xl font-label-md text-label-md uppercase flex items-center gap-2 transform translate-y-[4px] active-result-tab';
  const inactiveTabClass = 'bg-surface text-ink border-4 border-ink border-b-0 px-6 py-3 rounded-t-xl font-label-md text-label-md uppercase flex items-center gap-2 hover:bg-primary-container transition-colors shadow-[4px_0px_0px_0px_rgba(0,0,0,1)]';

  if (tabType === 'readme') {
    $('btn-result-tab-readme').className = activeTabClass;
    $('btn-result-tab-linkedin').className = inactiveTabClass;
    $('result-panel-readme').style.display = 'block';
    $('result-panel-linkedin').style.display = 'none';
  } else {
    $('btn-result-tab-readme').className = inactiveTabClass;
    $('btn-result-tab-linkedin').className = activeTabClass;
    $('result-panel-readme').style.display = 'none';
    $('result-panel-linkedin').style.display = 'block';
  }
}

async function handleCopyResultAction() {
  const isReadme = appState.output.currentActiveTab === 'readme';
  const text = isReadme ? appState.output.readme_md : appState.output.linkedin_post;
  if (!text) {
    console.warn("No text to copy");
    return;
  }

  const toast = $('toast-copy-success');
  
  // 1. Try modern clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      showCopyToast(toast);
      return;
    } catch (err) {
      console.error("Clipboard API failed, using fallback:", err);
    }
  }
  
  // 2. Fallback: Create a temporary textarea off-screen, copy, and remove
  const tempEl = document.createElement('textarea');
  tempEl.value = text;
  tempEl.style.position = 'absolute';
  tempEl.style.left = '-9999px';
  document.body.appendChild(tempEl);
  tempEl.select();
  try {
    document.execCommand('copy');
    showCopyToast(toast);
  } catch (err) {
    console.error("Fallback copy failed:", err);
    showError("Could not copy text automatically. Please select and copy manually.");
  }
  document.body.removeChild(tempEl);
}

function showCopyToast(toastElement) {
  toastElement.textContent = "✓ COPIED!";
  toastElement.className = "copy-success-toast show text-hot-pink font-bold ml-4";
  setTimeout(() => {
    toastElement.className = "copy-success-toast hidden";
  }, 2000);
}

function determineDeveloperTitle() {
  if (appState.developerTitle) {
    return appState.developerTitle;
  }
  if (appState.maxYapTriggered) {
    return 'THE ABSOLUTE YAPPER 📢';
  }
  
  // Find which vibe button is active
  const activeVibeBtn = document.querySelector('.vibe-chip.active');
  if (activeVibeBtn) {
    if (activeVibeBtn.id === 'vibe-btn-professional') return 'THE CORPORATE ALPHA 👔';
    if (activeVibeBtn.id === 'vibe-btn-chaotic') return 'CHAOS ARCHITECT 🌪️';
    if (activeVibeBtn.id === 'vibe-btn-minimalist') return 'CODE POET 📜';
    if (activeVibeBtn.id === 'vibe-btn-hacker') return '1337 H4X0R 💻';
  }
  
  return 'THE GHOST DEV 👻';
}

function renderReadmeHTML(markdown) {
  if (!markdown) return '';
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let inCode = false;
  let codeContent = '';
  
  for (let line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        inCode = false;
        const escapedCode = codeContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html += `
          <div class="mb-10">
            <div class="bg-primary-container brutal-border p-4 relative group brutal-shadow-sm">
              <code class="font-body-lg text-body-lg text-electric-blue block whitespace-pre-wrap">${escapedCode}</code>
              <button class="absolute top-1/2 -translate-y-1/2 right-4 text-ink opacity-50 group-hover:opacity-100 transition-opacity p-2 hover:bg-surface brutal-border border-transparent hover:border-ink" onclick="navigator.clipboard.writeText(\`${codeContent.trim().replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                <span class="material-symbols-outlined">content_copy</span>
              </button>
            </div>
          </div>`;
        codeContent = '';
      } else {
        inCode = true;
      }
      continue;
    }
    
    if (inCode) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }
    
    const trimmed = line.trim();
    
    if (trimmed.startsWith('# ')) {
      const title = trimmed.replace('# ', '');
      html += `
        <div class="flex justify-between items-start mb-8">
          <div class="flex items-center gap-4">
            <h2 class="font-display-sm text-display-sm font-black text-ink">${title}</h2>
            <span class="bg-slime-green brutal-border px-3 py-1 font-label-md text-label-md uppercase text-ink brutal-shadow-sm">DONE</span>
          </div>
        </div>`;
      continue;
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const title = trimmed.replace(/^##+\s+/, '');
      html += `<h3 class="font-display-sm text-display-sm text-ink mb-4 mt-6">${title}</h3>`;
      continue;
    }
    
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[-*]\s+/, '');
      if (!inList) {
        html += '<ul class="list-none space-y-3 font-body-lg text-body-lg mb-8">';
        inList = true;
      }
      html += `
        <li class="flex items-start gap-3">
          <span class="material-symbols-outlined text-electric-blue mt-1">check_box</span>
          <span>${content}</span>
        </li>`;
      continue;
    }
    
    if (inList && !trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
      html += '</ul>';
      inList = false;
    }
    
    if (trimmed) {
      html += `<p class="font-body-lg text-body-lg mb-6 max-w-3xl">${trimmed}</p>`;
    }
  }
  
  if (inList) {
    html += '</ul>';
  }
  
  return html;
}

function renderLinkedInHTML(text) {
  if (!text) return '';
  const paragraphs = text.split('\n\n');
  let formattedText = paragraphs.map(p => `<p class="mb-4">${p.replace(/\n/g, '<br>')}</p>`).join('');
  
  return `
    <div class="bg-surface border-4 border-ink p-6 brutal-shadow-sm flex flex-col gap-4 max-w-2xl mx-auto">
      <div class="flex items-center gap-4 border-b-2 border-ink pb-4">
        <div class="w-12 h-12 bg-electric-blue brutal-border rounded-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBzxDtW_UFANJRElOtiOxICywsgXVjh0QLDlkmzYIMC77Q0iyeM1G6_URpdglmdZHP_woJWU1nMq7fpfwCIi_4b7u85gwJGWZiTBMh91zQikCTqqiodsnH35eA03ponFrPAMttpWMVhRBAaX3oDDh7oHQPC0j6PYDx_XbhL1fK9MEmlETA5SZjg7MtC-0YSmyOFg6RcB2iIRffc1JHbqPI2MBZMGI7jRsm0E5JjaFsCZFzNaCxLUdXDQTNdMyr8dtMWJl7ic1-AtQg'); background-size: cover; background-position: center;"></div>
        <div>
          <div class="font-bold text-ink uppercase">YAP! Developer</div>
          <div class="text-xs text-on-surface-variant uppercase mt-1">${determineDeveloperTitle()}</div>
        </div>
      </div>
      <div class="font-body-md text-ink text-sm leading-relaxed">
        ${formattedText}
      </div>
    </div>
  `;
}

function populateResults(readme, linkedin) {
  appState.output.readme_md = readme;
  appState.output.linkedin_post = linkedin;

  $('readme-preview-content').innerHTML = renderReadmeHTML(readme);
  $('linkedin-preview-content').innerHTML = renderLinkedInHTML(linkedin);

  // Set the topbar badges in both headers
  const title = determineDeveloperTitle();
  if ($('header-dev-title')) {
    $('header-dev-title').textContent = title;
  }
  if ($('result-dev-title')) {
    $('result-dev-title').textContent = title;
  }

  switchOutputTab('readme');
}

function handleResetGenerator() {
  // Clear inputs
  $('github-url-input').value = '';
  const badge = $('github-file-badge');
  if (badge) badge.style.display = 'none';
  
  // Clear manual textareas
  const manualTextareas = ['manual-project-purpose', 'manual-core-logic', 'manual-frameworks', 'manual-challenge'];
  manualTextareas.forEach(id => {
    const el = $(id);
    if (el) {
      el.value = '';
      el.style.height = 'auto';
    }
  });
  $('manual-project-name').value = '';
  
  appState.wizard = { category: '', categoryLabel: '', experimentalDetail: '' };
  appState.maxYapTriggered = false;
  appState.developerTitle = '';
  $('slider-yap-length').value = 75;
  $('slider-label').textContent = 'Volume: 75%';

  if ($('header-dev-title')) $('header-dev-title').textContent = "YAPPING: IDLE 💤";
  
  // Hide all individual combo badges
  const badgeIds = ['combo-badge-purpose', 'combo-badge-core-logic', 'combo-badge-frameworks', 'combo-badge-challenge'];
  badgeIds.forEach(id => {
    const el = $(id);
    if (el) {
      el.classList.remove('visible', 'max-yap');
      el.removeAttribute('data-multiplier');
    }
  });

  transitionTo(STATE.DASHBOARD);
}

// --- SUBMISSION ACTION PIPELINE (Manual & GitHub) ---
async function handleTransformSubmission() {
  clearError();

  let codeContent = '';
  let repoName = '';

  if (appState.currentMode === INPUT_MODE.GITHUB) {
    const url = $('github-url-input').value.trim();
    if (!url) {
      showError("Please enter a public GitHub URL to transform.");
      return;
    }

    transitionTo(STATE.LOADING);
    const animPromise = runConsoleLoadingSequence();

    try {
      const fetchResp = await fetch('/api/fetch-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const fetchData = await fetchResp.json();

      if (!fetchResp.ok) {
        throw new Error(fetchData.error || "GitHub repository fetch failed.");
      }

      codeContent = fetchData.content;
      repoName = fetchData.repo;
      
    } catch (err) {
      transitionTo(STATE.DASHBOARD);
      showError(err.message);
      return;
    }

    await animPromise;

  } else {
    // Manual inputs: read from the textareas and project name input
    const projectPurpose = $('manual-project-purpose').value.trim();
    const coreLogic = $('manual-core-logic').value.trim();
    const frameworks = $('manual-frameworks').value.trim();
    const challenge = $('manual-challenge').value.trim();
    const projNameInput = $('manual-project-name').value.trim();

    // Use project name input as repoName / project name parameter
    repoName = projNameInput;

    if (!projectPurpose && !coreLogic && !frameworks && !challenge) {
      showError("Please describe your project purpose, core logic, frameworks, or challenge to transform.");
      return;
    }

    // Concatenate details for generation context
    codeContent = `CORE METHODOLOGY LOGIC:\n${coreLogic}\n\nFRAMEWORKS USED:\n${frameworks}\n\nBIGGEST CHALLENGE:\n${challenge}`;

    transitionTo(STATE.LOADING);
    const animPromise = runConsoleLoadingSequence();
    await animPromise;
  }

  // Construct prompt payload
  const payload = {
    code_content: codeContent,
    project_purpose: appState.currentMode === INPUT_MODE.MANUAL ? $('manual-project-purpose').value.trim() : '',
    questionnaire: {
      problem: "Exploring portfolio configurations and structure mappings",
      category: "Web Application",
      categoryLabel: "Web Application",
      experimental_detail: "",
      tech_stack: appState.currentMode === INPUT_MODE.GITHUB ? 'GitHub Repository' : ($('manual-frameworks').value.trim() || 'Vanilla')
    },
    vibe: appState.selectedVibe,
    repo_name: repoName,
    project_name: repoName
  };

  try {
    const genResp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const genData = await genResp.json();

    if (!genResp.ok) {
      throw new Error(genData.error || "Gemini model compilation failed.");
    }

    // Advance progress to 100%
    $('console-progress-bar-fill').style.width = '100%';
    $('console-percent-text').textContent = '100%';
    await sleep(250);

    // Render results
    populateResults(genData.readme_md, genData.linkedin_post);
    transitionTo(STATE.RESULT);

  } catch (err) {
    transitionTo(STATE.DASHBOARD);
    showError(err.message);
  }
}

// --- GLOBAL ERROR HANDLING ---
function showError(msg) {
  const banner = $('error-banner');
  if (banner) {
    $('error-message').textContent = msg;
    banner.style.display = 'flex';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Clear sticky error banner
function clearError() {
  const banner = $('error-banner');
  if (banner) banner.style.display = 'none';
}

function updateComboMeter(event) {
  const textarea = event.target;
  if (!textarea) return;

  // Map the textarea ID to its corresponding badge and text element IDs
  const idMap = {
    'manual-project-purpose': { badge: 'combo-badge-purpose', text: 'combo-text-purpose' },
    'manual-core-logic': { badge: 'combo-badge-core-logic', text: 'combo-text-core-logic' },
    'manual-frameworks': { badge: 'combo-badge-frameworks', text: 'combo-text-frameworks' },
    'manual-challenge': { badge: 'combo-badge-challenge', text: 'combo-text-challenge' }
  };

  const elements = idMap[textarea.id];
  if (!elements) return;

  const length = textarea.value.length;
  const badge = $(elements.badge);
  const text = $(elements.text);

  if (!badge || !text) return;

  if (length >= 100) {
    const multiplier = Math.floor(length / 100);
    const prevMultiplier = badge.getAttribute('data-multiplier');
    text.textContent = `YAP COMBO x${multiplier}`;

    if (length >= 500) {
      text.textContent = `⚡ MAXIMUM YAP x${multiplier} ⚡`;
    }

    if (prevMultiplier !== multiplier.toString()) {
      badge.classList.remove('visible');
      badge.classList.remove('max-yap');
      void badge.offsetWidth; // Trigger reflow to restart CSS keyframe animation
      badge.classList.add('visible');
      if (length >= 500) {
        badge.classList.add('max-yap');
      }
      badge.setAttribute('data-multiplier', multiplier.toString());
    } else {
      badge.classList.add('visible');
      if (length >= 500) {
        badge.classList.add('max-yap');
      } else {
        badge.classList.remove('max-yap');
      }
    }
  } else {
    badge.classList.remove('visible');
    badge.classList.remove('max-yap');
    badge.removeAttribute('data-multiplier');
  }
}

function autoExpandTextarea(event) {
  const el = event.target;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// --- INITIALIZER ---
document.addEventListener('DOMContentLoaded', () => {
  initLanding();
  initDashboard();
  initWizard();
  initResults();

  // Load Akinator JSON schema asynchronously
  fetchWizardData();

  // Closing error button
  const closeErr = $('btn-close-error');
  if (closeErr) closeErr.addEventListener('click', clearError);

  // Bind combo meter inputs
  const manualInputs = [
    'manual-project-purpose',
    'manual-core-logic',
    'manual-frameworks',
    'manual-challenge'
  ];
  manualInputs.forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', updateComboMeter);
      el.addEventListener('input', autoExpandTextarea);
      // Initialize heights
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  });

  // Set default State 0: Landing page
  transitionTo(STATE.LANDING);
});
