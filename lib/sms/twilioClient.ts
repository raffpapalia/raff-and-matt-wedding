import Twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_REGION = process.env.TWILIO_REGION;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  throw new Error('Missing Twilio environment variables');
}

// Server-only — never reference via NEXT_PUBLIC_.
export const TWILIO_FROM_NUMBER: string = TWILIO_PHONE_NUMBER;

// This account is provisioned under Twilio's AU1 data-residency region, so requests
// must hit api.au1.twilio.com rather than the default global host — otherwise
// authentication fails with error 20003 even with correct credentials.
export const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_REGION ? { region: TWILIO_REGION } : undefined);
