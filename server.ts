import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "rsvp-data.json");

interface RSVPState {
  yesCount: number;
  noCount: number;
  totalGuests: number;
}

// Ensure database file exists or initialize it
async function initDataFile(): Promise<RSVPState> {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data) as RSVPState;
  } catch (error) {
    const initialData: RSVPState = {
      yesCount: 28, // Give it a beautiful, small initial count so it doesn't look empty and sad on day one
      noCount: 2,
      totalGuests: 42,
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/rsvp", async (req, res) => {
    try {
      const data = await initDataFile();
      res.json(data);
    } catch (err) {
      console.error("Error reading RSVP data:", err);
      res.status(500).json({ error: "Failed to read RSVP data" });
    }
  });

  app.post("/api/rsvp", async (req, res) => {
    try {
      const { attending, guests } = req.body;
      
      const currentData = await initDataFile();
      
      if (attending === true) {
        currentData.yesCount += 1;
        const addGuests = typeof guests === "number" && guests > 0 ? guests : 1;
        currentData.totalGuests += addGuests;
      } else if (attending === false) {
        currentData.noCount += 1;
      } else {
        res.status(400).json({ error: "Invalid attending value" });
        return;
      }

      await fs.writeFile(DATA_FILE, JSON.stringify(currentData, null, 2), "utf-8");
      res.json(currentData);
    } catch (err) {
      console.error("Error writing RSVP data:", err);
      res.status(500).json({ error: "Failed to save RSVP" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
