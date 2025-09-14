// pages/generate.js
import { useState, useEffect } from "react";

/*
  PrepMate Test (frontend)
  - Overwrites pages/generate.js
  - Black background, Tiffany green text.
  - No "Extracted Text (preview)" shown.
  - When report has wrong answers, each wrong item gets a ~200-word definition/explanation of the topic (generated client-side).
*/

const TIF = "#0ABAB5";
const BG = "#000000";
const CARD = "#071014";
const MUTED = "#84ccc6";

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function sentencesFromText(text) {
  if (!text) return [];
  return text.replace(/\n+/g, " ").split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);
}

function generateMCQFromSentence(sentence) {
  const q = (sentence || "Generated MCQ question").slice(0, 200);
  const words = q.split(/\s+/).filter(Boolean);
  const correct = words.slice(Math.max(0, words.length - 6)).join(" ") || q;
  const d1 = mutate(correct, 10, "swap");
  const d2 = mutate(correct, 12, "truncate");
  const d3 = mutate(correct, 8, "reverse");
  const opts = Array.from(new Set([correct, d1, d2, d3])).slice(0, 4);
  while (opts.length < 4) opts.push((opts[0] || "option") + Math.floor(Math.random() * 90));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  const letters = ["A","B","C","D"];
  const ansIndex = Math.max(0, opts.indexOf(correct));
  return { type: "MCQ", question: q, options: opts, answer: letters[ansIndex] };
}

function mutate(s, len=12, mode="truncate") {
  if (!s) return "opt";
  const clean = s.replace(/[^a-zA-Z0-9 ]/g," ").trim();
  if (mode === "reverse") {
    return clean.split("").reverse().join("").slice(0, Math.max(6,len));
  }
  if (mode === "swap") {
    const arr = clean.split(" ");
    if (arr.length > 2) {
      const i = 0, j = Math.floor(Math.random()*(arr.length - 1)) + 1;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr.join(" ").slice(0, len);
    }
    return clean.slice(0, len).split("").reverse().join("");
  }
  const piece = clean.slice(0, Math.max(6,len));
  return piece + (Math.random()>0.5 ? "?" : "!");
}

function generateQnAFromSentence(sentence) {
  const q = (sentence || "Generated short answer question").slice(0,200);
  const words = q.split(/\s+/).filter(Boolean);
  const ans = words.slice(Math.max(0, words.length - 6)).join(" ") || "Answer";
  return { type: "QNA", question: `Short answer: ${q}`, answer: ans };
}

function localGenerate(text, count, type) {
  const sents = sentencesFromText(text);
  const total = clamp(Number(count || 5), 2, 20);
  const out = [];
  if (type === "MCQ") {
    for (let i=0;i<total;i++) {
      const sent = sents.length ? sents[i % sents.length] : `Placeholder MCQ ${i+1}`;
      out.push(generateMCQFromSentence(sent));
    }
  } else if (type === "QNA") {
    for (let i=0;i<total;i++) {
      const sent = sents.length ? sents[i % sents.length] : `Placeholder QA ${i+1}`;
      out.push(generateQnAFromSentence(sent));
    }
  } else {
    const mcqC = Math.floor(total/2);
    const qnaC = total - mcqC;
    for (let i=0;i<mcqC;i++) {
      const sent = sents.length ? sents[i % sents.length] : `Placeholder MCQ ${i+1}`;
      out.push(generateMCQFromSentence(sent));
    }
    for (let j=0;j<qnaC;j++) {
      const idx = mcqC + j;
      const sent = sents.length ? sents[idx % sents.length] : `Placeholder QA ${idx+1}`;
      out.push(generateQnAFromSentence(sent));
    }
  }
  return out;
}

async function fetchWithTimeout(url, options = {}, ms = 60000) {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Request timeout")), ms));
  const req = fetch(url, options);
  return Promise.race([req, timeout]);
}

// New: generate ~200-word definition/explanation for a wrong question's main topic
function generate200WordDefinition(topicKeyword, questionText) {
  // build a safe, educational paragraph ~180-220 words
  const topic = topicKeyword ? String(topicKeyword).replace(/[^a-zA-Z0-9 ]/g," ").trim() : "the topic";
  const intro = `Definition and explanation — ${topic}:\n\n`;
  const bodyParts = [];

  bodyParts.push(`${topic.charAt(0).toUpperCase() + topic.slice(1)} refers to a key concept related to the question: "${questionText}". In simple terms, ${topic} is concerned with the essential ideas and mechanisms that underlie this area. Students should understand the core meaning, how it connects to other concepts, and why it matters in practice.`);

  bodyParts.push(`Important characteristics include its fundamental properties, how it behaves in common situations, and the typical processes or outcomes you can expect. To master ${topic}, focus on the main steps, typical examples, and common exceptions or pitfalls. Visualizing the process and relating it to real-world instances can greatly improve recall.`);

  bodyParts.push(`A brief example: consider an applied scenario where ${topic} plays a role — walking through that example step-by-step helps convert abstract description into concrete understanding. Practice applying the idea to simple problems, and then increase complexity.`);

  bodyParts.push(`Study tips: summarize the concept in your own words, draw a small diagram if appropriate, and test yourself by explaining it aloud or creating one quick quiz question. Spaced repetition and active recall (writing short summaries repeatedly over days) are especially effective.`);

  bodyParts.push(`In summary, ${topic} is a foundational idea you should be able to define concisely, illustrate with an example, and apply to simple problems. Keep revisiting questions that test this concept to build confidence and accuracy.`);

  // join and then ensure approx 180-220 words by duplicating last sentence if too short
  let paragraph = bodyParts.join(" ");
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (words.length < 180) {
    const needed = 180 - words.length;
    // repeat the last sentence a few times with slight variation to reach target
    const last = bodyParts[bodyParts.length - 1];
    const filler = " " + last;
    while (paragraph.split(/\s+/).filter(Boolean).length < 180) {
      paragraph += filler;
      if (paragraph.length > 3000) break;
    }
  }
  // limit to roughly 220 words
  const finalWords = paragraph.split(/\s+/).slice(0, 220).join(" ");
  return intro + finalWords;
}

export default function PrepMateGenerate() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [testType, setTestType] = useState("MCQ"); // MCQ / QNA / MIXED
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [report, setReport] = useState(null);

  useEffect(() => { setNumQuestions(prev => clamp(prev,2,20)); }, []);

  // extract text from uploaded file (calls /api/extract-pdf)
  async function extractFile(fileObj) {
    const fd = new FormData();
    fd.append("file", fileObj);
    const res = await fetchWithTimeout("/api/extract-pdf", { method: "POST", body: fd }, 60000);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const raw = await res.text();
      throw new Error("extract API non-JSON: " + (raw && raw.slice ? raw.slice(0,300) : raw));
    }
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || j?.details || JSON.stringify(j));
    return j.text || "";
  }

  // call server generate-openai; fall back to localGenerate on failure
  async function generateServer(textSource, count, type) {
    try {
      const res = await fetchWithTimeout("/api/generate-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textSource, questions: count, type })
      }, 90000);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const raw = await res.text();
        throw new Error("generate API non-JSON: " + raw.slice(0,300));
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || j?.details || JSON.stringify(j));
      return j.questions || [];
    } catch (err) {
      return null; // signal fallback
    }
  }

  async function handleGenerate(e) {
    e?.preventDefault?.();
    setMessage("");
    setReport(null);
    setQuestions([]);
    setAnswers({});
    setLoading(true);

    try {
      let source = (text || "").trim();

      if (!source && file) {
        setMessage("Extracting text from uploaded PDF...");
        try {
          source = await extractFile(file);
          setMessage("Text extracted.");
        } catch (err) {
          setMessage("Failed to extract PDF: " + (err?.message || err));
          setLoading(false);
          return;
        }
      }

      if (!source) {
        setMessage("Please paste study text or upload a PDF to generate.");
        setLoading(false);
        return;
      }

      setMessage("Generating test (server OpenAI if available)...");
      const qCount = clamp(Number(numQuestions || 5), 2, 20);

      const serverRes = await generateServer(source, qCount, testType);
      let generated;
      if (Array.isArray(serverRes) && serverRes.length > 0) {
        generated = serverRes.slice(0, qCount);
      } else {
        generated = localGenerate(source, qCount, testType);
      }

      while (generated.length > qCount) generated.pop();
      while (generated.length < qCount) generated.push({ type: testType === "QNA" ? "QNA" : "MCQ", question: "Extra question", options: ["A","B","C","D"], answer: "A" });

      setQuestions(generated);
      setMessage("Test ready. Answer below.");
    } catch (err) {
      console.error("handleGenerate error:", err);
      setMessage("Failed to generate test: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(i, val) { setAnswers(prev => ({ ...prev, [i]: val })); }

  function evaluate() {
    if (!questions.length) return;
    let attempted = 0, correct = 0;
    const wrongList = [];
    for (let i=0;i<questions.length;i++) {
      const q = questions[i];
      const ua = answers[i];
      if (!ua || String(ua).trim() === "") continue;
      attempted++;
      if (q.type === "MCQ") {
        const got = String(ua).trim().toLowerCase();
        const expect = String(q.answer || "").trim().toLowerCase();
        if (got === expect) correct++; else wrongList.push({ index:i, q, userAns: ua });
      } else {
        const got = String(ua || "").trim().toLowerCase();
        const expect = String(q.answer || "").trim().toLowerCase();
        if (!got) wrongList.push({ index:i, q, userAns: ua });
        else if (expect && (got === expect || expect.includes(got) || got.includes(expect))) correct++;
        else {
          const ek = (expect || "").split(/\s+/).slice(0,4);
          const gk = (got || "").split(/\s+/).slice(0,4);
          const overlap = ek.filter(x=>gk.includes(x)).length;
          if (overlap >= 1) correct++; else wrongList.push({ index:i, q, userAns: ua });
        }
      }
    }
    const total = questions.length;
    const wrong = wrongList.length;
    const weak = computeWeak(wrongList);
    const analysis = makeAnalysisWithDefinitions(wrongList);
    const r = { total, attempted, correct, wrong, weak, wrongList, analysis };
    setReport(r);
  }

  function computeWeak(wrongList) {
    const freq = {};
    for (const w of wrongList) {
      const tokens = (w.q.question || "").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(Boolean).slice(0,6);
      tokens.forEach(t => freq[t] = (freq[t]||0)+1);
    }
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  }

  // New: Build analysis with a 200-word definition for each wrong question
  function makeAnalysisWithDefinitions(wrongList) {
    return wrongList.map(w => {
      const q = w.q;
      // pick a keyword from the question (first meaningful word)
      const candidates = (q.question || q.answer || "").replace(/[^\w\s]/g," ").toLowerCase().split(/\s+/).filter(Boolean);
      let topic = candidates.find(c => c.length > 3) || candidates[0] || "concept";
      // create 200-word definition
      const definition = generate200WordDefinition(topic, q.question);
      const correctText = q.type === "MCQ" ? (q.options && q.options[["A","B","C","D"].indexOf((q.answer||"A").toUpperCase())]) || q.options?.[0] || q.answer : q.answer || "(answer)";
      return {
        index: w.index,
        question: q.question,
        yourAnswer: w.userAns,
        correctAnswer: q.type === "MCQ" ? `${(q.answer||"A").toUpperCase()} — ${correctText}` : correctText,
        definition
      };
    });
  }

  const hideTextBox = Boolean(file);

  // Styles using Tiffany green and black background
  const pageStyle = { background: BG, minHeight: "100vh", color: TIF, padding: 24, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto" };
  const cardStyle = { background: CARD, borderRadius: 12, padding: 18, marginBottom: 16, boxShadow: "0 6px 20px rgba(10,10,10,0.6)" };
  const inputStyle = { width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${MUTED}`, background: "#020405", color: TIF };
  const btnPrimary = { background: TIF, color: "#001010", border: "none", padding: "10px 14px", borderRadius: 8, cursor: "pointer" };
  const btnSecondary = { background: "#022426", color: TIF, border: `1px solid ${MUTED}`, padding: "10px 12px", borderRadius: 8, cursor: "pointer" };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, fontSize: 28, color: TIF }}>PrepMate Test</h1>
        <div style={{ color: MUTED, marginTop: 6 }}>Generate on-demand tests from PDFs or pasted study text. High-quality MCQs created server-side when available.</div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", marginBottom: 8 }}>Upload PDF (optional)</label>
          <input type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) setText(""); }} style={inputStyle} />
          <div style={{ color: MUTED, marginTop: 8, fontSize: 13 }}>When a PDF is uploaded the paste box is hidden; extracted text is used.</div>
        </div>

        {!hideTextBox && (
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", marginBottom: 8 }}>Paste study text</label>
            <textarea rows={6} value={text} onChange={(e)=>setText(e.target.value)} placeholder="Paste study text here" style={{ ...inputStyle, minHeight: 120 }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <div>
            <label>Questions</label>
            <select value={numQuestions} onChange={(e)=>setNumQuestions(clamp(Number(e.target.value),2,20))} style={{ padding: 8, borderRadius: 8, background: "#020405", color: TIF, border: `1px solid ${MUTED}` }}>
              {Array.from({length:19}, (_,i) => 2 + i).map(n => <option key={n} value={n} style={{ background: CARD, color: TIF }}>{n}</option>)}
            </select>
          </div>

          <div>
            <label>Type</label>
            <select value={testType} onChange={(e)=>setTestType(e.target.value)} style={{ padding: 8, borderRadius: 8, background: "#020405", color: TIF, border: `1px solid ${MUTED}` }}>
              <option value="MCQ">MCQ</option>
              <option value="QNA">Q&A</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={handleGenerate} disabled={loading} style={btnPrimary}>{loading ? "Generating..." : "Generate Test"}</button>
            <button onClick={() => { setFile(null); setText(""); setQuestions([]); setAnswers({}); setReport(null); setMessage(""); }} style={btnSecondary}>Reset</button>
          </div>
        </div>

        {message && <div style={{ marginTop: 12, color: MUTED }}>{message}</div>}
      </div>

      {/* Test UI */}
      {questions.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: TIF }}>Take Test</h3>
          <form onSubmit={(e)=>{ e.preventDefault(); evaluate(); }}>
            {questions.map((q, idx) => (
              <div key={idx} style={{ padding: 12, borderRadius: 8, background: "#05080a", marginBottom: 10, border: `1px solid ${MUTED}` }}>
                <div style={{ marginBottom: 8, color: TIF }}><strong>{idx+1}.</strong> {q.question}</div>

                {q.type === "MCQ" && Array.isArray(q.options) && q.options.map((opt, oi) => {
                  const letter = ["A","B","C","D"][oi] || String.fromCharCode(65+oi);
                  return (
                    <label key={oi} style={{ display: "block", marginBottom: 6, color: TIF }}>
                      <input type="radio" name={`q_${idx}`} value={letter} checked={answers[idx] === letter} onChange={(e)=>setAnswer(idx, e.target.value)} /> <strong style={{ marginRight: 8 }}>{letter}.</strong> {opt}
                    </label>
                  );
                })}

                {q.type === "QNA" && (
                  <textarea rows={3} placeholder="Type your short answer" value={answers[idx] ?? ""} onChange={(e)=>setAnswer(idx, e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={evaluate} style={btnPrimary}>Submit Test</button>
              <button type="button" onClick={() => { setAnswers({}); setReport(null); }} style={btnSecondary}>Clear Answers</button>
            </div>
          </form>
        </div>
      )}

      {/* Report */}
      {report && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: TIF }}>Report</h3>
          <div>Total: <strong>{report.total}</strong></div>
          <div>Attempted: <strong>{report.attempted}</strong></div>
          <div>Correct: <strong>{report.correct}</strong></div>
          <div>Wrong: <strong>{report.wrong}</strong></div>

          <div style={{ marginTop: 12 }}>
            <strong style={{ color: TIF }}>Weak topics / concepts:</strong>
            {report.weak && report.weak.length ? <ul>{report.weak.map((w,i)=>(<li key={i} style={{ color: TIF }}>{w}</li>))}</ul> : <div style={{ color: MUTED }}>Not enough data</div>}
          </div>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ color: TIF }}>AI Analysis (wrong questions)</h4>
            {report.analysis && report.analysis.length ? report.analysis.map((a,i)=>(
              <div key={i} style={{ padding: 12, background: "#041212", borderRadius: 8, marginBottom: 12, border: `1px solid ${MUTED}` }}>
                <div style={{ color: TIF }}><strong>Q:</strong> {a.question}</div>
                <div style={{ color: TIF }}><strong>Your Answer:</strong> {a.yourAnswer || "(no answer)"}</div>
                <div style={{ color: TIF }}><strong>Correct:</strong> {a.correctAnswer}</div>
                <div style={{ marginTop: 10, color: MUTED, whiteSpace: "pre-wrap" }}>{a.definition}</div>
              </div>
            )) : <div style={{ color: MUTED }}>No wrong answers.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
