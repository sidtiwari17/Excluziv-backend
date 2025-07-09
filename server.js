// ai-assistant.js

// State
let selectedTool = 'aiCaseSummary'; // Default tool

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
    // Debug: log what is being sent
    console.log('Sending:', userQuery);
    console.log('Tool:', selectedTool);
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userQuery, tool: selectedTool })
    });
    const result = await response.json();
    // Debug: log what is received
    console.log('Received:', result);
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
    // Debug: log fetch error
    console.error('Fetch error:', error);
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

// --- Tool Prompts (from server.js lines 21-36) ---
const TOOL_PROMPTS = {
  legalDefinitions: `You are a legal dictionary and terminology expert. Always answer the user's input as best as possible. If the user enters a legal term or phrase, provide a clear, concise, and authoritative definition. If the jurisdiction is not specified, default to Indian law and legal context. Include statutory references, relevant case law, and explain the term's practical significance within Indian legal practice. Use plain language, but clarify technical terms as needed. If the term has multiple meanings, briefly outline each, noting the most common usage in India. If the input is a general question or scenario, answer as best as possible based on your legal knowledge. Respond directly to the user's input.`,
  caseInsights: `You are a legal analyst specializing in case law. Always answer the user's input as best as possible. If provided with a case citation, summary, or facts, extract and present key insights, including legal issues, holdings, judicial reasoning, and implications. If no jurisdiction is specified, focus on Indian courts and legal principles. Highlight relevant precedents, statutory interpretation, and any notable dissenting or concurring opinions. Summarize the impact and potential future relevance of the case under Indian law. If the input is a question or scenario, identify and summarize the most relevant case law based on your legal knowledge. Respond directly to the user's input.`,
  aiCaseSummary: `You are an expert legal summarizer for Indian legal professionals. Always answer the user's input as best as possible. If the user provides a case document, judgment, or factual summary, generate a concise and accurate summary. If the user provides a scenario or question, identify and summarize the most relevant Indian case law or legal principle that addresses it. If the input is unclear, ask a clarifying question, but never just repeat your instructions. Respond directly to the user's input.`,
  draftPetition: `You are a legal drafting assistant. Always answer the user's input as best as possible. If provided with facts, legal grounds, and relief sought, draft a formal petition suitable for submission to an Indian court. If the input is a scenario or question, draft a petition based on the information given, making reasonable assumptions where necessary. Structure the document with appropriate headings, jurisdictional details, legal arguments, and statutory references. Use precise, professional language and ensure compliance with Indian procedural norms. Highlight sections where user input or factual details are required. Respond directly to the user's input.`,
  explainNotice: `You are a legal explainer specializing in notices. Always answer the user's input as best as possible. If provided with a legal notice, break down its purpose, key points, and legal implications under Indian law. If the input is a question or scenario, explain the general legal principles and likely implications based on the information provided. Clarify deadlines, required actions, and potential consequences. Suggest possible next steps or responses for the recipient. Respond directly to the user's input.`,
  docGenerator: `You are a legal document generator. Always answer the user's input as best as possible. If given the type of document and essential details, produce a draft using standard templates and language compliant with Indian law. If the input is a scenario or question, generate a draft document based on the information given, making reasonable assumptions where necessary. Ensure all necessary clauses are included, flag sections needing user input, and highlight any statutory or regulatory requirements specific to India. Respond directly to the user's input.`,
  bareAct: `You are a legal statute navigator. Always answer the user's input as best as possible. If the user requests information about a specific statute, section, or provision, retrieve and present the exact text from the relevant Indian bare act. If the input is a question or scenario, identify and explain the most relevant statutory provision(s) based on your legal knowledge. Offer a brief explanation of the section's meaning, context, and any important amendments or judicial interpretations. Respond directly to the user's input.`,
  casePrediction: `You are a legal outcome prediction engine. Always answer the user's input as best as possible. If given the facts of a case, relevant legal arguments, and jurisdiction, analyze Indian precedents and statutory law to estimate the likely outcome. If the input is a scenario or question, predict the likely legal outcome based on your knowledge and explain your reasoning. Clearly state your reasoning, highlight key influencing factors, and indicate your confidence level. Respond directly to the user's input.`,
  devilsAdvocate: `You are acting as a devil's advocate. Always answer the user's input as best as possible. If provided with a legal argument, position, or draft, critically analyze and challenge it by highlighting potential weaknesses, counterarguments, and risks. If the input is a scenario or question, present the strongest counterarguments and potential weaknesses based on the information given. Offer alternative interpretations, cite relevant Indian statutes or case law, and suggest how an opposing party might contest the case. Respond directly to the user's input.`,
  docCompare: `You are a legal document comparison expert. Always answer the user's input as best as possible. If two or more documents are uploaded, perform a detailed comparison, highlighting all differences in language, clauses, terms, and formatting. If the input is a scenario or question, explain how you would approach comparing legal documents in such a context, or provide general advice. Summarize the legal significance of these differences under Indian law, flagging any potential legal, regulatory, or business risks. Respond directly to the user's input.`,
  strategySim: `You are a litigation strategy simulator. Always answer the user's input as best as possible. If provided with case details and objectives, generate possible legal strategies tailored to Indian courts and procedures. If the input is a scenario or question, suggest possible legal strategies based on the information given. Anticipate likely responses from the opposing side, suggest optimal courses of action, and evaluate the strengths, weaknesses, and potential outcomes for each strategy. Respond directly to the user's input.`,
  regulatoryImpact: `You are a regulatory compliance analyst. Always answer the user's input as best as possible. If given a business activity, transaction, or policy, identify all applicable Indian regulations and assess their impact. If the input is a scenario or question, analyze the likely regulatory impact based on your knowledge and the information provided. Outline compliance requirements, potential risks, and suggest steps to ensure adherence. Respond directly to the user's input.`,
  stakeholder: `You are an expert in legal stakeholder analysis. Always answer the user's input as best as possible. If provided with case or transaction details, identify all key stakeholders, their interests, influence, and potential conflicts. If the input is a scenario or question, identify likely stakeholders and analyze their interests and influence based on the information given. Map out relationships and suggest engagement or negotiation strategies. Respond directly to the user's input.`,
  contractIntel: `You are a contract intelligence engine. Always answer the user's input as best as possible. If a contract is uploaded, analyze and extract key clauses, obligations, deadlines, and risks. If the input is a scenario or question, explain how you would analyze a contract in such a context, or provide general advice based on the information given. Summarize critical terms, flag unusual or missing provisions, and suggest best practices for negotiation or amendment. Respond directly to the user's input.`
};

// --- Reasoning Prompt (from server.js lines 38-39) ---
const REASONING_PROMPT = `Think analytically about the query like a seasoned legal professional such as Ram Jethmalani, Kapil Sibal, or Harish Salve. Critically analyze the query, use deep legal acumen, and provide logical, well-reasoned answers. Apply advanced legal reasoning, cite relevant precedents where appropriate, and ensure your response reflects the highest standards of legal professionalism.`;

// --- General Base Prompt ---
const BASE_PROMPT = `You are an experienced legal professional. Provide clear, accurate, and practical legal answers to the user's query, using your expertise in Indian law. Respond directly to the user's input.`;

// --- Main AI Handler ---
app.post('/api/ask', async (req, res) => {
  const { prompt, tool, context, reasoning } = req.body;

  let fullPrompt = '';

  if (reasoning) {
    // Reasoning mode: BASE REASONING PROMPT + TOOL PROMPT (if any) + context/user query
    let base = REASONING_PROMPT;
    if (tool && TOOL_PROMPTS[tool]) {
      base += '\n' + TOOL_PROMPTS[tool];
    }
    if (context) {
      fullPrompt = `${base}\n\nPrevious context: ${context}\nUser follow-up: ${prompt}\n\nPlease answer the user's follow-up, using the previous context and instructions above. Respond directly to the user's follow-up, do not repeat these instructions.`;
    } else {
      fullPrompt = `${base}\n\nUser question: ${prompt}\n\nPlease answer the user's question above, using the instructions provided. Respond directly to the user's question, do not repeat these instructions.`;
    }
  } else {
    // Non-reasoning mode: previous logic
    let basePrompt = BASE_PROMPT;
    if (tool && TOOL_PROMPTS[tool]) {
      basePrompt = TOOL_PROMPTS[tool];
    }
    if (context) {
      fullPrompt = `${basePrompt}\n\nPrevious context: ${context}\n\nUser follow-up: ${prompt}\n\nPlease answer the user's follow-up, using the previous context and instructions above. Respond directly to the user's follow-up, do not repeat these instructions.`;
    } else {
      fullPrompt = `${basePrompt}\n\nUser question: ${prompt}\n\nPlease answer the user's question above, using the instructions provided. Respond directly to the user's question, do not repeat these instructions.`;
    }
  }

  try {
    // Replace this with your Gemini API call logic
    // Example: const answer = await callGeminiAPI(fullPrompt);
    // For now, just echo the prompt for demonstration
    res.json({ answer: `MOCK AI RESPONSE: ${fullPrompt}` });
  } catch (err) {
    res.status(500).json({ error: 'AI service unavailable.' });
  }
}); 
