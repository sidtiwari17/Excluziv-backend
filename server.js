const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve HTML & frontend JS from public folder

// --- Tool Prompts ---
const TOOL_PROMPTS = {
  legalDefinitions: `You are a legal dictionary and terminology expert...`,
  caseInsights: `You are a legal analyst specializing in case law...`,
  aiCaseSummary: `You are an expert legal summarizer for Indian legal professionals...`,
  draftPetition: `You are a legal drafting assistant...`,
  explainNotice: `You are a legal explainer specializing in notices...`,
  docGenerator: `You are a legal document generator...`,
  bareAct: `You are a legal statute navigator...`,
  casePrediction: `You are a legal outcome prediction engine...`,
  devilsAdvocate: `You are acting as a devil's advocate...`,
  docCompare: `You are a legal document comparison expert...`,
  strategySim: `You are a litigation strategy simulator...`,
  regulatoryImpact: `You are a regulatory compliance analyst...`,
  stakeholder: `You are an expert in legal stakeholder analysis...`,
  contractIntel: `You are a contract intelligence engine...`
};

// --- Reasoning Mode Prompt ---
const REASONING_PROMPT = `Think analytically about the query like a seasoned legal professional such as Ram Jethmalani, Kapil Sibal, or Harish Salve. Critically analyze the query, use deep legal acumen, and provide logical, well-reasoned answers. Apply advanced legal reasoning, cite relevant precedents where appropriate, and ensure your response reflects the highest standards of legal professionalism.`;

// --- Default Base Prompt ---
const BASE_PROMPT = `You are an experienced legal professional. Provide clear, accurate, and practical legal answers to the user's query, using your expertise in Indian law. Respond directly to the user's input.`;

// --- API Endpoint ---
app.post("/api/ask", async (req, res) => {
  const { prompt, tool, context, reasoning } = req.body;

  let fullPrompt = "";
  let base = reasoning ? REASONING_PROMPT : BASE_PROMPT;

  if (tool && TOOL_PROMPTS[tool]) base += "\n" + TOOL_PROMPTS[tool];

  if (context) {
    fullPrompt = `${base}\n\nPrevious context: ${context}\nUser follow-up: ${prompt}`;
  } else {
    fullPrompt = `${base}\n\nUser question: ${prompt}`;
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      }
    );

    const data = await geminiResponse.json();
    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No answer generated.";
    res.json({ answer });
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "AI service unavailable." });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
