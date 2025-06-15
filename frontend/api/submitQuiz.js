import formidable from 'formidable';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
import { createPublicClient, createWalletClient, privateKeyToAccount, http } from 'viem';
import { story, storyAeneid } from 'viem/chains';
import axios from 'axios';
import QuizManagerABI from '../../src/assets/abis/QuizManagerABI.json' with { type: 'json' };
dotenv.config();

function decryptAnswers(encryptedAnswers) {
  const secretKey = process.env.ENCRYPTION_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Encryption secret key not set");
  }
  const bytes = CryptoJS.AES.decrypt(encryptedAnswers, secretKey);
  const answers = bytes.toString(CryptoJS.enc.Utf8);
  const answersObj = JSON.parse(answers);

  return answersObj;
}

export default async function handler(req, res) {
  if (req.method !== 'POST'){
    return res.status(405).json({error: 'Method not allowed'});
  }

  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields) => {
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

      // 2. Check if quiz is active
      if (!quizMetadata[2]) {
        return res.status(400).json({ error: "Quiz not found or not active" });
      }

      // 3. Fetch quiz metadata from IPFS
      const quizMetadataUri = quizMetadata[9];
      const quizMetadataUri2 = quizMetadataUri.replace("https://ipfs.io/ipfs/", "https://gateway.pinata.cloud/ipfs/"); // IPFS not allowing access, is it because of local server?

      const { data: quizData } = await axios.get(quizMetadataUri2);

      const encryptedAnswers = decryptAnswers(quizData.encryptedAnswers);
      const userAnswersObj = JSON.parse(userAnswers[0]);
      const selectedQuestions = quizData.questions.filter((_, i) => Object.keys(userAnswersObj).includes(i.toString()));
      const selectedQuestionsIndices = selectedQuestions.map((q) => quizData.questions.findIndex((origQ) => origQ.question === q.question));

      let score = 0;
      selectedQuestionsIndices.forEach((qIndex, i) => {
        if (encryptedAnswers[qIndex] === userAnswersObj[qIndex].toString()) {
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
};