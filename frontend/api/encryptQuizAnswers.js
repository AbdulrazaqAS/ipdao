import formidable from 'formidable';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
  if (req.method !== 'POST'){
    return res.status(405).json({error: 'Method not allowed'});
  }

  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parsing error" });

    try {
      const { answers } = fields;
      if (!answers[0]) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      console.log("FormData", fields);
      const secretKey = process.env.ENCRYPTION_SECRET_KEY;
      if (!secretKey) {
        return res.status(500).json({ error: "Encryption secret key not set" });
      }
      const encryptedAnswers = CryptoJS.AES.encrypt(answers[0], secretKey).toString();
      console.log("Encrypted answers:", encryptedAnswers);
      return res.status(200).json({ encryptedAnswers });
    } catch (error) {
      console.error("Encryption error:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
};