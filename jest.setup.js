// Wait for dev server to be up before running integration tests
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

jest.setTimeout(60000);

async function waitForServer(retries = 60, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(SERVER_URL + '/');
      if (res.ok) return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Dev server not reachable at ' + SERVER_URL);
}

beforeAll(async () => {
  await waitForServer();
});
