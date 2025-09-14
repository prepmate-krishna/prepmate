// lib/twilio.js
import twilio from "twilio";

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;

export const twilioClient = (SID && TOKEN) ? twilio(SID, TOKEN) : null;
