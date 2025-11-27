const fs = require('fs');
const path = require('path');

const localPath = path.join(process.cwd(), '.env.local');

try {
    if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');

        const checks = {
            'GOOGLE_SERVICE_ACCOUNT_EMAIL': 'your-service-account',
            'GOOGLE_PRIVATE_KEY': 'Your Private Key Here',
            'EMAIL_USER': 'your-email@gmail.com',
            'EMAIL_PASS': 'your-app-password'
        };

        console.log('--- Environment Variable Check ---');
        let hasError = false;

        for (const [key, placeholder] of Object.entries(checks)) {
            if (content.includes(placeholder)) {
                console.error(`[FAIL] ${key} is still using the placeholder value.`);
                hasError = true;
            } else {
                console.log(`[PASS] ${key} seems to be updated.`);
            }
        }

        if (hasError) {
            console.log('\nCONCLUSION: You need to replace the placeholders with real credentials.');
        } else {
            console.log('\nCONCLUSION: Credentials look updated. The issue might be the values themselves (e.g., invalid key or password).');
        }

    } else {
        console.error('.env.local file not found!');
    }
} catch (error) {
    console.error('Error checking .env.local:', error);
}
