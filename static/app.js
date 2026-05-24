/**
 * YAP! — SPA State Machine (Revised Design)
 * States:
 *   STATE_LANDING  -> State 0: Landing page
 *   STATE_DASHBOARD -> State 1: Input dashboard (GitHub vs Manual)
 *   STATE_LOADING  -> State 3: Monospaced arcade typewriter terminal logs
 *   STATE_RESULT   -> State 4: Detailed output tabs
 */

const STATE = {
  LANDING: 'landing',
  DASHBOARD: 'dashboard',
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

  // Wizard data
  wizard: {
    category: '',         // A, B, C, D
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

// Global Transition Engine
function transitionTo(newState) {
  // Hide all state views
  $$('.state-view').forEach(el => el.style.display = 'none');
  $('dashboard-wrapper').style.display = 'none';
  $('state-dashboard').classList.remove('active');
  $('state-loading').classList.remove('active');
  $('state-result').classList.remove('active');

  appState.currentState = newState;

  if (newState === STATE.LANDING) {
    $('state-landing').style.display = 'block';
  } else {
    // Show permanent dashboard shell
    $('dashboard-wrapper').style.display = 'block';
    
    // Show requested view
    if (newState === STATE.DASHBOARD) {
      $('state-dashboard').classList.add('active');
      $('state-dashboard').style.display = 'flex';
    } else {
      $(`state-${newState}`).classList.add('active');
      $(`state-${newState}`).style.display = 'block';
    }
  }

  clearError();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

// --- STATE 2: DIAGNOSTIC WIZARD (OVERLAY MODAL) ---
function initWizard() {
  $('btn-trigger-wizard').addEventListener('click', openWizard);
  $('btn-wizard-close').addEventListener('click', closeWizard);
  $('btn-wizard-prev').addEventListener('click', navigateWizardBack);

  // Modal Step 1 Option Buttons
  $$('.wizard-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      const label = btn.dataset.label;

      appState.wizard.category = val;
      appState.wizard.categoryLabel = label;

      if (val === 'D') {
        // Switch to Step 2 (Branch option)
        $('wizard-card-step1').classList.remove('active');
        $('wizard-card-step2').classList.add('active');
        $('btn-wizard-prev').style.display = 'inline-flex';
      } else {
        // Update manual textareas with predefined templates
        updateTextareasForWizardCategory(val);
        updateWizardSummaryCard();
        closeWizard();
      }
    });
  });

  // Modal Step 2 Branch Option Buttons
  $$('.wizard-branch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      const label = btn.dataset.label;

      appState.wizard.experimentalDetail = label;
      
      // Update manual textareas based on branch selection
      updateTextareasForWizardBranch(val);
      updateWizardSummaryCard();
      closeWizard();
    });
  });
}

function openWizard() {
  $('state-wizard-overlay').style.display = 'flex';
  $('wizard-card-step1').classList.add('active');
  $('wizard-card-step2').classList.remove('active');
  $('btn-wizard-prev').style.display = 'none';
}

function closeWizard() {
  $('state-wizard-overlay').style.display = 'none';
}

function navigateWizardBack() {
  $('wizard-card-step2').classList.remove('active');
  $('wizard-card-step1').classList.add('active');
  $('btn-wizard-prev').style.display = 'none';
}

function updateWizardSummaryCard() {
  $('wizard-summary-card').style.display = 'block';
  if (appState.wizard.category === 'D') {
    $('wizard-summary-text').textContent = `${appState.wizard.categoryLabel} (${appState.wizard.experimentalDetail})`;
  } else {
    $('wizard-summary-text').textContent = appState.wizard.categoryLabel;
  }
}

function updateTextareasForWizardCategory(cat) {
  if (cat === 'A') {
    $('manual-core-logic').value = "I wanted to build a simple but robust backend using Flask that can handle requests efficiently. The core idea is to process data and output clean assets.";
    $('manual-frameworks').value = "Flask / Python, requests library for fetching data.";
    $('manual-challenge').value = "Figuring out how to structure the routes and parse JSON payloads clean without complex setups.";
  } else if (cat === 'B') {
    $('manual-core-logic').value = "The project grew organically with a lot of helper scripts. The main script coordinates multiple modules, scraping content asynchronously and stitching it back together.";
    $('manual-frameworks').value = "FastAPI, aiohttp, SQLite3 for storing the raw extracted nodes.";
    $('manual-challenge').value = "Handling database concurrency when multiple scraping coroutines write to SQLite at the same time.";
  } else if (cat === 'C') {
    $('manual-core-logic').value = "A utility tool designed to solve a specific workflow issue. Focuses on speed and minimal dependencies.";
    $('manual-frameworks').value = "Node.js, Express, Tailwind CSS.";
    $('manual-challenge').value = "Optimizing the static asset delivery and setting up clean routes.";
  }
}

function updateTextareasForWizardBranch(branch) {
  if (branch === 'bug') {
    $('manual-core-logic').value = "The main processing logic failed during edge case inputs containing weird encodings or missing keys.";
    $('manual-frameworks').value = "GCP / Cloud Run / Docker containerization.";
    $('manual-challenge').value = "Debugging parsing errors in production environment where logs were truncated.";
  } else if (branch === 'vibe') {
    $('manual-core-logic').value = "We built a fun, chaotic frontend to experiment with Neo-Brutalist design principles.";
    $('manual-frameworks').value = "Vanilla HTML / CSS / JS, Tailwind CSS CDN.";
    $('manual-challenge').value = "Keeping the styling clean and responsive without sacrificing the heavy borders and shadows.";
  } else {
    $('manual-core-logic').value = "Just testing the capabilities of this generator and seeing how well it handles different vibes.";
    $('manual-frameworks').value = "Vanilla HTML / CSS / JS sandbox.";
    $('manual-challenge').value = "Trying to understand all the different configurations and how they affect the output.";
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
    row.querySelector('.console-cursor')?.remove();

    // Increment progress bar to max 99%
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
  const textareaId = isReadme ? 'generated-readme-textarea' : 'generated-linkedin-textarea';
  const text = $(textareaId).value;
  const toast = $('toast-copy-success');
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showCopyToast(toast);
  } catch (err) {
    // Fallback
    $(textareaId).select();
    document.execCommand('copy');
    showCopyToast(toast);
  }
}

function showCopyToast(toastElement) {
  toastElement.textContent = "✓ COPIED!";
  toastElement.className = "copy-success-toast show text-hot-pink font-bold ml-4";
  setTimeout(() => {
    toastElement.className = "copy-success-toast hidden";
  }, 2000);
}

function determineDeveloperTitle() {
  if (appState.maxYapTriggered || appState.wizard.category === 'D') {
    return 'THE ABSOLUTE YAPPER 📢';
  }
  if (appState.selectedVibe === 'corporate-alpha') {
    return 'THE CORPORATE ALPHA 👔';
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
          <div class="text-xs text-on-surface-variant uppercase mt-1">Senior Yap Engineer</div>
        </div>
      </div>
      <div class="font-body-md text-ink text-sm leading-relaxed">
        ${formattedText}
      </div>
    </div>
  `;
}

function populateResults(readme, linkedin) {
  $('generated-readme-textarea').value = readme;
  $('generated-linkedin-textarea').value = linkedin;

  $('readme-preview-content').innerHTML = renderReadmeHTML(readme);
  $('linkedin-preview-content').innerHTML = renderLinkedInHTML(linkedin);

  // Set Dev Profile banner
  const title = determineDeveloperTitle();
  if ($('dev-title-display-text')) $('dev-title-display-text').textContent = title;
  if ($('header-dev-title')) $('header-dev-title').textContent = title;

  switchOutputTab('readme');
}

function handleResetGenerator() {
  // Clear inputs
  $('github-url-input').value = '';
  $('github-file-badge').style.display = 'none';
  
  // Clear manual textareas
  $('manual-core-logic').value = '';
  $('manual-frameworks').value = '';
  $('manual-challenge').value = '';
  
  appState.wizard = { category: '', categoryLabel: '', experimentalDetail: '' };
  $('wizard-summary-card').style.display = 'none';
  appState.maxYapTriggered = false;
  $('slider-yap-length').value = 75;
  $('slider-label').textContent = 'Volume: 75%';

  if ($('header-dev-title')) $('header-dev-title').textContent = "YAPPING: IDLE 💤";

  transitionTo(STATE.DASHBOARD);
}

// --- SUBMISSION ACTION PIPELINE ---
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
      await animPromise.catch(() => {});
      transitionTo(STATE.DASHBOARD);
      showError(err.message);
      return;
    }

    await animPromise;

  } else {
    // Manual inputs: read from the three textareas
    const coreLogic = $('manual-core-logic').value.trim();
    const frameworks = $('manual-frameworks').value.trim();
    const challenge = $('manual-challenge').value.trim();

    if (!coreLogic && !frameworks && !challenge) {
      showError("Please describe your project, frameworks, or challenge to transform.");
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
    questionnaire: {
      problem: appState.wizard.experimentalDetail || "Exploring portfolio configurations and structure mappings",
      category: appState.wizard.category || "A",
      categoryLabel: appState.wizard.categoryLabel || "Web Application",
      experimental_detail: appState.wizard.experimentalDetail || "",
      tech_stack: appState.currentMode === INPUT_MODE.GITHUB ? 'GitHub Repository' : ($('manual-frameworks').value.trim() || 'Vanilla')
    },
    vibe: appState.selectedVibe,
    repo_name: repoName
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
  $('error-message').textContent = msg;
  banner.style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearError() {
  const banner = $('error-banner');
  if (banner) banner.style.display = 'none';
}

// --- INITIALIZER ---
document.addEventListener('DOMContentLoaded', () => {
  initLanding();
  initDashboard();
  initWizard();
  initResults();

  // Closing error button
  $('btn-close-error').addEventListener('click', clearError);

  // Set default State 0: Landing page
  transitionTo(STATE.LANDING);
});
