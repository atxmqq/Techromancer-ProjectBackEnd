// // upload.js
// import { bucket } from "./firebase.js";
// import multer from "multer";
// import path from "path";
// import { v4 as uuidv4 } from "uuid";

// const upload = multer({ storage: multer.memoryStorage() });

// app.post("/api/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).send({ error: "No file uploaded" });

//     const fileName = `${uuidv4()}${path.extname(req.file.originalname)}`;
//     const file = bucket.file(fileName);

//     await file.save(req.file.buffer, {
//       metadata: { contentType: req.file.mimetype },
//     });

//     const [url] = await file.getSignedUrl({
//       action: "read",
//       expires: "03-01-2030",
//     });

//     res.send({ success: true, url });
//   } catch (err) {
//     console.error("Upload error:", err);
//     res.status(500).send({ success: false, error: err.message });
//   }
// });
