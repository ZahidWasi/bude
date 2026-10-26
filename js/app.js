// BUD-E Application Core Logic (Phase 3 Interactive Wireup)
(function(window, document) {
  'use strict';

  console.log('[BUD-E] Initializing BUD-E Platform...');

  // Application State
  const state = {
    student: {
      name: '',
      subject: '',
      chapter: '',
      timeBudget: '2hrs',
      parentPhone: ''
    },
    calibration: {
      score: 0,
      level: null, // 'Foundation' | 'Intermediate' | 'Advanced'
      answers: {}
    },
    practice: {
      totalQuestions: 20,
      currentIndex: 0,
      confidenceMeter: 50,
      errors: {
        sillyMistake: 0,
        conceptGap: 0,
        guess: 0
      }
    },
    test: {
      score: 0,
      total: 10,
      passed: false
    },
    breakTimer: {
      sprintStart: null,
      inBreak: false,
      breakStart: null
    },
    auth: {
      signedIn: false,
      name: '',
      email: '',
      phone: '',
      method: ''
    },
    monetization: {
      sprintCount: 0,
      currentSprintNumber: 1,
      activeTier: 'free',
      tierExpiry: null,
      paidSprintsRemaining: 0,
      sprint3Unlocked: false,
      paywallSeen: 'none',
      activePayment: null
    }
  };

  /**
   * IntersectionObserver for Smooth Entrance Animations
   * Pre-marked visible on load for zero scroll lag and maximum 60fps rendering
   */
  function initScrollAnimations() {
    document.querySelectorAll('.fade-rise').forEach(el => {
      el.classList.add('visible');
    });
  }

  /**
   * Set Current Date on the Proof of Learning Preview Card
   */
  function updatePreviewCardDate() {
    const dateEl = document.getElementById('demo-card-date');
    if (dateEl) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString('en-US', options).toUpperCase();
    }
  }

  /**
   * Feedback Submission Handler
   */
  function handleFeedbackSubmit(e) {
    if (e) e.preventDefault();
    const nameInput = document.getElementById('fb-student-name');
    const commentInput = document.getElementById('fb-comment');
    const statusMsg = document.getElementById('feedback-status-msg');
    const submitBtn = document.getElementById('btn-submit-feedback');

    if (!nameInput || !commentInput) return;

    const name = nameInput.value.trim();
    const comment = commentInput.value.trim();

    if (!name || !comment) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    // Silent logging payload via logger
    if (window.BUDE_LOGGER && window.BUDE_LOGGER.silentLog) {
      window.BUDE_LOGGER.silentLog({
        name: name,
        feedback: comment
      });
    }

    // Show instant reassuring status to student
    setTimeout(() => {
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.style.color = 'var(--color-success)';
        statusMsg.textContent = '✓ Thank you! Your feedback has been received and saved to our master log.';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Feedback Sent';
        setTimeout(() => {
          submitBtn.textContent = 'Submit Feedback';
          nameInput.value = '';
          commentInput.value = '';
        }, 3000);
      }
    }, 400);
  }

  /**
   * Phase 4 Onboarding Handlers & Monetization Gateways
   */
  function openOnboarding() {
    const sprintContainer = document.getElementById('view-sprint-container');
    if (sprintContainer && sprintContainer.style.display !== 'none') {
      if (!confirm('You have a sprint currently in progress. Starting a new sprint will reset your current session. Do you want to continue?')) {
        return;
      }
    }

    const nextSprint = state.monetization.sprintCount + 1;
    const hasUnlimited = (state.monetization.activeTier === 'monthly' || state.monetization.activeTier === 'board-pass') &&
      (!state.monetization.tierExpiry || Date.now() < state.monetization.tierExpiry);
    const hasPaidCredits = state.monetization.paidSprintsRemaining > 0;

    // Check if user has active paid subscription or prepaid credits
    if (hasUnlimited || hasPaidCredits) {
      showOnboardingModal();
      return;
    }

    // Sprint 1: 100% Free, no signup required
    if (nextSprint === 1) {
      state.monetization.activeTier = 'free';
      showOnboardingModal();
      return;
    }

    // Sprint 2: 100% Free, sign-in required
    if (nextSprint === 2) {
      if (!state.auth.signedIn) {
        openAuthModal();
        return;
      }
      state.monetization.activeTier = 'free';
      showOnboardingModal();
      return;
    }

    // Sprint 3: Free trial sprint (Stages 1-4 free, Recall locked)
    if (nextSprint === 3) {
      if (!state.auth.signedIn) {
        openAuthModal();
        return;
      }
      state.monetization.activeTier = 'trial';
      showOnboardingModal();
      return;
    }

    // Sprint 4 onwards: Paywall B (Hard Wall)
    state.monetization.paywallSeen = 'hard_sprint4';
    if (window.BUDE_LOGGER && window.BUDE_LOGGER.silentLog) {
      window.BUDE_LOGGER.silentLog({
        tier: state.monetization.activeTier,
        sprint_number: nextSprint,
        signup_completed: !!state.auth.signedIn,
        paywall_seen: 'hard_sprint4',
        payment_made: '₹0'
      });
    }
    openHardPaywallModal();
  }

  function showOnboardingModal() {
    const modal = document.getElementById('modal-onboarding');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      const nameInput = document.getElementById('student-name');
      if (nameInput) {
        if (state.auth.name && !nameInput.value) {
          nameInput.value = state.auth.name;
        }
        nameInput.focus();
      }
      const phoneInput = document.getElementById('parent-phone');
      if (phoneInput && state.auth.phone && !phoneInput.value) {
        phoneInput.value = state.auth.phone;
      }
    }
  }

  function closeOnboarding() {
    const modal = document.getElementById('modal-onboarding');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function handleSubjectChange() {
    const subjectSelect = document.getElementById('select-subject');
    const chapterSelect = document.getElementById('select-chapter');
    if (!subjectSelect || !chapterSelect) return;

    const chosenSubject = subjectSelect.value;
    chapterSelect.innerHTML = '';

    if (!chosenSubject || !window.BUDE_SUBJECTS || !window.BUDE_SUBJECTS[chosenSubject]) {
      chapterSelect.innerHTML = '<option value="" disabled selected>First select a subject above</option>';
      chapterSelect.disabled = true;
      return;
    }

    const chapters = window.BUDE_SUBJECTS[chosenSubject];
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = `Select Chapter (${chapters.length} available)`;
    defaultOption.disabled = true;
    defaultOption.selected = true;
    chapterSelect.appendChild(defaultOption);

    chapters.forEach(chap => {
      const opt = document.createElement('option');
      opt.value = chap;
      opt.textContent = chap;
      chapterSelect.appendChild(opt);
    });

    chapterSelect.disabled = false;
    chapterSelect.focus();
  }

  function selectTimeBudget(duration) {
    const hiddenInput = document.getElementById('selected-time-budget');
    if (hiddenInput) hiddenInput.value = duration;

    document.querySelectorAll('.time-pill').forEach(btn => {
      if (btn.getAttribute('data-time') === duration) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function handleOnboardingSubmit(e) {
    if (e) e.preventDefault();
    const nameInput = document.getElementById('student-name');
    const subjectSelect = document.getElementById('select-subject');
    const chapterSelect = document.getElementById('select-chapter');
    const timeInput = document.getElementById('selected-time-budget');
    const phoneInput = document.getElementById('parent-phone');

    if (!nameInput || !subjectSelect || !chapterSelect || !timeInput || !phoneInput) return;

    const studentName = nameInput.value.trim();
    const subject = subjectSelect.value;
    const chapter = chapterSelect.value;
    const timeBudget = timeInput.value;
    const parentPhone = phoneInput.value.trim();

    if (!studentName || !subject || !chapter || !parentPhone) {
      alert('Please fill out all required fields to begin your sprint.');
      return;
    }

    // Update global session state
    state.student.name = studentName;
    state.student.subject = subject;
    state.student.chapter = chapter;
    state.student.timeBudget = timeBudget;
    state.student.parentPhone = parentPhone;
    state.breakTimer.sprintStart = Date.now();

    // Increment sprint counter and save session monetization
    const currentSprint = state.monetization.sprintCount + 1;
    state.monetization.currentSprintNumber = currentSprint;
    state.monetization.sprintCount = currentSprint;

    if (state.monetization.paidSprintsRemaining > 0 && state.monetization.activeTier !== 'monthly' && state.monetization.activeTier !== 'board-pass') {
      state.monetization.paidSprintsRemaining--;
    }

    if (currentSprint === 3 && state.monetization.activeTier === 'trial') {
      state.monetization.sprint3Unlocked = false;
    }

    saveMonetizationState();

    console.log(`[BUD-E Onboarding] Sprint #${currentSprint} registered for:`, state.student);

    // Silent background logging to Google Sheets with all 5 new business model columns
    if (window.BUDE_LOGGER && window.BUDE_LOGGER.silentLog) {
      window.BUDE_LOGGER.silentLog({
        name: studentName,
        subject: subject,
        chapter: chapter,
        timeBudget: timeBudget,
        parentPhone: parentPhone,
        tier: state.monetization.activeTier,
        sprint_number: state.monetization.currentSprintNumber,
        signup_completed: !!state.auth.signedIn,
        paywall_seen: state.monetization.paywallSeen,
        payment_made: '₹0'
      });
    }

    // Close onboarding modal
    closeOnboarding();

    // Launch Stage 1 (Calibrate)
    startCalibrationStage();
  }

  /**
   * Shuffles MCQ options (A, B, C, D) dynamically and tracks the new correct answer.
   * Smart Guard: Skips shuffling if any option contains positional/letter-referencing phrases
   * like "Both A and B", "All of the above", "None of these", "(a) and (b)", etc.
   */
  function shuffleQuestionOptions(question) {
    if (!question || !question.options) return question;

    // Smart Guard Regex: detect positional or self-referential options
    const POSITIONAL_OPTION_REGEX = /\b(both\s+(?:options?\s+|statements?\s+)?(?:\([a-d1-4]\)|[a-d1-4])\s+and\s+(?:\([a-d1-4]\)|[a-d1-4])|all\s+(?:of\s+)?the\s+above|none\s+(?:of\s+)?(?:the\s+above|these)|neither\s+[a-d]\s+nor\s+[a-d]|either\s+[a-d]\s+or\s+[a-d]|only\s+(?:\([a-d]\)|[a-d])\b)/i;

    const optionValues = Object.values(question.options);
    const hasPositionalOption = optionValues.some(val => {
      if (typeof val !== 'string') return false;
      return POSITIONAL_OPTION_REGEX.test(val);
    });

    if (hasPositionalOption) {
      // Preserve original option order to prevent logical absurdities
      return question;
    }

    const originalLetters = ['A', 'B', 'C', 'D'];
    const entries = originalLetters
      .filter(l => question.options[l] !== undefined)
      .map(l => ({ originalLetter: l, text: question.options[l] }));

    if (entries.length < 2) return question;

    // Fisher-Yates shuffle
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = entries[i];
      entries[i] = entries[j];
      entries[j] = temp;
    }

    const newOptions = {};
    let newCorrect = question.correctAnswer;
    const oldCorrect = question.correctAnswer;

    entries.forEach((item, idx) => {
      const newLetter = originalLetters[idx];
      newOptions[newLetter] = item.text;
      if (item.originalLetter === oldCorrect) {
        newCorrect = newLetter;
      }
    });

    let newSolution = question.solution || '';
    if (newSolution && oldCorrect !== newCorrect) {
      newSolution = newSolution.replace(new RegExp(`\\b(is\\s*\\(?|option\\s*\\(?|answer\\s*is\\s*\\(?)` + oldCorrect + `(\\)?|\\.)`, 'gi'), `$1${newCorrect}$2`);
    }

    return {
      ...question,
      options: newOptions,
      correctAnswer: newCorrect,
      solution: newSolution
    };
  }

  /**
   * ==========================================
   * SPRINT STATE VARIABLES & SESSION LIFECYCLE
   * ==========================================
   */
  // Stage 1 variables
  let calibCurrentIndex = 0;
  let calibQuestionsList = [];
  let selectedOptionForCurrentQ = null;

  // Stage 3 variables
  let practiceQuestionsList = [];
  let practiceCurrentIndex = 0;
  let practiceSelectedOption = null;
  let practiceHasAttemptedCurrentQ = false;
  let practiceCurrentIsCorrect = false;

  // Stage 4 variables
  let testQuestionsList = [];
  let testCurrentIndex = 0;
  let testSelectedOption = null;
  let testCountdownInterval = null;
  let testTimeRemainingSeconds = 15 * 60;

  // Break & Stopwatch variables
  let sprintTimerInterval = null;
  let breakCheckInterval = null;
  let activeBreakInterval = null;
  let breakStartTimestamp = null;
  let tenMinWarningSent = false;
  let fifteenMinParentAlertSent = false;

  /**
   * Complete Sprint Session Reset
   * Cleans up all DOM stage wrappers, sub-screens, state objects, indices, and active timers.
   * Guarantees that any new sprint starts completely fresh from Stage 1, Question 1.
   */
  function resetSprintSession() {
    console.log('[BUD-E] Resetting sprint session to fresh state...');

    // 1. Clear all active intervals & background timers
    if (sprintTimerInterval) {
      clearInterval(sprintTimerInterval);
      sprintTimerInterval = null;
    }
    if (testCountdownInterval) {
      clearInterval(testCountdownInterval);
      testCountdownInterval = null;
    }
    if (breakCheckInterval) {
      clearInterval(breakCheckInterval);
      breakCheckInterval = null;
    }
    if (activeBreakInterval) {
      clearInterval(activeBreakInterval);
      activeBreakInterval = null;
    }

    // Reset clock display
    const clockEl = document.getElementById('sprint-clock');
    if (clockEl) clockEl.textContent = '00:00';

    // 2. Reset Stage Card Wrappers visibility
    const calibWrapper = document.getElementById('stage-calibrate-wrapper');
    const learnWrapper = document.getElementById('stage-learn-wrapper');
    const pracWrapper = document.getElementById('stage-practice-wrapper');
    const testWrapper = document.getElementById('stage-test-wrapper');
    const resultWrapper = document.getElementById('stage-result-wrapper');
    const recallWrapper = document.getElementById('stage-recall-wrapper');

    if (calibWrapper) calibWrapper.style.display = 'block';
    if (learnWrapper) learnWrapper.style.display = 'none';
    if (pracWrapper) pracWrapper.style.display = 'none';
    if (testWrapper) testWrapper.style.display = 'none';
    if (resultWrapper) resultWrapper.style.display = 'none';
    if (recallWrapper) recallWrapper.style.display = 'none';

    // 3. Reset Stage 1: Calibrate sub-containers & state
    calibCurrentIndex = 0;
    calibQuestionsList = [];
    selectedOptionForCurrentQ = null;
    state.calibration.score = 0;
    state.calibration.level = null;
    state.calibration.answers = {};

    const calibQContainer = document.getElementById('calib-question-container');
    const calibResContainer = document.getElementById('calib-result-container');
    if (calibQContainer) calibQContainer.style.display = 'block';
    if (calibResContainer) calibResContainer.style.display = 'none';

    // 4. Reset Stage 2: Learn video container
    const videoWrapper = document.getElementById('video-frame-wrapper');
    if (videoWrapper) videoWrapper.innerHTML = '';

    // 5. Reset Stage 3: Practice sub-containers & state
    practiceCurrentIndex = 0;
    practiceQuestionsList = [];
    practiceSelectedOption = null;
    practiceHasAttemptedCurrentQ = false;
    practiceCurrentIsCorrect = false;

    state.practice.currentIndex = 0;
    state.practice.totalQuestions = 0;
    state.practice.confidenceMeter = 50;
    state.practice.errors = { sillyMistake: 0, conceptGap: 0, guess: 0 };

    const pracQContainer = document.getElementById('prac-question-container');
    const pracCompleteContainer = document.getElementById('prac-completion-container');
    const pracHintBox = document.getElementById('prac-hint-box');
    const pracErrorTagger = document.getElementById('prac-error-tagger');
    const pracSolutionArea = document.getElementById('prac-solution-area');
    const pracSolutionBox = document.getElementById('prac-solution-box');

    if (pracQContainer) pracQContainer.style.display = 'block';
    if (pracCompleteContainer) pracCompleteContainer.style.display = 'none';
    if (pracHintBox) pracHintBox.style.display = 'none';
    if (pracErrorTagger) pracErrorTagger.style.display = 'none';
    if (pracSolutionArea) pracSolutionArea.style.display = 'none';
    if (pracSolutionBox) pracSolutionBox.style.display = 'none';

    updateConfidenceMeterUI();
    updateErrorChipsUI();

    // 6. Reset Stage 4: Test sub-containers & state
    testCurrentIndex = 0;
    testQuestionsList = [];
    testSelectedOption = null;
    testTimeRemainingSeconds = 15 * 60;

    state.test.score = 0;
    state.test.total = 10;
    state.test.passed = false;
    state.test.answers = {};

    const testQContainer = document.getElementById('test-question-container');
    const testReviewContainer = document.getElementById('test-review-container');
    const testClockEl = document.getElementById('test-countdown-timer');
    if (testQContainer) testQContainer.style.display = 'block';
    if (testReviewContainer) testReviewContainer.style.display = 'none';
    if (testClockEl) testClockEl.textContent = '15:00';

    // 7. Reset Stage 5: Recall containers
    const fcGrid = document.getElementById('flashcards-grid');
    const notesContainer = document.getElementById('short-notes-content');
    const tipsContainer = document.getElementById('exam-tips-container');
    if (fcGrid) fcGrid.innerHTML = '';
    if (notesContainer) notesContainer.innerHTML = '';
    if (tipsContainer) tipsContainer.innerHTML = '';

    // 8. Reset Break system state
    state.breakTimer.sprintStart = Date.now();
    state.breakTimer.inBreak = false;
    state.breakTimer.breakStart = null;
    tenMinWarningSent = false;
    fifteenMinParentAlertSent = false;

    // Close any active break modal/overlay
    const breakPromptModal = document.getElementById('modal-break-prompt');
    const breakActiveOverlay = document.getElementById('overlay-break-active');
    if (breakPromptModal) breakPromptModal.classList.remove('active');
    if (breakActiveOverlay) breakActiveOverlay.classList.remove('active');

    // 9. Reset Stepper UI to Step 1
    updateStepper(1);
  }

  /**
   * ==========================================
   * STAGE 1: CALIBRATE LOGIC
   * ==========================================
   */
  function startCalibrationStage() {
    const subject = state.student.subject;
    const chapter = state.student.chapter;

    // Fully reset all stage wrappers, sub-screens, state, and previous timers
    resetSprintSession();

    // Retrieve exactly 10 questions for the selected chapter with verified correct answers
    calibQuestionsList = [];
    if (window.BUDE_PRACTICE && typeof window.BUDE_PRACTICE.getCalibrationQuestions === 'function') {
      calibQuestionsList = window.BUDE_PRACTICE.getCalibrationQuestions(subject, chapter);
    }
    if (!calibQuestionsList || calibQuestionsList.length === 0) {
      calibQuestionsList = (window.BUDE_CALIBRATION && window.BUDE_CALIBRATION[subject] && window.BUDE_CALIBRATION[subject][chapter]) || [];
    }
    if (!calibQuestionsList || calibQuestionsList.length === 0) {
      console.warn(`[BUD-E] No calibration questions found for ${subject} -> ${chapter}. Falling back to Electric Charges and Fields.`);
      if (window.BUDE_PRACTICE && typeof window.BUDE_PRACTICE.getCalibrationQuestions === 'function') {
        calibQuestionsList = window.BUDE_PRACTICE.getCalibrationQuestions("Physics", "Electric Charges and Fields");
      } else {
        calibQuestionsList = (window.BUDE_CALIBRATION && window.BUDE_CALIBRATION["Physics"]["Electric Charges and Fields"]) || [];
      }
    }

    // Dynamic anti-guessing option shuffle
    calibQuestionsList = calibQuestionsList.map(q => shuffleQuestionOptions(q));

    calibCurrentIndex = 0;
    state.calibration.score = 0;
    state.calibration.answers = {};
    selectedOptionForCurrentQ = null;

    // Switch views: Hide homepage, show sprint container
    const homeView = document.getElementById('view-homepage');
    const sprintContainer = document.getElementById('view-sprint-container');
    if (homeView) homeView.style.display = 'none';
    if (sprintContainer) sprintContainer.style.display = 'block';

    // Update Header Meta
    const subjPill = document.getElementById('sprint-subject-pill');
    const chapTitle = document.getElementById('sprint-chapter-title');
    if (subjPill) subjPill.textContent = subject;
    if (chapTitle) chapTitle.textContent = chapter;

    // Start sprint duration clock
    startSprintClock();

    // Reset stepper
    updateStepper(1);

    // Render Question 1
    renderCalibrationQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCalibrationQuestion() {
    const q = calibQuestionsList[calibCurrentIndex];
    if (!q) return;

    selectedOptionForCurrentQ = null;

    const progressEl = document.getElementById('calib-progress-text');
    const qTextEl = document.getElementById('calib-question-text');
    const optsContainer = document.getElementById('calib-options-list');
    const nextBtn = document.getElementById('btn-calib-next');

    if (progressEl) progressEl.textContent = `Question ${calibCurrentIndex + 1} of 10`;
    if (qTextEl) {
      qTextEl.innerHTML = `<strong>Q${calibCurrentIndex + 1}.</strong> ${renderFormulas(q.questionText)}`;
    }

    if (optsContainer) {
      optsContainer.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D'];
      letters.forEach(letter => {
        const optText = q.options[letter] || '';
        const optDiv = document.createElement('div');
        optDiv.className = 'mcq-option-item';
        optDiv.setAttribute('data-option', letter);
        optDiv.onclick = () => selectCalibrationOption(letter);

        optDiv.innerHTML = `
          <div class="opt-prefix">${letter}</div>
          <div class="opt-content">${renderFormulas(optText)}</div>
        `;
        optsContainer.appendChild(optDiv);
      });
    }

    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = calibCurrentIndex === 9 ? 'Finish Diagnostic →' : 'Next Question →';
    }

    // Trigger KaTeX render for crisp mathematical symbols
    typesetMath(qTextEl);
    typesetMath(optsContainer);
  }

  function selectCalibrationOption(letter) {
    selectedOptionForCurrentQ = letter;
    document.querySelectorAll('#calib-options-list .mcq-option-item').forEach(el => {
      if (el.getAttribute('data-option') === letter) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });

    const nextBtn = document.getElementById('btn-calib-next');
    if (nextBtn) nextBtn.disabled = false;
  }

  function handleCalibNext() {
    if (!selectedOptionForCurrentQ) return;

    const currentQ = calibQuestionsList[calibCurrentIndex];
    const isCorrect = selectedOptionForCurrentQ === currentQ.correctAnswer;
    
    state.calibration.answers[calibCurrentIndex] = {
      chosen: selectedOptionForCurrentQ,
      correct: currentQ.correctAnswer,
      isCorrect: isCorrect
    };

    if (isCorrect) {
      state.calibration.score += 1;
    }

    calibCurrentIndex++;

    if (calibCurrentIndex < 10) {
      renderCalibrationQuestion();
    } else {
      finishCalibrationStage();
    }
  }

  function finishCalibrationStage() {
    const score = state.calibration.score;
    let level = 'Foundation';
    let explanation = '';
    let badgeClass = 'badge-foundation';

    // Foundation (0-4) / Intermediate (5-7) / Advanced (8-10)
    if (score >= 8) {
      level = 'Advanced';
      explanation = 'Strong problem-solving foundation identified. Your sprint will prioritize high-yield applications, timed drills, and advanced conceptual refinements.';
      badgeClass = 'badge-advanced';
    } else if (score >= 5) {
      level = 'Intermediate';
      explanation = 'Sound conceptual awareness with targeted gaps in tricky numerical patterns. Your sprint focuses on intermediate drills and exam problem breakdowns.';
      badgeClass = 'badge-intermediate';
    } else {
      level = 'Foundation';
      explanation = 'Essential foundational principles need reinforcement. Your sprint will pair structured concept learning with gradual confidence-building practice.';
      badgeClass = 'badge-foundation';
    }

    state.calibration.level = level;

    // Log diagnostic level back to the Google Form silently
    if (window.BUDE_LOGGER && window.BUDE_LOGGER.silentLog) {
      window.BUDE_LOGGER.silentLog({
        name: state.student.name,
        subject: state.student.subject,
        chapter: state.student.chapter,
        calibrationLevel: level,
        calibrationScore: score
      });
    }

    // Display Result Container
    const qContainer = document.getElementById('calib-question-container');
    const resultContainer = document.getElementById('calib-result-container');
    const scoreValEl = document.getElementById('calib-result-score');
    const levelBadgeEl = document.getElementById('calib-level-badge');
    const explanationEl = document.getElementById('calib-level-explanation');

    if (qContainer) qContainer.style.display = 'none';
    if (resultContainer) resultContainer.style.display = 'block';

    if (scoreValEl) scoreValEl.textContent = `${score} / 10`;
    if (levelBadgeEl) {
      levelBadgeEl.className = `level-badge ${badgeClass}`;
      levelBadgeEl.textContent = `${level} Band`;
    }
    if (explanationEl) explanationEl.textContent = explanation;

    // Render transparent question-by-question breakdown
    const breakdownEl = document.getElementById('calib-breakdown-container');
    if (breakdownEl) {
      let pillsHtml = '<div style="font-size:0.75rem; font-weight:700; color:var(--color-ink-soft); margin-bottom:0.6rem; text-transform:uppercase; letter-spacing:0.04em;">Question Breakdown:</div><div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">';
      for (let i = 0; i < 10; i++) {
        const a = state.calibration.answers[i];
        if (a) {
          const isC = a.isCorrect;
          pillsHtml += `<span title="Q${i+1}: You selected (${a.chosen}), Correct was (${a.correct})" style="padding:4px 8px; border-radius:6px; font-size:0.78rem; font-weight:700; background-color:${isC ? '#DCFCE7' : '#FEE2E2'}; color:${isC ? '#166534' : '#991B1B'}; border:1px solid ${isC ? '#86EFAC' : '#FECACA'}; cursor:default;">Q${i+1}: ${isC ? '✓' : '✗ (' + a.correct + ')'}</span>`;
        }
      }
      pillsHtml += '</div>';
      breakdownEl.innerHTML = pillsHtml;
    }

    console.log(`[BUD-E Calibration] Finished: ${score}/10 -> Assigned Level: ${level}`);
  }

  /**
   * ==========================================
   * STAGE 2: LEARN LOGIC
   * ==========================================
   */
  function proceedToStage2() {
    console.log('[BUD-E] Launching Stage 2: Learn');
    updateStepper(2);

    // Hide Calibrate Wrapper, show Learn Wrapper
    const calibWrapper = document.getElementById('stage-calibrate-wrapper');
    const learnWrapper = document.getElementById('stage-learn-wrapper');
    if (calibWrapper) calibWrapper.style.display = 'none';
    if (learnWrapper) learnWrapper.style.display = 'block';

    const subject = state.student.subject;
    const chapter = state.student.chapter;
    const level = state.calibration.level || 'Intermediate';
    const timeBudget = state.student.timeBudget || '2hrs';

    // Format duration key (e.g. '2hours', '3hours', '4hours', '5+hours')
    let durationKey = timeBudget.replace('hrs', 'hours').toLowerCase();
    if (!durationKey.includes('hours')) durationKey += 'hours';

    // Update Header labels
    const learnHeading = document.getElementById('learn-heading');
    const levelTag = document.getElementById('learn-level-tag');
    if (learnHeading) {
      learnHeading.textContent = `${chapter} (${level} Track · ${timeBudget})`;
    }
    if (levelTag) {
      let bClass = 'badge-foundation';
      if (level === 'Intermediate') bClass = 'badge-intermediate';
      if (level === 'Advanced') bClass = 'badge-advanced';
      levelTag.innerHTML = `<span class="pill ${bClass}">${level} Level</span>`;
    }

    // Lookup video link from window.BUDE_VIDEOS
    let videoEntry = null;
    if (window.BUDE_VIDEOS && window.BUDE_VIDEOS[subject] && window.BUDE_VIDEOS[subject][chapter]) {
      const levelMap = window.BUDE_VIDEOS[subject][chapter][level];
      if (levelMap) {
        videoEntry = levelMap[durationKey] || levelMap['2hours'] || Object.values(levelMap)[0];
      }
    }

    // Fallback: If missing, fallback to Electric Charges and Fields placeholder as instructed in prompt
    if (!videoEntry || !videoEntry.youtubeId) {
      console.info(`[BUD-E Learn] Direct video link not found for ${subject} -> ${chapter} -> ${level}. Checking Electric Charges and Fields fallback.`);
      if (window.BUDE_VIDEOS && window.BUDE_VIDEOS["Physics"] && window.BUDE_VIDEOS["Physics"]["Electric Charges and Fields"]) {
        const fallbackMap = window.BUDE_VIDEOS["Physics"]["Electric Charges and Fields"][level] || window.BUDE_VIDEOS["Physics"]["Electric Charges and Fields"]["Intermediate"];
        if (fallbackMap) {
          videoEntry = fallbackMap[durationKey] || fallbackMap['2hours'] || Object.values(fallbackMap)[0];
        }
      }
    }

    const frameWrapper = document.getElementById('video-frame-wrapper');
    if (!frameWrapper) return;

    if (videoEntry && videoEntry.youtubeId) {
      frameWrapper.innerHTML = `
        <iframe 
          src="https://www.youtube-nocookie.com/embed/${videoEntry.youtubeId}?autoplay=0&rel=0&modestbranding=1" 
          title="BUD-E Lecture - ${chapter}" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen 
          loading="lazy">
        </iframe>
      `;
    } else {
      // Graceful "Video unavailable" state as mandated
      frameWrapper.innerHTML = `
        <div class="video-unavailable-notice">
          <div class="video-unavailable-icon">📺</div>
          <h4 style="font-size: 1.2rem; font-weight: 700; color: var(--color-ink); margin-bottom: 0.5rem;">Video Unavailable</h4>
          <p class="text-soft" style="max-width: 420px; font-size: 0.9rem; margin-bottom: 1rem;">
            A targeted one-shot timestamp for this specific chapter combination has not yet been registered. You can proceed directly to active question practice.
          </p>
          <button class="btn btn-primary" onclick="BUDE_APP.proceedToStage3()">
            Proceed to Practice Mode →
          </button>
        </div>
      `;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * ==========================================
   * STAGE 3: PRACTICE LOGIC
   * ==========================================
   */
  function proceedToStage3() {
    console.log('[BUD-E] Launching Stage 3: Practice');
    updateStepper(3);

    // Hide Learn wrapper, show Practice wrapper
    const learnWrapper = document.getElementById('stage-learn-wrapper');
    const pracWrapper = document.getElementById('stage-practice-wrapper');
    if (learnWrapper) learnWrapper.style.display = 'none';
    if (pracWrapper) pracWrapper.style.display = 'block';

    const subject = state.student.subject;
    const chapter = state.student.chapter;
    const level = state.calibration.level || 'Intermediate';
    const timeBudget = state.student.timeBudget || '2hrs';

    // Retrieve practice set based on chapter, level and time budget
    practiceQuestionsList = window.BUDE_PRACTICE.getPracticeQuestions(subject, chapter, level, timeBudget);
    // Dynamic anti-guessing option shuffle
    practiceQuestionsList = practiceQuestionsList.map(q => shuffleQuestionOptions(q));
    practiceCurrentIndex = 0;
    state.practice.totalQuestions = practiceQuestionsList.length;
    state.practice.confidenceMeter = 50; // starts at baseline 50%
    state.practice.errors = { sillyMistake: 0, conceptGap: 0, guess: 0 };

    // Update headings and chips
    const headingEl = document.getElementById('prac-heading');
    if (headingEl) headingEl.textContent = `${chapter} (${level} · ${timeBudget}: ${practiceQuestionsList.length} Questions)`;

    updateConfidenceMeterUI();
    updateErrorChipsUI();

    // Render Question 1
    renderPracticeQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderPracticeQuestion() {
    const q = practiceQuestionsList[practiceCurrentIndex];
    if (!q) return;

    practiceSelectedOption = null;
    practiceHasAttemptedCurrentQ = false;
    practiceCurrentIsCorrect = false;

    // Reset UI elements
    const progressEl = document.getElementById('prac-progress-text');
    const qTextEl = document.getElementById('prac-question-text');
    const optsContainer = document.getElementById('prac-options-list');
    const hintBox = document.getElementById('prac-hint-box');
    const hintBtn = document.getElementById('btn-view-hint');
    const taggerBox = document.getElementById('prac-error-tagger');
    const solutionArea = document.getElementById('prac-solution-area');
    const solutionBox = document.getElementById('prac-solution-box');
    const nextBtn = document.getElementById('btn-prac-next');

    if (progressEl) progressEl.textContent = `Question ${practiceCurrentIndex + 1} of ${practiceQuestionsList.length}`;
    if (qTextEl) {
      qTextEl.innerHTML = `<strong>Q${practiceCurrentIndex + 1}.</strong> ${renderFormulas(q.questionText)}`;
    }

    if (hintBox) {
      hintBox.style.display = 'none';
      hintBox.innerHTML = `<strong>Hint:</strong> ${renderFormulas(q.hint || 'Focus on the fundamental definitions and formula relationships.')}`;
    }
    if (hintBtn) hintBtn.textContent = '💡 View Hint';

    if (taggerBox) taggerBox.style.display = 'none';
    if (solutionArea) solutionArea.style.display = 'none';
    if (solutionBox) {
      solutionBox.style.display = 'none';
      solutionBox.innerHTML = `<strong>Verified Solution:</strong> ${renderFormulas(q.solution || 'Correct answer is (' + q.correctAnswer + ').')}`;
    }

    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = (practiceCurrentIndex === practiceQuestionsList.length - 1) ? 'Complete Practice Round →' : 'Next Question →';
    }

    if (optsContainer) {
      optsContainer.innerHTML = '';
      ['A', 'B', 'C', 'D'].forEach(letter => {
        const optText = q.options[letter] || '';
        const optDiv = document.createElement('div');
        optDiv.className = 'mcq-option-item';
        optDiv.setAttribute('data-option', letter);
        optDiv.onclick = () => selectPracticeOption(letter);

        optDiv.innerHTML = `
          <div class="opt-prefix">${letter}</div>
          <div class="opt-content">${renderFormulas(optText)}</div>
        `;
        optsContainer.appendChild(optDiv);
      });
    }

    typesetMath(qTextEl);
    typesetMath(optsContainer);
    typesetMath(hintBox);
    typesetMath(solutionBox);
  }

  function selectPracticeOption(letter) {
    if (practiceHasAttemptedCurrentQ) return; // Prevent multiple re-clicks on same question

    practiceSelectedOption = letter;
    practiceHasAttemptedCurrentQ = true;

    const currentQ = practiceQuestionsList[practiceCurrentIndex];
    practiceCurrentIsCorrect = (letter === currentQ.correctAnswer);

    // Apply color states (150ms background-color transition, no bounce)
    document.querySelectorAll('#prac-options-list .mcq-option-item').forEach(el => {
      const optVal = el.getAttribute('data-option');
      if (optVal === currentQ.correctAnswer) {
        el.style.backgroundColor = 'var(--color-stage-practice)';
        el.style.borderColor = 'var(--color-success)';
      }
      if (optVal === letter && !practiceCurrentIsCorrect) {
        el.style.backgroundColor = '#FEE2E2';
        el.style.borderColor = 'var(--color-danger)';
      }
    });

    const solutionArea = document.getElementById('prac-solution-area');
    const taggerBox = document.getElementById('prac-error-tagger');
    const nextBtn = document.getElementById('btn-prac-next');

    if (practiceCurrentIsCorrect) {
      // Correct answer: Increase confidence meter (+5%)
      adjustConfidenceMeter(5);
      if (solutionArea) solutionArea.style.display = 'block';
      if (nextBtn) nextBtn.disabled = false;
    } else {
      // Incorrect answer: ask "Was this a silly mistake, a concept gap, or a guess?"
      if (taggerBox) taggerBox.style.display = 'block';
      // Enable solution button only after tagging
      if (nextBtn) nextBtn.disabled = true;
    }
  }

  function tagErrorType(type) {
    // Confidence meter penalty rules:
    // silly mistake: decreases slightly (-3%)
    // conceptual error: decreases more (-7%)
    // guess: decreases highest (-12%)
    if (type === 'silly') {
      state.practice.errors.sillyMistake += 1;
      adjustConfidenceMeter(-3);
    } else if (type === 'concept') {
      state.practice.errors.conceptGap += 1;
      adjustConfidenceMeter(-7);
    } else if (type === 'guess') {
      state.practice.errors.guess += 1;
      adjustConfidenceMeter(-12);
    }

    // Hide error tagger dialog
    const taggerBox = document.getElementById('prac-error-tagger');
    if (taggerBox) taggerBox.style.display = 'none';

    // Show solution area
    const solutionArea = document.getElementById('prac-solution-area');
    if (solutionArea) solutionArea.style.display = 'block';

    // Update error summary chips
    updateErrorChipsUI();

    // Enable next question button
    const nextBtn = document.getElementById('btn-prac-next');
    if (nextBtn) nextBtn.disabled = false;
  }

  function adjustConfidenceMeter(delta) {
    let current = state.practice.confidenceMeter;
    current = Math.max(5, Math.min(100, current + delta));
    state.practice.confidenceMeter = current;
    updateConfidenceMeterUI();
  }

  function updateConfidenceMeterUI() {
    const val = state.practice.confidenceMeter;
    const fillEl = document.getElementById('confidence-bar-fill');
    const textEl = document.getElementById('confidence-pct-val');

    if (fillEl) fillEl.style.width = `${val}%`;
    if (textEl) textEl.textContent = `${val}%`;
  }

  function updateErrorChipsUI() {
    const sEl = document.getElementById('chip-silly');
    const cEl = document.getElementById('chip-concept');
    const gEl = document.getElementById('chip-guess');

    if (sEl) sEl.textContent = `Silly: ${state.practice.errors.sillyMistake}`;
    if (cEl) cEl.textContent = `Concept: ${state.practice.errors.conceptGap}`;
    if (gEl) gEl.textContent = `Guess: ${state.practice.errors.guess}`;
  }

  function togglePracticeHint() {
    const box = document.getElementById('prac-hint-box');
    const btn = document.getElementById('btn-view-hint');
    if (!box) return;
    if (box.style.display === 'none') {
      box.style.display = 'block';
      typesetMath(box);
      if (btn) btn.textContent = '💡 Hide Hint';
    } else {
      box.style.display = 'none';
      if (btn) btn.textContent = '💡 View Hint';
    }
  }

  function togglePracticeSolution() {
    const box = document.getElementById('prac-solution-box');
    const btn = document.getElementById('btn-view-solution');
    if (!box) return;
    if (box.style.display === 'none') {
      box.style.display = 'block';
      typesetMath(box);
      if (btn) btn.textContent = '📘 Hide Solution';
    } else {
      box.style.display = 'none';
      if (btn) btn.textContent = '📘 View Solution';
    }
  }

  function handlePracticeNext() {
    practiceCurrentIndex++;
    if (practiceCurrentIndex < practiceQuestionsList.length) {
      renderPracticeQuestion();
    } else {
      finishPracticeStage();
    }
  }

  function finishPracticeStage() {
    const qContainer = document.getElementById('prac-question-container');
    const summaryContainer = document.getElementById('prac-completion-container');
    const finalConfEl = document.getElementById('summary-final-conf');
    const sumSilly = document.getElementById('summary-silly');
    const sumConcept = document.getElementById('summary-concept');
    const sumGuess = document.getElementById('summary-guess');

    if (qContainer) qContainer.style.display = 'none';
    if (summaryContainer) summaryContainer.style.display = 'block';

    if (finalConfEl) finalConfEl.textContent = `${state.practice.confidenceMeter}%`;
    if (sumSilly) sumSilly.textContent = `Silly Mistakes: ${state.practice.errors.sillyMistake}`;
    if (sumConcept) sumConcept.textContent = `Concept Gaps: ${state.practice.errors.conceptGap}`;
    if (sumGuess) sumGuess.textContent = `Guesses: ${state.practice.errors.guess}`;

    console.log('[BUD-E Practice] Finished practice round:', state.practice);
  }

  /**
   * ==========================================
   * STAGE 4: TEST LOGIC (EXAM SIMULATION)
   * ==========================================
   */
  function proceedToStage4() {
    console.log('[BUD-E] Launching Stage 4: Test (Exam Simulation)');
    updateStepper(4);

    // Hide Practice wrapper, show Test wrapper
    const pracWrapper = document.getElementById('stage-practice-wrapper');
    const testWrapper = document.getElementById('stage-test-wrapper');
    if (pracWrapper) pracWrapper.style.display = 'none';
    if (testWrapper) testWrapper.style.display = 'block';

    const subject = state.student.subject;
    const chapter = state.student.chapter;

    // Load 10 standard moderate-to-difficult MCQs (same for all students)
    testQuestionsList = window.BUDE_PRACTICE.getTestQuestions(subject, chapter);
    // Dynamic anti-guessing option shuffle
    testQuestionsList = testQuestionsList.map(q => shuffleQuestionOptions(q));
    testCurrentIndex = 0;
    state.test.score = 0;
    state.test.total = testQuestionsList.length;
    state.test.answers = {};

    const headingEl = document.getElementById('test-heading');
    if (headingEl) headingEl.textContent = `${chapter} — Exam Mastery Test (10 Questions)`;

    // Start 15-minute exam simulation countdown
    startTestTimer();

    // Render Question 1
    renderTestQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startTestTimer() {
    if (testCountdownInterval) clearInterval(testCountdownInterval);
    testTimeRemainingSeconds = 15 * 60; // 15 minutes
    updateTestTimerDisplay();

    testCountdownInterval = setInterval(() => {
      testTimeRemainingSeconds--;
      updateTestTimerDisplay();

      if (testTimeRemainingSeconds <= 0) {
        clearInterval(testCountdownInterval);
        console.warn('[BUD-E Test] Time limit reached! Auto-submitting exam...');
        autoSubmitTest();
      }
    }, 1000);
  }

  function updateTestTimerDisplay() {
    const clockEl = document.getElementById('test-countdown-timer');
    if (!clockEl) return;
    const m = Math.floor(testTimeRemainingSeconds / 60);
    const s = testTimeRemainingSeconds % 60;
    clockEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function renderTestQuestion() {
    const q = testQuestionsList[testCurrentIndex];
    if (!q) return;

    testSelectedOption = null;

    const progressEl = document.getElementById('test-progress-text');
    const qTextEl = document.getElementById('test-question-text');
    const optsContainer = document.getElementById('test-options-list');
    const nextBtn = document.getElementById('btn-test-next');

    if (progressEl) progressEl.textContent = `Q ${testCurrentIndex + 1} of ${testQuestionsList.length}`;
    if (qTextEl) {
      qTextEl.innerHTML = `<strong>Q${testCurrentIndex + 1}.</strong> ${renderFormulas(q.questionText)}`;
    }

    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = (testCurrentIndex === testQuestionsList.length - 1) ? 'Submit Final Exam →' : 'Next Question →';
    }

    if (optsContainer) {
      optsContainer.innerHTML = '';
      ['A', 'B', 'C', 'D'].forEach(letter => {
        const optText = q.options[letter] || '';
        const optDiv = document.createElement('div');
        optDiv.className = 'mcq-option-item';
        optDiv.setAttribute('data-option', letter);
        optDiv.onclick = () => selectTestOption(letter);

        optDiv.innerHTML = `
          <div class="opt-prefix">${letter}</div>
          <div class="opt-content">${renderFormulas(optText)}</div>
        `;
        optsContainer.appendChild(optDiv);
      });
    }

    typesetMath(qTextEl);
    typesetMath(optsContainer);
  }

  function selectTestOption(letter) {
    testSelectedOption = letter;

    document.querySelectorAll('#test-options-list .mcq-option-item').forEach(el => {
      if (el.getAttribute('data-option') === letter) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });

    const nextBtn = document.getElementById('btn-test-next');
    if (nextBtn) nextBtn.disabled = false;
  }

  function handleTestNext() {
    if (!testSelectedOption) return;

    const currentQ = testQuestionsList[testCurrentIndex];
    const isCorrect = (testSelectedOption === currentQ.correctAnswer);

    state.test.answers[testCurrentIndex] = {
      chosen: testSelectedOption,
      correct: currentQ.correctAnswer,
      isCorrect: isCorrect,
      questionText: currentQ.questionText,
      solution: currentQ.solution,
      options: currentQ.options
    };

    if (isCorrect) {
      state.test.score += 1;
    }

    testCurrentIndex++;

    if (testCurrentIndex < testQuestionsList.length) {
      renderTestQuestion();
    } else {
      finishTestStage();
    }
  }

  function autoSubmitTest() {
    // Fill remaining unanswered questions
    for (let i = testCurrentIndex; i < testQuestionsList.length; i++) {
      const q = testQuestionsList[i];
      if (!state.test.answers[i]) {
        state.test.answers[i] = {
          chosen: 'None',
          correct: q.correctAnswer,
          isCorrect: false,
          questionText: q.questionText,
          solution: q.solution,
          options: q.options
        };
      }
    }
    finishTestStage();
  }

  function finishTestStage() {
    if (testCountdownInterval) clearInterval(testCountdownInterval);

    const score = state.test.score;
    const passed = (score >= 7); // Threshold: >= 7/10 gets "Can Solve" badge
    state.test.passed = passed;

    const qContainer = document.getElementById('test-question-container');
    const reviewContainer = document.getElementById('test-review-container');
    const scoreValEl = document.getElementById('test-review-score');
    const statusValEl = document.getElementById('test-pass-status');
    const itemsListEl = document.getElementById('test-review-items-list');

    if (qContainer) qContainer.style.display = 'none';
    if (reviewContainer) reviewContainer.style.display = 'block';

    if (scoreValEl) scoreValEl.textContent = `${score} / 10`;
    if (statusValEl) {
      if (passed) {
        statusValEl.textContent = 'CAN SOLVE (PASSED)';
        statusValEl.style.color = 'var(--color-success)';
      } else {
        statusValEl.textContent = 'NEEDS REVISION (< 7/10)';
        statusValEl.style.color = 'var(--color-warning)';
      }
    }

    // Build post-exam review list with questions, answers, and solutions
    if (itemsListEl) {
      itemsListEl.innerHTML = '';
      testQuestionsList.forEach((q, idx) => {
        const ansInfo = state.test.answers[idx] || { chosen: 'None', isCorrect: false };
        const itemCard = document.createElement('div');
        itemCard.className = 'card';
        itemCard.style.padding = '1.25rem';
        itemCard.style.borderLeft = ansInfo.isCorrect ? '4px solid var(--color-success)' : '4px solid var(--color-danger)';

        itemCard.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <strong style="color: var(--color-ink);">Question ${idx + 1}</strong>
            <span class="pill ${ansInfo.isCorrect ? 'pill-brand' : 'pill-warning'}" style="font-size: 0.75rem;">
              ${ansInfo.isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
          </div>
          <p style="font-size: 0.95rem; color: var(--color-ink); margin-bottom: 0.75rem;">${renderFormulas(q.questionText)}</p>
          <div style="font-size: 0.85rem; margin-bottom: 0.5rem;">
            <span class="text-soft">Your Choice:</span> <strong>(${ansInfo.chosen})</strong> | 
            <span class="text-soft">Correct:</span> <strong style="color: var(--color-success);">(${q.correctAnswer})</strong>
          </div>
          <div style="background-color: var(--color-paper-alt); padding: 0.75rem; border-radius: 4px; font-size: 0.85rem; color: var(--color-ink-soft);">
            ${renderFormulas(q.solution || 'Verified correct answer is (' + q.correctAnswer + ').')}
          </div>
        `;
        itemsListEl.appendChild(itemCard);
      });

      typesetMath(itemsListEl);
    }

    console.log(`[BUD-E Test] Test complete: ${score}/10. Threshold passed: ${passed}`);
    recordCompletedSprint();
  }

  /**
   * ==========================================
   * PHASE 9: RESULT PAGE & PROOF OF LEARNING LOGIC
   * ==========================================
   */
  function proceedToStage5Result() {
    console.log('[BUD-E] Generating Result Page & Proof of Learning Card');
    recordCompletedSprint();

    // Hide Test wrapper, show Result wrapper
    const testWrapper = document.getElementById('stage-test-wrapper');
    const resultWrapper = document.getElementById('stage-result-wrapper');
    if (testWrapper) testWrapper.style.display = 'none';
    if (resultWrapper) resultWrapper.style.display = 'block';

    const studentName = state.student.name || 'Class 12 Student';
    const subject = state.student.subject || 'Physics';
    const chapter = state.student.chapter || 'Electric Charges and Fields';
    const timeBudget = state.student.timeBudget || '2hrs';
    const testScore = state.test.score || 0;
    const confScore = state.practice.confidenceMeter || 50;
    const diagLevel = state.calibration.level || 'Foundation';
    const isPassed = (testScore >= 7);

    // 1. Populate Proof of Learning Card
    const nameEl = document.getElementById('pol-student-name');
    const topicEl = document.getElementById('pol-topic-title');
    const timeSpentEl = document.getElementById('pol-time-spent');
    const testScoreEl = document.getElementById('pol-test-score');
    const confScoreEl = document.getElementById('pol-confidence-score');
    const bandEl = document.getElementById('pol-diagnostic-band');
    const dateEl = document.getElementById('pol-card-date');
    const badgeContainer = document.getElementById('pol-badge-container');

    const errSilly = document.getElementById('pol-err-silly');
    const errConcept = document.getElementById('pol-err-concept');
    const errGuess = document.getElementById('pol-err-guess');

    if (nameEl) nameEl.textContent = studentName;
    if (topicEl) topicEl.textContent = `${subject}: ${chapter}`;
    if (timeSpentEl) timeSpentEl.textContent = `Time Invested: ${timeBudget} Active Learning Sprint`;
    if (testScoreEl) {
      testScoreEl.innerHTML = `<span class="${isPassed ? 'score-high' : ''}">${testScore}</span> / 10`;
    }
    if (confScoreEl) confScoreEl.textContent = `${confScore}%`;
    if (bandEl) {
      bandEl.textContent = diagLevel;
      if (diagLevel === 'Foundation') bandEl.style.color = 'var(--color-level-foundation)';
      else if (diagLevel === 'Intermediate') bandEl.style.color = 'var(--color-level-intermediate)';
      else bandEl.style.color = 'var(--color-level-advanced)';
    }

    if (dateEl) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString('en-US', options).toUpperCase();
    }

    if (badgeContainer) {
      if (isPassed) {
        badgeContainer.innerHTML = `
          <div class="badge-can-solve" style="background-color: var(--color-stage-practice); color: var(--color-success); border: 1px solid var(--color-success);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            CAN SOLVE
          </div>
        `;
      } else {
        badgeContainer.innerHTML = `
          <div class="badge-can-solve" style="background-color: #FEF3C7; color: #92400E; border: 1px solid #FCD34D;">
            NEEDS 1 MORE DRILL
          </div>
        `;
      }
    }

    if (errSilly) errSilly.textContent = `Silly Mistakes: ${state.practice.errors.sillyMistake}`;
    if (errConcept) errConcept.textContent = `Concept Gaps: ${state.practice.errors.conceptGap}`;
    if (errGuess) errGuess.textContent = `Guesses: ${state.practice.errors.guess}`;

    // 2. Deep Analytics Breakdown
    const deepConfVal = document.getElementById('deep-conf-value');
    const deepConfBar = document.getElementById('deep-conf-bar');
    const deepSilly = document.getElementById('deep-silly-count');
    const deepConcept = document.getElementById('deep-concept-count');
    const deepGuess = document.getElementById('deep-guess-count');
    const recoBox = document.getElementById('deep-recommendation-box');

    if (deepConfVal) deepConfVal.textContent = `${confScore}%`;
    if (deepConfBar) deepConfBar.style.width = `${confScore}%`;
    if (deepSilly) deepSilly.textContent = `${state.practice.errors.sillyMistake} logged`;
    if (deepConcept) deepConcept.textContent = `${state.practice.errors.conceptGap} logged`;
    if (deepGuess) deepGuess.textContent = `${state.practice.errors.guess} logged`;

    if (recoBox) {
      let recoText = '';
      if (isPassed) {
        recoText = `<strong>Examiner Insight:</strong> Exceptional performance! You scored ${testScore}/10 under strict timed simulation with zero hints. Your confidence reached ${confScore}%. Review the high-yield flashcards in Stage 5 for last-minute formula retention.`;
      } else {
        recoText = `<strong>Examiner Insight:</strong> You scored ${testScore}/10. You encountered ${state.practice.errors.conceptGap} concept gaps during practice. We recommend reinforcing key definitions in Stage 5 Recall flashcards before your final exam paper.`;
      }
      recoBox.innerHTML = recoText;
    }

    // Check if this is Sprint 3 (Soft lock on Proof of Learning & Recall)
    const isSprint3 = (state.monetization.currentSprintNumber === 3);
    const hasUnlimited = (state.monetization.activeTier === 'monthly' || state.monetization.activeTier === 'board-pass') &&
      (!state.monetization.tierExpiry || Date.now() < state.monetization.tierExpiry);
    const isSprint3Locked = isSprint3 && !state.monetization.sprint3Unlocked && !hasUnlimited;

    const lockedOverlay = document.getElementById('pol-locked-overlay');
    const btnRecallTop = document.getElementById('btn-proceed-recall-top');
    const btnRecallBtm = document.getElementById('btn-proceed-recall-btm');

    if (isSprint3Locked) {
      if (lockedOverlay) lockedOverlay.style.display = 'flex';
      if (btnRecallTop) {
        btnRecallTop.innerHTML = '🔒 Unlock Recall Notes (₹49) →';
      }
      if (btnRecallBtm) {
        btnRecallBtm.innerHTML = '🔒 Unlock Stage 5: Recall (Notes &amp; Cards) →';
      }
      state.monetization.paywallSeen = 'soft_sprint3';

      // Auto-open Paywall A modal after a brief 1.2s delay for maximum desire
      setTimeout(() => {
        openSoftPaywallModal();
      }, 1200);
    } else {
      if (lockedOverlay) lockedOverlay.style.display = 'none';
      if (btnRecallTop) {
        btnRecallTop.innerHTML = 'Proceed to Stage 5: Recall (Flashcards) →';
      }
      if (btnRecallBtm) {
        btnRecallBtm.innerHTML = 'Proceed to Stage 5: Recall (Flashcards &amp; Notes) →';
      }
    }

    // 3. Silent Google Form Logging of Completed Sprint
    if (window.BUDE_LOGGER && window.BUDE_LOGGER.silentLog) {
      window.BUDE_LOGGER.silentLog({
        name: studentName,
        subject: subject,
        chapter: chapter,
        timeBudget: timeBudget,
        parentPhone: state.student.parentPhone,
        calibrationLevel: diagLevel,
        testScore: testScore,
        confidenceScore: confScore,
        tier: state.monetization.activeTier,
        sprint_number: state.monetization.currentSprintNumber,
        signup_completed: !!state.auth.signedIn,
        paywall_seen: isSprint3Locked ? 'soft_sprint3' : state.monetization.paywallSeen,
        payment_made: '₹0'
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function copyProofCardSummary() {
    const isSprint3 = (state.monetization.currentSprintNumber === 3);
    const hasUnlimited = (state.monetization.activeTier === 'monthly' || state.monetization.activeTier === 'board-pass') &&
      (!state.monetization.tierExpiry || Date.now() < state.monetization.tierExpiry);
    const isSprint3Locked = isSprint3 && !state.monetization.sprint3Unlocked && !hasUnlimited;

    if (isSprint3Locked) {
      alert('Your Proof of Learning card is locked for Sprint 3. Unlock it now with the Per-Sprint or Monthly Pack!');
      openSoftPaywallModal();
      return;
    }

    const text = `🎓 BUD-E PROOF OF LEARNING
Student: ${state.student.name || 'Class 12 Student'}
Topic: ${state.student.subject} - ${state.student.chapter}
Time Budget: ${state.student.timeBudget}
Test Score: ${state.test.score}/10 ${state.test.passed ? '(CAN SOLVE ✓)' : ''}
Final Confidence: ${state.practice.confidenceMeter}%
Diagnostic Level: ${state.calibration.level}
Sprint Verified by BUD-E (Build · Understand · Drill · Evaluate)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Proof of Learning summary copied to clipboard!');
      });
    } else {
      alert(text);
    }
  }

  /**
   * ==========================================
   * STAGE 5: RECALL LOGIC (FLASHCARDS & NOTES)
   * ==========================================
   */
  function proceedToRecall() {
    const isSprint3 = (state.monetization.currentSprintNumber === 3);
    const hasUnlimited = (state.monetization.activeTier === 'monthly' || state.monetization.activeTier === 'board-pass') &&
      (!state.monetization.tierExpiry || Date.now() < state.monetization.tierExpiry);
    const isSprint3Locked = isSprint3 && !state.monetization.sprint3Unlocked && !hasUnlimited;

    if (isSprint3Locked) {
      openSoftPaywallModal();
      return;
    }

    console.log('[BUD-E] Launching Stage 5: Recall');
    updateStepper(5);

    // Hide Result wrapper, show Recall wrapper
    const resultWrapper = document.getElementById('stage-result-wrapper');
    const recallWrapper = document.getElementById('stage-recall-wrapper');
    if (resultWrapper) resultWrapper.style.display = 'none';
    if (recallWrapper) recallWrapper.style.display = 'block';

    const subject = state.student.subject || 'Physics';
    const chapter = state.student.chapter || 'Electric Charges and Fields';

    const headingEl = document.getElementById('recall-heading');
    if (headingEl) headingEl.textContent = `${chapter} — High-Yield Flashcards & Key Notes`;

    // Retrieve study material for this chapter from window.BUDE_SHORT_NOTES
    let studyMaterial = null;
    if (window.BUDE_SHORT_NOTES && window.BUDE_SHORT_NOTES[subject] && window.BUDE_SHORT_NOTES[subject][chapter]) {
      studyMaterial = window.BUDE_SHORT_NOTES[subject][chapter];
    }

    // Explicit fallback mandated in master prompt:
    // "for the chapters for which the short notes are not given in the prompt, use the short notes for the chapter electric charges and fields as placeholders."
    if (!studyMaterial) {
      console.info(`[BUD-E Recall] Using Electric Charges and Fields placeholder notes for ${subject} -> ${chapter}`);
      if (window.BUDE_SHORT_NOTES && window.BUDE_SHORT_NOTES["Physics"]) {
        studyMaterial = window.BUDE_SHORT_NOTES["Physics"]["Electric Charges and Fields"];
      }
    }

    // 1. Render Flashcards with 400ms rotateY flip
    const fcGrid = document.getElementById('flashcards-grid');
    if (fcGrid && studyMaterial && studyMaterial.flashcards) {
      fcGrid.innerHTML = '';
      studyMaterial.flashcards.forEach((card, idx) => {
        const wrap = document.createElement('div');
        wrap.className = 'flashcard-wrapper';

        wrap.innerHTML = `
          <div class="flashcard" id="fc-card-${idx}" onclick="this.classList.toggle('flipped')">
            <div class="flashcard-face flashcard-front">
              <span class="text-soft" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">FLASHCARD ${idx + 1}</span>
              <p style="font-size: 1.05rem; font-weight: 700; color: var(--color-ink);">${renderFormulas(card.front)}</p>
              <span class="text-soft" style="font-size: 0.75rem; margin-top: 1rem; color: var(--color-brand-indigo);">Tap to Flip ↻</span>
            </div>
            <div class="flashcard-face flashcard-back">
              <span class="text-soft" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; color: var(--color-brand-indigo);">ANSWER / FORMULA</span>
              <p style="font-size: 1rem; font-weight: 600; color: var(--color-ink);">${renderFormulas(card.back)}</p>
              <span class="text-soft" style="font-size: 0.75rem; margin-top: 1rem;">Tap to Flip ↺</span>
            </div>
          </div>
        `;
        fcGrid.appendChild(wrap);
      });

      typesetMath(fcGrid);
    }

    // 2. Render Short Notes
    const notesContainer = document.getElementById('short-notes-content');
    if (notesContainer && studyMaterial && studyMaterial.shortNotes) {
      notesContainer.innerHTML = '';
      studyMaterial.shortNotes.forEach(section => {
        const secDiv = document.createElement('div');
        secDiv.className = 'card';
        secDiv.style.backgroundColor = 'var(--color-paper-alt)';
        secDiv.style.padding = '1.25rem 1.5rem';

        let bulletsHtml = section.content.map(pt => `<li style="margin-bottom: 0.4rem; color: var(--color-ink);">${renderFormulas(pt)}</li>`).join('');

        secDiv.innerHTML = `
          <h5 style="font-size: 1.05rem; font-weight: 800; color: var(--color-brand-indigo); margin-bottom: 0.75rem;">${section.sectionTitle}</h5>
          <ul style="padding-left: 1.25rem; font-size: 0.95rem; line-height: 1.6;">
            ${bulletsHtml}
          </ul>
        `;
        notesContainer.appendChild(secDiv);
      });

      typesetMath(notesContainer);
    }

    // 3. Render High-Frequency Exam Tips
    const tipsContainer = document.getElementById('exam-tips-container');
    if (tipsContainer && studyMaterial && studyMaterial.examTips) {
      let tipsHtml = studyMaterial.examTips.map(tip => `<li style="margin-bottom: 0.5rem; color: #78350F;">${renderFormulas(tip)}</li>`).join('');
      tipsContainer.innerHTML = `
        <ul style="padding-left: 1.25rem; font-size: 0.95rem; line-height: 1.6;">
          ${tipsHtml}
        </ul>
      `;

      typesetMath(tipsContainer);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function returnToHome(skipConfirm = false) {
    if (skipConfirm || confirm('Finish this learning sprint and return to the BUD-E homepage?')) {
      resetSprintSession();
      const homeView = document.getElementById('view-homepage');
      const sprintContainer = document.getElementById('view-sprint-container');
      if (homeView) homeView.style.display = 'block';
      if (sprintContainer) sprintContainer.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Helper: Typeset all LaTeX formulas in a DOM container using KaTeX auto-render
   */
  function typesetMath(element) {
    if (!element) return;
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(element, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('typesetMath error:', err);
      }
    }
  }

  /**
   * Comprehensive LaTeX & Mathematical Symbol Renderer
   * Directly compiles $...$ and $$...$$ into KaTeX HTML strings if KaTeX is loaded,
   * with a robust Unicode mathematical engine fallback if KaTeX is loading or offline.
   */
  function renderFormulas(text) {
    if (!text) return '';
    let str = String(text);

    // Normalize excessive escaping: \\\\ -> \\, \_ -> _
    str = str.replace(/\\\\/g, '\\').replace(/\\([_#&])/g, '$1');

    // 1. If KaTeX is ready, directly convert inline and block math into KaTeX HTML
    if (window.katex && typeof window.katex.renderToString === 'function') {
      try {
        // Block math: $$...$$ or \[...\]
        str = str.replace(/\$\$([\s\S]+?)\$\$/g, (match, expr) => {
          try {
            return window.katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
          } catch (e) { return match; }
        });
        str = str.replace(/\\\[([\s\S]+?)\\\]/g, (match, expr) => {
          try {
            return window.katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
          } catch (e) { return match; }
        });

        // Inline math: $...$ or \(...\)
        str = str.replace(/\$([^\$\r\n]+?)\$/g, (match, expr) => {
          try {
            return window.katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
          } catch (e) { return match; }
        });
        str = str.replace(/\\\(([\s\S]+?)\\\)/g, (match, expr) => {
          try {
            return window.katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
          } catch (e) { return match; }
        });

        return str;
      } catch (e) {
        // Fall through to Unicode engine
      }
    }

    // 2. High-fidelity Unicode mathematical fallback (runs if KaTeX is offline/loading)
    str = str.replace(/\$([^\$\r\n]+?)\$/g, (match, math) => {
      let m = math.trim();
      m = m.replace(/\^\\circ|\^\{\\circ\}|\^circ/g, '°');
      m = m.replace(/\\tau/g, 'τ')
           .replace(/\\theta/g, 'θ')
           .replace(/\\lambda/g, 'λ')
           .replace(/\\pi/g, 'π')
           .replace(/\\sigma/g, 'σ')
           .replace(/\\rho/g, 'ρ')
           .replace(/\\eta/g, 'η')
           .replace(/\\nu/g, 'ν')
           .replace(/\\mu/g, 'µ')
           .replace(/\\varepsilon_0|\\epsilon_0/g, 'ε₀')
           .replace(/\\mu_0/g, 'µ₀')
           .replace(/\\approx/g, '≈')
           .replace(/\\propto/g, '∝')
           .replace(/\\times/g, '×')
           .replace(/\\cdot/g, '·')
           .replace(/\\pm/g, '±')
           .replace(/\\neq/g, '≠')
           .replace(/\\le(?:q)?/g, '≤')
           .replace(/\\ge(?:q)?/g, '≥')
           .replace(/\\infty/g, '∞')
           .replace(/\\alpha/g, 'α')
           .replace(/\\beta/g, 'β')
           .replace(/\\gamma/g, 'γ')
           .replace(/\\Delta/g, 'Δ')
           .replace(/\\delta/g, 'δ')
           .replace(/\\omega/g, 'ω')
           .replace(/\\Omega/g, 'Ω')
           .replace(/\\phi/g, 'φ')
           .replace(/\\cap/g, '∩')
           .replace(/\\cup/g, '∪')
           .replace(/\\subset/g, '⊂')
           .replace(/\\mid/g, '|')
           .replace(/\\vert/g, '|')
           .replace(/\\to|\\rightarrow/g, '→')
           .replace(/\\sin/g, 'sin')
           .replace(/\\cos/g, 'cos')
           .replace(/\\tan/g, 'tan')
           .replace(/\\log/g, 'log')
           .replace(/\\ln/g, 'ln')
           .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
           .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
           .replace(/\\vec\{([^}]+)\}/g, '$1⃗')
           .replace(/\\hat\{([^}]+)\}/g, '$1̂')
           .replace(/\\text\{([^}]+)\}/g, '$1');
      // Subscripts and superscripts
      m = m.replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^0/g, '⁰');
      m = m.replace(/_0/g, '₀').replace(/_1/g, '₁').replace(/_2/g, '₂').replace(/_3/g, '₃');
      return m;
    });

    // Clean any bare degree commands
    str = str.replace(/\\circ/g, '°');

    return str;
  }

  /**
   * Sprint Stepper Node Highlighter
   */
  function updateStepper(stepNumber) {
    for (let i = 1; i <= 5; i++) {
      const node = document.getElementById(`step-node-${i}`);
      if (!node) continue;
      node.classList.remove('active', 'completed');
      if (i < stepNumber) {
        node.classList.add('completed');
      } else if (i === stepNumber) {
        node.classList.add('active');
      }
    }
  }

  /**
   * ==========================================
   * PHASE 11: BREAK SYSTEM & ACCOUNTABILITY
   * ==========================================
   */
  // Active Sprint Stopwatch with 45-minute Break Trigger
  function startSprintClock() {
    if (sprintTimerInterval) clearInterval(sprintTimerInterval);
    state.breakTimer.sprintStart = state.breakTimer.sprintStart || Date.now();
    const clockEl = document.getElementById('sprint-clock');

    sprintTimerInterval = setInterval(() => {
      if (state.breakTimer.inBreak) return; // Pause stopwatch during break

      const elapsedSec = Math.floor((Date.now() - state.breakTimer.sprintStart) / 1000);
      const m = Math.floor(elapsedSec / 60);
      const s = elapsedSec % 60;
      if (clockEl) {
        clockEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      // Every 45 minutes (2700 seconds), trigger the break prompt popup
      if (elapsedSec > 0 && elapsedSec % 2700 === 0 && !state.breakTimer.inBreak) {
        promptBreakDialog();
      }
    }, 1000);
  }

  function promptBreakDialog() {
    const modal = document.getElementById('modal-break-prompt');
    if (modal) {
      modal.classList.add('active');
    }
  }

  function declineBreak() {
    const modal = document.getElementById('modal-break-prompt');
    if (modal) {
      modal.classList.remove('active');
    }
    console.log('[BUD-E Break] Student chose to continue studying.');
  }

  function acceptBreak() {
    const promptModal = document.getElementById('modal-break-prompt');
    const activeOverlay = document.getElementById('overlay-break-active');
    if (promptModal) promptModal.classList.remove('active');

    state.breakTimer.inBreak = true;
    breakStartTimestamp = Date.now();
    tenMinWarningSent = false;
    fifteenMinParentAlertSent = false;

    if (activeOverlay) activeOverlay.classList.add('active');

    // Start 15-minute countdown loop (900 seconds)
    startBreakCountdown();
    console.log('[BUD-E Break] 15-minute break started.');
  }

  function startBreakCountdown() {
    if (activeBreakInterval) clearInterval(activeBreakInterval);

    const timerDisplay = document.getElementById('break-timer-display');
    const warningBanner = document.getElementById('break-warning-banner');
    const progressDesc = document.getElementById('break-countdown-progress');

    // 15 minutes total = 900 seconds
    const totalBreakSec = 15 * 60;

    activeBreakInterval = setInterval(() => {
      if (!breakStartTimestamp) return;

      const elapsedSec = Math.floor((Date.now() - breakStartTimestamp) / 1000);
      const remainingSec = Math.max(0, totalBreakSec - elapsedSec);

      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      if (timerDisplay) {
        timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      // 10 minutes elapsed (600 seconds) without return: Gentle reminder warning
      if (elapsedSec >= 600 && !tenMinWarningSent) {
        tenMinWarningSent = true;
        if (warningBanner) {
          warningBanner.style.display = 'block';
          warningBanner.innerHTML = `
            <strong>⚠️ 10-Minute Limit Reached!</strong><br>
            Please return to your studies now. If you do not return within 5 minutes, an accountability notice will be dispatched to your parent's WhatsApp (${state.student.parentPhone || 'registered number'}).
          `;
        }
        if (progressDesc) {
          progressDesc.textContent = 'Warning: Return within 5 minutes to avoid parent alert';
          progressDesc.style.color = 'var(--color-warning)';
        }
        console.warn('[BUD-E Break] 10-minute warning active: Parent notification pending.');
      }

      // 15 minutes elapsed (900 seconds) without return: WhatsApp message to saved parent number
      if (elapsedSec >= 900 && !fifteenMinParentAlertSent) {
        fifteenMinParentAlertSent = true;
        triggerParentWhatsAppAlert();
        if (warningBanner) {
          warningBanner.style.backgroundColor = '#FEE2E2';
          warningBanner.style.borderColor = '#FECACA';
          warningBanner.style.color = '#991B1B';
          warningBanner.innerHTML = `
            <strong>🚨 Parent Alert Dispatched</strong><br>
            A complaint message has been dispatched to WhatsApp (${state.student.parentPhone}): <em>"Your ward has left their learning sprint in between."</em>
          `;
        }
      }
    }, 1000);
  }

  function resumeFromBreak() {
    if (activeBreakInterval) clearInterval(activeBreakInterval);
    const activeOverlay = document.getElementById('overlay-break-active');
    if (activeOverlay) activeOverlay.classList.remove('active');

    state.breakTimer.inBreak = false;
    breakStartTimestamp = null;

    console.log('[BUD-E Break] Student resumed learning sprint.');
  }

  /**
   * Parent WhatsApp Notification Trigger via API / Webhook
   */
  async function triggerParentWhatsAppAlert() {
    const parentPhone = state.student.parentPhone;
    const studentName = state.student.name || 'Your ward';
    const message = `Hello, this is an automated update from BUD-E Study Buddy. Your ward ${studentName} has left their Class 12 board learning sprint in between and has not returned after a 15-minute break.`;

    console.warn(`[BUD-E Accountability] Dispatching WhatsApp alert to ${parentPhone}: "${message}"`);

    try {
      // Optional serverless endpoint call
      await fetch('/api/notify-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: parentPhone,
          message: message,
          student: studentName
        })
      });
    } catch (e) {
      console.info('[BUD-E Accountability] Client fallback: Parent alert simulated and logged.');
    }
  }

  /**
   * Tab Visibility Resilience (Survives Background Tabs)
   * Uses visibilitychange + Date.now()
   */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Tab regained focus: update all relative clocks instantly
      console.log('[BUD-E Visibility] Tab regained focus. Synchronizing timers via Date.now().');
      if (state.breakTimer.inBreak && breakStartTimestamp) {
        const elapsedSec = Math.floor((Date.now() - breakStartTimestamp) / 1000);
        const totalBreakSec = 15 * 60;
        const remainingSec = Math.max(0, totalBreakSec - elapsedSec);
        const timerDisplay = document.getElementById('break-timer-display');
        if (timerDisplay) {
          const m = Math.floor(remainingSec / 60);
          const s = remainingSec % 60;
          timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        if (elapsedSec >= 600 && !tenMinWarningSent) {
          startBreakCountdown();
        }
        if (elapsedSec >= 900 && !fifteenMinParentAlertSent) {
          fifteenMinParentAlertSent = true;
          triggerParentWhatsAppAlert();
        }
      }
    }
  });


  /**
   * ==========================================
   * MONETIZATION, AUTH & RAZORPAY CONTROLLERS
   * ==========================================
   */
  function loadPersistedMonetization() {
    try {
      const authSaved = localStorage.getItem('bude_user_auth');
      if (authSaved) {
        state.auth = Object.assign(state.auth, JSON.parse(authSaved));
      }
      const countSaved = localStorage.getItem('bude_sprint_count');
      if (countSaved !== null) {
        state.monetization.sprintCount = parseInt(countSaved, 10) || 0;
      }
      const tierSaved = localStorage.getItem('bude_active_tier');
      if (tierSaved) {
        state.monetization.activeTier = tierSaved;
      }
      const expirySaved = localStorage.getItem('bude_tier_expiry');
      if (expirySaved) {
        state.monetization.tierExpiry = parseInt(expirySaved, 10) || null;
      }
      const paidSprintsSaved = localStorage.getItem('bude_paid_sprints');
      if (paidSprintsSaved !== null) {
        state.monetization.paidSprintsRemaining = parseInt(paidSprintsSaved, 10) || 0;
      }
      const s3Saved = localStorage.getItem('bude_sprint3_unlocked');
      if (s3Saved !== null) {
        state.monetization.sprint3Unlocked = (s3Saved === 'true');
      }

      // Check if time-based subscription is expired
      if (state.monetization.tierExpiry && Date.now() > state.monetization.tierExpiry) {
        state.monetization.activeTier = 'free';
        state.monetization.tierExpiry = null;
        localStorage.removeItem('bude_tier_expiry');
        localStorage.setItem('bude_active_tier', 'free');
      }
    } catch (e) {
      console.warn('[BUD-E Monetization] Could not load persisted state:', e);
    }
    updateNavUserBadge();
  }

  function saveMonetizationState() {
    try {
      localStorage.setItem('bude_user_auth', JSON.stringify(state.auth));
      localStorage.setItem('bude_sprint_count', String(state.monetization.sprintCount));
      localStorage.setItem('bude_active_tier', state.monetization.activeTier);
      if (state.monetization.tierExpiry) {
        localStorage.setItem('bude_tier_expiry', String(state.monetization.tierExpiry));
      } else {
        localStorage.removeItem('bude_tier_expiry');
      }
      localStorage.setItem('bude_paid_sprints', String(state.monetization.paidSprintsRemaining));
      localStorage.setItem('bude_sprint3_unlocked', String(state.monetization.sprint3Unlocked));
    } catch (e) {
      console.warn('[BUD-E Monetization] Could not save state:', e);
    }
    updateNavUserBadge();
  }

  function updateNavUserBadge() {
    const badgeElements = [
      document.getElementById('nav-user-badge'),
      document.getElementById('nav-mobile-user-badge')
    ].filter(Boolean);

    if (badgeElements.length === 0) return;

    let html = '';
    let title = '';

    if (state.monetization.activeTier === 'monthly') {
      html = `✨ Monthly Pack (Active)`;
      title = 'Unlimited sprints active for 30 days';
    } else if (state.monetization.activeTier === 'board-pass') {
      html = `🏆 Board Pass (Active)`;
      title = 'Unlimited sprints active until board exams end';
    } else if (state.monetization.paidSprintsRemaining > 0) {
      html = `⚡ ${state.monetization.paidSprintsRemaining} Sprint${state.monetization.paidSprintsRemaining > 1 ? 's' : ''} Left`;
      title = 'Prepaid sprint credits available';
    } else if (state.auth.signedIn) {
      const nextSprint = state.monetization.sprintCount + 1;
      const tierText = nextSprint === 2 ? 'Free Sprint 2' : (nextSprint === 3 ? 'Trial Sprint 3' : 'Plans');
      html = `👤 ${state.auth.name || 'Student'} · ${tierText}`;
      title = 'Signed in account status';
    } else {
      const nextSprint = state.monetization.sprintCount + 1;
      html = nextSprint === 1 ? '🎁 Sprint 1: Free' : 'Sign In';
      title = 'Sign in or select a plan';
    }

    badgeElements.forEach(el => {
      el.innerHTML = html;
      el.title = title;
    });
  }

  function handleNavUserClick() {
    if (!state.auth.signedIn && state.monetization.activeTier === 'free' && state.monetization.sprintCount >= 1) {
      openAuthModal();
    } else {
      openPricingModal();
    }
  }

  function toggleMobileNav() {
    const dropdown = document.getElementById('nav-mobile-dropdown');
    const toggleBtn = document.getElementById('btn-mobile-nav-toggle');
    if (!dropdown) return;
    const isOpen = dropdown.classList.contains('active');
    if (isOpen) {
      closeMobileNav();
    } else {
      dropdown.classList.add('active');
      dropdown.setAttribute('aria-hidden', 'false');
      if (toggleBtn) toggleBtn.classList.add('active');
    }
  }

  function closeMobileNav() {
    const dropdown = document.getElementById('nav-mobile-dropdown');
    const toggleBtn = document.getElementById('btn-mobile-nav-toggle');
    if (dropdown) {
      dropdown.classList.remove('active');
      dropdown.setAttribute('aria-hidden', 'true');
    }
    if (toggleBtn) {
      toggleBtn.classList.remove('active');
    }
  }

  function openAuthModal() {
    const modal = document.getElementById('modal-auth');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      const phoneInput = document.getElementById('auth-phone');
      if (phoneInput) phoneInput.focus();
    }
  }

  function closeAuthModal() {
    const modal = document.getElementById('modal-auth');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function signInWithGoogle() {
    const defaultEmail = 'student.' + Math.floor(1000 + Math.random() * 9000) + '@gmail.com';
    const email = prompt('Enter your Google Account email for BUD-E sign-in:', defaultEmail) || defaultEmail;
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    state.auth.signedIn = true;
    state.auth.email = email;
    state.auth.name = name;
    state.auth.method = 'google';
    saveMonetizationState();

    if (window.BUDE_LOGGER && window.BUDE_LOGGER.silentLog) {
      window.BUDE_LOGGER.silentLog({
        name: name,
        tier: state.monetization.activeTier,
        sprint_number: state.monetization.sprintCount + 1,
        signup_completed: true,
        paywall_seen: state.monetization.paywallSeen,
        payment_made: '₹0'
      });
    }

    closeAuthModal();
    alert(`Signed in as ${name} (${email})! Sprint 2 is now unlocked.`);
    showOnboardingModal();
  }

  function signInWithPhone(e) {
    if (e) e.preventDefault();
    const phoneInput = document.getElementById('auth-phone');
    if (!phoneInput) return;
    const phone = phoneInput.value.trim();
    if (!phone || phone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    const defaultName = 'Student ' + phone.slice(-4);
    state.auth.signedIn = true;
    state.auth.phone = phone;
    state.auth.name = defaultName;
    state.auth.method = 'phone';
    saveMonetizationState();

    if (window.BUDE_LOGGER && window.BUDE_LOGGER.silentLog) {
      window.BUDE_LOGGER.silentLog({
        name: defaultName,
        parentPhone: phone,
        tier: state.monetization.activeTier,
        sprint_number: state.monetization.sprintCount + 1,
        signup_completed: true,
        paywall_seen: state.monetization.paywallSeen,
        payment_made: '₹0'
      });
    }

    closeAuthModal();
    alert(`Verified mobile +91-${phone}! Sprint 2 is now unlocked.`);
    showOnboardingModal();
  }

  function openSoftPaywallModal() {
    const modal = document.getElementById('modal-paywall-soft');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      state.monetization.paywallSeen = 'soft_sprint3';
    }
  }

  function closeSoftPaywallModal() {
    const modal = document.getElementById('modal-paywall-soft');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function openHardPaywallModal() {
    const modal = document.getElementById('modal-paywall-hard');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      state.monetization.paywallSeen = 'hard_sprint4';
    }
  }

  function closeHardPaywallModal() {
    const modal = document.getElementById('modal-paywall-hard');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function openPricingModal() {
    const modal = document.getElementById('modal-pricing');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closePricingModal() {
    const modal = document.getElementById('modal-pricing');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function closePaymentSimModal() {
    const modal = document.getElementById('modal-payment-sim');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  const PAYMENT_PLANS = {
    'per-sprint': {
      tier: 'per-sprint',
      amount: 4900,
      priceDisplay: '₹49',
      title: 'Per Sprint Pass'
    },
    'monthly': {
      tier: 'monthly',
      amount: 19900,
      priceDisplay: '₹199',
      title: 'Monthly Pack (Unlimited 30 Days)'
    },
    'board-pass': {
      tier: 'board-pass',
      amount: 49900,
      priceDisplay: '₹499',
      title: 'Board Exam Pass (~6 Months)'
    }
  };

  function initiateRazorpayPayment(planType) {
    const plan = PAYMENT_PLANS[planType];
    if (!plan) return;

    state.monetization.activePayment = plan;

    // Check for Razorpay merchant key in config
    const key = (window.BUDE_CONFIG && window.BUDE_CONFIG.razorpayKey) ? window.BUDE_CONFIG.razorpayKey.trim() : '';

    if (key && window.Razorpay) {
      try {
        const options = {
          key: key,
          amount: plan.amount,
          currency: 'INR',
          name: 'BUD-E Study Buddy',
          description: plan.title,
          image: 'assets/logo.png',
          prefill: {
            name: state.student.name || state.auth.name || 'Class 12 Student',
            contact: state.student.parentPhone || state.auth.phone || '',
            email: state.auth.email || ''
          },
          theme: {
            color: '#3730D9'
          },
          handler: function(response) {
            handlePaymentSuccess(planType, plan.priceDisplay, response.razorpay_payment_id || ('rzp_' + Date.now()));
          },
          modal: {
            ondismiss: function() {
              console.log('[BUD-E Razorpay] Checkout dismissed by student.');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      } catch (err) {
        console.warn('[BUD-E Razorpay] Checkout exception, launching test fallback:', err);
      }
    }

    // Interactive fallback simulator for preview & testing
    showPaymentSimulationModal(plan);
  }

  function showPaymentSimulationModal(plan) {
    const simModal = document.getElementById('modal-payment-sim');
    const titleEl = document.getElementById('sim-plan-title');
    const amtEl = document.getElementById('sim-plan-amount');

    if (titleEl) titleEl.textContent = plan.title;
    if (amtEl) amtEl.textContent = plan.priceDisplay;

    if (simModal) {
      simModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function confirmSimulatedPayment(method) {
    closePaymentSimModal();
    const plan = state.monetization.activePayment || PAYMENT_PLANS['monthly'];
    const fakePaymentId = 'sim_' + (method || 'test') + '_' + Math.random().toString(36).substr(2, 9);
    handlePaymentSuccess(plan.tier, plan.priceDisplay, fakePaymentId);
  }

  function handlePaymentSuccess(planType, priceDisplay, paymentId) {
    console.log(`[BUD-E Monetization] Payment success for ${planType} (${priceDisplay}). ID: ${paymentId}`);

    // Update state based on purchased tier
    if (planType === 'per-sprint') {
      state.monetization.activeTier = 'per-sprint';
      if (state.monetization.currentSprintNumber === 3) {
        state.monetization.sprint3Unlocked = true;
      } else {
        state.monetization.paidSprintsRemaining += 1;
      }
    } else if (planType === 'monthly') {
      state.monetization.activeTier = 'monthly';
      state.monetization.tierExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
      state.monetization.sprint3Unlocked = true;
    } else if (planType === 'board-pass') {
      state.monetization.activeTier = 'board-pass';
      state.monetization.tierExpiry = Date.now() + 180 * 24 * 60 * 60 * 1000;
      state.monetization.sprint3Unlocked = true;
    }

    saveMonetizationState();

    // Unlock Stage 4 Result View if currently on result screen
    const lockedOverlay = document.getElementById('pol-locked-overlay');
    const btnRecallTop = document.getElementById('btn-proceed-recall-top');
    const btnRecallBtm = document.getElementById('btn-proceed-recall-btm');

    if (lockedOverlay) lockedOverlay.style.display = 'none';
    if (btnRecallTop) {
      btnRecallTop.innerHTML = 'Proceed to Stage 5: Recall (Flashcards) →';
      btnRecallTop.classList.remove('btn-warning');
    }
    if (btnRecallBtm) {
      btnRecallBtm.innerHTML = 'Proceed to Stage 5: Recall (Flashcards &amp; Notes) →';
      btnRecallBtm.classList.remove('btn-warning');
    }

    // Close paywall modals
    closeSoftPaywallModal();
    closeHardPaywallModal();
    closePricingModal();

    // Log payment to Google Sheets
    if (window.BUDE_LOGGER && window.BUDE_LOGGER.silentLog) {
      window.BUDE_LOGGER.silentLog({
        name: state.student.name || state.auth.name || 'Student',
        subject: state.student.subject || '',
        chapter: state.student.chapter || '',
        parentPhone: state.student.parentPhone || state.auth.phone || '',
        tier: state.monetization.activeTier,
        sprint_number: state.monetization.currentSprintNumber,
        signup_completed: !!state.auth.signedIn,
        paywall_seen: state.monetization.paywallSeen,
        payment_made: priceDisplay
      });
    }

    alert(`🎉 Payment Successful!\nPlan: ${priceDisplay} activated.\nYour full access is unlocked!`);
  }

  // Developer / Tester convenience method to jump to any sprint state
  function resetMonetizationTest(sprintNumber) {
    if (sprintNumber === 1) {
      state.monetization.sprintCount = 0;
      state.auth.signedIn = false;
      state.monetization.activeTier = 'free';
      state.monetization.sprint3Unlocked = false;
      state.monetization.paidSprintsRemaining = 0;
    } else if (sprintNumber === 2) {
      state.monetization.sprintCount = 1;
      state.auth.signedIn = false;
      state.monetization.activeTier = 'free';
      state.monetization.sprint3Unlocked = false;
      state.monetization.paidSprintsRemaining = 0;
    } else if (sprintNumber === 3) {
      state.monetization.sprintCount = 2;
      state.auth.signedIn = true;
      state.auth.name = 'Test Student';
      state.monetization.activeTier = 'trial';
      state.monetization.sprint3Unlocked = false;
      state.monetization.paidSprintsRemaining = 0;
    } else if (sprintNumber >= 4) {
      state.monetization.sprintCount = 3;
      state.auth.signedIn = true;
      state.auth.name = 'Test Student';
      state.monetization.activeTier = 'free';
      state.monetization.sprint3Unlocked = false;
      state.monetization.paidSprintsRemaining = 0;
    }
    saveMonetizationState();
    console.log(`[BUD-E Monetization] Set test sprint to #${sprintNumber}:`, state.monetization);
    alert(`BUD-E reset to Sprint #${sprintNumber} mode!`);
  }

  /**
   * ==========================================
   * STUDENT DASHBOARD & SPRINT VAULT CONTROLLER
   * ==========================================
   */
  function getSprintHistory() {
    try {
      return JSON.parse(localStorage.getItem('bude_student_sprint_history') || '[]');
    } catch (e) {
      console.warn('[BUD-E Dashboard] getSprintHistory error:', e);
      return [];
    }
  }

  function recordCompletedSprint() {
    const studentName = state.student.name || state.auth.name || 'Class 12 Student';
    const subject = state.student.subject || 'Physics';
    const chapter = state.student.chapter || 'Electric Charges and Fields';
    const timeBudget = state.student.timeBudget || '2hrs';
    const testScore = state.test.score || 0;
    const testPassed = (testScore >= 7);
    const confidenceScore = state.practice.confidenceMeter || 50;
    const calibrationLevel = state.calibration.level || 'Intermediate';
    const calibrationScore = state.calibration.score || 0;
    const errors = { ...state.practice.errors };

    const history = getSprintHistory();
    // Check if an entry for this exact chapter exists from recent 2 hours
    const existingIndex = history.findIndex(s => s.subject === subject && s.chapter === chapter && Math.abs(Date.now() - s.timestamp) < 7200000);

    const record = {
      id: 'sprint_' + Date.now(),
      timestamp: Date.now(),
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      studentName: studentName,
      subject: subject,
      chapter: chapter,
      timeBudget: timeBudget,
      testScore: testScore,
      testPassed: testPassed,
      confidenceScore: confidenceScore,
      calibrationLevel: calibrationLevel,
      calibrationScore: calibrationScore,
      errors: errors
    };

    if (existingIndex >= 0) {
      history[existingIndex] = record;
    } else {
      history.unshift(record); // newest first
    }

    try {
      localStorage.setItem('bude_student_sprint_history', JSON.stringify(history));
      console.log('[BUD-E Dashboard] Sprint recorded successfully:', record);
    } catch (e) {
      console.warn('[BUD-E Dashboard] Could not save sprint record:', e);
    }
  }

  function openStudentDashboard() {
    const modal = document.getElementById('modal-dashboard');
    if (!modal) return;

    const history = getSprintHistory();
    const studentName = state.auth.name || state.student.name || 'Student';

    // Populate profile banner
    const nameEl = document.getElementById('dash-student-name');
    const avatarEl = document.getElementById('dash-avatar');
    const tierEl = document.getElementById('dash-tier-status');

    if (nameEl) nameEl.textContent = studentName;
    if (avatarEl) avatarEl.textContent = (studentName.charAt(0) || 'S').toUpperCase();
    if (tierEl) {
      const tier = state.monetization.activeTier;
      tierEl.textContent = tier === 'monthly' ? '✨ Monthly Pack (Unlimited Access)' : (tier === 'board-pass' ? '🏆 Board Exam Pass (All Subjects)' : `Sprint #${state.monetization.sprintCount + 1} · Free Tier`);
    }

    // Calculate aggregate metrics
    const totalSprints = history.length;
    const masteredCount = history.filter(s => s.testPassed || s.testScore >= 7).length;
    let avgConf = 50;
    if (totalSprints > 0) {
      const totalConf = history.reduce((acc, curr) => acc + (curr.confidenceScore || 50), 0);
      avgConf = Math.round(totalConf / totalSprints);
    }
    const totalHours = history.length * 2; // ~2 hours per sprint

    const statTotal = document.getElementById('dash-stat-total');
    const statMastered = document.getElementById('dash-stat-mastered');
    const statConf = document.getElementById('dash-stat-conf');
    const statHours = document.getElementById('dash-stat-hours');
    const historyCount = document.getElementById('dash-history-count');

    if (statTotal) statTotal.textContent = totalSprints;
    if (statMastered) statMastered.textContent = masteredCount;
    if (statConf) statConf.textContent = `${avgConf}%`;
    if (statHours) statHours.textContent = `${totalHours}h`;
    if (historyCount) historyCount.textContent = `${totalSprints} Sprint${totalSprints === 1 ? '' : 's'}`;

    // Render cards list
    const container = document.getElementById('dash-sprints-container');
    if (container) {
      container.innerHTML = '';

      if (totalSprints === 0) {
        container.innerHTML = `
          <div class="dashboard-empty-state">
            <div class="dashboard-empty-icon">🚀</div>
            <h4 style="font-size: 1.25rem; font-weight: 800; color: var(--color-ink); margin-bottom: 0.5rem;">No Sprints Completed Yet</h4>
            <p class="text-soft" style="max-width: 480px; margin: 0 auto 1.5rem auto; font-size: 0.92rem; line-height: 1.6;">
              Start your first active learning sprint to calibrate your baseline, solve board exam questions, and automatically build your personal revision vault.
            </p>
            <button class="btn btn-primary" onclick="BUDE_APP.closeStudentDashboard(); BUDE_APP.openOnboarding();">
              Start Your First Sprint →
            </button>
          </div>
        `;
      } else {
        history.forEach(sprint => {
          const isPassed = sprint.testPassed || sprint.testScore >= 7;
          const card = document.createElement('div');
          card.className = 'dashboard-sprint-card';

          const badgeColor = isPassed ? '#16A34A' : '#D97706';
          const badgeBg = isPassed ? '#DCFCE7' : '#FEF3C7';
          const badgeBorder = isPassed ? '#86EFAC' : '#FDE68A';
          const badgeText = isPassed ? `CAN SOLVE · ${sprint.testScore}/10` : `NEEDS 1 MORE DRILL · ${sprint.testScore}/10`;

          card.innerHTML = `
            <div class="dashboard-card-main">
              <div class="dashboard-card-meta">
                <span class="pill pill-brand" style="font-size: 0.72rem; padding: 0.2rem 0.65rem;">${sprint.subject}</span>
                <span class="text-soft" style="font-size: 0.8rem;">📅 ${sprint.date}</span>
                <span class="text-soft" style="font-size: 0.8rem;">⏱️ ${sprint.timeBudget || '2hrs'} Sprint</span>
              </div>
              <h4 class="dashboard-card-title">${sprint.chapter}</h4>
              <div class="dashboard-card-sub">
                <span>Diagnostic Band: <strong>${sprint.calibrationLevel || 'Intermediate'}</strong></span>
                <span>Final Confidence: <strong>${sprint.confidenceScore || 50}%</strong></span>
              </div>
              <div class="dashboard-card-badges">
                <span class="pill" style="background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-size: 0.75rem; font-weight: 800;">
                  ${badgeText}
                </span>
              </div>
            </div>
            <div class="dashboard-card-actions">
              <button type="button" class="btn btn-secondary btn-sm" onclick="BUDE_APP.openQuickRecall('${sprint.subject}', '${sprint.chapter.replace(/'/g, "\\'")}')" style="font-weight: 700;">
                📖 Review Notes &amp; Flashcards
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="BUDE_APP.viewPastProofOfLearning('${sprint.id}')" style="font-weight: 700;">
                🎓 Proof of Learning
              </button>
            </div>
          `;
          container.appendChild(card);
        });
      }
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeStudentDashboard() {
    const modal = document.getElementById('modal-dashboard');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /**
   * Quick Recall Reader Controller (Vault Flashcards & Notes)
   */
  let currentRecallSubject = 'Physics';
  let currentRecallChapter = 'Electric Charges and Fields';
  let activeRecallTab = 'flashcards';

  function openQuickRecall(subject, chapter, tab = 'flashcards') {
    currentRecallSubject = subject;
    currentRecallChapter = chapter;
    activeRecallTab = tab;

    const modal = document.getElementById('modal-quick-recall');
    const titleEl = document.getElementById('qr-modal-title');
    if (!modal) return;

    if (titleEl) {
      titleEl.textContent = `${subject}: ${chapter}`;
    }

    switchQuickRecallTab(tab);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickRecall() {
    const modal = document.getElementById('modal-quick-recall');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function switchQuickRecallTab(tab) {
    activeRecallTab = tab;

    // Tab buttons styling
    const tabFc = document.getElementById('qr-tab-fc');
    const tabNotes = document.getElementById('qr-tab-notes');
    const tabTips = document.getElementById('qr-tab-tips');

    [tabFc, tabNotes, tabTips].forEach(b => {
      if (b) {
        b.className = 'btn btn-secondary btn-sm';
        b.style.borderRadius = '20px';
      }
    });

    if (tab === 'flashcards' && tabFc) tabFc.className = 'btn btn-primary btn-sm';
    if (tab === 'notes' && tabNotes) tabNotes.className = 'btn btn-primary btn-sm';
    if (tab === 'tips' && tabTips) tabTips.className = 'btn btn-primary btn-sm';

    // Retrieve study material
    let studyMaterial = null;
    if (window.BUDE_SHORT_NOTES && window.BUDE_SHORT_NOTES[currentRecallSubject] && window.BUDE_SHORT_NOTES[currentRecallSubject][currentRecallChapter]) {
      studyMaterial = window.BUDE_SHORT_NOTES[currentRecallSubject][currentRecallChapter];
    }
    if (!studyMaterial && window.BUDE_SHORT_NOTES && window.BUDE_SHORT_NOTES["Physics"]) {
      studyMaterial = window.BUDE_SHORT_NOTES["Physics"]["Electric Charges and Fields"];
    }

    const countEl = document.getElementById('qr-fc-count');
    if (countEl && studyMaterial && studyMaterial.flashcards) {
      countEl.textContent = studyMaterial.flashcards.length;
    }

    const contentArea = document.getElementById('qr-content-area');
    if (!contentArea || !studyMaterial) return;
    contentArea.innerHTML = '';

    if (tab === 'flashcards') {
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
      grid.style.gap = '1.25rem';
      grid.style.padding = '0.5rem 0';

      (studyMaterial.flashcards || []).forEach((card, idx) => {
        const wrap = document.createElement('div');
        wrap.className = 'flashcard-wrapper';
        wrap.innerHTML = `
          <div class="flashcard" onclick="this.classList.toggle('flipped')">
            <div class="flashcard-face flashcard-front">
              <span class="text-soft" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">FLASHCARD ${idx + 1}</span>
              <p style="font-size: 1.05rem; font-weight: 700; color: var(--color-ink);">${renderFormulas(card.front)}</p>
              <span class="text-soft" style="font-size: 0.75rem; margin-top: 1rem; color: var(--color-brand-indigo);">Tap to Flip ↻</span>
            </div>
            <div class="flashcard-face flashcard-back">
              <span class="text-soft" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; color: var(--color-brand-indigo);">ANSWER / FORMULA</span>
              <p style="font-size: 0.95rem; font-weight: 600; color: var(--color-ink);">${renderFormulas(card.back)}</p>
              <span class="text-soft" style="font-size: 0.75rem; margin-top: 1rem;">Tap to Flip ↺</span>
            </div>
          </div>
        `;
        grid.appendChild(wrap);
      });
      contentArea.appendChild(grid);
      typesetMath(grid);
    } else if (tab === 'notes') {
      (studyMaterial.shortNotes || []).forEach(section => {
        const secDiv = document.createElement('div');
        secDiv.className = 'card';
        secDiv.style.backgroundColor = 'var(--color-paper-alt)';
        secDiv.style.padding = '1.25rem 1.5rem';
        secDiv.style.marginBottom = '1rem';

        let bulletsHtml = section.content.map(pt => `<li style="margin-bottom: 0.4rem; color: var(--color-ink);">${renderFormulas(pt)}</li>`).join('');
        secDiv.innerHTML = `
          <h5 style="font-size: 1.05rem; font-weight: 800; color: var(--color-brand-indigo); margin-bottom: 0.75rem;">${section.sectionTitle}</h5>
          <ul style="padding-left: 1.25rem; font-size: 0.95rem; line-height: 1.6;">
            ${bulletsHtml}
          </ul>
        `;
        contentArea.appendChild(secDiv);
      });
      typesetMath(contentArea);
    } else if (tab === 'tips') {
      const tipsDiv = document.createElement('div');
      tipsDiv.className = 'card';
      tipsDiv.style.backgroundColor = '#FEF3C7';
      tipsDiv.style.borderColor = '#FDE68A';
      tipsDiv.style.padding = '1.5rem';

      let tipsHtml = (studyMaterial.examTips || []).map(tip => `<li style="margin-bottom: 0.6rem; color: #78350F; font-size: 0.95rem;">${renderFormulas(tip)}</li>`).join('');
      tipsDiv.innerHTML = `
        <h5 style="font-size: 1.1rem; font-weight: 800; color: #92400E; margin-bottom: 0.75rem;">💡 High-Frequency Board Exam Pointers</h5>
        <ul style="padding-left: 1.25rem; line-height: 1.6;">
          ${tipsHtml}
        </ul>
      `;
      contentArea.appendChild(tipsDiv);
      typesetMath(contentArea);
    }
  }

  /**
   * View Past Verified Proof of Learning Card Modal
   */
  let currentPastProofSummaryText = '';
  function viewPastProofOfLearning(sprintId) {
    const history = getSprintHistory();
    const sprint = history.find(s => s.id === sprintId) || history[0];
    if (!sprint) return;

    const modal = document.getElementById('modal-pol-view');
    const container = document.getElementById('pol-modal-render-container');
    if (!modal || !container) return;

    const isPassed = sprint.testPassed || sprint.testScore >= 7;

    currentPastProofSummaryText = `BUD-E PROOF OF LEARNING VERIFIED
Student: ${sprint.studentName}
Topic: ${sprint.subject} — ${sprint.chapter}
Sprint Duration: ${sprint.timeBudget || '2hrs'}
Date: ${sprint.date}
Test Score: ${sprint.testScore}/10 ${isPassed ? '(CAN SOLVE ✓)' : ''}
Final Confidence: ${sprint.confidenceScore || 50}%
Diagnostic Level: ${sprint.calibrationLevel || 'Intermediate'}
Sprint Verified by BUD-E (Build · Understand · Drill · Evaluate)`;

    container.innerHTML = `
      <div class="pol-card" style="box-shadow: 0 4px 20px rgba(15, 20, 48, 0.08); border: 2px solid var(--color-brand-indigo);">
        <div class="pol-header">
          <div class="pol-brand-wrap">
            <img src="assets/logo.png?v=2" alt="BUD-E Logo" class="pol-logo">
            <div>
              <div class="pol-app-title">BUD-E PROOF OF LEARNING</div>
              <div class="pol-date">${sprint.date}</div>
            </div>
          </div>
          <div>
            ${isPassed ? `
              <div class="badge-can-solve" style="background-color: var(--color-stage-practice); color: var(--color-success); border: 1px solid var(--color-success);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                CAN SOLVE
              </div>
            ` : `
              <div class="badge-can-solve" style="background-color: #FEF3C7; color: #92400E; border: 1px solid #FCD34D;">
                NEEDS 1 MORE DRILL
              </div>
            `}
          </div>
        </div>
        <div class="pol-body">
          <div class="pol-student">
            <span class="pol-label">STUDENT</span>
            <div class="pol-name">${sprint.studentName}</div>
          </div>
          <div class="pol-topic">
            <span class="pol-label">TOPIC &amp; SPRINT TIME</span>
            <div class="pol-topic-title">${sprint.subject}: ${sprint.chapter}</div>
            <div class="pol-duration-text">Time Invested: ${sprint.timeBudget || '2 Hours'} Active Learning Sprint</div>
          </div>
          <div class="pol-metrics-grid">
            <div class="metric-box">
              <span class="metric-label">TEST SCORE</span>
              <div class="metric-value"><span class="${isPassed ? 'score-high' : ''}">${sprint.testScore}</span> / 10</div>
            </div>
            <div class="metric-box">
              <span class="metric-label">CONFIDENCE METER</span>
              <div class="metric-value">${sprint.confidenceScore || 50}%</div>
            </div>
            <div class="metric-box">
              <span class="metric-label">DIAGNOSTIC BAND</span>
              <div class="metric-value" style="color: var(--color-brand-indigo);">${sprint.calibrationLevel || 'Intermediate'}</div>
            </div>
          </div>
        </div>
        <div class="pol-footer">
          <span class="pol-footer-brand">BUD-E · Build · Understand · Drill · Evaluate</span>
          <span class="pol-footer-badge">Class 12 Boards Sprint Verified</span>
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePastProofCard() {
    const modal = document.getElementById('modal-pol-view');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function copyPastProofSummary() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentPastProofSummaryText).then(() => {
        alert('Verified Proof of Learning summary copied to clipboard!');
      });
    } else {
      alert(currentPastProofSummaryText);
    }
  }

  // Public Interface
  window.BUDE_APP = {
    state,
    resetSprintSession,
    initScrollAnimations,
    // Student Dashboard & Sprint Vault
    getSprintHistory,
    recordCompletedSprint,
    openStudentDashboard,
    closeStudentDashboard,
    openQuickRecall,
    closeQuickRecall,
    switchQuickRecallTab,
    viewPastProofOfLearning,
    closePastProofCard,
    copyPastProofSummary,
    handleFeedbackSubmit,
    openOnboarding,
    showOnboardingModal,
    closeOnboarding,
    handleSubjectChange,
    selectTimeBudget,
    handleOnboardingSubmit,
    startCalibrationStage,
    selectCalibrationOption,
    handleCalibNext,
    finishCalibrationStage,
    proceedToStage2,
    proceedToStage3,
    renderPracticeQuestion,
    selectPracticeOption,
    tagErrorType,
    togglePracticeHint,
    togglePracticeSolution,
    handlePracticeNext,
    finishPracticeStage,
    proceedToStage4,
    renderTestQuestion,
    selectTestOption,
    handleTestNext,
    finishTestStage,
    proceedToStage5Result,
    copyProofCardSummary,
    proceedToRecall,
    returnToHome,
    promptBreakDialog,
    declineBreak,
    acceptBreak,
    resumeFromBreak,
    triggerParentWhatsAppAlert,
    // Background Audio Controller
    toggleBackgroundAudio,
    // Mobile & Header Navigation
    handleNavUserClick,
    toggleMobileNav,
    closeMobileNav,
    // CBSE Question Bank
    loadQuestionBank,
    closeQuestionBankViewer,
    filterQuestionBank,
    // Revision Notes
    loadRevisionNotes,
    closeRevisionNotesViewer,
    filterRevisionNotes,
    // Auth & Monetization & Paywalls
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    signInWithPhone,
    openSoftPaywallModal,
    closeSoftPaywallModal,
    openHardPaywallModal,
    closeHardPaywallModal,
    openPricingModal,
    closePricingModal,
    closePaymentSimModal,
    initiateRazorpayPayment,
    confirmSimulatedPayment,
    handlePaymentSuccess,
    resetMonetizationTest
  };

  /**
   * Official CBSE Question Bank Controller
   */
  const qbData = {
    physics: { title: 'Physics — Class XII Official CBSE Question Bank', meta: 'Official PDF · 10.3 MB · CBSE Board Approved', file: 'PhysicsXII.pdf' },
    chemistry: { title: 'Chemistry — Class XII Official CBSE Question Bank', meta: 'Official PDF · 1.2 MB · CBSE Board Approved', file: 'ChemistryXII.pdf' },
    mathematics: { title: 'Mathematics — Class XII Official CBSE Question Bank', meta: 'Official PDF · 1.9 MB · CBSE Board Approved', file: 'MathematicsXII.pdf' },
    biology: { title: 'Biology — Class XII Official CBSE Question Bank', meta: 'Official PDF · 647 KB · CBSE Board Approved', file: 'BiologyXII.pdf' },
    computerscience: { title: 'Computer Science — Class XII Official CBSE Question Bank', meta: 'Official PDF · 284 KB · CBSE Board Approved', file: 'ComputerScienceXII.pdf' },
    accountancy: { title: 'Accountancy — Class XII Official CBSE Question Bank', meta: 'Official PDF · 517 KB · CBSE Board Approved', file: 'AccountancyXII.pdf' },
    businessstudies: { title: 'Business Studies — Class XII Official CBSE Question Bank', meta: 'Official PDF · 946 KB · CBSE Board Approved', file: 'BusinessStudiesXII.pdf' },
    economics: { title: 'Economics — Class XII Official CBSE Question Bank', meta: 'Official PDF · 498 KB · CBSE Board Approved', file: 'EconomicsXII.pdf' },
    englishcore: { title: 'English Core — Class XII Official CBSE Question Bank', meta: 'Official PDF · 1.7 MB · CBSE Board Approved', file: 'EnglishCoreXII.pdf' },
    informaticspractices: { title: 'Informatics Practices — Class XII Official CBSE Question Bank', meta: 'Official PDF · 624 KB · CBSE Board Approved', file: 'InformaticsPracticesXII.pdf' }
  };

  function loadQuestionBank(subjectKey, scroll) {
    const item = qbData[subjectKey.toLowerCase()];
    if (!item) return;

    const viewer = document.getElementById('qb-viewer-card');
    const frame = document.getElementById('qb-pdf-frame');
    const titleEl = document.getElementById('qb-active-title');
    const metaEl = document.getElementById('qb-active-meta');
    const downloadBtn = document.getElementById('qb-download-btn');
    const newTabBtn = document.getElementById('qb-newtab-btn');

    const pdfPath = 'assets/question-bank/' + item.file;
    if (viewer) {
      viewer.style.display = 'block';
    }
    if (frame) frame.src = pdfPath;
    if (titleEl) titleEl.textContent = item.title;
    if (metaEl) metaEl.textContent = item.meta;
    if (downloadBtn) {
      downloadBtn.href = pdfPath;
      downloadBtn.setAttribute('download', item.file);
    }
    if (newTabBtn) {
      newTabBtn.href = pdfPath;
    }

    // Highlight active card
    document.querySelectorAll('.qb-card').forEach(c => {
      if (c.getAttribute('data-subject') === subjectKey.toLowerCase()) {
        c.classList.add('active-preview');
      } else {
        c.classList.remove('active-preview');
      }
    });

    if (scroll && viewer) {
      setTimeout(() => {
        viewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  function closeQuestionBankViewer() {
    const viewer = document.getElementById('qb-viewer-card');
    const frame = document.getElementById('qb-pdf-frame');
    if (viewer) {
      viewer.style.display = 'none';
    }
    if (frame) {
      frame.src = '';
    }
    document.querySelectorAll('.qb-card').forEach(c => c.classList.remove('active-preview'));
  }

  function filterQuestionBank(stream, btnEl) {
    document.querySelectorAll('.qb-filter-pill').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const cards = document.querySelectorAll('.qb-card');
    cards.forEach(card => {
      const cardStreams = (card.getAttribute('data-stream') || '').split(' ');
      if (stream === 'all' || cardStreams.includes(stream)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  /**
   * Official Class 12 Revision Notes Controller
   */
  const rnData = {
    physics: { title: 'Physics — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 5.8 MB PDF · Formulas, Derivations & Key Concepts', file: 'Class_12_Physics_Revision_Notes.pdf' },
    chemistry: { title: 'Chemistry — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 17.1 MB PDF · Organic, Inorganic & Physical Chemistry', file: 'Class_12_Chemistry_Revision_Notes.pdf' },
    mathematics: { title: 'Mathematics — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 5.2 MB PDF · Key Formulas, Theorems & Solved Examples', file: 'Class_12_Mathematics_Revision_Notes.pdf' },
    biology: { title: 'Biology — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 9.5 MB PDF · Diagrams, Cycles & High-Yield Summary', file: 'Class_12_Biology_Revision_Notes.pdf' },
    computerscience: { title: 'Computer Science — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 2.7 MB PDF · Python, SQL & Computer Networks', file: 'Class_12_CS_Notes.pdf' },
    accountancy: { title: 'Accountancy — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 6.4 MB PDF · Partnership, Company Accounts & Analysis', file: 'Class_12_Accountancy_Revision_Notes.pdf' },
    businessstudies: { title: 'Business Studies — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 4.9 MB PDF · Principles of Management & Business Finance', file: 'Class_12_Business_Studies_Revision_Notes.pdf' },
    economics: { title: 'Economics — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 3.7 MB PDF · Macroeconomics & Indian Economic Development', file: 'Class_12_Economics_Revision_Notes.pdf' },
    englishcore: { title: 'English Core — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 2.9 MB PDF · Literature, Writing Skills & Formats', file: 'Class_12_English_Revision_Notes.pdf' },
    informaticspractices: { title: 'Informatics Practices — Class XII Comprehensive Revision Notes', meta: 'Quick Revision Guide · 2.5 MB PDF · Data Handling with Pandas & SQL', file: 'Class_12_IP_Revision_Notes.pdf' }
  };

  function loadRevisionNotes(subjectKey, scroll) {
    const item = rnData[subjectKey.toLowerCase()];
    if (!item) return;

    const viewer = document.getElementById('rn-viewer-card');
    const frame = document.getElementById('rn-pdf-frame');
    const titleEl = document.getElementById('rn-active-title');
    const metaEl = document.getElementById('rn-active-meta');
    const downloadBtn = document.getElementById('rn-download-btn');
    const newTabBtn = document.getElementById('rn-newtab-btn');

    const pdfPath = 'assets/notes/' + item.file;
    if (viewer) {
      viewer.style.display = 'block';
    }
    if (frame) frame.src = pdfPath;
    if (titleEl) titleEl.textContent = item.title;
    if (metaEl) metaEl.textContent = item.meta;
    if (downloadBtn) {
      downloadBtn.href = pdfPath;
      downloadBtn.setAttribute('download', item.file);
    }
    if (newTabBtn) {
      newTabBtn.href = pdfPath;
    }

    // Highlight active card
    document.querySelectorAll('.rn-card').forEach(c => {
      if (c.getAttribute('data-subject') === subjectKey.toLowerCase()) {
        c.classList.add('active-preview');
      } else {
        c.classList.remove('active-preview');
      }
    });

    if (scroll && viewer) {
      setTimeout(() => {
        viewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  function closeRevisionNotesViewer() {
    const viewer = document.getElementById('rn-viewer-card');
    const frame = document.getElementById('rn-pdf-frame');
    if (viewer) {
      viewer.style.display = 'none';
    }
    if (frame) {
      frame.src = '';
    }
    document.querySelectorAll('.rn-card').forEach(c => c.classList.remove('active-preview'));
  }

  function filterRevisionNotes(stream, btnEl) {
    document.querySelectorAll('.rn-filter-pill').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const cards = document.querySelectorAll('.rn-card');
    cards.forEach(card => {
      const cardStreams = (card.getAttribute('data-stream') || '').split(' ');
      if (stream === 'all' || cardStreams.includes(stream)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  /**
   * Background Audio Controller - Safe no-op kept for backwards compatibility
   */
  function toggleBackgroundAudio() {
    // No-op: static background image is active
  }

  /**
   * Navigation Guards for Active Sprints
   * Warns student before abandoning an in-progress sprint if they click logo or nav links,
   * cleanly resetting sprint session upon confirmed exit.
   */
  function initSprintNavigationGuards() {
    // Brand Logo
    const brand = document.querySelector('.nav-brand');
    if (brand) {
      brand.addEventListener('click', (e) => {
        const sprintContainer = document.getElementById('view-sprint-container');
        if (sprintContainer && sprintContainer.style.display !== 'none') {
          e.preventDefault();
          returnToHome();
        }
      });
    }

    // Header and Mobile Nav links
    document.querySelectorAll('.nav-links a, .mobile-dropdown-links a').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#') && href !== '#plans') {
          const sprintContainer = document.getElementById('view-sprint-container');
          if (sprintContainer && sprintContainer.style.display !== 'none') {
            e.preventDefault();
            if (confirm('Leave this learning sprint and return to the BUD-E homepage? Your progress will be saved in your log.')) {
              returnToHome(true);
              const targetId = href.substring(1);
              const targetEl = document.getElementById(targetId);
              if (targetEl) {
                setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth' }), 60);
              }
            }
          }
        }
      });
    });
  }

  // On DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initSprintNavigationGuards();
    updatePreviewCardDate();
    loadPersistedMonetization();
    console.log('[BUD-E] Platform initialized with high-performance static background and porcelain UI.');
  });

})(window, document);
