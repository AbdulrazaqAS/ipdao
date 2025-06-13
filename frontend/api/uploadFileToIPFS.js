import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST'){
    return res.status(405).json({error: 'Method not allowed'});
  }

  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parsing error" });

    // Ensure that a file exists
    if (Object.keys(files).length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const file = files.file[0];

      if (!file.originalFilename || !file.mimetype) {
        return res.status(400).json({ error: "File originalFilename or mimetype is null" });
      }

      const fileStream = fs.createReadStream(file.filepath);
      const formData = new FormData();  // using imported not built-in FormData to properly handle filestream. Built-in FormData doesn't support filestream.
      formData.append("file", fileStream, {
        filename: file.originalFilename,
        contentType: file.mimetype,
      });

      const pinataJwt = process.env.PINATA_JWT;
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${pinataJwt}`,
          },
        }
      );

      const cid = response.data.IpfsHash;
      return res.status(200).json({ cid });

    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
};