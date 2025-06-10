import express from "express";
import formidable from 'formidable';
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import FormData from "form-data";
import { createPublicClient, getContract, http, createWalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { story, storyAeneid } from 'viem/chains'
import QuizManagerABI from "./src/assets/abis/QuizManagerABI.json" with { type: "json" };

dotenv.config();
const app = express();
const PORT = 5000;

app.use(cors());

app.post("/api/uploadFileToIPFS", (req, res) => {
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
});

app.post("/api/uploadJSONToIPFS", (req, res) => {
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
});

app.post("/api/submitQuiz", (req, res) => {
  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parsing error" });

    try {
      const { chainId, userAddress, quizId, userAnswers } = fields;
      if (!chainId[0] || !userAddress[0] || !quizId[0] || !userAnswers[0]) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      console.log("FormData", fields);

      let chain;
      if (chainId[0] === '1315') chain = storyAeneid;
      else if (chainId[0] === "1514") chain = story;
      else {
        res.status(400).json({ error: "Unsupported chainId" });
        return;
      }

      const clientConfig = {
        chain,
        transport: http(),
      }

      const publicClient = createPublicClient(clientConfig)
      const QuizManagerAddress = process.env.VITE_QUIZ_MANAGER;

      // 1. Read metadata URI from contract
      const quizMetadata = await publicClient.readContract({
        address: QuizManagerAddress,
        abi: QuizManagerABI,
        functionName: 'quizzes',
        args: [BigInt(quizId[0])],
      });
      // console.log("Quiz contract metadata:", quizMetadata);

      // 2. Check if quiz is active
      if (!quizMetadata[2]) {
        return res.status(400).json({ error: "Quiz not found or not active" });
      }

      // 3. Fetch quiz metadata from IPFS
      const quizMetadataUri = quizMetadata[6];
      const quizMetadataUri2 = quizMetadataUri.replace("https://ipfs.io/ipfs/", "https://gateway.pinata.cloud/ipfs/");
      // console.log("quizMetadataUri", quizMetadataUri2);

      const { data: quizData } = await axios.get(quizMetadataUri2);
      // console.log("Quiz metadata:", quizData);

      const userAnswersObj = JSON.parse(userAnswers[0]);
      const selectedQuestions = quizData.questions.filter((_, i) => Object.keys(userAnswersObj).includes(i.toString()));

      let score = 0;
      Object.keys(userAnswersObj).forEach((questionIndex, i) => {
        if (selectedQuestions[i].answer === userAnswersObj[questionIndex].toString()) {
          score += 1;
        }
      });

      console.log(`${userAddress.slice(-7)} Score:`, score);

      // 4. Send the result to the contract
      const account = privateKeyToAccount(`0x${process.env.SUBMITTER_WALLET_PRIVATE_KEY}`);
      const walletClient = createWalletClient({
        ...clientConfig,
        account,
      })

      const txHash = await walletClient.writeContract({
        address: QuizManagerAddress,
        abi: QuizManagerABI,
        functionName: 'setHasTried',
        args: [userAddress[0], BigInt(score), BigInt(quizId[0])],
      });

      return res.status(200).json({ success: true, score, txHash });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Local server running on http://localhost:${PORT}`);
});
