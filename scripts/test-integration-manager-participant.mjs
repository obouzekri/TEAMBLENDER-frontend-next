import { spawn } from 'node:child_process';

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function run() {
  await runCommand('node', ['scripts/smoke.mjs']);
  await runCommand('node', ['scripts/smoke-participant.mjs']);
  console.log('TEST_INTEGRATION_MANAGER_PARTICIPANT_OK');
}

run().catch((error) => {
  console.error('TEST_INTEGRATION_MANAGER_PARTICIPANT_FAIL');
  console.error(error.message || error);
  process.exit(1);
});
