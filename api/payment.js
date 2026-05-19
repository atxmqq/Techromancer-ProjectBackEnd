// routes/payment.js (โค้ดที่แก้ไขแล้ว)
import express from "express";
import multer from "multer";
import { bucket } from "../firebase.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });



export default router;