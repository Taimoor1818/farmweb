import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

interface ReportData {
  date: string;
  farmProduction: any;
  farmDetails: any;
}

export class GoogleSheetsService {
  static async getAuth() {
    try {
      // Check if required environment variables are present
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error('Google Sheets API credentials are not configured. Please check your environment variables.');
      }

      // Sanitize private key: sometimes env files (or hosting platforms) wrap the key in quotes
      // and store newlines as literal \n sequences. Normalize both cases.
      let rawKey = process.env.GOOGLE_PRIVATE_KEY as string;
      // Trim surrounding quotes if present
      rawKey = rawKey.trim();
      if ((rawKey.startsWith('"') && rawKey.endsWith('"')) || (rawKey.startsWith("'") && rawKey.endsWith("'"))) {
        rawKey = rawKey.slice(1, -1);
      }

      const normalizedKey = rawKey.replace(/\\n/g, '\n');

      // Basic validation for a PEM private key. Accept either PKCS8 or RSA PEM headers.
      const hasBegin = normalizedKey.includes('-----BEGIN');
      const hasPrivate = normalizedKey.includes('PRIVATE KEY');
      const hasRsa = normalizedKey.includes('RSA PRIVATE KEY');

      if (!hasBegin || !(hasPrivate || hasRsa)) {
        // Provide a helpful error message to aid debugging
        throw new Error(
          'Google private key does not appear to be a valid PEM private key. Please check GOOGLE_PRIVATE_KEY formatting (ensure newlines are represented as "\\n" in env files or the key contains real newlines). Expected headers like "-----BEGIN PRIVATE KEY-----" or "-----BEGIN RSA PRIVATE KEY-----".'
        );
      }

      // Try to construct the JWT client; if this fails (OpenSSL decoder or similar), catch and rethrow a friendlier message.
      try {
        const auth = new JWT({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: normalizedKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        return auth;
      } catch (err: any) {
        // Don't print the full native stack here (it may include low-level OpenSSL errors). Provide a clear actionable message instead.
        const nativeMsg = err?.message ? ` (${err.message})` : '';
        throw new Error(
          `Failed to create Google JWT client. The provided private key may be malformed or in an unsupported format${nativeMsg}.` +
            ' Ensure you are using the JSON service account private key and that `GOOGLE_PRIVATE_KEY` is set correctly in your environment.'
        );
      }
    } catch (error: any) {
      console.error('Error initializing Google Auth:', error);
      throw new Error(`Failed to initialize Google authentication: ${error.message}`);
    }
  }

  static async initializeSheet(userId: string, farmName: string, ownerEmail?: string) {
    try {
      const auth = await this.getAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const drive = google.drive({ version: 'v3', auth });

      // Create a new spreadsheet
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `${farmName} - Daily Reports`,
          },
          sheets: [{
            properties: {
              title: 'Daily Records',
            },
          }],
        },
      });

      const sheetId = spreadsheet.data.spreadsheetId!;
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;

      // Set up headers
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'Date',
            'Cow Morning (L)',
            'Cow Evening (L)',
            'Cow Total (L)',
            'Buffalo Morning (L)',
            'Buffalo Evening (L)',
            'Buffalo Total (L)',
            'Total Milk (L)',
            'Cash In (Rs)',
            'Cash Out (Rs)',
            'Total Expense (Rs)',
            'Net Cash (Rs)',
            'Notes'
          ]]
        }
      });

      // Share with owner if email provided
      if (ownerEmail) {
        await drive.permissions.create({
          fileId: sheetId,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: ownerEmail,
          },
          sendNotificationEmail: false,
        });
      }

      return { sheetId, sheetUrl };
    } catch (error: any) {
      // Convert low-level OpenSSL/DECODER errors into a friendly message
      const isDecoderError =
        error?.code === 'ERR_OSSL_UNSUPPORTED' ||
        (error?.opensslErrorStack && error.opensslErrorStack.length) ||
        (typeof error?.message === 'string' && error.message.includes('DECODER routines'));

      if (isDecoderError) {
        const friendly = new Error(
          'Failed to initialize Google Sheets client: the provided GOOGLE_PRIVATE_KEY appears to be malformed or in an unsupported format.\n' +
            'Ensure you are using the JSON service account private key and that the environment variable contains the full PEM (with proper newlines or \"\\n\" sequences).' 
        );
        console.error('Error initializing Google Sheet:', friendly);
        throw friendly;
      }

      console.error('Error initializing Google Sheet:', error);
      throw error;
    }
  }

  static async appendDailyData(sheetId: string, reportData: ReportData) {
    try {
      const auth = await this.getAuth();
      const sheets = google.sheets({ version: 'v4', auth });

      const { date, farmProduction } = reportData;

      const cowM = farmProduction?.cow_morning_total || 0;
      const cowE = farmProduction?.cow_evening_total || 0;
      const buffM = farmProduction?.buffalo_morning_total || 0;
      const buffE = farmProduction?.buffalo_evening_total || 0;

      const row = [
        date,
        cowM, cowE, cowM + cowE,
        buffM, buffE, buffM + buffE,
        cowM + cowE + buffM + buffE,
        farmProduction?.cashIn || 0,
        farmProduction?.cashOut || 0,
        farmProduction?.totalExpense || 0,
        (farmProduction?.cashIn || 0) - (farmProduction?.cashOut || 0),
        '' // Notes placeholder
      ];

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row]
        }
      });

      return {
        success: true,
        updates: response.data.updates
      };
    } catch (error: any) {
      const isDecoderError =
        error?.code === 'ERR_OSSL_UNSUPPORTED' ||
        (error?.opensslErrorStack && error.opensslErrorStack.length) ||
        (typeof error?.message === 'string' && error.message.includes('DECODER routines'));

      if (isDecoderError) {
        const friendly = new Error(
          'Failed to append data to Google Sheet: the provided GOOGLE_PRIVATE_KEY appears to be malformed or in an unsupported format.\n' +
            'Ensure you are using the JSON service account private key and that the environment variable contains the full PEM (with proper newlines or \"\\n\" sequences).'
        );
        console.error('Error appending to Google Sheet:', friendly);
        throw friendly;
      }

      console.error('Error appending to Google Sheet:', error);
      throw error;
    }
  }

  static async getAnalysis(sheetId: string) {
    try {
      const auth = await this.getAuth();
      const sheets = google.sheets({ version: 'v4', auth });

      // Get last 7 rows (approx weekly data)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'A2:L1000', // Assuming less than 1000 days for now
      });

      const rows = response.data.values || [];
      const recentRows = rows.slice(-7);

      let weeklyMilk = 0;
      let weeklyCashFlow = 0;

      recentRows.forEach(row => {
        // Index 7 is Total Milk, Index 11 is Net Cash
        weeklyMilk += parseFloat(row[7] || '0');
        weeklyCashFlow += parseFloat(row[11] || '0');
      });

      return {
        weeklyMilk,
        weeklyCashFlow,
        daysAnalyzed: recentRows.length
      };
    } catch (error: any) {
      const isDecoderError =
        error?.code === 'ERR_OSSL_UNSUPPORTED' ||
        (error?.opensslErrorStack && error.opensslErrorStack.length) ||
        (typeof error?.message === 'string' && error.message.includes('DECODER routines'));

      if (isDecoderError) {
        console.error('Error analyzing sheet data: Google private key may be malformed or unsupported.');
        return null;
      }

      console.error('Error analyzing sheet data:', error);
      return null;
    }
  }
}