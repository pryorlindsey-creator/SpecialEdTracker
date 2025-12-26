import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Simple admin login endpoint
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error("ADMIN_USERNAME or ADMIN_PASSWORD not set");
      return res.status(500).json({ message: "Server configuration error" });
    }

    if (username === adminUsername && password === adminPassword) {
      // Create user session
      const userId = "admin-" + adminUsername;
      
      // Upsert admin user in database
      await storage.upsertUser({
        id: userId,
        email: `${adminUsername}@admin.local`,
        firstName: "Admin",
        lastName: "User",
        profileImageUrl: null,
      });

      // Set session
      (req.session as any).user = {
        claims: {
          sub: userId,
          email: `${adminUsername}@admin.local`,
          first_name: "Admin",
          last_name: "User",
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        console.log("Admin login successful for:", username);
        return res.json({ 
          message: "Login successful",
          user: {
            id: userId,
            email: `${adminUsername}@admin.local`,
            firstName: "Admin",
            lastName: "User",
          }
        });
      });
    } else {
      console.log("Failed login attempt for:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }
  });

  // Login page (GET) - redirect or show status
  app.get("/api/login", (req, res) => {
    if ((req.session as any).user) {
      return res.redirect("/");
    }
    return res.json({ message: "Please POST to /api/login with username and password" });
  });

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });

  // Get current user endpoint
  app.get("/api/auth/user", (req, res) => {
    const user = (req.session as any).user;
    if (user) {
      return res.json({
        id: user.claims.sub,
        email: user.claims.email,
        firstName: user.claims.first_name,
        lastName: user.claims.last_name,
      });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user) {
    console.log("Auth check failed - no user in session");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (user.expires_at && now > user.expires_at) {
    console.log("Auth check failed - session expired");
    return res.status(401).json({ message: "Session expired" });
  }

  // Attach user info to request for downstream use
  (req as any).user = user;
  return next();
};
