import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import * as xlsx from "xlsx";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const PORT = 3000;

function getResolvePath(fileName: string): string {
  const paths = [
    path.join(process.cwd(), "src", "db", fileName),
    path.join(process.cwd(), "db", fileName),
    path.join(__dirname, "src", "db", fileName),
    path.join(__dirname, "..", "src", "db", fileName),
    path.join(__dirname, "db", fileName),
    path.join(__dirname, "..", "db", fileName),
    path.join("/var/task", "src", "db", fileName),
    path.join("/var/task", "db", fileName),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      console.log(`Resolved path for ${fileName}: ${p}`);
      return p;
    }
  }
  return path.join(process.cwd(), "src", "db", fileName); // Fallback
}

const DB_PATH = getResolvePath("db.json");

// Initialize cachedDB with local data immediately so we ALWAYS have data to serve instantly
let cachedDB: any = null;
cachedDB = readDB();
let dbPool: any = null;
let lastDbFetchTime = Date.now(); // Start fresh
let lastWriteTime = 0; // Tracks last write operation time to protect against background sync race conditions
const DB_CACHE_TTL_MS = 5000; // 5 seconds Time-to-Live (TTL) cache for serverless environments

// Initialize PostgreSQL database
async function initDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("No DATABASE_URL found. Using local JSON database (db.json).");
    return;
  }

  console.log("DATABASE_URL found. Initializing PostgreSQL pool...");
  try {
    dbPool = new Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes("supabase.co") || dbUrl.includes("render.com") || dbUrl.includes("elephantsql.com") || dbUrl.includes("neon.tech") || dbUrl.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 10000, // 10 seconds timeout to connect (allows Neon to wake up from idle)
      query_timeout: 10000,           // 10 seconds query execution timeout
    });

    try {
      // Fetch existing data directly to optimize speed (saves multiple roundtrips on healthy boots)
      const res = await dbPool.query("SELECT data FROM system_db WHERE id = 1");
      if (res.rows.length > 0) {
        cachedDB = res.rows[0].data;
        lastDbFetchTime = Date.now();
        console.log("Loaded database from PostgreSQL (Supabase/Neon).");
        
        // AUTO-REPAIR: If questions list is missing or corrupted, populate with default questions
        if (!cachedDB || !cachedDB.questions) {
          console.log("PostgreSQL data has 0 questions. Auto-repairing with default questions...");
          const defaultQuestionsPath = getResolvePath("default_questions.json");
          let initialQuestions = [];
          if (fs.existsSync(defaultQuestionsPath)) {
            try {
              initialQuestions = JSON.parse(fs.readFileSync(defaultQuestionsPath, "utf-8"));
            } catch (e) {
              console.error("Error loading default questions during auto-repair:", e);
            }
          }
          if (!cachedDB) cachedDB = {};
          cachedDB.questions = initialQuestions;
          
          // Ensure other fields are present
          const localData = readDB();
          if (!cachedDB.users || cachedDB.users.length === 0) cachedDB.users = localData.users || [];
          if (!cachedDB.departments || cachedDB.departments.length === 0) cachedDB.departments = localData.departments || [];
          if (!cachedDB.examsList || cachedDB.examsList.length === 0) cachedDB.examsList = localData.examsList || [];
          if (!cachedDB.exams) cachedDB.exams = localData.exams || { isOfficialActive: false };
          if (!cachedDB.news) cachedDB.news = localData.news || [];
          if (!cachedDB.documents) cachedDB.documents = localData.documents || [];
          if (!cachedDB.settings) cachedDB.settings = localData.settings || {};
          if (!cachedDB.logs) cachedDB.logs = localData.logs || [];
          if (!cachedDB.examResults) cachedDB.examResults = localData.examResults || [];
          
          await dbPool.query("UPDATE system_db SET data = $1 WHERE id = 1", [JSON.stringify(cachedDB)]);
          console.log("Auto-repaired PostgreSQL database with default data.");
        }
      } else {
        console.log("No row found with id=1 in system_db. Initializing default row...");
        const localData = readDB(); 
        await dbPool.query("INSERT INTO system_db (id, data) VALUES (1, $1)", [JSON.stringify(localData)]);
        cachedDB = localData;
        lastDbFetchTime = Date.now();
        console.log("Initialized PostgreSQL row 1 with default data.");
      }
    } catch (queryErr: any) {
      // If table doesn't exist, create and seed it
      if (queryErr.code === "42P01" || (queryErr.message && queryErr.message.toLowerCase().includes("relation") && queryErr.message.toLowerCase().includes("does not exist"))) {
        console.log("Table system_db does not exist. Creating and seeding...");
        await dbPool.query(`
          CREATE TABLE IF NOT EXISTS system_db (
            id INT PRIMARY KEY,
            data JSONB
          )
        `);
        const localData = readDB(); 
        await dbPool.query("INSERT INTO system_db (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [JSON.stringify(localData)]);
        cachedDB = localData;
        lastDbFetchTime = Date.now();
        console.log("Created table system_db and seeded it.");
      } else {
        throw queryErr; // Rethrow other database execution errors
      }
    }
  } catch (error) {
    console.error("Failed to initialize PostgreSQL. Falling back to local db.json:", error);
    dbPool = null;
  }
}

// Helper to read database
function readDB() {
  if (cachedDB) {
    return cachedDB;
  }
  try {
    if (!fs.existsSync(DB_PATH)) {
      const defaultQuestionsPath = getResolvePath("default_questions.json");
      let initialQuestions = [];
      if (fs.existsSync(defaultQuestionsPath)) {
        try {
          initialQuestions = JSON.parse(fs.readFileSync(defaultQuestionsPath, "utf-8"));
        } catch (e) {
          console.error("Error loading default questions:", e);
        }
      }
      cachedDB = {
        users: [],
        departments: [],
        questions: initialQuestions,
        exams: { isOfficialActive: false },
        examsList: [
          {
            id: "exam_1",
            title: "Kỳ thi chính thức đợt 1",
            durationMinutes: 30,
            easyCount: 20,
            mediumCount: 20,
            hardCount: 10,
            isActive: false,
            allowedAttempts: 1,
            shuffleQuestions: true,
            shuffleOptions: true
          }
        ],
        examResults: [],
        news: [],
        documents: [],
        settings: {},
        logs: []
      };
      return cachedDB;
    }
    const data = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(data);
    let modified = false;
    if (parsed.users) {
      const hoangUser = parsed.users.find((u: any) => u.email === "hoang1298999998@gmail.com");
      if (hoangUser && hoangUser.role !== "admin") {
        hoangUser.role = "admin";
        modified = true;
      }
    }
    if (!parsed.examsList) {
      parsed.examsList = [
        {
          id: "exam_1",
          title: "Kỳ thi chính thức đợt 1",
          durationMinutes: 30,
          easyCount: 20,
          mediumCount: 20,
          hardCount: 10,
          isActive: false,
          allowedAttempts: 1,
          shuffleQuestions: true,
          shuffleOptions: true
        }
      ];
      modified = true;
    }
    if (!parsed.logs) {
      parsed.logs = [];
      modified = true;
    }
    if (modified) {
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), "utf-8");
      } catch (writeErr) {
        console.warn("Database is read-only in this environment. Skipping write back.");
      }
    }
    cachedDB = parsed;
    return cachedDB;
  } catch (error) {
    console.error("Error reading database:", error);
    cachedDB = {
      users: [],
      departments: [],
      questions: [],
      exams: { isOfficialActive: false },
      examsList: [
        {
          id: "exam_1",
          title: "Kỳ thi chính thức đợt 1",
          durationMinutes: 30,
          easyCount: 20,
          mediumCount: 20,
          hardCount: 10,
          isActive: false,
          allowedAttempts: 1,
          shuffleQuestions: true,
          shuffleOptions: true
        }
      ],
      examResults: [],
      news: [],
      documents: [],
      settings: {},
      logs: []
    };
    return cachedDB;
  }
}

// Helper to write database
async function writeDB(data: any) {
  cachedDB = data;
  lastDbFetchTime = Date.now(); // Update cache freshness
  lastWriteTime = Date.now(); // Track last write timestamp
  try {
    // Asynchronous non-blocking file writes to avoid freezing the event loop
    await fs.promises.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    // Also keep default_questions.json in sync with questions to prevent loss upon redeployment/rebuild
    const defaultQuestionsPath = getResolvePath("default_questions.json");
    if (data.questions) {
      await fs.promises.writeFile(defaultQuestionsPath, JSON.stringify(data.questions, null, 2), "utf-8");
    }
  } catch (error) {
    console.error("Error writing database to file:", error);
  }

  if (dbPool) {
    try {
      await dbPool.query("UPDATE system_db SET data = $1 WHERE id = 1", [JSON.stringify(data)]);
      console.log("PostgreSQL system_db updated successfully.");
    } catch (err) {
      console.error("Error updating system_db in PostgreSQL:", err);
    }
  }
}

// Ensure database has questions padded up to 50 if needed
function ensureQuestionCount() {
  // Disabled database-level padding to allow users to delete questions permanently.
  // Dynamic padding is handled on-the-fly in the exam generation endpoint.
}

// Robust Fisher-Yates (Knuth) shuffle algorithm to ensure uniform distribution
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

// Run initial pad check
ensureQuestionCount();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let initPromise: Promise<void> | null = null;
let syncPromise: Promise<void> | null = null;

async function ensureDatabaseInitialized(isApiRequest: boolean = false, method: string = "GET") {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  
  if (!isApiRequest) {
    return;
  }

  try {
    await initPromise;
  } catch (err) {
    console.error("Error waiting for initPromise:", err);
  }
  
  // Real-time serverless sync: Pull the latest data from PostgreSQL only for API requests, and only if cache is expired
  if (dbPool && isApiRequest) {
    const isWrite = method !== "GET";
    const now = Date.now();
    
    if (isWrite) {
      // For writing requests, we MUST block and fetch the absolute latest data from PostgreSQL
      // to prevent any race conditions, stale cache reads, or concurrent overwrites.
      try {
        console.log(`Syncing database from PostgreSQL synchronously for write request (${method} ${now})...`);
        
        // Await any pending background sync so it finishes BEFORE we do our synchronous read
        if (syncPromise) {
          try {
            await syncPromise;
          } catch (e) {
            console.warn("Error awaiting running syncPromise during write request:", e);
          }
        }
        
        const res = await dbPool.query("SELECT data FROM system_db WHERE id = 1");
        if (res.rows.length > 0) {
          cachedDB = res.rows[0].data;
          console.log("Database successfully synchronized synchronously for write request.");
        }
        lastDbFetchTime = Date.now(); // Update TTL so subsequent GET requests have warm cache
        lastWriteTime = Date.now(); // Align write timestamp
      } catch (err) {
        console.error("Error synchronizing cachedDB synchronously for write request:", err);
      }
    } else {
      // For GET requests, pull the latest data from PostgreSQL in background if cache is expired
      if (now - lastDbFetchTime > DB_CACHE_TTL_MS) {
        if (!syncPromise) {
          const syncStartTime = Date.now();
          syncPromise = (async () => {
            try {
              console.log("Syncing database from PostgreSQL in background...");
              const res = await dbPool.query("SELECT data FROM system_db WHERE id = 1");
              if (res.rows.length > 0) {
                // Only overwrite if no write has happened since this sync started!
                if (lastWriteTime < syncStartTime) {
                  cachedDB = res.rows[0].data;
                  console.log("Database successfully synchronized from PostgreSQL.");
                } else {
                  console.log("Skipping background sync overwrite because a write operation occurred in the meantime.");
                }
              }
            } catch (err) {
              console.error("Error synchronizing cachedDB from PostgreSQL in middleware:", err);
            } finally {
              lastDbFetchTime = Date.now(); // Set cooldown to avoid immediate retries on connection error or sleep
              syncPromise = null;
            }
          })();
        }

        // If we already have a cached DB, DO NOT block the API request!
        // This ensures 100% immediate load times and bypasses Vercel 504 Gateway Timeouts on cold starts.
        if (cachedDB) {
          console.log("Serving from warm cache, refreshing from PostgreSQL in background.");
        } else {
          await syncPromise;
        }
      }
    }
  }
}

app.use(async (req, res, next) => {
  // Prevent API caching across all browsers and CDNs
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }
  try {
    const isApi = req.path.startsWith("/api/");
    await ensureDatabaseInitialized(isApi, req.method);
  } catch (err) {
    console.error("Database initialization failed in middleware:", err);
  }
  next();
});

// Initialize Gemini AI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Password hashing/encoding (Base64 encryption for bulletproof container compatibility)
const encryptPassword = (pw: string) => Buffer.from(pw).toString("base64");
const decryptPassword = (hash: string) => Buffer.from(hash, "base64").toString("utf-8");

// In-memory active takers registry for real-time tracking
const activeTakers: { [email: string]: { email: string; name: string; department: string; chiBo?: string; examType: string; startTime: number; lastActive: number } } = {};

  // API: Get full database state (for admin/dashboard or initialization)
  app.get("/api/db", (req, res) => {
    res.json(readDB());
  });

  // API: Active Exam Takers Registry
  app.get("/api/exams/active-takers", (req, res) => {
    const now = Date.now();
    // Clean up stale takers who didn't ping for more than 15 seconds
    Object.keys(activeTakers).forEach((email) => {
      if (now - activeTakers[email].lastActive > 15000) {
        delete activeTakers[email];
      }
    });
    res.json({ success: true, activeTakers: Object.values(activeTakers) });
  });

  app.post("/api/exams/ping", (req, res) => {
    const { email, name, department, chiBo, examType } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Missing email" });
    }
    const now = Date.now();
    if (!activeTakers[email]) {
      activeTakers[email] = {
        email,
        name: name || "Đồng chí ẩn danh",
        department: department || "Cơ quan",
        chiBo: chiBo || "",
        examType: examType || "practice",
        startTime: now,
        lastActive: now
      };
    } else {
      activeTakers[email].lastActive = now;
    }
    res.json({ success: true });
  });

  app.post("/api/exams/end-ping", (req, res) => {
    const { email } = req.body;
    if (email && activeTakers[email]) {
      delete activeTakers[email];
    }
    res.json({ success: true });
  });

  // API: System logs persistence
  app.get("/api/logs", (req, res) => {
    const db = readDB();
    res.json({ success: true, logs: db.logs || [] });
  });

  app.post("/api/logs", async (req, res) => {
    const { user, action } = req.body;
    const db = readDB();
    if (!db.logs) db.logs = [];
    const newLog = {
      id: `log_${Date.now()}`,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toLocaleDateString("vi-VN"),
      user: user || "Hệ thống",
      action: action || "",
      ip: req.ip || "127.0.0.1"
    };
    db.logs.unshift(newLog);
    if (db.logs.length > 500) {
      db.logs = db.logs.slice(0, 500);
    }
    await writeDB(db);
    res.json({ success: true, log: newLog });
  });

  // API: Authentication - Login
  app.post("/api/auth/login", (req, res) => {
    const { loginId, password } = req.body; // loginId can be email, phone or username
    const cleanLoginId = (loginId || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();
    const db = readDB();
    const user = db.users.find((u: any) => {
      const emailMatch = u.email && u.email.toLowerCase().trim() === cleanLoginId;
      const phoneMatch = u.phone && u.phone.trim() === cleanLoginId;
      const usernameMatch = u.username && u.username.toLowerCase().trim() === cleanLoginId;
      return (emailMatch || phoneMatch || usernameMatch) && decryptPassword(u.password) === cleanPassword;
    });

    if (user) {
      if (user.status === "locked") {
        return res.status(403).json({ success: false, message: "Tài khoản của đồng chí hiện đang bị khóa! Vui lòng liên hệ Ban tổ chức." });
      }
      // Remove password for security in response
      const { password: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } else {
      res.status(401).json({ success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" });
    }
  });

  // API: Authentication - Register
  app.post("/api/auth/register", async (req, res) => {
    const { fullName, email, phone, password, department, title } = req.body;
    const db = readDB();

    if (db.users.some((u: any) => u.email === email || u.phone === phone)) {
      return res.status(400).json({ success: false, message: "Email hoặc số điện thoại đã tồn tại!" });
    }

    const deptString = department || "Đơn vị cơ sở";
    const parts = deptString.split(",");
    const chiBo = parts[0]?.trim() || "";
    const primaryDept = parts.slice(1).join(",").trim() || parts[0]?.trim() || "Đơn vị cơ sở";

    const isSystemAdmin = email === "hoang1298999998@gmail.com" || email.toLowerCase().includes("admin");

    const newUser = {
      id: `u_${Date.now()}`,
      email,
      phone,
      password: encryptPassword(password),
      fullName,
      role: isSystemAdmin ? "admin" : "candidate",
      title: title || (isSystemAdmin ? "Quản trị viên" : "Bí thư Chi bộ"),
      department: primaryDept,
      chiBo: chiBo,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop`
    };

    db.users.push(newUser);
    await writeDB(db);

    const { password: _, ...safeUser } = newUser;
    res.json({ success: true, user: safeUser });
  });

  // API: Authentication - Change Password
  app.post("/api/auth/change-password", async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    const db = readDB();
    const userIndex = db.users.findIndex((u: any) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    }

    const user = db.users[userIndex];
    if (decryptPassword(user.password) !== oldPassword) {
      return res.status(400).json({ success: false, message: "Mật khẩu cũ không chính xác!" });
    }

    user.password = encryptPassword(newPassword);
    db.users[userIndex] = user;
    await writeDB(db);

    res.json({ success: true, message: "Đổi mật khẩu thành công!" });
  });

  // API: Authentication - Forgot Password
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { loginId } = req.body;
    const db = readDB();
    const user = db.users.find((u: any) => u.email === loginId || u.phone === loginId);

    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông tin tài khoản với email/SĐT này!" });
    }

    // Reset password to "123456" as dynamic fallback
    user.password = encryptPassword("123456");
    await writeDB(db);

    res.json({
      success: true,
      message: `Mật khẩu của bạn đã được khôi phục về mặc định: "123456". Vui lòng đăng nhập và đổi lại mật khẩu!`
    });
  });

  // API: Get Random 50 Questions (with guarantees & shuffling settings)
  app.get("/api/questions/exam", (req, res) => {
    const { examId } = req.query;
    const db = readDB();
    
    let config = db.settings?.examConfig;
    if (examId && db.examsList) {
      const targetExam = db.examsList.find((e: any) => e.id === examId);
      if (targetExam) {
        config = {
          easyCount: targetExam.easyCount,
          mediumCount: targetExam.mediumCount,
          hardCount: targetExam.hardCount,
          totalCount: Number(targetExam.easyCount || 20) + Number(targetExam.mediumCount || 20) + Number(targetExam.hardCount || 10),
          shuffleQuestions: targetExam.shuffleQuestions,
          shuffleOptions: targetExam.shuffleOptions
        };
      }
    }

    if (!config) {
      config = db.settings?.examConfig || {
        easyCount: 20,
        mediumCount: 20,
        hardCount: 10,
        totalCount: 50,
        shuffleQuestions: true,
        shuffleOptions: true
      };
    }

    const easyCount = Number(config.easyCount) || 20;
    const mediumCount = Number(config.mediumCount) || 20;
    const hardCount = Number(config.hardCount) || 10;
    const totalCount = Number(config.totalCount) || 50;

    let originalQuestions = db.questions || [];

    // Helper to categorize default questions if no strict difficulty
    const classifyQuestion = (q: any, index: number) => {
      const diff = (q.difficulty || "").toString().toLowerCase().trim();
      if (diff === "khó" || diff === "hard") return "hard";
      if (diff === "trung bình" || diff === "medium" || diff === "tb") return "medium";
      if (diff === "dễ" || diff === "easy") return "easy";
      
      // Fallback distribution based on index
      if (index % 3 === 0) return "hard";
      if (index % 3 === 1) return "medium";
      return "easy";
    };

    const easyList = shuffleArray(originalQuestions.filter((q: any, i: number) => classifyQuestion(q, i) === "easy"));
    const mediumList = shuffleArray(originalQuestions.filter((q: any, i: number) => classifyQuestion(q, i) === "medium"));
    const hardList = shuffleArray(originalQuestions.filter((q: any, i: number) => classifyQuestion(q, i) === "hard"));

    let selected: any[] = [];
    selected = selected.concat(easyList.slice(0, easyCount));
    selected = selected.concat(mediumList.slice(0, mediumCount));
    selected = selected.concat(hardList.slice(0, hardCount));

    // Fill the rest if we didn't reach totalCount
    if (selected.length < totalCount && originalQuestions.length > 0) {
      const remaining = shuffleArray(originalQuestions.filter((q: any) => !selected.some(s => s.id === q.id)));
      selected = selected.concat(remaining.slice(0, totalCount - selected.length));
    }

    // Pad dynamically if still not enough questions
    if (selected.length < totalCount && selected.length > 0) {
      let counter = 1;
      while (selected.length < totalCount) {
        const item = selected[counter % selected.length];
        selected.push({
          ...item,
          id: Date.now() + selected.length,
          text: `${item.text} (Câu hỏi bổ sung ${selected.length + 1})`
        });
        counter++;
      }
    }

    // Limit to exactly totalCount
    let examSet = selected.slice(0, totalCount);

    // Shuffle questions order if configured
    if (config.shuffleQuestions !== false) {
      examSet = shuffleArray(examSet);
    }

    // Clean option prefix texts for all questions to prevent duplicate prefix rendering (e.g., A. A. Option Text)
    examSet = examSet.map((q: any) => {
      if (q.options && Array.isArray(q.options)) {
        q.options = q.options.map((opt: string) => {
          if (typeof opt !== "string") return opt;
          return opt.replace(/^[A-Da-d][\.\-\)\s\:]+/, "").trim();
        });
      }
      return q;
    });

    // Shuffle option positions if configured
    if (config.shuffleOptions !== false) {
      examSet = examSet.map((q: any) => {
        if (!q.options || !Array.isArray(q.options)) return q;
        
        // Clean option texts and filter out empty options to support 3-option or 4-option questions properly
        const originalCorrectAnswer = Number(q.correctAnswer);
        const validOptionsWithMeta = q.options
          .map((opt: any, idx: number) => ({
            text: (typeof opt === "string" ? opt.trim() : String(opt || "")).trim(),
            originalIdx: idx
          }))
          .filter((item: any) => item.text !== "");

        if (validOptionsWithMeta.length < 2) {
          return {
            ...q,
            options: validOptionsWithMeta.map((item: any) => item.text)
          };
        }

        // Map options to state correct vs incorrect for shuffling
        const mappedForShuffle = validOptionsWithMeta.map((item: any) => ({
          text: item.text,
          isCorrect: item.originalIdx === originalCorrectAnswer
        }));

        // Shuffle the options
        const shuffledMapped = shuffleArray(mappedForShuffle);

        const newOptions = shuffledMapped.map((m: any) => m.text);
        const newCorrectIdx = shuffledMapped.findIndex((m: any) => m.isCorrect);

        return {
          ...q,
          options: newOptions,
          correctAnswer: newCorrectIdx !== -1 ? newCorrectIdx : 0
        };
      });
    }

    res.json(examSet);
  });

  // API: Submit Exam
  app.post("/api/exams/submit", async (req, res) => {
    const { userEmail, userName, userDepartment, userChiBo, userPhone, userTitle, score, correctCount, wrongCount, durationSeconds, type, examId, answers, questions } = req.body;
    const db = readDB();

    // Verify if official exam and check maximum attempts limit
    if (type === "official") {
      const targetExamId = examId || "exam_1";
      const targetExam = db.examsList?.find((e: any) => e.id === targetExamId);
      const allowedAttempts = targetExam ? Number(targetExam.allowedAttempts || 1) : 1;
      
      const takenCount = db.examResults.filter((r: any) => {
        const emailMatch = r.userEmail && userEmail && r.userEmail.toLowerCase().trim() === userEmail.toLowerCase().trim();
        const examMatch = (r.examId === targetExamId || (!r.examId && targetExamId === "exam_1")) && r.type === "official";
        return emailMatch && examMatch;
      }).length;
      if (takenCount >= allowedAttempts) {
        return res.status(400).json({ success: false, message: `Đồng chí đã đạt số lần thi tối đa cho kỳ thi này (Tối đa ${allowedAttempts} lượt)!` });
      }
    }

    const newResult = {
      id: `er_${Date.now()}`,
      userEmail,
      userName,
      userDepartment: userDepartment || "Cơ quan",
      userChiBo: userChiBo || "",
      userPhone: userPhone || "",
      userTitle: userTitle || "Bí thư Chi bộ",
      score: parseFloat(score.toFixed(2)),
      correctCount,
      wrongCount,
      durationSeconds,
      date: new Date().toISOString(),
      type: type || "practice",
      examId: examId || "exam_1",
      answers: answers || {},
      questions: questions || []
    };

    db.examResults.push(newResult);
    await writeDB(db);

    res.json({ success: true, result: newResult });
  });

  // API: Export Questions to Excel
  app.get("/api/questions/export", (req, res) => {
    const db = readDB();
    const formattedQuestions = db.questions.map((q: any) => ({
      "Mã câu hỏi": q.id,
      "Nội dung câu hỏi": q.text,
      "Danh mục": q.category || "Văn kiện Đảng",
      "Chủ đề": q.topic || "Công tác Đảng",
      "Mức độ": q.difficulty || "Dễ",
      "Phương án A": q.options[0] || "",
      "Phương án B": q.options[1] || "",
      "Phương án C": q.options[2] || "",
      "Phương án D": q.options[3] || "",
      "Đáp án đúng (0-3)": q.correctAnswer,
      "Giải thích": q.explanation || "",
      "Loại đính kèm": q.type || "text",
      "Đường dẫn đính kèm": q.attachmentUrl || ""
    }));

    // If there are no questions, generate a guiding sample question template row
    if (formattedQuestions.length === 0) {
      formattedQuestions.push({
        "Mã câu hỏi": 1,
        "Nội dung câu hỏi": "Ví dụ: Đại hội đại biểu toàn quốc lần thứ XIII của Đảng Cộng sản Việt Nam diễn ra vào năm nào?",
        "Danh mục": "Văn kiện Đảng",
        "Chủ đề": "Công tác Đảng",
        "Mức độ": "Dễ",
        "Phương án A": "2020",
        "Phương án B": "2021",
        "Phương án C": "2022",
        "Phương án D": "2023",
        "Đáp án đúng (0-3)": 1,
        "Giải thích": "Đại hội XIII của Đảng diễn ra từ ngày 25/1 đến ngày 1/2/2021 tại Thủ đô Hà Nội.",
        "Loại đính kèm": "text",
        "Đường dẫn đính kèm": ""
      });
    }

    const worksheet = xlsx.utils.json_to_sheet(formattedQuestions);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "NganHangCauHoi");

    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });
    res.setHeader("Content-Disposition", "attachment; filename=NganHangCauHoi_BiThuGioi2026.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  });

  // API: Clear all questions
  app.post("/api/questions/clear", async (req, res) => {
    try {
      const db = readDB();
      db.questions = [];
      await writeDB(db);
      res.json({ success: true, message: "Đã xóa toàn bộ câu hỏi thành công!" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // API: Restore default questions
  app.post("/api/questions/restore-default", async (req, res) => {
    try {
      const defaultQuestionsPath = getResolvePath("default_questions.json");
      let initialQuestions = [];
      if (fs.existsSync(defaultQuestionsPath)) {
        initialQuestions = JSON.parse(fs.readFileSync(defaultQuestionsPath, "utf-8"));
      }
      const db = readDB();
      db.questions = initialQuestions;
      await writeDB(db);
      res.json({ success: true, count: initialQuestions.length, message: "Khôi phục ngân hàng câu hỏi mặc định thành công!" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // API: Import Questions from JSON or Formatted Excel Upload
  app.post("/api/questions/import", async (req, res) => {
    try {
      const { questionsList } = req.body;
      if (!Array.isArray(questionsList)) {
        return res.status(400).json({ success: false, message: "Dữ liệu nhập vào không hợp lệ!" });
      }

      const db = readDB();
      let maxId = db.questions.length > 0 ? Math.max(...db.questions.map((q: any) => q.id)) : 0;

      let addedCount = 0;
      let updatedCount = 0;

      const updatedQuestions = [...db.questions];

      questionsList.forEach((q: any, index: number) => {
        const text = (q.text || "").trim();
        if (!text) return;

        // Find existing question by text
        const existingIndex = updatedQuestions.findIndex(
          (item: any) => item.text.toLowerCase().trim() === text.toLowerCase().trim()
        );

        if (existingIndex !== -1) {
          // Update existing question
          updatedQuestions[existingIndex] = {
            ...updatedQuestions[existingIndex],
            options: Array.isArray(q.options) ? q.options : updatedQuestions[existingIndex].options,
            correctAnswer: typeof q.correctAnswer === "number" ? q.correctAnswer : updatedQuestions[existingIndex].correctAnswer,
            explanation: q.explanation || updatedQuestions[existingIndex].explanation,
            type: q.type || updatedQuestions[existingIndex].type || "text",
            category: q.category || updatedQuestions[existingIndex].category || "Văn kiện Đảng",
            topic: q.topic || updatedQuestions[existingIndex].topic || "Công tác Đảng",
            difficulty: q.difficulty || updatedQuestions[existingIndex].difficulty || "Dễ",
            attachmentUrl: q.attachmentUrl || updatedQuestions[existingIndex].attachmentUrl || ""
          };
          updatedCount++;
        } else {
          // Add as new question
          maxId++;
          updatedQuestions.push({
            id: maxId,
            text,
            options: Array.isArray(q.options) ? q.options : ["A", "B", "C", "D"],
            correctAnswer: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
            explanation: q.explanation || "Đang cập nhật giải thích...",
            type: q.type || "text",
            category: q.category || "Văn kiện Đảng",
            topic: q.topic || "Công tác Đảng",
            difficulty: q.difficulty || "Dễ",
            attachmentUrl: q.attachmentUrl || ""
          });
          addedCount++;
        }
      });

      db.questions = updatedQuestions;
      await writeDB(db);
      ensureQuestionCount();

      res.json({ 
        success: true, 
        count: addedCount + updatedCount, 
        message: `Nhập câu hỏi thành công! Thêm mới: ${addedCount}, Cập nhật: ${updatedCount}` 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // API: Manage Admin Settings & Entities
  app.post("/api/settings/update", async (req, res) => {
    const { settings, questions, news, documents, exams, users, departments, examResults, examsList, logs, logActor, logAction } = req.body;
    const db = readDB();

    if (settings) db.settings = { ...db.settings, ...settings };
    if (questions) db.questions = questions;
    if (news) db.news = news;
    if (documents) db.documents = documents;
    if (exams) db.exams = { ...db.exams, ...exams };
    if (users) db.users = users;
    if (departments) db.departments = departments;
    if (examResults) db.examResults = examResults;
    if (examsList) db.examsList = examsList;
    if (logs) db.logs = logs;

    // Persist automated audit logs if log action is provided
    if (logActor && logAction) {
      if (!db.logs) db.logs = [];
      db.logs.unshift({
        id: `log_${Date.now()}`,
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        date: new Date().toLocaleDateString("vi-VN"),
        user: logActor,
        action: logAction,
        ip: req.ip || "127.0.0.1"
      });
      if (db.logs.length > 500) {
        db.logs = db.logs.slice(0, 500);
      }
    }

    await writeDB(db);
    ensureQuestionCount();
    res.json({ success: true, message: "Cập nhật dữ liệu hệ thống thành công!" });
  });

  // API: Post Comment to News Article
  app.post("/api/news/:id/comment", async (req, res) => {
    const { id } = req.params;
    const { user, text } = req.body;
    const db = readDB();
    const articleIndex = db.news.findIndex((n: any) => n.id === id);

    if (articleIndex === -1) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài viết!" });
    }

    const article = db.news[articleIndex];
    if (!article.comments) article.comments = [];

    article.comments.push({
      user,
      text,
      date: new Date().toISOString()
    });

    db.news[articleIndex] = article;
    await writeDB(db);

    res.json({ success: true, article });
  });

  // API: AI Chatbot (Grounding and constraint checks)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const db = readDB();

      // Collect context of documents and questions
      const docList = db.documents.map((d: any) => `- Tiêu đề: "${d.title}", Định dạng: "${d.format}", Phân loại: "${d.category}"`).join("\n");
      const questionList = db.questions.slice(0, 15).map((q: any) => `- Câu hỏi: "${q.text}"\n  Các lựa chọn: ${q.options.join(", ")}\n  Đáp án đúng: ${q.options[q.correctAnswer]}\n  Giải thích: ${q.explanation}`).join("\n\n");

      const systemInstruction = `
Bạn là Trợ lý AI chuyên nghiệp phục vụ cuộc thi "Bí thư Chi bộ giỏi 2026" của các cơ quan Đảng và Quân đội Nhân dân Việt Nam.

QUY TẮC TUYỆT ĐỐI:
1. Bạn CHỈ được phép trả lời các câu hỏi dựa trên các thông tin tài liệu và câu hỏi chính thức sau đây từ cơ sở dữ liệu:
TÀI LIỆU HỌC TẬP HIỆN CÓ:
${docList}

MỘT SỐ CÂU HỎI TRONG NGÂN HÀNG ĐỀ THI:
${questionList}

2. Nếu câu hỏi của người dùng KHÔNG THỂ tìm thấy câu trả lời trực tiếp hoặc gián tiếp rõ ràng từ thông tin tài liệu và ngân hàng câu hỏi trên, bạn BẮT BUỘC PHẢI TRẢ LỜI ĐÚNG NGUYÊN VĂN CỤM TỪ SAU ĐÂY:
"Tôi chưa tìm thấy nội dung này trong hệ thống."
Không được thêm bớt từ nào khác, không được sáng tạo thông tin ngoài lề, không được tự ý giải thích từ kiến thức huấn luyện của mình khi không có trong dữ liệu cung cấp.

3. Hãy trả lời ngắn gọn, trang trọng, lịch sự, đúng mực chính trị.
`;

      if (process.env.GEMINI_API_KEY) {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: message,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.2
          }
        });

        res.json({ success: true, reply: response.text });
      } else {
        // Fallback response for missing API key
        res.json({
          success: true,
          reply: `Hệ thống chưa cấu hình GEMINI_API_KEY. Để tôi trả lời dựa trên bộ từ khóa: ${message.toLowerCase().includes("điều lệ") ? "Vui lòng xem tài liệu 'Điều lệ Đảng Cộng sản Việt Nam hiện hành' tại tab Tài liệu." : "Tôi chưa tìm thấy nội dung này trong hệ thống."}`
        });
      }
    } catch (error: any) {
      console.error("AI Chatbot Error:", error);
      res.status(500).json({ success: false, reply: "Tôi chưa tìm thấy nội dung này trong hệ thống." });
    }
  });

export default app;

async function bootstrap() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  bootstrap().catch(console.error);
}
