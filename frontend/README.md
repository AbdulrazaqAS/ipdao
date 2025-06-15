# IPDAO Frontend

This project is a Vite + react project with Typescript. It uses Viem and Wagmi to connect to the contracts. It integrates Tomo social login for connecting users to the DAO using social networks or wallets.

### Frontend setup
```bash
#Assuming you've finished hardhat-project's dir

# Install packages
yarn

# Rename .env.example to .env
mv .env.example .env
```

Now, fill the missing fields in the *.env* with the contracts addresses from the *hardhat-project* section. Just the addresses, don't touch the names. Most of the ones here (in frontend) need the *VITE_* prefix. Also, if you've modified the contracts, you'll have to update the corresponding ABI(s) in this project inside *src/assets/abis/*.

[Initially Optional] To be able to create assets or any other thing like proposal or quiz, you'll need to go to [Pinata](https://pinata.cloud/) and create a new API key. Then add the JWT to your .env file `PINATA_JWT`.

Fill in `SUBMITTER_WALLET_PRIVATE_KEY` with the private key of the address used as `QUIZ_SUBMITTER` in the previous *.env* file.

Also, fill `ENCRYPTION_SECRET_KEY` with a random string or number. This will be the key to be used for encrypting and decrypting quiz answers.

Finally, run the following command to start to local server.
```bash
# Run
yarn dev
```

Also, run the following command to start a node server. This will be responsible for uploading files to Pinata and submitting, marking, and encrypting quizzes.
```bash
node devserver.js
```

This is only required for local deployment. For hosted deployment like on Vercel, serverless functions in *api* dir will be used.