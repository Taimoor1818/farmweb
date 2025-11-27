const fs = require('fs');
const path = require('path');

const setupPath = path.join(process.cwd(), 'env.setup');
const localPath = path.join(process.cwd(), '.env.local');

try {
    if (fs.existsSync(setupPath)) {
        const content = fs.readFileSync(setupPath, 'utf8');
        fs.writeFileSync(localPath, content);
        console.log('Successfully updated .env.local from env.setup');
    } else {
        console.error('env.setup file not found!');
        process.exit(1);
    }
} catch (error) {
    console.error('Error updating .env.local:', error);
    process.exit(1);
}
