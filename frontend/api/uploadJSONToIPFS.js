import formidable from 'formidable';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST'){
    return res.status(405).json({error: 'Method not allowed'});
  }

  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parsing error" });

    try {
      const { data, filename } = fields;

      const metadata = JSON.parse(data);
      console.log(metadata, filename[0]);

      const pinataJwt = process.env.PINATA_JWT;

      const jsonResponse = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          pinataContent: metadata,
          pinataMetadata: { name: filename[0] },
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pinataJwt}`,
          },
        }
      );

      const cid = jsonResponse.data.IpfsHash;
      console.log("Metadata URL:", `https://gateway.pinata.cloud/ipfs/${cid}`);
      return res.status(200).json({ cid });

    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
};