// BUD-E Universal Logger: Google Sheets Webhook & Local Storage
(function(window) {
  'use strict';

  // Configuration: Paste your Google Apps Script Web App URL below
  const DEFAULT_CONFIG = {
    // Paste your deployed Google Apps Script Web App URL here
    googleSheetsUrl: "https://script.google.com/macros/s/AKfycbxWs4hbgmds5mGtlYs_gsIytN_zGm4uO5UA9EHkIH9sst5ik93Q3OoidbjG6uWFC3CI/exec", 
    
    // Optional fallback Google Form Action URL
    formActionUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc_BUDE_MASTER_LOG/formResponse",
    entries: {
      name: "entry.1000001",
      subject: "entry.1000002",
      chapter: "entry.1000003",
      timeBudget: "entry.1000004",
      parentPhone: "entry.1000005",
      calibrationLevel: "entry.1000006",
      calibrationScore: "entry.1000007",
      testScore: "entry.1000008",
      confidenceScore: "entry.1000009",
      feedback: "entry.1000010"
    }
  };

  const config = Object.assign({}, DEFAULT_CONFIG, window.BUDE_CONFIG || {});

  /**
   * Dispatches data silently to Google Sheets / Google Forms and records locally
   */
  async function silentLog(payload) {
    try {
      const entry = Object.assign({
        timestamp: new Date().toISOString(),
        eventType: payload.eventType || 'sprint_event',
        tier: payload.tier || (window.BUDE_APP && window.BUDE_APP.getMonetizationState ? window.BUDE_APP.getMonetizationState().activeTier : 'free'),
        sprint_number: payload.sprint_number !== undefined ? payload.sprint_number : (window.BUDE_APP && window.BUDE_APP.getMonetizationState ? window.BUDE_APP.getMonetizationState().currentSprintNumber : 1),
        signup_completed: payload.signup_completed !== undefined ? payload.signup_completed : (window.BUDE_APP && window.BUDE_APP.getAuthState ? window.BUDE_APP.getAuthState().signedIn : false),
        paywall_seen: payload.paywall_seen || (window.BUDE_APP && window.BUDE_APP.getMonetizationState ? window.BUDE_APP.getMonetizationState().paywallSeen : 'none'),
        payment_made: payload.payment_made || '₹0',
        device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
        screen: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer || 'Direct'
      }, payload);

      console.log('[BUD-E Analytics] Logging event:', entry);

      // 1. Persistent Local Storage Backup
      try {
        const storedLogs = JSON.parse(localStorage.getItem('bude_sprint_records') || '[]');
        storedLogs.push(entry);
        localStorage.setItem('bude_sprint_records', JSON.stringify(storedLogs, null, 2));
      } catch (localErr) {
        console.warn('[BUD-E LocalStorage] Local storage write warning:', localErr);
      }

      // 2. Direct Google Sheets Webhook (Preferred)
      if (config.googleSheetsUrl && config.googleSheetsUrl.startsWith('http')) {
        try {
          await fetch(config.googleSheetsUrl, {
            method: 'POST',
            mode: 'no-cors', // allows cross-origin submission to Google Script
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
          });
          console.log('[BUD-E Analytics] Data sent to Google Sheet.');
          return;
        } catch (sheetErr) {
          console.warn('[BUD-E Analytics] Google Sheets webhook error:', sheetErr);
        }
      }

      // 3. Fallback: Google Form Action URL
      if (config.formActionUrl && !config.formActionUrl.includes('MASTER_LOG')) {
        const formData = new FormData();
        if (entry.name && config.entries.name) formData.append(config.entries.name, entry.name);
        if (entry.subject && config.entries.subject) formData.append(config.entries.subject, entry.subject);
        if (entry.chapter && config.entries.chapter) formData.append(config.entries.chapter, entry.chapter);
        if (entry.timeBudget && config.entries.timeBudget) formData.append(config.entries.timeBudget, entry.timeBudget);
        if (entry.parentPhone && config.entries.parentPhone) formData.append(config.entries.parentPhone, entry.parentPhone);
        if (entry.calibrationLevel && config.entries.calibrationLevel) formData.append(config.entries.calibrationLevel, entry.calibrationLevel);
        if (entry.calibrationScore !== undefined && config.entries.calibrationScore) formData.append(config.entries.calibrationScore, String(entry.calibrationScore));
        if (entry.testScore !== undefined && config.entries.testScore) formData.append(config.entries.testScore, String(entry.testScore));
        if (entry.confidenceScore !== undefined && config.entries.confidenceScore) formData.append(config.entries.confidenceScore, String(entry.confidenceScore) + '%');
        if (entry.feedback && config.entries.feedback) formData.append(config.entries.feedback, entry.feedback);

        await fetch(config.formActionUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: formData
        });
      }
    } catch (err) {
      console.warn('[BUD-E Analytics] Non-blocking log warning:', err.message);
    }
  }

  /**
   * Automatically log visitor on landing (once per session)
   */
  function logVisit() {
    if (!sessionStorage.getItem('bude_visited_session')) {
      sessionStorage.setItem('bude_visited_session', 'true');
      silentLog({
        eventType: 'page_visit',
        name: 'Visitor (Browsing)'
      });
    }
  }

  // Trigger visit log when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', logVisit);
  } else {
    logVisit();
  }

  /**
   * Helper to retrieve all stored records from localStorage
   */
  function getLocalRecords() {
    try {
      return JSON.parse(localStorage.getItem('bude_sprint_records') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Download all sprint records as a JSON or CSV file
   */
  function exportRecordsAsJSON() {
    const records = getLocalRecords();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `bude_records_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
  }

  window.BUDE_LOGGER = {
    silentLog,
    logVisit,
    getLocalRecords,
    exportRecordsAsJSON,
    config
  };

})(window);
