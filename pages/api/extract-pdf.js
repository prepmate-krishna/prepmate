// pages/api/extract-pdf.js
import formidable from "formidable";
import fs from "fs";
import pdf from "pdf-parse";

export const config = { api: { bodyParser: false } };

function parseForm(req, options = {}) {
  const form = formidable({ multiples: false, ...options });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req, { maxFileSize: 50 * 1024 * 1024 });

    if (fields?.text && String(fields.text).trim().length > 0) {
      return res.status(200).json({ ok: true, text: String(fields.text).trim() });
    }

    const fileKey = Object.keys(files || {})[0];
    if (!fileKey) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploaded = files[fileKey];

    // 🔴 Debug log
    console.error("📂 Uploaded file object:", uploaded);

    // Try all known fields
    const filePath =
      uploaded.filepath ||
      uploaded.path ||
      uploaded.file?.filepath ||
      uploaded.file?.path ||
      uploaded[0]?.filepath ||
      uploaded[0]?.path;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({ error: "Uploaded file not found on server" });
    }

    const buffer = fs.readFileSync(filePath);
    if (!buffer.slice(0, 4).toString("utf8").includes("%PDF")) {
      return res.status(400).json({ error: "File is not a PDF" });
    }

    const data = await pdf(buffer);
    return res.status(200).json({ ok: true, text: data.text || "" });
  } catch (err) {
    console.error("extract-pdf error:", err);
    return res.status(500).json({ error: "Failed to parse PDF", details: String(err?.message) });
  }
}
