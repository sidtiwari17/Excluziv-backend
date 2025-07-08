// ai-assistant.js

// State
let selectedTool = 'aiCaseSummary'; // Default tool

// DOM Elements
const queryInput = document.getElementById('ai-query-input');
const submitBtn = document.getElementById('ai-submit-btn');
const chatArea = document.getElementById('ai-chat-area');
const toolButtons = document.querySelectorAll('.ai-tool-btn');

// Tool selection
if (toolButtons) {
  toolButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      toolButtons.forEach(b => b.classList.remove('ring-2', 'ring-blue-500'));
      btn.classList.add('ring-2', 'ring-blue-500');
      selectedTool = btn.getAttribute('data-tool') || 'aiCaseSummary';
      queryInput.focus();
    });
  });
}

// Send query
async function sendQuery() {
  const userQuery = queryInput.value.trim();
  if (!userQuery) {
    showCustomAlert('Please enter a query.');
    return;
  }
  submitBtn.disabled = true;
  showLoading();
  appendMessage(userQuery, 'user');
  queryInput.value = '';
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userQuery, tool: selectedTool })
    });
    const result = await response.json();
    hideLoading();
    submitBtn.disabled = false;
    if (result.answer) {
      appendMessage(result.answer, 'model');
    } else if (result.error) {
      appendMessage(`<span class='text-red-500'>${result.error}</span>`, 'model');
    } else {
      appendMessage(`<span class='text-red-500'>Sorry, no answer was generated.</span>`, 'model');
    }
  } catch (error) {
    hideLoading();
    submitBtn.disabled = false;
    appendMessage(`<span class='text-red-500'>Sorry, the AI service is temporarily unavailable. Please try again later.</span>`, 'model');
  }
}

// Event listeners
if (submitBtn) {
  submitBtn.addEventListener('click', sendQuery);
}
if (queryInput) {
  queryInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  });
}

// Message rendering
function appendMessage(content, role) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `p-4 rounded-lg mb-4 ${role === 'user' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-200 dark:bg-gray-700'}`;
  messageDiv.innerHTML = role === 'user'
    ? `<p class='font-semibold mb-2'><i class='fas fa-user mr-2'></i>You</p><div>${escapeHtml(content)}</div>`
    : `<div class='flex justify-between items-start'><p class='font-semibold mb-2'><i class='fas fa-robot mr-2'></i>AI Assistant</p></div><div>${formatMarkdown(content)}</div>`;
  chatArea.appendChild(messageDiv);
  messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Loading spinner
let loadingDiv = null;
function showLoading() {
  if (!loadingDiv) {
    loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = `<div class='flex items-center'><div class='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3'></div><span>AI is thinking...</span></div>`;
    chatArea.appendChild(loadingDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
  }
}
function hideLoading() {
  if (loadingDiv) {
    loadingDiv.remove();
    loadingDiv = null;
  }
}

// Custom alert
function showCustomAlert(message) {
  let alertBox = document.getElementById('custom-alert-box');
  if (!alertBox) {
    alertBox = document.createElement('div');
    alertBox.id = 'custom-alert-box';
    alertBox.className = 'fixed top-5 right-5 bg-blue-600 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-opacity duration-300 opacity-0';
    document.body.appendChild(alertBox);
  }
  alertBox.innerText = message;
  alertBox.classList.remove('opacity-0');
  setTimeout(() => { alertBox.classList.add('opacity-0'); }, 3000);
}

// Markdown formatting (simple)
function formatMarkdown(text) {
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/<li>/g, '<ul><li>').replace(/<\/li>\n(?!<li>)/g, '</li></ul>');
  return html.replace(/\n/g, '<br />').replace(/<br \/><ul>/g, '<ul>').replace(/<\/ul><br \/>/g, '</ul>');
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
} 
