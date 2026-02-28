import { exec } from 'child_process';
setTimeout(() => {
    exec('npx playwright test', (err, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
    });
}, 5000);
