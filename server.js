const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // Trust the first proxy (Render, Heroku, etc.)
const allowedOrigins = ['https://www.excluziv.in', 'https://excluziv.in', 'http://127.0.0.1:5500']; // Added localhost for local dev

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
};

// Enable CORS for all routes
app.use(cors(corsOptions));

// Explicitly handle preflight (OPTIONS) requests
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Allow PDF, DOCX, and image files
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, images, and text files are allowed.'), false);
    }
  }
});

// File processing functions
async function extractTextFromPDF(filePath) {
  try {
    const pdf = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return 'Error extracting text from PDF';
  }
}

async function extractTextFromDOCX(filePath) {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return 'Error extracting text from DOCX';
  }
}

async function extractTextFromImage(filePath) {
  try {
    const Tesseract = require('tesseract.js');
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
    return text;
  } catch (error) {
    console.error('Image OCR error:', error);
    return 'Error extracting text from image';
  }
}

async function extractTextFromFile(filePath, mimeType) {
  if (mimeType === 'application/pdf') {
    return await extractTextFromPDF(filePath);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await extractTextFromDOCX(filePath);
  } else if (mimeType.startsWith('image/')) {
    return await extractTextFromImage(filePath);
  } else if (mimeType === 'text/plain') {
    return fs.readFileSync(filePath, 'utf8');
  } else {
    return 'Unsupported file type';
  }
}

// --- Tool Prompts ---
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

const REASONING_PROMPT = `Think analytically about the query like a seasoned legal professional such as Ram Jethmalani, Kapil Sibal, or Harish Salve. Critically analyze the query, use deep legal acumen, and provide logical, well-reasoned answers. Apply advanced legal reasoning, cite relevant precedents where appropriate, and ensure your response reflects the highest standards of legal professionalism.`;

const BASE_PROMPT = `You are an experienced legal professional. Provide clear, accurate, and practical legal answers to the user's query, using your expertise in Indian law. Respond directly to the user's input.`;

// Health check route for Render/UptimeRobot
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// --- Main AI Handler with File Upload Support ---
app.post("/api/ask", upload.array('files', 10), async (req, res) => {
  const { prompt, tool, context, reasoning } = req.body;
  const files = req.files || [];

  let fullPrompt = '';
  let fileContents = '';

  // Process uploaded files
  if (files.length > 0) {
    const fileTexts = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await extractTextFromFile(file.path, file.mimetype);
        fileTexts.push(`[File ${i + 1}: ${file.originalname}]\n${text}`);
        // Clean up uploaded file
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        fileTexts.push(`[File ${i + 1}: ${file.originalname}]\nError processing this file.`);
      }
    }
    fileContents = '\n\n--- UPLOADED DOCUMENTS ---\n' + fileTexts.join('\n\n') + '\n\n--- END DOCUMENTS ---\n\n';
  }

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

  // Add file contents to the prompt if files were uploaded
  if (fileContents) {
    fullPrompt = fullPrompt.replace('User question:', `User question: ${fileContents}`);
    fullPrompt = fullPrompt.replace('User follow-up:', `User follow-up: ${fileContents}`);
  }

  try {
    // The actual AI provider is abstracted and not exposed to the frontend or logs
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ExcluzivAI-Backend/1.0"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      }
    );
    const data = await response.json();
    // Only return the AI answer, never the raw provider response
    let answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a legal answer.";
    res.json({ answer });
  } catch (error) {
    // Do not leak provider details in logs or responses
    console.error("AI Provider Error:", error);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

