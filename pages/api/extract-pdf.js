// pages/api/extract-pdf.js
import pdf from "pdf-parse";

// Disable Next.js default body parser so we can handle raw PDF binary
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Collect the raw PDF bytes
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Parse PDF
    const data = await pdf(buffer);

    // Send extracted text back
    return res.status(200).json({ text: data.text });
  } catch (err) {
    console.error("PDF parse error:", err);
    return res.status(500).json({ error: "Failed to parse PDF", details: err.message });
  }
}
