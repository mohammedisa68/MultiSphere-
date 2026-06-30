
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import postgres from "postgres";
import cors from "cors";
import { GoogleGenAI, Modality } from "@google/genai";

// Ensure environment variables are loaded
import "dotenv/config";

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));

  const httpServer = createServer(app);

  // Supabase/PostgreSQL connection using postgres.js
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("⚠️ DATABASE_URL is not set in environment variables! Database operations will fail or use mocks.");
  }

  // Optimize connect settings to avoid long hangs
  const sql = postgres(dbUrl || "postgresql://postgres@localhost:5432/postgres", {
    ssl: dbUrl ? { rejectUnauthorized: false } : false,
    connect_timeout: 5, // 5 seconds
    idle_timeout: 20,
    max: 10,
    onnotice: () => {}, // suppress notices
  });

  // Check connection but don't exit if fails
  const dbStatus = { connected: false, error: null as any };
  
  const checkDbConnection = async () => {
    if (!dbUrl) return;
    try {
      console.log("Checking database connection...");
      // Wrap in a promise with timeout to avoid blocking the whole server startup
      const connectionPromise = sql`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("DB Connection Timeout")), 4000));
      
      await Promise.race([connectionPromise, timeoutPromise]);
      console.log("✅ Supabase Database Connected successfully!");
      dbStatus.connected = true;
    } catch (err) {
      console.warn("⚠️ Database Connection Failed. App will run in mock/limited mode.", err);
      dbStatus.error = err;
    }
  };

  // Run connection check in background
  checkDbConnection();

  // MOCK STORE (Fallback if DB is unreachable)
  const mockProfiles = new Map<string, any>();
  const mockTransactions = new Map<string, any[]>();
  
  // Pre-populate mock store with a default user for testing if needed
  // mockProfiles.set("test@example.com", { email: "test@example.com", fullName: "Test User", passcode: "1234", wallet_balance: 5000.00 });

  // Helper functions to interact with DB (replacing local JSON functions)
  async function dbGetAccountByEmail(email: string) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();

    if (dbStatus.connected) {
      try {
        const users = await sql`SELECT *, wallet_balance as balance, fullName as name FROM public.profiles WHERE email = ${normalized}`;
        return users[0] || null;
      } catch (err) {
        console.error("dbGetAccountByEmail DB Error, falling back to mock:", err);
      }
    }
    return mockProfiles.get(normalized) || null;
  }

  async function dbGetAccountByIdentifier(identifier: string) {
    if (!identifier) return null;
    const normalized = identifier.toString().toLowerCase().trim();

    if (dbStatus.connected) {
      try {
        const users = await sql`SELECT *, wallet_balance as balance, fullName as name FROM public.profiles WHERE email = ${normalized} OR national_id = ${normalized}`;
        return users[0] || null;
      } catch (err) {
        console.error("dbGetAccountByIdentifier DB Error, falling back to mock:", err);
      }
    }
    
    // Search mock store
    for (const profile of mockProfiles.values()) {
      if (profile.email === normalized || profile.national_id === identifier.toString().trim()) {
        return profile;
      }
    }
    return null;
  }

  async function dbRegisterAccount(data: any) {
    const { email, phone, name, passcode, nationalId } = data;
    const normalizedEmail = email.toLowerCase().trim();
    
    if (dbStatus.connected) {
      try {
        const users = await sql`
          INSERT INTO public.profiles (email, phone, fullName, passcode, national_id, wallet_balance)
          VALUES (${normalizedEmail}, ${phone.trim()}, ${name.trim()}, ${passcode.toString().trim()}, ${nationalId.toString().trim()}, 2000.00)
          RETURNING *, wallet_balance as balance, fullName as name
        `;
        return users[0];
      } catch (err) {
        console.error("dbRegisterAccount DB Error, falling back to mock:", err);
      }
    }

    const newProfile = { 
      email: normalizedEmail, 
      phone: phone.trim(), 
      fullName: name.trim(), 
      name: name.trim(),
      passcode: passcode.toString().trim(), 
      national_id: nationalId.toString().trim(), 
      wallet_balance: 2000.00,
      balance: 2000.00 
    };
    mockProfiles.set(normalizedEmail, newProfile);
    return newProfile;
  }

  async function dbGetTransactions(email: string) {
    if (!email) return [];
    const normalized = email.toLowerCase().trim();

    if (dbStatus.connected) {
      try {
        return await sql`SELECT * FROM public.transactions WHERE user_email = ${normalized} ORDER BY created_at DESC`;
      } catch (err) {
        console.error("dbGetTransactions DB Error, falling back to mock:", err);
      }
    }
    return mockTransactions.get(normalized) || [];
  }

  async function dbAddTransaction(tx: any) {
    const { email, type, amount, currency, description, method, status } = tx;
    const normalized = email.toLowerCase().trim();

    if (dbStatus.connected) {
      try {
        const result = await sql`
          INSERT INTO public.transactions (user_email, type, amount, currency, description, payment_method, status)
          VALUES (${normalized}, ${type}, ${amount}, ${currency}, ${description}, ${method}, ${status})
          RETURNING *
        `;
        return result[0];
      } catch (err) {
        console.error("dbAddTransaction DB Error, falling back to mock:", err);
      }
    }

    const newTx = { 
      id: Math.random().toString(36).substr(2, 9),
      user_email: normalized, 
      type, amount, currency, description, 
      payment_method: method, status, 
      created_at: new Date().toISOString() 
    };
    const list = mockTransactions.get(normalized) || [];
    list.unshift(newTx);
    mockTransactions.set(normalized, list);
    return newTx;
  }

  async function dbUpdateBalance(email: string, newBalance: number) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();

    if (dbStatus.connected) {
      try {
        const result = await sql`UPDATE public.profiles SET wallet_balance = ${newBalance} WHERE email = ${normalized} RETURNING *, wallet_balance as balance, fullName as name`;
        return result[0] || null;
      } catch (err) {
        console.error("dbUpdateBalance DB Error, falling back to mock:", err);
      }
    }

    const profile = mockProfiles.get(normalized);
    if (profile) {
      profile.wallet_balance = newBalance;
      profile.balance = newBalance;
      mockProfiles.set(normalized, profile);
      return profile;
    }
    return null;
  }

  async function dbGetAllUsers(excludeEmail: string) {
    const emailFilter = excludeEmail ? excludeEmail.toLowerCase().trim() : "";

    if (dbStatus.connected) {
      try {
        if (emailFilter) {
          return await sql`SELECT fullName as name, email, phone FROM public.profiles WHERE email != ${emailFilter}`;
        } else {
          return await sql`SELECT fullName as name, email, phone FROM public.profiles`;
        }
      } catch (err) {
        console.error("dbGetAllUsers DB Error, falling back to mock:", err);
      }
    }

    const allUsers = Array.from(mockProfiles.values()).map(p => ({
      name: p.fullName,
      email: p.email,
      phone: p.phone
    }));

    if (emailFilter) {
      return allUsers.filter(u => u.email !== emailFilter);
    }
    return allUsers;
  }

  // OTP Store in memory: mapped by (senderEmail + ":" + recipientIdentifier)
  const otpStore = new Map<string, { code: string; expires: number }>();
  
  // Dynamic AI initialization to fallback dynamically when headers supply a free API Key
  const getAiInstance = (req: express.Request) => {
    const headerKey = req.headers['x-gemini-key'] as string;
    const resolvedKey = (headerKey && headerKey.trim() !== '') ? headerKey : (process.env.GEMINI_API_KEY || "");
    return new GoogleGenAI({
      apiKey: resolvedKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // NEW: Currency Rates Endpoint to avoid client-side CORS issues
  app.get("/api/wallet/rates", async (req, res) => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/ETB');
      if (!response.ok) throw new Error("Failed to fetch rates from external API");
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Rates fetch error:", error);
      // Fallback rates if external API is down
      res.json({
        rates: {
          ETB: 1,
          USD: 0.0083,
          EUR: 0.0076
        }
      });
    }
  });

  // NEW: Proxying Quran API to avoid direct external calls
  app.get("/api/quran/surahs", async (req, res) => {
    try {
      const response = await fetch('https://api.alquran.cloud/v1/surah');
      if (!response.ok) throw new Error("Failed to fetch surahs");
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Quran Surahs Proxy Error:", error);
      res.status(500).json({ error: "Could not retrieve surahs list" });
    }
  });

  app.get("/api/quran/surah/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${id}/editions/quran-simple,om.aburida`);
      if (!response.ok) throw new Error("Failed to fetch surah detail");
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Quran Surah Detail Proxy Error:", error);
      res.status(500).json({ error: "Could not retrieve surah content" });
    }
  });

  // Gemini API Endpoints
  app.get("/api/status", (req, res) => {
    res.json({ 
      status: "online",
      database: dbStatus.connected ? "connected" : "mock/limited",
      time: new Date().toISOString()
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      database: dbStatus.connected ? "connected" : "mock/limited",
      env: process.env.NODE_ENV || "development"
    });
  });

  // Image Generation
  app.post("/api/gemini/generate-image", async (req, res) => {
    try {
      const { prompt, images, model = "gemini-3.1-flash-image-preview" } = req.body;
      
      const parts: any[] = [];
      if (images && Array.isArray(images)) {
        for (const imgData of images) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: imgData } });
        }
      }
      parts.push({ text: prompt });

      const dynamicAi = getAiInstance(req);
      const response = await dynamicAi.models.generateContent({
        model,
        contents: { parts }
      });

      res.json(response);
    } catch (error: any) {
      console.error("Gemini Image Generation Error:", error);
      const errorMsg = error.message || "";
      const isQuota = errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429");
      res.status(isQuota ? 429 : 500).json({ 
        error: error.message || "Internal server error during image generation",
        quotaExceeded: isQuota
      });
    }
  });

  // General Text Generation
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      let { prompt, contents, model = "gemini-3.5-flash", config } = req.body;
      
      // Auto-upgrade deprecated gemini-1.5-flash to safe gemini-3.5-flash
      if (model === "gemini-1.5-flash") {
        model = "gemini-3.5-flash";
      }

      const dynamicAi = getAiInstance(req);
      const result = await dynamicAi.models.generateContent({
        model,
        contents: contents || prompt,
        config
      });
      // Handle the V3 SDK response structure
      let text = "";
      if (typeof result.text === 'string') {
        text = result.text;
      } else if (typeof (result as any).text === 'function') {
        text = (result as any).text();
      } else if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = result.candidates[0].content.parts[0].text;
      }
      res.json({ text, ...result });
    } catch (error: any) {
      console.error("Gemini Text Generation Error:", error);
      const errorMsg = error.message || "";
      const isQuota = errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429");
      res.status(isQuota ? 429 : 500).json({ 
        error: error.message || "Internal server error during text generation",
        quotaExceeded: isQuota
      });
    }
  });

  // =====================================
  // AUTH API ENDPOINTS (with Supabase fallback)
  // =====================================

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
      if (!email || !password || !fullName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // 1. Try to register in our profiles table (using mock fallback if DB is down)
      const existing = await dbGetAccountByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Note: In a real app, we'd hash the password. For this build, we use the passcode logic
      const newUser = await dbRegisterAccount({
        email,
        phone: "", // Will be updated later
        name: fullName,
        passcode: password, // Storing password as passcode for simplified auth
        nationalId: "GUEST-" + Math.random().toString(36).substr(2, 6).toUpperCase()
      });

      res.status(201).json({ success: true, user: newUser });
    } catch (error: any) {
      console.error("Auth Register Error:", error);
      res.status(500).json({ error: error.message || "Internal registration error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await dbGetAccountByEmail(email);

      if (!user || user.passcode !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Auth Login Error:", error);
      res.status(500).json({ error: error.message || "Internal login error" });
    }
  });

  app.post("/api/auth/social-login", async (req, res) => {
    try {
      const { email, fullName, photoURL } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      let user = await dbGetAccountByEmail(normalizedEmail);

      if (!user) {
        // Create a new account for the social user with a default national ID and wallet balance
        user = await dbRegisterAccount({
          email: normalizedEmail,
          phone: "",
          name: fullName || email.split("@")[0],
          passcode: "social-auth-oauth", // Placeholder passcode
          nationalId: "GOOGLE-" + Math.random().toString(36).substr(2, 6).toUpperCase()
        });
      }

      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Auth Social Login Error:", error);
      res.status(500).json({ error: error.message || "Internal social login error" });
    }
  });

  // =====================================
  // WALLET & USER ACCOUNT API ENDPOINTS
  // =====================================

  // 1. Account registration with free starting balance
  app.post("/api/wallet/register", async (req, res) => {
    try {
      const { email, phone, name, passcode, nationalId } = req.body;
      if (!email || !phone || !name || !passcode || !nationalId) {
        return res.status(400).json({ error: "Hunda keessaa ragaalee hundi barbaachisoodha, Lakkoofsa Biyyoolessaa dabalatee (All fields are required, including National ID)." });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const trimmedNationalId = nationalId.toString().trim();

      const existingByEmail = await dbGetAccountByEmail(normalizedEmail);
      if (existingByEmail) {
        return res.status(400).json({ error: "Email kanaan dura galmaa'eera (This email is already registered)." });
      }

      const existingByIdentifier = await dbGetAccountByIdentifier(trimmedNationalId);
      if (existingByIdentifier) {
        return res.status(400).json({ error: "Lakkoofsi Eenyummaa Biyyoolessaa kanaan dura galmaa'eera (This National ID is already registered)." });
      }

      const newAccountData = { email: normalizedEmail, phone: phone.trim(), name: name.trim(), passcode: passcode.toString().trim(), nationalId: trimmedNationalId };
      const newAccount = await dbRegisterAccount(newAccountData);

      res.status(201).json({ success: true, message: "Account created successfully!", account: newAccount });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message || "Error registering account" });
    }
  });

  // 2. User login (supports email OR national ID)
  app.post("/api/wallet/login", async (req, res) => {
    try {
      const { email, passcode } = req.body;
      if (!email || !passcode) {
        return res.status(400).json({ error: "Email/ID fi passcode ni barbaachisa (Email/ID and passcode are required)." });
      }

      const identifier = email.toLowerCase().trim();
      const normalizedPasscode = passcode.toString().trim();

      const user = await dbGetAccountByIdentifier(identifier);

      if (!user || user.passcode !== normalizedPasscode) {
        return res.status(401).json({ error: "Ibsi galfataa sirrii miti (Invalid credentials or passcode)." });
      }

      res.json({ success: true, account: user });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Error logging in" });
    }
  });

  // 3. Retrieve account details
  app.post("/api/wallet/account", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await dbGetAccountByEmail(email);

      if (!user) {
        return res.status(404).json({ error: "Account not found" });
      }

      res.json({ success: true, account: user });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Error getting account" });
    }
  });

  // 4. Generate and send Verification OTP confirmation code
  app.post("/api/wallet/send-otp", async (req, res) => {
    try {
      const { senderEmail, recipientEmailOrPhone, amount } = req.body;
      if (!senderEmail || !recipientEmailOrPhone || !amount) {
        return res.status(400).json({ error: "Missing required details for transfer." });
      }

      const sender = await dbGetAccountByEmail(senderEmail);
      if (!sender) {
        return res.status(404).json({ error: "Ergituun hin argamne (Sender account not found)." });
      }

      const validatedAmount = parseFloat(amount);
      if (isNaN(validatedAmount) || validatedAmount <= 0) {
        return res.status(400).json({ error: "Hangi maallaqaa sirrii miti (Invalid amount)." });
      }

      if (parseFloat(sender.wallet_balance) < validatedAmount) {
        return res.status(400).json({ error: "Madaalliin kee gahaa miti (Insufficient funds)." });
      }

      const identifier = recipientEmailOrPhone.toLowerCase().trim();
      const recipient = await dbGetAccountByIdentifier(identifier);

      if (!recipient) {
        return res.status(404).json({ error: "Kuba kaffaltii fudhatu hin argamne (Recipient account not found)." });
      }

      if (sender.email === recipient.email) {
        return res.status(400).json({ error: "Ofii keetiif erguu hin dandeessu (Cannot transfer to your own self)." });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const storeKey = `${sender.email}:${identifier}`;
      
      otpStore.set(storeKey, {
        code: otpCode,
        expires: Date.now() + 5 * 60 * 1000
      });

      console.log(`[VERIFICATION OTP] OTP (${otpCode}) for ${amount} ETB to ${recipient.fullName} (${recipient.email})`);

      res.json({ 
        success: true, 
        message: "SMS / Mail OTP sent!", 
        otpCode,
        recipientName: recipient.fullName,
        simulatedContact: recipient.phone || recipient.email
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Error generating verification code" });
    }
  });

  // 5. Conduct confirmed wallet balance transfer
  app.post("/api/wallet/transfer", async (req, res) => {
    try {
      const { senderEmail, recipientEmailOrPhone, amount, otpCode } = req.body;
      if (!senderEmail || !recipientEmailOrPhone || !amount || !otpCode) {
        return res.status(400).json({ error: "All properties are required." });
      }

      const normalizedSender = senderEmail.toLowerCase().trim();
      const normalizedRecipient = recipientEmailOrPhone.toLowerCase().trim();
      const storeKey = `${normalizedSender}:${normalizedRecipient}`;
      const savedOtp = otpStore.get(storeKey);

      if (!savedOtp || savedOtp.expires < Date.now() || savedOtp.code !== otpCode.toString().trim()) {
        return res.status(400).json({ error: "Invalid or expired verification code." });
      }

      const sender = await dbGetAccountByEmail(normalizedSender);
      const recipient = await dbGetAccountByIdentifier(normalizedRecipient);

      if (!sender || !recipient) {
        return res.status(404).json({ error: "Accounts mismatch." });
      }

      const validatedAmount = parseFloat(amount);
      if (parseFloat(sender.wallet_balance) < validatedAmount) {
        return res.status(400).json({ error: "Insufficient funds." });
      }

      // Perform transaction via simple updates
      await dbUpdateBalance(sender.email, parseFloat(sender.wallet_balance) - validatedAmount);
      await dbUpdateBalance(recipient.email, parseFloat(recipient.wallet_balance) + validatedAmount);

      otpStore.delete(storeKey);

      await dbAddTransaction({
        email: sender.email,
        type: "transfer_sent",
        amount: validatedAmount,
        currency: "ETB",
        description: `Transferred to ${recipient.fullName}`,
        method: recipient.fullName,
        status: "completed"
      });

      await dbAddTransaction({
        email: recipient.email,
        type: "transfer_received",
        amount: validatedAmount,
        currency: "ETB",
        description: `Received from ${sender.fullName}`,
        method: sender.fullName,
        status: "completed"
      });

      const updatedSender = await dbGetAccountByEmail(sender.email);

      res.json({ 
        success: true, 
        message: "Transfer completed successfully!", 
        updatedAccount: updatedSender 
      });
    } catch (error: any) {
      console.error("Transfer error:", error);
      res.status(500).json({ error: error.message || "Internal error doing transfer" });
    }
  });

  // 6. Deposit Endpoint (linked to Deposit forms in WalletSection)
  app.post("/api/wallet/deposit", async (req, res) => {
    try {
      const { email, amount, method } = req.body;
      if (!email || !amount) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      const inputAmount = parseFloat(amount);
      if (isNaN(inputAmount) || inputAmount <= 0) {
        return res.status(400).json({ error: "Hangi maallaqaa sirrii miti" });
      }

      const user = await dbGetAccountByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "Account not found." });
      }

      const newBalance = parseFloat(user.wallet_balance) + inputAmount;
      await dbUpdateBalance(user.email, newBalance);

      const newTx = await dbAddTransaction({
        email: user.email,
        type: "deposit",
        amount: inputAmount,
        currency: "ETB",
        description: `${(method || "telebirr").toUpperCase()} Deposit`,
        method: method || "telebirr",
        status: "completed"
      });

      const updatedAccount = await dbGetAccountByEmail(user.email);

      res.json({ success: true, updatedAccount, newTx });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Error processing deposit" });
    }
  });

  // 7. Get transaction history for an account
  app.get("/api/wallet/history", async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ error: "Email parameter required" });
      }

      const history = await dbGetTransactions(email as string);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Error retrieving transactions" });
    }
  });

  // 8. Get list of all users
  app.get("/api/wallet/users", async (req, res) => {
    try {
      const { email } = req.query;
      const usersList = await dbGetAllUsers(email as string);
      res.json(usersList);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Error getting users list" });
    }
  });
  // Socket.io qindeessuu (Signaling tajaajila bilbilaaf)
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;
  const distPath = path.join(process.cwd(), "dist");

  // Tajaajila Voice Call (Signaling)
  const users = new Map();

  io.on("connection", (socket) => {
    console.log("Fayyadamaan seeneera (Connected):", socket.id);

    // Gemini Live Session Bridge
    let geminiSession: any = null;

    socket.on("gemini-live-start", async ({ voice, mode, user1Lang, user2Lang, apiKey }) => {
      try {
        const keyToUse = (apiKey && apiKey.trim() !== "") ? apiKey.trim() : (process.env.GEMINI_API_KEY || "");
        const serverAi = new GoogleGenAI({
          apiKey: keyToUse
        });
        
        const langNames: Record<string, string> = {
          om: "Afaan Oromoo",
          en: "English",
          am: "Amharic",
          ar: "Arabic",
          tr: "Turkish",
          ti: "Tigrinya",
          so: "Somali"
        };

        let systemInstruction = "";
        if (mode === 'interpret') {
          systemInstruction = `You are a professional real-time interpreter. 
          Speaker 1 is speaking ${langNames[user1Lang] || "English"}. 
          Speaker 2 is speaking ${langNames[user2Lang] || "Afaan Oromoo"}. 
          When Speaker 1 talks, translate their message instantly to ${langNames[user2Lang] || "Afaan Oromoo"}. 
          When Speaker 2 talks, translate their message instantly to ${langNames[user1Lang] || "English"}. 
          Reply strictly with the translation. Keep it accurate and use a professional tone.`;
        } else {
          systemInstruction = `You are MULTI_SPHERE AI. Respond to the user concisely in ${langNames[user1Lang] || "English"}. You are talking in real-time.`;
        }

        console.log(`[socket] Starting Gemini Live connection for socket ${socket.id}...`);
        
        geminiSession = await serverAi.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          callbacks: {
            onopen: () => {
              console.log(`Gemini Live bridge opened for socket: ${socket.id}`);
              socket.emit("gemini-live-connected");
            },
            onmessage: (msg: any) => {
              // Extract real-time audio chunk
              const b64 = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
              if (b64) {
                socket.emit("gemini-live-audio", b64);
              }
              
              const modelText = msg.serverContent?.modelTurn?.parts?.map((p: any) => p.text).filter(Boolean).join(' ');
              if (modelText) {
                socket.emit("gemini-live-text", { role: "model", text: modelText });
              }

              const userText = msg.inputTranscription?.text;
              if (userText) {
                socket.emit("gemini-live-text", { role: "user", text: userText });
              }
            },
            onclose: () => {
              console.log(`Gemini Live bridge closed for socket: ${socket.id}`);
              socket.emit("gemini-live-disconnected");
            },
            onerror: (err: any) => {
              console.error(`Gemini Live error on socket ${socket.id}:`, err);
              socket.emit("gemini-live-error", err.message || "Live error");
            }
          },
          config: {
            responseModalities: [Modality.AUDIO, Modality.TEXT],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Kore' } } },
            systemInstruction
          }
        });
      } catch (err: any) {
        console.error("Failed to connect Gemini Live on server:", err);
        socket.emit("gemini-live-fallback-required", err.message || "Live connection failed");
      }
    });

    socket.on("gemini-live-audio-chunk", (base64Chunk) => {
      if (geminiSession) {
        try {
          geminiSession.sendRealtimeInput({
            media: { mimeType: 'audio/pcm;rate=16000', data: base64Chunk }
          });
        } catch (e: any) {
          console.error("Error sending live input chunk:", e);
        }
      }
    });

    socket.on("gemini-live-stop", () => {
      console.log(`Stopping Gemini Live connection for socket ${socket.id}...`);
      if (geminiSession) {
        try { geminiSession.close(); } catch (e) {}
        geminiSession = null;
      }
    });

    // Namoota seenaa jiran galmeessuu
    socket.on("join", (userId) => {
      if (!userId) return;
      users.set(userId, socket.id);
      io.emit("user-list", Array.from(users.keys()));
      console.log(`Fayyadamaan ${userId} socket ${socket.id} dhaan seeneera`);
    });

    socket.on("call-user", ({ to, offer, from }) => {
      const targetSocketId = users.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("incoming-call", { from, offer });
      }
    });

    socket.on("answer-call", ({ to, answer }) => {
      const targetSocketId = users.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-answered", { answer });
      }
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      const targetSocketId = users.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("ice-candidate", { candidate });
      }
    });

    // Yeroo namni disconnect ta'u
    socket.on("disconnect", () => {
      if (geminiSession) {
        try { geminiSession.close(); } catch (e) {}
        geminiSession = null;
      }

      for (const [userId, socketId] of users.entries()) {
        if (socketId === socket.id) {
          users.delete(userId);
          break;
        }
      }
      io.emit("user-list", Array.from(users.keys()));
      console.log("Fayyadamaan ba'eera:", socket.id);
    });
  });

  // Misoomaaf (Development mode) Vite fayyadamuu
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production keessatti dist folder irraa file-oota fiduu
    app.use(express.static(distPath));
    // Kaffaltii fi tajaajila biroo hundaaf (Catch-all route for SPA)
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Server sa'aatii 3000 irratti dhaggeeffachuu jalqaba
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server sa'aatii 3000 irratti dalagaa jira: http://localhost:${PORT}`);
  });
}

startServer();
